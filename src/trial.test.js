import test from 'node:test';
import assert from 'node:assert/strict';
import {COURSE,newTrial,beginTrial,tickTrial,formatTime} from './trial.js';
import {newPlayer,step} from './physics.js';
test('trial countdown excludes warmup time and checkpoints must be passed in order',()=>{
 const t=newTrial();beginTrial(t);const p={...COURSE.start,falls:0};tickTrial(t,p,p,2);assert.equal(t.phase,'countdown');assert.equal(t.elapsed,0);tickTrial(t,p,p,1);assert.equal(t.phase,'running');
 tickTrial(t,COURSE.gates[4],COURSE.gates[5],.1);assert.equal(t.next,1);
 const g=COURSE.gates[1];tickTrial(t,{x:g.x-8,y:g.y,z:g.z},{x:g.x+8,y:g.y,z:g.z},.1);assert.equal(t.next,2);
});
test('finish freezes the timer, assigns medals, preserves a better best, and fall ends a run',()=>{
 const t=newTrial(10);beginTrial(t);t.phase='running';
 for(let i=1;i<COURSE.gates.length;i++)tickTrial(t,COURSE.gates[i],COURSE.gates[i],2);
 assert.equal(t.phase,'finished');assert.equal(t.medal,'GOLD');assert.equal(t.best,10);const elapsed=t.elapsed;tickTrial(t,{}, {},10);assert.equal(t.elapsed,elapsed);
 const failed=newTrial();beginTrial(failed);failed.phase='running';tickTrial(failed,{falls:0},{falls:1},.01);assert.equal(failed.phase,'failed');assert.equal(failed.best,null);
 assert.equal(formatTime(59.999),'0:59.99');assert.equal(formatTime(60),'1:00.00');
});
test('the complete course is physically traversable with two moving drones and all seven gates',()=>{
 const p={...newPlayer(),...COURSE.start,grounded:true,inventory:['grapple','spear'],equipped:'grapple'},t=newTrial();beginTrial(t);
 for(let i=0;i<361;i++)tickTrial(t,p,p,1/120);
 const tick=input=>{const before={x:p.x,y:p.y,z:p.z,falls:p.falls};step(p,{x:0,z:0,...input},1/120);tickTrial(t,before,p,1/120);};
 function drive(x,z,limit,slide=false){for(let i=0;i<limit;i++){const dx=x-p.x,dz=z-p.z;if(Math.hypot(dx,dz)<.45)return;tick({x:dx,z:dz,slide});}assert.fail(`Could not reach ${x}, ${z}`);}
 drive(34,30,400);assert.equal(t.next,2);drive(34,47,400,true);assert.equal(t.next,3);
 for(const [id,height,target,expected] of [
  ['course-drone-a',6,{x:47,y:3.64,z:47,surfaceId:'course-roof-a'},4],
  ['course-drone-b',11.5,{x:60,y:6.14,z:53,surfaceId:'course-roof-b'},5],
 ]){
  tick({use:false});for(let i=0;i<1200;i++){tick({use:true,target:{droneId:id,offset:{x:0,y:-.29,z:0}}});assert.ok(p.grapple,`Could not stay attached to ${id}`);if(p.y>height)break;}
  assert.ok(p.y>height);tick({use:false});
  for(let i=0;i<900;i++){tick({use:true,target});if(t.next>=expected)break;if(!p.grapple)break;}
  assert.equal(t.next,expected);tick({use:false});
 }
 drive(70,42,1000);assert.equal(t.next,6);drive(64,22,1000);assert.equal(t.next,7);drive(40,20,1000);
 assert.equal(t.phase,'finished');assert.equal(p.falls,0);assert.equal(t.next,8);assert.ok(t.elapsed>5&&t.elapsed<65);assert.ok(p.hooks>=4);
});
