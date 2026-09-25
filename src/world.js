import * as T from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {rng,fbm,mix,smooth,clamp} from './math.js';
import {skyVertex,skyFragment,waterVertex,waterFragment,portalVertex,portalFragment,noiseGLSL} from './shaders.js';

export function createWorld(scene){
 const random=rng(2701), pi=Math.PI;
 const shared={uTime:{value:0},uDay:{value:1},uEclipse:{value:0},uPower:{value:0},uSun:{value:new T.Vector3(-.19,.26,-1).normalize()}};
 const material=(color,metalness=0,roughness=.8)=>new T.MeshStandardMaterial({color,metalness,roughness});
 const stone=material('#414743',.18,.88),dark=material('#212e30',.35,.72),bronze=material('#86724d',.75,.39),gold=material('#c3a76d',.8,.32);
 for(const mat of [stone,dark,bronze]){
  mat.onBeforeCompile=s=>{s.vertexShader='varying vec3 vStone;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvStone=position;');s.fragmentShader='varying vec3 vStone;\n'+noiseGLSL+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat gr=fbm(vStone.xz*2.+vStone.y*.7);diffuseColor.rgb*=.68+gr*.58;float strata=sin(vStone.y*7.+gr*8.);diffuseColor.rgb*=.94+.06*strata;');};
 }
 const energy=new T.MeshStandardMaterial({color:'#8af0d9',emissive:'#37dcc6',emissiveIntensity:2,roughness:.3});
 const amber=new T.MeshStandardMaterial({color:'#ffd795',emissive:'#ff9f3f',emissiveIntensity:2,roughness:.25});
 const boxGeo=new T.BoxGeometry(1,1,1), cylGeo=new T.CylinderGeometry(1,1,1,8), shardGeo=new T.IcosahedronGeometry(1,1);
 const mesh=(geo,mat,pos,scale,parent=scene)=>{let m=new T.Mesh(geo,mat);if(pos)m.position.set(...pos);if(scale)m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 const box=(mat,p,s,parent)=>mesh(boxGeo,mat,p,s,parent);
 const dummy=new T.Object3D();
 function instances(geo,mat,data,parent=scene){const m=new T.InstancedMesh(geo,mat,data.length);for(let i=0;i<data.length;i++){const d=data[i];dummy.position.set(...d.p);dummy.scale.set(...d.s);dummy.rotation.set(...(d.r||[0,0,0]));dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);}m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 const sky=new T.Mesh(new T.SphereGeometry(1800,32,16),new T.ShaderMaterial({vertexShader:skyVertex,fragmentShader:skyFragment,uniforms:shared,side:T.BackSide,depthWrite:false}));sky.frustumCulled=false;sky.renderOrder=-10;scene.add(sky);
 const ocean=new Reflector(new T.PlaneGeometry(3600,3600,180,180),{textureWidth:1024,textureHeight:512,multisample:0,clipBias:.003,shader:{uniforms:{...shared,tDiffuse:{value:null},textureMatrix:{value:null},color:{value:null}},vertexShader:waterVertex,fragmentShader:waterFragment}});for(const key of Object.keys(shared))ocean.material.uniforms[key]=shared[key];ocean.rotation.x=-pi/2;ocean.position.y=-.8;scene.add(ocean);
 scene.fog=new T.FogExp2('#76827c',.00165);
 const ambient=new T.HemisphereLight('#accedb','#5d4637',1.5);scene.add(ambient);
 const sun=new T.DirectionalLight('#ffdfa0',3.5);sun.position.set(-100,140,-250);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-165,right:165,top:150,bottom:-150,near:1,far:650});sun.shadow.bias=-.0004;sun.shadow.normalBias=.15;sun.target.position.set(0,0,-90);scene.add(sun,sun.target);
 const moon=new T.DirectionalLight('#78aede',.8);moon.position.set(150,120,90);scene.add(moon);
 const gateLight=new T.PointLight('#63ffdc',1800,210,1.4);gateLight.position.set(0,54,-138);scene.add(gateLight);

 // Irregular radial landforms: all relief is generated from deterministic noise.
 function island(cx,cz,r,height,seed){
  const seg=100,rings=24,pos=[],indices=[],colors=[];const tint=new T.Color();
  for(let j=0;j<=rings;j++)for(let i=0;i<=seg;i++){
   const a=i/seg*pi*2,rad=j/rings;const rim=1+(fbm(Math.cos(a)*2+seed,Math.sin(a)*2)-.5)*.38;
   const x=Math.cos(a)*rad*r*rim,z=Math.sin(a)*rad*r*rim;
   let y=Math.pow(Math.max(0,1-Math.pow(rad,1.5)),1.6)*height;
   y+=(fbm((x+cx)*.055+seed,(z+cz)*.055)-.47)*height*.85*Math.sin(rad*pi);
   y-=Math.pow(rad,8)*10;
   pos.push(x,y,z);let f=fbm(x*.2+seed,z*.2);tint.setRGB(.035+f*.04,.052+f*.047,.055+f*.04);colors.push(tint.r,tint.g,tint.b);
   if(j<rings&&i<seg){let k=j*(seg+1)+i;indices.push(k,k+1,k+seg+1,k+1,k+seg+2,k+seg+1);}
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
  const mat=new T.MeshStandardMaterial({vertexColors:true,roughness:.94,metalness:.08});mat.onBeforeCompile=stone.onBeforeCompile;
  const m=mesh(geo,mat,[cx,-2,cz]);return m;
 }
 island(-155,20,100,62,2);island(170,-30,110,82,11);island(-110,-245,120,105,19);island(160,-320,160,133,31);island(0,-172,68,10,7);island(-32,120,48,15,9);
 for(let i=0;i<15;i++){let a=i/15*pi*2;island(Math.sin(a)*650,Math.cos(a)*650-180,110+random()*140,100+random()*120,i*23);}
 // Basalt column fields, weathered silhouettes and fine mineral seams.
 const columns=[],caps=[],seams=[],rubble=[];
 for(let i=0;i<850;i++){
  const side=i%2?1:-1,z=mix(-320,220,random()),x=side*(70+random()*140);
  const shore=Math.exp(-Math.pow((Math.abs(x)-120)/58,2));const h=5+random()**1.5*58*shore;
  const w=1.4+random()*4.3;columns.push({p:[x,h/2-5,z],s:[w,h,w*.9],r:[0,random()*pi,random()*.07]});
  if(i%8===0)seams.push({p:[x-w*.92,h*.42-3,z],s:[.08,h*.5,.09]});
 }
 instances(cylGeo,stone,columns);instances(boxGeo,energy,seams);
 for(let i=0;i<180;i++){let x=(random()-.5)*480,z=mix(-380,190,random());if(Math.abs(x)<20)continue;rubble.push({p:[x,random()*3-3,z],s:[2+random()*7,2+random()*8,3+random()*8],r:[random(),random(),random()]});}instances(shardGeo,dark,rubble);

 // A submerged processional road points toward the central monument.
 const slabs=[],supports=[],roadLights=[];
 for(let i=0;i<36;i++){const z=90-i*6.8,w=5.5;let y=2.8+Math.sin(i*.6)*.14;slabs.push({p:[0,y,z],s:[w,.9,6.35],r:[0,0,(random()-.5)*.018]});
  for(const side of [-1,1]){supports.push({p:[side*3.15,.7,z],s:[.55,4.6,1.3]});roadLights.push({p:[side*2.65,3.32,z],s:[.085,.055,4.6]});}
 }
 instances(boxGeo,stone,slabs);instances(boxGeo,bronze,supports);instances(boxGeo,energy,roadLights);
 mesh(new T.CylinderGeometry(11,12,2,64),dark,[0,2,65]);mesh(new T.TorusGeometry(10,.1,6,100),bronze,[0,3.05,65]).rotation.x=pi/2;
 for(let i=0;i<10;i++){const z=38-i*18;for(const side of [-1,1]){box(dark,[side*8,8,z],[2,17,2.5]);box(bronze,[side*8,16.5,z],[2.25,.45,2.7]);box(energy,[side*8,11,z+1.27],[.15,9,.04]);}}

 // The Orrery: monumental keyed stones instead of a single smooth torus.
 const gate=new T.Group();gate.position.set(0,72,-180);scene.add(gate);
 const ringBlocks=[],ringInsets=[],ringRibs=[],runes=[];
 for(let i=0;i<120;i++){
  const a=i/120*pi*2;const cs=Math.cos(a),sn=Math.sin(a),r=64;
  ringBlocks.push({p:[cs*r,sn*r,0],s:[3.21,6.7,6.4],r:[0,0,a-pi/2]});
  ringInsets.push({p:[cs*61.05,sn*61.05,3.32],s:[2.95,.30,.15],r:[0,0,a-pi/2]});
  if(i%3===0)ringRibs.push({p:[cs*65,sn*65,0],s:[.48,8.4,7.15],r:[0,0,a-pi/2]});
  if(i%2===0){for(let k=0;k<3;k++)runes.push({p:[cs*(64+k*.55),sn*(64+k*.55),3.24],s:[.12,.33,.03],r:[0,0,a+.5*k]});}
 }
 instances(boxGeo,stone,ringBlocks,gate);instances(boxGeo,gold,ringRibs,gate);instances(boxGeo,energy,ringInsets,gate);instances(boxGeo,amber,runes,gate);
 mesh(new T.TorusGeometry(60.7,.13,6,256),energy,[0,0,3.4],null,gate);
 mesh(new T.TorusGeometry(68,.3,8,256),bronze,[0,0,0],null,gate);
 const orbit=new T.Group();gate.add(orbit);orbit.rotation.y=.12;
 for(let i=0;i<12;i++){let arc=mesh(new T.TorusGeometry(75,.65,5,24,pi*.12),bronze,null,null,orbit);arc.rotation.z=i*pi/6;}
 const satellites=[];
 for(let i=0;i<18;i++){const a=i*pi*2/18;const g=new T.Group();g.position.set(Math.cos(a)*79,Math.sin(a)*79,0);g.rotation.z=a-pi/2;gate.add(g);box(dark,[0,0,0],[2.1,7+random()*6,3],g);box(gold,[0,0,1.7],[.20,5,.2],g);satellites.push({g,a});}
 const portal=mesh(new T.CircleGeometry(60.4,160),new T.ShaderMaterial({vertexShader:portalVertex,fragmentShader:portalFragment,uniforms:shared,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending}),[0,0,.3],null,gate);portal.castShadow=false;
 // Anchor buttresses and distant remnants of a flooded civilization.
 for(const side of [-1,1]){box(stone,[side*47,17,-180],[13,37,21]);box(bronze,[side*47,33,-169],[14,.65,1]);for(let k=0;k<5;k++)box(dark,[side*(47+k*3),7-k,-185],[4,15-k*2,30]);}
 const towers=[],windows=[];
 for(let i=0;i<105;i++){let a=random()*pi*2,r=23+random()*110,x=Math.cos(a)*r,z=-230+Math.sin(a)*r;if(z>-205&&Math.abs(x)<70)continue;let h=5+random()**2*45,w=2+random()*5;towers.push({p:[x,h/2,z],s:[w,h,w],r:[0,random()*.1,0]});if(h>13){for(let j=0;j<3;j++)windows.push({p:[x-w*.28+j*w*.28,h*.7,z+w/2+.02],s:[.17,h*.21,.05]});}}
 instances(boxGeo,dark,towers);instances(boxGeo,amber,windows);
 // Small human silhouette and a cloth simulated directly in the vertex grid.
 const hero=new T.Group();hero.position.set(0,3.05,65);scene.add(hero);
 const clothMat=new T.MeshStandardMaterial({color:'#6f3329',roughness:.88,side:T.DoubleSide});
 const capeGeo=new T.PlaneGeometry(1.1,1.9,12,18);const cape=mesh(capeGeo,clothMat,[0,1.25,.21],null,hero);cape.rotation.x=-.12;
 mesh(new T.CylinderGeometry(.28,.4,1.3,8),dark,[0,1.15,0],null,hero);
 mesh(new T.SphereGeometry(.32,16,12),clothMat,[0,2.03,0],[1,1.15,1],hero);
 mesh(new T.SphereGeometry(.22,12,8),dark,[0,2.04,-.20],[1,1,.7],hero);
 for(const side of [-1,1]){mesh(new T.CylinderGeometry(.105,.13,.9,7),dark,[side*.18,.45,0],null,hero);const arm=mesh(new T.CylinderGeometry(.10,.12,.9,7),clothMat,[side*.37,1.2,-.04],null,hero);arm.rotation.z=side*.13;}
 box(bronze,[.56,1,0],[.07,2.3,.07],hero);mesh(new T.IcosahedronGeometry(.19,1),amber,[.56,2.19,0],null,hero);
 const lantern=new T.PointLight('#ffc66e',13,8,1.4);lantern.position.set(.56,2.25,0);hero.add(lantern);
 hero.rotation.y=pi*.05;
 // A solar skiff. Swept wings, suspended keel, luminous engine and pilot.
 const skiff=new T.Group();scene.add(skiff);
 const body=mesh(new T.ConeGeometry(1,6,5),dark,[0,0,0],[1,.95,.45],skiff);body.rotation.x=-pi/2;
 const wingShape=new T.Shape();wingShape.moveTo(0,-2.4);wingShape.lineTo(5.8,1.9);wingShape.lineTo(2,1.4);wingShape.lineTo(0,.6);wingShape.lineTo(-2,1.4);wingShape.lineTo(-5.8,1.9);wingShape.closePath();
 const wing=mesh(new T.ExtrudeGeometry(wingShape,{depth:.12,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.1,bevelThickness:.05}),bronze,[0,0,0],null,skiff);wing.rotation.x=pi/2;
 box(dark,[0,.6,.2],[.8,.6,1.3],skiff);mesh(new T.SphereGeometry(.29,12,8),clothMat,[0,1.1,.2],null,skiff);
 for(const side of [-1,1]){box(energy,[side*2,-.12,1.3],[1.8,.13,.16],skiff);mesh(new T.ConeGeometry(.18,4.5,8),energy,[side*2,-.15,3.5],[1,1,1],skiff).rotation.x=pi/2;}
 const trailGeo=new T.BufferGeometry(),trailPos=new Float32Array(260*3);trailGeo.setAttribute('position',new T.BufferAttribute(trailPos,3));const trail=new T.Points(trailGeo,new T.PointsMaterial({color:'#74fff1',size:.18,transparent:true,opacity:.65,depthWrite:false,blending:T.AdditiveBlending}));scene.add(trail);
 // Drifting dust, spores and a flock give the giant structures a scale reference.
 const motesPos=new Float32Array(1200*3);for(let i=0;i<1200;i++){motesPos[i*3]=(random()-.5)*250;motesPos[i*3+1]=2+random()*110;motesPos[i*3+2]=100-random()*400;}
 const motes=new T.Points(new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(motesPos,3)),new T.PointsMaterial({color:'#c8eee0',size:.17,transparent:true,opacity:.65,depthWrite:false,blending:T.AdditiveBlending}));scene.add(motes);
 const birds=[];const birdMat=new T.MeshBasicMaterial({color:'#132126'});for(let i=0;i<25;i++){const g=new T.Group();for(const side of [-1,1]){let wing=mesh(new T.ConeGeometry(.35,1.8,3),birdMat,[side*.65,0,0],[1,1,.14],g);wing.rotation.z=side*pi/2;}scene.add(g);birds.push(g);}
 const flare=new T.Group();scene.add(flare);const shaftMat=new T.MeshBasicMaterial({color:'#acefde',transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide});for(let i=0;i<7;i++){const shaft=mesh(new T.CylinderGeometry(.05,9+i*2,240,12,1,true),shaftMat,[0,140,-179]);shaft.rotation.z=(i-3)*.007;flare.add(shaft);}
 const shock=mesh(new T.TorusGeometry(1,.028,6,128),energy,[0,.1,-180]);shock.rotation.x=pi/2;shock.visible=false;
 const capeBase=capeGeo.attributes.position.array.slice();
 const nightFog=new T.Color('#07151f'),dayFog=new T.Color('#8e8b76');
 function update(t,day,eclipse,power){
  shared.uTime.value=t;shared.uDay.value=day;shared.uEclipse.value=eclipse;shared.uPower.value=power;
  shared.uSun.value.set(-.19,mix(.24,.13,eclipse),-1).normalize();
  ambient.intensity=mix(.73,1.7,day);ambient.color.set(day>.4?'#a9ccd6':'#6d99c6');sun.intensity=mix(.10,3.6,day);moon.intensity=mix(1.5,.38,day);
  gateLight.intensity=900+power*2600;energy.emissiveIntensity=1+power*3.5+(1-day)*1.1;amber.emissiveIntensity=1.1+(1-day)*2;
  scene.fog.color.copy(nightFog).lerp(dayFog,day);scene.fog.density=mix(.0021,.00155,day);
  orbit.rotation.z=t*.017;orbit.rotation.y=.16+Math.sin(t*.09)*.13;
  satellites.forEach(({g,a},i)=>{let r=79+Math.sin(t*.4+i)*.5+power*4;g.position.set(Math.cos(a)*r,Math.sin(a)*r,Math.sin(t*.25+i)*1.4);g.rotation.z=a-pi/2+Math.sin(t*.4+i)*.035;});
  const cp=capeGeo.attributes.position;for(let i=0;i<cp.count;i++){let f=(1-capeBase[i*3+1]/.95)*.5;cp.setZ(i,Math.sin(t*3.2+capeBase[i*3]*3+f*4)*.17*f+f*f*.30);}cp.needsUpdate=true;capeGeo.computeVertexNormals();
  lantern.intensity=12+Math.sin(t*6)*2;
  const fly=clamp((t-29)/13);skiff.position.set(Math.sin(fly*4.7)*26,5+Math.sin(fly*9)*1.5,150-fly*285);skiff.rotation.set(.04,Math.cos(fly*4.7)*-.34,Math.sin(fly*4.7)*-.20);skiff.visible=t>=28&&t<43;
  trail.visible=skiff.visible;for(let i=0;i<260;i++){let age=i/260*1.35,f=clamp((t-29-age)/13);trailPos[i*3]=Math.sin(f*4.7)*26+(i%2?2:-2)+(random()-.5)*.2;trailPos[i*3+1]=4.7+Math.sin(f*9)*1.5-age*.55;trailPos[i*3+2]=150-f*285+2;}trailGeo.attributes.position.needsUpdate=true;
  motes.rotation.y=Math.sin(t*.03)*.06;motes.position.y=Math.sin(t*.15)*1.5;
  birds.forEach((g,i)=>{g.position.set(-72+Math.sin(t*.13+i*.3)*45,44+i*.9+Math.sin(t+i)*.3,-200+Math.cos(t*.13+i*.3)*60);g.rotation.y=-t*.13-i*.3;g.children.forEach((w,k)=>w.rotation.z=(k?1:-1)*(pi/2+Math.sin(t*4+i)*.25));});
  shaftMat.opacity=smooth(42,46,t)*(1-smooth(52,57,t))*.035;
  let sw=smooth(43,48,t);shock.visible=t>43&&t<48;shock.scale.setScalar(1+sw*350);shock.material=energy;
 }
 return{update,shared,sky,skiff,hero,gate,counts:{columns:columns.length,towers:towers.length},scene};
}
