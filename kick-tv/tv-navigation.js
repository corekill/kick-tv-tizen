/* Directional focus and explicit TV IME activation. ES5. */
(function(root){
  'use strict';
  root.KickTVNavigation={install:function(options){
    var input=document.getElementById('channel'),home=document.getElementById('home');
    input.readOnly=true;
    input.addEventListener('blur',function(){input.readOnly=true;});
    function consume(e){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();}
    function move(code){
      var nodes=home.querySelectorAll('.focusable'),active=document.activeElement,r=active&&active.getBoundingClientRect(),best=null,score=Infinity,i;
      if(!r)return;
      var x=(r.left+r.right)/2,y=(r.top+r.bottom)/2,horizontal=code===37||code===39;
      for(i=0;i<nodes.length;i++){
        var node=nodes[i];if(node===active||!node.offsetWidth||!node.offsetHeight||node.disabled)continue;
        var t=node.getBoundingClientRect(),dx=(t.left+t.right)/2-x,dy=(t.top+t.bottom)/2-y;
        var primary=code===37?-dx:code===39?dx:code===38?-dy:dy;
        if(primary<3)continue;
        var perpendicular=Math.abs(horizontal?dy:dx),beam=horizontal?(y>=t.top-4&&y<=t.bottom+4):(x>=t.left-4&&x<=t.right+4);
        var rank=(beam?0:100000)+primary+perpendicular*2;
        if(rank<score){score=rank;best=node;}
      }
      if(best){best.focus();var rect=best.getBoundingClientRect(),box=home.getBoundingClientRect();if(rect.bottom>box.bottom-30)home.scrollTop+=rect.bottom-box.bottom+40;else if(rect.top<box.top+20)home.scrollTop-=box.top-rect.top+30;}
    }
    root.addEventListener('keydown',function(e){
      if(e.keyCode===13&&root.KickTVOKHeld){consume(e);return;}
      if(options.playing()||home.classList.contains('hidden')||document.querySelector('.account-modal'))return;
      var code=e.keyCode;
      if(document.activeElement===input&&code===13&&input.readOnly){consume(e);input.blur();input.readOnly=false;input.focus();return;}
      if(code===13&&document.activeElement&&document.activeElement.tagName==='BUTTON'){
        var target=document.activeElement;root.KickTVOKHeld=true;consume(e);target.click();return;
      }
      if(code>=37&&code<=40){
        if(document.activeElement===input&&!input.readOnly&&(code===37||code===39))return;
        consume(e);move(code);
      }
    },true);
    root.addEventListener('keyup',function(e){if(e.keyCode===13&&root.KickTVOKHeld){root.KickTVOKHeld=false;consume(e);}},true);
    root.addEventListener('blur',function(){root.KickTVOKHeld=false;});
  }};
})(window);
