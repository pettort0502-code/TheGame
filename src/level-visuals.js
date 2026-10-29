import * as THREE from 'three';
import {laserPhase} from './level-hazards.js';
import {checkpoints,chapters,routeNodes,portal,levelLasers} from './level-data.js';
export function levelVisuals(scene){
 function label(text){const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#0b1029dd';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#c1faff';ctx.font='bold 38px sans-serif';ctx.textAlign='center';ctx.fillText(text,512,78);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),depthWrite:false}));sprite.scale.set(11,1.4,1);return sprite;}
 const beacons=checkpoints.map((cp,i)=>{
  const group=new THREE.Group();group.position.set(cp.x,cp.y-.61,cp.z);
  const material=new THREE.MeshBasicMaterial({color:'#6ffaff',transparent:true,opacity:.8});
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.5,.055,6,40),material);ring.rotation.x=-Math.PI/2;group.add(ring);
  for(const side of [-1,1]){const pillar=new THREE.Mesh(new THREE.BoxGeometry(.08,5,.08),material);pillar.position.set(side*3,2.5,0);group.add(pillar);}
  const sign=label(`${String(i+1).padStart(2,'0')} / ${i===0?'ENTRY DOCK':chapters[i-1].name.toUpperCase()}`);sign.position.y=6;group.add(sign);scene.add(group);return {group,ring,material};
 });
 const paths=routeNodes.map(nodes=>{
  const points=[];for(let i=0;i<nodes.length-1;i++){const a=nodes[i],b=nodes[i+1],d=Math.hypot(b.x-a.x,b.z-a.z)||1,dx=(b.x-a.x)/d,dz=(b.z-a.z)/d;
   for(const side of [-1,1]){points.push(new THREE.Vector3(a.x-dx*.7+dz*side*.5,a.y-.60,a.z-dz*.7-dx*side*.5),new THREE.Vector3(a.x+dx*.6,a.y-.60,a.z+dz*.6));}}
  const mesh=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#5cffff',transparent:true,opacity:.9}));scene.add(mesh);return mesh;
 });
 const lasers=levelLasers.map(l=>{
  const group=new THREE.Group();group.position.set(l.x,l.y,l.z);
  const material=new THREE.MeshBasicMaterial({color:'#ff356d',transparent:true,opacity:.85});const beam=new THREE.Mesh(new THREE.BoxGeometry(l.w,l.h,l.d),material);group.add(beam);
  for(const side of [-1,1]){const post=new THREE.Mesh(new THREE.BoxGeometry(.22,1.5,.4),new THREE.MeshBasicMaterial({color:'#e9517a'}));post.position.set(side*(l.w/2+.1),-.15,0);group.add(post);}
  const sign=label('TIMED LASER / JUMP OR WAIT');sign.scale.set(7,.9,1);sign.position.y=2.4;group.add(sign);scene.add(group);return {l,group,beam,material,sign};
 });
 const gate=new THREE.Group();gate.position.set(portal.x,portal.y,portal.z);scene.add(gate);
 const outer=new THREE.Mesh(new THREE.TorusGeometry(2.7,.13,8,64),new THREE.MeshBasicMaterial({color:'#ce69ff'}));gate.add(outer);
 const inner=new THREE.Mesh(new THREE.TorusGeometry(2.4,.045,6,64),new THREE.MeshBasicMaterial({color:'#65ffff'}));gate.add(inner);
 const disk=new THREE.Mesh(new THREE.CircleGeometry(2.35,64),new THREE.MeshBasicMaterial({color:'#6b3cae',side:THREE.DoubleSide,transparent:true,opacity:.35,depthWrite:false}));gate.add(disk);
 const spokes=new THREE.Group();for(let i=0;i<12;i++){const arc=new THREE.Mesh(new THREE.TorusGeometry(.35+i*.16,.018,4,32,Math.PI*1.2),new THREE.MeshBasicMaterial({color:i%2?'#ab66ff':'#5ceeff',transparent:true,opacity:.5}));arc.rotation.z=i;spokes.add(arc);}gate.add(spokes);
 const sign=label('LEVEL 02 / LINK PENDING');sign.position.y=4;gate.add(sign);
 return {tick(run,time,simulationTime=time){lasers.forEach(v=>{v.group.visible=v.l.levelStage===run.stage;const phase=laserPhase(v.l,simulationTime);v.beam.visible=phase!=='off';v.material.color.setHex(phase==='warning'?0xffca63:0xff356d);v.material.opacity=phase==='warning'?.15+Math.abs(Math.sin(simulationTime*20))*.35:.9;v.sign.visible=phase!=='off';});beacons.forEach((b,i)=>{b.group.visible=i<=run.stage+1;b.material.color.setHex(i<=run.stage?0x6bffc4:0xffca68);b.ring.scale.setScalar(1+Math.sin(time*3)*.025);});paths.forEach((p,i)=>p.visible=i===run.stage);outer.rotation.z=time*.15;inner.rotation.z=-time*.3;spokes.rotation.z=time*.4;gate.scale.setScalar(run.stage===8?1:.92);disk.material.opacity=run.stage===8?.5:.15;}};
}
