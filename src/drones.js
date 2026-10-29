export const droneRoutes=[
 ...[[0,-112],[112,0],[0,112],[-112,0],[108,-108],[-108,108]].map(([x,z],i)=>({id:`outer-drone-${i}`,x,y:16,z,rx:5,rz:4,rate:.4,phase:i})),
 {id:'plaza-drone',x:0,y:9,z:-5,rx:4,rz:2,rate:.5,phase:0},
 {id:'course-drone-a',x:42,y:10,z:44,rx:3,rz:3,rate:.55,phase:1},
 {id:'course-drone-b',x:55,y:13,z:53,rx:3,rz:2,rate:.45,phase:2},
 {id:'forest-drone',x:-42,y:14,z:38,rx:5,rz:4,rate:.4,phase:3},
];
export function droneAt(id,time=0){
 const route=droneRoutes.find(d=>d.id===id);if(!route)return null;
 const a=time*route.rate+route.phase;
 return {id,x:route.x+Math.sin(a)*route.rx,y:route.y+Math.sin(a*1.4)*.7,z:route.z+Math.cos(a)*route.rz,vx:Math.cos(a)*route.rx*route.rate,vy:Math.cos(a*1.4)*.7*route.rate*1.4,vz:-Math.sin(a)*route.rz*route.rate,w:1.2,h:.5,d:1.2};
}
export function resolveAnchor(target,time=0){
 if(!target?.droneId)return target;
 const drone=droneAt(target.droneId,time),o=target.offset;if(!drone||!o)return null;
 if(![o.x,o.y,o.z].every(Number.isFinite)||Math.abs(o.x)>.65||Math.abs(o.y)>.30||Math.abs(o.z)>.65)return null;
 if(![Math.abs(Math.abs(o.x)-.6),Math.abs(Math.abs(o.y)-.25),Math.abs(Math.abs(o.z)-.6)].some(d=>d<=.065))return null;
 return {...target,x:drone.x+o.x,y:drone.y+o.y,z:drone.z+o.z,anchorVx:drone.vx,anchorVy:drone.vy,anchorVz:drone.vz};
}
