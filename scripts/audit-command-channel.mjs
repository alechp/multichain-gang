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
    if(engine.engine!=='Fuse 7.5.0'||engine.version!=='7.5.0'||engine.size!==135)failures.push(`${width}px: bad local index ${JSON.stringify(engine)}`);
    if((await page.evaluate(()=>SCOPE.CommandPalette.search('open field notes').some(item=>item.id==='notes'))))failures.push(`${width}px: hidden Notes command remains searchable`);
    await page.keyboard.press('Meta+K');
    if(!await page.locator('#scopeCommand').isVisible())failures.push(`${width}px: palette did not open`);
    await page.locator('#cmdInput').fill('turbne');
    const fuzzy=await page.locator('.cmd-option').first().locator('.cmd-title').textContent();
    if(!/turbine/i.test(fuzzy||''))failures.push(`${width}px: typo search returned ${fuzzy}`);
    await page.keyboard.press('Escape');

    await page.evaluate(()=>SCOPE.Playbar.go(0));await page.waitForTimeout(350);await page.evaluate(()=>document.body.focus());
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1050);
    const right=await page.evaluate(()=>({state:SCOPE.Playbar.state,active:document.activeElement?.className||document.activeElement?.tagName,top:SCOPE.Overlay.top()?.element?.id||null}));
    if(right.state.index!==1)failures.push(`${width}px: ArrowRight did not hold after scroll settled ${JSON.stringify(right)}`);
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(1050);
    if((await page.evaluate(()=>SCOPE.Playbar.state.index))!==0)failures.push(`${width}px: ArrowLeft did not hold after scroll settled`);
    await page.keyboard.press('Space');
    if((await page.evaluate(()=>SCOPE.Playbar.state.state))!=='playing')failures.push(`${width}px: Space did not start autoplay`);
    await page.keyboard.press('Space');
    if((await page.evaluate(()=>SCOPE.Playbar.state.state))!=='paused')failures.push(`${width}px: Space did not pause autoplay`);
    const guidance=await page.evaluate(()=>{
      const cues=JSON.parse(document.getElementById('chainData').textContent).cues;
      const state=SCOPE.Playbar.state,note=document.querySelector('.p-a');
      return {title:note?.querySelector('h3')?.textContent,expected:cues[state.index]?.title,visible:!!note&&!note.hidden};
    });
    if(!guidance.visible||guidance.title!==guidance.expected)failures.push(`${width}px: Author Note title mismatch ${JSON.stringify(guidance)}`);
    const navbar=await page.evaluate(()=>({
      slot:document.getElementById('slotNum')?.textContent,
      animated:Array.from(document.querySelectorAll('.slotbar,.slotbar *')).filter(element=>getComputedStyle(element).animationName!=='none').length
    }));
    await page.waitForTimeout(500);
    const navbarAfter=await page.evaluate(()=>document.getElementById('slotNum')?.textContent);
    if(navbar.animated||navbar.slot!==navbarAfter)failures.push(`${width}px: navbar is not static ${JSON.stringify({navbar,navbarAfter})}`);
    const hiddenNotes=await page.evaluate(()=>Array.from(document.querySelectorAll('.sn-ctl,#scopeNotes')).every(element=>!element.getClientRects().length));
    if(!hiddenNotes)failures.push(`${width}px: Notes UI remains visible`);
    const bottomDock=await page.evaluate(()=>{
      const mount=document.getElementById('playbarMount'),bar=mount.querySelector('.p-b'),note=mount.querySelector('.p-a'),button=mount.querySelector('.p-pin');
      return {state:SCOPE.ReaderDock?.state,dock:mount.dataset.dock,noteBottom:note.getBoundingClientRect().bottom,barTop:bar.getBoundingClientRect().top,label:button?.getAttribute('aria-label')};
    });
    if(bottomDock.state!=='bottom'||bottomDock.dock!=='bottom'||bottomDock.noteBottom>bottomDock.barTop+1||bottomDock.label!=='Pin reading bar to top')failures.push(`${width}px: invalid bottom dock ${JSON.stringify(bottomDock)}`);
    await page.locator('.p-pin').click();await page.waitForTimeout(80);
    const topDock=await page.evaluate(()=>{
      const mount=document.getElementById('playbarMount'),bar=mount.querySelector('.p-b'),note=mount.querySelector('.p-a'),header=document.querySelector('.slotbar');
      return {state:SCOPE.ReaderDock?.state,dock:mount.dataset.dock,headerBottom:header.getBoundingClientRect().bottom,barTop:bar.getBoundingClientRect().top,barBottom:bar.getBoundingClientRect().bottom,noteTop:note.getBoundingClientRect().top,label:mount.querySelector('.p-pin')?.getAttribute('aria-label')};
    });
    if(topDock.state!=='top'||topDock.dock!=='top'||topDock.barTop<topDock.headerBottom||topDock.noteTop<topDock.barBottom||topDock.label!=='Pin reading bar to bottom')failures.push(`${width}px: invalid top dock ${JSON.stringify(topDock)}`);
    if(width===390){
      await page.reload({waitUntil:'load'});await page.evaluate(()=>{document.documentElement.dataset.scopeUnlocked='audit';SCOPE.Playbar.go(0)});await page.waitForTimeout(120);
      const persisted=await page.evaluate(()=>({state:SCOPE.ReaderDock?.state,dock:document.getElementById('playbarMount').dataset.dock,label:document.querySelector('.p-pin')?.getAttribute('aria-label')}));
      if(persisted.state!=='top'||persisted.dock!=='top'||persisted.label!=='Pin reading bar to bottom')failures.push(`390px: top dock did not persist ${JSON.stringify(persisted)}`);
    }
    await page.locator('.p-pin').click();
    if(width===1200){
      await page.keyboard.press('Space');await page.keyboard.press('Escape');
      const exited=await page.evaluate(()=>({state:SCOPE.Playbar.state,noteHidden:document.querySelector('.p-a')?.hidden,frameHidden:document.querySelector('.p-hl')?.hidden}));
      if(exited.state.engaged||!exited.noteHidden||!exited.frameHidden)failures.push(`1200px: Escape did not exit reader mode ${JSON.stringify(exited)}`);
    }
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

  const context=await browser.newContext({viewport:{width:390,height:820},reducedMotion:'no-preference'});
  await context.addInitScript(()=>{
    const nativeSetTimeout=window.setTimeout.bind(window);
    window.setTimeout=(callback,delay=0,...args)=>nativeSetTimeout(callback,delay>=4000?120:delay,...args);
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route(/^https?:\/\//,route=>route.abort('blockedbyclient'));
  await page.goto(targetUrl,{waitUntil:'load'});
  await page.evaluate(()=>{document.documentElement.dataset.scopeUnlocked='audit'});
  await page.evaluate(()=>SCOPE.Playbar.go(0));await page.waitForTimeout(1050);await page.locator('.p-n').click();await page.waitForTimeout(1050);
  const next=await page.evaluate(()=>{
    const state=SCOPE.Playbar.state,cues=JSON.parse(document.getElementById('chainData').textContent).cues;
    return {state,title:document.querySelector('.p-a h3')?.textContent,expected:cues[1]?.title};
  });
  if(next.state.index!==1||next.title!==next.expected)failures.push(`CDN-blocked: Next bounced after scroll settled ${JSON.stringify(next)}`);
  await page.locator('.p-t').click();await page.locator('.p-q[data-i="0"]').click();await page.locator('.p-p').click();
  if((await page.evaluate(()=>SCOPE.Playbar.state.state))!=='playing')failures.push('CDN-blocked: Play remained trapped in manual mode');
  await page.waitForTimeout(520);
  const advanced=await page.evaluate(()=>{
    const state=SCOPE.Playbar.state,cues=JSON.parse(document.getElementById('chainData').textContent).cues,note=document.querySelector('.p-a');
    return {state,title:note?.querySelector('h3')?.textContent,expected:cues[state.index]?.title};
  });
  if(advanced.state.index<2||advanced.state.state!=='playing')failures.push(`CDN-blocked: autoplay stalled ${JSON.stringify(advanced)}`);
  if(advanced.title!==advanced.expected)failures.push(`CDN-blocked: Author Note title mismatch ${JSON.stringify(advanced)}`);
  errors.forEach(error=>failures.push(`CDN-blocked page error: ${error}`));await context.close();
}finally{await browser.close()}

if(failures.length){
  console.error(`COMMAND CHANNEL FAIL (${failures.length})`);failures.forEach(failure=>console.error('- '+failure));
  process.exitCode=1;throw new Error('COMMAND CHANNEL AUDIT FAILED');
}
console.log('COMMAND CHANNEL PASS — Fuse 7.5.0 local index (135 records), persisted top/bottom reader docking, inverted Author Note placement, hidden Notes UI, settled cue traversal, CDN-blocked autoplay, desktop Escape, static navbar, focus isolation, and 390/1200px overflow pass.');
