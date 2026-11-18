import {mirrorLayout,sightline,mirrorSuccessAngle,routeLayout,ghost,optimal,dist,length} from './math.mjs';
import {viewerTask,viewerPath,viewerSolution,networkTask,networkSolution,traceNetwork,snapPoint,lineMirrorIntersection,investigationTask,inspectPath} from './mechanics.mjs';
import {awardSuccess,mark,has,chapterReady} from './journey.mjs';
export const KEY='find-lumi-3d-v4';
export const RELEASE='4.1.0';
export const CHAPTERS=[
 ['See beyond the wall','Build a two-mirror viewer and read the passage sign.','The toy workshop','Pip and Lumi are safe in the Star Gallery. Find the arcade passage beyond the workshop wall.'],
 ['Open the arcade passage','Catch two ideal bank shots to release the barrier.','The bank-shot arcade','The arcade’s mechanical release blocks the paper studio. Two successful catches open the passage.'],
 ['Repair the visitor pass','Complete the missing symmetric pattern, fold to check it, then use the pass.','The paper studio','The courtyard gate reads a mirror-symmetric visitor pass. Reconstruct its missing half to get through.'],
 ['Lift the gallery shutter','Find a working reflected beam and explain why it works.','The courtyard mirror exhibit','Receiver B controls the outer shutter. Send light to it to reveal the Star Gallery entrance.'],
 ['Open the Star Gallery','Use reflected destinations and intersections to activate two new receivers.','The courtyard · gallery entrance','The shutter revealed new receivers: approach lighting, then the gallery gate. Construct their new bounce points to reach Lumi.'],
 ['Home Together · Review and Apply','Activate two return markers and the exit receiver, then leave together.','The return route · final mission','Maya and Lumi are together. Use familiar reflection methods to guide them to the museum exit.']
];
export const LO1='Given four ideal reflection scenarios with incident paths and normal lines, junior secondary or beginner adult learners predict the outgoing direction correctly in at least three first attempts, within ±3°.';
export const LO2='Given three unobstructed source–receiver diagrams on one side of a straight mirror, with grid, straightedge and intersection tools, junior secondary or beginner adult learners construct a shortest one-reflection path correctly in at least two first attempts, with B′ and P each within 0.15 model units and an A–B′ connection.';
export const wrap=a=>((a%360)+360)%360;
export const error=(a,b)=>Math.abs(((a-b+540)%360)-180);
export function rayTask(seed){const mirror=[0,-15,15,90][Math.abs(seed)%4],angle=25+(Math.abs(seed)*7)%41,incoming=mirror+90-angle;return {kind:'ray',seed,mirror,angle,incoming,answer:wrap(2*mirror-incoming)};}
export function shapeTask(seed){const cases=[[[2,1],[4.5,2],[7.5,1.5]],[[2.5,1.5],[5,2.5],[8,1]],[[1.5,2],[4,1.5],[7,2.5]],[[3,1],[5.5,2],[8.5,1.5]],[[2,2.5],[4.5,1],[7.5,2]],[[1.5,1.5],[5,3],[8,2]],[[2.5,2],[4,2.5],[7,1]]];return {kind:'shape',seed,source:cases[Math.abs(seed)%cases.length].map(([x,y])=>({x,y}))};}
export const routeTask=seed=>({...routeLayout(seed),kind:'route'});
export function initial(){return {version:4,journey:{events:[]},bonus:false,bonusVisits:0,recapLog:[],chapterGuided:false,screen:'about',chapter:1,phase:'lesson',lesson:0,sub:0,variant:0,errors:0,completed:[],records:{},history:[],choices:{art:'star'},settings:{reduced:false,large:false,sound:false},support:[],task:null,draft:null,result:null,routes:[],best:null,inspection:true};}
export function draft(t){
 if(t.kind==='viewer')return {installed:[false,false],angles:[0,90],turned:[false,false],selected:0};
 if(t.kind==='mirror')return {rotation:-18,touched:false};
 if(t.kind==='ray')return {angle:20,side:1,touched:false};
 if(t.kind==='investigation')return {selected:null,reason:'',explaining:false,tests:[],lastTest:null,predictionSaved:false};
 if(t.kind==='shape')return {points:[{x:1,y:-1},{x:4,y:-1},{x:7,y:-1}],selected:0,touched:false};
 if(t.kind==='network')return {mirrors:[{x:2,y:-1,angle:0,placed:false},{x:7,y:1,angle:90,placed:false}],selected:0};
 return {image:{x:6,y:-1},p:1,line:false,mode:'image',imageTouched:false,pTouched:false,intersection:false};
}
export function taskFor(s){
 if(s.bonus)return networkTask(s.variant+(s.run||0)+s.bonusVisits-1);
 const seed=100+s.chapter*17+s.sub*11+s.variant+(s.run||0)*97;
 if(s.chapter===1)return viewerTask(s.variant+(s.run||0));
 if(s.chapter===2||s.chapter===6&&s.sub<2)return rayTask(seed);
 if(s.chapter===3)return shapeTask(seed);
 if(s.chapter===4)return investigationTask(s.variant+(s.run||0));

 const routeSeed=s.chapter===5?(s.sub===0?[4,3,1]:[1,5,4])[(s.run||0)%3]:[6,0,2][(s.run||0)%3];
 const used=Object.entries(s.records).filter(([k])=>k.startsWith('route-')).map(([,r])=>JSON.stringify([r.task.a,r.task.b]));if(s.floorTask)used.push(JSON.stringify([s.floorTask.a,s.floorTask.b]));let candidate=routeTask(routeSeed+s.variant);if(s.variant===0)for(let i=0;i<7&&used.includes(JSON.stringify([candidate.a,candidate.b]));i++)candidate=routeTask(candidate.seed+1);return candidate;
}
const asRoute=t=>({kind:'route',seed:t.seed,a:structuredClone(t.a),b:structuredClone(t.b),width:t.width});
export function enter(s,n=s.chapter){s.bonus=false;s.chapterGuided=false;s.chapter=n;s.screen='game';s.phase='lesson';s.lesson=0;s.sub=0;s.variant=0;s.errors=0;s.result=null;s.task=taskFor(s);s.draft=draft(s.task);s.inspection=true;if(n===4){s.floorTask=asRoute(s.task);s.routes=[];s.best=null;}}
export function startBonus(s){if(s.screen!=='end'||!s.completed.includes(6)||!has(s,'escaped'))return false;s.bonus=true;s.bonusVisits++;s.screen='game';s.chapter=6;s.sub=3;s.variant=0;s.errors=0;s.chapterGuided=false;s.phase='lesson';s.lesson=0;s.task=taskFor(s);s.draft=draft(s.task);s.result=null;s.inspection=true;return true;}
export function acknowledgeRecap(s){if(s.phase!=='complete'||!chapterReady(s))return false;if(!s.recapLog.some(r=>r.chapter===s.chapter&&r.bonus===s.bonus))s.recapLog.push({chapter:s.chapter,bonus:s.bonus,at:new Date().toISOString()});return true;}
export function setImage(s,p){if(s.task.kind!=='route')return false;s.draft.image=snapPoint(p);s.draft.imageTouched=true;s.draft.line=false;s.draft.pTouched=false;s.draft.intersection=false;return true;}
export function constructIntersection(s){const d=s.draft;if(s.task.kind!=='route'||!d.imageTouched||!d.line)return false;d.image=snapPoint(d.image);const p=lineMirrorIntersection(s.task.a,d.image,s.task.width);if(!p)return false;d.p=p.x;d.pTouched=true;d.intersection=true;d.mode='p';return true;}
const hasMore=s=>!s.bonus&&(s.chapter===2&&s.sub<1||s.chapter===5&&s.sub<1||s.chapter===6&&s.sub<2);
function finish(s){if(!s.bonus&&!s.completed.includes(s.chapter))s.completed.push(s.chapter);if(s.task.kind==='investigation'){s.investigatedP=s.task.candidates[s.draft.selected];s.draft.lastTest=s.draft.selected;s.routes=structuredClone(s.draft.tests);s.best=Math.min(...s.routes.map(r=>r.total));s.floorTask=asRoute(s.task);}s.phase='complete';}
export function begin(s){s.phase='play';s.result=null;}
export function keyFor(s){if(s.bonus)return `bonus-${s.bonusVisits}`;if(s.chapter===2)return `ray-${s.sub}`;if(s.chapter===5)return `route-${s.sub}`;if(s.chapter===6)return s.sub<2?`ray-${s.sub+2}`:'route-2';return `chapter-${s.chapter}`;}
export const predicted=(t,d)=>wrap(t.mirror-90+d.side*d.angle);
export function investigationReady(s){return s.task?.kind==='investigation'&&s.draft.tests.some(r=>r.hit&&r.seed===s.task.seed)&&s.draft.tests.every(r=>r.seed===s.task.seed);}
export function explainInvestigation(s){if(!investigationReady(s))return false;const hit=s.draft.tests.find(r=>r.hit);s.draft.selected=hit.index;s.draft.lastTest=hit.index;s.draft.explaining=true;return true;}
export function validInput(s){const d=s.draft,t=s.task;if(t.kind==='investigation')return d.selected!=null&&!!d.reason&&investigationReady(s);if(t.kind==='viewer')return d.installed.every(Boolean)&&d.turned.every(Boolean);if(t.kind==='network')return d.mirrors.length<=t.limit&&d.mirrors.filter(m=>m.placed).length>=2;if(t.kind==='route')return d.imageTouched&&d.pTouched&&d.line&&d.intersection;if(t.kind==='shape')return d.parts?.every(Boolean)===true;return !!d.touched;}
export function correct(t,d){if(t.kind==='investigation')return d.selected===t.bestIndex&&d.reason==='equal-shortest';if(t.kind==='viewer')return !!viewerPath(t,d);if(t.kind==='network')return d.mirrors.length<=t.limit&&traceNetwork(t,d.mirrors).ok;if(t.kind==='mirror')return !!sightline(t,d.rotation);if(t.kind==='ray')return error(predicted(t,d),t.answer)<=3+1e-9;if(t.kind==='shape')return t.source.every((p,i)=>dist({x:p.x,y:-p.y},d.points[i])<=.2+1e-9);return dist(d.image,ghost(t))<=.15+1e-9&&dist({x:d.p,y:0},optimal(t))<=.15+1e-9&&d.line;}
export function feedback(t,d){
 if(t.kind==='investigation')return d.selected!==t.bestIndex?'That proposed A–P–B route is not the successful shortest reflection. Compare the tested beam, both segments and the two angles from the normal.':'The successful point is explained by equal angles and the shortest full path in this one-mirror model. A midpoint guess or a short first leg alone is not a general rule.';
 if(t.kind==='viewer')return 'The view needs both reflections. Light must travel from the scene to mirror 2, then mirror 1 and your eye, without crossing the wall. Turn one mirror at a time and watch the viewing window.';
 if(t.kind==='network'){const r=traceNetwork(t,d.mirrors);return r.reason==='wall'?`The beam reaches the opaque wall after ${r.hits.length} reflection(s). Move a mirror so the next segment clears the wall.`:r.reason==='loop'?'The beam keeps returning between mirrors. Change one orientation to give it a clear exit toward the receiver.':`The beam leaves the work area after ${r.hits.length} reflection(s). Use the stopped path to position the next mirror and redirect it toward the receiver.`;}
 if(t.kind==='ray')return d.side!==1?'Your predicted outgoing path is on the wrong side of the normal. The incoming and outgoing paths make equal angles on opposite sides of it.':'Your outgoing angle differs from the incoming angle by more than 3°. Measure both from the dashed normal, not the cushion or mirror.';
 if(t.kind==='shape'){const i=t.source.findIndex((p,i)=>dist({x:p.x,y:-p.y},d.points[i])>.2),p=t.source[i],q=d.points[i],name=['Red','Blue','Purple'][i];return q.y>=0?`${name} is still on the source side. Its reflected partner belongs across the crease.`:Math.abs(q.x-p.x)>.2?`${name} moved sideways. A reflected pair lies on a perpendicular through the source, so its left/right grid position stays the same.`:`${name} is ${Math.abs(q.y).toFixed(1)} units from the crease; its source is ${p.y.toFixed(1)} units away. Match the perpendicular distances.`;}
 if(dist(d.image,ghost(t))>.15)return 'Fix B′ first. It must be directly opposite B, at equal perpendicular distance from the mirror.';
 if(!d.line)return 'Connect A to your reflected destination B′ before marking the crossing.';
 return 'P belongs where A–B′ crosses the mirror. A midpoint guess is not a general shortest-route method.';
}
export function submit(s){if(s.phase!=='play'||!validInput(s))return null;const ok=correct(s.task,s.draft),key=keyFor(s);const event={key,chapter:s.chapter,sub:s.sub,seed:s.task.seed,kind:s.task.kind,correct:ok,recovery:s.variant>0,guided:false,task:structuredClone(s.task),response:structuredClone(s.draft),at:new Date().toISOString()};if(!s.records[key])s.records[key]=structuredClone(event);s.history.push(event);s.result={ok,message:ok?s.task.kind==='network'?'Your light link reaches the receiver. A working design—one of several possible arrangements. The gallery is ready!':'Your plan works. Watch what it makes happen.':feedback(s.task,s.draft)};s.phase='result';if(!ok){s.errors++;if(s.task.kind==='route'&&inspectPath(s.task,s.draft.p).hit){awardSuccess(s,'working-ray');s.result.message='The beam reaches B, so the receiver stays active. Your construction still needs a valid reflected point. '+s.result.message;}}else{awardSuccess(s);if(!hasMore(s))finish(s);}return ok;}
export function solve(t){const d=draft(t);if(t.kind==='viewer'){d.installed=[true,true];d.angles=viewerSolution(t);d.turned=[true,true];}if(t.kind==='network')d.mirrors=networkSolution(t);if(t.kind==='mirror'){d.rotation=mirrorSuccessAngle(t);d.touched=true;}if(t.kind==='ray'){d.angle=t.angle;d.side=1;d.touched=true;}if(t.kind==='shape'){d.points=t.source.map(p=>({x:p.x,y:-p.y}));d.parts=[true,true,true];d.touched=true;}if(t.kind==='investigation'){d.selected=t.bestIndex;d.reason='equal-shortest';d.tests=[{...inspectPath(t,t.candidates[t.bestIndex]),seed:t.seed,index:t.bestIndex}];}
 if(t.kind==='route'){d.image=ghost(t);d.p=optimal(t).x;d.line=true;d.imageTouched=true;d.pTouched=true;d.intersection=true;}return d;}
export function solutionID(t){if(t.kind==='investigation')return JSON.stringify([t.a,t.b,t.bestIndex]);if(t.kind==='viewer')return JSON.stringify([t.mirrors,viewerSolution(t)]);if(t.kind==='network')return JSON.stringify(networkSolution(t));if(t.kind==='ray')return String(t.answer);if(t.kind==='mirror')return String(mirrorSuccessAngle(t));if(t.kind==='shape')return JSON.stringify(t.source);return JSON.stringify([ghost(t),optimal(t)]);}
export function retry(s){const prev=structuredClone(s.task);s.variant++;s.task=taskFor(s);let n=0;while(solutionID(s.task)===solutionID(prev)&&n++<100){s.variant++;s.task=taskFor(s);}s.previous=prev;s.draft=draft(s.task);if(s.task.kind==='investigation'){s.floorTask=asRoute(s.task);s.routes=[];s.best=null;}s.phase='play';s.result=null;}
export function guided(s){if(s.errors<2)return false;s.draft=solve(s.task);s.chapterGuided=true;awardSuccess(s,'guided');if(s.task.kind==='investigation'){s.routes=structuredClone(s.draft.tests);s.best=Math.min(...s.routes.map(r=>r.total));}s.history.push({key:keyFor(s),chapter:s.chapter,sub:s.sub,kind:s.task.kind,correct:true,guided:true,task:structuredClone(s.task),response:structuredClone(s.draft),at:new Date().toISOString()});s.result={ok:true,guided:true,message:'Completed with Pip’s support. Follow the shown method; your independent first result stays unchanged.'};s.phase='result';if(!hasMore(s))finish(s);return true;}
export function advance(s){if(s.phase==='complete')return false;if(!s.result?.ok)return false;if(hasMore(s)){s.sub++;s.variant=0;s.errors=0;s.task=taskFor(s);s.draft=draft(s.task);s.result=null;s.phase='play';return true;}finish(s);return true;}
export function trial(s,index){if(s.task.kind!=='investigation'||s.phase!=='play'||s.draft.selected==null)return false;if(!Number.isInteger(index)||index<0||index>2||s.draft.tests.some(r=>r.index===index))return false;if(!s.draft.predictionSaved){s.history.push({key:'investigation-prediction',kind:'prediction',chapter:4,seed:s.task.seed,response:s.draft.selected,correct:s.draft.selected===s.task.bestIndex,at:new Date().toISOString()});s.draft.predictionSaved=true;}const record={...inspectPath(s.task,s.task.candidates[index]),seed:s.task.seed,index};s.draft.tests.push(record);if(record.hit)mark(s,'shutter-open','ray-test');s.draft.lastTest=index;s.routes=structuredClone(s.draft.tests);s.best=Math.min(...s.routes.map(r=>r.total));return record;}
export function finishExplore(s){return submit(s);}
export function results(s){const count=prefix=>Object.entries(s.records).filter(([k,v])=>k.startsWith(prefix)&&v.correct&&!v.guided).length;return {rays:count('ray-'),routes:count('route-'),rayDone:[0,1,2,3].every(i=>s.records[`ray-${i}`]),routeDone:[0,1,2].every(i=>s.records[`route-${i}`]),guided:s.history.filter(x=>x.guided&&!x.key.startsWith('bonus-')).length,recovered:s.history.filter(x=>x.recovery&&x.correct&&!x.key.startsWith('bonus-')).length,completed:s.completed.length};}

export function continueJourney(s){if(!chapterReady(s))return false;acknowledgeRecap(s);if(s.bonus||s.chapter===6){s.bonus=false;s.screen='end';}else enter(s,s.chapter+1);return true;}

export function endingFeedback({rays,routes}){
 if(rays===0&&routes===0)return 'More independent practice recommended';
 if(rays>=3&&routes>=2)return 'Both learning targets demonstrated independently!';
 return 'Keep it up—you’ll do better next time!';
}
