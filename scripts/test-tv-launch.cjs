const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function fixture({current=null,request=null,platforms=['kick']}={}){
  const events={},timers=new Map(),opened=[];let id=0,closed=0,now=0;
  const document={hidden:false,addEventListener:(name,fn)=>events[name]=fn};
  const context={document,window:{addEventListener:(name,fn)=>events[name]=fn},
    tizen:{application:{getCurrentApplication:()=>({getRequestedAppControl:()=>request})}},
    setTimeout:(fn,ms)=>{const key=++id;timers.set(key,{fn,at:now+ms});return key;},
    clearTimeout:key=>timers.delete(key)};
  vm.createContext(context);vm.runInContext(fs.readFileSync('kick-tv/tv-launch.js','utf8'),context);
  context.KickTVLaunch.install({platforms,current:()=>current,close:()=>{closed++;current=null;},open:channel=>{current=JSON.parse(JSON.stringify(channel));opened.push(current);}});
  return {parse:(value,p=platforms)=>JSON.parse(JSON.stringify(context.KickTVLaunch.target(value,p)||null)),
    launch:value=>{request=value;events.appcontrol();},
    hidden:value=>{document.hidden=value;events.visibilitychange();},
    flush:()=>{let guard=0;while(timers.size){assert(++guard<30);const [key,timer]=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];timers.delete(key);now=timer.at;timer.fn();}},
    get current(){return current;},get closed(){return closed;},opened};
}
const control=uri=>({appControl:{uri,data:[]}});
const channel=name=>({platform:'kick',name});
const parser=fixture();
for(const url of ['https://kick.com/xqc','http://www.kick.com/@XQC/','https%3A%2F%2Fkick.com%2Fxqc','https://kick.com/xqc?ref=tv#chat',JSON.stringify({metaTag:'https://kick.com/xqc'})])assert.deepEqual(parser.parse(url),channel('xqc'));
for(const url of ['https://evil-kick.com/xqc','https://kick.com.evil.test/xqc','https://kick.com@evil.test/xqc','https://evil.test/?url=https://kick.com/xqc','some text https://kick.com/xqc','https://kick.com/settings','https://kick.com/xqc/videos/123','javascript:alert(1)','https://kick.com/xqc%2Fevil','https://kick.com/%ZZ','https://twitch.tv/xqc',null])assert.equal(parser.parse(url),null,String(url));
assert.deepEqual(parser.parse('https://twitch.tv/Auronplay',['kick','twitch']),{platform:'twitch',name:'auronplay'});

let f=fixture();f.flush();assert.equal(f.opened.length,0);f.hidden(true);f.hidden(false);f.flush();assert.equal(f.opened.length,0);
f=fixture({request:control('https://kick.com/first')});f.flush();assert.deepEqual(f.current,channel('first'));f.launch(control('https://kick.com/first'));f.flush();assert.equal(f.opened.length,1);
f.launch(control('https://kick.com/second'));f.flush();assert.equal(f.closed,1);assert.deepEqual(f.current,channel('second'));
f.hidden(true);f.hidden(true);assert.equal(f.closed,2);f.hidden(false);f.flush();assert.deepEqual(f.current,channel('second'));assert.equal(f.opened.length,3);

for(const visibleFirst of [false,true]){
 f=fixture({current:channel('old')});f.flush();f.hidden(true);
 if(visibleFirst)f.hidden(false);
 f.launch({appControl:{uri:'',data:[{key:'metaTag',value:['https://kick.com/new']}]}});
 if(!visibleFirst){f.flush();assert.equal(f.opened.length,0);f.hidden(false);}
 f.flush();assert.deepEqual(f.opened,[channel('new')]);assert.equal(f.closed,1);
}
f=fixture({request:control('https://kick.com/old')});f.launch(control('https://kick.com/latest'));f.flush();assert.deepEqual(f.opened,[channel('latest')]);
f=fixture({current:channel('old')});f.flush();f.launch(control('https://kick.com/settings'));f.flush();assert.equal(f.closed,0);assert.deepEqual(f.current,channel('old'));
f=fixture({platforms:['kick','twitch'],current:{platform:'twitch',name:'auronplay'}});f.flush();f.hidden(true);f.hidden(false);f.flush();assert.deepEqual(f.current,{platform:'twitch',name:'auronplay'});
assert.equal(fs.readFileSync('kick-tv/tv-launch.js','utf8'),fs.readFileSync('kick-tv-lite/tv-launch.js','utf8'));
console.log('PASS: strict links, startup/appcontrol, foreground/background, resume, duplicate events, queued links and Kick/Twitch identity');
