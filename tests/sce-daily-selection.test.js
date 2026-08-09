const test = require('node:test');
const assert = require('node:assert/strict');
const { selectDailyAnchor } = require('../sce-daily-selection.js');

const candidates = [
  { id: 'study-metabolic-acidosis', anchor_type: 'study-resource', anchor_label: 'Metabolic acidosis', topic_key: 'acid-base.metabolic-acidosis' },
  { id: 'tracker-sodium-overcorrection', anchor_type: 'tracker-error', anchor_label: 'Sodium overcorrection reversal uncertainty', topic_key: 'sodium-water.overcorrection' },
  { id: 'study-anca', anchor_type: 'study-resource', anchor_label: 'ANCA vasculitis', topic_key: 'glomerular.anca-vasculitis' }
];

test('randomly selects from an eligible anchor pool', () => {
  const selection = selectDailyAnchor({ candidates, events: [], random: () => 0.6 });
  assert.equal(selection.candidate.id, 'tracker-sodium-overcorrection');
  assert.equal(selection.repeat_permitted, 'no');
  assert.equal(selection.repeat_reason, 'new-anchor');
});

test('suppresses a previously completed strong topic even when its source anchor differs', () => {
  const selection = selectDailyAnchor({
    candidates,
    events: [{ anchor_id: 'old-acid-base-note', topic_key: 'acid-base.metabolic-acidosis', outcome: 'strong' }],
    random: () => 0
  });
  assert.deepEqual(selection.eligible.map(candidate => candidate.id), [
    'tracker-sodium-overcorrection',
    'study-anca'
  ]);
});

test('permits a repeat only when the previous matching topic is weak or incomplete', () => {
  const selection = selectDailyAnchor({
    candidates,
    events: [{ anchor_id: 'old-acid-base-note', topic_key: 'acid-base.metabolic-acidosis', outcome: 'weak' }],
    random: () => 0
  });
  assert.equal(selection.candidate.id, 'study-metabolic-acidosis');
  assert.equal(selection.repeat_permitted, 'yes');
  assert.equal(selection.repeat_reason, 'previous-outcome-weak');
});

test('does not let a weak event for a different topic re-enable a strong topic sharing the same anchor', () => {
  const selection = selectDailyAnchor({
    candidates: [{ id: 'shared-anchor', anchor_type: 'study-resource', anchor_label: 'Shared resource', topic_key: 'topic.strong' }],
    events: [
      { anchor_id: 'shared-anchor', topic_key: 'topic.strong', outcome: 'strong', completed_at: '2026-08-09T09:00:00Z' },
      { anchor_id: 'shared-anchor', topic_key: 'topic.weak', outcome: 'weak', completed_at: '2026-08-09T10:00:00Z' }
    ],
    random: () => 0
  });
  assert.equal(selection.candidate, null);
  assert.equal(selection.reason, 'no-eligible-anchor');
});

test('uses completed timestamp rather than sheet row order to determine a topic outcome', () => {
  const selection = selectDailyAnchor({
    candidates: [{ id: 'topic-timing', anchor_type: 'tracker-error', anchor_label: 'Timing test', topic_key: 'topic.timing' }],
    events: [
      { anchor_id: 'topic-timing', topic_key: 'topic.timing', outcome: 'strong', completed_at: '2026-08-09T12:00:00Z' },
      { anchor_id: 'topic-timing', topic_key: 'topic.timing', outcome: 'weak', completed_at: '2026-08-09T09:00:00Z' }
    ],
    random: () => 0
  });
  assert.equal(selection.candidate, null);
});

test('treats a cancelled pre-delivery event as eligible rather than consuming the topic', () => {
  const selection = selectDailyAnchor({
    candidates: [candidates[0]],
    events: [{ anchor_id: candidates[0].id, topic_key: candidates[0].topic_key, outcome: 'cancelled', completed_at: '2026-08-09T20:03:00Z' }],
    random: () => 0
  });
  assert.equal(selection.candidate.id, candidates[0].id);
  assert.equal(selection.repeat_reason, 'cancelled-not-delivered');
});

test('does not select a pending daily event again', () => {
  const selection = selectDailyAnchor({
    candidates: [candidates[0]],
    events: [{ anchor_id: 'study-metabolic-acidosis', topic_key: 'acid-base.metabolic-acidosis', outcome: 'pending' }],
    random: () => 0
  });
  assert.equal(selection.candidate, null);
  assert.equal(selection.reason, 'no-eligible-anchor');
});

test('rejects candidates without a stable anchor id and topic key', () => {
  assert.throws(
    () => selectDailyAnchor({ candidates: [{ id: 'x', anchor_type: 'study-resource', anchor_label: 'Untyped' }], events: [] }),
    /topic_key/i
  );
});
