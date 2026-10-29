// Procedural audio: no downloads or external assets; only starts after Play.
const presets={recall:[350,1200,.22,'sine'],hook:[950,260,.12,'square'],lunge:[180,65,.18,'sawtooth'],throw:[480,130,.14,'triangle'],hammer:[110,35,.35,'sawtooth'],warning:[620,900,.16,'sine'],shot:[430,95,.12,'square'],hit:[1400,450,.08,'triangle'],weak:[1900,900,.14,'triangle'],destroy:[150,35,.32,'sawtooth'],jump:[360,700,.12,'sine'],land:[100,45,.1,'triangle'],hurt:[190,75,.2,'square']};
export function gameAudio(){
 let ctx=null,master=null,muted=false,paused=true,voices=0;const last=new Map();
 function wake(){try{if(!ctx){const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;ctx=new Audio();master=ctx.createGain();master.gain.value=muted?0:.18;master.connect(ctx.destination);}ctx.resume().catch(()=>{});}catch{}}
 return {
  wake,
  pause(value){paused=value;if(value&&ctx)ctx.suspend().catch(()=>{});else if(!value)wake();},
  toggle(){muted=!muted;if(master)master.gain.setTargetAtTime(muted?0:.18,ctx.currentTime,.025);return muted;},
  play(type,position,player){
   if(!ctx||paused||muted||voices>=20)return;
   const spec=presets[type];if(!spec)return;
   const now=ctx.currentTime;if(now-(last.get(type)??-10)<(type==='warning'?.12:.035))return;
   const distance=position&&player?Math.hypot(position.x-player.x,position.y-player.y,position.z-player.z):0;
   const volume=Math.max(0,1-distance/48);if(volume<=0)return;last.set(type,now);
   const [start,end,duration,wave]=spec,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=wave;
   osc.frequency.setValueAtTime(start,now);osc.frequency.exponentialRampToValueAtTime(end,now+duration);
   gain.gain.setValueAtTime(.001,now);gain.gain.linearRampToValueAtTime(volume*.35,now+.008);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
   osc.connect(gain);gain.connect(master);voices++;osc.onended=()=>{voices--;osc.disconnect();gain.disconnect();};osc.start(now);osc.stop(now+duration+.02);
  }
 };
}
