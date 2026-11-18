import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {viewerSolution,networkSolution} from '../dist/mechanics.mjs';
import {LEARNING} from '../dist/learning.mjs';
import {has,pendingAction} from '../dist/journey.mjs';
const require=createRequire(import.meta.url);let chromium;
try{({chromium}=require('@playwright/test'));}catch{({chromium}=require(process.env.PLAYWRIGHT_PACKAGE));}
await mkdir(new URL('../qa/',import.meta.url),{recursive:true});
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
const base=process.env.TEST_URL||'http://127.0.0.1:4194/',errors=[];
const state=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('find-lumi-3d-v4')));
const act=async(p,a)=>{const selector='[data-action="'+a+'"]';for(const root of ['#modal[open]','#learning-recap[open]']){const scope=p.locator(root).locator(selector);if(await scope.count())return scope.first().click();}return p.locator(selector).first().click();};
const snap=(p,n)=>p.screenshot({path:new URL('../qa/41-'+n+'.png',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
async function slider(p,id,v){if(!await p.locator('#'+id).isVisible())await p.locator('details').filter({has:p.locator('#'+id)}).locator('summary').click();await p.locator('#'+id).fill(String(v));await p.locator('#'+id).dispatchEvent('input');}
async function lesson(p){assert.match(await p.locator('.lesson-top').innerText(),/YOU ARE LEARNING/);while(await p.locator('[data-action=lesson-next]').count())await act(p,'lesson-next');await act(p,'begin');}
async function plan(p,wrong=false){
 const s=await state(p),t=s.task;
 if(t.kind==='route'&&s.chapter===6&&s.sub===2){
  assert.equal(await p.locator('.construction-hint-toggle').count(),1);
  assert.equal(await p.locator('#construction-hint-panel').count(),0);
  assert.doesNotMatch(await p.locator('.route-controls .card-head').innerText(),/REFLECT.*CONNECT/);
  assert.equal(await p.locator('[data-action=line]').innerText(),'Straightedge');
  const useHint=p.viewportSize().width<650||wrong&&s.variant>0;
  if(useHint){
   const original=structuredClone(s);await act(p,'construction-hint');
   assert.ok(await p.locator('#construction-hint-panel').isVisible());assert.equal(await p.evaluate(()=>document.activeElement.id),'construction-hint-toggle');
   const opened=await state(p);assert.deepEqual(opened.task,original.task);assert.deepEqual(opened.records,original.records);assert.deepEqual(opened.history,original.history);assert.deepEqual(opened.journey,original.journey);assert.deepEqual(opened.draft.image,original.draft.image);assert.equal(opened.draft.p,original.draft.p);assert.equal(opened.support.length,original.support.length+1);
   await snap(p,'method-hint-'+p.viewportSize().width);await act(p,'construction-hint');
   assert.equal(await p.locator('#construction-hint-panel').count(),0);
   await p.reload();const loaded=await state(p);assert.ok(loaded.draft.hintSeen);assert.equal(loaded.draft.hintOpen,false);assert.deepEqual(loaded.records,original.records);
   await act(p,'construction-hint');assert.equal((await state(p)).support.length,opened.support.length);await act(p,'construction-hint');
  }else await snap(p,'final-without-hint-'+p.viewportSize().width);
 }
 if(t.kind==='viewer'){for(let i=0;i<2;i++)await act(p,'install-'+i);const a=viewerSolution(t);await slider(p,'rotation',wrong?0:Math.round(a[0]*2)/2);await slider(p,'rotation2',wrong?90:Math.round(a[1]*2)/2);}
 if(t.kind==='ray'){await slider(p,'angle',wrong?0:t.angle);await act(p,'side-right');}
 if(t.kind==='shape'){for(let i=0;i<3;i++){await act(p,'piece-'+i);await slider(p,'point-x',wrong?0:t.source[i].x);await slider(p,'point-y',wrong?0:-t.source[i].y);}}
 if(t.kind==='investigation'){
  await act(p,'candidate-'+t.bestIndex);await act(p,'test-path');
  assert.equal((await state(p)).draft.tests.length,1);assert.equal((await state(p)).draft.tests[0].hit,true);
  await p.locator('[data-action=explain-investigation]').waitFor({state:'visible'});
  await act(p,'explain-investigation');assert.equal((await state(p)).draft.tests.length,1);
  await p.locator('input[name="path-reason"][value="'+(wrong?'midpoint':'equal-shortest')+'"]').check();
  await snap(p,'investigation-evidence-'+p.viewportSize().width);
 }
 if(t.kind==='route'){await act(p,'mode-image');await slider(p,'point-x',wrong?t.b.x-1:t.b.x);await slider(p,'point-y',-t.b.y);await act(p,'line');await act(p,'intersect');assert.ok((await state(p)).draft.intersection);await snap(p,'intersection-'+p.viewportSize().width);}
 if(t.kind==='network'){const m=networkSolution(t);for(let i=0;i<2;i++){await act(p,'mirror-'+i);await slider(p,'point-x',m[i].x);await slider(p,'point-y',m[i].y);await slider(p,'mirror-rotation',wrong?0:m[i].angle);}}
 await act(p,'submit');const after=await state(p);
 assert.equal(after.result?.ok,!wrong,'Unexpected '+t.kind+' outcome in task '+s.chapter);
}
async function full(mobile=false,recover=false){
 const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile}),p=await ctx.newPage();
 p.on('pageerror',e=>errors.push(e.message));
 try{
  await p.goto(base);assert.ok(!await p.locator('#fallback').isVisible());await snap(p,mobile?'about-mobile':'about-desktop');await act(p,'start');await snap(p,mobile?'opening-mobile':'opening-desktop');await act(p,'begin-journey');let carry=null;
  for(let ch=1;ch<=6;ch++){
   const entered=await state(p);assert.equal(entered.chapter,ch);
   if(ch===5){assert.notDeepEqual([entered.task.a,entered.task.b],[carry.task.a,carry.task.b]);assert.equal(entered.best,carry.best);assert.equal(entered.draft.imageTouched,false);}
   if(ch===3){await act(p,'art-flower');await snap(p,'sign-design-'+p.viewportSize().width);}await lesson(p);
   assert.match(await p.locator('.objective').innerText(),/You are learning/);
   await snap(p,'task-'+ch+'-'+(mobile?'mobile':recover?'supported':'desktop'));
   let guard=0;
   while((await state(p)).phase!=='complete'&&guard++<6){
    const before=await state(p);if(!(before.task.kind==='route'&&before.chapter===6)){
     await act(p,'example');if(await p.locator('[data-action=help-next]').count())await act(p,'help-next');
     await act(p,'close');assert.deepEqual((await state(p)).task,before.task);assert.deepEqual((await state(p)).records,before.records);
    }
    if(recover){
     await plan(p,true);const first=structuredClone((await state(p)).records),old=structuredClone((await state(p)).task);
     await p.reload();assert.deepEqual((await state(p)).records,first);await act(p,'retry');assert.notDeepEqual((await state(p)).task,old);if(ch===4)assert.ok(has(await state(p),'shutter-open'));
     await plan(p,true);await act(p,'guided');assert.ok((await state(p)).result.guided);
    }else await plan(p);
    if((await state(p)).phase==='result')await act(p,'advance');
   }
   assert.ok(guard<6);
   const pending=pendingAction(await state(p));if(pending){await p.locator('[data-action="'+pending+'"]').waitFor({state:'visible'});await snap(p,'story-'+pending+'-'+(mobile?'mobile':recover?'supported':'desktop'));assert.equal(has(await state(p),ch===3?'courtyard-open':ch===5?'reunited':'escaped'),false);await act(p,pending);if(!mobile&&!recover){await p.waitForTimeout(800);await snap(p,'motion-'+pending);}}
   await p.locator('#learning-recap').waitFor({state:'visible'});
   if(ch===5){assert.ok(has(await state(p),'reunited'));assert.equal(has(await state(p),'escaped'),false);}if(ch===6)assert.ok(has(await state(p),'escaped'));
   await act(p,'map');assert.equal(await p.locator('.route-map li').count(),6);await snap(p,'map-'+ch+'-'+(mobile?'mobile':recover?'supported':'desktop'));await act(p,'close');
   assert.ok((await p.locator('#learning-recap').innerText()).includes(LEARNING[ch].concept));
   if(recover)assert.match(await p.locator('#learning-recap').innerText(),/SUPPORT/);
   assert.equal((await state(p)).recapLog.length,ch-1);
   if(ch===3){await p.keyboard.press('Escape');assert.ok(await p.locator('#learning-recap').isVisible());await act(p,'example');await act(p,'close');assert.ok(await p.locator('#learning-recap').isVisible());}
   await snap(p,'recap-'+ch+'-'+(mobile?'mobile':recover?'supported':'desktop'));
   if(ch===4)carry=await state(p);await act(p,'next');assert.equal((await state(p)).recapLog.length,ch);
  }
  const end=await state(p);assert.equal(end.screen,'end');assert.equal(end.completed.length,6);assert.equal(end.task.kind,'route');assert.equal(end.sub,2);
  for(const [k,v]of Object.entries(end.records))if(k.startsWith('ray-')||k.startsWith('route-'))assert.equal(v.correct,!recover);
  await snap(p,mobile?'ending-mobile':recover?'ending-supported':'ending-independent');
  await act(p,'report');assert.ok(await p.locator('table').isVisible());await act(p,'concepts');assert.equal(await p.locator('.concept-review').count(),6);await act(p,'close');
  await act(p,'settings');await p.locator('#reduced').check();await p.locator('#large').check();await act(p,'close');
  if(!mobile&&!recover){
   const first=structuredClone((await state(p)).records);await act(p,'bonus');assert.equal((await state(p)).bonus,true);await lesson(p);await plan(p);
   await p.locator('#learning-recap').waitFor({state:'visible'});await snap(p,'optional-workshop');await act(p,'next');
   const back=await state(p);assert.equal(back.screen,'end');for(const [key,v]of Object.entries(first))assert.deepEqual(back.records[key],v);
  }
  console.log('PASS six learning recaps, '+(mobile?'mobile':'desktop')+', '+(recover?'fresh recovery + guided completion':'independent completion')+', optional final method hint without answer/scoring changes, exact intersections, shared departure and preserved evidence.');
 }catch(e){await snap(p,'failure');await writeFile(new URL('../qa/41-failure-state.json',import.meta.url),JSON.stringify(await state(p),null,2));throw e;}
 finally{await ctx.close();}
}
try{
 if(process.env.ONE_RUN==='mobile')await full(true);else if(process.env.ONE_RUN==='1')await full();else{await full();await full(false,true);await full(true);}
 assert.deepEqual(errors,[]);console.log('PASS no browser runtime exceptions');
}finally{await browser.close();}
