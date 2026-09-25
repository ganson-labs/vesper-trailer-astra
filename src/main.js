import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {createWorld} from './world.js';
import {filmShader} from './shaders.js';
import {Score} from './audio.js';
import {DURATION,environment,direct} from './timeline.js';

const $=id=>document.getElementById(id),query=new URLSearchParams(location.search);
const dom={caption:$('caption'),text:$('caption-text'),kicker:$('caption-kicker'),opening:$('opening'),title:$('title'),curtain:$('curtain'),flash:$('flash')};
let renderer,composer,camera,scene,world,film,bloom,score=null,running=false,paused=false,ended=false,time=0,last=performance.now(),raf=0,muted=false,ready=false;
const metrics={frames:0,frameMs:[],errors:[],shot:0,audioRms:0,maxAudioRms:0,shotsSeen:[],wallStart:0,wallEnd:0};
window.addEventListener('error',e=>metrics.errors.push(e.message));window.addEventListener('unhandledrejection',e=>metrics.errors.push(String(e.reason)));
function fail(error){console.error(error);$('boot').style.display='flex';$('boot').style.opacity='1';$('boot-status').textContent='Не удалось запустить WebGL. '+error.message;}
try{
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;renderer.outputColorSpace=THREE.SRGBColorSpace;
 $('viewport').append(renderer.domElement);scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(50,2.39,.3,2200);world=createWorld(scene);
 composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));bloom=new UnrealBloomPass(new THREE.Vector2(1280,540),.42,.65,.88);composer.addPass(bloom);composer.addPass(new OutputPass());film=new ShaderPass(filmShader);composer.addPass(film);
 const resize=()=>{const r=$('cinema').getBoundingClientRect();renderer.setSize(r.width,r.height);composer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();if(ready)render(time);};resize();addEventListener('resize',resize);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();if(score)score.pause();running=false;fail(new Error('Графический контекст потерян. Перезапусти страницу.'));});
 renderer.domElement.addEventListener('webglcontextrestored',()=>location.reload());
 function render(t){const env=environment(t);world.update(t,env.day,env.eclipse,env.power);const shot=direct(t,camera,world,film,dom);metrics.shot=shot.shot;if(running&&!metrics.shotsSeen.includes(shot.shot))metrics.shotsSeen.push(shot.shot);bloom.strength=.31+env.power*.22;renderer.toneMappingExposure=1.14+(1-env.day)*.16;renderer.info.autoReset=false;renderer.info.reset();composer.render();$('progress').firstElementChild.style.width=`${t/DURATION*100}%`;$('clock').textContent=`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')} / 01:04`;}
 function frame(now){raf=requestAnimationFrame(frame);const dt=now-last;last=now;if(!ready)return;if(running&&!paused){time=Math.min(DURATION,score.time);if(time>=DURATION){render(DURATION);running=false;ended=true;metrics.wallEnd=now;$('end').classList.add('visible');$('pause').textContent='▶';if(query.has('verify'))report();}}
  if((running&&!paused)||metrics.frames===0){render(time);metrics.frames++;if(running&&time>.5){metrics.frameMs.push(dt);if(metrics.frameMs.length>16000)metrics.frameMs.shift();}if(score&&metrics.frames%15===0){metrics.audioRms=score.level();metrics.maxAudioRms=Math.max(metrics.maxAudioRms,metrics.audioRms);}}
 }
 function report(){fetch('/__report',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...window.__trailer.state,userAgent:navigator.userAgent,visibility:document.visibilityState,wallSeconds:((metrics.wallEnd||performance.now())-metrics.wallStart)/1000})}).catch(console.error);}
 function hideBoot(){$('boot').style.opacity='0';setTimeout(()=>{$('boot').style.display='none';},850);}
 async function start(){if(document.hidden){await new Promise(resolve=>{const visible=()=>{if(!document.hidden){document.removeEventListener('visibilitychange',visible);resolve();}};document.addEventListener('visibilitychange',visible);});}if(score)await score.close();score=new Score();score.mute(muted);let ok=await score.start();if(!ok){$('start').hidden=false;return;}time=0;paused=false;ended=false;running=true;last=performance.now();metrics.wallStart=last;metrics.wallEnd=0;metrics.frames=0;metrics.shotsSeen=[];metrics.frameMs=[];metrics.maxAudioRms=0;$('pause').textContent='Ⅱ';$('end').classList.remove('visible');hideBoot();}
 async function pause(){if(!score||ended)return;if(paused){await score.resume();paused=false;$('pause').textContent='Ⅱ';}else{await score.pause();paused=true;$('pause').textContent='▶';}}
 function mute(){muted=!muted;if(score)score.mute(muted);$('mute').textContent=muted?'ЗВУК ВЫКЛ':'ЗВУК ВКЛ';}
 async function fullscreen(){if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
 $('start').onclick=start;$('replay').onclick=start;$('again').onclick=start;$('pause').onclick=pause;$('mute').onclick=mute;$('fullscreen').onclick=fullscreen;
 addEventListener('keydown',e=>{if(e.repeat)return;if(e.code==='Space'){e.preventDefault();if(!score||ended)start();else pause();}if(e.code==='KeyR')start();if(e.code==='KeyM')mute();if(e.code==='KeyF')fullscreen();});
 let uiTimer;addEventListener('pointermove',()=>{document.body.classList.add('ui');clearTimeout(uiTimer);uiTimer=setTimeout(()=>document.body.classList.remove('ui'),2300);});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&running&&!paused)pause();});
 // Read-only diagnostics plus deterministic silent shot preview for visual QA.
 window.__trailer={get ready(){return ready},get state(){const a=[...metrics.frameMs].sort((a,b)=>a-b);return{time,running,paused,ended,shot:metrics.shot,shotsSeen:metrics.shotsSeen,audioState:score?.ctx.state,audioRms:score?.level()||0,maxAudioRms:metrics.maxAudioRms,frames:metrics.frames,medianFrameMs:a[Math.floor(a.length*.5)],p95FrameMs:a[Math.floor(a.length*.95)],maxFrameMs:a.at(-1),errors:metrics.errors,geometryCount:renderer.info.memory.geometries,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,width:renderer.domElement.width,height:renderer.domElement.height}},async preview(t){if(score)await score.pause();running=false;paused=true;time=Math.max(0,Math.min(DURATION,t));render(time);hideBoot();return this.state;},play:start,pause,render,Score};
 world.update(0,1,0,0);direct(0,camera,world,film,dom);await renderer.compileAsync(scene,camera);
 // Warm postprocessing and every shader before starting the score clock.
 for(const t of [0,25,34,45,57])render(t);render(0);ready=true;last=performance.now();raf=requestAnimationFrame(frame);
 if(query.has('verify'))setInterval(report,2000);
 if(query.has('t')){await window.__trailer.preview(Number(query.get('t'))||0);}else if(query.has('autoplay')){const probe=new AudioContext();await Promise.race([probe.resume(),new Promise(resolve=>setTimeout(resolve,600))]);if(probe.state==='running'){await probe.close();await start();}else{await probe.close();$('boot-status').textContent='64 секунды за пределами последнего солнца';$('start').hidden=false;}}
 else{$('boot-status').textContent='64 секунды за пределами последнего солнца';$('start').hidden=false;}
}catch(e){fail(e);}
