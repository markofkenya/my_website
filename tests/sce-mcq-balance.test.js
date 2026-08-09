const test = require('node:test');
const assert = require('node:assert/strict');
const { validateBalancedMcqKey, balancedMcqKey } = require('../sce-mcq-balance.js');

test('accepts exactly one A–E position in a five-question block', () => {
  assert.deepEqual(validateBalancedMcqKey(['D', 'A', 'E', 'B', 'C']), ['D', 'A', 'E', 'B', 'C']);
});

test('rejects a B/C-heavy or malformed five-question key', () => {
  assert.throws(() => validateBalancedMcqKey(['B', 'B', 'C', 'C', 'C']), /permutation/i);
  assert.throws(() => validateBalancedMcqKey(['A', 'B', 'C', 'D']), /five/i);
});

test('creates a balanced random permutation from a deterministic random stream', () => {
  const random = (() => { const values = [0.8, 0.1, 0.4, 0.2]; return () => values.shift(); })();
  const key = balancedMcqKey(random);
  assert.deepEqual(key, ['C', 'D', 'B', 'A', 'E']);
  assert.deepEqual([...key].sort(), ['A', 'B', 'C', 'D', 'E']);
});
