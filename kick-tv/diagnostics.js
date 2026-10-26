/* Opt-in technical metrics only. No account, channel, URLs, chat or history. */
(function(root){
  'use strict';
  root.KickTVDiagnostics={create:function(options){
    var enabled=false,timer=null,pending=[],generation=0,session='',bytes=[],i;
    try{bytes=new Uint8Array(8);root.crypto.getRandomValues(bytes);}catch(ignoreRandom){bytes=[];}
    for(i=0;i<8;i++)session+=('0'+(bytes.length?bytes[i]:Math.floor(Math.random()*256)).toString(16)).slice(-2);
    function number(value){value=Number(value);return isFinite(value)&&value>=0?Math.round(value):null;}
    function product(method){try{return String(webapis.productinfo[method]()).replace(/[^a-z0-9_.: -]/gi,'').slice(0,48);}catch(ignoreProduct){return '';}}
    function sample(){
      if(!enabled||document.hidden)return;
      var seq=generation,data={schema:1,edition:options.edition,version:options.version,session:session,model:product('getModelCode'),firmware:product('getFirmware')},waiting=2,done=false;
      function send(){
        if(done)return;done=true;clearTimeout(timeout);if(!enabled||seq!==generation)return;
        var xhr=new XMLHttpRequest();pending.push(xhr);xhr.open('POST','https://kicktv.corekill.cz/api/kicktv/auth/telemetry',true);xhr.timeout=6000;xhr.setRequestHeader('Content-Type','application/json');
        function finish(){var index=pending.indexOf(xhr);if(index>=0)pending.splice(index,1);}
        xhr.onload=xhr.onerror=xhr.ontimeout=xhr.onabort=finish;try{xhr.send(JSON.stringify(data));}catch(ignoreSend){finish();}
      }
      function complete(){waiting--;if(!waiting)send();}
      var timeout=setTimeout(send,1500);
      try{data.ram_total=number(tizen.systeminfo.getTotalMemory());data.ram_available=number(tizen.systeminfo.getAvailableMemory());}catch(ignoreMemory){}
      try{data.js_heap_used=number(performance.memory.usedJSHeapSize);}catch(ignoreHeap){}
      try{tizen.systeminfo.getPropertyValue('CPU',function(cpu){if(seq!==generation||done)return;data.cpu_load=Number(cpu.load);complete();},complete);}catch(ignoreCPU){complete();}
      try{tizen.systeminfo.getPropertyValue('STORAGE',function(storage){if(seq!==generation||done)return;var units=storage.units||[],j;for(j=0;j<units.length;j++)if(units[j].type==='INTERNAL'&&!units[j].isRemovable){data.storage_total=number(units[j].capacity);data.storage_available=number(units[j].availableCapacity);break;}complete();},complete);}catch(ignoreStorage){complete();}
    }
    return function(value){
      if(!!value===enabled)return;enabled=!!value;generation++;clearInterval(timer);timer=null;
      if(!enabled){var requests=pending.slice();pending=[];for(var j=0;j<requests.length;j++)try{requests[j].abort();}catch(ignoreAbort){}return;}
      sample();timer=setInterval(function(){if(options.playing())sample();},60000);
    };
  }};
})(window);
