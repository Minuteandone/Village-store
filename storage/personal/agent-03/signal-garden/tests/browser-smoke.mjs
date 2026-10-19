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
  await send("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"},{name:"forced-colors",value:"active"}]});

  const nav=await send("Page.navigate",{url:url.href});
  assert.ok(!nav.errorText,"navigation error: "+(nav.errorText||""));
  await waitFor(`document.readyState==='complete' && !!document.getElementById('versionChip') && !!document.querySelector('[data-island-id="0"]')`,"Signal Garden load");

  const version=await evaluate("document.getElementById('versionChip').textContent");
  assert.ok(version.includes("v"+expectedVersion),"deployed app version should match checked-out index");
  assert.ok(version.includes("save "+expectedSchema),"deployed save schema should match checked-out index");

  const reducedPreference=await evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches");
  assert.equal(reducedPreference,true,"Chrome should emulate the user's reduced-motion preference");
  const motionChip=await evaluate("document.getElementById('motionChip').textContent");
  assert.equal(motionChip,"Motion · reduced","deployed HUD should acknowledge reduced motion");
  const forcedPreference=await evaluate("matchMedia('(forced-colors: active)').matches");
  assert.equal(forcedPreference,true,"Chrome should emulate the user's forced-colors preference");
  const contrastChip=await evaluate("document.getElementById('contrastChip').textContent");
  assert.equal(contrastChip,"Contrast · forced","deployed HUD should acknowledge forced colors");
  const panelShadow=await evaluate("getComputedStyle(document.querySelector('.panel')).boxShadow");
  assert.equal(panelShadow,"none","forced-colors mode should remove decorative panel shadows");
  const activeOutline=await evaluate(`getComputedStyle(document.querySelector('[data-action="nurture"]')).outlineStyle`);
  assert.equal(activeOutline,"solid","active signal state should retain an explicit outline in forced colors");
  await sleep(150);
  const reducedCanvasA=await evaluate("document.getElementById('garden').toDataURL()");
  await sleep(300);
  const reducedCanvasB=await evaluate("document.getElementById('garden').toDataURL()");
  assert.equal(reducedCanvasB,reducedCanvasA,"reduced-motion canvas should remain visually static over time without interaction");

  const title=await evaluate("document.title");
  assert.match(title,/The Signal Garden/);

  const overflow=await evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1");
  assert.equal(overflow,true,"390px viewport should not overflow horizontally");

  await evaluate("if(document.activeElement) document.activeElement.blur()");
  await key("Tab","Tab",9);
  const firstTabClass=await evaluate("document.activeElement && document.activeElement.className");
  assert.match(String(firstTabClass),/skip-link/,"first Tab should reach the skip-to-controls link");
  const firstTabHref=await evaluate("document.activeElement && document.activeElement.getAttribute('href')");
  assert.equal(firstTabHref,"#controls");
  await key("Enter","Enter",13);
  await waitFor("document.activeElement && document.activeElement.id==='controls'","skip-link focus transfer");
  const controlsLabel=await evaluate("document.getElementById('controls').getAttribute('aria-label')");
  assert.equal(controlsLabel,"Signal Garden controls");

  const canvasRole=await evaluate("document.getElementById('garden').getAttribute('role')");
  assert.equal(canvasRole,"img","canvas should identify itself as a visual map rather than the only gameplay control");
  const canvasDescription=await evaluate("document.getElementById('canvasHelp').textContent");
  assert.match(canvasDescription,/All gameplay actions are also available/);

  const initialGuide=await evaluate("document.getElementById('guidePanel').textContent");
  assert.match(initialGuide,/Select an island/,"fresh deployed garden should expose first-step guidance");
  const germinationInitiallyDisabled=await evaluate("document.getElementById('germinateBtn').disabled");
  assert.equal(germinationInitiallyDisabled,true,"fresh garden should disable germination");
  const germinationInitialStatus=await evaluate("document.getElementById('germinateStatus').textContent");
  assert.match(germinationInitialStatus,/6 more resonance/,"disabled germination should expose its missing resource");
  const initialTextMap=await evaluate("document.getElementById('textMap').innerText");
  assert.match(initialTextMap,/isolated/,"fresh deployed Text Map should describe unlinked islands as isolated");

  await evaluate(`document.querySelector('[data-island-id="0"]').click()`);
  const selectionRole=await evaluate("document.getElementById('selectionStatus').getAttribute('role')");
  assert.equal(selectionRole,"status");
  const selectedAnnouncement=await evaluate("document.getElementById('selectionStatus').textContent");
  assert.ok(!selectedAnnouncement.includes("No island selected"),"selected-island status should update after navigator selection");
  const echoInitiallyDisabled=await evaluate(`document.querySelector('[data-glyph="memory"]').disabled`);
  assert.equal(echoInitiallyDisabled,true,"fresh selected island should not offer unaffordable glyph inscription");
  const glyphInitialStatus=await evaluate("document.getElementById('glyphStatus').textContent");
  assert.match(glyphInitialStatus,/3 more resonance/);
  const lifeBefore=Number(await evaluate("document.getElementById('lifeStat').textContent"));
  await evaluate(`document.querySelector('[data-action="nurture"]').click()`);
  await evaluate("document.getElementById('applySelectedBtn').click()");
  const lifeAfter=Number(await evaluate("document.getElementById('lifeStat').textContent"));
  assert.ok(lifeAfter>lifeBefore,"Nurture should increase selected-island life");

  const nurturePressedInitially=await evaluate(`document.querySelector('[data-action="nurture"]').getAttribute('aria-pressed')`);
  assert.equal(nurturePressedInitially,"true","default nurture mode should expose pressed state");
  await evaluate(`document.querySelector('[data-action="connect"]').click()`);
  const connectPressed=await evaluate(`document.querySelector('[data-action="connect"]').getAttribute('aria-pressed')`);
  assert.equal(connectPressed,"true","Connect mode should expose pressed state after selection");
  const nurturePressedAfterConnect=await evaluate(`document.querySelector('[data-action="nurture"]').getAttribute('aria-pressed')`);
  assert.equal(nurturePressedAfterConnect,"false");
  const connectModeStatus=await evaluate("document.getElementById('modeStatus').textContent");
  assert.match(connectModeStatus,/Signal mode: connect/);

  const focusBeforePending=await evaluate("document.getElementById('focusChip').textContent");
  await evaluate(`document.querySelector('[data-island-id="0"]').click()`);
  await evaluate("document.getElementById('applySelectedBtn').click()");
  const pendingConnectStatus=await evaluate("document.getElementById('modeStatus').textContent");
  assert.match(pendingConnectStatus,/Connect source:/,"pending connection should announce its source");
  assert.match(pendingConnectStatus,/Escape to cancel/);
  await key("Escape","Escape",27);
  const cancelledConnectStatus=await evaluate("document.getElementById('modeStatus').textContent");
  assert.match(cancelledConnectStatus,/Signal mode: connect/,"Escape should return Connect to an unarmed state");
  assert.ok(!cancelledConnectStatus.includes("Connect source:"),"Escape should clear the pending connection source");
  const focusAfterCancel=await evaluate("document.getElementById('focusChip').textContent");
  assert.equal(focusAfterCancel,focusBeforePending,"cancelling a pending connection should not spend focus");

  await evaluate(`document.querySelector('[data-island-id="0"]').click()`);
  await evaluate("document.getElementById('applySelectedBtn').click()");
  await evaluate(`document.querySelector('[data-island-id="1"]').click()`);
  await evaluate("document.getElementById('applySelectedBtn').click()");
  const links=Number(await evaluate("document.getElementById('linksStat').textContent"));
  assert.equal(links,1,"Connect should create one live link");
  const linkedGuide=await evaluate("document.getElementById('guidePanel').textContent");
  assert.match(linkedGuide,/Let one cycle pass/,"linked cycle-1 garden should advance starter guidance");
  const linkedTextMap=await evaluate("document.getElementById('textMap').innerText");
  assert.match(linkedTextMap,/live route to/,"Text Map should update after a real bridge is created");

  await evaluate("document.getElementById('restBtn').click()");
  const routeMemory=await evaluate("document.getElementById('historyChip').textContent");
  assert.match(routeMemory,/Route memory [1-9]/,"advancing a linked cycle should create route memory");
  const migratedTextMap=await evaluate("document.getElementById('textMap').innerText");
  assert.match(migratedTextMap,/route memory [1-9]/,"Text Map should expose route history after migration");

  await evaluate(`document.querySelector('[data-island-id="1"]').click()`);
  const glyphButtons=await evaluate(`document.querySelectorAll('[data-glyph]').length`);
  assert.equal(glyphButtons,4);
  const echoReady=await evaluate(`!document.querySelector('[data-glyph="memory"]').disabled`);
  assert.equal(echoReady,true,"migration progress should eventually make Echo inscription available");
  const glyphDescription=await evaluate(`document.querySelector('[data-glyph="memory"]').getAttribute('aria-describedby')`);
  assert.equal(glyphDescription,"glyphCostNote glyphStatus");
  await evaluate(`document.querySelector('[data-glyph="memory"]').click()`);
  const glyph=await evaluate("document.getElementById('glyphStat').textContent");
  assert.equal(glyph,"Echo");
  const echoGlyphPressed=await evaluate(`document.querySelector('[data-glyph="memory"]').getAttribute('aria-pressed')`);
  assert.equal(echoGlyphPressed,"true","selected glyph should expose pressed state");
  const echoDisabledAfterSelection=await evaluate(`document.querySelector('[data-glyph="memory"]').disabled`);
  assert.equal(echoDisabledAfterSelection,true,"currently selected glyph should be a disabled no-op");
  const rootGlyphPressed=await evaluate(`document.querySelector('[data-glyph="life"]').getAttribute('aria-pressed')`);
  assert.equal(rootGlyphPressed,"false");

  await evaluate("if(document.activeElement) document.activeElement.blur()");
  const memoryBefore=Number(await evaluate(`document.querySelector('[data-island-id="1"]').click(); document.getElementById('memoryStat').textContent`));
  await key("2","Digit2",50,"2");
  await key("o","KeyO",79,"o");
  await key("Enter","Enter",13);
  await sleep(100);
  const memoryAfter=Number(await evaluate("document.getElementById('memoryStat').textContent"));
  assert.ok(memoryAfter>memoryBefore,"keyboard 2/O/Enter path should observe island 2");

  const importStartsDisabled=await evaluate("document.getElementById('importBtn').disabled");
  assert.equal(importStartsDisabled,true,"specimen import should begin disabled before preview");
  await evaluate("document.getElementById('specimenBtn').click()");
  await waitFor("document.getElementById('specimenDock').value.startsWith('SG1.')","specimen generation");
  const generatedSpecimen=await evaluate("document.getElementById('specimenDock').value");
  const specimenLength=generatedSpecimen.length;
  assert.ok(specimenLength>40,"generated specimen should be nontrivial SG1 data");
  await waitFor("document.getElementById('importBtn').disabled===false","generated specimen preview");
  const generatedPreview=await evaluate("document.getElementById('specimenPreview').textContent");
  assert.match(generatedPreview,/Valid SG1 specimen/,"generated specimen should receive a valid preview");

  await evaluate("document.getElementById('specimenDock').value += 'x'; document.getElementById('specimenDock').dispatchEvent(new Event('input',{bubbles:true}))");
  const disabledAfterEdit=await evaluate("document.getElementById('importBtn').disabled");
  assert.equal(disabledAfterEdit,true,"editing previewed specimen text must invalidate import");
  const changedPreview=await evaluate("document.getElementById('specimenPreview').textContent");
  assert.match(changedPreview,/Preview again/,"editing specimen text should require a fresh preview");

  await evaluate("document.getElementById('specimenDock').value="+JSON.stringify(generatedSpecimen)+"; document.getElementById('specimenDock').dispatchEvent(new Event('input',{bubbles:true}))");
  await evaluate("document.getElementById('previewSpecimenBtn').click()");
  await waitFor("document.getElementById('importBtn').disabled===false","re-previewed specimen");
  const previewText=await evaluate("document.getElementById('specimenPreview').textContent");
  assert.match(previewText,/Valid SG1 specimen/,"re-preview should validate the restored specimen");
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
  console.log(JSON.stringify({expectedVersion,expectedSchema,version,motionChip,contrastChip,panelShadow,activeOutline,title,firstTabClass,controlsLabel,canvasRole,selectedAnnouncement,nurturePressedInitially,connectPressed,pendingConnectStatus,cancelledConnectStatus,lifeBefore,lifeAfter,links,routeMemory,glyph,echoGlyphPressed,memoryBefore,memoryAfter,specimenLength,germinationInitiallyDisabled,germinationInitialStatus,echoInitiallyDisabled,glyphInitialStatus,echoReady,glyphDescription,echoDisabledAfterSelection,initialTextMap,linkedTextMap,migratedTextMap,generatedPreview,changedPreview,previewText,specimenStatus,reloadedLife,url:selectedUrl}));
}finally{
  if(ws)try{ws.close()}catch{}
  proc.kill("SIGTERM");
  await sleep(100);
  try{fs.rmSync(profile,{recursive:true,force:true})}catch{}
}
