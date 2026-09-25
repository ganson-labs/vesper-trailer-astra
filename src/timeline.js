import * as T from 'three';
import {mix,smooth,clamp,fade} from './math.js';

export const DURATION=64;
const shots=[
 {start:0,end:8,a:[57,10,180],b:[38,16,116],ta:[0,57,-180],tb:[0,64,-180],fov:47},
 {start:8,end:16,a:[-61,13,48],b:[-23,22,-26],ta:[0,68,-180],tb:[0,69,-180],fov:57},
 {start:16,end:24,a:[3.3,5.0,73],b:[2.0,5.4,70],ta:[0,19,4],tb:[0,35,-42],fov:64},
 {start:24,end:29,a:[128,93,-26],b:[100,105,-50],ta:[0,60,-180],tb:[0,65,-180],fov:58},
 {start:29,end:36,a:[0,0,0],b:[0,0,0],fov:69,follow:'rear'},
 {start:36,end:40,a:[0,0,0],b:[0,0,0],fov:62,follow:'side'},
 {start:40,end:43.45,a:[12,19,-42],b:[0,64,-132],ta:[0,71,-180],tb:[0,72,-180],fov:64},
 {start:43.45,end:49,a:[-89,48,-8],b:[-136,72,58],ta:[0,63,-180],tb:[0,70,-180],fov:63},
 {start:49,end:56,a:[115,112,105],b:[188,155,220],ta:[0,57,-190],tb:[0,58,-190],fov:56},
 {start:56,end:64,a:[0,84,100],b:[0,85,114],ta:[0,71,-180],tb:[0,71,-180],fov:60}
];
const cards=[
 {a:3,b:3.8,c:6.7,d:7.7,k:'ПЕПЕЛ ПРЕЖНЕГО МИРА',text:'Солнце помнит нас.'},
 {a:10,b:10.8,c:13.6,d:14.8,k:'ЗАТЕРЯННЫЕ ЦАРСТВА',text:'Даже если боги забыли.'},
 {a:18.2,b:19.3,c:22.5,d:23.7,k:'КОГДА ПОГАСНЕТ НЕБО',text:'Кто-то должен нести свет.'},
 {a:25,b:25.7,c:27.8,d:28.7,k:'ПО ТУ СТОРОНУ НОЧИ',text:'Мир ещё жив.'},
 {a:45.3,b:46.2,c:48,d:48.9,k:'РАЗБУДИ НЕВОЗМОЖНОЕ',text:'И он ждёт тебя.'}
];
const pos=new T.Vector3(),look=new T.Vector3();
export function environment(t){let day=1-smooth(17,24,t);day+=smooth(43.5,52,t)*.92;return{day:clamp(day),eclipse:smooth(15,24,t)*(1-smooth(44,52,t)),power:.08+smooth(22,29,t)*.27+smooth(40,46,t)*.65};}
export function direct(t,camera,world,film,dom){
 const found=shots.findIndex(s=>t<s.end),i=found<0?shots.length-1:found,s=shots[i];const u=clamp((t-s.start)/(s.end-s.start)),q=u*u*(3-2*u)*.25+u*.75;
 if(s.follow){const p=world.skiff.position;if(s.follow==='rear'){pos.set(p.x+6,p.y+5.1,p.z+18);look.set(p.x-2,p.y+3,p.z-35);}else{pos.set(p.x+14-u*5,p.y+3,p.z+7);look.set(p.x-3,p.y+.6,p.z-4);}}
 else{pos.set(...s.a).lerp(new T.Vector3(...s.b),q);look.set(...s.ta).lerp(new T.Vector3(...s.tb),q);}
 const shake=(t>29&&t<43.5?.030:0)+Math.exp(-Math.max(0,t-43.45)*3)*(t>=43.45?.19:0);
 pos.x+=Math.sin(t*33)*shake;pos.y+=Math.sin(t*41)*shake*.6;
 camera.position.copy(pos);camera.up.set(Math.sin(t*.9)*(s.follow?.014:.001),1,0);camera.lookAt(look);camera.fov=s.fov+(s.follow?u*3:0);camera.updateProjectionMatrix();world.sky.position.copy(camera.position);
 let card=cards.find(c=>t>=c.a&&t<=c.d);dom.caption.style.opacity=card?fade(t,card.a,card.b,card.c,card.d):0;
 if(card){dom.text.textContent=card.text;dom.kicker.textContent=card.k;dom.caption.style.transform=`translateY(${(1-smooth(card.a,card.b,t))*9}px)`;}
 dom.opening.style.opacity=fade(t,.4,1.8,3,4.5)*.75;
 dom.title.style.opacity=smooth(56,57.9,t);dom.title.style.transform=`scale(${mix(1.045,1,smooth(56,64,t))})`;
 let darkness=1-smooth(0,2.1,t);darkness=Math.max(darkness,smooth(54.7,56,t)*(1-smooth(56,57.8,t))*.9,smooth(56,58,t)*.63);dom.curtain.style.opacity=darkness;
 // Title remains above the darkening veil.
 dom.title.style.zIndex='3';dom.flash.style.opacity=Math.exp(-Math.max(0,t-43.45)*3.8)*(t>=43.45&&t<45?.73:0);
 film.uniforms.uTime.value=t;film.uniforms.uAberration.value=s.follow?.009:.002;
 return{shot:i+1,label:s.follow||'rail'};
}
