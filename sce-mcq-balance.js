(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SceMcqBalance = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const POSITIONS = ['A', 'B', 'C', 'D', 'E'];

  function validateBalancedMcqKey(value) {
    if (!Array.isArray(value) || value.length !== POSITIONS.length) {
      throw new Error('A daily MCQ key must contain exactly five positions.');
    }
    const key = value.map(position => String(position || '').trim().toUpperCase());
    if (key.some(position => !POSITIONS.includes(position)) || [...key].sort().join('') !== POSITIONS.join('')) {
      throw new Error('A daily MCQ key must be a balanced A–E permutation.');
    }
    return key;
  }

  function balancedMcqKey(random = Math.random) {
    if (typeof random !== 'function') throw new Error('MCQ key random must be a function.');
    const positions = [...POSITIONS];
    for (let index = positions.length - 1; index > 0; index -= 1) {
      const value = Number(random());
      const bounded = Number.isFinite(value) ? Math.min(Math.max(value, 0), 0.999999999) : 0;
      const swapIndex = Math.floor(bounded * (index + 1));
      [positions[index], positions[swapIndex]] = [positions[swapIndex], positions[index]];
    }
    return validateBalancedMcqKey(positions);
  }

  return { validateBalancedMcqKey, balancedMcqKey };
});
