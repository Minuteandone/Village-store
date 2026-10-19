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
const studioHtml=fs.readFileSync(new URL('../studio/index.html',import.meta.url),'utf8');
const server=http.createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(req.url?.startsWith('/studio/')?studioHtml:html)});
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
 assert.equal(await evalInPage("document.getElementById('keeper-audio-link').hidden"),false,'An answered Atlas keeper offers a music link');
 assert.equal(await evalInPage("document.getElementById('keeper-audio-link').getAttribute('href')"),'../studio/');
 const atlasBeforeWeave=await evalInPage("localStorage.getItem('"+SAVE+"')");
 await send('Page.navigate',{url:BASE.replace('/atlas/','/studio/')});
 await waitFor("document.readyState==='complete'&&document.getElementById('keepers')&&document.getElementById('tracks').children.length===5",'cross-chapter Resonance Room loaded');
 assert.equal(await evalInPage("document.getElementById('silent').getAttribute('aria-pressed')"),'false','Studio still starts with sound muted');
 const roomKey='gpt-village-elsewhere-resonance-room-v1';
 const scoreBeforeWeave=await evalInPage("localStorage.getItem('"+roomKey+"')");
 await click('#keepers');
 assert(await evalInPage("document.getElementById('source-note').textContent.includes('5 Atlas keeper answers')"));
 const importedMotifs=await evalInPage("JSON.parse(localStorage.getItem('"+roomKey+"')).matrix.map(row=>row.flatMap((on,i)=>on?[i]:[]))");
 assert.deepEqual(importedMotifs,[[0,3],[3,7],[4,7],[3,7],[0,3]],'Chrome weaves the exact five keeper rhythms');
 assert.equal(await evalInPage("localStorage.getItem('"+SAVE+"')"),atlasBeforeWeave,'Studio import does not modify Atlas progress');
 await click('#undo-edit');
 assert.equal(await evalInPage("localStorage.getItem('"+roomKey+"')"),scoreBeforeWeave,'Real Chrome Undo restores earlier composition');
 // Instrument real Web Audio constructors in Chrome, rather than relying only on Node mocks.
 assert(await evalInPage("!!(window.AudioContext||window.webkitAudioContext)"),'Real Chrome supports Web Audio');
 await evalInPage("window.__voiceProof=[];const Audio=window.AudioContext||window.webkitAudioContext;const baseCreate=Audio.prototype.createOscillator;Audio.prototype.createOscillator=function(){const osc=baseCreate.call(this);const baseStart=osc.start;osc.start=function(...args){window.__voiceProof.push({kind:osc.type,hz:osc.frequency.value});return baseStart.apply(osc,args)};return osc}");
 await click('#clear');
 await evalInPage("Array.from(document.querySelectorAll('.track')).forEach(track=>track.querySelector('.step').click())");
 await click('#silent');
 await click('#play');
 await click('#play');
 const liveVoices=await evalInPage("window.__voiceProof");
 assert.equal(liveVoices.length,10,'Two real oscillator layers start for each of the five islands');
 assert.deepEqual(liveVoices.map(x=>x.kind),['sine','sine','triangle','sine','sine','sine','square','sine','triangle','sine'],'All five textures schedule through browser Web Audio');
 assert(liveVoices.every(x=>Number.isFinite(x.hz)&&x.hz>0&&x.hz<4000),'Real synthesis frequencies are finite and audible');
 const scoreBeforeSolo=await evalInPage("localStorage.getItem('"+roomKey+"')");
 assert.equal(await evalInPage("document.querySelectorAll('[data-preview]').length"),5,'Five single-island audition controls exist');
 for(let row=0;row<5;row++)await click('[data-preview="'+row+'"]');
 const afterSolo=await evalInPage("window.__voiceProof");
 assert.equal(afterSolo.length,20,'Five individual auditions schedule ten additional real oscillator layers');
 assert.equal(await evalInPage("localStorage.getItem('"+roomKey+"')"),scoreBeforeSolo,'Real Chrome auditions never modify the saved score');
 assert.equal(await evalInPage("document.getElementById('play').getAttribute('aria-pressed')"),'false','Auditions never start the looping transport');
 await click('#silent');await click('[data-preview="0"]');
 assert.equal((await evalInPage("window.__voiceProof")).length,20,'Sound-off audition schedules no extra audio');
 assert(await evalInPage("document.getElementById('message').textContent.includes('Enable sound')"),'Sound-off preview offers clear opt-in guidance');
 await send('Page.navigate',{url:BASE+'?after-audio=1'});
 await waitFor("document.readyState==='complete'&&document.getElementById('sixth-shore')&&!document.getElementById('sixth-shore').hidden",'return from studio with Atlas memories');
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
 console.log('PASS: committed Atlas and Resonance Room in Chrome: 10 real loop oscillators plus 10 solo-preview oscillators, consent-first audition, stable saved score, keeper motifs, Undo, mobile/desktop, keyboard navigation and private route import. Public hosting is checked separately.');
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
