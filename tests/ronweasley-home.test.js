const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'home.html'), 'utf8');

test('brands the private mission-control surface as Hermione HQ', () => {
  assert.match(html, /<title>Hermione HQ/);
  assert.match(html, /Hermione HQ/i);
  assert.doesNotMatch(html, /RICK\s*\/\/\s*FLIGHT CONSOLE/);
});

test('puts the weekly rota before the mission brief in the page structure', () => {
  const week = html.indexOf('id="sec-week"');
  const now = html.indexOf('id="sec-now"');
  assert.ok(week >= 0, 'weekly rota section missing');
  assert.ok(now >= 0, 'mission brief section missing');
  assert.ok(week < now, 'weekly rota must precede mission brief');
  assert.match(html, /Open full rota/);
  assert.match(html, /View month/);
});

test('retains a concise Hermione mission brief and approval-aware capture workflow', () => {
  assert.match(html, /Today.?s mission/i);
  assert.match(html, /If time/i);
  assert.match(html, /Capture before you finish/i);
  assert.match(html, /What did you do\?/);
  assert.match(html, /awaiting approval/i);
  assert.match(html, /Approve/);
  assert.match(html, /Dismiss/);
  assert.match(html, /Do not include patient-identifiable information/i);
});

test('provides distinct agent workstreams with scoped in-dashboard chat controls', () => {
  for (const agent of ['Ron', 'Hufflepuff', 'Harry', 'Hagrid']) {
    assert.match(html, new RegExp(`Ask ${agent}`));
  }
  assert.match(html, /id="agent-chat"/);
  assert.match(html, /Agent chat is unavailable until private connection is configured/i);
  assert.match(html, /Budget bill signals are intentionally not connected/i);
  assert.match(html, /home-source-summaries\.js\?v=/);
  assert.match(html, /home-private-rota\.js\?v=/);
  assert.match(html, /id="agentSceStatus"/);
  assert.match(html, /id="agentPortfolioStatus"/);
});

test('does not expose Firebase configuration, a rota room, credentials, or raw source paths', () => {
  assert.doesNotMatch(html, /(apiKey\s*:|AIzaSy|slotShare\/|Hermes gateway credential)/i);
});
