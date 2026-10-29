import * as THREE from 'three';
export function movementEffects(scene,camera){
 const pool=Array.from({length:56},(_,i)=>{
  const ring=i<6,trail=i>=32;
  const mesh=new THREE.Mesh(ring?new THREE.TorusGeometry(.5,.025,5,32):new THREE.BoxGeometry(trail?.035:.05,trail?.035:.05,trail?1:.05),new THREE.MeshBasicMaterial({color:ring?'#55efff':trail?'#35cde6':'#dc71ff',transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));
  mesh.visible=false;scene.add(mesh);return {mesh,ring,trail,life:0,max:1,vx:0,vy:0,vz:0};
 });
 const streaks=new Float32Array(16*6),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(streaks,3));
 const lines=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#84eaff',transparent:true,opacity:0,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending}));lines.frustumCulled=false;lines.renderOrder=5;camera.add(lines);
 let trailTime=0,phase=0;const direction=new THREE.Vector3();
 const fx={kick:0,impact:0,
  clear(){pool.forEach(p=>{p.life=0;p.mesh.visible=false;});fx.kick=fx.impact=0;lines.visible=false;trailTime=0;},
  land(p){
   const strength=Math.min(1,p.landingImpact/20);fx.kick=Math.max(fx.kick,strength*.045);fx.impact=Math.max(fx.impact,strength*.28);
   const ring=pool.find(e=>e.ring&&e.life===0);if(ring){ring.life=ring.max=.5;ring.mesh.position.set(p.landingX,p.landingY,p.landingZ);ring.mesh.rotation.x=-Math.PI/2;ring.mesh.scale.setScalar(.7+strength);ring.mesh.visible=true;}
   for(let i=0;i<8;i++){const spark=pool.find(e=>!e.ring&&!e.trail&&e.life===0);if(!spark)break;const a=i*Math.PI/4;spark.life=spark.max=.4+strength*.25;spark.mesh.position.set(p.landingX,p.landingY,p.landingZ);spark.vx=Math.cos(a)*(2+strength*3);spark.vz=Math.sin(a)*(2+strength*3);spark.vy=1.5+strength*2;spark.mesh.visible=true;spark.mesh.scale.setScalar(1);}
  },
  tick(p,dt,paused){
   if(paused)return;
   phase+=dt;fx.kick*=Math.exp(-dt*12);fx.impact*=Math.exp(-dt*8);
   const speed=Math.hypot(p.vx,p.vz),amount=Math.max(0,Math.min(1,(speed-14)/24));
   lines.visible=amount>0;lines.material.opacity=amount*.35;
   for(let i=0;i<16;i++){const angle=i/16*Math.PI*2,offset=(phase*2+i*.13)%1,r=.7+offset*.3,index=i*6;streaks[index]=Math.cos(angle)*r*1.4;streaks[index+1]=Math.sin(angle)*r;streaks[index+2]=-1.2;streaks[index+3]=streaks[index]*(1+amount*.3);streaks[index+4]=streaks[index+1]*(1+amount*.3);streaks[index+5]=-.8;}
   geometry.attributes.position.needsUpdate=true;
   trailTime+=dt;
   if(amount>0&&trailTime>.035){trailTime=0;const t=pool.find(e=>e.trail&&e.life===0);if(t){direction.set(p.vx,0,p.vz).normalize();t.life=t.max=.28;t.mesh.position.set(p.x-direction.x*.4,p.y-.2,p.z-direction.z*.4);t.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),direction);t.mesh.scale.set(1,1,Math.min(2,speed*.05));t.mesh.visible=true;}}
   pool.forEach(e=>{if(e.life===0)return;e.life=Math.max(0,e.life-dt);const progress=1-e.life/e.max;e.mesh.material.opacity=(1-progress)*(e.ring?.7:e.trail?.5:.8);e.mesh.visible=e.life>0;if(e.ring)e.mesh.scale.setScalar(.8+progress*4);else if(!e.trail){e.mesh.position.x+=e.vx*dt;e.mesh.position.z+=e.vz*dt;e.vy-=8*dt;e.mesh.position.y+=e.vy*dt;}});
  },
 };
 return fx;
}
