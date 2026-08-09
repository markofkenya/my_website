const test = require('node:test');
const assert = require('node:assert/strict');
const dashboard = require('../sce-learning-dashboard.js');

test('normalizes an absent Hermes projection into an explicit pending state', () => {
  const result = dashboard.normalizeDashboard(null, new Date('2026-08-09T09:00:00Z'));

  assert.equal(result.ready, false);
  assert.equal(result.summary.cardsDue, 0);
  assert.equal(result.summary.weak, 0);
  assert.equal(result.statusLabel, 'AWAITING HERMES SYNC');
});

test('normalizes dashboard data without leaking arbitrary markup into text fields', () => {
  const result = dashboard.normalizeDashboard({
    generatedAt: '2026-08-09T08:30:00Z',
    summary: { neverDelivered: 12, deliveredUnconfirmed: 3, weak: 4, strong: 9, cardsDue: 5, pendingDebriefs: 2 },
    nextActions: [{ label: '<img src=x onerror=alert(1)>', detail: 'Review due recall cards', kind: 'recall' }],
    topics: [{ name: 'Acute Kidney Injury', neverDelivered: 2, weak: 1, strong: 4, due: 3 }],
  }, new Date('2026-08-09T09:00:00Z'));

  assert.equal(result.ready, true);
  assert.equal(result.summary.cardsDue, 5);
  assert.equal(result.nextActions[0].label, 'img src=x onerror=alert(1)');
  assert.equal(result.topics[0].name, 'Acute Kidney Injury');
});

test('renders the dashboard with a useful empty state and live metrics', () => {
  const empty = dashboard.renderDashboard(dashboard.normalizeDashboard(null));
  assert.match(empty, /AWAITING HERMES SYNC/);
  assert.match(empty, /No Hermes learning data yet/);

  const ready = dashboard.renderDashboard(dashboard.normalizeDashboard({
    generatedAt: '2026-08-09T08:30:00Z',
    summary: { neverDelivered: 12, deliveredUnconfirmed: 3, weak: 4, strong: 9, cardsDue: 5, pendingDebriefs: 2 },
    nextActions: [{ label: 'Recall queue', detail: 'Review 5 due cards', kind: 'recall' }],
    topics: [{ name: 'Acute Kidney Injury', neverDelivered: 2, weak: 1, strong: 4, due: 3 }],
  }));
  assert.match(ready, /LEARNING LOOP/);
  assert.match(ready, /5/);
  assert.match(ready, /Acute Kidney Injury/);
});

test('calculates topic strength from active learning events, not undelivered taxonomy references', () => {
  const html = dashboard.renderDashboard(dashboard.normalizeDashboard({
    generatedAt: '2026-08-09T08:30:00Z',
    summary: { taxonomyConcepts: 3, deliveredUnconfirmed: 0, weak: 0, strong: 1, cardsDue: 0, pendingDebriefs: 0 },
    topics: [{ name: 'Acute Kidney Injury', neverDelivered: 2, weak: 0, strong: 1, due: 0 }],
  }));
  assert.match(html, /100% confirmed strong/);
  assert.doesNotMatch(html, /2 new/);
});
