/* Anonymous discovery via Kick's website endpoints. No account credentials.
 * Shelf navigation inspired by janrydzewski/kick-tv-2.0; implementation kept
 * separate from playback, account authentication and the realtime chat client.
 */
(function(root){
  'use strict';
  root.KickTVBrowse={install:function(options){
    var cs=options.language==='cs',actions=document.getElementById('browseActions'),items=document.getElementById('browseItems'),state=document.getElementById('browseState'),title=document.getElementById('browseTitle');
    var request=null,sequence=0,mode='',category=null,imageQueue=[],imageActive=0,loadNext=null,scrollTimer=null,languageIndex=0;
    var home=document.getElementById('home');
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
      {code:'ru',cs:'Ruština',en:'Russian'}
    ];
    try{var savedLanguage=localStorage.getItem('kicktv.browseLanguage'),savedIndex=-1;languages.forEach(function(item,index){if(item.code===savedLanguage)savedIndex=index;});languageIndex=savedIndex>=0?savedIndex:(cs?0:1);}catch(ignoreLanguage){languageIndex=cs?0:1;}
    function image(value){if(value&&typeof value==='object'){var small=String(value.srcset||'').split(',').map(function(item){return item.trim().split(/\s+/);}).filter(function(item){return /^\d+w$/.test(item[1]||'');});small.sort(function(a,b){return parseInt(a[1],10)-parseInt(b[1],10);});value=small.length?small[0][0]:value.src||value.url||'';}return /^https:\/\//i.test(String(value||''))?value:'';}
    function pump(){while(imageActive<2&&imageQueue.length){var job=imageQueue.shift();if(job.sequence!==sequence)continue;imageActive++;(function(task){var done=false,timer=setTimeout(finish,7000);function finish(){if(done)return;done=true;clearTimeout(timer);imageActive--;pump();}task.image.onload=finish;task.image.onerror=function(){this.style.display='none';finish();};task.image.src=task.source;})(job);}}
    function button(text,callback,parent){var b=document.createElement('button');b.type='button';b.className='focusable browse-button';b.textContent=text;b.onclick=callback;parent.appendChild(b);return b;}
    function show(kind,cat){
      mode=kind;category=cat||null;var id=++sequence;if(request)request.abort();imageQueue=[];loadNext=null;clearTimeout(scrollTimer);items.innerHTML='';state.textContent=labels.loading;
      title.textContent=category?category.name:kind==='categories'?labels.categories:labels.live;
      for(var a=0;a<actions.children.length;a++)actions.children[a].setAttribute('aria-pressed',String((a===1)===(kind==='categories')||a===2));
      languageButton.textContent=labels.language+': '+(cs?languages[languageIndex].cs:languages[languageIndex].en);
      var url=kind==='categories'?'https://kick.com/api/v1/categories/top?limit=24':'https://kick.com/stream/livestreams/'+languages[languageIndex].code+'?limit=24&sort=featured'+(cat?'&subcategory='+encodeURIComponent(cat.slug):'');
      var xhr=new XMLHttpRequest();request=xhr;xhr.open('GET',url,true);xhr.timeout=12000;xhr.setRequestHeader('Accept','application/json');
      function fail(){if(id!==sequence)return;state.textContent=labels.failed;items.innerHTML='';button(labels.retry,function(){show(kind,cat);},items);}
      xhr.onload=function(){if(id!==sequence)return;if(xhr.status<200||xhr.status>=300){fail();return;}try{
        var data=JSON.parse(xhr.responseText),list=Array.isArray(data)?data:data.data;if(!Array.isArray(list))throw new Error('Invalid listing');
        state.textContent=list.length?'':labels.empty;
        var visible=0;
        function renderMore(){if(id!==sequence)return;
        list.slice(visible,visible+8).forEach(function(entry){
          var user=entry.channel||entry.broadcaster_user||{},slug=kind==='categories'?entry.slug:user.slug||entry.slug||user.username;
          if(!/^[a-z0-9_-]{1,100}$/i.test(slug||''))return;
          var name=kind==='categories'?entry.name:user.user&&user.user.username||user.username||slug;
          var b=button('',function(){if(kind==='categories')show('live',{slug:slug,name:name});else options.open(slug);},items);b.className+=' browse-tile';
          var source=image(kind==='categories'?(entry.banner||entry.thumbnail||entry.image):(entry.thumbnail||entry.thumbnail_url));
          if(source){var img=document.createElement('img');img.alt='';b.appendChild(img);imageQueue.push({image:img,source:source,sequence:id});}
          var heading=document.createElement('strong');heading.textContent=name;b.appendChild(heading);
          var detail=document.createElement('small');detail.textContent=kind==='categories'?'':String(Number(entry.viewer_count)||0)+' '+labels.viewers+(entry.session_title?' · '+entry.session_title:'');b.appendChild(detail);
        });visible+=8;loadNext=visible<list.length?renderMore:null;setTimeout(pump,80);}
        renderMore();
      }catch(error){fail();}};xhr.onerror=fail;xhr.ontimeout=fail;try{xhr.send();}catch(error){fail();}
    }
    title.textContent=labels.title;
    button(labels.live,function(){show('live');},actions);
    button(labels.categories,function(){show('categories');},actions);
    var languageButton=button('',function(){languageIndex=(languageIndex+1)%languages.length;try{localStorage.setItem('kicktv.browseLanguage',languages[languageIndex].code);}catch(ignoreSave){}show(mode||'live',category);},actions);
    show('live');
    return {back:function(){if(category){show('categories');actions.lastChild.focus();return true;}return false;}};
  }};
})(window);
