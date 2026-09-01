#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { launchAuditBrowser, targetUrl } from './audit-helpers.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const failures=[];
const expectedCategories=[
  ['CT-01','Launch and issuance'],['CT-02','Spot DEX and liquidity'],['CT-03','Aggregation, routing, and intents'],
  ['CT-04','Derivatives and prediction'],['CT-05','Lending, borrowing, and stablecoins'],['CT-06','Yield, vaults, and strategy'],
  ['CT-07','Staking, restaking, and validation'],['CT-08','Pricing, oracles, and market data'],['CT-09','Analytics, indexing, and exploration'],
  ['CT-10','Charting, portfolio, and discovery'],['CT-11','Wallets, accounts, and custody'],['CT-12','Bridges and interoperability'],
  ['CT-13','MEV, order flow, and execution'],['CT-14','Security, risk, and compliance'],['CT-15','SocialFi, identity, and consumer'],
  ['CT-16','Developer infrastructure'],['CT-17','Collectibles and marketplaces']
];
const expectedChains={
  solana:{chainId:'sol',name:'Solana',count:61},
  ethereum:{chainId:'eth',name:'Ethereum',count:67},
  'bnb-chain':{chainId:'bnb',name:'BNB Chain',count:55},
  bitcoin:{chainId:'btc',name:'Bitcoin',count:49},
  zcash:{chainId:'zec',name:'Zcash',count:31},
  'robinhood-chain':{chainId:'robinhood_chain',name:'Robinhood Chain',count:37}
};
const chainSlugs=Object.keys(expectedChains);
const expectedRoutes=['#/tools',...chainSlugs.map(slug=>`#/tools/${slug}`)];
const isoDate=/^\d{4}-\d{2}-\d{2}$/;

const fail=message=>failures.push(message);
const check=(condition,message)=>{if(!condition)fail(message)};
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const exists=relative=>fs.existsSync(path.join(root,relative));
const json=relative=>JSON.parse(read(relative));
const compact=value=>String(value??'').replace(/\s+/g,' ').trim();
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const safeHttps=value=>{
  try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!!url.hostname}catch{return false}
};
const decode=value=>String(value??'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g,' ');

function collectNoJsRows(source){
  const rows=new Map();
  const pattern=/<tr\s+data-placement-id="([^"]+)"[^>]*>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>[\s\S]*?<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>\s*<a\s+href="([^"]+)"/g;
  for(const match of source.matchAll(pattern))rows.set(decode(match[1]),{name:compact(decode(match[2])),scope:compact(decode(match[3])),status:compact(decode(match[4])),href:decode(match[5])});
  return rows;
}

function recursivelyFrozen(value,seen=new Set()){
  if(!value||typeof value!=='object'||seen.has(value))return true;
  seen.add(value);
  return Object.isFrozen(value)&&Object.getOwnPropertyNames(value).every(key=>recursivelyFrozen(value[key],seen));
}

const required=[
  'multichain/solana/index.html','styles/chain-tools.css','scripts/chain-tools.js','data/chain-tools/taxonomy.json',
  'data/chain-tools/canonical-tools.json','data/chain-tools/catalog.js','data/chain-tools/noscript.html',
  ...chainSlugs.map(slug=>`data/chain-tools/${slug}.json`)
];
for(const relative of required)check(exists(relative),`static: missing ${relative}`);

let taxonomy,canonical,chains,manifest,catalog;
try{if(exists('data/chain-tools/taxonomy.json'))taxonomy=json('data/chain-tools/taxonomy.json')}catch(error){fail(`static: taxonomy JSON parse failed: ${error.message}`)}
try{if(exists('data/chain-tools/canonical-tools.json'))canonical=json('data/chain-tools/canonical-tools.json')}catch(error){fail(`static: canonical-tools JSON parse failed: ${error.message}`)}
try{manifest=json('assets/chain-tools/manifest.json')}catch(error){fail(`static: asset manifest parse failed: ${error.message}`)}
chains={};
for(const slug of chainSlugs){
  try{if(exists(`data/chain-tools/${slug}.json`))chains[slug]=json(`data/chain-tools/${slug}.json`)}catch(error){fail(`static: ${slug}.json parse failed: ${error.message}`)}
}

if(taxonomy){
  check(same(taxonomy.categories?.map(({id,name})=>[id,name]),expectedCategories),'static: taxonomy is not the exact CT-01…CT-17 ID/label sequence');
  check(new Set(taxonomy.categories?.map(item=>item.id)).size===17,'static: taxonomy category IDs are not unique');
}
const categoryIds=new Set(expectedCategories.map(([id])=>id));
const toolById=new Map();
if(canonical){
  check(canonical.tools?.length===260,`static: canonical catalog has ${canonical.tools?.length??0}/260 tools`);
  for(const tool of canonical.tools||[]){
    check(!toolById.has(tool.id),`static: duplicate canonical tool ID ${tool.id}`);
    toolById.set(tool.id,tool);
    check(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tool.id||''),`static: unsafe canonical tool ID ${tool.id}`);
    check(typeof tool.name==='string'&&tool.name.trim(),`static: ${tool.id} has no name`);
    check(typeof tool.summary==='string'&&tool.summary.trim()&&[...tool.summary].length<=160,`static: ${tool.id} has an invalid short definition`);
    check(Array.isArray(tool.categories)&&tool.categories.length>0&&tool.categories.every(category=>categoryIds.has(category)),`static: ${tool.id} has invalid canonical categories ${JSON.stringify(tool.categories)}`);
    check(safeHttps(tool.officialUrl),`static: ${tool.id} has unsafe officialUrl ${tool.officialUrl}`);
    if(tool.docsUrl)check(safeHttps(tool.docsUrl),`static: ${tool.id} has unsafe docsUrl ${tool.docsUrl}`);
  }
}

const statusValues=new Set(taxonomy?.enums?.status||[]),scopeValues=new Set(taxonomy?.enums?.scope||[]),gradeValues=new Set(taxonomy?.enums?.evidenceGrade||[]);
const placementIds=new Set();
let placementTotal=0;
for(const [slug,expected] of Object.entries(expectedChains)){
  const chain=chains[slug];
  if(!chain)continue;
  check(chain.slug===slug,`static: ${slug} declares slug ${chain.slug}`);
  check(chain.chainId===expected.chainId,`static: ${slug} declares chainId ${chain.chainId}`);
  check(chain.name===expected.name,`static: ${slug} declares name ${chain.name}`);
  check(chain.route===`#/tools/${slug}`,`static: ${slug} has route ${chain.route}`);
  check(chain.hubRoute===`#/c/${slug}`,`static: ${slug} has hub route ${chain.hubRoute}`);
  check(isoDate.test(chain.verified||''),`static: ${slug} has invalid verification date ${chain.verified}`);
  check(chain.placements?.length===expected.count,`static: ${slug} has ${chain.placements?.length??0}/${expected.count} placements`);
  check(same(chain.coverage?.map(item=>item.categoryId),expectedCategories.map(([id])=>id)),`static: ${slug} coverage is not the exact 17-category sequence`);
  check((chain.gaps||[]).length>0,`static: ${slug} has no editorial/native-gap notes`);
  check((chain.sources||[]).length>0,`static: ${slug} has no source rail`);
  for(const source of chain.sources||[])check(safeHttps(source.url),`static: ${slug} has unsafe source ${source.url}`);
  check(typeof chain.visual?.src==='string'&&chain.visual.src.startsWith('assets/chain-tools/')&&!chain.visual.src.includes('..'),`static: ${slug} has unsafe visual path ${chain.visual?.src}`);
  if(chain.visual?.src)check(exists(chain.visual.src),`static: ${slug} visual is dangling: ${chain.visual.src}`);
  for(const coverage of chain.coverage||[]){
    check(categoryIds.has(coverage.categoryId),`static: ${slug} coverage references ${coverage.categoryId}`);
    check(taxonomy?.enums?.coverage?.includes(coverage.level),`static: ${slug}/${coverage.categoryId} has invalid coverage ${coverage.level}`);
  }
  for(const placement of chain.placements||[]){
    placementTotal+=1;
    check(placement.id===`${chain.chainId}:${placement.toolId}`,`static: malformed placement ID ${placement.id}`);
    check(!placementIds.has(placement.id),`static: duplicate placement ID ${placement.id}`);placementIds.add(placement.id);
    check(toolById.has(placement.toolId),`static: ${placement.id} references missing tool ${placement.toolId}`);
    check(typeof placement.displayName==='string'&&placement.displayName.trim(),`static: ${placement.id} has no displayName`);
    check(placement.chainId===chain.chainId,`static: ${placement.id} has wrong chainId ${placement.chainId}`);
    check(Array.isArray(placement.categories)&&placement.categories.length>0,`static: ${placement.id} has no category placement`);
    for(const category of placement.categories||[])check(categoryIds.has(category),`static: ${placement.id} references unknown category ${category}`);
    check(placement.primaryCategory===placement.categories?.[0],`static: ${placement.id} primaryCategory is not first`);
    check(statusValues.has(placement.status),`static: ${placement.id} has invalid status ${placement.status}`);
    check(scopeValues.has(placement.scope),`static: ${placement.id} has invalid scope ${placement.scope}`);
    check(Array.isArray(placement.evidence)&&placement.evidence.length>0,`static: ${placement.id} has no evidence`);
    for(const evidence of placement.evidence||[]){
      check(gradeValues.has(evidence.grade),`static: ${placement.id} has invalid evidence grade ${evidence.grade}`);
      check(isoDate.test(evidence.checked||''),`static: ${placement.id} has invalid checked date ${evidence.checked}`);
      check(safeHttps(evidence.url),`static: ${placement.id} has unsafe evidence URL ${evidence.url}`);
    }
  }
}
check(!Object.keys(chains).length||placementTotal===300,`static: placement total is ${placementTotal}/300`);
check(!canonical||placementTotal===0||new Set([...placementIds].map(id=>id.split(':').slice(1).join(':'))).size<=canonical.tools.length,'static: placement identity accounting is inconsistent');

if(manifest){
  check(same(manifest.assets?.map(item=>item.slug),chainSlugs),'static: asset manifest does not follow the six canonical chains');
  check(manifest.rendering?.decorative===true&&manifest.rendering?.renderedAlt==='', 'static: topology visuals are not declared decorative');
  for(const entry of manifest.assets||[]){
    const expected=expectedChains[entry.slug];
    check(!!expected,`static: manifest has unknown chain ${entry.slug}`);
    check(entry.chain===expected?.name,`static: ${entry.slug} manifest chain label differs`);
    check((entry.derivatives||[]).length===2,`static: ${entry.slug} does not have two responsive derivatives`);
    for(const asset of [entry.source,...(entry.derivatives||[])]){
      check(asset?.path&&!/^https?:/i.test(asset.path)&&!asset.path.includes('..'),`static: ${entry.slug} has unsafe/remote asset dependency ${asset?.path}`);
      if(asset?.path)check(exists(asset.path),`static: dangling asset ${asset.path}`);
    }
    check((entry.derivatives||[]).some(asset=>asset.width===960&&asset.path.endsWith('-960.webp')),`static: ${entry.slug} missing 960w WebP`);
    check((entry.derivatives||[]).some(asset=>asset.width===1440&&asset.path.endsWith('-1440.webp')),`static: ${entry.slug} missing 1440w WebP`);
  }
}

if(exists('data/chain-tools/catalog.js')){
  try{
    const context=vm.createContext({window:{}});
    vm.runInContext(read('data/chain-tools/catalog.js'),context,{filename:'data/chain-tools/catalog.js',timeout:2000});
    catalog=context.window.SCOPE_CHAIN_TOOLS;
    check(!!catalog,'static: catalog.js did not install window.SCOPE_CHAIN_TOOLS');
    check(catalog?.tools?.length===260,`static: generated catalog has ${catalog?.tools?.length??0}/260 tools`);
    check(catalog?.chainOrder?.length===6,`static: generated catalog has ${catalog?.chainOrder?.length??0}/6 chains`);
    check(recursivelyFrozen(catalog),'static: generated catalog is not deeply frozen');
    check(catalog?.chainOrder?.reduce((sum,slug)=>sum+(catalog.chains?.[slug]?.placements?.length||0),0)===300,'static: generated catalog does not expose 300 placements');
  }catch(error){fail(`static: catalog.js execution failed: ${error.message}`)}
}

let html='',css='',uiSource='';
try{html=read('multichain/solana/index.html')}catch(error){fail(`static: Solana index read failed: ${error.message}`)}
if(exists('styles/chain-tools.css'))css=read('styles/chain-tools.css');
if(exists('scripts/chain-tools.js'))uiSource=read('scripts/chain-tools.js');
let commandFoundationCount=0;
if(exists('scripts/command-palette.js')){
  const commandSource=read('scripts/command-palette.js');
  for(const name of ['sections','commands']){
    const body=commandSource.match(new RegExp(`const\\s+${name}=\\[([\\s\\S]*?)\\];`))?.[1]||'';
    commandFoundationCount+=(body.match(/\{id:/g)||[]).length;
  }
  if(/const\s+chainDirectory=\{/.test(commandSource))commandFoundationCount+=1;
  check(commandFoundationCount>0,'static: could not derive the base command index declarations');
}
if(html){
  check(/<article[^>]+id="toolsChannel"/.test(html),'static: #toolsChannel mount is absent');
  check(/<main[^>]+id="toolsPage"/.test(html),'static: #toolsPage mount is absent');
  check(/styles\/chain-tools\.css/.test(html),'static: Chain Tools stylesheet is not registered');
  check(/data\/chain-tools\/catalog\.js[\s\S]*scripts\/chain-tools\.js[\s\S]*scripts\/command-palette\.js/.test(html),'static: catalog/UI/command scripts are absent or ordered incorrectly');
  const footerRoutes=[...html.matchAll(/<a\s+href="(#\/tools(?:\/[a-z0-9-]+)?)"/g)].map(match=>match[1]);
  for(const route of expectedRoutes)check(footerRoutes.includes(route),`static: index.html omits ${route}`);
  check(!/<(?:img|source)[^>]+(?:src|srcset)="https?:/i.test(html),'static: index.html contains a remote raster dependency');
}
if(css){
  for(const token of ['.tools-channel','.tools-atlas','.tools-atlas-card','.tools-table','.tools-hoverdoc','.tools-compare-dialog','data-link-veil="true"','pointer:fine','pointer:coarse','prefers-reduced-motion:reduce','max-width:759px','max-width:520px'])check(css.includes(token),`static: responsive/interaction CSS hook missing ${token}`);
  check(!/url\(\s*['"]?https?:/i.test(css),'static: Chain Tools CSS has a remote asset dependency');
}
if(uiSource){
  for(const needle of ['tools-directory','tools-chain','detailsTool','tools-row','tools-hoverdoc','tools-compare-dialog','scope.LinkVeil','visibilitychange'])check(uiSource.includes(needle),`static: Chain Tools UI hook missing ${needle}`);
  check(!/\.innerHTML\s*=|insertAdjacentHTML|document\.write/i.test(uiSource),'static: Chain Tools data renderer uses HTML-string insertion');
  check(!/\bfetch\s*\(|XMLHttpRequest|new\s+WebSocket|new\s+EventSource/i.test(uiSource),'static: Chain Tools UI adds a live/network data dependency');
}
const prohibited=[
  ['ethereum provider request',/ethereum\s*\.\s*request/i],['wallet provider',/\b(?:walletClient|createWalletClient|wallet_requestPermissions|connectWallet)\b/i],
  ['signing',/\b(?:signTransaction|signMessage|personal_sign|privateKeyToAccount)\b/i],['transaction construction',/\b(?:prepareTransactionRequest|createTransaction|writeContract|deployContract)\b/i],
  ['submission',/\b(?:sendTransaction|sendRawTransaction|eth_sendTransaction|eth_sendRawTransaction|sendBundle)\b/i]
];
for(const relative of ['scripts/chain-tools.js','data/chain-tools/catalog.js',...chainSlugs.map(slug=>`data/chain-tools/${slug}.json`)]){
  if(!exists(relative))continue;const source=read(relative);
  for(const [label,pattern] of prohibited)check(!pattern.test(source),`static: ${relative} contains prohibited ${label} API`);
}

if(canonical&&Object.keys(chains).length===6){
  const expectedNoJs=new Map();
  for(const slug of chainSlugs)for(const placement of chains[slug].placements){
    expectedNoJs.set(placement.id,{name:placement.displayName,scope:placement.scope,status:placement.status,href:placement.evidence[0].url});
  }
  for(const [label,source] of [['generated',exists('data/chain-tools/noscript.html')?read('data/chain-tools/noscript.html'):''],['integrated',html]]){
    const rows=collectNoJsRows(source);
    check(rows.size===300,`static: ${label} JavaScript-off mirror has ${rows.size}/300 placement rows`);
    for(const [id,expected] of expectedNoJs){
      const actual=rows.get(id);if(!actual){fail(`static: ${label} JavaScript-off mirror omits ${id}`);continue}
      for(const key of ['name','scope','status','href'])check(actual[key]===expected[key],`static: ${label} JavaScript-off ${id} ${key} differs (${actual[key]} != ${expected[key]})`);
    }
  }
}

async function openPage(browser,width,{touch=false,reducedMotion='no-preference',javaScriptEnabled=true,deviceScaleFactor=1}={}){
  const context=await browser.newContext({viewport:{width,height:920},reducedMotion,javaScriptEnabled,hasTouch:touch,isMobile:touch,deviceScaleFactor});
  const page=await context.newPage(),errors=[],external=[];
  page.on('pageerror',error=>errors.push(error.message));
  const targetOrigin=new URL(targetUrl).origin;
  await page.route(/^https?:\/\//,route=>{
    const requestUrl=route.request().url();
    if(new URL(requestUrl).origin===targetOrigin)return route.continue();
    external.push(requestUrl);return route.abort('blockedbyclient');
  });
  await page.goto(targetUrl,{waitUntil:'load'});
  if(javaScriptEnabled)await page.evaluate(()=>{document.documentElement.dataset.scopeUnlocked='audit'});
  await page.waitForTimeout(100);
  return {context,page,errors,external};
}

async function routeTools(page,route){
  await page.evaluate(value=>window.SCOPE?.Router?.go?.(value),route.replace(/^#/,'')||'/tools');
  await page.waitForTimeout(100);
}

function runtimeFail(label,error){fail(`runtime: ${label}: ${error instanceof Error?error.message:String(error)}`)}

async function auditCommandsAndNavigation(page){
  const result=await page.evaluate(({slugs,commandFoundationCount})=>{
    const site=JSON.parse(document.getElementById('chainData')?.textContent||'{}');
    const toolRecords=SCOPE.ChainTools?.records||[];
    const expectedSize=commandFoundationCount+Object.keys(site.chainPages||{}).length+Object.keys(site.entities||{}).length+Object.keys(site.terms||{}).length+(site.cues||[]).length+toolRecords.length;
    const expectedToolRecords=1+SCOPE.ChainTools.data.chains.length+SCOPE.ChainTools.data.chains.reduce((sum,chain)=>sum+chain.placements.length,0);
    const recordsByKind=toolRecords.reduce((out,item)=>(out[item.kind]=(out[item.kind]||0)+1,out),{});
    const toolRecordCoverage=toolRecords.filter(item=>item.kind==='tool').every(record=>SCOPE.ChainTools.data.chains.find(chain=>chain.slug===record.slug)?.placements.some(placement=>placement.toolId===record.toolId));
    const commandRoutes={directory:SCOPE.CommandPalette?.search('Chain Tools')?.some(item=>item.kind==='tools-directory')||false,chains:{},tool:false};
    for(const slug of slugs){const chain=SCOPE.ChainTools.data.chains.find(item=>item.slug===slug);commandRoutes.chains[slug]=SCOPE.CommandPalette?.search(`${chain.name} tools`)?.some(item=>item.kind==='tools-chain'&&item.slug===slug)||false}
    const first=SCOPE.ChainTools.data.chains[0].placements[0],tool=SCOPE.ChainTools.data.toolById.get(first.toolId);
    commandRoutes.tool=SCOPE.CommandPalette?.search(tool.name)?.some(item=>item.kind==='tool'&&item.slug==='solana'&&item.toolId===first.toolId)||false;
    const footer=Array.from(document.querySelectorAll('.footer-tools-nav a')).map(link=>link.getAttribute('href'));
    return {size:SCOPE.CommandPalette?.size,expectedSize,expectedToolRecords,records:toolRecords.length,unique:new Set(toolRecords.map(item=>item.id)).size,toolRecordCoverage,recordsByKind,commandRoutes,footer};
  },{slugs:chainSlugs,commandFoundationCount});
  check(result.size===result.expectedSize,`runtime: command index is ${result.size}/${result.expectedSize}; expected value is derived from live base + Chain Tools records`);
  check(result.records===result.expectedToolRecords,`runtime: Chain Tools exposes ${result.records}/${result.expectedToolRecords} command records`);
  check(result.unique===result.records&&result.toolRecordCoverage,`runtime: Chain Tools command IDs/routes are duplicate or dangling (${result.unique}/${result.records} unique)`);
  check(result.recordsByKind['tools-directory']===1&&result.recordsByKind['tools-chain']===chainSlugs.length&&result.recordsByKind.tool===placementTotal,`runtime: command kinds differ ${JSON.stringify(result.recordsByKind)}`);
  check(result.commandRoutes.directory&&Object.values(result.commandRoutes.chains).every(Boolean)&&result.commandRoutes.tool,`runtime: command palette route coverage differs ${JSON.stringify(result.commandRoutes)}`);
  check(same(result.footer,expectedRoutes),`runtime: footer tooling routes differ ${JSON.stringify(result.footer)}`);
  for(const slug of chainSlugs){
    await page.evaluate(value=>SCOPE.Router.go(`/c/${value}`),slug);await page.waitForTimeout(70);
    const href=await page.locator(`.chain-actions a[href="#/tools/${slug}"]`).getAttribute('href').catch(()=>null);
    check(href===`#/tools/${slug}`,`runtime: ${slug} chain hub omits its Tool landscape route`);
  }
}

async function auditWidth(browser,width){
  const touch=width<=430,{context,page,errors}=await openPage(browser,width,{touch});
  try{
    await routeTools(page,'#/tools');
    await page.waitForSelector('#toolsChannel:not([hidden]) .tools-directory',{timeout:2500});
    const directory=await page.evaluate(()=>({
      hash:location.hash,view:document.getElementById('toolsChannel')?.dataset.view,cards:document.querySelectorAll('.tools-atlas-card').length,
      routes:Array.from(document.querySelectorAll('.tools-atlas-card a[href^="#/tools/"]')).map(link=>link.getAttribute('href')),
      articleRoutes:Array.from(document.querySelectorAll('.tools-atlas-card a[href^="#/c/"]')).map(link=>link.getAttribute('href')),
      categories:Array.from(document.querySelectorAll('.tools-legend-item')).map(item=>[item.querySelector('b')?.textContent,item.querySelector('span')?.textContent]),
      counts:Array.from(document.querySelectorAll('.tools-atlas-card')).map(card=>Array.from(card.querySelectorAll('.tools-count b')).map(item=>Number(item.textContent))),
      h1:document.querySelectorAll('#toolsPage h1').length,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
    }));
    check(directory.hash==='#/tools'&&directory.view==='directory'&&directory.cards===6,`runtime: ${width}px wrapper route/cards differ ${JSON.stringify(directory)}`);
    check(same(directory.routes,chainSlugs.map(slug=>`#/tools/${slug}`))&&same(directory.articleRoutes,chainSlugs.map(slug=>`#/c/${slug}`)),`runtime: ${width}px atlas card routes differ`);
    check(same(directory.categories,expectedCategories),`runtime: ${width}px wrapper taxonomy differs`);
    const currentCounts=chainSlugs.map(slug=>{const chain=chains[slug],current=chain.placements.filter(item=>item.status==='production');return [
      current.filter(item=>['native-l1','native-l2','app-layer'].includes(item.scope)).length,
      current.filter(item=>['cross-chain','adjacent-layer','offchain-service'].includes(item.scope)).length,
      chain.placements.filter(item=>['beta','testnet'].includes(item.status)).length,
      chain.coverage.filter(item=>item.level==='native-gap').length
    ]});
    check(same(directory.counts,currentCounts),`runtime: ${width}px current/adjacent/preview/gap counts include wrong states or scopes ${JSON.stringify(directory.counts)} != ${JSON.stringify(currentCounts)}`);
    check(directory.h1===1,`runtime: ${width}px wrapper has ${directory.h1} h1 elements`);
    check(directory.overflow<=1,`runtime: ${width}px wrapper has ${directory.overflow}px document overflow`);

    for(const slug of chainSlugs){
      const source=chains[slug],expected=expectedChains[slug];
      await routeTools(page,`#/tools/${slug}`);
      await page.waitForSelector(`#toolsChannel[data-chain="${slug}"] .tools-chain-page`,{timeout:2500});
      const rendered=await page.evaluate(({slug,count})=>{
        const shell=document.getElementById('toolsChannel'),table=document.querySelector('table.tools-table'),rows=Array.from(document.querySelectorAll('tr.tools-row'));
        const image=document.querySelector('.tools-topology img'),small=document.querySelector('.tools-topology source');
        return {hash:location.hash,view:shell?.dataset.view,chain:shell?.dataset.chain,h1:document.querySelector('#toolsPage h1')?.textContent.trim(),h1Count:document.querySelectorAll('#toolsPage h1').length,
          coverage:document.querySelectorAll('.tools-coverage-rail [data-category][data-level]').length,table:table?.tagName,caption:table?.querySelector('caption')?.textContent||'',headers:Array.from(table?.querySelectorAll('thead th')||[]).map(item=>({text:item.textContent,scope:item.scope,sort:item.getAttribute('aria-sort')})),
          rows:rows.length,rowIds:rows.map(row=>row.dataset.toolId),adjacent:rows.every(row=>row.nextElementSibling?.classList.contains('tools-detail-row')&&row.querySelector('[data-details-tool]')?.getAttribute('aria-controls')===row.nextElementSibling.id),
          result:document.getElementById('toolsResultCount')?.textContent||'',summaryVisible:!!document.querySelector('.tools-filter-disclosure>summary')?.getClientRects().length,
          cellsLabeled:rows.every(row=>Array.from(row.cells).every(cell=>!!cell.dataset.label)),detailsTarget:rows[0]?.querySelector('[data-details-tool]')?getComputedStyle(rows[0].querySelector('[data-details-tool]')).minHeight:'',
          image:{small:small?.getAttribute('srcset'),large:image?.getAttribute('src'),alt:image?.getAttribute('alt'),naturalWidth:image?.naturalWidth||0,caption:document.querySelector('.tools-caption')?.textContent||''},
          unsafeLinks:Array.from(shell?.querySelectorAll('a[href]')||[]).map(link=>({href:link.getAttribute('href'),target:link.target,rel:link.rel,text:link.textContent,aria:link.getAttribute('aria-label')})).filter(link=>link.href.startsWith('#/')?false:!(link.href.startsWith('https://')&&link.target==='_blank'&&/noopener/.test(link.rel)&&(/↗/.test(link.text)||/opens official site/i.test(link.aria||'')))),
          remoteImages:Array.from(shell?.querySelectorAll('img,source')||[]).map(node=>node.getAttribute('src')||node.getAttribute('srcset')).filter(value=>/^https?:/i.test(value||'')),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,total:count
        };
      },{slug,count:expected.count});
      const active=source.placements;
      check(rendered.hash===`#/tools/${slug}`&&rendered.view==='chain'&&rendered.chain===slug,`runtime: ${width}px/${slug} route state differs ${JSON.stringify({hash:rendered.hash,view:rendered.view,chain:rendered.chain})}`);
      check(rendered.h1===`${expected.name} tools`&&rendered.h1Count===1,`runtime: ${width}px/${slug} h1 differs (${rendered.h1})`);
      check(rendered.coverage===17,`runtime: ${width}px/${slug} has ${rendered.coverage}/17 coverage cells`);
      check(rendered.table==='TABLE'&&rendered.headers.length===7&&rendered.headers.every(item=>item.scope==='col'),`runtime: ${width}px/${slug} semantic table/header contract differs`);
      check(rendered.caption.includes(`${active.length} of ${expected.count}`)&&rendered.result.includes(`/ ${expected.count} RESULTS`),`runtime: ${width}px/${slug} shown/total accounting differs (${rendered.result}; ${compact(rendered.caption)})`);
      check(rendered.rows===active.length&&rendered.adjacent,`runtime: ${width}px/${slug} renders ${rendered.rows}/${active.length} default rows or non-adjacent details`);
      const placementNames=new Map(active.map(item=>[item.toolId,item.displayName]));
      const renderedNames=await page.evaluate(()=>Array.from(document.querySelectorAll('.tools-row')).map(row=>[row.dataset.toolId,row.querySelector('.tools-name')?.textContent.trim()]));
      check(renderedNames.every(([id,name])=>placementNames.get(id)===name),`runtime: ${width}px/${slug} row display names differ from placement displayName`);
      check(rendered.image.small?.endsWith(`assets/chain-tools/${slug}-landscape-960.webp`)&&rendered.image.large?.endsWith(`assets/chain-tools/${slug}-landscape-1440.webp`)&&rendered.image.alt===''&&rendered.image.naturalWidth>0&&/CONCEPTUAL TOPOLOGY/i.test(rendered.image.caption),`runtime: ${width}px/${slug} responsive decorative visual differs ${JSON.stringify(rendered.image)}`);
      check(!rendered.unsafeLinks.length&&!rendered.remoteImages.length,`runtime: ${width}px/${slug} has unsafe links/assets ${JSON.stringify({links:rendered.unsafeLinks,images:rendered.remoteImages})}`);
      check(rendered.detailsTarget==='44px',`runtime: ${width}px/${slug} details target is ${rendered.detailsTarget}, not 44px`);
      if(width<=430)check(rendered.summaryVisible&&rendered.cellsLabeled,`runtime: ${width}px/${slug} mobile disclosure/card labels are incomplete`);
      if(width===768)check(rendered.table==='TABLE',`runtime: 768px/${slug} no longer preserves table semantics`);
      check(rendered.overflow<=1,`runtime: ${width}px/${slug} has ${rendered.overflow}px document overflow`);
    }
    errors.forEach(error=>fail(`runtime: ${width}px page error: ${error}`));
  }finally{await context.close()}
}

async function auditInteractions(browser){
  const {context,page,errors}=await openPage(browser,1200);
  try{
    await auditCommandsAndNavigation(page);
    await routeTools(page,'#/tools/solana');await page.waitForSelector('.tools-row');
    const source=chains.solana;
    const visible=source.placements;
    const first=visible[0],firstName=first.displayName;
    await page.locator('#toolsQuery').fill(firstName);await page.waitForTimeout(180);
    const searched=await page.evaluate(()=>({rows:document.querySelectorAll('.tools-row').length,ids:Array.from(document.querySelectorAll('.tools-row')).map(row=>row.dataset.toolId),hash:location.hash,live:document.getElementById('toolsLive')?.textContent}));
    check(searched.rows===1&&searched.ids[0]===first.toolId&&new URLSearchParams(searched.hash.split('?')[1]).get('q')===firstName,`runtime: search/filter serialization differs ${JSON.stringify(searched)}`);

    await page.locator('.tools-reset').click();await page.waitForTimeout(80);
    const sort=page.locator('select[aria-label="Sort tools"]');await sort.selectOption('name');await page.waitForTimeout(80);
    const sorted=await page.locator('.tools-row .tools-name').allTextContents(),ordered=[...sorted].sort((a,b)=>a.localeCompare(b));
    check(same(sorted,ordered),`runtime: name sort is not deterministic (${sorted.slice(0,4).join(', ')})`);
    check((await page.locator('.tools-table thead th').first().getAttribute('aria-sort'))==='ascending','runtime: name sort does not expose aria-sort=ascending');
    const category=page.locator('input[name="tools-category"][value="CT-01"]');await category.evaluate(input=>{input.closest('details').open=true});await category.check();await page.waitForTimeout(80);
    check(new URLSearchParams((await page.evaluate(()=>location.hash)).split('?')[1]).get('category')==='CT-01','runtime: category filter is not serialized');
    await sort.selectOption('scope');await page.waitForTimeout(70);await page.goBack();await page.waitForTimeout(100);
    const restored=await page.evaluate(()=>({hash:location.hash,sort:document.querySelector('select[aria-label="Sort tools"]')?.value,category:document.querySelector('input[name="tools-category"][value="CT-01"]')?.checked}));
    check(restored.sort==='name'&&restored.category&&/category=CT-01/.test(restored.hash),`runtime: Back did not restore filters/sort ${JSON.stringify(restored)}`);

    const filterCases=[
      {name:'tools-scope',value:'offchain-service',param:'scope',expected:item=>item.scope==='offchain-service'},
      {name:'tools-status',value:'announced',param:'status',expected:item=>item.status==='announced'},
      {name:'tools-surface',value:'api',param:'surface',expected:item=>item.surfaces.includes('api')}
    ];
    for(const test of filterCases){
      await routeTools(page,'#/tools/solana');await page.waitForTimeout(50);
      const control=page.locator(`input[name="${test.name}"][value="${test.value}"]`);await control.evaluate(input=>{input.closest('details').open=true});await control.check();await page.waitForTimeout(70);
      const state=await page.evaluate(()=>({hash:location.hash,ids:Array.from(document.querySelectorAll('.tools-row')).map(row=>row.dataset.toolId)}));
      const param=new URLSearchParams(state.hash.split('?')[1]).get(test.param)||'';
      check(param.split(',').includes(test.value)&&same(state.ids.sort(),source.placements.filter(test.expected).map(item=>item.toolId).sort()),`runtime: ${test.name} filter/state differs ${JSON.stringify(state)}`);
    }
    await routeTools(page,'#/tools/solana');await page.waitForTimeout(50);
    const riskSelect=page.locator('select[aria-label="Filter by risk or trust field"]'),riskValue=await riskSelect.locator('option:not([value=""])').first().getAttribute('value');
    if(riskValue){
      await riskSelect.selectOption(riskValue);await page.waitForTimeout(70);
      const riskState=await page.evaluate(value=>({hash:location.hash,ids:Array.from(document.querySelectorAll('.tools-row')).map(row=>row.dataset.toolId),expected:SCOPE.ChainTools.data.chains.find(item=>item.slug==='solana').placements.filter(item=>item.riskFlags.includes(value)).map(item=>item.toolId)}),riskValue);
      const expectedRisk=riskState.expected.sort();
      check(new URLSearchParams(riskState.hash.split('?')[1]).get('risk')===riskValue&&same(riskState.ids.sort(),expectedRisk),`runtime: risk filter/state differs ${JSON.stringify(riskState)}`);
    }else fail('runtime: risk filter exposes no documented values');

    await routeTools(page,`#/tools/solana?tool=${encodeURIComponent(first.toolId)}`);await page.waitForTimeout(140);
    const deep=await page.evaluate(toolId=>{const row=document.querySelector(`.tools-row[data-tool-id="${CSS.escape(toolId)}"]`),button=row?.querySelector('[data-details-tool]');return {row:!!row,current:row?.getAttribute('aria-current'),expanded:button?.getAttribute('aria-expanded'),focus:document.activeElement===button,title:document.title,detailHidden:row?.nextElementSibling?.hidden}},first.toolId);
    check(deep.row&&deep.current==='true'&&deep.expanded==='true'&&deep.focus&&!deep.detailHidden&&/Solana tools/.test(deep.title),`runtime: deep tool link did not expand/focus/title ${JSON.stringify(deep)}`);

    const trigger=page.locator(`.tools-row[data-tool-id="${first.toolId}"] [data-hover-tool]`);await trigger.hover();await page.waitForTimeout(360);
    let hover=await page.evaluate(({toolId,url})=>{const card=document.querySelector('.tools-hoverdoc:not([hidden])'),trigger=document.querySelector(`[data-hover-tool="${CSS.escape(toolId)}"]`),source=card?.querySelector('a[target="_blank"]'),rect=card?.getBoundingClientRect(),target=trigger?.getBoundingClientRect(),header=document.querySelector('.slotbar')?.getBoundingClientRect(),placement=card?.dataset.placement;return {count:document.querySelectorAll('#toolsHoverdoc').length,visible:!!card,described:trigger?.getAttribute('aria-describedby'),definition:card?.querySelector('p')?.textContent||'',details:!!card?.querySelector('[data-hover-details]'),href:source?.href,rel:source?.rel,text:source?.textContent,placement,adjacent:placement==='bottom'?Math.abs(rect.top-target.bottom-9)<=1:Math.abs(target.top-rect.bottom-9)<=1,viewportSafe:rect.left>=11&&rect.right<=innerWidth-11&&rect.top>=header.bottom+11&&rect.bottom<=innerHeight-11}}, {toolId:first.toolId,url:toolById.get(first.toolId).officialUrl});
    check(hover.count===1&&hover.visible&&hover.described==='toolsHoverdoc'&&hover.definition===toolById.get(first.toolId).summary&&hover.details&&hover.href===new URL(toolById.get(first.toolId).officialUrl).href&&/noopener/.test(hover.rel)&&/↗/.test(hover.text)&&['top','bottom'].includes(hover.placement)&&hover.adjacent&&hover.viewportSafe,`runtime: pointer Hoverdoc contract differs ${JSON.stringify(hover)}`);
    await page.keyboard.press('Escape');check(await page.locator('.tools-hoverdoc:not([hidden])').count()===0,'runtime: Escape did not close Hoverdoc');
    await trigger.focus();await page.waitForTimeout(190);check(await page.locator('.tools-hoverdoc:not([hidden])').count()===1,'runtime: focus did not open Hoverdoc');await page.keyboard.press('Escape');

    const compareTools=visible.slice(0,4).map(item=>item.toolId);
    for(const toolId of compareTools){
      const row=page.locator(`.tools-row[data-tool-id="${toolId}"]`),button=row.locator('[data-details-tool]');
      if(await button.getAttribute('aria-expanded')!=='true'){await button.click();await page.waitForTimeout(45)}
      await page.locator(`[data-compare-tool="${toolId}"]`).click();await page.waitForTimeout(35);
    }
    const compare=await page.evaluate(()=>({pressed:document.querySelectorAll('[data-compare-tool][aria-pressed="true"]').length,label:document.querySelector('.tools-compare-bar')?.textContent||'',live:document.getElementById('toolsLive')?.textContent||''}));
    check(compare.pressed===3&&/3 \/ 3/.test(compare.label)&&/limited to three/i.test(compare.live),`runtime: three-tool compare cap differs ${JSON.stringify(compare)}`);
    await page.locator('.tools-compare-open').click();await page.waitForTimeout(50);
    const tray=await page.evaluate(()=>({ids:document.querySelectorAll('#toolsCompare').length,visible:!!document.querySelector('.tools-compare-dialog:not([hidden])'),rows:document.querySelectorAll('.tools-compare-table tr').length,shape:Array.from(document.querySelectorAll('.tools-compare-table tr')).every(row=>row.querySelectorAll('td').length===3),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}));
    check(tray.ids===1&&tray.visible&&tray.rows===8&&tray.shape&&tray.overflow<=1,`runtime: comparison tray differs ${JSON.stringify(tray)}`);
    await page.keyboard.press('Escape');await page.waitForTimeout(30);

    await page.locator('#toolsVeil').click();const veilRow=page.locator('.tools-row').first(),details=veilRow.locator('[data-details-tool]'),veilName=veilRow.locator('[data-hover-tool]');await veilName.hover();await page.waitForTimeout(220);
    check(await page.locator('.tools-hoverdoc:not([hidden])').count()===0,'runtime: Link Veil leaves tool Hoverdoc visible without Control');
    const quiet=await details.evaluate(node=>getComputedStyle(node).pointerEvents);check(quiet==='none',`runtime: fine-pointer Link Veil leaves details at ${quiet}`);
    await page.keyboard.down('Control');await page.waitForTimeout(150);check(await veilRow.evaluate(node=>node.classList.contains('is-control-peek')),'runtime: bare Control did not reveal the hovered row');check((await details.evaluate(node=>getComputedStyle(node).pointerEvents))!=='none','runtime: Control peek did not restore details action');check(await page.locator('.tools-hoverdoc:not([hidden])').count()===1,'runtime: Control peek did not reveal tool Hoverdoc');
    await page.keyboard.up('Control');await page.waitForTimeout(30);check(!await veilRow.evaluate(node=>node.classList.contains('is-control-peek')),'runtime: Control keyup did not clear peek');check(await page.locator('.tools-hoverdoc:not([hidden])').count()===0,'runtime: Control keyup did not conceal tool Hoverdoc');
    await details.focus();check((await details.evaluate(node=>getComputedStyle(node).pointerEvents))!=='none','runtime: keyboard focus does not bypass Link Veil');
    await veilRow.hover();await page.keyboard.down('Control');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));check(!await veilRow.evaluate(node=>node.classList.contains('is-control-peek')),'runtime: window blur did not clear Control peek');await page.keyboard.up('Control');
    errors.forEach(error=>fail(`runtime: interaction page error: ${error}`));
  }finally{await context.close()}
}

async function auditTouch(browser){
  const {context,page,errors}=await openPage(browser,390,{touch:true});
  try{
    await routeTools(page,'#/tools/solana');await page.waitForSelector('.tools-row');
    check(await page.locator('#toolsVeil').isVisible()&&await page.locator('#toolsVeil').isDisabled(),'runtime: touch does not expose a disabled Link Veil status control');
    const details=page.locator('.tools-row [data-details-tool]').first();check((await details.evaluate(node=>getComputedStyle(node).pointerEvents))!=='none','runtime: touch layout blocks details action');
    const trigger=page.locator('.tools-row [data-hover-tool]').first();await trigger.tap();await page.waitForTimeout(40);
    check(await page.locator('.tools-hoverdoc:not([hidden])').count()===1,'runtime: touch first tap did not pin a Hoverdoc');
    const deep=page.locator('.tools-hoverdoc [data-hover-details]');check(await deep.isVisible(),'runtime: touch Hoverdoc has no explicit DETAILS action');await deep.tap();await page.waitForTimeout(60);
    check(await page.locator('.tools-row [data-details-tool][aria-expanded="true"]').count()===1,'runtime: touch Hoverdoc DETAILS action did not expand the row');
    errors.forEach(error=>fail(`runtime: touch page error: ${error}`));
  }finally{await context.close()}
}

async function auditReducedMotion(browser){
  const {context,page,errors}=await openPage(browser,768,{reducedMotion:'reduce'});
  try{
    await routeTools(page,'#/tools/ethereum');await page.waitForSelector('.tools-row');
    const motion=await page.evaluate(()=>Array.from(document.querySelectorAll('.tools-page,.tools-signal i,.tools-topology img,.tools-row,.tools-detail-panel,.tools-atlas-card')).map(node=>({name:getComputedStyle(node).animationName,duration:getComputedStyle(node).animationDuration,transition:getComputedStyle(node).transitionDuration})).filter(item=>item.name!=='none'||item.duration.split(',').some(value=>parseFloat(value)>0)||item.transition.split(',').some(value=>parseFloat(value)>0)));
    check(!motion.length,`runtime: reduced motion leaves ${motion.length} animated/transitional Chain Tools nodes`);
    const before=await page.locator('.tools-row').count();await page.locator('#toolsQuery').fill(await page.locator('.tools-name').first().textContent());await page.waitForTimeout(160);const after=await page.locator('.tools-row').count();
    check(before>0&&after===1,'runtime: reduced motion breaks filtering');
    errors.forEach(error=>fail(`runtime: reduced-motion page error: ${error}`));
  }finally{await context.close()}
}

async function auditZoom(browser){
  const {context,page,errors}=await openPage(browser,360,{touch:true,deviceScaleFactor:2});
  try{
    await routeTools(page,'#/tools/bitcoin');await page.waitForSelector('.tools-row');
    const fit=await page.evaluate(()=>({ratio:devicePixelRatio,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,search:!!document.getElementById('toolsQuery')?.getClientRects().length,details:!!document.querySelector('[data-details-tool]')?.getClientRects().length}));
    check(fit.ratio===2&&fit.overflow<=1&&fit.search&&fit.details,`runtime: 200% page-zoom equivalent fit differs ${JSON.stringify(fit)}`);
    errors.forEach(error=>fail(`runtime: 200%-zoom page error: ${error}`));
  }finally{await context.close()}
}

async function auditNoJs(browser,width){
  const {context,page}=await openPage(browser,width,{touch:width<=430,javaScriptEnabled:false});
  try{
    const rendered=await page.evaluate(()=>({sections:Array.from(document.querySelectorAll('.tools-noscript-index section[id^="tools-static-"]')).map(section=>({id:section.id,caption:section.querySelector('caption')?.textContent||'',headers:Array.from(section.querySelectorAll('thead th')).map(item=>item.scope),rows:Array.from(section.querySelectorAll('tbody tr')).map(row=>({id:row.dataset.placementId,name:row.querySelector('th[scope="row"]')?.textContent.trim(),scope:row.cells[2]?.textContent.trim(),status:row.cells[3]?.textContent.trim(),href:row.cells[4]?.querySelector('a')?.href}))})),routes:Array.from(document.querySelectorAll('.tools-noscript-index nav a')).map(link=>link.getAttribute('href')),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}));
    check(rendered.sections.length===6,`runtime: JS-off ${width}px mirror has ${rendered.sections.length}/6 chain sections`);
    check(same(rendered.routes,chainSlugs.map(slug=>`#tools-static-${slug}`)),`runtime: JS-off ${width}px mirror routes differ`);
    for(const section of rendered.sections){
      const slug=section.id.replace('tools-static-',''),source=chains[slug];if(!source){fail(`runtime: JS-off ${width}px has unknown ${section.id}`);continue}
      check(section.rows.length===expectedChains[slug].count,`runtime: JS-off ${width}px/${slug} has ${section.rows.length}/${expectedChains[slug].count} rows`);
      check(section.headers.length===5&&section.headers.every(scope=>scope==='col'),`runtime: JS-off ${width}px/${slug} table headers are not scoped`);
      const byId=new Map(section.rows.map(row=>[row.id,row]));
      for(const placement of source.placements){const row=byId.get(placement.id);if(!row){fail(`runtime: JS-off ${width}px omits ${placement.id}`);continue}check(row.name===placement.displayName&&row.scope===placement.scope&&row.status===placement.status&&row.href===new URL(placement.evidence[0].url).href,`runtime: JS-off ${width}px/${placement.id} exact row differs ${JSON.stringify(row)}`)}
    }
    check(rendered.overflow<=1,`runtime: JS-off ${width}px has ${rendered.overflow}px document overflow`);
  }finally{await context.close()}
}

const runtimeReady=!!(catalog&&canonical&&Object.keys(chains).length===6&&uiSource&&css&&/data-placement-id=/.test(html));
if(!runtimeReady){
  fail('runtime: Playwright matrix skipped because the integrated catalog, UI, stylesheet, or exact no-JavaScript mirror is not present');
}else{
  let browser;
  try{
    browser=await launchAuditBrowser();
    for(const width of [360,390,430,768,1200])await auditWidth(browser,width);
    await auditInteractions(browser);
    await auditTouch(browser);
    await auditReducedMotion(browser);
    await auditZoom(browser);
    await auditNoJs(browser,360);
    await auditNoJs(browser,1200);
  }catch(error){runtimeFail('browser matrix aborted',error)}finally{await browser?.close()}
}

if(failures.length){
  console.error(`CHAIN TOOLS FAIL (${failures.length})`);failures.forEach(message=>console.error(`- ${message}`));
  process.exitCode=1;
}else{
  console.log('CHAIN TOOLS PASS — 17-category / 260-tool / 300-placement catalog, wrapper + six landscapes, exact semantic/no-JS inventories, filters/sort/history/deep links, Hoverdocs, three-tool compare, CTRL Link Veil, responsive/reduced-motion/CDN-blocked/200%-zoom behavior, safe local assets, command/footer/hub routes, overflow, and prohibited APIs pass.');
}
