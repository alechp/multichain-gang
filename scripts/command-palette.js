(function commandChannel(scope){
  'use strict';
  const dataNode=document.getElementById('chainData');
  if(!scope?.Overlay||!scope?.Router||!dataNode)return;
  let data;
  try{data=JSON.parse(dataNode.textContent)}catch(error){return}

  const channelColors={ch1:'var(--cyan)',ch2:'var(--amber)',ch3:'var(--red)',ch4:'var(--green)',ch5:'var(--violet)'};
  const sections=[
    {id:'top',title:'Scope overview',label:'START',target:'.hero',summary:'Opening trace, slot constants, and instrument orientation.'},
    {id:'ch1',title:'Network topology',label:'CH-01',target:'#ch1',summary:'Leaders, Turbine shreds, PoH, Tower BFT, and cluster structure.'},
    {id:'ch2',title:'Transaction flow',label:'CH-02',target:'#ch2',summary:'Wallet-to-leader signal path, account locks, and Sealevel execution.'},
    {id:'ch3',title:'MEV and ordering',label:'CH-03',target:'#ch3',summary:'Sandwiches, backruns, Jito bundles, and protection markets.'},
    {id:'ch4',title:'Latency edge',label:'CH-04',target:'#ch4',summary:'Network distance, private feeds, optimized clients, and colocation.'},
    {id:'ch5',title:'Cross-chain bench',label:'CH-05',target:'#ch5',summary:'Technique heat map, tool bench, and chain comparisons.'}
  ];
  const commands=[
    {id:'play',title:'Toggle autoplay',summary:'Start or pause the guided 26-cue read-through.',command:'toggle'},
    {id:'previous',title:'Previous focus',summary:'Move the playthrough back one authored focus.',command:'previous'},
    {id:'next',title:'Next focus',summary:'Move the playthrough forward one authored focus.',command:'next'}
  ];
  const records=[];
  sections.forEach(item=>records.push({...item,kind:'section',aliases:[item.label,'channel '+item.label.replace(/\D/g,'')]}));
  commands.forEach(item=>records.push({...item,kind:'command',aliases:[item.command,'transport']}));
  Object.entries(data.chainPages||{}).forEach(([id,item])=>records.push({
    id:'chain-'+id,title:item.name,summary:item.summary||'',kind:'chain-index',slug:item.slug,
    aliases:[id,item.short,item.slug,'chain index',item.name+' articles'],keywords:['chain hub','reading path',(item.groups||[]).map(group=>group.id).join(' ')]
  }));
  Object.entries(data.entities||{}).forEach(([id,item])=>records.push({
    id,title:item.name,summary:item.tagline||'',kind:'entity',entity:id,
    aliases:[id,...(item.chains||[])],keywords:[item.kind,...(item.chains||[]),(item.signals||[]).map(signal=>signal.k).join(' ')]
  }));
  Object.entries(data.terms||{}).forEach(([key,item])=>records.push({
    id:key,title:item.term,summary:item.def||item.purpose||'',kind:'glossary',term:key,entity:item.entity||'',
    aliases:item.aliases||[],keywords:[item.purpose||'']
  }));
  (data.cues||[]).forEach((item,index)=>records.push({
    id:item.id,title:item.title,summary:item.note||'',kind:'focus',cue:index,aliases:[item.ch,item.id]
  }));

  const fuse=typeof window.Fuse==='function'?new window.Fuse(records,{
    keys:[{name:'title',weight:.48},{name:'aliases',weight:.22},{name:'summary',weight:.18},{name:'keywords',weight:.12}],
    threshold:.36,distance:140,ignoreLocation:true,minMatchCharLength:2,includeScore:true
  }):null;
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const shortcut=/Mac|iPhone|iPad/.test(navigator.platform)?'⌘K':'CTRL K';

  const launcher=document.createElement('button');
  launcher.type='button';launcher.className='cmd-launch';launcher.setAttribute('aria-haspopup','dialog');launcher.innerHTML='<span class="cmd-launch-label">FIND</span><kbd>'+shortcut+'</kbd>';
  document.querySelector('.slotbar-inner')?.appendChild(launcher);

  const panel=document.createElement('section');
  panel.className='cmd-panel';panel.id='scopeCommand';panel.hidden=true;panel.setAttribute('aria-labelledby','cmdTitle');
  panel.innerHTML='<div class="cmd-shell"><header class="cmd-head"><div><p class="cmd-kicker">COMMAND CHANNEL · LOCAL INDEX</p><h2 id="cmdTitle">FIND A SIGNAL</h2></div><button class="cmd-close" type="button" aria-label="Close command channel">ESC ×</button><p>Sections, focus cues, entities, tools, chains, and glossary references.</p></header><label class="cmd-query"><span aria-hidden="true">⌕</span><input id="cmdInput" type="search" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="cmdResults" autocomplete="off" spellcheck="false" placeholder="Search turbine, Jito, priority fees…"><kbd>ESC</kbd></label><nav class="cmd-sections" aria-label="Quick section jump"></nav><div class="cmd-meta"><span id="cmdStatus" role="status" aria-live="polite"></span><span>FUSE '+escape(window.Fuse?.version||'FALLBACK')+' · ON-DEVICE</span></div><div class="cmd-results" id="cmdResults" role="listbox" aria-label="Search results"></div><footer class="cmd-foot"><span><kbd>↑</kbd><kbd>↓</kbd> SELECT · <kbd>↵</kbd> OPEN</span><span><kbd>←</kbd><kbd>→</kbd> FOCUS · <kbd>SPACE</kbd> AUTO</span></footer></div>';
  document.body.appendChild(panel);
  const input=panel.querySelector('#cmdInput'),resultsNode=panel.querySelector('#cmdResults'),status=panel.querySelector('#cmdStatus'),sectionNav=panel.querySelector('.cmd-sections');
  sections.slice(1).forEach((item,index)=>{
    const button=document.createElement('button');button.type='button';button.className='cmd-section';button.dataset.section=item.id;button.style.setProperty('--section-c',channelColors['ch'+(index+1)]);button.textContent=item.label;sectionNav.appendChild(button);
  });
  let visible=[],active=0;
  const glyph={section:'§',command:'⌘','chain-index':'⌂',entity:'↗',glossary:'REF',focus:'◎'};
  const typeLabel=item=>item.kind==='entity'?(data.entities?.[item.entity]?.kind||'entity'):item.kind;
  const search=query=>{
    const term=query.trim();
    if(!term)return [...sections,...commands].map(item=>records.find(record=>record.kind===item.kind&&record.id===item.id)).filter(Boolean);
    if(fuse)return fuse.search(term,{limit:14}).map(result=>result.item);
    const needle=term.toLowerCase();return records.filter(item=>[item.title,item.summary,...(item.aliases||[]),...(item.keywords||[])].join(' ').toLowerCase().includes(needle)).slice(0,14);
  };
  function select(index){
    if(!visible.length){active=0;input.removeAttribute('aria-activedescendant');return}
    active=(index+visible.length)%visible.length;
    resultsNode.querySelectorAll('.cmd-option').forEach((option,optionIndex)=>option.setAttribute('aria-selected',optionIndex===active?'true':'false'));
    const selected=resultsNode.querySelectorAll('.cmd-option')[active];
    if(selected){input.setAttribute('aria-activedescendant',selected.id);selected.scrollIntoView({block:'nearest'})}
  }
  function render(){
    visible=search(input.value);active=0;
    if(!visible.length){resultsNode.innerHTML='<div class="cmd-empty"><p><b>NO SIGNAL FOUND</b>Try a protocol, tool, chain, section, or authored focus.</p></div>';status.textContent='0 RESULTS';input.removeAttribute('aria-activedescendant');return}
    resultsNode.innerHTML=visible.map((item,index)=>'<button type="button" class="cmd-option" id="cmdOption'+index+'" role="option" aria-selected="'+(index===0?'true':'false')+'" data-index="'+index+'" data-kind="'+escape(item.kind)+'"><span class="cmd-glyph">'+escape(glyph[item.kind]||'·')+'</span><span class="cmd-copy"><span class="cmd-title">'+escape(item.title)+'</span><span class="cmd-desc">'+escape(item.summary)+'</span></span><span class="cmd-kind">'+escape(typeLabel(item))+'</span></button>').join('');
    input.setAttribute('aria-activedescendant','cmdOption0');status.textContent=visible.length+' RESULT'+(visible.length===1?'':'S')+' · '+records.length+' INDEXED';
  }
  function close(options={}){scope.Overlay.close(panel,options)}
  function focusTarget(target){
    if(!target)return;
    target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
    if(!target.matches('a,button,input,textarea,select,[tabindex]'))target.tabIndex=-1;
    requestAnimationFrame(()=>target.focus({preventScroll:true}));
  }
  function clearOtherOverlay(){const top=scope.Overlay.top();if(top&&top.element!==panel)scope.Overlay.close(top,{restoreFocus:false,reason:'command-route'})}
  function transport(action){
    const api=scope.Playbar;
    if(!api)return;
    if(action==='toggle')api.toggle();else if(action==='previous')api.step(-1);else if(action==='next')api.step(1);
  }
  function run(item){
    if(!item)return;
    close({restoreFocus:false,reason:'command'});
    requestAnimationFrame(()=>{
      if(item.kind==='section'){
        clearOtherOverlay();
        if(item.id==='top')history.replaceState(null,'',location.pathname+location.search);else location.hash=item.id;
        focusTarget(document.querySelector(item.target));return;
      }
      if(item.kind==='entity'){clearOtherOverlay();scope.Router.go('/e/'+item.entity);return}
      if(item.kind==='chain-index'){clearOtherOverlay();scope.Router.go('/c/'+item.slug);return}
      if(item.kind==='glossary'){
        clearOtherOverlay();
        const trigger=document.querySelector('.term[data-ref-bound="'+CSS.escape(item.term)+'"]');
        if(trigger){focusTarget(trigger);setTimeout(()=>trigger.click(),matchMedia('(prefers-reduced-motion: reduce)').matches?0:220)}else if(item.entity)scope.Router.go('/e/'+item.entity);
        return;
      }
      if(item.kind==='focus'){scope.Playbar?.go(item.cue);return}
      if(item.kind==='command')transport(item.command);
    });
  }
  function open(trigger=launcher){
    if(!document.documentElement.hasAttribute('data-scope-unlocked')){document.getElementById('scopeAccessCode')?.focus();return}
    input.value='';render();scope.Overlay.open({element:panel,trigger,focusTarget:input,modal:true,scrim:true,lockScroll:true,sheet:true,outsideClose:true,onClose:()=>{input.value='';requestAnimationFrame(()=>{if(panel.contains(document.activeElement))launcher.focus({preventScroll:true})})}});
  }

  launcher.addEventListener('click',()=>open(launcher));
  panel.querySelector('.cmd-close').addEventListener('click',()=>close({reason:'button'}));
  sectionNav.addEventListener('click',event=>{const id=event.target.closest('[data-section]')?.dataset.section;run(records.find(item=>item.kind==='section'&&item.id===id))});
  resultsNode.addEventListener('pointermove',event=>{const option=event.target.closest('.cmd-option');if(option)select(Number(option.dataset.index))});
  resultsNode.addEventListener('click',event=>{const option=event.target.closest('.cmd-option');if(option)run(visible[Number(option.dataset.index)])});
  input.addEventListener('input',render);
  input.addEventListener('keydown',event=>{
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();select(active+(event.key==='ArrowDown'?1:-1))}
    else if(event.key==='Home'&&visible.length){event.preventDefault();select(0)}
    else if(event.key==='End'&&visible.length){event.preventDefault();select(visible.length-1)}
    else if(event.key==='Enter'){event.preventDefault();run(visible[active])}
  });
  document.addEventListener('keydown',event=>{
    const editor=event.target.closest?.('input,textarea,select,[contenteditable="true"]');
    const arrowOwned=event.target.closest?.('[role="grid"],[role="listbox"],[role="tablist"],[role="slider"],[role="spinbutton"],.tcell,.chip');
    if((event.metaKey||event.ctrlKey)&&!event.altKey&&!event.shiftKey&&event.key.toLowerCase()==='k'){
      event.preventDefault();event.stopImmediatePropagation();scope.Overlay.isOpen(panel)?close({reason:'shortcut'}):open(document.activeElement);return;
    }
    if(event.key==='/'&&!editor&&!event.metaKey&&!event.ctrlKey&&!event.altKey&&!scope.Overlay.top()){
      event.preventDefault();event.stopImmediatePropagation();open(document.activeElement);return;
    }
    if(editor||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey||scope.Overlay.top()||!document.documentElement.hasAttribute('data-scope-unlocked'))return;
    if((event.key==='ArrowLeft'||event.key==='ArrowRight')&&!arrowOwned){
      event.preventDefault();event.stopImmediatePropagation();transport(event.key==='ArrowLeft'?'previous':'next');return;
    }
    if(event.code==='Space'&&!event.target.closest?.('a,button,[role="button"]')){
      event.preventDefault();event.stopImmediatePropagation();transport('toggle');
    }
  },true);
  scope.CommandPalette=Object.freeze({open,close,search,get size(){return records.length},get engine(){return fuse?'Fuse '+window.Fuse.version:'fallback'}});
})(window.SCOPE);
