const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'home.html'), 'utf8');

test('wires the authenticated private Rota reader into Hermione HQ without a raw rota endpoint', () => {
  assert.match(html, /<script src="home-private-rota\.js"><\/script>/);
  assert.match(html, /id="rota-auth"/);
  assert.match(html, /HomePrivateRota\.start/);
  assert.match(html, /onWeek:/);
  assert.match(html, /HomePrivateRota\.signIn/);
  assert.match(html, /private rota sign-in required/);
  assert.doesNotMatch(html, /slotShare\/|homePrivate\//);
});
