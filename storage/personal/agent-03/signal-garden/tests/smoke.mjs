import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync("site/signal-garden/index.html", "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/i);
assert.ok(match, "inline Signal Garden script should exist");
assert.ok(html.includes('class="skip-link" href="#controls"'),"v0.27 should expose a skip-to-controls link");
assert.ok(html.includes('id="controls" tabindex="-1" aria-label="Signal Garden controls"'),"controls target should be programmatically focusable and labelled");
assert.ok(html.includes('id="garden" width="900" height="660" role="img"'),"canvas should expose visual-map semantics rather than pretending to be the only control");
assert.ok(html.includes('aria-describedby="canvasHelp"'),"canvas should point to equivalent-control guidance");
assert.ok(html.includes('id="canvasHelp"'),"canvas guidance should exist in the document");
assert.ok(html.includes('id="selectionStatus" role="status" aria-live="polite"'),"selected-island context should have a focused polite live region");
assert.ok(html.includes('id="motionChip"'),"v0.29 should expose the active motion preference in the HUD");
assert.ok(html.includes('id="contrastChip"'),"v0.31 should expose the active forced-colors preference in the HUD");
assert.ok(html.includes('@media(forced-colors:active)'),"v0.31 should include a forced-colors stylesheet");
assert.ok(html.includes('outline:2px solid Highlight'),"forced colors should preserve selected state with an explicit system-color outline");
assert.ok(html.includes('id="textMap" class="discoveries" role="region" aria-label="Text map of islands and live routes"'),"v0.30 should expose a labelled nonvisual topology map");
assert.ok(html.includes('id="germinateBtn" disabled aria-describedby="germinateStatus"'),"v0.32 germination should begin disabled with a described reason");
assert.ok(html.includes('id="germinateStatus"'),"germination availability text should exist");
assert.ok(html.includes('id="glyphCostNote"'),"glyph costs should have a stable description");
assert.ok(html.includes('id="glyphStatus"'),"glyph availability text should exist");
assert.ok(html.includes('data-glyph="life" aria-pressed="false" aria-describedby="glyphCostNote glyphStatus"'),"glyph buttons should reference cost and availability descriptions");
assert.ok(html.includes('A textual topology equivalent is available in the Text map panel.'),"canvas guidance should point to the text-map equivalent");
assert.ok(html.includes('@media(prefers-reduced-motion:reduce){button{transition:none}button:hover{transform:none}}'),"reduced-motion CSS should suppress button transition/hover movement");
assert.ok(html.includes('id="modeStatus" role="status" aria-live="polite"'),"signal mode should expose a polite status line");
assert.ok(html.includes('id="actionCostNote"'),"primary actions should expose a resource-cost explanation");
assert.ok(html.includes('aria-describedby="actionCostNote modeStatus"'),"primary action controls should reference cost/status guidance");
assert.ok(html.includes('data-action="nurture" aria-pressed="true"'),"default nurture mode should expose pressed state");
assert.ok(html.includes('data-action="connect" aria-pressed="false"'),"inactive signal modes should expose unpressed state");
assert.ok(html.includes('data-glyph="life" aria-pressed="false"'),"glyph controls should expose toggle state");
assert.ok(html.includes('id="specimenDock"'),"specimen dock should exist in the page");
assert.ok(html.includes('id="specimenStatus"'),"specimen dock should expose inline status");
assert.ok(html.includes('id="specimenPreview"'),"v0.26 specimen dock should expose a preview surface");
assert.ok(html.includes('id="previewSpecimenBtn"'),"specimen dock should expose an explicit preview action");
assert.ok(html.includes('id="importBtn" disabled'),"specimen import should begin disabled until preview succeeds");
assert.ok(!html.includes('prompt("Paste a Signal Garden specimen code'),"specimen import must not regress to prompt-based input");

let source = match[1];
assert.ok(source.includes("previewedSpecimenCode"),"specimen import should be gated by the exact previewed code");
assert.ok(source.includes('e.key==="Escape"&&Number.isInteger(state.connectFrom)'),"Escape should cancel a pending connection source");
assert.ok(source.includes('b.setAttribute("aria-pressed",active?"true":"false")'),"signal-mode pressed state should update during render");
assert.ok(source.includes('b.setAttribute("aria-pressed",selected?"true":"false")'),"glyph pressed state should update during render");
assert.ok(source.includes('var motionQuery=window.matchMedia?window.matchMedia("(prefers-reduced-motion: reduce)"):null'),"rendering should observe the system reduced-motion preference");
assert.ok(source.includes('var w=canvas.width,h=canvas.height,rt=reducedMotion?0:t'),"reduced motion should freeze the canvas animation clock");
assert.ok(source.includes('document.getElementById("motionChip").textContent=reducedMotion?"Motion · reduced":"Motion · standard"'),"HUD should expose whether reduced motion is active");
assert.ok(source.includes('var contrastQuery=window.matchMedia?window.matchMedia("(forced-colors: active)"):null'),"rendering should observe the system forced-colors preference");
assert.ok(source.includes('document.getElementById("contrastChip").textContent=forcedColors?"Contrast · forced":"Contrast · custom"'),"HUD should expose whether forced colors are active");
assert.ok(source.includes('var germinationFull=state.islands.length>=7,germinationReady=!germinationFull&&state.resonance>=6&&state.focus>=2'),"germination availability should be derived before enabling the control");
assert.ok(source.includes('var unavailable=!a||selected||(type!=="none"&&(state.resonance<3||state.focus<1))||(type==="none"&&(state.focus<1||a.glyph==="none"))'),"glyph availability should disable unaffordable and no-op choices");
assert.ok(source.includes('var freeConnectStep=state.action==="connect"&&a&&(!connectSource||connectSource.id===a.id)'),"Apply availability should preserve free Connect planning/cancellation at zero focus");
assert.ok(source.includes('Completing or rewiring a connection needs 1 focus. The source remains armed.'),"blocked Connect completion should explain why it cannot proceed");
const tail = "  renderUI();requestAnimationFrame(draw);";
assert.ok(source.includes(tail), "expected game startup tail");
source = source.replace(
  tail,
  `  globalThis.__gardenTest={
    edgeKey:edgeKey,
    chooseBootSeed:chooseBootSeed,
    validSavedState:validSavedState,
    topologySpecies:topologySpecies,
    symbiosisSpecies:symbiosisSpecies,
    macroClimate:macroClimate,
    recordClimate:recordClimate,
    phenomenonForClimate:phenomenonForClimate,
    advanceClimatePhenomenon:advanceClimatePhenomenon,
    nextCycle:nextCycle,
    getLastCycleReport:function(){return lastCycleReport},
    inscribeGlyph:inscribeGlyph,
    gardenSummary:gardenSummary,
    researchPrompts:researchPrompts,
    specimenCode:specimenCode,
    decodeSpecimen:decodeSpecimen,
    importSpecimenCode:importSpecimenCode,
    migrateSignals:migrateSignals,
    globalImprints:globalImprints,
    ancestralSignal:ancestralSignal,
    spawnIsland:spawnIsland,
    roleMask:roleMask,
    roleHistoryLabel:roleHistoryLabel,
    recordRoleHistory:recordRoleHistory,
    exportTrait:exportTrait,
    edgeSignalCounts:edgeSignalCounts,
    bondForEdgeKey:bondForEdgeKey,
    routeBonds:routeBonds,
    junctionEcologies:junctionEcologies,
    applyJunctionEcologies:applyJunctionEcologies,
    networkConstellation:networkConstellation,
    applyNetworkConstellation:applyNetworkConstellation,
    suggestedMove:suggestedMove,
    textMapModel:textMapModel,
    apply:apply,
    renderUI:renderUI,
    getState:function(){return state},
    setState:function(next){state=next;motes=[]}
  };`
);

function element(extra = {}) {
  const attrs={};
  return Object.assign({
    textContent: "",
    innerHTML: "",
    disabled: false,
    style: {},
    dataset: {},
    classList: { toggle() {} },
    addEventListener() {},
    setAttribute(name,value){attrs[name]=String(value)},
    getAttribute(name){return Object.prototype.hasOwnProperty.call(attrs,name)?attrs[name]:null},
    removeAttribute(name){delete attrs[name]},
    closest() { return null; }
  }, extra);
}

const ctx2d = {
  clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
  quadraticCurveTo() {}, stroke() {}, fill() {}, arc() {}, ellipse() {},
  setLineDash() {}, fillText() {},
  createLinearGradient() { return { addColorStop() {} }; },
  createRadialGradient() { return { addColorStop() {} }; }
};

const canvas = element({
  width: 900,
  height: 660,
  getContext() { return ctx2d; },
  getBoundingClientRect() { return { width: 900, height: 660, left: 0, top: 0 }; }
});

const ids = new Map();
ids.set("garden", canvas);
[
  "seasonChip","focusChip","resChip","transitChip","historyChip","bondChip","junctionChip","constellationChip","provenanceChip","researchChip","climateChip","motionChip","contrastChip","germinateBtn","germinateStatus",
  "islandNav","applySelectedBtn","selectedName","selectedLore","lifeStat",
  "memoryStat","strangeStat","linksStat","arrivalsStat","trafficStat","glyphStat","lineageStat","successionStat","lifeMeter",
  "research","bonds","provenance","constellation","junctions","species","discoveries","chronicle","log","guidePanel","textMap","modeStatus","actionCostNote","glyphCostNote","glyphStatus","restBtn","soundBtn","summaryBtn","exportBtn","specimenBtn","importBtn","resetBtn"
].forEach(id => ids.set(id, element()));

const actionButtons = ["nurture","observe","connect","distort"].map(action =>
  element({ dataset: { action } })
);
const glyphButtons = ["life","memory","strange","none"].map(glyph =>
  element({ dataset: { glyph } })
);

const store = new Map();
const sandbox = {
  console,
  URLSearchParams,
  location: { search: "", origin: "https://example.test", pathname: "/signal-garden/" },
  document: {
    getElementById(id) {
      if (!ids.has(id)) ids.set(id, element());
      return ids.get(id);
    },
    querySelectorAll(sel) { return sel === "[data-action]" ? actionButtons : sel === "[data-glyph]" ? glyphButtons : []; },
    addEventListener() {}
  },
  window: { matchMedia() { return { matches: true }; } },
  localStorage: {
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { store.set(k, String(v)); },
    removeItem(k) { store.delete(k); }
  },
  navigator: { clipboard: { async writeText() {} } },
  performance: { now() { return 0; } },
  requestAnimationFrame() {},
  prompt() { return null; },
  confirm() { return true; },
  alert() {},
  btoa(s) { return Buffer.from(s, "binary").toString("base64"); },
  atob(s) { return Buffer.from(s, "base64").toString("binary"); }
};
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: "signal-garden-inline.js" });
const api = sandbox.__gardenTest;
assert.ok(api, "test API should be exposed");

function island(id, links = [], life = 50, memory = 20, strange = 10) {
  const trait = strange >= life && strange >= memory ? "strange" : memory >= life ? "memory" : "life";
  const rolesSeen={life:false,memory:false,strange:false};
  rolesSeen[trait]=true;
  return { id, links: [...links], life, memory, strange, arrivals: 0, glyph: "none", imprints:{life:0,memory:0,strange:0}, lineage:"none", rolesSeen, palimpsest:false };
}
function setGraph(islands, edgeMemory = {}, edgeSignals = {}) {
  api.setState({
    seed: "testseed",
    cycle: 2,
    focus: 8,
    resonance: 0,
    mode: "Quiet",
    selected: null,
    action: "nurture",
    discoveries: [],
    log: [],
    chronicle: [],
    edgeMemory: { ...edgeMemory },
    edgeSignals: Object.fromEntries(Object.entries(edgeSignals).map(([k,v])=>[k,{...v}])),
    climateSeen: {},
    lastClimate: null,
    streakClimate: null,
    climateStreak: 0,
    activePhenomenon: null,
    phenomenaSeen: {},
    transplantCount: 0,
    islands
  });
}

assert.equal(api.edgeKey(4, 1), "1-4");
assert.equal(api.edgeKey(1, 4), "1-4");

setGraph([island(0),island(1),island(2),island(3)]);
api.renderUI();
assert.equal(ids.get("germinateBtn").disabled,true,"fresh garden should expose germination as disabled");
assert.match(ids.get("germinateStatus").textContent,/6 more resonance/,"fresh germination status should explain the missing resource");
assert.ok(glyphButtons.every(b=>b.disabled),"glyph controls should be unavailable until an island is selected");

api.getState().selected=0;
api.renderUI();
assert.equal(glyphButtons[0].disabled,true);
assert.equal(glyphButtons[3].disabled,true,"Clear should be disabled when the selected island has no glyph");
assert.match(ids.get("glyphStatus").textContent,/3 more resonance/);

setGraph([island(0),island(1),island(2),island(3)]);
api.getState().selected=0;
api.getState().focus=0;
api.getState().action="nurture";
const lifeBeforeNoFocus=api.getState().islands[0].life;
api.renderUI();
assert.equal(ids.get("applySelectedBtn").disabled,true,"zero-focus nurture should disable Apply");
assert.match(ids.get("modeStatus").textContent,/Unavailable until you regain 1 focus/);
api.apply(api.getState().islands[0]);
assert.equal(api.getState().islands[0].life,lifeBeforeNoFocus,"zero-focus nurture must not mutate life");

api.getState().action="connect";
api.renderUI();
assert.equal(ids.get("applySelectedBtn").disabled,false,"Connect source arming should remain available at zero focus");
assert.match(ids.get("applySelectedBtn").textContent,/Arm connect.*free/);
api.apply(api.getState().islands[0]);
assert.equal(api.getState().connectFrom,0,"zero-focus Connect should arm a source for free");
assert.equal(api.getState().focus,0);

api.getState().selected=1;
api.renderUI();
assert.equal(ids.get("applySelectedBtn").disabled,true,"zero-focus Connect completion should be disabled");
assert.match(ids.get("modeStatus").textContent,/Completing or rewiring needs 1 focus/);
api.apply(api.getState().islands[1]);
assert.equal(api.getState().islands[0].links.length,0,"blocked Connect completion must not mutate topology");
assert.equal(api.getState().connectFrom,0,"blocked Connect completion should preserve the armed source");

api.getState().selected=0;
api.renderUI();
assert.equal(ids.get("applySelectedBtn").disabled,false,"armed Connect source should remain freely cancellable");
assert.match(ids.get("applySelectedBtn").textContent,/Cancel connect source.*free/);
api.apply(api.getState().islands[0]);
assert.equal(api.getState().connectFrom,undefined,"zero-focus Connect cancellation should clear the source");
assert.equal(api.getState().focus,0,"free Connect planning/cancellation must not spend focus");

api.getState().resonance=3;api.getState().focus=2;
api.renderUI();
assert.equal(glyphButtons[0].disabled,false,"affordable Root glyph should enable");
assert.equal(glyphButtons[1].disabled,false,"affordable Echo glyph should enable");
assert.equal(glyphButtons[2].disabled,false,"affordable Fold glyph should enable");
assert.equal(glyphButtons[3].disabled,true,"Clear remains a no-op when there is no glyph");

api.inscribeGlyph("life");
assert.equal(glyphButtons[0].disabled,true,"currently selected glyph should become a disabled no-op");
assert.equal(glyphButtons[0].getAttribute("aria-pressed"),"true");
assert.equal(glyphButtons[3].disabled,false,"Clear should enable when a glyph exists and focus remains");
assert.match(ids.get("glyphStatus").textContent,/Clear is available/);

setGraph([island(0),island(1),island(2),island(3)]);
api.getState().resonance=6;api.getState().focus=2;
api.renderUI();
assert.equal(ids.get("germinateBtn").disabled,false,"germination should enable exactly when resources are sufficient");
assert.match(ids.get("germinateStatus").textContent,/Ready:/);

api.getState().islands.push(island(4),island(5),island(6));
api.renderUI();
assert.equal(ids.get("germinateBtn").disabled,true,"seven-island sky should disable further germination");
assert.match(ids.get("germinateStatus").textContent,/all seven stable island sites are occupied/);
assert.equal(api.chooseBootSeed("urlseed",{seed:"savedseed"}),"urlseed","explicit URL seed should win");
assert.equal(api.chooseBootSeed(null,{seed:"savedseed"}),"savedseed","saved seed should stabilize ordinary reloads");
assert.equal(api.chooseBootSeed(null,{seed:"bad seed with spaces"}),null,"invalid saved seed should not be trusted");

setGraph([island(0),island(1),island(2),island(3)]);
api.getState().cycle=1;
assert.equal(api.suggestedMove().title,"1 · Select an island","clean garden should guide selection first");
api.getState().selected=0;
api.getState().focus=0;
assert.equal(api.suggestedMove().title,"2 · Recover bridge focus","unlinked zero-focus garden should not recommend an unaffordable bridge");
assert.match(api.suggestedMove().text,/completing the first bridge needs 1 focus/);
api.getState().focus=8;
assert.equal(api.suggestedMove().title,"2 · Make a bridge","selected affordable unlinked garden should guide bridge creation");
api.getState().islands[0].links=[1];api.getState().islands[1].links=[0];
api.getState().focus=0;
assert.equal(api.suggestedMove().title,"3 · Let one cycle pass","cycle-1 migration step should also recover exhausted focus");
api.getState().cycle=2;
assert.equal(api.suggestedMove().title,"4 · Recover focus","evolved zero-focus garden should guide recovery before spending actions");
api.getState().focus=8;api.getState().resonance=2;
assert.equal(api.suggestedMove().title,"4 · Build resonance","early evolved garden should explain resonance");
api.getState().resonance=6;api.getState().focus=1;
assert.equal(api.suggestedMove().title,"5 · Restore germination focus","resonance-ready garden with only 1 focus must not claim germination is ready");
api.getState().focus=2;
assert.equal(api.suggestedMove().title,"5 · Germinate new land","ready four-island garden should surface germination");
api.getState().islands.push(island(4));
assert.equal(api.suggestedMove().title,"Open research","expanded garden should hand the visitor off to open research");

setGraph([island(0),island(1),island(2),island(3)]);
let textMap=api.textMapModel();
assert.equal(textMap.islands.length,4,"text map should include every island");
assert.ok(textMap.islands.every(x=>x.text.includes("isolated")),"fresh unlinked garden should describe every island as isolated");
setGraph(
  [island(0,[1]),island(1,[0]),island(2),island(3)],
  {"0-1":6},
  {"0-1":{life:4,memory:1,strange:1}}
);
textMap=api.textMapModel();
assert.ok(textMap.islands[0].text.includes("live route to"),"text map should name live neighbors");
assert.ok(textMap.islands[0].text.includes("Rootway"),"text map should expose mature route-bond identity");
assert.ok(textMap.islands[0].text.includes("route memory 6"),"text map should expose route memory");

setGraph([island(0),island(1),island(2),island(3)]);
api.getState().islands[0].imprints={life:3,memory:1,strange:0};
api.getState().islands[1].imprints={life:3,memory:0,strange:1};
{
  const im=api.globalImprints();
  assert.equal(im.life,6);
  assert.equal(im.memory,1);
  assert.equal(im.strange,1);
  assert.equal(im.total,8);
}
assert.equal(api.ancestralSignal(),"life","strong migration ancestry should resolve to its dominant signal");

api.getState().islands[0].imprints={life:4,memory:4,strange:0};
api.getState().islands[1].imprints={life:0,memory:0,strange:0};
assert.equal(api.ancestralSignal(),"none","tied ancestry should not invent a lineage");

setGraph([island(0),island(1),island(2),island(3)]);
const successionIsland=api.getState().islands[0];
successionIsland.life=80;successionIsland.memory=10;successionIsland.strange=5;
api.recordRoleHistory(successionIsland);
successionIsland.life=10;successionIsland.memory=80;successionIsland.strange=5;
api.recordRoleHistory(successionIsland);
assert.equal(successionIsland.palimpsest,false,"two lived roles should not be enough for Palimpsest");
successionIsland.life=10;successionIsland.memory=5;successionIsland.strange=80;
const becamePalimpsest=api.recordRoleHistory(successionIsland);
assert.equal(becamePalimpsest,true,"third lived role should create Palimpsest exactly once");
assert.equal(successionIsland.palimpsest,true);
assert.equal(api.roleMask(successionIsland),7);
assert.equal(api.researchPrompts().find(x=>x.id==="succession").done,true,"Palimpsest should complete succession Field Question");
api.getState().cycle=4;
assert.equal(api.exportTrait(successionIsland),"memory","Palimpsest export rotation should be deterministic from cycle and island id");
assert.equal(api.recordRoleHistory(successionIsland),false,"already-Palimpsest island should not retrigger the transition");

setGraph([island(0,[1]),island(1,[0]),island(2),island(3)],{"0-1":6},{"0-1":{life:4,memory:1,strange:1}});
assert.equal(api.bondForEdgeKey("0-1").kind,"rootway","life-heavy typed route history should mature into Rootway");
assert.equal(api.routeBonds()[0].name,"Rootway");

setGraph([island(0,[1]),island(1,[0]),island(2),island(3)],{"0-1":6},{"0-1":{life:1,memory:4,strange:1}});
assert.equal(api.bondForEdgeKey("0-1").kind,"echo-span","memory-heavy typed route history should mature into Echo Span");

setGraph([island(0,[1]),island(1,[0]),island(2),island(3)],{"0-1":6},{"0-1":{life:1,memory:1,strange:4}});
assert.equal(api.bondForEdgeKey("0-1").kind,"fold-thread","strange-heavy typed route history should mature into Fold Thread");

setGraph([island(0,[1]),island(1,[0]),island(2),island(3)],{"0-1":9},{"0-1":{life:3,memory:3,strange:3}});
assert.equal(api.bondForEdgeKey("0-1").kind,"braided","balanced mature three-signal history should create Braided Bond");
assert.equal(api.researchPrompts().find(x=>x.id==="bond").done,true,"Braided Bond should complete its Field Question");

setGraph([island(0,[1]),island(1,[0]),island(2),island(3)],{"0-1":6},{"0-1":{life:3,memory:3,strange:0}});
assert.equal(api.bondForEdgeKey("0-1"),null,"tied two-signal route history should not invent a specialized bond");

setGraph([island(0,[1]),island(1,[0]),island(2),island(3)],{"0-1":20});
assert.equal(api.bondForEdgeKey("0-1"),null,"legacy scalar route memory must not fabricate typed bond history");

setGraph(
  [island(0,[1,2]),island(1,[0]),island(2,[0]),island(3)],
  {"0-1":6,"0-2":6},
  {"0-1":{life:4,memory:1,strange:1},"0-2":{life:1,memory:4,strange:1}}
);
assert.equal(api.junctionEcologies()[0].kind,"scribe-orchard","Rootway + Echo Span should form Scribe Orchard");

setGraph(
  [island(0,[1,2]),island(1,[0]),island(2,[0]),island(3)],
  {"0-1":6,"0-2":6},
  {"0-1":{life:4,memory:1,strange:1},"0-2":{life:1,memory:1,strange:4}}
);
assert.equal(api.junctionEcologies()[0].kind,"prism-nursery","Rootway + Fold Thread should form Prism Nursery");

setGraph(
  [island(0,[1,2]),island(1,[0]),island(2,[0]),island(3)],
  {"0-1":6,"0-2":6},
  {"0-1":{life:1,memory:4,strange:1},"0-2":{life:1,memory:1,strange:4}}
);
assert.equal(api.junctionEcologies()[0].kind,"dream-estuary","Echo Span + Fold Thread should form Dream Estuary");

setGraph(
  [island(0,[1,2]),island(1,[0]),island(2,[0]),island(3)],
  {"0-1":9,"0-2":6},
  {"0-1":{life:3,memory:3,strange:3},"0-2":{life:4,memory:1,strange:1}}
);
assert.equal(api.junctionEcologies()[0].kind,"confluence-knot","Braided Bond plus another mature route should form Confluence Knot");

setGraph(
  [island(0,[1,2,3],50,50,50),island(1,[0]),island(2,[0]),island(3,[0])],
  {"0-1":6,"0-2":6,"0-3":6},
  {
    "0-1":{life:4,memory:1,strange:1},
    "0-2":{life:1,memory:4,strange:1},
    "0-3":{life:1,memory:1,strange:4}
  }
);
const triune=api.junctionEcologies()[0];
assert.equal(triune.kind,"triune-loom","all three specialized bond families should form Triune Loom");
assert.equal(api.researchPrompts().find(x=>x.id==="junction").done,true,"Triune Loom should complete its Field Question");
const triuneBefore={life:api.getState().islands[0].life,memory:api.getState().islands[0].memory,strange:api.getState().islands[0].strange};
api.applyJunctionEcologies();
assert.equal(api.getState().islands[0].life,triuneBefore.life+1);
assert.equal(api.getState().islands[0].memory,triuneBefore.memory+1);
assert.equal(api.getState().islands[0].strange,triuneBefore.strange+1);

setGraph([
  island(0,[1,2,3],80,10,5),
  island(1,[0]),island(2,[0]),island(3,[0])
]);
assert.equal(api.networkConstellation().kind,"star-crown","one hub with three leaves should form Star Crown");
const starLife=api.getState().islands[0].life;
api.applyNetworkConstellation();
assert.equal(api.getState().islands[0].life,starLife+1,"Star Crown should amplify the hub's present dominant trait");

setGraph([
  island(0,[1,2]),island(1,[0,2]),island(2,[0,1]),island(3)
]);
assert.equal(api.networkConstellation().kind,"halo-circuit","one connected degree-two ring should form Halo Circuit");
const haloBefore=api.getState().islands.slice(0,3).map(x=>x.memory);
api.applyNetworkConstellation();
api.getState().islands.slice(0,3).forEach((x,i)=>assert.equal(x.memory,haloBefore[i]+1,"Halo Circuit should add memory to every active island"));

setGraph([
  island(0,[1]),island(1,[0,2]),island(2,[1,3]),island(3,[2])
]);
assert.equal(api.networkConstellation().kind,"living-arbor","connected acyclic non-star graph should form Living Arbor");
const leaf0=api.getState().islands[0].life,leaf3=api.getState().islands[3].life;
api.applyNetworkConstellation();
assert.equal(api.getState().islands[0].life,leaf0+1);
assert.equal(api.getState().islands[3].life,leaf3+1);

setGraph([
  island(0,[1,2,3]),island(1,[0,2,3]),island(2,[0,1,3]),island(3,[0,1,2])
]);
assert.equal(api.networkConstellation().kind,"mesh-choir","dense connected graph should form Mesh Choir");
assert.equal(api.researchPrompts().find(x=>x.id==="constellation").done,true,"Mesh Choir should complete its Field Question");
api.getState().discoveries=[{id:"constellation-mesh-choir",title:"Mesh Choir",text:"already observed",cycle:1}];
const meshRes=api.getState().resonance;
api.applyNetworkConstellation();
assert.equal(api.getState().resonance,meshRes+1,"repeat Mesh Choir pulse should add exactly one garden resonance");

setGraph([
  island(0,[1]),island(1,[0]),island(2,[3]),island(3,[2])
]);
assert.equal(api.networkConstellation(),null,"disconnected active components must not impersonate a whole-network constellation");

setGraph([
  island(0, [], 80, 20, 10),
  island(1, [], 75, 25, 10),
  island(2, [], 70, 20, 15),
  island(3, [], 76, 24, 12)
]);
assert.equal(api.macroClimate().id,"verdant","life-dominant archipelago should create Verdant Air");

setGraph([
  island(0, [], 20, 80, 10),
  island(1, [], 25, 75, 10),
  island(2, [], 20, 70, 15),
  island(3, [], 24, 76, 12)
]);
assert.equal(api.macroClimate().id,"echo","memory-dominant archipelago should create Echo Haze");

setGraph([
  island(0, [], 20, 10, 80),
  island(1, [], 25, 10, 75),
  island(2, [], 20, 15, 70),
  island(3, [], 24, 12, 76)
]);
assert.equal(api.macroClimate().id,"fracture","strangeness-dominant archipelago should create Fracture Weather");

setGraph([
  island(0, [], 55, 50, 50),
  island(1, [], 50, 55, 50),
  island(2, [], 50, 50, 55),
  island(3, [], 52, 52, 52)
]);
assert.equal(api.macroClimate().id,"braided","balanced archipelago should create Braided Sky");

const validSave = {
  seed:"testseed",cycle:2,focus:4,resonance:3,
  islands:[island(0,[1]),island(1,[0]),island(2,[]),island(3,[])]
};
assert.equal(api.validSavedState(validSave,"testseed"), true, "well-formed local save should validate");
assert.equal(api.validSavedState({...validSave,islands:[island(0,[])]},"testseed"), false, "too-small local save should be rejected");
const badLinksSave = {
  ...validSave,
  islands:[island(0,[99]),island(1,[]),island(2,[]),island(3,[])]
};
assert.equal(api.validSavedState(badLinksSave,"testseed"), false, "out-of-range saved link should be rejected");

setGraph([
  island(0, [], 85, 10, 5),
  island(1, [], 80, 15, 5),
  island(2, [], 75, 20, 10),
  island(3, [], 90, 10, 5)
]);
assert.equal(api.macroClimate().id, "verdant", "life-heavy archipelago should produce Verdant Air");
api.recordClimate();
assert.equal(api.getState().climateSeen.verdant, true);
assert.ok(api.getState().chronicle.some(x => x.kind === "climate"), "first recorded climate should enter the chronicle");
const lifeBeforeSeedRain=api.getState().islands.map(x=>x.life);
api.advanceClimatePhenomenon();
api.advanceClimatePhenomenon();
api.advanceClimatePhenomenon();
assert.equal(api.getState().activePhenomenon,"seed-rain","three sustained Verdant cycles should activate Seed Rain");
assert.equal(api.getState().phenomenaSeen["seed-rain"],true,"Seed Rain should enter bounded phenomenon history");
assert.equal(api.researchPrompts().find(x=>x.id==="phenomenon").done,true,"triggering a climate phenomenon should complete the optional phenomenon research question");
api.getState().islands.forEach((x,i)=>assert.ok(x.life>=lifeBeforeSeedRain[i]+2,"Seed Rain should add bounded life to every island"));
assert.ok(api.getState().chronicle.some(x=>x.kind==="phenomenon"),"first phenomenon pulse should enter the chronicle");

setGraph([
  island(0, [], 10, 85, 5),
  island(1, [], 15, 80, 5),
  island(2, [], 20, 75, 10),
  island(3, [], 10, 90, 5)
]);
assert.equal(api.macroClimate().id, "echo", "memory-heavy archipelago should produce Echo Haze");

setGraph([
  island(0, [], 10, 5, 85),
  island(1, [], 15, 5, 80),
  island(2, [], 20, 10, 75),
  island(3, [], 10, 5, 90)
]);
assert.equal(api.macroClimate().id, "fracture", "strangeness-heavy archipelago should produce Fracture Weather");

setGraph([
  island(0, [], 50, 49, 48),
  island(1, [], 48, 50, 49),
  island(2, [], 49, 48, 50),
  island(3, [], 50, 50, 50)
]);
assert.equal(api.macroClimate().id, "braided", "balanced archipelago should produce Braided Sky");

setGraph([
  island(0, [1, 2, 3]),
  island(1, [0]),
  island(2, [0]),
  island(3, [0])
]);
assert.ok(api.topologySpecies().some(x => x.id === "crown"), "3+ degree hub should host Relay Crown");

setGraph([
  island(0, [1, 2]),
  island(1, [0, 2]),
  island(2, [0, 1])
]);
assert.ok(api.topologySpecies().some(x => x.id === "loopmoss"), "connected ring should host Loopmoss");
assert.equal(api.researchPrompts().find(x => x.id === "ring").done, true, "ring research question should observe Loopmoss topology");

setGraph([
  island(0, [1, 2]),
  island(1, [0, 2]),
  island(2, [0, 1]),
  island(3, [4, 5]),
  island(4, [3, 5]),
  island(5, [3, 4])
]);
assert.ok(!api.topologySpecies().some(x => x.id === "loopmoss"), "disconnected rings must not masquerade as one Loopmoss ring");
assert.equal(api.researchPrompts().find(x => x.id === "ring").done, false, "disconnected rings should not complete ring research");

setGraph([
  island(0, [1]),
  island(1, [0, 2]),
  island(2, [1, 3]),
  island(3, [2])
]);
assert.ok(api.topologySpecies().some(x => x.id === "threadfin"), "connected simple corridor should host Threadfin");

setGraph([island(0), island(1)], { "0-1": 6 });
assert.ok(api.topologySpecies().some(x => x.id === "ghostreed"), "severed remembered route should host Ghost Reed");

setGraph([
  island(0, [1], 80, 10, 5),
  island(1, [0], 10, 80, 5)
], { "0-1": 4 });
assert.ok(api.symbiosisSpecies().some(x => x.kind === "scribevine"), "mature grove/archive route should host Scribevine");

setGraph([
  island(0, [1], 80, 10, 5),
  island(1, [0], 10, 5, 80)
], { "0-1": 4 });
assert.ok(api.symbiosisSpecies().some(x => x.kind === "glassmycelium"), "mature grove/fold route should host Glass Mycelium");

setGraph([
  island(0, [1], 10, 80, 5),
  island(1, [0], 10, 5, 80)
], { "0-1": 4 });
assert.ok(api.symbiosisSpecies().some(x => x.kind === "dreamwire"), "mature archive/fold route should host Dreamwire");

setGraph([
  island(0, [1], 80, 10, 5),
  island(1, [0], 10, 80, 5)
]);
api.getState().islands[1].glyph = "memory";
api.getState().islands[1].lineage = "life";
const memoryBeforeGlyphMigration = api.getState().islands[1].memory;
const lineageTransfers=api.migrateSignals();
const lineageArrival=lineageTransfers.find(x=>x.to===1&&x.type==="life");
assert.ok(lineageArrival,"life migration should reach the lineage test receiver");
assert.equal(lineageArrival.lineageBonus,1,"matching echo lineage should add exactly one migration strength");
api.getState().islands[0].rolesSeen={life:true,memory:true,strange:true};
api.getState().islands[0].palimpsest=true;
api.getState().cycle=2;
const rememberedTransfers=api.migrateSignals();
const remembered=rememberedTransfers.find(x=>x.from===0);
assert.ok(remembered&&remembered.sourcePalimpsest,"Palimpsest migration should identify its remembered-self source");
assert.equal(remembered.type,"strange","cycle 2 / island 0 should rotate Palimpsest export to strange");
assert.equal(api.getState().edgeMemory["0-1"], 4, "two migration pulses should accumulate four total directed crossings");
assert.equal(api.getState().islands[0].arrivals, 2,"two migration pulses should produce two arrivals on island 0");
assert.equal(api.getState().islands[1].arrivals, 2,"two migration pulses should produce two arrivals on island 1");
assert.equal(api.getState().islands[0].imprints.memory,2,"island 0 should receive memory ancestry on both pulses");
assert.equal(api.getState().islands[1].imprints.life,1,"island 1 should retain the first life ancestry imprint");
assert.equal(api.getState().islands[1].imprints.strange,1,"Palimpsest remembered-self export should add a strange ancestry imprint");
assert.ok(api.getState().islands[1].memory >= memoryBeforeGlyphMigration + 2, "Echo glyph should add memory on incoming migration");

setGraph([
  island(0,[1],80,10,5),
  island(1,[0],20,70,10),
  island(2),island(3)
],{"0-1":6},{"0-1":{life:4,memory:1,strange:1}});
api.getState().cycle=2;
const bondedTransfers=api.migrateSignals();
const rootwayTransfer=bondedTransfers.find(x=>x.from===0&&x.to===1&&x.type==="life");
assert.ok(rootwayTransfer,"Rootway test should include a life migration");
assert.equal(rootwayTransfer.bondBonus,1,"matching Rootway should add exactly one route-bond strength");
assert.equal(rootwayTransfer.bondName,"Rootway");
assert.equal(api.edgeSignalCounts("0-1").life,5,"typed route history should increment after the crossing");

setGraph([
  island(0,[1],80,10,5),
  island(1,[0],20,70,10),
  island(2),island(3)
],{"0-1":5},{"0-1":{life:3,memory:1,strange:1}});
api.migrateSignals();
assert.ok(api.routeBonds().some(x=>x.kind==="rootway"),"new typed crossings should be able to mature a previously unbonded route");
assert.ok(api.getState().chronicle.some(x=>x.kind==="bond"),"first route-bond maturation should enter the Chronicle");

setGraph([
  island(0,[1],10,5,80),
  island(1,[0],10,80,5),
  island(2),island(3)
],{"0-1":7},{"0-1":{life:4,memory:2,strange:1}});
assert.equal(api.bondForEdgeKey("0-1").kind,"rootway");
api.migrateSignals();
assert.equal(api.bondForEdgeKey("0-1").kind,"braided","mixed later traffic should evolve Rootway into Braided Bond");
assert.ok(api.getState().chronicle.some(x=>x.kind==="bond"&&x.msg.includes("transitioned from Rootway to Braided Bond")),"bond identity transition should enter the Chronicle");

setGraph([
  island(0, [1], 80, 10, 5),
  island(1, [0], 10, 80, 5),
  island(2, [], 50, 20, 10),
  island(3, [], 50, 20, 10)
]);
api.nextCycle();
const cycleReport=api.getLastCycleReport();
assert.ok(cycleReport,"advancing a cycle should produce a Last Cycle Report");
assert.equal(cycleReport.cycle,3);
assert.ok(Array.isArray(cycleReport.transfers)&&cycleReport.transfers.length===2,"report should include exact migration transfers");
assert.ok(Array.isArray(cycleReport.junctions),"report should include a junction-ecology list");
assert.ok("constellation" in cycleReport,"report should include network-constellation state");
assert.ok(Array.isArray(cycleReport.roleChanges),"report should include a role-change list");

setGraph(
  [island(0,[1,2,3],50,50,50),island(1,[0]),island(2,[0]),island(3,[0])],
  {"0-1":10,"0-2":10,"0-3":10},
  {
    "0-1":{life:8,memory:1,strange:1},
    "0-2":{life:1,memory:8,strange:1},
    "0-3":{life:1,memory:1,strange:8}
  }
);
api.nextCycle();
const junctionReport=api.getLastCycleReport();
assert.ok(junctionReport.junctions.some(x=>x.kind==="triune-loom"),"Last Cycle Report should name a pulsing Triune Loom");

setGraph([
  island(0,[1,2,3],80,10,5),
  island(1,[0]),island(2,[0]),island(3,[0])
]);
api.nextCycle();
const starReport=api.getLastCycleReport();
assert.equal(starReport.constellation.kind,"star-crown","Last Cycle Report should name the pulsing whole-network constellation");
assert.ok(starReport.constellation.effect.includes("hub"),"constellation report should include its causal effect");

setGraph([
  island(0, [1], 85, 10, 5),
  island(1, [0], 79, 80, 5)
]);
const senderOneInitialTrait = api.getState().islands[1].memory > api.getState().islands[1].life ? "memory" : "life";
assert.equal(senderOneInitialTrait, "memory");
const islandZeroMemoryBefore = api.getState().islands[0].memory;
api.migrateSignals();
assert.ok(api.getState().islands[1].life > api.getState().islands[1].memory, "incoming life should flip island 1 after receiving");
assert.ok(api.getState().islands[0].memory > islandZeroMemoryBefore, "island 1 must still emit its pre-cycle memory signal despite flipping during the pulse");

setGraph([island(0),island(1),island(2),island(3)]);
api.getState().resonance=10;
api.getState().focus=4;
api.getState().transplantCount=1;
api.getState().islands[0].imprints={life:3,memory:0,strange:0};
api.getState().islands[1].imprints={life:3,memory:1,strange:0};
api.getState().islands[2].imprints={life:0,memory:0,strange:1};
api.spawnIsland();
assert.equal(api.getState().islands.length,5,"germination should add a fifth island");
assert.equal(api.getState().islands[4].lineage,"life","new land should inherit dominant migration ancestry");
assert.ok(api.getState().chronicle.some(x=>x.kind==="lineage"),"inherited lineage should enter the Chronicle");
assert.equal(api.researchPrompts().find(x=>x.id==="lineage").done,true,"lineage inheritance should complete its Field Question");
assert.ok(api.getState().discoveries.some(x=>x.id==="transplant-bloom"),"new land grown after import should unlock Transplant Bloom");
assert.equal(api.researchPrompts().find(x=>x.id==="transplant").done,true,"Transplant Bloom should complete its Field Question");

setGraph([
  island(0, [1], 70, 20, 10),
  island(1, [0], 20, 70, 10),
  island(2, [], 20, 20, 70),
  island(3, [], 50, 20, 10)
], { "0-1": 9 });
api.getState().resonance = 7;
api.getState().islands[0].glyph = "life";
api.getState().climateSeen = { verdant: true, braided: true };
api.getState().phenomenaSeen = { "seed-rain": true };
api.getState().streakClimate = "verdant";
api.getState().climateStreak = 4;
api.getState().activePhenomenon = "seed-rain";
api.getState().islands[0].imprints={life:8,memory:2,strange:1};
api.getState().islands[0].lineage="life";
api.getState().islands[0].rolesSeen={life:true,memory:true,strange:true};
api.getState().islands[0].palimpsest=true;
api.getState().edgeSignals={"0-1":{life:4,memory:2,strange:1}};
api.getState().transplantCount=2;
const code = api.specimenCode();
assert.ok(code.startsWith("SG1."));
const decoded = api.decodeSpecimen(code);
assert.equal(decoded.seed, "testseed");
assert.equal(decoded.traits.length, 4);
assert.deepEqual(Array.from(decoded.edges[0]), [0, 1]);
assert.equal(decoded.memory[0][2], 9);
assert.equal(decoded.glyphs[0], "life");
assert.deepEqual(Array.from(decoded.climates).sort(), ["braided","verdant"]);
assert.deepEqual(Array.from(decoded.phenomena), ["seed-rain"]);
assert.deepEqual(Array.from(decoded.streak), ["verdant",4,"seed-rain"]);
assert.deepEqual(Array.from(decoded.ancestry[0]), [8,2,1,"life"]);
assert.equal(decoded.succession[0],7,"SG1 specimen should preserve a full Palimpsest succession mask");
assert.deepEqual(Array.from(decoded.routeSignals[0]),[0,1,4,2,1],"SG1 specimen should preserve bounded typed route history");
assert.equal(decoded.provenance,2,"SG1 specimen should preserve only the bounded transplant-hop count");
api.importSpecimenCode(code);
assert.equal(api.getState().transplantCount,3,"import should advance specimen provenance by one hop");
const legacyPayload=JSON.parse(JSON.stringify(decoded));
delete legacyPayload.provenance;
const legacyCode="SG1."+Buffer.from(JSON.stringify(legacyPayload),"binary").toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
api.importSpecimenCode(legacyCode);
assert.equal(api.getState().transplantCount,1,"older SG1 specimens without provenance should import as first-hop transplants");
assert.ok(!("log" in decoded), "specimen must not contain field-log text");
assert.ok(!("chronicle" in decoded), "specimen must not contain chronicle text");
assert.ok(!("lastCycleReport" in decoded), "specimen must not contain session-local cycle-report state");
assert.throws(() => api.decodeSpecimen("SG1.not-valid-base64!"));

setGraph([
  island(0, [], 50, 20, 10),
  island(1), island(2), island(3)
]);
api.getState().selected = 0;
api.getState().resonance = 5;
api.getState().focus = 3;
api.inscribeGlyph("strange");
assert.equal(api.getState().islands[0].glyph, "strange");
assert.equal(api.getState().resonance, 2, "glyph inscription should cost 3 resonance");
assert.equal(api.getState().focus, 2, "glyph inscription should cost 1 focus");
assert.ok(api.getState().chronicle.some(x => x.kind === "glyph"), "glyph inscription should enter chronicle");

api.getState().log = [{c:2,msg:"PRIVATE LOG SENTINEL"}];
api.getState().chronicle = [{c:2,kind:"test",msg:"PRIVATE CHRONICLE SENTINEL"}];
const summary = api.gardenSummary();
assert.ok(summary.includes("The Signal Garden"));
assert.ok(!summary.includes("PRIVATE LOG SENTINEL"), "playtest summary must omit field-log text");
assert.ok(!summary.includes("PRIVATE CHRONICLE SENTINEL"), "playtest summary must omit chronicle text");

console.log("Signal Garden invariant tests passed.");
