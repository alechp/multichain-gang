#!/usr/bin/env node
import { launchAuditBrowser, targetUrl } from './audit-helpers.mjs';

const failures=[];
const browser=await launchAuditBrowser();
try{
  for(const width of [390,1200]){
    const context=await browser.newContext({viewport:{width,height:820},reducedMotion:'no-preference'});
    await context.addInitScript(()=>{
      const instance=()=>({pause(){},play(){},seek(){},restart(){},add(){return this}});
      const anime=options=>{if(options?.complete)queueMicrotask(options.complete);return instance()};
      anime.timeline=instance;anime.setDashoffset=()=>0;anime.stagger=()=>0;anime.path=()=>()=>0;anime.remove=()=>{};window.anime=anime;
    });
    const page=await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route(/^https?:\/\//,route=>route.abort('blockedbyclient'));
    await page.goto(targetUrl,{waitUntil:'load'});
    await page.evaluate(()=>{document.documentElement.dataset.scopeUnlocked='audit';document.body.tabIndex=-1;document.body.focus()});

    const engine=await page.evaluate(()=>({engine:SCOPE.CommandPalette?.engine,size:SCOPE.CommandPalette?.size,version:window.Fuse?.version}));
    if(engine.engine!=='Fuse 7.5.0'||engine.version!=='7.5.0'||engine.size!==136)failures.push(`${width}px: bad local index ${JSON.stringify(engine)}`);
    await page.keyboard.press('Meta+K');
    if(!await page.locator('#scopeCommand').isVisible())failures.push(`${width}px: palette did not open`);
    await page.locator('#cmdInput').fill('turbne');
    const fuzzy=await page.locator('.cmd-option').first().locator('.cmd-title').textContent();
    if(!/turbine/i.test(fuzzy||''))failures.push(`${width}px: typo search returned ${fuzzy}`);
    await page.keyboard.press('Escape');

    await page.evaluate(()=>SCOPE.Playbar.go(0));await page.waitForTimeout(350);await page.evaluate(()=>document.body.focus());
    await page.keyboard.press('ArrowRight');
    const right=await page.evaluate(()=>({state:SCOPE.Playbar.state,active:document.activeElement?.className||document.activeElement?.tagName,top:SCOPE.Overlay.top()?.element?.id||null}));
    if(right.state.index!==1)failures.push(`${width}px: ArrowRight did not advance ${JSON.stringify(right)}`);
    await page.keyboard.press('ArrowLeft');
    if((await page.evaluate(()=>SCOPE.Playbar.state.index))!==0)failures.push(`${width}px: ArrowLeft did not retreat`);
    await page.keyboard.press('Space');
    if((await page.evaluate(()=>SCOPE.Playbar.state.state))!=='playing')failures.push(`${width}px: Space did not start autoplay`);
    await page.keyboard.press('Space');
    if((await page.evaluate(()=>SCOPE.Playbar.state.state))!=='paused')failures.push(`${width}px: Space did not pause autoplay`);
    const beforeGrid=await page.evaluate(()=>SCOPE.Playbar.state.index);
    await page.locator('.tcell').first().focus();await page.keyboard.press('ArrowRight');
    if((await page.evaluate(()=>SCOPE.Playbar.state.index))!==beforeGrid)failures.push(`${width}px: grid-owned ArrowRight leaked to playbar`);

    await page.keyboard.press('Meta+K');await page.locator('#cmdInput').fill('jito blok engin');await page.keyboard.press('Enter');await page.waitForTimeout(80);
    if((await page.evaluate(()=>location.hash))!=='#/e/jito-be')failures.push(`${width}px: entity search did not route`);
    await page.keyboard.press('Meta+K');await page.locator('[data-section="ch3"]').click();await page.waitForTimeout(80);
    if((await page.evaluate(()=>location.hash))!=='#ch3')failures.push(`${width}px: quick section did not route`);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    if(overflow>1)failures.push(`${width}px: ${overflow}px document overflow`);
    errors.forEach(error=>failures.push(`${width}px page error: ${error}`));
    await context.close();
  }
}finally{await browser.close()}

if(failures.length){
  console.error(`COMMAND CHANNEL FAIL (${failures.length})`);failures.forEach(failure=>console.error('- '+failure));
  process.exitCode=1;throw new Error('COMMAND CHANNEL AUDIT FAILED');
}
console.log('COMMAND CHANNEL PASS — Fuse 7.5.0 local index (136 records), typo search, palette routing, Left/Right cue traversal, Space autoplay/pause, focus isolation, and 390/1200px overflow pass.');
