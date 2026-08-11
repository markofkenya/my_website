(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HomeSourceSummaries = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  const SOURCE_CONFIG = {
    apiKey: '«redacted»',
    authDomain: 'task-monitor-bd7ee.firebaseapp.com',
    databaseURL: 'https://task-monitor-bd7ee-default-rtdb.europe-west1.firebasedatabase.app',
    projectId: 'task-monitor-bd7ee',
    storageBucket: 'task-monitor-bd7ee.firebasestorage.app',
    messagingSenderId: '544624731364',
    appId: '1:544624731364:web:419d52fa061c5c7b4f38f1',
  };
  const readiness = new Set(['on-track', 'needs-attention', 'at-risk', 'unavailable']);
  const als = new Set(['clear', 'due-soon', 'expired', 'unavailable']);
  const safeText = value => typeof value === 'string' && /^[a-z0-9 ,.'’:/()&+\-–]{1,80}$/i.test(value);
  const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
  const nonNegative = value => Number.isInteger(value) && value >= 0;

  function validateSceSummary(value) {
    if (!exactKeys(value, ['ready', 'generatedAt', 'summary', 'topics']) || typeof value.ready !== 'boolean'
      || typeof value.generatedAt !== 'string' || Number.isNaN(new Date(value.generatedAt).getTime())
      || !exactKeys(value.summary, ['taxonomyConcepts', 'deliveredUnconfirmed', 'weak', 'strong', 'cardsDue', 'pendingDebriefs'])
      || !Object.values(value.summary).every(nonNegative) || !Array.isArray(value.topics)) return null;
    const topics = [];
    for (const topic of value.topics) {
      if (!exactKeys(topic, ['id', 'name', 'neverDelivered', 'deliveredUnconfirmed', 'weak', 'strong', 'due'])
        || !safeText(topic.id) || !safeText(topic.name)
        || !['neverDelivered', 'deliveredUnconfirmed', 'weak', 'strong', 'due'].every(key => nonNegative(topic[key]))) return null;
      topics.push({ ...topic });
    }
    return { ready: value.ready, generatedAt: value.generatedAt, summary: { ...value.summary }, topics };
  }

  function validatePortfolioSummary(value) {
    if (!exactKeys(value, ['readiness', 'risks', 'nextAction'])
      || !exactKeys(value.readiness, ['renal', 'gim', 'cip', 'admin', 'logbook'])
      || !Object.values(value.readiness).every(value => readiness.has(value))
      || !exactKeys(value.risks, ['als', 'annualEvidence', 'procedures'])
      || !als.has(value.risks.als) || typeof value.risks.annualEvidence !== 'boolean'
      || typeof value.risks.procedures !== 'boolean' || !safeText(value.nextAction)) return null;
    return { readiness: { ...value.readiness }, risks: { ...value.risks }, nextAction: value.nextAction };
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src; script.onload = resolve; script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function start(callbacks = {}) {
    if (!root.firebase) await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
    if (typeof root.firebase.database !== 'function') await loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js');
    let app;
    try { app = root.firebase.app('hermione-home-summaries'); }
    catch { app = root.firebase.initializeApp(SOURCE_CONFIG, 'hermione-home-summaries'); }
    const db = app.database();
    db.ref('sceData/hermesDashboard').on('value', snapshot => callbacks.onSce?.(validateSceSummary(snapshot.val())), () => callbacks.onSce?.(null));
    db.ref('arcpData/hermesDashboard').on('value', snapshot => callbacks.onPortfolio?.(validatePortfolioSummary(snapshot.val())), () => callbacks.onPortfolio?.(null));
  }

  return { validateSceSummary, validatePortfolioSummary, start };
});
