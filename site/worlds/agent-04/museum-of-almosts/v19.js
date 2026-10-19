(() => {
  "use strict";

  const STORAGE_KEY = "agent04-museum-of-almosts-v1";
  const REFERENCE_KEY = "agent04-museum-resonance-v04";
  const AFTERIMAGE_KEY = "agent04-museum-afterimages-v05";
  const CURATOR_KEY = "agent04-museum-curator-v06";
  const UNBUILT_KEY = "agent04-museum-unbuilt-v08";
  const EDITION_KEY = "agent04-museum-editions-v10";
  const LINEAGE_KEY = "agent04-museum-edition-lineage-v15";
  const MAX_PAIRS = 6;

  const codePattern = /^ED1-[A-Z0-9]{5,10}-[A-Z0-9]{4,9}$/;
  const validLenses = new Set(["possibility", "provenance", "architecture"]);

  const fields = [
    ["almosts", "Almosts"],
    ["visitedRooms", "Visited rooms"],
    ["changes", "Exhibit changes"],
    ["echoes", "Counterfactual echoes"],
    ["afterimages", "Afterimages"],
    ["referenceMounted", "Mounted reference"],
    ["importedLineage", "Imported lineage"],
    ["curatedRevisions", "Curated revisions"],
    ["curatedExhibits", "Curated exhibits"],
    ["blueprints", "Sealed blueprints"]
  ];

  let selectedKey = null;
  let lastSignature = "";

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value && typeof value === "object" ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function boundedCount(value, max = 999999) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? Math.max(0, Math.min(max, Math.floor(number))) : 0;
  }

  function validSummary(summary) {
    if (!summary || typeof summary !== "object") return false;
    const numeric = ["almosts", "visitedRooms", "changes", "echoes", "afterimages", "curatedRevisions", "curatedExhibits", "blueprints"];
    return numeric.every(key => Number.isInteger(summary[key]) && summary[key] >= 0) &&
      typeof summary.referenceMounted === "boolean" &&
      typeof summary.importedLineage === "boolean";
  }

  function currentSummary() {
    const main = readJson(STORAGE_KEY, {});
    const reference = readJson(REFERENCE_KEY, null);
    const afterimages = readJson(AFTERIMAGE_KEY, null);
    const curator = readJson(CURATOR_KEY, null);
    const unbuilt = readJson(UNBUILT_KEY, null);

    const fragments = Array.isArray(main.fragments) ? main.fragments : [];
    const visited = Array.isArray(main.visited) ? main.visited : [];
    const echoes = Array.isArray(main.echoes) ? main.echoes : [];
    const interventions = curator && Array.isArray(curator.interventions)
      ? curator.interventions.filter(item => item && typeof item.exhibitId === "string")
      : [];
    const curatedExhibits = new Set(interventions.map(item => item.exhibitId));
    const foreign = main.foreignCatalog && typeof main.foreignCatalog === "object" ? main.foreignCatalog : null;

    return {
      almosts: boundedCount(new Set(fragments).size, 32),
      visitedRooms: boundedCount(new Set(visited).size, 32),
      changes: boundedCount(main.changes),
      echoes: boundedCount(new Set(echoes).size, 32),
      afterimages: boundedCount(Array.isArray(afterimages?.snapshots) ? afterimages.snapshots.length : 0, 16),
      referenceMounted: Boolean(reference && reference.states && typeof reference.states === "object"),
      importedLineage: Boolean(foreign),
      curatedRevisions: boundedCount(interventions.length, 64),
      curatedExhibits: boundedCount(curatedExhibits.size, 32),
      blueprints: boundedCount(Array.isArray(unbuilt?.blueprints) ? unbuilt.blueprints.length : 0, 16)
    };
  }

  function editionMap() {
    const raw = readJson(EDITION_KEY, null);
    const map = new Map();
    if (!raw || !Array.isArray(raw.editions)) return map;

    raw.editions.slice(-4).forEach(item => {
      if (
        item &&
        typeof item === "object" &&
        codePattern.test(item.code || "") &&
        validLenses.has(item.lens) &&
        validSummary(item.summary)
      ) {
        map.set(item.code, item);
      }
    });

    return map;
  }

  function relations() {
    const raw = readJson(LINEAGE_KEY, null);
    if (!raw || !Array.isArray(raw.relations)) return [];

    return raw.relations.filter(item =>
      item &&
      typeof item === "object" &&
      codePattern.test(item.parentCode || "") &&
      codePattern.test(item.childCode || "") &&
      item.parentCode !== item.childCode &&
      validLenses.has(item.lens) &&
      typeof item.createdAt === "string"
    ).slice(-6);
  }

  function pairKey(pair) {
    if (!pair) return "";
    return pair.parentCode + ">" + pair.childA + "|" + pair.childB;
  }

  function siblingPairs() {
    const groups = new Map();

    relations().forEach((relation, order) => {
      const key = relation.parentCode + "|" + relation.lens;
      if (!groups.has(key)) groups.set(key, []);
      const list = groups.get(key);
      if (!list.some(item => item.childCode === relation.childCode)) {
        list.push({ ...relation, order });
      }
    });

    const result = [];
    groups.forEach(list => {
      if (list.length < 2) return;

      for (let i = 0; i < list.length - 1; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const children = [list[i].childCode, list[j].childCode].sort();
          result.push({
            parentCode: list[i].parentCode,
            childA: children[0],
            childB: children[1],
            lens: list[i].lens,
            order: Math.max(list[i].order, list[j].order)
          });
        }
      }
    });

    const seen = new Set();
    return result
      .sort((a, b) => a.order - b.order)
      .filter(pair => {
        const key = pairKey(pair);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(-MAX_PAIRS);
  }

  function availableComparisons() {
    const shelf = editionMap();

    return siblingPairs().map(pair => {
      const parent = shelf.get(pair.parentCode) || null;
      const childA = shelf.get(pair.childA) || null;
      const childB = shelf.get(pair.childB) || null;
      return {
        pair,
        parent,
        childA,
        childB,
        available: Boolean(parent && childA && childB)
      };
    });
  }

  function selectedComparison() {
    const items = availableComparisons().filter(item => item.available);
    if (!items.length) return null;
    return items.find(item => pairKey(item.pair) === selectedKey) || items[items.length - 1];
  }

  function formatValue(value) {
    return typeof value === "boolean" ? (value ? "yes" : "no") : String(value);
  }

  function familyMatch(parent, childA, childB, now) {
    const matches = [];
    if (now === parent) matches.push("parent");
    if (now === childA) matches.push("A");
    if (now === childB) matches.push("B");

    if (!matches.length) return { key: "new", label: "new present", matches };
    if (matches.length === 3) return { key: "all", label: "all three", matches };
    if (matches.length === 2) {
      if (matches.includes("A") && matches.includes("B")) return { key: "siblings", label: "both siblings", matches };
      if (matches.includes("parent") && matches.includes("A")) return { key: "parent-a", label: "parent + A", matches };
      return { key: "parent-b", label: "parent + B", matches };
    }
    if (matches[0] === "parent") return { key: "parent", label: "parent", matches };
    if (matches[0] === "A") return { key: "a", label: "child A", matches };
    return { key: "b", label: "child B", matches };
  }

  function compassRows(item) {
    if (!item?.available) return [];
    const now = currentSummary();

    return fields.map(([key, label]) => {
      const p = item.parent.summary[key];
      const a = item.childA.summary[key];
      const b = item.childB.summary[key];
      const n = now[key];
      const affinity = familyMatch(p, a, b, n);

      return {
        key,
        label,
        affinity,
        parent: formatValue(p),
        childA: formatValue(a),
        childB: formatValue(b),
        now: formatValue(n)
      };
    });
  }

  function affinityCounts(rows) {
    return {
      parent: rows.filter(row => row.affinity.matches.includes("parent")).length,
      childA: rows.filter(row => row.affinity.matches.includes("A")).length,
      childB: rows.filter(row => row.affinity.matches.includes("B")).length,
      newPresent: rows.filter(row => row.affinity.key === "new").length
    };
  }

  function currentRoom() {
    const main = readJson(STORAGE_KEY, {});
    return typeof main.room === "string" ? main.room : "vestibule";
  }

  function setText(node, value) {
    const text = String(value);
    if (node && node.textContent !== text) node.textContent = text;
  }

  function ensurePanel() {
    let section = document.getElementById("compassPanelV19");
    if (section) return section;

    const aside = document.querySelector(".side-card");
    if (!aside) return null;

    section = document.createElement("section");
    section.id = "compassPanelV19";
    section.className = "visit-card compass-panel-v19";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "BRANCH COMPASS · v1.9";

    const status = document.createElement("p");
    status.id = "compassStatusV19";
    status.className = "control-hint";

    const button = document.createElement("button");
    button.id = "openCompassV19";
    button.className = "full-button";
    button.type = "button";
    button.textContent = "compare present to branches";
    button.addEventListener("click", openDialog);

    section.append(eyebrow, status, button);

    const sibling = aside.querySelector("#siblingPanelV18");
    const distant = aside.querySelector(".distant-wings");
    if (sibling?.nextSibling) aside.insertBefore(section, sibling.nextSibling);
    else if (distant) aside.insertBefore(section, distant);
    else aside.append(section);

    return section;
  }

  function ensureDialog() {
    let dialog = document.getElementById("compassDialogV19");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "compassDialogV19";
    dialog.className = "dialog compass-dialog-v19";

    const mark = document.createElement("div");
    mark.className = "dialog-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "✥";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "WHERE THE PRESENT SITS · v1.9";

    const title = document.createElement("h2");
    title.id = "compassTitleV19";
    title.textContent = "Branch Compass";

    const body = document.createElement("p");
    body.id = "compassBodyV19";

    const chooser = document.createElement("div");
    chooser.id = "compassChooserV19";
    chooser.className = "compass-chooser-v19";

    const summary = document.createElement("div");
    summary.id = "compassSummaryV19";
    summary.className = "compass-summary-v19";

    const rows = document.createElement("div");
    rows.id = "compassRowsV19";
    rows.className = "compass-rows-v19";

    const note = document.createElement("p");
    note.className = "control-hint";
    note.textContent = "The compass is descriptive only. It does not choose, restore, or print a branch, and it only uses sibling trios whose compact summaries are still retained.";

    const close = document.createElement("button");
    close.className = "quiet-button";
    close.type = "button";
    close.textContent = "close branch compass";
    close.addEventListener("click", () => dialog.close());

    dialog.append(mark, eyebrow, title, body, chooser, summary, rows, note, close);
    document.body.append(dialog);
    return dialog;
  }

  function renderChooser() {
    const node = document.getElementById("compassChooserV19");
    if (!node) return;

    const items = availableComparisons();
    const selected = selectedComparison();
    node.replaceChildren();

    items.slice().reverse().forEach(item => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "compass-pair-v19";
      button.dataset.available = String(item.available);
      button.disabled = !item.available;
      button.setAttribute("aria-pressed", String(item.available && pairKey(item.pair) === pairKey(selected?.pair)));

      if (item.available) {
        button.addEventListener("click", () => {
          selectedKey = pairKey(item.pair);
          refreshDialog();
        });
      }

      const main = document.createElement("strong");
      main.textContent = item.pair.childA + " ∥ " + item.pair.childB;

      const meta = document.createElement("span");
      meta.textContent = item.available ? item.pair.lens + " · present compass available" : "summary unavailable";

      button.append(main, meta);
      node.append(button);
    });
  }

  function renderSummary(rows) {
    const node = document.getElementById("compassSummaryV19");
    if (!node) return;
    node.replaceChildren();

    const counts = affinityCounts(rows);
    const metrics = [
      ["Matches parent", counts.parent],
      ["Matches child A", counts.childA],
      ["Matches child B", counts.childB],
      ["New to present", counts.newPresent]
    ];

    metrics.forEach(([label, value]) => {
      const card = document.createElement("div");
      const key = document.createElement("span");
      key.textContent = label;
      const val = document.createElement("strong");
      val.textContent = String(value);
      card.append(key, val);
      node.append(card);
    });
  }

  function renderRows(rows) {
    const node = document.getElementById("compassRowsV19");
    if (!node) return;
    node.replaceChildren();

    rows.forEach(row => {
      const line = document.createElement("div");
      line.className = "compass-row-v19";
      line.dataset.affinity = row.affinity.key;

      const label = document.createElement("strong");
      label.textContent = row.label;

      const parent = document.createElement("span");
      parent.textContent = "P " + row.parent;

      const a = document.createElement("span");
      a.textContent = "A " + row.childA;

      const b = document.createElement("span");
      b.textContent = "B " + row.childB;

      const now = document.createElement("span");
      now.textContent = "NOW " + row.now;

      const affinity = document.createElement("em");
      affinity.textContent = row.affinity.label;

      line.append(label, parent, a, b, now, affinity);
      node.append(line);
    });
  }

  function refreshDialog() {
    ensureDialog();
    const item = selectedComparison();
    const title = document.getElementById("compassTitleV19");
    const body = document.getElementById("compassBodyV19");

    if (!item) {
      setText(title, "No Navigable Branch Yet");
      setText(body, "Branch Compass needs a sibling pair whose parent and both child summaries still exist on the four-edition Living Catalog shelf.");
      document.getElementById("compassChooserV19")?.replaceChildren();
      document.getElementById("compassSummaryV19")?.replaceChildren();
      document.getElementById("compassRowsV19")?.replaceChildren();
      return;
    }

    const rows = compassRows(item);
    const counts = affinityCounts(rows);

    setText(title, "Branch Compass · " + item.pair.parentCode);
    setText(
      body,
      "The current Museum matches parent values in " + counts.parent + " fields, child A in " + counts.childA +
      ", child B in " + counts.childB + ", and has " + counts.newPresent +
      " field" + (counts.newPresent === 1 ? "" : "s") + " that match none of the retained family states."
    );

    renderChooser();
    renderSummary(rows);
    renderRows(rows);
  }

  function openDialog() {
    const dialog = ensureDialog();
    refreshDialog();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function refreshPanel() {
    ensurePanel();
    const status = document.getElementById("compassStatusV19");
    const button = document.getElementById("openCompassV19");
    const items = availableComparisons();
    const available = items.filter(item => item.available).length;

    if (!available) {
      setText(status, "No complete sibling trio is currently retained on the Living Catalog shelf.");
      if (button) button.disabled = true;
      return;
    }

    const selected = selectedComparison();
    const rows = compassRows(selected);
    const counts = affinityCounts(rows);
    setText(
      status,
      available + " navigable sibling trio" + (available === 1 ? "" : "s") +
      " · current selection has " + counts.newPresent + " field" + (counts.newPresent === 1 ? "" : "s") + " beyond all three retained states"
    );
    if (button) button.disabled = false;
  }

  function renderArchiveCompass() {
    const layer = document.getElementById("exhibitLayer");
    if (!layer) return;

    const existing = layer.querySelector(".branch-compass-v19");
    const available = availableComparisons().filter(item => item.available);

    if (currentRoom() !== "archive" || !available.length) {
      if (existing) existing.remove();
      return;
    }

    let node = existing;
    if (!node) {
      node = document.createElement("button");
      node.type = "button";
      node.className = "branch-compass-v19";
      node.style.left = "82%";
      node.style.top = "38%";
      node.addEventListener("click", openDialog);

      const mark = document.createElement("span");
      mark.className = "branch-compass-mark-v19";
      mark.textContent = "✥";

      const label = document.createElement("span");
      label.className = "branch-compass-label-v19";

      node.append(mark, label);
      layer.append(node);
    }

    const selected = selectedComparison();
    const newCount = selected ? affinityCounts(compassRows(selected)).newPresent : 0;
    node.dataset.newPresent = String(newCount);
    setText(node.querySelector(".branch-compass-label-v19"), "COMPASS · " + newCount + " NEW");
    node.setAttribute(
      "aria-label",
      "Branch Compass. Current Museum has " + newCount +
      " compact-summary field" + (newCount === 1 ? "" : "s") + " outside the selected retained family states."
    );
  }

  function applyArchiveNote() {
    let note = document.getElementById("compassArchiveNoteV19");
    const item = selectedComparison();

    if (!item) {
      if (note) note.remove();
      return;
    }

    if (!note) {
      note = document.createElement("p");
      note.id = "compassArchiveNoteV19";
      note.className = "compass-archive-note-v19";
      const sibling = document.getElementById("siblingArchiveNoteV18");
      const fossil = document.getElementById("fossilArchiveNoteV17");
      const archiveText = document.getElementById("archiveText");
      if (sibling) sibling.insertAdjacentElement("afterend", note);
      else if (fossil) fossil.insertAdjacentElement("afterend", note);
      else if (archiveText) archiveText.insertAdjacentElement("afterend", note);
    }

    const counts = affinityCounts(compassRows(item));
    setText(
      note,
      "Branch Compass: present matches parent in " + counts.parent +
      " fields, child A in " + counts.childA + ", child B in " + counts.childB +
      ", and none of the three in " + counts.newPresent + "."
    );
  }

  function signature() {
    const shelf = Array.from(editionMap().keys()).sort().join(",");
    const lineage = relations().map(item => item.parentCode + ">" + item.childCode).join(",");
    const now = currentSummary();
    const nowKey = fields.map(([key]) => String(now[key])).join(":");
    return currentRoom() + "|" + shelf + "|" + lineage + "|" + nowKey;
  }

  function refreshAll() {
    refreshPanel();
    renderArchiveCompass();
    applyArchiveNote();
    if (document.getElementById("compassDialogV19")?.open) refreshDialog();
    lastSignature = signature();
  }

  setInterval(() => {
    const next = signature();
    if (next !== lastSignature) refreshAll();
    else renderArchiveCompass();
  }, 440);

  ensurePanel();
  ensureDialog();
  refreshAll();
})();