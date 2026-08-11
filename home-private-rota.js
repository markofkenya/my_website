(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HomePrivateRota = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyB5RQUiw5PFG8BHEK-6vgT-w6Rj62PcYfI',
    authDomain: 'budget-bb9ed.firebaseapp.com',
    databaseURL: 'https://budget-bb9ed-default-rtdb.europe-west1.firebasedatabase.app',
    projectId: 'budget-bb9ed',
    storageBucket: 'budget-bb9ed.firebasestorage.app',
    messagingSenderId: '471078637472',
    appId: '1:471078637472:web:39604ff65883fd39a6dec5',
  };
  const dutyStates = new Set(['on-call', 'clinical', 'leave', 'recovery', 'unavailable']);
  const capacities = new Set(['protected', 'limited', 'normal', 'unavailable']);
  const workloads = new Set(['protected', 'limited', 'normal', 'unavailable']);
  const proximity = new Set(['imminent', 'upcoming', 'none', 'unavailable']);
  const privateDutyTypes = new Set(['ward', 'clinic', 'procedure', 'oncall', 'night', 'annual_leave', 'study_leave']);
  let authListenerAttached = false;
  let rotaRef = null;
  let weekRef = null;
  let callbacks = {};

  function exactKeys(value, expected) {
    return value && typeof value === 'object' && !Array.isArray(value)
      && Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key));
  }

  function validateRotaSummary(value) {
    if (!exactKeys(value, ['today', 'week', 'attention'])) return null;
    const { today, week, attention } = value;
    if (!exactKeys(today, ['dutyState', 'capacity', 'conflict']) || !dutyStates.has(today.dutyState) || !capacities.has(today.capacity) || typeof today.conflict !== 'boolean') return null;
    if (!exactKeys(week, ['workload', 'recovery', 'protectedStudyWindow', 'nextDutyProximity']) || !workloads.has(week.workload) || typeof week.recovery !== 'boolean' || typeof week.protectedStudyWindow !== 'boolean' || !proximity.has(week.nextDutyProximity)) return null;
    if (!exactKeys(attention, ['conflict', 'recoveryProtection']) || typeof attention.conflict !== 'boolean' || typeof attention.recoveryProtection !== 'boolean') return null;
    return { today: { ...today }, week: { ...week }, attention: { ...attention } };
  }

  function validatePrivateWeekSummary(value) {
    if (!exactKeys(value, ['generatedAt', 'days']) || typeof value.generatedAt !== 'string' || Number.isNaN(new Date(value.generatedAt).getTime()) || !Array.isArray(value.days) || value.days.length !== 7) return null;
    const days = [];
    for (const day of value.days) {
      if (!exactKeys(day, ['date', 'duties']) || typeof day.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Array.isArray(day.duties) || !day.duties.every(duty => privateDutyTypes.has(duty))) return null;
      days.push({ date: day.date, duties: [...new Set(day.duties)] });
    }
    return { generatedAt: value.generatedAt, days };
  }

  function projectPrivateWeekForDisplay(value) {
    const summary = validatePrivateWeekSummary(value);
    if (!summary) return null;
    const labels = { ward: 'Ward', clinic: 'Clinic', procedure: 'Procedure', oncall: 'On call', night: 'Night', annual_leave: 'Annual leave', study_leave: 'Study leave' };
    return summary.days.map(day => {
      const date = new Date(`${day.date}T00:00:00`);
      const protectedDay = day.duties.includes('annual_leave') || day.duties.includes('study_leave');
      const working = day.duties.length > 0 && !protectedDay;
      return {
        date: day.date,
        weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
        dayNum: date.getDate(),
        context: protectedDay ? 'protected' : working ? 'working' : 'unknown',
        workloadBand: day.duties.some(duty => duty === 'oncall' || duty === 'night') ? 'limited' : working ? 'normal' : 'unknown',
        studyBand: day.duties.includes('study_leave') ? 'long' : 'none',
        categories: day.duties.map(duty => labels[duty]),
      };
    });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Unable to load ${src}`));
      document.head.appendChild(script);
    });
  }

  async function ensureFirebase() {
    if (!root.firebase) await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
    if (typeof root.firebase.database !== 'function') await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js');
    if (typeof root.firebase.auth !== 'function') await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js');
    if (!(root.firebase.apps && root.firebase.apps.length)) root.firebase.initializeApp(FIREBASE_CONFIG);
    return { auth: root.firebase.auth(), db: root.firebase.database() };
  }

  function stopRotaListener() {
    if (rotaRef) rotaRef.off();
    if (weekRef) weekRef.off();
    rotaRef = null;
    weekRef = null;
  }

  async function start(options = {}) {
    callbacks = options;
    const { auth, db } = await ensureFirebase();
    if (authListenerAttached) return;
    authListenerAttached = true;
    auth.onAuthStateChanged(user => {
      stopRotaListener();
      if (!user) {
        callbacks.onState?.('signed-out');
        return;
      }
      callbacks.onState?.('loading');
      rotaRef = db.ref(`homePrivate/${user.uid}/rota`);
      rotaRef.on('value', snapshot => {
        const summary = validateRotaSummary(snapshot.val());
        if (!summary) {
          callbacks.onState?.('unpublished');
          return;
        }
        callbacks.onSummary?.(summary);
      }, () => callbacks.onState?.('unavailable'));
      weekRef = db.ref(`homePrivate/${user.uid}/rotaWeek`);
      weekRef.on('value', snapshot => {
        const week = projectPrivateWeekForDisplay(snapshot.val());
        if (week) callbacks.onWeek?.(week);
      }, () => callbacks.onState?.('unavailable'));
    });
  }

  async function signIn() {
    const { auth } = await ensureFirebase();
    if (auth.currentUser) return auth.currentUser;
    return auth.signInWithPopup(new root.firebase.auth.GoogleAuthProvider());
  }

  return { validateRotaSummary, validatePrivateWeekSummary, projectPrivateWeekForDisplay, start, signIn };
});
