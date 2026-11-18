export const STOPS=[
 {name:'Workshop',goal:'Read the passage sign beyond the wall.',reward:'The viewer revealed the arcade passage.',flag:'route-found'},
 {name:'Arcade',goal:'Catch two bank shots to release the passage.',reward:'Both catches released the barrier to the paper studio.',flag:'arcade-open'},
 {name:'Pass studio',goal:'Repair the symmetric visitor pass and use it at the courtyard gate.',reward:'Your repaired pass opened the courtyard gate.',flag:'courtyard-open'},
 {name:'Courtyard',goal:'Send light to the shutter receiver to reveal the gallery entrance.',reward:'The receiver lifted the shutter. Lumi and Pip are visible beyond the gallery gate.',flag:'shutter-open'},
 {name:'Star Gallery',goal:'Light the approach, open the gallery gate and reach Lumi.',reward:'The approach is lit, the gallery gate is open, and Maya has reunited with Lumi.',flag:'reunited'},
 {name:'Museum exit',goal:'Guide Maya and Lumi along the return markers and out of the museum.',reward:'Maya and Lumi followed the return markers and left the museum together.',flag:'escaped'}
];
export const has=(s,id)=>!!s.journey?.events?.some(e=>e.id===id);
export function mark(s,id,source='play'){
 s.journey??={events:[]};if(has(s,id))return false;
 s.journey.events.push({id,chapter:s.chapter,sub:s.sub,source,at:new Date().toISOString()});return true;
}
export function awardSuccess(s,source='play'){
 if(s.bonus)return;
 const c=s.chapter;
 if(c===1)mark(s,'route-found',source);
 if(c===2){mark(s,'arcade-catch-'+(s.sub+1),source);if(s.sub===1)mark(s,'arcade-open',source);}
 if(c===3&&mark(s,'pass-repaired',source))s.journey.pass={source:structuredClone(s.task.source),partners:structuredClone(s.draft.points),art:s.choices.art};
 if(c===4)mark(s,'shutter-open',source);
 if(c===5)mark(s,s.sub===0?'approach-lit':'gallery-open',source);
 if(c===6)mark(s,s.sub<2?'return-marker-'+(s.sub+1):'exit-open',source);
}
export function pendingAction(s){
 if(s.bonus||s.phase!=='complete')return null;
 if(s.chapter===3&&has(s,'pass-repaired')&&!has(s,'courtyard-open'))return 'insert-pass';
 if(s.chapter===5&&has(s,'gallery-open')&&!has(s,'reunited'))return 'reunite';
 if(s.chapter===6&&has(s,'exit-open')&&!has(s,'escaped'))return 'leave-together';
 return null;
}
export function performAction(s,action){
 if(pendingAction(s)!==action)return false;
 if(action==='insert-pass')return mark(s,'courtyard-open','visitor-pass');
 if(action==='reunite')return mark(s,'reunited','walk-through-gallery');
 if(action==='leave-together'&&has(s,'reunited')&&has(s,'return-marker-1')&&has(s,'return-marker-2'))return mark(s,'escaped','walk-through-exit');
 return false;
}
export const chapterReady=s=>s.phase==='complete'&&(s.bonus||!!(!pendingAction(s)&&has(s,STOPS[s.chapter-1].flag)));
export function walkPath(kind,start,end){return kind==='reunite'?[start,{x:-5.2,z:-4.05},{x:end.x,z:-4.05},end]:[start,{x:4.9,z:start.z},end];}
export function stage(s){return has(s,'escaped')?'Outside together':has(s,'reunited')?'Leave together':has(s,'shutter-open')?'Reach Lumi':'Find a route to Lumi';}
export function passStatus(s){return has(s,'courtyard-open')?'Pass used · gate open':has(s,'pass-repaired')?'Visitor pass ready':'Visitor pass · missing half';}
export function worldGoal(s){
 if(s.bonus)return 'An optional mirror design after your completed journey.';
 if(s.chapter===1&&has(s,'route-found'))return 'The sign revealed the arcade passage. Follow the route toward Lumi.';
 if(s.chapter===2){if(has(s,'arcade-open'))return 'The barrier is open. Continue to the pass studio.';if(has(s,'arcade-catch-1'))return 'One catch secured. Catch shot 2 to release the passage.';}
 if(s.chapter===3){if(has(s,'courtyard-open'))return 'The courtyard gate is open. Your visitor pass stays with you.';if(has(s,'pass-repaired'))return 'Your repaired pass is ready. Insert it into the courtyard reader.';}
 if(s.chapter===4&&has(s,'shutter-open'))return s.phase==='complete'?'The shutter is open. Approach the gallery entrance.':s.variant?'The shutter stays open. Practise the explanation with Pip on this new layout.':'Lumi is visible! Explain the successful path before continuing.';
 if(s.chapter===5){
  if(has(s,'reunited'))return 'You and Lumi are together. Follow the return route to the museum exit.';
  if(s.sub===0&&has(s,'approach-lit'))return s.result?.ok===true?'Approach lit. Continue to the new gallery-gate receiver.':'The approach stays lit. Complete the construction practice with Pip.';
  if(s.sub===1&&has(s,'gallery-open'))return s.result?.ok===true?'The gallery gate is open. Walk through to Lumi.':'The gallery gate stays open. Complete the construction practice with Pip.';
  return s.sub===0?'New receiver: light the approach to the gallery gate.':'Approach lit. Reach the new gate receiver to open the gallery.';
 }
 if(s.chapter===6){
  if(s.sub<2)return has(s,'return-marker-'+(s.sub+1))?`Return marker ${s.sub+1} is lit. Maya and Lumi move closer to the exit.`:`Activate return marker ${s.sub+1}; Maya and Lumi will follow it.`;
  if(has(s,'exit-open'))return s.result?.ok===true?'The exit is open. Leave the museum together.':'The exit stays open. Complete the construction practice, then leave together.';
  return 'Both markers are lit. Reach the exit receiver, then leave together.';
 }
 return STOPS[s.chapter-1].goal;
}
