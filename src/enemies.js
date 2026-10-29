import {world,enemySpawns,SPAWN} from './world.js';
import {segmentHit,halfHeight} from './physics.js';
export const MAX_HEALTH=3,SHOT_SPEED=18;
export function newCombat(){return {health:MAX_HEALTH,hits:0,invulnerable:0,quiet:0,flash:0,shots:[],sentries:enemySpawns.map((e,i)=>({...e,charge:0,cooldown:1+i*.17})),falls:0};}
function blocked(a,b,ignore){return world.some(w=>w.id!==ignore&&segmentHit(a,b,w)!==null);}
export function tickCombat(c,p,before,dt){
 if(p.falls!==c.falls){c.falls=p.falls;c.health=MAX_HEALTH;c.shots=[];c.invulnerable=1;c.quiet=0;}
 c.flash=Math.max(0,c.flash-dt);c.invulnerable=Math.max(0,c.invulnerable-dt);c.quiet+=dt;
 if(c.quiet>6&&c.health<MAX_HEALTH){c.health++;c.quiet=4;}
 const safe=Math.hypot(p.x-SPAWN.x,p.z-SPAWN.z)<25;
 for(const e of c.sentries){
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
 let defeated=false;
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
