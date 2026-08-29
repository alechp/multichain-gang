/* SOLANA//SCOPE persistent navigation and universal Link Veil. */
(function globalChrome(scope){
  'use strict';

  if(!scope?.Store||!scope?.Router||!scope?.Overlay)return;
  const header=document.querySelector('.slotbar');
  const inner=header?.querySelector('.slotbar-inner');
  const home=document.getElementById('scopeHome');
  const skip=document.getElementById('scopeSkip');
  const rootMain=document.getElementById('scopeRootMain');
  const chapterNav=header?.querySelector('.chapter-subnav');
  if(!header||!inner||!home||!rootMain)return;

  const editable=target=>!!target?.closest?.('input,textarea,select,[contenteditable="true"],[role="combobox"],.cm-editor,.monaco-editor');
  const compatible=matchMedia('(pointer:fine) and (hover:hover)');
  const canonical=scope.Store.create('scope.linkVeil',{version:1,defaultValue:{v:1,enabled:false},validate:value=>value?.v===1&&typeof value.enabled==='boolean'});
  const legacy=scope.Store.create('chain.linkVeil',{version:1,defaultValue:{v:1,enabled:false},validate:value=>value?.v===1&&typeof value.enabled==='boolean'});
  try{
    if(localStorage.getItem(canonical.key)===null){
      const raw=localStorage.getItem(legacy.key);
      if(raw!==null){
        const value=JSON.parse(raw);
        if(value?.v===1&&typeof value.enabled==='boolean')canonical.set({v:1,enabled:value.enabled});
      }
    }
  }catch(error){}

  const controls=new Set();
  const listeners=new Set();
  let enabled=!!canonical.get().enabled;
  let held=false;
  let activeMain=rootMain;
  let routeContext=null;

  const live=document.createElement('p');
  live.className='sr-only';live.id='scopeVeilStatus';live.setAttribute('role','status');live.setAttribute('aria-live','polite');
  document.body.append(live);

  function snapshot(reason='sync'){
    return Object.freeze({enabled,controlHeld:held,effective:enabled&&compatible.matches,compatible:compatible.matches,reason});
  }
  function syncControl(button){
    if(!(button instanceof HTMLButtonElement))return;
    const state=snapshot();
    const label=button.querySelector('span');
    button.setAttribute('aria-pressed',enabled?'true':'false');
    button.disabled=!state.compatible;
    button.setAttribute('aria-label',state.compatible
      ? `${enabled?'Disable':'Enable'} Link Veil for definitions and supported routes${enabled?'; hold Control while hovering to reveal':''}`
      : 'Link Veil requires a keyboard and hover-capable pointer; links are visible');
    if(label)label.textContent=enabled?'LINK VEIL · HOLD CTRL':'LINKS VISIBLE';
    button.dataset.linkVeilControl='';
  }
  function emit(reason='sync'){
    const state=snapshot(reason);
    controls.forEach(syncControl);
    listeners.forEach(listener=>{try{listener(state)}catch(error){setTimeout(()=>{throw error})}});
    document.dispatchEvent(new CustomEvent('scope:link-veil-change',{detail:state}));
  }
  function set(value,{announce=true}={}){
    const next=!!value;
    if(next===enabled){emit('sync');return enabled;}
    enabled=next;held=false;canonical.set({v:1,enabled});
    if(announce)live.textContent=enabled
      ? 'Link Veil enabled. Hold Control while hovering to reveal definitions and supported routes.'
      : 'Link Veil disabled. Links and definitions are visible.';
    emit('toggle');return enabled;
  }
  function toggle(){return set(!enabled)}
  function clearHeld(reason='release',force=false){
    if(!held&&!force)return;
    held=false;emit(reason);
  }
  function registerControl(button){
    if(!(button instanceof HTMLButtonElement))return ()=>{};
    controls.add(button);syncControl(button);
    if(!button.dataset.linkVeilBound){
      button.dataset.linkVeilBound='true';
      button.addEventListener('click',toggle);
    }
    return ()=>controls.delete(button);
  }
  function subscribe(listener){
    if(typeof listener!=='function')return ()=>{};
    listeners.add(listener);listener(snapshot());return ()=>listeners.delete(listener);
  }
  const LinkVeil=Object.freeze({
    toggle,set,subscribe,registerControl,
    canPointerPreview:()=>!(enabled&&compatible.matches)||held,
    get enabled(){return enabled},
    get controlHeld(){return held},
    get effective(){return enabled&&compatible.matches},
    get compatible(){return compatible.matches}
  });
  scope.LinkVeil=LinkVeil;
  document.dispatchEvent(new CustomEvent('scope:link-veil-ready'));

  addEventListener('keydown',event=>{
    if(event.key!=='Control'||event.repeat||event.metaKey||event.altKey||event.shiftKey||editable(event.target)||!LinkVeil.effective)return;
    held=true;emit('hold');
  },{capture:true});
  addEventListener('keyup',event=>{if(event.key==='Control')clearHeld('release')},{capture:true});
  addEventListener('blur',()=>clearHeld('blur',true));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearHeld('hidden',true)});
  compatible.addEventListener?.('change',()=>{held=false;emit('capability')});

  const chains=document.createElement('div');chains.className='chain-subnav';
  const chainsButton=document.createElement('button');
  chainsButton.type='button';chainsButton.className='chain-launch';chainsButton.textContent='CHAINS';
  chainsButton.setAttribute('aria-haspopup','true');chainsButton.setAttribute('aria-expanded','false');chainsButton.setAttribute('aria-controls','chainSubnavMenu');chainsButton.setAttribute('aria-label','Open the Chains sub-navigation');
  const chainsMenu=document.createElement('nav');
  chainsMenu.className='chain-subnav-menu';chainsMenu.id='chainSubnavMenu';chainsMenu.hidden=true;chainsMenu.setAttribute('aria-label','Chains destinations');
  const chainIndex=document.createElement('a');chainIndex.href='#/chains';chainIndex.dataset.chainDestination='directory';chainIndex.append('CHAIN INDEX');
  const chainIndexHint=document.createElement('span');chainIndexHint.textContent='Articles and system reading paths';chainIndex.append(chainIndexHint);
  const toolsIndex=document.createElement('a');toolsIndex.href='#/tools';toolsIndex.dataset.chainDestination='tools';toolsIndex.append('TOOL LANDSCAPES');
  const toolsHint=document.createElement('span');toolsHint.textContent='DEXes, launchpads, analytics, yield, and infrastructure';toolsIndex.append(toolsHint);
  chainsMenu.append(chainIndex,toolsIndex);chains.append(chainsButton,chainsMenu);inner.append(chains);

  const rootVeil=document.createElement('button');
  rootVeil.type='button';rootVeil.className='scope-veil-toggle';rootVeil.id='globalVeil';
  const rootVeilLabel=document.createElement('span');rootVeilLabel.textContent='LINKS VISIBLE';
  const rootVeilKey=document.createElement('kbd');rootVeilKey.textContent='CTRL';rootVeil.append(rootVeilLabel,rootVeilKey);
  inner.append(rootVeil);registerControl(rootVeil);

  const closeChains=({focus=false}={})=>{
    chainsMenu.hidden=true;chainsButton.setAttribute('aria-expanded','false');
    if(focus)chainsButton.focus({preventScroll:true});
  };
  const openChains=()=>{
    if(!document.documentElement.hasAttribute('data-scope-unlocked')){document.getElementById('scopeAccessCode')?.focus();return;}
    const open=chainsMenu.hidden;chainsMenu.hidden=!open;chainsButton.setAttribute('aria-expanded',open?'true':'false');
    if(open)requestAnimationFrame(()=>chainIndex.focus({preventScroll:true}));
  };
  chainsButton.addEventListener('click',openChains);
  chainsMenu.addEventListener('click',event=>{if(event.target.closest('a'))closeChains()});
  addEventListener('pointerdown',event=>{if(!chainsMenu.hidden&&!chains.contains(event.target))closeChains()},{capture:true});
  addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!chainsMenu.hidden){event.preventDefault();event.stopImmediatePropagation();closeChains({focus:true});}
  },{capture:true});

  function measure(){
    const height=Math.max(1,Math.ceil(header.getBoundingClientRect().height));
    document.documentElement.style.setProperty('--scope-global-h',height+'px');
    return height;
  }
  let resizeFrame=0;
  const queueMeasure=()=>{if(!resizeFrame)resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;measure()})};
  if('ResizeObserver' in window)new ResizeObserver(queueMeasure).observe(header);
  addEventListener('resize',queueMeasure,{passive:true});
  document.fonts?.ready?.then(queueMeasure).catch(()=>{});

  function recognizedRoute(){return scope.Router.parse(location.hash)}
  function syncActiveNavigation(){
    const route=recognizedRoute();
    if(route&&['chain-directory','chain','tools-directory','tools-chain'].includes(route.type))chainsButton.setAttribute('aria-current','page');
    else chainsButton.removeAttribute('aria-current');
    chapterNav?.querySelectorAll('a').forEach(link=>{
      if(!route&&link.hash===location.hash)link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
  }
  function syncVisibleControl(){
    const routed=!!routeContext||!!recognizedRoute();
    rootVeil.hidden=routed;rootVeil.tabIndex=routed?-1:0;
    syncActiveNavigation();
  }
  function setActiveMain(element){if(element instanceof HTMLElement){activeMain=element;if(!element.hasAttribute('tabindex'))element.tabIndex=-1}return activeMain}
  function setRouteContext(context){
    if(!context||!['chain','tools','entity'].includes(context.family))return false;
    routeContext={...context};document.body.dataset.routeChrome=context.family;
    if(context.main instanceof HTMLElement)setActiveMain(context.main);
    clearHeld('route',true);closeChains();syncVisibleControl();queueMeasure();return true;
  }
  function clearRouteContext(family){
    if(family&&routeContext?.family!==family)return false;
    routeContext=null;delete document.body.dataset.routeChrome;activeMain=rootMain;
    clearHeld('route',true);syncVisibleControl();return true;
  }
  function landChapter(hash){
    const target=document.querySelector(hash);if(!target)return;
    target.tabIndex=-1;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      target.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
      target.focus({preventScroll:true});
    }));
  }
  home.addEventListener('click',()=>{
    closeChains();
    if(location.hash){location.hash='';return;}
    rootMain.focus({preventScroll:true});scrollTo({top:0,behavior:'auto'});
  });
  chapterNav?.addEventListener('click',event=>{
    const link=event.target.closest('a[href^="#ch"]');if(!link)return;
    event.preventDefault();closeChains();
    const hash=link.hash;
    if(location.hash===hash)landChapter(hash);
    else{location.hash=hash;setTimeout(()=>landChapter(hash),0)}
  });
  skip?.addEventListener('click',event=>{
    event.preventDefault();
    const target=routeContext?.main instanceof HTMLElement?routeContext.main:activeMain;
    target?.focus?.({preventScroll:false});
  });
  addEventListener('hashchange',()=>{
    closeChains();
    if(!recognizedRoute())clearRouteContext();
    else syncVisibleControl();
  });
  addEventListener('popstate',()=>{closeChains();syncVisibleControl()});

  const api=Object.freeze({
    setRouteContext,clearRouteContext,setActiveMain,closeChains,
    get height(){return Math.ceil(header.getBoundingClientRect().height)},
    get routeContext(){return routeContext?{...routeContext}:null}
  });
  scope.GlobalChrome=api;
  document.dispatchEvent(new CustomEvent('scope:global-chrome-ready'));
  syncVisibleControl();queueMeasure();
})(window.SCOPE=window.SCOPE||{});
