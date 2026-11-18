import * as T from 'three';
import {radians,ghost,optimal,length} from './math.mjs';
import {viewerPath,viewerEye,viewerGuide,traceNetwork,inspectPath} from './mechanics.mjs';
import {predicted,solve} from './game.mjs';
import {has} from './journey.mjs';
import {outside,updateStory,animateJourney,tickStory} from './story-world.mjs';
const mats=new Map(),cached=new WeakSet();
function material(c,extra={}){if(Object.keys(extra).length)return new T.MeshStandardMaterial({color:c,roughness:.7,...extra});if(!mats.has(c)){const m=new T.MeshStandardMaterial({color:c,roughness:.72});mats.set(c,m);cached.add(m);}return mats.get(c);}
export class World{
 constructor(canvas,onPoint,onInteract){
  this.canvas=canvas;this.onPoint=onPoint;this.onInteract=onInteract;this.scene=new T.Scene();this.scene.background=new T.Color('#b7deec');this.scene.fog=new T.Fog('#c6e4ee',22,42);
  this.renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
  this.camera=new T.PerspectiveCamera(53,1,.05,80);const ambient=new T.HemisphereLight('#fff7e6','#9db4bc',2.6);ambient.layers.enable(1);this.scene.add(ambient);this.ambient=ambient;const sun=new T.DirectionalLight('#fff3cf',3.3);sun.position.set(-4,10,6);sun.layers.enable(1);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-9;sun.shadow.camera.right=9;sun.shadow.camera.top=9;sun.shadow.camera.bottom=-9;sun.shadow.normalBias=.03;this.scene.add(sun);this.sun=sun;
  this.room=new T.Group();this.dynamic=new T.Group();this.story=new T.Group();this.scene.add(this.room,this.dynamic,this.story);this.ray=new T.Raycaster();this.pointer=new T.Vector2();this.keys={};this.targetPos=new T.Vector3();this.targetLook=new T.Vector3();this.look=new T.Vector3();this.last=performance.now();this.clock=0;this.hover=null;this.bounces=[];this.mirror=null;this.runner=null;this.anim=null;
  this.resize();window.addEventListener('resize',()=>this.resize());window.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||document.querySelector('dialog[open]'))return;this.keys[e.code]=true;if(e.code==='KeyE')this.onInteract();});window.addEventListener('keyup',e=>this.keys[e.code]=false);
  canvas.addEventListener('pointerdown',e=>{
   if(!this.s||document.querySelector('dialog[open]'))return;
   canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);
   if(this.s.inspection){this.placing=true;this.pick(e);return;}
   this.drag={x:e.clientX,y:e.clientY,moved:false,toy:false};
   this.pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);this.ray.setFromCamera(this.pointer,this.camera);
   const hit=this.ray.intersectObjects(this.room.children,true).find(h=>h.object.userData.toy);
   if(hit){this.bounces.push({mesh:hit.object,t:0,y:hit.object.position.y});this.drag.toy=true;}
  });
  canvas.addEventListener('pointermove',e=>{
   if(this.placing&&this.s.inspection){this.pick(e);return;}
   if(!this.drag||this.s.inspection)return;
   const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;if(Math.abs(dx)+Math.abs(dy)>2)this.drag.moved=true;this.drag.x=e.clientX;this.drag.y=e.clientY;
   const v=this.targetLook.clone().sub(this.targetPos).normalize(),yaw=Math.atan2(v.x,v.z)-dx*.004,pitch=Math.max(-.85,Math.min(.8,Math.asin(v.y)-dy*.004));
   this.targetLook.copy(this.targetPos).add(new T.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(5));
  });
  canvas.addEventListener('pointerup',()=>{this.placing=false;if(this.drag&&!this.drag.moved&&!this.drag.toy)this.onInteract();this.drag=null;});
  canvas.addEventListener('pointercancel',()=>{this.placing=false;this.drag=null;});
  window.addEventListener('blur',()=>{this.keys={};this.placing=false;this.drag=null;});
  this.tick=this.tick.bind(this);this.frame=requestAnimationFrame(this.tick);
 }
 resize(){this.renderer.setSize(innerWidth,innerHeight,false);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();if(this.s?.screen==='game'&&this.s.task)this.setView(this.s);}
 mesh(g,c,x,y,z,parent=this.room,extra={}){const m=new T.Mesh(g,material(c,extra));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 box(w,h,d,c,x,y,z,parent=this.room){return this.mesh(new T.BoxGeometry(w,h,d),c,x,y,z,parent);}
 ball(r,c,x,y,z,parent=this.room){return this.mesh(new T.SphereGeometry(r,20,14),c,x,y,z,parent);}
 tube(a,b,c,r=.035,parent=this.dynamic){const av=new T.Vector3(...a),bv=new T.Vector3(...b),v=bv.clone().sub(av),m=this.mesh(new T.CylinderGeometry(r,r,v.length(),8),c,0,0,0,parent);m.position.copy(av.add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;}
 label(text,x,y,z,color='#41415c',size=.38,parent=this.room){
  const makeLayout=compact=>{
   const cv=document.createElement('canvas'),ctx=cv.getContext('2d'),font='bold 34px "Segoe UI", sans-serif',lines=[];
   ctx.font=font;
   if(compact&&text.length>22){let line='';for(const word of text.split(' ')){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>420){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);}else lines.push(text);
   cv.width=Math.min(1024,Math.max(70,Math.ceil(Math.max(...lines.map(line=>ctx.measureText(line).width)))+28));cv.height=62+(lines.length-1)*43;
   ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(0,0,cv.width,cv.height,14);ctx.fill();ctx.fillStyle='#fff8ea';ctx.font=font;ctx.textAlign='center';ctx.textBaseline='middle';lines.forEach((line,i)=>ctx.fillText(line,cv.width/2,31+i*43));
   const texture=new T.CanvasTexture(cv);texture.colorSpace=T.SRGBColorSpace;return {compact,texture,aspect:cv.width/cv.height,height:cv.height,rows:lines.length};
  };
  let layout=makeLayout(innerWidth<650);const m=new T.Sprite(new T.SpriteMaterial({map:layout.texture,depthTest:true})),position=new T.Vector3(),screen=new T.Vector3(),viewport=new T.Vector4();
  m.position.set(x,y,z);m.scale.set(layout.aspect*size*layout.height/62,size*layout.height/62,1);
  m.onBeforeRender=(renderer,scene,camera)=>{
   const compact=innerWidth<650;if(compact!==layout.compact){m.material.map.dispose();layout=makeLayout(compact);m.material.map=layout.texture;}
   const base=size*layout.height/62,viewerSign=m.userData.viewerSign&&camera===this.viewerCam;let height=base;
   if(compact||viewerSign){
    position.setFromMatrixPosition(m.matrixWorld).applyMatrix4(camera.matrixWorldInverse);renderer.getViewport(viewport);
    const pixelsPerUnit=viewport.w*.5*camera.projectionMatrix.elements[5]/Math.max(.1,-position.z);
    if(compact){
    // Keep close-set ticks compact; apparatus names get a readable, bounded lift.
    const tick=/^\d+$/.test(text),point=/^P\d+$/.test(text),catchLabel=/^CATCH \d$/.test(text);
    const minimum=tick?14:point?16:layout.rows>1?34:20,growth=catchLabel?1.35:tick?2:point?2.25:2.8,maxWidth=Math.min(innerWidth*.34,layout.rows>1?136:120);
    height=Math.max(base,Math.min(minimum/pixelsPerUnit,base*growth,maxWidth/(layout.aspect*pixelsPerUnit)));
    }
    if(viewerSign)height=Math.min(height,Math.min(22,viewport.w*.18)/pixelsPerUnit,viewport.z*.7/(layout.aspect*pixelsPerUnit));
   }
   if(m.scale.y!==height||m.scale.x!==layout.aspect*height){m.scale.set(layout.aspect*height,height,1);m.updateMatrixWorld();}
   if(text==='SOURCE A'){
    m.center.set(.5,.5);
    if(compact&&camera!==this.viewerCam){
     const control=document.querySelector('.room-controls'),rect=control?.getBoundingClientRect();
     if(rect&&rect.width&&rect.height){
      position.setFromMatrixPosition(m.matrixWorld).applyMatrix4(camera.matrixWorldInverse);screen.setFromMatrixPosition(m.matrixWorld).project(camera);
      const pixels=viewport.w*.5*camera.projectionMatrix.elements[5]/Math.max(.1,-position.z),w=m.scale.x*pixels,h=m.scale.y*pixels,cx=(screen.x*.5+.5)*innerWidth,cy=(-screen.y*.5+.5)*innerHeight;
      if(cx-w/2<rect.right+4&&cx+w/2>rect.left-4&&cy-h/2<rect.bottom+4&&cy+h/2>rect.top-4){
       const target=Math.min(innerWidth-12-w/2,rect.right+6+w/2),dx=Math.max(-88,Math.min(88,target-cx));m.center.x=.5-dx/w;
      }
     }
    }
   }
  };
  m.userData.labelText=text;parent.add(m);return m;
 }
 star(x,y,z,color='#ffce5f',size=.45,parent=this.room){const shape=new T.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,r=i%2?size*.45:size;const xx=Math.cos(a)*r,yy=Math.sin(a)*r;i?shape.lineTo(xx,yy):shape.moveTo(xx,yy);}shape.closePath();return this.mesh(new T.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:true,bevelThickness:.04,bevelSize:.03,bevelSegments:1}),color,x,y,z,parent);}
 person(x,z,child=true,parent=this.room){const g=new T.Group();g.position.set(x,0,z);parent.add(g);const k=child?.7:1;g.scale.setScalar(k);this.mesh(new T.CapsuleGeometry(.23,.45,4,12),child?'#f0a348':'#b087c5',0,.69,0,g);this.ball(.38,'#efb798',0,1.45,0,g);this.mesh(new T.SphereGeometry(.39,20,12,0,Math.PI*2,0,Math.PI*.5),'#6b463e',0,1.55,0,g);for(const xx of [-.14,.14]){this.ball(.09,'#ffffff',xx,1.48,.326,g);this.ball(.048,'#3e3c56',xx,1.48,.4,g);this.mesh(new T.CapsuleGeometry(.065,.31,3,8),'#efb798',xx*2.3,.7,0,g).rotation.z=xx>0?-.2:.2;this.mesh(new T.CapsuleGeometry(.09,.25,3,8),'#68618a',xx,.22,0,g);this.ball(.1,'#ffffff',xx,.07,.07,g);}this.tube([-.08,1.28,.35],[.08,1.28,.35],'#a95e58',.02,g);g.userData.character=true;return g;}
 robot(x,z,parent=this.room){const g=new T.Group();g.position.set(x,0,z);parent.add(g);this.box(.6,.55,.4,'#8cc6b1',0,.6,0,g);this.box(.48,.25,.04,'#435571',0,.66,.23,g);for(const a of [-.14,.14])this.ball(.045,'#f8de82',a,.69,.26,g);for(const a of [-.22,.22])this.mesh(new T.SphereGeometry(.13,12,8),'#53516b',a,.18,0,g);this.tube([0,.9,0],[0,1.1,0],'#7d7a8d',.03,g);this.ball(.065,'#f8ce66',0,1.13,0,g);return g;}
 clear(group){group.traverse(o=>{if(o.isReflector)o.dispose();if(o.geometry)o.geometry.dispose();if(o.material?.map)o.material.map.dispose();if(o.material&&!cached.has(o.material))o.material.dispose();});group.clear();}
 pick(e){if(this.s.phase!=='play')return;this.pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);this.ray.setFromCamera(this.pointer,this.camera);const plane=new T.Plane(new T.Vector3(0,1,0),-.29),p=new T.Vector3();if(this.ray.ray.intersectPlane(plane,p))this.onPoint({x:p.x/.9+5,y:-p.z/.9,angle:Math.atan2(p.z,p.x)*180/Math.PI});}
 galleryProgress(s){if(s.bonus)return 4;return s.screen==='about'||s.screen==='end'?4:s.chapter===6?(s.phase==='complete'||s.task?.kind==='network'&&s.result?.ok?4:Math.min(3,s.sub)):0;}
 galleryPower(s){if(!this.galleryLights?.length)return;const progress=this.galleryProgress(s);this.ambient.intensity=progress===4?2.1:1.2;for(const {light,bulb,threshold} of this.galleryLights){const on=progress>=threshold;light.intensity=on?5:0;bulb.material.color.set(on?'#ebd18d':'#aaa1bd');bulb.material.emissive.set(on?'#c49d55':'#000000');bulb.material.emissiveIntensity=on?.5:0;}}
 environment(s){
  if(s.screen==='end'){outside(this);return;}
  const chapter=s.screen==='about'||s.screen==='end'?6:s.chapter,court=chapter===4||chapter===5;
  this.scene.background.set(chapter===6?'#a7adce':court?'#cce7df':'#c4e3ed');
  this.ambient.intensity=chapter===6?1.2:2.6;this.sun.intensity=chapter===6?1.7:3.3;this.galleryLights=[];
  const walls=['#b9d7cf','#7a8bba','#efc7b4','#c2dfcc','#c2dfcc','#a39bc8'];
  this.box(15,.2,12,court?'#9bc7a3':chapter===2?'#b6b1cf':chapter===3?'#e0c6a7':'#e4d4b9',0,-.13,0);
  const gateX=chapter===2?-5.4:4.9,left=gateX+6.6,right=6.6-gateX;this.box(left,4,.25,walls[chapter-1],-7.5+left/2,1.95,-5.9);this.box(right,4,.25,walls[chapter-1],gateX+.9+right/2,1.95,-5.9);this.box(1.8,.9,.25,walls[chapter-1],gateX,3.5,-5.9);this.box(4,.15,5,'#dce0ca',gateX,-.1,-8); 
  this.box(.25,4,12,court?'#9abdac':walls[chapter-1],-7.4,1.95,0);this.box(.25,4,12,'#e2d6d7',7.4,1.95,0);
  this.box(15,.18,.3,'#fff3dc',0,0,-5.7);
  const dx=chapter===2?-5.4:4.9;
  this.door=new T.Group();this.door.position.set(dx-.85,0,-5.6);this.room.add(this.door);this.box(1.7,2.9,.22,chapter===6?'#80639d':'#ae8cbe',.85,1.45,0,this.door);for(const xx of [dx-.95,dx+.95])this.box(.15,3.1,.3,'#f9eed5',xx,1.5,-5.5);this.box(2.1,.15,.3,'#f9eed5',dx,3,-5.5);this.star(.85,2,.2,'#ffd269',.32,this.door);this.ball(.075,'#ecc365',1.4,1.2,.2,this.door);
  this.label(chapter===6?'HOME TOGETHER · RETURN ROUTE':['TOY WORKSHOP','BANK SHOT ARCADE','VISITOR PASS STUDIO','COURTYARD · OUTER SHUTTER','STAR GALLERY · ENTRANCE'][chapter-1],0,3.35,-5.55,'#655080',.44);
  if(chapter===1){
   this.box(4,1.9,.2,'#dcb988',-3.5,2,-5.5);for(let x=-5;x<-2;x+=.5)for(let y=1.4;y<2.8;y+=.4)this.ball(.025,'#997a63',x,y,-5.34);
   for(let i=0;i<4;i++){const h=this.box(.17,.7,.13,['#c47b72','#80b7b5','#8b81b8','#e4b357'][i],-4.8+i*.65,2.1,-5.2);h.rotation.z=(i-1)*.2;this.ball(.13,'#f5dfb8',-4.8+i*.65,2.55,-5.2);}
   for(let i=0;i<3;i++)this.box(1,.55,.9,['#e1ae7d','#a5c4b3','#c19ec3'][i],-6,.3+i*.6,2.8);this.label('BUILD • TURN • LOOK',-4,3.1,-5.3,'#8b735d',.3);
  }else if(chapter===2){
   for(let i=0;i<3;i++){const x=-3+i*2.6;this.box(1.6,2,.6,['#dc9c93','#b49bc7','#8dbec3'][i],x,1.1,-5.2);this.box(1.3,.75,.08,'#4f527b',x,1.45,-4.85);this.star(x,1.5,-4.75,'#ffce6c',.25);this.box(1.2,.13,.35,'#f4e4c5',x,.85,-4.65);}
   for(let i=0;i<10;i++){const a=i*Math.PI/9;this.ball(.12,i%2?'#dfaaa3':'#e8ce75',Math.cos(a)*5,1.3+Math.sin(a)*2,-4.7);}
   this.label('CATCH TWO · OPEN THE DOOR',1,3.8,-5.2,'#56527f',.3);
  }else if(chapter===3){
   for(const x of [-5.5,5.5]){this.box(.1,2.5,.12,'#ac8c69',x,1.2,-3.7).rotation.z=.15;this.box(1.7,1.8,.12,'#fff7df',x,1.8,-3.5);this.star(x,1.8,-3.39,x<0?'#e8b575':'#bb94c4',.5);}
   for(let i=0;i<6;i++){this.mesh(new T.CylinderGeometry(.17,.17,.45,12),['#e78772','#81b4ae','#a486bf'][i%3],-6+i*.5,.25,3);}
   this.box(2.5,.18,1.3,'#e0ad8d',-5.8,.8,.5);this.label('FOLD • PRESS • REVEAL',-1.5,3.85,-5.5,'#ac7d64',.3);
  }else if(court){
   for(const x of [-6,6])for(const z of [-3.8,2.8]){this.mesh(new T.CylinderGeometry(.16,.2,1.4,10),'#9f8067',x,.65,z);this.ball(.8,'#79aa89',x,1.8,z);this.ball(.58,'#95bd8a',x+.35,2.1,z);}
   this.box(3,.2,.75,'#d2b787',0,.55,-5.4);for(const x of [-1.1,1.1])this.box(.15,.6,.55,'#a28b74',x,.25,-5.4);
   this.label(chapter===5?'SAME MIRROR · A NEW CONSTRUCTION TOOL':'TEST THE REFLECTION · BOTH SEGMENTS COUNT',0,2.65,-5.1,'#668a78',.32);
  }else{
   for(let i=0;i<11;i++){const x=-6+i*1.2;this.star(x,2.6+(i%3)*.35,-5.3,['#f1cf81','#d4b7d7','#aed1cf'][i%3],.18+(i%2)*.1);}
   for(const [i,x]of [-5.8,-3.8,3.2,6.2].entries()){this.box(.35,1.2,.35,'#c1b2d1',x,.6,-4.3);const bulb=this.mesh(new T.SphereGeometry(.3,16,12),'#aaa1bd',x,1.4,-4.3,this.room,{emissive:'#000000'}),light=new T.PointLight('#ffdb97',0,10);light.position.set(x,2,-3);this.room.add(light);bulb.material=bulb.material.clone();this.galleryLights.push({light,bulb,threshold:[1,2,3,4][i]});}this.galleryPower(s);
   this.box(2.6,1.6,.13,'#cfdaed',-4,2.5,-5.5);for(let i=0;i<4;i++)this.star(-4.8+i*.55,2.3+(i%2)*.5,-5.39,'#fff0bd',.12);
  }
  for(let i=0;i<4;i++){const m=this.box(.24,.24,.24,['#e6bd6d','#a6c4b8','#b29bc8'][i%3],-5+i*.5,.14,4.6);m.rotation.y=i*.5;m.userData.toy=true;}
  if(s.screen==='end'||s.completed.includes(3)){this.motif(1.7,2.5,-5.45,s.choices.art,.65,this.room);this.label('YOUR VISITOR PASS',1.7,3.15,-5.4,'#756185',.26);}
 }
 motif(x,y,z,type,size=.6,parent=this.dynamic){if(type==='flower'){for(let i=0;i<6;i++)this.ball(size*.3,'#e2a0bd',x+Math.cos(i*Math.PI/3)*size*.55,y+Math.sin(i*Math.PI/3)*size*.55,z,parent);this.ball(size*.28,'#f2c864',x,y,z+.12,parent);}else this.star(x,y,z,'#f3c969',size,parent);}
 setup(s){
  this.s=s;this.camera.clearViewOffset();this.anim=null;this.effect=null;this.viewerCam=null;this.flap=null;this.runner=null;this.clear(this.room);this.clear(this.dynamic);this.clear(this.story);this.storySignature='';this.storyMotion=null;this.party=null;this.shutter=null;this.doorTarget=0;this.holdJourney=false;this.bounces=[];this.environment(s);
  if(s.screen==='about'||s.screen==='opening'||s.screen==='end'){this.camera.fov=innerWidth<650?(s.screen==='opening'?70:55):50;this.camera.updateProjectionMatrix();if((s.screen==='end'||s.screen==='opening')&&innerWidth<650)this.camera.setViewOffset(innerWidth,innerHeight,0,innerHeight*.25,innerWidth,innerHeight);this.person(-.9,s.screen==='opening'?1:-1,false);const child=this.person(.8,s.screen==='opening'?-4.7:-1,true);this.robot(2,s.screen==='opening'?-4.7:-1);if(s.screen==='opening'){this.mesh(new T.BoxGeometry(4,2.2,.08),'#a7d0de',1.2,1.1,-3.8,this.room,{transparent:true,opacity:.2,depthWrite:false});for(const x of [-.8,3.2])this.box(.06,2.2,.1,'#b7a8c8',x,1.1,-3.8);this.box(4,.06,.1,'#b7a8c8',1.2,2.2,-3.8);this.label('LUMI + PIP · SAFE',1.2,2.5,-4.5,'#78688f',.25);this.label('MAYA',-.9,2.2,1,'#87649e',.23);}this.targetPos.set(5,3.6,7);this.targetLook.set(.3,1,-1);this.look.copy(this.targetLook);this.camera.position.copy(this.targetPos);this.characters=[child];return;}
  this.characters=[];const t=s.task;
  if(t.kind==='viewer'){
   const c=this.planePoint(t.target,0),child=this.person(c[0],c[2],true),bot=this.robot(c[0]+.6,c[2]);
   const view=viewerEye(t,solve(t)),eye=this.planePoint(view),side=new T.Vector3(eye[0]-c[0],0,eye[2]-c[2]).normalize();bot.position.set(c[0]+side.z*.65,0,c[2]-side.x*.65);for(const g of [child,bot])g.traverse(o=>o.layers.set(1));
   const floor=this.box(4,.08,3,'#e8d6b9',c[0],-.05,c[2]);floor.layers.set(1);
   const star=this.star(c[0],1.7,c[2]-.3,'#ffd36c',.32);star.layers.set(1);const sign=this.label('ARCADE →',c[0],.5,c[2]+.12,'#4c947f',.23);sign.layers.set(1);sign.userData.viewerSign=true;
   this.viewerChild=child;this.viewerBot=bot;this.characters=[child];this.viewerCam=new T.PerspectiveCamera(16,1.65,.05,80);this.viewerCam.layers.set(1);
  }
  this.update(s);this.setView(s,true);
 }
 setView(s,instant=false){this.s=s;this.camera.fov=innerWidth<650?70:50;if(s.inspection){if(innerWidth<650)this.camera.setViewOffset(innerWidth,innerHeight,0,innerHeight*(s.task?.kind==='viewer'?.18:.14),innerWidth,innerHeight);else this.camera.setViewOffset(innerWidth,innerHeight,innerWidth*.075,0,innerWidth,innerHeight);}else this.camera.clearViewOffset();this.camera.updateProjectionMatrix();if(s.inspection){this.targetPos.set(0,innerWidth<650?13.4:8.9,innerWidth<650?10.8:7.7);this.targetLook.set(0,0,0);}else{this.targetPos.set(5.5,1.65,4.7);this.targetLook.set(0,1,-1);}if(instant||s.settings.reduced){this.camera.position.copy(this.targetPos);this.look.copy(this.targetLook);}}
 planePoint(p,height=.29){return [(p.x-5)*.9,height,-p.y*.9];}
 path(a,b,c='#dd9260',r=.035,parent=this.dynamic){return this.tube(this.planePoint(a),this.planePoint(b),c,r,parent);}
 marker(p,text,color='#8c76bc',r=.12,parent=this.dynamic){const [x,y,z]=this.planePoint(p,.34);this.ball(r,color,x,y,z,parent);if(text)this.label(text,x,.7,z,'#575276',.25,parent);}
 panel(p,angle,index,active=true){const half=this.s.task.kind==='network'?.55:.7;const [x,,z]=this.planePoint(p),g=new T.Group();g.position.set(x,.75,z);g.rotation.y=-radians(angle);this.dynamic.add(g);this.box(half*1.8,.95,.08,active?'#a8d8df':'#bab8c9',0,0,0,g);for(const xx of [-half*.9-.035,half*.9+.035])this.box(.07,1.07,.12,'#e3bd71',xx,0,0,g);this.label(String(index+1),x,1.5,z,active?'#6d638a':'#a4a0af',.3,this.dynamic);return g;}
 grid(step=.5,width=10,height=3.5,parent=this.dynamic){const vertices=[];for(let x=0;x<=width+1e-9;x+=step)vertices.push(...this.planePoint({x,y:-height},.265),...this.planePoint({x,y:height},.265));for(let y=-height;y<=height+1e-9;y+=step)vertices.push(...this.planePoint({x:0,y},.265),...this.planePoint({x:width,y},.265));const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));const lines=new T.LineSegments(geometry,new T.LineBasicMaterial({color:'#b9c4bd',transparent:true,opacity:.65}));parent.add(lines);}
 dashedPath(a,b,color='#9c88b9',height=.31,parent=this.dynamic){const geometry=new T.BufferGeometry().setFromPoints([new T.Vector3(...this.planePoint(a,height)),new T.Vector3(...this.planePoint(b,height))]),line=new T.Line(geometry,new T.LineDashedMaterial({color,dashSize:.13,gapSize:.075}));line.computeLineDistances();parent.add(line);return line;}
 mirrorSurface(){this.path({x:0,y:0},{x:10,y:0},'#90c7cd',.08);this.label('FLAT MIRROR',-3.15,.65,.9,'#5e8b94',.27,this.dynamic);}
 layoutShapeCallouts(){
  if(!this.shapeCallouts)return;for(const tag of this.shapeCallouts)tag.center.set(.5,.5);
  if(innerWidth>=650||this.s.screen!=='game'||this.s.task?.kind!=='shape'||!this.s.inspection)return;
  this.dynamic.updateWorldMatrix(true,true);this.camera.updateMatrixWorld();const point=new T.Vector3(),view=new T.Vector3(),obstacles=[],tags=new Set(this.shapeCallouts),width=innerWidth,height=innerHeight;
  const box=tag=>{
   tag.onBeforeRender(this.renderer,this.scene,this.camera);point.setFromMatrixPosition(tag.matrixWorld);view.copy(point).applyMatrix4(this.camera.matrixWorldInverse);point.project(this.camera);
   const pixels=height*.5*this.camera.projectionMatrix.elements[5]/Math.max(.1,-view.z),w=tag.scale.x*pixels,h=tag.scale.y*pixels;
   return {x:(point.x*.5+.5)*width,y:(-.5*point.y+.5)*height,w,h};
  };
  this.dynamic.traverse(tag=>{if(tag.isSprite&&tag.userData.labelText&&!tags.has(tag))obstacles.push(box(tag));});
  const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w/2,b.x+b.w/2+4)-Math.max(a.x-a.w/2,b.x-b.w/2-4))*Math.max(0,Math.min(a.y+a.h/2,b.y+b.h/2+4)-Math.max(a.y-a.h/2,b.y-b.h/2-4));
  this.shapeCallouts.forEach((tag,index)=>{
   const anchor=box(tag),side=index===0?1:-1;let best={x:anchor.x,y:anchor.y,score:Infinity};
   for(const dx of [0,16,-16,32,-32,48,-48,64,-64,80,-80])for(const dy of [0,-14,-28,-42,-56,-70]){
    if(Math.hypot(dx,dy)>88)continue;const candidate={...anchor,x:anchor.x+dx,y:anchor.y+dy};if(candidate.x-anchor.w/2<12||candidate.x+anchor.w/2>width-12||candidate.y-anchor.h/2<12||candidate.y+anchor.h/2>height-12)continue;
    const area=obstacles.reduce((sum,other)=>sum+overlap(candidate,other),0),score=area*1e5+dx*dx+dy*dy+(dx*side<0?120:0);
    if(score<best.score)best={...candidate,score};
   }
   // Sprite centres move the pill only; ruler endpoints and marker coordinates stay exact.
   tag.center.set(.5-(best.x-anchor.x)/anchor.w,.5+(best.y-anchor.y)/anchor.h);obstacles.push({...anchor,x:best.x,y:best.y});
  });
 }
 update(s){
  this.s=s;this.effect=null;this.galleryPower(s);updateStory(this,s);this.clear(this.dynamic);this.shapeCallouts=null;const t=s.task,d=s.draft;if(!t)return;const show=s.phase==='result'||s.phase==='complete';
  if(t.kind==='viewer'){
   this.box(9.8,.2,7.6,'#d4b28c',0,.08,0,this.dynamic);const w=t.wall;this.box(w.w*.9,1,w.h*.9,'#c2a8c7',(w.x+w.w/2-5)*.9,.6,-(w.y+w.h/2)*.9,this.dynamic);
   for(let i=0;i<2;i++){const [x,,z]=this.planePoint(t.mirrors[i]);this.box(1.6,.12,1.5,'#8ebdb6',x,.25,z,this.dynamic);if(d.installed[i])this.panel(t.mirrors[i],d.angles[i],i,i===d.selected);else this.label('FIT MIRROR '+(i+1),x,.65,z,'#8d9c9d',.28,this.dynamic);}
   this.marker(t.eye,'EYE','#c49ed0',.22);this.marker(t.target,'GALLERY WINDOW','#e9c275',.22);
   const guide=viewerGuide(t,d);for(let i=1;i<Math.min(guide.points.length,4);i++)this.path(guide.points[i-1],guide.points[i],'#d6ab6c',.022);const path=viewerPath(t,d);if(path){for(let i=1;i<path.length;i++)this.path(path[i-1],path[i],'#70c5ae',.045);const e=viewerEye(t,d),pos=this.planePoint(e,1),target=this.planePoint(t.target,1);this.viewerCam.position.set(...pos);this.viewerCam.lookAt(...target);const c=this.viewerChild.position;this.viewerChild.rotation.y=Math.atan2(pos[0]-c.x,pos[2]-c.z);this.viewerBot.rotation.y=this.viewerChild.rotation.y;}
   this.label('TWO MIRRORS · ONE VIEW',0,.4,3.7,'#8a735f',.28,this.dynamic);return;
  }
  if(t.kind==='ray'){
   const bank=s.chapter===2;this.box(8.2,.25,7.6,bank?'#a8cbb6':'#b4b5d0',0,.1,0,this.dynamic);
   for(const x of [-4.2,4.2])this.box(.16,.4,7.9,bank?'#e8b68e':'#9c88b5',x,.35,0,this.dynamic);for(const z of [-3.9,3.9])this.box(8.5,.4,.16,bank?'#e8b68e':'#9c88b5',0,.35,z,this.dynamic);
   const a=radians(t.mirror),bar=this.box(3.1,.5,.14,bank?'#6c9e91':'#a2d5db',0,.58,0,this.dynamic);bar.rotation.y=-a;
   const p=angle=>[Math.cos(radians(angle))*3,.48,Math.sin(radians(angle))*3],src=p(t.incoming+180),pred=p(predicted(t,d)),actual=p(t.answer);
   this.tube(src,[0,.48,0],'#e7aa49',.035);this.signalBall=this.ball(.14,bank?'#fff8e8':'#ffda72',...src,this.dynamic);
   const normal=p(t.mirror-90),opp=p(t.mirror+90);for(let i=0;i<12;i+=2){const f=i/12,g=(i+1)/12;this.tube([opp[0]+(normal[0]-opp[0])*f,.48,opp[2]+(normal[2]-opp[2])*f],[opp[0]+(normal[0]-opp[0])*g,.48,opp[2]+(normal[2]-opp[2])*g],'#6f899c',.018);}
   this.label('NORMAL',normal[0],.75,normal[2],'#547783',.25,this.dynamic);this.label('START',src[0],.85,src[2],'#93643d',.26,this.dynamic);
   this.tube([0,.49,0],pred,'#a881ce',.024);const cup=this.mesh(new T.TorusGeometry(.16,.025,8,24),'#a47fc7',pred[0],.35,pred[2],this.dynamic);cup.rotation.x=Math.PI/2;this.label(bank?'YOUR CATCHER':'YOUR RECEIVER',pred[0],.87,pred[2],'#7c5c9c',.26,this.dynamic);
   this.signalPath=[new T.Vector3(...src),new T.Vector3(0,.48,0),new T.Vector3(...actual)];
   if(show){this.tube([0,.53,0],actual,'#4fbeab',.05);this.label('ACTUAL',actual[0],.8,actual[2],'#388e7d',.26,this.dynamic);this.signalBall.position.set(...actual);if(s.result?.ok){const st=this.star(actual[0],1.3,actual[2],'#ffcf71',.25,this.dynamic);this.reward=st;}}
   return;
  }
  if(t.kind==='shape'){
   this.box(9.6,.06,7,'#fff8e8',0,.18,0,this.dynamic);this.box(9.7,.07,.05,'#d1a276',0,.25,0,this.dynamic);
   this.flap=new T.Group();this.flap.position.y=.23;this.dynamic.add(this.flap);this.box(9.5,.025,3.45,'#fff4d9',0,0,-1.725,this.flap);this.grid(.5);for(let x=0;x<=10;x+=2)this.label(String(x),(x-5)*.9,.34,3.33,'#a69b84',.18,this.dynamic);
   const colors=['#e77c64','#74b7b4','#af88c5'];t.source.forEach((p,i)=>{const a=this.planePoint(p,.08),q=d.points[i];this.ball(.2,colors[i],...a,this.flap);this.label(['RED','BLUE','PURPLE'][i],a[0],.4,a[2],colors[i],.26,this.flap);this.marker(q,'STAMP '+(i+1),i===d.selected?'#d7a555':colors[i],.18);if(i){this.tube(this.planePoint(t.source[i-1],.08),this.planePoint(p,.08),'#d9b376',.035,this.flap);this.path(d.points[i-1],q,'#c3a0c9',.025);}});
   const source=t.source[d.selected],placed=d.points[d.selected];this.dashedPath({x:source.x,y:-3.5},{x:source.x,y:3.5},'#aa8da9');this.path(source,{x:source.x,y:0},'#8b70b0',.024);this.path(placed,{x:placed.x,y:0},'#d8a452',.024);const sourcePos=this.planePoint({x:source.x,y:source.y/2}),draftPos=this.planePoint({x:placed.x,y:placed.y/2});this.shapeCallouts=[this.label('SOURCE '+source.y.toFixed(1)+' units',sourcePos[0]+.5,.7,sourcePos[2],'#8b70b0',.22,this.dynamic),this.label('STAMP '+Math.abs(placed.y).toFixed(1)+' units',draftPos[0]-.5,.7,draftPos[2],'#b39358',.22,this.dynamic)];this.label('CREASE · MIRROR LINE',0,.58,0,'#a17b57',.28,this.dynamic);
   this.revealGroup=new T.Group();this.dynamic.add(this.revealGroup);if(show)t.source.forEach(p=>this.marker({x:p.x,y:-p.y},'','#58b59e',.11,this.revealGroup));
   if(s.result?.ok||s.phase==='complete'){const badge=new T.Group();badge.position.set(0,.4,0);badge.rotation.x=-Math.PI/2;this.revealGroup.add(badge);this.motif(0,0,0,s.choices.art,.6,badge);}
   return;
  }
  if(t.kind==='network'){
   this.box(10.1,.15,7.8,'#dad0e7',0,.08,0,this.dynamic);const w=t.wall;this.box(w.w*.9,1.2,w.h*.9,'#b48eab',(w.x+w.w/2-5)*.9,.72,-(w.y+w.h/2)*.9,this.dynamic);
   for(const x of [0,10])this.path({x,y:-4},{x,y:4},'#b2a5c7',.03);
   this.marker(t.source,'LIGHT SOURCE','#f2c56d',.21);this.marker(t.target,'GALLERY RECEIVER','#73b7ad',.25);
   const end={x:t.source.x+t.direction.x*.6,y:t.source.y};this.path(t.source,end,'#edbd67',.07);
   d.mirrors.forEach((m,i)=>{if(m.placed)this.panel(m,m.angle,i,i===d.selected);});
   if(show){const r=traceNetwork(t,d.mirrors);for(let i=1;i<r.points.length;i++)this.path(r.points[i-1],r.points[i],r.ok?'#6dc7b2':'#e5a079',.05);if(!r.ok){const stop=r.points.at(-1);this.marker(stop,'','#d48276',.18);const p=this.planePoint(stop);this.label('STOPS HERE',p[0],1.65,p[2],'#a96862',.26,this.dynamic);}else this.star(...this.planePoint(t.target,1.2),'#ffce64',.4,this.dynamic);}
   this.label('DESIGN A WORKING LINK · UP TO 3 MIRRORS',0,.6,3.85,'#807099',.25,this.dynamic);return;
  }
  const courtyard=s.chapter===4||s.chapter===5;
  this.box(10.1,.16,7.8,s.chapter===5?'#e1e6df':courtyard?'#e4ddbd':'#d7d5e5',0,.08,0,this.dynamic);this.grid(.5,10,4);
  for(let x=0;x<=10;x++)this.label(String(x),(x-5)*.9,.35,3.4,'#8c9290',.18,this.dynamic);
  this.mirrorSurface();this.marker(t.a,'SOURCE A','#e4ba65',.2);this.marker(t.b,s.chapter===5?(s.sub===0?'APPROACH RECEIVER B':'GATE RECEIVER B'):s.chapter===6?'EXIT RECEIVER B':'SHUTTER RECEIVER B','#a38bc3',.2);
  if(t.kind==='investigation'){
   t.candidates.forEach((p,i)=>{this.marker({x:p,y:0},'P'+(i+1),d.selected===i?'#da9d54':'#a8a9b4',.14);});
   if(d.selected!=null){const p={x:t.candidates[d.selected],y:0};this.dashedPath(t.a,p,'#c39868');this.dashedPath(p,t.b,'#c39868');this.dashedPath({x:p.x,y:-.7},{x:p.x,y:1},'#6686a5');this.label('NORMAL',...this.planePoint({x:p.x,y:1.05},.65),'#6686a5',.22,this.dynamic);}
   const test=d.tests.find(r=>r.index===d.lastTest);if(test){for(let i=1;i<test.points.length;i++)this.path(test.points[i-1],test.points[i],test.hit?'#55b69f':'#d38d75',.045);const end=test.points.at(-1);this.label(test.hit?'BEAM REACHES B':'BEAM MISSES B',...this.planePoint(end,1),'#677886',.23,this.dynamic);this.signalPath=test.points.map(q=>new T.Vector3(...this.planePoint(q,.4)));this.signalBall=this.ball(.09,'#ffe29a',...this.planePoint(t.a,.4),this.dynamic);}
   this.label('DASHED: PROPOSAL · SOLID: TESTED RAY',0,.4,3.83,'#8c8d99',.25,this.dynamic);return;
  }
  const p={x:d.p,y:0};if(d.imageTouched)this.marker(d.image,'YOUR B′','#ae8dce',.16);
  if(d.line){this.dashedPath(t.a,d.image,'#597da8');this.label('YOUR STRAIGHTEDGE',-1,.7,2.9,'#748ab3',.25,this.dynamic);}
  if(d.pTouched){this.marker(p,'P · INTERSECTION','#dc9e5c',.15);this.dashedPath(t.a,p,'#c39868');this.dashedPath(p,t.b,'#c39868');}
  
  this.label('BEHIND MIRROR: IMAGINARY PLANNING SPACE',0,.4,3.85,'#8798a3',.25,this.dynamic);
  if(show){const r=inspectPath(t,d.p);for(let i=1;i<r.points.length;i++)this.path(r.points[i-1],r.points[i],r.hit?'#55b69f':'#d38d75',.045);if(!s.result?.ok){const bp=ghost(t),pp=optimal(t);this.marker(bp,'MODEL B′','#47a797',.12);this.marker(pp,'MODEL P','#47a797',.12);this.dashedPath(t.a,bp,'#53b4a4');}}
 }
 animateJourney(done,kind){animateJourney(this,done,kind);}
 demonstrate(done){
  if(this.s.settings.reduced||!['ray','shape','investigation'].includes(this.s.task.kind)){done();return;}this.holdJourney=true;
  if(this.s.task.kind==='shape'&&this.revealGroup)this.revealGroup.visible=false;this.effect={kind:this.s.task.kind==='investigation'?'ray':this.s.task.kind,elapsed:0,duration:this.s.task.kind==='shape'?2600:1750,done};
  if(this.signalBall&&['ray','investigation'].includes(this.s.task.kind))this.signalBall.position.copy(this.signalPath[0]);
 }
 renderViewer(){
  const s=this.s;if(!this.viewerCam||s.screen!=='game'||s.phase==='lesson'||!s.inspection)return;
  const frame=document.querySelector('.viewer-window');if(!frame)return;const rect=frame.getBoundingClientRect(),border=innerWidth<650?3:5,w=Math.max(1,rect.width-border*2),h=Math.max(1,rect.height-border*2),x=rect.left+border,top=rect.top+border;
  this.renderer.setViewport(x,innerHeight-top-h,w,h);this.renderer.setScissor(x,innerHeight-top-h,w,h);this.renderer.setScissorTest(true);
  const bg=this.scene.background,old=bg.clone();bg.set('#393746');this.renderer.setClearColor(bg);this.renderer.clear();
  if(viewerPath(s.task,s.draft)){this.viewerCam.aspect=w/h;this.viewerCam.updateProjectionMatrix();this.renderer.shadowMap.autoUpdate=false;this.renderer.render(this.scene,this.viewerCam);this.renderer.shadowMap.autoUpdate=true;}
  bg.copy(old);this.renderer.setClearColor(bg);this.renderer.setScissorTest(false);this.renderer.setViewport(0,0,innerWidth,innerHeight);
 }
 tick(now){
  const dt=Math.min((now-this.last)/1000,.05);this.last=now;this.clock+=dt;const s=this.s;
  if(s){
   if(!s.settings.reduced){this.camera.position.lerp(this.targetPos,.14);this.look.lerp(this.targetLook,.14);}else{this.camera.position.copy(this.targetPos);this.look.copy(this.targetLook);}
   if(!s.inspection&&s.screen==='game'&&!document.querySelector('dialog[open]')){const dir=this.targetLook.clone().sub(this.targetPos);dir.y=0;dir.normalize();const side=new T.Vector3(-dir.z,0,dir.x),move=new T.Vector3();if(this.keys.KeyW||this.keys.ArrowUp)move.add(dir);if(this.keys.KeyS||this.keys.ArrowDown)move.sub(dir);if(this.keys.KeyA||this.keys.ArrowLeft)move.sub(side);if(this.keys.KeyD||this.keys.ArrowRight)move.add(side);move.multiplyScalar(dt*2.6);const next=this.targetPos.clone().add(move);if(Math.abs(next.x)<6.8&&Math.abs(next.z)<5.1){this.targetPos.add(move);this.targetLook.add(move);}}
   this.camera.lookAt(this.look);for(const c of this.characters||[])c.position.y=s.settings.reduced?0:Math.sin(this.clock*2)*.025;
   for(const b of this.bounces){b.t+=dt;b.mesh.position.y=b.y+Math.max(0,Math.sin(b.t*8))*Math.max(0,.6-b.t*.4);}this.bounces=this.bounces.filter(b=>b.t<1.5);
   const paused=!!document.querySelector('dialog[open]');tickStory(this,dt,paused);
   if(this.anim&&this.runner){const v=this.anim;if(!paused)v.elapsed+=dt*4;const ab=v.points[0].distanceTo(v.points[1]),bc=v.points[1].distanceTo(v.points[2]),travel=Math.min(v.duration,v.elapsed);if(travel<ab)this.runner.position.lerpVectors(v.points[0],v.points[1],travel/ab);else this.runner.position.lerpVectors(v.points[1],v.points[2],Math.min(1,(travel-ab)/bc));if(travel>=v.duration){this.anim=null;v.done();}}
   if(this.effect){const e=this.effect;if(!paused)e.elapsed+=dt*1000;const u=Math.min(1,e.elapsed/e.duration);if(e.kind==='shape'&&this.flap){this.flap.rotation.x=Math.sin(u*Math.PI)*Math.PI;if(this.revealGroup)this.revealGroup.visible=u>=.5;}if(e.kind==='ray'&&this.signalBall){const points=this.signalPath;if(u<.5)this.signalBall.position.lerpVectors(points[0],points[1],u*2);else this.signalBall.position.lerpVectors(points[1],points[2],(u-.5)*2);}if(u===1){this.effect=null;this.holdJourney=false;e.done();}}
  }
  this.layoutShapeCallouts();this.renderer.render(this.scene,this.camera);this.renderViewer();this.frame=requestAnimationFrame(this.tick);
 }
}
