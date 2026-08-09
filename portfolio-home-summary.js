(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PortfolioHomeSummary = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function band(value) {
    if (!Number.isFinite(value) || value < 0 || value > 100) return 'unavailable';
    if (value >= 70) return 'on-track';
    if (value >= 40) return 'needs-attention';
    return 'at-risk';
  }
  function buildPortfolioHomeSummary(input) {
    input = input || {};
    const allowedAls = new Set(['clear', 'due-soon', 'expired']);
    const safeAction = typeof input.nextAction === 'string' && /^[a-z0-9 ,.'-]{3,80}$/i.test(input.nextAction)
      ? input.nextAction : 'Review ARCP source';
    return {
      readiness: { renal: band(input.renalPct), gim: band(input.gimPct), cip: band(input.cipPct), admin: band(input.adminPct), logbook: band(input.logbookPct) },
      risks: { als: allowedAls.has(input.alsState) ? input.alsState : 'unavailable', annualEvidence: input.annualEvidenceMissing === true, procedures: input.proceduresUnassessed === true },
      nextAction: safeAction
    };
  }
  return { buildPortfolioHomeSummary };
});
