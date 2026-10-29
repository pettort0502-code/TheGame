import test from 'node:test';
import assert from 'node:assert/strict';
import {assistedTarget} from './aim-assist.js';
import {newPlayer,canGrapple} from './physics.js';
import {world} from './world.js';
import {droneAt} from './drones.js';
test('assist acquires nearby drone faces at every speed, without wide-angle snapping',()=>{
 const d=droneAt('plaza-drone',0),p={...newPlayer(),x:d.x,y:d.y,z:d.z-12,vx:30},origin={x:p.x,y:p.y,z:p.z};
 const direction={x:Math.sin(.035),y:0,z:Math.cos(.035)};
 const a=assistedTarget(p,origin,direction,null);assert.ok(a?.assisted);assert.equal(a.droneId,d.id);assert.ok(canGrapple(p,a));
 for(const speed of [0,9,16,42])for(const distance of [3,12,19.9]){
  const q={...p,vx:speed,z:d.z-distance};
  const target=assistedTarget(q,q,direction,null);
  assert.equal(target?.droneId,d.id,`speed ${speed}, distance ${distance}`);assert.ok(canGrapple(q,target));
 }
 assert.equal(assistedTarget(p,origin,{x:1,y:0,z:0},null),null);
});
test('assist respects range and occlusion and gives valid direct shots priority',()=>{
 const d=droneAt('plaza-drone',0),p={...newPlayer(),x:d.x,y:d.y,z:d.z-12,vx:30},o={...p},dir={x:0,y:0,z:1};
 const direct={droneId:d.id,offset:{x:0,y:0,z:-.64},x:d.x,y:d.y,z:d.z-.64};assert.equal(assistedTarget(p,o,dir,direct),direct);
 const wall={id:'assist-test-wall',x:d.x,y:d.y,z:d.z-6,w:10,h:10,d:.5};world.push(wall);
 try{const a=assistedTarget(p,o,dir,null);assert.notEqual(a?.droneId,d.id);assert.ok(!a||canGrapple(p,a));}finally{world.pop();}
 const far={...p,z:d.z-40};assert.notEqual(assistedTarget(far,far,dir,null)?.droneId,d.id);
});

test('wider assist catches a five-degree near miss but rejects a shot outside six degrees',()=>{
 const box={id:'assist-cone-test',x:70,y:25,z:70,w:.2,h:.2,d:.2};world.push(box);
 try{
  const p={...newPlayer(),x:70,y:25,z:58},dir=a=>({x:Math.sin(a*Math.PI/180),y:0,z:Math.cos(a*Math.PI/180)});
  const target=assistedTarget(p,p,dir(5),null);assert.equal(target?.surfaceId,box.id);assert.ok(canGrapple(p,target));
  assert.notEqual(assistedTarget(p,p,dir(8),null)?.surfaceId,box.id);
 }finally{world.pop();}
});
