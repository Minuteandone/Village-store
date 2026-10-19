import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const index = read("index.html");
const app = read("app.js");
const v02 = read("v02.js");
const v03 = read("v03.js");
const v02css = read("v02.css");
const v03css = read("v03.css");

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const asset of ["styles.css", "v02.css", "v03.css", "app.js", "v02.js", "v03.js"]) {
  expect(index.includes(asset), "index.html must reference " + asset);
}

expect(
  index.indexOf("app.js") < index.indexOf("v02.js") &&
  index.indexOf("v02.js") < index.indexOf("v03.js"),
  "compatibility layers must load app.js -> v02.js -> v03.js"
);

for (const [name, source] of [["base", app], ["v0.2", v02], ["v0.3", v03]]) {
  expect(source.includes("agent04-museum-of-almosts-v1"), name + " must share the Museum storage key");
}

const echoIds = ["doubleHouse", "winterSail", "lockWithoutElsewhere", "sunRoot"];
for (const id of echoIds) expect(v02.includes('id: "' + id + '"'), "missing counterfactual echo " + id);

const exhibitIds = [
  "directory", "weatherJar", "forecastDesk", "almostEngine", "spareDrawer",
  "constellationDial", "maybeSeed", "rootMap", "finalIndex"
];
for (const id of exhibitIds) expect(v02.includes('"' + id + '"'), "ticket whitelist missing exhibit " + id);

const fragments = ["direction", "forecast", "uncertainty", "purpose", "reuse", "pattern", "growth", "route", "trace"];
for (const fragment of fragments) expect(v02.includes('"' + fragment + '"'), "ticket whitelist missing fragment " + fragment);

for (const weather of ["drizzle", "amber", "snow"]) {
  expect(v02.includes('"' + weather + '"'), "ticket whitelist missing weather " + weather);
}

expect(v02.includes("allowedExhibitIds.has(key)"), "ticket decoder must whitelist exhibit IDs");
expect(v02.includes("allowedFragments.has(value)"), "ticket decoder must whitelist fragments");
expect(v02.includes("allowedWeather.has(payload.weather)"), "ticket decoder must whitelist weather");
expect(v02.includes("function setText("), "v0.2 observer-safe idempotent text helper missing");
expect(v02.includes("lastEchoSignature"), "v0.2 echo rerender guard missing");
expect(v02.includes("sourceCode"), "portable ticket provenance source code missing");
expect(v02.includes("lineage"), "portable ticket lineage missing");
expect(v02.includes("history.replaceState"), "ticket import should remove payload from visible URL");
expect(v02.includes("currentForeign") && v02.includes("incomingForeign"), "storage shim must reconcile foreign catalog state");
expect(v02.includes("currentForeign.forkCataloged || incomingForeign.forkCataloged"), "cataloged forks must survive later base-app saves");
expect(v02.includes("catalogedDifferences: Math.max"), "cataloged divergence count must survive later base-app saves");
expect(!v02.includes("innerHTML"), "v0.2 should not inject ticket data with innerHTML");

for (const phrase of ["The Borrowed Catalog", "The Difference Engine", "A Cataloged Descendant"]) {
  expect(v03.includes(phrase), "v0.3 missing foreign-catalog state: " + phrase);
}
expect(v03.includes("foreignCatalog"), "v0.3 foreign catalog state missing");
expect(v03.includes("stateDifferenceCount"), "v0.3 divergence counter missing");
expect(v03.includes("forkCataloged"), "v0.3 explicit fork catalog state missing");
expect(v03.includes("catalogedDifferences"), "v0.3 cataloged difference count missing");
expect(
  v03.includes("if (note.textContent !== message) note.textContent = message;"),
  "v0.3 Archive provenance note must be idempotent inside MutationObserver flow"
);
expect(!v03.includes("innerHTML"), "v0.3 should construct foreign catalog UI with safe DOM APIs");

expect(v02css.includes("prefers-reduced-motion"), "v0.2 echo animation must respect reduced-motion");
expect(v03css.includes("prefers-reduced-motion"), "v0.3 foreign catalog styling must respect reduced-motion");

if (failures.length) {
  console.error("Museum of Almosts smoke check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Museum of Almosts smoke check passed.");
console.log("Verified v0.1 base + v0.2 echoes/tickets + v0.3 imported-world divergence contract.");
