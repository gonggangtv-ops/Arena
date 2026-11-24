/* Arena Royale · music on the loading screen (Claude, 2026-11-24 · index only).
 * Owner 2026-11-24: "ใส่เพลงประกอบเกมตอนหน้าโหลด" with the track he sent, Slay the Old God (music/loading.mp3).
 * It plays while the first loading screen is up, when sound is on (AU.mode 0; "music off" and "silent" keep it quiet). The app's
 * WebView may start it at once; a browser usually waits for a gesture, so a small "🔊 แตะเพื่อเปิดเพลง" button appears on the card
 * and the first tap, click or key anywhere starts it (the same gesture wakes the game's own audio for the menu). The menu theme waits
 * while it is wanted; when the screen closes it fades out over 2.4 s as the menu theme comes in. If the file cannot play, the menu
 * theme is released at once. The short "preparing the arena" overlay at match start plays nothing. Nothing here can block loading. */
(()=>{
  'use strict';
  if(typeof AU==='undefined'||typeof document==='undefined')return;
  const screen=document.getElementById('loading');if(!screen||!screen.classList.contains('arena-load')||screen.classList.contains('hidden')||AU.mode!==0)return;
  // the file is loudness-matched to the other tracks (about -19 LUFS); .4 sits it a little above the menu theme's level in AU's mix
  const VOL=.4,EV=['pointerdown','pointerup','touchend','click','keydown'];
  const el=new Audio();el.loop=true;el.preload='auto';el.volume=0;el.src='music/loading.mp3';
  let want=true,done=false,fadeId=0,hint=null;
  window.ArenaLoadMusic={get playing(){return !el.paused&&!done},get wanted(){return want&&!done},el};
  // the menu theme waits while this one is wanted
  const _set=AU.setMusic;AU.setMusic=function(m){if(want&&!done&&m==='menu')m=null;return _set.call(this,m)};
  function fade(to,sec,then){const id=++fadeId,from=el.volume,t0=performance.now();
    const tick=()=>{if(id!==fadeId)return;const k=Math.min(1,(performance.now()-t0)/(sec*1000));try{el.volume=Math.max(0,Math.min(1,from+(to-from)*k))}catch(e){}
      if(k<1)requestAnimationFrame(tick);else if(then)then()};
    requestAnimationFrame(tick);setTimeout(()=>{if(id===fadeId&&then&&el.volume!==to){fadeId++;try{el.volume=to}catch(e){}then()}},sec*1000+600)}   // rAF sleeps in a hidden tab
  function showHint(){if(hint||done||!want)return;const card=screen.querySelector('.arena-load-card');if(!card)return;
    hint=document.createElement('button');hint.type='button';hint.className='arena-load-music';hint.textContent='🔊 แตะเพื่อเปิดเพลง';
    const at=document.getElementById('moonfallLoadCount');card.insertBefore(hint,at?at.nextSibling:null)}
  function hideHint(){if(hint){hint.remove();hint=null}}
  function release(){want=false;if(AU.ctx)try{AU.pickMusic()}catch(e){}}
  function play(){if(done||!want||!el.paused)return;let p;try{p=el.play()}catch(e){showHint();return}
    if(p&&p.then)p.then(()=>{if(done){el.pause();return}hideHint();fade(VOL,1.4)},()=>{if(el.paused)showHint()});else{hideHint();fade(VOL,1.4)}}
  function gesture(){if(done)return;if(want)try{AU.init()}catch(e){}play()}
  function stop(){if(done)return;done=true;mo.disconnect();for(const e of EV)window.removeEventListener(e,gesture,true);hideHint();
    const was=!el.paused;
    // the app may play without a gesture: wake the game's audio too, so the menu theme follows straight on
    if(want&&was&&!AU.ctx)try{AU.init()}catch(e){}
    want=false;if(AU.ctx)try{AU.pickMusic()}catch(e){}
    if(was)fade(0,2.4,()=>{el.pause();el.removeAttribute('src');el.load()});else{el.removeAttribute('src');el.load()}}
  el.addEventListener('error',()=>{if(done)return;hideHint();release()});
  const mo=new MutationObserver(()=>{if(screen.classList.contains('hidden')||screen.dataset.phase==='error')stop()});
  mo.observe(screen,{attributes:true,attributeFilter:['class','data-phase']});
  for(const e of EV)window.addEventListener(e,gesture,{capture:true,passive:true});
  play();
})();
