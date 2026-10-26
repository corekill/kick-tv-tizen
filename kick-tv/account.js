/* OAuth secrets stay on the broker. This client only keeps a revocable TV
 * session. Obfuscating this file is not a security boundary. ES5 for old TVs. */
(function(root){
  'use strict';
  root.KickTVAccount={install:function(options){
    var cs=options.language==='cs',base='https://kicktv.corekill.cz/api/kicktv/auth',key='kicktv.account.v1',prefsKey='kicktv.privacy.v2';
    var credentials=null,prefs=null,dialog=null,previous=null,pair=null,pollTimer=null,expiryTimer=null,requests=[],generation=0,lastChannel=-1,draft=null,eventSeen={},eventsAvailable=true,eventBusy=false;
    var text=cs?{login:'Přihlásit',settings:'Soukromí',privacy:'Soukromí a připojení',explain:'Připojení k serveru zahrnuje statistiku používání a technickou diagnostiku (model TV, systém, výkon a paměť). Zároveň umožní přihlášení účtu a zobrazování událostí kanálu. Server pro tyto funkce zpracuje identitu účtu, přihlašovací tokeny a právě otevřený kanál. Heslo zadáváš pouze na Kicku. Bez souhlasu se k našemu serveru nepřipojujeme a přihlášení není dostupné; anonymní sledování dál funguje. Volbu můžeš kdykoli změnit.',server:'Připojení k serveru a diagnostika',diagnostics:'Dobrovolná technická diagnostika',diagHelp:'Diagnostika je samostatná volba: model TV, systém, CPU, paměť a technické chyby. Bez historie, obsahu chatu a streamovacích adres. Změna je možná kdykoli tady.',save:'Uložit volby',on:'zapnuto',off:'vypnuto',qr:'Přihlášení přes telefon',scan:'Naskenuj QR kód telefonem a přihlas se přímo na Kicku. Kód platí 5 minut. Pak potvrď účet na TV.',cancel:'Zrušit',confirm:'Přihlásit tento účet',waiting:'Čekám na přihlášení…',failed:'Přihlášení se nepodařilo. Zkus to znovu.',expired:'Párování vypršelo. Zavři okno a zkus to znovu.',account:'Kick účet',logout:'Odhlásit',openKick:'Otevřít Kick',close:'Zavřít'}:{login:'Sign in',settings:'Privacy',privacy:'Privacy and connection',explain:'Server connectivity includes usage statistics and technical diagnostics (TV model, system, performance and memory). It also enables account sign-in and channel events. The server processes your account identity, sign-in tokens and currently open channel for those features. Enter your password only on Kick. Without consent there is no connection to our server or account sign-in; anonymous viewing still works. You can change this choice at any time.',server:'Server connection and diagnostics',diagnostics:'Optional technical diagnostics',diagHelp:'Diagnostics are separate: TV model, system, CPU, memory and technical errors. No history, chat content or stream URLs. You can change this choice here at any time.',save:'Save preferences',on:'on',off:'off',qr:'Sign in with your phone',scan:'Scan the QR code and sign in directly on Kick. The code expires in 5 minutes. Then confirm the account on your TV.',cancel:'Cancel',confirm:'Sign in as this account',waiting:'Waiting for sign-in…',failed:'Sign-in failed. Please try again.',expired:'Pairing expired. Close this dialog and try again.',account:'Kick account',logout:'Sign out',openKick:'Open Kick',close:'Close'};
    text.explain=cs?'Připojení k serveru zahrnuje anonymní počítadlo spuštění a technickou diagnostiku (model TV, systém, výkon a paměť). Umožní také přihlášení přes oficiální OAuth a příjem událostí kanálu. Heslo zadáváš přímo na Kicku; aplikace ho nikdy nedostane. Server ukládá OAuth tokeny šifrovaně a televize dostane jen odvolatelnou relaci. Kick API zatím neposkytuje seznam sledovaných ani zůstatek diváckých bodů; psaní do chatu je vypnuté. Bez souhlasu se k našemu serveru nepřipojujeme a přihlášení není dostupné; anonymní sledování dál funguje. Volbu můžeš kdykoli změnit.':'Server connectivity includes an anonymous first-launch count and technical diagnostics (TV model, system, performance and memory). It also enables official OAuth sign-in and channel event delivery. You enter your password directly on Kick; the app never receives it. The server stores OAuth tokens encrypted, while the TV receives only a revocable session. The Kick API does not yet provide a followed-channels list or viewer-points balance; chat writing is disabled. Without consent, the app does not connect to our server and sign-in is unavailable; anonymous viewing still works. You can change this choice at any time.';
    text.diagHelp=cs?'Při zapnutém připojení se odesílá model TV, systém, CPU, paměť a technické chyby. Bez historie, obsahu chatu a streamovacích adres. Volbu můžeš kdykoli změnit.':'When server connectivity is enabled, the app sends the TV model, system, CPU, memory and technical errors. No history, chat content or stream URLs. You can change this choice at any time.';
    try{prefs=JSON.parse(localStorage.getItem(prefsKey)||'null');credentials=JSON.parse(localStorage.getItem(key)||'null');}catch(ignoreStorage){}
    if(!prefs||prefs.schema!==3||typeof prefs.server!=='boolean'||typeof prefs.diagnostics!=='boolean')prefs=null;
    if(credentials&&(!/^[A-Za-z0-9_-]{40,64}$/.test(credentials.session||'')||typeof credentials.name!=='string'))credentials=null;
    var accountButton=document.createElement('button'),privacyButton=document.createElement('button'),actions=document.createElement('div');
    actions.className='account-actions';accountButton.className=privacyButton.className='focusable account-button';privacyButton.textContent=text.settings;
    actions.appendChild(privacyButton);actions.appendChild(accountButton);document.querySelector('#home .topbar').appendChild(actions);
    function update(){accountButton.textContent=credentials?credentials.name:text.login;}
    function allowed(){return !!(prefs&&prefs.server);}
    function request(method,path,data,token,callback,force){
      if(!allowed()&&!force){callback(new Error('offline'));return;}
      var xhr=new XMLHttpRequest(),finished=false;
      function finish(error,result){if(finished)return;finished=true;var i=requests.indexOf(xhr);if(i>=0)requests.splice(i,1);callback(error,result);}
      xhr.open(method,base+path,true);xhr.timeout=15000;requests.push(xhr);
      if(token)xhr.setRequestHeader('Authorization','Bearer '+token);
      if(data!==null)xhr.setRequestHeader('Content-Type','application/json');
      xhr.onload=function(){var value;try{value=JSON.parse(xhr.responseText);}catch(ignoreJSON){}finish(xhr.status>=200&&xhr.status<300?null:new Error('HTTP '+xhr.status),value);};
      xhr.onerror=xhr.ontimeout=function(){finish(new Error('network'));};xhr.onabort=function(){finish(new Error('cancelled'));};
      try{xhr.send(data===null?null:JSON.stringify(data));}catch(error){finish(error);}
    }
    function forget(){credentials=null;lastChannel=-1;try{localStorage.removeItem(key);}catch(ignoreStorage){}update();}
    function stopPair(){clearTimeout(pollTimer);clearTimeout(expiryTimer);pollTimer=expiryTimer=null;if(pair){var old=pair;pair=null;request('POST','/pair/cancel',{pair:old.pair},old.poll,function(){});}generation++;}
    function close(){stopPair();if(dialog&&dialog.parentNode)dialog.parentNode.removeChild(dialog);dialog=null;draft=null;if(previous&&previous.focus)previous.focus();}
    function open(title){if(dialog)close();previous=document.activeElement;dialog=document.createElement('section');dialog.className='account-modal';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');var card=document.createElement('div');card.className='account-card';dialog.appendChild(card);var h=document.createElement('h2');h.textContent=title;card.appendChild(h);document.body.appendChild(dialog);return card;}
    function paragraph(card,value){var p=document.createElement('p');p.textContent=value;card.appendChild(p);return p;}
    function button(card,value,callback){var b=document.createElement('button');b.type='button';b.textContent=value;b.onclick=callback;card.appendChild(b);return b;}
    function link(card,value,url){var a=document.createElement('a');a.className='account-link';a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=value;card.appendChild(a);return a;}
    function privacy(){
      var card=open(text.privacy);draft={schema:3,server:allowed(),diagnostics:allowed()};paragraph(card,text.explain);
      var connection=button(card,'',function(){draft.server=!draft.server;draft.diagnostics=draft.server;paint();});
      function paint(){connection.textContent=text.server+': '+(draft.server?text.on:text.off);connection.setAttribute('aria-pressed',String(draft.server));}
      function save(){
        var oldAllowed=allowed(),saved=draft;
        if(oldAllowed&&!saved.server&&credentials)request('POST','/logout',{},credentials.session,function(){});
        prefs=saved;try{localStorage.setItem(prefsKey,JSON.stringify(prefs));}catch(ignoreStorage){}
        if(!prefs.server)forget();
        if(options.telemetry)options.telemetry(!!(prefs.server&&prefs.diagnostics));
        close();if(options.onConsent)options.onConsent();
      }
      var saveButton=button(card,text.save,save);paint();saveButton.focus();
    }
    function login(){
      if(!allowed()){privacy();return;}
      if(credentials){var info=open(text.account);paragraph(info,credentials.name);link(info,text.openKick,'https://kick.com').focus();button(info,text.logout,function(){request('POST','/logout',{},credentials.session,function(error){if(error){paragraph(info,text.failed);return;}forget();close();});});button(info,text.close,close);return;}
      var card=open(text.qr),attempt=++generation;paragraph(card,text.scan);var status=paragraph(card,text.waiting);button(card,text.cancel,close).focus();
      request('POST','/pair',{},null,function(error,result){
        if(attempt!==generation||!dialog){if(!error&&result)request('POST','/pair/cancel',{pair:result.pair},result.poll,function(){});return;}
        if(error||!result){status.textContent=text.failed;return;}
        pair=result;var image=document.createElement('img');image.className='account-qr';image.alt='QR';image.onerror=function(){image.style.display='none';status.textContent=text.failed;};image.src=base+'/pair/qr?pair='+encodeURIComponent(result.pair);card.insertBefore(image,status);
        expiryTimer=setTimeout(function(){if(attempt!==generation)return;stopPair();status.textContent=text.expired;},300000);
        function poll(){
          if(attempt!==generation||!pair)return;
          request('GET','/pair/status?pair='+encodeURIComponent(pair.pair),null,pair.poll,function(error,value){
            if(attempt!==generation||!pair)return;
            if(error){status.textContent=text.failed;stopPair();return;}
            if(value.status==='confirm'){
              status.textContent=value.name;image.style.display='none';
              button(card,text.confirm,function(){
                if(!pair)return;var pending=pair;
                request('POST','/pair/claim',{pair:pending.pair},pending.poll,function(error,account){
                  if(attempt!==generation){if(!error&&account)request('POST','/logout',{},account.session,function(){});return;}
                  if(error){status.textContent=text.failed;return;}
                  credentials=account;try{localStorage.setItem(key,JSON.stringify(account));}catch(ignoreStore){}
                  pair=null;update();close();if(options.onLogin)options.onLogin();
                });
              }).focus();return;
            }
            pollTimer=setTimeout(poll,3000);
          });
        }
        poll();
      });
    }
    privacyButton.onclick=privacy;accountButton.onclick=login;
    root.addEventListener('keydown',function(e){
      if(!dialog)return;
      var code=e.keyCode;e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();
      if(code===10009||code===27){close();return;}
      var buttons=dialog.querySelectorAll('button,a[href]'),index=Array.prototype.indexOf.call(buttons,document.activeElement);
      if(code===13&&index>=0){if(!root.KickTVOKHeld){root.KickTVOKHeld=true;var selected=buttons[index];selected.click();}}
      else if(code===37||code===38||code===39||code===40){index=(index+(code===37||code===38?-1:1)+buttons.length)%buttons.length;if(buttons[index])buttons[index].focus();}
    },true);
    root.addEventListener('keyup',function(e){if(e.keyCode===13&&root.KickTVOKHeld){root.KickTVOKHeld=false;e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();}},true);
    document.addEventListener('visibilitychange',function(){if(document.hidden&&pair)close();});
    update();
    if(options.telemetry)options.telemetry(!!(prefs&&prefs.server&&prefs.diagnostics));
    if(allowed()&&credentials)request('GET','/me',null,credentials.session,function(error,me){if(!error){credentials.name=me.name;update();}else if(error.message==='HTTP 401')forget();});
    function initial(){if(!prefs){if(document.hidden||options.playing&&options.playing()){setTimeout(initial,2000);return;}privacy();}}
    setTimeout(initial,700);
    setInterval(function(){
      if(!credentials||!allowed()||lastChannel<=0||!eventsAvailable||eventBusy||document.hidden)return;
      eventBusy=true;var channel=lastChannel;
      request('GET','/events',null,credentials.session,function(error,data){
        eventBusy=false;if(error||channel!==lastChannel||!credentials)return;
        if(data.enabled===false){eventsAvailable=false;return;}
        (data.events||[]).forEach(function(event){
          if(eventSeen[event.id])return;eventSeen[event.id]=Date.now();
          if(!options.message)return;
          var labels=cs?{'channel.followed':'nové sledování','channel.subscription.new':'nové předplatné','channel.subscription.renewal':'obnovené předplatné','channel.subscription.gifts':'darované předplatné','channel.reward.redemption.updated':'odměna za body','kicks.gifted':'darované KICKs'}:{'channel.followed':'new follow','channel.subscription.new':'new subscription','channel.subscription.renewal':'subscription renewal','channel.subscription.gifts':'gifted subscriptions','channel.reward.redemption.updated':'channel reward','kicks.gifted':'gifted KICKs'};
          options.message({sender:{username:'KICK',identity:{color:'#53fc18'}},content:event.name+' · '+(labels[event.type]||event.type)+(event.reward?' · '+event.reward:'')});
        });
        for(var id in eventSeen)if(eventSeen[id]<Date.now()-600000)delete eventSeen[id];
      });
    },12000);
    return {serverAllowed:allowed,privacy:privacy,channel:function(id){id=Number(id)||0;if(!credentials||!allowed()||lastChannel===id)return;lastChannel=id;request('POST','/channel',{channel:id},credentials.session,function(error){if(error)lastChannel=-1;});}};
  }};
})(window);
