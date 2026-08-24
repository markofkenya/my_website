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

test('offers a separate Hermione HQ connection because ordinary rota access has no Google identity', () => {
  assert.match(html, /id="homeSyncBtn"/);
  assert.match(html, /id="homeSyncStatus"/);
  assert.match(html, /function signInForHomeSync\(\)/);
  assert.match(html, /homeSyncBtn.*signInForHomeSync/);
  assert.match(html, /signInWithPopup/);
  const homeAuthBlock = html.match(/function attachHomeAuthListener\(\)[\s\S]*?function publishHomeSummary\(\)/);
  assert.ok(homeAuthBlock, 'missing restored-session Home auth listener');
  assert.doesNotMatch(homeAuthBlock[0], /signInWithPopup/);
  assert.doesNotMatch(homeAuthBlock[0], /^\s+publishHomeSummary\(\);$/m, 'restoring Google auth must not publish an unidentified cached rota');
});

test('publishes only after a named rota and person have completed source sync', () => {
  assert.match(html, /homePublishRequested/);
  assert.match(html, /if\(!rotaCode\)/);
  assert.match(html, /if\(!meKey\)/);
  assert.match(html, /if\(!firstSyncDone\)/);
  assert.match(html, /const selectedPerson=/);
  assert.match(html, /from rota “\$\{rotaCode\}”/);
  assert.match(html, /dutyDays/);
  assert.match(html, /No explicit duties were found in the published seven-day window/);
  assert.match(html, /homePublishRequested=false;[\s\S]*?rotaCode=code/);
});
