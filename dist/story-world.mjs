import * as T from 'three';
import {has,walkPath} from './journey.mjs';

export function outside(w){
 w.door=null;w.scene.background.set('#c9e5ed');w.ambient.intensity=2.6;w.sun.intensity=3;
 w.box(19,.2,16,'#b8cea5',0,-.13,-1);w.box(3.8,.04,12,'#e7d7b7',0,.01,0);
 for(const x of [-3.9,3.9])w.box(5.6,4,.35,'#c2aed0',x,2,-4.6);
 w.box(2.2,.8,.35,'#c2aed0',0,3.6,-4.6);
 for(const x of [-1.15,1.15])w.box(.15,3.2,.4,'#fff4db',x,1.6,-4.35);
 w.box(2.45,.15,.4,'#fff4db',0,3.2,-4.35);w.label('OUTSIDE · TOGETHER',0,3.65,-4.25,'#746085',.42);
 for(const x of [-5.5,5.5]){w.mesh(new T.CylinderGeometry(.18,.22,1.7,10),'#a1886e',x,.8,-1.4);w.ball(1.1,'#85b38d',x,2.5,-1.4);w.ball(.75,'#a1c28e',x+.5,2.9,-1.4);}
 w.label('MIRROR MUSEUM',0,2.65,-4.3,'#8e7b9e',.25);
}

function family(w,parent){const party=new T.Group();parent.add(party);w.person(-.45,0,false,party);w.person(.22,.05,true,party);w.robot(.5,-.5,party);return party;}
const partyPosition=s=>new T.Vector3(has(s,'escaped')?4.9:has(s,'return-marker-2')?1.1:has(s,'return-marker-1')?-1.5:-4.6,0,has(s,'escaped')?-7:-4.2);
const shutterHeight=2.9,shutterTop=2.9;
function rollShutter(w,scale){w.shutter.scale.y=scale;w.shutter.position.y=shutterTop-shutterHeight*scale/2;}

export function updateStory(w,s){
 if(s.screen!=='game'||s.bonus)return;
 const signature=[s.chapter,...s.journey.events.map(e=>e.id)].join('|');if(signature===w.storySignature)return;
 const previousParty=w.party?.position.clone(),previousShutterScale=w.shutter?.scale.y;
 w.clear(w.story);w.party=null;w.maya=null;w.shutter=null;w.passCard=null;w.storySignature=signature;
 const c=s.chapter;
 w.doorTarget=(c===1?has(s,'route-found'):c===2?has(s,'arcade-open'):c===3?has(s,'courtyard-open'):c===4||c===5?has(s,'gallery-open'):has(s,'exit-open'))?-1.45:0;
 if(c<6){
  if(!has(s,'reunited')){w.maya=w.person(-5.2,2.6,false,w.story);w.label('MAYA',-5.2,2.2,2.6,'#87649e',.23,w.story);}
  if(c===1&&has(s,'route-found')){w.label('ARCADE PASSAGE →',4.85,3.3,-5.15,'#4d9d88',.27,w.story);}
  if(c===2){for(let i=0;i<2;i++){const on=has(s,'arcade-catch-'+(i+1));w.ball(.15,on?'#58b79a':'#9b8ba6',-2+i*.55,2.6,-4.5,w.story);w.label('CATCH '+(i+1),-2+i*.55,3,-4.5,'#6c6185',.15,w.story);}if(has(s,'arcade-open'))w.label('PASSAGE RELEASED',-5.4,3.35,-5.2,'#4e9a81',.26,w.story);}
  if(c===3){
   w.box(.55,.8,.25,'#7d7793',3.8,1.2,-5.1,w.story);w.ball(.075,has(s,'courtyard-open')?'#6ce0ac':'#eab46a',3.8,1.4,-4.94,w.story);
   w.label(has(s,'courtyard-open')?'PASS ACCEPTED':'VISITOR PASS READER',3.8,2,-5.05,'#75618c',.23,w.story);
   if(has(s,'pass-repaired')){w.passCard=new T.Group();w.story.add(w.passCard);w.passCard.position.set(3.4,1.2,has(s,'courtyard-open')?-4.95:-2.4);w.box(.9,.56,.035,'#fff5d7',0,0,0,w.passCard);for(const [i,p]of s.journey.pass.source.entries())for(const side of [-1,1])w.ball(.025,['#d57b69','#69a89e','#a283b7'][i],(p.x-5)*.07,p.y*.06*side,.04,w.passCard);w.tube([-.36,0,.04],[.36,0,.04],'#d7ae63',.012,w.passCard);}
  }
  if(c===4||c===5){
   w.label('STAR GALLERY · LUMI + PIP',2.5,3.35,-5.1,'#7d659b',.27,w.story);
   if(has(s,'reunited')){w.party=family(w,w.story);w.party.position.set(2.7,0,-4.65);}
   else {w.person(2.4,-5.1,true,w.story);w.robot(3.25,-5.1,w.story);}
   for(const x of [.7,4.2])w.box(.13,2.9,.2,'#f4e5c5',x,1.45,-4.8,w.story);
   if(!has(s,'gallery-open'))for(let i=0;i<8;i++)w.box(.045,2.5,.045,'#aa9ebc',.9+i*.44,1.3,-4.75,w.story);
   w.box(3.7,.26,.3,'#8d7e9f',2.45,3.02,-4.55,w.story);
   w.shutter=w.box(3.5,shutterHeight,.12,'#9f91b0',2.45,shutterTop-shutterHeight/2,-4.55,w.story);
   for(let y=-1.2;y<=1.2;y+=.24)w.box(3.36,.02,.015,'#b3a4c1',0,y,.07,w.shutter);
   w.shutterScaleTarget=has(s,'shutter-open')?.055:1;w.shutterTarget=shutterTop-shutterHeight*w.shutterScaleTarget/2;
   rollShutter(w,previousShutterScale??w.shutterScaleTarget);
   for(let i=0;i<3;i++){const on=has(s,'approach-lit');w.box(.14,.3,.14,'#a7a0af',-2+i*1.5,.15,-4.45,w.story);w.mesh(new T.SphereGeometry(.12,12,8),on?'#aee3be':'#8f879e',-2+i*1.5,.4,-4.45,w.story,{emissive:on?'#73bd83':'#000000',emissiveIntensity:.7});}
  }
 }else{
  w.party=family(w,w.story);w.partyTarget=partyPosition(s);w.party.position.copy(previousParty||w.partyTarget);
  for(let i=0;i<2;i++){const on=has(s,'return-marker-'+(i+1));w.box(1.25,.06,.65,on?'#a6d4ae':'#8d86a4',-1.5+i*2.6,.05,-4.2,w.story);w.label('RETURN '+(i+1)+(on?' · LIT':''),-1.5+i*2.6,1.5,-4.85,on?'#4d947d':'#79708f',.22,w.story);}
  w.label(has(s,'exit-open')?'EXIT OPEN':'MUSEUM EXIT',4.9,3.35,-5.2,has(s,'exit-open')?'#4d9d88':'#807097',.29,w.story);
 }
}

export function animateJourney(w,done,kind='device'){
 w.holdJourney=false;
 if(w.s.settings.reduced&&['insert-pass','reunite','leave-together'].includes(kind)){w.targetPos.set(6.5,4,2);w.targetLook.set(kind==='insert-pass'?3.7:3,1,-4.8);w.camera.position.copy(w.targetPos);w.look.copy(w.targetLook);}
 if(w.s.settings.reduced){if(w.shutter)rollShutter(w,w.shutterScaleTarget);if(w.door)w.door.rotation.y=w.doorTarget||0;if(w.party&&w.partyTarget)w.party.position.copy(w.partyTarget);done();return;}
 const motion={kind,elapsed:0,duration:kind==='reunite'?2800:kind==='leave-together'?2500:kind==='insert-pass'?1800:950,done};
 if(kind==='reunite'&&w.party){motion.actor=w.party.children[0];motion.end=motion.actor.position.clone();const end={x:w.party.position.x+motion.end.x,z:w.party.position.z+motion.end.z};motion.points=walkPath(kind,{x:-5.2,z:2.6},end).map(p=>new T.Vector3(p.x-w.party.position.x,0,p.z-w.party.position.z));motion.start=motion.points[0];motion.actor.position.copy(motion.start);motion.duration=3400;if(w.maya)w.maya.visible=false;w.targetPos.set(7.5,6.5,6.5);w.targetLook.set(0,.7,-1.5);}
 else if(kind==='leave-together'&&w.party){motion.actor=w.party;motion.start=w.party.position.clone();motion.end=new T.Vector3(4.9,0,-7);motion.points=walkPath(kind,motion.start,motion.end).map(p=>new T.Vector3(p.x,0,p.z));motion.duration=3000;w.targetPos.set(6.5,4.5,2);w.targetLook.set(3,1,-4.8);}
 else if(kind==='insert-pass'&&w.passCard){motion.actor=w.passCard;motion.start=new T.Vector3(3.4,1.2,-2.4);motion.end=new T.Vector3(3.8,1.2,-4.95);motion.actor.position.copy(motion.start);w.targetPos.set(6.2,3,1);w.targetLook.set(3.7,1.2,-4.7);}
 else if(w.s.chapter===6&&w.party&&w.partyTarget){motion.actor=w.party;motion.start=w.party.position.clone();motion.end=w.partyTarget.clone();}
 w.storyMotion=motion;
}

export function tickStory(w,dt,paused){
 const m=w.storyMotion,hold=w.holdJourney||paused||m?.kind==='insert-pass'&&m.elapsed<m.duration*.6;
 if(!hold){if(w.door)w.door.rotation.y+=(w.doorTarget-w.door.rotation.y)*Math.min(1,dt*5);if(w.shutter)rollShutter(w,w.shutter.scale.y+(w.shutterScaleTarget-w.shutter.scale.y)*Math.min(1,dt*5));}
 if(!m)return;if(!paused)m.elapsed+=dt*1000;const u=Math.min(1,m.elapsed/m.duration),ease=u*u*(3-2*u);
 if(m.actor){if(m.points){const lengths=m.points.slice(1).map((p,i)=>p.distanceTo(m.points[i]));let remaining=lengths.reduce((a,b)=>a+b,0)*ease;for(let i=0;i<lengths.length;i++){if(remaining<=lengths[i]||i===lengths.length-1){m.actor.position.lerpVectors(m.points[i],m.points[i+1],Math.min(1,remaining/lengths[i]));break;}remaining-=lengths[i];}}else m.actor.position.lerpVectors(m.start,m.end,ease);if(m.kind!=='insert-pass'&&u<1)m.actor.position.y+=Math.sin(u*Math.PI*10)*.025;}
 if(u===1){if(w.shutter)rollShutter(w,w.shutterScaleTarget);w.storyMotion=null;m.done();}
}
