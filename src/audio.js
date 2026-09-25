import {rng} from './math.js';

// Original 64-second score. Oscillators, filtered noise and a generated impulse;
// there are no sampled instruments, media URLs or encoded audio assets.
export class Score{
 constructor(context=null){
  this.ctx=context||new AudioContext({latencyHint:'playback'});const c=this.ctx;this.nodes=[];
  this.master=c.createGain();this.master.gain.value=.64;
  this.compressor=c.createDynamicsCompressor();this.compressor.threshold.value=-17;this.compressor.knee.value=16;this.compressor.ratio.value=4;this.compressor.attack.value=.008;this.compressor.release.value=.22;
  this.analyser=c.createAnalyser();this.analyser.fftSize=2048;
  this.master.connect(this.compressor);this.compressor.connect(this.analyser);this.analyser.connect(c.destination);
  this.reverb=c.createConvolver();const length=Math.floor(c.sampleRate*3.8),imp=c.createBuffer(2,length,c.sampleRate),rand=rng(1871);
  for(let ch=0;ch<2;ch++){const data=imp.getChannelData(ch);for(let i=0;i<length;i++)data[i]=(rand()*2-1)*Math.exp(-i/c.sampleRate*2.1)*(.7+.3*Math.sin(i*.007));}this.reverb.buffer=imp;
  const wet=c.createGain();wet.gain.value=.32;this.reverb.connect(wet);wet.connect(this.master);
  this.delay=c.createDelay(1);this.delay.delayTime.value=.375;const feedback=c.createGain();feedback.gain.value=.28;const dl=c.createGain();dl.gain.value=.19;this.delay.connect(feedback);feedback.connect(this.delay);this.delay.connect(dl);dl.connect(this.reverb);dl.connect(this.master);
  this.noise=c.createBuffer(1,c.sampleRate*4,c.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=rand()*2-1;
  this.started=false;this.muted=false;
 }
 route(node,pan=0,wet=.3,echo=false){const c=this.ctx,p=c.createStereoPanner();p.pan.value=pan;node.connect(p);p.connect(this.master);if(wet>0){const g=c.createGain();g.gain.value=wet;p.connect(g);g.connect(this.reverb);}if(echo)p.connect(this.delay);}
 tone(freq,time,duration,volume=.1,type='sine',pan=0,cutoff=1800,attack=.02,wet=.35,detune=0){
  const c=this.ctx,t=this.startAt+time;if(t<0)return;const o=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter();o.type=type;o.frequency.value=freq;o.detune.value=detune;f.type='lowpass';f.frequency.setValueAtTime(cutoff,t);f.frequency.exponentialRampToValueAtTime(Math.max(100,cutoff*.55),t+duration);f.Q.value=.45;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+Math.min(attack,duration*.3));g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(f);f.connect(g);this.route(g,pan,wet,type==='triangle');o.start(t);o.stop(t+duration+.02);this.nodes.push(o);return o;
 }
 wash(time,duration,volume,low,high,pan=0){const c=this.ctx,t=this.startAt+time,s=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();s.buffer=this.noise;s.loop=true;f.type='bandpass';f.Q.value=.55;f.frequency.setValueAtTime(low,t);f.frequency.exponentialRampToValueAtTime(high,t+duration*.75);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+duration*.62);g.gain.exponentialRampToValueAtTime(.0001,t+duration);s.connect(f);f.connect(g);this.route(g,pan,.7);s.start(t);s.stop(t+duration);this.nodes.push(s);}
 boom(time,volume=1){const c=this.ctx,t=this.startAt+time,o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(100,t);o.frequency.exponentialRampToValueAtTime(29,t+1.6);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.44*volume,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+2.8);o.connect(g);this.route(g,0,.8);o.start(t);o.stop(t+3);this.nodes.push(o);this.wash(time,.65,.17*volume,850,110);}
 bell(freq,time,volume=.07){this.tone(freq,time,4.8,volume,'sine',-.25,6000,.006,.9);this.tone(freq*2.006,time,2.6,volume*.25,'sine',.3,7000,.006,.9);this.tone(freq*3.99,time,1.4,volume*.09,'sine',.1,8000,.003,.7);}
 schedule(){
  this.startAt=this.ctx.currentTime+.16;this.started=true;const midi=n=>440*2**((n-69)/12);
  // The tide: low D, slow fifths, air and sonar-like piano harmonics.
  this.wash(0,18,.10,150,380,-.5);this.wash(12,18,.09,240,650,.4);this.wash(24,20,.07,170,450,-.3);this.wash(47,17,.09,340,110,.2);
  for(let i=0;i<4;i++){this.tone(midi(26),i*14,17,.105,'sine',0,200,3,1);this.tone(midi(38),i*14,15,.035,'triangle',-.2,350,4,.8);}
  const chords=[[50,57,62,65],[46,53,58,62],[48,55,60,64],[45,52,57,61],[50,57,62,65],[46,53,58,65],[48,55,62,67],[50,57,62,69]];
  chords.forEach((ch,idx)=>ch.forEach((n,k)=>{const time=idx*7;for(const det of [-7,7])this.tone(midi(n),time,10,idx<3?.021:.032,'sawtooth',(k-1.5)*.32,idx<3?620:1350,2.8,.85,det);}));
  [[2.0,74],[4.8,69],[7.5,77],[10.5,76],[13.2,74],[17,81],[20,77],[23,76],[25.2,74]].forEach(([t,n])=>this.bell(midi(n),t,t<16?.073:.062));
  this.boom(8,.65);this.boom(16,.72);this.wash(18.5,5,.25,180,3200);this.boom(24,.9);
  // A 100 BPM ostinato opens out into the chase; pitches follow the harmony.
  const pattern=[0,7,12,15,12,7,19,12];
  for(let i=0;i<100;i++){const t=24+i*.3;if(t>=53.8)break;const root=t<31?50:t<38?46:t<44?48:50;this.tone(midi(root+pattern[i%8]),t,.65,t<29?.039:.064,'triangle',i%2?.48:-.48,2400,.008,.5);if(i%2===0){this.tone(46,t,.25,.16,'sine',0,180,.003,.12);this.wash(t,.08,.045,5200,8000,i%4?.3:-.3);}if(i%8===4){this.wash(t,.22,.12,1200,600,-.12);this.tone(150,t,.19,.058,'triangle',0,500,.005,.4);}}
  for(const t of [29,33.8,38.6,43.4,48.2])this.boom(t,.78);
  this.wash(36,7,.31,140,5200);this.wash(41,2.5,.3,350,9000);this.boom(43.45,1.15);
  // Brass-like stacked saws with restrained resonant upper harmonics.
  for(const [t,notes] of [[43.5,[38,50,57,62,65]],[48.3,[34,46,53,58,65]],[53.5,[38,50,57,62,69]]]){
   notes.forEach((n,k)=>{this.tone(midi(n),t,7,k<2?.09:.046,'sawtooth',(k-2)*.15,950,.45,.95,-4);this.tone(midi(n),t+.015,7,.025,'sawtooth',.2,1300,.6,1,4);});
  }
  this.bell(midi(86),44,.10);this.bell(midi(81),48.2,.1);this.bell(midi(86),53.8,.09);
  this.wash(54.2,2,.13,4000,140);this.boom(56,.8);
  [50,57,62,69,74].forEach((n,k)=>this.tone(midi(n),56+k*.08,7,.039,'triangle',(k-2)*.18,1700,.9,1));
  this.bell(midi(74),57.8,.08);this.bell(midi(81),60.2,.046);
  this.master.gain.setValueAtTime(.64,this.startAt);this.master.gain.setValueAtTime(.64,this.startAt+60);this.master.gain.linearRampToValueAtTime(0,this.startAt+64);
 }
 async start(){await this.ctx.resume();if(this.ctx.state!=='running')return false;this.schedule();return true;}
 get time(){return this.started?Math.max(0,this.ctx.currentTime-this.startAt):0;}
 async pause(){await this.ctx.suspend();}
 async resume(){await this.ctx.resume();}
 mute(value){this.muted=value;this.analyser.disconnect();if(!value)this.analyser.connect(this.ctx.destination);}
 level(){const a=new Float32Array(this.analyser.fftSize);this.analyser.getFloatTimeDomainData(a);return Math.sqrt(a.reduce((s,x)=>s+x*x,0)/a.length);}
 async close(){for(const n of this.nodes){try{n.stop();}catch{}}await this.ctx.close();}
}
