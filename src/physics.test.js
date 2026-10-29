import test from 'node:test';
import assert from 'node:assert/strict';
import {world,SPAWN,newPlayer,step,wallContact,canGrapple,constrainRope,GRAPPLE_RANGE,REEL_SPEED,halfHeight,canStand,boostPads,itemPickups,cycleItem,dropItem,hasEquipped,SPEAR_SPEED} from './physics.js';
const dt=1/120,idle={x:0,z:0};
function settled(){return {...newPlayer(),grounded:true};}
test('sandbox remains open in all directions without a finish trigger',()=>{
 assert.ok(world.find(w=>w.id==='ground').w>=80);
 for(const predicate of [w=>w.x< -10,w=>w.x>10,w=>w.z< -10,w=>w.z>10])assert.ok(world.some(predicate));
 assert.equal(world.some(w=>w.goal||w.checkpoint),false);
});
test('player settles and jumps diagonally with smooth acceleration',()=>{
 const p=newPlayer();for(let i=0;i<120;i++)step(p,idle,dt);
 assert.equal(p.grounded,true);assert.equal(p.y,SPAWN.y);
 step(p,{x:1,z:-1,jump:true},dt);assert.ok(p.vx>0&&p.vz<0&&p.vy>0);assert.ok(Math.hypot(p.vx,p.vz)<9);assert.ok(Math.abs(p.vx+p.vz)<1e-10);
});
test('base speed is 9m/s, with no diagonal or sprint boost',()=>{
 const a={...settled(),x:-30,z:20,y:.65},b={...settled(),x:-30,z:20,y:.65};
 for(let i=0;i<80;i++){step(a,{x:1,z:-1,sprint:true},dt);step(b,{x:1,z:-1},dt);}
 assert.equal(a.x,b.x);assert.equal(a.z,b.z);assert.ok(Math.hypot(a.vx,a.vz)>8.9);assert.ok(Math.hypot(a.vx,a.vz)<=9);
});
test('ground braking stops promptly and air movement preserves useful momentum',()=>{
 const p=settled();p.vx=9;step(p,idle,dt);assert.ok(p.vx<9&&p.vx>0);for(let i=0;i<40;i++)step(p,idle,dt);assert.ok(p.vx<.01);
 const q={...newPlayer(),x:-30,y:5,z:20,vx:9};step(q,idle,dt);assert.ok(q.vx>8.8);
});
test('jump buffer and ledge grace still work',()=>{
 const p={...newPlayer(),y:.82,vy:-2,airJump:false};step(p,{...idle,jump:true},dt);for(let i=0;i<8;i++)step(p,idle,dt);assert.ok(p.vy>0);
 const q={...settled(),x:4.81,vx:9};step(q,{x:1,z:0},dt);assert.equal(q.grounded,false);step(q,{x:1,z:0,jump:true},dt);assert.ok(q.vy>12);
});
test('one double jump is available in the air, and landing resets it',()=>{
 const p=settled();step(p,{...idle,jump:true},dt);for(let i=0;i<16;i++)step(p,idle,dt);
 step(p,{...idle,jump:true},dt);assert.equal(p.doubleJumps,1);assert.equal(p.airJump,false);assert.ok(p.vy>11);
 step(p,idle,dt);const vy=p.vy;step(p,{...idle,jump:true},dt);assert.equal(p.doubleJumps,1);assert.ok(p.vy<vy);
 for(let i=0;i<240;i++)step(p,idle,dt);assert.equal(p.grounded,true);assert.equal(p.airJump,true);
});
test('wall kicks launch upward and away, refresh double jump, and prevent instant repeats',()=>{
 const p={...newPlayer(),x:12.69,y:4,z:-7,vx:-9,vy:-8,airJump:false};for(let i=0;i<20;i++)step(p,{x:-1,z:0},dt);
 assert.ok(p.x>=12.67-1e-6);assert.ok(p.vy>=-3);assert.ok(wallContact(p));
 step(p,{x:-1,z:0,jump:true},dt);assert.equal(p.wallJumps,1);assert.ok(p.vy>12);assert.ok(p.vx>9);assert.equal(p.airJump,true);
 const vy=p.vy;step(p,{x:-1,z:0,jump:true},dt);assert.equal(p.wallJumps,1);assert.ok(p.vy<vy);
});
test('gantry has a solid underside and a landable top',()=>{
 const p={...newPlayer(),x:0,y:6.2,z:-15,vy:10};for(let i=0;i<8;i++)step(p,idle,dt);assert.ok(p.y<=6.35+.001);assert.ok(p.vy<=0);
 const q={...newPlayer(),x:0,y:10,z:-15};for(let i=0;i<180;i++)step(q,idle,dt);assert.equal(q.grounded,true);assert.ok(Math.abs(q.y-8.25)<.001);
});
test('both wall-jump towers remain climbable',()=>{
 for(const [cx,z,h] of [[14,-7,8],[-11,-25,10]]){
  const p={...newPlayer(),x:cx,y:.65,z,grounded:true};let dir=-1;
  for(let t=0;t<1600;t++){
   if(p.wallNormal&&p.wallCooldown===0)dir=p.wallNormal.x;
   const jump=t===0||Boolean(p.wallNormal&&p.wallCooldown===0);
   step(p,{x:p.y>h+.8?Math.sign(cx-2-p.x):dir,z:0,jump},dt);if(p.grounded&&p.y>h)break;
  }
  assert.ok(p.grounded&&p.y>h,`tower ${cx} not climbed: ${p.y}`);assert.ok(p.wallJumps>=2);
 }
});
test('falling returns home and clears the rope',()=>{
 const p={...newPlayer(),x:60,y:-20,vx:20,grapple:{x:0,y:0,z:0},airJump:false};step(p,idle,dt);
 assert.equal(p.x,SPAWN.x);assert.equal(p.y,SPAWN.y);assert.equal(p.grapple,null);assert.equal(p.vx,0);assert.equal(p.airJump,true);
});
test('airborne momentum stays unchanged without input, including boosted speed',()=>{
 for(const velocity of [[9,0],[12,-16]]){
  const p={...newPlayer(),x:-30,y:100,z:20,vx:velocity[0],vz:velocity[1]};
  for(let i=0;i<120;i++)step(p,idle,dt);
  assert.equal(p.vx,velocity[0]);assert.equal(p.vz,velocity[1]);
 }
});
test('air steering and double jumps preserve boosted horizontal speed',()=>{
 const p={...newPlayer(),x:-30,y:100,z:20,vx:20};
 for(let i=0;i<80;i++)step(p,{x:0,z:-1,jump:i===20},dt);
 assert.ok(Math.abs(Math.hypot(p.vx,p.vz)-20)<1e-8);assert.ok(p.vz< -19);assert.equal(p.doubleJumps,1);
});
const anchor={x:0,y:6.96,z:-15,surfaceId:'gantry-beam'};
function swinger(){return {...newPlayer(),inventory:['grapple'],equipped:'grapple',x:0,y:4,z:-11,vx:5,grounded:false};}
test('hook reaches any valid surface within 20m and rejects blocked/sky shots',()=>{
 assert.equal(GRAPPLE_RANGE,20);const p={...newPlayer(),x:35,y:2,z:0};
 assert.ok(canGrapple(p,{x:35,y:.04,z:-19,surfaceId:'ground'}));assert.equal(canGrapple(p,{x:35,y:.04,z:-21,surfaceId:'ground'}),false);
 assert.equal(canGrapple(p,null),false);assert.equal(canGrapple(p,{x:35,y:10,z:0,surfaceId:'ground'}),false);
 assert.equal(canGrapple({...newPlayer(),x:10,y:3,z:-7},{x:12.39,y:3,z:-7,surfaceId:'east-left'}),false);
});
test('winch shortens the rope gradually while retaining sideways momentum',()=>{
 const p=swinger(),length=Math.hypot(p.x-anchor.x,p.y-anchor.y,p.z-anchor.z);
 step(p,{...idle,grapple:true,target:anchor},dt);
 assert.ok(p.grapple);assert.ok(Math.abs(p.ropeLength-(length-REEL_SPEED*dt))<1e-8);assert.ok(Math.hypot(p.vx,p.vy,p.vz)>=5);assert.equal(p.hooks,1);
 let maximumSideways=p.x;for(let i=0;i<60;i++){step(p,{...idle,grapple:true,target:anchor},dt);maximumSideways=Math.max(maximumSideways,p.x);}
 assert.ok(p.grapple);assert.ok(Math.abs(p.ropeLength-Math.max(1.5,length-REEL_SPEED*dt*61))<1e-8);assert.ok(maximumSideways>1);
 assert.ok(Math.hypot(p.x-anchor.x,p.y-anchor.y,p.z-anchor.z)<=p.ropeLength+.001);
});
test('rope redirects speed tangentially without straight-line pulling or pushing',()=>{
 const p={x:6,y:0,z:0,vx:4,vy:3,vz:0,ropeLength:5,grapple:{x:0,y:0,z:0}};
 constrainRope(p);assert.equal(p.x,5);assert.equal(p.vx,0);assert.ok(Math.abs(p.vy-5)<1e-9);
 const slack={x:2,y:0,z:0,vx:1,vy:0,vz:0,ropeLength:5,grapple:{x:0,y:0,z:0}};
 constrainRope(slack);assert.equal(slack.x,2);assert.equal(slack.vx,1);
});
test('gravity and active pumping build swing speed',()=>{
 const passive=swinger(),pumped=swinger();
 for(let i=0;i<50;i++){step(passive,{...idle,grapple:true,target:anchor},dt);step(pumped,{x:1,z:0,grapple:true,target:anchor},dt);}
 assert.ok(passive.grapple&&pumped.grapple);
 assert.ok(Math.hypot(passive.vx,passive.vy,passive.vz)>5);
 assert.ok(Math.hypot(pumped.vx,pumped.vy,pumped.vz)>Math.hypot(passive.vx,passive.vy,passive.vz));
});
test('release preserves horizontal swing velocity and allows a fresh attachment',()=>{
 const p=swinger();for(let i=0;i<30;i++)step(p,{...idle,grapple:true,target:anchor},dt);
 const vx=p.vx,vz=p.vz;step(p,idle,dt);assert.equal(p.grapple,null);assert.equal(p.vx,vx);assert.equal(p.vz,vz);
 step(p,{...idle,grapple:true,target:anchor},dt);assert.equal(p.hooks,2);
});
test('winch movement contributes inward launch velocity without removing lateral speed',()=>{
 const p={x:6,y:0,z:0,vx:0,vy:5,vz:0,ropeLength:5,reelSpeed:REEL_SPEED,grapple:{x:0,y:0,z:0}};
 constrainRope(p);assert.equal(p.vx,-REEL_SPEED);assert.equal(p.vy,5);
});
test('expanded map includes new districts, slide tunnels, and multiple launch pads',()=>{
 assert.ok(Math.abs(world.find(w=>w.id==='ground').w**2-180**2*3)<1e-8);assert.ok(world.some(w=>w.x>50));assert.ok(world.some(w=>w.z>50));assert.ok(world.some(w=>w.z< -65));assert.ok(boostPads.length>=8);assert.ok(REEL_SPEED>=7);
});
test('slide lowers the collider without moving the feet and preserves ground momentum',()=>{
 const p={...settled(),x:-60,y:.65,z:0,vx:9};const feet=p.y-halfHeight(p);
 step(p,{x:1,z:0,slide:true},dt);assert.equal(p.slides,1);assert.ok(p.crouched&&p.slideTime>0);assert.ok(Math.abs(p.y-halfHeight(p)-feet)<1e-8);assert.ok(p.vx>11);
 for(let i=0;i<30;i++)step(p,{x:1,z:0,slide:true},dt);assert.ok(p.vx>10);assert.equal(p.slides,1);
});
test('slide cooldown prevents repeated speed boosts',()=>{
 const p={...settled(),x:-60,y:.65,z:0,vx:9};step(p,{...idle,slide:true},dt);step(p,idle,dt);step(p,{...idle,slide:true},dt);assert.equal(p.slides,1);
});
test('slide passes under a low tunnel and stays crouched until standing is safe',()=>{
 const p={...settled(),x:15,y:.65,z:21,vz:-9};
 for(let i=0;i<75;i++)step(p,{x:0,z:-1,slide:true},dt);
 assert.ok(p.z<19&&p.z>11);assert.ok(p.crouched);assert.equal(canStand(p),false);
 p.slideTime=0;step(p,idle,dt);assert.ok(p.crouched);assert.ok(p.y+halfHeight(p)<.95);
 p.z=8;step(p,idle,dt);assert.equal(p.crouched,false);assert.ok(Math.abs(p.y-.65)<1e-8);
});
test('slide jump carries horizontal momentum into the air',()=>{
 const p={...settled(),x:-60,y:.65,z:0,vx:20};step(p,{x:1,z:0,slide:true},dt);const speed=p.vx;
 step(p,{x:1,z:0,slide:true,jump:true},dt);assert.ok(p.vy>12);assert.equal(p.grounded,false);assert.ok(p.vx>speed*.98);
 const vx=p.vx;step(p,idle,dt);assert.equal(p.vx,vx);
});
test('boost pads launch in the marked direction once per crossing and retain speed in the air',()=>{
 const pad=boostPads.find(p=>p.id==='plaza-launch'),p={...settled(),x:pad.x,y:pad.y+.65,z:pad.z};
 step(p,idle,dt);assert.equal(p.boosts,1);assert.equal(p.vz,-24);assert.ok(p.boostTime>0);
 for(let i=0;i<5;i++)step(p,idle,dt);assert.equal(p.boosts,1);assert.ok(Math.hypot(p.vx,p.vz)>23);
 step(p,{...idle,jump:true},dt);const vz=p.vz;step(p,idle,dt);assert.equal(p.vz,vz);
 const airborne={...newPlayer(),x:pad.x,y:5,z:pad.z};step(airborne,idle,dt);assert.equal(airborne.boosts,0);
});
test('start empty-handed and cannot use the grapple or spear before collecting them',()=>{
 const p=newPlayer();assert.deepEqual(p.inventory,[]);assert.equal(p.equipped,null);
 step(p,{...idle,use:true,target:{x:0,y:1,z:-7.46,surfaceId:'gantry-step'},facingZ:-1},dt);
 assert.equal(p.grapple,null);assert.equal(p.lunges,0);assert.equal(p.hooks,0);
});
test('walking into pickups adds each item once and equips the first',()=>{
 const p=newPlayer();for(const item of itemPickups){p.x=item.x;p.y=item.y;p.z=item.z;step(p,idle,dt);step(p,idle,dt);}
 assert.deepEqual(p.inventory,['grapple','spear']);assert.equal(p.equipped,'grapple');assert.equal(p.collectedPickups.length,2);
});
test('switching cycles collected items, releases rope, and requires releasing a held use button',()=>{
 const p={...swinger(),inventory:['grapple','spear'],useHeld:true,grapple:anchor};
 assert.equal(cycleItem(p),'spear');assert.equal(p.grapple,null);assert.equal(p.requireRelease,true);
 step(p,{...idle,use:true,facingZ:-1},dt);assert.equal(p.lunges,0);
 step(p,idle,dt);step(p,{...idle,use:true,facingZ:-1},dt);assert.equal(p.lunges,1);
 assert.equal(cycleItem(p),'grapple');assert.equal(hasEquipped(p,'grapple'),true);
});
test('only owned and equipped items can be used',()=>{
 const p={...swinger(),equipped:'spear'};step(p,{...idle,use:true,target:anchor},dt);assert.equal(p.lunges,0);assert.equal(p.grapple,null);
 const q={...swinger(),inventory:['grapple','spear'],equipped:'spear'};step(q,{...idle,use:true,target:anchor,facingZ:-1},dt);assert.equal(q.grapple,null);assert.equal(q.lunges,1);
});
test('spear lunges in the aimed direction at high speed, with a cooldown and no hold-to-repeat',()=>{
 const p={...newPlayer(),x:-60,y:4,z:0,inventory:['spear'],equipped:'spear'};
 step(p,{...idle,use:true,facingX:1,facingZ:0},dt);assert.equal(p.lunges,1);assert.equal(p.vx,SPEAR_SPEED);assert.equal(p.vz,0);
 for(let i=0;i<20;i++)step(p,{...idle,use:true,facingX:1,facingZ:0},dt);assert.equal(p.lunges,1);
 step(p,idle,dt);step(p,{...idle,use:true,facingX:1,facingZ:0},dt);assert.equal(p.lunges,1);
});
test('spear lunge cannot tunnel through a thin wall',()=>{
 const p={...newPlayer(),x:14,y:3,z:-7,inventory:['spear'],equipped:'spear'};
 for(let i=0;i<20;i++)step(p,{...idle,use:i===0,facingX:-1,facingZ:0},dt);
 assert.ok(p.x>=12.67-1e-6);assert.equal(p.lunges,1);
});
test('falling preserves collected gear but reset starts a fresh inventory',()=>{
 const p={...newPlayer(),x:100,y:-20,inventory:['grapple','spear'],equipped:'spear',collectedPickups:itemPickups.map(i=>i.id),lungeTime:.2};step(p,idle,dt);
 assert.deepEqual(p.inventory,['grapple','spear']);assert.equal(p.equipped,'spear');assert.equal(p.lungeTime,0);assert.equal(newPlayer().inventory.length,0);
});
test('pressing slide just before landing buffers the slide instead of losing the input',()=>{
 const p={...newPlayer(),x:-60,y:.73,z:0,vx:24,vy:-1};step(p,{x:1,z:0,slide:true},dt);
 for(let i=0;i<25;i++)step(p,{x:1,z:0,slide:true},dt);
 assert.equal(p.slides,1);assert.ok(p.slideTime>0);assert.ok(p.crouched);
});
test('landing events report an impact once on touchdown, with stronger effects for harder falls',()=>{
 const p={...newPlayer(),x:75,y:7,z:5};for(let i=0;i<180;i++)step(p,idle,dt);
 assert.equal(p.landings,1);assert.ok(p.landingImpact>10);assert.equal(p.landingY,.035);
 for(let i=0;i<120;i++)step(p,idle,dt);assert.equal(p.landings,1);
});

test('a spear click captured between simulation ticks still fires exactly once',()=>{
 const p={...newPlayer(),x:-60,y:8,z:0,inventory:['spear'],equipped:'spear'};
 step(p,{...idle,use:false,spearPressed:true,facingX:1,facingZ:0},dt);
 assert.equal(p.lunges,1);assert.equal(p.vx,SPEAR_SPEED);
 for(let i=0;i<200;i++)step(p,idle,dt);
 assert.equal(p.lunges,1);
});
test('spear buffers a near-ready press but does not queue early cooldown clicks or fire after switching',()=>{
 const make=()=>({...newPlayer(),x:-60,y:8,z:0,inventory:['spear','grapple'],equipped:'spear',spearCooldown:.08});
 const p=make();step(p,{...idle,spearPressed:true},dt);
 for(let i=0;i<12;i++)step(p,idle,dt);assert.equal(p.lunges,1);
 const q=make();q.spearCooldown=.5;step(q,{...idle,spearPressed:true},dt);
 for(let i=0;i<70;i++)step(q,idle,dt);assert.equal(q.lunges,0);
 const r=make();step(r,{...idle,spearPressed:true},dt);cycleItem(r);
 for(let i=0;i<20;i++)step(r,idle,dt);assert.equal(r.lunges,0);
});
test('tighter jump keeps similar height with shorter airtime and unchanged horizontal momentum',()=>{
 const p={...newPlayer(),x:-60,z:0,y:.65,grounded:true,vx:9};
 step(p,{x:1,z:0,jump:true},dt);let peak=p.y,elapsed=dt;
 while(!p.grounded&&elapsed<2){step(p,idle,dt);peak=Math.max(peak,p.y);elapsed+=dt;}
 assert.ok(peak-.65>3.2&&peak-.65<3.5);assert.ok(elapsed>.95&&elapsed<1.05);assert.equal(p.vx,9);
});

test('two-slot inventory blocks hammer until an item is thrown and flying gear cannot be recollected',()=>{
 const hammer=itemPickups.find(i=>i.type==='hammer'),p={...newPlayer(),x:hammer.x,y:hammer.y,z:hammer.z,inventory:['grapple','spear'],equipped:'grapple',collectedPickups:['plaza-grapple','plaza-spear']};
 step(p,idle,dt);assert.equal(p.inventory.includes('hammer'),false);
 assert.equal(dropItem(p),'grapple');step(p,idle,dt);assert.deepEqual(p.inventory,['spear','hammer']);assert.equal(p.equipped,'spear');
 const dropped=p.pickupPositions['plaza-grapple'];assert.ok(dropped);assert.equal(p.collectedPickups.includes('plaza-grapple'),false);
 cycleItem(p);assert.equal(p.equipped,'hammer');dropItem(p);p.time+=1.1;step(p,idle,dt);assert.equal(p.inventory.includes('grapple'),false);assert.equal(p.thrownItems.length,2);assert.equal(p.inventory.length,1);
});
test('hammer slams from the air, emits one shockwave and bounces while preserving horizontal speed',()=>{
 const p={...newPlayer(),x:-60,y:6,z:0,vx:12,inventory:['hammer'],equipped:'hammer'};
 step(p,{...idle,spearPressed:true},dt);assert.ok(p.slamming&&p.vy< -30);
 for(let i=0;i<60&&p.shockwaves===0;i++)step(p,idle,dt);
 assert.equal(p.shockwaves,1);assert.ok(p.vy>15);assert.equal(p.vx,12);assert.equal(p.airJump,true);
 step(p,{...idle,spearPressed:true},dt);assert.equal(p.shockwaves,1);assert.equal(p.slamming,false);
 const ground={...newPlayer(),x:-60,y:.65,z:0,grounded:true,inventory:['hammer'],equipped:'hammer'};step(ground,{...idle,spearPressed:true},dt);assert.equal(ground.shockwaves,1);assert.ok(ground.vy>15);
});
