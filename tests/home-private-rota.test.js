const test = require('node:test');
const assert = require('node:assert/strict');
const { validateRotaSummary } = require('../home-private-rota.js');

const valid = {
  today: { dutyState: 'clinical', capacity: 'normal', conflict: false },
  week: { workload: 'limited', recovery: true, protectedStudyWindow: false, nextDutyProximity: 'upcoming' },
  attention: { conflict: false, recoveryProtection: true },
};

test('accepts only the closed rota Home aggregate contract', () => {
  assert.deepEqual(validateRotaSummary(valid), valid);
});

test('rejects private fields and malformed aggregate values', () => {
  assert.equal(validateRotaSummary({ ...valid, rotaCode: 'private' }), null);
  assert.equal(validateRotaSummary({ ...valid, today: { ...valid.today, capacity: 'busy' } }), null);
  assert.equal(validateRotaSummary({ ...valid, attention: { ...valid.attention, note: 'private' } }), null);
});
