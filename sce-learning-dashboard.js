(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SceLearningDashboard = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const MAX_TOPICS = 10;
  const MAX_ACTIONS = 4;

  function safeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0;
  }

  function plainText(value) {
    return String(value ?? '')
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapeHtml(value) {
    return plainText(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeTopic(topic) {
    return {
      name: plainText(topic?.name) || 'Unlabelled topic',
      neverDelivered: safeNumber(topic?.neverDelivered),
      deliveredUnconfirmed: safeNumber(topic?.deliveredUnconfirmed),
      weak: safeNumber(topic?.weak),
      strong: safeNumber(topic?.strong),
      due: safeNumber(topic?.due),
    };
  }

  function normalizeAction(action) {
    return {
      label: plainText(action?.label) || 'Learning task',
      detail: plainText(action?.detail),
      kind: plainText(action?.kind).toLowerCase() || 'review',
    };
  }

  function normalizeDashboard(raw, now = new Date()) {
    const data = raw && typeof raw === 'object' ? raw : {};
    const summary = data.summary && typeof data.summary === 'object' ? data.summary : {};
    const generated = data.generatedAt ? new Date(data.generatedAt) : null;
    const generatedAt = generated && !Number.isNaN(generated.getTime()) ? generated.toISOString() : null;
    const ready = Boolean(generatedAt || data.ready === true);

    return {
      ready,
      generatedAt,
      statusLabel: ready ? 'LIVE LEARNING SYNC' : 'AWAITING HERMES SYNC',
      summary: {
        taxonomyConcepts: safeNumber(summary.taxonomyConcepts),
        deliveredUnconfirmed: safeNumber(summary.deliveredUnconfirmed),
        weak: safeNumber(summary.weak),
        strong: safeNumber(summary.strong),
        cardsDue: safeNumber(summary.cardsDue),
        pendingDebriefs: safeNumber(summary.pendingDebriefs),
      },
      tracker: {
        incorrect: safeNumber(data.tracker?.incorrect),
        flagged: safeNumber(data.tracker?.flagged),
        unresolvedErrors: safeNumber(data.tracker?.unresolvedErrors),
      },
      topics: Array.isArray(data.topics) ? data.topics.slice(0, MAX_TOPICS).map(normalizeTopic) : [],
      nextActions: Array.isArray(data.nextActions) ? data.nextActions.slice(0, MAX_ACTIONS).map(normalizeAction) : [],
      checkedAt: now instanceof Date && !Number.isNaN(now.getTime()) ? now.toISOString() : null,
    };
  }

  function formatTimestamp(value) {
    if (!value) return 'not yet synced';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'not yet synced';
    return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function topicState(topic) {
    const total = topic.neverDelivered + topic.deliveredUnconfirmed + topic.weak + topic.strong;
    if (!total) return { total: 0, strongPct: 0 };
    return { total, strongPct: Math.round((topic.strong / total) * 100) };
  }

  function renderDashboard(model) {
    const data = model && typeof model === 'object' ? model : normalizeDashboard(null);
    const s = data.summary;
    const tracker = data.tracker;
    const topicRows = data.topics.length
      ? data.topics.map(topic => {
          const state = topicState(topic);
          return `<div class="ll-topic-row">
            <div class="ll-topic-name">${escapeHtml(topic.name)}</div>
            <div class="ll-topic-counts"><span class="ll-unconfirmed">${topic.deliveredUnconfirmed} pending</span><span class="ll-weak">${topic.weak} weak</span><span class="ll-strong">${topic.strong} strong</span></div>
            <div class="ll-topic-bar" aria-label="${state.strongPct}% confirmed strong"><span style="width:${state.strongPct}%"></span></div>
            <div class="ll-topic-due">${topic.due} due</div>
          </div>`;
        }).join('')
      : `<div class="empty-msg">No Hermes learning data yet. The tracker is connected; concept coverage appears after the first sync.</div>`;
    const actionRows = data.nextActions.length
      ? data.nextActions.map(action => `<div class="ll-action"><span class="ll-action-kind">${escapeHtml(action.kind)}</span><div><strong>${escapeHtml(action.label)}</strong>${action.detail ? `<small>${escapeHtml(action.detail)}</small>` : ''}</div></div>`).join('')
      : `<div class="empty-msg">No queued retrieval tasks. The first Hermes sync will add due recall and case work here.</div>`;

    return `<div class="sec-head">
      <span class="sec-title">LEARNING LOOP</span><span class="sec-rule"></span>
      <span class="ll-status ${data.ready ? 'live' : 'pending'}">● ${escapeHtml(data.statusLabel)}</span>
    </div>
    <div class="ll-intro">QBank errors and weak-case performance → targeted recall ledger → Telegram retrieval. Last ledger sync: ${escapeHtml(formatTimestamp(data.generatedAt))}.</div>
    <section class="ll-section">
      <div class="ll-section-title">ACTIVE RECALL SIGNALS</div>
      <div class="ll-metrics">
        <div class="ll-metric"><span>TAXONOMY REFERENCES</span><strong>${s.taxonomyConcepts}</strong><small>guide only</small></div>
        <div class="ll-metric"><span>UNCONFIRMED</span><strong class="ll-unconfirmed">${s.deliveredUnconfirmed}</strong></div>
        <div class="ll-metric"><span>WEAK</span><strong class="ll-weak">${s.weak}</strong></div>
        <div class="ll-metric"><span>CONFIRMED STRONG</span><strong class="ll-strong">${s.strong}</strong></div>
        <div class="ll-metric"><span>RECALL DUE</span><strong class="ll-due">${s.cardsDue}</strong></div>
        <div class="ll-metric"><span>DEBRIEFS PENDING</span><strong>${s.pendingDebriefs}</strong></div>
      </div>
    </section>
    <section class="ll-section">
      <div class="ll-section-title">LIVE QBANK SIGNALS</div>
      <div class="ll-metrics ll-tracker-metrics">
        <div class="ll-metric"><span>INCORRECT</span><strong class="ll-weak">${tracker.incorrect}</strong><small>current tracker</small></div>
        <div class="ll-metric"><span>FLAGGED</span><strong class="ll-unconfirmed">${tracker.flagged}</strong><small>current tracker</small></div>
        <div class="ll-metric"><span>UNRESOLVED ERRORS</span><strong class="ll-weak">${tracker.unresolvedErrors}</strong><small>current tracker</small></div>
      </div>
    </section>
    <section class="ll-section"><div class="ll-section-title">BY MAIN TOPIC</div><div class="ll-topic-list">${topicRows}</div></section>
    <section class="ll-section"><div class="ll-section-title">NEXT RETRIEVAL ACTIONS</div><div class="ll-action-list">${actionRows}</div></section>`;
  }

  return { normalizeDashboard, renderDashboard, plainText };
});
