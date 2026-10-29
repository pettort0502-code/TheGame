import test from 'node:test';
import assert from 'node:assert/strict';
import {newPlayer,step,canGrapple,dropItem,releaseGrapple,recallItems,cycleItem,world,halfHeight} from './physics.js';
import {newCombat,tickCombat} from './enemies.js';
import {cargoAt} from './platforms.js';
import {cargoRoutes} from './world.js';
const dt=1/120,idle={x:0,z:0};
test('wall grinding carries speed along a wall and a wall kick exits cleanly',()=>{
 const p={...newPlayer(),x:12.68,y:4,z:-9,vz:20};
 for(let i=0;i<20;i++)step(p,{x:0,z:1,grind:true},dt);
 assert.equal(p.grinding,true);assert.ok(Math.hypot(p.vx,p.vz)>=19.9);assert.ok(p.y>3.8);
 step(p,{x:0,z:1,grind:true,jump:true},dt);assert.equal(p.grinding,false);assert.equal(p.wallJumps,1);assert.ok(p.vx>9);
});
test('charged grapple release adds launch speed while quick releases and switching preserve speed',()=>{
 const p={...newPlayer(),grapple:{x:0,y:8,z:0},grappleCharge:1.4,vx:10};releaseGrapple(p);assert.equal(p.vx,26);assert.equal(p.slingshots,1);assert.equal(p.grapple,null);
 const q={...newPlayer(),grapple:{x:0,y:8,z:0},grappleCharge:.2,vx:10};releaseGrapple(q);assert.equal(q.vx,10);
 const r={...newPlayer(),inventory:['grapple','spear'],equipped:'grapple',grapple:{x:0,y:8,z:0},grappleCharge:1.4,vx:10};cycleItem(r);assert.equal(r.vx,10);assert.equal(r.grapple,null);
});
test('cargo carries a standing player, transfers jump momentum and supports moving grapple anchors',()=>{
 const c=cargoAt('cargo-river',0),p={...newPlayer(),x:c.x,y:c.y+c.h/2+.65,z:c.z,grounded:true,riding:c.id};
 for(let i=0;i<120;i++)step(p,idle,dt);
 const now=cargoAt(c.id,p.time);assert.ok(Math.abs(p.x-now.x)<.01);assert.ok(Math.abs(p.y-halfHeight(p)-now.y-now.h/2)<.01);assert.equal(p.riding,c.id);
 step(p,{...idle,jump:true},dt);assert.ok(p.vx>2);assert.equal(p.grounded,false);
 const q={...newPlayer(),x:c.x,y:c.y,z:c.z+10,inventory:['grapple'],equipped:'grapple'};
 const target={cargoId:c.id,surfaceId:c.id,offset:{x:0,y:0,z:2.54}};step(q,{...idle,use:true,target},dt);assert.ok(q.grapple);const old=q.grapple.x;for(let i=0;i<20;i++)step(q,{...idle,use:true,target},dt);assert.notEqual(q.grapple.x,old);
});
test('light enemies reel toward the player while heavy enemies act as rope anchors',()=>{
 const c=newCombat(),e=c.sentries.find(e=>e.kind==='walker'&&!e.armored);c.sentries=[e];
 const p={...newPlayer(),x:e.x+10,y:1,z:e.z,inventory:['grapple'],equipped:'grapple',enemyTargets:c.sentries};
 const target={enemyId:e.id,offset:{x:.84,y:0,z:0}};assert.ok(canGrapple(p,target));const old=e.x;
 for(let i=0;i<30;i++){const before={...p};step(p,{...idle,use:true,target},dt);tickCombat(c,p,before,dt);}
 assert.ok(p.grapple?.lightEnemy);assert.ok(e.x>old+2);assert.ok(Math.abs(p.x-(old+10))<.01);
 const heavy=newCombat(),h=heavy.sentries.find(e=>e.armored),q={...newPlayer(),x:h.x+10,y:1,z:h.z,inventory:['grapple'],equipped:'grapple',enemyTargets:heavy.sentries};
 step(q,{...idle,use:true,target:{enemyId:h.id,offset:{x:.84,y:0,z:0}}},dt);assert.ok(q.grapple);assert.equal(q.grapple.lightEnemy,false);
});
test('recall passes through enemies and catches the weapon within the two-slot limit',()=>{
 const c=newCombat(),p={...newPlayer(),x:-60,y:10,z:0,recoverableItems:['plaza-spear'],pickupPositions:{'plaza-spear':{x:-45,y:10.35,z:0}}};
 c.sentries=[-50,-55].map((x,i)=>({id:`return-target-${i}`,x,y:10,z:0,cooldown:100,charge:0}));
 assert.equal(recallItems(p),1);for(let i=0;i<200&&p.thrownItems.length;i++){p.time+=dt;tickCombat(c,p,p,dt);}
 assert.equal(c.kills,2);assert.deepEqual(p.inventory,['spear']);assert.equal(p.thrownItems.length,0);assert.equal(p.recoverableItems.length,0);
 const q={...newPlayer(),inventory:['hammer'],recoverableItems:['plaza-grapple','plaza-spear'],pickupPositions:{'plaza-spear':{x:10,y:4,z:0},'plaza-grapple':{x:10,y:4,z:1}}};assert.equal(recallItems(q),1);assert.equal(recallItems(q),0);assert.equal(q.thrownItems.length,1);
});
test('recall respects cover and leaves a recoverable item after a blocked return',()=>{
 const c=newCombat();c.sentries=[];const p={...newPlayer(),x:-60,y:10,z:0,recoverableItems:['plaza-spear'],pickupPositions:{'plaza-spear':{x:-45,y:10.35,z:0}}};
 world.push({id:'recall-cover',x:-55,y:10,z:0,w:.5,h:20,d:5});
 try{recallItems(p);for(let i=0;i<80;i++){p.time+=dt;tickCombat(c,p,p,dt);}assert.equal(p.inventory.length,0);assert.ok(p.recoverableItems.includes('plaza-spear'));assert.ok(!p.thrownItems[0]?.returning);}finally{world.pop();}
});
test('fast attacks shatter solid scenery and reset restores it',()=>{
 newCombat();const glass=world.find(w=>w.id==='glass-panel-0');const p={...newPlayer(),x:-13,y:.65,z:7,vx:30,lungeTime:.2};
 step(p,{x:1,z:0},.1);assert.equal(glass.destroyed,true);assert.ok(!world.includes(glass));assert.ok(p.x> -10.3);assert.equal(p.breakEvents.length,1);
 newCombat();assert.ok(world.includes(glass));assert.equal(glass.destroyed,false);
});
test('earned movement speed strengthens spear attacks and widens hammer shockwaves',()=>{
 const spear=v=>{const p={...newPlayer(),x:-60,y:3,z:0,vx:v,inventory:['spear'],equipped:'spear'};step(p,{...idle,use:true,facingX:1,facingZ:0},dt);return p.spearPower;};assert.equal(spear(9),1);assert.ok(spear(40)>2);
 const hammer=v=>{const p={...newPlayer(),x:-60,y:.65,z:0,grounded:true,vx:v,inventory:['hammer'],equipped:'hammer'};step(p,{...idle,use:true},dt);return p.shockwave;};
 const slow=hammer(0),fast=hammer(40);assert.equal(slow.radius,7);assert.ok(fast.radius>slow.radius+3);assert.ok(fast.power>1.5);
});

test('cargo guards travel with their platform and can be defeated without destroying the deck',()=>{
 const c=newCombat(),e=c.sentries.find(e=>e.carrierId==='cargo-river');c.sentries=[e];const p={...newPlayer(),time:2,x:100,y:1,z:0};tickCombat(c,p,p,dt);
 const deck=cargoAt(e.carrierId,p.time);assert.ok(Math.abs(e.x-deck.x-2)<1e-8);
 Object.assign(p,{x:e.x-1,y:e.y,z:e.z,lungeTime:.2,lunges:1,spearDirection:{x:1,y:0,z:0}});tickCombat(c,p,p,dt);assert.equal(e.dead,true);assert.ok(world.some(w=>w.id===deck.id));
});
test('a thrown spear shatters a glass panel and continues into the enemy behind it',()=>{
 const c=newCombat(),glass=world.find(w=>w.id==='glass-panel-0'),e={id:'glass-target',x:-5,y:1,z:7,cooldown:100,charge:0};c.sentries=[e];
 const p={...newPlayer(),x:-16,y:.65,z:7,inventory:['spear'],equipped:'spear',collectedPickups:['plaza-spear']};
 // Use the public throw action to exercise inventory, scenery and combat together.
 dropItem(p,{x:1,y:0,z:0});
 for(let i=0;i<90&&!e.dead;i++){p.time+=dt;tickCombat(c,p,p,dt);}
 assert.equal(glass.destroyed,true);assert.equal(e.dead,true);newCombat();
});

test('wall grinding follows a convex corner without dropping speed',()=>{
 const wall={id:'grind-corner',x:-65,y:3,z:10,w:4,h:6,d:4};world.push(wall);
 try{const p={...newPlayer(),x:-62.67,y:3,z:10,vz:20};for(let i=0;i<40;i++)step(p,{...idle,grind:true},dt);assert.ok(p.x< -64);assert.ok(p.z>=12);assert.equal(p.grinding,true);assert.ok(Math.hypot(p.vx,p.vz)>19.9);}finally{world.pop();}
});
test('cargo routes clear static buildings throughout a full circuit',()=>{
 for(const route of cargoRoutes)for(let i=0;i<360;i++){
  const c=cargoAt(route.id,i/360*Math.PI*2/route.rate);
  const hit=world.find(w=>!w.cargoId&&Math.abs(c.x-w.x)<(c.w+w.w)/2-.01&&Math.abs(c.y-w.y)<(c.h+w.h)/2-.01&&Math.abs(c.z-w.z)<(c.d+w.d)/2-.01);
  assert.equal(hit,undefined,`${route.id} intersected ${hit?.id}`);
 }
});

test('throwing and recalling the spear cannot bypass its airborne lunge limit',()=>{
 const c=newCombat();c.sentries=[];const p={...newPlayer(),x:-60,y:20,z:0,spearUses:0,inventory:['spear','grapple'],equipped:'spear',collectedPickups:['plaza-spear','plaza-grapple']};
 dropItem(p,{x:1,y:0,z:0});assert.equal(p.spearUses,0);assert.equal(recallItems(p),1);tickCombat(c,p,p,1/120);assert.ok(p.inventory.includes('spear'));assert.equal(p.spearUses,0);
});
