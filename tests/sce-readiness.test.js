const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sceHtml = fs.readFileSync(path.join(__dirname, '..', 'SCE.html'), 'utf8');

test('SCE readiness is based on KSAP performance and coverage only', () => {
  assert.match(
    sceHtml,
    /const readiness\s*=\s*ksapReadiness\s*;/,
    'readiness should use the KSAP readiness score directly'
  );
  assert.doesNotMatch(
    sceHtml,
    /const readiness\s*=\s*[^;]*topicPct[^;]*;/,
    'topic coverage must not contribute to SCE readiness'
  );
});

test('topic coverage remains available as a separate display metric', () => {
  assert.match(sceHtml, /return \{[^}]*topicPct[^}]*readiness[^}]*\};/s);
  assert.match(sceHtml, /hdr-topic-pct/);
});
