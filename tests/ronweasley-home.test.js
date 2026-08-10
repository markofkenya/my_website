const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'home.html'), 'utf8');

const REQUIRED_LINKS = [
  'index.html',
  'budget.html',
  'SCE.html',
  'sce-quiz/index.html',
  'sce-quiz-pdf.html',
  'rota.html',
  'oncall-tracker.html',
  'ARCP.html',
];

test('defines minimal source-owned contracts before rendering new operational signals', () => {
  const contractPath = path.join(__dirname, '..', 'HOME-SUMMARY-CONTRACTS.md');
  assert.ok(fs.existsSync(contractPath), 'expected Home summary contracts document');
  const contracts = fs.readFileSync(contractPath, 'utf8');
  for (const source of ['Rota', 'SCE', 'Portfolio', 'Task Monitor', 'Calendar']) {
    assert.match(contracts, new RegExp(`## ${source}`));
  }
  assert.match(contracts, /read-only/i);
  assert.match(contracts, /ARCP remains the portfolio record/i);
  assert.doesNotMatch(contracts, /api[_ -]?key/i);
  assert.doesNotMatch(contracts, /token/i);
});

test('centres the operational home around Today, This week and Attention', () => {
  for (const id of ['today', 'this-week', 'attention']) {
    assert.match(html, new RegExp(`<section\\b[^>]*\\bid="${id}"`));
  }
  assert.match(html, /RON\s*\/\/\s*FLIGHT CONSOLE/);
  assert.match(html, /Read-only signal layer/i);
});

test('uses the flight-console hierarchy: Now first, then week, workstreams and attention', () => {
  const now = html.indexOf('id="today"');
  const week = html.indexOf('id="this-week"');
  const workstreams = html.indexOf('id="workstreams"');
  const attention = html.indexOf('id="attention"');
  assert.ok(now >= 0 && now < week && week < workstreams && workstreams < attention);
  assert.match(html, /<button[^>]*id="all-systems-toggle"[^>]*>All systems<\/button>/);
  assert.match(html, /id="all-systems"[^>]*\bhidden\b/);
});

test('renders a quiet, honest Now state when the rota aggregate is unavailable', () => {
  const section = extractSection('today');
  assert.match(section, /Awaiting a published capacity summary/i);
  assert.match(section, /Open InstaRota/i);
  assert.doesNotMatch(section, /\b\d+\b/);
  assert.doesNotMatch(section, /(sleep debt|drift|shift|location|rota code)/i);
});

test('keeps Attention explicitly unavailable until its source-owned feeds publish', () => {
  const section = extractSection('attention');
  assert.match(section, /Awaiting published source signals/i);
  assert.doesNotMatch(section, /No source-backed blocker is published/i);
  assert.doesNotMatch(section, /If it mattered, it would be here/i);
});

test('keeps unavailable source panels honest instead of inventing live metrics', () => {
  for (const id of ['rota-signal', 'portfolio-signal', 'task-signal', 'calendar-signal']) {
    const section = extractSection(id);
    assert.match(section, /awaiting a published read-only summary/i);
    assert.doesNotMatch(section, /\b\d+\b/);
  }
});

test('links to every required launcher tool by relative href', () => {
  for (const href of REQUIRED_LINKS) {
    assert.match(
      html,
      new RegExp(`href="${href.replace(/[.+*?^${}()|[\]\\]/g, '\\$&')}"`),
      `expected a launcher link to ${href}`
    );
  }
});

test('does not include the Home Team Tracker launcher', () => {
  assert.doesNotMatch(html, /href="chore\.html"/);
  assert.doesNotMatch(html, /Home Team Tracker/);
});

test('launcher hrefs are relative, not absolute or external', () => {
  const hrefs = [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map(m => m[1]);
  assert.ok(hrefs.length > 0, 'expected at least one launcher link');
  for (const href of hrefs) {
    assert.doesNotMatch(href, /^https?:\/\//, `href should be relative, got ${href}`);
    assert.notEqual(href[0], '/', `href should be relative, got ${href}`);
  }
});

test('groups launcher cards under General, SCE and Admin headings', () => {
  assert.match(html, /<h2[^>]*id="h-general"[^>]*>General<\/h2>/);
  assert.match(html, /<h2[^>]*id="h-sce"[^>]*>SCE<\/h2>/);
  assert.match(html, /<h2[^>]*id="h-admin"[^>]*>Admin<\/h2>/);
});

test('exposes a Ron / SCE / Admin role switcher as an accessible radiogroup', () => {
  assert.match(html, /role="radiogroup"/);
  assert.match(html, /data-role="ron"[^>]*>Ron<\/button>/);
  assert.match(html, /data-role="sce"[^>]*>SCE<\/button>/);
  assert.match(html, /data-role="admin"[^>]*>Admin<\/button>/);
  // exactly one role button starts checked
  const roleButtons = [...html.matchAll(/<button[^>]*role="radio"[^>]*>/g)].map(m => m[0]);
  const checkedCount = roleButtons.filter(btn => /aria-checked="true"/.test(btn)).length;
  assert.equal(checkedCount, 1);
});

test('persists the role filter choice via localStorage, not a live backend', () => {
  assert.match(html, /STORAGE_KEY\s*=\s*"rwhome:role"/);
  assert.match(html, /localStorage\.setItem\(STORAGE_KEY/);
  assert.match(html, /localStorage\.getItem\(STORAGE_KEY\)/);
});

test('states the static Telegram routing table with no numeric chat/account IDs', () => {
  const routing = [
    ['General', 'Ron / default'],
    ['SCE Quiz', 'sce'],
    ['SCE Debrief', 'sce'],
    ['SCE Recall', 'sce'],
    ['Rota', 'admin'],
    ['Portfolio', 'admin'],
  ];
  for (const [surface, dest] of routing) {
    assert.match(html, new RegExp(`<dt>${surface}</dt>\\s*<dd>${dest.replace('/', '\\/')}</dd>`));
  }
  // No long digit runs anywhere in the document (Telegram chat/user IDs are long numbers)
  assert.doesNotMatch(html, /\b\d{6,}\b/, 'document should not contain numeric ID-like strings');
});

test('states the source-of-truth note for Firebase, ledger, Telegram and dashboard', () => {
  assert.match(html, /<span class="howworks-term">Firebase<\/span><span>QBank record<\/span>/);
  assert.match(html, /<span class="howworks-term">Ledger<\/span><span>Recall state<\/span>/);
  assert.match(html, /<span class="howworks-term">Telegram<\/span><span>Interaction<\/span>/);
  assert.match(html, /<span class="howworks-term">Dashboard<\/span><span>Decision support<\/span>/);
});

test('contains no Firebase SDK imports, config objects or API key strings', () => {
  assert.doesNotMatch(html, /firebaseConfig/i);
  assert.doesNotMatch(html, /apiKey/);
  assert.doesNotMatch(html, /AIzaSy[\w-]+/);
  assert.doesNotMatch(html, /initializeApp/);
  assert.doesNotMatch(html, /gstatic\.com\/firebasejs/);
  // The only permitted Firebase RTDB reference is the one published, read-only
  // learning-loop summary endpoint fetched natively (no SDK).
  const firebaseHostMatches = [...html.matchAll(/[\w.-]*firebasedatabase\.app[^\s"']*/g)].map(m => m[0]);
  assert.deepEqual(
    firebaseHostMatches.sort(),
    [
      'task-monitor-bd7ee-default-rtdb.europe-west1.firebasedatabase.app/arcpData/hermesDashboard.json',
      'task-monitor-bd7ee-default-rtdb.europe-west1.firebasedatabase.app/sceData/hermesDashboard.json'
    ].sort(),
    'only the two published read-only aggregate endpoints may reference firebasedatabase.app'
  );
});

test('is a static, self-contained page apart from the one permitted read-only learning-loop fetch', () => {
  assert.doesNotMatch(html, /<iframe/i);
  assert.doesNotMatch(html, /<form/i);
  assert.doesNotMatch(html, /<input/i);
  assert.doesNotMatch(html, /<script[^>]+src=/i);
  assert.doesNotMatch(html, /<link[^>]+href="https?:/i);
  assert.doesNotMatch(html, /XMLHttpRequest/);
  // Exactly one native fetch call is permitted: the learning-loop summary GET.
  const fetchCalls = html.match(/\bfetch\(/g) || [];
  assert.equal(fetchCalls.length, 2, 'expected exactly two aggregate fetch calls in the whole page');
});

test('avoids emoji and fake live metrics/counters in card copy', () => {
  assert.doesNotMatch(html, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  assert.doesNotMatch(html, /\bstat-val\b/);
});

test('meets a 44px minimum tap target for interactive controls', () => {
  assert.match(html, /min-height:\s*44px/);
});

test('declares reduced-motion support and only system font stacks', () => {
  assert.match(html, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(html, /fonts\.googleapis\.com/);
  assert.doesNotMatch(html, /@font-face/);
});

// ── Phase 2: SCE Learning Loop summary tile ──────────────────────────────

const LEARNING_LOOP_ENDPOINT =
  'https://task-monitor-bd7ee-default-rtdb.europe-west1.firebasedatabase.app/sceData/hermesDashboard.json';

function extractSection(id) {
  const re = new RegExp(`<section\\b[^>]*\\bid="${id}"[\\s\\S]*?</section>`);
  const m = html.match(re);
  assert.ok(m, `expected a <section id="${id}"> in home.html`);
  return m[0];
}

function extractScriptBlocks() {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
}

test('adds the SCE Learning Loop summary as a Monitor sub-section of Command/Inspect, not a hero', () => {
  const section = extractSection('sce-learning-loop');
  // Lives inside <main>, styled like the existing reference panels (not a
  // full-width hero) and carries a heading identifying it as the loop summary.
  const mainIndex = html.indexOf('<main');
  const mainEndIndex = html.indexOf('</main>');
  const sectionIndex = html.indexOf(section);
  assert.ok(sectionIndex > mainIndex && sectionIndex < mainEndIndex, 'section should live inside <main>');
  assert.match(section, /class="[^"]*\bpanel\b[^"]*"/);
  assert.doesNotMatch(section, /\bhero\b/i);
  assert.match(section, /SCE Learning Loop/);
});

test('fetches the learning-loop summary only from the one permitted Hermes endpoint via native fetch', () => {
  const scripts = extractScriptBlocks();
  const escaped = LEARNING_LOOP_ENDPOINT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  assert.match(scripts, new RegExp(escaped), 'expected the exact permitted endpoint string in the page script');
  assert.match(scripts, /\bfetch\(\s*\w+\s*,/, 'expected a fetch(ENDPOINT, {...}) call');
});

test('uses GET only for the learning-loop fetch, no method override', () => {
  const scripts = extractScriptBlocks();
  assert.doesNotMatch(scripts, /method\s*:\s*["'](POST|PUT|DELETE|PATCH)["']/i);
});

test('applies a short timeout to the learning-loop fetch via AbortController', () => {
  const scripts = extractScriptBlocks();
  assert.match(scripts, /AbortController/);
  assert.match(scripts, /setTimeout/);
  assert.match(scripts, /\.abort\(\)/);
  assert.match(scripts, /signal\s*:/);
});

test('renders a calm loading state for the learning-loop summary before data resolves', () => {
  const section = extractSection('sce-learning-loop');
  assert.match(section, /id="loop-status"[^>]*>[^<]*Loading/);
  assert.match(section, /aria-live="polite"|role="status"/);
  assert.match(section, /id="loop-list"[^>]*\bhidden\b/);
});

test('labels the three allowed active-learning fields: recall due, weak concepts, pending debriefs', () => {
  const section = extractSection('sce-learning-loop');
  assert.match(section, /<dt>Recall due<\/dt>\s*<dd[^>]*id="loop-recall-due"/);
  assert.match(section, /<dt>Weak concepts<\/dt>\s*<dd[^>]*id="loop-weak-concepts"/);
  assert.match(section, /<dt>Pending debriefs<\/dt>\s*<dd[^>]*id="loop-pending-debriefs"/);
});

test('excludes delivered/unconfirmed, strong, taxonomy, coverage and completion-target from the loop UI', () => {
  const section = extractSection('sce-learning-loop');
  assert.doesNotMatch(section, /delivered/i);
  assert.doesNotMatch(section, /unconfirmed/i);
  assert.doesNotMatch(section, /\bstrong\b/i);
  assert.doesNotMatch(section, /taxonomy/i);
  assert.doesNotMatch(section, /coverage/i);
  assert.doesNotMatch(section, /completion target/i);
});

test('never renders raw per-topic learning-loop data (topic ids, question stems, taxonomy counts)', () => {
  assert.doesNotMatch(html, /neverDelivered/);
  assert.doesNotMatch(html, /taxonomyConcepts/);
  assert.doesNotMatch(html, /sodium-water|acid-base-potassium|ckd-esrd/);
});

test('never displays the learning-loop endpoint URL outside of the script block', () => {
  const nonScriptHtml = html.replace(/<script>[\s\S]*?<\/script>/g, '');
  assert.doesNotMatch(nonScriptHtml, /firebasedatabase\.app/);
  const scripts = extractScriptBlocks();
  assert.match(scripts, /firebasedatabase\.app/);
});

test('shows a clear unavailable state on fetch failure without fabricating numbers', () => {
  const scripts = extractScriptBlocks();
  assert.match(scripts, /unavailable/i);
  const section = extractSection('sce-learning-loop');
  // Placeholder content before/without live data must not be a fabricated number.
  assert.match(section, /<dd[^>]*id="loop-recall-due"[^>]*>—<\/dd>/);
  assert.match(section, /<dd[^>]*id="loop-weak-concepts"[^>]*>—<\/dd>/);
  assert.match(section, /<dd[^>]*id="loop-pending-debriefs"[^>]*>—<\/dd>/);
});

test('treats malformed active-learning counts as unavailable rather than displaying them', () => {
  const scripts = extractScriptBlocks();
  assert.match(scripts, /Number\.isSafeInteger/);
  assert.match(scripts, /value\s*>=\s*0/);
  assert.match(scripts, /isSafeCount\(recallDue\)/);
  assert.match(scripts, /isSafeCount\(weakConcepts\)/);
  assert.match(scripts, /isSafeCount\(pendingDebriefs\)/);
});

test('handles the learning-loop fetch in its own guarded scope so a failure cannot break the role/launcher script', () => {
  const scripts = extractScriptBlocks();
  assert.match(scripts, /\.catch\(/);
  // Role switching must still be wired up independently of the loop fetch.
  assert.match(html, /STORAGE_KEY\s*=\s*"rwhome:role"/);
});

test('Phase 2: Home Team Tracker remains absent', () => {
  assert.doesNotMatch(html, /href="chore\.html"/);
  assert.doesNotMatch(html, /Home Team Tracker/);
});

test('describes the Phase 2 page accurately as having one read-only live summary', () => {
  assert.match(html, /One read-only SCE Learning Loop summary is live on this page\./);
  assert.doesNotMatch(html, /No live data connections on this page\./);
});

// ── Phase 2 extension: unconnected Admin monitor panels (Rota, Portfolio) ──

const UNCONNECTED_PANEL_IDS = [
  { id: 'rota-next-shift', heading: 'Rota next shift' },
  { id: 'portfolio-pending-items', heading: 'Portfolio pending items' },
];

test('adds compact Admin monitor panels for Rota next shift and Portfolio pending items', () => {
  const mainIndex = html.indexOf('<main');
  const mainEndIndex = html.indexOf('</main>');
  for (const { id, heading } of UNCONNECTED_PANEL_IDS) {
    const section = extractSection(id);
    const sectionIndex = html.indexOf(section);
    assert.ok(sectionIndex > mainIndex && sectionIndex < mainEndIndex, `${id} should live inside <main>`);
    assert.match(section, /class="[^"]*\bpanel\b[^"]*"/, `${id} should use the shared .panel styling`);
    assert.match(section, new RegExp(`<h2[^>]*>${heading}</h2>`), `${id} should carry the heading "${heading}"`);
  }
});

test('each new monitor panel explicitly states it is not connected yet', () => {
  for (const { id } of UNCONNECTED_PANEL_IDS) {
    const section = extractSection(id);
    assert.match(section, /not connected yet/i, `${id} should say it is not connected yet`);
  }
});

test('each new monitor panel says the source and authentication will be added later, without implementing either', () => {
  for (const { id } of UNCONNECTED_PANEL_IDS) {
    const section = extractSection(id);
    assert.match(section, /source/i);
    assert.match(section, /authentication/i);
    assert.match(section, /(will be added|added later|not yet (added|connected))/i);
    // No forms/inputs anywhere already asserted globally; these panels must not
    // additionally claim or imply that auth already exists or is in use.
    assert.doesNotMatch(section, /\bauthenticated\b/i);
    assert.doesNotMatch(section, /(sign|log)(ged)?[\s-]?in\b/i);
    assert.doesNotMatch(section, /\bpassword\b/i);
    assert.doesNotMatch(section, /\btoken\b/i);
    assert.doesNotMatch(section, /\bsession\b/i);
    assert.doesNotMatch(section, /\bcredential/i);
    assert.doesNotMatch(section, /\boauth\b/i);
    assert.doesNotMatch(section, /\bbearer\b/i);
  }
});

function visibleText(sectionHtml) {
  return sectionHtml.replace(/<[^>]+>/g, ' ');
}

test('new monitor panels contain no numbers, dates, placeholder shift names or fabricated statuses', () => {
  for (const { id } of UNCONNECTED_PANEL_IDS) {
    const text = visibleText(extractSection(id));
    assert.doesNotMatch(text, /\d/, `${id} should contain no digits`);
    assert.doesNotMatch(text, /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
    assert.doesNotMatch(text, /(january|february|march|april|may|june|july|august|september|october|november|december)/i);
    assert.doesNotMatch(text, /\b(today|tomorrow|tonight)\b/i);
    assert.doesNotMatch(text, /(night|late|early|long day|day)\s+shift/i);
    assert.doesNotMatch(text, /on-call\b/i);
    assert.doesNotMatch(text, /(confirmed|approved|rejected|overdue|awaiting|in review|completed|outstanding)\b/i);
  }
});

test('new monitor panels add no API/config/endpoint terms or forms/inputs', () => {
  for (const { id } of UNCONNECTED_PANEL_IDS) {
    const section = extractSection(id);
    assert.doesNotMatch(section, /endpoint/i);
    assert.doesNotMatch(section, /api[_ -]?key/i);
    assert.doesNotMatch(section, /\bconfig(uration)?\b/i);
    assert.doesNotMatch(section, /https?:\/\//i);
    assert.doesNotMatch(section, /firebasedatabase\.app/i);
    assert.doesNotMatch(section, /initializeApp/);
    assert.doesNotMatch(section, /<form/i);
    assert.doesNotMatch(section, /<input/i);
  }
});

test('adding the two new monitor panels introduces zero additional fetch calls', () => {
  // The only permitted fetch in the entire page remains the SCE Learning Loop one.
  const fetchCalls = html.match(/\bfetch\(/g) || [];
  assert.equal(fetchCalls.length, 2, 'expected two approved aggregate fetch calls');
  for (const { id } of UNCONNECTED_PANEL_IDS) {
    const section = extractSection(id);
    assert.doesNotMatch(section, /\bfetch\(/);
    assert.doesNotMatch(section, /XMLHttpRequest/);
    assert.doesNotMatch(section, /WebSocket/);
    assert.doesNotMatch(section, /EventSource/);
  }
});

test('the SCE Learning Loop endpoint contract is unchanged by the new panels', () => {
  const escaped = LEARNING_LOOP_ENDPOINT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = html.match(new RegExp(escaped, 'g')) || [];
  assert.equal(matches.length, 1, 'the learning-loop endpoint string should still appear exactly once');
  const loopSection = extractSection('sce-learning-loop');
  assert.match(loopSection, /<dt>Recall due<\/dt>\s*<dd[^>]*id="loop-recall-due"/);
  assert.match(loopSection, /<dt>Weak concepts<\/dt>\s*<dd[^>]*id="loop-weak-concepts"/);
  assert.match(loopSection, /<dt>Pending debriefs<\/dt>\s*<dd[^>]*id="loop-pending-debriefs"/);
});
