import test from 'node:test';import assert from 'node:assert/strict';
import {initial,enter,begin,solve,submit,advance,correct,validInput,setImage,constructIntersection,results,retry} from '../dist/game.mjs';
import {isFinalConstruction,constructionPrompts,toggleConstructionHint,constructionHint} from '../dist/construction.mjs';

function finalConstruction(){const s=initial();enter(s,6);begin(s);for(let i=0;i<2;i++){s.draft=solve(s.task);submit(s);advance(s);}return s;}
const plan=d=>({image:structuredClone(d.image),p:d.p,line:d.line,mode:d.mode,imageTouched:d.imageTouched,pTouched:d.pTouched,intersection:d.intersection});
const evidence=s=>({task:structuredClone(s.task),records:structuredClone(s.records),history:structuredClone(s.history),journey:structuredClone(s.journey),chapter:s.chapter,sub:s.sub,phase:s.phase,variant:s.variant,errors:s.errors,result:results(s)});

test('only the final main construction fades the method prompts',()=>{
 const s=finalConstruction();assert.ok(isFinalConstruction(s));assert.equal(constructionPrompts(s).faded,true);
 for(const change of [{chapter:5},{sub:1},{bonus:true},{task:{kind:'ray'}}])assert.equal(isFinalConstruction({...s,...change}),false);
 assert.equal(isFinalConstruction(null),false);assert.equal(isFinalConstruction({}),false);
});

test('Task 5 retains the existing numbered method and normal progress instructions',()=>{
 const s=initial();enter(s,5);begin(s);const p=constructionPrompts(s);
 assert.equal(p.faded,false);assert.equal(p.place,'1 · Place B′');assert.equal(p.line,'2 · Draw A–B′');assert.equal(p.intersect,'3 · Mark P ∩');assert.equal(p.instruction,'Place B′ across the mirror, then draw your line.');
 s.draft.line=true;assert.equal(constructionPrompts(s).line,'✓ Line A–B′');assert.equal(constructionPrompts(s).instruction,'Use Mark P to select the line–mirror intersection.');
 s.draft.intersection=true;assert.equal(constructionPrompts(s).intersect,'✓ P marked');assert.match(constructionPrompts(s).instruction,/intersection of your line/);
 assert.equal(constructionHint(s),'');const before=structuredClone(s);assert.equal(toggleConstructionHint(s),false);assert.deepEqual(s,before);
});

test('final controls give neutral tool states while the method reminder stays optional',()=>{
 const s=finalConstruction();let p=constructionPrompts(s);
 assert.equal(p.place,'B′ point');assert.equal(p.line,'Straightedge');assert.equal(p.intersect,'Intersection');
 assert.doesNotMatch(Object.values(p).join(' '),/1 ·|2 ·|3 ·|Place B′|Draw A|Mark P|then|Reflect B/);
 const closed=constructionHint(s);assert.match(closed,/data-action="construction-hint"/);assert.match(closed,/aria-expanded="false"/);assert.doesNotMatch(closed,/Method reminder|Reflect B|same perpendicular/);
 setImage(s,{x:s.task.b.x,y:-s.task.b.y});p=constructionPrompts(s);assert.equal(p.place,'✓ B′ point');assert.equal(p.instruction,'Your B′ point is on the grid.');
 s.draft.line=true;assert.equal(constructionPrompts(s).instruction,'Your straightedge is on the plan.');constructIntersection(s);p=constructionPrompts(s);assert.equal(p.line,'✓ Straightedge');assert.equal(p.intersect,'✓ Intersection');assert.equal(p.instruction,'Your construction is ready to test.');
 assert.ok(toggleConstructionHint(s));const open=constructionHint(s);assert.match(open,/aria-expanded="true"/);assert.match(open,/Method reminder/);assert.match(open,/Reflect B across the mirror/);assert.match(open,/intersection of that line/);assert.doesNotMatch(open,/\d/);assert.deepEqual(constructionPrompts(s),p);
});

test('hint opening, closing and reload preserve the chosen plan and all first-attempt evidence',()=>{
 const s=finalConstruction();setImage(s,{x:6,y:-2});s.draft.line=true;constructIntersection(s);
 const beforePlan=plan(s.draft),beforeEvidence=evidence(s);assert.ok(toggleConstructionHint(s));assert.equal(s.draft.hintOpen,true);assert.equal(s.draft.hintSeen,true);assert.deepEqual(plan(s.draft),beforePlan);assert.deepEqual(evidence(s),beforeEvidence);
 assert.equal(s.support.length,1);const first=structuredClone(s.support[0]);assert.equal(first.kind,'construction-hint');assert.equal(first.chapter,6);assert.equal(first.sub,2);assert.equal(first.variant,0);assert.ok(Number.isFinite(Date.parse(first.at)));
 assert.ok(toggleConstructionHint(s));assert.equal(s.draft.hintOpen,false);assert.equal(s.draft.hintSeen,true);assert.deepEqual(plan(s.draft),beforePlan);assert.deepEqual(evidence(s),beforeEvidence);
 const loaded=JSON.parse(JSON.stringify(s));assert.ok(toggleConstructionHint(loaded));assert.equal(loaded.draft.hintOpen,true);assert.deepEqual(loaded.support,[first]);assert.deepEqual(plan(loaded.draft),beforePlan);assert.deepEqual(evidence(loaded),beforeEvidence);
 assert.ok(toggleConstructionHint(loaded));assert.equal(loaded.draft.hintSeen,true);assert.deepEqual(loaded.support,[first]);
});

test('a fresh recovery draft can log its own hint without replacing the failed first response',()=>{
 const s=finalConstruction();setImage(s,{x:0,y:-1});s.draft.line=true;constructIntersection(s);toggleConstructionHint(s);assert.equal(submit(s),false);const first=structuredClone(s.records['route-2']);retry(s);
 assert.notEqual(s.draft.hintSeen,true);assert.notEqual(s.draft.hintOpen,true);assert.ok(toggleConstructionHint(s));assert.equal(s.support.length,2);assert.notEqual(s.support[0].variant,s.support[1].variant);assert.deepEqual(s.records['route-2'],first);
});

test('earlier v4 drafts without hint fields or a support array remain compatible',()=>{
 const s=finalConstruction();delete s.support;delete s.draft.hintOpen;delete s.draft.hintSeen;assert.equal(s.draft.hintOpen,undefined);assert.equal(s.draft.hintSeen,undefined);const before=plan(s.draft);assert.ok(toggleConstructionHint(s));assert.equal(s.support.length,1);assert.deepEqual(plan(s.draft),before);assert.ok(toggleConstructionHint(s));assert.ok(toggleConstructionHint(s));assert.equal(s.support.length,1);
 for(const phase of ['lesson','result','complete']){const other={...s,phase,draft:structuredClone(s.draft),support:structuredClone(s.support)},copy=structuredClone(other);assert.equal(toggleConstructionHint(other),false);assert.equal(constructionHint(other),'');assert.deepEqual(other,copy);}
});

test('using the reminder neither completes input nor supplies a correct point or changes grading',()=>{
 const blank=finalConstruction(),blankPlan=plan(blank.draft);assert.equal(validInput(blank),false);toggleConstructionHint(blank);assert.equal(validInput(blank),false);assert.deepEqual(plan(blank.draft),blankPlan);
 for(const right of [false,true]){const s=finalConstruction();setImage(s,{x:right?s.task.b.x:0,y:-s.task.b.y});s.draft.line=true;constructIntersection(s);const expected=correct(s.task,s.draft),input=validInput(s),snapshot=evidence(s),chosen=plan(s.draft);assert.equal(expected,right);toggleConstructionHint(s);assert.equal(correct(s.task,s.draft),expected);assert.equal(validInput(s),input);assert.deepEqual(plan(s.draft),chosen);assert.deepEqual(evidence(s),snapshot);assert.equal(submit(s),expected);assert.equal(s.records['route-2'].correct,expected);assert.equal(s.support.length,1);}
});
