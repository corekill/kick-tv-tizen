/* Anonymous discovery via Kick's website endpoints. No account credentials.
 * Shelf navigation inspired by janrydzewski/kick-tv-2.0; implementation kept
 * separate from playback, account authentication and the realtime chat client.
 */
(function(root){
  'use strict';
  function cards(list,categories){
    var out=[];
    list.forEach(function(entry,position){
      var user=entry.channel||entry.broadcaster_user||{},slug=categories?entry.slug:user.slug||entry.slug||user.username;
      if(!/^[a-z0-9_-]{1,100}$/i.test(slug||''))return;
      out.push({entry:entry,slug:slug,name:categories?entry.name:(user.user&&user.user.username||user.username||slug),
        position:position,viewers:Number(entry.viewer_count)||0});
    });
    return out;
  }
  root.KickTVBrowse={cards:cards,install:function(options){
    var cs=options.language==='cs',actions=document.getElementById('browseActions'),items=document.getElementById('browseItems'),state=document.getElementById('browseState'),title=document.getElementById('browseTitle');
    var request=null,sequence=0,mode='',category=null,imageQueue=[],imageActive=0,loadNext=null,scrollTimer=null,languageIndex=0;
    var home=document.getElementById('home'),followerCache=Object.create(null);
    function nearEnd(){clearTimeout(scrollTimer);scrollTimer=setTimeout(function(){if(!loadNext||home.classList.contains('hidden'))return;var cards=items.querySelectorAll('.browse-tile'),last=cards[cards.length-1],active=document.activeElement,index=Array.prototype.indexOf.call(cards,active);if(last&&(index>=cards.length-4||home.scrollTop>0&&last.getBoundingClientRect().bottom<home.getBoundingClientRect().bottom+150))loadNext();},80);}
    home.addEventListener('scroll',nearEnd);
    items.addEventListener('focus',nearEnd,true);
    var labels=cs?{title:'Procházet Kick',live:'Živě',categories:'Kategorie',language:'Jazyk',loading:'Načítám…',empty:'Teď tu nic není.',failed:'Procházení se nepodařilo načíst. Zkus to znovu.',viewers:'diváků',retry:'Zkusit znovu'}:{title:'Browse Kick',live:'Live now',categories:'Categories',language:'Language',loading:'Loading…',empty:'Nothing here right now.',failed:'Could not load discovery. Please try again.',viewers:'viewers',retry:'Retry'};
    var languages=[
      {code:'cs',cs:'Čeština',en:'Czech'},
      {code:'en',cs:'Angličtina',en:'English'},
      {code:'sk',cs:'Slovenština',en:'Slovak'},
      {code:'pl',cs:'Polština',en:'Polish'},
      {code:'de',cs:'Němčina',en:'German'},
      {code:'es',cs:'Španělština',en:'Spanish'},
      {code:'fr',cs:'Francouzština',en:'French'},
      {code:'it',cs:'Italština',en:'Italian'},
      {code:'pt',cs:'Portugalština',en:'Portuguese'},
      {code:'ru',cs:'Ruština',en:'Russian'},
      {code:'tr',cs:'Turečtina',en:'Turkish'},
      {code:'ar',cs:'Arabština',en:'Arabic'},
      {code:'ja',cs:'Japonština',en:'Japanese'},
      {code:'ko',cs:'Korejština',en:'Korean'},
      {code:'zh',cs:'Čínština',en:'Chinese'},
      {code:'hi',cs:'Hindština',en:'Hindi'},
      {code:'id',cs:'Indonéština',en:'Indonesian'},
      {code:'th',cs:'Thajština',en:'Thai'},
      {code:'vi',cs:'Vietnamština',en:'Vietnamese'},
      {code:'uk',cs:'Ukrajinština',en:'Ukrainian'},
      {code:'nl',cs:'Nizozemština',en:'Dutch'},
      {code:'sv',cs:'Švédština',en:'Swedish'},
      {code:'fi',cs:'Finština',en:'Finnish'},
      {code:'no',cs:'Norština',en:'Norwegian'},
      {code:'da',cs:'Dánština',en:'Danish'},
      {code:'el',cs:'Řečtina',en:'Greek'},
      {code:'ro',cs:'Rumunština',en:'Romanian'},
      {code:'hu',cs:'Maďarština',en:'Hungarian'},
      {code:'bg',cs:'Bulharština',en:'Bulgarian'},
      {code:'sr',cs:'Srbština',en:'Serbian'},
      {code:'he',cs:'Hebrejština',en:'Hebrew'},
      {code:'fa',cs:'Perština',en:'Persian'},
      {code:'fil',cs:'Filipínština',en:'Filipino'}
    ];
    var turkish=options.language==='tr',defaultIndex=turkish?10:cs?0:1;
    var trLanguages={cs:'Çekçe',en:'İngilizce',sk:'Slovakça',pl:'Lehçe',de:'Almanca',es:'İspanyolca',fr:'Fransızca',it:'İtalyanca',pt:'Portekizce',ru:'Rusça',tr:'Türkçe',ar:'Arapça',ja:'Japonca',ko:'Korece',zh:'Çince',hi:'Hintçe',id:'Endonezce',th:'Tayca',vi:'Vietnamca',uk:'Ukraynaca',nl:'Felemenkçe',sv:'İsveççe',fi:'Fince',no:'Norveççe',da:'Danca',el:'Yunanca',ro:'Rumence',hu:'Macarca',bg:'Bulgarca',sr:'Sırpça',he:'İbranice',fa:'Farsça',fil:'Filipince'};
    if(turkish)labels={title:'Kick’e göz at',live:'Canlı yayınlar',categories:'Kategoriler',language:'Dil',loading:'Yükleniyor…',empty:'Şu anda burada bir şey yok.',failed:'Yayınlar yüklenemedi. Tekrar dene.',viewers:'izleyici',retry:'Tekrar dene'};
    try{var savedLanguage=localStorage.getItem('kicktv.browseLanguage'),savedIndex=-1;languages.forEach(function(item,index){if(item.code===savedLanguage)savedIndex=index;});languageIndex=savedIndex>=0?savedIndex:defaultIndex;}catch(ignoreLanguage){languageIndex=defaultIndex;}
    function image(value){if(value&&typeof value==='object'){var small=String(value.srcset||'').split(',').map(function(item){return item.trim().split(/\s+/);}).filter(function(item){return /^\d+w$/.test(item[1]||'');});small.sort(function(a,b){return parseInt(a[1],10)-parseInt(b[1],10);});value=small.length?small[0][0]:value.src||value.url||'';}return /^https:\/\//i.test(String(value||''))?value:'';}
    function pump(){while(imageActive<2&&imageQueue.length){var job=imageQueue.shift();if(job.sequence!==sequence)continue;imageActive++;(function(task){var done=false,timer=setTimeout(finish,7000);function finish(){if(done)return;done=true;clearTimeout(timer);imageActive--;pump();}task.image.onload=finish;task.image.onerror=function(){this.style.display='none';finish();};task.image.src=task.source;})(job);}}
    function button(text,callback,parent){var b=document.createElement('button');b.type='button';b.className='focusable browse-button';b.textContent=text;b.onclick=callback;parent.appendChild(b);return b;}
    function countFollowers(list,id,done){
      var next=0,active=0;
      function pumpCounts(){
        if(id!==sequence)return;
        while(active<4&&next<list.length){
          var tile=list[next++],cached=followerCache[tile.slug];
          if(cached&&Date.now()-cached.at<300000){tile.followers=cached.count;continue;}
          active++;load(tile);
        }
        if(!active&&next===list.length)done();
      }
      function load(tile){
        var xhr=new XMLHttpRequest(),settled=false;
        xhr.open('GET','https://kick.com/api/v2/channels/'+encodeURIComponent(tile.slug),true);
        xhr.timeout=5000;
        function finish(){
          if(settled)return;settled=true;active--;pumpCounts();
        }
        xhr.onload=function(){
          if(xhr.status===200)try{
            var d=JSON.parse(xhr.responseText),count=d.followers_count==null?d.follower_count:d.followers_count;
            if(count!=null&&isFinite(Number(count))){
              if(Object.keys(followerCache).length>=200)followerCache=Object.create(null);
              tile.followers=Number(count);followerCache[tile.slug]={count:tile.followers,at:Date.now()};
            }
          }catch(ignore){}
          finish();
        };
        xhr.onerror=xhr.ontimeout=finish;try{xhr.send();}catch(ignore){setTimeout(finish,0);}
      }
      pumpCounts();
    }
    function show(kind,cat){
      mode=kind;category=cat||null;var id=++sequence;if(request)request.abort();imageQueue=[];loadNext=null;clearTimeout(scrollTimer);items.innerHTML='';state.textContent=labels.loading;
      title.textContent=category?category.name:kind==='categories'?labels.categories:labels.live;
      for(var a=0;a<actions.children.length;a++)actions.children[a].setAttribute('aria-pressed',String((a===1)===(kind==='categories')||a===2));
      var selected=languages[languageIndex];
      languageButton.textContent=labels.language+': '+(turkish?trLanguages[selected.code]:cs?selected.cs:selected.en);
      var url=kind==='categories'?'https://kick.com/api/v1/categories/top?limit=24':'https://kick.com/stream/livestreams/'+languages[languageIndex].code+'?limit=24&sort=featured'+(cat?'&subcategory='+encodeURIComponent(cat.slug):'');
      var xhr=new XMLHttpRequest();request=xhr;xhr.open('GET',url,true);xhr.timeout=12000;xhr.setRequestHeader('Accept','application/json');
      function fail(){if(id!==sequence)return;state.textContent=labels.failed;items.innerHTML='';button(labels.retry,function(){show(kind,cat);},items);}
      xhr.onload=function(){if(id!==sequence)return;if(xhr.status<200||xhr.status>=300){fail();return;}try{
        var data=JSON.parse(xhr.responseText),list=Array.isArray(data)?data:data.data;if(!Array.isArray(list))throw new Error('Invalid listing');
        if(kind!=='categories'&&languageIndex>=10){var expected=languages[languageIndex];list=list.filter(function(entry){var lang=String(entry.language||'').toLowerCase();return lang===expected.code||lang===expected.en.toLowerCase();});}
        var categories=kind==='categories',sorted=cards(list,categories);
        function draw(){
        if(id!==sequence)return;
        if(!categories)sorted.sort(root.KickTVSettings.compare);
        state.textContent=sorted.length?'':labels.empty;
        var visible=0;
        function renderMore(){if(id!==sequence)return;
        sorted.slice(visible,visible+8).forEach(function(tile){
          var entry=tile.entry,slug=tile.slug,name=tile.name;
          var b=button('',function(){if(kind==='categories')show('live',{slug:slug,name:name});else options.open(slug);},items);b.className+=' browse-tile';
          var source=image(kind==='categories'?(entry.banner||entry.thumbnail||entry.image):(entry.thumbnail||entry.thumbnail_url));
          if(source){var img=document.createElement('img');img.alt='';b.appendChild(img);imageQueue.push({image:img,source:source,sequence:id});}
          var heading=document.createElement('strong');heading.textContent=name;b.appendChild(heading);
          var detail=document.createElement('small');detail.textContent=kind==='categories'?'':String(Number(entry.viewer_count)||0)+' '+labels.viewers+(entry.session_title?' · '+entry.session_title:'');b.appendChild(detail);
        });visible+=8;loadNext=visible<sorted.length?renderMore:null;setTimeout(pump,80);}
        renderMore();
        }
        if(!categories&&root.KickTVSettings.prefs.sort==='followers')countFollowers(sorted,id,draw);else draw();
      }catch(error){fail();}};xhr.onerror=fail;xhr.ontimeout=fail;try{xhr.send();}catch(error){fail();}
    }
    title.textContent=labels.title;
    button(labels.live,function(){show('live');},actions);
    button(labels.categories,function(){show('categories');},actions);
    var languageButton=button('',function(){languageIndex=(languageIndex+1)%languages.length;try{localStorage.setItem('kicktv.browseLanguage',languages[languageIndex].code);}catch(ignoreSave){}show(mode||'live',category);},actions);
    show('live');
    return {refreshSort:function(){if(mode==='live')show(mode,category);},back:function(){if(category){show('categories');actions.lastChild.focus();return true;}return false;}};
  }};
})(window);
