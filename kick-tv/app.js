(function(){
  'use strict';
  var home=document.getElementById('home'),view=document.getElementById('playerView');
  var input=document.getElementById('channel'),watch=document.getElementById('watch');
  var recentBox=document.getElementById('recent'),recentSection=document.getElementById('recentSection');
  var resultBox=document.getElementById('results'),searchSection=document.getElementById('searchSection'),searchState=document.getElementById('searchState');
  var chatPanel=document.getElementById('chatPanel'),chatMessages=document.getElementById('chatMessages'),chatStatus=document.getElementById('chatStatus'),playerHint=document.getElementById('playerHint');
  var qualityMenu=document.getElementById('qualityMenu'),qualityList=document.getElementById('qualityOptions');
  var chatEditor=document.getElementById('chatEditor'),chatEditorRows=document.getElementById('chatEditorRows');
  var editorSubtitle=document.getElementById('editorSubtitle');
  var history=[],playing=false,hudTimer=null,searchTimer=null,searchSeq=0,secret=[],lastBackAt=0;
  var chatSocket=null,chatReconnect=null,chatRoomId=null,chatMode=0,chatUnread=0,chatConnected=false;
  var qualityOpen=false,qualityCursor=0,selectedQuality='480',currentStreamUrl=null,currentRoomId=null,currentChannelName='';
  var chatEditorOpen=false,chatEditorIndex=0,chatEditorOriginal=null,chatEditorPreviousMode=0,chatEditorPreset=0;
  var chatLayouts=[
    {right:42,bottom:46,width:650,height:390,font:20},
    {right:1220,bottom:48,width:650,height:500,font:20},
    {right:42,bottom:590,width:720,height:420,font:18}
  ];
  var sevenTVEmotes={},sevenTVCount=0,sevenTVSequence=0;
  var language=/^(cs|cz|ces)(-|_|$)/i.test(navigator.language||'')?'cs':'en';
  var pusherUrl='wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0&flash=false';
  var translations={
    cs:{ready:'AVPlay připraven',heroLine1:'Živě. Pohodlně.',heroLine2:'Na velké obrazovce.',heroText:'Najdi kanál, spusť stream a ovládej kvalitu i chat jediným ovladačem.',featureNative:'⚡ Nativní AVPlay',featureChat:'● Živý chat + 7TV',featurePhone:'⌁ Bez telefonu',findStream:'Najít stream',findStreamHelp:'Stačí část názvu nebo celá adresa kanálu',searchStreamer:'Hledat streamera',streamerPlaceholder:'Jméno streamera…',watch:'Sledovat',searchTip:'Z textového pole odejdeš šipkou → nebo ↓',searchResults:'Výsledky hledání',recent:'Naposledy sledované',select:'vybrat',back:'zpět',playbackKeys:'Při přehrávání: ↑ kvalita · ↓ rozložení chatu · OK režim chatu',loadingStream:'Načítám stream…',playerHintDefault:'OK: chat · Zpět: nabídka',liveChat:'Živý chat',connecting:'Připojuji…',chatEmpty:'Nové zprávy se objeví tady.',nextChatMode:'další režim chatu',qualityTitle:'Kvalita obrazu',qualitySubtitle:'Změna krátce znovu načte stream',qualityHelp:'↑ ↓ vybrat · OK potvrdit · Zpět zavřít',layoutTitle:'Rozložení chatu',layoutHelp:'↑ ↓ vlastnost · ← → upravit · OK uložit · Zpět zrušit',checking:'ověřuji stav…',unknown:'stav neznámý',followers:'sledujících',exactChannel:'Přesně zadaný kanál',foundLocal:'nalezeno v TV · ověřuji online…',checkingOnline:'ověřuji online…',localResults:'lokální výsledky',gettingStream:'Získávám živý stream…',kickConnecting:'Připojuji se ke Kick API.',chatUnavailable:'Chat není pro kanál dostupný',connected:'Připojeno',connected7tv:'Připojeno · 7TV {count}',chatReconnecting:'Chat se znovu připojuje…',restoringConnection:'Obnovuji spojení…',chatFailed:'Chat se nepodařilo připojit',hudOff:'↑ kvalita · ↓ upravit chat · OK celý chat{unread} · Zpět nabídka',hudFull:'↑ kvalita · ↓ upravit chat · OK předvolba 1 · Zpět nabídka',hudPreset:'↑ kvalita · ↓ upravit chat · OK předvolba {next} · Zpět nabídka',hudPresetLast:'↑ kvalita · ↓ upravit chat · OK skrýt chat · Zpět nabídka',preset:'Předvolba {number}',editorSubtitle:'Předvolba {number} · změny vidíš živě v obraze',preview:'NÁHLED CHATU',fieldPreset:'Upravovaná předvolba',fieldRight:'Od pravého okraje',fieldBottom:'Od spodního okraje',fieldWidth:'Šířka chatu',fieldHeight:'Výška chatu',fieldFont:'Velikost písma',qAuto:'Automaticky',qAutoD:'nejvyšší stabilní kvalita',q1080D:'nejostřejší · vyšší datový tok',q720D:'plynulý HD obraz',q480D:'vyvážená a stabilní',q360D:'úspornější připojení',q160D:'minimum pro slabou síť',saved:'ULOŽENO',changingQuality:'Měním kvalitu obrazu…',qualityReload:'{quality} · stream se krátce znovu načte',channelOffline:'Kanál právě nevysílá',noPlayback:'Kick nevrátil adresu živého streamu.',invalidKick:'Neplatná odpověď Kicku',kickFailed:'Kick API se nepřipojilo',retryHttp:'HTTP {status}. Stiskni Zpět a zkus to znovu.',kickTimeout:'Kick API neodpovídá',timeoutDetail:'Vypršel časový limit 15 sekund. Stiskni Zpět.',networkError:'Síťová chyba',networkDetail:'TV se nedokázala spojit s Kick API. Stiskni Zpět.',requestError:'Chyba požadavku',avUnavailable:'AVPlay není dostupný',avUnavailableDetail:'Samsung přehrávač se v této aplikaci nenačetl.',loadingVideo:'Načítám obraz…',bufferingDetail:'Stream nalezen, TV ukládá první data.',streamEnded:'Vysílání skončilo',streamEndedDetail:'Streamer ukončil živý stream.',playbackError:'Chyba přehrávání',cannotPlay:'Stream nelze spustit',cannotPrepare:'Stream nelze připravit',avFailed:'AVPlay selhal'},
    en:{ready:'AVPlay ready',heroLine1:'Live. Comfortable.',heroLine2:'On the big screen.',heroText:'Find a channel, start the stream, and control quality and chat with one remote.',featureNative:'⚡ Native AVPlay',featureChat:'● Live chat + 7TV',featurePhone:'⌁ No phone needed',findStream:'Find a stream',findStreamHelp:'Enter part of a name or the full channel address',searchStreamer:'Search for a streamer',streamerPlaceholder:'Streamer name…',watch:'Watch',searchTip:'Leave the text field with → or ↓',searchResults:'Search results',recent:'Recently watched',select:'select',back:'back',playbackKeys:'During playback: ↑ quality · ↓ chat layout · OK chat mode',loadingStream:'Loading stream…',playerHintDefault:'OK: chat · Back: menu',liveChat:'Live chat',connecting:'Connecting…',chatEmpty:'New messages will appear here.',nextChatMode:'next chat mode',qualityTitle:'Video quality',qualitySubtitle:'Changing it briefly reloads the stream',qualityHelp:'↑ ↓ select · OK confirm · Back close',layoutTitle:'Chat layout',layoutHelp:'↑ ↓ property · ← → adjust · OK save · Back cancel',checking:'checking status…',unknown:'status unknown',followers:'followers',exactChannel:'Exact channel name',foundLocal:'found on TV · checking online…',checkingOnline:'checking online…',localResults:'local results',gettingStream:'Getting the live stream…',kickConnecting:'Connecting to the Kick API.',chatUnavailable:'Chat is not available for this channel',connected:'Connected',connected7tv:'Connected · 7TV {count}',chatReconnecting:'Reconnecting chat…',restoringConnection:'Restoring connection…',chatFailed:'Chat connection failed',hudOff:'↑ quality · ↓ edit chat · OK full chat{unread} · Back menu',hudFull:'↑ quality · ↓ edit chat · OK preset 1 · Back menu',hudPreset:'↑ quality · ↓ edit chat · OK preset {next} · Back menu',hudPresetLast:'↑ quality · ↓ edit chat · OK hide chat · Back menu',preset:'Preset {number}',editorSubtitle:'Preset {number} · changes update live',preview:'CHAT PREVIEW',fieldPreset:'Preset to edit',fieldRight:'From right edge',fieldBottom:'From bottom edge',fieldWidth:'Chat width',fieldHeight:'Chat height',fieldFont:'Font size',qAuto:'Automatic',qAutoD:'highest stable quality',q1080D:'sharpest · higher bitrate',q720D:'smooth HD video',q480D:'balanced and stable',q360D:'lower bandwidth',q160D:'minimum for a weak network',saved:'SAVED',changingQuality:'Changing video quality…',qualityReload:'{quality} · the stream will briefly reload',channelOffline:'Channel is offline',noPlayback:'Kick did not return a live stream address.',invalidKick:'Invalid Kick response',kickFailed:'Kick API connection failed',retryHttp:'HTTP {status}. Press Back and try again.',kickTimeout:'Kick API did not respond',timeoutDetail:'The 15-second timeout expired. Press Back.',networkError:'Network error',networkDetail:'The TV could not connect to the Kick API. Press Back.',requestError:'Request error',avUnavailable:'AVPlay is unavailable',avUnavailableDetail:'The Samsung player did not load in this application.',loadingVideo:'Loading video…',bufferingDetail:'Stream found, the TV is buffering the first data.',streamEnded:'Stream ended',streamEndedDetail:'The streamer ended the live stream.',playbackError:'Playback error',cannotPlay:'Unable to start the stream',cannotPrepare:'Unable to prepare the stream',avFailed:'AVPlay failed'}
  };
  function tr(key,values){var text=(translations[language]&&translations[language][key])||translations.en[key]||key;values=values||{};return text.replace(/\{(\w+)\}/g,function(_,name){return values[name]===undefined?'':values[name];});}
  function applyLanguage(){
    document.documentElement.lang=language;var nodes=document.querySelectorAll('[data-i18n]'),i;
    for(i=0;i<nodes.length;i++)nodes[i].textContent=tr(nodes[i].getAttribute('data-i18n'));
    nodes=document.querySelectorAll('[data-i18n-placeholder]');for(i=0;i<nodes.length;i++)nodes[i].setAttribute('placeholder',tr(nodes[i].getAttribute('data-i18n-placeholder')));
    chatPanel.setAttribute('data-preview-label',tr('preview'));
  }
  var qualityProfiles=[
    {id:'auto',labelKey:'qAuto',detailKey:'qAutoD',adaptive:'STARTBITRATE=HIGHEST'},
    {id:'1080',label:'1080p / 60 fps',detailKey:'q1080D',adaptive:'BITRATES=5000000~9000000|STARTBITRATE=HIGHEST'},
    {id:'720',label:'720p / 60 fps',detailKey:'q720D',adaptive:'BITRATES=2000000~4999999|STARTBITRATE=HIGHEST'},
    {id:'480',label:'480p / 30 fps',detailKey:'q480D',adaptive:'BITRATES=900000~1999999|STARTBITRATE=HIGHEST'},
    {id:'360',label:'360p / 30 fps',detailKey:'q360D',adaptive:'BITRATES=400000~899999|STARTBITRATE=HIGHEST'},
    {id:'160',label:'160p / 30 fps',detailKey:'q160D',adaptive:'BITRATES=100000~399999|STARTBITRATE=HIGHEST'}
  ];
  var chatEditorFields=[
    {key:'preset',labelKey:'fieldPreset',step:1,suffix:''},
    {key:'right',labelKey:'fieldRight',step:20,suffix:' px'},
    {key:'bottom',labelKey:'fieldBottom',step:20,suffix:' px'},
    {key:'width',labelKey:'fieldWidth',step:30,suffix:' px'},
    {key:'height',labelKey:'fieldHeight',step:30,suffix:' px'},
    {key:'font',labelKey:'fieldFont',step:1,suffix:' px'}
  ];
  var localChannels=[
    {slug:'luzrovinakick',username:'luzrovinaKICK',is_live:false,followers_count:11000,category:{name:'CZ/SK'}},
    {slug:'flygun',username:'FlyGun',is_live:false,followers_count:56000,category:{name:'CZ/SK'}}
  ];
  try{
    history=JSON.parse(localStorage.getItem('kicktv.recent')||'[]');selectedQuality=localStorage.getItem('kicktv.quality')||'480';
    var savedLayouts=JSON.parse(localStorage.getItem('kicktv.chatLayouts')||'null'),savedLayout=JSON.parse(localStorage.getItem('kicktv.chatLayout')||'null');
    if(savedLayouts&&savedLayouts.length===3)chatLayouts=savedLayouts;else if(savedLayout)chatLayouts[0]=savedLayout;
  }catch(e){}
  function clean(value){
    value=(value||'').trim().toLowerCase();
    value=value.replace(/^https?:\/\/(www\.)?kick\.com\//,'').replace(/[?#].*$/,'').replace(/^@/,'');
    return value.replace(/[^a-z0-9_-]/g,'');
  }
  function renderHistory(){
    recentBox.innerHTML='';recentSection.className=history.length?'recent':'recent hidden';
    history.forEach(function(name){
      var b=document.createElement('button'),label=document.createElement('span'),status=document.createElement('span');
      b.className='tile focusable';label.className='tile-name';label.textContent=name;status.className='tile-status checking';status.textContent=tr('checking');
      b.appendChild(label);b.appendChild(status);b.onclick=function(){open(name);};recentBox.appendChild(b);refreshHistoryStatus(name,status);
    });
  }
  function refreshHistoryStatus(name,status){
    var xhr=new XMLHttpRequest();xhr.open('GET','https://kick.com/api/v2/channels/'+encodeURIComponent(name),true);xhr.timeout=8000;xhr.setRequestHeader('Accept','application/json');
    function unknown(){status.className='tile-status checking';status.textContent=tr('unknown');}
    xhr.onreadystatechange=function(){if(xhr.readyState!==4)return;if(xhr.status>=200&&xhr.status<300){try{var data=JSON.parse(xhr.responseText),live=!!(data.livestream&&(data.livestream.is_live!==false));status.className='tile-status '+(live?'is-live':'is-offline');status.textContent=live?'● LIVE':'○ OFFLINE';}catch(e){unknown();}}else unknown();};
    xhr.onerror=unknown;xhr.ontimeout=unknown;try{xhr.send();}catch(e){unknown();}
  }
  function esc(value){return String(value||'').replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function compact(n){n=Number(n)||0;return n>=1000000?(n/1000000).toFixed(1)+(language==='cs'?' mil.':'M'):n>=1000?Math.round(n/1000)+(language==='cs'?' tis.':'K'):String(n);}
  function renderResults(channels){
    resultBox.innerHTML='';searchSection.className=channels.length?'search-results':'search-results hidden';
    channels.slice(0,6).forEach(function(c){
      var b=document.createElement('button');b.className='result focusable';
      var avatar=c.profile_pic?'<img class="avatar" src="'+esc(c.profile_pic)+'">':'<span class="avatar avatar-fallback">K</span>';
      var status=c.is_live?'<span class="live">● LIVE</span>':'OFFLINE';
      b.innerHTML=avatar+'<span class="result-copy"><strong class="result-name">'+esc(c.username||c.slug)+'</strong><span class="result-meta">'+status+' · '+esc((c.category&&c.category.name)||'Kick')+' · '+compact(c.followers_count)+' '+tr('followers')+'</span></span>';
      b.onclick=function(){open(c.slug);};resultBox.appendChild(b);
    });
  }
  function localMatches(query){
    var q=clean(query);return localChannels.filter(function(c){return c.slug.indexOf(q)>=0||clean(c.username).indexOf(q)>=0;});
  }
  function mergeChannels(primary,secondary){
    var out=[],seen={};primary.concat(secondary).forEach(function(c){if(c&&c.slug&&!seen[c.slug]){seen[c.slug]=true;out.push(c);}});return out;
  }
  function exactFallback(query){
    var slug=clean(query);return slug?{slug:slug,username:(query||slug).replace(/^@/,''),is_live:false,followers_count:0,category:{name:tr('exactChannel')}}:null;
  }
  function search(raw){
    var q=(raw||'').trim();clearTimeout(searchTimer);
    if(q.length<2){renderResults([]);searchState.textContent='';return;}
    searchTimer=setTimeout(function(){
      var seq=++searchSeq,local=localMatches(q),xhr=new XMLHttpRequest(),finished=false;
      var initial=local.length?local:[exactFallback(q)];renderResults(initial);searchState.textContent=local.length?tr('foundLocal'):tr('checkingOnline');
      function finish(remote,message){
        if(finished||seq!==searchSeq)return;finished=true;
        var channels=mergeChannels(local,remote||[]);if(!channels.length){var fallback=exactFallback(q);if(fallback)channels.push(fallback);}
        renderResults(channels);searchState.textContent=message||'';
      }
      xhr.open('GET','https://www.kickstats.com/api/search?query='+encodeURIComponent(q),true);
      xhr.timeout=6500;xhr.setRequestHeader('Accept','application/json');
      xhr.onreadystatechange=function(){if(xhr.readyState===4){if(xhr.status>=200&&xhr.status<300){try{finish((JSON.parse(xhr.responseText).channels||[]),'');}catch(e){finish([],tr('localResults'));}}else finish([],tr('localResults'));}};
      xhr.ontimeout=function(){finish([],tr('localResults'));};xhr.onerror=function(){finish([],tr('localResults'));};
      try{xhr.send();}catch(e){finish([],tr('localResults'));}
      setTimeout(function(){finish([],tr('localResults'));},7000);
    },350);
  }
  function open(raw){
    var name=clean(raw);if(!name){input.focus();return;}
    history=[name].concat(history.filter(function(x){return x!==name;})).slice(0,6);
    localStorage.setItem('kicktv.recent',JSON.stringify(history));renderHistory();
    input.value=name;currentChannelName=name;updateNowPlaying();
    try{if(document.activeElement)document.activeElement.blur();}catch(ignoreFocus){}
    home.className='hidden';resetPlayerView();view.classList.remove('hidden');playing=true;setScreenSaver(false);clearChat();setStatus(tr('gettingStream'),tr('kickConnecting'));showHud();
    requestStream(name);
  }
  function resetPlayerView(){
    view.className='';
    document.documentElement.classList.remove('video-playing');
    document.body.classList.remove('video-playing');
    sevenTVSequence++;sevenTVEmotes={};sevenTVCount=0;
    chatMode=0;chatUnread=0;updateChatHint();chatPanel.setAttribute('aria-hidden','true');
    qualityOpen=false;view.classList.remove('quality-open');qualityMenu.setAttribute('aria-hidden','true');
    chatEditorOpen=false;view.classList.remove('editor-open','chat-editing');chatEditor.setAttribute('aria-hidden','true');applyChatLayout(0);
  }
  function clearChat(){
    chatMessages.innerHTML='<div class="chat-empty">'+esc(tr('chatEmpty'))+'</div>';
    chatConnected=false;setChatStatus(tr('connecting'),false);chatUnread=0;updateChatHint();
  }
  function setChatStatus(text,connected){
    chatStatus.textContent=text;chatPanel.classList.toggle('connected',!!connected);
  }
  function updateChatHint(){
    var count=chatUnread>99?'99+':String(chatUnread),unread=chatUnread?' ('+count+')':'';
    if(chatMode===1)playerHint.textContent=tr('hudFull');
    else if(chatMode>=2&&chatMode<4)playerHint.textContent=tr('hudPreset',{next:chatMode});
    else if(chatMode===4)playerHint.textContent=tr('hudPresetLast');
    else playerHint.textContent=tr('hudOff',{unread:unread});
  }
  function cycleChat(){
    chatMode=(chatMode+1)%5;view.classList.toggle('chat-open',chatMode===1);view.classList.toggle('chat-overlay',chatMode>=2);chatPanel.setAttribute('aria-hidden',chatMode?'false':'true');if(chatMode>=2)applyChatLayout(chatMode-2);
    if(chatMode)chatUnread=0;updateChatHint();showHud();
  }
  function sevenTVItems(data){
    var source=(data&&data.emote_set&&data.emote_set.emotes)||(data&&data.emotes)||[],out=[];
    source.forEach(function(entry){
      var host=entry&&entry.data&&entry.data.host,files=host&&host.files||[],file=null,i;
      for(i=0;i<files.length;i++)if(files[i].name==='2x.webp'){file=files[i];break;}
      if(!file)for(i=0;i<files.length;i++)if(/\.webp$/i.test(files[i].name||'')){file=files[i];break;}
      if(!entry||!entry.name||!host||!host.url||!file)return;
      var base=host.url.indexOf('//')===0?'https:'+host.url:host.url;
      out.push([entry.name,base+'/'+file.name,file.static_name?base+'/'+file.static_name:'']);
    });
    return out;
  }
  function fetchSevenTV(url,cacheKey,callback){
    try{var cached=JSON.parse(localStorage.getItem(cacheKey)||'null');if(cached&&Date.now()-cached.time<43200000&&cached.items){callback(cached.items);return;}}catch(ignoreCache){}
    var xhr=new XMLHttpRequest(),done=false;function finish(items){if(done)return;done=true;items=items||[];try{localStorage.setItem(cacheKey,JSON.stringify({time:Date.now(),items:items}));}catch(ignoreStore){}callback(items);}
    xhr.open('GET',url,true);xhr.timeout=12000;xhr.setRequestHeader('Accept','application/json');
    xhr.onreadystatechange=function(){if(xhr.readyState!==4)return;if(xhr.status>=200&&xhr.status<300){try{finish(sevenTVItems(JSON.parse(xhr.responseText)));}catch(e){finish([]);}}else finish([]);};
    xhr.onerror=function(){finish([]);};xhr.ontimeout=function(){finish([]);};try{xhr.send();}catch(e){finish([]);}
  }
  function updateConnectedStatus(){if(chatConnected)setChatStatus(sevenTVCount?tr('connected7tv',{count:sevenTVCount}):tr('connected'),true);}
  function loadSevenTV(kickUserId){
    var sequence=++sevenTVSequence,globalItems=[],channelItems=[],pending=2;sevenTVEmotes={};sevenTVCount=0;
    function complete(){
      if(--pending||sequence!==sevenTVSequence)return;var map={};
      globalItems.concat(channelItems).forEach(function(item){map[item[0]]={url:item[1],staticUrl:item[2]};});sevenTVEmotes=map;sevenTVCount=Object.keys(map).length;updateConnectedStatus();
    }
    fetchSevenTV('https://7tv.io/v3/emote-sets/global','kicktv.7tv.global',function(items){globalItems=items;complete();});
    if(kickUserId)fetchSevenTV('https://7tv.io/v3/users/kick/'+encodeURIComponent(kickUserId),'kicktv.7tv.kick.'+kickUserId,function(items){channelItems=items;complete();});else complete();
  }
  function appendSevenTVText(target,content){
    String(content||'').split(/(\s+)/).forEach(function(part){
      var emote=sevenTVEmotes[part];if(!emote){target.appendChild(document.createTextNode(part));return;}
      var img=document.createElement('img');img.className='chat-emote';img.alt=part;img.title=part;img.src=emote.url;img.setAttribute('draggable','false');if(emote.staticUrl)img.setAttribute('data-static-url',emote.staticUrl);
      img.onerror=function(){var fallback=img.getAttribute('data-static-url');if(fallback&&img.src!==fallback){img.src=fallback;return;}if(img.parentNode)img.parentNode.replaceChild(document.createTextNode(img.alt),img);};target.appendChild(img);
    });
  }
  function renderMessageContent(target,content){
    var source=String(content||''),pattern=/\[emote:(\d+):([^\]]+)\]/g,last=0,match;
    while((match=pattern.exec(source))!==null){
      appendSevenTVText(target,source.slice(last,match.index));
      var img=document.createElement('img');img.className='chat-emote kick-emote';img.alt=match[2];img.title=match[2];img.src='https://files.kick.com/emotes/'+match[1]+'/fullsize';img.setAttribute('draggable','false');
      img.onerror=function(){if(this.parentNode)this.parentNode.replaceChild(document.createTextNode(this.alt),this);};target.appendChild(img);last=pattern.lastIndex;
    }
    appendSevenTVText(target,source.slice(last));
  }
  function addChatMessage(data){
    var sender=data.sender||data.user||{},content=data.content||(data.message&&data.message.message)||'';
    if(!content)return;
    var empty=chatMessages.querySelector('.chat-empty');if(empty)empty.remove();
    var item=document.createElement('div'),avatar=document.createElement('span'),copy=document.createElement('div'),name=document.createElement('span'),textNode=document.createElement('span');
    var username=sender.username||'Kick',color=sender.identity&&sender.identity.color;
    item.className='chat-message';avatar.className='chat-avatar';copy.className='chat-copy';name.className='chat-name';textNode.className='chat-text';
    avatar.textContent=username.charAt(0).toUpperCase();name.textContent=username;if(/^#[0-9a-f]{6}$/i.test(color||''))name.style.color=color;renderMessageContent(textNode,content);
    copy.appendChild(name);copy.appendChild(textNode);item.appendChild(avatar);item.appendChild(copy);chatMessages.appendChild(item);
    while(chatMessages.children.length>55)chatMessages.removeChild(chatMessages.firstChild);
    chatMessages.scrollTop=chatMessages.scrollHeight;if(chatMode===0&&!chatEditorOpen){chatUnread++;updateChatHint();}
  }
  function disconnectChat(){
    clearTimeout(chatReconnect);chatReconnect=null;var socket=chatSocket;chatSocket=null;chatRoomId=null;chatConnected=false;if(socket)try{socket.close();}catch(ignore){}
  }
  function connectChat(roomId){
    disconnectChat();chatRoomId=roomId;if(!roomId){setChatStatus(tr('chatUnavailable'),false);return;}
    setChatStatus(tr('connecting'),false);
    try{
      var socket=new WebSocket(pusherUrl);chatSocket=socket;
      socket.onmessage=function(event){
        if(socket!==chatSocket)return;
        try{
          var packet=JSON.parse(event.data),payload=typeof packet.data==='string'?JSON.parse(packet.data):packet.data;
          if(packet.event==='pusher:connection_established')socket.send(JSON.stringify({event:'pusher:subscribe',data:{auth:'',channel:'chatrooms.'+roomId+'.v2'}}));
          else if(packet.event==='pusher_internal:subscription_succeeded'){chatConnected=true;updateConnectedStatus();}
          else if(packet.event==='pusher:ping')socket.send(JSON.stringify({event:'pusher:pong',data:{}}));
          else if(packet.event&&packet.event.indexOf('ChatMessage')>=0)addChatMessage(payload||{});
        }catch(ignorePacket){}
      };
      socket.onerror=function(){if(socket===chatSocket){chatConnected=false;setChatStatus(tr('chatReconnecting'),false);}};
      socket.onclose=function(){if(socket!==chatSocket||!playing)return;chatSocket=null;chatConnected=false;setChatStatus(tr('restoringConnection'),false);chatReconnect=setTimeout(function(){if(playing)connectChat(roomId);},3000);};
    }catch(e){chatConnected=false;setChatStatus(tr('chatFailed'),false);chatReconnect=setTimeout(function(){if(playing)connectChat(roomId);},4000);}
  }
  function clamp(value,min,max){return Math.max(min,Math.min(max,Number(value)||0));}
  function cloneLayouts(value){return JSON.parse(JSON.stringify(value));}
  function activePreset(){return chatEditorOpen?chatEditorPreset:(chatMode>=2?chatMode-2:0);}
  function normaliseChatLayout(layout){
    layout.width=clamp(layout.width,360,1200);layout.height=clamp(layout.height,220,850);layout.font=clamp(layout.font,14,30);
    layout.right=clamp(layout.right,20,1920-layout.width-20);layout.bottom=clamp(layout.bottom,20,1080-layout.height-20);
  }
  function applyChatLayout(index){
    index=index===undefined?activePreset():index;var layout=chatLayouts[index]||chatLayouts[0];normaliseChatLayout(layout);chatPanel.style.setProperty('--overlay-right',layout.right+'px');chatPanel.style.setProperty('--overlay-bottom',layout.bottom+'px');chatPanel.style.setProperty('--overlay-width',layout.width+'px');chatPanel.style.setProperty('--overlay-height',layout.height+'px');chatPanel.style.setProperty('--overlay-font',layout.font+'px');
  }
  function renderChatEditor(){
    var layout=chatLayouts[chatEditorPreset];editorSubtitle.textContent=tr('editorSubtitle',{number:chatEditorPreset+1});chatEditorRows.innerHTML='';chatEditorFields.forEach(function(field,index){var row=document.createElement('div'),label=document.createElement('strong'),value=document.createElement('span');row.className='editor-row'+(index===chatEditorIndex?' focused':'');label.textContent=tr(field.labelKey);value.textContent=field.key==='preset'?'‹  '+tr('preset',{number:chatEditorPreset+1})+' / 3  ›':'‹  '+layout[field.key]+field.suffix+'  ›';row.appendChild(label);row.appendChild(value);chatEditorRows.appendChild(row);});
  }
  function openChatEditor(){
    chatEditorOriginal=cloneLayouts(chatLayouts);chatEditorPreviousMode=chatMode;chatEditorPreset=chatMode>=2?chatMode-2:0;chatEditorIndex=0;chatEditorOpen=true;
    view.classList.remove('chat-open');view.classList.add('chat-overlay','chat-editing','editor-open');chatPanel.setAttribute('aria-hidden','false');chatEditor.setAttribute('aria-hidden','false');renderChatEditor();
  }
  function closeChatEditor(save){
    if(!save&&chatEditorOriginal)chatLayouts=chatEditorOriginal;if(save)try{localStorage.setItem('kicktv.chatLayouts',JSON.stringify(chatLayouts));}catch(ignoreStore){}
    chatEditorOpen=false;view.classList.remove('chat-editing','editor-open','chat-open','chat-overlay');view.classList.toggle('chat-open',chatEditorPreviousMode===1);view.classList.toggle('chat-overlay',chatEditorPreviousMode>=2);chatMode=chatEditorPreviousMode;applyChatLayout(chatMode>=2?chatMode-2:0);chatPanel.setAttribute('aria-hidden',chatMode?'false':'true');chatEditor.setAttribute('aria-hidden','true');updateChatHint();showHud();
  }
  function moveChatEditor(delta){chatEditorIndex=(chatEditorIndex+delta+chatEditorFields.length)%chatEditorFields.length;renderChatEditor();}
  function adjustChatEditor(direction){var field=chatEditorFields[chatEditorIndex];if(field.key==='preset')chatEditorPreset=(chatEditorPreset+direction+3)%3;else{var layout=chatLayouts[chatEditorPreset];layout[field.key]+=field.step*direction;normaliseChatLayout(layout);}applyChatLayout(chatEditorPreset);renderChatEditor();}
  function qualityIndex(id){for(var i=0;i<qualityProfiles.length;i++)if(qualityProfiles[i].id===id)return i;return 3;}
  function currentQuality(){return qualityProfiles[qualityIndex(selectedQuality)];}
  function qualityLabel(profile){return profile.label||tr(profile.labelKey);}
  function updateNowPlaying(){document.getElementById('nowPlaying').textContent='kick.com/'+currentChannelName+' · '+qualityLabel(currentQuality());}
  function renderQualityMenu(){
    qualityList.innerHTML='';qualityProfiles.forEach(function(profile,index){
      var row=document.createElement('div'),label=document.createElement('strong'),detail=document.createElement('span');row.className='quality-option'+(profile.id===selectedQuality?' selected':'')+(index===qualityCursor?' focused':'');row.setAttribute('data-selected-label',tr('saved'));label.textContent=qualityLabel(profile);detail.textContent=tr(profile.detailKey);row.appendChild(label);row.appendChild(detail);qualityList.appendChild(row);
    });
  }
  function openQualityMenu(){qualityCursor=qualityIndex(selectedQuality);qualityOpen=true;view.classList.add('quality-open');qualityMenu.setAttribute('aria-hidden','false');renderQualityMenu();}
  function closeQualityMenu(){qualityOpen=false;view.classList.remove('quality-open');qualityMenu.setAttribute('aria-hidden','true');showHud();}
  function moveQuality(delta){qualityCursor=(qualityCursor+delta+qualityProfiles.length)%qualityProfiles.length;renderQualityMenu();}
  function applyQuality(){
    selectedQuality=qualityProfiles[qualityCursor].id;try{localStorage.setItem('kicktv.quality',selectedQuality);}catch(ignoreStore){}updateNowPlaying();closeQualityMenu();
    if(currentStreamUrl){setStatus(tr('changingQuality'),tr('qualityReload',{quality:qualityLabel(currentQuality())}));startAVPlay(currentStreamUrl,currentRoomId,true);}
  }
  function revealVideo(){
    view.classList.remove('player-error');
    view.classList.add('player-ready');
    document.documentElement.classList.add('video-playing');
    document.body.classList.add('video-playing');
  }
  function setStatus(title,detail,error){
    document.getElementById('statusTitle').textContent=title;
    document.getElementById('statusDetail').textContent=detail||'';
    view.classList.remove('player-ready');
    view.classList.toggle('player-error',!!error);
  }
  function requestStream(name){
    var xhr=new XMLHttpRequest();xhr.open('GET','https://kick.com/api/v2/channels/'+encodeURIComponent(name),true);xhr.timeout=15000;xhr.setRequestHeader('Accept','application/json');
    xhr.onreadystatechange=function(){if(xhr.readyState!==4)return;if(xhr.status>=200&&xhr.status<300){try{var data=JSON.parse(xhr.responseText);if(!data.playback_url){setStatus(tr('channelOffline'),tr('noPlayback'),true);return;}currentStreamUrl=data.playback_url;currentRoomId=data.chatroom&&data.chatroom.id;loadSevenTV(data.user_id||(data.user&&data.user.id));startAVPlay(currentStreamUrl,currentRoomId,false);}catch(e){setStatus(tr('invalidKick'),String(e),true);}}else setStatus(tr('kickFailed'),tr('retryHttp',{status:xhr.status}),true);};
    xhr.ontimeout=function(){setStatus(tr('kickTimeout'),tr('timeoutDetail'),true);};xhr.onerror=function(){setStatus(tr('networkError'),tr('networkDetail'),true);};
    try{xhr.send();}catch(e){setStatus(tr('requestError'),String(e),true);}
  }
  function startAVPlay(url,roomId,keepChat){
    if(!window.webapis||!webapis.avplay){setStatus(tr('avUnavailable'),tr('avUnavailableDetail'),true);return;}
    try{
      try{var oldState=webapis.avplay.getState();if(oldState==='PLAYING'||oldState==='PAUSED'||oldState==='READY')webapis.avplay.stop();if(webapis.avplay.getState()!=='NONE')webapis.avplay.close();}catch(ignore){}
      webapis.avplay.open(url);
      webapis.avplay.setDisplayRect(0,0,1920,1080);
      webapis.avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_LETTER_BOX');
      try{webapis.avplay.setStreamingProperty('ADAPTIVE_INFO',currentQuality().adaptive);}catch(ignoreAdaptive){}
      if(!keepChat)connectChat(roomId);
      webapis.avplay.setListener({
        onbufferingstart:function(){setStatus(tr('loadingVideo'),tr('bufferingDetail'));},
        onbufferingprogress:function(percent){document.getElementById('statusDetail').textContent='Buffer '+percent+' %';},
        onbufferingcomplete:function(){revealVideo();showHud();},
        oncurrentplaytime:function(){if(!view.classList.contains('player-ready'))revealVideo();},
        onstreamcompleted:function(){setStatus(tr('streamEnded'),tr('streamEndedDetail'),true);},
        onerror:function(error){setStatus(tr('playbackError'),String(error),true);},
        onevent:function(){},onsubtitlechange:function(){},ondrmevent:function(){}
      });
      webapis.avplay.prepareAsync(function(){try{webapis.avplay.setDisplayRect(0,0,1920,1080);webapis.avplay.play();}catch(e){setStatus(tr('cannotPlay'),String(e),true);}},function(error){setStatus(tr('cannotPrepare'),String(error),true);});
    }catch(e){setStatus(tr('avFailed'),String(e.name||e)+': '+String(e.message||''),true);}
  }
  function closePlayer(){
    disconnectChat();
    if(window.webapis&&webapis.avplay){try{var state=webapis.avplay.getState();if(state==='PLAYING'||state==='PAUSED'||state==='READY')webapis.avplay.stop();if(webapis.avplay.getState()!=='NONE')webapis.avplay.close();}catch(e){}}
    setScreenSaver(true);resetPlayerView();view.classList.add('hidden');home.className='';playing=false;currentStreamUrl=null;currentRoomId=null;currentChannelName='';renderHistory();setTimeout(function(){watch.focus();},50);
  }
  function setScreenSaver(enabled){try{if(window.webapis&&webapis.appcommon){var state=enabled?webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_ON:webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_OFF;webapis.appcommon.setScreenSaver(state,function(){},function(){});}}catch(ignoreScreenSaver){}}
  function showHud(){view.classList.add('hud');clearTimeout(hudTimer);hudTimer=setTimeout(function(){view.classList.remove('hud');},2400);}
  function consumeKey(e){if(!e)return;try{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();}catch(ignoreEvent){}}
  function handleBack(e){
    consumeKey(e);var now=Date.now();if(now-lastBackAt<350)return;lastBackAt=now;
    if(playing){if(chatEditorOpen)closeChatEditor(false);else if(qualityOpen)closeQualityMenu();else closePlayer();return;}
    if((input.value||'').trim()||!searchSection.classList.contains('hidden')){clearTimeout(searchTimer);searchSeq++;input.value='';renderResults([]);searchState.textContent='';input.focus();return;}
    try{tizen.application.getCurrentApplication().exit();}catch(x){window.close();}
  }
  function focusables(){return Array.prototype.slice.call(document.querySelectorAll('#home .focusable')).filter(function(el){return el.offsetParent!==null;});}
  function move(delta){var a=focusables(),i=a.indexOf(document.activeElement);i=i<0?0:(i+delta+a.length)%a.length;a[i].focus();}
  function sparkle(){var box=document.getElementById('sparkles');for(var i=0;i<22;i++){var s=document.createElement('i');s.className='spark';s.style.left=(18+Math.random()*64)+'%';s.style.top=(18+Math.random()*64)+'%';s.style.animationDelay=(Math.random()*.45)+'s';box.appendChild(s);setTimeout((function(x){return function(){x.remove();};})(s),2100);}}
  function remember(code){secret.push(code);secret=secret.slice(-8);if(secret.join(',')==='38,38,40,40,37,39,37,39')sparkle();}
  applyLanguage();watch.onclick=function(){open(input.value);};input.addEventListener('input',function(){search(input.value);});renderHistory();
  document.addEventListener('keydown',function(e){
    remember(e.keyCode);
    if(e.keyCode===10009||e.keyCode===27){handleBack(e);return;}
    if(playing){
      showHud();
      if(chatEditorOpen){if(e.keyCode===38){e.preventDefault();moveChatEditor(-1);}else if(e.keyCode===40){e.preventDefault();moveChatEditor(1);}else if(e.keyCode===37){e.preventDefault();adjustChatEditor(-1);}else if(e.keyCode===39){e.preventDefault();adjustChatEditor(1);}else if(e.keyCode===13){e.preventDefault();closeChatEditor(true);}return;}
      if(qualityOpen){if(e.keyCode===38){e.preventDefault();moveQuality(-1);}else if(e.keyCode===40){e.preventDefault();moveQuality(1);}else if(e.keyCode===13){e.preventDefault();applyQuality();}return;}
      if(e.keyCode===38){e.preventDefault();openQualityMenu();return;}if(e.keyCode===40){e.preventDefault();openChatEditor();return;}if(e.keyCode===13){e.preventDefault();cycleChat();return;}if(window.webapis&&webapis.avplay){try{var state=webapis.avplay.getState();if(e.keyCode===415&&state!=='PLAYING')webapis.avplay.play();else if(e.keyCode===19&&state==='PLAYING')webapis.avplay.pause();else if(e.keyCode===10252){if(state==='PLAYING')webapis.avplay.pause();else if(state==='PAUSED')webapis.avplay.play();}}catch(ignore){}}return;
    }
    if(document.activeElement===input){
      if(e.keyCode===39||e.keyCode===40){e.preventDefault();watch.focus();}
      else if(e.keyCode===13){e.preventDefault();search(input.value);setTimeout(function(){var first=resultBox.querySelector('.focusable');if(first)first.focus();else watch.focus();},500);}
      return;
    }
    if(e.keyCode===37||e.keyCode===38){e.preventDefault();move(-1);}else if(e.keyCode===39||e.keyCode===40){e.preventDefault();move(1);}else if(e.keyCode===13&&document.activeElement){document.activeElement.click();}
  },true);
  try{['MediaPlay','MediaPause','MediaPlayPause'].forEach(function(k){tizen.tvinputdevice.registerKey(k);});}catch(e){}
  applyChatLayout();setTimeout(function(){input.focus();},100);
})();
