import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';

// Real headless-Chrome smoke for the checked-out Atlas on a local HTTP server. No external packages.
const chromePath=process.argv[2];
assert(chromePath,'Pass the installed Chrome/Chromium executable as argument 1');
const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
assert(html.includes('id="keeper-card"')&&html.includes('const KEEPERS=['),'Checked-out Atlas contains five keepers');
const server=http.createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html)});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const BASE='http://127.0.0.1:'+server.address().port+'/atlas/';
const SAVE='gpt-village-agent02-field-atlas-v1';
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'elsewhere-atlas-ci-'));
const port=9343;
const child=spawn(chromePath,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--remote-debugging-address=127.0.0.1','--remote-debugging-port='+port,'--user-data-dir='+profile,'--window-size=390,844','about:blank'],{stdio:['ignore','pipe','pipe']});
let errors='',ws,seq=0;const waiting=new Map(),exceptions=[];
child.stderr.on('data',d=>{errors=(errors+String(d)).slice(-5000)});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function target(){
 for(let i=0;i<90;i++){try{const response=await fetch('http://127.0.0.1:'+port+'/json/list');if(response.ok){const pages=await response.json();const item=pages.find(x=>x.type==='page'&&x.webSocketDebuggerUrl);if(item)return item}}catch(_){}await sleep(150)}
 throw Error('Chrome did not start its debugging server: '+errors);
}
function send(method,params={}){
 return new Promise((resolve,reject)=>{const id=++seq;waiting.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
}
async function evalInPage(expression){
 const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(result.exceptionDetails)throw Error('Page exception: '+JSON.stringify(result.exceptionDetails));
 return result.result?.value;
}
async function waitFor(expr,label){
 for(let i=0;i<120;i++){try{if(await evalInPage(expr))return}catch(_){}await sleep(120)}
 throw Error('Timed out waiting for '+label);
}
async function key(k,code,vk){
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:k,code,windowsVirtualKeyCode:vk,nativeVirtualKeyCode:vk});
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:k,code,windowsVirtualKeyCode:vk,nativeVirtualKeyCode:vk});
}
async function getSave(){return evalInPage("JSON.parse(localStorage.getItem('"+SAVE+"'))")}
async function click(css){return evalInPage("document.querySelector("+JSON.stringify(css)+").click()")}
try{
 const response=await fetch(BASE);assert.equal(response.status,200,'Loopback test server HTTP status');
 const tab=await target();ws=new WebSocket(tab.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{
  ws.addEventListener('open',resolve,{once:true});
  ws.addEventListener('error',reject,{once:true});
  ws.addEventListener('message',ev=>{
   const msg=JSON.parse(ev.data);
   if(msg.id&&waiting.has(msg.id)){
    const p=waiting.get(msg.id);waiting.delete(msg.id);
    if(msg.error)p.reject(Error(JSON.stringify(msg.error)));else p.resolve(msg.result);
   }
   if(msg.method==='Runtime.exceptionThrown')exceptions.push(msg.params);
  });
 });
 await send('Runtime.enable');await send('Page.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,mobile:true,screenWidth:390,screenHeight:844,deviceScaleFactor:1});
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await send('Page.navigate',{url:BASE});
 await waitFor("document.readyState==='complete'&&!!document.getElementById('keeper-card')&&!!localStorage.getItem('"+SAVE+"')",'public Atlas game initialization');
 assert(await evalInPage("matchMedia('(prefers-reduced-motion: reduce)').matches"));
 assert(await evalInPage("document.documentElement.scrollWidth<=document.documentElement.clientWidth+1"),'No mobile viewport overflow');
 assert.equal((await getSave()).route.length,0);
 assert(await evalInPage("document.getElementById('keeper-card').hidden"));
 await evalInPage("document.querySelector('[data-island=\"0\"]').focus()");
 await key('ArrowRight','ArrowRight',39);
 assert.equal(await evalInPage('document.activeElement.dataset.island'),'2','Arrow keys navigate real focus');
 assert.equal((await getSave()).route.length,0,'Moving focus never stamps an island');

 await click('[data-island="0"]');
 assert.equal(await evalInPage("document.getElementById('keeper-card').hidden"),false);
 assert.match(await evalInPage("document.getElementById('keeper-title').textContent"),/Astronomer/);
 await click('[data-keeper-choice="1"]');
 assert.equal((await getSave()).echoes[0],1);
 assert(await evalInPage("document.getElementById('report').value.includes('unnamed star')"));
 await click('[data-keeper-choice="0"]');
 assert.equal((await getSave()).echoes[0],0,'Keeper decisions are reversible');
 assert(await evalInPage("document.querySelector('[data-island=\"0\"]').classList.contains('echoed')"));

 for(const id of [1,2,3,4]){await click('[data-island="'+id+'"]');await click('[data-keeper-choice="'+(id%2)+'"]')}
 let state=await getSave();
 assert.deepEqual(state.route,[0,1,2,3,4]);
 assert.deepEqual(state.echoes,[0,1,0,1,0]);
 assert.equal(await evalInPage("document.getElementById('sixth-shore').hidden"),false,'Sixth Shore unlocked');
 await click('[data-final="anchor"]');
 assert.equal((await getSave()).ending,'anchor');
 assert(await evalInPage("document.getElementById('sixth-letter').textContent.includes('a named star')"),'Keeper echo reaches the finale');
 assert(await evalInPage("document.getElementById('report').value.includes('SIXTH SHORE · anchor')"));

 await send('Page.reload',{ignoreCache:true});
 await waitFor("document.readyState==='complete'&&document.getElementById('sixth-shore')&&!document.getElementById('sixth-shore').hidden",'localStorage restoration');
 assert.equal((await getSave()).echoes[0],0);
 assert.equal((await getSave()).ending,'anchor');
 await evalInPage("localStorage.setItem('gpt-village-agent02-elsewhere-frequency-v1','{\"solved\":[0]}')");
 await click('#reset');
 state=await getSave();
 assert.equal(state.route.length,0);
 assert.deepEqual(state.echoes,[null,null,null,null,null]);
 assert.equal(state.ending,null);
 assert.equal(await evalInPage("localStorage.getItem('gpt-village-agent02-elsewhere-frequency-v1')"),'{"solved":[0]}');

 await send('Page.navigate',{url:BASE+'?share-import=1#route=01234.n.l.a'});
 await waitFor("document.readyState==='complete'&&location.hash==='#route=01234.n.l.a'&&document.getElementById('sixth-shore')&&!document.getElementById('sixth-shore').hidden",'fresh-document route import');
 state=await getSave();
 assert.deepEqual(state.route,[0,1,2,3,4]);
 assert.equal(state.ending,'anchor');
 assert.deepEqual(state.echoes,[null,null,null,null,null],'Shared route cannot disclose keeper choices');
 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,mobile:false,screenWidth:1280,screenHeight:800,deviceScaleFactor:1});
 assert(await evalInPage("document.documentElement.scrollWidth<=document.documentElement.clientWidth+1"),'No desktop viewport overflow');
 assert.equal(exceptions.length,0,'No uncaught JavaScript exceptions');
 console.log('PASS: committed Atlas in real Chrome mobile/desktop, spatial keyboard focus, five keeper encounters, actual save/reload, finale, privacy-safe route import and reset isolation. The separate public Pages smoke verifies live deployment.');
}finally{
 try{ws?.close()}catch(_){}
 if(child.exitCode===null){
  const closed=new Promise(resolve=>child.once('exit',resolve));
  child.kill('SIGTERM');
  await Promise.race([closed,sleep(1200)]);
 }
 server.close();
 try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:150})}
 catch(error){console.warn('Chrome temporary-profile cleanup skipped: '+error.message)}
}
