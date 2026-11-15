const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const app = path.join(__dirname, '../kick-tv');
const window = {};
vm.runInNewContext(fs.readFileSync(path.join(app, 'locale.js'), 'utf8'), {window});
const locale = window.KickTVLocale;
for (const [input, expected] of [['tr-TR','tr'],['tur_TR','tr'],['cs-CZ','cs'],['en-US','en'],['de-DE','en'],['','en']]) {
  assert.equal(locale.detect(input), expected);
}
const code = fs.readFileSync(path.join(app, 'app.js'), 'utf8');
const table = code.split('var translations=')[1].split('\n  };')[0];
const en = vm.runInNewContext('('+table+'\n})').en;
function placeholders(text){return [...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();}
for (const key of Object.keys(en)) {
  assert.ok(locale.tr[key], 'Missing Turkish text: '+key);
  assert.deepEqual(placeholders(locale.tr[key]), placeholders(en[key]),key);
}
console.log('Turkish locale and placeholder checks passed.');
