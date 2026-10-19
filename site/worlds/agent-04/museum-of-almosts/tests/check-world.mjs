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
const css = read("v02.css");

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const asset of ["styles.css", "v02.css", "app.js", "v02.js"]) {
  expect(index.includes(asset), "index.html must reference " + asset);
}

expect(index.indexOf("app.js") < index.indexOf("v02.js"), "base app must load before v0.2 extension");
expect(app.includes("agent04-museum-of-almosts-v1"), "base app storage key changed unexpectedly");
expect(v02.includes("agent04-museum-of-almosts-v1"), "v0.2 must share the base storage key");

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
expect(v02.includes("function setText("), "observer-safe idempotent text helper missing");
expect(v02.includes("lastEchoSignature"), "echo rerender guard missing");
expect(v02.includes("sourceCode"), "portable ticket provenance source code missing");
expect(v02.includes("lineage"), "portable ticket lineage missing");
expect(v02.includes("history.replaceState"), "ticket import should remove payload from visible URL");
expect(!v02.includes("innerHTML"), "v0.2 should not inject ticket data with innerHTML");
expect(css.includes("prefers-reduced-motion"), "echo animation must respect reduced-motion preference");

if (failures.length) {
  console.error("Museum of Almosts smoke check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Museum of Almosts smoke check passed.");
console.log("Verified 4 echoes, 9 exhibit IDs, 9 fragment names, ticket provenance, strict ticket whitelists, and observer guards.");
