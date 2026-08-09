const test = require('node:test');
const assert = require('node:assert/strict');

test('normalises DailyEvents sheet rows and preserves only the defined columns', async () => {
  const { rowsFromDailyEventValues } = await import('../curriculum/scripts/daily-events.mjs');
  const events = rowsFromDailyEventValues([
    ['daily_event_id', 'selected_at', 'mode', 'anchor_id', 'anchor_type', 'anchor_label', 'topic_key', 'source_reference', 'cold_case_status', 'mcq_status', 'outcome', 'repeat_permitted', 'repeat_reason', 'completed_at', 'unexpected'],
    ['daily-1', '2026-08-09T19:00:00Z', 'daily-loop', 'tracker-sodium', 'tracker-error', 'Sodium overcorrection threshold', 'sodium-water.overcorrection', 'SCE briefing', 'completed', 'completed', 'weak', 'no', 'new-anchor', '2026-08-09T19:30:00Z', 'discard'],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
  ]);
  assert.deepEqual(events, [{
    daily_event_id: 'daily-1', selected_at: '2026-08-09T19:00:00Z', mode: 'daily-loop',
    anchor_id: 'tracker-sodium', anchor_type: 'tracker-error', anchor_label: 'Sodium overcorrection threshold',
    topic_key: 'sodium-water.overcorrection', source_reference: 'SCE briefing', cold_case_status: 'completed',
    mcq_status: 'completed', outcome: 'weak', repeat_permitted: 'no', repeat_reason: 'new-anchor',
    completed_at: '2026-08-09T19:30:00Z'
  }]);
});

test('finds the sheet row for an existing daily event without relying on row order', async () => {
  const { dailyEventRowIndex } = await import('../curriculum/scripts/daily-events.mjs');
  assert.equal(dailyEventRowIndex([
    ['daily_event_id', 'outcome'],
    ['daily-old', 'strong'],
    ['daily-target', 'pending']
  ], 'daily-target'), 3);
  assert.equal(dailyEventRowIndex([['daily_event_id'], ['daily-old']], 'missing'), null);
});

test('validates a daily event before it can be written', async () => {
  const { dailyEventRow } = await import('../curriculum/scripts/daily-events.mjs');
  assert.throws(() => dailyEventRow({ anchor_id: 'x' }), /daily_event_id/i);
  assert.deepEqual(dailyEventRow({
    daily_event_id: 'daily-2', selected_at: '2026-08-10T09:00:00Z', mode: 'daily-loop',
    anchor_id: 'study-anca', anchor_type: 'study-resource', anchor_label: 'ANCA vasculitis',
    topic_key: 'glomerular.anca-vasculitis', source_reference: 'Study', cold_case_status: 'selected',
    mcq_status: 'not-started', outcome: 'pending', repeat_permitted: 'no', repeat_reason: 'new-anchor', completed_at: ''
  }), [['daily-2', '2026-08-10T09:00:00Z', 'daily-loop', 'study-anca', 'study-resource', 'ANCA vasculitis', 'glomerular.anca-vasculitis', 'Study', 'selected', 'not-started', 'pending', 'no', 'new-anchor', '']]);
});
