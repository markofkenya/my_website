(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ScePrivateSummary = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const TOPICS = {
    'Sodium and Water Abnormalities': 'sodium-water',
    'Acid–Base and Potassium Disorders': 'potassium-acid-base',
    'Calcium, Phosphorus, and Magnesium Disorders and Stones': 'calcium-phosphate',
    'Acute Kidney Injury and ICU Nephrology': 'acute-kidney-injury',
    'Chronic Kidney Disease': 'chronic-kidney-disease',
    'Glomerular and Vascular Disorders': 'glomerular-vascular',
    'Hypertension': 'hypertension',
    'Kidney Transplantation': 'kidney-transplantation',
    'Pharmacology': 'pharmacology',
    'Tubular, Interstitial, and Cystic Disorders': 'tubular-interstitial',
  };

  function isP1Attempted(value) {
    return Boolean(value && (value.p1correct === true || value.p1incorrect === true));
  }

  function buildScePrivateSummary({ category, questions, answers, now = Date.now() }) {
    const activeTopic = TOPICS[category];
    if (!activeTopic || !Array.isArray(questions) || !Number.isFinite(now)) {
      throw new TypeError('A recognised SCE category, questions, answers, and timestamp are required');
    }
    const inCategory = questions.filter(question => question && question.category === category);
    const questionsRemaining = inCategory.filter(question => !isP1Attempted(answers?.[question.code])).length;
    return {
      generatedAt: Math.floor(now),
      activeTopic,
      questionsRemaining,
      needsAttention: questionsRemaining > 0,
    };
  }

  return { TOPICS, buildScePrivateSummary };
});
