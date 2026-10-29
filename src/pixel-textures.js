import * as THREE from 'three';

// Original, deterministic 16x16 tiles. All pixels are generated locally;
// there are no external assets, downloads, or Minecraft textures.
const SIZE=16;
const palettes={
 grass:['#658a39','#739b40','#7da64a','#588034','#8aaf52'],
 dirt:['#79513a','#8b6042','#9d704b','#684432','#aa7b54'],
 stone:['#8b9292','#a1a7a4','#777f80','#b0b4ad','#969c98'],
 sandstone:['#b8a474','#c6b584','#d6c496','#a69265','#decda0'],
 brick:['#a76346','#ba7653','#96543f','#c1865d','#854d3c'],
 stonebrick:['#87908b','#9da69c','#737e79','#adb4a7','#64736c'],
 planks:['#9b7044','#b18650','#bd945d','#805b39','#c59b65'],
 bark:['#6e5036','#805d3d','#9a744b','#59432f','#a17e52'],
 endgrain:['#ad8752','#c19c63','#947142','#d0ac74','#7b603a'],
 leaves:['#477846','#578d4d','#679955','#3a6a3b','#7aa85b'],
 steel:['#3e5963','#4a6a73','#587f87','#334d57','#6c9095'],
 cyanmetal:['#40848a','#4e9b9e','#62aeb0','#326d77','#79bfc0'],
 cloth:['#bd6042','#d7774e','#df885d','#ae533d','#e59565'],
 skin:['#e3ba8d','#edc99c','#d5aa80','#f2d4ad','#e0b688'],
 iron:['#bccac6','#d4dfd7','#9eafad','#e0e7dd','#839999'],
 gold:['#c69b4f','#dfb966','#b1853e','#ecd18a','#957139'],
};
function makePixels(kind){
 const colors=palettes[kind];let seed=Array.from(kind).reduce((n,c)=>n*31+c.charCodeAt(0),7)>>>0;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const pixels=new Uint8Array(SIZE*SIZE*4);
 const rgb=colors.map(hex=>{const n=parseInt(hex.slice(1),16);return [n>>16,(n>>8)&255,n&255];});
 for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
  let index=Math.floor(rand()*colors.length);
  if(kind==='brick'||kind==='stonebrick'){
   const row=Math.floor(y/8),offset=row%2?8:0;
   if(y%8===0||(x+offset)%16===0)index=kind==='brick'?3:4;
   else if(y%8===1)index=1;
   else index=rand()<.65?0:index;
  }
  if(kind==='planks'){if(y%4===0)index=3;else if(y%4===1)index=2;else if((x+Math.floor(y/4)*5)%16<2)index=0;}
  if(kind==='bark'){index=[0,1,3,1,2,0,1,3][Math.floor(x/2)];if(rand()<.12)index=4;}
  if(kind==='endgrain'){const ring=Math.floor(Math.max(Math.abs(x-7.5),Math.abs(y-7.5)));index=ring%3===0?4:ring%3===1?0:1;}
  if(kind==='steel'||kind==='cyanmetal'){
   if(x===0||y===0)index=3;else if(x===1||y===1)index=2;else if((x===3||x===12)&&(y===3||y===12))index=4;else index=rand()<.85?0:1;
  }
  if(kind==='sandstone'){if(y%8===0||x%8===0)index=3;else if(y%8===1||x%8===1)index=4;}
  if(kind==='cloth'||kind==='skin')index=rand()<.86?1:kind==='cloth'?(x%4===0?0:2):0;
  const i=(y*SIZE+x)*4;pixels.set([...rgb[index],255],i);
 }
 return pixels;
}
const textureCache=new Map(),materialCache=new Map();
export function pixelTexture(kind){
 if(!textureCache.has(kind)){
  const texture=new THREE.DataTexture(makePixels(kind),SIZE,SIZE,THREE.RGBAFormat);
  texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestMipmapNearestFilter;
  texture.generateMipmaps=true;texture.needsUpdate=true;texture.name=`pixel-${kind}`;textureCache.set(kind,texture);
 }
 return textureCache.get(kind);
}
export function pixelMaterial(kind){
 if(!materialCache.has(kind))materialCache.set(kind,new THREE.MeshStandardMaterial({map:pixelTexture(kind),roughness:kind==='iron'||kind==='gold'?.65:.95,metalness:kind==='iron'||kind==='gold'?.25:0}));
 return materialCache.get(kind);
}
export function blockStyle(block){
 const id=block.id;
 if(id==='ground')return {side:'dirt',top:'grass'};
 if(id.startsWith('tree-trunk'))return {side:'bark',top:'endgrain'};
 if(id.startsWith('tree-crown')||id.startsWith('tree-top'))return {side:'leaves',top:'leaves'};
 if(id==='plaza')return {side:'sandstone',top:'sandstone'};
 if(id.includes('beam')||id.includes('bridge')||id==='highline'||id.includes('ceiling'))return {side:'planks',top:'planks'};
 if(id.includes('post')||id.startsWith('plaza-swing')||id.startsWith('gantry-west')||id.startsWith('gantry-east'))return {side:'steel',top:'iron'};
 if(block.color==='#4b9ca6'||block.color==='#79a7a5')return {side:'cyanmetal',top:'iron'};
 if(id.startsWith('practice'))return {side:'brick',top:'sandstone'};
 if(id.startsWith('outer-roof')||id.startsWith('east-rooftop'))return {side:'stonebrick',top:'stone'};
 return {side:'stonebrick',top:'sandstone'};
}
export function texturedBlock(block){
 const style=blockStyle(block),geometry=new THREE.BoxGeometry(block.w,block.h,block.d);
 // Scale UVs by real face dimensions: one 16px tile per world metre.
 // Textures/materials are shared, so the large ground needs no huge image.
 const uv=geometry.attributes.uv;
 const dimensions=[[block.d,block.h],[block.d,block.h],[block.w,block.d],[block.w,block.d],[block.w,block.h],[block.w,block.h]];
 dimensions.forEach(([w,h],face)=>{for(let v=0;v<4;v++){const i=face*4+v;uv.setXY(i,uv.getX(i)*w,uv.getY(i)*h);}});
 const side=pixelMaterial(style.side),top=pixelMaterial(style.top);
 const mesh=new THREE.Mesh(geometry,[side,side,top,side,side,side]);mesh.userData.pixelStyle=style;return mesh;
}
const colorKinds={
 '#d97552':'cloth','#efcfaa':'skin','#35566a':'steel','#4b9ca6':'cyanmetal',
 '#d8a16e':'planks','#9b7656':'bark','#d9e5df':'iron','#dbaf61':'gold',
};
export function equipmentMaterial(color){return colorKinds[color]?pixelMaterial(colorKinds[color]):null;}
