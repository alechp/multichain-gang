(function chainIndex(scope){
  'use strict';
  const dataNode=document.getElementById('chainData');
  const shell=document.getElementById('chainChannel');
  const pageNode=document.getElementById('chainPage');
  if(!scope?.Overlay||!scope?.Router||!scope?.Store||!dataNode||!shell||!pageNode)return;
  let data;
  try{data=JSON.parse(dataNode.textContent)}catch(error){return}
  const pages=data.chainPages||{},entities=data.entities||{};
  const ordered=Object.entries(pages);
  const bySlug=new Map(ordered.map(([id,page])=>[page.slug,{id,page}]));
  const groupNames={foundation:'FOUNDATION',consensus:'CONSENSUS',transactions:'TRANSACTIONS',ordering:'ORDERING + MEV',infrastructure:'INFRASTRUCTURE',liquidity:'LIQUIDITY',safety:'SAFETY'};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const safeUrl=value=>{try{const url=new URL(String(value),location.href);return url.protocol==='https:'?url.href:''}catch(error){return''}};
  const colorFor=id=>id==='sol'?(data.sol?.color||'#5BD7E8'):(data.chains?.[id]?.color||'#8A9EF5');
  const veilStore=scope.Store.create('chain.linkVeil',{version:1,defaultValue:{v:1,enabled:false},validate:value=>value?.v===1&&typeof value.enabled==='boolean'});
  const baseTitle=document.title;
  let activeId='',activeSlug='',pendingTrigger=null,closingForRoute=false,hoveredCard=null,held=false,lastContext=null,filter='all';
  const ref=document.getElementById('chainRef'),prev=document.getElementById('chainPrev'),next=document.getElementById('chainNext'),close=document.getElementById('chainClose'),veil=document.getElementById('chainVeil');

  function articleIds(page){return page.groups.flatMap(group=>group.items).filter(id=>entities[id]?.article?.status==='published')}
  function articlesFor(id){
    const page=pages[id];if(!page)return[];
    return page.groups.flatMap(group=>group.items.map(entityId=>({id:entityId,group:group.id,entity:entities[entityId]}))).filter(item=>item.entity?.article?.status==='published');
  }
  function meta(entity){return entity.article||{status:'draft',category:'foundation',level:'foundation',minutes:5,updated:data.meta?.dated||'2026-08'}}
  function cardMeta(entity,category){
    const article=meta(entity),label=article.label&&article.label!==(groupNames[category]||category)?`<span class="chain-card-label">${esc(article.label)}</span>`:'';
    return `<span>${esc(groupNames[category]||category)}</span><span>${esc(article.level)}</span><span>${esc(article.minutes)} MIN</span><span>${esc(article.updated)}</span>${label}`;
  }
  function articleCard(item){
    const entity=item.entity,article=meta(entity);
    return `<article class="chain-article" data-article-id="${esc(item.id)}" data-category="${esc(item.group)}">
      <a class="chain-article-link" href="#/e/${esc(item.id)}" data-chain-article="${esc(item.id)}">
        <span class="chain-card-meta">${cardMeta(entity,item.group)}</span>
        <h4>${esc(entity.name)}</h4><p>${esc(entity.tagline)}</p>
        <span class="chain-article-route">READ ARTICLE →</span><span class="chain-veil-hint">HOVER + HOLD CTRL</span>
      </a>
    </article>`;
  }
  function renderDirectory(){
    activeId='';activeSlug='';filter='all';shell.dataset.view='directory';shell.dataset.chain='directory';shell.style.setProperty('--cc','var(--violet)');ref.textContent=`ALL CHAINS · ${String(ordered.length).padStart(2,'0')} PATHS`;document.title='Chain directory — SOLANA//SCOPE';
    pageNode.innerHTML=`
      <header class="chain-directory-mast">
        <p class="chain-kicker">CHAIN DIRECTORY · SIX EXECUTION ENVIRONMENTS</p>
        <div class="chain-directory-title"><h1 id="chainIndexTitle" tabindex="-1">CHAIN<br>ATLAS</h1><p>Choose an execution environment, then move from its system overview into consensus, transaction flow, ordering, infrastructure, safety, and liquidity articles. Every card below is a canonical route.</p></div>
      </header>
      <section class="chain-directory-region" aria-labelledby="chainDirectoryGrid">
        <header class="chain-directory-head"><div><p class="chain-section-kicker">00 · SELECT A READING PATH</p><h2 id="chainDirectoryGrid">ALL CHAIN INDEXES</h2></div><p>${ordered.length} hubs · ${ordered.reduce((sum,[id])=>sum+articlesFor(id).length,0)} article placements · one shared reference system</p></header>
        <div class="chain-directory-grid">${ordered.map(([id,chainPage],index)=>{
          const count=articlesFor(id).length;
          return `<article class="chain-directory-card" style="--card-c:${esc(colorFor(id))}">
            <a href="#/c/${esc(chainPage.slug)}" aria-label="Open ${esc(chainPage.name)} chain index">
              <span class="chain-directory-meta"><b>${String(index+1).padStart(2,'0')}</b><span>${esc(chainPage.short)}</span><span>${count} ARTICLES</span></span>
              <h2>${esc(chainPage.name)}</h2><p>${esc(chainPage.summary)}</p>
              <dl>${chainPage.signals.slice(0,3).map(signal=>`<div><dt>${esc(signal.k)}</dt><dd>${esc(signal.v)}</dd></div>`).join('')}</dl>
              <span class="chain-directory-route">OPEN INDEX →</span>
            </a>
          </article>`;
        }).join('')}</div>
      </section>`;
    shell.scrollTop=0;clearHeld();return true;
  }
  function crossLens(id,page){
    const baseline=pages.sol,chainRecord=id==='sol'?data.sol:data.chains?.[id];
    const solRecord=data.sol;
    const signal=(source,key)=>source?.signals?.find(item=>item.k===key)?.v||'—';
    const value=(label,current,sol)=>`<div class="chain-lens-card"><span class="chain-lens-axis">${esc(label)}</span><p>${id==='sol'?esc(current):`<b>${esc(page.short)}</b> · ${esc(current)}<br><span>vs SOL · ${esc(sol)}</span>`}</p></div>`;
    return [
      value('ORDERING',signal(page,'ordering'),signal(baseline,'ordering')),
      value('DECISION WINDOW',id==='sol'?'~400 ms':chainRecord?.latency?.metrics?.[0]||signal(page,'block target')||signal(page,'slot target'),solRecord?.latency?.[0]||'~400 ms'),
      value('PENDING VISIBILITY',id==='sol'?solRecord?.mev?.[0]:chainRecord?.mev?.metrics?.[0]||'chain-specific',solRecord?.mev?.[0]||'none public'),
      value('PRIORITY',signal(page,'priority'),signal(baseline,'priority')),
      value('FINALITY',signal(page,'finality')||signal(page,'hard evidence'),signal(baseline,'finality'))
    ].join('');
  }
  function externalLinks(page){
    return (page.links||[]).map(link=>({...link,safe:safeUrl(link.url)})).filter(link=>link.safe).map(link=>`<a href="${esc(link.safe)}" target="_blank" rel="noopener"><span class="chain-source-kind">${esc(link.kind)}</span><span class="chain-source-label">${esc(link.label)}</span><span aria-hidden="true">↗</span></a>`).join('');
  }
  function render(id){
    const chainPage=pages[id];if(!chainPage)return false;
    const items=articlesFor(id),featured=chainPage.featured.map(entityId=>items.find(item=>item.id===entityId)).filter(Boolean);
    if(featured.length!==3)return false;
    activeId=id;activeSlug=chainPage.slug;filter='all';shell.dataset.view='chain';
    shell.style.setProperty('--cc',colorFor(id));shell.dataset.chain=id;ref.textContent=`${chainPage.short} · ${chainPage.slug}`;
    const index=ordered.findIndex(([key])=>key===id),previous=ordered[(index-1+ordered.length)%ordered.length],following=ordered[(index+1)%ordered.length];
    prev.dataset.chainSlug=previous[1].slug;prev.title=`Previous: ${previous[1].name}`;prev.setAttribute('aria-label',`Previous chain index: ${previous[1].name}`);
    next.dataset.chainSlug=following[1].slug;next.title=`Next: ${following[1].name}`;next.setAttribute('aria-label',`Next chain index: ${following[1].name}`);
    document.title=`${chainPage.name} index — SOLANA//SCOPE`;
    pageNode.innerHTML=`
      <header class="chain-mast">
        <div><p class="chain-kicker">CHAIN INDEX · ${esc(chainPage.short)} · UPDATED ${esc(chainPage.updated)}</p><h1 id="chainIndexTitle" tabindex="-1">${esc(chainPage.name)}</h1><p class="chain-summary">${esc(chainPage.summary)}</p>
          <div class="chain-actions"><a class="chain-action primary" href="#/e/${esc(chainPage.overview)}" data-chain-article="${esc(chainPage.overview)}">READ CHAIN OVERVIEW →</a><a class="chain-action" href="#/tools/${esc(chainPage.slug)}">TOOL LANDSCAPE →</a>${(chainPage.links||[]).slice(0,1).map(link=>{const safe=safeUrl(link.url);return safe?`<a class="chain-action" href="${esc(safe)}" target="_blank" rel="noopener">PRIMARY DOCS ↗</a>`:''}).join('')}<span class="chain-count">${items.length} PUBLISHED ARTICLES</span></div>
        </div>
        <aside class="chain-signal-panel" aria-label="${esc(chainPage.name)} signals"><header>SIGNAL PANEL · ${esc(chainPage.updated)}</header><dl>${chainPage.signals.map(signal=>`<div><dt>${esc(signal.k)}</dt><dd>${esc(signal.v)}</dd></div>`).join('')}</dl></aside>
      </header>
      <section class="chain-region" aria-labelledby="chainFeatured"><div class="chain-region-head"><div><p class="chain-section-kicker">00 · START HERE</p><h2 id="chainFeatured">FEATURED READS</h2></div><p class="chain-region-note">Three entry points: the system, its decisive mechanism, and the operational edge.</p></div>
        <div class="chain-feature-grid">${featured.map((item,index)=>`<article class="chain-feature" data-rank="0${index+1}"><span class="chain-card-meta">${cardMeta(item.entity,item.group)}</span><h3>${esc(item.entity.name)}</h3><p>${esc(item.entity.tagline)}</p><a class="chain-feature-link" href="#/e/${esc(item.id)}" data-chain-article="${esc(item.id)}" aria-label="Read ${esc(item.entity.name)}"><span class="chain-feature-route">OPEN 0${index+1} →</span></a></article>`).join('')}</div>
      </section>
      <section class="chain-region" aria-labelledby="chainRegister"><div class="chain-region-head"><div><p class="chain-section-kicker">01 · COMPLETE REGISTER</p><h2 id="chainRegister">ALL ${esc(chainPage.short)} ARTICLES</h2></div><p class="chain-region-note">Filter the register by system layer. Shared articles remain one canonical reader.</p></div>
        <div class="chain-filter-wrap"><nav class="chain-filters" aria-label="Filter ${esc(chainPage.name)} articles"><button class="chain-filter" type="button" data-filter="all" aria-pressed="true">ALL · ${items.length}</button>${chainPage.groups.map(group=>`<button class="chain-filter" type="button" data-filter="${esc(group.id)}" aria-pressed="false">${esc(groupNames[group.id]||group.id)} · ${group.items.length}</button>`).join('')}</nav></div>
        <div class="chain-groups">${chainPage.groups.map((group,groupIndex)=>{const groupItems=items.filter(item=>item.group===group.id);return `<section class="chain-group" data-group="${esc(group.id)}"><header class="chain-group-head"><span class="chain-group-code">${String(groupIndex+1).padStart(2,'0')} · ${String(groupItems.length).padStart(2,'0')} READS</span><h3>${esc(groupNames[group.id]||group.id)}</h3></header><div class="chain-article-list">${groupItems.map(articleCard).join('')}</div></section>`}).join('')}</div>
      </section>
      <section class="chain-region" aria-labelledby="chainLens"><div class="chain-region-head"><div><p class="chain-section-kicker">02 · COMPARATIVE LENS</p><h2 id="chainLens">${id==='sol'?'SOLANA BASELINE':`${esc(chainPage.short)} × SOL`}</h2></div><p class="chain-region-note">Five signals preserve the main instrument's Solana-centric comparison frame.</p></div><div class="chain-lens">${crossLens(id,chainPage)}</div></section>
      <section class="chain-region" aria-labelledby="chainSources"><div class="chain-region-head"><div><p class="chain-section-kicker">03 · SOURCE RAIL</p><h2 id="chainSources">OFFICIAL SOURCES</h2></div><p class="chain-region-note">External destinations are marked and open in a new tab.</p></div><div class="chain-source-list">${externalLinks(chainPage)}</div></section>
      <p class="sr-only" id="chainVeilStatus" role="status" aria-live="polite"></p>`;
    shell.scrollTop=0;applyVeil();bindPage();restoreRouteState(chainPage.slug);return true;
  }
  function bindPage(){
    pageNode.querySelector('.chain-filters')?.addEventListener('click',event=>{const button=event.target.closest('[data-filter]');if(!button)return;filter=button.dataset.filter;pageNode.querySelectorAll('.chain-filter').forEach(item=>item.setAttribute('aria-pressed',item===button?'true':'false'));pageNode.querySelectorAll('.chain-group').forEach(group=>group.hidden=filter!=='all'&&group.dataset.group!==filter);});
    pageNode.querySelectorAll('.chain-article').forEach(card=>{
      card.addEventListener('pointerenter',()=>{hoveredCard=card;updateHeld()});
      card.addEventListener('pointerleave',()=>{if(hoveredCard===card)hoveredCard=null;card.classList.remove('chain-link-revealed')});
    });
  }
  function veilEnabled(){return veilStore.get().enabled}
  function applyVeil(){
    const enabled=veilEnabled();shell.classList.toggle('chain-link-veil',enabled);veil.setAttribute('aria-pressed',enabled?'true':'false');veil.querySelector('span').textContent=enabled?'LINK VEIL ON':'LINKS VISIBLE';clearHeld();
    document.dispatchEvent(new CustomEvent('scope:link-veil-change',{detail:{scope:'chain',enabled}}));
  }
  function toggleVeil(){const enabled=!veilEnabled();veilStore.set({v:1,enabled});applyVeil();const status=pageNode.querySelector('#chainVeilStatus');if(status)status.textContent=enabled?'Link Veil on. Hold Control while hovering to reveal links and definition previews.':'Links and definition previews visible.'}
  function updateHeld(){pageNode.querySelectorAll('.chain-link-revealed').forEach(card=>card.classList.remove('chain-link-revealed'));if(held&&hoveredCard&&veilEnabled())hoveredCard.classList.add('chain-link-revealed')}
  function clearHeld(){held=false;pageNode.querySelectorAll('.chain-link-revealed').forEach(card=>card.classList.remove('chain-link-revealed'))}
  function editable(target){return target?.closest?.('input,textarea,select,[contenteditable="true"]')}
  function present(){
    if(!scope.Overlay.isOpen(shell))scope.Overlay.open({element:shell,trigger:pendingTrigger,focusTarget:pageNode.querySelector('h1'),modal:true,scrim:false,lockScroll:true,outsideClose:false,sheet:false,onClose:()=>{clearHeld();activeId='';activeSlug='';if(closingForRoute)closingForRoute=false;else{document.title=baseTitle;scope.Router.close()}}});
    else pageNode.querySelector('h1')?.focus({preventScroll:true});
    pendingTrigger=null;
  }
  function openDirectory(){if(renderDirectory())present()}
  function openRoute(route){
    const match=bySlug.get(route.slug);if(!match||!render(match.id))return;
    present();
  }
  function closeForOtherRoute(){if(!scope.Overlay.isOpen(shell))return;closingForRoute=true;scope.Overlay.close(shell,{restoreFocus:false,reason:'route'})}
  function rememberArticle(id,trigger){
    if(!activeSlug||!entities[id])return false;
    const focusId=trigger?.closest?.('[data-article-id]')?.dataset.articleId||id;
    const state={slug:activeSlug,scrollTop:shell.scrollTop,focusId};
    lastContext=state;history.replaceState({...history.state,scopeChain:state},'',location.href);
    pendingTrigger=trigger instanceof HTMLElement?trigger:null;closingForRoute=true;
    if(scope.Overlay.isOpen(shell))scope.Overlay.close(shell,{restoreFocus:false,reason:'article-route'});
    return scope.Router.go('/e/'+id);
  }
  function restoreRouteState(slug){
    const state=history.state?.scopeChain;if(!state||state.slug!==slug)return;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{shell.scrollTop=Math.max(0,Number(state.scrollTop)||0);const target=pageNode.querySelector(`[data-article-id="${CSS.escape(state.focusId||'')}"] .chain-article-link`);target?.focus({preventScroll:true})}));
  }
  function contextFor(id){
    if(lastContext){const match=bySlug.get(lastContext.slug);if(match&&articleIds(match.page).includes(id))return{...match,id:match.id,slug:match.page.slug}}
    const own=ordered.find(([chainId,chainPage])=>chainPage.overview===id||((entities[id]?.chains||[]).includes(chainId)&&articleIds(chainPage).includes(id)));
    return own?{id:own[0],page:own[1],slug:own[1].slug}:null;
  }
  function launch(trigger){pendingTrigger=trigger instanceof HTMLElement?trigger:null;scope.Router.go('/chains')}

  const subnav=document.createElement('div');subnav.className='chain-subnav';
  const launcher=document.createElement('button');launcher.type='button';launcher.className='chain-launch';launcher.textContent='CHAINS';launcher.setAttribute('aria-haspopup','true');launcher.setAttribute('aria-expanded','false');launcher.setAttribute('aria-controls','chainSubnavMenu');launcher.setAttribute('aria-label','Open the Chains sub-navigation');
  const subnavMenu=document.createElement('nav');subnavMenu.className='chain-subnav-menu';subnavMenu.id='chainSubnavMenu';subnavMenu.hidden=true;subnavMenu.setAttribute('aria-label','Chains destinations');
  subnavMenu.innerHTML='<a href="#/chains" data-chain-destination="directory">CHAIN INDEX<span>Articles and system reading paths</span></a><a href="#/tools" data-chain-destination="tools">TOOL LANDSCAPES<span>DEXes, launchpads, analytics, yield, and infrastructure</span></a>';
  subnav.append(launcher,subnavMenu);document.querySelector('.slotbar-inner')?.appendChild(subnav);
  const closeSubnav=({focus=false}={})=>{subnavMenu.hidden=true;launcher.setAttribute('aria-expanded','false');if(focus)launcher.focus({preventScroll:true})};
  const toggleSubnav=()=>{const open=subnavMenu.hidden;subnavMenu.hidden=!open;launcher.setAttribute('aria-expanded',open?'true':'false');if(open)requestAnimationFrame(()=>subnavMenu.querySelector('a')?.focus({preventScroll:true}))};
  launcher.addEventListener('click',()=>{if(!document.documentElement.hasAttribute('data-scope-unlocked')){document.getElementById('scopeAccessCode')?.focus();return}toggleSubnav()});
  subnavMenu.addEventListener('click',event=>{const destination=event.target.closest('[data-chain-destination]');if(!destination)return;closeSubnav();if(destination.dataset.chainDestination==='directory'){event.preventDefault();launch(destination)}else pendingTrigger=destination});
  subnav.addEventListener('keydown',event=>{if(event.key==='Escape'&&!subnavMenu.hidden){event.preventDefault();event.stopPropagation();closeSubnav({focus:true})}});
  document.addEventListener('pointerdown',event=>{if(!subnavMenu.hidden&&!subnav.contains(event.target))closeSubnav()},{capture:true});
  scope.Router.on('chain-directory',openDirectory);
  scope.Router.on('chain',openRoute);
  addEventListener('hashchange',()=>{closeSubnav();const route=scope.Router.parse(location.hash);if(!route||!['chain','chain-directory'].includes(route.type))closeForOtherRoute()});
  addEventListener('popstate',()=>{closeSubnav();const route=scope.Router.parse(location.hash);if(!route||!['chain','chain-directory'].includes(route.type))closeForOtherRoute()});
  close.addEventListener('click',()=>scope.Overlay.close(shell,{reason:'button'}));
  prev.addEventListener('click',()=>scope.Router.go('/c/'+prev.dataset.chainSlug));next.addEventListener('click',()=>scope.Router.go('/c/'+next.dataset.chainSlug));veil.addEventListener('click',toggleVeil);
  addEventListener('keydown',event=>{if(event.key!=='Control'||event.repeat||editable(event.target)||!scope.Overlay.isOpen(shell)||!veilEnabled())return;held=true;updateHeld()},{capture:true});
  addEventListener('keyup',event=>{if(event.key==='Control')clearHeld()},{capture:true});addEventListener('blur',clearHeld);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearHeld()});
  scope.ChainIndex=Object.freeze({launch,openArticle:rememberArticle,contextFor,get activeSlug(){return activeSlug},get records(){return ordered.map(([id,page])=>({id,slug:page.slug,title:page.name,short:page.short,summary:page.summary}))},get veil(){return veilEnabled()}});
})(window.SCOPE);
