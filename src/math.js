export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const mix=(a,b,t)=>a+(b-a)*t;
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
export const fade=(t,a,b,c,d)=>smooth(a,b,t)*(1-smooth(c,d,t));
export function rng(seed=721){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};
export function noise(x,z){const h=(a,b)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n)};const a=Math.floor(x),b=Math.floor(z);let u=x-a,v=z-b;u=u*u*(3-2*u);v=v*v*(3-2*v);return mix(mix(h(a,b),h(a+1,b),u),mix(h(a,b+1),h(a+1,b+1),u),v)}
export function fbm(x,z){let a=.5,v=0;for(let i=0;i<5;i++){v+=noise(x,z)*a;x=x*2.03+17;z=z*2.03+9;a*=.5}return v}
