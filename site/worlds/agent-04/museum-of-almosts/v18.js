(() => {
  "use strict";

  const STORAGE_KEY = "agent04-museum-of-almosts-v1";
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

  function validSummary(summary) {
    if (!summary || typeof summary !== "object") return false;
    const numeric = ["almosts", "visitedRooms", "changes", "echoes", "afterimages", "curatedRevisions", "curatedExhibits", "blueprints"];
    return numeric.every(key => Number.isInteger(summary[key]) && summary[key] >= 0) &&
      typeof summary.referenceMounted === "boolean" &&
      typeof summary.importedLineage === "boolean";
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
          const a = list[i];
          const b = list[j];
          const childCodes = [a.childCode, b.childCode].sort();
          result.push({
            parentCode: a.parentCode,
            childA: childCodes[0],
            childB: childCodes[1],
            lens: a.lens,
            order: Math.max(a.order, b.order)
          });
        }
      }
    });

    const deduped = [];
    const seen = new Set();
    result
      .sort((a, b) => a.order - b.order)
      .forEach(pair => {
        const key = pairKey(pair);
        if (seen.has(key)) return;
        seen.add(key);
        deduped.push(pair);
      });

    return deduped.slice(-MAX_PAIRS);
  }

  function pairKey(pair) {
    if (!pair) return "";
    return pair.parentCode + ">" + pair.childA + "|" + pair.childB;
  }

  function classifyPair(pair, shelf = editionMap()) {
    const parent = shelf.get(pair.parentCode) || null;
    const childA = shelf.get(pair.childA) || null;
    const childB = shelf.get(pair.childB) || null;

    if (!parent || !childA || !childB) {
      return {
        pair,
        available: false,
        parent,
        childA,
        childB,
        rows: [],
        sharedChanges: 0,
        divergences: 0,
        retained: 0,
        missing: [
          !parent ? "parent summary" : null,
          !childA ? "first child summary" : null,
          !childB ? "second child summary" : null
        ].filter(Boolean)
      };
    }

    const rows = fields.map(([key, label]) => {
      const p = parent.summary[key];
      const a = childA.summary[key];
      const b = childB.summary[key];

      let classification = "retained";
      if (a === b && a !== p) classification = "shared-change";
      else if (a !== b) classification = "divergence";

      const booleanField = typeof p === "boolean" || typeof a === "boolean" || typeof b === "boolean";
      const format = value => booleanField ? (value ? "yes" : "no") : String(value);

      return {
        key,
        label,
        classification,
        parent: format(p),
        childA: format(a),
        childB: format(b)
      };
    });

    return {
      pair,
      available: true,
      parent,
      childA,
      childB,
      rows,
      sharedChanges: rows.filter(row => row.classification === "shared-change").length,
      divergences: rows.filter(row => row.classification === "divergence").length,
      retained: rows.filter(row => row.classification === "retained").length,
      missing: []
    };
  }

  function comparisons() {
    const shelf = editionMap();
    return siblingPairs().map(pair => classifyPair(pair, shelf));
  }

  function selectedComparison() {
    const items = comparisons();
    if (!items.length) return null;
    return items.find(item => pairKey(item.pair) === selectedKey) || items[items.length - 1];
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
    let section = document.getElementById("siblingPanelV18");
    if (section) return section;

    const aside = document.querySelector(".side-card");
    if (!aside) return null;

    section = document.createElement("section");
    section.id = "siblingPanelV18";
    section.className = "visit-card sibling-panel-v18";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "SIBLING MARGINS · v1.8";

    const status = document.createElement("p");
    status.id = "siblingStatusV18";
    status.className = "control-hint";

    const button = document.createElement("button");
    button.id = "openSiblingV18";
    button.className = "full-button";
    button.type = "button";
    button.textContent = "compare sibling editions";
    button.addEventListener("click", openDialog);

    section.append(eyebrow, status, button);

    const fossil = aside.querySelector("#fossilPanelV17");
    const distant = aside.querySelector(".distant-wings");
    if (fossil?.nextSibling) aside.insertBefore(section, fossil.nextSibling);
    else if (distant) aside.insertBefore(section, distant);
    else aside.append(section);

    return section;
  }

  function ensureDialog() {
    let dialog = document.getElementById("siblingDialogV18");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "siblingDialogV18";
    dialog.className = "dialog sibling-dialog-v18";

    const mark = document.createElement("div");
    mark.className = "dialog-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "⋔";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "TWO CHILDREN, ONE PARENT · v1.8";

    const title = document.createElement("h2");
    title.id = "siblingTitleV18";
    title.textContent = "Sibling Margins";

    const body = document.createElement("p");
    body.id = "siblingBodyV18";

    const chooser = document.createElement("div");
    chooser.id = "siblingChooserV18";
    chooser.className = "sibling-chooser-v18";

    const summary = document.createElement("div");
    summary.id = "siblingSummaryV18";
    summary.className = "sibling-summary-v18";

    const rows = document.createElement("div");
    rows.id = "siblingRowsV18";
    rows.className = "sibling-rows-v18";

    const note = document.createElement("p");
    note.className = "control-hint";
    note.textContent = "Sibling detail is derived only from compact editions still on the four-edition shelf. Aged-off summaries are never reconstructed from lineage codes.";

    const close = document.createElement("button");
    close.className = "quiet-button";
    close.type = "button";
    close.textContent = "close sibling margins";
    close.addEventListener("click", () => dialog.close());

    dialog.append(mark, eyebrow, title, body, chooser, summary, rows, note, close);
    document.body.append(dialog);
    return dialog;
  }

  function renderChooser() {
    const node = document.getElementById("siblingChooserV18");
    if (!node) return;

    const items = comparisons();
    const selected = selectedComparison();
    node.replaceChildren();

    items.slice().reverse().forEach(item => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "sibling-pair-v18";
      button.dataset.available = String(item.available);
      button.setAttribute("aria-pressed", String(pairKey(item.pair) === pairKey(selected?.pair)));
      button.addEventListener("click", () => {
        selectedKey = pairKey(item.pair);
        refreshDialog();
      });

      const main = document.createElement("strong");
      main.textContent = item.pair.childA + " ∥ " + item.pair.childB;

      const meta = document.createElement("span");
      meta.textContent = item.available
        ? item.divergences + " divergence" + (item.divergences === 1 ? "" : "s") + " · " + item.sharedChanges + " shared changes"
        : "summary unavailable";

      button.append(main, meta);
      node.append(button);
    });
  }

  function renderComparison(item) {
    const summary = document.getElementById("siblingSummaryV18");
    const rowsNode = document.getElementById("siblingRowsV18");
    if (!summary || !rowsNode) return;

    summary.replaceChildren();
    rowsNode.replaceChildren();

    if (!item.available) {
      const missing = document.createElement("div");
      missing.className = "sibling-unavailable-v18";
      missing.textContent = "Detailed sibling comparison is unavailable because " + item.missing.join(" and ") +
        " no longer exists on the four-edition Living Catalog shelf.";
      summary.append(missing);
      return;
    }

    const metrics = [
      ["Shared revisions", item.sharedChanges],
      ["Sibling divergences", item.divergences],
      ["Both retained parent", item.retained]
    ];

    metrics.forEach(([label, value]) => {
      const card = document.createElement("div");
      const key = document.createElement("span");
      key.textContent = label;
      const val = document.createElement("strong");
      val.textContent = String(value);
      card.append(key, val);
      summary.append(card);
    });

    item.rows.forEach(row => {
      const node = document.createElement("div");
      node.className = "sibling-row-v18";
      node.dataset.classification = row.classification;

      const label = document.createElement("strong");
      label.textContent = row.label;

      const parent = document.createElement("span");
      parent.textContent = "P " + row.parent;

      const a = document.createElement("span");
      a.textContent = "A " + row.childA;

      const b = document.createElement("span");
      b.textContent = "B " + row.childB;

      const kind = document.createElement("em");
      kind.textContent = row.classification === "shared-change"
        ? "shared change"
        : row.classification === "divergence"
          ? "siblings diverged"
          : "both retained";

      node.append(label, parent, a, b, kind);
      rowsNode.append(node);
    });
  }

  function refreshDialog() {
    ensureDialog();
    const item = selectedComparison();
    const title = document.getElementById("siblingTitleV18");
    const body = document.getElementById("siblingBodyV18");

    if (!item) {
      setText(title, "No Sibling Pair Yet");
      setText(body, "Edition Lineage needs one parent edition with at least two explicitly printed children before sibling comparison exists.");
      document.getElementById("siblingChooserV18")?.replaceChildren();
      document.getElementById("siblingSummaryV18")?.replaceChildren();
      document.getElementById("siblingRowsV18")?.replaceChildren();
      return;
    }

    setText(title, "Sibling Margins · " + item.pair.parentCode);
    setText(
      body,
      item.available
        ? "Both children descend from the same explicit parent under the " + item.pair.lens + " lens. Shared changes are values both children changed away from the parent in the same way; divergences are values where the siblings no longer agree."
        : "This sibling relation still exists as lineage, but its detailed compact summaries are incomplete."
    );

    renderChooser();
    renderComparison(item);
  }

  function openDialog() {
    const dialog = ensureDialog();
    refreshDialog();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function refreshPanel() {
    ensurePanel();
    const status = document.getElementById("siblingStatusV18");
    const button = document.getElementById("openSiblingV18");
    const pairs = comparisons();

    if (!pairs.length) {
      setText(status, "No sibling editions yet. Reissue the same parent edition more than once to create a branch.");
      if (button) button.disabled = true;
      return;
    }

    const available = pairs.filter(item => item.available).length;
    setText(
      status,
      pairs.length + " sibling pair" + (pairs.length === 1 ? "" : "s") +
      " · " + available + " with parent + both child summaries still on shelf"
    );
    if (button) button.disabled = false;
  }

  function renderArchiveFrame() {
    const layer = document.getElementById("exhibitLayer");
    if (!layer) return;

    const existing = layer.querySelector(".sibling-frame-v18");
    const pairs = siblingPairs();

    if (currentRoom() !== "archive" || !pairs.length) {
      if (existing) existing.remove();
      return;
    }

    let node = existing;
    if (!node) {
      node = document.createElement("button");
      node.type = "button";
      node.className = "sibling-frame-v18";
      node.style.left = "82%";
      node.style.top = "20%";
      node.addEventListener("click", openDialog);

      const mark = document.createElement("span");
      mark.className = "sibling-frame-mark-v18";
      mark.textContent = "⋔";

      const label = document.createElement("span");
      label.className = "sibling-frame-label-v18";

      node.append(mark, label);
      layer.append(node);
    }

    const available = comparisons().filter(item => item.available).length;
    node.dataset.available = String(available);
    setText(node.querySelector(".sibling-frame-label-v18"), "SIBLINGS ×" + pairs.length);
    node.setAttribute(
      "aria-label",
      pairs.length + " sibling edition pair" + (pairs.length === 1 ? "" : "s") +
      "; " + available + " fully comparable."
    );
  }

  function applyArchiveNote() {
    let note = document.getElementById("siblingArchiveNoteV18");
    const pairs = comparisons();

    if (!pairs.length) {
      if (note) note.remove();
      return;
    }

    if (!note) {
      note = document.createElement("p");
      note.id = "siblingArchiveNoteV18";
      note.className = "sibling-archive-note-v18";
      const fossil = document.getElementById("fossilArchiveNoteV17");
      const inheritance = document.getElementById("inheritanceArchiveNoteV16");
      const archiveText = document.getElementById("archiveText");
      if (fossil) fossil.insertAdjacentElement("afterend", note);
      else if (inheritance) inheritance.insertAdjacentElement("afterend", note);
      else if (archiveText) archiveText.insertAdjacentElement("afterend", note);
    }

    const available = pairs.filter(item => item.available).length;
    const divergences = pairs.filter(item => item.available).reduce((sum, item) => sum + item.divergences, 0);
    setText(
      note,
      "Sibling Margins: " + pairs.length + " sibling pair" + (pairs.length === 1 ? "" : "s") +
      " · " + available + " fully comparable · " + divergences +
      " compact-summary divergence" + (divergences === 1 ? "" : "s") + "."
    );
  }

  function signature() {
    const shelf = Array.from(editionMap().keys()).sort().join(",");
    const lineage = relations().map(item => item.parentCode + ">" + item.childCode).join(",");
    return currentRoom() + "|" + shelf + "|" + lineage;
  }

  function refreshAll() {
    refreshPanel();
    renderArchiveFrame();
    applyArchiveNote();
    if (document.getElementById("siblingDialogV18")?.open) refreshDialog();
    lastSignature = signature();
  }

  setInterval(() => {
    const next = signature();
    if (next !== lastSignature) refreshAll();
    else renderArchiveFrame();
  }, 440);

  ensurePanel();
  ensureDialog();
  refreshAll();
})();