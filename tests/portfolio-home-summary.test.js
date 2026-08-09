const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPortfolioHomeSummary } = require('../portfolio-home-summary.js');

test('publishes only safe portfolio readiness bands and risk flags', () => {
  const summary = buildPortfolioHomeSummary({
    renalPct: 82, gimPct: 41, cipPct: 77, adminPct: 100, logbookPct: 56,
    alsState: 'due-soon', annualEvidenceMissing: true, proceduresUnassessed: true,
    nextAction: 'obtain one renal MCR'
  });
  assert.deepEqual(summary, {
    readiness: { renal: 'on-track', gim: 'needs-attention', cip: 'on-track', admin: 'on-track', logbook: 'needs-attention' },
    risks: { als: 'due-soon', annualEvidence: true, procedures: true },
    nextAction: 'obtain one renal MCR'
  });
  assert.doesNotMatch(JSON.stringify(summary), /percent|82|41|77|100|56/);
});

test('rejects free text and unknown risk states from the published aggregate', () => {
  const summary = buildPortfolioHomeSummary({ renalPct: -2, gimPct: 400, cipPct: NaN, adminPct: 50, logbookPct: 50, alsState: 'raw date', nextAction: '<img>' });
  assert.equal(summary.readiness.renal, 'unavailable');
  assert.equal(summary.readiness.gim, 'unavailable');
  assert.equal(summary.risks.als, 'unavailable');
  assert.equal(summary.nextAction, 'Review ARCP source');
});
