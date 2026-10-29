import {levelLasers} from './level-data.js';
import {segmentHit,halfHeight,RADIUS} from './physics.js';
export function laserPhase(laser,time){const phase=((time+laser.phase)%4.1+4.1)%4.1;return phase<.65?'warning':phase<2.35?'active':'off';}
export function laserHits(p,before,stage){return levelLasers.some(l=>l.levelStage===stage&&laserPhase(l,p.time)==='active'&&segmentHit(before,p,{...l,w:l.w+RADIUS*2,h:l.h+halfHeight(p)*2,d:l.d+RADIUS*2})!==null);}
