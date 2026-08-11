const test = require('node:test');
const assert = require('node:assert/strict');
const { buildTaskHomeSummary } = require('../task-home-summary.js');

test('projects task monitor urgency without initials, DOB, notes, labels, or counts', () => {
  const summary = buildTaskHomeSummary({
    a: { patientInitials: 'AB', dobYear: '1971', notes: 'private', label: 'Pay gas bill', category: 'admin', dueDate: '2026-08-10', completed: false },
    b: { patientInitials: 'CD', label: 'Other task', category: 'clinical', dueDate: '2026-08-20', completed: false },
  }, new Date('2026-08-10T09:00:00Z'));
  assert.deepEqual(summary, { urgency: 'due', nextAction: 'Review due life-admin task', blocked: false });
  assert.equal(JSON.stringify(summary).includes('AB'), false);
  assert.equal(JSON.stringify(summary).includes('gas'), false);
  assert.equal(JSON.stringify(summary).includes('1971'), false);
});

test('returns unavailable rather than inferring an empty task monitor', () => {
  assert.deepEqual(buildTaskHomeSummary(null, new Date('2026-08-10T09:00:00Z')), { urgency: 'unavailable', nextAction: 'Task source unavailable', blocked: false });
});
