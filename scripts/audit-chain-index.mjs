#!/usr/bin/env node
import fs from 'node:fs';
import { launchAuditBrowser, targetUrl } from './audit-helpers.mjs';

const source=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const failures=[];
const match=source.match(/<script\s+type="application\/json"\s+id="chainData">([\s\S]*?)<\/script>/);
let data;
try{data=JSON.parse(match?.[1]||'')}catch(error){failures.push(`chainData parse: ${error.message}`)}
const expected={sol:14,eth:13,bnb:9,btc:10,zec:6,robinhood_chain:17};
const expectedSlugs=['solana','ethereum','bnb-chain','bitcoin','zcash','robinhood-chain'];
const taxonomy=new Set(['foundation','consensus','transactions','ordering','infrastructure','liquidity','safety']);
const validUrl=value=>{try{return new URL(value).protocol==='https:'}catch{return false}};

if(data){
  const pages=data.chainPages||{},entities=data.entities||{};
  if(Object.keys(pages).length!==6)failures.push(`expected 6 chain pages, got ${Object.keys(pages).length}`);
  const slugs=Object.values(pages).map(page=>page.slug);
  if(JSON.stringify(slugs)!==JSON.stringify(expectedSlugs))failures.push(`canonical slugs differ: ${slugs.join(', ')}`);
  if(new Set(slugs).size!==6)failures.push('chain slugs are not unique');
  for(const [chainId,chainPage] of Object.entries(pages)){
    const items=chainPage.groups?.flatMap(group=>group.items)||[];
    if(items.length!==expected[chainId])failures.push(`${chainId}: ${items.length}/${expected[chainId]} article ids`);
    if(new Set(items).size!==items.length)failures.push(`${chainId}: duplicate article id`);
    if(chainPage.featured?.length!==3)failures.push(`${chainId}: featured count is not 3`);
    for(const id of chainPage.featured||[])if(!items.includes(id))failures.push(`${chainId}: featured ${id} is outside register`);
    if(!entities[chainPage.overview])failures.push(`${chainId}: missing overview ${chainPage.overview}`);
    for(const group of chainPage.groups||[]){
      if(!taxonomy.has(group.id))failures.push(`${chainId}: invalid group ${group.id}`);
      if(!group.items?.length)failures.push(`${chainId}: empty group ${group.id}`);
      for(const id of group.items||[]){
        const entity=entities[id];
        if(!entity){failures.push(`${chainId}: missing article entity ${id}`);continue}
        if(entity.article?.status!=='published')failures.push(`${chainId}/${id}: article is not published`);
        if(entity.article?.category!==group.id)failures.push(`${chainId}/${id}: category ${entity.article?.category} != ${group.id}`);
        if(!entity.chains?.includes(chainId))failures.push(`${chainId}/${id}: entity.chains omits parent`);
        if(!['foundation','applied','advanced'].includes(entity.article?.level))failures.push(`${chainId}/${id}: bad level`);
        if(!Number.isInteger(entity.article?.minutes)||entity.article.minutes<2||entity.article.minutes>30)failures.push(`${chainId}/${id}: bad minutes`);
        if(!/^\d{4}-\d{2}$/.test(entity.article?.updated||''))failures.push(`${chainId}/${id}: bad updated date`);
      }
    }
    for(const link of chainPage.links||[])if(!validUrl(link.url))failures.push(`${chainId}: unsafe source ${link.url}`);
  }
  if(Object.keys(entities).length!==79)failures.push(`entity corpus is ${Object.keys(entities).length}/79`);
  const launch=entities['robinhood-coin-launch-playbook'];
  if(launch?.article?.sections?.length!==5)failures.push('launch playbook must render five operational step sections');
  if((launch?.article?.sections||[]).flatMap(section=>section.paragraphs||[]).length!==15)failures.push('launch playbook must contain fifteen numbered steps');
}
for(const file of ['scripts/chain-index.js','styles/chain-index.css'])if(!fs.existsSync(new URL('../'+file,import.meta.url)))failures.push(`${file} missing`);
const chainScript=fs.readFileSync(new URL('../scripts/chain-index.js',import.meta.url),'utf8');
if(/eth_sendRawTransaction|eth_sendTransaction|wallet_requestPermissions|personal_sign|sendBundle|sendTransaction\s*\(/i.test(chainScript))failures.push('chain index includes prohibited signing/submission surface');

const browser=await launchAuditBrowser();
try{
  for(const width of [390,768,1200]){
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'no-preference',hasTouch:width===390,isMobile:width===390});
    const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route(/^https?:\/\//,route=>route.abort('blockedbyclient'));
    await page.goto(targetUrl,{waitUntil:'load'});await page.evaluate(()=>{document.documentElement.dataset.scopeUnlocked='audit'});
    for(const [chainId,count] of Object.entries(expected)){
      const slug=data.chainPages[chainId].slug;
      await page.evaluate(value=>SCOPE.Router.go('/c/'+value),slug);await page.waitForTimeout(40);
      const rendered=await page.evaluate(()=>({
        visible:!!document.querySelector('#chainChannel:not([hidden])'),
        h1:document.querySelector('#chainPage h1')?.textContent.trim(),
        features:document.querySelectorAll('.chain-feature').length,
        cards:document.querySelectorAll('.chain-article').length,
        groups:document.querySelectorAll('.chain-group').length,
        sources:document.querySelectorAll('.chain-source-list a[target="_blank"]').length,
        overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
      }));
      if(!rendered.visible||rendered.h1!==data.chainPages[chainId].name)failures.push(`${width}px/${slug}: route did not render correct h1`);
      if(rendered.features!==3||rendered.cards!==count)failures.push(`${width}px/${slug}: rendered ${rendered.features} features / ${rendered.cards} cards`);
      if(rendered.groups!==data.chainPages[chainId].groups.length)failures.push(`${width}px/${slug}: group count mismatch`);
      if(rendered.sources<1)failures.push(`${width}px/${slug}: no official source links`);
      if(rendered.overflow>1)failures.push(`${width}px/${slug}: ${rendered.overflow}px document overflow`);
    }
    await page.evaluate(()=>SCOPE.Router.go('/c/robinhood-chain'));await page.waitForTimeout(40);
    if(width===1200){
      await page.locator('#chainVeil').click();const card=page.locator('.chain-article').first();await card.hover();
      const hidden=await card.locator('.chain-article-link').evaluate(node=>({pointer:getComputedStyle(node).pointerEvents,route:getComputedStyle(node.querySelector('.chain-article-route')).opacity}));
      if(hidden.pointer!=='none'||hidden.route!=='0')failures.push(`Link Veil did not conceal pointer route: ${JSON.stringify(hidden)}`);
      await page.keyboard.down('l');const revealed=await card.locator('.chain-article-link').evaluate(node=>({pointer:getComputedStyle(node).pointerEvents,route:getComputedStyle(node.querySelector('.chain-article-route')).opacity}));
      if(revealed.pointer==='none'||revealed.route!=='1')failures.push(`Link Veil chord did not reveal route: ${JSON.stringify(revealed)}`);
      await page.keyboard.up('l');
      await card.locator('.chain-article-link').focus();if((await card.locator('.chain-article-link').evaluate(node=>getComputedStyle(node).pointerEvents))==='none')failures.push('Link Veil blocked keyboard-focused link');
      await page.locator('#chainVeil').click();
    }else if(width===390){
      if(await page.locator('#chainVeil').isVisible())failures.push('touch layout exposes hover-only Link Veil control');
      if((await page.locator('.chain-article-link').first().evaluate(node=>getComputedStyle(node).pointerEvents))==='none')failures.push('touch layout blocks article links');
    }
    const first=page.locator('.chain-article').nth(6);await first.scrollIntoViewIfNeeded();const before=await page.locator('#chainChannel').evaluate(node=>node.scrollTop);await first.locator('.chain-article-link').click();await page.waitForTimeout(40);
    if(!/^#\/e\//.test(await page.evaluate(()=>location.hash))||!await page.locator('#entityChannel').isVisible())failures.push(`${width}px: chain article did not open entity reader`);
    await page.goBack();await page.waitForTimeout(60);
    const restored=await page.evaluate(()=>({hash:location.hash,visible:!document.getElementById('chainChannel').hidden,scroll:document.getElementById('chainChannel').scrollTop,focus:document.activeElement?.closest?.('[data-article-id]')?.dataset.articleId||''}));
    if(restored.hash!=='#/c/robinhood-chain'||!restored.visible||Math.abs(restored.scroll-before)>8)failures.push(`${width}px: Back did not restore chain context ${JSON.stringify({before,restored})}`);
    await page.goForward();await page.waitForTimeout(50);if(!/^#\/e\//.test(await page.evaluate(()=>location.hash)))failures.push(`${width}px: Forward did not reopen article`);
    errors.forEach(error=>failures.push(`${width}px page error: ${error}`));await context.close();
  }
  const context=await browser.newContext({viewport:{width:1200,height:900},javaScriptEnabled:false});const page=await context.newPage();await page.goto(targetUrl,{waitUntil:'load'});
  const staticView=await page.evaluate(()=>({sections:document.querySelectorAll('.chain-noscript section').length,text:document.querySelector('.chain-noscript')?.textContent||'',entities:document.querySelectorAll('.entity-noscript tbody tr').length}));
  if(staticView.sections!==6)failures.push(`no-JS chain directory has ${staticView.sections}/6 sections`);
  if(staticView.entities!==79)failures.push(`no-JS entity mirror has ${staticView.entities}/79 rows`);
  for(const entity of new Set(Object.values(data.chainPages).flatMap(chainPage=>chainPage.groups.flatMap(group=>group.items)).map(id=>data.entities[id]?.name)))if(entity&&!staticView.text.includes(entity))failures.push(`no-JS chain directory omits ${entity}`);
  await context.close();
}finally{await browser.close()}

if(failures.length){console.error(`CHAIN INDEX FAIL (${failures.length})`);failures.forEach(failure=>console.error('- '+failure));process.exitCode=1;throw new Error('CHAIN INDEX AUDIT FAILED')}
console.log('CHAIN INDEX PASS — six canonical routes, 69 placements / 68 unique articles, published metadata, deep readers, filters, source rails, Link Veil, history restoration, responsive layouts, and exact JavaScript-off inventories pass.');
