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
    return {mode:stored.mode==='manual'||stored.mode==='following'?stored.mode:'recent',sort:sorts.indexOf(stored.sort)>=0?stored.sort:'default',channels:channels,plays:plays};
  }
  var prefs=read();
  function followText(lang){
    return lang==='cs'?{title:'Sledované · experiment',connect:'Připojit přes telefon',disconnect:'Odpojit a smazat relaci',idle:'Propojení nastav přes telefon.',sync:'Načítám sledované…',ok:'Seznam je aktuální.',failed:'Kick seznam nevrátil. Zkus to později.',expired:'Relace Kicku vypršela. Připoj ji znovu.',storage:'Bezpečné úložiště relace není dostupné.'}:lang==='tr'?{title:'Takip edilenler · deneysel',connect:'Telefonla bağla',disconnect:'Bağlantıyı kes ve oturumu sil',idle:'Telefonla bağlantı kur.',sync:'Takip edilenler yükleniyor…',ok:'Liste güncel.',failed:'Kick listeyi döndürmedi.',expired:'Kick oturumunun süresi doldu. Yeniden bağlan.',storage:'Güvenli oturum deposu kullanılamıyor.'}:{title:'Following · experimental',connect:'Connect from phone',disconnect:'Disconnect and delete session',idle:'Connect from your phone in Settings.',sync:'Loading followed channels…',ok:'List is up to date.',failed:'Kick did not return the list. Try again later.',expired:'Kick session expired. Connect again.',storage:'Secure session storage is unavailable.'};
  }
  function followingStatus(lang){var service=root.KickTVFollowing,t=followText(lang);return t[service?service.state():'idle'];}
  function save(){try{localStorage.setItem(key,JSON.stringify(prefs));return true;}catch(ignore){return false;}}
  function record(name){if(!slug(name))return;if(!prefs.plays[name]&&Object.keys(prefs.plays).length>=200)delete prefs.plays[Object.keys(prefs.plays)[0]];prefs.plays[name]=Math.min(999999,(prefs.plays[name]||0)+1);save();}
  function compare(a,b){
    var sort=prefs.sort;if(sort==='name')return a.name.localeCompare(b.name)||a.position-b.position;
    if(sort==='default')return a.position-b.position;
    var av=sort==='plays'?(prefs.plays[(a.slug||a.name).toLowerCase()]||0):a[sort],bv=sort==='plays'?(prefs.plays[(b.slug||b.name).toLowerCase()]||0):b[sort];
    return (typeof bv==='number'?bv:-1)-(typeof av==='number'?av:-1)||a.position-b.position;
  }
  function install(options){
    var cs=options.language==='cs',home=document.getElementById('home'),gear=document.getElementById('settingsButton'),panel=null,timer,xhr,sequence=0,stopPhone=null,stopWatching=null;
    var t=cs?{title:'Nastavení',close:'Hotovo',sort:'Řadit streamery',mode:'Na hlavní obrazovce',recent:'Naposledy sledované',manual:'Můj seznam',find:'Přidat kanál podle části jména…',empty:'Zatím tu nejsou žádné kanály.',none:'Žádné odpovídající kanály.',failed:'Vyhledávání se nezdařilo. Zkus to znovu.',loading:'Hledám…',limit:'Seznam pojme nejvýš 50 kanálů.',remove:'Odebrat',saveError:'Nastavení se nepodařilo uložit.'}:{title:'Settings',close:'Done',sort:'Sort streamers',mode:'Show on home',recent:'Recently watched',manual:'My list',find:'Add a channel by partial name…',empty:'No channels yet.',none:'No matching channels.',failed:'Search failed. Please try again.',loading:'Searching…',limit:'The list can hold up to 50 channels.',remove:'Remove',saveError:'Could not save settings.'};
    var sortNames=cs?['Původní pořadí','Počet diváků','Jméno A–Z','Počet sledujících na Kicku','Počet otevření na této TV']:['Original order','Viewer count','Name A–Z','Kick follower count','Times opened on this TV'];
    var order=cs?'Řazení v procházení':'Browse order',phone=cs?'Správa z telefonu · QR':'Manage on phone · QR';
    if(options.language==='tr'){
      t={title:'Ayarlar',close:'Bitti',mode:'Ana ekranda göster',recent:'Son izlenenler',manual:'Listem',find:'Kanal eklemek için adının bir kısmını yaz…',empty:'Listede henüz kanal yok.',none:'Eşleşen kanal bulunamadı.',failed:'Arama başarısız oldu. Tekrar dene.',loading:'Aranıyor…',limit:'Listeye en fazla 50 kanal eklenebilir.',remove:'Kaldır',saveError:'Ayarlar kaydedilemedi.'};
      sortNames=['Varsayılan sıra','İzleyici sayısı','Kanal adı (A–Z)','Kick takipçi sayısı','Bu TV’de açılma sayısı'];
      order='Yayın sıralaması';phone='Telefondan yönet · QR';
    }
    function el(tag,parent,cls,label){var node=document.createElement(tag);if(cls)node.className=cls;if(label)node.textContent=label;if(parent)parent.appendChild(node);return node;}
    function button(parent,label,action){var node=el('button',parent,'focusable',label);node.type='button';node.onclick=action;return node;}
    function close(){if(!panel)return false;sequence++;clearTimeout(timer);if(xhr)xhr.abort();if(stopPhone)stopPhone();if(stopWatching)stopWatching();stopPhone=stopWatching=null;panel.parentNode.removeChild(panel);panel=null;gear.focus();return true;}
    function open(){
      if(panel)return;
      panel=el('section',home,'settings-screen');panel.id='tvSettings';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',t.title);
      var card=el('div',panel,'settings-card'),header=el('header',card,'settings-header'),heading=el('h2',header,'',t.title);button(header,t.close,close);
      var taps=0,lastTap=0;
      heading.addEventListener('click',function(){var now=Date.now();taps=now-lastTap<550?taps+1:1;lastTap=now;if(taps===5){taps=0;heading.classList.add('settings-wink');setTimeout(function(){heading.classList.remove('settings-wink');},600);}});
      var service=root.KickTVFollowing,f=followText(options.language);
      var modes=['recent','manual','following'];
      var choices=el('div',card,'settings-choices'),sort=button(choices,'',function(){prefs.sort=sorts[(sorts.indexOf(prefs.sort)+1)%sorts.length];apply(options.sortChange);}),mode=button(choices,'',function(){prefs.mode=modes[(modes.indexOf(prefs.mode)+1)%modes.length];apply();if(prefs.mode==='following'&&service)service.sync();});
      var phoneBox=el('div',card,'settings-phone');
      var phoneAvailable=root.WebAssembly&&root.Worker&&root.crypto&&root.crypto.getRandomValues&&root.KickTVPhoneLink&&root.qrcode;
      function startPhone(){
        if(stopPhone)stopPhone();
        stopPhone=root.KickTVPhoneLink.open(phoneBox,{
          language:options.language,
          follow:service&&service.supported()?service.connect:null,
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
      }
      if(phoneAvailable)button(choices,phone,startPhone);
      if(service){
        el('h3',card,'',f.title);
        var followStatus=el('p',card,'settings-message');
        var followButtons=el('div',card,'settings-choices');
        button(followButtons,f.disconnect,function(){if(stopPhone)stopPhone();stopPhone=null;service.disconnect();});
        function updateFollowing(){
          var hint=cs?'Otevři Správa z telefonu · QR. Na mobilu rozbal Experimentální funkce.':options.language==='tr'?'Telefondan yönet · QR seçeneğini aç. Telefonda Deneysel özellikler bölümünü genişlet.':'Open Manage on phone · QR. On your phone, expand Experimental features.';
          followStatus.textContent=!service.supported()?f.storage:service.state()==='idle'&&!service.connected()?hint:followingStatus(options.language);
        }
        stopWatching=service.subscribe(updateFollowing);updateFollowing();
      }
      el('h3',card,'',t.manual);
      var search=el('input',card,'focusable');search.type='text';search.placeholder=t.find;search.setAttribute('aria-label',t.find);search.setAttribute('data-tv-input','');search.readOnly=true;
      search.addEventListener('blur',function(){search.readOnly=true;});
      var message=el('p',card,'settings-message');message.setAttribute('role','status');
      var results=el('div',card,'settings-results'),list=el('div',card,'settings-list');
      function labels(){sort.textContent=order+': '+sortNames[sorts.indexOf(prefs.sort)];mode.textContent=t.mode+': '+(prefs.mode==='following'?f.title:t[prefs.mode]);}
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
  root.KickTVSettings={prefs:prefs,record:record,compare:compare,install:install,followingLabel:function(lang){return followText(lang).title;},followingStatus:followingStatus};
})(window);
