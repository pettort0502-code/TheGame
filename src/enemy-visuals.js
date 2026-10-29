import * as THREE from 'three';
export function enemyVisuals(scene,combat){
 const red=new THREE.MeshBasicMaterial({color:'#ff407e'}),metal=new THREE.MeshStandardMaterial({color:'#3c1937',emissive:'#6b1540',emissiveIntensity:.8});
 const sentries=combat.sentries.map(e=>{
  if(e.kind==='drone')return null;
  const head=new THREE.Group();head.position.set(e.x,e.y,e.z);
  const core=new THREE.Mesh(e.kind==='walker'?new THREE.BoxGeometry(e.armored?1.3:1,e.armored?1.1:.9,1):new THREE.OctahedronGeometry(.65),metal.clone());head.add(core);
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.15,.21,1,8),red);barrel.rotation.x=Math.PI/2;barrel.position.z=.5;head.add(barrel);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.9,.045,6,24),red);ring.rotation.x=Math.PI/2;head.add(ring);const weak=new THREE.Mesh(new THREE.SphereGeometry(.23,10,8),new THREE.MeshBasicMaterial({color:'#baff62'}));weak.position.y=.55;weak.visible=Boolean(e.armored);head.add(weak);
  const warning=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:'#ffb347',transparent:true,opacity:.6}));scene.add(warning);
  scene.add(head);return {head,core,ring,weak,warning};
 });
 const blastGeometry=new THREE.TorusGeometry(1,.08,6,24);
 const blasts=Array.from({length:24},()=>{const m=new THREE.Mesh(blastGeometry,red);scene.add(m);m.visible=false;return m;});
 const debris=new THREE.InstancedMesh(new THREE.BoxGeometry(.1,.1,.1),new THREE.MeshBasicMaterial({color:'#ffffff'}),192);debris.frustumCulled=false;scene.add(debris);const dummy=new THREE.Object3D(),color=new THREE.Color();
 const geometry=new THREE.SphereGeometry(.14,6,5),shots=Array.from({length:64},()=>{const m=new THREE.Mesh(geometry,red);m.visible=false;scene.add(m);return m;});
 return {tick(c,p,time){
  c.sentries.forEach((e,i)=>{const v=sentries[i];if(!v)return;v.head.visible=!e.dead;v.head.position.set(e.x,e.y,e.z);v.head.lookAt(p.x,e.y,p.z);v.core.rotation.y=time;v.core.material.emissive.setHex(e.hitFlash>0?0xffffff:e.armored?0x885517:0x6b1540);v.weak.scale.setScalar(1+Math.sin(time*7)*.12);v.warning.visible=!e.dead&&e.charge>0;if(v.warning.visible){const positions=v.warning.geometry.attributes.position;positions.setXYZ(0,e.x,e.y,e.z);positions.setXYZ(1,p.x,p.y,p.z);positions.needsUpdate=true;v.warning.geometry.computeBoundingSphere();v.warning.material.opacity=.2+e.charge*.7;}v.ring.scale.setScalar(1+e.charge*.65);v.ring.rotation.z=time*2;});
  blasts.forEach((m,i)=>{const b=c.bursts[i];m.visible=Boolean(b);if(b){m.position.set(b.x,b.y,b.z);m.rotation.set(b.shockwave?-Math.PI/2:time*2,b.shockwave?0:time,0);m.scale.setScalar(b.shockwave?1+(.6-b.life)*10:1+(.6-b.life)*5);}});
  let count=0;for(const b of c.bursts){if(b.shockwave)continue;const age=(b.sparks?.3:.6)-b.life;for(let j=0;j<8&&count<192;j++){
   const angle=j*2.39996,speed=b.sparks?4:7;dummy.position.set(b.x+Math.cos(angle)*age*speed,b.y+age*(2+j%3)-age*age*8,b.z+Math.sin(angle)*age*speed);dummy.rotation.set(age*8+j,age*5+j,0);dummy.scale.setScalar(Math.max(.1,b.life/(b.sparks?.3:.6))*(b.sparks?.6:1.8));dummy.updateMatrix();debris.setMatrixAt(count,dummy.matrix);color.setHex(b.sparks?0xffe38a:0xff68bb);debris.setColorAt(count,color);count++;
  }}debris.count=count;debris.instanceMatrix.needsUpdate=true;if(debris.instanceColor)debris.instanceColor.needsUpdate=true;
  shots.forEach((m,i)=>{const s=c.shots[i];m.visible=Boolean(s);if(s)m.position.set(s.x,s.y,s.z);});
 }};
}
