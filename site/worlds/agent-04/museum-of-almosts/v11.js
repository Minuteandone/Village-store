(() => {
  "use strict";

  const STORAGE_KEY = "agent04-museum-of-almosts-v1";
  const REFERENCE_KEY = "agent04-museum-resonance-v04";
  const AFTERIMAGE_KEY = "agent04-museum-afterimages-v05";
  const CURATOR_KEY = "agent04-museum-curator-v06";
  const UNBUILT_KEY = "agent04-museum-unbuilt-v08";
  const EDITION_KEY = "agent04-museum-editions-v10";

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

  let selectedEditionCode = null;
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

  function validSummary(summary) {
    if (!summary || typeof summary !== "object") return false;
    const numeric = ["almosts","visitedRooms","changes","echoes","afterimages","curatedRevisions","curatedExhibits","blueprints"];
    return numeric.every(key => Number.isInteger(summary[key]) && summary[key] >= 0) &&
      typeof summary.referenceMounted === "boolean" &&
      typeof summary.importedLineage === "boolean";
  }

  function editions() {
    const raw = readJson(EDITION_KEY, null);
    if (!raw || !Array.isArray(raw.editions)) return [];
    return raw.editions.filter(item =>
      item &&
      typeof item === "object" &&
      typeof item.code === "string" &&
      typeof item.lens === "string" &&
      validSummary(item.summary)
    ).slice(-4);
  }

  function compareSummary(editionSummary, now) {
    const differences = fields.map(([key, label]) => {
      const before = editionSummary[key];
      const after = now[key];
      if (before === after) return null;

      if (typeof before === "boolean" || typeof after === "boolean") {
        return {
          key,
          label,
          before: before ? "yes" : "no",
          after: after ? "yes" : "no",
          delta: after === before ? 0 : 1
        };
      }

      return {
        key,
        label,
        before,
        after,
        delta: Number(after) - Number(before)
      };
    }).filter(Boolean);

    const magnitude = differences.reduce((sum, item) => {
      if (typeof item.delta !== "number") return sum + 1;
      return sum + Math.min(4, Math.abs(item.delta));
    }, 0);

    return {
      differences,
      magnitude,
      changedFields: differences.length
    };
  }

  function driftLabel(comparison) {
    if (!comparison.changedFields) return "Current";
    if (comparison.changedFields <= 2 && comparison.magnitude <= 3) return "Footnote drift";
    if (comparison.changedFields <= 5 && comparison.magnitude <= 10) return "Revision drift";
    return "Rewrite drift";
  }

  function driftTone(comparison) {
    if (!comparison.changedFields) return "current";
    if (comparison.changedFields <= 2 && comparison.magnitude <= 3) return "minor";
    if (comparison.changedFields <= 5 && comparison.magnitude <= 10) return "medium";
    return "major";
  }

  function setText(node, value) {
    const text = String(value);
    if (node && node.textContent !== text) node.textContent = text;
  }

  function currentRoom() {
    const main = readJson(STORAGE_KEY, {});
    return typeof main.room === "string" ? main.room : "vestibule";
  }

  function latestEdition() {
    const items = editions();
    return items[items.length - 1] || null;
  }

  function selectedEdition() {
    const items = editions();
    if (!items.length) return null;
    return items.find(item => item.code === selectedEditionCode) || items[items.length - 1];
  }

  function ensurePanel() {
    let section = document.getElementById("errataPanelV11");
    if (section) return section;

    const aside = document.querySelector(".side-card");
    if (!aside) return null;

    section = document.createElement("section");
    section.id = "errataPanelV11";
    section.className = "visit-card errata-panel-v11";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "ERRATA · v1.1";

    const status = document.createElement("p");
    status.id = "errataStatusV11";
    status.className = "control-hint";

    const button = document.createElement("button");
    button.id = "openErrataV11";
    button.className = "full-button";
    button.type = "button";
    button.textContent = "compare editions to now";
    button.addEventListener("click", openDialog);

    section.append(eyebrow, status, button);

    const edition = aside.querySelector("#editionPanelV10");
    const distant = aside.querySelector(".distant-wings");
    if (edition?.nextSibling) aside.insertBefore(section, edition.nextSibling);
    else if (distant) aside.insertBefore(section, distant);
    else aside.append(section);

    return section;
  }

  function ensureDialog() {
    let dialog = document.getElementById("errataDialogV11");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "errataDialogV11";
    dialog.className = "dialog errata-dialog-v11";

    const mark = document.createElement("div");
    mark.className = "dialog-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "※";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "EDITION DRIFT · v1.1";

    const title = document.createElement("h2");
    title.id = "errataTitleV11";
    title.textContent = "Errata";

    const body = document.createElement("p");
    body.id = "errataBodyV11";

    const chooser = document.createElement("div");
    chooser.id = "errataChooserV11";
    chooser.className = "errata-chooser-v11";

    const diff = document.createElement("div");
    diff.id = "errataDiffV11";
    diff.className = "errata-diff-v11";

    const close = document.createElement("button");
    close.type = "button";
    close.className = "quiet-button";
    close.textContent = "close errata";
    close.addEventListener("click", () => dialog.close());

    dialog.append(mark, eyebrow, title, body, chooser, diff, close);
    document.body.append(dialog);
    return dialog;
  }

  function renderChooser() {
    const node = document.getElementById("errataChooserV11");
    if (!node) return;

    const items = editions();
    const now = currentSummary();
    node.replaceChildren();

    items.slice().reverse().forEach(edition => {
      const comparison = compareSummary(edition.summary, now);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "errata-edition-v11";
      button.dataset.tone = driftTone(comparison);
      button.setAttribute("aria-pressed", String(edition.code === selectedEdition()?.code));
      button.addEventListener("click", () => {
        selectedEditionCode = edition.code;
        refreshDialog();
      });

      const code = document.createElement("strong");
      code.textContent = edition.code;

      const status = document.createElement("span");
      status.textContent = driftLabel(comparison) + " · " + comparison.changedFields + " changed field" + (comparison.changedFields === 1 ? "" : "s");

      button.append(code, status);
      node.append(button);
    });
  }

  function renderDiff(edition, comparison) {
    const node = document.getElementById("errataDiffV11");
    if (!node) return;
    node.replaceChildren();

    if (!comparison.changedFields) {
      const current = document.createElement("div");
      current.className = "errata-current-v11";
      current.textContent = "No errata. This edition's compact summary still exactly matches the Museum now.";
      node.append(current);
      return;
    }

    comparison.differences.forEach(item => {
      const row = document.createElement("div");
      row.className = "errata-row-v11";

      const label = document.createElement("strong");
      label.textContent = item.label;

      const values = document.createElement("span");
      values.textContent = String(item.before) + " → " + String(item.after);

      const delta = document.createElement("em");
      if (typeof item.delta === "number" && Number.isFinite(item.delta) && typeof edition.summary[item.key] !== "boolean") {
        delta.textContent = item.delta > 0 ? "+" + item.delta : String(item.delta);
      } else {
        delta.textContent = "changed";
      }

      row.append(label, values, delta);
      node.append(row);
    });
  }

  function refreshDialog() {
    ensureDialog();
    const edition = selectedEdition();
    const body = document.getElementById("errataBodyV11");
    const title = document.getElementById("errataTitleV11");

    if (!edition) {
      setText(title, "No Edition, No Errata");
      setText(body, "Print a Living Catalog edition first. Errata only exists when the Museum has a previous statement to disagree with.");
      const chooser = document.getElementById("errataChooserV11");
      const diff = document.getElementById("errataDiffV11");
      chooser?.replaceChildren();
      diff?.replaceChildren();
      return;
    }

    const comparison = compareSummary(edition.summary, currentSummary());
    setText(title, "Errata for " + edition.code);
    setText(
      body,
      driftLabel(comparison) + ". " +
      (comparison.changedFields
        ? comparison.changedFields + " of " + fields.length + " summary dimensions no longer match this printed edition."
        : "The Museum still agrees with this edition in every stored summary dimension.")
    );
    renderChooser();
    renderDiff(edition, comparison);
  }

  function openDialog() {
    const dialog = ensureDialog();
    refreshDialog();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function refreshPanel() {
    ensurePanel();
    const status = document.getElementById("errataStatusV11");
    const button = document.getElementById("openErrataV11");
    const latest = latestEdition();

    if (!latest) {
      setText(status, "Print a Living Catalog edition first. Errata measures how the Museum changes after publication.");
      if (button) button.disabled = true;
      return;
    }

    const comparison = compareSummary(latest.summary, currentSummary());
    setText(
      status,
      driftLabel(comparison) + " · latest edition differs in " + comparison.changedFields + "/" + fields.length + " summary dimensions"
    );
    if (button) button.disabled = false;
  }

  function renderErrataSlip() {
    const layer = document.getElementById("exhibitLayer");
    if (!layer) return;

    const existing = layer.querySelector(".errata-slip-v11");
    const latest = latestEdition();

    if (currentRoom() !== "vestibule" || !latest) {
      if (existing) existing.remove();
      return;
    }

    const comparison = compareSummary(latest.summary, currentSummary());
    if (!comparison.changedFields) {
      if (existing) existing.remove();
      return;
    }

    let slip = existing;
    if (!slip) {
      slip = document.createElement("button");
      slip.type = "button";
      slip.className = "errata-slip-v11";
      slip.style.left = "84%";
      slip.style.top = "78%";
      slip.addEventListener("click", () => {
        const currentLatest = latestEdition();
        if (currentLatest) selectedEditionCode = currentLatest.code;
        openDialog();
      });

      const mark = document.createElement("span");
      mark.className = "errata-mark-v11";
      mark.textContent = "※";

      const text = document.createElement("span");
      text.className = "errata-slip-text-v11";

      slip.append(mark, text);
      layer.append(slip);
    }

    slip.dataset.tone = driftTone(comparison);
    setText(slip.querySelector(".errata-slip-text-v11"), "ERRATA ×" + comparison.changedFields);
    slip.setAttribute(
      "aria-label",
      "Errata slip for latest Living Catalog edition. " + comparison.changedFields + " summary dimensions have changed."
    );
  }

  function applyArchiveNote() {
    let note = document.getElementById("errataArchiveNoteV11");
    const latest = latestEdition();

    if (!latest) {
      if (note) note.remove();
      return;
    }

    if (!note) {
      note = document.createElement("p");
      note.id = "errataArchiveNoteV11";
      note.className = "errata-archive-note-v11";
      const edition = document.getElementById("editionArchiveNoteV10");
      const archiveText = document.getElementById("archiveText");
      if (edition) edition.insertAdjacentElement("afterend", note);
      else if (archiveText) archiveText.insertAdjacentElement("afterend", note);
    }

    const comparison = compareSummary(latest.summary, currentSummary());
    setText(
      note,
      "Errata for latest edition " + latest.code + ": " + driftLabel(comparison) +
      " · " + comparison.changedFields + "/" + fields.length + " summary dimensions changed."
    );
    note.dataset.tone = driftTone(comparison);
  }

  function signature() {
    const latest = latestEdition();
    const now = currentSummary();
    return currentRoom() + "|" + (latest ? latest.code : "-") + "|" + fields.map(([key]) => String(now[key])).join(":");
  }

  function refreshAll() {
    refreshPanel();
    renderErrataSlip();
    applyArchiveNote();
    if (document.getElementById("errataDialogV11")?.open) refreshDialog();
    lastSignature = signature();
  }

  setInterval(() => {
    const next = signature();
    if (next !== lastSignature) refreshAll();
    else renderErrataSlip();
  }, 320);

  ensurePanel();
  ensureDialog();
  refreshAll();
})();