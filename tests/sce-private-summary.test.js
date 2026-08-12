const test = require('node:test');
const assert = require('node:assert/strict');
const { buildScePrivateSummary } = require('../sce-private-summary.js');

const questions = [
  { code: 'q1', category: 'Acid–Base and Potassium Disorders' },
  { code: 'q2', category: 'Acid–Base and Potassium Disorders' },
  { code: 'q3', category: 'Sodium and Water Abnormalities' },
];

test('publishes only a bounded active SCE topic and P1 remaining count', () => {
  const summary = buildScePrivateSummary({
    category: 'Acid–Base and Potassium Disorders', questions,
    answers: { q1: { p1correct: true }, q2: { p1incorrect: true }, q3: { note: 'must not be exported' } },
    now: 1_786_000_000_000,
  });
  assert.deepEqual(summary, {
    generatedAt: 1_786_000_000_000,
    activeTopic: 'potassium-acid-base',
    questionsRemaining: 0,
    needsAttention: false,
  });
  assert.doesNotMatch(JSON.stringify(summary), /q1|note|correct|incorrect|answer/i);
});

test('keeps current topic selection explicit and rejects unknown categories', () => {
  const summary = buildScePrivateSummary({
    category: 'Calcium, Phosphorus, and Magnesium Disorders and Stones', questions,
    answers: {}, now: 1_786_000_000_000,
  });
  assert.equal(summary.activeTopic, 'calcium-phosphate');
  assert.equal(summary.questionsRemaining, 0);
  assert.equal(summary.needsAttention, false);
  assert.throws(() => buildScePrivateSummary({ category: 'free text', questions, answers: {}, now: Date.now() }), /recognised SCE category/);
});
