export const SPAWN = { x: 0, y: .77, z: 8 };
export const MAP_SIZE=180;
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
pad('plaza-launch',0,6,0,-1,.12);
pad('east-runway',5,15,1,0);pad('west-runway',-7,15,-1,0);
pad('north-runway',6,-34,0,-1);pad('south-runway',0,32,0,1);
pad('slide-entry',15,23,0,-1);pad('south-slide-entry',0,52,0,-1);
pad('outer-east',42,7,0,1);pad('outer-west',-42,7,0,1);
pad('highline-return',0,-78,0,1);
