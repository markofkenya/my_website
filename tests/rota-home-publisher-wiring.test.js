const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'rota.html'), 'utf8');

test('publishes only the allowlisted Rota summary after Google authentication', () => {
  assert.match(html, /<script src="rota-home-summary\.js"><\/script>/);
  assert.match(html, /firebase-auth-compat\.js/);
  assert.match(html, /<script src="hermione-hq-contracts\.js"><\/script>/);
  assert.match(html, /function publishHomeSummary\(\)/);
  assert.match(html, /buildHomePrivateWrite\(homeAuthUser\.uid, state, meKey\)/);
  assert.match(html, /buildHomePrivateWeekWrite\(homeAuthUser\.uid, state, meKey\)/);
  assert.match(html, /db\.ref\(summaryWrite\.path\)\.set\(summaryWrite\.value\)/);
  assert.match(html, /db\.ref\(weekWrite\.path\)\.set\(weekWrite\.value\)/);
  assert.doesNotMatch(html, /homePrivate\/"\+rotaCode|homePrivate\/\$\{rotaCode\}/);
});

test('keeps private Home publication behind an explicit Google sign-in action', () => {
  assert.match(html, /id="homeSyncBtn"/);
  assert.match(html, /function signInForHomeSync\(\)/);
  assert.match(html, /signInWithPopup/);
});
