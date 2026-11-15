const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '../kick-tv');
const sent = [], replies = [];
const worker = {
  importScripts() { worker.Module.onRuntimeInitialized(); },
  setInterval() {}, setTimeout() {},
  postMessage(msg) { sent.push(msg); }
};
worker.self = worker;
vm.runInNewContext(fs.readFileSync(path.join(root, 'phone-worker.js'), 'utf8'), worker);
worker.Module.ccall = (name, type, types, values) => {
  if (name === 'lan_open') return 0;
  replies.push(values);
};
const host = '192.168.1.26:18765', token = 'a'.repeat(32);
worker.KickTVPhonePage = 'Phone page';
worker.onmessage({data:{kind:'start', host, ip:'192.168.1.26', token, until:Date.now()+300000,follow:true}});
assert.equal(sent.pop().kind, 'ready');
function send(method, target, headers = {}, data = '') {
  worker.handlePhoneHttp(method+' '+target+' HTTP/1.1\r\nHost: '+host+'\r\n'+
    Object.entries(headers).map(([key,value])=>key+': '+value+'\r\n').join('')+'\r\n'+data);
}
send('GET', '/');
assert.equal(replies.pop()[2], 'Phone page');
send('GET', '/api/list');
assert.equal(replies.pop()[0], 403);
send('GET', '/api/search?q=test%20query', {Authorization:'Bearer '+token});
assert.equal(sent.at(-1).value.q, 'test query');
send('GET','/api/list',{Authorization:'Bearer '+token,Origin:'http://untrusted.test'});
assert.equal(replies.pop()[0], 403);
send('POST','/api/list',{Authorization:'Bearer '+token,'Content-Type':'application/json'},JSON.stringify({action:'add',channel:'test'}));
const command=sent.pop().value;
assert.equal(command.channel,'test');
assert.equal(command.action,'add');
worker.onmessage({data:{kind:'response',id:command.id-1,status:200,body:{}}});
assert.equal(replies.length,0);
worker.onmessage({data:{kind:'response',id:command.id,status:200,body:{channels:['test']}}});
assert.equal(replies.pop()[2],'{"channels":["test"]}');
const followHeaders={Authorization:'Bearer '+token,Origin:'http://'+host,'Content-Type':'application/json'};
send('POST','/api/following/session',followHeaders,JSON.stringify({token:'123456%7CsyntheticExampleOnly'}));
assert.equal(sent.pop().value.token,'123456|syntheticExampleOnly');
send('POST','/api/following/session',followHeaders,JSON.stringify({token:'123456%0D%0AsyntheticExampleOnly'}));
assert.equal(replies.pop()[0],400);
const page=fs.readFileSync(path.join(root,'phone-page.html'),'utf8');
new vm.Script(page.match(/<script>([\s\S]*?)<\/script>/)[1]);
assert.ok(page.indexOf('id="list"')<page.indexOf('id="following"'));
assert.match(page,/<details>\s*<summary id="followTitle">/);
const qr=require(path.join(root,'qrcode.js'))(0,'M');
qr.addData('http://'+host+'/#'+token+'.cs');qr.make();
assert.ok(qr.getModuleCount()>20);
console.log('Phone pairing checks passed.');
