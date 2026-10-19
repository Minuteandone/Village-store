(() => {
  "use strict";

  const STORAGE_KEY = "agent04-museum-of-almosts-v1";
  const CURATOR_KEY = "agent04-museum-curator-v06";

  const roomExhibits = {
    vestibule: ["directory"],
    weather: ["weatherJar", "forecastDesk"],
    workshop: ["almostEngine", "spareDrawer"],
    observatory: ["constellationDial"],
    conservatory: ["maybeSeed", "rootMap"],
    archive: ["finalIndex"]
  };

  const exhibitNames = {
    directory: "Indecisive Directory",
    weatherJar: "Jar of Unused Weather",
    forecastDesk: "Forecast Desk",
    almostEngine: "Almost Engine",
    spareDrawer: "Drawer of Spare Purposes",
    constellationDial: "Constellation Dial",
    maybeSeed: "Maybe Seed",
    rootMap: "Root Map",
    finalIndex: "Index of This Visit"
  };

  const sourceNames = {
    reference: "mounted reference",
    afterimage: "projected afterimage",
    consensus: "reference + afterimage consensus"
  };

  const validState = value => Number.isInteger(value) && value >= 0 && value <= 2;
  let lastSignature = "";

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value && typeof value === "object" ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function readState() {
    return readJson(STORAGE_KEY, {});
  }

  function validEntry(entry) {
    return Boolean(
      entry &&
      typeof entry === "object" &&
      Object.prototype.hasOwnProperty.call(exhibitNames, entry.exhibitId) &&
      validState(entry.from) &&
      validState(entry.to) &&
      Object.prototype.hasOwnProperty.call(sourceNames, entry.source) &&
      typeof entry.sourceCode === "string" &&
      typeof entry.at === "string"
    );
  }

  function readLedger() {
    const raw = readJson(CURATOR_KEY, null);
    return raw && Array.isArray(raw.interventions)
      ? raw.interventions.filter(validEntry).slice(-12)
      : [];
  }

  function currentRoom() {
    const state = readState();
    return Object.prototype.hasOwnProperty.call(roomExhibits, state.room) ? state.room : "vestibule";
  }

  function currentState(id) {
    const state = readState();
    const value = state.exhibitStates && state.exhibitStates[id];
    return validState(value) ? value : 0;
  }

  function groupedLedger() {
    const groups = {};
    readLedger().forEach(entry => {
      groups[entry.exhibitId] ||= [];
      groups[entry.exhibitId].push(entry);
    });
    return groups;
  }

  function setText(node, value) {
    const text = String(value);
    if (node && node.textContent !== text) node.textContent = text;
  }

  function ensurePanel() {
    let section = document.getElementById("conservationPanelV07");
    if (section) return section;

    const aside = document.querySelector(".side-card");
    if (!aside) return null;

    section = document.createElement("section");
    section.id = "conservationPanelV07";
    section.className = "visit-card conservation-panel-v07";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "CONSERVATION MARKS · v0.7";

    const status = document.createElement("p");
    status.id = "conservationStatusV07";
    status.className = "control-hint";

    const button = document.createElement("button");
    button.id = "openConservationV07";
    button.className = "full-button";
    button.type = "button";
    button.textContent = "inspect curation marks";
    button.addEventListener("click", () => openOverview());

    section.append(eyebrow, status, button);

    const curator = aside.querySelector("#curatorPanelV06");
    const distant = aside.querySelector(".distant-wings");
    if (curator?.nextSibling) aside.insertBefore(section, curator.nextSibling);
    else if (distant) aside.insertBefore(section, distant);
    else aside.append(section);

    return section;
  }

  function ensureDialog() {
    let dialog = document.getElementById("conservationDialogV07");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "conservationDialogV07";
    dialog.className = "dialog conservation-dialog-v07";

    const mark = document.createElement("div");
    mark.className = "dialog-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "✣";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "CURATION PROVENANCE · v0.7";

    const title = document.createElement("h2");
    title.id = "conservationTitleV07";

    const body = document.createElement("p");
    body.id = "conservationBodyV07";

    const list = document.createElement("div");
    list.id = "conservationListV07";
    list.className = "conservation-list-v07";

    const close = document.createElement("button");
    close.className = "quiet-button";
    close.type = "button";
    close.textContent = "close label case";
    close.addEventListener("click", () => dialog.close());

    dialog.append(mark, eyebrow, title, body, list, close);
    document.body.append(dialog);
    return dialog;
  }

  function formatEntry(entry, index, total) {
    const row = document.createElement("div");
    row.className = "conservation-history-row-v07";

    const main = document.createElement("strong");
    main.textContent = "Revision " + (index + 1) + " of " + total + " · state " + (entry.from + 1) + " → " + (entry.to + 1);

    const source = document.createElement("span");
    source.textContent = sourceNames[entry.source] + " · " + entry.sourceCode;

    row.append(main, source);
    return row;
  }

  function showExhibit(id) {
    const groups = groupedLedger();
    const history = groups[id] || [];
    if (!history.length) return;

    const latest = history[history.length - 1];
    const now = currentState(id);
    const dialog = ensureDialog();
    const title = document.getElementById("conservationTitleV07");
    const body = document.getElementById("conservationBodyV07");
    const list = document.getElementById("conservationListV07");

    setText(title, exhibitNames[id]);
    setText(
      body,
      now === latest.to
        ? "This exhibit still matches its most recent deliberate curation: state " + (latest.to + 1) + "."
        : "This exhibit was deliberately curated to state " + (latest.to + 1) + ", but later changed again and is now state " + (now + 1) + ". The provenance mark remains as a conservation record."
    );

    if (list) {
      list.replaceChildren();
      history.forEach((entry, index) => list.append(formatEntry(entry, index, history.length)));
    }

    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function openOverview() {
    const groups = groupedLedger();
    const ids = Object.keys(groups);
    const dialog = ensureDialog();
    const title = document.getElementById("conservationTitleV07");
    const body = document.getElementById("conservationBodyV07");
    const list = document.getElementById("conservationListV07");

    setText(title, ids.length ? "Conservation Register" : "An Empty Conservation Register");
    setText(
      body,
      ids.length
        ? ids.length + " exhibit" + (ids.length === 1 ? " carries" : "s carry") + " visible provenance marks from deliberate Curator's Table revisions."
        : "No exhibit has been deliberately revised through the Curator's Table yet."
    );

    if (list) {
      list.replaceChildren();
      ids.forEach(id => {
        const history = groups[id];
        const latest = history[history.length - 1];
        const now = currentState(id);

        const row = document.createElement("button");
        row.type = "button";
        row.className = "conservation-overview-row-v07";
        row.addEventListener("click", () => showExhibit(id));

        const name = document.createElement("strong");
        name.textContent = exhibitNames[id];

        const meta = document.createElement("span");
        meta.textContent =
          history.length + " revision" + (history.length === 1 ? "" : "s") +
          " · latest " + sourceNames[latest.source] +
          " · " + (now === latest.to ? "still current" : "later changed");

        row.append(name, meta);
        list.append(row);
      });
    }

    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function markSymbol(source) {
    if (source === "reference") return "R";
    if (source === "afterimage") return "A";
    return "≋";
  }

  function renderMarks() {
    const layer = document.getElementById("exhibitLayer");
    if (!layer) return;

    const room = currentRoom();
    const groups = groupedLedger();
    const ids = roomExhibits[room] || [];
    const state = readState();

    const signature = room + "|" + ids.map(id => {
      const history = groups[id] || [];
      const latest = history[history.length - 1];
      const nowRaw = state.exhibitStates && state.exhibitStates[id];
      const now = validState(nowRaw) ? nowRaw : 0;
      return id + ":" + history.length + ":" + (latest ? latest.to : "-") + ":" + now;
    }).join(",");

    const baseNodes = Array.from(layer.querySelectorAll(".exhibit[data-id]"));
    const expected = ids.filter(id => groups[id]?.length && baseNodes.some(node => node.dataset.id === id)).length;
    const existing = layer.querySelectorAll(".conservation-mark-v07");

    if (signature === lastSignature && existing.length === expected) return;
    lastSignature = signature;

    existing.forEach(node => node.remove());

    ids.forEach(id => {
      const history = groups[id];
      if (!history?.length) return;

      const base = baseNodes.find(node => node.dataset.id === id);
      if (!base) return;

      const latest = history[history.length - 1];
      const now = currentState(id);
      const mark = document.createElement("button");
      mark.type = "button";
      mark.className = "conservation-mark-v07";
      mark.dataset.status = now === latest.to ? "current" : "superseded";
      mark.dataset.source = latest.source;
      mark.style.left = base.style.left;
      mark.style.top = base.style.top;
      mark.setAttribute("aria-label", "Conservation mark for " + exhibitNames[id] + ". Click to inspect curation provenance.");
      mark.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        showExhibit(id);
      });

      const symbol = document.createElement("span");
      symbol.className = "conservation-symbol-v07";
      symbol.textContent = markSymbol(latest.source);

      const count = document.createElement("span");
      count.className = "conservation-count-v07";
      count.textContent = String(history.length);

      mark.append(symbol, count);
      layer.append(mark);
    });
  }

  function refreshPanel() {
    ensurePanel();
    const groups = groupedLedger();
    const ids = Object.keys(groups);
    const revisions = ids.reduce((sum, id) => sum + groups[id].length, 0);
    const superseded = ids.filter(id => {
      const latest = groups[id][groups[id].length - 1];
      return currentState(id) !== latest.to;
    }).length;

    const status = document.getElementById("conservationStatusV07");
    const button = document.getElementById("openConservationV07");

    if (!ids.length) {
      setText(status, "No deliberate revisions yet. Conservation labels appear beside exhibits after Curator's Table adoptions.");
    } else {
      setText(
        status,
        ids.length + " marked exhibit" + (ids.length === 1 ? "" : "s") +
        " · " + revisions + " revision" + (revisions === 1 ? "" : "s") +
        (superseded ? " · " + superseded + " later changed" : "")
      );
    }
    setText(button, "inspect curation marks");
  }

  function applyArchiveNote() {
    let note = document.getElementById("conservationArchiveNoteV07");
    const groups = groupedLedger();
    const ids = Object.keys(groups);

    if (!ids.length) {
      if (note) note.remove();
      return;
    }

    if (!note) {
      note = document.createElement("p");
      note.id = "conservationArchiveNoteV07";
      note.className = "conservation-archive-note-v07";
      const curator = document.getElementById("curatorArchiveNoteV06");
      const afterimage = document.getElementById("afterimageArchiveNoteV05");
      const archiveText = document.getElementById("archiveText");
      if (curator) curator.insertAdjacentElement("afterend", note);
      else if (afterimage) afterimage.insertAdjacentElement("afterend", note);
      else if (archiveText) archiveText.insertAdjacentElement("afterend", note);
    }

    const current = ids.filter(id => {
      const history = groups[id];
      return currentState(id) === history[history.length - 1].to;
    }).length;

    setText(
      note,
      "Conservation register: " + ids.length + " exhibits carry visible curation marks; " + current +
      " still match their most recent deliberate revision."
    );
  }

  function signature() {
    const ledger = readLedger();
    const state = readState();
    return currentRoom() + "|" + ledger.map(entry =>
      entry.exhibitId + ":" + entry.from + ":" + entry.to + ":" + entry.source
    ).join(",") + "|" + JSON.stringify(state.exhibitStates || {});
  }

  let lastFullSignature = "";

  function refreshAll() {
    refreshPanel();
    renderMarks();
    applyArchiveNote();
    lastFullSignature = signature();
  }

  setInterval(() => {
    const next = signature();
    if (next !== lastFullSignature) {
      lastFullSignature = next;
      refreshPanel();
      renderMarks();
      applyArchiveNote();
    } else {
      renderMarks();
    }
  }, 280);

  ensurePanel();
  ensureDialog();
  refreshAll();
})();
