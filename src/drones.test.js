import test from 'node:test';
import assert from 'node:assert/strict';
import {droneAt,resolveAnchor} from './drones.js';
import {newPlayer,step,canGrapple} from './physics.js';
test('drone flight and anchor points move continuously and reject forged offsets',()=>{
 const a=droneAt('plaza-drone',0),b=droneAt('plaza-drone',1);assert.notEqual(a.x,b.x);
 const target={droneId:a.id,offset:{x:0,y:-.29,z:0}};const first=resolveAnchor(target,0),later=resolveAnchor(target,1);assert.equal(first.y,a.y-.29);assert.notEqual(first.x,later.x);
 assert.equal(resolveAnchor({...target,offset:{x:100,y:0,z:0}},0),null);assert.equal(resolveAnchor({...target,droneId:'missing'},0),null);
});
test('hook follows the moving drone and releases with its resulting momentum',()=>{
 const d=droneAt('plaza-drone'),p={...newPlayer(),x:d.x,y:d.y-4,z:d.z,inventory:['grapple'],equipped:'grapple'},target={droneId:d.id,offset:{x:0,y:-.29,z:0}};
 assert.ok(canGrapple(p,target));for(let i=0;i<100;i++)step(p,{x:0,z:0,use:true,target},1/120);
 assert.ok(p.grapple);const expected=resolveAnchor(target,p.time);assert.ok(Math.abs(expected.x-p.grapple.x)<1e-8);assert.equal(p.hooks,1);
 const vx=p.vx,vz=p.vz;step(p,{x:0,z:0,use:false},1/120);assert.equal(p.grapple,null);assert.equal(p.vx,vx);assert.equal(p.vz,vz);
});
