export const noiseGLSL=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=mat2(1.6,-1.2,1.2,1.6)*p+13.7;a*=.5;}return v;}
`;
export const skyVertex=`varying vec3 vDir;void main(){vDir=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}`;
export const skyFragment=`
varying vec3 vDir;uniform float uTime,uDay,uEclipse;uniform vec3 uSun;
${noiseGLSL}
void main(){
 vec3 d=normalize(vDir);float h=max(d.y,0.);float sunDot=max(dot(d,uSun),0.);
 vec3 night=mix(vec3(.025,.055,.09),vec3(.002,.007,.019),pow(h,.45));
 vec3 day=mix(vec3(.53,.32,.17),vec3(.028,.11,.20),pow(h,.39));
 float sunset=pow(sunDot,9.);day+=vec3(.7,.24,.035)*sunset*(1.-h)*.65;
 vec3 col=mix(night,day,uDay);
 vec2 uv=d.xz/(max(d.y,.045)+.22);
 float clouds=fbm(uv*1.3+vec2(uTime*.012,0.));float detail=fbm(uv*4.-uTime*.007);
 float c=smoothstep(.42,.76,clouds*.75+detail*.25)*smoothstep(-.04,.17,d.y);
 vec3 cloudColor=mix(vec3(.026,.055,.085),vec3(.42,.35,.28),uDay);
 cloudColor+=pow(sunDot,18.)*vec3(.5,.27,.10)*uDay;
 col=mix(col,cloudColor,c*.78);
 float a=acos(clamp(dot(d,uSun),-1.,1.));
 float disc=1.-smoothstep(.058,.061,a);
 float corona=exp(-a*15.)*.26+exp(-abs(a-.061)*130.)*.19*uEclipse;
 col+=vec3(1.,.61,.24)*corona*(.4+uDay);
 vec3 moonDir=normalize(uSun+vec3((1.-uEclipse)*.17,.002,0.));
 float lunar=1.-smoothstep(.054,.056,acos(clamp(dot(d,moonDir),-1.,1.)));
 col+=disc*vec3(3.5,2.5,1.15)*(1.-lunar*uEclipse);
 col=mix(col,vec3(.005,.009,.017),lunar*uEclipse*.99);
 vec2 starUV=vec2(atan(d.z,d.x),asin(d.y))*440.;vec2 cell=floor(starUV);vec2 sp=fract(starUV)-.5;
 float star=pow(max(0.,1.-length(sp)*2.8),9.)*step(.993,hash(cell));
 col+=star*(1.-uDay)*smoothstep(.02,.2,d.y)*mix(vec3(.6,.75,1.),vec3(1.,.7,.43),hash(cell+9.))*3.;
 float band=exp(-pow((d.y-.32-.10*sin(d.x*4.))/ .19,2.));
 col+=vec3(.045,.032,.063)*band*fbm(d.xz*12.)*(1.-uDay);
 float wave=.40+.09*sin(d.x*8.+uTime*.12)+.025*sin(d.x*27.-uTime*.18);
 float aur=exp(-abs(d.y-wave)*19.)*pow(fbm(vec2(d.x*18.,d.z*4.+uTime*.04)),2.);
 col+=vec3(.045,.31,.24)*aur*(1.-uDay)*smoothstep(.10,.35,d.y);
 col=mix(vec3(.015,.035,.045),col,smoothstep(-.09,.035,d.y));
 gl_FragColor=vec4(col,1.);
}`;
export const waterVertex=`varying vec3 vWorld;varying vec4 vMirror;uniform mat4 textureMatrix;uniform float uTime;void main(){vec3 p=position;p.z+=sin(p.x*.065+uTime*.65)*.17+sin(p.y*.09-uTime*.48)*.11;vec4 w=modelMatrix*vec4(p,1.);vWorld=w.xyz;vMirror=textureMatrix*vec4(position,1.);gl_Position=projectionMatrix*viewMatrix*w;}`;
export const waterFragment=`
varying vec3 vWorld;varying vec4 vMirror;uniform sampler2D tDiffuse;uniform float uTime,uDay,uPower;uniform vec3 uSun;
${noiseGLSL}
void main(){
 vec2 p=vWorld.xz;vec3 v=normalize(cameraPosition-vWorld);
 float n=fbm(p*.045+uTime*.032);float nx=fbm(p*.045+vec2(.12,0)+uTime*.032);float nz=fbm(p*.045+vec2(0,.12)+uTime*.032);
 vec3 normal=normalize(vec3((n-nx)*1.2+.025*sin(p.x*.9+uTime),1.,(n-nz)*1.2+.02*sin(p.y*.65-uTime)));
 float fresnel=pow(1.-max(dot(v,normal),0.),3.);vec3 refl=reflect(-v,normal);
 vec3 base=mix(vec3(.004,.012,.022),vec3(.010,.045,.054),uDay);
 vec3 sky=mix(vec3(.016,.037,.068),vec3(.14,.20,.23),uDay);
 vec3 col=mix(base,sky,fresnel*.83);
 vec2 reflectionUV=vMirror.xy/vMirror.w+normal.xz*.035;
 vec3 reflection=texture2D(tDiffuse,clamp(reflectionUV,vec2(.001),vec2(.999))).rgb;
 col=mix(col,reflection*vec3(.72,.86,.90),.30+fresnel*.44);
 float spec=pow(max(dot(refl,uSun),0.),220.)+pow(max(dot(refl,uSun),0.),26.)*.045;
 col+=vec3(1.4,.85,.32)*spec*uDay*1.7;
 float ripples=pow(max(0.,sin(p.y*.44+n*12.-uTime*1.1)),14.);
 float gateReflection=exp(-abs(p.x+sin(p.y*.13+uTime)*3.)*.075)*smoothstep(-190.,-130.,p.y)*(1.-smoothstep(-80.,230.,p.y));
 col+=vec3(.055,.43,.38)*gateReflection*ripples*(.18+uPower)*.7;
 float fleck=pow(noise(p*2.1+uTime*.1),22.);col+=vec3(.05,.5,.6)*fleck*(1.-uDay)*.45;
 float dist=length(cameraPosition-vWorld);float fog=1.-exp(-dist*.0018);
 col=mix(col,mix(vec3(.018,.034,.059),vec3(.22,.245,.24),uDay),fog*.65);
 gl_FragColor=vec4(col,1.);
}`;
export const portalVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const portalFragment=`
varying vec2 vUv;uniform float uTime,uPower;
${noiseGLSL}
void main(){vec2 p=vUv*2.-1.;float r=length(p);float a=atan(p.y,p.x);float swirl=fbm(vec2(a*2.+uTime*.12, r*7.-uTime*.25));
 float edge=pow(smoothstep(.5,1.,r),4.)*(1.-smoothstep(.975,1.,r));
 float rays=pow(max(0.,sin(a*37.+swirl*13.-r*15.+uTime)),12.);
 float rings=pow(max(0.,sin(r*65.-uTime*3.+swirl*8.)),18.);
 float alpha=(edge*.8+(rays*.22+rings*.13)*uPower)*smoothstep(.1,.7,r);
 vec3 col=mix(vec3(.07,.64,.62),vec3(1.,.64,.22),uPower*.7);
 col*=edge*2.+(rays+rings)*uPower*1.5;
 alpha+=exp(-r*10.)*uPower*.8;col+=vec3(.4,.8,1.)*exp(-r*10.)*uPower*2.;
 gl_FragColor=vec4(col,alpha*(.15+uPower*.85));
}`;
export const filmShader={uniforms:{tDiffuse:{value:null},uTime:{value:0},uAberration:{value:.0006},uFade:{value:1}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D tDiffuse;uniform float uTime,uAberration,uFade;varying vec2 vUv;void main(){vec2 uv=vUv;vec2 d=uv-.5;vec2 offset=d*dot(d,d)*uAberration;vec3 c=vec3(texture2D(tDiffuse,uv+offset).r,texture2D(tDiffuse,uv).g,texture2D(tDiffuse,uv-offset).b);float grain=fract(sin(dot(uv+fract(uTime),vec2(12.9898,78.233)))*43758.5453)-.5;c+=grain*.019;c*=1.-dot(d,d)*.82;c=mix(vec3(dot(c,vec3(.2126,.7152,.0722))),c,.89);gl_FragColor=vec4(max(c,0.)*uFade,1.);}`};
