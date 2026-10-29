import test from 'node:test';
import assert from 'node:assert/strict';
import {configureWorld} from './level-world.js';
import {chapters,checkpoints,portal,requiredByStage,routeNodes,levelWorld} from './level-data.js';
import {newRun,checkpointSpawn,tickRun,remainingGuards,activateStage} from './level-run.js';
import {newCombat,tickCombat} from './enemies.js';
import {newPlayer,step,world,canGrapple,cycleItem} from './physics.js';
const dt=1/120;configureWorld(true);
function setup(){const run=newRun(),p=newPlayer(),c=newCombat();checkpointSpawn(run,p,c);return {run,p,c};}
test('authored level has eight distinct encounters, nine safe checkpoints, vertical routes and a final portal deck',()=>{
 assert.equal(chapters.length,8);assert.equal(checkpoints.length,9);assert.ok(portal.z< -900);assert.ok(checkpoints.at(-1).y>130);
 for(let i=0;i<8;i++){assert.ok(routeNodes[i].length>=10);if(i<7)assert.ok(requiredByStage[i].length>=2);for(let j=1;j<routeNodes[i].length;j++){const a=routeNodes[i][j-1],b=routeNodes[i][j];assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<=13.01);assert.ok(Math.abs(a.y-b.y)<=4.01);}}
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
 tickRun(run,p,c,.5);assert.equal(deck.destroyed,false);tickRun(run,p,c,.8);assert.equal(deck.destroyed,true);assert.equal(world.includes(deck),false);
 run.escapeRemaining=.1;assert.equal(tickRun(run,p,c,.2),'death');c=newCombat();checkpointSpawn(run,p,c,true);assert.equal(deck.destroyed,false);assert.ok(world.includes(deck));assert.equal(run.escapeRemaining,120);
});

test('a fall retry retains the full three-second spawn grace on the next combat update',()=>{
 const {run,p}=setup();p.falls=2;const c=newCombat();checkpointSpawn(run,p,c,true);tickCombat(c,p,p,dt);assert.ok(c.invulnerable>2.9);assert.equal(run.deaths,1);
});

test('navigation catches up after a grapple shortcut without requiring every route arrow',()=>{
 const {run,p,c}=setup();Object.assign(p,routeNodes[0][5]);tickRun(run,p,c,dt);assert.ok(run.nav>=6);assert.equal(run.stage,0);
});
