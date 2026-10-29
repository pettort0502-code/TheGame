import {world,cargoRoutes} from './world.js';
export function cargoAt(id,time=0){
 const r=cargoRoutes.find(r=>r.id===id);if(!r)return null;const a=r.phase+time*r.rate;
 return {id:r.id,x:r.x+Math.sin(a)*r.rx,y:r.y+Math.sin(a*.7)*.3,z:r.z+Math.cos(a)*r.rz,w:9,h:.8,d:5,vx:Math.cos(a)*r.rx*r.rate,vy:Math.cos(a*.7)*.21*r.rate,vz:-Math.sin(a)*r.rz*r.rate};
}
export function syncCargo(time){for(const r of cargoRoutes){const box=world.find(w=>w.cargoId===r.id);if(box)Object.assign(box,cargoAt(r.id,time));}}
