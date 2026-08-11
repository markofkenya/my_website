(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RotaHomeSummary = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const contracts = typeof module === 'object' && module.exports
    ? require('./hermione-hq-contracts.js')
    : globalThis.HermioneHQContracts;
  const DAY_MS = 24 * 60 * 60 * 1000;

  function localDateKey(date) {
    const value = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(value.getTime())) throw new TypeError('A valid date is required');
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function addDays(date, count) {
    const next = new Date(date);
    next.setDate(next.getDate() + count);
    return next;
  }

  function entriesFor(state, personKey, dateKey) {
    const entries = state?.myShifts?.[personKey]?.[dateKey];
    const personal = Array.isArray(entries) ? entries.filter(entry => entry && typeof entry.type === 'string') : [];
    const assignment = state?.assignments?.[dateKey];
    if (assignment && assignment.p === personKey && typeof assignment.type === 'string') {
      personal.push({ type: assignment.type });
    }
    return personal;
  }

  function has(entries, types) {
    return entries.some(entry => types.has(entry.type));
  }

  function todaySignal(entries) {
    if (!entries.length) return { dutyState: 'unavailable', capacity: 'unavailable', conflict: false };
    if (has(entries, new Set(['annual_leave', 'study_leave']))) return { dutyState: 'leave', capacity: 'protected', conflict: false };
    if (has(entries, new Set(['oncall', 'night']))) return { dutyState: 'on-call', capacity: 'limited', conflict: false };
    return { dutyState: 'clinical', capacity: 'normal', conflict: false };
  }

  function buildRotaHomeSummary(state, personKey, now = new Date()) {
    const today = localDateKey(now);
    const days = Array.from({ length: 7 }, (_, index) => entriesFor(state, personKey, localDateKey(addDays(now, index))));
    const allEntries = days.flat();
    const highIntensity = has(allEntries, new Set(['oncall', 'night']));
    const studyLeave = has(allEntries, new Set(['study_leave']));
    const imminent = days.slice(0, 2).some(entries => entries.length > 0);
    const upcoming = !imminent && days.slice(2).some(entries => entries.length > 0);

    return {
      today: todaySignal(entriesFor(state, personKey, today)),
      week: {
        workload: highIntensity ? 'limited' : 'unavailable',
        recovery: false,
        protectedStudyWindow: studyLeave,
        nextDutyProximity: imminent ? 'imminent' : upcoming ? 'upcoming' : 'unavailable',
      },
      attention: { conflict: false, recoveryProtection: false },
    };
  }

  function buildHomePrivateWrite(uid, state, personKey, now = new Date()) {
    if (typeof uid !== 'string' || !uid.trim()) throw new TypeError('Firebase user ID is required');
    return {
      path: `homePrivate/${uid}/rota`,
      value: buildRotaHomeSummary(state, personKey, now),
    };
  }

  function buildHomePrivateWeekWrite(uid, state, personKey, now = new Date()) {
    if (typeof uid !== 'string' || !uid.trim()) throw new TypeError('Firebase user ID is required');
    if (!contracts || typeof contracts.buildPrivateWeekSummary !== 'function') throw new Error('Hermione HQ contracts are unavailable');
    return {
      path: `homePrivate/${uid}/rotaWeek`,
      value: contracts.buildPrivateWeekSummary(state, personKey, now),
    };
  }

  return { buildRotaHomeSummary, buildHomePrivateWrite, buildHomePrivateWeekWrite };
});
