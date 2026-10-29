import * as THREE from 'three';

const surfaces=new Map(),trims=new Map();
function surface(color){
 if(!surfaces.has(color))surfaces.set(color,new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.9,roughness:.72,metalness:.25}));
 return surfaces.get(color);
}
function trim(color){
 if(!trims.has(color))trims.set(color,new THREE.LineBasicMaterial({color,transparent:true,opacity:.85,toneMapped:false}));
 return trims.get(color);
}
function blockStyle(w){
 const id=w.id;
 if(w.collapsing)return {body:'#3c242c',accent:'#ff9a48'};
 if(w.breakable)return {body:'#12454f',accent:w.id.includes('sign')?'#ff70cf':'#7ffff5'};
 if(w.cargoId)return {body:'#263244',accent:'#ffcf70'};
 if(id==='ground')return {body:'#111729',accent:'#164456'};
 if(id==='plaza')return {body:'#1b2339',accent:'#32eaff'};
 if(id.startsWith('tree-'))return {body:'#132d33',accent:'#38bb9e'};
 if(w.color==='#4b9ca6'||w.color==='#79a7a5')return {body:'#103440',accent:'#32eaff'};
 if(id.includes('beam')||id.includes('bridge')||id==='highline')return {body:'#25213e',accent:'#b78aff'};
 if(id.includes('post')||id.includes('swing-left')||id.includes('swing-right')||id==='gantry-west'||id==='gantry-east')return {body:'#19283d',accent:'#24d6e9'};
 if(id.includes('ceiling'))return {body:'#281e3a',accent:'#ff62c9'};
 return {body:'#25243d',accent:'#dc72f5'};
}
// Smooth, dark panels with luminous edge trim. Geometry stays identical to physics.
export function neonBlock(w){
 const style=blockStyle(w),geometry=new THREE.BoxGeometry(w.w,w.h,w.d);
 const body=(w.breakable||w.collapsing)?surface(style.body).clone():surface(style.body);if(w.breakable){body.transparent=true;body.opacity=.4;body.depthWrite=false;}
 const mesh=new THREE.Mesh(geometry,body);
 mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry),trim(style.accent)));
 return mesh;
}
const equipment=new Map();
const colors={
 '#d97552':['#18253e','#17233c',.12],
 '#efcfaa':['#35465f','#183f51',.14],
 '#35566a':['#173343','#0c7385',.3],
 '#4b9ca6':['#183848','#14cddd',.35],
 '#d8a16e':['#303149','#172a41',.1],
 '#9b7656':['#30213e','#754ba8',.25],
 '#d9e5df':['#e9ccff','#e339ff',1.1],
 '#dbaf61':['#ef7fc7','#ff3ca6',.8],
 '#7bd9de':['#8dfbff','#20ecff',1.8],
};
export function equipmentMaterial(color){
 if(!colors[color])return null;
 if(!equipment.has(color)){
  const [base,emissive,emissiveIntensity]=colors[color];
  equipment.set(color,new THREE.MeshStandardMaterial({color:base,emissive,emissiveIntensity,roughness:.42,metalness:.45}));
 }
 return equipment.get(color);
}
// A soft radial halo is shared by pickups and target markers, without a costly
// fullscreen bloom pass that could affect movement responsiveness on mobile.
export function glowMaterial(color){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
 const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,2,32,32,32);
 gradient.addColorStop(0,'rgba(255,255,255,.65)');gradient.addColorStop(.25,'rgba(255,255,255,.2)');gradient.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
 return new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),color,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
}
