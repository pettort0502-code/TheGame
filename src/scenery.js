import {world} from './world.js';
export function shatter(w,p){
 if(!w?.breakable||w.destroyed)return false;
 w.destroyed=true;const index=world.indexOf(w);if(index>=0)world.splice(index,1);
 (p.breakEvents??=[]).push({x:w.x,y:w.y,z:w.z});return true;
}
