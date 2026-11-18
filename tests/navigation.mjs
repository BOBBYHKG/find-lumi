import {createRequire} from 'node:module';import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
import {viewerSolution} from '../dist/mechanics.mjs';
import {optimal} from '../dist/math.mjs';
import {pendingAction} from '../dist/journey.mjs';
import {RELEASE} from '../dist/game.mjs';
const require=createRequire(import.meta.url);let chromium;try{({chromium}=require('@playwright/test'));}catch{({chromium}=require(process.env.PLAYWRIGHT_PACKAGE));}
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']}),p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
p.on('pageerror',e=>errors.push(e.message));
const state=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('find-lumi-3d-v4'))),act=async a=>{const selector='[data-action="'+a+'"]';for(const root of ['#modal[open]','#learning-recap[open]']){const scope=p.locator(root).locator(selector);if(await scope.count())return scope.first().click();}return p.locator(selector).first().click();};
const slider=async(id,v)=>{if(!await p.locator('#'+id).isVisible())await p.locator('details').filter({has:p.locator('#'+id)}).locator('summary').click();await p.locator('#'+id).fill(String(v));await p.locator('#'+id).dispatchEvent('input');};
const lesson=async()=>{while(await p.locator('[data-action=lesson-next]').count())await act('lesson-next');await act('begin');};
const next=async()=>{const pending=pendingAction(await state());if(pending)await act(pending);await p.locator('#learning-recap').waitFor({state:'visible'});await act('next');};
async function clickGrid(x,y){
 const xy=await p.evaluate(async({x,y})=>{
  const T=await import('./vendor/three.module.js'),c=new T.PerspectiveCamera(50,innerWidth/innerHeight,.05,80);c.position.set(0,8.9,7.7);c.lookAt(0,0,0);c.setViewOffset(innerWidth,innerHeight,innerWidth*.075,0,innerWidth,innerHeight);c.updateMatrixWorld();const q=new T.Vector3((x-5)*.9,.29,-y*.9).project(c);return {x:(q.x+1)*innerWidth/2,y:(1-q.y)*innerHeight/2};
 },{x,y});
 assert.equal(await p.evaluate(({x,y})=>document.elementFromPoint(x,y)?.id,xy),'world','Target grid node must remain visible and clickable');
 await p.mouse.click(xy.x,xy.y);
}
try{
 await p.goto(process.env.TEST_URL||'http://127.0.0.1:4194/');await act('settings');await p.locator('#reduced').check();await act('close');await act('start');await act('begin-journey');await lesson();
 await act('submit');assert.equal((await state()).history.length,0);
 for(let i=0;i<2;i++)await act('install-'+i);const a=viewerSolution((await state()).task);await slider('rotation',Math.round(a[0]*2)/2);await slider('rotation2',Math.round(a[1]*2)/2);await act('submit');
 await p.locator('#learning-recap').waitFor({state:'visible'});await p.keyboard.press('Escape');assert.ok(await p.locator('#learning-recap').isVisible());await act('example');await act('close');assert.ok(await p.locator('#learning-recap').isVisible());await next();await lesson();
 await act('submit');assert.equal((await state()).records['ray-0'],undefined);
 await p.mouse.move(650,400);await p.mouse.down();await p.mouse.move(820,370,{steps:5});await p.mouse.up();assert.ok((await state()).draft.touched);assert.equal((await state()).records['ray-0'],undefined);
 for(let i=0;i<2;i++){await slider('angle',(await state()).task.angle);await act('side-right');await act('submit');if((await state()).phase==='result')await act('advance');}
 await next();await act('art-flower');await lesson();assert.match(await p.locator('.grid-rule').innerText(),/0.5-unit/);
 const t=(await state()).task;
 await clickGrid(t.source[0].x+.9,-t.source[0].y+.1);assert.notDeepEqual((await state()).draft.points[0],{x:t.source[0].x,y:-t.source[0].y});
 for(let i=0;i<3;i++){await act('piece-'+i);await clickGrid(t.source[i].x+.12,-t.source[i].y+.1);assert.deepEqual((await state()).draft.points[i],{x:t.source[i].x,y:-t.source[i].y});}
 await act('menu');await act('settings');await p.locator('#reduced').uncheck();await act('close');await act('submit');assert.ok(await p.locator('.motion-status').isVisible());assert.equal(await p.locator('#learning-recap').count(),0);
 await act('help');await act('close');await act('insert-pass');await p.locator('#learning-recap').waitFor({state:'visible'});assert.match(await p.locator('#learning-recap').innerText(),/perpendicular/);await next();await lesson();
 assert.ok(await p.locator('[data-action=explain-investigation]').isDisabled());assert.equal((await state()).records['chapter-4'],undefined);
 const best=(await state()).task.bestIndex,wrong=[0,1,2].filter(i=>i!==best);
 for(const i of wrong){await act('candidate-'+i);await act('test-path');await act('help');await act('close');}
 assert.ok(await p.locator('[data-action=explain-investigation]').isDisabled());assert.equal((await state()).records['chapter-4'],undefined);
 await act('candidate-'+best);await act('test-path');await act('explain-investigation');await p.locator('input[value=equal-shortest]').check();await act('submit');await next();await lesson();
 const target=(await state()).task.b;
 await act('mode-image');await clickGrid(target.x+.1,-target.y+.1);await act('line');await act('intersect');assert.ok((await state()).draft.intersection);
 const correctP=(await state()).draft.p;assert.equal(correctP,optimal((await state()).task).x);
 await act('mode-image');await slider('point-x',target.x-1);assert.equal((await state()).draft.line,false);assert.equal((await state()).draft.intersection,false);assert.equal(await p.locator('.construction-readout').count(),0);
 await act('submit');assert.equal((await state()).records['route-0'],undefined);await act('line');await act('intersect');await act('submit');assert.equal((await state()).records['route-0'].correct,false);
 const first=structuredClone((await state()).records['route-0']);await act('retry');
 for(let check=0;check<2;check++){const b=(await state()).task.b;await act('mode-image');await slider('point-x',b.x);await slider('point-y',-b.y);await act('line');await act('intersect');await act('submit');if((await state()).phase==='result')await act('advance');}
 assert.deepEqual((await state()).records['route-0'],first);await next();assert.equal((await state()).chapter,6);assert.match(await p.locator('.objective h1').innerText(),/Review and Apply/);
 await act('menu');await act('report');const pending=p.waitForEvent('download');await act('download');const file=await pending,data=JSON.parse(await readFile(await file.path(),'utf8'));
 assert.equal(data.version,RELEASE);assert.equal(data.recapsAcknowledged.length,5);assert.equal(data.result.rays,2);assert.equal(data.result.routes,1);assert.equal(data.records['route-0'].correct,false);assert.equal(data.concepts.length,6);await act('close');
 assert.deepEqual(errors,[]);console.log('PASS direct near-node snapping, wrong-node preservation, fold-before-recap, nested replay, mandatory recap acknowledgement, rejected arbitrary Task 4 completion, valid reflection investigation, stale-intersection invalidation, exact construction, fresh recovery and report export.');
}finally{await browser.close();}
