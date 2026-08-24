#!/usr/bin/env node
/** Reserve a bounded, source-grounded tracker error for an HQ SCE Quiz chat. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import selectionModule from '../../sce-daily-selection.js';
import { appendDailyEvent, pendingEventFromSelection, readDailyEvents, updateDailyEvent } from './daily-events.mjs';

const execFileAsync = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const STUDY_FOLDER_ID = process.env.SCE_STUDY_FOLDER_ID || '1oJiuvkM9O0DEb0sgdo9zb_T4NjG0K3bT';
const TRACKER_URL = process.env.SCE_TRACKER_URL || 'https://task-monitor-bd7ee-default-rtdb.europe-west1.firebasedatabase.app/sceData.json';
const DAY_MS = 24 * 60 * 60 * 1000;
const STOP_WORDS = new Set(['the','and','for','with','from','what','when','which','that','this','into','does','not','why','how','are','was','were','have','has','had','error','incorrect']);

function text(value) { return String(value ?? '').trim(); }
function tokens(value) {
  return new Set(text(value).toLowerCase().match(/[a-z0-9]+/g)?.filter(word => word.length > 2 && !STOP_WORDS.has(word)) || []);
}
function overlap(left, right) {
  const a = tokens(left); const b = tokens(right);
  return [...a].filter(word => b.has(word)).length;
}

export function stalePendingEvents(events, now = Date.now(), maxAgeMs = DAY_MS) {
  return (Array.isArray(events) ? events : []).filter(event => {
    const selected = Date.parse(event?.selected_at || '');
    return event?.mode === 'daily-loop' && event?.outcome === 'pending' && Number.isFinite(selected) && now - selected > maxAgeMs;
  });
}

export function trackerCandidates(data, studyFiles) {
  const candidates = [];
  const files = (Array.isArray(studyFiles) ? studyFiles : []).filter(file => text(file.id) && text(file.name));
  const add = (scope, id, entry) => {
    if (!entry || !text(entry.note) || entry.resolved) return;
    const ranked = files.map(file => ({ file, score: overlap(entry.note, file.name) })).sort((a, b) => b.score - a.score);
    if (!ranked[0] || ranked[0].score < 1) return;
    const safeId = text(id).replace(/[^a-zA-Z0-9_-]/g, '-');
    candidates.push({
      id: `tracker-${scope}-${safeId}`,
      anchor_type: 'tracker-error',
      anchor_label: text(entry.note).slice(0, 500),
      topic_key: `tracker.${scope}.${safeId.toLowerCase()}`,
      source_reference: `sceData/${scope}/${safeId}`,
      study_file_id: ranked[0].file.id,
      study_file_name: ranked[0].file.name,
      study_file_mime: ranked[0].file.mimeType,
    });
  };
  Object.entries(data?.ksap || {}).forEach(([id, entry]) => add('ksap', id, entry));
  Object.entries(data?.studyprn || {}).forEach(([id, entry]) => add('studyprn', id, entry));
  return candidates;
}

function googlePython() {
  return process.env.HERMES_PYTHON || '/usr/local/lib/hermes-agent/venv/bin/python';
}
function googleApiPath() {
  return path.join(process.env.HERMES_HOME || path.join(process.env.HOME, '.hermes'), 'skills', 'productivity', 'google-workspace', 'scripts', 'google_api.py');
}
async function google(args) {
  const { stdout } = await execFileAsync(googlePython(), [googleApiPath(), ...args], { maxBuffer: 8 * 1024 * 1024 });
  return JSON.parse(stdout);
}
async function studyFiles() {
  return google(['drive', 'search', `'${STUDY_FOLDER_ID}' in parents and trashed = false`, '--raw-query', '--max', '100']);
}
async function readStudySource(candidate) {
  if (candidate.study_file_mime !== 'application/vnd.google-apps.document') {
    throw new Error(`Matched Study source ${candidate.study_file_name} is not a readable Google Doc.`);
  }
  const document = await google(['docs', 'get', candidate.study_file_id]);
  const body = text(document?.body);
  if (!body) throw new Error(`Matched Study source ${candidate.study_file_name} was empty.`);
  return body.slice(0, 6000);
}

export async function reserveQuizAnchor() {
  const events = await readDailyEvents();
  const now = new Date();
  for (const event of stalePendingEvents(events, now.getTime())) {
    await updateDailyEvent({ ...event, outcome: 'cancelled', completed_at: now.toISOString() });
  }

  const freshEvents = await readDailyEvents();
  const response = await fetch(TRACKER_URL);
  if (!response.ok) throw new Error(`SCE tracker read failed (${response.status}).`);
  const candidates = trackerCandidates(await response.json(), await studyFiles());
  const alreadyPending = freshEvents.find(event => event.mode === 'daily-loop' && event.outcome === 'pending');

  let selection;
  let event;
  if (alreadyPending) {
    const candidate = candidates.find(item => item.id === alreadyPending.anchor_id);
    if (!candidate) throw new Error('The fresh SCE Quiz reservation no longer has a matching semantic tracker error and Study note.');
    selection = { candidate };
    event = alreadyPending;
  } else {
    selection = selectionModule.selectDailyAnchor({ candidates, events: freshEvents });
    if (!selection.candidate) throw new Error('No eligible semantic tracker error has a matching readable Study note.');
    event = pendingEventFromSelection(selection, now.toISOString());
  }

  const studySource = await readStudySource(selection.candidate);
  if (!alreadyPending) await appendDailyEvent(event);
  return {
    daily_event_id: event.daily_event_id,
    anchor_id: event.anchor_id,
    anchor_type: event.anchor_type,
    anchor_label: event.anchor_label,
    topic_key: event.topic_key,
    source_reference: event.source_reference,
    study_folder_id: STUDY_FOLDER_ID,
    source_file_id: selection.candidate.study_file_id,
    source_file_name: selection.candidate.study_file_name,
    study_source_excerpt: studySource,
  };
}

async function main() {
  if (process.argv[2] !== 'reserve-quiz') throw new Error('Usage: sce-chat-anchor.mjs reserve-quiz');
  console.log(JSON.stringify(await reserveQuizAnchor()));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
