import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const chrome=process.argv[2];
const baseUrl=process.argv[3]||"https://gpt-village.github.io/agent-03-signal-garden/";
assert.ok(chrome,"Chrome executable path is required");

const local=fs.readFileSync("index.html","utf8");
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
  "--no-first-run","--no-default-browser-check",
  "--hide-scrollbars","--remote-debugging-address=127.0.0.1",
  "--remote-debugging-port="+port,"--user-data-dir="+profile,
  "--window-size=390,844","about:blank"
],{stdio:["ignore","pipe","pipe"]});

let chromeErr="",chromeOut="",chromeExit=null;
proc.stderr.on("data",d=>{chromeErr=(chromeErr+String(d)).slice(-12000)});
proc.stdout.on("data",d=>{chromeOut=(chromeOut+String(d)).slice(-12000)});
proc.on("exit",(code,signal)=>{chromeExit={code,signal}});

async function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function getTarget(){
  for(let i=0;i<300;i++){
    if(chromeExit)throw new Error("Chrome exited before DevTools became available: "+JSON.stringify(chromeExit)+"\nstdout:\n"+chromeOut+"\nstderr:\n"+chromeErr);
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
  throw new Error("Chrome DevTools target did not become available after 37.5s. stdout:\n"+chromeOut+"\nstderr:\n"+chromeErr);
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
  const initialForecast=await evaluate("document.getElementById('cycleForecast').textContent");
  assert.match(initialForecast,/Cycle 2 · Quiet/,"fresh garden should forecast cycle 2 Quiet");
  assert.match(initialForecast,/Focus would recover to 8\/8/);
  assert.match(initialForecast,/Incoming signal radar/,"fresh browser should show destination-first radar");
  assert.match(initialForecast,/No incoming signals planned/,"fresh browser should show quiet islands");
  assert.match(initialForecast,/0 of 4 islands expect 0 arrivals next cycle/,"fresh browser radar should summarize empty arrivals");


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
  const mobileHud=await evaluate(`(()=>{
    const ids=["transitChip","historyChip","bondChip","junctionChip","constellationChip","provenanceChip","researchChip","motionChip","contrastChip","versionChip"];
    const essentials=["seasonChip","focusChip","resChip","climateChip","phenomenonChip"];
    const hud=document.querySelector('.hud').getBoundingClientRect(),canvas=document.getElementById('garden').getBoundingClientRect();
    return {
      secondaryHidden:ids.every(id=>getComputedStyle(document.getElementById(id)).display==="none"),
      essentialVisible:essentials.every(id=>getComputedStyle(document.getElementById(id)).display!=="none"),
      contained:hud.left>=canvas.left-1&&hud.right<=canvas.right+1,
      display:getComputedStyle(document.querySelector('.hud')).display,
      rowCount:new Set(essentials.map(id=>Math.round(document.getElementById(id).getBoundingClientRect().top))).size,
      hudHeight:hud.height,
      canvasHeight:canvas.height,
      hudWidth:hud.width,
      canvasWidth:canvas.width
    };
  })()`);
  assert.equal(mobileHud.secondaryHidden,true,"mobile map should hide secondary HUD chips");
  assert.equal(mobileHud.essentialVisible,true,"mobile map should retain essential HUD chips");
  assert.equal(mobileHud.contained,true,"mobile HUD should stay horizontally within the canvas");
  const mobileHudRows=await evaluate(`(()=>{
    const ids=["seasonChip","focusChip","resChip","climateChip","phenomenonChip"];
    const rects=ids.map(id=>document.getElementById(id).getBoundingClientRect());
    const tops=[...new Set(rects.map(r=>Math.round(r.top)))];
    return {
      rowCount:tops.length,
      firstRowSame:Math.round(rects[0].top)===Math.round(rects[1].top)&&Math.round(rects[1].top)===Math.round(rects[2].top),
      secondRowSame:Math.round(rects[3].top)===Math.round(rects[4].top),
      secondBelowFirst:rects[3].top>rects[0].top
    };
  })()`);
  assert.equal(mobileHudRows.rowCount,2,"compact mobile HUD should occupy exactly two rows");
  assert.equal(mobileHudRows.firstRowSame,true);
  assert.equal(mobileHudRows.secondRowSame,true);
  assert.equal(mobileHudRows.secondBelowFirst,true);
  assert.equal(mobileHud.display,"grid","mobile HUD should use the compact grid layout");
  assert.equal(mobileHud.rowCount,2,"essential mobile HUD chips should occupy exactly two rows");
  assert.ok(mobileHud.hudHeight<=70,"mobile HUD should stay within a 70px vertical budget");
  assert.ok(mobileHud.hudHeight/mobileHud.canvasHeight<0.14,"mobile HUD should occupy less than 14% of map height");

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
  const quickNavPosition=await evaluate("getComputedStyle(document.getElementById('quickNav')).position");
  assert.equal(quickNavPosition,"sticky","390px layout should keep section navigation sticky");
  const quickNavHrefs=await evaluate(`Array.from(document.querySelectorAll('#quickNav a')).map(a=>a.getAttribute('href'))`);
  assert.deepEqual(quickNavHrefs,["#worldSection","#actionsSection","#islandSection","#researchSection","#historySection","#specimenSection"],"quick navigation should expose the six intended destinations");

  await evaluate(`document.querySelector('#quickNav a[href="#actionsSection"]').focus()`);
  await key("Enter","Enter",13);
  await waitFor("location.hash==='#actionsSection' && document.activeElement && document.activeElement.id==='actionsSection' && document.querySelector('#quickNav a[href=\"#actionsSection\"]').getAttribute('aria-current')==='location'","keyboard quick-nav destination focus and current state");
  const actionsFocusStyle=await evaluate(`(()=>{
    const e=document.getElementById('actionsSection'),cs=getComputedStyle(e);
    return {outlineStyle:cs.outlineStyle,outlineWidth:parseFloat(cs.outlineWidth),outlineOffset:parseFloat(cs.outlineOffset)};
  })()`);
  assert.equal(actionsFocusStyle.outlineStyle,"solid","keyboard fragment destination should render an explicit focus outline");
  assert.ok(actionsFocusStyle.outlineWidth>=2,"fragment destination focus outline should be at least 2px");
  assert.ok(actionsFocusStyle.outlineOffset>=4,"fragment destination focus outline should clear the section content");
  const actionsCurrent=await evaluate(`Array.from(document.querySelectorAll('#quickNav a')).map(a=>[a.getAttribute('href'),a.getAttribute('aria-current')])`);
  assert.deepEqual(actionsCurrent.filter(x=>x[1]),[["#actionsSection","location"]],"keyboard fragment jump should mark only Actions as current");
  const actionsCurrentContrast=await evaluate(`(()=>{
    const e=document.querySelector('#quickNav a[href="#actionsSection"]'),cs=getComputedStyle(e);
    return {outlineStyle:cs.outlineStyle,outlineWidth:parseFloat(cs.outlineWidth)};
  })()`);
  assert.equal(actionsCurrentContrast.outlineStyle,"solid","forced-colors current-location link should retain an explicit outline");
  assert.ok(actionsCurrentContrast.outlineWidth>=2,"forced-colors current-location outline should be at least 2px");

  await evaluate(`document.querySelector('#quickNav a[href="#researchSection"]').click()`);
  await waitFor("location.hash==='#researchSection' && document.activeElement && document.activeElement.id==='researchSection' && document.querySelector('#quickNav a[href=\"#researchSection\"]').getAttribute('aria-current')==='location'","Research section anchor navigation and current state");
  const researchTargetTop=Number(await evaluate("document.getElementById('researchSection').getBoundingClientRect().top"));
  assert.ok(researchTargetTop>=0&&researchTargetTop<844,"Research jump target should land visibly in the mobile viewport");
  const researchFocused=await evaluate("document.activeElement && document.activeElement.id");
  assert.equal(researchFocused,"researchSection","native Research fragment navigation should move focus to its tabindex target");
  const researchCurrent=await evaluate(`Array.from(document.querySelectorAll('#quickNav a')).filter(a=>a.hasAttribute('aria-current')).map(a=>[a.getAttribute('href'),a.getAttribute('aria-current')])`);
  assert.deepEqual(researchCurrent,[["#researchSection","location"]],"mouse/script fragment jump should update aria-current to Research");
  const historyInitiallyOpen=await evaluate("document.getElementById('historySection').open");
  assert.equal(historyInitiallyOpen,false,"History should begin collapsed");
  await evaluate(`document.querySelector('#quickNav a[href="#historySection"]').click()`);
  await waitFor("location.hash==='#historySection' && document.getElementById('historySection').open===true && document.activeElement && document.activeElement.id==='historySection' && document.querySelector('#quickNav a[href=\"#historySection\"]').getAttribute('aria-current')==='location'","History section reveal, focus, and current state");
  const historyTargetTop=Number(await evaluate("document.getElementById('historySection').getBoundingClientRect().top"));
  assert.ok(historyTargetTop>=0&&historyTargetTop<844,"History jump target should land visibly in the mobile viewport");
  const historyFocused=await evaluate("document.activeElement && document.activeElement.id");
  assert.equal(historyFocused,"historySection","native History fragment navigation should move focus to its tabindex target");

  await send("Emulation.setDeviceMetricsOverride",{width:320,height:568,deviceScaleFactor:1,mobile:true,screenWidth:320,screenHeight:568});
  await sleep(100);
  const narrowPhone=await evaluate(`(()=>{
    const nav=document.getElementById('quickNav').getBoundingClientRect();
    const target=document.getElementById('specimenSection');
    return {
      overflow:document.documentElement.scrollWidth<=document.documentElement.clientWidth+1,
      navPosition:getComputedStyle(document.getElementById('quickNav')).position,
      navDisplay:getComputedStyle(document.getElementById('quickNav')).display,
      navRows:new Set(Array.from(document.querySelectorAll('#quickNav a')).map(a=>Math.round(a.getBoundingClientRect().top))).size,
      navHeight:nav.height,
      scrollMargin:parseFloat(getComputedStyle(target).scrollMarginTop)
    };
  })()`);
  assert.equal(narrowPhone.overflow,true,"320px viewport should not overflow horizontally");
  assert.equal(narrowPhone.navPosition,"sticky","320px viewport should preserve sticky section navigation");
  assert.equal(narrowPhone.navDisplay,"grid","320px quick navigation should use the narrow-phone grid");
  assert.equal(narrowPhone.navRows,2,"six quick links should occupy exactly two rows at 320px");
  assert.ok(narrowPhone.scrollMargin>=narrowPhone.navHeight+8,"mobile fragment clearance should exceed the rendered sticky-nav height");

  const mobileTargets=await evaluate(`(()=>{
    const nodes=Array.from(document.querySelectorAll('button,#quickNav a,summary'));
    const visible=nodes.map((e,i)=>({e,i,r:e.getBoundingClientRect(),cs:getComputedStyle(e)})).filter(x=>x.cs.display!=="none"&&x.cs.visibility!=="hidden"&&x.r.width>0&&x.r.height>0);
    return {
      count:visible.length,
      tooSmall:visible.filter(x=>x.r.width<24||x.r.height<24).map(x=>({
        tag:x.e.tagName,
        id:x.e.id||"",
        text:(x.e.textContent||"").trim().slice(0,60),
        width:x.r.width,
        height:x.r.height
      }))
    };
  })()`);
  assert.ok(mobileTargets.count>=20,"320px target-size audit should inspect a meaningful set of visible controls");
  assert.deepEqual(mobileTargets.tooSmall,[],"every visible button, quick-nav link, and summary should measure at least 24x24 CSS px");

  await evaluate(`document.querySelector('#quickNav a[href="#specimenSection"]').click()`);
  await waitFor("location.hash==='#specimenSection' && document.activeElement && document.activeElement.id==='specimenSection' && document.querySelector('#quickNav a[href=\"#specimenSection\"]').getAttribute('aria-current')==='location'","Specimen section small-phone anchor navigation and current state");
  const narrowLanding=await evaluate(`(()=>{
    const nav=document.getElementById('quickNav').getBoundingClientRect();
    const target=document.getElementById('specimenSection').getBoundingClientRect();
    return {targetTop:target.top,navBottom:nav.bottom,viewport:innerHeight,focused:document.activeElement&&document.activeElement.id};
  })()`);
  assert.ok(narrowLanding.targetTop>=narrowLanding.navBottom+4,"320px Specimen jump target should clear the sticky navigation");
  assert.ok(narrowLanding.targetTop<narrowLanding.viewport,"320px Specimen jump target should remain visible");
  assert.equal(narrowLanding.focused,"specimenSection","small-phone native fragment navigation should focus the Specimen target");
  const specimenCurrent=await evaluate(`Array.from(document.querySelectorAll('#quickNav a')).filter(a=>a.hasAttribute('aria-current')).map(a=>[a.getAttribute('href'),a.getAttribute('aria-current')])`);
  assert.deepEqual(specimenCurrent,[["#specimenSection","location"]],"small-phone Specimen jump should mark Specimen current");

  await evaluate("history.back()");
  await waitFor("location.hash==='#historySection' && document.querySelector('#quickNav a[href=\"#historySection\"]').getAttribute('aria-current')==='location'","native Back fragment navigation and current state");
  const backCurrent=await evaluate(`Array.from(document.querySelectorAll('#quickNav a')).filter(a=>a.hasAttribute('aria-current')).map(a=>[a.getAttribute('href'),a.getAttribute('aria-current')])`);
  assert.deepEqual(backCurrent,[["#historySection","location"]],"browser Back should restore aria-current through hashchange");

  await send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true,screenWidth:390,screenHeight:844});
  await sleep(100);

  const canvasRole=await evaluate("document.getElementById('garden').getAttribute('role')");
  assert.equal(canvasRole,"img","canvas should identify itself as a visual map rather than the only gameplay control");
  const canvasDescription=await evaluate("document.getElementById('canvasHelp').textContent");
  assert.match(canvasDescription,/All gameplay actions are also available/);
  const touchAction=await evaluate("getComputedStyle(document.getElementById('garden')).touchAction");
  assert.match(touchAction,/pan-y/,"canvas should explicitly allow vertical touch panning");
  assert.match(touchAction,/pinch-zoom/,"canvas should preserve pinch zoom");
  const shortcutMeta=await evaluate(`({
    nurture:document.querySelector('[data-action="nurture"]').getAttribute('aria-keyshortcuts'),
    observe:document.querySelector('[data-action="observe"]').getAttribute('aria-keyshortcuts'),
    connect:document.querySelector('[data-action="connect"]').getAttribute('aria-keyshortcuts'),
    distort:document.querySelector('[data-action="distort"]').getAttribute('aria-keyshortcuts'),
    undo:document.getElementById('undoBtn').getAttribute('aria-keyshortcuts'),
    apply:document.getElementById('applySelectedBtn').getAttribute('aria-keyshortcuts'),
    island1:document.querySelector('[data-island-id="0"]').getAttribute('aria-keyshortcuts'),
    island2:document.querySelector('[data-island-id="1"]').getAttribute('aria-keyshortcuts')
  })`);
  assert.deepEqual(shortcutMeta,{nurture:"N",observe:"O",connect:"C",distort:"D",undo:"U",apply:"Enter",island1:"1",island2:"2"},"deployed controls should expose the same shortcuts implemented by the keyboard state machine");

  const initialGuide=await evaluate("document.getElementById('guidePanel').textContent");
  assert.match(initialGuide,/Select an island/,"fresh deployed garden should expose first-step guidance");
  const guideLive=await evaluate("document.getElementById('guidePanel').getAttribute('aria-live')");
  assert.equal(guideLive,null,"Suggested next move should not re-announce on every render");
  const fieldLogLive=await evaluate("document.getElementById('log').getAttribute('aria-live')");
  assert.equal(fieldLogLive,null,"full rolling field log should not be a live region");
  const actionStatusRole=await evaluate("document.getElementById('actionStatus').getAttribute('role')");
  assert.equal(actionStatusRole,"status","latest action feedback should have one dedicated status region");
  const researchSummary=await evaluate("document.getElementById('researchSummary').textContent");
  assert.match(researchSummary,/14 open/,"fresh deployed garden should expose the open research count");
  const researchCompass=await evaluate("document.getElementById('researchCompass').textContent");
  assert.match(researchCompass,/not part of the starting map/,"fresh Research Compass should point to New Land");
  assert.match(researchCompass,/Experiment hint/,"fresh Research Compass should expose an experiment hint");
  assert.match(researchCompass,/0\/6 resonance/,"fresh Research Compass should expose live New Land resource progress");
  const openResearch=await evaluate("document.getElementById('research').textContent");
  assert.match(openResearch,/Hint:/,"open Field Questions should expose state-aware hints");
  const observedResearchSummary=await evaluate("document.getElementById('observedResearchSummary').textContent");
  assert.match(observedResearchSummary,/Observed archive · 0/);
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

  await sleep(300);
  await evaluate("window.scrollTo(0,document.documentElement.scrollHeight)");
  await waitFor("document.getElementById('garden').getBoundingClientRect().bottom < 0","canvas to leave viewport");
  await sleep(350);
  const offscreenCanvasA=await evaluate("document.getElementById('garden').toDataURL()");
  await sleep(350);
  const offscreenCanvasB=await evaluate("document.getElementById('garden').toDataURL()");
  assert.equal(offscreenCanvasB,offscreenCanvasA,"offscreen canvas should stop repainting");

  await evaluate(`document.querySelector('[data-island-id="1"]').click()`);
  await sleep(350);
  const offscreenCanvasAfterSelection=await evaluate("document.getElementById('garden').toDataURL()");
  assert.equal(offscreenCanvasAfterSelection,offscreenCanvasB,"state changes while offscreen should not repaint until the canvas is visible");

  await evaluate("document.getElementById('garden').scrollIntoView({block:'start'})");
  await waitFor("document.getElementById('garden').getBoundingClientRect().top < innerHeight && document.getElementById('garden').getBoundingClientRect().bottom > 0","canvas to re-enter viewport");
  await sleep(400);
  const resumedCanvas=await evaluate("document.getElementById('garden').toDataURL()");
  assert.notEqual(resumedCanvas,offscreenCanvasAfterSelection,"canvas should render the latest state after re-entering the viewport");

  await evaluate(`document.querySelector('[data-island-id="0"]').click()`);
  await sleep(300);
  const echoInitiallyDisabled=await evaluate(`document.querySelector('[data-glyph="memory"]').disabled`);
  assert.equal(echoInitiallyDisabled,true,"fresh selected island should not offer unaffordable glyph inscription");
  const glyphInitialStatus=await evaluate("document.getElementById('glyphStatus').textContent");
  assert.match(glyphInitialStatus,/3 more resonance/);
  const lifeBefore=Number(await evaluate("document.getElementById('lifeStat').textContent"));
  const focusBeforeUndo=await evaluate("document.getElementById('focusChip').textContent");
  const undoInitiallyDisabled=await evaluate("document.getElementById('undoBtn').disabled");
  assert.equal(undoInitiallyDisabled,true,"fresh session should not offer Undo");
  await evaluate(`document.querySelector('[data-action="nurture"]').click()`);
  await evaluate("document.getElementById('applySelectedBtn').click()");
  const lifeAfter=Number(await evaluate("document.getElementById('lifeStat').textContent"));
  assert.ok(lifeAfter>lifeBefore,"Nurture should increase selected-island life");
  assert.equal(await evaluate("document.getElementById('undoBtn').disabled"),false,"Nurture should enable Undo");
  const undoLabel=await evaluate("document.getElementById('undoBtn').textContent");
  assert.match(undoLabel,/Undo Nurture/);
  await evaluate("document.getElementById('undoBtn').click()");
  const lifeAfterUndo=Number(await evaluate("document.getElementById('lifeStat').textContent"));
  const focusAfterUndo=await evaluate("document.getElementById('focusChip').textContent");
  assert.equal(lifeAfterUndo,lifeBefore,"Undo should restore exact pre-Nurture life");
  assert.equal(focusAfterUndo,focusBeforeUndo,"Undo should restore exact pre-Nurture focus");
  assert.equal(await evaluate("document.getElementById('undoBtn').disabled"),true,"single-step Undo should consume its checkpoint");
  const undoAnnouncement=await evaluate("document.getElementById('actionStatus').textContent");
  assert.match(undoAnnouncement,/Undid Nurture/,"Undo should announce concise recovery feedback");
  await evaluate("document.getElementById('applySelectedBtn').click()");
  const lifeAfterRedo=Number(await evaluate("document.getElementById('lifeStat').textContent"));
  assert.equal(lifeAfterRedo,lifeAfter,"redoing the same Nurture after Undo should reproduce the same life result");
  const actionAnnouncement=await evaluate("document.getElementById('actionStatus').textContent");
  assert.match(actionAnnouncement,/Nurtured/,"latest action status should announce concise Nurture feedback");
  const nurturedResearchCompass=await evaluate("document.getElementById('researchCompass').textContent");
  assert.match(nurturedResearchCompass,/1\/6 resonance/,"Research Compass hint should update after real gameplay changes resonance");
  assert.notEqual(nurturedResearchCompass,researchCompass,"Research Compass text should change when relevant state changes");

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
  await evaluate("document.getElementById('cycleForecast').closest('details').open=true");
  const linkedForecast=await evaluate("document.getElementById('cycleForecast').innerText");
  assert.match(linkedForecast,/Planned exports/);
  assert.match(linkedForecast,/→/,"opened linked-garden forecast should name at least one planned migration route");
  assert.match(linkedForecast,/Incoming signal radar/,"linked garden should show incoming radar");
  assert.match(linkedForecast,/→ (life|memory|strange)/,"linked radar should show typed arrivals");
  assert.match(linkedForecast,/[0-9]+ of [0-9]+ islands expect [0-9]+ arrivals? next cycle/,"linked radar should summarize expected arrivals");
  const radarDom=await evaluate("(() => { const el=document.querySelector('#cycleForecast section[aria-label]'); return el ? {label:el.getAttribute('aria-label'), rows:el.querySelectorAll('li').length, text:el.innerText} : null; })()");
  assert.ok(radarDom,"radar must exist as its own accessible region");
  assert.equal(radarDom.label,"Incoming signal radar");
  assert.equal(radarDom.rows,4,"radar should list all four islands, including quiet destinations");
  assert.match(radarDom.text,/2 of 4 islands expect 2 arrivals next cycle/,"radar should summarize the two directed migrations");


  await evaluate("document.getElementById('restBtn').click()");
  const routeMemory=await evaluate("document.getElementById('historyChip').textContent");
  assert.match(routeMemory,/Route memory [1-9]/,"advancing a linked cycle should create route memory");
  const migratedTextMap=await evaluate("document.getElementById('textMap').innerText");
  assert.match(migratedTextMap,/route memory [1-9]/,"Text Map should expose route history after migration");
  const postCycleForecast=await evaluate("document.getElementById('cycleForecast').innerText");
  assert.match(postCycleForecast,/Cycle 3 · Quiet/,"forecast should advance immediately after a real cycle");
  assert.match(postCycleForecast,/Forecast stops before autonomous drift/);


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
  const undoAfterReloadDisabled=await evaluate("document.getElementById('undoBtn').disabled");
  assert.equal(undoAfterReloadDisabled,true,"Undo checkpoint must be session-only and disappear after reload");

  await evaluate(`document.querySelector('[data-action="nurture"]').click()`);
  for(let i=0;i<10;i++){
    const focusNow=Number(await evaluate("document.getElementById('focusChip').textContent.match(/\\d+/)[0]"));
    if(focusNow===0)break;
    await evaluate("document.getElementById('applySelectedBtn').click()");
  }
  const exhaustedFocus=Number(await evaluate("document.getElementById('focusChip').textContent.match(/\\d+/)[0]"));
  assert.equal(exhaustedFocus,0,"real UI actions should be able to exhaust focus");
  const nurtureApplyDisabled=await evaluate("document.getElementById('applySelectedBtn').disabled");
  assert.equal(nurtureApplyDisabled,true,"zero-focus Nurture should disable Apply");
  const exhaustedModeStatus=await evaluate("document.getElementById('modeStatus').textContent");
  assert.match(exhaustedModeStatus,/Unavailable until you regain 1 focus/);
  const exhaustedGuide=await evaluate("document.getElementById('guidePanel').textContent");
  assert.match(exhaustedGuide,/Recover focus/,"starter guidance should react to exhausted focus instead of recommending another spend");

  await evaluate(`document.querySelector('[data-action="connect"]').click()`);
  await evaluate(`document.querySelector('[data-island-id="0"]').click()`);
  const freeArmDisabled=await evaluate("document.getElementById('applySelectedBtn').disabled");
  assert.equal(freeArmDisabled,false,"Connect source arming should remain available at zero focus");
  const freeArmText=await evaluate("document.getElementById('applySelectedBtn').textContent");
  assert.match(freeArmText,/Arm connect.*free/);
  await evaluate("document.getElementById('applySelectedBtn').click()");
  const zeroFocusPending=await evaluate("document.getElementById('modeStatus').textContent");
  assert.match(zeroFocusPending,/Connect source:/);

  await evaluate(`document.querySelector('[data-island-id="1"]').click()`);
  const blockedCompletion=await evaluate("document.getElementById('applySelectedBtn').disabled");
  assert.equal(blockedCompletion,true,"zero-focus Connect completion should be disabled");
  const blockedCompletionStatus=await evaluate("document.getElementById('modeStatus').textContent");
  assert.match(blockedCompletionStatus,/Completing or rewiring needs 1 focus/);

  await evaluate(`document.querySelector('[data-island-id="0"]').click()`);
  const freeCancelDisabled=await evaluate("document.getElementById('applySelectedBtn').disabled");
  assert.equal(freeCancelDisabled,false,"armed Connect source should remain cancellable at zero focus");
  const freeCancelText=await evaluate("document.getElementById('applySelectedBtn').textContent");
  assert.match(freeCancelText,/Cancel connect source.*free/);
  await evaluate("document.getElementById('applySelectedBtn').click()");
  const afterFreeCancel=await evaluate("document.getElementById('modeStatus').textContent");
  assert.ok(!afterFreeCancel.includes("Connect source:"),"free cancellation should clear the pending Connect source");
  assert.equal(Number(await evaluate("document.getElementById('focusChip').textContent.match(/\\d+/)[0]")),0,"free Connect planning/cancellation should not restore or spend focus");

  await evaluate("document.getElementById('garden').scrollIntoView({block:'start'})");
  await waitFor("document.getElementById('garden').getBoundingClientRect().top < innerHeight && document.getElementById('garden').getBoundingClientRect().bottom > 0","canvas for pointer hit test");
  const canvasPoint=await evaluate(`(()=>{const r=document.getElementById('garden').getBoundingClientRect();return {x:r.left+r.width*.24,y:r.top+r.height*.32}})()`);
  await send("Input.dispatchMouseEvent",{type:"mousePressed",x:canvasPoint.x,y:canvasPoint.y,button:"left",clickCount:1});
  await send("Input.dispatchMouseEvent",{type:"mouseReleased",x:canvasPoint.x,y:canvasPoint.y,button:"left",clickCount:1});
  await waitFor("document.getElementById('modeStatus').textContent.includes('Connect source:')","canvas click to arm Connect source");
  const canvasArmedStatus=await evaluate("document.getElementById('modeStatus').textContent");
  assert.match(canvasArmedStatus,/Connect source:/,"actual canvas click should resolve and arm the first island");
  assert.equal(Number(await evaluate("document.getElementById('focusChip').textContent.match(/\\d+/)[0]")),0,"free canvas Connect arming should not spend focus");

  await send("Input.dispatchMouseEvent",{type:"mousePressed",x:canvasPoint.x,y:canvasPoint.y,button:"left",clickCount:1});
  await send("Input.dispatchMouseEvent",{type:"mouseReleased",x:canvasPoint.x,y:canvasPoint.y,button:"left",clickCount:1});
  await waitFor("!document.getElementById('modeStatus').textContent.includes('Connect source:')","canvas click to cancel Connect source");
  const canvasCancelledStatus=await evaluate("document.getElementById('modeStatus').textContent");
  assert.ok(!canvasCancelledStatus.includes("Connect source:"),"second actual canvas click should cancel the armed source");

  const selectedUrl=await evaluate("location.href");
  assert.match(selectedUrl,/seed=browser-smoke-ci/);
  await sleep(150);
  assert.equal(exceptions.length,0,"uncaught browser exceptions: "+JSON.stringify(exceptions));

  console.log("Signal Garden canonical browser smoke passed.");
  console.log(JSON.stringify({expectedVersion,expectedSchema,version,motionChip,contrastChip,panelShadow,activeOutline,title,mobileHud,mobileHudRows,firstTabClass,controlsLabel,quickNavPosition,quickNavHrefs,researchTargetTop,researchFocused,historyInitiallyOpen,historyTargetTop,historyFocused,canvasRole,touchAction,shortcutMeta,initialGuide,guideLive,fieldLogLive,actionStatusRole,researchSummary,researchCompass,observedResearchSummary,selectedAnnouncement,offscreenCanvasStable:offscreenCanvasA===offscreenCanvasB,offscreenSelectionDeferred:offscreenCanvasAfterSelection===offscreenCanvasB,resumeRenderedLatest:resumedCanvas!==offscreenCanvasAfterSelection,actionAnnouncement,nurturePressedInitially,connectPressed,pendingConnectStatus,cancelledConnectStatus,lifeBefore,lifeAfter,focusBeforeUndo,undoInitiallyDisabled,undoLabel,lifeAfterUndo,focusAfterUndo,undoAnnouncement,lifeAfterRedo,links,routeMemory,glyph,echoGlyphPressed,memoryBefore,memoryAfter,specimenLength,germinationInitiallyDisabled,germinationInitialStatus,echoInitiallyDisabled,glyphInitialStatus,echoReady,glyphDescription,echoDisabledAfterSelection,initialTextMap,linkedTextMap,migratedTextMap,generatedPreview,changedPreview,previewText,specimenStatus,reloadedLife,undoAfterReloadDisabled,exhaustedFocus,nurtureApplyDisabled,exhaustedModeStatus,exhaustedGuide,freeArmText,zeroFocusPending,blockedCompletionStatus,freeCancelText,afterFreeCancel,canvasArmedStatus,canvasCancelledStatus,url:selectedUrl}));
}finally{
  if(ws)try{ws.close()}catch{}
  proc.kill("SIGTERM");
  await sleep(100);
  try{fs.rmSync(profile,{recursive:true,force:true})}catch{}
}
