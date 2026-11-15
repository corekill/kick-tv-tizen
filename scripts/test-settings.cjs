const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '../kick-tv/settings.js'), 'utf8');
const key = 'kicktv.preferences.v1';
const storage = {
  [key]: JSON.stringify({mode: 'manual', sort: 'followers', channels: ['Alpha', 'alpha', 'b', '<bad>', 17], plays: {b: 5}})
};
function load() {
  const window = {};
  vm.runInNewContext(script, {window, localStorage: {
    getItem: name => storage[name],
    setItem: (name, value) => { storage[name] = value; }
  }});
  return window.KickTVSettings;
}
let settings = load();
assert.equal(settings.prefs.mode, 'manual');
assert.equal(settings.prefs.channels.join(','), 'alpha,b');
const a = {name: 'alpha', position: 0, followers: 10, viewers: 1};
const b = {name: 'b', position: 1, followers: 1, viewers: 20};
const c = {name: 'charlie', position: 2};
assert.deepEqual([b, c, a].sort(settings.compare), [a, b, c]);
settings.prefs.sort = 'viewers';
assert.deepEqual([a, b, c].sort(settings.compare), [b, a, c]);
settings.prefs.sort = 'name';
assert.deepEqual([c, b, a].sort(settings.compare), [a, b, c]);
settings.prefs.sort = 'plays';
settings.record('alpha');
settings = load();
assert.equal(settings.prefs.plays.alpha, 1);
assert.deepEqual([c, a, b].sort(settings.compare), [b, a, c]);
const browser = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../kick-tv/browse.js'), 'utf8'), {window:browser});
const browseCards=browser.KickTVBrowse.cards([
  {channel:{slug:'b',user:{username:'Bee Camera'}},viewer_count:1},
  {channel:{slug:'alpha',user:{username:'Alpha Show'}},viewer_count:99}
],false);
assert.equal(browseCards.sort(settings.compare).map(card=>card.slug).join(','),'b,alpha');
settings.prefs.sort='viewers';
assert.equal(browseCards.sort(settings.compare).map(card=>card.slug).join(','),'alpha,b');
storage[key] = '{invalid';
assert.equal(load().prefs.mode, 'recent');
console.log('TV settings tests passed.');
