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
const v04 = read("v04.js");
const v05 = read("v05.js");
const v06 = read("v06.js");
const v07 = read("v07.js");
const v08 = read("v08.js");
const v09 = read("v09.js");
const v10 = read("v10.js");
const v11 = read("v11.js");
const v12 = read("v12.js");
const v13 = read("v13.js");
const v14 = read("v14.js");
const v15 = read("v15.js");
const v16 = read("v16.js");
const v17 = read("v17.js");
const v18 = read("v18.js");
const v19 = read("v19.js");
const v02css = read("v02.css");
const v03css = read("v03.css");
const v04css = read("v04.css");
const v05css = read("v05.css");
const v06css = read("v06.css");
const v07css = read("v07.css");
const v08css = read("v08.css");
const v09css = read("v09.css");
const v10css = read("v10.css");
const v11css = read("v11.css");
const v12css = read("v12.css");
const v13css = read("v13.css");
const v14css = read("v14.css");
const v15css = read("v15.css");
const v16css = read("v16.css");
const v17css = read("v17.css");
const v18css = read("v18.css");
const v19css = read("v19.css");

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

for (const asset of ["styles.css", "v02.css", "v03.css", "v04.css", "v05.css", "v06.css", "v07.css", "v08.css", "v09.css", "v10.css", "v11.css", "v12.css", "v13.css", "v14.css", "v15.css", "v16.css", "v17.css", "v18.css", "v19.css", "app.js", "v02.js", "v03.js", "v04.js", "v05.js", "v06.js", "v07.js", "v08.js", "v09.js", "v10.js", "v11.js", "v12.js", "v13.js", "v14.js", "v15.js", "v16.js", "v17.js", "v18.js", "v19.js"]) {
  expect(index.includes(asset), "index.html must reference " + asset);
}

expect(
  index.indexOf("app.js") < index.indexOf("v02.js") &&
  index.indexOf("v02.js") < index.indexOf("v03.js") &&
  index.indexOf("v03.js") < index.indexOf("v04.js") &&
  index.indexOf("v04.js") < index.indexOf("v05.js") &&
  index.indexOf("v05.js") < index.indexOf("v06.js") &&
  index.indexOf("v06.js") < index.indexOf("v07.js") &&
  index.indexOf("v07.js") < index.indexOf("v08.js") &&
  index.indexOf("v08.js") < index.indexOf("v09.js") &&
  index.indexOf("v09.js") < index.indexOf("v10.js") &&
  index.indexOf("v10.js") < index.indexOf("v11.js") &&
  index.indexOf("v11.js") < index.indexOf("v12.js") &&
  index.indexOf("v12.js") < index.indexOf("v13.js") &&
  index.indexOf("v13.js") < index.indexOf("v14.js") &&
  index.indexOf("v14.js") < index.indexOf("v15.js") &&
  index.indexOf("v15.js") < index.indexOf("v16.js") &&
  index.indexOf("v16.js") < index.indexOf("v17.js") &&
  index.indexOf("v17.js") < index.indexOf("v18.js") &&
  index.indexOf("v18.js") < index.indexOf("v19.js"),
  "compatibility layers must load app.js -> v02.js -> v03.js -> v04.js -> v05.js -> v06.js -> v07.js -> v08.js -> v09.js -> v10.js -> v11.js -> v12.js -> v13.js -> v14.js -> v15.js -> v16.js -> v17.js -> v18.js -> v19.js"
);

for (const [name, source] of [["base", app], ["v0.2", v02], ["v0.3", v03], ["v0.4", v04], ["v0.5", v05], ["v0.6", v06], ["v0.7", v07], ["v0.8", v08], ["v0.9", v09], ["v1.0", v10], ["v1.1", v11], ["v1.2", v12], ["v1.3", v13], ["v1.4", v14], ["v1.5", v15], ["v1.6", v16], ["v1.7", v17], ["v1.8", v18], ["v1.9", v19]]) {
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
expect(v02.includes("agent04-museum-of-almosts-coatcheck-v1"), "ticket import must define a reversible local coat check");
expect(v02.includes("hasMeaningfulLocalMuseum"), "coat check should only snapshot a meaningful local museum before import");
expect(v03.includes("restoreMuseumV03"), "foreign catalog dialog must expose prior-museum restore when available");
expect(v03.includes("localStorage.removeItem(COATCHECK_KEY)"), "restoring/resetting must clear the one-step coat check");
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
expect(v03.includes("latestForeignCatalogV03"), "v0.3 must track the newest foreign catalog across legacy saves");
expect(v03.includes("inheritedSetItemV03"), "v0.3 must layer its preservation wrapper after earlier storage logic");
expect(
  v03.includes("incoming.foreignCatalog = cloneForeignCatalogV03(latestForeignCatalogV03)"),
  "v0.3 legacy writes must retain the newest foreign catalog"
);
expect(
  v03.includes("latestForeignCatalogV03 = null;") &&
  v03.includes("inheritedRemoveItemV03.call(this, COATCHECK_KEY);"),
  "v0.3 reset/remove must clear preserved foreign catalog authority and its coat-check snapshot"
);
expect(!v03.includes("innerHTML"), "v0.3 should construct foreign catalog UI with safe DOM APIs");

expect(v02css.includes("prefers-reduced-motion"), "v0.2 echo animation must respect reduced-motion");
expect(v03css.includes("prefers-reduced-motion"), "v0.3 foreign catalog styling must respect reduced-motion");

for (const phrase of ["Resonance Cabinet", "mount reference ticket", "catalog this comparison"]) {
  expect(v04.includes(phrase), "v0.4 missing resonance mechanic: " + phrase);
}
expect(v04.includes("REFERENCE_KEY"), "v0.4 must keep reference specimen state separate from the main Museum save");
expect(v04.includes("allowedExhibitIds.includes(key)"), "v0.4 reference decoder must whitelist exhibit IDs");
expect(v04.includes("allowedEchoIds.includes(value)"), "v0.4 reference decoder must whitelist echo IDs");
expect(v04.includes("codePattern.test(payload.sourceCode)"), "v0.4 reference decoder must validate source visit codes");
expect(v04.includes("reference stays local to this browser"), "v0.4 must disclose local-only reference behavior in-world");
expect(v04.includes("function setNodeText("), "v0.4 observer-driven side panel updates must be idempotent");
expect(v04.includes("if (node && node.textContent !== text) node.textContent = text;"), "v0.4 text helper must guard unchanged DOM writes");
expect(!v04.includes("innerHTML"), "v0.4 should construct reference-ticket UI with safe DOM APIs");
expect(v04css.includes("prefers-reduced-motion"), "v0.4 resonance styling must respect reduced-motion");

for (const phrase of ["AFTERIMAGE_KEY", "MAX_SNAPSHOTS = 6", "Afterimage Projector", "Projecting "]) {
  expect(v05.includes(phrase), "v0.5 missing afterimage mechanic: " + phrase);
}
expect(v05.includes("captureArchiveSnapshot"), "v0.5 must capture distinct Archive snapshots");
expect(v05.includes("snapshotSignature"), "v0.5 must deduplicate catalog snapshots by bounded state signature");
expect(v05.includes("archive.snapshots.slice(-MAX_SNAPSHOTS)"), "v0.5 local history must stay bounded");
expect(v05.includes("localStorage.setItem(AFTERIMAGE_KEY"), "v0.5 afterimages must use separate local storage");
expect(v05.includes('layer.querySelectorAll(".exhibit[data-id]")'), "v0.5 projections must target stable base exhibit IDs");
expect(v05.includes("if (node && node.textContent !== text) node.textContent = text;"), "v0.5 observer-driven text updates must be idempotent");
expect(!v05.includes("innerHTML"), "v0.5 should construct afterimage UI with safe DOM APIs");
expect(v05css.includes("prefers-reduced-motion"), "v0.5 afterimage animation must respect reduced-motion");

for (const phrase of ["CURATOR_KEY", "MAX_LEDGER = 12", "Curator's Table", "undo last adoption"]) {
  expect(v06.includes(phrase), "v0.6 missing curator mechanic: " + phrase);
}
expect(v06.includes("value >= 0 && value <= 2"), "v0.6 adopted exhibit states must be strictly range-checked to the three-state base contract");
expect(v06.includes("ledger.interventions.slice(-MAX_LEDGER)"), "v0.6 curator provenance must remain bounded");
expect(v06.includes("localStorage.setItem(CURATOR_KEY"), "v0.6 curator provenance must use separate local storage");
expect(v06.includes("state.exhibitStates[exhibitId] = targetState"), "v0.6 must deliberately adopt alternate states into the present museum");
expect(v06.includes("state.weather = [\"drizzle\", \"amber\", \"snow\"][targetState]"), "v0.6 adopting weatherJar must preserve weather-state consistency");
expect(v06.includes("current !== entry.to"), "v0.6 one-step undo must refuse to clobber later changes");
expect(v06.includes("location.reload()"), "v0.6 adoption must reload so all compatibility layers see one consistent state");
expect(v06.includes("if (node && node.textContent !== text) node.textContent = text;"), "v0.6 text updates must be idempotent");
expect(!v06.includes("innerHTML"), "v0.6 should construct curator UI with safe DOM APIs");
expect(v06css.includes("prefers-reduced-motion"), "v0.6 curator styling must respect reduced-motion");

for (const phrase of ["CURATOR_KEY", "Conservation Register", "conservation-mark-v07", "still current", "later changed"]) {
  expect(v07.includes(phrase), "v0.7 missing conservation mechanic: " + phrase);
}
expect(v07.includes("readLedger"), "v0.7 must derive labels from curator provenance");
expect(v07.includes("currentState(id) === latest.to") || v07.includes("now === latest.to"), "v0.7 must distinguish still-current from superseded curation");
expect(v07.includes('layer.querySelectorAll(".exhibit[data-id]")'), "v0.7 marks must anchor to stable base exhibit IDs");
expect(!v07.includes("localStorage.setItem(CURATOR_KEY"), "v0.7 must not mutate curator provenance");
expect(!v07.includes("localStorage.setItem(STORAGE_KEY"), "v0.7 must remain observational and not rewrite the Museum save");
expect(!v07.includes("innerHTML"), "v0.7 should construct conservation UI with safe DOM APIs");
expect(v07css.includes("prefers-reduced-motion"), "v0.7 conservation styling must respect reduced-motion");

for (const phrase of ["UNBUILT_KEY", "MAX_BLUEPRINTS = 5", "The Unbuilt Wing", "seal this blueprint", "CURRENT BLUEPRINT"]) {
  expect(v08.includes(phrase), "v0.8 missing Unbuilt Wing mechanic: " + phrase);
}
expect(v08.includes('["present", "afterimage", "reference"].includes(name)'), "v0.8 blueprint sources must be explicitly whitelisted");
expect(v08.includes("Boolean(state.archiveSeen) && availableSources().length >= 2"), "v0.8 wing must require the Archive plus at least one alternate source");
expect(v08.includes("wing.blueprints.slice(-MAX_BLUEPRINTS)"), "v0.8 sealed blueprint history must stay bounded");
expect(v08.includes("localStorage.setItem(UNBUILT_KEY"), "v0.8 must persist only its own bounded blueprint state");
expect(!v08.includes("localStorage.setItem(STORAGE_KEY"), "v0.8 must not rewrite the present Museum save");
expect(!v08.includes("localStorage.setItem(REFERENCE_KEY"), "v0.8 must not rewrite the mounted reference");
expect(!v08.includes("localStorage.setItem(AFTERIMAGE_KEY"), "v0.8 must not rewrite Afterimage storage");
expect(v08.includes("normalizeSelection"), "v0.8 restored blueprints must fall back safely when a source is no longer available");
expect(v08.includes("blueprintCode"), "v0.8 must produce deterministic local blueprint codes");
expect(!v08.includes("innerHTML"), "v0.8 should construct the Unbuilt Wing with safe DOM APIs");
expect(v08css.includes("prefers-reduced-motion"), "v0.8 Unbuilt Wing styling must respect reduced-motion");

for (const phrase of ["UNBUILT_KEY", "MAX_RELICS = 5", "Architectural Relic Register", "architectural-relic-v09", "destinationRoom"]) {
  expect(v09.includes(phrase), "v0.9 missing architectural relic mechanic: " + phrase);
}
expect(v09.includes("wing.blueprints.filter(validBlueprint).slice(-MAX_RELICS)") || v09.includes("blueprints.filter(validBlueprint).slice(-MAX_RELICS)"), "v0.9 relic input must remain bounded to five sealed blueprints");
expect(v09.includes('if (blueprint.selection[part] !== "present") return room;'), "v0.9 relic placement must follow the first alternate architectural seam");
expect(v09.includes("read-only miniatures") || v09.includes("These relics are read-only"), "v0.9 must disclose observational relic behavior");
expect(!v09.includes("localStorage.setItem("), "v0.9 must not write any browser storage");
expect(!v09.includes("innerHTML"), "v0.9 should construct relic UI with safe DOM APIs");
expect(v09css.includes("prefers-reduced-motion"), "v0.9 relic styling must respect reduced-motion");

for (const phrase of ["EDITION_KEY", "MAX_EDITIONS = 4", "The Living Catalog", "print this local edition", "edition-artifact-v10", "ED1-"]) {
  expect(v10.includes(phrase), "v1.0 missing Living Catalog mechanic: " + phrase);
}
expect(v10.includes("store.editions.slice(-MAX_EDITIONS)") || v10.includes("editions.filter(validEdition).slice(-MAX_EDITIONS)"), "v1.0 local edition history must stay bounded to four");
expect(v10.includes("summarySnapshot"), "v1.0 must synthesize a compact whole-museum summary");
expect(v10.includes("editionCode"), "v1.0 must produce deterministic edition codes");
expect(v10.includes("validSummary"), "v1.0 stored edition summaries must be schema-validated");
expect(v10.includes("localStorage.setItem(EDITION_KEY"), "v1.0 must persist editions only in its own local store");
expect(!v10.includes("localStorage.setItem(STORAGE_KEY"), "v1.0 must not rewrite the present Museum save");
expect(!v10.includes("localStorage.setItem(REFERENCE_KEY"), "v1.0 must not rewrite mounted reference state");
expect(!v10.includes("localStorage.setItem(AFTERIMAGE_KEY"), "v1.0 must not rewrite Afterimage history");
expect(!v10.includes("localStorage.setItem(CURATOR_KEY"), "v1.0 must not rewrite curator provenance");
expect(!v10.includes("localStorage.setItem(UNBUILT_KEY"), "v1.0 must not rewrite Unbuilt Wing blueprints");
expect(v10.includes("possibility") && v10.includes("provenance") && v10.includes("architecture"), "v1.0 must expose all three editorial lenses");
expect(!v10.includes("innerHTML"), "v1.0 should construct Living Catalog UI with safe DOM APIs");
expect(v10css.includes("prefers-reduced-motion"), "v1.0 Living Catalog styling must respect reduced-motion");

for (const phrase of ["EDITION_KEY", "ERRATA · v1.1", "compareSummary", "Footnote drift", "Revision drift", "Rewrite drift", "errata-slip-v11"]) {
  expect(v11.includes(phrase), "v1.1 missing Errata mechanic: " + phrase);
}
for (const field of ["almosts", "visitedRooms", "changes", "echoes", "afterimages", "referenceMounted", "importedLineage", "curatedRevisions", "curatedExhibits", "blueprints"]) {
  expect(v11.includes(field), "v1.1 must compare Living Catalog summary field: " + field);
}
expect(v11.includes("currentSummary"), "v1.1 must recompute the Museum-now summary live");
expect(v11.includes("comparison.changedFields"), "v1.1 must derive errata from changed summary dimensions");
expect(!v11.includes("localStorage.setItem("), "v1.1 Errata must remain entirely derived and write no browser storage");
expect(!v11.includes("innerHTML"), "v1.1 should construct Errata UI with safe DOM APIs");
expect(v11css.includes("prefers-reduced-motion"), "v1.1 Errata styling must respect reduced-motion");

for (const phrase of ["WALKING FOOTNOTES · v1.2", "ERRATA AS GEOGRAPHY", "walking-footnote-v12", "groupedFootnotes", "markerSlots"]) {
  expect(v12.includes(phrase), "v1.2 missing Walking Footnotes mechanic: " + phrase);
}
expect(v12.includes('almosts: {\n      label: "Almosts",\n      room: "conservatory"') || v12.includes('room: "conservatory"'), "v1.2 must spatialize collection-growth drift");
expect(v12.includes('echoes: {\n      label: "Counterfactual echoes",\n      room: "observatory"') || v12.includes('room: "observatory"'), "v1.2 must spatialize echo drift");
expect(v12.includes('blueprints: {\n      label: "Sealed blueprints",\n      room: "archive"') || v12.includes('room: "archive"'), "v1.2 must spatialize blueprint drift");
expect(v12.includes("Placement identifies the subsystem responsible") || v12.includes("subsystem responsible"), "v1.2 must avoid claiming unprovable exact exhibit causality");
expect(!v12.includes("localStorage.setItem("), "v1.2 Walking Footnotes must remain derived and write no browser storage");
expect(!v12.includes("innerHTML"), "v1.2 should construct footnote UI with safe DOM APIs");
expect(v12css.includes("prefers-reduced-motion"), "v1.2 Walking Footnotes styling must respect reduced-motion");

for (const phrase of ["CROSS-REFERENCE ROUTE · v1.3", "FOOTNOTES AS A WALK", "shortestPath", "bestTour", "acknowledgedRooms", "crossref-next-v13"]) {
  expect(v13.includes(phrase), "v1.3 missing Cross-Reference Route mechanic: " + phrase);
}
for (const edge of ['north: "observatory"', 'east: "weather"', 'south: "conservatory"', 'west: "workshop"', 'east: "archive"']) {
  expect(v13.includes(edge), "v1.3 must use the real Museum room graph edge: " + edge);
}
for (const doorId of ["doorNorth", "doorEast", "doorSouth", "doorWest"]) {
  expect(app.includes(doorId), "base Museum must expose stable real door: " + doorId);
}
expect(v13.includes('document.getElementById("door" + direction[0].toUpperCase() + direction.slice(1))'), "v1.3 must highlight the actual base door element for the next route step");
expect(v13.includes('event.target?.closest?.(".walking-footnote-v12")'), "v1.3 route progress must come from reviewing real v1.2 footnote markers");
expect(v13.includes("const acknowledgedRooms = new Set()"), "v1.3 reviewed-room progress must be in-memory session state");
expect(!v13.includes("localStorage.setItem("), "v1.3 Cross-Reference Route must write no browser storage");
expect(!v13.includes("innerHTML"), "v1.3 should construct route UI with safe DOM APIs");
expect(v13css.includes("prefers-reduced-motion"), "v1.3 Cross-Reference styling must respect reduced-motion");

for (const phrase of ["SECOND EDITION · v1.4", "PUBLICATION LOOP · v1.4", "prepareReissue", "reviewedRooms", "reissue-card-v14", "reissueNoticeV14"]) {
  expect(v14.includes(phrase), "v1.4 missing Second Edition mechanic: " + phrase);
}
expect(v14.includes('["possibility", "provenance", "architecture"].includes(item.lens)'), "v1.4 must only reuse known Living Catalog editorial lenses");
expect(v14.includes('event.target?.closest?.(".walking-footnote-v12")'), "v1.4 review completion must come from real Walking Footnote clicks");
expect(v14.includes("const reviewedRooms = new Set()"), "v1.4 footnote-review progress must remain in-memory");
expect(v14.includes('document.getElementById("openEditionV10")'), "v1.4 must hand off to the existing Living Catalog");
expect(v14.includes('.edition-lens-v10[data-lens="') && v14.includes("lens.click()"), "v1.4 must preselect the prior edition lens through the existing v1.0 UI");
expect(v14.includes('document.getElementById("printEditionV10")'), "v1.4 must identify the existing Print control for explicit visitor handoff");
expect(!v14.includes("print.click()"), "v1.4 must never auto-click the Living Catalog Print button");
expect(!v14.includes('getElementById("printEditionV10").click()'), "v1.4 must never directly trigger printing");
expect(v14.includes("print.focus"), "v1.4 should focus/highlight Print rather than activate it");
expect(!v14.includes("localStorage.setItem("), "v1.4 Second Edition must not create its own persistent state");
expect(!v14.includes("innerHTML"), "v1.4 should construct reissue UI with safe DOM APIs");
expect(v14css.includes("#printEditionV10.reissue-print-v14"), "v1.4 must visually mark the existing Print control when a reissue is prepared");
expect(v14css.includes("prefers-reduced-motion"), "v1.4 Second Edition styling must respect reduced-motion");

for (const phrase of ["LINEAGE_KEY", "MAX_RELATIONS = 6", "EDITION LINEAGE · v1.5", "recordRelation", "parentCode", "childCode", "lineage-thread-v15"]) {
  expect(v15.includes(phrase), "v1.5 missing Edition Lineage mechanic: " + phrase);
}
expect(v15.includes('id === "prepareReissueV14" || id === "prepareReissueDialogV14"'), "v1.5 lineage must arm only from explicit v1.4 reissue preparation");
expect(v15.includes('id === "printEditionV10"'), "v1.5 lineage completion must observe the visitor clicking the real Living Catalog Print control");
expect(v15.includes("const before = new Set(editions().map(item => item.code))"), "v1.5 must snapshot existing edition codes before explicit Print");
expect(v15.includes("!before.has(child.code)"), "v1.5 must reject duplicate/no-op prints as descendants");
expect(v15.includes("child.lens === parent.lens"), "v1.5 must require the reissue to keep the prepared parent lens");
expect(v15.includes('dialog.addEventListener("close", clearPendingParent)'), "v1.5 must cancel pending lineage if the Living Catalog closes without printing");
expect(v15.includes("relations.slice(-MAX_RELATIONS)"), "v1.5 lineage history must stay bounded");
expect(v15.includes("localStorage.setItem(LINEAGE_KEY"), "v1.5 may persist only its own bounded lineage relation store");
expect(!v15.includes("localStorage.setItem(EDITION_KEY"), "v1.5 must never write the Living Catalog edition store");
expect(!v15.includes(".summary"), "v1.5 lineage must not duplicate edition summaries");
expect(!v15.includes("innerHTML"), "v1.5 should construct lineage UI with safe DOM APIs");
expect(v15css.includes("prefers-reduced-motion"), "v1.5 Edition Lineage styling must respect reduced-motion");

for (const phrase of ["INHERITANCE NOTES · v1.6", "WHAT THE CHILD CHANGED · v1.6", "compareRelation", "summary unavailable", "inheritance-note-v16"]) {
  expect(v16.includes(phrase), "v1.6 missing Inheritance Notes mechanic: " + phrase);
}
for (const field of ["almosts", "visitedRooms", "changes", "echoes", "afterimages", "referenceMounted", "importedLineage", "curatedRevisions", "curatedExhibits", "blueprints"]) {
  expect(v16.includes(field), "v1.6 must compare compact summary field: " + field);
}
expect(v16.includes("const parent = shelf.get(relation.parentCode) || null"), "v1.6 must retrieve the real parent summary from the current Living Catalog shelf");
expect(v16.includes("const child = shelf.get(relation.childCode) || null"), "v1.6 must retrieve the real child summary from the current Living Catalog shelf");
expect(v16.includes("if (!parent || !child)"), "v1.6 must explicitly stop detailed comparison when either summary is missing");
expect(v16.includes("available: false"), "v1.6 must represent aged-off summary comparisons as unavailable");
expect(v16.includes("no longer exists on the four-edition Living Catalog shelf"), "v1.6 must disclose why detailed inheritance can disappear");
expect(!v16.includes("localStorage.setItem("), "v1.6 Inheritance Notes must remain read-only");
expect(!v16.includes("innerHTML"), "v1.6 should construct inheritance UI with safe DOM APIs");
expect(v16css.includes("prefers-reduced-motion"), "v1.6 Inheritance Notes styling must respect reduced-motion");

for (const phrase of ["FOSSIL CITATIONS · v1.7", "WHAT SURVIVED THE SHELF · v1.7", "fossils()", "SUMMARY NOT RETAINED", "fossil-object-v17"]) {
  expect(v17.includes(phrase), "v1.7 missing Fossil Citations mechanic: " + phrase);
}
expect(v17.includes("const shelf = shelfCodes()"), "v1.7 must derive fossil status from the actual Living Catalog shelf");
expect(v17.includes("!shelf.has(relation.parentCode)"), "v1.7 must detect aged-off parent summaries from retained shelf codes");
expect(v17.includes("!shelf.has(relation.childCode)"), "v1.7 must detect aged-off child summaries from retained shelf codes");
expect(v17.includes("missingCode") && v17.includes("survivingCode") && v17.includes("createdAt"), "v1.7 fossils must expose only retained lineage facts");
expect(v17.includes("did not retain this edition"), "v1.7 must explicitly disclose the summary-retention boundary");
expect(!v17.includes(".summary"), "v1.7 must not claim access to missing edition summaries");
expect(!v17.includes("localStorage.setItem("), "v1.7 Fossil Citations must remain derived and write no browser storage");
expect(!v17.includes("innerHTML"), "v1.7 should construct fossil UI with safe DOM APIs");
expect(v17css.includes("prefers-reduced-motion"), "v1.7 Fossil Citations styling must respect reduced-motion");

for (const phrase of ["SIBLING MARGINS · v1.8", "TWO CHILDREN, ONE PARENT · v1.8", "siblingPairs", "classifyPair", "shared-change", "divergence", "sibling-frame-v18"]) {
  expect(v18.includes(phrase), "v1.8 missing Sibling Margins mechanic: " + phrase);
}
expect(v18.includes("const key = relation.parentCode + \"|\" + relation.lens"), "v1.8 must group explicit children by the same parent and editorial lens");
expect(v18.includes("if (list.length < 2) return"), "v1.8 must require at least two children before a sibling pair exists");
expect(v18.includes("const parent = shelf.get(pair.parentCode) || null"), "v1.8 must read the actual retained parent summary from the Living Catalog shelf");
expect(v18.includes("const childA = shelf.get(pair.childA) || null"), "v1.8 must read the first actual retained child summary");
expect(v18.includes("const childB = shelf.get(pair.childB) || null"), "v1.8 must read the second actual retained child summary");
expect(v18.includes("if (!parent || !childA || !childB)"), "v1.8 must stop detailed comparison when any required summary is unavailable");
expect(v18.includes("a === b && a !== p"), "v1.8 must distinguish a shared sibling change from parent retention");
expect(v18.includes("else if (a !== b) classification = \"divergence\""), "v1.8 must explicitly classify sibling disagreement as divergence");
expect(v18.includes("slice(-MAX_PAIRS)"), "v1.8 derived sibling-pair display must remain bounded");
expect(v18.includes("Aged-off summaries are never reconstructed from lineage codes"), "v1.8 must disclose its no-reconstruction boundary");
expect(!v18.includes("localStorage.setItem("), "v1.8 Sibling Margins must remain read-only");
expect(!v18.includes("innerHTML"), "v1.8 should construct sibling UI with safe DOM APIs");
expect(v18css.includes("prefers-reduced-motion"), "v1.8 Sibling Margins styling must respect reduced-motion");

for (const phrase of ["BRANCH COMPASS · v1.9", "WHERE THE PRESENT SITS · v1.9", "currentSummary", "familyMatch", "new present", "branch-compass-v19"]) {
  expect(v19.includes(phrase), "v1.9 missing Branch Compass mechanic: " + phrase);
}
for (const field of ["almosts", "visitedRooms", "changes", "echoes", "afterimages", "referenceMounted", "importedLineage", "curatedRevisions", "curatedExhibits", "blueprints"]) {
  expect(v19.includes(field), "v1.9 must compare live compact summary field: " + field);
}
expect(v19.includes("const parent = shelf.get(pair.parentCode) || null"), "v1.9 must use the real retained parent summary");
expect(v19.includes("const childA = shelf.get(pair.childA) || null"), "v1.9 must use the real retained child A summary");
expect(v19.includes("const childB = shelf.get(pair.childB) || null"), "v1.9 must use the real retained child B summary");
expect(v19.includes("available: Boolean(parent && childA && childB)"), "v1.9 must require a fully retained sibling trio before navigation");
expect(v19.includes("if (!matches.length) return { key: \"new\", label: \"new present\""), "v1.9 must explicitly represent present states that match none of the retained family");
expect(v19.includes("matches.includes(\"parent\")") && v19.includes("matches.includes(\"A\")") && v19.includes("matches.includes(\"B\")"), "v1.9 must calculate affinities against parent and both siblings");
expect(v19.includes("The compass is descriptive only"), "v1.9 must disclose that Branch Compass does not apply or restore branches");
expect(!v19.includes("localStorage.setItem("), "v1.9 Branch Compass must remain read-only");
expect(!v19.includes("innerHTML"), "v1.9 should construct Branch Compass UI with safe DOM APIs");
expect(v19css.includes("prefers-reduced-motion"), "v1.9 Branch Compass styling must respect reduced-motion");

if (failures.length) {
  console.error("Museum of Almosts smoke check failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Museum of Almosts smoke check passed.");
console.log("Verified v0.1 base + v0.2 echoes/tickets + v0.3 imported-world divergence + v0.4 reference resonance + v0.5 afterimages + v0.6 curator + v0.7 conservation + v0.8 Unbuilt Wing + v0.9 relics + v1.0 Living Catalog + v1.1 Errata + v1.2 Walking Footnotes + v1.3 Cross-Reference Route + v1.4 Second Edition + v1.5 Edition Lineage + v1.6 Inheritance Notes + v1.7 Fossil Citations + v1.8 Sibling Margins + v1.9 Branch Compass contract.");
