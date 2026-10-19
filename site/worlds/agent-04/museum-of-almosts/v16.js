(() => {
  "use strict";

  const STORAGE_KEY = "agent04-museum-of-almosts-v1";
  const EDITION_KEY = "agent04-museum-editions-v10";
  const LINEAGE_KEY = "agent04-museum-edition-lineage-v15";

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
        typeof item.code === "string" &&
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
      typeof item.parentCode === "string" &&
      typeof item.childCode === "string" &&
      item.parentCode !== item.childCode &&
      typeof item.lens === "string"
    ).slice(-6);
  }

  function compareRelation(relation, shelf = editionMap()) {
    const parent = shelf.get(relation.parentCode) || null;
    const child = shelf.get(relation.childCode) || null;

    if (!parent || !child) {
      return {
        relation,
        available: false,
        parent,
        child,
        differences: [],
        missing: [
          !parent ? "parent summary" : null,
          !child ? "child summary" : null
        ].filter(Boolean)
      };
    }

    const differences = fields.map(([key, label]) => {
      const before = parent.summary[key];
      const after = child.summary[key];
      if (before === after) return null;

      const booleanField = typeof before === "boolean" || typeof after === "boolean";
      return {
        key,
        label,
        before: booleanField ? (before ? "yes" : "no") : before,
        after: booleanField ? (after ? "yes" : "no") : after,
        delta: booleanField ? null : Number(after) - Number(before)
      };
    }).filter(Boolean);

    return { relation, available: true, parent, child, differences, missing: [] };
  }

  function comparisons() {
    const shelf = editionMap();
    return relations().map(relation => compareRelation(relation, shelf));
  }

  function relationKey(relation) {
    return relation.parentCode + ">" + relation.childCode;
  }

  function selectedComparison() {
    const items = comparisons();
    if (!items.length) return null;
    return items.find(item => relationKey(item.relation) === selectedKey) || items[items.length - 1];
  }

  function setText(node, value) {
    const text = String(value);
    if (node && node.textContent !== text) node.textContent = text;
  }

  function currentRoom() {
    const main = readJson(STORAGE_KEY, {});
    return typeof main.room === "string" ? main.room : "vestibule";
  }

  function ensurePanel() {
    let section = document.getElementById("inheritancePanelV16");
    if (section) return section;

    const aside = document.querySelector(".side-card");
    if (!aside) return null;

    section = document.createElement("section");
    section.id = "inheritancePanelV16";
    section.className = "visit-card inheritance-panel-v16";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "INHERITANCE NOTES · v1.6";

    const status = document.createElement("p");
    status.id = "inheritanceStatusV16";
    status.className = "control-hint";

    const button = document.createElement("button");
    button.id = "openInheritanceV16";
    button.className = "full-button";
    button.type = "button";
    button.textContent = "compare parent and child";
    button.addEventListener("click", openDialog);

    section.append(eyebrow, status, button);

    const lineage = aside.querySelector("#lineagePanelV15");
    const distant = aside.querySelector(".distant-wings");
    if (lineage?.nextSibling) aside.insertBefore(section, lineage.nextSibling);
    else if (distant) aside.insertBefore(section, distant);
    else aside.append(section);

    return section;
  }

  function ensureDialog() {
    let dialog = document.getElementById("inheritanceDialogV16");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "inheritanceDialogV16";
    dialog.className = "dialog inheritance-dialog-v16";

    const mark = document.createElement("div");
    mark.className = "dialog-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "∆";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "WHAT THE CHILD CHANGED · v1.6";

    const title = document.createElement("h2");
    title.id = "inheritanceTitleV16";
    title.textContent = "Inheritance Notes";

    const body = document.createElement("p");
    body.id = "inheritanceBodyV16";

    const chooser = document.createElement("div");
    chooser.id = "inheritanceChooserV16";
    chooser.className = "inheritance-chooser-v16";

    const diff = document.createElement("div");
    diff.id = "inheritanceDiffV16";
    diff.className = "inheritance-diff-v16";

    const note = document.createElement("p");
    note.className = "control-hint";
    note.textContent = "Lineage retains only codes. Detailed inheritance exists only while both compact edition summaries remain on the local Living Catalog shelf.";

    const close = document.createElement("button");
    close.type = "button";
    close.className = "quiet-button";
    close.textContent = "close inheritance notes";
    close.addEventListener("click", () => dialog.close());

    dialog.append(mark, eyebrow, title, body, chooser, diff, note, close);
    document.body.append(dialog);
    return dialog;
  }

  function renderChooser(items) {
    const node = document.getElementById("inheritanceChooserV16");
    if (!node) return;
    node.replaceChildren();

    items.slice().reverse().forEach(item => {
      const key = relationKey(item.relation);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "inheritance-relation-v16";
      button.dataset.available = item.available ? "true" : "false";
      button.setAttribute("aria-pressed", String(key === selectedComparison()?.relation && false));
      button.setAttribute("aria-pressed", String(key === relationKey(selectedComparison()?.relation || item.relation) && key === relationKey(selectedComparison()?.relation || item.relation)));
      button.addEventListener("click", () => {
        selectedKey = key;
        refreshDialog();
      });

      const codes = document.createElement("strong");
      codes.textContent = item.relation.parentCode + " → " + item.relation.childCode;

      const meta = document.createElement("span");
      meta.textContent = item.available
        ? item.differences.length + " changed summary field" + (item.differences.length === 1 ? "" : "s")
        : "summary unavailable";

      button.append(codes, meta);
      node.append(button);
    });
  }

  function renderDiff(item) {
    const node = document.getElementById("inheritanceDiffV16");
    if (!node) return;
    node.replaceChildren();

    if (!item) return;

    if (!item.available) {
      const missing = document.createElement("div");
      missing.className = "inheritance-missing-v16";
      missing.textContent =
        "Detailed comparison unavailable: " + item.missing.join(" and ") +
        " no longer exists on the four-edition Living Catalog shelf. The code-only parent→child relation is still retained.";
      node.append(missing);
      return;
    }

    if (!item.differences.length) {
      const same = document.createElement("div");
      same.className = "inheritance-same-v16";
      same.textContent = "Parent and child use different edition codes but match in all ten compact summary dimensions.";
      node.append(same);
      return;
    }

    item.differences.forEach(diff => {
      const row = document.createElement("div");
      row.className = "inheritance-row-v16";

      const label = document.createElement("strong");
      label.textContent = diff.label;

      const values = document.createElement("span");
      values.textContent = String(diff.before) + " → " + String(diff.after);

      const delta = document.createElement("em");
      delta.textContent = diff.delta === null
        ? "changed"
        : diff.delta > 0
          ? "+" + diff.delta
          : String(diff.delta);

      row.append(label, values, delta);
      node.append(row);
    });
  }

  function refreshDialog() {
    ensureDialog();
    const items = comparisons();
    const selected = selectedComparison();
    const title = document.getElementById("inheritanceTitleV16");
    const body = document.getElementById("inheritanceBodyV16");

    if (!items.length) {
      setText(title, "No Descendants to Compare");
      setText(body, "Edition Lineage has no explicit Second Edition relationships yet.");
    } else if (!selected) {
      setText(title, "Inheritance Notes");
      setText(body, "Select a parent→child relation.");
    } else {
      setText(title, "Inheritance · " + selected.relation.parentCode + " → " + selected.relation.childCode);
      setText(
        body,
        selected.available
          ? selected.differences.length + " of " + fields.length + " compact summary dimensions changed from parent to child."
          : "The relationship survives as codes, but its detailed compact-summary inheritance can no longer be reconstructed."
      );
    }

    renderChooser(items);
    renderDiff(selected);
  }

  function openDialog() {
    const dialog = ensureDialog();
    refreshDialog();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function refreshPanel() {
    ensurePanel();
    const items = comparisons();
    const available = items.filter(item => item.available).length;
    const status = document.getElementById("inheritanceStatusV16");
    const button = document.getElementById("openInheritanceV16");

    if (!items.length) {
      setText(status, "No Edition Lineage relations yet.");
    } else {
      setText(
        status,
        available + "/" + items.length + " lineage comparison" + (items.length === 1 ? "" : "s") +
        " currently have both summaries on the local shelf"
      );
    }
    if (button) button.disabled = !items.length;
  }

  function renderVestibuleNote() {
    const layer = document.getElementById("exhibitLayer");
    if (!layer) return;

    const existing = layer.querySelector(".inheritance-note-v16");
    const items = comparisons();
    const latest = items[items.length - 1] || null;

    if (currentRoom() !== "vestibule" || !latest) {
      if (existing) existing.remove();
      return;
    }

    let node = existing;
    if (!node) {
      node = document.createElement("button");
      node.type = "button";
      node.className = "inheritance-note-v16";
      node.style.left = "52%";
      node.style.top = "82%";
      node.addEventListener("click", () => {
        const currentItems = comparisons();
        const currentLatest = currentItems[currentItems.length - 1];
        if (currentLatest) selectedKey = relationKey(currentLatest.relation);
        openDialog();
      });

      const mark = document.createElement("span");
      mark.className = "inheritance-mark-v16";
      mark.textContent = "∆";

      const label = document.createElement("span");
      label.className = "inheritance-label-v16";

      node.append(mark, label);
      layer.append(node);
    }

    node.dataset.available = latest.available ? "true" : "false";
    setText(
      node.querySelector(".inheritance-label-v16"),
      latest.available ? "INHERITED ∆" + latest.differences.length : "SUMMARY UNAVAILABLE"
    );
    node.setAttribute(
      "aria-label",
      latest.available
        ? "Inheritance note: " + latest.differences.length + " compact summary changes between latest parent and child."
        : "Inheritance note: detailed comparison unavailable because a compact edition summary aged off the local shelf."
    );
  }

  function signature() {
    const shelf = editionMap();
    return relations().map(relation => {
      const comparison = compareRelation(relation, shelf);
      return relationKey(relation) + ":" + (comparison.available ? comparison.differences.length : "missing");
    }).join("|") + "|" + currentRoom();
  }

  function refreshAll() {
    refreshPanel();
    renderVestibuleNote();
    if (document.getElementById("inheritanceDialogV16")?.open) refreshDialog();
    lastSignature = signature();
  }

  setInterval(() => {
    const next = signature();
    if (next !== lastSignature) refreshAll();
    else renderVestibuleNote();
  }, 420);

  ensurePanel();
  ensureDialog();
  refreshAll();
})();