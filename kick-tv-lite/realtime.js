/* Resolve public chat connection settings; never requires a Kick account. */
var KickRealtime=(function(){
  'use strict';
  var fallback={key:'34bf7a0ff419a2a775b9',cluster:'us2'},cached=null;
  function valid(value){return value&&typeof value.key==='string'&&typeof value.cluster==='string'&&/^[a-zA-Z0-9]{8,64}$/.test(value.key)&&/^[a-z0-9-]{1,24}$/.test(value.cluster);}
  try{var saved=JSON.parse(localStorage.getItem('kicktv.realtime.v1')||'null');if(valid(saved))cached=saved;}catch(ignore){}
  function url(value){return 'wss://ws-'+value.cluster+'.pusher.com/app/'+value.key+'?protocol=7&client=js&version=8.4.0&flash=false';}
  function resolve(channelId,callback){
    var xhr=new XMLHttpRequest(),done=false;
    function finish(value){if(done)return;done=true;callback(url(valid(value)?value:(cached||fallback)));}
    if(!channelId){finish(null);return;}
    try{
      xhr.open('POST','https://web.kick.com/api/v1/realtime/channels/'+encodeURIComponent(channelId)+'/chat/connection',true);
      xhr.timeout=5000;xhr.setRequestHeader('Content-Type','application/json');xhr.setRequestHeader('Accept','application/json');
      xhr.onreadystatechange=function(){if(xhr.readyState!==4)return;try{
        if(xhr.status>=200&&xhr.status<300){var data=JSON.parse(xhr.responseText).data,items=data&&data.mode==='websocket'&&data.connections||[];
          for(var i=0;i<items.length;i++){var item=items[i],credentials=item.credentials||{},value={key:credentials.app_key,cluster:credentials.cluster};if(item.provider==='pusher'&&valid(value)){cached=value;try{localStorage.setItem('kicktv.realtime.v1',JSON.stringify(value));}catch(ignoreStore){}finish(value);return;}}
        }
      }catch(ignoreParse){}finish(null);};
      xhr.onerror=xhr.ontimeout=function(){finish(null);};
      var id='xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.floor(Math.random()*16);return(c==='x'?r:(r&3|8)).toString(16);});
      xhr.send(JSON.stringify({client:{id:id,type:'web'},capabilities:{accepted_providers:[{provider:'pusher'}]}}));
    }catch(ignoreRequest){finish(null);}
  }
  return{resolve:resolve};
}());
