import test from 'node:test';
import assert from 'node:assert/strict';
import {configureWorld} from './level-world.js';
import {chapters,checkpoints,portal,requiredByStage,routeNodes,levelWorld} from './level-data.js';
import {laserPhase,laserHits} from './level-hazards.js';
import {levelLasers,HARD_RULES,levelTurrets,levelDrones} from './level-data.js';
import {newRun,checkpointSpawn,tickRun,remainingGuards,activateStage} from './level-run.js';
import {newCombat,tickCombat} from './enemies.js';
import {newPlayer,step,world,canGrapple,cycleItem} from './physics.js';
const dt=1/120;configureWorld(true);
function setup(){const run=newRun(),p=newPlayer(),c=newCombat();checkpointSpawn(run,p,c);return {run,p,c};}
test('authored level has eight distinct encounters, nine safe checkpoints, vertical routes and a final portal deck',()=>{
 assert.equal(chapters.length,8);assert.equal(checkpoints.length,9);assert.ok(portal.z< -900);assert.ok(checkpoints.at(-1).y>130);
 for(let i=0;i<8;i++){assert.ok(routeNodes[i].length>=5);if(i<7)assert.ok(requiredByStage[i].length>=2);for(let j=1;j<routeNodes[i].length;j++){const a=routeNodes[i][j-1],b=routeNodes[i][j];assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<=34.01);assert.ok(Math.abs(a.y-b.y)<=8.01);}}
 for(let i=0;i<9;i++){const cp=checkpoints[i],deck=world.find(w=>w.id===`relay-deck-${i}`);assert.ok(deck&&!deck.breakable&&!deck.collapsing);assert.ok(Math.abs(cp.y-deck.y-deck.h/2-.65)<1e-8);}
});
test('relays require their guards, activate in order and save a two-item checkpoint loadout',()=>{
 const {run,p,c}=setup();p.inventory=['grapple','spear'];p.equipped='spear';tickRun(run,p,c,dt);
 Object.assign(p,checkpoints[1]);assert.equal(tickRun(run,p,c,dt),null);assert.equal(run.stage,0);
 for(const e of remainingGuards(run,c))e.dead=true;
 assert.equal(tickRun(run,p,c,dt),'checkpoint');assert.equal(run.stage,1);assert.deepEqual(run.loadout,['grapple','spear']);
 assert.ok(c.sentries.filter(e=>e.active).every(e=>e.levelStage===1));
 p.inventory=['hammer'];p.x=500;p.y=-50;const fresh=newCombat();checkpointSpawn(run,p,fresh,true);assert.equal(run.deaths,1);assert.equal(p.z,checkpoints[1].z);assert.deepEqual(p.inventory,['grapple','spear']);assert.equal(fresh.invulnerable,3);assert.equal(fresh.shots.length,0);assert.ok(p.pickupPositions['plaza-hammer']);
});
test('single-hit or fall retries the checkpoint without a shield pool, and completion cannot skip relays',()=>{
 const {run,p,c}=setup();assert.equal('health' in c,false);assert.equal(tickRun(run,p,c,dt,true),'death');assert.equal(tickRun(run,p,c,dt,false,p.falls-1),'death');
 Object.assign(p,portal);assert.equal(tickRun(run,p,c,dt),null);assert.equal(run.completed,false);
 for(let i=0;i<8;i++){for(const e of remainingGuards(run,c))e.dead=true;Object.assign(p,checkpoints[i+1]);assert.equal(tickRun(run,p,c,dt),'checkpoint');}
 Object.assign(p,portal);assert.equal(tickRun(run,p,c,dt),'complete');assert.equal(run.completed,true);const time=run.elapsed;tickRun(run,p,c,10);assert.equal(run.elapsed,time);
});
test('escape decks warn then collapse and retries restore them and the escape countdown',()=>{
 const {run,p}=setup();run.stage=7;let c=newCombat();checkpointSpawn(run,p,c);const deck=world.find(w=>w.collapsing);Object.assign(p,{x:deck.x,y:deck.y+deck.h/2+.65,z:deck.z,grounded:true});
 tickRun(run,p,c,.2);assert.equal(deck.destroyed,false);tickRun(run,p,c,.3);assert.equal(deck.destroyed,true);assert.equal(world.includes(deck),false);
 run.escapeRemaining=.1;assert.equal(tickRun(run,p,c,.2),'death');c=newCombat();checkpointSpawn(run,p,c,true);assert.equal(deck.destroyed,false);assert.ok(world.includes(deck));assert.equal(run.escapeRemaining,60);
});

test('a fall retry retains the full three-second spawn grace on the next combat update',()=>{
 const {run,p}=setup();p.falls=2;const c=newCombat();checkpointSpawn(run,p,c,true);tickCombat(c,p,p,dt);assert.ok(c.invulnerable>2.9);assert.equal(run.deaths,1);
});

test('navigation catches up after a grapple shortcut without requiring every route arrow',()=>{
 const {run,p,c}=setup();Object.assign(p,routeNodes[0][5]);tickRun(run,p,c,dt);assert.ok(run.nav>=6);assert.equal(run.stage,0);
});

test('hard route has tight decks, reachable anchors, stronger encounters and a shorter escape',()=>{
 assert.equal(HARD_RULES.escapeSeconds,60);assert.equal(HARD_RULES.collapseSeconds,.45);
 assert.ok(requiredByStage.slice(0,7).reduce((n,ids)=>n+ids.length,0)>=50);
 const decks=levelWorld.filter(w=>/^level-[1-6]-deck-/.test(w.id));assert.ok(decks.filter(w=>w.w<=3.8).length>decks.length/2);assert.equal(levelLasers.length,13);
 for(const nodes of routeNodes)for(let i=1;i<nodes.length;i++){const a=nodes[i-1],b=nodes[i],hook=levelWorld.find(w=>w.id===b.crossingHookId);if(hook)assert.ok(Math.hypot(hook.x-a.x,hook.y-a.y,hook.z-a.z)<20);}
});
test('laser barriers telegraph, cycle off, catch a fast crossing and can be jumped',()=>{
 const l=levelLasers[0],p={...newPlayer(),x:l.x,y:l.y-.25,z:l.z+2,time:1.1-l.phase};
 assert.equal(laserPhase(l,.4-l.phase),'warning');assert.equal(laserPhase(l,1.1-l.phase),'active');assert.equal(laserPhase(l,3-l.phase),'off');
 const before={...p,z:l.z-2};assert.equal(laserHits(p,before,l.levelStage),true);assert.equal(laserHits({...p,y:l.y+2},{...before,y:l.y+2},l.levelStage),false);
 const {run,c}=setup();run.stage=l.levelStage;checkpointSpawn(run,p,c);Object.assign(p,{x:l.x,y:l.y-.25,z:l.z,time:1.1-l.phase});c.invulnerable=0;assert.equal(tickRun(run,p,c,dt,false,p.falls,before),'death');
});

test('most route spans require powered traversal and gap anchors reach both adjacent decks',()=>{
 let wide=0,total=0;
 for(const nodes of routeNodes)for(let i=1;i<nodes.length;i++){
  const a=nodes[i-1],b=nodes[i],h=levelWorld.find(w=>w.id===b.crossingHookId);total++;if(Math.hypot(a.x-b.x,a.z-b.z)>20)wide++;
  assert.ok(h);for(const n of [a,b])assert.ok(Math.hypot(h.x-n.x,h.y-n.y,h.z-n.z)<20);
 }
 assert.ok(wide>total*.5);
});
