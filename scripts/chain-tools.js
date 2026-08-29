(function chainTools(scope){
  'use strict';

  const catalogSource=window.SCOPE_CHAIN_TOOLS||{};
  const expectedCategories=[
    ['CT-01','Launch and issuance'],['CT-02','Spot DEX and liquidity'],['CT-03','Aggregation, routing, and intents'],
    ['CT-04','Derivatives and prediction'],['CT-05','Lending, borrowing, and stablecoins'],['CT-06','Yield, vaults, and strategy'],
    ['CT-07','Staking, restaking, and validation'],['CT-08','Pricing, oracles, and market data'],['CT-09','Analytics, indexing, and exploration'],
    ['CT-10','Charting, portfolio, and discovery'],['CT-11','Wallets, accounts, and custody'],['CT-12','Bridges and interoperability'],
    ['CT-13','MEV, order flow, and execution'],['CT-14','Security, risk, and compliance'],['CT-15','SocialFi, identity, and consumer'],
    ['CT-16','Developer infrastructure'],['CT-17','Collectibles and marketplaces']
  ];
  const chainOrder=['solana','ethereum','bnb-chain','bitcoin','zcash','robinhood-chain'];
  const chainDefaults={
    solana:{id:'sol',slug:'solana',name:'Solana',short:'SOL',color:'#46d8f4',thesis:'Dense transaction, liquidity, launch, and data tooling around one high-throughput state machine.'},
    ethereum:{id:'eth',slug:'ethereum',name:'Ethereum',short:'ETH',color:'#a8a7ff',thesis:'A broad composable base-layer toolset with material activity distributed into explicitly named L2s.'},
    'bnb-chain':{id:'bnb',slug:'bnb-chain',name:'BNB Chain',short:'BNB',color:'#f2bd49',thesis:'Retail-oriented issuance and DeFi density across BSC, with opBNB and Greenfield shown as separate scopes.'},
    bitcoin:{id:'btc',slug:'bitcoin',name:'Bitcoin',short:'BTC',color:'#f39a42',thesis:'Base-layer settlement plus Lightning, inscriptions, analytics, and adjacent financial rails.'},
    zcash:{id:'zec',slug:'zcash',name:'Zcash',short:'ZEC',color:'#c8aa62',thesis:'A privacy-specialized stack centered on shielded wallets, nodes, explorers, and swap rails.'},
    'robinhood-chain':{id:'robinhood_chain',slug:'robinhood-chain',name:'Robinhood Chain',short:'RHC',color:'#b5ff45',thesis:'An emerging EVM rollup with infrastructure, oracle, bridge, custody, and RWA-oriented rails.'}
  };
  const statusValues=['production','beta','testnet','announced','deprecated','unknown'];
  const scopeValues=['native-l1','native-l2','app-layer','cross-chain','adjacent-layer','offchain-service'];
  const surfaceValues=['ui','api','sdk','contracts','rpc','cli','node'];
  const nativeScopes=new Set(['native-l1','native-l2','app-layer']);
  const adjacentScopes=new Set(['cross-chain','adjacent-layer','offchain-service']);
  const escKey=value=>String(value??'').trim().toLowerCase();
  const kebab=value=>escKey(value).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const list=value=>Array.isArray(value)?value:(value==null?[]:[value]);
  const unique=value=>[...new Set(list(value).map(item=>String(item)).filter(Boolean))];
  const safeUrl=value=>{try{const url=new URL(String(value));return url.protocol==='https:'?url.href:''}catch(error){return''}};
  const categoryId=value=>{
    const direct=String(value||'').toUpperCase();
    if(/^CT-\d\d$/.test(direct))return direct;
    const found=expectedCategories.find(([,label])=>escKey(label)===escKey(value));
    return found?.[0]||'';
  };
  const normalizeToken=value=>escKey(value).replace(/[_\s/]+/g,'-').replace(/[^a-z0-9-]/g,'');
  const normalizeScope=value=>{
    const token=normalizeToken(value);
    const aliases={native:'native-l1','native-service':'offchain-service',service:'offchain-service','app-service':'app-layer','native-app':'app-layer','bsc-native':'native-l1','native-developer':'native-l1','native-rollup-ethereum':'native-l2'};
    return scopeValues.includes(token)?token:(aliases[token]||token||'offchain-service');
  };
  const normalizeSurface=value=>{
    const token=normalizeToken(value);
    const aliases={'ui-dependent':'ui',websocket:'api',feed:'api',sql:'api','websocket-feed':'api'};
    return aliases[token]||token;
  };
  const node=(tag,options={},children=[])=>{
    const element=document.createElement(tag);
    Object.entries(options).forEach(([key,value])=>{
      if(value==null||value===false)return;
      if(key==='class')element.className=value;
      else if(key==='text')element.textContent=String(value);
      else if(key==='dataset')Object.entries(value).forEach(([name,item])=>{if(item!=null)element.dataset[name]=String(item)});
      else if(key==='style')Object.entries(value).forEach(([name,item])=>element.style.setProperty(name,item));
      else if(/^aria[A-Z]/.test(key))element.setAttribute('aria-'+key.slice(4).replace(/([A-Z])/g,'-$1').replace(/^-/,'').toLowerCase(),String(value));
      else if(key in element&&key!=='role')try{element[key]=value}catch(error){element.setAttribute(key,String(value))}
      else element.setAttribute(key,String(value));
    });
    list(children).flat(Infinity).forEach(child=>{if(child!=null)element.append(child instanceof Node?child:document.createTextNode(String(child)))});
    return element;
  };
  const text=(tag,className,value)=>node(tag,{class:className,text:value});

  function rawTaxonomy(input){return input.taxonomy?.categories||input.taxonomy||input.categories||[]}
  function normalizeCategory(item,index){
    const fallback=expectedCategories[index]||[];
    const id=categoryId(item?.id||item?.categoryId||fallback[0]);
    return {id,label:item?.label||item?.name||item?.category||fallback[1]||id,short:item?.short||item?.shortName||id.replace('CT-','C'),definition:item?.definition||item?.include||'',order:index};
  }
  function rawTools(input){return input.canonicalTools||input.canonical||input.tools||input.catalog||[]}
  function normalizeTool(item,key){
    const id=item?.id||key||kebab(item?.name);
    return {id,name:item?.name||id,summary:String(item?.summary||item?.definition||'Definition not documented.').slice(0,160),categories:unique(item?.categories).map(categoryId).filter(Boolean),officialUrl:safeUrl(item?.officialUrl||item?.url),docsUrl:safeUrl(item?.docsUrl),aliases:unique(item?.aliases),product:item?.product||'',version:item?.version||''};
  }
  function normalizeEvidence(item,placement){
    const evidence=list(item?.evidence||item?.sources||placement?.evidence);
    if(!evidence.length&&placement?.source)evidence.push({grade:placement.grade||'E3',url:placement.source,checked:placement.checked,note:placement.sourceNote||''});
    return evidence.map(entry=>typeof entry==='string'?{grade:'E3',url:safeUrl(entry),checked:'',note:''}:{grade:entry.grade||'E3',url:safeUrl(entry.url||entry.source),checked:entry.checked||placement?.checked||'',note:entry.note||entry.label||''}).filter(entry=>entry.url);
  }
  function normalizePlacement(item,chain){
    const placement=typeof item==='string'?{toolId:item}:item||{};
    const toolId=placement.toolId||placement.id||kebab(placement.name);
    const fields=placement.chainFields||{};
    const finalityClock=unique(placement.finalityClock||fields.finalityClocks||fields.finalityClock).join(' · ');
    const trustModel=placement.trustModel||fields.trustModel||'';
    const executionLayer=placement.executionLayer||placement.layer||fields.executionLayer||fields.executionSurface||fields.layer||'';
    const shielded=placement.shielded||fields.shieldedSupport||fields.shielded||'';
    const riskFlags=unique([...(placement.riskFlags||[]),trustModel,executionLayer,shielded,...unique(placement.finalityClock||fields.finalityClocks||fields.finalityClock)]).filter(Boolean);
    return {toolId,displayName:placement.displayName||placement.name||'',chainId:placement.chainId||chain.id,scope:normalizeScope(placement.scope),scopeLabel:placement.scopeLabel||placement.scope||normalizeScope(placement.scope),status:normalizeToken(placement.status||placement.state||'unknown'),access:normalizeToken(placement.access||'not-applicable'),surfaces:unique(placement.surfaces).map(normalizeSurface).filter(Boolean),custody:normalizeToken(placement.custody||'not-applicable'),evidence:normalizeEvidence(placement.evidence,placement),riskFlags,chainNote:placement.chainNote||placement.chainRole?.reason||placement.note||placement.integrationNote||'',categories:unique(placement.categories).map(categoryId).filter(Boolean),product:placement.product||'',version:placement.version||'',trustModel,executionLayer,shielded,finalityClock,chainFields:fields};
  }
  function normalizeCoverage(raw,categories){
    const entries=Array.isArray(raw)?raw:Object.entries(raw||{}).map(([id,value])=>typeof value==='string'?{id,level:value}:{id,...value});
    const mapped=new Map(entries.map(item=>[categoryId(item.id||item.category||item.categoryId),{level:normalizeToken(item.level||item.coverage||'native-gap'),note:item.note||item.editorialNote||''}]));
    return categories.map(category=>({categoryId:category.id,...(mapped.get(category.id)||{level:'native-gap',note:'No qualifying placement is documented in this snapshot.'})}));
  }
  function normalizeChain(value,slug,categories,input){
    const raw=Array.isArray(value)?{placements:value}:value||{};
    const key=slug||raw.slug||raw.id;
    const resolvedSlug=chainDefaults[key]?key:(Object.values(chainDefaults).find(item=>item.id===key)?.slug||raw.slug||kebab(raw.name));
    const fallback=chainDefaults[resolvedSlug]||{id:raw.chainId||key,slug:resolvedSlug,name:raw.name||resolvedSlug,short:raw.short||String(raw.name||resolvedSlug).slice(0,3).toUpperCase(),color:'#46d8f4',thesis:''};
    const chain={...fallback,...raw,id:raw.chainId||raw.id||fallback.id,slug:resolvedSlug||fallback.slug,name:raw.name||raw.title||fallback.name,short:raw.short||raw.shorthand||fallback.short,color:raw.color||fallback.color,thesis:raw.thesis||raw.summary||fallback.thesis,verified:raw.verified||raw.checked||input.verified||input.snapshot||'2026-08-29'};
    const externalPlacements=input.placements?.[chain.slug]||input.placements?.[chain.id]||input.inventories?.[chain.slug]||input.inventories?.[chain.id];
    chain.placements=list(raw.placements||raw.inventory||raw.tools||externalPlacements).map(item=>normalizePlacement(item,chain));
    chain.coverage=normalizeCoverage(raw.coverage||raw.categoryCoverage,categories);
    chain.gaps=list(raw.gaps||raw.nativeGaps).map(item=>typeof item==='string'?{categoryId:'',note:item}:{categoryId:categoryId(item.categoryId||item.category||item.id),note:item.note||item.summary||''});
    chain.sources=list(raw.sources).map(item=>typeof item==='string'?{label:'Official source',url:safeUrl(item)}:{label:item.label||item.name||'Official source',url:safeUrl(item.url)}).filter(item=>item.url);
    const image=raw.image||raw.visual||{};
    chain.image={small:image.small||image.src960||`assets/chain-tools/${chain.slug}-landscape-960.webp`,large:image.large||image.src1440||`assets/chain-tools/${chain.slug}-landscape-1440.webp`,master:image.src||'',caption:image.caption||raw.visualCaption||'Illustrative system structure. The verified inventory below is authoritative.',position:image.position||image.objectPosition||'50% 50%'};
    return chain;
  }
  function normalizeCatalog(input){
    const sourceCategories=rawTaxonomy(input);
    const categories=expectedCategories.map((fallback,index)=>normalizeCategory(sourceCategories[index]||{id:fallback[0],label:fallback[1]},index));
    const sourceTools=rawTools(input);
    const tools=(Array.isArray(sourceTools)?sourceTools.map(item=>normalizeTool(item)):Object.entries(sourceTools).map(([key,item])=>normalizeTool(item,key))).filter(tool=>tool.id);
    const chainSource=input.chains||input.chainPages||{};
    const bySlug=new Map();
    if(Array.isArray(chainSource))chainSource.forEach(raw=>{const chain=normalizeChain(raw,raw.slug,categories,input);bySlug.set(chain.slug,chain)});
    else Object.entries(chainSource).forEach(([slug,raw])=>{const chain=normalizeChain(raw,slug,categories,input);bySlug.set(chain.slug,chain)});
    chainOrder.forEach(slug=>{if(!bySlug.has(slug)){const chain=normalizeChain({},slug,categories,input);const external=input.placements?.[slug]||input.placements?.[chain.id]||input.inventories?.[slug]||input.inventories?.[chain.id];if(external)chain.placements=list(external).map(item=>normalizePlacement(item,chain));bySlug.set(slug,chain)}});
    const known=new Set(tools.map(tool=>tool.id));
    bySlug.forEach(chain=>chain.placements.forEach(placement=>{
      if(known.has(placement.toolId))return;
      const source=list(chainSource?.[chain.slug]?.tools||chainSource?.[chain.id]?.tools).find(item=>item?.id===placement.toolId||item?.toolId===placement.toolId);
      if(source?.name){const tool=normalizeTool(source,placement.toolId);tools.push(tool);known.add(tool.id)}
    }));
    return {categories,tools,chains:chainOrder.map(slug=>bySlug.get(slug)).filter(Boolean),toolById:new Map(tools.map(tool=>[tool.id,tool]))};
  }

  let catalog=normalizeCatalog(catalogSource);
  const chainBySlug=()=>new Map(catalog.chains.map(chain=>[chain.slug,chain]));
  const categoryById=()=>new Map(catalog.categories.map(category=>[category.id,category]));
  function categoryNames(ids){const map=categoryById();return ids.map(id=>map.get(id)?.label||id)}
  function allCategories(tool,placement){return unique([...(tool?.categories||[]),...(placement?.categories||[])]).filter(id=>categoryById().has(id))}
  function displayName(tool,placement){return placement?.displayName||tool?.name||placement?.toolId||'Unknown tool'}
  function placementsForTool(toolId){return catalog.chains.flatMap(chain=>chain.placements.filter(placement=>placement.toolId===toolId).map(placement=>({chain,placement})))}
  function buildRecords(){
    const records=[{id:'tools-directory',kind:'tools-directory',slug:'',title:'Chain Tools',summary:'Compare verified tooling landscapes across six ecosystems.',aliases:['tools','chain tools','tool atlas','landscape'],keywords:catalog.categories.map(category=>category.label)}];
    catalog.chains.forEach(chain=>records.push({id:`tools-chain-${chain.slug}`,kind:'tools-chain',slug:chain.slug,title:`${chain.name} tools`,summary:chain.thesis,aliases:[chain.name,chain.short,chain.slug,'tool landscape'],keywords:chain.coverage.map(item=>categoryById().get(item.categoryId)?.label||item.categoryId)}));
    catalog.chains.forEach(chain=>chain.placements.forEach(placement=>{const tool=catalog.toolById.get(placement.toolId);if(!tool)return;records.push({id:`tool-${chain.slug}-${tool.id}`,kind:'tool',slug:chain.slug,toolId:tool.id,title:`${tool.name} · ${chain.short}`,summary:tool.summary,aliases:[displayName(tool,placement),tool.name,...tool.aliases,chain.name,chain.short],keywords:[...categoryNames(allCategories(tool,placement)),placement.scope,placement.status,...placement.surfaces,...placement.riskFlags]})}));
    return records;
  }
  let commandRecords=buildRecords();

  const shell=document.getElementById('toolsChannel');
  const page=document.getElementById('toolsPage');
  const ref=document.getElementById('toolsRef');
  const prev=document.getElementById('toolsPrev');
  const next=document.getElementById('toolsNext');
  const veilButton=document.getElementById('toolsVeil');
  const closeButton=document.getElementById('toolsClose');
  const ready=!!(scope?.Overlay&&scope?.Router&&scope?.LinkVeil&&scope?.positionOverlay&&shell&&page);
  const baseTitle=document.title;
  let activeView='',activeSlug='',routeTrigger=null,closingForRoute=false,filterState=null,expandedTool='',compareIds=[],hoverTimer=0,hoverdoc=null,hoverTrigger=null,hoverPinned=false,hoveredRow=null,hoveredToolTrigger=null,searchTimer=0,lastRenderedHash='';

  function externalLink(label,url,className='tools-source'){
    const safe=safeUrl(url);if(!safe)return text('span',className,label);
    const link=node('a',{class:className,href:safe,target:'_blank',rel:'noopener noreferrer',ariaLabel:`${label}, opens official site in a new tab`},[label,' ↗']);
    return link;
  }
  function localAnchor(label,href,className='tools-action'){
    return node('a',{class:className,href},label);
  }
  function currentRoute(){
    const match=/^#\/tools(?:\/([a-z0-9][a-z0-9-]*))?(?:\?([^#]*))?$/i.exec(location.hash);
    return match?{type:match[1]?'tools-chain':'tools-directory',slug:match[1]||'',params:new URLSearchParams(match[2]||'')}:null;
  }
  function setAccent(chain){shell?.style.setProperty('--tools-accent',chain?.color||'#46d8f4');if(shell)shell.dataset.chain=chain?.slug||'directory'}
  function clearPage(){closeHoverdoc();page?.replaceChildren();compareIds=[];expandedTool='';filterState=null}
  function applyTerms(){
    if(!scope.termify||!page)return;
    try{const site=JSON.parse(document.getElementById('chainData')?.textContent||'{}');if(site.terms)scope.termify(page,{terms:site.terms})}catch(error){}
  }
  function present(focusTarget){
    if(!ready)return false;
    scope.GlobalChrome?.setRouteContext({family:'tools',refCode:'CH-TOOLS',refText:ref?.textContent||'LANDSCAPES',main:page});
    if(!scope.Overlay.isOpen(shell))scope.Overlay.open({element:shell,trigger:routeTrigger,focusTarget:focusTarget||page.querySelector('h1'),modal:false,scrim:false,lockScroll:true,outsideClose:false,sheet:false,onClose:()=>{closeHoverdoc();clearControl();scope.GlobalChrome?.clearRouteContext('tools');activeView='';activeSlug='';document.title=baseTitle;if(closingForRoute)closingForRoute=false;else scope.Router.close()}});
    else (focusTarget||page.querySelector('h1'))?.focus?.({preventScroll:true});
    routeTrigger=null;return true;
  }
  function closeForOtherRoute(){if(!ready||!scope.Overlay.isOpen(shell))return;closingForRoute=true;scope.Overlay.close(shell,{restoreFocus:false,reason:'route'})}

  function chainCounts(chain){
    const active=chain.placements.filter(placement=>placement.status==='production');
    return {native:active.filter(placement=>nativeScopes.has(placement.scope)).length,adjacent:active.filter(placement=>adjacentScopes.has(placement.scope)).length,preview:chain.placements.filter(placement=>placement.status==='beta'||placement.status==='testnet').length,gaps:chain.coverage.filter(item=>item.level==='native-gap').length};
  }
  function coverageWord(chain,category){return chain.coverage.find(item=>item.categoryId===category.id)?.level||'native-gap'}
  function renderSignal(){const rail=node('div',{class:'tools-signal',ariaHidden:'true'});catalog.categories.forEach((category,index)=>rail.append(node('i',{style:{'--i':index}})));return rail}
  function renderDirectory(){
    if(!ready)return false;
    activeView='directory';activeSlug='';lastRenderedHash=location.hash;clearPage();setAccent(null);shell.dataset.view='directory';if(ref)ref.textContent=`CHAIN TOOLS · ${catalog.chains.length} LANDSCAPES · ${catalog.tools.length} CANONICAL TOOLS`;if(prev)prev.hidden=true;if(next)next.hidden=true;document.title='Chain Tools — SOLANA//SCOPE';
    const main=node('div',{class:'tools-directory'});
    const mast=node('header',{class:'tools-mast'});
    mast.append(text('p','tools-kicker','CHAIN TOOLS // VERIFIED LANDSCAPES'));
    const mastGrid=node('div',{class:'tools-mast-grid'});
    const h1=text('h1','', 'Find the right surface before you ship.');h1.id='toolsTitle';h1.tabIndex=-1;
    mastGrid.append(h1,text('p','tools-deck','Six ecosystems. One evidence model. Search launch, liquidity, data, execution, custody, and developer tooling without mistaking adjacency for native support.'));
    mast.append(mastGrid,node('div',{class:'tools-meta'},[text('span','',`VERIFIED ${catalog.chains[0]?.verified||'2026-08-29'}`),text('span','',`${catalog.categories.length} SHARED CATEGORIES`),text('span','',`${catalog.tools.length} CANONICAL IDENTITIES`)]),renderSignal());main.append(mast);

    const searchSection=node('section',{class:'tools-region',ariaLabelledby:'toolsSearchTitle'});
    const searchHead=node('div',{class:'tools-region-head'},[node('div',{},[text('p','tools-section-kicker','00 · QUERY THE CATALOG'),text('h2','', 'Search across placements')]),text('p','tools-region-note','Names, aliases, categories, surfaces, and chain-specific placement notes are indexed locally.')]);searchHead.querySelector('h2').id='toolsSearchTitle';
    const searchBox=node('div',{class:'tools-global-search'});const searchLabel=node('label',{htmlFor:'toolsGlobalQuery',text:'Search all chain tools'});const searchInput=node('input',{id:'toolsGlobalQuery',type:'search',role:'combobox',ariaExpanded:'false',ariaAutocomplete:'list',ariaControls:'toolsGlobalResults',autocomplete:'off',spellcheck:false,placeholder:'Try Chainlink, oracle, wallet, launch…'});const shortcut=text('kbd','','/');const searchResults=node('div',{id:'toolsGlobalResults',class:'tools-search-results',role:'listbox',ariaLabel:'Chain tool search results',hidden:true});searchBox.append(searchLabel,searchInput,shortcut,searchResults);searchSection.append(searchHead,searchBox);main.append(searchSection);

    const atlasSection=node('section',{class:'tools-region',ariaLabelledby:'toolsAtlasTitle'});const atlasHead=node('div',{class:'tools-region-head'},[node('div',{},[text('p','tools-section-kicker','01 · SELECT AN ECOSYSTEM'),text('h2','', 'Chain atlas')]),text('p','tools-region-note','Coverage labels describe the verified tooling shape. They are not rankings, performance scores, or investment signals.')]);atlasHead.querySelector('h2').id='toolsAtlasTitle';const atlas=node('div',{class:'tools-atlas'});
    catalog.chains.forEach((chain,index)=>{
      const counts=chainCounts(chain);const card=node('article',{class:'tools-atlas-card',style:{'--card-accent':chain.color}});card.append(node('div',{class:'tools-atlas-head'},[text('span','tools-card-index',`${String(index+1).padStart(2,'0')} · ${chain.short}`),text('span','tools-small',`${chain.placements.length} PLACEMENTS`)]),text('h2','',chain.name),text('p','',chain.thesis));
      const countGrid=node('div',{class:'tools-counts',ariaLabel:`${chain.name} placement counts`});[['native','CURRENT NATIVE'],['adjacent','ADJACENT / CROSS'],['preview','BETA / TESTNET'],['gaps','NATIVE GAPS']].forEach(([key,label])=>countGrid.append(node('div',{class:'tools-count'},[text('b','',counts[key]),text('span','',label)])));card.append(countGrid);
      const strip=node('div',{class:'tools-coverage-strip',role:'img',ariaLabel:`${chain.name} coverage: ${catalog.categories.map(category=>`${category.label}, ${coverageWord(chain,category)}`).join('; ')}`});catalog.categories.forEach(category=>strip.append(node('i',{dataset:{level:coverageWord(chain,category)},title:`${category.label}: ${coverageWord(chain,category)}`})));card.append(strip,node('div',{class:'tools-atlas-actions'},[localAnchor('EXPLORE TOOLS →',`#/tools/${chain.slug}`,'tools-action primary'),localAnchor('READ CHAIN ARTICLES',`#/c/${chain.slug}`,'tools-action')]));atlas.append(card);
    });atlasSection.append(atlasHead,atlas);main.append(atlasSection);
    const legendSection=node('section',{class:'tools-region',ariaLabelledby:'toolsLegendTitle'});const legendHead=node('div',{class:'tools-region-head'},[node('div',{},[text('p','tools-section-kicker','02 · SHARED TAXONOMY'),text('h2','', 'Seventeen jobs to be done')]),text('p','tools-region-note','The same category IDs and definitions apply to every chain page.')]);legendHead.querySelector('h2').id='toolsLegendTitle';const legend=node('div',{class:'tools-legend'});catalog.categories.forEach(category=>legend.append(node('div',{class:'tools-legend-item'},[text('b','',category.id),text('span','',category.label)])));legendSection.append(legendHead,legend);main.append(legendSection);
    page.append(main);shell.scrollTop=0;bindDirectorySearch(searchInput,searchResults);applyVeil();applyTerms();return true;
  }
  function globalMatches(query){
    const needle=escKey(query);if(!needle)return[];
    return catalog.tools.map(tool=>{const placements=placementsForTool(tool.id);const categories=unique(placements.flatMap(({placement})=>allCategories(tool,placement)));const haystack=[tool.name,tool.summary,...tool.aliases,...categoryNames(categories),...placements.flatMap(({chain,placement})=>[chain.name,chain.short,placement.scope,placement.status,placement.chainNote,...placement.surfaces])].join(' ').toLowerCase();return {tool,placements,match:haystack.includes(needle)}}).filter(item=>item.match&&item.placements.length).sort((a,b)=>a.tool.name.localeCompare(b.tool.name)).slice(0,18);
  }
  function bindDirectorySearch(input,results){
    let visible=[],active=0;
    const select=index=>{if(!visible.length)return;active=(index+visible.length)%visible.length;results.querySelectorAll('[role="option"]').forEach((option,i)=>option.setAttribute('aria-selected',i===active?'true':'false'));const target=results.querySelectorAll('[role="option"]')[active];if(target){input.setAttribute('aria-activedescendant',target.id);target.scrollIntoView({block:'nearest'})}};
    const render=()=>{visible=globalMatches(input.value);active=0;results.replaceChildren();if(!input.value.trim()||!visible.length){results.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');return}visible.forEach((item,index)=>{const option=node('button',{type:'button',id:`toolsGlobalOption${index}`,class:'tools-search-option',role:'option',ariaSelected:index===0?'true':'false',dataset:{index}},[node('div',{},[text('b','',item.tool.name),text('p','',item.tool.summary)]),node('span',{class:'tools-search-chains'},item.placements.map(({chain})=>text('span','',chain.short)))]);results.append(option)});results.hidden=false;input.setAttribute('aria-expanded','true');input.setAttribute('aria-activedescendant','toolsGlobalOption0')};
    const open=index=>{const item=visible[index];if(!item)return;const placement=item.placements[0];location.hash=`/tools/${placement.chain.slug}?tool=${encodeURIComponent(item.tool.id)}`};
    input.addEventListener('input',render);input.addEventListener('keydown',event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(results.hidden)render();select(active+(event.key==='ArrowDown'?1:-1))}else if(event.key==='Enter'&&!results.hidden){event.preventDefault();open(active)}else if(event.key==='Escape'){if(input.value){event.preventDefault();input.value='';render()}else input.blur()}});results.addEventListener('pointermove',event=>{const option=event.target.closest('[data-index]');if(option)select(Number(option.dataset.index))});results.addEventListener('click',event=>{const option=event.target.closest('[data-index]');if(option)open(Number(option.dataset.index))});
  }

  function defaultFilters(){return {query:'',categories:new Set(),scopes:new Set(),statuses:new Set(),surfaces:new Set(),risk:'',sort:'category'}}
  function readFilters(){
    const state=defaultFilters(),params=currentRoute()?.params||new URLSearchParams();state.query=params.get('q')||'';
    if(params.has('category'))state.categories=new Set(params.get('category').split(',').map(categoryId).filter(Boolean));
    if(params.has('scope'))state.scopes=new Set(params.get('scope').split(',').map(normalizeScope).filter(value=>scopeValues.includes(value)));
    if(params.has('status'))state.statuses=new Set(params.get('status').split(',').map(normalizeToken).filter(value=>statusValues.includes(value)));
    if(params.has('surface'))state.surfaces=new Set(params.get('surface').split(',').map(normalizeSurface).filter(value=>surfaceValues.includes(value)));
    state.risk=params.get('risk')||'';state.sort=['category','name','scope','verified'].includes(params.get('sort'))?params.get('sort'):'category';expandedTool=params.get('tool')||'';return state;
  }
  function sameSet(a,b){return a.size===b.size&&[...a].every(value=>b.has(value))}
  function serializeFilters(){
    const defaults=defaultFilters(),params=new URLSearchParams();if(filterState.query)params.set('q',filterState.query);if(filterState.categories.size)params.set('category',[...filterState.categories].sort().join(','));if(!sameSet(filterState.scopes,defaults.scopes))params.set('scope',[...filterState.scopes].sort().join(','));if(!sameSet(filterState.statuses,defaults.statuses))params.set('status',[...filterState.statuses].sort().join(','));if(filterState.surfaces.size)params.set('surface',[...filterState.surfaces].sort().join(','));if(filterState.risk)params.set('risk',filterState.risk);if(filterState.sort!=='category')params.set('sort',filterState.sort);if(expandedTool)params.set('tool',expandedTool);return params}
  function commitFilters({replace=false,focus=null}={}){
    const params=serializeFilters(),hash=`#/tools/${activeSlug}${params.toString()?`?${params}`:''}`;if(hash!==location.hash){const state={...(history.state||{}),scopeTools:true};history[replace?'replaceState':'pushState'](state,'',hash)}lastRenderedHash=hash;renderInventory(focus);
  }
  function placementRiskValues(placements){return unique(placements.flatMap(placement=>placement.riskFlags)).sort((a,b)=>a.localeCompare(b))}
  function filterSummary(set,allLabel){return set.size?`${set.size} SELECTED`:allLabel}
  function multiControl(label,name,options,selected,onChange){
    const field=node('div',{class:'tools-field'},[text('span','',label)]);const details=node('details',{class:'tools-multi'});const summary=text('summary','',filterSummary(selected,'ALL'));const panel=node('div',{class:'tools-multi-panel'});options.forEach(option=>{const input=node('input',{type:'checkbox',name:`tools-${name}`,value:option.value,checked:selected.has(option.value)});const choice=node('label',{},[input,text('span','',option.label)]);input.addEventListener('change',()=>{if(input.checked)selected.add(option.value);else selected.delete(option.value);summary.textContent=filterSummary(selected,'ALL');onChange(details)});panel.append(choice)});details.append(summary,panel);field.append(details);return field;
  }
  function renderChain(slug){
    if(!ready)return false;const chain=chainBySlug().get(slug);if(!chain)return false;
    activeView='chain';activeSlug=slug;lastRenderedHash=location.hash;clearPage();setAccent(chain);shell.dataset.view='chain';filterState=readFilters();if(ref)ref.textContent=`${chain.short} · TOOL LANDSCAPE · VERIFIED ${chain.verified}`;document.title=`${chain.name} tools — SOLANA//SCOPE`;
    const index=catalog.chains.findIndex(item=>item.slug===slug),previous=catalog.chains[(index-1+catalog.chains.length)%catalog.chains.length],following=catalog.chains[(index+1)%catalog.chains.length];if(prev){prev.hidden=false;prev.dataset.chainSlug=previous.slug;prev.setAttribute('aria-label',`Previous tool landscape: ${previous.name}`)}if(next){next.hidden=false;next.dataset.chainSlug=following.slug;next.setAttribute('aria-label',`Next tool landscape: ${following.name}`)}
    const main=node('div',{class:'tools-chain-page'});const mast=node('header',{class:'tools-mast tools-chain-hero'});const copy=node('div',{class:'tools-chain-hero-copy'},[text('p','tools-kicker',`${chain.short} // VERIFIED TOOL LANDSCAPE`)]);const h1=text('h1','',`${chain.name} tools`);h1.id='toolsTitle';h1.tabIndex=-1;copy.append(h1,text('p','tools-deck',chain.thesis));if(chain.scopeStatement)copy.append(text('p','tools-scope-statement',chain.scopeStatement));copy.append(node('div',{class:'tools-meta'},[text('span','',`${chain.placements.length} PLACEMENTS`),text('span','',`${chain.coverage.filter(item=>item.level==='native-gap').length} NATIVE GAPS`),text('span','',`CHECKED ${chain.verified}`)]));
    const figure=node('figure',{class:'tools-topology-figure'});const picture=node('picture',{class:'tools-topology',ariaHidden:'true'});const source=node('source',{media:'(max-width: 700px)',srcset:chain.image.small});const image=node('img',{src:chain.image.large,alt:'',width:1440,height:811,decoding:'async'});image.style.objectPosition=chain.image.position;image.addEventListener('error',()=>picture.replaceChildren());picture.append(source,image);figure.append(picture,node('figcaption',{class:'tools-caption'},[text('b','','CONCEPTUAL TOPOLOGY'),text('span','',chain.image.caption)]));mast.append(copy,figure);main.append(mast);

    const coverageSection=node('section',{class:'tools-region',ariaLabelledby:'toolsCoverageTitle'});const coverageHead=node('div',{class:'tools-region-head'},[node('div',{},[text('p','tools-section-kicker','00 · COVERAGE MATRIX'),text('h2','','Seventeen-category signal')]),text('p','tools-region-note','Select a category to filter its tools. A native gap jumps to the editorial gap register.')]);coverageHead.querySelector('h2').id='toolsCoverageTitle';const coverage=node('div',{class:'tools-coverage-rail',role:'group',ariaLabel:'Filter by category coverage'});chain.coverage.forEach(item=>{const category=categoryById().get(item.categoryId);if(!category)return;coverage.append(node('button',{type:'button',class:'tools-coverage-cell',dataset:{category:category.id,level:item.level},ariaPressed:filterState.categories.has(category.id)?'true':'false',ariaLabel:`${category.label}: ${item.level}. ${item.note}`},[text('b','',category.id),text('span','',category.label),text('small','',item.level)]))});coverageSection.append(coverageHead,coverage);main.append(coverageSection);

    const inventory=node('section',{class:'tools-region tools-inventory-shell',ariaLabelledby:'toolsInventoryTitle'});const inventoryHead=node('div',{class:'tools-region-head'},[node('div',{},[text('p','tools-section-kicker','01 · NORMALIZED INVENTORY'),text('h2','','Evidence table')]),text('p','tools-region-note','Definitions, scope, state, surfaces, sources, and risks remain explicit. Expand any row for the full record.')]);inventoryHead.querySelector('h2').id='toolsInventoryTitle';
    const searchLine=node('div',{class:'tools-search-line'});const searchLabel=node('label',{htmlFor:'toolsQuery'},['⌕',node('input',{id:'toolsQuery',type:'search',value:filterState.query,autocomplete:'off',spellcheck:false,placeholder:`Search ${chain.name} tools, categories, aliases…`})]);const resultCount=text('span','tools-result-count','');resultCount.id='toolsResultCount';searchLine.append(searchLabel,resultCount);
    const filterDisclosure=node('details',{class:'tools-filter-disclosure',open:!matchMedia('(max-width:429px)').matches},[text('summary','','FILTERS')]);const filters=node('div',{class:'tools-filters'});
    filters.append(multiControl('CATEGORY','category',catalog.categories.map(category=>({value:category.id,label:`${category.id} · ${category.label}`})),filterState.categories,control=>commitFilters({focus:control})),multiControl('SCOPE','scope',scopeValues.map(value=>({value,label:value.replace(/-/g,' ')})),filterState.scopes,control=>commitFilters({focus:control})),multiControl('STATE','status',statusValues.map(value=>({value,label:value})),filterState.statuses,control=>commitFilters({focus:control})),multiControl('SURFACES','surface',surfaceValues.map(value=>({value,label:value})),filterState.surfaces,control=>commitFilters({focus:control})));
    const riskField=node('label',{class:'tools-field'},[text('span','','RISK / TRUST')]);const riskSelect=node('select',{ariaLabel:'Filter by risk or trust field'},[node('option',{value:'',text:'ANY DOCUMENTED'}),...placementRiskValues(chain.placements).map(value=>node('option',{value,text:value}))]);riskSelect.value=filterState.risk;riskSelect.addEventListener('change',()=>{filterState.risk=riskSelect.value;commitFilters({focus:riskSelect})});riskField.append(riskSelect);filters.append(riskField);
    const sortField=node('label',{class:'tools-field'},[text('span','','SORT')]);const sortSelect=node('select',{ariaLabel:'Sort tools'},[['category','CATEGORY'],['name','NAME'],['scope','SCOPE'],['verified','RECENTLY VERIFIED']].map(([value,label])=>node('option',{value,text:label})));sortSelect.value=filterState.sort;sortSelect.addEventListener('change',()=>{filterState.sort=sortSelect.value;commitFilters({focus:sortSelect})});sortField.append(sortSelect);filters.append(sortField);const reset=node('button',{type:'button',class:'tools-reset',text:'RESET'});reset.addEventListener('click',()=>{history.pushState({scopeTools:true},'',`#/tools/${activeSlug}`);renderChain(activeSlug)});filters.append(reset);filterDisclosure.append(filters);
    const tableMount=node('div',{class:'tools-table-mount'});bindTableEvents(tableMount);const live=text('p','tools-live','');live.id='toolsLive';live.setAttribute('role','status');live.setAttribute('aria-live','polite');const compareBar=node('div',{class:'tools-compare-bar',hidden:true},[text('p','', ''),node('button',{type:'button',class:'tools-compare-open',text:'OPEN COMPARISON'})]);compareBar.querySelector('button').addEventListener('click',openCompare);inventory.append(inventoryHead,searchLine,filterDisclosure,tableMount,compareBar,live);main.append(inventory);

    const gaps=node('section',{class:'tools-region',id:'toolsGaps',ariaLabelledby:'toolsGapsTitle'});const gapHead=node('div',{class:'tools-region-head'},[node('div',{},[text('p','tools-section-kicker','02 · EDITORIAL GUARDRAILS'),text('h2','','Native gaps and category traps')]),text('p','tools-region-note','Absence is recorded instead of filled with adjacent products or marketing inference.')]);gapHead.querySelector('h2').id='toolsGapsTitle';const gapGrid=node('div',{class:'tools-gap-list'});const gapItems=chain.gaps.length?chain.gaps:chain.coverage.filter(item=>item.level==='native-gap').map(item=>({categoryId:item.categoryId,note:item.note}));gapItems.forEach(item=>{const category=categoryById().get(item.categoryId);gapGrid.append(node('article',{class:'tools-gap-card'},[text('b','',category?`${category.id} · ${category.label}`:'SCOPE NOTE'),text('p','',item.note||'No qualifying native placement was verified for this snapshot.')]))});gaps.append(gapHead,gapGrid);main.append(gaps);
    if(chain.sources.length){const sourceSection=node('section',{class:'tools-region',ariaLabelledby:'toolsSourcesTitle'});const sourceHead=node('div',{class:'tools-region-head'},[node('div',{},[text('p','tools-section-kicker','03 · SOURCE RAIL'),text('h2','','Official references')]),text('p','tools-region-note','External sources are safe-URL filtered and marked before navigation.')]);sourceHead.querySelector('h2').id='toolsSourcesTitle';const sourceList=node('div',{class:'tools-gap-list'});chain.sources.forEach(source=>sourceList.append(externalLink(source.label,source.url,'tools-source')));sourceSection.append(sourceHead,sourceList);main.append(sourceSection)}
    const methodSection=node('footer',{class:'tools-region tools-method',ariaLabelledby:'toolsMethodTitle'});const methodHead=node('div',{class:'tools-region-head'},[node('div',{},[text('p','tools-section-kicker','04 · METHOD + NEXT ROUTE'),text('h2','','Keep the evidence current')]),text('p','tools-region-note','This is a documented snapshot, not a ranking, endorsement, or claim of ecosystem completeness.')]);methodHead.querySelector('h2').id='toolsMethodTitle';const methodGrid=node('div',{class:'tools-gap-list'},[node('article',{class:'tools-gap-card'},[text('b','','UPDATE PROTOCOL'),text('p','',`Re-open first-party evidence, confirm exact chain and product scope, record the checked date, and mark disappearing support unknown before removal. Snapshot: ${chain.verified}.`)]),node('article',{class:'tools-gap-card'},[text('b','','CONTRIBUTE A CORRECTION'),text('p','','Report a stale state, unsafe link, scope mismatch, or missing first-party source. Include the exact product surface and chain deployment.')])]);const routes=node('nav',{class:'tools-method-routes',ariaLabel:`Continue from ${chain.name} tools`},[localAnchor('← '+previous.name.toUpperCase(),`#/tools/${previous.slug}`,'tools-action'),localAnchor('ALL CHAIN TOOLS', '#/tools','tools-action primary'),localAnchor(following.name.toUpperCase()+' →',`#/tools/${following.slug}`,'tools-action'),localAnchor('READ '+chain.name.toUpperCase()+' ARTICLES',`#/c/${chain.slug}`,'tools-action'),externalLink('CONTRIBUTE A SOURCE','https://github.com/alechp/solana/issues','tools-action')]);methodSection.append(methodHead,methodGrid,routes);main.append(methodSection);
    page.append(main);shell.scrollTop=0;bindChainControls(chain,{coverage,search:searchLabel.querySelector('input'),tableMount,resultCount,compareBar,live});renderInventory();applyVeil();applyTerms();requestAnimationFrame(()=>restoreDeepLink());return true;
  }
  function bindChainControls(chain,ui){
    ui.coverage.addEventListener('click',event=>{const button=event.target.closest('[data-category]');if(!button)return;const category=button.dataset.category,coverage=chain.coverage.find(item=>item.categoryId===category);if(coverage?.level==='native-gap'){document.getElementById('toolsGaps')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});const gapTitle=document.getElementById('toolsGapsTitle');if(gapTitle){gapTitle.tabIndex=-1;gapTitle.focus({preventScroll:true})}return}if(filterState.categories.has(category))filterState.categories.delete(category);else filterState.categories.add(category);ui.coverage.querySelectorAll('[data-category]').forEach(item=>item.setAttribute('aria-pressed',filterState.categories.has(item.dataset.category)?'true':'false'));commitFilters({focus:button})});
    ui.search.addEventListener('input',()=>{filterState.query=ui.search.value;clearTimeout(searchTimer);searchTimer=setTimeout(()=>commitFilters({replace:true,focus:ui.search}),120)});
  }
  function entryFor(chain,placement){return {chain,placement,tool:catalog.toolById.get(placement.toolId)}}
  function checkedDate(placement){return placement.evidence.map(item=>item.checked).filter(Boolean).sort().at(-1)||''}
  function filteredEntries(chain){
    const needle=escKey(filterState.query);const categoryMap=categoryById();let entries=chain.placements.map(placement=>entryFor(chain,placement)).filter(entry=>entry.tool);
    entries=entries.filter(({tool,placement})=>{
      const categories=allCategories(tool,placement);if(filterState.categories.size&&![...filterState.categories].some(value=>categories.includes(value)))return false;
      if(filterState.scopes.size&&!filterState.scopes.has(placement.scope))return false;if(filterState.statuses.size&&!filterState.statuses.has(placement.status))return false;
      if(filterState.surfaces.size&&![...filterState.surfaces].some(value=>placement.surfaces.includes(value)))return false;
      if(filterState.risk&&!placement.riskFlags.includes(filterState.risk))return false;
      if(needle){const haystack=[displayName(tool,placement),tool.name,tool.summary,...tool.aliases,...categories.map(id=>categoryMap.get(id)?.label||id),placement.scope,placement.scopeLabel,placement.status,placement.chainNote,...placement.surfaces,...placement.riskFlags].join(' ').toLowerCase();if(!haystack.includes(needle))return false}return true;
    });
    const primary=entry=>catalog.categories.findIndex(category=>allCategories(entry.tool,entry.placement).includes(category.id)),name=entry=>displayName(entry.tool,entry.placement);entries.sort((a,b)=>filterState.sort==='name'?name(a).localeCompare(name(b)):filterState.sort==='scope'?a.placement.scope.localeCompare(b.placement.scope)||name(a).localeCompare(name(b)):filterState.sort==='verified'?checkedDate(b.placement).localeCompare(checkedDate(a.placement))||name(a).localeCompare(name(b)):primary(a)-primary(b)||name(a).localeCompare(name(b)));return entries;
  }
  function renderInventory(focusAfter){
    if(activeView!=='chain')return;const chain=chainBySlug().get(activeSlug),mount=page.querySelector('.tools-table-mount'),count=page.querySelector('#toolsResultCount'),live=page.querySelector('#toolsLive'),bar=page.querySelector('.tools-compare-bar');if(!chain||!mount)return;const entries=filteredEntries(chain),previousFocus=document.activeElement;mount.replaceChildren();count.textContent=`${entries.length} / ${chain.placements.length} RESULTS`;if(live)live.textContent=`${entries.length} tools shown.`;
    if(!entries.length){mount.append(node('div',{class:'tools-empty'},[text('h3','','No matching placement'),text('p','','Change a category, scope, state, surface, or search term. Native gaps remain documented below.')]))}
    else{const wrap=node('div',{class:'tools-table-wrap'}),table=node('table',{class:'tools-table',ariaDescribedby:'toolsTableDescription'});const caption=text('caption','',`${chain.name} normalized tool inventory. Filters currently show ${entries.length} of ${chain.placements.length} placements.`);caption.id='toolsTableDescription';const thead=node('thead'),head=node('tr');['Tool','Category','Scope','State','Surfaces','Evidence','Details'].forEach((label,index)=>{const th=text('th','',label);th.scope='col';if((filterState.sort==='name'&&index===0)||(filterState.sort==='category'&&index===1)||(filterState.sort==='scope'&&index===2)||(filterState.sort==='verified'&&index===5))th.setAttribute('aria-sort',filterState.sort==='verified'?'descending':'ascending');head.append(th)});thead.append(head);const tbody=node('tbody');entries.forEach((entry,index)=>appendEntryRows(tbody,entry,index));table.append(caption,thead,tbody);wrap.append(table);mount.append(wrap)}
    updateCompareBar(bar);if(focusAfter instanceof HTMLElement&&focusAfter.isConnected)focusAfter.focus({preventScroll:true});else if(previousFocus?.closest?.('.tools-row')&&!previousFocus.isConnected)page.querySelector('#toolsQuery')?.focus({preventScroll:true});if(expandedTool)requestAnimationFrame(()=>restoreDeepLink(false));
  }
  function appendEntryRows(tbody,entry,index){
    const {tool,placement}=entry,categories=allCategories(tool,placement),name=displayName(tool,placement),detailId=`toolsDetail-${kebab(activeSlug)}-${kebab(tool.id)}`,row=node('tr',{class:'tools-row',dataset:{toolId:tool.id},style:{'--row-index':index}});if(expandedTool===tool.id)row.setAttribute('aria-current','true');
    const definitionId=`toolsDef-${kebab(activeSlug)}-${kebab(tool.id)}`;const nameButton=node('button',{type:'button',class:'tools-name',text:name,dataset:{hoverTool:tool.id,definitionId},ariaLabel:`${name}. Show definition.`});const definition=text('span','tools-live',tool.summary);definition.id=definitionId;nameButton.setAttribute('aria-describedby',definition.id);row.append(node('td',{dataset:{label:'Tool'}},[nameButton,definition]));
    const categoryCell=node('td',{dataset:{label:'Category'}}),categoryList=node('div',{class:'tools-category-list'});categories.slice(0,2).forEach((id,i)=>categoryList.append(text('span',`tools-chip${i===0?' primary':''}`,id)));if(categories.length>2){const extra=text('span','tools-chip',`+${categories.length-2}`);extra.setAttribute('aria-label',`Additional categories: ${categoryNames(categories.slice(2)).join(', ')}`);categoryList.append(extra)}categoryCell.append(categoryList);row.append(categoryCell);
    row.append(node('td',{dataset:{label:'Scope'}},[node('span',{class:'tools-scope',text:placement.scopeLabel||placement.scope,title:placement.scope})]),node('td',{dataset:{label:'State'}},[node('span',{class:'tools-state',dataset:{state:placement.status},text:placement.status})]));
    const surfaceCell=node('td',{dataset:{label:'Surfaces'}}),surfaceList=node('div',{class:'tools-surfaces'});placement.surfaces.slice(0,4).forEach(value=>surfaceList.append(text('span','tools-chip',value)));if(placement.surfaces.length>4)surfaceList.append(text('span','tools-chip',`+${placement.surfaces.length-4}`));surfaceCell.append(surfaceList);row.append(surfaceCell);
    const firstEvidence=placement.evidence[0];const evidenceButton=node('button',{type:'button',class:'tools-evidence',dataset:{grade:firstEvidence?.grade||'E3',evidenceTool:tool.id},text:`${firstEvidence?.grade||'E3'} · ${firstEvidence?.checked||'UNVERIFIED'}`,ariaLabel:`Open evidence for ${name}`});row.append(node('td',{dataset:{label:'Evidence'}},[evidenceButton]));
    const details=node('button',{type:'button',class:'tools-details-button',dataset:{detailsTool:tool.id},ariaExpanded:expandedTool===tool.id?'true':'false',ariaControls:detailId,text:expandedTool===tool.id?'CLOSE':'DETAILS →'});row.append(node('td',{dataset:{label:'Details'}},[details]));tbody.append(row);
    const detailRow=node('tr',{class:'tools-detail-row',id:detailId,hidden:expandedTool!==tool.id});const detailCell=node('td',{colSpan:7});detailCell.append(renderDetail(entry));detailRow.append(detailCell);tbody.append(detailRow);
  }
  function renderDetail({tool,placement}){
    const panel=node('div',{class:'tools-detail-panel'}),copy=node('div'),evidenceColumn=node('div');copy.append(text('h3','',displayName(tool,placement)),text('p','tools-definition',tool.summary));if(placement.chainNote)copy.append(text('p','tools-chain-note',placement.chainNote));
    const categories=allCategories(tool,placement),meta=node('dl',{class:'tools-detail-meta'});[['Categories',categoryNames(categories).join(' · ')||'NOT DOCUMENTED'],['Scope',placement.scopeLabel||placement.scope],['State',placement.status],['Access',placement.access||'NOT DOCUMENTED'],['Custody',placement.custody||'NOT DOCUMENTED'],['Surfaces',placement.surfaces.join(' · ')||'NOT DOCUMENTED'],['Execution layer',placement.executionLayer||'NOT DOCUMENTED'],['Trust / risks',placement.riskFlags.join(' · ')||'NOT DOCUMENTED'],['Shielded support',placement.shielded||'NOT DOCUMENTED'],['Finality clock',placement.finalityClock||'NOT DOCUMENTED']].forEach(([term,value])=>meta.append(node('div',{},[text('dt','',term),text('dd','',value)])));copy.append(meta);
    const actions=node('div',{class:'tools-detail-actions'});actions.append(externalLink('OFFICIAL',tool.officialUrl,'tools-detail-link'));if(tool.docsUrl&&tool.docsUrl!==tool.officialUrl)actions.append(externalLink('DOCS',tool.docsUrl,'tools-detail-link'));actions.append(node('button',{type:'button',class:'tools-compare-select',dataset:{compareTool:tool.id},ariaPressed:compareIds.includes(tool.id)?'true':'false',text:compareIds.includes(tool.id)?'PINNED FOR COMPARE':'COMPARE'}),node('button',{type:'button',class:'tools-detail-link',dataset:{copyTool:tool.id},text:'COPY DEEP LINK'}));copy.append(actions);
    evidenceColumn.append(text('p','tools-filter-label','PLACEMENT EVIDENCE'));const evidenceList=node('ol',{class:'tools-evidence-list'});if(!placement.evidence.length)evidenceList.append(text('li','tools-evidence-item','NOT DOCUMENTED'));placement.evidence.forEach(item=>evidenceList.append(node('li',{class:'tools-evidence-item'},[node('span',{class:'tools-evidence',dataset:{grade:item.grade},text:`${item.grade} · ${item.checked||'DATE NOT DOCUMENTED'}`}),text('p','',item.note||'Official placement source.'),externalLink('OPEN SOURCE',item.url,'tools-source')])));evidenceColumn.append(evidenceList);panel.append(copy,evidenceColumn);return panel;
  }
  function bindTableEvents(mount){
    mount.addEventListener('click',event=>{const details=event.target.closest('[data-details-tool],[data-evidence-tool]');if(details){toggleDetails(details.dataset.detailsTool||details.dataset.evidenceTool,details);return}const compare=event.target.closest('[data-compare-tool]');if(compare){toggleCompare(compare.dataset.compareTool,compare);return}const copy=event.target.closest('[data-copy-tool]');if(copy){copyDeepLink(copy.dataset.copyTool,copy);return}const name=event.target.closest('[data-hover-tool]');if(name){showHoverdoc(name.dataset.hoverTool,name,{pinned:true});requestAnimationFrame(()=>hoverdoc?.querySelector('button,a[href]')?.focus({preventScroll:true}))}});
    mount.addEventListener('pointerover',event=>{const trigger=event.target.closest('[data-hover-tool]');if(!trigger||event.pointerType==='touch')return;hoveredToolTrigger=trigger;hoveredRow=trigger.closest('.tools-row');updateControl();clearTimeout(hoverTimer);if(!scope.LinkVeil.canPointerPreview(trigger)){if(!hoverPinned)closeHoverdoc();return}hoverTimer=setTimeout(()=>showHoverdoc(trigger.dataset.hoverTool,trigger),180)});mount.addEventListener('pointerout',event=>{const trigger=event.target.closest('[data-hover-tool]');if(!trigger||event.relatedTarget?.closest?.('.tools-hoverdoc'))return;if(hoveredToolTrigger===trigger)hoveredToolTrigger=null;scheduleHoverClose()});mount.addEventListener('focusin',event=>{const trigger=event.target.closest('[data-hover-tool]');if(trigger)showHoverdoc(trigger.dataset.hoverTool,trigger)});mount.addEventListener('focusout',event=>{if(event.target.closest('[data-hover-tool]')&&!event.relatedTarget?.closest?.('.tools-hoverdoc'))scheduleHoverClose()});
    mount.addEventListener('pointerenter',event=>{const row=event.target.closest?.('.tools-row');if(row){hoveredRow=row;updateControl()}},true);mount.addEventListener('pointerleave',event=>{const row=event.target.closest?.('.tools-row');if(row&&hoveredRow===row){hoveredRow=null;row.classList.remove('is-control-peek')}},true);
  }
  function toggleDetails(toolId,trigger){expandedTool=expandedTool===toolId?'':toolId;commitFilters({focus:trigger});if(expandedTool)requestAnimationFrame(()=>restoreDeepLink())}
  function restoreDeepLink(scroll=true){if(!expandedTool)return;const row=page.querySelector(`.tools-row[data-tool-id="${CSS.escape(expandedTool)}"]`);if(!row)return;row.setAttribute('aria-current','true');if(scroll)row.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});requestAnimationFrame(()=>row.querySelector('.tools-details-button')?.focus({preventScroll:true}))}
  function toggleCompare(toolId,trigger){if(compareIds.includes(toolId))compareIds=compareIds.filter(id=>id!==toolId);else if(compareIds.length<3)compareIds.push(toolId);else{const live=page.querySelector('#toolsLive');if(live)live.textContent='Comparison is limited to three tools.';return}trigger.setAttribute('aria-pressed',compareIds.includes(toolId)?'true':'false');trigger.textContent=compareIds.includes(toolId)?'PINNED FOR COMPARE':'COMPARE';updateCompareBar(page.querySelector('.tools-compare-bar'))}
  function updateCompareBar(bar){if(!bar)return;bar.hidden=!compareIds.length;const label=bar.querySelector('p');if(label)label.replaceChildren(text('b','',`${compareIds.length} / 3`),' TOOLS PINNED · exact fields only')}
  function copyText(value){if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(value).then(()=>true).catch(()=>false);const input=node('textarea',{value});input.style.position='fixed';input.style.opacity='0';document.body.append(input);input.select();let ok=false;try{ok=document.execCommand('copy')}catch(error){}input.remove();return Promise.resolve(ok)}
  function copyDeepLink(toolId,button){const url=`${location.origin}${location.pathname}#/tools/${activeSlug}?tool=${encodeURIComponent(toolId)}`;copyText(url).then(ok=>{button.textContent=ok?'COPIED':'COPY FAILED';setTimeout(()=>{if(button.isConnected)button.textContent='COPY DEEP LINK'},1400)})}

  function showHoverdoc(toolId,trigger,{pinned=false}={}){
    const chain=chainBySlug().get(activeSlug),placement=chain?.placements.find(item=>item.toolId===toolId),tool=catalog.toolById.get(toolId);if(!chain||!placement||!tool)return;clearTimeout(hoverTimer);closeHoverdoc();hoverPinned=pinned;hoverTrigger=trigger;const name=displayName(tool,placement);
    hoverdoc=node('aside',{class:'tools-hoverdoc',id:'toolsHoverdoc',role:'dialog',ariaLabel:`${name} definition`});const categories=allCategories(tool,placement);hoverdoc.append(node('div',{class:'tools-hoverdoc-meta'},[...categories.map(id=>text('span','tools-chip primary',id)),node('span',{class:'tools-state',dataset:{state:placement.status},text:placement.status}),node('span',{class:'tools-scope',text:placement.scope})]),text('h3','',name),text('p','',tool.summary),text('small','',`CHECKED ${checkedDate(placement)||'NOT DOCUMENTED'} · ${categoryNames(categories).join(' · ')}`));const actions=node('div',{class:'tools-hoverdoc-actions'},[node('button',{type:'button',class:'tools-detail-link',text:'DETAILS',dataset:{hoverDetails:tool.id}}),externalLink('OFFICIAL',tool.officialUrl,'tools-detail-link')]);hoverdoc.append(actions);document.body.append(hoverdoc);trigger.setAttribute('aria-describedby',hoverdoc.id);positionHoverdoc();
    hoverdoc.addEventListener('pointerenter',()=>clearTimeout(hoverTimer));hoverdoc.addEventListener('pointerleave',()=>{if(!hoverPinned)scheduleHoverClose()});hoverdoc.addEventListener('focusout',event=>{if(!hoverdoc?.contains(event.relatedTarget)&&!hoverPinned)scheduleHoverClose()});actions.querySelector('[data-hover-details]').addEventListener('click',()=>{closeHoverdoc();toggleDetails(tool.id,trigger)});
  }
  function positionHoverdoc(){if(!hoverdoc||!hoverTrigger)return;const pos=scope.positionOverlay(hoverTrigger.getBoundingClientRect(),hoverdoc.getBoundingClientRect(),{placement:'bottom',offset:9,padding:12});hoverdoc.style.left=`${pos.left}px`;hoverdoc.style.top=`${pos.top}px`;hoverdoc.dataset.placement=pos.placement}
  function scheduleHoverClose(){clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>{if(!hoverPinned)closeHoverdoc()},160)}
  function closeHoverdoc(){clearTimeout(hoverTimer);if(hoverTrigger){if(hoverTrigger.dataset.definitionId)hoverTrigger.setAttribute('aria-describedby',hoverTrigger.dataset.definitionId);else hoverTrigger.removeAttribute('aria-describedby')}hoverdoc?.remove();hoverdoc=null;hoverTrigger=null;hoverPinned=false}

  function openCompare(trigger=page.querySelector('.tools-compare-open')){
    if(!compareIds.length)return;const chain=chainBySlug().get(activeSlug),entries=compareIds.map(id=>chain.placements.find(placement=>placement.toolId===id)).filter(Boolean).map(placement=>entryFor(chain,placement));if(!entries.length)return;
    const dialog=node('section',{class:'tools-compare-dialog',id:'toolsCompare',ariaLabelledby:'toolsCompareTitle',hidden:true});const close=node('button',{type:'button',ariaLabel:'Close comparison',text:'ESC ×'});dialog.append(node('header',{class:'tools-compare-head'},[text('h2','',`${chain.name} · exact-field comparison`),close]));dialog.querySelector('h2').id='toolsCompareTitle';const scroll=node('div',{class:'tools-compare-scroll'}),table=node('table',{class:'tools-compare-table'}),body=node('tbody');const fields=[['Tool',entry=>displayName(entry.tool,entry.placement)],['Categories',entry=>categoryNames(allCategories(entry.tool,entry.placement)).join(' · ')],['Scope / execution',entry=>[entry.placement.scope,entry.placement.executionLayer].filter(Boolean).join(' · ')],['State',entry=>entry.placement.status],['Access / custody',entry=>[entry.placement.access,entry.placement.custody].filter(Boolean).join(' · ')],['Surfaces',entry=>entry.placement.surfaces.join(' · ')],['Evidence',entry=>entry.placement.evidence.map(item=>`${item.grade} · ${item.checked||'DATE NOT DOCUMENTED'}`).join(' | ')],['Risk / trust fields',entry=>entry.placement.riskFlags.join(' · ')]];fields.forEach(([label,get])=>{const row=node('tr',{},[text('th','',label)]);row.firstChild.scope='row';entries.forEach(entry=>row.append(text('td','',get(entry)||'NOT DOCUMENTED')));body.append(row)});table.append(body);scroll.append(table);dialog.append(scroll);document.body.append(dialog);scope.Overlay.open({element:dialog,trigger,focusTarget:close,modal:true,scrim:true,lockScroll:false,sheet:true,outsideClose:true,onClose:()=>dialog.remove()});close.addEventListener('click',()=>scope.Overlay.close(dialog,{reason:'button'}));
  }

  function veilEnabled(){return scope.LinkVeil.enabled}
  function applyVeil(state={}){if(!shell)return;const enabled=scope.LinkVeil.effective;shell.dataset.linkVeil=enabled?'true':'false';updateControl();if(state.reason==='hold'&&hoveredToolTrigger?.dataset.hoverTool){clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>showHoverdoc(hoveredToolTrigger.dataset.hoverTool,hoveredToolTrigger),120)}if(enabled&&!scope.LinkVeil.controlHeld&&!hoverPinned)closeHoverdoc()}
  function editable(target){return !!target?.closest?.('input,textarea,select,[contenteditable="true"],[role="combobox"]')}
  function updateControl(){page?.querySelectorAll('.is-control-peek').forEach(row=>row.classList.remove('is-control-peek'));if(scope.LinkVeil.controlHeld&&hoveredRow&&scope.LinkVeil.effective)hoveredRow.classList.add('is-control-peek')}
  function clearControl(){page?.querySelectorAll('.is-control-peek').forEach(row=>row.classList.remove('is-control-peek'));if(scope.LinkVeil.effective&&!hoverPinned)closeHoverdoc()}
  function handleRoute(route){const parsed=currentRoute();if(!parsed)return;if(route?.type==='tools-chain'||parsed.type==='tools-chain')renderChain(route?.slug||parsed.slug)&&present(page.querySelector('h1'));else renderDirectory()&&present(page.querySelector('h1'))}
  function restoreFromHistory(){const parsed=currentRoute();if(!parsed){closeForOtherRoute();return}if(parsed.type==='tools-directory'){if(activeView!=='directory'||lastRenderedHash!==location.hash)renderDirectory();present(page.querySelector('h1'));return}if(activeSlug!==parsed.slug||lastRenderedHash!==location.hash)renderChain(parsed.slug);present(page.querySelector('h1'))}
  function launch(trigger){routeTrigger=trigger instanceof HTMLElement?trigger:null;return scope.Router.go('/tools')}
  function openChain(slug,toolId=''){routeTrigger=document.activeElement instanceof HTMLElement?document.activeElement:null;return scope.Router.go(`/tools/${slug}${toolId?`?tool=${encodeURIComponent(toolId)}`:''}`)}
  function mount(nextCatalog){if(nextCatalog){catalog=normalizeCatalog(nextCatalog);commandRecords=buildRecords()}if(currentRoute())restoreFromHistory();return {categories:catalog.categories.length,tools:catalog.tools.length,chains:catalog.chains.length,placements:catalog.chains.reduce((sum,chain)=>sum+chain.placements.length,0)}}

  const api={launch,openChain,mount,renderDirectory:()=>renderDirectory()&&present(page?.querySelector('h1')),renderChain:slug=>renderChain(slug)&&present(page?.querySelector('h1')),get records(){return commandRecords.slice()},get data(){return catalog},get activeSlug(){return activeSlug},get veil(){return veilEnabled()}};
  scope.ChainTools=Object.freeze(api);
  if(!ready)return;
  scope.Router.on('tools-directory',route=>handleRoute(route));scope.Router.on('tools-chain',route=>handleRoute(route));
  closeButton?.addEventListener('click',()=>scope.Overlay.close(shell,{reason:'button'}));scope.LinkVeil.registerControl(veilButton);scope.LinkVeil.subscribe(state=>applyVeil(state));
  prev?.addEventListener('click',()=>{if(prev.dataset.chainSlug)scope.Router.go('/tools/'+prev.dataset.chainSlug)});next?.addEventListener('click',()=>{if(next.dataset.chainSlug)scope.Router.go('/tools/'+next.dataset.chainSlug)});
  addEventListener('hashchange',restoreFromHistory);addEventListener('popstate',restoreFromHistory);addEventListener('resize',positionHoverdoc,{passive:true});shell.addEventListener('scroll',positionHoverdoc,{passive:true});
  addEventListener('keydown',event=>{if(event.key==='Escape'&&hoverdoc&&scope.Overlay.top()?.element===shell){event.preventDefault();event.stopPropagation();closeHoverdoc();return}if(event.key==='/'&&activeView==='directory'&&!editable(event.target)&&!event.metaKey&&!event.ctrlKey&&!event.altKey&&scope.Overlay.top()?.element===shell){event.preventDefault();page.querySelector('#toolsGlobalQuery')?.focus()}},{capture:true});
  addEventListener('blur',()=>{clearControl();closeHoverdoc()});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearControl();closeHoverdoc()}});document.addEventListener('pointerdown',event=>{if(hoverPinned&&hoverdoc&&!hoverdoc.contains(event.target)&&event.target!==hoverTrigger)closeHoverdoc()},{capture:true});
  applyVeil();
})(window.SCOPE=window.SCOPE||{});
