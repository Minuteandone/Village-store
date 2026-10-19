import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CURRENT_LAYER = 33;
const CURRENT_VERSION = "3.3";
const CURRENT_FEATURE = "Parallax Trace";

const here = path.dirname(fileURLToPath(import.meta.url));
const worldRoot = path.resolve(here, "..");

function findRepoRoot(start) {
  let cursor = start;
  while (true) {
    if (fs.existsSync(path.join(cursor, ".github"))) return cursor;
    const parent = path.dirname(cursor);
    if (parent === cursor) throw new Error("Could not locate repository root.");
    cursor = parent;
  }
}

const repoRoot = findRepoRoot(worldRoot);
const isCanonical = repoRoot === worldRoot;

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function occurrenceCount(text, needle) {
  return text.split(needle).length - 1;
}

function versionId(number) {
  return String(number).padStart(2, "0");
}

const failures = [];
const index = read(path.join(worldRoot, "index.html"));

const smokePath = path.join(
  repoRoot,
  ".github",
  "workflows",
  isCanonical ? "smoke.yml" : "agent-04-museum-smoke.yml"
);
const publicVerifierPath = path.join(
  repoRoot,
  ".github",
  "workflows",
  isCanonical ? "public-smoke.yml" : "agent-04-museum-public-smoke.yml"
);

const smoke = read(smokePath);
const publicVerifier = read(publicVerifierPath);
const pagesPath = path.join(repoRoot, ".github", "workflows", "pages.yml");
const pages = fs.existsSync(pagesPath) ? read(pagesPath) : "";

const layers = Array.from(
  { length: CURRENT_LAYER - 1 },
  (_, index) => versionId(index + 2)
);

const expectedJs = ["app.js", ...layers.map(id => "v" + id + ".js")];
const expectedCss = ["styles.css", ...layers.map(id => "v" + id + ".css")];

for (const asset of [...expectedCss, ...expectedJs]) {
  expect(fs.existsSync(path.join(worldRoot, asset)), "missing world asset: " + asset);
  expect(
    occurrenceCount(index, asset) === 1,
    "index.html must reference exactly one " + asset
  );
}

const jsRefs = Array.from(
  index.matchAll(/<script\s+src="([^"]+\.js)"[^>]*><\/script>/g),
  match => match[1]
).filter(ref => ref === "app.js" || /^v\d+\.js$/.test(ref));

const cssRefs = Array.from(
  index.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+\.css)"\s*\/?>/g),
  match => match[1]
).filter(ref => ref === "styles.css" || /^v\d+\.css$/.test(ref));

expect(
  JSON.stringify(jsRefs) === JSON.stringify(expectedJs),
  "JavaScript load matrix must be exactly app.js then v02.js through v" + CURRENT_LAYER + ".js"
);
expect(
  JSON.stringify(cssRefs) === JSON.stringify(expectedCss),
  "CSS load matrix must be exactly styles.css then v02.css through v" + CURRENT_LAYER + ".css"
);

const worldPrefix = path.relative(repoRoot, worldRoot).split(path.sep).join("/");
for (const asset of expectedJs) {
  const smokeTarget = isCanonical || !worldPrefix ? asset : worldPrefix + "/" + asset;
  expect(
    smoke.includes("node --check " + smokeTarget),
    "smoke workflow must syntax-check exact path " + smokeTarget
  );
}

expect(
  smoke.includes("node tests/check-world.mjs"),
  "smoke workflow must run the Museum contract"
);
expect(
  smoke.includes("node tests/check-version-matrix.mjs") ||
    smoke.includes("node site/worlds/agent-04/museum-of-almosts/tests/check-version-matrix.mjs"),
  "smoke workflow must run the version-matrix guard"
);

if (isCanonical) {
  for (const asset of expectedJs) {
    expect(
      pages.includes("node --check " + asset),
      "canonical Pages workflow must syntax-check exact path " + asset
    );
  }
  expect(
    pages.includes("node tests/check-world.mjs"),
    "canonical Pages workflow must run the Museum contract"
  );
  expect(
    pages.includes("node tests/check-version-matrix.mjs"),
    "canonical Pages workflow must run the version-matrix guard"
  );
}

expect(
  index.includes("ADMISSION NOTICE " + CURRENT_VERSION),
  "admission notice must match current development version " + CURRENT_VERSION
);
expect(
  index.includes('<script src="v' + CURRENT_LAYER + '.js"></script>'),
  "index must load current layer v" + CURRENT_LAYER + ".js"
);
expect(
  index.includes('<link rel="stylesheet" href="v' + CURRENT_LAYER + '.css" />'),
  "index must load current layer v" + CURRENT_LAYER + ".css"
);

const readmePath = path.join(worldRoot, "README.md");
if (fs.existsSync(readmePath)) {
  const readme = read(readmePath);
  expect(
    readme.includes("Current development version: v" + CURRENT_VERSION),
    "README current development version must be v" + CURRENT_VERSION
  );
}

const changelogPath = path.join(worldRoot, "CHANGELOG.md");
if (fs.existsSync(changelogPath)) {
  const changelog = read(changelogPath);
  expect(
    changelog.startsWith("## v" + CURRENT_VERSION + " —"),
    "CHANGELOG must begin with current development version v" + CURRENT_VERSION
  );
}

expect(
  publicVerifier.includes("v" + CURRENT_LAYER + ".js"),
  "live verifier must require current JavaScript layer v" + CURRENT_LAYER + ".js"
);
expect(
  publicVerifier.includes(CURRENT_FEATURE),
  "live verifier must require current feature text: " + CURRENT_FEATURE
);

if (failures.length) {
  console.error("Museum version-matrix check failed:");
  failures.forEach(failure => console.error("- " + failure));
  process.exit(1);
}

console.log(
  "Museum version matrix passed for v" +
    CURRENT_VERSION +
    " (" +
    expectedJs.length +
    " JavaScript assets, " +
    expectedCss.length +
    " CSS assets)."
);
console.log("Repository mode: " + (isCanonical ? "canonical" : "Village Store mirror"));
