(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HermioneHQContracts = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const DUTY_TYPES = new Set(['ward', 'clinic', 'procedure', 'oncall', 'night', 'annual_leave', 'study_leave']);
  const CAPTURE_TYPES = new Set(['case', 'procedure', 'clinic', 'teaching', 'questions', 'admin', 'reflection', 'life-admin']);
  const DRAFT_TYPES = new Set(['portfolio-reflection', 'portfolio-opportunity', 'study-action', 'life-admin-task']);
  const SOURCE_STATES = new Set(['current', 'stale', 'missing', 'unavailable']);
  const BRIEF_STATES = new Set(['confirmed', 'partial', 'cannot-determine']);
  const CAPTURE_STATUSES = new Set(['pending-review']);
  const DRAFT_STATUSES = new Set(['awaiting-approval', 'approved', 'dismissed']);

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function exactKeys(value, keys) {
    return isPlainObject(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
  }

  function iso(value) {
    return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
  }

  function localDateKey(date) {
    const value = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(value.getTime())) throw new TypeError('A valid date is required');
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }

  function addDays(date, count) {
    const next = new Date(date);
    next.setDate(next.getDate() + count);
    return next;
  }

  function dayDuties(state, personKey, dateKey) {
    const personal = Array.isArray(state?.myShifts?.[personKey]?.[dateKey])
      ? state.myShifts[personKey][dateKey] : [];
    const duties = personal.map(entry => entry?.type).filter(type => DUTY_TYPES.has(type));
    const assignment = state?.assignments?.[dateKey];
    if (assignment?.p === personKey && DUTY_TYPES.has(assignment.type)) duties.push(assignment.type);
    return [...new Set(duties)];
  }

  function buildPrivateWeekSummary(state, personKey, now = new Date()) {
    if (typeof personKey !== 'string' || !personKey.trim()) throw new TypeError('A rota person key is required');
    const current = now instanceof Date ? now : new Date(now);
    if (Number.isNaN(current.getTime())) throw new TypeError('A valid date is required');
    return {
      generatedAt: current.toISOString(),
      days: Array.from({ length: 7 }, (_, index) => {
        const date = addDays(current, index);
        const dateKey = localDateKey(date);
        return { date: dateKey, duties: dayDuties(state, personKey, dateKey) };
      }),
    };
  }

  function hasPotentialIdentifier(text) {
    return /\b(?:nhs\s*(?:number|no\.?|#)?\s*)?\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/i.test(text)
      || /\b[A-Z]{1,2}\d{6,8}\b/i.test(text)
      || /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/.test(text);
  }

  function validateCapture(value) {
    if (!exactKeys(value, ['type', 'text', 'createdAt', 'status'])) return null;
    if (!CAPTURE_TYPES.has(value.type) || !iso(value.createdAt) || !CAPTURE_STATUSES.has(value.status)) return null;
    if (typeof value.text !== 'string') return null;
    const text = value.text.trim();
    if (text.length < 3 || text.length > 1000 || hasPotentialIdentifier(text)) return null;
    return { type: value.type, text, createdAt: value.createdAt, status: value.status };
  }

  function validateDraft(value) {
    if (!exactKeys(value, ['id', 'type', 'summary', 'status', 'createdAt'])) return null;
    if (typeof value.id !== 'string' || !/^[a-z0-9-]{3,80}$/i.test(value.id)) return null;
    if (!DRAFT_TYPES.has(value.type) || !DRAFT_STATUSES.has(value.status) || !iso(value.createdAt)) return null;
    if (typeof value.summary !== 'string' || value.summary.trim().length < 3 || value.summary.trim().length > 240) return null;
    return { id: value.id, type: value.type, summary: value.summary.trim(), status: value.status, createdAt: value.createdAt };
  }

  function validateAction(value) {
    return exactKeys(value, ['label', 'minutes'])
      && typeof value.label === 'string' && value.label.trim().length >= 3 && value.label.trim().length <= 120
      && Number.isInteger(value.minutes) && value.minutes >= 1 && value.minutes <= 240
      ? { label: value.label.trim(), minutes: value.minutes } : null;
  }

  function validateAgentBrief(value) {
    if (!isPlainObject(value)) return null;
    const keys = ['state', 'generatedAt', 'primaryAction', 'secondaryActions', 'fallback', 'sourceStates'];
    if (!exactKeys(value, keys) || !BRIEF_STATES.has(value.state) || !iso(value.generatedAt)) return null;
    const primaryAction = validateAction(value.primaryAction);
    const fallback = validateAction(value.fallback);
    if (!primaryAction || !fallback || !Array.isArray(value.secondaryActions) || value.secondaryActions.length > 2) return null;
    const secondaryActions = value.secondaryActions.map(validateAction);
    if (secondaryActions.some(action => !action)) return null;
    if (!exactKeys(value.sourceStates, ['rota', 'sce', 'portfolio', 'lifeAdmin'])) return null;
    if (!Object.values(value.sourceStates).every(state => SOURCE_STATES.has(state))) return null;
    const hasGap = Object.values(value.sourceStates).some(state => state === 'missing' || state === 'unavailable' || state === 'stale');
    if (value.state === 'confirmed' && hasGap) return null;
    return {
      state: value.state,
      generatedAt: value.generatedAt,
      primaryAction,
      secondaryActions,
      fallback,
      sourceStates: { ...value.sourceStates },
    };
  }

  return { buildPrivateWeekSummary, validateCapture, validateDraft, validateAgentBrief };
});
