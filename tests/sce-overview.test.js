const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sceHtml = fs.readFileSync(path.join(__dirname, '..', 'SCE.html'), 'utf8');

test('SCE overview does not expose the Hermione HQ private summary publisher', () => {
  assert.doesNotMatch(sceHtml, /HERMIONE HQ · PRIVATE SCE SUMMARY/i);
  assert.doesNotMatch(sceHtml, /PUBLISH PRIVATE SUMMARY/i);
  assert.doesNotMatch(sceHtml, /publishPrivateSceSummary|signInForPrivateSce/);
  assert.doesNotMatch(sceHtml, /<script src="sce-private-summary\.js"><\/script>/);
});
