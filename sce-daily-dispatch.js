(function (root, factory) {
  const api = factory(typeof require === 'function' ? require('./sce-daily-selection.js') : root.SceDailySelection);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SceDailyDispatch = api;
})(typeof window !== 'undefined' ? window : globalThis, function (selection) {
  function makePendingEvent(candidate, selectionResult, mode) {
    return {
      mode,
      anchor_id: candidate.id,
      anchor_type: candidate.anchor_type,
      anchor_label: candidate.anchor_label,
      topic_key: candidate.topic_key,
      source_reference: candidate.source_reference || candidate.anchor_type,
      cold_case_status: mode === 'daily-loop' ? 'selected' : 'not-applicable',
      mcq_status: mode === 'daily-loop' ? 'not-started' : 'not-applicable',
      outcome: 'pending',
      repeat_permitted: selectionResult.repeat_permitted,
      repeat_reason: selectionResult.repeat_reason,
    };
  }

  function selectDailyDispatch({ candidates, events, random = Math.random } = {}) {
    const quiz = selection.selectDailyAnchor({ candidates, events, random });
    if (!quiz.candidate) return { quiz, cards: { candidate: null, eligible: [], reason: 'no-eligible-anchor' }, quizEvent: null, cardEvent: null };
    const quizEvent = makePendingEvent(quiz.candidate, quiz, 'daily-loop');
    const remaining = (Array.isArray(candidates) ? candidates : []).filter(candidate => candidate.anchor_type === 'tracker-error' && candidate.id !== quiz.candidate.id && candidate.topic_key !== quiz.candidate.topic_key);
    const cards = selection.selectDailyAnchor({ candidates: remaining, events: [...(Array.isArray(events) ? events : []), quizEvent], random });
    if (!cards.candidate) return { quiz, cards, quizEvent, cardEvent: null };
    const cardEvent = makePendingEvent(cards.candidate, cards, 'daily-cards');
    return { quiz, cards, quizEvent, cardEvent };
  }

  return { selectDailyDispatch };
});
