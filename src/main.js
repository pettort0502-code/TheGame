import * as THREE from 'three';
import './style.css';
import {MAP_SIZE} from './world.js';
import {motionPose} from './motion.js';
import {world,SPAWN,boostPads,GRAPPLE_RANGE,canGrapple,newPlayer,step} from './physics.js';

document.querySelector('#app').innerHTML=`
<div id="hud"><div class="top"><div><div class="brand">skybound<span>·</span></div><div class="eyebrow">Expanded momentum playground</div></div><div class="stats"><div class="stat">HOOKS<strong id="hooks">0</strong></div><div class="stat">WALL JUMPS<strong id="jumps">0</strong></div><div class="stat">SPEED<strong id="speed">0.0</strong></div></div></div><div class="bottom"><div><div class="label" id="zone">SANDBOX / CENTRAL PLAZA</div><div class="title">Find your flow.</div><div class="hint keyboard"><kbd>W A S D</kbd> move · mouse to look · <kbd>Space</kbd> jump / double jump / wall kick<br>Hold <kbd>Q</kbd> or <kbd>Left click</kbd> to swing · <kbd>Shift / C</kbd> slide · <kbd>Esc</kbd> menu</div><div class="hint" id="progress">Fast feet. Big jumps. Your own route.</div></div><div class="actions"><button id="home">Back to plaza</button><button id="pause">Pause</button><button id="restart">Reset sandbox</button></div></div></div>
<div id="ability"><span class="ability-dot"></span><span id="ability-text">HOOK · 20m reach</span></div><div id="notice" role="status"></div>
<div id="reticle" aria-hidden="true"><span>+</span></div>
<div id="touch"><div class="dpad"><button data-key="KeyW" aria-label="Forward">↑</button><button data-key="KeyA" aria-label="Left">←</button><button data-key="KeyS" aria-label="Back">↓</button><button data-key="KeyD" aria-label="Right">→</button></div><div class="touch-actions"><button id="look-left" aria-label="Turn camera left">↶</button><button id="look-right" aria-label="Turn camera right">↷</button><button id="slide" data-key="KeyC">Slide</button><button id="hook" data-key="KeyQ">Hook</button><button id="jump" data-key="Space">Jump</button></div></div>
<div id="menu"><div class="menu-card"><div class="label">SKYBOUND / FREERUN SANDBOX</div><h1 id="menu-title">Find your flow.</h1><p>First-person movement. Double jumps. Wall kicks.<br>Faster hooks. Slide tunnels. Boost pads. A bigger world.</p><button id="play">Lock mouse &amp; play</button><p id="capture-error" role="status" hidden></p><p class="menu-help keyboard">Click to capture the mouse for unlimited turning. Escape opens this menu.</p><p class="menu-help touch-help">Drag the world to look. Use the buttons to move and jump.</p><div class="menu-actions"><button id="menu-home">Back to plaza</button><button id="menu-reset">Reset sandbox</button></div></div></div>`;
const $=id=>document.getElementById(id);
const scene=new THREE.Scene();scene.background=new THREE.Color('#dcebf0');scene.fog=new THREE.Fog('#dcebf0',85,190);
const camera=new THREE.PerspectiveCamera(74,innerWidth/innerHeight,.04,260);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.querySelector('#app').prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight('#e9fbff','#8c8173',2.5));
const sun=new THREE.DirectionalLight('#fff2d5',3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,far:100});sun.shadow.bias=-.001;scene.add(sun);scene.add(sun.target);
const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.85});
const materials=new Map();function material(color){if(!materials.has(color))materials.set(color,mat(color));return materials.get(color);}
// Render the same solid boxes used by movement and camera collisions.
const surfaces=world.map(w=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w.w,w.h,w.d),material(w.color));mesh.position.set(w.x,w.y,w.z);mesh.castShadow=w.id!=='ground';mesh.receiveShadow=true;mesh.userData.surface=w;scene.add(mesh);return mesh;});
// Painted ground lines give distance and direction cues without adding obstacles.
const grid=new THREE.GridHelper(MAP_SIZE,60,'#8ca886','#93af8e');grid.position.y=.006;grid.material.transparent=true;grid.material.opacity=.35;scene.add(grid);
function groundLabel(text,x,z,color='#536c62'){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=192;const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.font='bold 65px sans-serif';ctx.textAlign='center';ctx.fillText(text,512,120);
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(12,2.25),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.015,z);scene.add(mesh);
}
groundLabel('BLOCK GARDEN',-17,2);groundLabel('WALL-JUMP YARD',17,5);groundLabel('FREERUN GANTRY',0,-6);groundLabel('PILLAR FIELD',0,16);groundLabel('ROOFTOPS',26,-28);groundLabel('SLIDE PARK',16,29);groundLabel('SWING FOREST',-43,15);groundLabel('OUTER ROOFTOPS',46,-14);groundLabel('HIGHLINE',0,-53);
// Luminous launch pads with directional chevrons; physics uses the same footprints.
const padMeshes=boostPads.map(p=>{
 const group=new THREE.Group();group.position.set(p.x,p.y+.025,p.z);
 const base=new THREE.Mesh(new THREE.BoxGeometry(p.w,.035,p.d),new THREE.MeshStandardMaterial({color:'#37ced1',emissive:'#1bb7bf',emissiveIntensity:.7}));group.add(base);
 const arrows=new THREE.Group();arrows.rotation.y=Math.atan2(-p.dx,-p.dz);
 for(const z of [-.65,0,.65])for(const side of [-1,1]){const stripe=new THREE.Mesh(new THREE.BoxGeometry(.09,.045,.65),new THREE.MeshBasicMaterial({color:'#fff3ab'}));stripe.rotation.y=side*.65;stripe.position.set(side*.2,.04,z);arrows.add(stripe);}
 group.add(arrows);scene.add(group);return group;
});
const targetHalo=new THREE.Mesh(new THREE.RingGeometry(.13,.19,32),new THREE.MeshBasicMaterial({color:'#75ffff',side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false}));targetHalo.renderOrder=3;scene.add(targetHalo);
const spawnRing=new THREE.Mesh(new THREE.TorusGeometry(2,.025,6,64),new THREE.MeshBasicMaterial({color:'#bb9464'}));spawnRing.rotation.x=Math.PI/2;spawnRing.position.set(SPAWN.x,.135,SPAWN.z);scene.add(spawnRing);
// Luminous paint marks climbable towers; the solid faces are climbable.
for(const w of world.filter(w=>w.color==='#4b9ca6')){
 for(let y=.7;y<w.h;y+=1.2){const stripe=new THREE.Mesh(new THREE.BoxGeometry(w.w+.015,.035,w.d+.015),new THREE.MeshBasicMaterial({color:'#9ad9d6'}));stripe.position.set(w.x,y,w.z);scene.add(stripe);}
}
const avatar=new THREE.Group(),body=new THREE.Group();avatar.add(body);const dark=material('#35566a');
function part(w,h,d,m,x,y,z){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;body.add(mesh);return mesh;}
part(.62,.65,.42,material('#d97552'),0,-.05,0);part(.42,.4,.4,material('#efcfaa'),0,.48,0);part(.5,.12,.45,dark,0,.72,0);part(.35,.4,.2,material('#4b9ca6'),0,0,.3);const arms=[part(.18,.5,.22,material('#d97552'),-.43,-.08,0),part(.18,.5,.22,material('#d97552'),.43,-.08,0)];
const legs=[part(.22,.35,.24,dark,-.17,-.5,0),part(.22,.35,.24,dark,.17,-.5,0)];avatar.visible=false;scene.add(avatar);
// First-person hands animate independently, keeping the view stable during flips.
const hands=[-1,1].map(side=>{
 const hand=new THREE.Group();
 const sleeve=new THREE.Mesh(new THREE.BoxGeometry(.12,.30,.13),material('#d97552'));hand.add(sleeve);
 const palm=new THREE.Mesh(new THREE.BoxGeometry(.105,.12,.12),material('#efcfaa'));palm.position.y=.19;hand.add(palm);
 hand.position.set(side*.29,-.44,-.58);hand.scale.setScalar(.8);camera.add(hand);return hand;
});
const gun=new THREE.Group();const barrel=new THREE.Mesh(new THREE.BoxGeometry(.10,.10,.30),material('#35566a'));gun.add(barrel);const muzzle=new THREE.Mesh(new THREE.BoxGeometry(.07,.07,.04),material('#7bd9de'));muzzle.position.z=-.17;gun.add(muzzle);gun.position.set(0,.20,-.10);hands[1].add(gun);
const ropeGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);const rope=new THREE.Line(ropeGeometry,new THREE.LineBasicMaterial({color:'#25b9c9'}));rope.frustumCulled=false;scene.add(rope);
const latch=new THREE.Mesh(new THREE.SphereGeometry(.09,10,8),material('#72dce4'));scene.add(latch);
scene.add(camera);scene.updateMatrixWorld(true);
let player=newPlayer(),keys=new Set(),paused=true,jumpQueued=false,shotTarget=null,noticeTimeout,accumulator=0;
let yaw=0,pitch=0,turn=0,touchLook=null,lookActive=false;
let lockPending=false,visualTime=0,flipAt=-100,hookAt=-100,seenFlips=0,seenHooks=0;
const aimRay=new THREE.Raycaster();
const coarse=matchMedia('(pointer:coarse)').matches;
function notice(text){$('notice').textContent=text;$('notice').style.opacity=1;clearTimeout(noticeTimeout);noticeTimeout=setTimeout(()=>$('notice').style.opacity=0,2200);}
function aimPoint(){aimRay.setFromCamera(new THREE.Vector2(0,0),camera);const hit=aimRay.intersectObjects(surfaces,false)[0];if(!hit)return null;const p=hit.point.clone().addScaledVector(hit.face.normal,.04);return {x:p.x,y:p.y,z:p.z,surfaceId:hit.object.userData.surface.id,nx:hit.face.normal.x,ny:hit.face.normal.y,nz:hit.face.normal.z};}
function shoot(){updateCamera(0);shotTarget=aimPoint();if(!canGrapple(player,shotTarget))notice('Aim at a clear surface within 20 metres.');}
function clearInput(){keys.clear();jumpQueued=false;shotTarget=null;player.grapple=null;player.grappleHeld=false;turn=0;touchLook=null;}
function returnHome(){Object.assign(player,SPAWN,{vx:0,vy:0,vz:0,grounded:false,jumpBuffer:0,coyoteTime:0,controlLock:0,wallCooldown:0,wallNormal:null,grapple:null,grappleHeld:false,ropeLength:0,airJump:true,crouched:false,slideTime:0,slideCooldown:0,slideHeld:false,boostTime:0,padId:null,reelSpeed:0});clearInput();yaw=0;pitch=0;camera.position.set(SPAWN.x,SPAWN.y+.43,SPAWN.z);flipAt=hookAt=-100;effects.forEach(e=>{e.life=0;e.mesh.visible=false;});}
function reset(){player=newPlayer();accumulator=0;returnHome();$('hooks').textContent='0';$('jumps').textContent='0';$('speed').textContent='0.0';seenFlips=0;seenHooks=0;flipAt=hookAt=-100;effects.forEach(e=>{e.life=0;e.mesh.visible=false;});}
function setPaused(value){
 paused=value;clearInput();$('menu').hidden=!value;$('pause').textContent=value?'Resume':'Pause';$('menu-title').textContent=value?'Ready for another run?':'Find your flow.';
 if(value){lookActive=false;if(document.pointerLockElement)document.exitPointerLock();}
}
function captureFailed(){
 lockPending=false;setPaused(true);
 $('capture-error').hidden=false;
 $('capture-error').textContent='Mouse capture was blocked. Open the downloaded HTML in Chrome or Edge, then click Lock mouse & play and allow mouse capture.';
}
function captureReady(){
 if(document.pointerLockElement!==renderer.domElement)return;
 if(lockPending){lockPending=false;setPaused(false);}
 lookActive=true;
}
async function play(){
 $('capture-error').hidden=true;
 if(coarse){setPaused(false);lookActive=true;return;}
 lockPending=true;
 if(!renderer.domElement.requestPointerLock){captureFailed();return;}
 try{await renderer.domElement.requestPointerLock();captureReady();}
 catch{captureFailed();}
}
$('play').onclick=play;$('pause').onclick=()=>paused?play():setPaused(true);
$('home').onclick=()=>{returnHome();notice('Back at the plaza. Your counters are kept.');};$('restart').onclick=reset;
$('menu-home').onclick=()=>{returnHome();play();};$('menu-reset').onclick=()=>{reset();play();};
addEventListener('keydown',e=>{
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyQ','KeyC','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();
 if(e.code==='Escape'&&!e.repeat){if(!paused)setPaused(true);return;}
 if(paused)return;
 if(e.code==='KeyR'&&!e.repeat)reset();
 if(e.code==='Space'&&!keys.has('Space')&&!e.repeat)jumpQueued=true;
 if(e.code==='KeyQ'&&!keys.has('KeyQ')&&!e.repeat)shoot();
 keys.add(e.code);
});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{if(!paused)setPaused(true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!paused)setPaused(true);});
document.addEventListener('pointerlockchange',()=>{
 document.body.classList.toggle('mouse-captured',document.pointerLockElement===renderer.domElement);
 if(document.pointerLockElement===renderer.domElement){captureReady();}
 else if(lookActive&&!coarse&&!paused)setPaused(true);
});
document.addEventListener('pointerlockerror',captureFailed);
document.addEventListener('mousemove',e=>{if(!paused&&document.pointerLockElement===renderer.domElement)mouseLook(e.movementX,e.movementY);});
document.querySelectorAll('[data-key]').forEach(button=>{
 button.onpointerdown=e=>{e.preventDefault();if(paused)return;button.setPointerCapture(e.pointerId);keys.add(button.dataset.key);if(button.dataset.key==='Space')jumpQueued=true;if(button.dataset.key==='KeyQ')shoot();};
 button.onpointerup=button.onpointercancel=button.onlostpointercapture=()=>keys.delete(button.dataset.key);
});
for(const [id,delta] of [['look-left',-1],['look-right',1]]){const button=$(id);button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);turn=delta;};button.onpointerup=button.onpointercancel=button.onlostpointercapture=()=>turn=0;}
function mouseLook(dx,dy){yaw-=dx*.0027;pitch=THREE.MathUtils.clamp(pitch+dy*.0023,-1.4,1.4);}
renderer.domElement.oncontextmenu=e=>e.preventDefault();
renderer.domElement.onpointerdown=e=>{
 if(paused)return;
 if(e.pointerType==='touch'){renderer.domElement.setPointerCapture(e.pointerId);touchLook={id:e.pointerId,x:e.clientX,y:e.clientY};return;}
 if(e.button===0){shoot();keys.add('Mouse0');}
};
renderer.domElement.onpointermove=e=>{
 if(paused)return;
 if(e.pointerType==='touch'){
  if(touchLook?.id===e.pointerId){mouseLook((e.clientX-touchLook.x)*2,(e.clientY-touchLook.y)*2);touchLook.x=e.clientX;touchLook.y=e.clientY;}
 }
};
renderer.domElement.onpointerup=renderer.domElement.onpointercancel=renderer.domElement.onlostpointercapture=e=>{if(touchLook?.id===e.pointerId)touchLook=null;if(e.pointerType!=='touch'&&(e.button===0||e.type!=='pointerup'))keys.delete('Mouse0');};
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function direction(){const x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),z=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));return {x:x*Math.cos(yaw)+z*Math.sin(yaw),z:z*Math.cos(yaw)-x*Math.sin(yaw)};}
function updateCamera(dt){
 if(!paused)yaw+=turn*dt*1.6;
 const speed=Math.hypot(player.vx,player.vz);
 // Eye position is rigidly attached to the player, without chase-camera lag.
 camera.position.set(player.x,player.y+(player.crouched?.20:.43),player.z);
 camera.rotation.order='YXZ';camera.rotation.set(-pitch,yaw,0);
 camera.fov=THREE.MathUtils.lerp(camera.fov,74+Math.min(speed/20,1)*5,1-Math.exp(-dt*5));camera.updateProjectionMatrix();camera.updateMatrixWorld();
}
// Small reusable effects pool: no geometry or material allocation during play.
const effects=Array.from({length:24},(_,i)=>{
 const ring=i<4;
 const mesh=new THREE.Mesh(ring?new THREE.TorusGeometry(.55,.045,6,32):new THREE.BoxGeometry(.45,.6,.45),new THREE.MeshBasicMaterial({color:ring?'#ffcf80':'#80e2e8',transparent:true,opacity:0,depthWrite:false}));
 mesh.visible=false;scene.add(mesh);return {mesh,life:0,max:0,ring};
});
function burst(ring){const effect=effects.find(e=>e.ring===ring&&e.life<=0);if(!effect)return;effect.max=effect.life=ring?.45:.24;effect.mesh.position.set(player.x,player.y-(ring?.45:0),player.z);effect.mesh.rotation.set(ring?-Math.PI/2:0,ring?0:avatar.rotation.y,0);effect.mesh.scale.setScalar(1);effect.mesh.visible=true;}
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);
 if(!paused){accumulator+=dt;while(accumulator>=1/120){step(player,{...direction(),jump:jumpQueued,grapple:keys.has('Mouse0')||keys.has('KeyQ'),target:shotTarget,slide:keys.has('KeyC')||keys.has('ShiftLeft')||keys.has('ShiftRight')},1/120);jumpQueued=false;accumulator-=1/120;}}
 avatar.position.set(player.x,player.y,player.z);if(Math.hypot(player.vx,player.vz)>.1){const heading=Math.atan2(-player.vx,-player.vz),delta=Math.atan2(Math.sin(heading-avatar.rotation.y),Math.cos(heading-avatar.rotation.y));avatar.rotation.y+=delta*(1-Math.exp(-dt*22));}
 legs.forEach((leg,i)=>leg.rotation.x=!paused&&player.grounded&&Math.hypot(player.vx,player.vz)>.1?Math.sin(clock.elapsedTime*20+i*Math.PI)*.65:0);
 if(!paused){
  visualTime+=dt;
  if(player.doubleJumps!==seenFlips){seenFlips=player.doubleJumps;flipAt=visualTime;burst(true);}
  if(player.hooks!==seenHooks){seenHooks=player.hooks;hookAt=visualTime;}
  effects.forEach(e=>{if(e.life<=0)return;e.life=Math.max(0,e.life-dt);const p=1-e.life/e.max;e.mesh.material.opacity=(1-p)*(e.ring?.8:.5);e.mesh.scale.setScalar(e.ring?1+p*3:1-p*.5);e.mesh.visible=e.life>0;});
 }
 const pose=motionPose(visualTime-flipAt);
 body.rotation.x=pose.flip;
 legs.forEach((leg,i)=>{leg.rotation.x+=pose.tuck*1.4;leg.position.y=-.5+pose.tuck*.18;arms[i].rotation.x=-pose.tuck*1.8;});
 hands.forEach((hand,i)=>{
  const side=i===0?-1:1;
  const recoil=i===1?Math.max(0,1-(visualTime-hookAt)/.18):0;
  hand.position.set(side*(.29-pose.tuck*.05),-.44+pose.tuck*.06,-.58-pose.tuck*.04+recoil*.045);
  hand.rotation.set(-.35-pose.tuck*1.5,0,-side*(.15+pose.tuck*.55));
 });
 updateCamera(dt);
 const target=aimPoint(),ready=canGrapple(player,target);
 $('ability-text').textContent=player.slideTime>0?'SLIDING · jump to launch':player.boostTime>0&&!player.grapple?'SPEED BOOST · slide to keep your flow':player.grapple?`SWINGING + REELING · ${player.ropeLength.toFixed(1)}m rope · release to fly`:ready?'HOOK READY · hold click / Q · 20m':target?'OUT OF REACH OR BLOCKED · 20m':'Aim at a surface · 20m reach';
 $('ability').classList.toggle('ready',ready||Boolean(player.grapple));
 $('reticle').classList.toggle('in-range',ready);$('reticle').classList.toggle('latched',Boolean(player.grapple));
 targetHalo.visible=ready&&!player.grapple;
 if(targetHalo.visible){targetHalo.position.set(target.x,target.y,target.z);targetHalo.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(target.nx,target.ny,target.nz));targetHalo.scale.setScalar(1+Math.sin(visualTime*5)*.12);}
 document.body.classList.toggle('sliding',player.slideTime>0);
$('reticle').style.color=ready||player.grapple?'#1ab2bd':'#ffffffaa';
 rope.visible=latch.visible=Boolean(player.grapple);
 if(player.grapple){const origin=camera.localToWorld(new THREE.Vector3(.23,-.27,-.56)),a=player.grapple,points=ropeGeometry.attributes.position;points.setXYZ(0,origin.x,origin.y,origin.z);points.setXYZ(1,a.x,a.y,a.z);points.needsUpdate=true;latch.position.set(a.x,a.y,a.z);}
 const nearby=world.filter(w=>w.id!=='ground'&&Math.abs(player.x-w.x)<w.w/2+4&&Math.abs(player.z-w.z)<w.d/2+4).sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z))[0];
 $('zone').textContent=`SANDBOX / ${(nearby?.zone||'Open meadow').toUpperCase()}`;
 $('hooks').textContent=player.hooks;$('jumps').textContent=player.wallJumps;$('speed').textContent=Math.hypot(player.vx,player.vz).toFixed(1);
 $('progress').textContent=player.crouched?'Stay low through the slide tunnels. Release Shift/C to stand when clear.':player.wallNormal&&!player.grounded?'Press Space to kick off the wall and refresh your double jump.':!player.grounded&&player.airJump?'One more jump available. Catch a high surface to swing.':'Cyan arrows boost speed. Shift/C slides. Head outward to find new districts.';
 sun.position.set(player.x-15,player.y+30,player.z+12);sun.target.position.set(player.x,player.y,player.z);renderer.render(scene,camera);
}
reset();animate();
