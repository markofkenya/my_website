const test = require('node:test');
const assert = require('node:assert/strict');
const { validateSceSummary, validatePortfolioSummary } = require('../home-source-summaries.js');

test('accepts only the bounded SCE dashboard projection', () => {
  const value = {
    ready: true,
    generatedAt: '2026-08-11T10:00:00.000Z',
    summary: { taxonomyConcepts: 20, deliveredUnconfirmed: 2, weak: 3, strong: 4, cardsDue: 5, pendingDebriefs: 1 },
    topics: []
  };
  assert.deepEqual(validateSceSummary(value), value);
  assert.equal(validateSceSummary({ ...value, rawQuestion: 'no' }), null);
  assert.equal(validateSceSummary({ ...value, summary: { ...value.summary, note: 'no' } }), null);
  assert.deepEqual(validateSceSummary({ ...value, topics: [{ id: 'potassium', name: 'Potassium: acid–base', neverDelivered: 0, deliveredUnconfirmed: 0, weak: 1, strong: 0, due: 1 }] })?.topics[0].name, 'Potassium: acid–base');
  assert.equal(validateSceSummary({ ...value, topics: [{ id: 'ok', name: '<img>', neverDelivered: 0, deliveredUnconfirmed: 0, weak: 0, strong: 0, due: 0 }] }), null);
});

test('accepts only the bounded Portfolio dashboard projection', () => {
  const value = {
    readiness: { renal: 'on-track', gim: 'needs-attention', cip: 'unavailable', admin: 'on-track', logbook: 'unavailable' },
    risks: { als: 'clear', annualEvidence: false, procedures: true },
    nextAction: 'Review ARCP source'
  };
  assert.deepEqual(validatePortfolioSummary(value), value);
  assert.equal(validatePortfolioSummary({ ...value, patient: 'no' }), null);
  assert.equal(validatePortfolioSummary({ ...value, nextAction: '<img>' }), null);
});
