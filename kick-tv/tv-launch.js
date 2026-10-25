/* Samsung app-control links and foreground playback lifecycle. ES5 for Tizen 3. */
/* Based on @anyrobert's PR #7 and PR #9; shared to keep all TV builds consistent. */
var KickTVLaunch=(function(){
  'use strict';
  var reserved=/^(about|account|browse|categories|category|clips|community|dashboard|directory|discover|downloads|emotes|following|help|jobs|login|logout|moderator|moderation|privacy|search|settings|signup|subscriptions|terms|videos)$/i;
  function target(value,platforms,depth){
    if(typeof value!=='string'||value.length>8192||(depth||0)>3)return null;
    var text=value.replace(/^\s+|\s+$/g,''),match,platform,i,parsed,found;
    try{text=decodeURIComponent(text);}catch(ignoreDecode){return null;}
    match=/^https?:\/\/(?:www\.)?(kick\.com|twitch\.tv)\/@?([a-z0-9_][a-z0-9_-]{0,24})\/?(?:[?#][^\s]*)?$/i.exec(text);
    if(match){platform=match[1].toLowerCase()==='kick.com'?'kick':'twitch';if(platforms.indexOf(platform)>=0&&!reserved.test(match[2]))return{platform:platform,name:match[2].toLowerCase()};return null;}
    // Samsung remote launchers can wrap metaTag in a JSON data value.
    if(text.charAt(0)==='{'){try{parsed=JSON.parse(text);for(i in parsed)if(Object.prototype.hasOwnProperty.call(parsed,i)){found=target(parsed[i],platforms,(depth||0)+1);if(found)return found;}}catch(ignoreJSON){}}
    return null;
  }
  function requested(platforms){
    try{
      var request=tizen.application.getCurrentApplication().getRequestedAppControl(),control=request&&request.appControl,values=[],i,j,found;
      if(!control)return null;
      values.push(control.uri||'');
      for(i=0;i<(control.data||[]).length;i++)for(j=0;j<(control.data[i].value||[]).length;j++)values.push(control.data[i].value[j]);
      for(i=0;i<values.length;i++){found=target(values[i],platforms,0);if(found)return found;}
    }catch(ignoreControl){}
    return null;
  }
  function install(options){
    var resume=null,pending=null,timer=null,startup=null;
    function reconcile(){
      timer=null;if(document.hidden)return;
      var current=options.current(),next=pending;
      pending=null;
      if(!next&&current){resume=null;return;}
      next=next||resume;resume=null;
      if(!next)return;
      if(current&&current.name===next.name&&current.platform===next.platform)return;
      if(current)options.close();
      options.open(next);
    }
    function schedule(){clearTimeout(timer);if(!document.hidden)timer=setTimeout(reconcile,100);}
    function launch(){
      clearTimeout(startup);startup=null;
      var next=requested(options.platforms);
      if(!next)return;
      pending=next;resume=null;schedule();
    }
    document.addEventListener('visibilitychange',function(){
      if(document.hidden){clearTimeout(timer);timer=null;var current=options.current();if(current){resume=current;options.close();}return;}
      schedule();
    });
    window.addEventListener('appcontrol',launch);
    startup=setTimeout(launch,150);
  }
  return{target:target,install:install};
}());
