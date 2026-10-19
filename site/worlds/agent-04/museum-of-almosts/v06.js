(() => {
  "use strict";

  const STORAGE_KEY = "agent04-museum-of-almosts-v1";
  const REFERENCE_KEY = "agent04-museum-resonance-v04";
  const AFTERIMAGE_KEY = "agent04-museum-afterimages-v05";
  const CURATOR_KEY = "agent04-museum-curator-v06";
  const MAX_LEDGER = 12;
  const TABLE_X = 260;
  const TABLE_Y = 410;
  const TABLE_DISTANCE = 135;

  const exhibits = [
    ["directory", "Indecisive Directory"],
    ["weatherJar", "Jar of Unused Weather"],
    ["forecastDesk", "Forecast Desk"],
    ["almostEngine", "Almost Engine"],
    ["spareDrawer", "Drawer of Spare Purposes"],
    ["constellationDial", "Constellation Dial"],
    ["maybeSeed", "Maybe Seed"],
    ["rootMap", "Root Map"],
    ["finalIndex", "Index of This Visit"]
  ];

  const exhibitIds = exhibits.map(entry => entry[0]);
  const exhibitNames = Object.fromEntries(exhibits);
  const validState = value => Number.isInteger(value) && value >= 0 && value <= 2;

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

  function readMainState() {
    return readJson(STORAGE_KEY, {});
  }

  function readReference() {
    const value = readJson(REFERENCE_KEY, null);
    if (!value || !value.states || typeof value.states !== "object") return null;
    return value;
  }

  function readAfterimageArchive() {
    const value = readJson(AFTERIMAGE_KEY, null);
    if (!value || !Array.isArray(value.snapshots)) return null;
    return value;
  }

  function projectedAfterimage() {
    const archive = readAfterimageArchive();
    if (!archive || typeof archive.projectedId !== "string") return null;
    return archive.snapshots.find(snapshot =>
      snapshot &&
      snapshot.id === archive.projectedId &&
      snapshot.states &&
      typeof snapshot.states === "object"
    ) || null;
  }

  function readLedger() {
    const raw = readJson(CURATOR_KEY, null);
    const interventions = raw && Array.isArray(raw.interventions)
      ? raw.interventions.filter(validLedgerEntry).slice(-MAX_LEDGER)
      : [];
    return { schema: 1, interventions };
  }

  function validLedgerEntry(entry) {
    return Boolean(
      entry &&
      typeof entry === "object" &&
      exhibitIds.includes(entry.exhibitId) &&
      validState(entry.from) &&
      validState(entry.to) &&
      ["reference", "afterimage", "consensus"].includes(entry.source) &&
      typeof entry.sourceCode === "string" &&
      typeof entry.at === "string"
    );
  }

  function writeLedger(ledger) {
    const safe = {
      schema: 1,
      interventions: Array.isArray(ledger.interventions)
        ? ledger.interventions.filter(validLedgerEntry).slice(-MAX_LEDGER)
        : []
    };
    localStorage.setItem(CURATOR_KEY, JSON.stringify(safe));
  }

  function currentStateFor(id) {
    const state = readMainState();
    const value = state.exhibitStates && state.exhibitStates[id];
    return validState(value) ? value : 0;
  }

  function alternateState(source, id) {
    if (!source || !source.states || typeof source.states !== "object") return null;
    const value = source.states[id];
    return validState(value) ? value : null;
  }

  function sourceCode(source, type) {
    if (!source) return "unknown";
    if (type === "reference") {
      return typeof source.sourceCode === "string" ? source.sourceCode : "reference";
    }
    return typeof source.code === "string" ? source.code : "afterimage";
  }

  function candidates() {
    const reference = readReference();
    const afterimage = projectedAfterimage();

    return exhibits.map(([id, name]) => {
      const current = currentStateFor(id);
      const ref = alternateState(reference, id);
      const past = alternateState(afterimage, id);
      const refDiffers = ref !== null && ref !== current;
      const pastDiffers = past !== null && past !== current;
      return {
        id,
        name,
        current,
        reference: refDiffers ? ref : null,
        afterimage: pastDiffers ? past : null,
        referenceCode: sourceCode(reference, "reference"),
        afterimageCode: sourceCode(afterimage, "afterimage"),
        consensus: refDiffers && pastDiffers && ref === past ? ref : null
      };
    }).filter(entry => entry.reference !== null || entry.afterimage !== null);
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

  function currentVisitCode() {
    const value = document.getElementById("catalogCode")?.textContent?.trim();
    return value && /^A04-[A-Z0-9-]{5,40}$/.test(value) ? value : "A04-LOCAL";
  }

  function applyWeatherIfNeeded(state, exhibitId, targetState) {
    if (exhibitId !== "weatherJar") return;
    state.weather = ["drizzle", "amber", "snow"][targetState] || "drizzle";
  }

  function adopt(exhibitId, targetState, source, sourceCodeValue) {
    if (!exhibitIds.includes(exhibitId) || !validState(targetState)) {
      showToast("That alternate state is not catalog-safe.");
      return;
    }

    const state = readMainState();
    if (!state.exhibitStates || typeof state.exhibitStates !== "object") state.exhibitStates = {};

    const from = validState(state.exhibitStates[exhibitId]) ? state.exhibitStates[exhibitId] : 0;
    if (from === targetState) {
      showToast("That state is already present.");
      return;
    }

    const ledger = readLedger();
    ledger.interventions.push({
      exhibitId,
      from,
      to: targetState,
      source,
      sourceCode: String(sourceCodeValue || "unknown").slice(0, 64),
      fromVisit: currentVisitCode(),
      at: new Date().toISOString()
    });
    ledger.interventions = ledger.interventions.slice(-MAX_LEDGER);

    state.exhibitStates[exhibitId] = targetState;
    state.changes = Math.max(0, Number(state.changes || 0)) + 1;
    state.archiveSeen = true;
    applyWeatherIfNeeded(state, exhibitId, targetState);

    writeLedger(ledger);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    location.reload();
  }

  function undoLast() {
    const ledger = readLedger();
    const entry = ledger.interventions[ledger.interventions.length - 1];
    if (!entry) {
      showToast("The curation ledger is empty.");
      return;
    }

    const state = readMainState();
    if (!state.exhibitStates || typeof state.exhibitStates !== "object") state.exhibitStates = {};
    const current = validState(state.exhibitStates[entry.exhibitId]) ? state.exhibitStates[entry.exhibitId] : 0;

    if (current !== entry.to) {
      showToast("That exhibit changed again; the last adoption cannot be safely undone.");
      return;
    }

    state.exhibitStates[entry.exhibitId] = entry.from;
    state.changes = Math.max(0, Number(state.changes || 0)) + 1;
    applyWeatherIfNeeded(state, entry.exhibitId, entry.from);

    ledger.interventions.pop();
    writeLedger(ledger);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    location.reload();
  }

  function ensurePanel() {
    let section = document.getElementById("curatorPanelV06");
    if (section) return section;

    const aside = document.querySelector(".side-card");
    if (!aside) return null;

    section = document.createElement("section");
    section.id = "curatorPanelV06";
    section.className = "visit-card curator-panel-v06";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "CURATOR'S TABLE · v0.6";

    const status = document.createElement("p");
    status.id = "curatorStatusV06";
    status.className = "control-hint";

    const button = document.createElement("button");
    button.id = "openCuratorV06";
    button.className = "full-button";
    button.type = "button";
    button.textContent = "open curator's table";
    button.addEventListener("click", openDialog);

    section.append(eyebrow, status, button);

    const afterimage = aside.querySelector("#afterimagePanelV05");
    const distant = aside.querySelector(".distant-wings");
    if (afterimage?.nextSibling) aside.insertBefore(section, afterimage.nextSibling);
    else if (distant) aside.insertBefore(section, distant);
    else aside.append(section);

    return section;
  }

  function ensureDialog() {
    let dialog = document.getElementById("curatorDialogV06");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "curatorDialogV06";
    dialog.className = "dialog curator-dialog-v06";

    const mark = document.createElement("div");
    mark.className = "dialog-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "⌘";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "DELIBERATE REVISION · v0.6";

    const title = document.createElement("h2");
    title.textContent = "The Curator's Table";

    const body = document.createElement("p");
    body.id = "curatorBodyV06";

    const list = document.createElement("div");
    list.id = "curatorCandidatesV06";
    list.className = "curator-candidates-v06";

    const ledgerHeading = document.createElement("p");
    ledgerHeading.className = "eyebrow curator-ledger-heading-v06";
    ledgerHeading.textContent = "CURATION LEDGER";

    const ledger = document.createElement("div");
    ledger.id = "curatorLedgerV06";
    ledger.className = "curator-ledger-v06";

    const actions = document.createElement("div");
    actions.className = "curator-actions-v06";

    const undo = document.createElement("button");
    undo.id = "undoCuratorV06";
    undo.className = "quiet-button";
    undo.type = "button";
    undo.textContent = "undo last adoption";
    undo.addEventListener("click", undoLast);

    const clearLedger = document.createElement("button");
    clearLedger.id = "clearCuratorLedgerV06";
    clearLedger.className = "quiet-button danger";
    clearLedger.type = "button";
    clearLedger.textContent = "clear provenance notes";
    clearLedger.addEventListener("click", () => {
      localStorage.removeItem(CURATOR_KEY);
      showToast("Curation provenance notes cleared.");
      refreshAll();
    });

    const close = document.createElement("button");
    close.className = "quiet-button";
    close.type = "button";
    close.textContent = "leave table";
    close.addEventListener("click", () => dialog.close());

    actions.append(undo, clearLedger, close);
    dialog.append(mark, eyebrow, title, body, list, ledgerHeading, ledger, actions);
    document.body.append(dialog);
    return dialog;
  }

  function sourceButton(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
  }

  function renderCandidates() {
    const list = document.getElementById("curatorCandidatesV06");
    if (!list) return;

    const entries = candidates();
    list.replaceChildren();

    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "curator-empty-v06";
      empty.textContent = "No alternate source currently disagrees with the present museum. Mount a reference in v0.4 or project an Afterimage in v0.5, then change something.";
      list.append(empty);
      return;
    }

    entries.forEach(entry => {
      const row = document.createElement("section");
      row.className = "curator-row-v06";

      const heading = document.createElement("div");
      heading.className = "curator-row-heading-v06";

      const name = document.createElement("strong");
      name.textContent = entry.name;

      const current = document.createElement("span");
      current.textContent = "present state " + (entry.current + 1);
      heading.append(name, current);

      const buttons = document.createElement("div");
      buttons.className = "curator-source-buttons-v06";

      if (entry.consensus !== null) {
        buttons.append(sourceButton(
          "adopt shared state " + (entry.consensus + 1),
          "full-button curator-consensus-v06",
          () => adopt(entry.id, entry.consensus, "consensus", entry.referenceCode + " + " + entry.afterimageCode)
        ));
      } else {
        if (entry.afterimage !== null) {
          buttons.append(sourceButton(
            "restore past state " + (entry.afterimage + 1),
            "quiet-button",
            () => adopt(entry.id, entry.afterimage, "afterimage", entry.afterimageCode)
          ));
        }
        if (entry.reference !== null) {
          buttons.append(sourceButton(
            "adopt reference state " + (entry.reference + 1),
            "quiet-button",
            () => adopt(entry.id, entry.reference, "reference", entry.referenceCode)
          ));
        }
      }

      row.append(heading, buttons);
      list.append(row);
    });
  }

  function renderLedger() {
    const node = document.getElementById("curatorLedgerV06");
    if (!node) return;

    const ledger = readLedger();
    node.replaceChildren();

    if (!ledger.interventions.length) {
      const empty = document.createElement("p");
      empty.className = "control-hint";
      empty.textContent = "No deliberate adoptions have been recorded on this device.";
      node.append(empty);
      return;
    }

    ledger.interventions.slice().reverse().slice(0, 6).forEach(entry => {
      const row = document.createElement("div");
      row.className = "curator-ledger-row-v06";

      const main = document.createElement("strong");
      main.textContent = exhibitNames[entry.exhibitId] + " · " + (entry.from + 1) + " → " + (entry.to + 1);

      const meta = document.createElement("span");
      meta.textContent = entry.source + " · " + entry.sourceCode;

      row.append(main, meta);
      node.append(row);
    });
  }

  function refreshDialog() {
    ensureDialog();
    const reference = readReference();
    const afterimage = projectedAfterimage();
    const entries = candidates();
    const body = document.getElementById("curatorBodyV06");
    const undo = document.getElementById("undoCuratorV06");
    const clear = document.getElementById("clearCuratorLedgerV06");
    const ledger = readLedger();

    const sources = [];
    if (reference) sources.push("mounted reference");
    if (afterimage) sources.push("projected afterimage");

    if (!sources.length) {
      setText(body, "The table is ready, but nothing alternate has been laid on it. Mount a reference ticket or project an Afterimage first.");
    } else if (!entries.length) {
      setText(body, "The " + sources.join(" and ") + " currently agree with every present exhibit state. There is nothing to adopt.");
    } else {
      setText(body, entries.length + " exhibit" + (entries.length === 1 ? "" : "s") + " can be deliberately revised from the " + sources.join(" and ") + ". Each adoption becomes a bounded local provenance note.");
    }

    if (undo) undo.hidden = !ledger.interventions.length;
    if (clear) clear.hidden = !ledger.interventions.length;
    renderCandidates();
    renderLedger();
  }

  function openDialog() {
    const dialog = ensureDialog();
    refreshDialog();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function currentRoom() {
    const state = readMainState();
    return typeof state.room === "string" ? state.room : "vestibule";
  }

  function playerNearTable() {
    if (currentRoom() !== "archive") return false;
    const state = readMainState();
    const player = state.player || { x: 500, y: 300 };
    return Math.hypot(Number(player.x || 0) - TABLE_X, Number(player.y || 0) - TABLE_Y) <= TABLE_DISTANCE;
  }

  function artifactSignature() {
    const entries = candidates();
    const ledger = readLedger();
    return currentRoom() + "|" + entries.map(entry =>
      entry.id + ":" + entry.current + ":" + entry.reference + ":" + entry.afterimage
    ).join(",") + "|" + ledger.interventions.length;
  }

  function renderTable() {
    const layer = document.getElementById("exhibitLayer");
    if (!layer) return;

    const existing = layer.querySelector(".curator-table-v06");
    if (currentRoom() !== "archive") {
      if (existing) existing.remove();
      lastArtifactSignature = "";
      return;
    }

    const signature = artifactSignature();
    let node = existing;
    if (!node) {
      node = document.createElement("button");
      node.type = "button";
      node.className = "exhibit curator-table-v06";
      node.style.left = (TABLE_X / 1000 * 100) + "%";
      node.style.top = (TABLE_Y / 600 * 100) + "%";
      node.setAttribute("aria-label", "Curator's Table. Click to deliberately adopt alternate exhibit states.");

      const shape = document.createElement("div");
      shape.className = "exhibit-shape";
      shape.textContent = "⌘";

      const label = document.createElement("div");
      label.className = "exhibit-name";

      node.append(shape, label);
      node.addEventListener("click", openDialog);
      layer.append(node);
    }

    const count = candidates().length;
    node.dataset.candidates = String(count);
    node.classList.toggle("near", playerNearTable());
    const label = node.querySelector(".exhibit-name");
    setText(label, count ? "Curator's Table · " + count + " revisions" : "Curator's Table");
    lastArtifactSignature = signature;
  }

  function refreshPanel() {
    ensurePanel();
    const status = document.getElementById("curatorStatusV06");
    const button = document.getElementById("openCuratorV06");
    const entries = candidates();
    const ledger = readLedger();

    if (!readReference() && !projectedAfterimage()) {
      setText(status, "Comparison becomes revision here. Mount a reference or project an Afterimage first.");
    } else if (!entries.length) {
      setText(status, "Alternate sources mounted · no states currently disagree with the present.");
    } else {
      setText(status, entries.length + " deliberate revision" + (entries.length === 1 ? "" : "s") + " available · " + ledger.interventions.length + " provenance note" + (ledger.interventions.length === 1 ? "" : "s"));
    }
    setText(button, "open curator's table");
  }

  function applyArchiveNote() {
    let note = document.getElementById("curatorArchiveNoteV06");
    const ledger = readLedger();

    if (!ledger.interventions.length) {
      if (note) note.remove();
      return;
    }

    if (!note) {
      note = document.createElement("p");
      note.id = "curatorArchiveNoteV06";
      note.className = "curator-archive-note-v06";
      const afterimage = document.getElementById("afterimageArchiveNoteV05");
      const resonance = document.getElementById("resonanceArchiveNoteV04");
      const foreign = document.getElementById("foreignArchiveNoteV03");
      const archiveText = document.getElementById("archiveText");
      if (afterimage) afterimage.insertAdjacentElement("afterend", note);
      else if (resonance) resonance.insertAdjacentElement("afterend", note);
      else if (foreign) foreign.insertAdjacentElement("afterend", note);
      else if (archiveText) archiveText.insertAdjacentElement("afterend", note);
    }

    const last = ledger.interventions[ledger.interventions.length - 1];
    setText(
      note,
      "Curator provenance: " + ledger.interventions.length + " deliberate adoption" + (ledger.interventions.length === 1 ? "" : "s") +
      " retained locally. Most recent: " + exhibitNames[last.exhibitId] + " state " + (last.from + 1) + " → " + (last.to + 1) +
      " from " + last.source + "."
    );
  }

  function serviceProximity() {
    if (!playerNearTable()) return;
    const prompt = document.getElementById("interactionPrompt");
    const interact = document.getElementById("interactButton");
    if (prompt) {
      const text = "E · open curator's table";
      if (prompt.textContent !== text) prompt.textContent = text;
      prompt.classList.add("show");
    }
    if (interact) interact.disabled = false;
  }

  function refreshAll() {
    refreshPanel();
    refreshDialog();
    renderTable();
    applyArchiveNote();
  }

  document.addEventListener("keydown", event => {
    if ((event.key === "e" || event.key === "E" || event.key === " ") && !event.repeat && playerNearTable()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openDialog();
    }
  }, true);

  document.addEventListener("click", event => {
    if (event.target?.id === "interactButton" && playerNearTable()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openDialog();
    }
  }, true);

  setInterval(() => {
    serviceProximity();
    const signature = artifactSignature();
    if (signature !== lastArtifactSignature) {
      renderTable();
      refreshPanel();
      applyArchiveNote();
    }
  }, 260);

  ensurePanel();
  ensureDialog();
  refreshAll();
})();
