import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync("site/signal-garden/index.html", "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>/i);
assert.ok(match, "inline Signal Garden script should exist");

let source = match[1];
const tail = "  renderUI();requestAnimationFrame(draw);";
assert.ok(source.includes(tail), "expected game startup tail");
source = source.replace(
  tail,
  `  globalThis.__gardenTest={
    edgeKey:edgeKey,
    topologySpecies:topologySpecies,
    symbiosisSpecies:symbiosisSpecies,
    macroClimate:macroClimate,
    recordClimate:recordClimate,
    inscribeGlyph:inscribeGlyph,
    gardenSummary:gardenSummary,
    researchPrompts:researchPrompts,
    specimenCode:specimenCode,
    decodeSpecimen:decodeSpecimen,
    migrateSignals:migrateSignals,
    getState:function(){return state},
    setState:function(next){state=next;motes=[]}
  };`
);

function element(extra = {}) {
  return Object.assign({
    textContent: "",
    innerHTML: "",
    disabled: false,
    style: {},
    dataset: {},
    classList: { toggle() {} },
    addEventListener() {},
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
  "seasonChip","focusChip","resChip","transitChip","historyChip","researchChip","climateChip","germinateBtn",
  "islandNav","applySelectedBtn","selectedName","selectedLore","lifeStat",
  "memoryStat","strangeStat","linksStat","arrivalsStat","trafficStat","glyphStat","lifeMeter",
  "research","species","discoveries","chronicle","log","restBtn","soundBtn","summaryBtn","exportBtn","specimenBtn","importBtn","resetBtn"
].forEach(id => ids.set(id, element()));

const actionButtons = ["nurture","observe","connect","distort"].map(action =>
  element({ dataset: { action } })
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
    querySelectorAll(sel) { return sel === "[data-action]" ? actionButtons : []; },
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
  return { id, links: [...links], life, memory, strange, arrivals: 0, glyph: "none" };
}
function setGraph(islands, edgeMemory = {}) {
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
    climateSeen: {},
    lastClimate: null,
    islands
  });
}

assert.equal(api.edgeKey(4, 1), "1-4");
assert.equal(api.edgeKey(1, 4), "1-4");

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
const memoryBeforeGlyphMigration = api.getState().islands[1].memory;
api.migrateSignals();
assert.equal(api.getState().edgeMemory["0-1"], 2, "two linked islands should each record one crossing in a cycle");
assert.equal(api.getState().islands[0].arrivals, 1);
assert.equal(api.getState().islands[1].arrivals, 1);
assert.ok(api.getState().islands[1].memory >= memoryBeforeGlyphMigration + 2, "Echo glyph should add memory on incoming migration");

setGraph([
  island(0, [1], 70, 20, 10),
  island(1, [0], 20, 70, 10),
  island(2, [], 20, 20, 70),
  island(3, [], 50, 20, 10)
], { "0-1": 9 });
api.getState().resonance = 7;
api.getState().islands[0].glyph = "life";
api.getState().climateSeen = { verdant: true, braided: true };
const code = api.specimenCode();
assert.ok(code.startsWith("SG1."));
const decoded = api.decodeSpecimen(code);
assert.equal(decoded.seed, "testseed");
assert.equal(decoded.traits.length, 4);
assert.deepEqual(Array.from(decoded.edges[0]), [0, 1]);
assert.equal(decoded.memory[0][2], 9);
assert.equal(decoded.glyphs[0], "life");
assert.deepEqual(Array.from(decoded.climates).sort(), ["braided","verdant"]);
assert.ok(!("log" in decoded), "specimen must not contain field-log text");
assert.ok(!("chronicle" in decoded), "specimen must not contain chronicle text");
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
