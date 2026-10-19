import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const chrome=process.argv[2];
const baseUrl=process.argv[3]||"https://minuteandone.github.io/Village-store/signal-garden/";
assert.ok(chrome,"Chrome executable path is required");

const local=fs.readFileSync("site/signal-garden/index.html","utf8");
const versionMatch=local.match(/APP_VERSION="([^"]+)"/);
const schemaMatch=local.match(/SAVE_SCHEMA=(\d+)/);
assert.ok(versionMatch&&schemaMatch,"local index should expose APP_VERSION and SAVE_SCHEMA");
const expectedVersion=versionMatch[1],expectedSchema=schemaMatch[1];

const url=new URL(baseUrl);
url.searchParams.set("seed","browser-smoke-ci");

const port=9222;
const profile=fs.mkdtempSync(path.join(os.tmpdir(),"signal-garden-chrome-"));
const proc=spawn(chrome,[
  "--headless=new","--no-sandbox","--disable-dev-shm-usage","--disable-gpu",
  "--hide-scrollbars","--remote-debugging-address=127.0.0.1",
  "--remote-debugging-port="+port,"--user-data-dir="+profile,
  "--window-size=390,844","about:blank"
],{stdio:["ignore","pipe","pipe"]});

let chromeErr="";
proc.stderr.on("data",d=>{chromeErr=(chromeErr+String(d)).slice(-8000)});

async function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function getTarget(){
  for(let i=0;i<100;i++){
    try{
      const r=await fetch("http://127.0.0.1:"+port+"/json/list");
      if(r.ok){
        const list=await r.json();
        const page=list.find(x=>x.type==="page"&&x.webSocketDebuggerUrl);
        if(page)return page;
      }
    }catch{}
    await sleep(125);
  }
  throw new Error("Chrome DevTools target did not become available. "+chromeErr);
}

let ws,seq=0;
const pending=new Map(),exceptions=[];
function send(method,params={}){
  return new Promise((resolve,reject)=>{
    const id=++seq;pending.set(id,{resolve,reject});
    ws.send(JSON.stringify({id,method,params}));
  });
}
async function evaluate(expression){
  const r=await send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw new Error("Browser evaluation failed: "+JSON.stringify(r.exceptionDetails));
  return r.result?.value;
}
async function waitFor(expr,label,attempts=120){
  for(let i=0;i<attempts;i++){
    try{if(await evaluate(expr))return}catch{}
    await sleep(125);
  }
  throw new Error("Timed out waiting for "+label);
}
async function key(key,code,vk,text=""){
  await send("Input.dispatchKeyEvent",{type:"keyDown",key,code,windowsVirtualKeyCode:vk,nativeVirtualKeyCode:vk,text});
  await send("Input.dispatchKeyEvent",{type:"keyUp",key,code,windowsVirtualKeyCode:vk});
}

try{
  const target=await getTarget();
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{
    ws.addEventListener("open",resolve,{once:true});
    ws.addEventListener("error",reject,{once:true});
    ws.addEventListener("message",ev=>{
      const msg=JSON.parse(ev.data);
      if(msg.id&&pending.has(msg.id)){
        const p=pending.get(msg.id);pending.delete(msg.id);
        if(msg.error)p.reject(new Error(JSON.stringify(msg.error)));else p.resolve(msg.result);
      }
      if(msg.method==="Runtime.exceptionThrown")exceptions.push(msg.params);
    });
  });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true,screenWidth:390,screenHeight:844});

  const nav=await send("Page.navigate",{url:url.href});
  assert.ok(!nav.errorText,"navigation error: "+(nav.errorText||""));
  await waitFor(`document.readyState==='complete' && !!document.getElementById('versionChip') && !!document.querySelector('[data-island-id="0"]')`,"Signal Garden load");

  const version=await evaluate("document.getElementById('versionChip').textContent");
  assert.ok(version.includes("v"+expectedVersion),"deployed app version should match checked-out index");
  assert.ok(version.includes("save "+expectedSchema),"deployed save schema should match checked-out index");

  const title=await evaluate("document.title");
  assert.match(title,/The Signal Garden/);

  const overflow=await evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1");
  assert.equal(overflow,true,"390px viewport should not overflow horizontally");
  const initialGuide=await evaluate("document.getElementById('guidePanel').textContent");
  assert.match(initialGuide,/Select an island/,"fresh deployed garden should expose first-step guidance");

  await evaluate(`document.querySelector('[data-island-id="0"]').click()`);
  const lifeBefore=Number(await evaluate("document.getElementById('lifeStat').textContent"));
  await evaluate(`document.querySelector('[data-action="nurture"]').click()`);
  await evaluate("document.getElementById('applySelectedBtn').click()");
  const lifeAfter=Number(await evaluate("document.getElementById('lifeStat').textContent"));
  assert.ok(lifeAfter>lifeBefore,"Nurture should increase selected-island life");

  await evaluate(`document.querySelector('[data-action="connect"]').click()`);
  await evaluate(`document.querySelector('[data-island-id="0"]').click()`);
  await evaluate("document.getElementById('applySelectedBtn').click()");
  await evaluate(`document.querySelector('[data-island-id="1"]').click()`);
  await evaluate("document.getElementById('applySelectedBtn').click()");
  const links=Number(await evaluate("document.getElementById('linksStat').textContent"));
  assert.equal(links,1,"Connect should create one live link");
  const linkedGuide=await evaluate("document.getElementById('guidePanel').textContent");
  assert.match(linkedGuide,/Let one cycle pass/,"linked cycle-1 garden should advance starter guidance");

  await evaluate("document.getElementById('restBtn').click()");
  const routeMemory=await evaluate("document.getElementById('historyChip').textContent");
  assert.match(routeMemory,/Route memory [1-9]/,"advancing a linked cycle should create route memory");

  await evaluate(`document.querySelector('[data-island-id="1"]').click()`);
  const glyphButtons=await evaluate(`document.querySelectorAll('[data-glyph]').length`);
  assert.equal(glyphButtons,4);
  await evaluate(`document.querySelector('[data-glyph="memory"]').click()`);
  const glyph=await evaluate("document.getElementById('glyphStat').textContent");
  assert.equal(glyph,"Echo");

  await evaluate("if(document.activeElement) document.activeElement.blur()");
  const memoryBefore=Number(await evaluate(`document.querySelector('[data-island-id="1"]').click(); document.getElementById('memoryStat').textContent`));
  await key("2","Digit2",50,"2");
  await key("o","KeyO",79,"o");
  await key("Enter","Enter",13);
  await sleep(100);
  const memoryAfter=Number(await evaluate("document.getElementById('memoryStat').textContent"));
  assert.ok(memoryAfter>memoryBefore,"keyboard 2/O/Enter path should observe island 2");

  await evaluate("document.getElementById('specimenBtn').click()");
  await waitFor("document.getElementById('specimenDock').value.startsWith('SG1.')","specimen generation");
  const specimenLength=Number(await evaluate("document.getElementById('specimenDock').value.length"));
  assert.ok(specimenLength>40,"generated specimen should be nontrivial SG1 data");
  await evaluate("document.getElementById('importBtn').click()");
  await waitFor("document.getElementById('provenanceChip').textContent.includes('transplant 1')","specimen import provenance");
  const specimenStatus=await evaluate("document.getElementById('specimenStatus').textContent");
  assert.match(specimenStatus,/Imported specimen successfully/,"specimen dock should report successful import");

  const persistedLife=Number(await evaluate(`document.querySelector('[data-island-id="0"]').click(); document.getElementById('lifeStat').textContent`));
  await send("Page.reload",{ignoreCache:true});
  await waitFor(`document.readyState==='complete' && !!document.getElementById('versionChip') && !!document.querySelector('[data-island-id="0"]')`,"Signal Garden reload");
  await evaluate(`document.querySelector('[data-island-id="0"]').click()`);
  const reloadedLife=Number(await evaluate("document.getElementById('lifeStat').textContent"));
  assert.equal(reloadedLife,persistedLife,"local garden state should survive reload for the same seed");

  const selectedUrl=await evaluate("location.href");
  assert.match(selectedUrl,/seed=browser-smoke-ci/);
  await sleep(150);
  assert.equal(exceptions.length,0,"uncaught browser exceptions: "+JSON.stringify(exceptions));

  console.log("Signal Garden shared-mirror browser smoke passed.");
  console.log(JSON.stringify({expectedVersion,expectedSchema,version,title,lifeBefore,lifeAfter,links,routeMemory,glyph,memoryBefore,memoryAfter,specimenLength,specimenStatus,reloadedLife,url:selectedUrl}));
}finally{
  if(ws)try{ws.close()}catch{}
  proc.kill("SIGTERM");
  await sleep(100);
  try{fs.rmSync(profile,{recursive:true,force:true})}catch{}
}
