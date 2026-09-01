/* Multichain Gang persistent navigation and universal Link Veil. */
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
  const hotkeys=Object.freeze({
    Control:Object.freeze({key:'Control',code:'ControlLeft',label:'Control',short:'CTRL',flag:'ctrlKey'}),
    Alt:Object.freeze({key:'Alt',code:'AltLeft',label:'Option / Alt',short:'ALT',flag:'altKey'}),
    Shift:Object.freeze({key:'Shift',code:'ShiftLeft',label:'Shift',short:'SHIFT',flag:'shiftKey'}),
    Meta:Object.freeze({key:'Meta',code:'MetaLeft',label:'Command / Meta',short:'⌘',flag:'metaKey'})
  });
  const validHotkey=value=>Object.hasOwn(hotkeys,value);
  const canonical=scope.Store.create('scope.linkVeil',{version:1,defaultValue:{v:1,enabled:false,hotkey:'Control'},validate:value=>value?.v===1&&typeof value.enabled==='boolean'&&(value.hotkey===undefined||validHotkey(value.hotkey))});
  const legacy=scope.Store.create('chain.linkVeil',{version:1,defaultValue:{v:1,enabled:false},validate:value=>value?.v===1&&typeof value.enabled==='boolean'});
  try{
    if(localStorage.getItem(canonical.key)===null){
      const raw=localStorage.getItem(legacy.key);
      if(raw!==null){
        const value=JSON.parse(raw);
        if(value?.v===1&&typeof value.enabled==='boolean')canonical.set({v:1,enabled:value.enabled,hotkey:'Control'});
      }
    }
  }catch(error){}

  const controls=new Set();
  const settingsButtons=new Set();
  const listeners=new Set();
  const preference=canonical.get();
  let enabled=!!preference.enabled;
  let hotkey=validHotkey(preference.hotkey)?preference.hotkey:'Control';
  let held=false;
  let activeMain=rootMain;
  let routeContext=null;
  let settingsDialog=null;

  const live=document.createElement('p');
  live.className='sr-only';live.id='scopeVeilStatus';live.setAttribute('role','status');live.setAttribute('aria-live','polite');
  document.body.append(live);

  function snapshot(reason='sync'){
    return Object.freeze({enabled,hotkey,hotkeyLabel:hotkeys[hotkey].short,controlHeld:held,effective:enabled&&compatible.matches,compatible:compatible.matches,reason});
  }
  function syncControl(button){
    if(!(button instanceof HTMLButtonElement))return;
    const state=snapshot();
    button.setAttribute('aria-pressed',enabled?'true':'false');
    button.disabled=!state.compatible;
    button.setAttribute('aria-label',state.compatible
      ? `${enabled?'Disable':'Enable'} Link Veil for definitions and supported routes${enabled?`; hold ${hotkeys[hotkey].label} while hovering to reveal`:''}`
      : 'Link Veil requires a keyboard and hover-capable pointer; links are visible');
    const label=button.querySelector('.scope-veil-label');if(label)label.textContent='VEIL';
    button.dataset.linkVeilControl='';
    settingsButtons.forEach(settings=>{
      settings.setAttribute('aria-label',`Configure Link Veil hotkey. Current hotkey: ${hotkeys[hotkey].label}`);
      const keycap=settings.querySelector('kbd');if(keycap)keycap.textContent=hotkeys[hotkey].short;
    });
    document.documentElement.style.setProperty('--scope-veil-key',`"${hotkeys[hotkey].short}"`);
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
    enabled=next;held=false;canonical.set({v:1,enabled,hotkey});
    if(announce)live.textContent=enabled
      ? `Link Veil enabled. Hold ${hotkeys[hotkey].label} while hovering to reveal definitions and supported routes.`
      : 'Link Veil disabled. Links and definitions are visible.';
    emit('toggle');return enabled;
  }
  function toggle(){return set(!enabled)}
  function setHotkey(value,{announce=true}={}){
    if(!validHotkey(value))return false;
    hotkey=value;held=false;canonical.set({v:1,enabled,hotkey});
    if(announce)live.textContent=`Link Veil reveal hotkey set to ${hotkeys[hotkey].label}.`;
    emit('hotkey');return true;
  }
  function clearHeld(reason='release',force=false){
    if(!held&&!force)return;
    held=false;emit(reason);
  }
  function registerControl(button){
    if(!(button instanceof HTMLButtonElement))return ()=>{};
    let cluster=button.closest('.scope-veil-cluster');
    if(!cluster){
      cluster=document.createElement('div');cluster.className='scope-veil-cluster';
      button.before(cluster);cluster.append(button);
    }
    button.classList.add('scope-veil-switch');
    if(!button.querySelector('.scope-veil-track')){
      const label=document.createElement('span');label.className='scope-veil-label';label.textContent='VEIL';
      const track=document.createElement('i');track.className='scope-veil-track';track.setAttribute('aria-hidden','true');
      button.replaceChildren(label,track);
    }
    let settings=cluster.querySelector('.scope-veil-settings-button');
    if(!settings){
      settings=document.createElement('button');settings.type='button';settings.className='scope-veil-settings-button';
      settings.setAttribute('aria-haspopup','dialog');settings.setAttribute('aria-controls','scopeVeilSettings');
      const keycap=document.createElement('kbd');keycap.textContent=hotkeys[hotkey].short;
      const tune=document.createElement('span');tune.textContent='TUNE';tune.setAttribute('aria-hidden','true');
      settings.append(keycap,tune);cluster.append(settings);
      settings.addEventListener('click',()=>openSettings(settings));settingsButtons.add(settings);
    }
    controls.add(button);syncControl(button);
    if(!button.dataset.linkVeilBound){
      button.dataset.linkVeilBound='true';
      button.addEventListener('click',toggle);
    }
    return ()=>{controls.delete(button);settingsButtons.delete(settings)};
  }
  function subscribe(listener){
    if(typeof listener!=='function')return ()=>{};
    listeners.add(listener);listener(snapshot());return ()=>listeners.delete(listener);
  }
  function element(tag,className='',text=''){
    const node=document.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;
  }
  function ensureSettingsDialog(){
    if(settingsDialog)return settingsDialog;
    const panel=element('section','scope-veil-dialog');panel.id='scopeVeilSettings';panel.hidden=true;panel.setAttribute('aria-labelledby','scopeVeilSettingsTitle');
    const form=element('form','scope-veil-form');
    const headerRow=element('header','scope-veil-dialog-head');
    const headingCopy=element('div');headingCopy.append(element('p','scope-veil-dialog-kicker','INPUT CHANNEL · LOCAL PREFERENCE'));
    const title=element('h2','scope-veil-dialog-title','LINK VEIL');title.id='scopeVeilSettingsTitle';headingCopy.append(title);
    const close=element('button','scope-veil-dialog-close','ESC ×');close.type='button';close.setAttribute('aria-label','Close Link Veil settings');headerRow.append(headingCopy,close);
    const intro=element('p','scope-veil-dialog-intro','Hide hover-only definitions and secondary route affordances until you hold the selected modifier. Focus, tap, and primary navigation always remain available.');
    const mode=element('label','scope-veil-mode');
    const enabledInput=document.createElement('input');enabledInput.type='checkbox';enabledInput.id='scopeVeilEnabled';
    const modeTrack=element('span','scope-veil-mode-track');modeTrack.setAttribute('aria-hidden','true');
    const modeCopy=element('span','scope-veil-mode-copy');modeCopy.append(element('b','','ENABLE LINK VEIL'),element('small','','Guard eligible hover previews on keyboard + pointer devices.'));
    mode.append(enabledInput,modeTrack,modeCopy);
    const fieldset=element('fieldset','scope-veil-hotkeys');const legend=element('legend','','REVEAL HOTKEY');fieldset.append(legend);
    Object.values(hotkeys).forEach((binding,index)=>{
      const option=element('label','scope-veil-hotkey');
      const input=document.createElement('input');input.type='radio';input.name='scopeVeilHotkey';input.value=binding.key;if(index===0)input.checked=true;
      const marker=element('i');marker.setAttribute('aria-hidden','true');
      const keycap=element('kbd','',binding.short);
      const copy=element('span');copy.append(element('b','',binding.label),element('small','',binding.key==='Control'?'Default · broad browser support':'Alternative modifier'));
      option.append(input,marker,keycap,copy);fieldset.append(option);
    });
    const test=element('div','scope-veil-test');test.append(element('span','','ACTIVE CHORD'),element('kbd','scope-veil-test-key',hotkeys[hotkey].short),element('p','','Enable Veil, hover an eligible term, then hold this key. Release it to conceal the preview.'));
    const compatibility=element('p','scope-veil-compatibility','Touch-only devices bypass the hover guard and keep links directly usable. This preference stays on this device and is never transmitted.');
    const actions=element('footer','scope-veil-dialog-actions');
    const cancel=element('button','scope-veil-cancel','CANCEL');cancel.type='button';
    const apply=element('button','scope-veil-apply','APPLY SETTINGS');apply.type='submit';actions.append(cancel,apply);
    const body=element('div','scope-veil-dialog-body');body.append(intro,mode,fieldset,test,compatibility);
    form.append(headerRow,body,actions);panel.append(form);document.body.append(panel);
    const closePanel=()=>scope.Overlay.close(panel,{reason:'button'});
    close.addEventListener('click',closePanel);cancel.addEventListener('click',closePanel);
    fieldset.addEventListener('change',event=>{if(event.target.matches('input[type="radio"]'))test.querySelector('kbd').textContent=hotkeys[event.target.value]?.short||hotkeys[hotkey].short});
    form.addEventListener('submit',event=>{
      event.preventDefault();
      const selected=form.elements.scopeVeilHotkey?.value;
      if(!validHotkey(selected))return;
      hotkey=selected;enabled=enabledInput.checked;held=false;canonical.set({v:1,enabled,hotkey});
      live.textContent=`Link Veil ${enabled?'enabled':'disabled'}. Reveal hotkey: ${hotkeys[hotkey].label}.`;
      emit('settings');scope.Overlay.close(panel,{reason:'apply'});
    });
    settingsDialog=Object.freeze({panel,form,enabledInput,test});return settingsDialog;
  }
  function openSettings(trigger){
    const ui=ensureSettingsDialog();ui.enabledInput.checked=enabled;
    ui.form.querySelectorAll('input[name="scopeVeilHotkey"]').forEach(input=>{input.checked=input.value===hotkey});
    ui.test.querySelector('kbd').textContent=hotkeys[hotkey].short;
    scope.Overlay.open({element:ui.panel,trigger,focusTarget:ui.form.querySelector(`input[value="${hotkey}"]`),modal:true,scrim:true,lockScroll:true,sheet:true,outsideClose:true});
    return true;
  }
  const LinkVeil=Object.freeze({
    toggle,set,setHotkey,subscribe,registerControl,openSettings,
    canPointerPreview:()=>!(enabled&&compatible.matches)||held,
    get enabled(){return enabled},
    get hotkey(){return hotkey},
    get hotkeyLabel(){return hotkeys[hotkey].short},
    get controlHeld(){return held},
    get effective(){return enabled&&compatible.matches},
    get compatible(){return compatible.matches}
  });
  scope.LinkVeil=LinkVeil;
  document.dispatchEvent(new CustomEvent('scope:link-veil-ready'));

  addEventListener('keydown',event=>{
    const binding=hotkeys[hotkey],otherFlags=['ctrlKey','altKey','shiftKey','metaKey'].filter(flag=>flag!==binding.flag);
    if((event.key!==binding.key&&event.code!==binding.code)||event.repeat||!event[binding.flag]||otherFlags.some(flag=>event[flag])||editable(event.target)||!LinkVeil.effective)return;
    held=true;emit('hold');
  },{capture:true});
  addEventListener('keyup',event=>{const binding=hotkeys[hotkey];if(event.key===binding.key||event.code===binding.code)clearHeld('release')},{capture:true});
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
  const rootVeilCluster=rootVeil.closest('.scope-veil-cluster');

  const closeChains=({focus=false}={})=>{
    chainsMenu.hidden=true;chainsButton.setAttribute('aria-expanded','false');
    if(focus)chainsButton.focus({preventScroll:true});
  };
  const positionChainsMenu=()=>{
    const trigger=chainsButton.getBoundingClientRect();
    const width=Math.min(280,innerWidth-24);
    const left=Math.max(12,Math.min(trigger.left,innerWidth-width-12));
    chainsMenu.style.setProperty('--scope-chains-x',left+'px');
  };
  const openChains=()=>{
    if(!document.documentElement.hasAttribute('data-scope-unlocked')){document.getElementById('scopeAccessCode')?.focus();return;}
    const open=chainsMenu.hidden;if(open)positionChainsMenu();chainsMenu.hidden=!open;chainsButton.setAttribute('aria-expanded',open?'true':'false');
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
    if(!chainsMenu.hidden)positionChainsMenu();
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
    if(rootVeilCluster)rootVeilCluster.hidden=routed;rootVeil.hidden=routed;rootVeil.tabIndex=routed?-1:0;
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
