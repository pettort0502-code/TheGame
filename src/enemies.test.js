import test from 'node:test';
import assert from 'node:assert/strict';
import {newCombat,tickCombat} from './enemies.js';
import {newPlayer,dropItem,step} from './physics.js';
import {world,enemySpawns} from './world.js';
const dt=1/120;
test('sentries telegraph, fire toward visible players, and respect safe plaza and cover',()=>{
 const c=newCombat(),e=c.sentries[0],p={...newPlayer(),x:e.x+10,y:1.6,z:e.z};c.sentries=[e];e.cooldown=0;
 for(let i=0;i<60;i++)tickCombat(c,p,p,dt);assert.equal(c.shots.length,0);assert.ok(e.charge>.4);
 for(let i=0;i<20;i++)tickCombat(c,p,p,dt);assert.equal(c.shots.length,1);assert.ok(c.shots[0].vx>17);
 const safe=newCombat();for(let i=0;i<600;i++)tickCombat(safe,newPlayer(),newPlayer(),dt);assert.equal(safe.shots.length,0);
 const cover={id:'test-cover',x:e.x+5,y:2,z:e.z,w:1,h:4,d:8};world.push(cover);
 try{const blocked=newCombat();blocked.sentries=[{...e,cooldown:0,charge:0}];for(let i=0;i<120;i++)tickCombat(blocked,p,p,dt);assert.equal(blocked.shots.length,0);}finally{world.pop();}
});
test('one projectile hit signals a retry, with no shield pool and immunity preventing repeats',()=>{
 const c=newCombat();c.sentries=[];const p={...newPlayer(),x:100,y:2,z:60},before={...p,x:98};
 const shot=()=>({x:99,y:2,z:60,vx:0,vy:0,vz:0,life:2,owner:'test'});
 c.shots=[shot(),shot()];assert.equal(tickCombat(c,p,before,dt),true);assert.equal(c.hits,1);assert.equal('health' in c,false);
 c.shots=[shot()];assert.equal(tickCombat(c,p,before,dt),false);assert.equal(c.hits,1);
 c.invulnerable=0;c.shots=[shot()];assert.equal(tickCombat(c,p,before,dt),true);assert.equal(c.hits,2);
});
test('shots stop on walls, expire, and enemy bases are solid outside the plaza',()=>{
 const c=newCombat();c.sentries=[];const p={...newPlayer(),x:100,y:3,z:60};
 c.shots=[{x:0,y:.2,z:-1,vx:0,vy:-18,vz:0,life:2,owner:'test'},{x:120,y:5,z:60,vx:0,vy:0,vz:0,life:.001,owner:'test'}];
 tickCombat(c,p,p,.1);assert.equal(c.shots.length,0);
 assert.equal(enemySpawns.length,16);assert.ok(enemySpawns.every(e=>Math.hypot(e.x,e.z)>40&&world.some(w=>w.id===e.id)));
});

test('spear sweeps destroy turrets, remove solid bases, and reset restores them',()=>{
 const c=newCombat(),e=c.sentries.find(e=>e.kind==='turret');c.sentries=[e];
 const p={...newPlayer(),x:e.x+2,y:e.y,z:e.z,lungeTime:.2,spearDirection:{x:1,y:0,z:0}};
 tickCombat(c,p,{x:e.x-3,y:e.y,z:e.z},dt);assert.equal(e.dead,true);assert.equal(c.kills,1);assert.equal(world.some(w=>w.id===e.id),false);
 tickCombat(c,p,p,dt);assert.equal(c.kills,1);newCombat();assert.ok(world.some(w=>w.id===e.id));
});
test('hammer blast destroys nearby enemies, respects cover, and destroyed drones release grapple',()=>{
 const c=newCombat(),drone=c.sentries.find(e=>e.kind==='drone');c.sentries=[drone];
 const p={...newPlayer(),x:drone.x,y:drone.y-2,z:drone.z,shockwaves:1,shockwave:{x:drone.x,y:drone.y-2,z:drone.z},grapple:{droneId:drone.id}};
 tickCombat(c,p,p,dt);assert.equal(drone.dead,true);assert.ok(p.deadDrones.includes(drone.id));assert.equal(p.grapple,null);
 const blocked=newCombat(),e=blocked.sentries.find(e=>e.kind==='turret');blocked.sentries=[e];const q={...newPlayer(),x:e.x+4,y:e.y,z:e.z,shockwaves:1,shockwave:{x:e.x+4,y:e.y,z:e.z}};
 world.push({id:'blast-cover',x:e.x+2,y:2,z:e.z,w:.5,h:4,d:5});try{tickCombat(blocked,q,q,dt);assert.equal(e.dead,false);}finally{world.pop();}
});
test('ground enemies move and armed drones fire outside the safe plaza',()=>{
 const c=newCombat(),walker=c.sentries.find(e=>e.kind==='walker'),drone=c.sentries.find(e=>e.kind==='drone'&&e.id==='outer-drone-0');c.sentries=[walker,drone];
 const p={...newPlayer(),x:drone.x,y:drone.y,z:drone.z-8};drone.cooldown=0;const old={x:walker.x,z:walker.z};let fired=false;
 for(let i=0;i<100;i++){p.time+=dt;tickCombat(c,p,p,dt);fired||=c.shots.some(s=>s.owner===drone.id);}
 assert.ok(Math.hypot(walker.x-old.x,walker.z-old.z)>.1);assert.ok(fired);
});

test('thrown equipment destroys enemies, lands as a pickup, and can be recovered',()=>{
 const c=newCombat(),p={...newPlayer(),x:-60,y:.65,z:0,inventory:['spear'],equipped:'spear',collectedPickups:['plaza-spear']};
 const enemy={id:'throw-target',x:-50,y:1.3,z:0,cooldown:100,charge:0};c.sentries=[enemy];
 dropItem(p,{x:1,y:0,z:0});assert.equal(p.inventory.length,0);assert.ok(p.thrownItems[0].vx>27);
 for(let i=0;i<600&&p.thrownItems.length;i++){p.time+=dt;tickCombat(c,p,p,dt);}
 assert.equal(enemy.dead,true);assert.equal(c.kills,1);assert.equal(p.thrownItems.length,0);
 Object.assign(p,p.pickupPositions['plaza-spear']);p.time+=1;step(p,{x:0,z:0},dt);assert.deepEqual(p.inventory,['spear']);
});
test('thrown weapons stop at cover before enemies and can hit solid turret bases',()=>{
 const c=newCombat(),p={...newPlayer(),x:-60,y:.65,z:0,inventory:['spear'],equipped:'spear',collectedPickups:['plaza-spear']};
 const e={id:'covered-throw-target',x:-50,y:1.3,z:0,cooldown:100,charge:0};c.sentries=[e];
 world.push({id:'throw-wall',x:-55,y:2,z:0,w:.5,h:4,d:5});
 try{dropItem(p,{x:1,y:0,z:0});for(let i=0;i<240;i++){p.time+=dt;tickCombat(c,p,p,dt);}assert.equal(e.dead,undefined);assert.equal(c.kills,0);}finally{world.pop();}
 const fresh=newCombat(),turret=fresh.sentries.find(e=>e.kind==='turret');fresh.sentries=[turret];
 const q={...newPlayer(),x:turret.x-5,y:.65,z:turret.z,inventory:['hammer'],equipped:'hammer',collectedPickups:['plaza-hammer']};dropItem(q,{x:1,y:0,z:0});
 for(let i=0;i<60&&!turret.dead;i++){q.time+=dt;tickCombat(fresh,q,q,dt);}assert.equal(turret.dead,true);newCombat();
});

test('armored robots take two separate spear lunges, with one damage event per lunge',()=>{
 const c=newCombat(),e=c.sentries.find(e=>e.armored);c.sentries=[e];
 const p={...newPlayer(),x:e.x-1.5,y:.65,z:e.z,lungeTime:.2,lunges:1,spearDirection:{x:1,y:0,z:0}};
 tickCombat(c,p,p,dt);assert.equal(e.hp,1);assert.equal(e.dead,false);assert.ok(c.hitMarker>0);
 for(let i=0;i<5;i++)tickCombat(c,p,p,dt);assert.equal(e.hp,1);
 p.lunges=2;tickCombat(c,p,p,dt);assert.equal(e.dead,true);assert.equal(c.kills,1);
});
test('a precise spear hit on the glowing weak core destroys armor in one attack',()=>{
 const c=newCombat(),e=c.sentries.find(e=>e.armored);c.sentries=[e];
 const p={...newPlayer(),x:e.x-1.7,y:e.y+.55,z:e.z,lungeTime:.2,lunges:1,spearDirection:{x:1,y:0,z:0}};
 tickCombat(c,p,p,dt);assert.equal(e.dead,true);assert.ok(c.events.some(e=>e.type==='weak'));
});
test('javelin throws have less drop at twenty metres than other thrown items',()=>{
 const height={};for(const type of ['spear','hammer','grapple']){
  const c=newCombat();c.sentries=[];const p={...newPlayer(),x:-60,y:30,z:0,inventory:[type],equipped:type,collectedPickups:[`plaza-${type}`]};dropItem(p,{x:1,y:0,z:0});
  while(p.thrownItems[0].x< -40){p.time+=dt;tickCombat(c,p,p,dt);}
  height[type]=p.thrownItems[0].y;
 }
 assert.ok(height.spear>height.hammer+1);assert.equal(height.hammer,height.grapple);
});

test('a thrown javelin aimed at the core gets weak-point damage before the coarse body stops it',()=>{
 const c=newCombat(),e=c.sentries.find(e=>e.armored);c.sentries=[e];
 const p={...newPlayer(),x:e.x-6,y:e.y+.2,z:e.z,inventory:['spear'],equipped:'spear',collectedPickups:['plaza-spear']};
 dropItem(p,{x:1,y:.008,z:0});let weak=false;
 for(let i=0;i<40&&!e.dead;i++){p.time+=dt;tickCombat(c,p,p,dt);weak||=c.events.some(event=>event.type==='weak');}
 assert.equal(e.dead,true);assert.ok(weak);
});
