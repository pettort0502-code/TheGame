export const COURSE={
 id:'neon-circuit-v1',name:'Neon Circuit',start:{x:26,y:.65,z:20},
 gates:[
  {x:26,y:1.2,z:20,radius:2.6,label:'START'},
  {x:34,y:1.3,z:30,radius:2.5,label:'BOOST'},
  {x:34,y:.48,z:42,radius:.72,label:'SLIDE'},
  {x:47,y:4.7,z:47,radius:2.1,label:'ROOFTOP'},
  {x:60,y:7.1,z:56,radius:2.1,label:'SKY CROSSING'},
  {x:70,y:1.3,z:42,radius:2.5,label:'LANDING'},
  {x:64,y:1.3,z:22,radius:2.5,label:'RETURN'},
  {x:40,y:1.3,z:20,radius:2.5,label:'FINISH'},
 ],
};
export function newTrial(best=null){return {phase:'idle',countdown:3,elapsed:0,next:1,best:typeof best==='number'&&Number.isFinite(best)&&best>0?best:null,medal:null,revision:0};}
export function beginTrial(t){Object.assign(t,{phase:'countdown',countdown:3,elapsed:0,next:1,medal:null});t.revision++;}
export function cancelTrial(t){t.phase='idle';t.elapsed=0;t.next=1;}
function crosses(a,b,g){
 const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,length=dx*dx+dy*dy+dz*dz;
 const q=length?Math.max(0,Math.min(1,((g.x-a.x)*dx+(g.y-a.y)*dy+(g.z-a.z)*dz)/length)):0;
 return Math.hypot(a.x+dx*q-g.x,a.y+dy*q-g.y,a.z+dz*q-g.z)<=g.radius;
}
export function tickTrial(t,before,after,dt){
 if(t.phase==='countdown'){t.countdown=Math.max(0,t.countdown-dt);if(t.countdown===0){t.phase='running';t.revision++;}return;}
 if(t.phase!=='running')return;
 if(after.falls>before.falls){t.phase='failed';t.revision++;return;}
 t.elapsed+=dt;
 const gate=COURSE.gates[t.next];
 if(crosses(before,after,gate)){
  t.next++;t.revision++;
  if(t.next===COURSE.gates.length){t.phase='finished';t.medal=t.elapsed<=25?'GOLD':t.elapsed<=40?'SILVER':t.elapsed<=65?'BRONZE':'FINISH';if(t.best===null||t.elapsed<t.best)t.best=t.elapsed;}
 }
}
export function formatTime(seconds){const ticks=Math.floor(Math.max(0,seconds)*100);return `${Math.floor(ticks/6000)}:${((ticks%6000)/100).toFixed(2).padStart(5,'0')}`;}
