const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDashboardProjection } = require('../sce-ledger-projection.js');

test('projects concept states, due cards, pending debriefs, and next actions from ledger rows', () => {
  const projection = buildDashboardProjection({
    concepts: [
      { concept_id: 'sodium-water.hyponatremia.siadh', main_topic: 'sodium-water', status: 'never_delivered' },
      { concept_id: 'ckd-esrd.esrd.hd', main_topic: 'ckd-esrd', status: 'delivered_unconfirmed' },
      { concept_id: 'ckd-esrd.ckd.anaemia', main_topic: 'ckd-esrd', status: 'weak' },
      { concept_id: 'aki-icu-nephrology.aki.atn', main_topic: 'aki-icu-nephrology', status: 'strong' }
    ],
    cards: [
      { card_id: 'card-1', concept_id: 'ckd-esrd.ckd.anaemia', next_due_at: '2026-08-09T08:00:00Z' },
      { card_id: 'card-2', concept_id: 'aki-icu-nephrology.aki.atn', next_due_at: '2026-08-10T08:00:00Z' }
    ],
    attempts: [
      { attempt_id: 'attempt-1', concept_id: 'ckd-esrd.esrd.hd', outcome: 'unanswered' },
      { attempt_id: 'attempt-2', concept_id: 'aki-icu-nephrology.aki.atn', outcome: 'strong' }
    ],
    topicNames: {
      'sodium-water': 'Sodium and Water Abnormalities',
      'ckd-esrd': 'Chronic Kidney Disease',
      'aki-icu-nephrology': 'Acute Kidney Injury and ICU Nephrology'
    }
  }, new Date('2026-08-09T09:00:00Z'));

  assert.equal(projection.ready, true);
  assert.equal(projection.summary.taxonomyConcepts, 4);
  assert.equal(projection.summary.deliveredUnconfirmed, 1);
  assert.equal(projection.summary.weak, 1);
  assert.equal(projection.summary.strong, 1);
  assert.equal(projection.summary.cardsDue, 1);
  assert.equal(projection.summary.pendingDebriefs, 1);
  assert.deepEqual(projection.topics.find(topic => topic.id === 'ckd-esrd'), {
    id: 'ckd-esrd', name: 'Chronic Kidney Disease', neverDelivered: 0,
    deliveredUnconfirmed: 1, weak: 1, strong: 0, due: 1
  });
  assert.match(projection.nextActions[0].label, /recall card/i);
  assert.match(projection.nextActions[1].label, /debrief/i);
});

test('ignores unknown statuses and future-due cards without corrupting dashboard totals', () => {
  const projection = buildDashboardProjection({
    concepts: [{ concept_id: 'x.y.z', main_topic: 'x', status: 'unexpected' }],
    cards: [{ card_id: 'future', concept_id: 'x.y.z', next_due_at: '2026-08-10T09:00:00Z' }],
    attempts: [],
    topicNames: { x: 'Experimental Topic' }
  }, new Date('2026-08-09T09:00:00Z'));

  assert.equal(projection.summary.taxonomyConcepts, 0);
  assert.equal(projection.summary.cardsDue, 0);
  assert.deepEqual(projection.topics[0], {
    id: 'x', name: 'Experimental Topic', neverDelivered: 0,
    deliveredUnconfirmed: 0, weak: 0, strong: 0, due: 0
  });
});
