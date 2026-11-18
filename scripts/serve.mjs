import http from 'node:http';
import {RELEASE} from '../dist/game.mjs';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFile} from 'node:child_process';

const root=fileURLToPath(new URL('../dist/',import.meta.url));
const port=Number(process.env.PORT||4194),url=`http://127.0.0.1:${port}/`;
const open=()=>{if(process.argv.includes('--open')&&process.platform==='win32')execFile('rundll32.exe',['url.dll,FileProtocolHandler',url],{windowsHide:true},()=>{});};
const server=http.createServer(async(req,res)=>{
 try{
  const p=decodeURIComponent(new URL(req.url,url).pathname);
  const f=path.resolve(root,'.'+(p.endsWith('/')?p+'index.html':p));
  if(!f.startsWith(root)){res.writeHead(403);res.end();return;}
  const b=await readFile(f);
  res.writeHead(200,{'Content-Type':({'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.txt':'text/plain'})[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(b);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.on('error',async error=>{
 if(error.code==='EADDRINUSE'){
  try{
   const page=await fetch(url,{signal:AbortSignal.timeout(2000)});
   const model=await fetch(url+'game.mjs',{signal:AbortSignal.timeout(2000)});if(page.ok&&(await page.text()).includes('<title>Find Lumi · A Mirror Museum Adventure</title>')&&model.ok&&(await model.text()).includes("RELEASE='"+RELEASE+"'")){
    console.log(`Find Lumi is already running: ${url}`);open();return;
   }
  }catch{}
  console.error(`Port ${port} is used by another application or a different Find Lumi release. Set PORT to an unused port, then run this launcher again.`);
 }else console.error(`Cannot start Find Lumi: ${error.message}`);
 process.exitCode=1;
});
server.listen(port,'127.0.0.1',()=>{console.log(`Find Lumi: ${url}`);open();});
