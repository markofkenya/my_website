const test = require('node:test');
const assert = require('node:assert/strict');
const { selectDailyDispatch } = require('../sce-daily-dispatch.js');

const candidates = [
  { id: 'study-anca', anchor_type: 'study-resource', anchor_label: 'ANCA vasculitis', topic_key: 'glomerular.anca', source_reference: 'Study/ANCA vasculitis.md' },
  { id: 'tracker-sodium', anchor_type: 'tracker-error', anchor_label: 'Sodium threshold error', topic_key: 'sodium-water.threshold', source_reference: 'SCE briefing' },
  { id: 'study-acidosis', anchor_type: 'study-resource', anchor_label: 'Metabolic acidosis', topic_key: 'acid-base.metabolic-acidosis', source_reference: 'Study/Metabolic acidosis' }
];

test('selects distinct quiz and new-card anchors and reserves both before delivery', () => {
  const dispatch = selectDailyDispatch({ candidates, events: [], random: () => 0 });
  assert.equal(dispatch.quiz.candidate.id, 'study-anca');
  assert.equal(dispatch.cards.candidate.id, 'tracker-sodium');
  assert.notEqual(dispatch.quiz.candidate.topic_key, dispatch.cards.candidate.topic_key);
  assert.equal(dispatch.quizEvent.outcome, 'pending');
  assert.equal(dispatch.cardEvent.outcome, 'pending');
  assert.equal(dispatch.cardEvent.mode, 'daily-cards');
});

test('requires a distinct real tracker-error anchor for the three-new-card route', () => {
  const dispatch = selectDailyDispatch({ candidates: candidates.slice(0, 2), events: [], random: () => 0 });
  assert.equal(dispatch.quiz.candidate.id, 'study-anca');
  assert.equal(dispatch.cards.candidate.id, 'tracker-sodium');
  assert.equal(dispatch.cardEvent.anchor_type, 'tracker-error');
});
