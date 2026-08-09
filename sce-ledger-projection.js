(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SceLedgerProjection = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const STATES = ['never_delivered', 'delivered_unconfirmed', 'weak', 'strong'];

  function asRows(value) {
    return Array.isArray(value) ? value.filter(row => row && typeof row === 'object') : [];
  }

  function isDue(value, now) {
    if (!value) return false;
    const due = new Date(value);
    return !Number.isNaN(due.getTime()) && due.getTime() <= now.getTime();
  }

  function makeTopic(id, name) {
    return {
      id,
      name: String(name || id),
      neverDelivered: 0,
      deliveredUnconfirmed: 0,
      weak: 0,
      strong: 0,
      due: 0,
    };
  }

  function buildDashboardProjection(input, now = new Date()) {
    const data = input && typeof input === 'object' ? input : {};
    const date = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
    const topicNames = data.topicNames && typeof data.topicNames === 'object' ? data.topicNames : {};
    const topics = new Map(Object.entries(topicNames).map(([id, name]) => [id, makeTopic(id, name)]));
    const concepts = asRows(data.concepts);
    const cards = asRows(data.cards);
    const attempts = asRows(data.attempts);

    for (const concept of concepts) {
      const topicId = String(concept.main_topic || '').trim();
      const state = String(concept.status || '').trim();
      if (!topicId || !STATES.includes(state)) continue;
      if (!topics.has(topicId)) topics.set(topicId, makeTopic(topicId, topicNames[topicId] || topicId));
      const topic = topics.get(topicId);
      if (state === 'never_delivered') topic.neverDelivered += 1;
      if (state === 'delivered_unconfirmed') topic.deliveredUnconfirmed += 1;
      if (state === 'weak') topic.weak += 1;
      if (state === 'strong') topic.strong += 1;
    }

    const dueCards = cards.filter(card => isDue(card.next_due_at, date));
    const conceptTopics = new Map(concepts.map(concept => [String(concept.concept_id || ''), String(concept.main_topic || '')]));
    for (const card of dueCards) {
      const topicId = conceptTopics.get(String(card.concept_id || ''));
      if (topicId && topics.has(topicId)) topics.get(topicId).due += 1;
    }

    const pendingDebriefs = attempts.filter(attempt => String(attempt.outcome || '').trim() === 'unanswered').length;
    const summary = [...topics.values()].reduce((total, topic) => ({
      taxonomyConcepts: total.taxonomyConcepts + topic.neverDelivered + topic.deliveredUnconfirmed + topic.weak + topic.strong,
      deliveredUnconfirmed: total.deliveredUnconfirmed + topic.deliveredUnconfirmed,
      weak: total.weak + topic.weak,
      strong: total.strong + topic.strong,
      cardsDue: total.cardsDue + topic.due,
      pendingDebriefs: total.pendingDebriefs,
    }), { taxonomyConcepts: 0, deliveredUnconfirmed: 0, weak: 0, strong: 0, cardsDue: 0, pendingDebriefs });

    const nextActions = [];
    if (dueCards.length) nextActions.push({
      kind: 'recall', label: `Review ${dueCards.length} due recall card${dueCards.length === 1 ? '' : 's'}`,
      detail: 'Ratings are not changed until your review is recorded.'
    });
    if (pendingDebriefs) nextActions.push({
      kind: 'debrief', label: `${pendingDebriefs} debrief${pendingDebriefs === 1 ? '' : 's'} pending`,
      detail: 'Complete the linked case or question response before scheduling recall.'
    });
    const weak = [...topics.values()].filter(topic => topic.weak > 0).sort((a, b) => b.weak - a.weak)[0];
    if (weak) nextActions.push({
      kind: 'decision drill', label: `Revisit ${weak.name}`,
      detail: `${weak.weak} weak concept${weak.weak === 1 ? '' : 's'} need targeted retrieval.`
    });

    return {
      ready: true,
      generatedAt: date.toISOString(),
      summary,
      topics: [...topics.values()],
      nextActions: nextActions.slice(0, 4),
    };
  }

  return { buildDashboardProjection };
});
