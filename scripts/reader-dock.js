(function readerDock(scope){
  'use strict';
  const mount=document.getElementById('playbarMount'),header=document.querySelector('.slotbar');
  if(!mount||!header||!scope?.Store)return;
  const store=scope.Store.create('playbar.dock',{version:1,defaultValue:{v:1,position:'bottom'},validate:value=>value&&(value.position==='top'||value.position==='bottom')});
  let position=store.get().position,button;
  const editable=target=>!!target?.closest?.('input,textarea,select,[contenteditable="true"],[role="combobox"]');
  const ownsArrowKeys=target=>!!target?.closest?.('[role="grid"],[role="listbox"],[role="tablist"],[role="slider"],[role="spinbutton"],.tcell,.chip');
  function readerEngaged(){const bar=mount.querySelector('.p-b');return !!(bar?.getClientRects().length&&bar.dataset.engaged==='true'&&scope.Playbar?.state.engaged)}
  function handleReaderKey(event){
    if((event.key!=='ArrowLeft'&&event.key!=='ArrowRight')||event.defaultPrevented||event.isComposing)return;
    if(event.metaKey||event.ctrlKey||event.altKey||event.shiftKey||editable(event.target)||ownsArrowKeys(event.target))return;
    if(!document.documentElement.hasAttribute('data-scope-unlocked')||!readerEngaged()||scope.Overlay?.top())return;
    event.preventDefault();event.stopImmediatePropagation();scope.Playbar.step(event.key==='ArrowLeft'?-1:1);
  }
  function offset(){mount.style.setProperty('--reader-top',Math.ceil(header.getBoundingClientRect().bottom+10)+'px')}
  function render(){
    mount.dataset.dock=position;offset();
    if(!button)return;
    const destination=position==='top'?'bottom':'top';
    button.textContent=destination==='top'?'↑':'↓';
    button.setAttribute('aria-label','Pin reading bar to '+destination);
    button.title='PIN '+destination.toUpperCase();
  }
  function set(next){if(next!=='top'&&next!=='bottom')return false;position=next;store.set({v:1,position});render();return true}
  function install(){
    const bar=mount.querySelector('.p-b');if(!bar||bar.querySelector('.p-pin'))return false;
    const previous=bar.querySelector('.p-v'),next=bar.querySelector('.p-n');
    previous?.setAttribute('aria-keyshortcuts','ArrowLeft');next?.setAttribute('aria-keyshortcuts','ArrowRight');
    if(previous)previous.title='PREVIOUS CUE · ←';if(next)next.title='NEXT CUE · →';
    button=document.createElement('button');button.type='button';button.className='p-pin';
    button.addEventListener('click',()=>set(position==='top'?'bottom':'top'));
    bar.appendChild(button);render();return true;
  }
  if(!install())new MutationObserver((records,observer)=>{if(install())observer.disconnect()}).observe(mount,{childList:true,subtree:true});
  document.addEventListener('keydown',handleReaderKey,true);
  addEventListener('resize',offset,{passive:true});if(typeof ResizeObserver==='function')new ResizeObserver(offset).observe(header);render();
  scope.ReaderDock=Object.freeze({set,get state(){return position}});
})(window.SCOPE);
