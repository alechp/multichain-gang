#!/usr/bin/env node
import {readFileSync,existsSync} from 'node:fs';
import {launchAuditBrowser,targetUrl} from './audit-helpers.mjs';

const failures=[];
const check=(condition,message)=>{if(!condition)failures.push(message)};
const source=readFileSync('index.html','utf8');
const chromeSource=existsSync('scripts/global-chrome.js')?readFileSync('scripts/global-chrome.js','utf8'):'';
const chainSource=readFileSync('scripts/chain-index.js','utf8');
const toolsSource=readFileSync('scripts/chain-tools.js','utf8');
const chromeCss=existsSync('styles/global-chrome.css')?readFileSync('styles/global-chrome.css','utf8'):'';

check((source.match(/class="slotbar"/g)||[]).length===1,'static: global slotbar is not byte-unique');
check(source.includes('id="scopeHome"')&&source.includes('id="scopeSkip"'),'static: home or skip control missing');
check(source.includes('id="entityVeil"'),'static: entity Link Veil slot missing');
check(source.includes('scripts/global-chrome.js')&&source.includes('styles/global-chrome.css'),'static: global chrome assets are not loaded');
for(const needle of ['scope.LinkVeil=LinkVeil','scope.GlobalChrome=api','ResizeObserver','--scope-global-h','scope.linkVeil','chain.linkVeil','canPointerPreview','registerControl','setHotkey','scopeVeilSettings','positionChainsMenu'])check(chromeSource.includes(needle),`static: global controller omits ${needle}`);
check(!/Store\.create\(['"]chain\.linkVeil/.test(chainSource+toolsSource),'static: a route renderer still owns the legacy Link Veil store');
check(!/key===['"]Control['"]/.test(chainSource+toolsSource),'static: a route renderer still owns a global Control listener');
check((chainSource.match(/modal:false/g)||[]).length>=1&&(toolsSource.match(/modal:false/g)||[]).length>=1&&source.includes('modal:false,scrim:false,lockScroll:true'),'static: routed surfaces are not non-modal');
for(const needle of ['.chain-channel,.tools-channel,.entity-channel','inset:var(--scope-global-h) 0 0','.scope-overlay-scrim{z-index:220}','@media(pointer:coarse),(hover:none)'])check(chromeCss.includes(needle),`static: global chrome CSS omits ${needle}`);
check(!/(eth_sendRawTransaction|eth_sendTransaction|wallet_requestPermissions|personal_sign|sendBundle|sendTransaction\s*\()/i.test(chromeSource),'static: chrome controller includes a signing or submission API');

const routeCases=[
  {hash:'#/chains',shell:'#chainChannel',rail:'.chain-slotbar',main:'#chainPage',veil:'#chainVeil'},
  {hash:'#/c/solana',shell:'#chainChannel',rail:'.chain-slotbar',main:'#chainPage',veil:'#chainVeil'},
  {hash:'#/tools',shell:'#toolsChannel',rail:'.tools-slotbar',main:'#toolsPage',veil:'#toolsVeil'},
  {hash:'#/tools/solana',shell:'#toolsChannel',rail:'.tools-slotbar',main:'#toolsPage',veil:'#toolsVeil'},
  {hash:'#/e/sol',shell:'#entityChannel',rail:'.entity-slotbar',main:'#entityPage',veil:'#entityVeil'}
];

async function openPage(browser,width,{touch=false,javaScriptEnabled=true}={}){
  const context=await browser.newContext({viewport:{width,height:920},hasTouch:touch,isMobile:touch,javaScriptEnabled,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route(/^https?:\/\//,route=>route.abort('blockedbyclient'));
  await page.goto(targetUrl,{waitUntil:'load'});
  if(javaScriptEnabled)await page.evaluate(()=>{document.documentElement.dataset.scopeUnlocked='audit'});
  await page.waitForTimeout(100);return {context,page,errors};
}

async function auditWidth(browser,width){
  const touch=width<=430,{context,page,errors}=await openPage(browser,width,{touch});
  try{
    await page.evaluate(()=>{document.querySelector('.slotbar').dataset.persistenceProbe='same-node'});
    const root=await page.evaluate(()=>{
      const header=document.querySelector('.slotbar'),chapters=Array.from(document.querySelectorAll('.chapter-subnav a'));
      const controls=Array.from(document.querySelectorAll('[data-link-veil-control]')).filter(node=>node.getClientRects().length);
      const cluster=document.getElementById('globalVeil')?.closest('.scope-veil-cluster');
      return {header:header.getBoundingClientRect(),chapters:chapters.length,chaptersVisible:chapters.every(node=>node.getClientRects().length),controls:controls.map(node=>node.id),settings:Array.from(document.querySelectorAll('.scope-veil-settings-button')).filter(node=>node.getClientRects().length).length,clusterWidth:cluster?.getBoundingClientRect().width,globalDisabled:document.getElementById('globalVeil')?.disabled,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
    });
    check(root.header.top===0&&root.header.height>0,`${width}px root: global header is not fixed at viewport top`);
    check(root.chapters===5&&root.chaptersVisible,`${width}px root: chapter sub-navigation is incomplete`);
    check(root.controls.join(',')==='globalVeil',`${width}px root: visible Link Veil slots differ ${root.controls.join(',')}`);
    check(root.settings===1&&root.clusterWidth<160,`${width}px root: compact Veil/settings cluster differs ${JSON.stringify({settings:root.settings,width:root.clusterWidth})}`);
    check(touch?root.globalDisabled:!root.globalDisabled,`${width}px root: Link Veil capability state differs`);
    check(root.overflow<=1,`${width}px root: ${root.overflow}px document overflow`);
    if(width===360){
      await page.locator('#globalVeil').locator('xpath=..').locator('.scope-veil-settings-button').click();await page.waitForTimeout(30);
      const mobileDialog=await page.evaluate(()=>{const panel=document.getElementById('scopeVeilSettings')?.getBoundingClientRect(),actions=document.querySelector('.scope-veil-dialog-actions')?.getBoundingClientRect();return {panel:panel?.toJSON(),actions:actions?.toJSON(),viewport:innerHeight}});
      check(mobileDialog.panel&&mobileDialog.panel.bottom<=mobileDialog.viewport+1&&mobileDialog.actions?.bottom<=mobileDialog.viewport+1,`360px root: settings sheet/actions escape the viewport ${JSON.stringify(mobileDialog)}`);
      await page.keyboard.press('Escape');
    }

    for(const item of routeCases){
      await page.evaluate(hash=>{location.hash=hash},item.hash);await page.waitForTimeout(100);
      const result=await page.evaluate(item=>{
        const header=document.querySelector('.slotbar'),shell=document.querySelector(item.shell),rail=document.querySelector(item.rail),main=document.querySelector(item.main),heading=main.querySelector('h1,h2'),controls=Array.from(document.querySelectorAll('[data-link-veil-control]')).filter(node=>node.getClientRects().length);
        const hb=header.getBoundingClientRect(),sb=shell.getBoundingClientRect(),rb=rail.getBoundingClientRect(),mb=heading?.getBoundingClientRect();
        return {hash:location.hash,persistent:header.dataset.persistenceProbe,header:hb,shell:sb,rail:rb,heading:mb,controls:controls.map(node=>({id:node.id,disabled:node.disabled,tabIndex:node.tabIndex,width:node.closest('.scope-veil-cluster')?.getBoundingClientRect().width})),settings:Array.from(document.querySelectorAll('.scope-veil-settings-button')).filter(node=>node.getClientRects().length).length,modal:shell.getAttribute('aria-modal'),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,chapters:Array.from(document.querySelectorAll('.chapter-subnav a')).filter(node=>node.getClientRects().length).length};
      },item);
      check(result.hash===item.hash,`${width}px ${item.hash}: route hash differs`);
      check(result.persistent==='same-node',`${width}px ${item.hash}: global header DOM instance changed`);
      check(result.shell.top>=result.header.bottom-1,`${width}px ${item.hash}: route shell overlaps the global header`);
      check(result.rail.top>=result.shell.top-1,`${width}px ${item.hash}: context rail is not below the global header`);
      check(result.heading&&result.heading.top>=result.rail.bottom-1,`${width}px ${item.hash}: route heading is obscured by chrome`);
      check(result.controls.length===1&&result.controls[0].id===item.veil.slice(1),`${width}px ${item.hash}: visible Link Veil slots differ ${JSON.stringify(result.controls)}`);
      check(result.settings===1&&result.controls[0]?.width<160,`${width}px ${item.hash}: compact Veil/settings cluster differs`);
      check(touch?result.controls[0]?.disabled:!result.controls[0]?.disabled,`${width}px ${item.hash}: Veil capability state differs`);
      check(result.modal===null,`${width}px ${item.hash}: routed surface still traps global navigation as modal`);
      check(result.chapters===5,`${width}px ${item.hash}: chapter navigation disappeared`);
      check(result.overflow<=1,`${width}px ${item.hash}: ${result.overflow}px document overflow`);
    }
    errors.forEach(error=>failures.push(`${width}px page error: ${error}`));
  }finally{await context.close()}
}

async function auditInteractions(browser){
  const {context,page,errors}=await openPage(browser,1200);
  try{
    await page.locator('.chain-launch').click();await page.waitForTimeout(30);
    const menuGeometry=await page.evaluate(()=>{const trigger=document.querySelector('.chain-launch').getBoundingClientRect(),menu=document.getElementById('chainSubnavMenu').getBoundingClientRect();return {triggerLeft:trigger.left,menuLeft:menu.left,menuTop:menu.top,headerBottom:document.querySelector('.slotbar').getBoundingClientRect().bottom}});
    check(Math.abs(menuGeometry.triggerLeft-menuGeometry.menuLeft)<=1&&menuGeometry.menuTop>=menuGeometry.headerBottom,`interaction: Chains menu is not anchored below its trigger ${JSON.stringify(menuGeometry)}`);await page.keyboard.press('Escape');

    await page.locator('#globalVeil').locator('xpath=..').locator('.scope-veil-settings-button').click();await page.waitForTimeout(30);
    check(await page.locator('#scopeVeilSettings').isVisible(),'interaction: Veil settings dialog did not open');
    await page.locator('label.scope-veil-mode').click();await page.locator('label.scope-veil-hotkey:has(input[value="Alt"])').click();await page.locator('.scope-veil-apply').click();await page.waitForTimeout(40);
    check(await page.evaluate(()=>SCOPE.LinkVeil.enabled&&SCOPE.LinkVeil.hotkey==='Alt'),'interaction: configured Veil state/hotkey did not persist in the controller');
    const altTerm=page.locator('#ch1 .term').first();await altTerm.hover();await page.keyboard.down('Control');await page.waitForTimeout(150);
    check(!await page.locator('#refCard').isVisible(),'interaction: old Control chord still reveals after selecting Alt');await page.keyboard.up('Control');
    await page.keyboard.down('Alt');await page.waitForTimeout(150);check(await page.locator('#refCard').isVisible(),'interaction: configured Alt chord did not reveal Hoverdoc');await page.keyboard.up('Alt');await page.waitForTimeout(30);
    check(!await page.locator('#refCard').isVisible(),'interaction: configured hotkey release did not conceal Hoverdoc');

    await page.evaluate(()=>{SCOPE.LinkVeil.setHotkey('Control',{announce:false});SCOPE.LinkVeil.set(false,{announce:false})});
    await page.locator('#globalVeil').click();
    const term=page.locator('#ch1 .term').first();await term.hover();await page.waitForTimeout(170);
    check(!await page.locator('#refCard').isVisible(),'interaction: root Hoverdoc bypasses Link Veil without Control');
    await page.keyboard.down('Control');await page.waitForTimeout(160);
    check(await page.locator('#refCard').isVisible(),'interaction: root Control chord did not reveal Hoverdoc');
    await page.keyboard.up('Control');await page.waitForTimeout(40);
    check(!await page.locator('#refCard').isVisible(),'interaction: Control release did not conceal Hoverdoc');
    await term.focus();await page.waitForTimeout(170);
    check(await page.locator('#refCard').isVisible(),'interaction: keyboard focus did not bypass Link Veil');
    await page.locator('#scopeHome').focus();await page.waitForTimeout(130);

    await page.evaluate(()=>SCOPE.Router.go('/e/sol'));await page.waitForTimeout(100);
    check(await page.locator('#entityVeil').getAttribute('aria-pressed')==='true','interaction: entity route did not inherit Link Veil state');
    await page.locator('#scopeSkip').focus();await page.keyboard.press('Enter');await page.waitForTimeout(20);
    check(await page.evaluate(()=>document.activeElement?.id)==='entityPage','interaction: skip link did not focus the active route main');
    await page.locator('.chain-launch').click();await page.waitForTimeout(30);await page.keyboard.press('Escape');await page.waitForTimeout(30);
    check(await page.locator('#chainSubnavMenu').isHidden()&&await page.locator('#entityChannel').isVisible(),'interaction: Chains Escape closed the underlying route');

    await page.evaluate(()=>SCOPE.Router.go('/tools/solana'));await page.waitForTimeout(110);
    await page.locator('.cmd-launch').click();await page.waitForTimeout(40);check(await page.locator('#scopeCommand').isVisible(),'interaction: Find did not layer above tools route');
    await page.keyboard.press('Escape');await page.waitForTimeout(40);check(await page.locator('#toolsChannel').isVisible(),'interaction: closing Find closed the tools route');

    await page.evaluate(()=>SCOPE.Router.go('/e/sol'));await page.waitForTimeout(90);
    await page.locator('.chapter-subnav a[href="#ch4"]').click();await page.waitForTimeout(180);
    check(await page.evaluate(()=>location.hash)==='#ch4','interaction: routed chapter navigation did not land on CH-04');
    check(await page.locator('#entityChannel').isHidden(),'interaction: routed chapter navigation left entity shell open');
    check(await page.evaluate(()=>document.activeElement?.id)==='ch4','interaction: routed chapter navigation did not focus CH-04');

    await page.evaluate(()=>SCOPE.Router.go('/c/ethereum'));await page.waitForTimeout(100);await page.locator('#scopeHome').click();await page.waitForTimeout(100);
    check(await page.evaluate(()=>location.hash)===''&&await page.locator('#chainChannel').isHidden(),'interaction: brand/home did not return to root');
    errors.forEach(error=>failures.push(`interaction page error: ${error}`));
  }finally{await context.close()}
}

const browser=await launchAuditBrowser();
try{
  for(const width of [360,390,430,768,1200])await auditWidth(browser,width);
  await auditInteractions(browser);
  const {context,page}=await openPage(browser,1200,{javaScriptEnabled:false});
  const noJs=await page.evaluate(()=>({header:!!document.querySelector('.slotbar')?.getClientRects().length,chapters:document.querySelectorAll('.chapter-subnav a').length,links:document.querySelectorAll('noscript a[href]').length,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}));
  check(noJs.header&&noJs.chapters===5&&noJs.links>20,'no-JS: persistent documentation/navigation fallback is incomplete');check(noJs.overflow<=1,`no-JS: ${noJs.overflow}px overflow`);await context.close();
}finally{await browser.close()}

if(failures.length){console.error(`GLOBAL CHROME FAIL (${failures.length})`);failures.forEach(failure=>console.error('- '+failure));process.exitCode=1;throw new Error('GLOBAL CHROME AUDIT FAILED')}
console.log('GLOBAL CHROME PASS — one persistent header, route-local rails, universal Link Veil, responsive/touch continuity, overlay escape order, route-to-chapter navigation, home return, and JavaScript-off fallbacks pass.');
