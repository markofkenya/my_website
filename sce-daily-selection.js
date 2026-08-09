(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SceDailySelection = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const REPEATABLE_OUTCOMES = new Set(['weak', 'incomplete']);
  const BLOCKING_OUTCOMES = new Set(['pending', 'unanswered', 'strong']);

  function text(value) {
    return String(value || '').trim();
  }

  function normaliseCandidate(value) {
    const candidate = value && typeof value === 'object' ? value : {};
    const id = text(candidate.id || candidate.anchor_id);
    const anchorType = text(candidate.anchor_type);
    const anchorLabel = text(candidate.anchor_label);
    const topicKey = text(candidate.topic_key);
    if (!id) throw new Error('Daily selection candidate requires a stable anchor id.');
    if (!topicKey) throw new Error('Daily selection candidate requires a topic_key.');
    if (!anchorType || !anchorLabel) throw new Error('Daily selection candidate requires anchor_type and anchor_label.');
    return { ...candidate, id, anchor_type: anchorType, anchor_label: anchorLabel, topic_key: topicKey };
  }

  function normaliseEvent(value, index) {
    const event = value && typeof value === 'object' ? value : {};
    const completedAt = text(event.completed_at);
    const selectedAt = text(event.selected_at);
    const timestamp = Date.parse(completedAt || selectedAt);
    return {
      anchor_id: text(event.anchor_id),
      topic_key: text(event.topic_key),
      outcome: text(event.outcome).toLowerCase(),
      timestamp: Number.isNaN(timestamp) ? 0 : timestamp,
      index,
    };
  }

  function latestEvent(events) {
    return events.reduce((latest, event) => {
      if (!latest || event.timestamp > latest.timestamp || (event.timestamp === latest.timestamp && event.index > latest.index)) return event;
      return latest;
    }, null);
  }

  function outcomeState(event) {
    if (REPEATABLE_OUTCOMES.has(event.outcome)) {
      return { eligible: true, repeat_permitted: 'yes', repeat_reason: `previous-outcome-${event.outcome}` };
    }
    const reason = BLOCKING_OUTCOMES.has(event.outcome) ? `previous-outcome-${event.outcome}` : 'previously-used';
    return { eligible: false, repeat_permitted: 'no', repeat_reason: reason };
  }

  function previousState(candidate, events) {
    const topicEvent = latestEvent(events.filter(event => event.topic_key === candidate.topic_key));
    if (topicEvent) return outcomeState(topicEvent);
    const anchorEvent = latestEvent(events.filter(event => event.anchor_id === candidate.id));
    if (anchorEvent) return outcomeState(anchorEvent);
    return { eligible: true, repeat_permitted: 'no', repeat_reason: 'new-anchor' };
  }

  function selectDailyAnchor({ candidates, events, random = Math.random } = {}) {
    const normalCandidates = Array.isArray(candidates) ? candidates.map(normaliseCandidate) : [];
    const normalEvents = Array.isArray(events) ? events.map(normaliseEvent) : [];
    if (typeof random !== 'function') throw new Error('Daily selection random must be a function.');

    const considered = normalCandidates.map(candidate => ({ candidate, ...previousState(candidate, normalEvents) }));
    const eligible = considered.filter(item => item.eligible);
    if (!eligible.length) return { candidate: null, eligible: [], reason: 'no-eligible-anchor' };

    const value = Number(random());
    const bounded = Number.isFinite(value) ? Math.min(Math.max(value, 0), 0.999999999) : 0;
    const selected = eligible[Math.floor(bounded * eligible.length)];
    return {
      candidate: selected.candidate,
      eligible: eligible.map(item => item.candidate),
      repeat_permitted: selected.repeat_permitted,
      repeat_reason: selected.repeat_reason,
      reason: 'selected',
    };
  }

  return { selectDailyAnchor };
});
