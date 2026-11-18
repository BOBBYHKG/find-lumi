import {radians,reflectPoint,crossing,blocked,dist,routeLayout,optimal,length} from './math.mjs';

export const snap=v=>Math.round(v*2)/2;
export const snapPoint=p=>({x:snap(p.x),y:snap(p.y)});
export function lineMirrorIntersection(a,b,width=10){const dy=b.y-a.y;if(Math.abs(dy)<1e-9)return null;const u=-a.y/dy,x=a.x+(b.x-a.x)*u;return u>=0&&u<=1&&x>=0&&x<=width?{x,y:0}:null;}
export function investigationTask(seed=0){const indices=[0,3,6,4,5,1],r=routeLayout(indices[Math.abs(seed)%indices.length]),p=optimal(r).x,mid=(r.a.x+r.b.x)/2,off=p<mid?r.b.x-.5:r.a.x+.5,positions=[mid,p,off],shift=Math.abs(seed)%3,candidates=positions.slice(shift).concat(positions.slice(0,shift));return {...r,kind:'investigation',seed,candidates,bestIndex:(1-shift+3)%3};}
export function inspectPath(t,p){
 const contact={x:p,y:0},incoming=normalise({x:p-t.a.x,y:-t.a.y}),out=bounce(incoming,0),wanted=normalise({x:t.b.x-p,y:t.b.y});
 const alpha=Math.acos(Math.min(1,Math.max(-1,-incoming.y)))*180/Math.PI,beta=Math.acos(Math.min(1,Math.max(-1,wanted.y)))*180/Math.PI;
 const along=(t.b.x-p)*out.x+t.b.y*out.y,miss=Math.abs((t.b.x-p)*out.y-t.b.y*out.x),hit=along>0&&miss<=.16;
 let distance=Infinity;for(const [value,v]of [[(10-p),out.x],[-p,out.x],[4,out.y]])if(v!==0&&value/v>1e-8)distance=Math.min(distance,value/v);
 const end=hit?{...t.b}:{x:p+out.x*distance,y:out.y*distance};
 return {p,total:length(t,p),first:dist(t.a,contact),second:dist(contact,t.b),alpha,beta,hit,points:[{...t.a},contact,end]};
}

export const normalise=v=>{const n=Math.hypot(v.x,v.y);return {x:v.x/n,y:v.y/n};};
export function bounce(v,angle){const n={x:-Math.sin(radians(angle)),y:Math.cos(radians(angle))},d=v.x*n.x+v.y*n.y;return {x:v.x-2*d*n.x,y:v.y-2*d*n.y};}
export function segment(m,angle,half=.7){const a=radians(angle),v={x:Math.cos(a)*half,y:Math.sin(a)*half};return [{x:m.x-v.x,y:m.y-v.y},{x:m.x+v.x,y:m.y+v.y}];}
const turn=p=>({x:5-p.y,y:p.x-5});
export function viewerTask(seed=0){
 const k=Math.abs(seed)%4,dy=[0,.35,-.3,.5][k];let eye={x:2,y:-3},mirrors=[{x:2,y:-1.5},{x:7,y:-1.5+dy}],target={x:7,y:2.5},wall={x:3.4,y:-.75,w:2,h:4};
 for(let i=0;i<k;i++){eye=turn(eye);mirrors=mirrors.map(turn);target=turn(target);wall={x:5-(wall.y+wall.h),y:wall.x-5,w:wall.h,h:wall.w};}
 return {kind:'viewer',seed,eye,mirrors,target,wall};
}
export function viewerSolution(t){const direction=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI,mod=a=>((a%180)+180)%180;return [mod((direction(t.eye,t.mirrors[0])+direction(t.mirrors[0],t.mirrors[1]))/2),mod((direction(t.mirrors[0],t.mirrors[1])+direction(t.mirrors[1],t.target))/2)];}
export function viewerPath(t,d){
 if(!d.installed?.every(Boolean))return null;
 const virtual2=reflectPoint(t.target,t.mirrors[1],d.angles[1]),virtual1=reflectPoint(virtual2,t.mirrors[0],d.angles[0]);
 const [a,b]=segment(t.mirrors[0],d.angles[0]),p=crossing(t.eye,virtual1,a,b);
 if(!p||p.t<=0||p.t>=1||p.u<0||p.u>1)return null;
 const [c,e]=segment(t.mirrors[1],d.angles[1]),q=crossing(p,virtual2,c,e);
 if(!q||q.t<=0||q.t>=1||q.u<0||q.u>1)return null;
 const path=[t.eye,{x:p.x,y:p.y},{x:q.x,y:q.y},t.target];
 for(let i=1;i<4;i++)if(blocked(path[i-1],path[i],t.wall))return null;
 for(let i=0;i<2;i++){const incoming=normalise({x:path[i+1].x-path[i].x,y:path[i+1].y-path[i].y}),out=normalise({x:path[i+2].x-path[i+1].x,y:path[i+2].y-path[i+1].y}),r=bounce(incoming,d.angles[i]);if(r.x*out.x+r.y*out.y<1-1e-7)return null;}
 return path;
}
export function viewerEye(t,d){return reflectPoint(reflectPoint(t.eye,t.mirrors[0],d.angles[0]),t.mirrors[1],d.angles[1]);}
export function viewerGuide(t,d){const delta={x:t.mirrors[0].x-t.eye.x,y:t.mirrors[0].y-t.eye.y};return traceNetwork({source:t.eye,target:t.target,direction:normalise(delta),wall:t.wall},t.mirrors.map((m,i)=>({...m,angle:d.angles[i],placed:d.installed[i]})));}
export function viewerHint(t,d){if(viewerPath(t,d))return 'Lumi and Pip! Their sign points to the ARCADE PASSAGE →';if(!d.installed.every(Boolean))return 'Fit both mirrors to build the viewing path.';const r=viewerGuide(t,d);return r.hits[0]===0&&r.hits[1]===1?'The guide reaches mirror 2. Turn mirror 2 towards the gallery window.':'Turn mirror 1 until the guide reaches mirror 2.';}

export function networkTask(seed=0){const k=Math.abs(seed)%4,flip=k%2===1,source={x:1,y:-2+k*.12},target={x:9,y:2.5-k*.12},wall={x:4.4,y:-4,w:1.2,h:4.7};if(flip){source.x=9;target.x=1;}return {kind:'network',seed,source,target,wall,direction:{x:flip?-1:1,y:0},limit:3};}
export function networkSolution(t){const x=t.source.x<t.target.x?2.5:7.5,angle=t.source.x<t.target.x?45:135;return [{x,y:t.source.y,angle,placed:true},{x,y:t.target.y,angle,placed:true}];}
function raySegment(o,v,a,b){const q=crossing(o,{x:o.x+v.x,y:o.y+v.y},a,b);return q&&q.t>1e-6&&q.u>=-1e-9&&q.u<=1+1e-9?q:null;}
function edges(w){return [[{x:w.x,y:w.y},{x:w.x+w.w,y:w.y}],[{x:w.x+w.w,y:w.y},{x:w.x+w.w,y:w.y+w.h}],[{x:w.x+w.w,y:w.y+w.h},{x:w.x,y:w.y+w.h}],[{x:w.x,y:w.y+w.h},{x:w.x,y:w.y}]];}
export function traceNetwork(t,mirrors){
 let o={...t.source},v={...t.direction};const points=[{...o}],hits=[];
 for(let count=0;count<10;count++){
  const candidates=[];
  for(const [a,b]of edges({x:0,y:-4,w:10,h:8})){const p=raySegment(o,v,a,b);if(p)candidates.push({...p,kind:'exit'});}
  for(const [a,b]of edges(t.wall)){const p=raySegment(o,v,a,b);if(p)candidates.push({...p,kind:'wall'});}
  mirrors.forEach((m,i)=>{if(!m.placed)return;const [a,b]=segment(m,m.angle,.55),p=raySegment(o,v,a,b);if(p)candidates.push({...p,kind:'mirror',i});});
  const delta={x:t.target.x-o.x,y:t.target.y-o.y},along=delta.x*v.x+delta.y*v.y,perp=delta.x*delta.x+delta.y*delta.y-along*along,r=.23;
  if(along>0&&perp<=r*r){const tt=along-Math.sqrt(Math.max(0,r*r-perp));if(tt>1e-6)candidates.push({x:o.x+v.x*tt,y:o.y+v.y*tt,t:tt,kind:'target'});}
  candidates.sort((a,b)=>a.t-b.t);const hit=candidates[0];if(!hit)return {points,hits,ok:false,reason:'exit'};
  points.push({x:hit.x,y:hit.y});if(hit.kind!=='mirror')return {points,hits,ok:hit.kind==='target',reason:hit.kind};
  hits.push(hit.i);v=normalise(bounce(v,mirrors[hit.i].angle));o={x:hit.x+v.x*1e-5,y:hit.y+v.y*1e-5};
 }
 return {points,hits,ok:false,reason:'loop'};
}
