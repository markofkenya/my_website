const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'home.html'), 'utf8');
const section = id => { const m = html.match(new RegExp(`<section\\b[^>]*id="${id}"[\\s\\S]*?</section>`)); assert.ok(m, `missing ${id}`); return m[0]; };

test('uses the reference console grammar: Now, This week, Workstreams, Attention', () => {
  const positions = ['now', 'this-week', 'workstreams', 'attention'].map(id => html.indexOf(`id="${id}"`));
  assert.ok(positions.every(n => n >= 0));
  assert.deepEqual([...positions].sort((a,b) => a-b), positions);
  assert.match(html, /RICK\s*\/\/\s*FLIGHT CONSOLE/);
  assert.match(section('now'), /CAPACITY STATE/);
  assert.match(section('now'), /RECOMMENDED MOVE/);
  assert.match(section('this-week'), /CAPACITY HORIZON/);
  assert.match(section('attention'), /SOURCE-BACKED ONLY/);
});

test('shows unavailable states rather than the reference document’s invented personal metrics', () => {
  const first = section('now');
  assert.match(first, /Awaiting a published capacity summary/i);
  assert.match(first, /No recommendation is published yet/i);
  assert.doesNotMatch(html, /(SLEEP DEBT|DRIFT|NIGHTS ENDED|32h ago|4h 10m|START 08:00|EXAM IN \d+)/i);
  const visible = html.replace(/<style>[\s\S]*?<\/style>|<script>[\s\S]*?<\/script>/g, '');
  assert.doesNotMatch(visible, /\b\d+%/);
});

test('keeps system navigation secondary and collapsed', () => {
  assert.match(html, /id="all-systems"[^>]*hidden/);
  assert.match(html, /id="all-systems-toggle"[^>]*aria-expanded="false"/);
  for (const href of ['index.html','budget.html','SCE.html','sce-quiz/index.html','sce-quiz-pdf.html','rota.html','oncall-tracker.html','ARCP.html']) assert.match(html, new RegExp(`href="${href.replace(/[./]/g, '\\$&')}"`));
});

test('does not claim unseen attention sources are clear', () => {
  const attention = section('attention');
  assert.match(attention, /Awaiting published source signals/i);
  assert.doesNotMatch(attention, /(nothing else is shown|if it mattered|no blocker)/i);
});

test('keeps the two approved read-only summary fetches and no secrets', () => {
  assert.equal((html.match(/\bfetch\(/g) || []).length, 1);
  assert.match(html, /sceData\/hermesDashboard\.json/);
  assert.match(html, /arcpData\/hermesDashboard\.json/);
  assert.doesNotMatch(html, /(firebaseConfig|apiKey|AIzaSy|initializeApp)/);
});

test('restores the decorative capacity sweep while respecting reduced motion', () => {
  assert.match(html, /capacity-sweep\{from\{transform:translateX\(-100%\)\}to\{transform:translateX\(220%\)\}\}/);
  assert.match(html, /animation:capacity-sweep 5\.5s linear infinite/);
  assert.match(html, /prefers-reduced-motion/);
  assert.match(html, /min-height:\s*44px/);
});
