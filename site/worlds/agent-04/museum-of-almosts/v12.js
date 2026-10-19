(() => {
  "use strict";

  const STORAGE_KEY = "agent04-museum-of-almosts-v1";
  const REFERENCE_KEY = "agent04-museum-resonance-v04";
  const AFTERIMAGE_KEY = "agent04-museum-afterimages-v05";
  const CURATOR_KEY = "agent04-museum-curator-v06";
  const UNBUILT_KEY = "agent04-museum-unbuilt-v08";
  const EDITION_KEY = "agent04-museum-editions-v10";

  const fieldMeta = {
    almosts: {
      label: "Almosts",
      room: "conservatory",
      reason: "The collection grew or shrank after this edition was printed."
    },
    visitedRooms: {
      label: "Visited rooms",
      room: "vestibule",
      reason: "The visit record now covers a different number of rooms."
    },
    changes: {
      label: "Exhibit changes",
      room: "workshop",
      reason: "The Museum has accumulated a different number of exhibit changes."
    },
    echoes: {
      label: "Counterfactual echoes",
      room: "observatory",
      reason: "The network of distant choices now produces a different number of echoes."
    },
    afterimages: {
      label: "Afterimages",
      room: "archive",
      reason: "The local archive now retains a different number of prior versions."
    },
    referenceMounted: {
      label: "Mounted reference",
      room: "vestibule",
      reason: "Another visitor's reference state is mounted differently than when this edition was printed."
    },
    importedLineage: {
      label: "Imported lineage",
      room: "vestibule",
      reason: "The Museum's imported-lineage status changed after publication."
    },
    curatedRevisions: {
      label: "Curated revisions",
      room: "workshop",
      reason: "The deliberate revision ledger now contains a different number of interventions."
    },
    curatedExhibits: {
      label: "Curated exhibits",
      room: "workshop",
      reason: "A different number of exhibits now carry deliberate curation provenance."
    },
    blueprints: {
      label: "Sealed blueprints",
      room: "archive",
      reason: "The Unbuilt Wing now contains a different number of sealed architectural blueprints."
    }
  };

  const roomNames = {
    vestibule: "Vestibule of Maybe",
    weather: "Weather That Nearly Happened",
    workshop: "Workshop for Spare Purposes",
    observatory: "Observatory of Other Patterns",
    conservatory: "Conservatory of Alternative Growth",
    archive: "Archive of the Version You Made"
  };

  const markerSlots = {
    vestibule: [150, 475],
    workshop: [825, 470],
    observatory: [815, 470],
    conservatory: [820, 470],
    archive: [840, 470]
  };

  let lastSignature = "";
  let selectedRoom = null;

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
    return Boolean(
      summary &&
      typeof summary === "object" &&
      Object.keys(fieldMeta).every(key => Object.prototype.hasOwnProperty.call(summary, key))
    );
  }

  function latestEdition() {
    const raw = readJson(EDITION_KEY, null);
    if (!raw || !Array.isArray(raw.editions)) return null;
    const items = raw.editions.filter(item =>
      item &&
      typeof item === "object" &&
      typeof item.code === "string" &&
      validSummary(item.summary)
    ).slice(-4);
    return items[items.length - 1] || null;
  }

  function drift() {
    const edition = latestEdition();
    if (!edition) return { edition: null, differences: [] };
    const now = currentSummary();

    const differences = Object.entries(fieldMeta).map(([key, meta], index) => {
      const before = edition.summary[key];
      const after = now[key];
      if (before === after) return null;
      return {
        number: index + 1,
        key,
        label: meta.label,
        room: meta.room,
        reason: meta.reason,
        before: typeof before === "boolean" ? (before ? "yes" : "no") : before,
        after: typeof after === "boolean" ? (after ? "yes" : "no") : after
      };
    }).filter(Boolean);

    return { edition, differences };
  }

  function groupedFootnotes() {
    const data = drift();
    const groups = {};
    data.differences.forEach(item => {
      groups[item.room] ||= [];
      groups[item.room].push(item);
    });
    return { edition: data.edition, groups, differences: data.differences };
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
    let section = document.getElementById("footnotePanelV12");
    if (section) return section;

    const aside = document.querySelector(".side-card");
    if (!aside) return null;

    section = document.createElement("section");
    section.id = "footnotePanelV12";
    section.className = "visit-card footnote-panel-v12";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "WALKING FOOTNOTES · v1.2";

    const status = document.createElement("p");
    status.id = "footnoteStatusV12";
    status.className = "control-hint";

    const button = document.createElement("button");
    button.id = "openFootnotesV12";
    button.className = "full-button";
    button.type = "button";
    button.textContent = "open footnote map";
    button.addEventListener("click", () => openDialog(null));

    section.append(eyebrow, status, button);

    const errata = aside.querySelector("#errataPanelV11");
    const distant = aside.querySelector(".distant-wings");
    if (errata?.nextSibling) aside.insertBefore(section, errata.nextSibling);
    else if (distant) aside.insertBefore(section, distant);
    else aside.append(section);

    return section;
  }

  function ensureDialog() {
    let dialog = document.getElementById("footnoteDialogV12");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "footnoteDialogV12";
    dialog.className = "dialog footnote-dialog-v12";

    const mark = document.createElement("div");
    mark.className = "dialog-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "⁂";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "ERRATA AS GEOGRAPHY · v1.2";

    const title = document.createElement("h2");
    title.id = "footnoteTitleV12";
    title.textContent = "Walking Footnotes";

    const body = document.createElement("p");
    body.id = "footnoteBodyV12";

    const rooms = document.createElement("div");
    rooms.id = "footnoteRoomsV12";
    rooms.className = "footnote-rooms-v12";

    const list = document.createElement("div");
    list.id = "footnoteListV12";
    list.className = "footnote-list-v12";

    const close = document.createElement("button");
    close.type = "button";
    close.className = "quiet-button";
    close.textContent = "close footnotes";
    close.addEventListener("click", () => dialog.close());

    dialog.append(mark, eyebrow, title, body, rooms, list, close);
    document.body.append(dialog);
    return dialog;
  }

  function renderRoomChooser(data) {
    const node = document.getElementById("footnoteRoomsV12");
    if (!node) return;
    node.replaceChildren();

    Object.entries(data.groups).forEach(([room, notes]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "footnote-room-v12";
      button.setAttribute("aria-pressed", String(room === selectedRoom));
      button.addEventListener("click", () => {
        selectedRoom = room;
        refreshDialog();
      });

      const name = document.createElement("strong");
      name.textContent = roomNames[room] || room;

      const count = document.createElement("span");
      count.textContent = notes.length + " footnote" + (notes.length === 1 ? "" : "s");

      button.append(name, count);
      node.append(button);
    });
  }

  function renderNoteList(data) {
    const node = document.getElementById("footnoteListV12");
    if (!node) return;
    node.replaceChildren();

    const notes = selectedRoom ? (data.groups[selectedRoom] || []) : data.differences;
    if (!notes.length) {
      const empty = document.createElement("div");
      empty.className = "footnote-empty-v12";
      empty.textContent = "No walking footnotes. The latest edition still agrees with the Museum.";
      node.append(empty);
      return;
    }

    notes.forEach(note => {
      const row = document.createElement("section");
      row.className = "footnote-row-v12";

      const number = document.createElement("span");
      number.className = "footnote-number-v12";
      number.textContent = String(note.number);

      const copy = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = note.label + " · " + String(note.before) + " → " + String(note.after);
      const reason = document.createElement("p");
      reason.textContent = note.reason;
      const location = document.createElement("span");
      location.className = "footnote-location-v12";
      location.textContent = "Filed in: " + (roomNames[note.room] || note.room);
      copy.append(title, reason, location);

      row.append(number, copy);
      node.append(row);
    });
  }

  function refreshDialog() {
    ensureDialog();
    const data = groupedFootnotes();
    const body = document.getElementById("footnoteBodyV12");
    const title = document.getElementById("footnoteTitleV12");

    const rooms = Object.keys(data.groups);
    if (!data.edition) {
      selectedRoom = null;
      setText(title, "No Edition to Footnote");
      setText(body, "Walking Footnotes begin only after the Living Catalog prints an edition.");
    } else if (!data.differences.length) {
      selectedRoom = null;
      setText(title, "An Edition Without Footnotes");
      setText(body, data.edition.code + " still matches the Museum's compact summary exactly.");
    } else {
      if (selectedRoom && !data.groups[selectedRoom]) selectedRoom = null;
      setText(title, selectedRoom ? "Footnotes in " + roomNames[selectedRoom] : "Walking Footnotes for " + data.edition.code);
      setText(
        body,
        data.differences.length + " errata field" + (data.differences.length === 1 ? "" : "s") +
        " have become " + rooms.length + " physical footnote stop" + (rooms.length === 1 ? "" : "s") +
        ". Placement identifies the subsystem responsible for that summary dimension, not an unprovable exact exhibit cause."
      );
    }

    renderRoomChooser(data);
    renderNoteList(data);
  }

  function openDialog(room) {
    selectedRoom = room || null;
    const dialog = ensureDialog();
    refreshDialog();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function renderMarkers() {
    const layer = document.getElementById("exhibitLayer");
    if (!layer) return;

    const room = currentRoom();
    const data = groupedFootnotes();
    const notes = data.groups[room] || [];
    const existing = layer.querySelector(".walking-footnote-v12");

    if (!notes.length || !markerSlots[room]) {
      if (existing) existing.remove();
      return;
    }

    let marker = existing;
    if (!marker) {
      marker = document.createElement("button");
      marker.type = "button";
      marker.className = "walking-footnote-v12";
      const slot = markerSlots[room];
      marker.style.left = (slot[0] / 1000 * 100) + "%";
      marker.style.top = (slot[1] / 600 * 100) + "%";
      marker.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        openDialog(currentRoom());
      });

      const numbers = document.createElement("span");
      numbers.className = "walking-footnote-numbers-v12";

      const label = document.createElement("span");
      label.className = "walking-footnote-label-v12";
      label.textContent = "FOOTNOTE";

      marker.append(numbers, label);
      layer.append(marker);
    }

    setText(marker.querySelector(".walking-footnote-numbers-v12"), notes.map(note => note.number).join("·"));
    marker.dataset.count = String(notes.length);
    marker.setAttribute(
      "aria-label",
      notes.length + " walking footnote" + (notes.length === 1 ? "" : "s") + " in " + (roomNames[room] || room) + ". Click to inspect."
    );
  }

  function refreshPanel() {
    ensurePanel();
    const data = groupedFootnotes();
    const status = document.getElementById("footnoteStatusV12");
    const button = document.getElementById("openFootnotesV12");
    const roomCount = Object.keys(data.groups).length;

    if (!data.edition) {
      setText(status, "No printed edition yet, so there is nothing to footnote.");
      if (button) button.disabled = true;
    } else if (!data.differences.length) {
      setText(status, "Latest edition is current · no walking footnotes.");
      if (button) button.disabled = false;
    } else {
      setText(
        status,
        data.differences.length + " footnote" + (data.differences.length === 1 ? "" : "s") +
        " across " + roomCount + " subsystem stop" + (roomCount === 1 ? "" : "s")
      );
      if (button) button.disabled = false;
    }
  }

  function applyArchiveNote() {
    let note = document.getElementById("footnoteArchiveNoteV12");
    const data = groupedFootnotes();

    if (!data.edition || !data.differences.length) {
      if (note) note.remove();
      return;
    }

    if (!note) {
      note = document.createElement("p");
      note.id = "footnoteArchiveNoteV12";
      note.className = "footnote-archive-note-v12";
      const errata = document.getElementById("errataArchiveNoteV11");
      const archiveText = document.getElementById("archiveText");
      if (errata) errata.insertAdjacentElement("afterend", note);
      else if (archiveText) archiveText.insertAdjacentElement("afterend", note);
    }

    const rooms = Object.keys(data.groups);
    setText(
      note,
      "Walking Footnotes: " + data.differences.length + " current errata note" + (data.differences.length === 1 ? "" : "s") +
      " are distributed across " + rooms.length + " subsystem location" + (rooms.length === 1 ? "" : "s") + "."
    );
  }

  function signature() {
    const data = groupedFootnotes();
    return currentRoom() + "|" + (data.edition?.code || "-") + "|" +
      data.differences.map(note => note.key + ":" + note.before + ">" + note.after).join(",");
  }

  function refreshAll() {
    refreshPanel();
    renderMarkers();
    applyArchiveNote();
    if (document.getElementById("footnoteDialogV12")?.open) refreshDialog();
    lastSignature = signature();
  }

  setInterval(() => {
    const next = signature();
    if (next !== lastSignature) refreshAll();
    else renderMarkers();
  }, 340);

  ensurePanel();
  ensureDialog();
  refreshAll();
})();