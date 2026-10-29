import * as THREE from 'three';
import {COURSE} from './trial.js';
export function courseVisuals(scene){
 const rings=COURSE.gates.map((g,index)=>{
  const group=new THREE.Group();group.position.set(g.x,g.y,g.z);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(g.radius,.045,6,48),new THREE.MeshBasicMaterial({color:'#b64af2',transparent:true,opacity:.45}));group.add(ring);
  const previous=COURSE.gates[Math.max(0,index-1)];if(index)group.rotation.y=Math.atan2(g.x-previous.x,g.z-previous.z);
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#0b142ddd';c.fillRect(0,0,512,128);c.fillStyle='#c1faff';c.textAlign='center';c.font='bold 35px sans-serif';c.fillText(`${index===0?'':index+' / '}${g.label}`,256,54);c.font='22px sans-serif';c.fillText(index===0?'NEON CIRCUIT · PRESS T TO START':index===7?'FINISH LINE':'PASS THROUGH IN ORDER',256,96);
  const label=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true}));label.scale.set(4,.98,1);label.position.y=g.radius+.7;group.add(label);scene.add(group);return {group,ring};
 });
 const guide=new THREE.BufferGeometry().setFromPoints(COURSE.gates.map(g=>new THREE.Vector3(g.x,Math.max(.04,g.y-.6),g.z)));
 const line=new THREE.Line(guide,new THREE.LineDashedMaterial({color:'#7854b0',dashSize:.7,gapSize:.7,transparent:true,opacity:.35}));line.computeLineDistances();scene.add(line);
 return {tick(trial,time){rings.forEach(({ring},i)=>{const next=trial.phase==='running'||trial.phase==='countdown'?trial.next:0,passed=trial.phase!=='idle'&&i<next;ring.material.color.set(i===next?'#51f6ff':passed?'#4dc7a2':'#cc4fff');ring.material.opacity=i===next?.95:passed?.3:.38;ring.scale.setScalar(i===next?1+Math.sin(time*3)*.025:1);});}};
}
