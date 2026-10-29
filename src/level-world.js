import {world,SPAWN,boostPads,itemPickups,enemySpawns,enemyBases,groundSpawns,cargoRoutes,breakableSurfaces} from './world.js';
import {droneRoutes} from './drones.js';
import {LEVEL_SPAWN,levelWorld,levelPads,levelTurrets,levelWalkers,levelDrones,levelCargo} from './level-data.js';
const original={world:[...world],spawn:{...SPAWN},pads:[...boostPads],pickups:itemPickups.map(p=>({...p})),enemies:[...enemySpawns],bases:[...enemyBases],walkers:[...groundSpawns],drones:[...droneRoutes],cargo:[...cargoRoutes],breakables:[...breakableSurfaces]};
function replace(a,b){a.splice(0,a.length,...b);}
export function configureWorld(campaign=true){
 replace(world,campaign?levelWorld:original.world);Object.assign(SPAWN,campaign?LEVEL_SPAWN:original.spawn);
 replace(boostPads,campaign?levelPads:original.pads);replace(enemySpawns,campaign?levelTurrets:original.enemies);replace(groundSpawns,campaign?levelWalkers:original.walkers);replace(droneRoutes,campaign?levelDrones:original.drones);replace(cargoRoutes,campaign?levelCargo:original.cargo);
 replace(enemyBases,campaign?world.filter(w=>levelTurrets.some(e=>e.id===w.id)):original.bases);replace(breakableSurfaces,campaign?world.filter(w=>w.breakable||w.collapsing):original.breakables);
 replace(itemPickups,original.pickups.map(p=>({...p,y:campaign?2.95:p.y})));
}
