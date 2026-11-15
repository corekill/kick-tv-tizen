/* Experimental read-only Following. The web session is never saved in localStorage. */
(function(root){
  'use strict';
  var endpoint='https://kick.com/api/v2/channels/followed-page',name='kicktv.following.session',token='',request=null,epoch=0,saving=false;
  var cacheKey='kicktv.following.channels',channels=[],state='idle',watchers=[];
  function notify(){watchers.slice().forEach(function(fn){fn();});}
  function slugs(list){var seen=Object.create(null);return list.map(function(n){return typeof n==='string'?n.toLowerCase():'';}).filter(function(n){if(!/^[a-z0-9_-]{1,100}$/.test(n)||seen[n])return false;seen[n]=true;return true;}).slice(0,200);}
  function valid(s){return typeof s==='string'&&/^[A-Za-z0-9._~+/|-]{16,1900}={0,2}$/.test(s);}
  function manager(){return root.tizen&&root.tizen.keymanager;}
  try{if(manager())token=manager().getData({name:name})||'';}catch(ignore){}
  if(!valid(token))token='';
  try{var stored=JSON.parse(localStorage.getItem(cacheKey));if(token&&Array.isArray(stored))channels=slugs(stored);}catch(ignore){}
  function cancel(){epoch++;var old=request;request=null;if(old)old.abort();}
  function erase(){
    try{if(manager())manager().removeData({name:name});return true;}
    catch(error){return error.name==='NotFoundError';}
  }
  function disconnect(next){
    if(saving)return false;
    cancel();token='';channels=[];try{localStorage.removeItem(cacheKey);}catch(ignore){}
    var ok=erase();state=ok?(next||'idle'):'storage';notify();return ok;
  }
  function sync(){
    if(!token||request||saving||document.hidden)return;
    var run=++epoch,results=[],pages=0,seen=Object.create(null);
    state='sync';notify();
    function finish(next){
      if(run!==epoch)return;
      request=null;
      if(next==='expired'){disconnect('expired');return;}
      state=next;
      if(next==='ok'){channels=slugs(results);try{localStorage.setItem(cacheKey,JSON.stringify(channels));}catch(ignore){}}
      notify();
    }
    function page(cursor){
      var x=new XMLHttpRequest();request=x;pages++;
      try{
        x.open('GET',endpoint+(cursor?'?cursor='+encodeURIComponent(cursor):''),true);
        x.timeout=10000;x.setRequestHeader('Accept','application/json');x.setRequestHeader('Authorization','Bearer '+token);
        x.onload=function(){
          if(run!==epoch)return;
          if(x.status===401){finish('expired');return;}
          if(x.status!==200){finish('failed');return;}
          try{
            var data=JSON.parse(x.responseText),next=data.nextCursor;
            if(!Array.isArray(data.channels))throw Error('Invalid channels');
            data.channels.forEach(function(c){if(results.length<1000&&c)results.push(c.channel_slug);});
            if(next&&typeof next!=='string'&&typeof next!=='number')throw Error('Invalid cursor');
            if(next&&String(next).length>512)throw Error('Invalid cursor');
            if(next&&pages<20&&results.length<200&&!seen[next]){seen[next]=true;page(next);}
            else finish('ok');
          }catch(ignore){finish('failed');}
        };
        x.onerror=x.ontimeout=function(){finish('failed');};x.send();
      }catch(ignore){finish('failed');}
    }
    page('');
  }
  function connect(value,done){
    if(saving||!valid(value))return done(400);
    if(!manager())return done(503);
    if(!disconnect())return done(503);
    function failed(){saving=false;state='storage';notify();done(503);}
    saving=true;
    try{manager().saveData(name,value,null,function(){saving=false;token=value;state='idle';done(200);sync();},failed);}catch(ignore){failed();}
  }
  root.KickTVFollowing={supported:function(){return !!manager();},channels:function(){return channels.slice();},connected:function(){return !!token;},state:function(){return state;},
    connect:connect,disconnect:disconnect,sync:sync,subscribe:function(fn){watchers.push(fn);return function(){watchers=watchers.filter(function(f){return f!==fn;});};}};
})(window);
