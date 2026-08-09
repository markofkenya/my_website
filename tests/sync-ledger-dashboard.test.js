const test = require('node:test');
const assert = require('node:assert/strict');

test('converts a Sheets values matrix into named ledger rows while skipping blank rows', async () => {
  const { rowsFromValues } = await import('../curriculum/scripts/sync-ledger-dashboard.mjs');
  const rows = rowsFromValues([
    ['concept_id', 'main_topic', 'status'],
    ['a', 'ckd-esrd', 'weak'],
    ['', '', ''],
    ['b', 'aki-icu-nephrology', 'strong']
  ]);

  assert.deepEqual(rows, [
    { concept_id: 'a', main_topic: 'ckd-esrd', status: 'weak' },
    { concept_id: 'b', main_topic: 'aki-icu-nephrology', status: 'strong' }
  ]);
});
