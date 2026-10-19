(() => {
  "use strict";

  const STORAGE_KEY = "agent04-museum-of-almosts-v1";
  const UNBUILT_KEY = "agent04-museum-unbuilt-v08";
  const MAX_RELICS = 5;

  const partRooms = [
    ["threshold", "vestibule"],
    ["climate", "weather"],
    ["purpose", "workshop"],
    ["pattern", "observatory"]
  ];

  const roomNames = {
    vestibule: "Vestibule of Maybe",
    weather: "Weather That Nearly Happened",
    workshop: "Workshop for Spare Purposes",
    observatory: "Observatory of Other Patterns",
    conservatory: "Conservatory of Alternative Growth",
    archive: "Archive of the Version You Made"
  };

  const baseSlots = {
    vestibule: [[270, 450], [500, 455], [730, 450]],
    weather: [[255, 470], [500, 465], [790, 470]],
    workshop: [[250, 470], [515, 470], [805, 470]],
    observatory: [[285, 455], [500, 465], [745, 455]],
    conservatory: [[260, 470], [505, 470], [760, 470]]
  };

  let lastSignature = "";

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value && typeof value === "object" ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function validSource(name) {
    return ["present", "afterimage", "reference"].includes(name);
  }

  function validBlueprint(item) {
    return Boolean(
      item &&
      typeof item === "object" &&
      typeof item.code === "string" &&
      item.selection &&
      typeof item.selection === "object" &&
      ["threshold", "climate", "purpose", "pattern"].every(part => validSource(item.selection[part])) &&
      typeof item.sealedAt === "string"
    );
  }

  function blueprints() {
    const wing = readJson(UNBUILT_KEY, null);
    return wing && Array.isArray(wing.blueprints)
      ? wing.blueprints.filter(validBlueprint).slice(-MAX_RELICS)
      : [];
  }

  function currentRoom() {
    const state = readJson(STORAGE_KEY, {});
    return Object.prototype.hasOwnProperty.call(roomNames, state.room) ? state.room : "vestibule";
  }

  function destinationRoom(blueprint) {
    for (const [part, room] of partRooms) {
      if (blueprint.selection[part] !== "present") return room;
    }
    return "conservatory";
  }

  function uniqueSourceCount(blueprint) {
    return new Set(Object.values(blueprint.selection)).size;
  }

  function relicTitle(blueprint) {
    const sources = new Set(Object.values(blueprint.selection));
    if (sources.size === 1) {
      const only = Array.from(sources)[0];
      if (only === "present") return "Self-Built Maquette";
      if (only === "afterimage") return "Retrospective Maquette";
      return "Borrowed Maquette";
    }
    if (sources.size === 2) return "Seam Model";
    return "Triplicate Model";
  }

  function relicSymbol(blueprint) {
    const count = uniqueSourceCount(blueprint);
    return count === 1 ? "□" : count === 2 ? "◇" : "✣";
  }

  function sourceWord(source) {
    if (source === "afterimage") return "past";
    if (source === "reference") return "other";
    return "present";
  }

  function sourceRecipe(blueprint) {
    return [
      "T:" + sourceWord(blueprint.selection.threshold).slice(0, 1).toUpperCase(),
      "C:" + sourceWord(blueprint.selection.climate).slice(0, 1).toUpperCase(),
      "P:" + sourceWord(blueprint.selection.purpose).slice(0, 1).toUpperCase(),
      "Ptn:" + sourceWord(blueprint.selection.pattern).slice(0, 1).toUpperCase()
    ].join(" · ");
  }

  function setText(node, value) {
    const text = String(value);
    if (node && node.textContent !== text) node.textContent = text;
  }

  function groupedByRoom() {
    const groups = {};
    blueprints().forEach(blueprint => {
      const room = destinationRoom(blueprint);
      groups[room] ||= [];
      groups[room].push(blueprint);
    });
    return groups;
  }

  function ensurePanel() {
    let section = document.getElementById("relicPanelV09");
    if (section) return section;

    const aside = document.querySelector(".side-card");
    if (!aside) return null;

    section = document.createElement("section");
    section.id = "relicPanelV09";
    section.className = "visit-card relic-panel-v09";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "ARCHITECTURAL RELICS · v0.9";

    const status = document.createElement("p");
    status.id = "relicStatusV09";
    status.className = "control-hint";

    const button = document.createElement("button");
    button.id = "openRelicsV09";
    button.className = "full-button";
    button.type = "button";
    button.textContent = "inspect relic register";
    button.addEventListener("click", openOverview);

    section.append(eyebrow, status, button);

    const unbuilt = aside.querySelector("#unbuiltPanelV08");
    const distant = aside.querySelector(".distant-wings");
    if (unbuilt?.nextSibling) aside.insertBefore(section, unbuilt.nextSibling);
    else if (distant) aside.insertBefore(section, distant);
    else aside.append(section);

    return section;
  }

  function ensureDialog() {
    let dialog = document.getElementById("relicDialogV09");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "relicDialogV09";
    dialog.className = "dialog relic-dialog-v09";

    const mark = document.createElement("div");
    mark.className = "dialog-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "◇";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "SEALED ARCHITECTURE · v0.9";

    const title = document.createElement("h2");
    title.id = "relicTitleV09";

    const body = document.createElement("p");
    body.id = "relicBodyV09";

    const list = document.createElement("div");
    list.id = "relicListV09";
    list.className = "relic-list-v09";

    const close = document.createElement("button");
    close.className = "quiet-button";
    close.type = "button";
    close.textContent = "close register";
    close.addEventListener("click", () => dialog.close());

    dialog.append(mark, eyebrow, title, body, list, close);
    document.body.append(dialog);
    return dialog;
  }

  function showBlueprint(blueprint) {
    const dialog = ensureDialog();
    const title = document.getElementById("relicTitleV09");
    const body = document.getElementById("relicBodyV09");
    const list = document.getElementById("relicListV09");

    setText(title, relicTitle(blueprint) + " · " + blueprint.code);
    setText(
      body,
      "This miniature is a physical consequence of a sealed Unbuilt Wing blueprint. It appears in " +
      roomNames[destinationRoom(blueprint)] +
      " because that is where the blueprint first borrowed from an alternate source."
    );

    if (list) {
      list.replaceChildren();
      const rows = [
        ["Threshold", blueprint.selection.threshold],
        ["Climate", blueprint.selection.climate],
        ["Purpose", blueprint.selection.purpose],
        ["Pattern", blueprint.selection.pattern]
      ];
      rows.forEach(([label, source]) => {
        const row = document.createElement("div");
        row.className = "relic-detail-row-v09";
        const name = document.createElement("strong");
        name.textContent = label;
        const value = document.createElement("span");
        value.textContent = sourceWord(source);
        row.append(name, value);
        list.append(row);
      });
    }

    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function openOverview() {
    const items = blueprints();
    const dialog = ensureDialog();
    const title = document.getElementById("relicTitleV09");
    const body = document.getElementById("relicBodyV09");
    const list = document.getElementById("relicListV09");

    setText(title, items.length ? "Architectural Relic Register" : "An Empty Relic Register");
    setText(
      body,
      items.length
        ? items.length + " sealed blueprint" + (items.length === 1 ? " has" : "s have") + " materialized as read-only miniatures in the main museum."
        : "Seal a blueprint in The Unbuilt Wing and a miniature of that architecture will appear somewhere in the main museum."
    );

    if (list) {
      list.replaceChildren();
      items.forEach(blueprint => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "relic-overview-row-v09";
        row.addEventListener("click", () => showBlueprint(blueprint));

        const main = document.createElement("strong");
        main.textContent = relicTitle(blueprint) + " · " + blueprint.code;

        const meta = document.createElement("span");
        meta.textContent = roomNames[destinationRoom(blueprint)] + " · " + sourceRecipe(blueprint);

        row.append(main, meta);
        list.append(row);
      });
    }

    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function renderRelics() {
    const layer = document.getElementById("exhibitLayer");
    if (!layer) return;

    const room = currentRoom();
    const groups = groupedByRoom();
    const items = groups[room] || [];
    const signature = room + "|" + items.map(item => item.code).join(",");
    const existing = layer.querySelectorAll(".architectural-relic-v09");

    if (signature === lastSignature && existing.length === items.length) return;
    lastSignature = signature;
    existing.forEach(node => node.remove());

    if (!baseSlots[room]) return;

    items.forEach((blueprint, index) => {
      const slots = baseSlots[room];
      const slot = slots[index % slots.length];

      const node = document.createElement("button");
      node.type = "button";
      node.className = "architectural-relic-v09";
      node.style.left = (slot[0] / 1000 * 100) + "%";
      node.style.top = (slot[1] / 600 * 100) + "%";
      node.dataset.sources = String(uniqueSourceCount(blueprint));
      node.setAttribute("aria-label", relicTitle(blueprint) + " " + blueprint.code + ". Click to inspect sealed blueprint provenance.");
      node.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        showBlueprint(blueprint);
      });

      const symbol = document.createElement("span");
      symbol.className = "relic-symbol-v09";
      symbol.textContent = relicSymbol(blueprint);

      const label = document.createElement("span");
      label.className = "relic-label-v09";
      label.textContent = blueprint.code;

      node.append(symbol, label);
      layer.append(node);
    });
  }

  function refreshPanel() {
    ensurePanel();
    const items = blueprints();
    const groups = groupedByRoom();
    const rooms = Object.keys(groups);
    const status = document.getElementById("relicStatusV09");
    const button = document.getElementById("openRelicsV09");

    if (!items.length) {
      setText(status, "No architectural relics yet. Seal an Unbuilt Wing blueprint to materialize one.");
    } else {
      setText(
        status,
        items.length + " relic" + (items.length === 1 ? "" : "s") +
        " across " + rooms.length + " room" + (rooms.length === 1 ? "" : "s")
      );
    }
    setText(button, "inspect relic register");
  }

  function applyArchiveNote() {
    let note = document.getElementById("relicArchiveNoteV09");
    const items = blueprints();

    if (!items.length) {
      if (note) note.remove();
      return;
    }

    if (!note) {
      note = document.createElement("p");
      note.id = "relicArchiveNoteV09";
      note.className = "relic-archive-note-v09";
      const unbuilt = document.getElementById("unbuiltArchiveNoteV08");
      const archiveText = document.getElementById("archiveText");
      if (unbuilt) unbuilt.insertAdjacentElement("afterend", note);
      else if (archiveText) archiveText.insertAdjacentElement("afterend", note);
    }

    setText(
      note,
      "Architectural relics: " + items.length + " sealed blueprint miniature" + (items.length === 1 ? " is" : "s are") +
      " distributed through the museum. These relics are read-only."
    );
  }

  function fullSignature() {
    return currentRoom() + "|" + blueprints().map(item => item.code + ":" + destinationRoom(item)).join(",");
  }

  let lastFullSignature = "";

  setInterval(() => {
    const next = fullSignature();
    if (next !== lastFullSignature) {
      lastFullSignature = next;
      refreshPanel();
      renderRelics();
      applyArchiveNote();
    } else {
      renderRelics();
    }
  }, 300);

  ensurePanel();
  ensureDialog();
  refreshPanel();
  renderRelics();
  applyArchiveNote();
  lastFullSignature = fullSignature();
})();
