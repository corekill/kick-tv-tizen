/* Temporary LAN HTTP service. The TV UI owns storage and network search. */
(function(){
  'use strict';
  var session=null,timer,expiry,ready=false,sequence=0;
  function post(kind,value){self.postMessage({kind:kind,value:value});}
  function fail(error){post('error',String(error&&error.message||error));}
  function reply(status,body,html){Module.ccall('lan_reply',null,['number','number','string'],[status,html?1:0,html?body:JSON.stringify(body)]);}
  self.handlePhoneHttp=function(raw){
    var id=++sequence,gap=raw.indexOf('\r\n\r\n'),lines=raw.slice(0,gap).split('\r\n'),first=lines.shift().split(' '),headers=Object.create(null);
    for(var i=0;i<lines.length;i++){
      var colon=lines[i].indexOf(':'),key=lines[i].slice(0,colon).toLowerCase();
      if(colon<1||Object.prototype.hasOwnProperty.call(headers,key))return reply(400,{});
      headers[key]=lines[i].slice(colon+1).trim();
    }
    var method=first[0],target=first[1];
    if(!session||Date.now()>=session.until||headers.host!==session.host)return reply(403,{});
    if(method==='GET'&&target==='/')return reply(200,self.KickTVPhonePage,true);
    if(headers.authorization!=='Bearer '+session.token||
       (headers.origin&&headers.origin!=='http://'+session.host))return reply(403,{});
    var message={id:id};
    if(method==='GET'&&target==='/api/list')message.action='list';
    else if(method==='GET'&&/^\/api\/search\?q=/.test(target||'')){
      try{message.q=decodeURIComponent(target.slice(14));}catch(ignore){return reply(400,{});}
      if(message.q.trim().length<2||message.q.length>60)return reply(400,{});
      message.action='search';
    }else if(method==='POST'&&target==='/api/list'){
      if(headers['content-type']!=='application/json')return reply(400,{});
      var data;try{data=JSON.parse(raw.slice(gap+4));}catch(ignore){return reply(400,{});}
      if(!data||!/^(add|remove)$/.test(data.action)||typeof data.channel!=='string'||!/^[a-z0-9_-]{1,100}$/.test(data.channel))return reply(400,{});
      message.action=data.action;message.channel=data.channel;
    }else return reply(404,{});
    post('request',message);
  };
  self.onmessage=function(event){
    var m=event.data;
    if(m.kind==='response'&&session&&m.id===sequence){reply(m.status,m.body);return;}
    if(m.kind==='start'&&!session){session=m;start();}
  };
  function start(){
    if(!ready||!session)return;
    try{
      var result=Module.ccall('lan_open','number',['string'],[session.ip]);
      if(result)throw Error('socket '+result);
      timer=setInterval(function(){try{Module._lan_tick();}catch(error){clearInterval(timer);fail(error);}},40);
      expiry=setTimeout(function(){clearInterval(timer);Module._lan_close();session=null;post('expired');},Math.max(0,session.until-Date.now()));
      post('ready',true);
    }catch(error){fail(error);}
  }
  self.Module={noInitialRun:true,onRuntimeInitialized:function(){ready=true;start();},onAbort:fail};
  var socketImports={accept:'accept',bind:'bind',close:'close',connect:'connect',getpeername:'getPeerName',getsockname:'getSockName',getsockopt:'getSockOpt',listen:'listen',poll:'poll',recv:'recv',recvfrom:'recvFrom',recvmsg:'recvMsg',select:'select',send:'send',sendmsg:'sendMsg',sendto:'sendTo',setsockopt:'setSockOpt',shutdown:'shutdown',socket:'create'};
  Object.keys(socketImports).forEach(function(name){self['__wasm_'+name]='tizentvwasm.SocketsHostBindings.'+socketImports[name];});
  try{importScripts('phone-page-data.js','phone-runtime.js');}catch(error){fail(error);}
})();
