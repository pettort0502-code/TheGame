import test from 'node:test';
import assert from 'node:assert/strict';
import {newCombat,tickCombat} from './enemies.js';
import {newPlayer} from './physics.js';
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
test('swept projectiles hit fast moving players, grant immunity, regenerate and signal defeat',()=>{
 const c=newCombat();c.sentries=[];const p={...newPlayer(),x:100,y:2,z:60},before={...p,x:98};
 const shot=()=>({x:99,y:2,z:60,vx:0,vy:0,vz:0,life:2,owner:'test'});
 c.shots=[shot(),shot()];assert.equal(tickCombat(c,p,before,dt),false);assert.equal(c.health,2);assert.equal(c.hits,1);
 for(let i=0;i<750;i++)tickCombat(c,p,p,dt);assert.equal(c.health,3);
 c.health=1;c.invulnerable=0;c.shots=[shot()];assert.equal(tickCombat(c,p,before,dt),true);assert.equal(c.health,0);
});
test('shots stop on walls, expire, and enemy bases are solid outside the plaza',()=>{
 const c=newCombat();c.sentries=[];const p={...newPlayer(),x:100,y:3,z:60};
 c.shots=[{x:0,y:.2,z:-1,vx:0,vy:-18,vz:0,life:2,owner:'test'},{x:120,y:5,z:60,vx:0,vy:0,vz:0,life:.001,owner:'test'}];
 tickCombat(c,p,p,.1);assert.equal(c.shots.length,0);
 assert.equal(enemySpawns.length,8);assert.ok(enemySpawns.every(e=>Math.hypot(e.x,e.z)>40&&world.some(w=>w.id===e.id)));
});
