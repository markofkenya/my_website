const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'home.html'), 'utf8');

test('wires the authenticated Rota reader into Home without a raw rota endpoint', () => {
  assert.match(html, /<script src="home-private-rota\.js"><\/script>/);
  assert.match(html, /id="rota-auth"/);
  assert.match(html, /HomePrivateRota\.start/);
  assert.match(html, /id="week-private-status"/);
  assert.match(html, /id="week-horizon-label"/);
  assert.match(html, /id="week-study-status"/);
  assert.match(html, /id="rota-detail"/);
  assert.match(html, /id="attention-private-state"/);
  assert.match(html, /id="attention-private-status"/);
  assert.doesNotMatch(html, /slotShare\/|homePrivate\//);
});
