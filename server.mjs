import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

const root=path.dirname(fileURLToPath(import.meta.url));
const serveOnly=process.argv.includes('--serve-only');
const verify=process.argv.includes('--verify');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{
 let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
 if(name==='/health'){res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({app:'vesper-realtime',pid:process.pid}));return;}
 if(name==='/__report'&&verify&&req.method==='POST'){
  let body='';req.on('data',chunk=>{body+=chunk;if(body.length>20000)req.destroy();});req.on('end',()=>{try{const data=JSON.parse(body);fs.mkdirSync(path.join(root,'qa'),{recursive:true});const dest=path.join(root,'qa','windows-run.json');fs.writeFileSync(dest+'.tmp',JSON.stringify(data,null,2));fs.renameSync(dest+'.tmp',dest);res.writeHead(204).end();}catch{res.writeHead(400).end();}});return;
 }
 if(name==='/favicon.ico'){res.writeHead(204).end();return;}
 const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(root+path.sep)||!types[path.extname(file)]){res.writeHead(403).end('Forbidden');return;}
 fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);});
});
let port=4173;
server.on('error',e=>{if(e.code==='EADDRINUSE'&&port<4190){port++;server.listen(port,'127.0.0.1');}else{console.error(e);process.exitCode=1;}});
server.listen(port,'127.0.0.1',()=>{
 const url=`http://127.0.0.1:${port}/?autoplay=1${verify?'&verify=1':''}`;
 console.log(`\n  V E S P E R  /  THE LAST LIGHT\n  ${url}\n\n  64 seconds. Everything is generated live.\n  Space: pause | R: replay | M: mute | F: fullscreen\n  Close this terminal or press Ctrl+C to stop the server.\n`);
 if(serveOnly)return;
 const candidates=[path.join(process.env['ProgramFiles(x86)']||'C:\\Program Files (x86)','Microsoft','Edge','Application','msedge.exe'),path.join(process.env.ProgramFiles||'C:\\Program Files','Google','Chrome','Application','chrome.exe'),path.join(process.env.LOCALAPPDATA||'','Google','Chrome','Application','chrome.exe')];
 const browser=candidates.find(p=>fs.existsSync(p));
 if(!browser){console.log('Open the URL above in a WebGL2-capable browser, then click Start.');return;}
 const profile=path.join(root,'.runtime','browser');fs.mkdirSync(profile,{recursive:true});
 const child=spawn(browser,[`--app=${url}`,`--user-data-dir=${profile}`,'--autoplay-policy=no-user-gesture-required','--start-maximized','--no-first-run','--no-default-browser-check','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-features=CalculateNativeWinOcclusion'],{detached:true,stdio:'ignore',windowsHide:false});child.on('error',e=>console.error('Browser launch:',e.message));child.unref();
});
