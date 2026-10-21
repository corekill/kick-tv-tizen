const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('kick-tv/realtime.js', 'utf8');
assert.equal(source, fs.readFileSync('kick-tv-lite/realtime.js', 'utf8'));

async function run() {
  const storage = new Map();
  let reply, lastBody, lastUrl;
  class FakeXHR {
    open(method, url) { assert.equal(method, 'POST'); lastUrl = url; }
    setRequestHeader() {}
    send(body) {
      lastBody = JSON.parse(body);
      if (reply === 'timeout') { this.ontimeout(); this.onerror(); return; }
      this.status = reply.status;
      this.responseText = reply.body;
      this.readyState = 4;
      this.onreadystatechange();
    }
  }
  const context = { XMLHttpRequest: FakeXHR, localStorage: {
    getItem: k => storage.get(k), setItem: (k,v) => storage.set(k,v)
  }};
  vm.createContext(context); vm.runInContext(source, context);
  const resolve = id => new Promise(done => context.KickRealtime.resolve(id, done));
  reply = {status:200,body:JSON.stringify({data:{mode:'websocket',connections:[{provider:'pusher',credentials:{app_key:'futurekey12345678',cluster:'eu'}}]}})};
  assert.match(await resolve(668), /ws-eu\.pusher\.com\/app\/futurekey12345678/);
  assert.match(lastUrl, /channels\/668\/chat\/connection$/);
  assert.equal(lastBody.capabilities.accepted_providers[0].provider, 'pusher');
  assert.equal(lastBody.client.type, 'web');
  reply = 'timeout';
  assert.match(await resolve(668), /futurekey12345678/);
  reply = {status:200,body:JSON.stringify({data:{mode:'websocket',connections:[{provider:'pusher',credentials:{app_key:'bad/key',cluster:'attacker.invalid/'}}]}})};
  assert.match(await resolve(668), /ws-eu\.pusher\.com\/app\/futurekey12345678/);
  reply = {status:200,body:JSON.stringify({data:{mode:'websocket',connections:[{provider:'pusher',credentials:{}}]}})};
  assert.match(await resolve(668), /futurekey12345678/);
  reply = {status:200,body:'not JSON'};
  assert.match(await resolve(668), /futurekey12345678/);
  storage.clear();
  const fresh = {XMLHttpRequest:FakeXHR,localStorage:context.localStorage};
  vm.createContext(fresh);vm.runInContext(source,fresh);
  assert.match(await new Promise(done => fresh.KickRealtime.resolve(668,done)), /34bf7a0ff419a2a775b9/);
  console.log('PASS: discovery, cached fallback, fresh fallback, malformed JSON, unsafe credentials, timeout');

  if (!process.argv.includes('--live')) return;
  const response = await fetch('https://web.kick.com/api/v1/realtime/channels/668/chat/connection', {
    method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify(lastBody)
  });
  assert.equal(response.status,200);
  const data = await response.json();
  const credentials = data.data.connections.find(x => x.provider === 'pusher').credentials;
  await new Promise((resolve,reject) => {
    const socket = new WebSocket(`wss://ws-${credentials.cluster}.pusher.com/app/${credentials.app_key}?protocol=7&client=js&version=8.4.0&flash=false`);
    const timer = setTimeout(() => {socket.close();reject(new Error('No chat message received within 30 seconds'));},30000);
    socket.onmessage = e => {
      const packet = JSON.parse(e.data);
      if(packet.event === 'pusher:connection_established') socket.send(JSON.stringify({event:'pusher:subscribe',data:{auth:'',channel:'chatrooms.668.v2'}}));
      if(packet.event === 'pusher:ping') socket.send(JSON.stringify({event:'pusher:pong',data:{}}));
      if(packet.event.includes('ChatMessage')) {const message=JSON.parse(packet.data);assert.equal(typeof message.content,'string');assert.ok(message.sender);clearTimeout(timer);socket.close();resolve();}
    };
    socket.onerror = () => {clearTimeout(timer);reject(new Error('WebSocket failed'));};
  });
  console.log('PASS: live discovery HTTP 200, WebSocket subscription and actual chat message');
}
run().catch(error => {console.error(error);process.exitCode=1;});
