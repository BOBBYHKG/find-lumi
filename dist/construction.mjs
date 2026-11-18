export const isFinalConstruction=s=>!!(s?.task?.kind==='route'&&s.chapter===6&&s.sub===2&&!s.bonus);

export function constructionPrompts(s){
 const d=s?.draft||{},faded=isFinalConstruction(s);
 if(faded)return {
  faded,
  place:d.imageTouched?'✓ B′ point':'B′ point',
  line:d.line?'✓ Straightedge':'Straightedge',
  intersect:d.intersection?'✓ Intersection':'Intersection',
  instruction:d.intersection?'Your construction is ready to test.':d.line?'Your straightedge is on the plan.':d.imageTouched?'Your B′ point is on the grid.':'Use the tools to prepare a reflection path to the exit receiver.'
 };
 return {
  faded,
  place:'1 · Place B′',
  line:d.line?'✓ Line A–B′':'2 · Draw A–B′',
  intersect:d.intersection?'✓ P marked':'3 · Mark P ∩',
  instruction:d.intersection?'P is the intersection of your line and the mirror.':d.line?'Use Mark P to select the line–mirror intersection.':'Place B′ across the mirror, then draw your line.'
 };
}

export function toggleConstructionHint(s){
 if(!isFinalConstruction(s)||s.phase!=='play'||!s.draft)return false;
 const d=s.draft,opening=!d.hintOpen,firstOpening=!d.hintSeen;
 d.hintOpen=opening;
 d.hintSeen=true;
 if(opening&&firstOpening){
  s.support??=[];
  s.support.push({kind:'construction-hint',chapter:s.chapter,sub:s.sub,variant:s.variant,at:new Date().toISOString()});
 }
 return true;
}

export function constructionHint(s){
 if(!isFinalConstruction(s)||s.phase!=='play'||!s.draft)return '';
 const open=!!s.draft.hintOpen;
 return `<div class="construction-hint"><button type="button" id="construction-hint-toggle" class="text construction-hint-toggle" data-action="construction-hint" aria-expanded="${open}" aria-controls="construction-hint-panel">${open?'Hide hint':'Hint'}</button>${open?'<div id="construction-hint-panel" class="construction-hint-panel" role="note"><b>Method reminder</b><p>Reflect B across the mirror. Its partner B′ has the same perpendicular distance on the other side. Connect A to your B′. The intersection of that line and the mirror gives P.</p></div>':''}</div>`;
}
