import {syncCargo,cargoAt} from './platforms.js';
import {shatter} from './scenery.js';
import {resolveAnchor} from './drones.js';
import {world,SPAWN,boostPads,itemPickups} from './world.js';
export {world,SPAWN,boostPads,itemPickups};
export const RADIUS=.32, HALF_HEIGHT=.65;
export const halfHeight=p=>p.crouched?.37:HALF_HEIGHT;
export function canStand(p){
 const feet=p.y-halfHeight(p),head=feet+HALF_HEIGHT*2;
 return !world.some(w=>Math.abs(p.x-w.x)<w.w/2+RADIUS&&Math.abs(p.z-w.z)<w.d/2+RADIUS&&head>w.y-w.h/2+.01&&feet<w.y+w.h/2-.01);
}
function resetMovement(p){Object.assign(p,{crouched:false,slideTime:0,slideCooldown:0,slideHeld:false,slideBuffer:0,boostTime:0,padId:null,reelSpeed:0});}

export function wallContact(player) {
  let closest=null;
  for(const wall of world) {
    if(player.y+halfHeight(player)<=wall.y-wall.h/2+.01||player.y-halfHeight(player)>=wall.y+wall.h/2-.01)continue;
    const dx=player.x-wall.x,dz=player.z-wall.z,ex=wall.w/2+RADIUS,ez=wall.d/2+RADIUS;
    if(Math.abs(dx)>ex+.08||Math.abs(dz)>ez+.08)continue;
    const px=ex-Math.abs(dx),pz=ez-Math.abs(dz);
    const contact=px<pz?{wall,nx:Math.sign(dx)||1,nz:0,depth:px}:{wall,nx:0,nz:Math.sign(dz)||1,depth:pz};
    if(!closest||contact.depth>closest.depth)closest=contact;
  }
  return closest;
}
function nearGrindWall(p){
 let best=null,distance=.4;
 for(const wall of world){
  if(p.y+halfHeight(p)<=wall.y-wall.h/2||p.y-halfHeight(p)>=wall.y+wall.h/2)continue;
  const dx=p.x-wall.x,dz=p.z-wall.z,px=wall.w/2+RADIUS-Math.abs(dx),pz=wall.d/2+RADIUS-Math.abs(dz),gap=Math.hypot(Math.min(0,px),Math.min(0,pz));
  if(gap>distance)continue;distance=gap;best=px<pz?{wall,nx:Math.sign(dx)||1,nz:0,depth:px}:{wall,nx:0,nz:Math.sign(dz)||1,depth:pz};
 }
 return best;
}
export const GRAPPLE_RANGE=20;
export const REEL_SPEED=7, MIN_ROPE_LENGTH=1.5;
export function segmentHit(a,b,w){let lo=0,hi=1;for(const [axis,size] of [['x','w'],['y','h'],['z','d']]){const d=b[axis]-a[axis],min=w[axis]-w[size]/2,max=w[axis]+w[size]/2;if(Math.abs(d)<1e-8){if(a[axis]<min||a[axis]>max)return null;}else{let t1=(min-a[axis])/d,t2=(max-a[axis])/d;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)return null;}}return lo;}
export function canGrapple(p,a,checkRange=true){
 a=resolveAnchor(a,p.time||0,p.enemyTargets||[]);
 if(a?.droneId&&(p.deadDrones?.includes(a.droneId)||p.campaign&&a.levelStage!==p.levelStage))return false;
 if(!a||![a.x,a.y,a.z].every(Number.isFinite))return false;
 const d=Math.hypot(a.x-p.x,a.y-p.y,a.z-p.z);if(d<.1||(checkRange&&d>GRAPPLE_RANGE))return false;
 const w=world.find(w=>w.id===a.surfaceId);if(!w&&!a.droneId&&!a.enemyId)return false;
 const faces=w?[['x','w'],['y','h'],['z','d']].map(([axis,size])=>Math.abs(a[axis]-w[axis])-w[size]/2):[0];
 if(faces.some(d=>d>.08)||!faces.some(d=>Math.abs(d)<.08))return false;
 return !world.some(w=>{if(w.id===a.enemyId)return false;const t=segmentHit(p,a,w);return t!==null&&t<.995;});
}
export function constrainRope(p){
 if(!p.grapple||p.grapple.lightEnemy)return;
 const a=p.grapple,dx=p.x-a.x,dy=p.y-a.y,dz=p.z-a.z,d=Math.hypot(dx,dy,dz)||1;
 if(d<p.ropeLength)return; // Slack rope cannot push the player away.
 const nx=dx/d,ny=dy/d,nz=dz/d;
 p.x=a.x+nx*p.ropeLength;p.y=a.y+ny*p.ropeLength;p.z=a.z+nz*p.ropeLength;
 const avx=a.anchorVx||0,avy=a.anchorVy||0,avz=a.anchorVz||0;
 p.vx-=avx;p.vy-=avy;p.vz-=avz;
 const radial=p.vx*nx+p.vy*ny+p.vz*nz;
 if(radial>0){
  const speed=Math.hypot(p.vx,p.vy,p.vz);
  p.vx-=radial*nx;p.vy-=radial*ny;p.vz-=radial*nz;
  const tangent=Math.hypot(p.vx,p.vy,p.vz);
  // Redirect earned speed into the swing instead of deleting it on attachment.
  if(tangent>.1){const scale=Math.min(speed/tangent,4);p.vx*=scale;p.vy*=scale;p.vz*=scale;}
 }
 // Position correction and launch velocity must agree with the moving winch.
 const inward=p.reelSpeed||0,currentRadial=p.vx*nx+p.vy*ny+p.vz*nz;
 if(currentRadial> -inward){const correction=currentRadial+inward;p.vx-=correction*nx;p.vy-=correction*ny;p.vz-=correction*nz;}
 p.vx+=avx;p.vy+=avy;p.vz+=avz;
}
export function releaseGrapple(p,launch=true){
 if(p.grapple&&launch&&p.grappleCharge>=.45&&!p.grapple.lightEnemy){
  const speed=Math.hypot(p.vx,p.vy,p.vz),d=speed>2?{x:p.vx/speed,y:p.vy/speed,z:p.vz/speed}:p.releaseDirection||{x:0,y:.2,z:-1},n=Math.hypot(d.x,d.y,d.z)||1,boost=Math.min(1,p.grappleCharge/1.4)*16;
  p.vx+=d.x/n*boost;p.vy+=d.y/n*boost;p.vz+=d.z/n*boost;p.slingshots++;
 }
 p.grapple=null;p.grappleCharge=0;p.ropeLength=0;
}
export function recallItems(p){
 let slots=2-p.inventory.length-p.thrownItems.filter(t=>t.returning).length,count=0;
 for(const id of [...p.recoverableItems].reverse()){
  if(slots<=0)break;
  let t=p.thrownItems.find(t=>t.id===id);if(t?.returning)continue;
  if(!t){const item=itemPickups.find(i=>i.id===id),pos=p.pickupPositions[id]||item;t={...pos,id,type:item.type,life:0,vx:0,vy:0,vz:0};p.thrownItems.push(t);}
  Object.assign(t,{returning:true,damaging:true,hitIds:[],life:0});slots--;count++;
 }
 return count;
}
export const SPEAR_SPEED=42, SPEAR_COOLDOWN=1.4;
export const GRAVITY=28, JUMP_SCALE=Math.sqrt(GRAVITY/23);
export function hasEquipped(p,type){return p.equipped===type&&p.inventory.includes(type);}
export function cycleItem(p){
 if(p.inventory.length<2)return p.equipped;
 const index=p.inventory.indexOf(p.equipped);p.equipped=p.inventory[(index+1)%p.inventory.length];
 p.grapple=null;p.grappleCharge=0;p.ropeLength=0;p.spearBuffer=0;p.hammerBuffer=0;p.slamming=false;p.lungeTime=0;p.requireRelease=p.useHeld;return p.equipped;
}
export function dropItem(p,direction={x:0,y:0,z:-1}){
 if(!p.equipped)return null;
 const type=p.equipped,item=itemPickups.find(i=>i.type===type);
 const length=Math.hypot(direction.x,direction.y,direction.z)||1;
 const aim={x:direction.x/length,y:direction.y/length,z:direction.z/length};
 const origin={x:p.x,y:p.y+.35,z:p.z};
 p.pickupPositions[item.id]={...origin};
 const speed=type==='spear'?38:28;
 if(!p.recoverableItems.includes(item.id))p.recoverableItems.push(item.id);
 p.thrownItems.push({id:item.id,type,power:Math.min(2.5,1+Math.max(0,Math.hypot(p.vx,p.vz)-18)/18),...origin,vx:aim.x*speed+p.vx*.35,vy:aim.y*speed+(type==='spear'?0:4)+p.vy*.2,vz:aim.z*speed+p.vz*.35,gravity:type==='spear'?4:20,life:0,damaging:true});
 p.pickupDelay[item.id]=p.time+1;
 p.collectedPickups=p.collectedPickups.filter(id=>id!==item.id);
 p.inventory=p.inventory.filter(t=>t!==type);p.equipped=p.inventory[0]||null;
 p.grapple=null;p.grappleCharge=0;p.ropeLength=0;p.lungeTime=0;p.spearBuffer=0;p.hammerBuffer=0;p.slamming=false;p.requireRelease=p.useHeld;
 return type;
}
function collectItems(p){
 for(const item of itemPickups){
  const pos=p.pickupPositions[item.id]||item;
  if(p.thrownItems.some(t=>t.id===item.id)||p.inventory.length+p.thrownItems.filter(t=>t.returning).length>=2||p.time<(p.pickupDelay[item.id]||0)||p.collectedPickups.includes(item.id)||Math.hypot(p.x-pos.x,p.z-pos.z)>1.15||Math.abs(p.y-pos.y)>1.2)continue;
  p.collectedPickups.push(item.id);p.inventory.push(item.type);p.recoverableItems=p.recoverableItems.filter(id=>id!==item.id);
  if(!p.equipped){p.equipped=item.type;p.requireRelease=p.useHeld;}
 }
}
function shockwave(p){const power=Math.min(2.5,1+Math.max(0,Math.hypot(p.vx,p.vz)-12)/22);p.slamming=false;p.shockwaves++;p.shockwave={x:p.x,y:p.y-halfHeight(p),z:p.z,radius:7+Math.min(5,Math.max(0,Math.hypot(p.vx,p.vz)-12)/5),power};p.vy=16;p.grounded=false;p.airJump=true;}
export function step(player,input,dt) {
  const riding=player.riding&&player.grounded?cargoAt(player.riding,player.time):null;
  player.time+=dt;syncCargo(player.time);
  if(riding){const next=cargoAt(player.riding,player.time);player.x+=next.x-riding.x;player.y+=next.y-riding.y;player.z+=next.z-riding.z;}
  player.riding=null;
  player.releaseDirection={x:input.facingX??0,y:input.facingY??0,z:input.facingZ??-1};
  if(player.grapple&&(player.grapple.droneId||player.grapple.enemyId||player.grapple.cargoId))player.grapple=resolveAnchor(player.grapple,player.time,player.enemyTargets);
  const wasGrounded=player.grounded;

  collectItems(player);
  const use=Boolean(input.use??input.grapple);
  if(!use)player.requireRelease=false;
  const pressed=use&&!player.useHeld&&!player.requireRelease;
  player.hammerCooldown=Math.max(0,player.hammerCooldown-dt);player.hammerBuffer=Math.max(0,player.hammerBuffer-dt);
  if(hasEquipped(player,'hammer')&&(pressed||input.spearPressed)&&!player.requireRelease)player.hammerBuffer=.12;
  if(!hasEquipped(player,'hammer'))player.hammerBuffer=0;
  player.spearBuffer=Math.max(0,player.spearBuffer-dt);
  if(hasEquipped(player,'spear')&&(pressed||input.spearPressed)&&!player.requireRelease)player.spearBuffer=.12;
  if(!hasEquipped(player,'spear'))player.spearBuffer=0;
  player.spearCooldown=Math.max(0,player.spearCooldown-dt);player.lungeTime=Math.max(0,player.lungeTime-dt);
  if(hasEquipped(player,'grapple')&&pressed&&canGrapple(player,input.target)){
    player.grapple={...resolveAnchor(input.target,player.time,player.enemyTargets)};player.ropeLength=Math.hypot(player.grapple.x-player.x,player.grapple.y-player.y,player.grapple.z-player.z);player.hooks++;player.grappleCharge=0;
  }
  if(!use&&player.grapple)releaseGrapple(player);
  if(!hasEquipped(player,'grapple'))releaseGrapple(player,false);
  if(player.grapple&&!player.grapple.lightEnemy)player.grappleCharge=Math.min(1.4,player.grappleCharge+dt);
  player.grappleHeld=use;player.useHeld=use;
  if(player.grapple&&!canGrapple(player,player.grapple,false))player.grapple=null;
  player.slideTime=Math.max(0,player.slideTime-dt);player.slideCooldown=Math.max(0,player.slideCooldown-dt);player.boostTime=Math.max(0,player.boostTime-dt);
  player.slideBuffer=Math.max(0,player.slideBuffer-dt);
  if(input.slide&&!player.slideHeld)player.slideBuffer=.3;
  const currentSpeed=Math.hypot(player.vx,player.vz);
  if(player.slideBuffer>0&&player.grounded&&currentSpeed>=5&&player.slideCooldown===0){
    player.slideBuffer=0;
    player.slideTime=1.2;player.slideCooldown=1.55;player.slides++;
    const boost=Math.max(12,currentSpeed+3)/currentSpeed;player.vx*=boost;player.vz*=boost;
  }
  player.slideHeld=Boolean(input.slide);
  const wasHalf=halfHeight(player);
  player.crouched=Boolean(input.slide||player.slideTime>0||player.crouched&&!canStand(player));
  player.y+=halfHeight(player)-wasHalf; // Keep feet fixed when changing stance.
  const magnitude=Math.hypot(input.x,input.z)||1,speed=player.crouched&&player.slideTime===0?4.5:player.boostTime>0?24:9;
  const contact=wallContact(player)||(input.grind?nearGrindWall(player):null);player.wallNormal=contact?{x:contact.nx,z:contact.nz}:null;
  const moving=Boolean(input.x||input.z);player.controlLock=Math.max(0,player.controlLock-dt);
  if(player.lungeTime>0){
    // Preserve the initial burst until its short thrust animation finishes.
  }else if(player.grounded&&(player.slideTime>0||player.boostTime>0)){
    const current=Math.hypot(player.vx,player.vz),heading=Math.atan2(player.vz,player.vx);
    const target=Math.atan2(input.z,input.x),delta=moving?Math.atan2(Math.sin(target-heading),Math.cos(target-heading)):0;
    const next=heading+Math.max(-1.8*dt,Math.min(1.8*dt,delta));
    const retained=current*Math.exp(-(player.slideTime>0?.45:.08)*dt);
    player.vx=Math.cos(next)*retained;player.vz=Math.sin(next)*retained;
  }else if(player.grounded){
    const blend=1-Math.exp(-(moving?25:24)*dt);
    player.vx+=(input.x/magnitude*speed-player.vx)*blend;player.vz+=(input.z/magnitude*speed-player.vz)*blend;
    if(!moving&&Math.hypot(player.vx,player.vz)<.01)player.vx=player.vz=0;
  }else if(moving&&!player.grapple&&player.controlLock===0){
    // Air steering changes heading, never bleeds off earned horizontal speed.
    const current=Math.hypot(player.vx,player.vz),target=Math.atan2(input.z,input.x);
    const heading=current>.01?Math.atan2(player.vz,player.vx):target;
    const difference=Math.atan2(Math.sin(target-heading),Math.cos(target-heading));
    const turn=Math.abs(difference)>Math.PI*.95&&player.controlLock===0?difference:Math.max(-(player.controlLock>0?1.5:5)*dt,Math.min((player.controlLock>0?1.5:5)*dt,difference));
    const nextSpeed=current+Math.max(0,speed-current)*(1-Math.exp(-8*dt));
    player.vx=Math.cos(heading+turn)*nextSpeed;player.vz=Math.sin(heading+turn)*nextSpeed;
  }
  player.jumpBuffer=input.jump?.14:Math.max(0,player.jumpBuffer-dt);player.coyoteTime=player.grounded?.10:Math.max(0,player.coyoteTime-dt);player.wallCooldown=Math.max(0,player.wallCooldown-dt);
  if(player.grounded)player.airJump=true;
  if(player.jumpBuffer>0){
    if(player.coyoteTime>0){player.slideTime=0;player.vy=12.5*JUMP_SCALE;if(riding){player.vx+=riding.vx;player.vy+=riding.vy;player.vz+=riding.vz;}player.grounded=false;player.jumpBuffer=0;player.coyoteTime=0;}
    else if(contact&&player.wallCooldown===0){player.vy=13*JUMP_SCALE;player.vx=contact.nx*10;player.vz=contact.nz*10;player.controlLock=.20;player.wallCooldown=.2;player.jumpBuffer=0;player.wallJumps++;player.airJump=true;}
    else if(input.jump&&player.airJump&&!contact){player.vy=11.5*JUMP_SCALE;player.airJump=false;player.jumpBuffer=0;player.doubleJumps++;}
  }
  if(player.grapple&&!player.grapple.lightEnemy&&moving&&!player.grounded){
    const a=player.grapple,dx=player.x-a.x,dy=player.y-a.y,dz=player.z-a.z,d=Math.hypot(dx,dy,dz)||1;
    const nx=dx/d,ny=dy/d,nz=dz/d,ix=input.x/magnitude,iz=input.z/magnitude,dot=ix*nx+iz*nz;
    player.vx+=(ix-dot*nx)*18*dt;player.vy-=dot*ny*18*dt;player.vz+=(iz-dot*nz)*18*dt;
    const speed=Math.hypot(player.vx,player.vy,player.vz);if(speed>40){player.vx*=40/speed;player.vy*=40/speed;player.vz*=40/speed;}
  }
  if(hasEquipped(player,'spear')&&player.spearBuffer>0&&player.spearCooldown===0){
    const fx=input.facingX??0,fy=Math.max(-.25,Math.min(.65,input.facingY??0)),fz=input.facingZ??-1,d=Math.hypot(fx,fy,fz)||1;
    player.spearPower=Math.min(2.5,1+Math.max(0,Math.hypot(player.vx,player.vz)-18)/18);
    const speed=Math.max(SPEAR_SPEED,Math.hypot(player.vx,player.vy,player.vz));
    player.vx=fx/d*speed;player.vz=fz/d*speed;player.vy=Math.max(fy/d*speed,2.5);
    player.spearBuffer=0;
    player.lungeTime=.24;player.spearCooldown=SPEAR_COOLDOWN;player.slideTime=0;player.lunges++;player.spearDirection={x:fx/d,y:fy/d,z:fz/d};
  }
  if(hasEquipped(player,'hammer')&&player.hammerBuffer>0&&player.hammerCooldown===0){
   player.hammerBuffer=0;player.hammerCooldown=1.8;player.slideTime=0;
   if(player.grounded)shockwave(player);else{player.slamming=true;player.vy=-32;}
  }
  if(player.slamming)player.vy=Math.min(player.vy,-32);
  player.grinding=Boolean(input.grind&&contact&&!player.grounded&&player.wallCooldown===0&&Math.hypot(player.vx,player.vz)>=6&&player.grindTime<2.5&&!player.grapple&&!player.slamming);
  if(player.grounded)player.grindTime=0;
  if(player.grinding){
   player.grindTime+=dt;const tx=-contact.nz,tz=contact.nx,current=Math.hypot(player.vx,player.vz),dot=moving?input.x*tx+input.z*tz:player.vx*tx+player.vz*tz,sign=Math.sign(dot)||1;
   player.vx=tx*sign*current;player.vz=tz*sign*current;player.vy=Math.max(player.vy,-1);
   if(contact.depth<0){player.x+=contact.nx*contact.depth;player.z+=contact.nz*contact.depth;}
  }
  player.reelSpeed=0;
  if(player.grapple&&!player.grapple.lightEnemy){
    player.reelSpeed=player.ropeLength>MIN_ROPE_LENGTH?REEL_SPEED:0;
    player.ropeLength=Math.max(MIN_ROPE_LENGTH,player.ropeLength-REEL_SPEED*dt);
    const a=player.grapple,dx=a.x-player.x,dy=a.y-player.y,dz=a.z-player.z,d=Math.hypot(dx,dy,dz)||1;
    // A limited inward winch force coexists with tangential swing velocity.
    const closing=(player.vx*dx+player.vy*dy+player.vz*dz)/d;
    if(d>MIN_ROPE_LENGTH&&closing<REEL_SPEED){const pull=Math.min(REEL_SPEED-closing,36*dt);player.vx+=dx/d*pull;player.vy+=dy/d*pull;player.vz+=dz/d*pull;}
  }
  const oldY=player.y;
  player.vy-=(player.grinding?4:GRAVITY)*dt;
  if(contact&&!player.grounded&&player.vy< -3)player.vy=-3;
  const substeps=Math.max(1,Math.ceil(Math.hypot(player.vx,player.vz)*dt/.18));
  for(let i=0;i<substeps;i++){
    const next={x:player.x+player.vx*dt/substeps,y:player.y,z:player.z+player.vz*dt/substeps};
    if(player.lungeTime>0||player.slamming||Math.hypot(player.vx,player.vz)>18)for(const w of [...world])if(w.breakable&&segmentHit(player,next,{...w,w:w.w+RADIUS*2,h:w.h+halfHeight(player)*2,d:w.d+RADIUS*2})!==null)shatter(w,player);
    player.x=next.x;player.z=next.z;
    for(let j=0;j<4;j++){
      const hit=wallContact(player);if(!hit||hit.depth<=0)break;
      player.x+=hit.nx*hit.depth;player.z+=hit.nz*hit.depth;
      const into=player.vx*hit.nx+player.vz*hit.nz;if(into<0){player.vx-=into*hit.nx;player.vz-=into*hit.nz;}
    }
  }
  player.y+=player.vy*dt;player.grounded=false;
  if(player.slamming||player.lungeTime>0)for(const w of [...world])if(w.breakable&&segmentHit({x:player.x,y:oldY,z:player.z},player,{...w,w:w.w+RADIUS*2,h:w.h+halfHeight(player)*2,d:w.d+RADIUS*2})!==null)shatter(w,player);
  constrainRope(player);
  const overlapping=world.filter(w=>Math.abs(player.x-w.x)<w.w/2+RADIUS&&Math.abs(player.z-w.z)<w.d/2+RADIUS);
  const landings=overlapping.filter(w=>player.vy<=0&&oldY-halfHeight(player)>=w.y+w.h/2-.015&&player.y-halfHeight(player)<=w.y+w.h/2).sort((a,b)=>(b.y+b.h/2)-(a.y+a.h/2));
  if(landings.length){const w=landings[0];if(!wasGrounded&&player.vy< -2){player.landings++;player.landingImpact=-player.vy;player.landingX=player.x;player.landingY=w.y+w.h/2+.035;player.landingZ=player.z;}player.y=w.y+w.h/2+halfHeight(player);player.vy=0;player.grounded=true;player.riding=w.cargoId||null;}
  if(player.vy>0){
    const ceilings=overlapping.filter(w=>oldY+halfHeight(player)<=w.y-w.h/2+.015&&player.y+halfHeight(player)>=w.y-w.h/2).sort((a,b)=>(a.y-a.h/2)-(b.y-b.h/2));
    if(ceilings.length){player.y=ceilings[0].y-ceilings[0].h/2-halfHeight(player);player.vy=0;}
  }
  // Resolve multiple contacts at corners, rather than tunneling into an adjacent wall.
  for(let i=0;i<4;i++){
    const collision=wallContact(player);if(!collision||collision.depth<=0)break;
    player.x+=collision.nx*collision.depth;player.z+=collision.nz*collision.depth;
    const into=player.vx*collision.nx+player.vz*collision.nz;if(into<0){player.vx-=into*collision.nx;player.vz-=into*collision.nz;}
    player.wallNormal={x:collision.nx,z:collision.nz};
  }
  if(player.grounded&&player.slamming)shockwave(player);
  collectItems(player);
  const pad=player.grounded?boostPads.find(p=>Math.abs(player.x-p.x)<p.w/2+RADIUS&&Math.abs(player.z-p.z)<p.d/2+RADIUS&&Math.abs(player.y-halfHeight(player)-p.y)<.18):null;
  if(pad&&pad.id!==player.padId){
    const speed=Math.max(pad.speed,Math.hypot(player.vx,player.vz)),d=Math.hypot(pad.dx,pad.dz);
    player.vx=pad.dx/d*speed;player.vz=pad.dz/d*speed;player.boostTime=1.3;player.boosts++;
  }
  player.padId=pad?.id||null;
  if(player.y<(player.killHeight??-16)){Object.assign(player,player.respawnPoint||SPAWN,{vx:0,vy:0,vz:0,grounded:false,jumpBuffer:0,coyoteTime:0,controlLock:0,wallNormal:null,grapple:null,grappleHeld:false,ropeLength:0,airJump:true});resetMovement(player);player.lungeTime=0;player.spearBuffer=0;player.slamming=false;player.falls++;}
  return player;
}
export function newPlayer(){return {...SPAWN,time:0,landings:0,landingImpact:0,landingX:0,landingY:0,landingZ:0,vx:0,vy:0,vz:0,grounded:false,jumpBuffer:0,coyoteTime:0,falls:0,controlLock:0,wallCooldown:0,wallNormal:null,wallJumps:0,doubleJumps:0,airJump:true,grapple:null,grappleHeld:false,ropeLength:0,hooks:0,crouched:false,slideTime:0,slideCooldown:0,slideHeld:false,slideBuffer:0,slides:0,boostTime:0,boosts:0,padId:null,riding:null,enemyTargets:[],recoverableItems:[],breakEvents:[],grinding:false,grindTime:0,grappleCharge:0,spearPower:1,slingshots:0,thrownItems:[],pickupPositions:{},pickupDelay:{},deadDrones:[],hammerCooldown:0,hammerBuffer:0,slamming:false,shockwaves:0,shockwave:null,inventory:[],equipped:null,collectedPickups:[],useHeld:false,requireRelease:false,spearCooldown:0,spearBuffer:0,lungeTime:0,lunges:0};}
