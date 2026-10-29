import * as THREE from 'three';
export function enemyVisuals(scene,combat){
 const red=new THREE.MeshBasicMaterial({color:'#ff407e'}),metal=new THREE.MeshStandardMaterial({color:'#3c1937',emissive:'#6b1540',emissiveIntensity:.8});
 const sentries=combat.sentries.map(e=>{
  if(e.kind==='drone')return null;
  const head=new THREE.Group();head.position.set(e.x,e.y,e.z);
  const core=new THREE.Mesh(e.kind==='walker'?new THREE.BoxGeometry(1,.9,1):new THREE.OctahedronGeometry(.65),metal);head.add(core);
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.15,.21,1,8),red);barrel.rotation.x=Math.PI/2;barrel.position.z=.5;head.add(barrel);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.9,.045,6,24),red);ring.rotation.x=Math.PI/2;head.add(ring);scene.add(head);return {head,core,ring};
 });
 const blastGeometry=new THREE.TorusGeometry(1,.08,6,24);
 const blasts=Array.from({length:24},()=>{const m=new THREE.Mesh(blastGeometry,red);scene.add(m);m.visible=false;return m;});
 const geometry=new THREE.SphereGeometry(.14,6,5),shots=Array.from({length:64},()=>{const m=new THREE.Mesh(geometry,red);m.visible=false;scene.add(m);return m;});
 return {tick(c,p,time){
  c.sentries.forEach((e,i)=>{const v=sentries[i];if(!v)return;v.head.visible=!e.dead;v.head.position.set(e.x,e.y,e.z);v.head.lookAt(p.x,e.y,p.z);v.core.rotation.y=time;v.ring.scale.setScalar(1+e.charge*.65);v.ring.rotation.z=time*2;});
  blasts.forEach((m,i)=>{const b=c.bursts[i];m.visible=Boolean(b);if(b){m.position.set(b.x,b.y,b.z);m.rotation.set(b.shockwave?-Math.PI/2:time*2,b.shockwave?0:time,0);m.scale.setScalar(b.shockwave?1+(.6-b.life)*10:1+(.6-b.life)*5);}});
  shots.forEach((m,i)=>{const s=c.shots[i];m.visible=Boolean(s);if(s)m.position.set(s.x,s.y,s.z);});
 }};
}
