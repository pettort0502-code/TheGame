import test from 'node:test';
import assert from 'node:assert/strict';
import {motionPose} from './motion.js';
test('double jump performs a full forward flip with tucked limbs then returns upright',()=>{
 assert.ok(Math.abs(motionPose(0,10,false).flip)<1e-8);
 const middle=motionPose(.25,10,false);assert.ok(Math.abs(middle.flip+Math.PI)<1e-8);assert.equal(middle.tuck,1);
 assert.ok(motionPose(.499,10,false).flip< -6.28);
 const done=motionPose(.5,10,false);assert.equal(done.flip,0);assert.equal(done.tuck,0);
});
