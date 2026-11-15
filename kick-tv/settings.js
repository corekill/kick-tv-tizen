/* TV-local preferences and a manually curated channel list. */
(function(root){
  'use strict';
  var key='kicktv.preferences.v1',sorts=['default','viewers','name','followers','plays'];
  function slug(value){return typeof value==='string'&&/^[a-z0-9_-]{1,100}$/i.test(value)?value.toLowerCase():'';}
  function read(){
    var stored={};try{stored=JSON.parse(localStorage.getItem(key))||{};}catch(ignore){}
    var channels=[],plays=Object.create(null);
    if(Array.isArray(stored.channels))stored.channels.slice(0,50).forEach(function(value){var name=slug(value);if(name&&channels.indexOf(name)<0)channels.push(name);});
    Object.keys(stored.plays||{}).slice(0,200).forEach(function(name){if(slug(name)===name)plays[name]=Math.max(0,Math.min(999999,Math.floor(Number(stored.plays[name])||0)));});
    return {mode:stored.mode==='manual'?'manual':'recent',sort:sorts.indexOf(stored.sort)>=0?stored.sort:'default',channels:channels,plays:plays};
  }
  var prefs=read();
  function save(){try{localStorage.setItem(key,JSON.stringify(prefs));return true;}catch(ignore){return false;}}
  function record(name){if(!slug(name))return;if(!prefs.plays[name]&&Object.keys(prefs.plays).length>=200)delete prefs.plays[Object.keys(prefs.plays)[0]];prefs.plays[name]=Math.min(999999,(prefs.plays[name]||0)+1);save();}
  function compare(a,b){
    var sort=prefs.sort;if(sort==='name')return a.name.localeCompare(b.name)||a.position-b.position;
    if(sort==='default')return a.position-b.position;
    var av=sort==='plays'?(prefs.plays[(a.slug||a.name).toLowerCase()]||0):a[sort],bv=sort==='plays'?(prefs.plays[(b.slug||b.name).toLowerCase()]||0):b[sort];
    return (typeof bv==='number'?bv:-1)-(typeof av==='number'?av:-1)||a.position-b.position;
  }
  function install(options){
    var cs=options.language==='cs',home=document.getElementById('home'),gear=document.getElementById('settingsButton'),panel=null,timer,xhr,sequence=0,stopPhone=null;
    var t=cs?{title:'Nastavení',close:'Hotovo',sort:'Řadit streamery',mode:'Na hlavní obrazovce',recent:'Naposledy sledované',manual:'Můj seznam',find:'Přidat kanál podle části jména…',empty:'Zatím tu nejsou žádné kanály.',none:'Žádné odpovídající kanály.',failed:'Vyhledávání se nezdařilo. Zkus to znovu.',loading:'Hledám…',limit:'Seznam pojme nejvýš 50 kanálů.',remove:'Odebrat',saveError:'Nastavení se nepodařilo uložit.'}:{title:'Settings',close:'Done',sort:'Sort streamers',mode:'Show on home',recent:'Recently watched',manual:'My list',find:'Add a channel by partial name…',empty:'No channels yet.',none:'No matching channels.',failed:'Search failed. Please try again.',loading:'Searching…',limit:'The list can hold up to 50 channels.',remove:'Remove',saveError:'Could not save settings.'};
    var sortNames=cs?['Původní pořadí','Počet diváků','Jméno A–Z','Počet sledujících na Kicku','Počet otevření na této TV']:['Original order','Viewer count','Name A–Z','Kick follower count','Times opened on this TV'];
    function el(tag,parent,cls,label){var node=document.createElement(tag);if(cls)node.className=cls;if(label)node.textContent=label;if(parent)parent.appendChild(node);return node;}
    function button(parent,label,action){var node=el('button',parent,'focusable',label);node.type='button';node.onclick=action;return node;}
    function close(){if(!panel)return false;sequence++;clearTimeout(timer);if(xhr)xhr.abort();if(stopPhone)stopPhone();stopPhone=null;panel.parentNode.removeChild(panel);panel=null;gear.focus();return true;}
    function open(){
      if(panel)return;
      panel=el('section',home,'settings-screen');panel.id='tvSettings';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',t.title);
      var card=el('div',panel,'settings-card'),header=el('header',card,'settings-header'),heading=el('h2',header,'',t.title);button(header,t.close,close);
      var taps=0,lastTap=0;
      heading.addEventListener('click',function(){var now=Date.now();taps=now-lastTap<550?taps+1:1;lastTap=now;if(taps===5){taps=0;heading.classList.add('settings-wink');setTimeout(function(){heading.classList.remove('settings-wink');},600);}});
      var choices=el('div',card,'settings-choices'),sort=button(choices,'',function(){prefs.sort=sorts[(sorts.indexOf(prefs.sort)+1)%sorts.length];apply(options.sortChange);}),mode=button(choices,'',function(){prefs.mode=prefs.mode==='manual'?'recent':'manual';apply();});
      var phoneBox=el('div',card,'settings-phone');
      if(root.WebAssembly&&root.Worker&&root.crypto&&root.crypto.getRandomValues&&root.KickTVPhoneLink&&root.qrcode)button(choices,cs?'Správa z telefonu · QR':'Manage on phone · QR',function(){
        if(stopPhone)stopPhone();
        stopPhone=root.KickTVPhoneLink.open(phoneBox,{
          language:options.language,
          channels:function(){return prefs.channels.slice();},
          change:function(action,name){
            var i=prefs.channels.indexOf(name),before=prefs.channels.slice();
            if(action==='add'&&i<0){if(prefs.channels.length>=50)return 409;prefs.channels.push(name);}
            else if(action==='remove'&&i>=0)prefs.channels.splice(i,1);
            else return 200;
            if(!save()){prefs.channels=before;return 500;}
            options.change();drawList();return 200;
          }
        });
      });
      el('h3',card,'',t.manual);
      var search=el('input',card,'focusable');search.type='text';search.placeholder=t.find;search.setAttribute('aria-label',t.find);search.setAttribute('data-tv-input','');search.readOnly=true;
      search.addEventListener('blur',function(){search.readOnly=true;});
      var message=el('p',card,'settings-message');message.setAttribute('role','status');
      var results=el('div',card,'settings-results'),list=el('div',card,'settings-list');
      function labels(){sort.textContent=(cs?'Řazení v procházení':'Browse order')+': '+sortNames[sorts.indexOf(prefs.sort)];mode.textContent=t.mode+': '+t[prefs.mode];}
      function apply(change){message.textContent=save()?'':t.saveError;labels();(change||options.change)();}
      function drawList(){
        var active=list.contains(document.activeElement)?document.activeElement.textContent:null;
        list.textContent='';if(!prefs.channels.length)el('p',list,'settings-message',t.empty);
        var next=null;
        prefs.channels.forEach(function(name,i){var remove=button(list,'×  '+name,function(){prefs.channels.splice(i,1);apply();drawList();(list.querySelectorAll('button')[Math.min(i,prefs.channels.length-1)]||search).focus();});remove.setAttribute('aria-label',t.remove+' '+name);if(remove.textContent===active)next=remove;});
        if(active)(next||search).focus();
      }
      search.addEventListener('input',function(){
        var id=++sequence,q=search.value.trim().slice(0,100);clearTimeout(timer);if(xhr)xhr.abort();results.textContent='';message.textContent='';if(q.length<2)return;message.textContent=t.loading;
        timer=setTimeout(function(){
          xhr=new XMLHttpRequest();xhr.open('GET','https://www.kickstats.com/api/search?query='+encodeURIComponent(q),true);xhr.timeout=6500;
          function failed(){if(id===sequence)message.textContent=t.failed;}
          xhr.onload=function(){
            if(id!==sequence)return;if(xhr.status<200||xhr.status>=300){failed();return;}
            try{
              var seen=Object.create(null);
              (JSON.parse(xhr.responseText).channels||[]).forEach(function(item){
                var name=item&&slug(item.slug);if(!name||seen[name]||prefs.channels.indexOf(name)>=0||results.children.length>=6)return;seen[name]=true;
                button(results,'+  '+(item.username||name),function(){if(prefs.channels.length>=50){message.textContent=t.limit;return;}if(prefs.channels.indexOf(name)<0)prefs.channels.push(name);apply();drawList();search.value='';search.focus();results.textContent='';});
              });message.textContent=results.children.length?'':t.none;
            }catch(ignore){failed();}
          };
          xhr.onerror=xhr.ontimeout=failed;try{xhr.send();}catch(ignore){failed();}
        },300);
      });
      labels();drawList();sort.focus();
    }
    gear.setAttribute('aria-label',t.title);gear.title=t.title;gear.onclick=open;
    return {close:close};
  }
  root.KickTVSettings={prefs:prefs,record:record,compare:compare,install:install};
})(window);
