const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const moduleUrl = new URL('../curriculum/scripts/sce-chat-anchor.mjs', `file://${__filename}`);
const source = fs.readFileSync(moduleUrl, 'utf8');

test('chat anchor preflight uses meaningful unresolved tracker errors and excludes bare wrong flags', async () => {
  const { trackerCandidates } = await import(moduleUrl);
  const studyFiles = [{ id: 'note-1', name: 'Metabolic acidosis', mimeType: 'application/vnd.google-apps.document' }];
  const candidates = trackerCandidates({
    ksap: {
      semantic: { note: 'Metabolic acidosis compensation uncertainty', resolved: false },
      resolved: { note: 'Metabolic acidosis resolved', resolved: true },
      bareWrong: { p1incorrect: true, resolved: false },
    },
    studyprn: {},
  }, studyFiles);
  assert.deepEqual(candidates.map(item => item.id), ['tracker-ksap-semantic']);
  assert.equal(candidates[0].study_file_id, 'note-1');
});

test('chat anchor preflight identifies only stale pending quiz reservations for cancellation', async () => {
  const { stalePendingEvents } = await import(moduleUrl);
  const now = Date.parse('2026-08-24T12:00:00Z');
  const events = [
    { daily_event_id: 'stale', mode: 'daily-loop', outcome: 'pending', selected_at: '2026-08-22T12:00:00Z' },
    { daily_event_id: 'fresh', mode: 'daily-loop', outcome: 'pending', selected_at: '2026-08-24T11:00:00Z' },
    { daily_event_id: 'recall', mode: 'daily-cards', outcome: 'pending', selected_at: '2026-08-22T12:00:00Z' },
    { daily_event_id: 'done', mode: 'daily-loop', outcome: 'strong', selected_at: '2026-08-22T12:00:00Z' },
  ];
  assert.deepEqual(stalePendingEvents(events, now).map(item => item.daily_event_id), ['stale']);
  assert.match(source, /outcome:\s*'cancelled'/);
  assert.match(source, /appendDailyEvent/);
});

test('chat anchor preflight emits only a bounded reserved anchor and actually-read Study source', () => {
  for (const field of ['daily_event_id', 'anchor_id', 'anchor_label', 'topic_key', 'source_file_id', 'study_source_excerpt']) {
    assert.match(source, new RegExp(field));
  }
  assert.match(source, /docs', 'get'/);
  assert.doesNotMatch(source, /question stem/i);
});
