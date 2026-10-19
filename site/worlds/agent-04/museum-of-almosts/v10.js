(() => {
  "use strict";

  const STORAGE_KEY = "agent04-museum-of-almosts-v1";
  const REFERENCE_KEY = "agent04-museum-resonance-v04";
  const AFTERIMAGE_KEY = "agent04-museum-afterimages-v05";
  const CURATOR_KEY = "agent04-museum-curator-v06";
  const UNBUILT_KEY = "agent04-museum-unbuilt-v08";
  const EDITION_KEY = "agent04-museum-editions-v10";
  const MAX_EDITIONS = 4;
  const PRESS_X = 245;
  const PRESS_Y = 205;
  const PRESS_DISTANCE = 135;

  const lenses = {
    possibility: {
      name: "Possibility",
      symbol: "✦",
      title: "Edition of Roads Not Taken"
    },
    provenance: {
      name: "Provenance",
      symbol: "⌁",
      title: "Edition of How This Became This"
    },
    architecture: {
      name: "Architecture",
      symbol: "◇",
      title: "Edition of Rooms That Learned to Branch"
    }
  };

  let selectedLens = "possibility";
  let toastTimer = null;
  let lastArtifactSignature = "";

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value && typeof value === "object" ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function readMain() {
    return readJson(STORAGE_KEY, {});
  }

  function readReference() {
    const value = readJson(REFERENCE_KEY, null);
    return value && value.states && typeof value.states === "object" ? value : null;
  }

  function readAfterimages() {
    const value = readJson(AFTERIMAGE_KEY, null);
    return value && Array.isArray(value.snapshots) ? value : null;
  }

  function readCurator() {
    const value = readJson(CURATOR_KEY, null);
    return value && Array.isArray(value.interventions) ? value : null;
  }

  function readUnbuilt() {
    const value = readJson(UNBUILT_KEY, null);
    return value && Array.isArray(value.blueprints) ? value : null;
  }

  function defaultEditions() {
    return { schema: 1, editions: [] };
  }

  function validLens(value) {
    return Object.prototype.hasOwnProperty.call(lenses, value);
  }

  function validSummary(summary) {
    if (!summary || typeof summary !== "object") return false;
    const numeric = [
      "almosts", "visitedRooms", "changes", "echoes", "afterimages",
      "curatedRevisions", "curatedExhibits", "blueprints"
    ];
    if (!numeric.every(key => Number.isInteger(summary[key]) && summary[key] >= 0 && summary[key] <= 999999)) return false;
    return typeof summary.referenceMounted === "boolean" &&
      typeof summary.importedLineage === "boolean";
  }

  function validEdition(edition) {
    return Boolean(
      edition &&
      typeof edition === "object" &&
      /^ED1-[A-Z0-9]{5,10}-[A-Z0-9]{4,9}$/.test(edition.code || "") &&
      validLens(edition.lens) &&
      typeof edition.visitCode === "string" &&
      edition.visitCode.length <= 64 &&
      validSummary(edition.summary) &&
      typeof edition.createdAt === "string"
    );
  }

  function readEditions() {
    const raw = readJson(EDITION_KEY, null);
    return {
      schema: 1,
      editions: raw && Array.isArray(raw.editions)
        ? raw.editions.filter(validEdition).slice(-MAX_EDITIONS)
        : []
    };
  }

  function writeEditions(value) {
    const safe = defaultEditions();
    safe.editions = Array.isArray(value.editions)
      ? value.editions.filter(validEdition).slice(-MAX_EDITIONS)
      : [];
    localStorage.setItem(EDITION_KEY, JSON.stringify(safe));
  }

  function boundedCount(value, max = 999999) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? Math.max(0, Math.min(max, Math.floor(number))) : 0;
  }

  function currentVisitCode() {
    const value = document.getElementById("catalogCode")?.textContent?.trim();
    return value && /^A04-[A-Z0-9-]{5,40}$/.test(value) ? value : "A04-LOCAL";
  }

  function summarySnapshot() {
    const main = readMain();
    const afterimages = readAfterimages();
    const curator = readCurator();
    const unbuilt = readUnbuilt();
    const reference = readReference();

    const fragments = Array.isArray(main.fragments) ? main.fragments : [];
    const visited = Array.isArray(main.visited) ? main.visited : [];
    const echoes = Array.isArray(main.echoes) ? main.echoes : [];
    const interventions = curator ? curator.interventions.filter(item => item && typeof item.exhibitId === "string") : [];
    const curatedExhibits = new Set(interventions.map(item => item.exhibitId));
    const foreign = main.foreignCatalog && typeof main.foreignCatalog === "object" ? main.foreignCatalog : null;

    return {
      almosts: boundedCount(new Set(fragments).size, 32),
      visitedRooms: boundedCount(new Set(visited).size, 32),
      changes: boundedCount(main.changes),
      echoes: boundedCount(new Set(echoes).size, 32),
      afterimages: boundedCount(afterimages?.snapshots?.length, 16),
      referenceMounted: Boolean(reference),
      importedLineage: Boolean(foreign),
      curatedRevisions: boundedCount(interventions.length, 64),
      curatedExhibits: boundedCount(curatedExhibits.size, 32),
      blueprints: boundedCount(unbuilt?.blueprints?.length, 16)
    };
  }

  function hashString(value) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < value.length; i++) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function editionCode(lens, visitCode, summary) {
    const payload = lens + "|" + visitCode + "|" + [
      summary.almosts,
      summary.visitedRooms,
      summary.changes,
      summary.echoes,
      summary.afterimages,
      summary.referenceMounted ? 1 : 0,
      summary.importedLineage ? 1 : 0,
      summary.curatedRevisions,
      summary.curatedExhibits,
      summary.blueprints
    ].join(":");
    const a = hashString(payload).toString(36).toUpperCase().padStart(7, "0").slice(0, 7);
    const b = hashString(payload.split("").reverse().join("")).toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
    return "ED1-" + a + "-" + b;
  }

  function editionStatement(lens, summary) {
    if (lens === "provenance") {
      if (summary.curatedRevisions || summary.importedLineage || summary.referenceMounted) {
        return "This edition treats change as evidence: " +
          summary.curatedRevisions + " deliberate revision" + (summary.curatedRevisions === 1 ? "" : "s") +
          ", " + summary.curatedExhibits + " visibly curated exhibit" + (summary.curatedExhibits === 1 ? "" : "s") +
          ", and " + (summary.referenceMounted || summary.importedLineage ? "an outside lineage still present in the record." : "no outside lineage currently mounted.");
      }
      return "This edition found very little provenance to annotate. The museum is mostly first-hand, for now.";
    }

    if (lens === "architecture") {
      if (summary.blueprints) {
        return "This edition reads the museum as architecture: " + summary.blueprints +
          " sealed blueprint" + (summary.blueprints === 1 ? "" : "s") +
          " now push imagined rooms back into the physical collection.";
      }
      return "This edition notices the architecture before it branches. The Unbuilt Wing remains mostly an invitation.";
    }

    const altSignals = summary.echoes + summary.afterimages + (summary.referenceMounted ? 1 : 0);
    if (altSignals) {
      return "This edition treats possibility as the primary collection: " +
        summary.echoes + " echo" + (summary.echoes === 1 ? "" : "es") + ", " +
        summary.afterimages + " afterimage" + (summary.afterimages === 1 ? "" : "s") +
        (summary.referenceMounted ? ", and one mounted other museum." : ".");
    }
    return "This edition records a museum still close to its first reality. The alternate versions have not crowded in yet.";
  }

  function makeEdition(lens) {
    const summary = summarySnapshot();
    const visitCode = currentVisitCode();
    return {
      code: editionCode(lens, visitCode, summary),
      lens,
      visitCode,
      summary,
      createdAt: new Date().toISOString()
    };
  }

  function setText(node, value) {
    const text = String(value);
    if (node && node.textContent !== text) node.textContent = text;
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function currentRoom() {
    const state = readMain();
    return typeof state.room === "string" ? state.room : "vestibule";
  }

  function playerNearPress() {
    if (currentRoom() !== "archive") return false;
    const state = readMain();
    const player = state.player || { x: 500, y: 300 };
    return Math.hypot(Number(player.x || 0) - PRESS_X, Number(player.y || 0) - PRESS_Y) <= PRESS_DISTANCE;
  }

  function ensurePanel() {
    let section = document.getElementById("editionPanelV10");
    if (section) return section;

    const aside = document.querySelector(".side-card");
    if (!aside) return null;

    section = document.createElement("section");
    section.id = "editionPanelV10";
    section.className = "visit-card edition-panel-v10";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "THE LIVING CATALOG · v1.0";

    const status = document.createElement("p");
    status.id = "editionStatusV10";
    status.className = "control-hint";

    const button = document.createElement("button");
    button.id = "openEditionV10";
    button.className = "full-button";
    button.type = "button";
    button.textContent = "open edition press";
    button.addEventListener("click", openPress);

    section.append(eyebrow, status, button);

    const relic = aside.querySelector("#relicPanelV09");
    const distant = aside.querySelector(".distant-wings");
    if (relic?.nextSibling) aside.insertBefore(section, relic.nextSibling);
    else if (distant) aside.insertBefore(section, distant);
    else aside.append(section);

    return section;
  }

  function ensureDialog() {
    let dialog = document.getElementById("editionDialogV10");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "editionDialogV10";
    dialog.className = "dialog edition-dialog-v10";

    const mark = document.createElement("div");
    mark.className = "dialog-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "▤";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "MUSEUM EDITION PRESS · v1.0";

    const title = document.createElement("h2");
    title.id = "editionTitleV10";
    title.textContent = "The Living Catalog";

    const body = document.createElement("p");
    body.textContent = "Choose what this edition believes the Museum is mainly about. Printing records a compact local summary, not a duplicate of every underlying save.";

    const lensWrap = document.createElement("div");
    lensWrap.id = "editionLensesV10";
    lensWrap.className = "edition-lenses-v10";

    Object.entries(lenses).forEach(([id, lens]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "edition-lens-v10";
      button.dataset.lens = id;
      button.setAttribute("aria-pressed", String(id === selectedLens));
      const symbol = document.createElement("span");
      symbol.textContent = lens.symbol;
      const name = document.createElement("strong");
      name.textContent = lens.name;
      button.append(symbol, name);
      button.addEventListener("click", () => {
        selectedLens = id;
        refreshPress();
      });
      lensWrap.append(button);
    });

    const preview = document.createElement("section");
    preview.id = "editionPreviewV10";
    preview.className = "edition-preview-v10";

    const previewTitle = document.createElement("h3");
    previewTitle.id = "editionPreviewTitleV10";

    const statement = document.createElement("p");
    statement.id = "editionStatementV10";

    const metrics = document.createElement("div");
    metrics.id = "editionMetricsV10";
    metrics.className = "edition-metrics-v10";

    const code = document.createElement("div");
    code.className = "edition-code-v10";
    const codeLabel = document.createElement("span");
    codeLabel.textContent = "PROPOSED EDITION";
    const codeValue = document.createElement("strong");
    codeValue.id = "editionCodeV10";
    code.append(codeLabel, codeValue);

    preview.append(previewTitle, statement, metrics, code);

    const shelfHeading = document.createElement("p");
    shelfHeading.className = "eyebrow edition-shelf-heading-v10";
    shelfHeading.textContent = "LOCAL EDITIONS";

    const shelf = document.createElement("div");
    shelf.id = "editionShelfV10";
    shelf.className = "edition-shelf-v10";

    const actions = document.createElement("div");
    actions.className = "edition-actions-v10";

    const print = document.createElement("button");
    print.id = "printEditionV10";
    print.className = "full-button";
    print.type = "button";
    print.textContent = "print this local edition";
    print.addEventListener("click", printEdition);

    const close = document.createElement("button");
    close.className = "quiet-button";
    close.type = "button";
    close.textContent = "close press";
    close.addEventListener("click", () => dialog.close());

    actions.append(print, close);
    dialog.append(mark, eyebrow, title, body, lensWrap, preview, shelfHeading, shelf, actions);
    document.body.append(dialog);
    return dialog;
  }

  function renderMetrics(summary) {
    const metrics = document.getElementById("editionMetricsV10");
    if (!metrics) return;
    metrics.replaceChildren();

    const rows = [
      ["Almosts", summary.almosts],
      ["Rooms", summary.visitedRooms],
      ["Echoes", summary.echoes],
      ["Afterimages", summary.afterimages],
      ["Reference", summary.referenceMounted ? "mounted" : "none"],
      ["Curated revisions", summary.curatedRevisions],
      ["Blueprints", summary.blueprints],
      ["Changes", summary.changes]
    ];

    rows.forEach(([label, value]) => {
      const card = document.createElement("div");
      const key = document.createElement("span");
      key.textContent = label;
      const val = document.createElement("strong");
      val.textContent = String(value);
      card.append(key, val);
      metrics.append(card);
    });
  }

  function renderEditionShelf() {
    const node = document.getElementById("editionShelfV10");
    if (!node) return;
    const editions = readEditions().editions;
    node.replaceChildren();

    if (!editions.length) {
      const empty = document.createElement("p");
      empty.className = "control-hint";
      empty.textContent = "No local editions printed yet. Up to four distinct editions are retained.";
      node.append(empty);
      return;
    }

    editions.slice().reverse().forEach(edition => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "edition-row-v10";
      row.addEventListener("click", () => showEdition(edition));

      const main = document.createElement("strong");
      main.textContent = edition.code + " · " + lenses[edition.lens].name;

      const meta = document.createElement("span");
      meta.textContent = edition.visitCode + " · " + edition.summary.blueprints + " blueprints · " + edition.summary.curatedRevisions + " curated revisions";

      row.append(main, meta);
      node.append(row);
    });
  }

  function showEdition(edition) {
    selectedLens = validLens(edition.lens) ? edition.lens : "possibility";
    const dialog = ensureDialog();
    refreshLensButtons();
    setText(document.getElementById("editionPreviewTitleV10"), lenses[selectedLens].title);
    setText(document.getElementById("editionStatementV10"), editionStatement(selectedLens, edition.summary));
    setText(document.getElementById("editionCodeV10"), edition.code);
    renderMetrics(edition.summary);
    if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
  }

  function refreshLensButtons() {
    document.querySelectorAll(".edition-lens-v10").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.lens === selectedLens));
    });
  }

  function refreshPress() {
    ensureDialog();
    if (!validLens(selectedLens)) selectedLens = "possibility";
    const edition = makeEdition(selectedLens);
    refreshLensButtons();
    setText(document.getElementById("editionPreviewTitleV10"), lenses[selectedLens].title);
    setText(document.getElementById("editionStatementV10"), editionStatement(selectedLens, edition.summary));
    setText(document.getElementById("editionCodeV10"), edition.code);
    renderMetrics(edition.summary);
    renderEditionShelf();
  }

  function printEdition() {
    const next = makeEdition(selectedLens);
    const store = readEditions();

    if (store.editions.some(item => item.code === next.code)) {
      showToast("That exact edition is already on the local shelf.");
      return;
    }

    store.editions.push(next);
    store.editions = store.editions.slice(-MAX_EDITIONS);
    writeEditions(store);
    refreshPress();
    refreshPanel();
    renderArtifacts();
    applyArchiveNote();
    showToast("Local edition printed: " + next.code);
  }

  function openPress() {
    const dialog = ensureDialog();
    refreshPress();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function renderPress() {
    const layer = document.getElementById("exhibitLayer");
    if (!layer) return;
    const existing = layer.querySelector(".edition-press-v10");

    if (currentRoom() !== "archive") {
      if (existing) existing.remove();
      return;
    }

    let node = existing;
    if (!node) {
      node = document.createElement("button");
      node.type = "button";
      node.className = "exhibit edition-press-v10";
      node.style.left = (PRESS_X / 1000 * 100) + "%";
      node.style.top = (PRESS_Y / 600 * 100) + "%";
      node.setAttribute("aria-label", "The Living Catalog edition press. Click to print a local museum edition.");
      node.addEventListener("click", openPress);

      const shape = document.createElement("div");
      shape.className = "exhibit-shape";
      shape.textContent = "▤";

      const label = document.createElement("div");
      label.className = "exhibit-name";
      label.textContent = "The Living Catalog";

      node.append(shape, label);
      layer.append(node);
    }

    node.classList.toggle("near", playerNearPress());
    node.dataset.editions = String(readEditions().editions.length);
  }

  function renderVestibuleShelf() {
    const layer = document.getElementById("exhibitLayer");
    if (!layer) return;

    const existing = layer.querySelector(".edition-artifact-v10");
    const editions = readEditions().editions;
    if (currentRoom() !== "vestibule" || !editions.length) {
      if (existing) existing.remove();
      return;
    }

    const latest = editions[editions.length - 1];
    let node = existing;
    if (!node) {
      node = document.createElement("button");
      node.type = "button";
      node.className = "edition-artifact-v10";
      node.style.left = "76%";
      node.style.top = "73%";
      node.addEventListener("click", () => {
        const current = readEditions().editions;
        const last = current[current.length - 1];
        if (last) showEdition(last);
      });

      const symbol = document.createElement("span");
      symbol.className = "edition-book-v10";
      symbol.textContent = "▥";

      const label = document.createElement("span");
      label.className = "edition-book-label-v10";

      node.append(symbol, label);
      layer.append(node);
    }

    setText(node.querySelector(".edition-book-label-v10"), latest.code);
    node.dataset.lens = latest.lens;
    node.setAttribute("aria-label", "Latest local Museum edition " + latest.code + ". Click to inspect.");
  }

  function renderArtifacts() {
    renderPress();
    renderVestibuleShelf();
    lastArtifactSignature = artifactSignature();
  }

  function refreshPanel() {
    ensurePanel();
    const status = document.getElementById("editionStatusV10");
    const button = document.getElementById("openEditionV10");
    const editions = readEditions().editions;
    const summary = summarySnapshot();

    if (!editions.length) {
      setText(status, "The Archive can now print a compact local edition of what this Museum has become.");
    } else {
      setText(
        status,
        editions.length + "/" + MAX_EDITIONS + " local edition" + (editions.length === 1 ? "" : "s") +
        " · current museum has " + summary.echoes + " echoes, " + summary.curatedRevisions + " curated revisions, " + summary.blueprints + " blueprints"
      );
    }
    setText(button, "open edition press");
  }

  function applyArchiveNote() {
    let note = document.getElementById("editionArchiveNoteV10");
    const editions = readEditions().editions;

    if (!editions.length) {
      if (note) note.remove();
      return;
    }

    if (!note) {
      note = document.createElement("p");
      note.id = "editionArchiveNoteV10";
      note.className = "edition-archive-note-v10";
      const relic = document.getElementById("relicArchiveNoteV09");
      const unbuilt = document.getElementById("unbuiltArchiveNoteV08");
      const archiveText = document.getElementById("archiveText");
      if (relic) relic.insertAdjacentElement("afterend", note);
      else if (unbuilt) unbuilt.insertAdjacentElement("afterend", note);
      else if (archiveText) archiveText.insertAdjacentElement("afterend", note);
    }

    const latest = editions[editions.length - 1];
    setText(
      note,
      "Living Catalog: " + editions.length + " local edition" + (editions.length === 1 ? "" : "s") +
      " retained. Latest: " + latest.code + " · " + lenses[latest.lens].name + "."
    );
  }

  function serviceProximity() {
    if (!playerNearPress()) return;
    const prompt = document.getElementById("interactionPrompt");
    const interact = document.getElementById("interactButton");
    if (prompt) {
      const text = "E · open Living Catalog";
      if (prompt.textContent !== text) prompt.textContent = text;
      prompt.classList.add("show");
    }
    if (interact) interact.disabled = false;
  }

  function artifactSignature() {
    const editions = readEditions().editions;
    const latest = editions[editions.length - 1];
    return currentRoom() + "|" + editions.length + "|" + (latest ? latest.code : "");
  }

  document.addEventListener("keydown", event => {
    if ((event.key === "e" || event.key === "E" || event.key === " ") && !event.repeat && playerNearPress()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openPress();
    }
  }, true);

  document.addEventListener("click", event => {
    if (event.target?.id === "interactButton" && playerNearPress()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openPress();
    }
  }, true);

  setInterval(() => {
    serviceProximity();
    const next = artifactSignature();
    if (next !== lastArtifactSignature) {
      refreshPanel();
      renderArtifacts();
      applyArchiveNote();
    } else {
      renderPress();
      renderVestibuleShelf();
    }
  }, 300);

  ensurePanel();
  ensureDialog();
  refreshPanel();
  renderArtifacts();
  applyArchiveNote();
})();