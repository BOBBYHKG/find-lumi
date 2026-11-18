// Isolated visual checkpoint, not a learner/gameplay completion claim.
import {createRequire} from 'node:module';import assert from 'node:assert/strict';
import {initial,enter,begin,solve,submit,advance,continueJourney} from '../dist/game.mjs';
import {pendingAction,performAction} from '../dist/journey.mjs';
const require=createRequire(import.meta.url);let chromium;try{({chromium}=require('@playwright/test'));}catch{({chromium}=require(process.env.PLAYWRIGHT_PACKAGE));}
const checkpoint=initial();checkpoint.settings.reduced=true;enter(checkpoint,1);
for(let n=1;n<=5;n++){begin(checkpoint);while(checkpoint.phase!=='complete'){checkpoint.draft=solve(checkpoint.task);submit(checkpoint);if(checkpoint.phase!=='complete')advance(checkpoint);}if(pendingAction(checkpoint))performAction(checkpoint,pendingAction(checkpoint));continueJourney(checkpoint);}
begin(checkpoint);for(let i=0;i<2;i++){checkpoint.draft=solve(checkpoint.task);submit(checkpoint);advance(checkpoint);}
assert.equal(checkpoint.sub,2);
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']}),errors=[];
try{for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:360,height:740}]){
 const context=await browser.newContext({viewport}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(s=>{if(!localStorage.getItem('find-lumi-3d-v4'))localStorage.setItem('find-lumi-3d-v4',JSON.stringify(s));},checkpoint);
 await p.goto(process.env.TEST_URL||'http://127.0.0.1:4194/');await p.screenshot({path:new URL('../qa/41-hint-closed-'+viewport.width+'.png',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')});await p.locator('[data-action=construction-hint]').click();
 const boxes=await p.evaluate(()=>{const rect=selector=>{const q=document.querySelector(selector).getBoundingClientRect();return {top:q.top,bottom:q.bottom,height:q.height};};return {panel:rect('.final-construction'),button:rect('.final-construction>[data-action=submit]'),hint:rect('#construction-hint-panel')};});
 assert.ok(boxes.button.top>=boxes.panel.top&&boxes.button.bottom<=boxes.panel.bottom&&boxes.button.height>=40,JSON.stringify(boxes));
 assert.ok(boxes.hint.top>=boxes.panel.top&&boxes.hint.bottom<=boxes.button.top,JSON.stringify(boxes));
 await p.screenshot({path:new URL('../qa/41-hint-layout-'+viewport.width+'.png',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')});
 const snapshot=await p.evaluate(()=>JSON.parse(localStorage.getItem('find-lumi-3d-v4')));assert.deepEqual(snapshot.records,checkpoint.records);assert.deepEqual(snapshot.draft.image,checkpoint.draft.image);assert.equal(snapshot.records['route-2'],undefined);
 await p.locator('[data-action=construction-hint]').click();assert.equal(await p.locator('#construction-hint-panel').count(),0);await context.close();
 }assert.deepEqual(errors,[]);console.log('PASS desktop/mobile Hint layout fixtures at 1440×1000, 390×844 and 360×740: reminder and test button remain visible, with unchanged plan and first records.');
}finally{await browser.close();}
