export const LEVEL_NAME='Level 01 · Blackout Spire / Brutal';
export const HARD_RULES={escapeSeconds:60,collapseSeconds:.45};
export const levelLasers=[];
// Heights are walking surfaces. Checkpoints sit on permanent relay decks.
export const chapters=[
 {name:'Dock infiltration',hint:'Choose two items. Cross the broken dock and defeat its relay guards.',path:[[0,2,8],[0,2,-22],[18,4,-50],[-6,6,-78],[12,8,-104],[0,10,-130]]},
 {name:'The switchback tower',hint:'Chain grapple climbs or wall kicks. Clear the rooftop relay.',path:[[0,10,-130],[35,16,-150],[65,22,-152],[100,28,-170],[70,34,-190],[85,40,-210]]},
 {name:'Freight interception',hint:'Board the moving cargo or use the outer ledges. Destroy the freight guard.',path:[[85,40,-210],[110,42,-235],[85,42,-265],[45,42,-285],[65,42,-310],[15,42,-340]]},
 {name:'Glass chasm',hint:'Use the anchors over fragile bridges. Clear the drone patrol.',path:[[15,42,-340],[-25,44,-360],[-60,48,-375],[-35,52,-398],[-85,58,-430]]},
 {name:'Foundry lockdown',hint:'Use cover, throws and recalls to clear the foundry security squad.',path:[[-85,58,-430],[-120,58,-465],[-75,60,-490],[-110,62,-525],[-40,64,-570]]},
 {name:'High-voltage ascent',hint:'Climb the exposed gantries. V grinds along walls; Space kicks away.',path:[[-40,64,-570],[0,70,-585],[35,76,-590],[5,84,-610],[45,92,-630],[60,102,-650]]},
 {name:'Reactor shutdown',hint:'Destroy the three armored cores and their guards. Aim for green weak points.',path:[[60,102,-650],[85,108,-680],[45,116,-715],[0,124,-755],[0,124,-790]]},
 {name:'Emergency evacuation',hint:'Escape before overload. 60 seconds to escape. Orange ledges collapse in under a second.',path:[[0,124,-790],[-25,128,-815],[15,132,-842],[-10,136,-870],[25,134,-900],[0,132,-930]]},
];
export const checkpoints=[{x:0,y:2.65,z:8,name:'Entry dock'},...chapters.map(c=>{const [x,y,z]=c.path.at(-1);return {x,y:y+.65,z,name:c.name};})];
export const portal={x:0,y:134.5,z:-950};
export const LEVEL_SPAWN=checkpoints[0];
export const levelWorld=[],levelPads=[],levelTurrets=[],levelWalkers=[],levelDrones=[],levelCargo=[],routeNodes=[];
function box(id,x,top,z,w=8,h=1,d=10,extras={}){const b={id,x,y:top-h/2,z,w,h,d,color:'#466774',zone:extras.zone||'Blackout Spire',...extras};levelWorld.push(b);return b;}
function turret(id,x,top,z,stage,extras={}){levelTurrets.push({id,x,y:top+1.6,z,levelStage:stage,required:true,...extras});box(id,x,top+1.2,z,1.4,1.2,1.4,{zone:chapters[stage].name});}
function walker(id,x,top,z,stage,armored=false){levelWalkers.push({id,x,y:top+.75,z,levelStage:stage,required:true,armored,requireFloor:true});}
for(let stage=0;stage<chapters.length;stage++){
 const chapter=chapters[stage],nodes=[];
 for(let i=0;i<chapter.path.length-1;i++){
  const a=chapter.path[i],b=chapter.path[i+1],steps=Math.ceil(Math.max(Math.hypot(b[0]-a[0],b[2]-a[2])/14.5,Math.abs(b[1]-a[1])/4));
  for(let j=0;j<steps;j++){
   const t=j/steps,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t,z=a[2]+(b[2]-a[2])*t,index=nodes.length;
   const fragile=stage===3&&index%3!==0,collapsing=(stage===7&&index>1)||(stage>=1&&stage!==3&&index>2&&index%4===2);
   const deck=box(`level-${stage}-deck-${index}`,x,y,z,stage===4?7:stage===7?2.8:stage===0?5.5:3.8,fragile?.3:1,stage===4?8:stage===7?4:stage===0?6.5:5.5,{zone:chapter.name,breakable:fragile,collapsing,levelStage:stage});
   // Vertical hooks are deliberately above the next deck, reachable from the prior one.
   box(`level-${stage}-hook-${index}`,x,y+9,z,1.6,.7,1.6,{zone:chapter.name,color:'#4b9ca6'});
   nodes.push({x,y:y+.65,z,surfaceId:deck.id,hookId:`level-${stage}-hook-${index}`});
  }
 }
 const end=chapter.path.at(-1);nodes.push({x:end[0],y:end[1]+.65,z:end[2],surfaceId:`relay-deck-${stage+1}`});routeNodes.push(nodes);
 const cp=checkpoints[stage];box(`relay-deck-${stage}`,cp.x,cp.y-.65,cp.z,16,1.5,16,{zone:stage===0?'Entry dock':chapters[stage-1].name});
 const node=nodes[0],next=nodes[1],dx=next.x-node.x,dz=next.z-node.z,length=Math.hypot(dx,dz)||1;
 levelPads.push({id:`level-pad-${stage}`,x:cp.x+dz/length*5,y:cp.y-.65,z:cp.z-dx/length*5,w:3,d:2.5,dx,dz,speed:24});
}
const last=checkpoints.at(-1);box('relay-deck-8',last.x,last.y-.65,last.z,16,1.5,16,{zone:'Portal approach'});
box('portal-room',0,132,-947,24,2,32,{zone:'Level 02 gateway'});
// Distinct encounter geometry, cover, wall-grind surfaces and breakable shortcuts.
box('dock-slide-roof',0,3.3,-15,6,.35,10,{zone:chapters[0].name,color:'#caab7f'});
for(const [id,x,bottom,z,height] of [['switchback',65,16,-171,28],['voltage',18,72,-610,31]]){
 for(const side of [-1,1])box(`level-${id}-wall-${side}`,x+side*2,bottom+height,z,.7,height,12,{zone:id==='switchback'?chapters[1].name:chapters[5].name,color:'#4b9ca6'});
 box(`level-${id}-beam`,x,bottom+height+.6,z,6,.6,2,{zone:'Wall-kick shortcut'});
}
box('foundry-yard-a',-75,60,-490,30,2,26,{zone:chapters[4].name});
box('foundry-yard-b',-40,64,-555,30,2,30,{zone:chapters[4].name});
box('reactor-arena',0,124,-763,44,3,30,{zone:chapters[6].name});
for(const [i,x,top,z] of [[0,-78,60,-486],[1,-67,60,-498],[2,-46,64,-550],[3,-34,64,-560],[4,-14,124,-754],[5,14,124,-755],[6,-12,124,-772],[7,12,124,-774]])box(`level-cover-${i}`,x,top+2.5,z,3,2.5,3,{zone:'Security cover'});
for(const [i,x,top,z] of [[0,18,4,-50],[1,-35,52,-398],[2,-110,62,-525],[3,35,76,-590]])box(`level-glass-${i}`,x,top+3,z,6,3,.2,{breakable:true,zone:'Breakable route panel'});
// Required security targets are placed on permanent decks, not in empty space.
turret('dock-guard-a',10,8,-104,0);turret('dock-guard-b',3,10,-130,0);
turret('tower-guard-a',98.5,28,-170,1);turret('tower-guard-b',88,40,-210,1);
turret('freight-guard-a',83.5,42,-265,2);turret('freight-guard-b',18,42,-340,2);
levelCargo.push({id:'level-freight',x:77,y:48,z:-278,rx:27,rz:10,rate:.18,phase:0,levelStage:2});
box('level-freight',77,48.4,-268,9,.8,5,{cargoId:'level-freight',zone:chapters[2].name});
for(const [id,x,y,z,phase] of [['chasm-drone-a',-24,53,-360,0],['chasm-drone-b',-60,57,-375,1]])levelDrones.push({id,x,y,z,rx:3,rz:2,rate:.4,phase,levelStage:3,required:true});
turret('chasm-guard',-82,58,-430,3);
walker('foundry-walker-a',-83,60,-490,4);walker('foundry-walker-b',-70,60,-495,4,true);walker('foundry-walker-c',-48,64,-555,4);walker('foundry-walker-d',-32,64,-555,4,true);
turret('foundry-guard-a',-44,64,-566,4);turret('foundry-guard-b',-34,64,-547,4);
turret('ascent-guard-a',33.5,76,-590,5);turret('ascent-guard-b',63,102,-650,5);
for(const [i,x,z] of [[0,-12,-750],[1,12,-755],[2,0,-768]])turret(`reactor-core-${i}`,x,124,z,6,{armored:true,core:true});
walker('reactor-walker-a',-8,124,-756,6);walker('reactor-walker-b',8,124,-765,6,true);
// A final patrol makes the escape dangerous without requiring combat during the run.
levelDrones.push({id:'escape-drone',x:5,y:145,z:-865,rx:8,rz:5,rate:.45,phase:0,levelStage:7,required:false});
// Crossfire pairs on existing route decks; later pairs include an armored gunner.
for(let stage=0;stage<7;stage++){
 const nodes=routeNodes[stage];
 for(const [i,fraction] of [[0,.35],[1,.7],[2,.85]]){
  const n=nodes[Math.floor((nodes.length-1)*fraction)];
  turret(`hard-crossfire-${stage}-${i}`,n.x+.7,n.y-.65,n.z+.4,stage,{armored:stage>=2&&i>0});
 }
 if(stage>0){const n=nodes[Math.floor(nodes.length*.55)];levelDrones.push({id:`hard-drone-${stage}`,x:n.x+3,y:n.y+9,z:n.z-3,rx:3,rz:2,rate:.6,phase:stage,levelStage:stage,required:true});}
}
levelDrones.push({id:'escape-drone-flank',x:-8,y:141,z:-825,rx:7,rz:4,rate:.7,phase:2,levelStage:7,required:false});
export const requiredByStage=chapters.map((_,stage)=>[...levelTurrets,...levelWalkers,...levelDrones].filter(e=>e.levelStage===stage&&e.required).map(e=>e.id));
requiredByStage[2].push('guard-level-freight');

// Keep route arrows and hooks on top of the wider combat courtyards.
for(const nodes of routeNodes)for(const node of nodes){
 const floor=Math.max(node.y-.65,...levelWorld.filter(w=>['foundry-yard-a','foundry-yard-b','reactor-arena'].includes(w.id)&&Math.abs(node.x-w.x)<w.w/2&&Math.abs(node.z-w.z)<w.d/2).map(w=>w.y+w.h/2));
 const delta=floor+.65-node.y;if(delta>0&&delta<=4){node.y+=delta;const deck=levelWorld.find(w=>w.id===node.surfaceId),hook=levelWorld.find(w=>w.id===node.hookId);if(deck)deck.y+=delta;if(hook)hook.y+=delta;}
}

for(let stage=1;stage<8;stage++)for(let i=0;i<(stage===7?1:2);i++){
 const nodes=routeNodes[stage],n=nodes[Math.floor(nodes.length*(i===0?.4:.72))];
 levelLasers.push({id:`security-laser-${stage}-${i}`,x:n.x,y:n.y+.25,z:n.z,w:7,h:.25,d:.22,levelStage:stage,phase:stage*.71+i*1.9});
}
