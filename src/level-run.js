import {checkpoints,chapters,requiredByStage,portal,routeNodes} from './level-data.js';
import {world,itemPickups} from './world.js';
import {newPlayer} from './physics.js';
export function newRun(){return {stage:0,elapsed:0,deaths:0,completed:false,loadout:[],equipped:null,nav:0,escapeRemaining:120,revision:0};}
export function remainingGuards(run,combat){return combat.sentries.filter(e=>requiredByStage[run.stage]?.includes(e.id)&&!e.dead);}
export function activateStage(run,p,combat){
 p.campaign=true;p.levelStage=run.stage;p.enemyTargets=combat.sentries;
 for(const e of combat.sentries){e.active=e.levelStage===run.stage;if(!e.active)e.charge=0;
  if(e.levelStage<run.stage){e.dead=true;const base=world.find(w=>w.id===e.id);if(base){base.destroyed=true;world.splice(world.indexOf(base),1);}}
 }
}
function armory(p,cp){
 p.thrownItems=[];p.recoverableItems=[];p.pickupPositions={};p.pickupDelay={};
 for(const item of itemPickups)if(!p.inventory.includes(item.type))p.pickupPositions[item.id]={x:cp.x+(item.type==='grapple'?-2:item.type==='spear'?2:0),y:cp.y+.15,z:cp.z+(item.type==='hammer'?3:-3)};
}
export function checkpointSpawn(run,p,combat,countDeath=false){
 const cp=checkpoints[run.stage],time=p.time,falls=p.falls;
 if(countDeath)run.deaths++;
 Object.assign(p,newPlayer(),cp,{time,falls,campaign:true,inventory:[...run.loadout],equipped:run.loadout.includes(run.equipped)?run.equipped:run.loadout[0]||null,respawnPoint:{x:cp.x,y:cp.y,z:cp.z},killHeight:cp.y-24});
 p.collectedPickups=itemPickups.filter(i=>p.inventory.includes(i.type)).map(i=>i.id);
 armory(p,cp);activateStage(run,p,combat);combat.shots=[];combat.falls=p.falls;combat.invulnerable=3;combat.flash=countDeath?.18:0;combat.seenShockwaves=0;
 run.nav=0;run.escapeRemaining=120;run.revision++;
 return cp;
}
export function objective(run,combat){
 if(run.completed)return 'Level 01 complete · Level 02 coming soon';
 if(run.stage===chapters.length)return 'Portal powered · enter the gateway to finish Level 01';
 const guards=remainingGuards(run,combat).length;
 return `${chapters[run.stage].name} · ${guards?`${guards} relay guard${guards===1?'':'s'} remaining`:'Relay clear · reach the checkpoint beacon'}`;
}
export function tickRun(run,p,combat,dt,hit=false,previousFalls=p.falls){
 if(run.completed)return null;
 run.elapsed+=dt;
 const cp=checkpoints[run.stage];
 if(run.stage===7)run.escapeRemaining=Math.max(0,run.escapeRemaining-dt);
 if(hit||p.falls!==previousFalls||run.stage===7&&run.escapeRemaining===0)return 'death';
 if(Math.hypot(p.x-cp.x,p.z-cp.z)<7&&Math.abs(p.y-cp.y)<3){run.loadout=[...p.inventory];run.equipped=p.equipped;}
 // Escape decks warn for 1.2 seconds after landing, then fall away.
 for(const w of [...world])if(w.collapsing&&!w.destroyed){
  if(p.grounded&&Math.abs(p.x-w.x)<w.w/2&&Math.abs(p.z-w.z)<w.d/2&&Math.abs(p.y-.65-w.y-w.h/2)<.08)w.collapseTimer=Math.max(w.collapseTimer||0,.001);
  if(w.collapseTimer>0){w.collapseTimer+=dt;if(w.collapseTimer>=1.2){w.destroyed=true;world.splice(world.indexOf(w),1);}}
 }
 if(run.stage===chapters.length){if(Math.abs(p.x-portal.x)<2.5&&Math.abs(p.y-portal.y)<3&&Math.abs(p.z-portal.z)<1.5){run.completed=true;run.revision++;return 'complete';}return null;}
 const nodes=routeNodes[run.stage];
 for(let i=run.nav;i<nodes.length;i++)if(Math.hypot(p.x-nodes[i].x,p.z-nodes[i].z)<8&&Math.abs(p.y-nodes[i].y)<8)run.nav=Math.min(i+1,nodes.length-1);
 const next=checkpoints[run.stage+1];
 if(Math.hypot(p.x-next.x,p.z-next.z)<3.3&&Math.abs(p.y-next.y)<2.2&&remainingGuards(run,combat).length===0){
  run.stage++;run.nav=0;run.loadout=[...p.inventory];run.equipped=p.equipped;run.revision++;
  const saved=checkpoints[run.stage];p.respawnPoint={x:saved.x,y:saved.y,z:saved.z};p.killHeight=saved.y-24;p.grapple=null;p.grappleCharge=0;p.requireRelease=p.useHeld;
  armory(p,saved);activateStage(run,p,combat);combat.shots=[];combat.invulnerable=3;run.escapeRemaining=120;return 'checkpoint';
 }
 return null;
}
