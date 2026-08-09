#!/usr/bin/env node
/**
 * Extract the non-proprietary KSAP taxonomy already maintained in SCE.html.
 * Produces stable concept IDs for the coverage ledger; it never copies stems,
 * answer choices, explanations, or other question-bank content.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..', '..');
const trackerPath = path.join(root, 'SCE.html');
const hierarchyPath = path.join(root, 'curriculum', 'ksap-hierarchy-v1.json');
const outputPath = path.join(root, 'curriculum', 'ksap-concepts-v1.json');

function slug(value) {
  return value
    .normalize('NFKD')
    .replace(/[–—]/g, '-')
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function extractTopics(source) {
  const declaration = 'let TOPICS = ';
  const start = source.indexOf(declaration);
  if (start < 0) throw new Error('Could not find KSAP TOPICS declaration in SCE.html.');
  const objectStart = source.indexOf('{', start);
  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;
  for (let i = objectStart; i < source.length; i += 1) {
    const char = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  if (end < 0) throw new Error('KSAP TOPICS object did not close.');
  return vm.runInNewContext(`(${source.slice(objectStart, end)})`);
}

const hierarchy = JSON.parse(fs.readFileSync(hierarchyPath, 'utf8'));
if (hierarchy.status !== 'confirmed') throw new Error('KSAP hierarchy must be confirmed before extraction.');
const topics = extractTopics(fs.readFileSync(trackerPath, 'utf8'));
const mainTopics = hierarchy.main_topics;
const sourceNames = Object.keys(topics);
if (JSON.stringify(sourceNames) !== JSON.stringify(mainTopics.map((topic) => topic.name))) {
  throw new Error('Confirmed hierarchy no longer matches SCE.html topic order/names.');
}

const conceptIds = new Set();
const subtopicIds = new Set();
const extracted = mainTopics.map((mainTopic) => {
  const sourceSubtopics = topics[mainTopic.name];
  const subtopics = Object.entries(sourceSubtopics).map(([subtopicName, concepts]) => {
    const subtopicId = `${mainTopic.id}.${slug(subtopicName)}`;
    if (subtopicIds.has(subtopicId)) throw new Error(`Duplicate subtopic ID: ${subtopicId}`);
    subtopicIds.add(subtopicId);
    return {
      id: subtopicId,
      name: subtopicName,
      concepts: concepts.map((conceptName) => {
        const conceptId = `${subtopicId}.${slug(conceptName)}`;
        if (conceptIds.has(conceptId)) throw new Error(`Duplicate concept ID: ${conceptId}`);
        conceptIds.add(conceptId);
        return {
          id: conceptId,
          name: conceptName,
          primary_main_topic_id: mainTopic.id,
          primary_subtopic_id: subtopicId,
          source_type: 'KSAP map',
          source_locator: `SCE.html :: ${mainTopic.name} > ${subtopicName}`,
          priority: 'curriculum',
          status: 'never_delivered'
        };
      })
    };
  });
  return { id: mainTopic.id, name: mainTopic.name, subtopics };
});

const output = {
  schema_version: '1.0.0-draft',
  status: 'confirmed-taxonomy-ready-for-ledger-seeding',
  source: {
    hierarchy: 'curriculum/ksap-hierarchy-v1.json',
    tracker: 'SCE.html',
    copyright_note: 'Derived taxonomy only; contains no question stems, answer choices, or explanations.'
  },
  counts: {
    main_topics: extracted.length,
    subtopics: subtopicIds.size,
    concepts: conceptIds.size
  },
  main_topics: extracted
};
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${path.relative(root, outputPath)}: ${output.counts.main_topics} main topics, ${output.counts.subtopics} subtopics, ${output.counts.concepts} concepts.`);
