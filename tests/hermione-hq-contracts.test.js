const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildPrivateWeekSummary,
  validateCapture,
  validateDraft,
  validateAgentBrief,
} = require('../hermione-hq-contracts.js');
const { buildHomePrivateWeekWrite } = require('../rota-home-summary.js');

test('projects only an allowlisted personal week into the authenticated Home summary', () => {
  const summary = buildPrivateWeekSummary({
    myShifts: {
      A: {
        '2026-08-10': [{ type: 'ward' }],
        '2026-08-11': [{ type: 'clinic' }],
      },
    },
    assignments: { '2026-08-12': { p: 'A', type: 'oncall' } },
  }, 'A', new Date('2026-08-10T08:00:00'));

  assert.deepEqual(summary, {
    generatedAt: '2026-08-10T08:00:00.000Z',
    days: [
      { date: '2026-08-10', duties: ['ward'] },
      { date: '2026-08-11', duties: ['clinic'] },
      { date: '2026-08-12', duties: ['oncall'] },
      { date: '2026-08-13', duties: [] },
      { date: '2026-08-14', duties: [] },
      { date: '2026-08-15', duties: [] },
      { date: '2026-08-16', duties: [] },
    ],
  });
});

test('omits names, room data, locations, notes and unknown duty types from the private week projection', () => {
  const summary = buildPrivateWeekSummary({
    myShifts: {
      A: {
        '2026-08-10': [
          { type: 'clinic', note: 'private note', location: 'Ward 4', colleague: 'Someone' },
          { type: 'free-text' },
        ],
      },
    },
    people: { A: { name: 'Private name' } },
    room: 'secret',
  }, 'A', new Date('2026-08-10T08:00:00'));

  assert.deepEqual(summary.days[0], { date: '2026-08-10', duties: ['clinic'] });
  assert.doesNotMatch(JSON.stringify(summary), /name|room|note|location|colleague|free-text/i);
});

test('accepts a bounded de-identified capture that is awaiting agent review', () => {
  const capture = validateCapture({
    type: 'procedure',
    text: 'Renal biopsy learning point: confirm specimen destinations before finishing the note.',
    createdAt: '2026-08-10T08:00:00.000Z',
    status: 'pending-review',
  });

  assert.deepEqual(capture, {
    type: 'procedure',
    text: 'Renal biopsy learning point: confirm specimen destinations before finishing the note.',
    createdAt: '2026-08-10T08:00:00.000Z',
    status: 'pending-review',
  });
});

test('rejects oversized, malformed, or apparently identifiable capture text', () => {
  assert.equal(validateCapture({ type: 'case', text: '', createdAt: '2026-08-10T08:00:00.000Z', status: 'pending-review' }), null);
  assert.equal(validateCapture({ type: 'case', text: 'Patient NHS number 123 456 7890', createdAt: '2026-08-10T08:00:00.000Z', status: 'pending-review' }), null);
  assert.equal(validateCapture({ type: 'case', text: 'x'.repeat(1001), createdAt: '2026-08-10T08:00:00.000Z', status: 'pending-review' }), null);
  assert.equal(validateCapture({ type: 'unknown', text: 'A safe note', createdAt: '2026-08-10T08:00:00.000Z', status: 'pending-review' }), null);
});

test('allows a draft only as an approval-gated proposal', () => {
  assert.deepEqual(validateDraft({
    id: 'draft-1',
    type: 'portfolio-reflection',
    summary: 'Prepare a reflection draft from the approved capture.',
    status: 'awaiting-approval',
    createdAt: '2026-08-10T08:00:00.000Z',
  }), {
    id: 'draft-1',
    type: 'portfolio-reflection',
    summary: 'Prepare a reflection draft from the approved capture.',
    status: 'awaiting-approval',
    createdAt: '2026-08-10T08:00:00.000Z',
  });

  assert.equal(validateDraft({
    id: 'draft-1', type: 'portfolio-reflection', summary: 'x', status: 'submitted', createdAt: '2026-08-10T08:00:00.000Z',
  }), null);
});

test('rejects a mission brief that claims confirmation when a required source is missing', () => {
  assert.equal(validateAgentBrief({
    state: 'confirmed',
    generatedAt: '2026-08-10T08:00:00.000Z',
    primaryAction: { label: 'Review one task', minutes: 15 },
    sourceStates: { rota: 'current', sce: 'missing', portfolio: 'current', lifeAdmin: 'current' },
  }), null);
});

test('publishes a detailed week only under the authenticated user private path', () => {
  const write = buildHomePrivateWeekWrite('uid-1', {
    myShifts: { A: { '2026-08-10': [{ type: 'procedure', note: 'hidden' }] } },
  }, 'A', new Date('2026-08-10T08:00:00'));

  assert.equal(write.path, 'homePrivate/uid-1/rotaWeek');
  assert.deepEqual(write.value.days[0], { date: '2026-08-10', duties: ['procedure'] });
  assert.doesNotMatch(JSON.stringify(write.value), /note|uid-1/i);
});

test('accepts a bounded partial brief with explicit source state and action limit', () => {
  assert.deepEqual(validateAgentBrief({
    state: 'partial',
    generatedAt: '2026-08-10T08:00:00.000Z',
    primaryAction: { label: 'Review one task', minutes: 15 },
    secondaryActions: [{ label: 'Capture one learning point', minutes: 5 }],
    fallback: { label: 'Open the source workspace', minutes: 2 },
    sourceStates: { rota: 'current', sce: 'missing', portfolio: 'current', lifeAdmin: 'current' },
  }), {
    state: 'partial',
    generatedAt: '2026-08-10T08:00:00.000Z',
    primaryAction: { label: 'Review one task', minutes: 15 },
    secondaryActions: [{ label: 'Capture one learning point', minutes: 5 }],
    fallback: { label: 'Open the source workspace', minutes: 2 },
    sourceStates: { rota: 'current', sce: 'missing', portfolio: 'current', lifeAdmin: 'current' },
  });
});
