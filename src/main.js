import * as THREE from 'three';
import {gameAudio} from './audio.js';
const audio=gameAudio();
import './style.css';
import {neonBlock,equipmentMaterial,glowMaterial} from './neon-materials.js';
import {assistedTarget} from './aim-assist.js';
import {newCombat,tickCombat} from './enemies.js';
import {enemyVisuals} from './enemy-visuals.js';
import {MAP_SIZE} from './world.js';
import {droneRoutes,droneAt} from './drones.js';
import {movementEffects} from './movement-effects.js';
import {motionPose} from './motion.js';
import {world,SPAWN,boostPads,itemPickups,hasEquipped,cycleItem,dropItem,recallItems,releaseGrapple,SPEAR_COOLDOWN,GRAPPLE_RANGE,canGrapple,newPlayer,step} from './physics.js';

document.querySelector('#app').innerHTML=`
<div id="hud"><div class="top"><div><div class="brand">skybound<span>·</span></div><div class="eyebrow">After-dark momentum playground</div></div><div class="stats"><div class="stat">HOOKS<strong id="hooks">0</strong></div><div class="stat">WALL JUMPS<strong id="jumps">0</strong></div><div class="stat">SPEED<strong id="speed">0.0</strong></div></div></div><div class="bottom"><div><div class="label" id="zone">SANDBOX / CENTRAL PLAZA</div><div class="title">Find your flow.</div><div class="hint keyboard"><kbd>W A S D</kbd> move · mouse to look · <kbd>Space</kbd> jump / double jump / wall kick<br><kbd>Left click / Q</kbd> use · <kbd>Right click / E</kbd> switch · <kbd>G</kbd> throw · <kbd>B</kbd> recall · <kbd>V</kbd> grind · <kbd>Shift / C</kbd> slide · <kbd>Esc</kbd> menu</div><div class="hint" id="progress">Fast feet. Big jumps. Your own route.</div></div><div class="actions"><button id="sound">Sound on · U</button><button id="recall">Recall · B</button><button id="drop">Throw item · G</button><button id="home">Back to plaza</button><button id="pause">Pause</button><button id="restart">Reset sandbox</button></div></div></div>
<div id="drone-markers"></div><div id="landing-flash"></div><div id="damage-flash"></div><div id="hit-marker" hidden>×</div><div id="threat-warning" hidden>INCOMING FIRE</div><div id="health">SHIELD · 3 / 3</div>
<div id="inventory" aria-live="polite"><span id="item-grapple">Grapple · find pickup</span><span id="item-spear">Spear · find pickup</span><span id="item-hammer">Hammer · find pickup</span><span id="slots">0 / 2 slots</span></div>
<div id="ability"><span class="ability-dot"></span><span id="ability-text">HOOK · 20m reach</span></div><div id="notice" role="status"></div>
<div id="reticle" aria-hidden="true"><span>+</span></div>
<div id="touch"><div class="dpad"><button data-key="KeyW" aria-label="Forward">↑</button><button data-key="KeyA" aria-label="Left">←</button><button data-key="KeyS" aria-label="Back">↓</button><button data-key="KeyD" aria-label="Right">→</button></div><div class="touch-actions"><button id="look-left" aria-label="Turn camera left">↶</button><button id="look-right" aria-label="Turn camera right">↷</button><button id="grind" data-key="KeyV">Grind</button><button id="slide" data-key="KeyC">Slide</button><button id="switch-item">Switch</button><button id="hook" data-key="KeyQ">Use</button><button id="jump" data-key="Space">Jump</button></div></div>
<div id="menu"><div class="menu-card"><div class="label">SKYBOUND / FREERUN SANDBOX</div><h1 id="menu-title">Find your flow.</h1><p>First-person movement. Double jumps. Wall kicks.<br>Choose two: grapple, spear, or shockwave hammer beside the plaza.<br>Right-click to switch. Left-click to use your item.<br>Explore outward for new districts and projectile sentries.<br>Spear lunges and hammer shockwaves destroy enemies.<br>G throws your equipped item at enemies. Three shield hits return you to the plaza.</p><button id="play">Lock mouse &amp; play</button><p id="capture-error" role="status" hidden></p><p class="menu-help keyboard">Click to capture the mouse for unlimited turning. Escape opens this menu.</p><p class="menu-help touch-help">Drag the world to look. Use the buttons to move and jump.</p><div class="menu-actions"><button id="menu-home">Back to plaza</button><button id="menu-reset">Reset sandbox</button></div></div></div>`;
const $=id=>document.getElementById(id);
const scene=new THREE.Scene();scene.background=new THREE.Color('#080b1b');scene.fog=new THREE.Fog('#080b1b',110,250);
const skyPositions=[];
for(let i=0;i<180;i++){const angle=i*2.399963,rad=65+(i%9)*9;skyPositions.push(Math.cos(angle)*rad,35+(i%17)*4,Math.sin(angle)*rad);}
const skyGeometry=new THREE.BufferGeometry();skyGeometry.setAttribute('position',new THREE.Float32BufferAttribute(skyPositions,3));scene.add(new THREE.Points(skyGeometry,new THREE.PointsMaterial({color:'#7f91cb',size:.15,transparent:true,opacity:.65,depthWrite:false})));
const camera=new THREE.PerspectiveCamera(74,innerWidth/innerHeight,.04,360);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;document.querySelector('#app').prepend(renderer.domElement);
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
scene.add(new THREE.HemisphereLight('#9bbdff','#282343',1.65));
const sun=new THREE.DirectionalLight('#a9bfff',2.1);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,far:100});sun.shadow.bias=-.001;scene.add(sun);scene.add(sun.target);
const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.85});
const materials=new Map();function material(color){if(!materials.has(color))materials.set(color,equipmentMaterial(color)||mat(color));return materials.get(color);}
// Render the same solid boxes used by movement and camera collisions.
const surfaces=world.map(w=>{const mesh=neonBlock(w);mesh.position.set(w.x,w.y,w.z);mesh.castShadow=w.id!=='ground';mesh.receiveShadow=true;mesh.userData.surface=w;if(w.cargoId){for(const z of [-2.45,2.45]){const stripe=new THREE.Mesh(new THREE.BoxGeometry(8,.12,.06),new THREE.MeshBasicMaterial({color:'#ffcf70'}));stripe.position.set(0,.26,z);mesh.add(stripe);}}scene.add(mesh);return mesh;});
const droneMeshes=droneRoutes.map(route=>{
 const group=new THREE.Group();
 const body=new THREE.Mesh(new THREE.BoxGeometry(1.2,.5,1.2),new THREE.MeshStandardMaterial({color:'#193953',emissive:'#0d536b',emissiveIntensity:.9,metalness:.4,roughness:.45}));body.userData.droneId=route.id;group.add(body);
 const eye=new THREE.Mesh(new THREE.BoxGeometry(.8,.12,.06),new THREE.MeshBasicMaterial({color:'#ff507e'}));eye.position.set(0,0,.62);group.add(eye);
 const rotors=[];for(const x of [-.82,.82])for(const z of [-.82,.82]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.28,.035,5,16),new THREE.MeshBasicMaterial({color:'#da6aff'}));ring.rotation.x=Math.PI/2;ring.position.set(x,.1,z);group.add(ring);rotors.push(ring);}
 const marker=document.createElement('div');marker.className='drone-marker';marker.dataset.drone=route.id;marker.setAttribute('aria-label','Grappleable drone');marker.innerHTML='<span>DRONE</span>';document.getElementById('drone-markers').append(marker);
 scene.add(group);return {route,group,body,rotors,marker};
});
function syncDrones(){for(const d of droneMeshes){const p=droneAt(d.route.id,player.time),enemy=combat.sentries.find(e=>e.id===d.route.id);d.body.material.emissive.setHex(enemy?.hitFlash>0?0xffffff:enemy?.charge>0?0xb93816:0x0d536b);d.rotors.forEach(r=>r.material.color.setHex(enemy?.charge>0?0xffb347:0xda6aff));d.group.visible=!player.deadDrones.includes(d.route.id);d.group.position.set(p.x,p.y,p.z);d.rotors.forEach(r=>r.rotation.z=player.time*12);d.group.updateMatrixWorld(true);}}
// Painted ground lines give distance and direction cues without adding obstacles.
const grid=new THREE.GridHelper(MAP_SIZE,104,'#217b8b','#203649');grid.position.y=.006;grid.material.transparent=true;grid.material.opacity=.55;scene.add(grid);
function groundLabel(text,x,z,color='#4c859c'){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=192;const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.font='bold 65px sans-serif';ctx.textAlign='center';ctx.fillText(text,512,120);
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(12,2.25),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.015,z);scene.add(mesh);
}
for(const [name,x,z] of [['NORTH FOUNDRY',0,-112],['EAST REACTOR',112,0],['SOUTH DOCKS',0,112],['WEST STACKS',-112,0],['NE SPIRES',108,-108],['SW SPIRES',-108,108]])groundLabel(name,x,z-36);
for(const [name,x,z] of [['SKYFORGE',78,102],['NEON ASCENT',-78,-58],['CLOUD GANTRY',0,-110],['REACTOR HIGHRISE',126,46]])groundLabel(name,x,z);
groundLabel('BLOCK GARDEN',-17,2);groundLabel('WALL-JUMP YARD',17,5);groundLabel('FREERUN GANTRY',0,-6);groundLabel('PILLAR FIELD',0,16);groundLabel('ROOFTOPS',26,-28);groundLabel('SLIDE PARK',16,29);groundLabel('SWING FOREST',-43,15);groundLabel('OUTER ROOFTOPS',46,-14);groundLabel('HIGHLINE',0,-53);
// Luminous launch pads with directional chevrons; physics uses the same footprints.
const padMeshes=boostPads.map(p=>{
 const group=new THREE.Group();group.position.set(p.x,p.y+.025,p.z);
 const base=new THREE.Mesh(new THREE.BoxGeometry(p.w,.035,p.d),new THREE.MeshStandardMaterial({color:'#062c37',emissive:'#08bfd1',emissiveIntensity:1.1}));group.add(base);
 const arrows=new THREE.Group();arrows.rotation.y=Math.atan2(-p.dx,-p.dz);
 for(const z of [-.65,0,.65])for(const side of [-1,1]){const stripe=new THREE.Mesh(new THREE.BoxGeometry(.09,.045,.65),new THREE.MeshBasicMaterial({color:'#b1ffff'}));stripe.rotation.y=side*.65;stripe.position.set(side*.2,.04,z);arrows.add(stripe);}
 group.add(arrows);scene.add(group);return group;
});
const targetHalo=new THREE.Mesh(new THREE.RingGeometry(.13,.19,32),new THREE.MeshBasicMaterial({color:'#75ffff',side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false}));targetHalo.renderOrder=3;scene.add(targetHalo);
const spawnRing=new THREE.Mesh(new THREE.TorusGeometry(2,.025,6,64),new THREE.MeshBasicMaterial({color:'#e34dff'}));spawnRing.rotation.x=Math.PI/2;spawnRing.position.set(SPAWN.x,.135,SPAWN.z);scene.add(spawnRing);
// Luminous paint marks climbable towers; the solid faces are climbable.
for(const w of world.filter(w=>w.color==='#4b9ca6')){
 for(let y=.7;y<w.h;y+=1.2){const stripe=new THREE.Mesh(new THREE.BoxGeometry(w.w+.015,.035,w.d+.015),new THREE.MeshBasicMaterial({color:'#29ddeb'}));stripe.position.set(w.x,y,w.z);scene.add(stripe);}
}
const avatar=new THREE.Group(),body=new THREE.Group();avatar.add(body);const dark=material('#35566a');
function part(w,h,d,m,x,y,z){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;body.add(mesh);return mesh;}
part(.62,.65,.42,material('#d97552'),0,-.05,0);part(.42,.4,.4,material('#efcfaa'),0,.48,0);part(.5,.12,.45,dark,0,.72,0);part(.35,.4,.2,material('#4b9ca6'),0,0,.3);const arms=[part(.18,.5,.22,material('#d97552'),-.43,-.08,0),part(.18,.5,.22,material('#d97552'),.43,-.08,0)];
const legs=[part(.22,.35,.24,dark,-.17,-.5,0),part(.22,.35,.24,dark,.17,-.5,0)];avatar.visible=false;scene.add(avatar);
// First-person hands animate independently, keeping the view stable during flips.
const hands=[-1,1].map(side=>{
 const hand=new THREE.Group();
 const sleeve=new THREE.Mesh(new THREE.BoxGeometry(.12,.30,.13),material('#d97552'));hand.add(sleeve);const cuff=new THREE.Mesh(new THREE.BoxGeometry(.125,.018,.135),material('#7bd9de'));cuff.position.y=-.10;hand.add(cuff);
 const palm=new THREE.Mesh(new THREE.BoxGeometry(.105,.12,.12),material('#efcfaa'));palm.position.y=.19;hand.add(palm);
 hand.position.set(side*.29,-.44,-.58);hand.scale.setScalar(.8);camera.add(hand);return hand;
});
function grappleModel(){
 const model=new THREE.Group();
 const barrel=new THREE.Mesh(new THREE.BoxGeometry(.10,.10,.30),material('#35566a'));model.add(barrel);
 const grip=new THREE.Mesh(new THREE.BoxGeometry(.075,.14,.08),material('#d8a16e'));grip.position.set(0,-.08,.07);model.add(grip);
 const muzzle=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.05,10),material('#7bd9de'));muzzle.rotation.x=Math.PI/2;muzzle.position.z=-.17;model.add(muzzle);return {model,muzzle};
}
function spearModel(){
 const model=new THREE.Group();
 const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.017,.017,.95,8),material('#9b7656'));shaft.rotation.x=Math.PI/2;shaft.position.z=-.3;model.add(shaft);
 const tip=new THREE.Mesh(new THREE.ConeGeometry(.065,.25,4),material('#d9e5df'));tip.rotation.x=-Math.PI/2;tip.position.z=-.90;model.add(tip);
 const collar=new THREE.Mesh(new THREE.BoxGeometry(.07,.05,.05),material('#dbaf61'));collar.position.z=-.76;model.add(collar);return model;
}
function hammerModel(){
 const g=new THREE.Group();
 const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.65,8),material('#9b7656'));shaft.position.y=.12;g.add(shaft);
 const head=new THREE.Mesh(new THREE.BoxGeometry(.38,.22,.24),material('#35566a'));head.position.y=.48;g.add(head);
 for(const x of [-.19,.19]){const cap=new THREE.Mesh(new THREE.BoxGeometry(.025,.23,.25),material('#d9e5df'));cap.position.set(x,.48,0);g.add(cap);}return g;
}
const hammer=hammerModel();hammer.position.set(0,.15,-.15);hands[1].add(hammer);
const {model:gun,muzzle}=grappleModel();gun.position.set(0,.20,-.10);hands[1].add(gun);
const spear=spearModel();spear.position.set(0,.18,-.03);spear.rotation.x=.35;hands[1].add(spear);
const pickupMeshes=itemPickups.map(item=>{
 const group=new THREE.Group(),model=item.type==='grapple'?grappleModel().model:item.type==='spear'?spearModel():hammerModel();
 model.scale.setScalar(item.type==='grapple'?2.1:1);model.rotation.x=item.type==='spear'?Math.PI/2:0;group.add(model);group.position.set(item.x,item.y,item.z);scene.add(group);
 const aura=new THREE.Sprite(glowMaterial(item.type==='grapple'?'#1de1ff':'#ff38c7'));aura.position.set(0,0,0);aura.scale.set(1.1,1.1,1);group.add(aura);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.55,.035,6,40),new THREE.MeshBasicMaterial({color:item.type==='grapple'?'#45efff':'#fa63d5'}));ring.rotation.x=-Math.PI/2;ring.position.set(item.x,.145,item.z);scene.add(ring);
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#0c132bee';ctx.fillRect(0,0,512,128);ctx.fillStyle='white';ctx.font='bold 35px sans-serif';ctx.textAlign='center';ctx.fillText(item.label,256,54);ctx.font='26px sans-serif';ctx.fillText('WALK INTO TO COLLECT',256,96);
 const label=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),depthTest:true}));label.scale.set(2.2,.55,1);label.position.set(item.x,item.y+1.1,item.z);scene.add(label);
 return {item,group,ring,label};
});
const ropeGeometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);const rope=new THREE.Line(ropeGeometry,new THREE.LineBasicMaterial({color:'#25b9c9'}));rope.frustumCulled=false;scene.add(rope);
const latch=new THREE.Mesh(new THREE.SphereGeometry(.09,10,8),material('#72dce4'));scene.add(latch);
scene.add(camera);scene.updateMatrixWorld(true);
let combat=newCombat();
const enemies=enemyVisuals(scene,combat);
let seenLandings=0,seenShockwaves=0;
let player=newPlayer(),keys=new Set(),paused=true,jumpQueued=false,shotTarget=null,noticeTimeout,accumulator=0;
let yaw=0,pitch=0,turn=0,touchLook=null,lookActive=false;
let lockPending=false,visualTime=0,flipAt=-100,hookAt=-100,seenFlips=0,seenHooks=0,seenLunges=0,seenSlingshots=0,wasGrinding=false,lungeAt=-100,seenCollected=0;
const aimRay=new THREE.Raycaster();
const coarse=matchMedia('(pointer:coarse)').matches;
function notice(text){$('notice').textContent=text;$('notice').style.opacity=1;clearTimeout(noticeTimeout);noticeTimeout=setTimeout(()=>$('notice').style.opacity=0,2200);}
function directAimPoint(){syncDrones();aimRay.setFromCamera(new THREE.Vector2(0,0),camera);const hit=aimRay.intersectObjects([...surfaces.filter(m=>!m.userData.surface.destroyed),...droneMeshes.filter(d=>!player.deadDrones.includes(d.route.id)).map(d=>d.body),...enemies.targets.filter(m=>!m.userData.dead)],false)[0];if(!hit)return null;const p=hit.point.clone().addScaledVector(hit.face.normal,.04);if(hit.object.userData.enemyId){const e=combat.sentries.find(e=>e.id===hit.object.userData.enemyId);return {x:p.x,y:p.y,z:p.z,enemyId:e.id,offset:{x:p.x-e.x,y:p.y-e.y,z:p.z-e.z},nx:hit.face.normal.x,ny:hit.face.normal.y,nz:hit.face.normal.z};}if(hit.object.userData.surface?.cargoId){const w=hit.object.userData.surface;return {x:p.x,y:p.y,z:p.z,cargoId:w.id,surfaceId:w.id,offset:{x:p.x-w.x,y:p.y-w.y,z:p.z-w.z},nx:hit.face.normal.x,ny:hit.face.normal.y,nz:hit.face.normal.z};}if(hit.object.userData.droneId){const d=droneAt(hit.object.userData.droneId,player.time);return {x:p.x,y:p.y,z:p.z,droneId:d.id,offset:{x:p.x-d.x,y:p.y-d.y,z:p.z-d.z},nx:hit.face.normal.x,ny:hit.face.normal.y,nz:hit.face.normal.z};}return {x:p.x,y:p.y,z:p.z,surfaceId:hit.object.userData.surface.id,nx:hit.face.normal.x,ny:hit.face.normal.y,nz:hit.face.normal.z};}
function aimPoint(){
 const direct=directAimPoint();
 if(!hasEquipped(player,'grapple'))return direct;
 return assistedTarget(player,camera.position,camera.getWorldDirection(new THREE.Vector3()),direct);
}
let spearQueued=false;
function shoot(){
 if((hasEquipped(player,'spear')||hasEquipped(player,'hammer'))&&!player.requireRelease)spearQueued=true;
 updateCamera(0);shotTarget=aimPoint();
 if(!player.equipped){notice('Collect an item: grapple on the left, spear on the right.');return;}
 if(hasEquipped(player,'grapple')&&!canGrapple(player,shotTarget))notice('Aim at a clear surface within 20 metres.');
}
function switchEquipment(){
 if(paused)return;
 if(player.inventory.length<2){notice(player.inventory.length?'Find the other pickup to switch items.':'Walk into the glowing items beside the plaza.');return;}
 spearQueued=false;const name=cycleItem(player);shotTarget=null;notice(name==='grapple'?'Grapple gun equipped':name==='spear'?'Lunge spear equipped':'Shockwave hammer equipped');
}
function releaseItemUse(key){
 keys.delete(key);
 if(!keys.has('Mouse0')&&!keys.has('KeyQ')){player.useHeld=false;player.requireRelease=false;player.grappleHeld=false;releaseGrapple(player);}
}
function clearInput(){player.grappleCharge=0;player.grinding=false;spearQueued=false;player.spearBuffer=0;player.hammerBuffer=0;keys.clear();jumpQueued=false;shotTarget=null;player.grapple=null;player.grappleHeld=false;player.useHeld=false;player.requireRelease=false;turn=0;touchLook=null;}
function returnHome(){combat=newCombat();combat.falls=player.falls;combat.seenShockwaves=player.shockwaves;player.deadDrones=[];player.enemyTargets=combat.sentries;player.riding=null;player.grindTime=0;movementFx.clear();Object.assign(player,SPAWN,{vx:0,vy:0,vz:0,grounded:false,jumpBuffer:0,coyoteTime:0,controlLock:0,wallCooldown:0,wallNormal:null,grapple:null,grappleHeld:false,ropeLength:0,airJump:true,crouched:false,slideTime:0,slideCooldown:0,slideHeld:false,slideBuffer:0,boostTime:0,padId:null,reelSpeed:0,spearCooldown:0,spearBuffer:0,lungeTime:0,hammerCooldown:0,hammerBuffer:0,slamming:false});clearInput();yaw=0;pitch=0;camera.position.set(SPAWN.x,SPAWN.y+.43,SPAWN.z);flipAt=hookAt=-100;effects.forEach(e=>{e.life=0;e.mesh.visible=false;});}
function reset(){seenLandings=0;seenShockwaves=0;player=newPlayer();accumulator=0;returnHome();$('hooks').textContent='0';$('jumps').textContent='0';$('speed').textContent='0.0';seenFlips=0;seenHooks=0;seenLunges=0;seenSlingshots=0;wasGrinding=false;lungeAt=-100;seenCollected=0;flipAt=hookAt=-100;effects.forEach(e=>{e.life=0;e.mesh.visible=false;});}
function setPaused(value){
 paused=value;audio.pause(value);clearInput();$('menu').hidden=!value;$('pause').textContent=value?'Resume':'Pause';$('menu-title').textContent=value?'Ready for another run?':'Find your flow.';
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
 audio.wake();
 $('capture-error').hidden=true;
 if(coarse){setPaused(false);lookActive=true;return;}
 lockPending=true;
 if(!renderer.domElement.requestPointerLock){captureFailed();return;}
 try{await renderer.domElement.requestPointerLock();captureReady();}
 catch{captureFailed();}
}
$('play').onclick=play;$('pause').onclick=()=>paused?play():setPaused(true);
function dropEquipment(){if(paused)return;updateCamera(0);const name=dropItem(player,camera.getWorldDirection(new THREE.Vector3()));spearQueued=false;shotTarget=null;if(name)audio.play('throw');if(name)notice(`${name} thrown · one slot available. Retrieve it after it lands.`);}
function toggleSound(){const muted=audio.toggle();$('sound').textContent=muted?'Sound off · U':'Sound on · U';$('sound').setAttribute('aria-pressed',String(muted));}
$('sound').onclick=toggleSound;
function recallEquipment(){if(paused)return;const count=recallItems(player);if(count){audio.play('recall');notice(`Recalling ${count} item${count>1?'s':''} · clear a path back.`);}else notice(player.inventory.length===2?'Two slots full · throw an item to make room.':'No thrown gear available to recall.');}
$('recall').onclick=recallEquipment;
$('drop').onclick=dropEquipment;
$('home').onclick=()=>{returnHome();notice('Back at the plaza. Your counters are kept.');};$('restart').onclick=reset;
$('menu-home').onclick=()=>{returnHome();play();};$('menu-reset').onclick=()=>{reset();play();};
addEventListener('keydown',e=>{
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyQ','KeyE','KeyV','KeyB','KeyC','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();
 if(e.code==='Escape'&&!e.repeat){if(!paused)setPaused(true);return;}
 if(paused)return;
 if(e.code==='KeyR'&&!e.repeat)reset();
 if(e.code==='KeyE'&&!e.repeat)switchEquipment();
 if(e.code==='KeyG'&&!e.repeat)dropEquipment();
 if(e.code==='KeyU'&&!e.repeat)toggleSound();
 if(e.code==='KeyB'&&!e.repeat)recallEquipment();
 if(e.code==='Space'&&!keys.has('Space')&&!e.repeat)jumpQueued=true;
 if(e.code==='KeyQ'&&!keys.has('KeyQ')&&!e.repeat)shoot();
 keys.add(e.code);
});
addEventListener('keyup',e=>e.code==='KeyQ'?releaseItemUse(e.code):keys.delete(e.code));addEventListener('blur',()=>{if(!paused)setPaused(true);});
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
 button.onpointerup=button.onpointercancel=button.onlostpointercapture=()=>button.dataset.key==='KeyQ'?releaseItemUse('KeyQ'):keys.delete(button.dataset.key);
});
$('switch-item').onclick=switchEquipment;
for(const [id,delta] of [['look-left',-1],['look-right',1]]){const button=$(id);button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);turn=delta;};button.onpointerup=button.onpointercancel=button.onlostpointercapture=()=>turn=0;}
function mouseLook(dx,dy){yaw-=dx*.0027;pitch=THREE.MathUtils.clamp(pitch+dy*.0023,-1.4,1.4);}
renderer.domElement.oncontextmenu=e=>e.preventDefault();
renderer.domElement.onpointerdown=e=>{
 if(paused)return;
 if(e.pointerType==='touch'){renderer.domElement.setPointerCapture(e.pointerId);touchLook={id:e.pointerId,x:e.clientX,y:e.clientY};return;}
};
// Mouse events fire for each button in a chord; pointerdown only fires for the first.
renderer.domElement.onmousedown=e=>{if(paused)return;if(e.button===2){e.preventDefault();switchEquipment();}if(e.button===0){shoot();keys.add('Mouse0');}};
renderer.domElement.onmouseup=e=>{if(e.button===0)releaseItemUse('Mouse0');};
renderer.domElement.onpointermove=e=>{
 if(paused)return;
 if(e.pointerType==='touch'){
  if(touchLook?.id===e.pointerId){mouseLook((e.clientX-touchLook.x)*2,(e.clientY-touchLook.y)*2);touchLook.x=e.clientX;touchLook.y=e.clientY;}
 }
};
renderer.domElement.onpointerup=renderer.domElement.onpointercancel=renderer.domElement.onlostpointercapture=e=>{if(touchLook?.id===e.pointerId)touchLook=null;if(e.pointerType!=='touch'&&(e.button===0||e.type!=='pointerup'))releaseItemUse('Mouse0');};
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
const movementFx=movementEffects(scene,camera);
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);
 if(!paused){accumulator+=dt;while(accumulator>=1/120){
  player.enemyTargets=combat.sentries;
  const before={x:player.x,y:player.y,z:player.z,grounded:player.grounded};
  step(player,{...direction(),jump:jumpQueued,use:keys.has('Mouse0')||keys.has('KeyQ'),target:shotTarget,grind:keys.has('KeyV'),spearPressed:spearQueued,facingX:-Math.sin(yaw)*Math.cos(pitch),facingY:-Math.sin(pitch),facingZ:-Math.cos(yaw)*Math.cos(pitch),slide:keys.has('KeyC')||keys.has('ShiftLeft')||keys.has('ShiftRight')},1/120);
  if(before.grounded&&!player.grounded&&player.vy>0&&!player.slamming)audio.play('jump');
  const defeated=tickCombat(combat,player,before,1/120);
  for(const event of combat.events)audio.play(event.type,event,player);
  if(defeated){returnHome();notice('Shield depleted · returned to the safe plaza.');}
  jumpQueued=false;spearQueued=false;accumulator-=1/120;
 }}
 avatar.position.set(player.x,player.y,player.z);if(Math.hypot(player.vx,player.vz)>.1){const heading=Math.atan2(-player.vx,-player.vz),delta=Math.atan2(Math.sin(heading-avatar.rotation.y),Math.cos(heading-avatar.rotation.y));avatar.rotation.y+=delta*(1-Math.exp(-dt*22));}
 legs.forEach((leg,i)=>leg.rotation.x=!paused&&player.grounded&&Math.hypot(player.vx,player.vz)>.1?Math.sin(clock.elapsedTime*20+i*Math.PI)*.65:0);
 if(!paused){
  visualTime+=dt;
  if(player.landings!==seenLandings){seenLandings=player.landings;movementFx.land(player);audio.play('land');}

  if(player.doubleJumps!==seenFlips){seenFlips=player.doubleJumps;flipAt=visualTime;audio.play('jump');burst(true);}
  if(player.collectedPickups.length!==seenCollected){seenCollected=player.collectedPickups.length;notice(player.inventory.length===2?'Two slots full · right-click switches · G throws an item':'Item collected · left-click to use');}
  if(player.lunges!==seenLunges){seenLunges=player.lunges;lungeAt=visualTime;audio.play('lunge');burst(false);}
  if(player.shockwaves!==seenShockwaves){seenShockwaves=player.shockwaves;audio.play('hammer');burst(true);notice(`SHOCKWAVE · ${player.shockwave.radius.toFixed(0)}m blast`);}
  if(player.slingshots!==seenSlingshots){seenSlingshots=player.slingshots;audio.play('lunge');notice('SLINGSHOT · momentum released');}
  if(player.grinding&&!wasGrinding)audio.play('hook');wasGrinding=player.grinding;
  if(player.hooks!==seenHooks){seenHooks=player.hooks;hookAt=visualTime;audio.play('hook');}
  effects.forEach(e=>{if(e.life<=0)return;e.life=Math.max(0,e.life-dt);const p=1-e.life/e.max;e.mesh.material.opacity=(1-p)*(e.ring?.8:.5);e.mesh.scale.setScalar(e.ring?1+p*3:1-p*.5);e.mesh.visible=e.life>0;});
 }
 const pose=motionPose(visualTime-flipAt);
 body.rotation.x=pose.flip;
 legs.forEach((leg,i)=>{leg.rotation.x+=pose.tuck*1.4;leg.position.y=-.5+pose.tuck*.18;arms[i].rotation.x=-pose.tuck*1.8;});
 hands.forEach((hand,i)=>{
  const side=i===0?-1:1;
  const recoil=i===1?Math.max(0,1-(visualTime-hookAt)/.18):0;
  hand.position.set(side*(.29-pose.tuck*.05),-.44+pose.tuck*.06-movementFx.kick,-.58-pose.tuck*.04+recoil*.045);
  hand.rotation.set(-.35-pose.tuck*1.5,0,-side*(.15+pose.tuck*.55));
 });
 updateCamera(dt);
 surfaces.forEach(m=>{const w=m.userData.surface;m.visible=!w.destroyed;if(w.cargoId){m.position.set(w.x,w.y,w.z);m.updateMatrixWorld(true);}});
 enemies.tick(combat,player,player.time);
 $('hit-marker').hidden=combat.hitMarker<=0;
 const threats=combat.sentries.filter(e=>!e.dead&&e.charge>0).sort((a,b)=>b.charge-a.charge);$('threat-warning').hidden=threats.length===0;
 if(threats.length){const e=threats[0],angle=Math.atan2(-(e.x-player.x),-(e.z-player.z)),delta=Math.atan2(Math.sin(yaw-angle),Math.cos(yaw-angle)),arrow=Math.abs(delta)>2.3?'↓':delta>.3?'→':delta<-.3?'←':'↑';$('threat-warning').textContent=`${arrow} INCOMING FIRE ${Math.round(e.charge/.65*100)}% · dodge`; $('threat-warning').style.borderColor=e.charge>.4?'#ff596e':'#ffb347';}
 $('health').textContent=`SHIELD · ${combat.health} / 3 · KILLS ${combat.kills}`;$('damage-flash').style.opacity=combat.flash*2;
 movementFx.tick(player,dt,paused);$('landing-flash').style.opacity=movementFx.impact;
 droneMeshes.forEach(d=>{const pos=d.group.position.clone().project(camera),visible=!player.deadDrones.includes(d.route.id)&&pos.z> -1&&pos.z<1&&Math.abs(pos.x)<.95&&Math.abs(pos.y)<.95;d.marker.hidden=!visible;if(visible){d.marker.style.left=`${(pos.x*.5+.5)*innerWidth}px`;d.marker.style.top=`${(-pos.y*.5+.5)*innerHeight}px`;d.marker.classList.toggle('reachable',canGrapple(player,{droneId:d.route.id,offset:{x:0,y:-.29,z:0}}));}});


 gun.visible=hasEquipped(player,'grapple');spear.visible=hasEquipped(player,'spear');hammer.visible=hasEquipped(player,'hammer');hammer.rotation.x=player.slamming?-1.1:Math.max(0,1-player.hammerCooldown/1.8)*.1;hammer.rotation.z=Math.sin(Math.min(player.hammerCooldown,.25)/.25*Math.PI)*.8;
 const thrust=Math.max(0,1-(visualTime-lungeAt)/.28);spear.position.z=-.03-thrust*.45;spear.rotation.x=.35-thrust*.15;
 pickupMeshes.forEach(({item,group,ring,label})=>{const available=!player.collectedPickups.includes(item.id);group.visible=ring.visible=label.visible=available;const pos=player.pickupPositions[item.id]||item;const thrown=player.thrownItems.find(t=>t.id===item.id);group.position.set(pos.x,pos.y+(thrown?0:Math.sin(visualTime*2)*.09),pos.z);if(thrown){if(item.type==='spear')group.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),new THREE.Vector3(thrown.vx,thrown.vy,thrown.vz).normalize());else group.rotation.set(visualTime*12,visualTime*3,0);ring.visible=label.visible=false;}else group.rotation.set(0,visualTime*.8,0);ring.position.set(pos.x,pos.y-.8,pos.z);label.position.set(pos.x,pos.y+1.1,pos.z);});
 for(const type of ['grapple','spear','hammer']){const el=$(`item-${type}`),owned=player.inventory.includes(type);el.classList.toggle('owned',owned);el.classList.toggle('equipped',player.equipped===type);el.textContent=`${type==='grapple'?'Grapple':type==='spear'?'Spear':'Hammer'} · ${owned?(player.equipped===type?'equipped':'right-click to switch'):'find pickup'}`;}
 $('slots').textContent=`${player.inventory.length} / 2 slots · G throw · B recall`;
 $('hook').textContent=player.equipped==='spear'?'Lunge':player.equipped==='hammer'?'Slam':'Use';
 const target=aimPoint(),ready=hasEquipped(player,'grapple')&&canGrapple(player,target);
 $('ability-text').textContent=!player.equipped?'NO ITEM · collect the pickups beside the plaza':player.grinding?'WALL GRIND · V held · Space to kick off':player.equipped==='hammer'?(player.slamming?'HAMMER SLAM':player.hammerCooldown>0?`HAMMER RECHARGING · ${player.hammerCooldown.toFixed(1)}s`:'HAMMER READY · click to slam + bounce'):player.equipped==='spear'?(player.lungeTime>0?`SPEAR LUNGE · ${player.spearPower.toFixed(1)}× power`:player.spearCooldown>0?`SPEAR RECHARGING · ${player.spearCooldown.toFixed(1)}s`:'SPEAR READY · click to lunge'):player.slideTime>0?'SLIDING · jump to launch':player.boostTime>0&&!player.grapple?'SPEED BOOST · slide to keep your flow':player.grapple?player.grapple.lightEnemy?'ENEMY REEL · pulling light enemy toward you':`${player.grapple.enemyId?'ENEMY SWING':player.grapple.droneId?'DRONE SWING':'SWINGING'} + REELING · ${player.ropeLength.toFixed(1)}m · CHARGE ${Math.round(player.grappleCharge/1.4*100)}% · release to launch`:ready?target?.assisted?'ASSIST LOCK · hold click / Q':target?.enemyId?'ENEMY HOOK READY · hold click / Q':target?.droneId?'DRONE READY · hold click / Q':'HOOK READY · hold click / Q · 20m':target?'OUT OF REACH OR BLOCKED · 20m':'Aim at a surface · 20m reach';
 $('ability').classList.toggle('ready',ready||Boolean(player.grapple));
 $('reticle').classList.toggle('assisted',ready&&Boolean(target?.assisted));
 $('reticle').classList.toggle('in-range',ready);$('reticle').classList.toggle('latched',Boolean(player.grapple));
 targetHalo.visible=ready&&!player.grapple;
 if(targetHalo.visible){targetHalo.position.set(target.x,target.y,target.z);targetHalo.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(target.nx,target.ny,target.nz));targetHalo.scale.setScalar(1+Math.sin(visualTime*5)*.12);}
 document.body.classList.toggle('sliding',player.slideTime>0);document.body.classList.toggle('grinding',player.grinding);
$('reticle').style.color=ready||player.grapple?'#1ab2bd':'#ffffffaa';
 rope.visible=latch.visible=Boolean(player.grapple);
 if(player.grapple){const origin=muzzle.getWorldPosition(new THREE.Vector3()),a=player.grapple,points=ropeGeometry.attributes.position;points.setXYZ(0,origin.x,origin.y,origin.z);points.setXYZ(1,a.x,a.y,a.z);points.needsUpdate=true;latch.position.set(a.x,a.y,a.z);}
 const nearby=world.filter(w=>w.id!=='ground'&&Math.abs(player.x-w.x)<w.w/2+4&&Math.abs(player.z-w.z)<w.d/2+4).sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z))[0];
 $('zone').textContent=`SANDBOX / ${(nearby?.zone||'Open meadow').toUpperCase()}`;
 $('hooks').textContent=player.hooks;$('jumps').textContent=player.wallJumps;$('speed').textContent=Math.hypot(player.vx,player.vz).toFixed(1);
 $('progress').textContent=player.crouched?'Stay low through the slide tunnels. Release Shift/C to stand when clear.':player.wallNormal&&!player.grounded?'Press Space to kick off the wall and refresh your double jump.':!player.grounded&&player.airJump?'One more jump available. Catch a high surface to swing.':'V wall grinds. B recalls gear. Hold grapple to charge a slingshot. Cyan glass breaks at speed.';
 sun.position.set(player.x-15,player.y+30,player.z+12);sun.target.position.set(player.x,player.y,player.z);renderer.render(scene,camera);
}
reset();animate();
