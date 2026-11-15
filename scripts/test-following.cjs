const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../kick-tv/following.js'),'utf8');
const storage=new Map(),credentials=new Map(),requests=[];
const sample='a'.repeat(30);
class XHR {
  constructor(){this.headers={};requests.push(this);}
  open(method,url){this.url=url;}
  setRequestHeader(key,value){this.headers[key]=value;}
  send(){}
  abort(){}
  respond(status,body){this.status=status;this.responseText=JSON.stringify(body);this.onload();}
}
function load(keymanager){
  const window={tizen:{keymanager}};
  vm.runInNewContext(source,{window,document:{hidden:false},XMLHttpRequest:XHR,
    localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
  return window.KickTVFollowing;
}
const keymanager={getData:a=>credentials.get(a.name),removeData:a=>credentials.delete(a.name),
  saveData:(key,token,password,success)=>{credentials.set(key,token);success();}};
let status,service=load(undefined);
service.connect(sample,n=>{status=n;});assert.equal(status,503);
service=load(keymanager);assert.equal(service.connected(),false);
service.connect(sample,n=>{status=n;});assert.equal(status,200);
let request=requests.at(-1);
assert.equal(request.url,'https://kick.com/api/v2/channels/followed-page');
assert.equal(request.headers.Authorization,'Bearer '+sample);
request.respond(200,{channels:[{channel_slug:'Stream_One'},{channel_slug:'../bad'}],nextCursor:'next'});
request=requests.at(-1);assert.ok(request.url.endsWith('?cursor=next'));
request.respond(200,{channels:[{channel_slug:'stream_two'},{channel_slug:'STREAM_ONE'}]});
assert.equal(service.channels().join(','),'stream_one,stream_two');
assert.ok(!JSON.stringify([...storage]).includes(sample));
assert.equal(load(keymanager).channels().length,2);
service.sync();requests.at(-1).respond(401,{});
assert.equal(service.state(),'expired');assert.equal(service.connected(),false);assert.equal(credentials.size,0);assert.equal(storage.size,0);
console.log('Experimental Following checks passed.');
