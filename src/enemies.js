import {world,enemySpawns,enemyBases,groundSpawns,SPAWN} from './world.js';
import {droneRoutes,droneAt} from './drones.js';
import {segmentHit,halfHeight} from './physics.js';
export const MAX_HEALTH=3,SHOT_SPEED=18;
export function newCombat(){
 for(const base of enemyBases){base.destroyed=false;if(!world.includes(base))world.push(base);}
 const roster=[...enemySpawns.map(e=>({...e,kind:'turret'})),...droneRoutes.map(e=>({...droneAt(e.id,0),kind:'drone'})),...groundSpawns.map(e=>({...e,homeX:e.x,homeZ:e.z,kind:'walker',heading:0}))];
 return {health:MAX_HEALTH,hits:0,kills:0,seenShockwaves:0,bursts:[],invulnerable:0,quiet:0,flash:0,shots:[],sentries:roster.map((e,i)=>({...e,dead:false,charge:0,cooldown:1+i*.17})),falls:0};
}
function destroy(c,e,p){
 e.dead=true;c.kills++;c.bursts.push({x:e.x,y:e.y,z:e.z,life:.6});
 const base=enemyBases.find(b=>b.id===e.id);if(base){base.destroyed=true;const index=world.indexOf(base);if(index>=0)world.splice(index,1);}
 if(e.kind==='drone'){p.deadDrones.push(e.id);if(p.grapple?.droneId===e.id){p.grapple=null;p.ropeLength=0;}}
}
function blocked(a,b,ignore){return world.some(w=>w.id!==ignore&&segmentHit(a,b,w)!==null);}
function tickThrown(c,p,dt){
 p.thrownItems=p.thrownItems.filter(t=>{
  const old={x:t.x,y:t.y,z:t.z};t.vy-=20*dt;t.life+=dt;
  const end={x:t.x+t.vx*dt,y:t.y+t.vy*dt,z:t.z+t.vz*dt};
  let fraction=1,hit=null,enemy=null;
  for(const w of world){const f=segmentHit(old,end,{...w,w:w.w+.3,h:w.h+.3,d:w.d+.3});if(f!==null&&f<=fraction){fraction=f;hit=w;}}
  if(t.damaging&&hit){enemy=c.sentries.find(e=>!e.dead&&e.id===hit.id)||null;if(enemy)hit=null;}
  if(t.damaging)for(const e of c.sentries){if(e.dead)continue;const f=segmentHit(old,end,{...e,w:1.6,h:1.7,d:1.6});if(f!==null&&f<=fraction){fraction=f;enemy=e;hit=null;}}
  const at=Math.max(0,fraction-.002);t.x=old.x+(end.x-old.x)*at;t.y=old.y+(end.y-old.y)*at;t.z=old.z+(end.z-old.z)*at;
  if(enemy){destroy(c,enemy,p);t.damaging=false;t.vx*=.15;t.vz*=.15;t.vy=1;}
  if(hit){
   t.damaging=false;
   if(t.vy<0&&old.y>=hit.y+hit.h/2+.14){p.pickupPositions[t.id]={x:t.x,y:hit.y+hit.h/2+.8,z:t.z};p.pickupDelay[t.id]=p.time+.35;return false;}
   t.vx=0;t.vz=0;t.vy=Math.min(t.vy,0);
  }
  if(t.y< -18||t.life>12){delete p.pickupPositions[t.id];return false;}
  p.pickupPositions[t.id]={x:t.x,y:t.y,z:t.z};return true;
 });
}
export function tickCombat(c,p,before,dt){
 if(p.falls!==c.falls){c.falls=p.falls;c.health=MAX_HEALTH;c.shots=[];c.invulnerable=1;c.quiet=0;}
 c.flash=Math.max(0,c.flash-dt);c.invulnerable=Math.max(0,c.invulnerable-dt);c.quiet+=dt;
 if(c.quiet>6&&c.health<MAX_HEALTH){c.health++;c.quiet=4;}
 c.bursts=c.bursts.filter(b=>(b.life-=dt)>0);
 const pulse=p.shockwaves>c.seenShockwaves;c.seenShockwaves=p.shockwaves||0;
 if(pulse&&p.shockwave)c.bursts.push({...p.shockwave,life:.6,shockwave:true});
 const safe=Math.hypot(p.x-SPAWN.x,p.z-SPAWN.z)<25;
 for(const e of c.sentries){
  if(e.dead)continue;
  const previous={x:e.x,y:e.y,z:e.z};
  if(e.kind==='drone')Object.assign(e,droneAt(e.id,p.time));
  if(e.kind==='walker'){
   const chase=!safe&&Math.hypot(p.x-e.x,p.z-e.z)<24;
   const tx=chase?p.x:e.homeX+Math.sin(p.time*.5)*8,tz=chase?p.z:e.homeZ+Math.cos(p.time*.5)*8;
   const angle=Math.atan2(tx-e.x,tz-e.z),vx=Math.sin(angle)*3*dt,vz=Math.cos(angle)*3*dt;
   const free=(x,z)=>!world.some(w=>w.id!=='ground'&&Math.abs(x-w.x)<w.w/2+.55&&Math.abs(z-w.z)<w.d/2+.55&&w.y+w.h/2>.1&&w.y-w.h/2<1.5);
   if(free(e.x+vx,e.z))e.x+=vx;if(free(e.x,e.z+vz))e.z+=vz;e.heading=angle;
  }
  const direction=p.spearDirection||{x:0,y:0,z:-1};
  const end={x:p.x+direction.x*1.6,y:p.y+direction.y*1.6,z:p.z+direction.z*1.6};
  const spear=p.lungeTime>0&&segmentHit({x:before.x-previous.x,y:before.y-previous.y,z:before.z-previous.z},{x:end.x-e.x,y:end.y-e.y,z:end.z-e.z},{x:0,y:0,z:0,w:2.2,h:2.4,d:2.2})!==null&&!blocked(before,e,e.id);
  const hammer=pulse&&p.shockwave&&Math.hypot(e.x-p.shockwave.x,e.y-p.shockwave.y,e.z-p.shockwave.z)<=7&&!blocked({...p.shockwave,y:p.shockwave.y+.4},e,e.id);
  if(spear||hammer){destroy(c,e,p);continue;}
  if(e.kind==='walker'&&!safe&&Math.hypot(e.x-p.x,e.z-p.z)<.9&&Math.abs(e.y-p.y)<1.3&&c.invulnerable===0){c.health--;c.hits++;c.flash=.28;c.invulnerable=1;c.quiet=0;}
  e.cooldown=Math.max(0,e.cooldown-dt);
  const distance=Math.hypot(p.x-e.x,p.y-e.y,p.z-e.z),clear=!safe&&distance<38&&!blocked(e,p,e.id);
  if(!clear){e.charge=0;continue;}
  if(e.cooldown>0)continue;
  e.charge+=dt;
  if(e.charge<.65)continue;
  // Briefly lead movement, then fire a dodgeable straight shot; no homing.
  const lead=Math.min(.25,distance/SHOT_SPEED*.2),dx=p.x+p.vx*lead-e.x,dy=p.y+p.vy*lead-e.y,dz=p.z+p.vz*lead-e.z,d=Math.hypot(dx,dy,dz)||1;
  if(c.shots.length<64)c.shots.push({x:e.x,y:e.y,z:e.z,vx:dx/d*SHOT_SPEED,vy:dy/d*SHOT_SPEED,vz:dz/d*SHOT_SPEED,life:3,owner:e.id});
  e.charge=0;e.cooldown=2;
 }
 tickThrown(c,p,dt);
 let defeated=c.health<=0;
 c.shots=c.shots.filter(s=>{
  const old={x:s.x,y:s.y,z:s.z};s.x+=s.vx*dt;s.y+=s.vy*dt;s.z+=s.vz*dt;s.life-=dt;
  if(s.life<=0||blocked(old,s,s.owner))return false;
  // Relative swept collision catches both fast players and fast projectiles.
  const a={x:old.x-before.x,y:old.y-before.y,z:old.z-before.z},b={x:s.x-p.x,y:s.y-p.y,z:s.z-p.z};
  if(segmentHit(a,b,{x:0,y:0,z:0,w:.9,h:halfHeight(p)*2+.26,d:.9})!==null){
   if(!safe&&c.invulnerable===0){c.health--;c.hits++;c.flash=.28;c.invulnerable=1;c.quiet=0;if(c.health<=0)defeated=true;}
   return false;
  }
  return true;
 });
 return defeated;
}
