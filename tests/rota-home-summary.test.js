const test = require('node:test');
const assert = require('node:assert/strict');
const { buildRotaHomeSummary, buildHomePrivateWrite } = require('../rota-home-summary.js');

const keys = value => Object.keys(value).sort();

test('returns unavailable states when the rota has no explicit personal shift data', () => {
  const summary = buildRotaHomeSummary({}, 'A', new Date('2026-08-10T09:00:00Z'));

  assert.deepEqual(summary, {
    today: { dutyState: 'unavailable', capacity: 'unavailable', conflict: false },
    week: { workload: 'unavailable', recovery: false, protectedStudyWindow: false, nextDutyProximity: 'unavailable' },
    attention: { conflict: false, recoveryProtection: false },
  });
});

test('derives only allowlisted operational signals from an explicit on-call entry', () => {
  const summary = buildRotaHomeSummary({
    people: { A: { name: 'Private name' } },
    notes: [{ body: 'Private clinical note' }],
    myShifts: { A: { '2026-08-10': [{ type: 'oncall', start: '08:30', end: '08:30' }] } },
  }, 'A', new Date('2026-08-10T09:00:00Z'));

  assert.deepEqual(summary, {
    today: { dutyState: 'on-call', capacity: 'limited', conflict: false },
    week: { workload: 'limited', recovery: false, protectedStudyWindow: false, nextDutyProximity: 'imminent' },
    attention: { conflict: false, recoveryProtection: false },
  });
  assert.deepEqual(keys(summary), ['attention', 'today', 'week']);
  assert.equal(JSON.stringify(summary).includes('Private'), false);
});

test('derives a personal on-call signal from the shared Split rota assignment', () => {
  const summary = buildRotaHomeSummary({
    assignments: { '2026-08-10': { p: 'A', type: 'oncall' } },
  }, 'A', new Date('2026-08-10T09:00:00Z'));

  assert.deepEqual(summary.today, { dutyState: 'on-call', capacity: 'limited', conflict: false });
  assert.equal(summary.week.workload, 'limited');
  assert.equal(summary.week.nextDutyProximity, 'imminent');
});

test('recognises an explicit study-leave entry without inventing a duty or workload state', () => {
  const summary = buildRotaHomeSummary({
    myShifts: { A: { '2026-08-12': [{ type: 'study_leave' }] } },
  }, 'A', new Date('2026-08-10T09:00:00Z'));

  assert.equal(summary.today.dutyState, 'unavailable');
  assert.equal(summary.today.capacity, 'unavailable');
  assert.equal(summary.week.protectedStudyWindow, true);
  assert.equal(summary.week.nextDutyProximity, 'upcoming');
  assert.equal(summary.week.workload, 'unavailable');
});

test('builds a user-scoped private write without including raw rota data', () => {
  const write = buildHomePrivateWrite('firebase-user-id', {
    people: { A: { name: 'Private name' } },
    myShifts: { A: { '2026-08-10': [{ type: 'oncall' }] } },
    notes: [{ body: 'Private note' }],
  }, 'A', new Date('2026-08-10T09:00:00Z'));

  assert.equal(write.path, 'homePrivate/firebase-user-id/rota');
  assert.equal(write.value.today.dutyState, 'on-call');
  assert.equal(JSON.stringify(write.value).includes('Private'), false);
  assert.throws(() => buildHomePrivateWrite('', {}, 'A'), /Firebase user ID/);
});
