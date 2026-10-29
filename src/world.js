export const SPAWN = { x: 0, y: .77, z: 8 };
export const MAP_SIZE=180*Math.sqrt(3);
export const world = [];
export const boostPads=[];
function block(id,x,bottom,z,w,h,d,color='#b7b6a4',zone='Open meadow') {
  const box={id,x,y:bottom+h/2,z,w,h,d,color,zone};world.push(box);return box;
}
block('ground',0,-2,0,MAP_SIZE,2,MAP_SIZE,'#9ab893');
block('plaza',0,0,8,9,.12,9,'#d5c7aa','Central plaza');
// Low, approachable obstacles in every direction from the starting plaza.
block('practice-block',-4.5,0,0,4,2,3,'#dca77f','Block garden');
block('practice-step',3.5,0,1,3,1,3,'#d5bf91','Block garden');
block('practice-high',6.5,0,-2,3,3,3,'#cc9e75','Block garden');
block('west-step-1',-10,0,-4,4,1.5,4,'#c7b99c','Block garden');
block('west-step-2',-15,0,-7,4,3,4,'#c7b99c','Block garden');
block('west-step-3',-20,0,-10,4,4.5,4,'#c7b99c','Block garden');
block('west-step-4',-25,0,-14,5,6,5,'#c7b99c','Block garden');
block('garden-beam',-20,4.5,-14,10,.45,1.5,'#cfaa77','Block garden');
// Two pairs of wall-jump towers: solid sides and standable tops, open shafts.
for(const [prefix,cx,z,h] of [['east',14,-7,8],['north',-11,-25,10]]) {
  block(`${prefix}-left`,cx-2,0,z,.7,h,7,'#4b9ca6','Wall-jump yard');
  block(`${prefix}-right`,cx+2,0,z,.7,h,7,'#4b9ca6','Wall-jump yard');
  block(`${prefix}-ledge`,cx+4.4,h-1,z,4,.5,4,'#79a7a5','Wall-jump yard');
}
block('east-stair',10,0,1,3,2,3,'#c5b397','Wall-jump yard');
block('east-stair-2',11,0,-2,3,4,2,'#c5b397','Wall-jump yard');
block('east-rooftop',24,0,-10,6,6,6,'#c6b69b','Rooftop district');
block('east-rooftop-2',29,0,-19,6,10,6,'#b6ac99','Rooftop district');
block('east-rooftop-3',19,0,-24,6,8,6,'#d0bea2','Rooftop district');
block('east-bridge',23.5,7.5,-24,6,.45,2,'#d7b27d','Rooftop district');
// The central gantry can be reached from either side; no route is prescribed.
block('gantry-west',-4,0,-15,1.2,7,1.2,'#466774','Freerun gantry');
block('gantry-east',4,0,-15,1.2,7,1.2,'#466774','Freerun gantry');
block('gantry-beam',0,7,-15,10,.6,1.4,'#d8ae72','Freerun gantry');
block('gantry-step',0,0,-9,3,2,3,'#cebd9b','Freerun gantry');
block('gantry-step-2',-2,0,-12,3,4,3,'#b1bdab','Freerun gantry');
block('north-deck',0,5,-23,9,.6,7,'#cfba98','Freerun gantry');
block('north-post',3,0,-24,1.2,5,1.2,'#466774','Freerun gantry');
// A second playground behind the spawn rewards turning the camera around.
for(let i=0;i<5;i++)block(`south-pillar-${i}`,-10+i*5,0,20+(i%2)*4,2.5,2+i,2.5,'#cfb797','Pillar field');
block('south-beam',0,5,26,12,.5,1.8,'#d8ae72','Pillar field');
block('south-wall',14,0,22,1,5,9,'#4b9ca6','Pillar field');
block('south-wall-2',18,0,22,1,5,9,'#4b9ca6','Pillar field');
// Trees are also physical climbing surfaces, rather than unreachable decoration.
for(const [i,x,z] of [[0,-28,8],[1,27,10],[2,-20,26],[3,8,33],[4,-30,-28],[5,10,-32]]) {
  block(`tree-trunk-${i}`,x,0,z,.8,3,.8,'#9a7f63','Open meadow');
  block(`tree-crown-${i}`,x,3,z,3.8,2.3,3.8,'#729b7d','Open meadow');
  block(`tree-top-${i}`,x,5.3,z,2.6,1.4,2.6,'#81aa89','Open meadow');
}
// A tall beam above the plaza gives an immediate, forgiving place to swing.
block('plaza-swing-left',-9,0,-1,1,8.5,1,'#466774','Swing yard');
block('plaza-swing-right',9,0,-1,1,8.5,1,'#466774','Swing yard');
block('plaza-swing-beam',0,8.5,-1,19,.6,1.2,'#d8ae72','Swing yard');

// Wider testing districts surround the original playground, reachable on foot.
for(const [i,x,z,h] of [[0,-48,-20,8],[1,-57,-32,12],[2,-44,-47,16],[3,47,-26,10],[4,58,-40,15],[5,44,-54,12]]){
 block(`outer-roof-${i}`,x,0,z,8,h,8,'#b9ad98','Outer rooftops');
 block(`outer-step-${i}`,x-5,0,z+6,4,h*.45,4,'#cdbb98','Outer rooftops');
}
for(const [i,x,z,h] of [[0,-42,22,9],[1,-55,37,12],[2,-40,53,15],[3,40,25,10],[4,54,40,13],[5,41,55,16]]){
 block(`swing-post-a-${i}`,x-6,0,z,1,h,1,'#466774','Swing forest');
 block(`swing-post-b-${i}`,x+6,0,z,1,h,1,'#466774','Swing forest');
 block(`swing-beam-${i}`,x,h,z,14,.6,2,'#d8ae72','Swing forest');
}
// Low tunnels fit the sliding collider but not the standing player.
for(const [i,x,z] of [[0,15,15],[1,0,44],[2,-35,-5]]){
 block(`slide-left-${i}`,x-2,0,z,.5,1.5,9,'#4b9ca6','Slide park');
 block(`slide-right-${i}`,x+2,0,z,.5,1.5,9,'#4b9ca6','Slide park');
 block(`slide-ceiling-${i}`,x,.95,z,4.5,.35,9,'#caab7f','Slide park');
}
for(let i=0;i<6;i++)block(`long-step-${i}`,-18+i*6,0,-60,4,1.5+i*1.8,6,'#bdb59f','Highline');
block('highline',0,12,-70,48,.6,3,'#c5aa7d','Highline');
for(const x of [-22,0,22])block(`highline-post-${x}`,x,0,-70,1.2,12,1.2,'#466774','Highline');
function pad(id,x,z,dx,dz,y=0){boostPads.push({id,x,y,z,w:3,d:2.5,dx,dz,speed:24});}
pad('plaza-launch',0,2,0,-1);
pad('east-runway',5,15,1,0);pad('west-runway',-7,15,-1,0);
pad('north-runway',6,-34,0,-1);pad('south-runway',0,32,0,1);
pad('slide-entry',15,23,0,-1);pad('south-slide-entry',0,52,0,-1);
pad('outer-east',42,7,0,1);pad('outer-west',-42,7,0,1);
pad('highline-return',0,-78,0,1);

// Walk into these items to collect them. Reset restores both pickups.
export const itemPickups=[
 {id:'plaza-grapple',type:'grapple',x:-1.5,y:.95,z:5,label:'GRAPPLE GUN'},
 {id:'plaza-spear',type:'spear',x:1.5,y:.95,z:5,label:'LUNGE SPEAR'},
 {id:'plaza-hammer',type:'hammer',x:0,y:.95,z:12,label:'SHOCKWAVE HAMMER'},
];

// Outer districts triple the playable ground area while keeping the plaza familiar.
for(const [name,cx,cz] of [['North foundry',0,-112],['East reactor',112,0],['South docks',0,112],['West stacks',-112,0],['North-east spires',108,-108],['South-west spires',-108,108]]){
 for(let i=0;i<4;i++){
  const x=cx-18+i*12,z=cz+(i%2?9:-9),h=4+i*3;
  block(`expansion-${name}-roof-${i}`,x,0,z,7,h,7,'#b9ad98',name);
  block(`expansion-${name}-step-${i}`,x-5,0,z+5,4,h*.45,4,'#cdbb98',name);
 }
 block(`expansion-${name}-post-a`,cx-14,0,cz+22,1,13,1,'#466774',name);
 block(`expansion-${name}-post-b`,cx+14,0,cz+22,1,13,1,'#466774',name);
 block(`expansion-${name}-beam`,cx,13,cz+22,29,.6,2,'#d8ae72',name);
 block(`expansion-${name}-slide-left`,cx-2,0,cz-24,.5,1.5,8,'#4b9ca6',name);
 block(`expansion-${name}-slide-right`,cx+2,0,cz-24,.5,1.5,8,'#4b9ca6',name);
 block(`expansion-${name}-slide-ceiling`,cx,.95,cz-24,4.5,.35,8,'#caab7f',name);
 pad(`expansion-${name}-launch`,cx,cz-32,0,1);
}
// Launch routes connect the inner and outer districts.
for(const [i,x,z,dx,dz] of [[0,0,-86,0,-1],[1,86,0,1,0],[2,0,86,0,1],[3,-86,0,-1,0]])pad(`outbound-${i}`,x,z,dx,dz);

export const enemySpawns=[[0,-112],[112,0],[0,112],[-112,0],[108,-108],[-108,108],[65,-55],[-65,55],[45,45],[-45,-45],[85,85],[-85,-85],[120,70],[-120,-70],[70,-120],[-70,120]].map(([x,z],i)=>({id:`sentry-${i}`,x:x+18,y:1.6,z}));
for(const e of enemySpawns)block(e.id,e.x,0,e.z,1.4,1.2,1.4,'#d36a8e','Sentry territory');

export const enemyBases=world.filter(w=>enemySpawns.some(e=>e.id===w.id));
export const groundSpawns=[[30,38],[-30,-38],[75,15],[-75,-15],[15,100],[-15,-100],[110,75],[-110,-75],[55,75],[-55,-75],[105,-60],[-105,60]].map(([x,z],i)=>({id:`walker-${i}`,x,y:.75,z,armored:i>=8}));

// Vertical playgrounds: alternating ledges stay within a single grapple's reach.
for(const [index,cx,cz] of [[0,78,80],[1,-78,-80],[2,0,-132],[3,126,24]]){
 const zone=['Skyforge towers','Neon ascent','Cloud gantry','Reactor highrise'][index];
 for(const side of [-1,1]){
  const x=cx+side*10;
  block(`sky-${index}-tower-${side}`,x,0,cz,2,48,2,'#466774',zone);
  for(let level=0;level<6;level++){
   const y=4+level*8,z=cz+(level%2?4:-4);
   block(`sky-${index}-ledge-${side}-${level}`,x,y,z,7,.6,7,'#c6b69b',zone);
   block(`sky-${index}-hook-${side}-${level}`,x,y+5,z,1.2,.7,1.2,'#4b9ca6',zone);
  }
 }
 for(let level=0;level<3;level++)block(`sky-${index}-bridge-${level}`,cx,12+level*16,cz,22,.5,2,'#d8ae72',zone);
 block(`sky-${index}-crown`,cx,52,cz,24,.7,7,'#d8ae72',zone);
 block(`sky-${index}-crown-hook`,cx,59,cz,2,1,2,'#4b9ca6',zone);
 block(`sky-${index}-entry`,cx,0,cz+10,5,2,5,'#c5b397',zone);
 pad(`sky-${index}-launch`,cx,cz+18,0,-1);
}

export const cargoRoutes=[
 {id:'cargo-river',x:0,y:4,z:-42,rx:20,rz:5,rate:.16,phase:0},
 {id:'cargo-reactor',x:108,y:14,z:0,rx:8,rz:12,rate:.13,phase:1},
 {id:'cargo-skyforge',x:78,y:32,z:80,rx:22,rz:10,rate:.12,phase:2},
];
for(const r of cargoRoutes){const w=block(r.id,r.x,r.y-.4,r.z,9,.8,5,'#466774','Cargo lanes');w.cargoId=r.id;}
for(const [i,x,z] of [[0,-10,7],[1,35,5],[2,-36,-16],[3,70,60],[4,-70,-60],[5,115,-30]]){
 const glass=block(`glass-panel-${i}`,x,0,z,.2,3.2,6,'#44dcdd','Breakable glass');glass.breakable=true;
 const sign=block(`neon-sign-${i}`,x+4,2,z,3,1.5,.2,'#ff70cf','Breakable signs');sign.breakable=true;
}
for(const [i,cx,cz] of [[0,78,80],[1,-78,-80],[2,126,24]]){const bridge=block(`glass-bridge-${i}`,cx,20,cz,22,.3,3,'#44dcdd','Glass skybridge');bridge.breakable=true;}
export const breakableSurfaces=world.filter(w=>w.breakable);
