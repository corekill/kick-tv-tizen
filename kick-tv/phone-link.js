/* TV-side bridge: the phone only talks to a temporary listener on this TV. */
(function(root){
  'use strict';
  function localIp(value){
    var parts=String(value||'').split('.');
    if(parts.length!==4||parts.some(function(n){return !/^\d{1,3}$/.test(n)||Number(n)>255;}))return '';
    var a=Number(parts[0]),b=Number(parts[1]);
    return a===10||a===172&&b>=16&&b<=31||a===192&&b===168?parts.map(Number).join('.'):'';
  }
  function token(){
    var bytes=new Uint8Array(16);root.crypto.getRandomValues(bytes);
    return Array.prototype.map.call(bytes,function(b){return ('0'+b.toString(16)).slice(-2);}).join('');
  }
  function findIp(done){
    var value='';
    try{value=localIp(root.webapis.network.getIp());}catch(ignore){}
    if(value){done(value);return;}
    var kinds=['ETHERNET_NETWORK','WIFI_NETWORK'];
    function next(){
      if(!kinds.length){done('');return;}
      try{root.tizen.systeminfo.getPropertyValue(kinds.shift(),function(info){
        var ip=localIp(info.ipAddress);
        if(ip&&info.status!=='OFF'&&info.status!=='DISCONNECTED'&&info.status!=='DEACTIVATED')done(ip);else next();
      },next);}catch(ignore){done('');}
    }
    next();
  }
  function qr(box,url){
    var code=root.qrcode(0,'M');code.addData(url);code.make();
    var canvas=document.createElement('canvas'),n=code.getModuleCount(),unit=5;
    canvas.width=canvas.height=(n+8)*unit;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','QR');
    var ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#111';
    for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(code.isDark(r,c))ctx.fillRect((c+4)*unit,(r+4)*unit,unit,unit);
    box.appendChild(canvas);
  }
  function open(box,options){
    var cs=options.language==='cs',worker,xhr,time,stopped=false;
    var t=cs?{start:'Spouštím místní párování…',scan:'Naskenuj QR telefonem na stejné síti. Párování platí 5 minut nebo do zavření nastavení. QR kód nesdílej.',expired:'Párování skončilo. Pro nový QR kód tlačítko stiskni znovu.',ip:'TV nemá dostupnou místní IPv4 adresu.',failed:'Místní párování se na této TV nepodařilo spustit.'}:{start:'Starting local pairing…',scan:'Scan the QR code on the same network. Pairing expires in five minutes or when you close Settings. Do not share the QR code.',expired:'Pairing ended. Press the button again for a new QR code.',ip:'No local IPv4 address is available on this TV.',failed:'Local pairing could not start on this TV.'};
    function stop(message){
      if(stopped)return;stopped=true;clearTimeout(time);
      if(worker)worker.terminate();if(xhr)xhr.abort();
      box.textContent=message||'';
      document.removeEventListener('visibilitychange',hidden);
    }
    function hidden(){if(document.hidden)stop(t.expired);}
    function respond(id,status,body){if(!stopped)worker.postMessage({kind:'response',id:id,status:status,body:body});}
    function request(m){
      if(m.action!=='search'){
        var status=m.action==='list'?200:options.change(m.action,m.channel);
        respond(m.id,status,{channels:options.channels()});return;
      }
      if(xhr)xhr.abort();
      var x=new XMLHttpRequest();xhr=x;x.open('GET','https://www.kickstats.com/api/search?query='+encodeURIComponent(m.q),true);x.timeout=6500;
      function fail(){respond(m.id,502,{});}
      x.onload=function(){
        if(x.status!==200)return fail();
        try{
          var out=[],seen=Object.create(null);
          (JSON.parse(x.responseText).channels||[]).forEach(function(item){
            var slug=item&&typeof item.slug==='string'?item.slug.toLowerCase():'';
            if(out.length>=8||seen[slug]||!/^[a-z0-9_-]{1,100}$/.test(slug))return;
            seen[slug]=true;out.push({slug:slug,name:String(item.username||slug).slice(0,100)});
          });
          respond(m.id,200,{channels:out});
        }catch(ignore){fail();}
      };
      x.onerror=x.ontimeout=fail;try{x.send();}catch(ignore){fail();}
    }
    function failure(stage,error){stop(t.failed+' ['+stage+']'+(error?' '+String(error.message||error).slice(0,160):''));}
    function start(ip){
      if(stopped)return;
      clearTimeout(time);
      if(!ip){stop(t.ip);return;}
      try{
      var host=ip+':18765',secret=token(),until=Date.now()+300000,url='http://'+host+'/#'+secret+'.'+(cs?'cs':'en');
      worker=new Worker('phone-worker.js');
      worker.onerror=function(e){failure('worker',e.message);};
      worker.onmessage=function(e){
        if(stopped)return;
        if(e.data.kind==='ready'){
          clearTimeout(time);
          try{box.textContent=t.scan;qr(box,url);}catch(error){failure('QR',error);return;}
          time=setTimeout(function(){stop(t.expired);},Math.max(0,until-Date.now()));
        }else if(e.data.kind==='error')failure('LAN',e.data.value);
        else if(e.data.kind==='expired')stop(t.expired);
        else if(e.data.kind==='request')request(e.data.value);
      };
      time=setTimeout(function(){failure('worker timeout');},10000);
      worker.postMessage({kind:'start',ip:ip,host:host,token:secret,until:until});
      }catch(error){failure('start',error);}
    }
    box.textContent=t.start;
    document.addEventListener('visibilitychange',hidden);
    time=setTimeout(function(){failure('IP timeout');},4000);
    findIp(start);
    return stop;
  }
  root.KickTVPhoneLink={open:open};
})(window);
