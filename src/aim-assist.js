import {world,canGrapple} from './physics.js';
import {droneRoutes,droneAt} from './drones.js';
// Small acquisition cone; never rotates the camera or extends grapple reach.
export function assistedTarget(player,origin,direction,direct){
 if(direct&&canGrapple(player,direct))return direct;
 const cone=4*Math.PI/180;
 let best=null,bestScore=Infinity;
 const boxes=[...world,...droneRoutes.map(r=>({...droneAt(r.id,player.time),droneId:r.id}))];
 for(const box of boxes){
  if(Math.hypot(box.x-player.x,box.y-player.y,box.z-player.z)>20+Math.hypot(box.w,box.h,box.d)/2)continue;
  const centerDistance=(box.x-origin.x)*direction.x+(box.y-origin.y)*direction.y+(box.z-origin.z)*direction.z;
  if(centerDistance<=0)continue;
  for(const [axis,size] of [['x','w'],['y','h'],['z','d']])for(const sign of [-1,1]){
   const point={};
   for(const [a,s] of [['x','w'],['y','h'],['z','d']])point[a]=Math.max(box[a]-box[s]/2,Math.min(box[a]+box[s]/2,origin[a]+direction[a]*centerDistance));
   point[axis]=box[axis]+sign*(box[size]/2+.04);
   const dx=point.x-origin.x,dy=point.y-origin.y,dz=point.z-origin.z,d=Math.hypot(dx,dy,dz);
   if(d<.1)continue;
   const angle=Math.acos(Math.max(-1,Math.min(1,(dx*direction.x+dy*direction.y+dz*direction.z)/d)));
   const score=angle+d*.002;
   if(angle>cone||score>=bestScore)continue;
   const candidate={...point,nx:axis==='x'?sign:0,ny:axis==='y'?sign:0,nz:axis==='z'?sign:0,assisted:true};
   if(box.droneId){candidate.droneId=box.droneId;candidate.offset={x:point.x-box.x,y:point.y-box.y,z:point.z-box.z};}else candidate.surfaceId=box.id;
   if(canGrapple(player,candidate)){best=candidate;bestScore=score;}
  }
 }
 return best||direct;
}
