const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'rota.html'), 'utf8');

test('adds a Locum card that opens a dedicated private tracker', () => {
  assert.match(html, /id="hubLocum"/);
  assert.match(html, /id="locumOverlay"/);
  assert.match(html, /id="locumForm"/);
  assert.match(html, /id="locumList"/);
  assert.match(html, /<script src="locum-tracker\.js"><\/script>/);
  assert.ok(html.indexOf('id="hubLocum"') > html.indexOf('id="hubSplit"'), 'Locum card should be the final hub card');
});

test('supports split-rate entry, decimal hours, and private ICS export', () => {
  assert.match(html, /id="locumSocialRate"[^>]*step="0\.01"/);
  assert.match(html, /id="locumSocialHours"[^>]*step="0\.01"/);
  assert.match(html, /id="locumUnsocialRate"[^>]*step="0\.01"/);
  assert.match(html, /id="locumUnsocialHours"[^>]*step="0\.01"/);
  assert.match(html, /data-action="calendar"/);
  assert.match(html, /LocumTracker\.buildShiftIcs\(shift/);
});

test('wires private authenticated locum storage without using the shared rota room', () => {
  assert.match(html, /function openLocum\(\)/);
  assert.match(html, /function saveLocumShift\(event\)/);
  assert.match(html, /LocumTracker\.buildPrivatePath\(uid\)/);
  assert.match(html, /id="locumSignIn"/);
  assert.match(html, /id="locumPrivateSignOut"/);
  assert.match(html, /function signOutLocum\(\)/);
  assert.match(html, /signInWithPopup/);
  const locumBlock = html.match(/\/\* ===== private locum tracker ===== \*\/[\s\S]*?\/\* ===== live bank-holiday refresh ===== \*\//);
  assert.ok(locumBlock, 'missing bounded locum implementation block');
  assert.doesNotMatch(locumBlock[0], /slotShare|rotaCode|syncPath/);
  assert.doesNotMatch(locumBlock[0], /localStorage/);
  assert.match(locumBlock[0], /if\(!\(await writeLocumRemote\(shift\)\)\) return;[\s\S]*?upsertLocumLocal\(shift\)/);
  assert.match(locumBlock[0], /function locumSessionIsCurrent\(uid,generation\)/);
  assert.match(locumBlock[0], /locumRemoteRef\.once\("value"\)\.then/);
  assert.doesNotMatch(locumBlock[0], /locumRemoteRef\.on\("value"/);
  assert.match(locumBlock[0], /if\(!locumSessionIsCurrent\(uid,generation\)\) return;/);
  assert.match(locumBlock[0], /if\(!window\.LocumTracker\.canTransitionStatus\(current\.status,status\)\)/);
  assert.match(locumBlock[0], /STATUSES\.filter\(\(st,i,all\)=>st===s\.status\|\|all\[all\.indexOf\(s\.status\)\+1\]===st\)/);
  assert.match(locumBlock[0], /function deleteLocumShift\(id\)[\s\S]*?const uid=homeAuthUser\.uid, generation=locumSessionGeneration;[\s\S]*?locumDeleteConfirmOpen=true;[\s\S]*?openConfirm/);
  assert.match(locumBlock[0], /function syncLocumForUser\(user\)\{\s*if\(locumDeleteConfirmOpen\) closeConfirm\(\);/);
  assert.match(locumBlock[0], /await db\.ref\(window\.LocumTracker\.buildPrivatePath\(uid\)\)\.child\(id\)\.remove\(\);[\s\S]*?if\(!locumSessionIsCurrent\(uid,generation\)\) return;[\s\S]*?locumShifts=locumShifts\.filter/);
});
