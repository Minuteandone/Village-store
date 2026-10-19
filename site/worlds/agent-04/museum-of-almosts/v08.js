(() => {
  "use strict";

  const STORAGE_KEY = "agent04-museum-of-almosts-v1";
  const REFERENCE_KEY = "agent04-museum-resonance-v04";
  const AFTERIMAGE_KEY = "agent04-museum-afterimages-v05";
  const UNBUILT_KEY = "agent04-museum-unbuilt-v08";
  const MAX_BLUEPRINTS = 5;
  const DOOR_X = 515;
  const DOOR_Y = 500;
  const DOOR_DISTANCE = 135;

  const parts = [
    { id: "threshold", label: "Threshold", exhibit: "directory" },
    { id: "climate", label: "Climate", exhibit: "weatherJar" },
    { id: "purpose", label: "Purpose", exhibit: "almostEngine" },
    { id: "pattern", label: "Pattern", exhibit: "constellationDial" }
  ];

  const descriptions = {
    threshold: [
      "The entrance behaves like an ordinary door, which is suspicious here.",
      "The entrance claims every destination is two doors away.",
      "The entrance has replaced directions with the statement: YOU ARE ALREADY SOMEWHERE."
    ],
    climate: [
      "A polite drizzle occupies the ceiling without falling.",
      "Amber afternoon light arrives despite the total lack of windows.",
      "Slow snow hangs overhead like punctuation waiting for a sentence."
    ],
    purpose: [
      "The room manufactures keys for locks nobody installed.",
      "The room manufactures locks for keys nobody kept.",
      "The room has decided its entire purpose is making one warm square of light."
    ],
    pattern: [
      "Seven ceiling lights insist they are a late bird.",
      "The same seven lights connect into a tiny impossible house.",
      "The lights refuse a constellation and remain merely seven lights."
    ]
  };

  const validState = value => Number.isInteger(value) && value >= 0 && value <= 2;
  let toastTimer = null;
  let lastDoorSignature = "";

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

  function projectedAfterimage() {
    const archive = readJson(AFTERIMAGE_KEY, null);
    if (!archive || !Array.isArray(archive.snapshots) || typeof archive.projectedId !== "string") return null;
    return archive.snapshots.find(snapshot =>
      snapshot &&
      snapshot.id === archive.projectedId &&
      snapshot.states &&
      typeof snapshot.states === "object"
    ) || null;
  }

  function defaultWing() {
    return {
      schema: 1,
      selection: {
        threshold: "present",
        climate: "present",
        purpose: "present",
        pattern: "present"
      },
      blueprints: []
    };
  }

  function validSourceName(name) {
    return ["present", "afterimage", "reference"].includes(name);
  }

  function validBlueprint(item) {
    return Boolean(
      item &&
      typeof item === "object" &&
      typeof item.code === "string" &&
      item.selection &&
      typeof item.selection === "object" &&
      parts.every(part => validSourceName(item.selection[part.id])) &&
      typeof item.sealedAt === "string"
    );
  }

  function readWing() {
    const raw = readJson(UNBUILT_KEY, null);
    const base = defaultWing();
    if (!raw) return base;

    const selection = {};
    parts.forEach(part => {
      const source = raw.selection && raw.selection[part.id];
      selection[part.id] = validSourceName(source) ? source : "present";
    });

    return {
      schema: 1,
      selection,
      blueprints: Array.isArray(raw.blueprints) ? raw.blueprints.filter(validBlueprint).slice(-MAX_BLUEPRINTS) : []
    };
  }

  function writeWing(wing) {
    const safe = defaultWing();
    parts.forEach(part => {
      const source = wing.selection && wing.selection[part.id];
      safe.selection[part.id] = validSourceName(source) ? source : "present";
    });
    safe.blueprints = Array.isArray(wing.blueprints)
      ? wing.blueprints.filter(validBlueprint).slice(-MAX_BLUEPRINTS)
      : [];
    localStorage.setItem(UNBUILT_KEY, JSON.stringify(safe));
  }

  function availableSources() {
    const sources = ["present"];
    if (projectedAfterimage()) sources.push("afterimage");
    if (readReference()) sources.push("reference");
    return sources;
  }

  function normalizeSelection(wing) {
    const available = availableSources();
    let changed = false;
    parts.forEach(part => {
      if (!available.includes(wing.selection[part.id])) {
        wing.selection[part.id] = "present";
        changed = true;
      }
    });
    if (changed) writeWing(wing);
    return wing;
  }

  function stateFrom(sourceName, exhibitId) {
    let source = null;
    if (sourceName === "present") {
      const state = readMain();
      source = state.exhibitStates && typeof state.exhibitStates === "object" ? state.exhibitStates : {};
    } else if (sourceName === "afterimage") {
      source = projectedAfterimage()?.states || {};
    } else if (sourceName === "reference") {
      source = readReference()?.states || {};
    }

    const value = source && source[exhibitId];
    return validState(value) ? value : 0;
  }

  function sourceLabel(name) {
    if (name === "afterimage") {
      const snapshot = projectedAfterimage();
      return snapshot && typeof snapshot.code === "string" ? "past · " + snapshot.code : "past";
    }
    if (name === "reference") {
      const ref = readReference();
      return ref && typeof ref.sourceCode === "string" ? "other · " + ref.sourceCode : "other";
    }
    return "present museum";
  }

  function hashString(value) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < value.length; i++) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function blueprintCode(wing) {
    const recipe = parts.map(part => {
      const source = wing.selection[part.id];
      return part.id + ":" + source + ":" + stateFrom(source, part.exhibit);
    }).join("|");
    const a = hashString(recipe).toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
    const b = hashString(recipe.split("").reverse().join("")).toString(36).toUpperCase().padStart(5, "0").slice(0, 5);
    return "W08-" + a + "-" + b;
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

  function unlocked() {
    const state = readMain();
    return Boolean(state.archiveSeen) && availableSources().length >= 2;
  }

  function playerNearDoor() {
    if (currentRoom() !== "archive") return false;
    const state = readMain();
    const player = state.player || { x: 500, y: 300 };
    return Math.hypot(Number(player.x || 0) - DOOR_X, Number(player.y || 0) - DOOR_Y) <= DOOR_DISTANCE;
  }

  function ensurePanel() {
    let section = document.getElementById("unbuiltPanelV08");
    if (section) return section;

    const aside = document.querySelector(".side-card");
    if (!aside) return null;

    section = document.createElement("section");
    section.id = "unbuiltPanelV08";
    section.className = "visit-card unbuilt-panel-v08";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "THE UNBUILT WING · v0.8";

    const status = document.createElement("p");
    status.id = "unbuiltStatusV08";
    status.className = "control-hint";

    const button = document.createElement("button");
    button.id = "openUnbuiltV08";
    button.className = "full-button";
    button.type = "button";
    button.addEventListener("click", () => {
      if (unlocked()) openWing();
      else showToast("The wing needs at least one alternate blueprint.");
    });

    section.append(eyebrow, status, button);

    const conservation = aside.querySelector("#conservationPanelV07");
    const distant = aside.querySelector(".distant-wings");
    if (conservation?.nextSibling) aside.insertBefore(section, conservation.nextSibling);
    else if (distant) aside.insertBefore(section, distant);
    else aside.append(section);

    return section;
  }

  function ensureDialog() {
    let dialog = document.getElementById("unbuiltDialogV08");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "unbuiltDialogV08";
    dialog.className = "unbuilt-dialog-v08";

    const shell = document.createElement("div");
    shell.className = "unbuilt-shell-v08";

    const header = document.createElement("header");
    header.className = "unbuilt-header-v08";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "ROOM 06? · ARCHITECTURE FROM NEAR MISSES";

    const title = document.createElement("h2");
    title.textContent = "The Unbuilt Wing";

    const subtitle = document.createElement("p");
    subtitle.textContent = "Choose which museum supplies each piece of the room. The source museums remain untouched.";

    header.append(eyebrow, title, subtitle);

    const chamber = document.createElement("section");
    chamber.id = "unbuiltChamberV08";
    chamber.className = "unbuilt-chamber-v08";

    const description = document.createElement("p");
    description.id = "unbuiltDescriptionV08";
    description.className = "unbuilt-description-v08";

    const code = document.createElement("div");
    code.className = "unbuilt-code-v08";
    const codeLabel = document.createElement("span");
    codeLabel.textContent = "CURRENT BLUEPRINT";
    const codeValue = document.createElement("strong");
    codeValue.id = "unbuiltCodeV08";
    code.append(codeLabel, codeValue);

    chamber.append(description, code);

    const controls = document.createElement("section");
    controls.id = "unbuiltControlsV08";
    controls.className = "unbuilt-controls-v08";

    const historyHeading = document.createElement("p");
    historyHeading.className = "eyebrow unbuilt-history-heading-v08";
    historyHeading.textContent = "SEALED BLUEPRINTS";

    const history = document.createElement("div");
    history.id = "unbuiltHistoryV08";
    history.className = "unbuilt-history-v08";

    const actions = document.createElement("div");
    actions.className = "unbuilt-actions-v08";

    const seal = document.createElement("button");
    seal.id = "sealUnbuiltV08";
    seal.className = "full-button";
    seal.type = "button";
    seal.textContent = "seal this blueprint";
    seal.addEventListener("click", sealBlueprint);

    const close = document.createElement("button");
    close.className = "quiet-button";
    close.type = "button";
    close.textContent = "return to Archive";
    close.addEventListener("click", () => dialog.close());

    actions.append(seal, close);
    shell.append(header, chamber, controls, historyHeading, history, actions);
    dialog.append(shell);
    document.body.append(dialog);
    return dialog;
  }

  function roomDescription(wing) {
    const sentences = parts.map(part => {
      const source = wing.selection[part.id];
      const state = stateFrom(source, part.exhibit);
      return descriptions[part.id][state];
    });

    const sources = new Set(parts.map(part => wing.selection[part.id]));
    const ending = sources.size === 1
      ? "One version supplied the whole room. It looks unusually certain of itself."
      : sources.size === 2
        ? "Two versions share authorship. The seams are visible if you know where to look."
        : "Present, past, and other all contributed. The room has no single original anymore.";

    return sentences.join(" ") + " " + ending;
  }

  function renderControls() {
    const controls = document.getElementById("unbuiltControlsV08");
    if (!controls) return;

    const wing = normalizeSelection(readWing());
    const available = availableSources();
    controls.replaceChildren();

    parts.forEach(part => {
      const group = document.createElement("section");
      group.className = "unbuilt-part-v08";

      const heading = document.createElement("div");
      heading.className = "unbuilt-part-heading-v08";
      const label = document.createElement("strong");
      label.textContent = part.label;
      const source = document.createElement("span");
      source.textContent = sourceLabel(wing.selection[part.id]);
      heading.append(label, source);

      const buttons = document.createElement("div");
      buttons.className = "unbuilt-source-buttons-v08";

      available.forEach(sourceName => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "quiet-button";
        button.dataset.source = sourceName;
        button.setAttribute("aria-pressed", String(wing.selection[part.id] === sourceName));
        button.textContent = sourceName === "present" ? "present" : sourceName === "afterimage" ? "past" : "other";
        button.addEventListener("click", () => {
          const next = normalizeSelection(readWing());
          next.selection[part.id] = sourceName;
          writeWing(next);
          refreshWing();
          applyArchiveNote();
        });
        buttons.append(button);
      });

      group.append(heading, buttons);
      controls.append(group);
    });
  }

  function renderHistory() {
    const node = document.getElementById("unbuiltHistoryV08");
    if (!node) return;

    const wing = readWing();
    node.replaceChildren();

    if (!wing.blueprints.length) {
      const empty = document.createElement("p");
      empty.className = "control-hint";
      empty.textContent = "No blueprints sealed yet. Up to five distinct designs are kept locally.";
      node.append(empty);
      return;
    }

    wing.blueprints.slice().reverse().forEach(blueprint => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "unbuilt-history-row-v08";
      row.addEventListener("click", () => {
        const current = readWing();
        parts.forEach(part => {
          current.selection[part.id] = blueprint.selection[part.id];
        });
        normalizeSelection(current);
        writeWing(current);
        refreshWing();
        applyArchiveNote();
        showToast("Blueprint restored: " + blueprint.code);
      });

      const name = document.createElement("strong");
      name.textContent = blueprint.code;

      const meta = document.createElement("span");
      meta.textContent = parts.map(part => part.label.slice(0, 1) + ":" + blueprint.selection[part.id].slice(0, 1).toUpperCase()).join(" · ");

      row.append(name, meta);
      node.append(row);
    });
  }

  function refreshWing() {
    ensureDialog();
    const wing = normalizeSelection(readWing());
    const chamber = document.getElementById("unbuiltChamberV08");
    const description = document.getElementById("unbuiltDescriptionV08");
    const code = document.getElementById("unbuiltCodeV08");

    parts.forEach(part => {
      const source = wing.selection[part.id];
      const state = stateFrom(source, part.exhibit);
      if (chamber) {
        chamber.dataset[part.id + "Source"] = source;
        chamber.dataset[part.id + "State"] = String(state);
      }
    });

    setText(description, roomDescription(wing));
    setText(code, blueprintCode(wing));
    renderControls();
    renderHistory();
  }

  function sealBlueprint() {
    const wing = normalizeSelection(readWing());
    const code = blueprintCode(wing);

    if (wing.blueprints.some(item => item.code === code)) {
      showToast("That blueprint is already sealed.");
      return;
    }

    wing.blueprints.push({
      code,
      selection: Object.fromEntries(parts.map(part => [part.id, wing.selection[part.id]])),
      sealedAt: new Date().toISOString()
    });
    wing.blueprints = wing.blueprints.slice(-MAX_BLUEPRINTS);
    writeWing(wing);
    refreshWing();
    applyArchiveNote();
    showToast("Blueprint sealed: " + code);
  }

  function openWing() {
    if (!unlocked()) {
      showToast("The wing needs at least one alternate blueprint.");
      return;
    }
    const dialog = ensureDialog();
    refreshWing();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function renderDoor() {
    const layer = document.getElementById("exhibitLayer");
    if (!layer) return;

    const existing = layer.querySelector(".unbuilt-door-v08");
    if (currentRoom() !== "archive") {
      if (existing) existing.remove();
      lastDoorSignature = "";
      return;
    }

    let node = existing;
    if (!node) {
      node = document.createElement("button");
      node.type = "button";
      node.className = "exhibit unbuilt-door-v08";
      node.style.left = (DOOR_X / 1000 * 100) + "%";
      node.style.top = (DOOR_Y / 600 * 100) + "%";
      node.addEventListener("click", () => unlocked() ? openWing() : showToast("The wing needs at least one alternate blueprint."));

      const shape = document.createElement("div");
      shape.className = "exhibit-shape";
      shape.textContent = "▯";

      const label = document.createElement("div");
      label.className = "exhibit-name";

      node.append(shape, label);
      layer.append(node);
    }

    const open = unlocked();
    node.dataset.locked = open ? "false" : "true";
    node.classList.toggle("near", playerNearDoor());
    node.setAttribute("aria-label", open ? "Door to the Unbuilt Wing. Click to enter." : "Locked door to the Unbuilt Wing. It needs an alternate blueprint.");
    setText(node.querySelector(".exhibit-name"), open ? "The Unbuilt Wing" : "Unbuilt Wing · needs alternate");
    lastDoorSignature = doorSignature();
  }

  function doorSignature() {
    return currentRoom() + "|" + unlocked() + "|" + availableSources().join(",");
  }

  function refreshPanel() {
    ensurePanel();
    const status = document.getElementById("unbuiltStatusV08");
    const button = document.getElementById("openUnbuiltV08");
    const wing = readWing();

    if (!unlocked()) {
      setText(status, "Locked · reach the Archive and provide at least one alternate blueprint by mounting a reference or projecting an Afterimage.");
      setText(button, "wing locked");
      if (button) button.disabled = true;
      return;
    }

    const sourceCount = availableSources().length;
    setText(status, sourceCount + " blueprint source" + (sourceCount === 1 ? "" : "s") + " available · " + wing.blueprints.length + "/" + MAX_BLUEPRINTS + " sealed designs");
    setText(button, "enter the Unbuilt Wing");
    if (button) button.disabled = false;
  }

  function applyArchiveNote() {
    let note = document.getElementById("unbuiltArchiveNoteV08");
    const wing = readWing();

    if (!wing.blueprints.length) {
      if (note) note.remove();
      return;
    }

    if (!note) {
      note = document.createElement("p");
      note.id = "unbuiltArchiveNoteV08";
      note.className = "unbuilt-archive-note-v08";
      const conservation = document.getElementById("conservationArchiveNoteV07");
      const curator = document.getElementById("curatorArchiveNoteV06");
      const archiveText = document.getElementById("archiveText");
      if (conservation) conservation.insertAdjacentElement("afterend", note);
      else if (curator) curator.insertAdjacentElement("afterend", note);
      else if (archiveText) archiveText.insertAdjacentElement("afterend", note);
    }

    setText(note, "Unbuilt Wing: " + wing.blueprints.length + " sealed local blueprint" + (wing.blueprints.length === 1 ? "" : "s") + " retained. Current design: " + blueprintCode(normalizeSelection(wing)) + ".");
  }

  function serviceProximity() {
    if (!playerNearDoor()) return;
    const prompt = document.getElementById("interactionPrompt");
    const interact = document.getElementById("interactButton");
    if (prompt) {
      const text = unlocked() ? "E · enter Unbuilt Wing" : "E · inspect locked wing";
      if (prompt.textContent !== text) prompt.textContent = text;
      prompt.classList.add("show");
    }
    if (interact) interact.disabled = false;
  }

  document.addEventListener("keydown", event => {
    if ((event.key === "e" || event.key === "E" || event.key === " ") && !event.repeat && playerNearDoor()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (unlocked()) openWing();
      else showToast("The wing needs at least one alternate blueprint.");
    }
  }, true);

  document.addEventListener("click", event => {
    if (event.target?.id === "interactButton" && playerNearDoor()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (unlocked()) openWing();
      else showToast("The wing needs at least one alternate blueprint.");
    }
  }, true);

  setInterval(() => {
    serviceProximity();
    const sig = doorSignature();
    if (sig !== lastDoorSignature) {
      renderDoor();
      refreshPanel();
      applyArchiveNote();
    } else {
      renderDoor();
    }
  }, 280);

  ensurePanel();
  ensureDialog();
  renderDoor();
  refreshPanel();
  applyArchiveNote();
})();
