export const radians=a=>a*Math.PI/180;
export function facingYaw(angle,eye,mirror){const a=radians(angle),dot=(eye.x-mirror.x)*(-Math.sin(a))+(eye.y-mirror.y)*Math.cos(a);return -a+(dot<0?Math.PI:0);}
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function reflectPoint(p,m,angle){const nx=-Math.sin(radians(angle)),ny=Math.cos(radians(angle)),d=(p.x-m.x)*nx+(p.y-m.y)*ny;return {x:p.x-2*d*nx,y:p.y-2*d*ny};}
export function crossing(a,b,c,d){const r={x:b.x-a.x,y:b.y-a.y},v={x:d.x-c.x,y:d.y-c.y};const den=r.x*v.y-r.y*v.x;if(Math.abs(den)<1e-9)return null;const q={x:c.x-a.x,y:c.y-a.y};const t=(q.x*v.y-q.y*v.x)/den,u=(q.x*r.y-q.y*r.x)/den;return {x:a.x+t*r.x,y:a.y+t*r.y,t,u};}
export function blocked(a,b,w){if([a,b].some(p=>p.x>w.x&&p.x<w.x+w.w&&p.y>w.y&&p.y<w.y+w.h))return true;const c=[{x:w.x,y:w.y},{x:w.x+w.w,y:w.y},{x:w.x+w.w,y:w.y+w.h},{x:w.x,y:w.y+w.h}];return c.some((p,i)=>{const q=crossing(a,b,p,c[(i+1)%4]);return q&&q.t>1e-7&&q.t<1-1e-7&&q.u>=0&&q.u<=1;});}
export function mirrorLayout(seed=0){
 const k=Math.abs(seed)%4;
 const eye=[{x:160,y:370},{x:140,y:400},{x:185,y:350},{x:170,y:390}][k];
 const mirror=[{x:420,y:165},{x:440,y:170},{x:415,y:150},{x:430,y:175}][k];
 const child=[{x:665,y:330},{x:650,y:400},{x:680,y:430},{x:640,y:300}][k];
 const wall={x:385,y:250,w:70,h:235};
 if(seed%2){const turn=p=>({x:680-p.y,y:p.x-120});return {seed,eye:turn(eye),mirror:turn(mirror),child:turn(child),wall:{x:680-(wall.y+wall.h),y:wall.x-120,w:wall.h,h:wall.w}};}
 return {seed,eye,mirror,child,wall};
}
export function mirrorEnds(layout,angle){const v={x:Math.cos(radians(angle))*55,y:Math.sin(radians(angle))*55};return [{x:layout.mirror.x-v.x,y:layout.mirror.y-v.y},{x:layout.mirror.x+v.x,y:layout.mirror.y+v.y}];}
export function sightline(l,angle){
 const [a,b]=mirrorEnds(l,angle),virtual=reflectPoint(l.child,l.mirror,angle),p=crossing(l.eye,virtual,a,b);
 if(!p||p.t<=0||p.t>=1||p.u<0||p.u>1)return null;
 const n={x:-Math.sin(radians(angle)),y:Math.cos(radians(angle))};
 const side=q=>(q.x-l.mirror.x)*n.x+(q.y-l.mirror.y)*n.y;
 if(side(l.eye)*side(l.child)<=0||blocked(l.eye,p,l.wall)||blocked(l.child,p,l.wall))return null;
 return p;
}
export function routeLayout(seed=0){const k=Math.abs(seed)%7;const pairs=[[[2,1],[8,3]],[[2,3],[8,2.5]],[[2.5,2],[8.5,2]],[[1.5,3],[8,1.5]],[[2,2],[8.5,2.5]],[[2.5,3],[8,2]],[[1.5,2.5],[8.5,1.5]]];const [a,b]=pairs[k];return {seed,a:{x:a[0],y:a[1]},b:{x:b[0],y:b[1]},width:10};}
export const ghost=l=>({x:l.b.x,y:-l.b.y});
export function optimal(l){const b=ghost(l),t=-l.a.y/(b.y-l.a.y);return {x:l.a.x+t*(b.x-l.a.x),y:0};}
export const length=(l,x)=>dist(l.a,{x,y:0})+dist({x,y:0},l.b);
export const routeOK=(l,x)=>length(l,x)-dist(l.a,ghost(l))<=.035+1e-9;
export function mirrorSuccessAngle(l){
 const incoming=Math.atan2(l.mirror.y-l.child.y,l.mirror.x-l.child.x)*180/Math.PI;
 const outgoing=Math.atan2(l.eye.y-l.mirror.y,l.eye.x-l.mirror.x)*180/Math.PI;
 let a=(incoming+outgoing)/2;while(a>90)a-=180;while(a<-90)a+=180;return a;
}
