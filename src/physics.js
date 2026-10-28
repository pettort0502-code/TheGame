import {world,SPAWN,boostPads} from './world.js';
export {world,SPAWN,boostPads};
export const RADIUS=.32, HALF_HEIGHT=.65;
export const halfHeight=p=>p.crouched?.37:HALF_HEIGHT;
export function canStand(p){
 const feet=p.y-halfHeight(p),head=feet+HALF_HEIGHT*2;
 return !world.some(w=>Math.abs(p.x-w.x)<w.w/2+RADIUS&&Math.abs(p.z-w.z)<w.d/2+RADIUS&&head>w.y-w.h/2+.01&&feet<w.y+w.h/2-.01);
}
function resetMovement(p){Object.assign(p,{crouched:false,slideTime:0,slideCooldown:0,slideHeld:false,boostTime:0,padId:null,reelSpeed:0});}

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
export const GRAPPLE_RANGE=20;
export const REEL_SPEED=7, MIN_ROPE_LENGTH=1.5;
function segmentHit(a,b,w){let lo=0,hi=1;for(const [axis,size] of [['x','w'],['y','h'],['z','d']]){const d=b[axis]-a[axis],min=w[axis]-w[size]/2,max=w[axis]+w[size]/2;if(Math.abs(d)<1e-8){if(a[axis]<min||a[axis]>max)return null;}else{let t1=(min-a[axis])/d,t2=(max-a[axis])/d;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)return null;}}return lo;}
export function canGrapple(p,a,checkRange=true){
 if(!a||![a.x,a.y,a.z].every(Number.isFinite))return false;
 const d=Math.hypot(a.x-p.x,a.y-p.y,a.z-p.z);if(d<.1||(checkRange&&d>GRAPPLE_RANGE))return false;
 const w=world.find(w=>w.id===a.surfaceId);if(!w)return false;
 const faces=[['x','w'],['y','h'],['z','d']].map(([axis,size])=>Math.abs(a[axis]-w[axis])-w[size]/2);
 if(faces.some(d=>d>.08)||!faces.some(d=>Math.abs(d)<.08))return false;
 return !world.some(w=>{const t=segmentHit(p,a,w);return t!==null&&t<.995;});
}
export function constrainRope(p){
 if(!p.grapple)return;
 const a=p.grapple,dx=p.x-a.x,dy=p.y-a.y,dz=p.z-a.z,d=Math.hypot(dx,dy,dz)||1;
 if(d<p.ropeLength)return; // Slack rope cannot push the player away.
 const nx=dx/d,ny=dy/d,nz=dz/d;
 p.x=a.x+nx*p.ropeLength;p.y=a.y+ny*p.ropeLength;p.z=a.z+nz*p.ropeLength;
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
}
export function step(player,input,dt) {
  if(input.grapple&&!player.grappleHeld&&canGrapple(player,input.target)){
    player.grapple={...input.target};player.ropeLength=Math.hypot(input.target.x-player.x,input.target.y-player.y,input.target.z-player.z);player.hooks++;
  }
  if(!input.grapple)player.grapple=null;player.grappleHeld=Boolean(input.grapple);
  if(player.grapple&&!canGrapple(player,player.grapple,false))player.grapple=null;
  player.slideTime=Math.max(0,player.slideTime-dt);player.slideCooldown=Math.max(0,player.slideCooldown-dt);player.boostTime=Math.max(0,player.boostTime-dt);
  const currentSpeed=Math.hypot(player.vx,player.vz);
  if(input.slide&&!player.slideHeld&&player.grounded&&currentSpeed>=5&&player.slideCooldown===0){
    player.slideTime=1.2;player.slideCooldown=1.55;player.slides++;
    const boost=Math.max(12,currentSpeed+3)/currentSpeed;player.vx*=boost;player.vz*=boost;
  }
  player.slideHeld=Boolean(input.slide);
  const wasHalf=halfHeight(player);
  player.crouched=Boolean(input.slide||player.slideTime>0||player.crouched&&!canStand(player));
  player.y+=halfHeight(player)-wasHalf; // Keep feet fixed when changing stance.
  const magnitude=Math.hypot(input.x,input.z)||1,speed=player.crouched&&player.slideTime===0?4.5:player.boostTime>0?24:9;
  const contact=wallContact(player);player.wallNormal=contact?{x:contact.nx,z:contact.nz}:null;
  const moving=Boolean(input.x||input.z);player.controlLock=Math.max(0,player.controlLock-dt);
  if(player.grounded&&(player.slideTime>0||player.boostTime>0)){
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
    if(player.coyoteTime>0){player.slideTime=0;player.vy=12.5;player.grounded=false;player.jumpBuffer=0;player.coyoteTime=0;}
    else if(contact&&player.wallCooldown===0){player.vy=13;player.vx=contact.nx*10;player.vz=contact.nz*10;player.controlLock=.20;player.wallCooldown=.2;player.jumpBuffer=0;player.wallJumps++;player.airJump=true;}
    else if(input.jump&&player.airJump&&!contact){player.vy=11.5;player.airJump=false;player.jumpBuffer=0;player.doubleJumps++;}
  }
  if(player.grapple&&moving&&!player.grounded){
    const a=player.grapple,dx=player.x-a.x,dy=player.y-a.y,dz=player.z-a.z,d=Math.hypot(dx,dy,dz)||1;
    const nx=dx/d,ny=dy/d,nz=dz/d,ix=input.x/magnitude,iz=input.z/magnitude,dot=ix*nx+iz*nz;
    player.vx+=(ix-dot*nx)*18*dt;player.vy-=dot*ny*18*dt;player.vz+=(iz-dot*nz)*18*dt;
    const speed=Math.hypot(player.vx,player.vy,player.vz);if(speed>40){player.vx*=40/speed;player.vy*=40/speed;player.vz*=40/speed;}
  }
  player.reelSpeed=0;
  if(player.grapple){
    player.reelSpeed=player.ropeLength>MIN_ROPE_LENGTH?REEL_SPEED:0;
    player.ropeLength=Math.max(MIN_ROPE_LENGTH,player.ropeLength-REEL_SPEED*dt);
    const a=player.grapple,dx=a.x-player.x,dy=a.y-player.y,dz=a.z-player.z,d=Math.hypot(dx,dy,dz)||1;
    // A limited inward winch force coexists with tangential swing velocity.
    const closing=(player.vx*dx+player.vy*dy+player.vz*dz)/d;
    if(d>MIN_ROPE_LENGTH&&closing<REEL_SPEED){const pull=Math.min(REEL_SPEED-closing,36*dt);player.vx+=dx/d*pull;player.vy+=dy/d*pull;player.vz+=dz/d*pull;}
  }
  const oldY=player.y;
  player.vy-=23*dt;
  if(contact&&!player.grounded&&player.vy< -3)player.vy=-3;
  player.x+=player.vx*dt;player.z+=player.vz*dt;player.y+=player.vy*dt;player.grounded=false;
  constrainRope(player);
  const overlapping=world.filter(w=>Math.abs(player.x-w.x)<w.w/2+RADIUS&&Math.abs(player.z-w.z)<w.d/2+RADIUS);
  const landings=overlapping.filter(w=>player.vy<=0&&oldY-halfHeight(player)>=w.y+w.h/2-.015&&player.y-halfHeight(player)<=w.y+w.h/2).sort((a,b)=>(b.y+b.h/2)-(a.y+a.h/2));
  if(landings.length){const w=landings[0];player.y=w.y+w.h/2+halfHeight(player);player.vy=0;player.grounded=true;}
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
  const pad=player.grounded?boostPads.find(p=>Math.abs(player.x-p.x)<p.w/2+RADIUS&&Math.abs(player.z-p.z)<p.d/2+RADIUS&&Math.abs(player.y-halfHeight(player)-p.y)<.18):null;
  if(pad&&pad.id!==player.padId){
    const speed=Math.max(pad.speed,Math.hypot(player.vx,player.vz)),d=Math.hypot(pad.dx,pad.dz);
    player.vx=pad.dx/d*speed;player.vz=pad.dz/d*speed;player.boostTime=1.3;player.boosts++;
  }
  player.padId=pad?.id||null;
  if(player.y< -16){Object.assign(player,SPAWN,{vx:0,vy:0,vz:0,grounded:false,jumpBuffer:0,coyoteTime:0,controlLock:0,wallNormal:null,grapple:null,grappleHeld:false,ropeLength:0,airJump:true});resetMovement(player);player.falls++;}
  return player;
}
export function newPlayer(){return {...SPAWN,vx:0,vy:0,vz:0,grounded:false,jumpBuffer:0,coyoteTime:0,falls:0,controlLock:0,wallCooldown:0,wallNormal:null,wallJumps:0,doubleJumps:0,airJump:true,grapple:null,grappleHeld:false,ropeLength:0,hooks:0,crouched:false,slideTime:0,slideCooldown:0,slideHeld:false,slides:0,boostTime:0,boosts:0,padId:null};}
