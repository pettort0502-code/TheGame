import {cargoAt} from './platforms.js';
import {shatter} from './scenery.js';
import {world,enemySpawns,enemyBases,groundSpawns,SPAWN,breakableSurfaces,cargoRoutes} from './world.js';
import {droneRoutes,droneAt} from './drones.js';
import {segmentHit,halfHeight} from './physics.js';
export const SHOT_SPEED=18;
export function newCombat(){
 for(const base of [...enemyBases,...breakableSurfaces]){base.destroyed=false;base.collapseTimer=0;if(!world.includes(base))world.push(base);}
 const roster=[...enemySpawns.map(e=>({...e,kind:'turret'})),...droneRoutes.map(e=>({...droneAt(e.id,0),kind:'drone'})),...groundSpawns.map(e=>({...e,homeX:e.x,homeZ:e.z,homeY:e.y,kind:'walker',heading:0})),...cargoRoutes.map(r=>{const c=cargoAt(r.id,0);return {id:`guard-${r.id}`,x:c.x+2,y:c.y+1.5,z:c.z,kind:'turret',carrierId:r.id,levelStage:r.levelStage,required:true};})];
 return {hits:0,kills:0,seenShockwaves:0,events:[],hitMarker:0,bursts:[],invulnerable:0,flash:0,shots:[],sentries:roster.map((e,i)=>({...e,active:true,dead:false,hp:e.armored?2:1,lastLunge:-1,hitFlash:0,charge:0,cooldown:e.levelStage!==undefined?.45+(i%4)*.17:1+i*.17})),falls:0};
}
function destroy(c,e,p){
 e.dead=true;c.kills++;c.events.push({type:'destroy',x:e.x,y:e.y,z:e.z});c.bursts.push({x:e.x,y:e.y,z:e.z,life:.6});
 const base=enemyBases.find(b=>b.id===e.id);if(base){base.destroyed=true;const index=world.indexOf(base);if(index>=0)world.splice(index,1);}
 if(p.grapple?.enemyId===e.id){p.grapple=null;p.grappleCharge=0;}
 if(e.kind==='drone'){p.deadDrones.push(e.id);if(p.grapple?.droneId===e.id){p.grapple=null;p.ropeLength=0;}}
}
function weakHit(a,b,e){return segmentHit(a,b,{x:e.x,y:e.y+.55,z:e.z,w:.5,h:.5,d:.5})!==null;}
function thrownWeakHit(a,b,e){
 const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,d=Math.hypot(dx,dy,dz)||1;
 // Follow the impact line through the coarse body collider to the visible core.
 return weakHit(a,{x:b.x+dx/d*1.6,y:b.y+dy/d*1.6,z:b.z+dz/d*1.6},e);
}
function damage(c,e,p,weak=false,power=1){
 if(e.dead)return;
 e.hp=(e.hp??1)-(weak?2:Math.max(1,power));e.hitFlash=.16;c.hitMarker=.16;
 c.events.push({type:weak?'weak':'hit',x:e.x,y:e.y,z:e.z});c.bursts.push({x:e.x,y:e.y+.2,z:e.z,life:.3,sparks:true});
 if(e.hp<=0)destroy(c,e,p);
}
function blocked(a,b,ignore){return world.some(w=>w.id!==ignore&&segmentHit(a,b,w)!==null);}
function tickThrown(c,p,dt){
 p.thrownItems=p.thrownItems.filter(t=>{
  if(t.returning){const dx=p.x-t.x,dy=p.y+.35-t.y,dz=p.z-t.z,d=Math.hypot(dx,dy,dz)||1;t.vx=dx/d*38;t.vy=dy/d*38;t.vz=dz/d*38;}
  const old={x:t.x,y:t.y,z:t.z};t.vy-=(t.returning?0:(t.gravity??20))*dt;t.life+=dt;
  const end={x:t.x+t.vx*dt,y:t.y+t.vy*dt,z:t.z+t.vz*dt};
  let fraction=1,hit=null,enemy=null;
  for(const w of world){const f=segmentHit(old,end,{...w,w:w.w+.3,h:w.h+.3,d:w.d+.3});if(f!==null&&f<=fraction){fraction=f;hit=w;}}
  if(t.damaging&&hit){enemy=c.sentries.find(e=>!e.dead&&e.active!==false&&e.id===hit.id)||null;if(enemy)hit=null;}
  if(t.damaging)for(const e of c.sentries){if(e.dead||e.active===false||t.hitIds?.includes(e.id))continue;const f=segmentHit(old,end,{...e,w:1.6,h:1.7,d:1.6});if(f!==null&&f<=fraction){fraction=f;enemy=e;hit=null;}}
  if(t.returning&&!enemy){const caught=segmentHit(old,end,{x:p.x,y:p.y+.35,z:p.z,w:1.6,h:1.6,d:1.6});
   if(caught!==null&&caught<=fraction&&p.inventory.length<2){p.inventory.push(t.type);if(!p.equipped){p.equipped=t.type;p.requireRelease=p.useHeld;}p.collectedPickups.push(t.id);p.recoverableItems=p.recoverableItems.filter(id=>id!==t.id);delete p.pickupPositions[t.id];c.events.push({type:'recall',x:p.x,y:p.y,z:p.z});return false;}
  }
  const at=Math.max(0,fraction-.002);t.x=old.x+(end.x-old.x)*at;t.y=old.y+(end.y-old.y)*at;t.z=old.z+(end.z-old.z)*at;
  if(enemy){damage(c,enemy,p,enemy.armored&&thrownWeakHit(old,end,enemy),t.power||1);if(t.returning){t.hitIds.push(enemy.id);}else{t.damaging=false;t.vx*=.15;t.vz*=.15;t.vy=1;}}
  if(hit){
   if(hit.breakable&&t.damaging){shatter(hit,p);p.pickupPositions[t.id]={x:t.x,y:t.y,z:t.z};return true;}
   t.returning=false;t.damaging=false;
   if(t.vy<0&&old.y>=hit.y+hit.h/2+.14){p.pickupPositions[t.id]={x:t.x,y:hit.y+hit.h/2+.8,z:t.z};p.pickupDelay[t.id]=p.time+.35;return false;}
   t.vx=0;t.vz=0;t.vy=Math.min(t.vy,0);
  }
  if(t.y< -18||t.life>12){delete p.pickupPositions[t.id];p.recoverableItems=p.recoverableItems.filter(id=>id!==t.id);return false;}
  p.pickupPositions[t.id]={x:t.x,y:t.y,z:t.z};return true;
 });
}
export function tickCombat(c,p,before,dt){
 const hitBefore=c.hits;
 c.events=[];c.hitMarker=Math.max(0,c.hitMarker-dt);
 if(p.falls!==c.falls){c.falls=p.falls;c.shots=[];c.invulnerable=1;}
 c.flash=Math.max(0,c.flash-dt);c.invulnerable=Math.max(0,c.invulnerable-dt);
 c.bursts=c.bursts.filter(b=>(b.life-=dt)>0);
 const pulse=p.shockwaves>c.seenShockwaves;c.seenShockwaves=p.shockwaves||0;
 if(pulse&&p.shockwave)c.bursts.push({...p.shockwave,life:.6,shockwave:true});
 const safe=p.campaign?Boolean(p.safeZone):Math.hypot(p.x-SPAWN.x,p.z-SPAWN.z)<25;
 for(const e of c.sentries){
  if(e.dead||e.active===false)continue;
  e.hitFlash=Math.max(0,(e.hitFlash||0)-dt);
  const previous={x:e.x,y:e.y,z:e.z};
  if(e.carrierId){const platform=cargoAt(e.carrierId,p.time);e.x=platform.x+2;e.y=platform.y+1.5;e.z=platform.z;}
  if(e.kind==='drone')Object.assign(e,droneAt(e.id,p.time));
  if(e.kind==='walker'){
   const chase=!safe&&Math.hypot(p.x-e.x,p.z-e.z)<24;
   const tx=chase?p.x:e.homeX+Math.sin(p.time*.5)*8,tz=chase?p.z:e.homeZ+Math.cos(p.time*.5)*8;
   const hooked=p.grapple?.enemyId===e.id&&!e.armored,px=hooked?p.x:tx,pz=hooked?p.z:tz,angle=Math.atan2(px-e.x,pz-e.z),rate=hooked?(Math.hypot(p.x-e.x,p.z-e.z)>2?12:0):p.campaign&&chase?4.5:3,vx=Math.sin(angle)*rate*dt,vz=Math.cos(angle)*rate*dt;
   const floor=(e.homeY??.75)-.75;
   const free=(x,z)=>!world.some(w=>w.id!=='ground'&&Math.abs(x-w.x)<w.w/2+.55&&Math.abs(z-w.z)<w.d/2+.55&&w.y+w.h/2>floor+.1&&w.y-w.h/2<floor+1.5)&&(!e.requireFloor||world.some(w=>Math.abs(x-w.x)<w.w/2-.5&&Math.abs(z-w.z)<w.d/2-.5&&Math.abs(w.y+w.h/2-floor)<.15));
   if(free(e.x+vx,e.z))e.x+=vx;if(free(e.x,e.z+vz))e.z+=vz;e.heading=angle;
  }
  const direction=p.spearDirection||{x:0,y:0,z:-1};
  const end={x:p.x+direction.x*1.6,y:p.y+direction.y*1.6,z:p.z+direction.z*1.6};
  const spear=p.lungeTime>0&&segmentHit({x:before.x-previous.x,y:before.y-previous.y,z:before.z-previous.z},{x:end.x-e.x,y:end.y-e.y,z:end.z-e.z},{x:0,y:0,z:0,w:2.2,h:2.4,d:2.2})!==null&&!blocked(before,e,e.id);
  const hammer=pulse&&p.shockwave&&Math.hypot(e.x-p.shockwave.x,e.y-p.shockwave.y,e.z-p.shockwave.z)<=(p.shockwave.radius||7)&&!blocked({...p.shockwave,y:p.shockwave.y+.4},e,e.id);
  if((spear&&e.lastLunge!==p.lunges)||hammer){
   if(spear)e.lastLunge=p.lunges;
   damage(c,e,p,Boolean(spear&&e.armored&&weakHit(before,end,e)),hammer?(p.shockwave.power||1):(p.spearPower||1));if(e.dead||e.active===false)continue;
  }
  if(e.kind==='walker'&&!safe&&Math.hypot(e.x-p.x,e.z-p.z)<.9&&Math.abs(e.y-p.y)<1.3&&c.invulnerable===0){c.hits++;c.events.push({type:'hurt',x:p.x,y:p.y,z:p.z});c.flash=.28;c.invulnerable=1;}
  e.cooldown=Math.max(0,e.cooldown-dt);
  const distance=Math.hypot(p.x-e.x,p.y-e.y,p.z-e.z),clear=!safe&&distance<(p.campaign?44:38)&&!blocked(e,p,e.id);
  if(!clear){e.charge=0;continue;}
  if(e.cooldown>0)continue;
  if(e.charge===0)c.events.push({type:'warning',x:e.x,y:e.y,z:e.z});
  e.charge+=dt;
  const windup=p.campaign?(e.levelStage===0?.6:.5):.65;
  e.windup=windup;
  if(e.charge<windup)continue;
  // Briefly lead movement, then fire a dodgeable straight shot; no homing.
  const shotSpeed=p.campaign?(e.levelStage===0?22:26):SHOT_SPEED;
  const lead=Math.min(.3,distance/shotSpeed*(p.campaign?.35:.2)),dx=p.x+p.vx*lead-e.x,dy=p.y+p.vy*lead-e.y,dz=p.z+p.vz*lead-e.z,d=Math.hypot(dx,dy,dz)||1;
  const fan=p.campaign&&e.levelStage>=3&&e.kind!=='walker'?[-.075,0,.075]:[0];
  for(const angle of fan)if(c.shots.length<64){const cs=Math.cos(angle),sn=Math.sin(angle);c.shots.push({x:e.x,y:e.y,z:e.z,vx:(dx*cs-dz*sn)/d*shotSpeed,vy:dy/d*shotSpeed,vz:(dx*sn+dz*cs)/d*shotSpeed,life:3,owner:e.id});}
  c.events.push({type:'shot',x:e.x,y:e.y,z:e.z});
  e.charge=0;e.cooldown=p.campaign?(e.kind==='walker'?1.45:1.15):2;
 }
 if(pulse&&p.shockwave)for(const w of [...world])if(w.breakable&&Math.hypot(w.x-p.shockwave.x,w.y-p.shockwave.y,w.z-p.shockwave.z)<=(p.shockwave.radius||7)&&!blocked({...p.shockwave,y:p.shockwave.y+.4},w,w.id))shatter(w,p);
 tickThrown(c,p,dt);
 for(const event of p.breakEvents||[]){c.bursts.push({...event,life:.6});c.events.push({...event,type:'destroy'});}p.breakEvents=[];
 c.shots=c.shots.filter(s=>{
  const old={x:s.x,y:s.y,z:s.z};s.x+=s.vx*dt;s.y+=s.vy*dt;s.z+=s.vz*dt;s.life-=dt;
  if(s.life<=0||blocked(old,s,s.owner))return false;
  // Relative swept collision catches both fast players and fast projectiles.
  const a={x:old.x-before.x,y:old.y-before.y,z:old.z-before.z},b={x:s.x-p.x,y:s.y-p.y,z:s.z-p.z};
  if(segmentHit(a,b,{x:0,y:0,z:0,w:.9,h:halfHeight(p)*2+.26,d:.9})!==null){
   if(!safe&&c.invulnerable===0){c.hits++;c.events.push({type:'hurt',x:p.x,y:p.y,z:p.z});c.flash=.28;c.invulnerable=1;}
   return false;
  }
  return true;
 });
 return c.hits>hitBefore;
}
