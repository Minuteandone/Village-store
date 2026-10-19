(() => {
  "use strict";

  const STORAGE_KEY = "agent04-museum-of-almosts-v1";
  const REFERENCE_KEY = "agent04-museum-resonance-v04";
  const LOGICAL_W = 1000;
  const LOGICAL_H = 600;
  const CABINET_X = 770;
  const CABINET_Y = 420;
  const CABINET_DISTANCE = 132;

  const allowedExhibitIds = [
    "directory", "weatherJar", "forecastDesk", "almostEngine", "spareDrawer",
    "constellationDial", "maybeSeed", "rootMap", "finalIndex"
  ];
  const allowedEchoIds = ["doubleHouse", "winterSail", "lockWithoutElsewhere", "sunRoot"];
  const allowedRooms = ["vestibule", "weather", "workshop", "observatory", "conservatory", "archive"];
  const codePattern = /^A04-[A-Z0-9-]{5,32}$/;

  let toastTimer = null;
  let lastSignature = "";

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
    } catch {
      return {};
    }
  }

  function readReference() {
    try {
      const value = JSON.parse(localStorage.getItem(REFERENCE_KEY) || "null");
      return value && typeof value === "object" ? value : null;
    } catch {
      return null;
    }
  }

  function writeReference(value) {
    if (!value) localStorage.removeItem(REFERENCE_KEY);
    else localStorage.setItem(REFERENCE_KEY, JSON.stringify(value));
  }

  function unique(list) {
    return list.filter((value, index, array) => array.indexOf(value) === index);
  }

  function setNodeText(node, value) {
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

  function extractTicketToken(input) {
    const raw = String(input || "").trim();
    if (!raw) throw new Error("empty ticket");

    if (/^[A-Za-z0-9_-]{8,4096}$/.test(raw)) return raw;

    let url;
    try {
      url = new URL(raw);
    } catch {
      throw new Error("not a ticket URL or token");
    }
    const token = url.searchParams.get("ticket");
    if (!token || !/^[A-Za-z0-9_-]{8,4096}$/.test(token)) throw new Error("ticket parameter missing");
    return token;
  }

  function decodeReference(input) {
    const token = extractTicketToken(input);
    const padded = token.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((token.length + 3) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));

    if (!payload || payload.v !== 1) throw new Error("unsupported ticket version");
    if (typeof payload.sourceCode !== "string" || !codePattern.test(payload.sourceCode)) {
      throw new Error("ticket source code missing");
    }

    const states = {};
    if (payload.exhibitStates && typeof payload.exhibitStates === "object") {
      Object.entries(payload.exhibitStates).slice(0, 40).forEach(([key, value]) => {
        if (allowedExhibitIds.includes(key) && Number.isInteger(value) && value >= 0 && value <= 6) {
          states[key] = value;
        }
      });
    }

    const lineage = Array.isArray(payload.lineage)
      ? unique(payload.lineage.filter(value => typeof value === "string" && codePattern.test(value))).slice(-5)
      : [];

    const echoes = Array.isArray(payload.echoes)
      ? unique(payload.echoes.filter(value => allowedEchoIds.includes(value))).slice(0, allowedEchoIds.length)
      : [];

    const visited = Array.isArray(payload.visited)
      ? unique(payload.visited.filter(value => allowedRooms.includes(value))).slice(0, 12)
      : [];

    return {
      schema: 1,
      sourceCode: payload.sourceCode,
      lineage,
      states,
      echoes,
      visited,
      mountedAt: new Date().toISOString(),
      cataloged: []
    };
  }

  function comparison() {
    const reference = readReference();
    const state = readState();
    if (!reference) return null;

    const currentStates = state.exhibitStates && typeof state.exhibitStates === "object"
      ? state.exhibitStates
      : {};

    const aligned = [];
    const divergent = [];
    allowedExhibitIds.forEach(id => {
      const current = Number.isInteger(currentStates[id]) ? currentStates[id] : 0;
      const other = Number.isInteger(reference.states[id]) ? reference.states[id] : 0;
      if (current === other) aligned.push(id);
      else divergent.push(id);
    });

    const currentEchoes = Array.isArray(state.echoes) ? state.echoes.filter(id => allowedEchoIds.includes(id)) : [];
    const sharedEchoes = reference.echoes.filter(id => currentEchoes.includes(id));
    const onlyCurrentEchoes = currentEchoes.filter(id => !reference.echoes.includes(id));
    const onlyReferenceEchoes = reference.echoes.filter(id => !currentEchoes.includes(id));

    const signature = aligned.map(id => id + "=S").concat(divergent.map(id => id + "=D")).join("|")
      + "::" + sharedEchoes.sort().join(",")
      + "::" + reference.sourceCode;

    let mood = "mixed";
    if (aligned.length >= 7) mood = "convergent";
    else if (divergent.length >= 7) mood = "divergent";

    return {
      reference,
      aligned,
      divergent,
      sharedEchoes,
      onlyCurrentEchoes,
      onlyReferenceEchoes,
      signature,
      mood
    };
  }

  function resonanceLines(cmp) {
    if (!cmp) return [];
    const lines = [];

    if (cmp.aligned.length >= 7) {
      lines.push("Convergent Museum — two visits independently settled on nearly the same arrangement.");
    } else if (cmp.divergent.length >= 7) {
      lines.push("Fork Storm — the two catalogs disagree so thoroughly that agreement itself has become the rare exhibit.");
    } else {
      lines.push("Mixed Resonance — agreement and disagreement are sharing the same cabinet without filing a complaint.");
    }

    if (cmp.sharedEchoes.length) {
      lines.push("Shared Echo — both catalogs discovered " + cmp.sharedEchoes.length + " of the same counterfactual echo" + (cmp.sharedEchoes.length === 1 ? "" : "es") + ".");
    }

    const patternMatches = ["constellationDial", "rootMap"].every(id => cmp.aligned.includes(id));
    if (patternMatches) {
      lines.push("Parallel Cartography — both visits made matching choices about patterns and routes.");
    }

    const weatherMismatch = cmp.divergent.includes("weatherJar") && cmp.divergent.includes("forecastDesk");
    if (weatherMismatch) {
      lines.push("Contradictory Forecast — the catalogs cannot agree on either weather or what counts as predicting it.");
    }

    const reuseMatches = ["almostEngine", "spareDrawer"].every(id => cmp.aligned.includes(id));
    if (reuseMatches) {
      lines.push("Same Wrong Job — both workshops independently reassigned their mistakes in the same way.");
    }

    return lines.slice(0, 5);
  }

  function currentRoom() {
    const state = readState();
    return allowedRooms.includes(state.room) ? state.room : "vestibule";
  }

  function playerNearCabinet() {
    if (currentRoom() !== "observatory" || !readReference()) return false;
    const state = readState();
    const player = state.player || { x: 500, y: 300 };
    return Math.hypot(Number(player.x || 0) - CABINET_X, Number(player.y || 0) - CABINET_Y) <= CABINET_DISTANCE;
  }

  function ensureSidePanel() {
    let section = document.getElementById("resonancePanelV04");
    if (section) return section;

    const aside = document.querySelector(".side-card");
    if (!aside) return null;

    section = document.createElement("section");
    section.id = "resonancePanelV04";
    section.className = "visit-card resonance-panel-v04";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "RESONANCE CABINET · v0.4";

    const status = document.createElement("p");
    status.id = "resonanceStatusV04";
    status.className = "control-hint";

    const button = document.createElement("button");
    button.id = "openResonanceV04";
    button.className = "full-button";
    button.type = "button";
    button.addEventListener("click", openDialog);

    section.append(eyebrow, status, button);

    const distant = aside.querySelector(".distant-wings");
    if (distant) aside.insertBefore(section, distant);
    else aside.append(section);

    return section;
  }

  function ensureDialog() {
    let dialog = document.getElementById("resonanceDialogV04");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "resonanceDialogV04";
    dialog.className = "dialog resonance-dialog-v04";

    const mark = document.createElement("div");
    mark.className = "dialog-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "≋";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "REFERENCE SPECIMEN · v0.4";

    const title = document.createElement("h2");
    title.id = "resonanceTitleV04";

    const body = document.createElement("p");
    body.id = "resonanceBodyV04";

    const inputLabel = document.createElement("label");
    inputLabel.className = "resonance-label-v04";
    inputLabel.setAttribute("for", "resonanceTicketV04");
    inputLabel.textContent = "Paste another Museum admission ticket URL or ticket token";

    const input = document.createElement("textarea");
    input.id = "resonanceTicketV04";
    input.className = "resonance-input-v04";
    input.rows = 3;
    input.autocomplete = "off";
    input.spellcheck = false;
    input.placeholder = "https://.../?ticket=...";

    const metrics = document.createElement("div");
    metrics.id = "resonanceMetricsV04";
    metrics.className = "resonance-metrics-v04";

    const specimens = document.createElement("ul");
    specimens.id = "resonanceSpecimensV04";
    specimens.className = "resonance-specimens-v04";

    const actions = document.createElement("div");
    actions.className = "resonance-actions-v04";

    const mount = document.createElement("button");
    mount.id = "mountResonanceV04";
    mount.className = "full-button";
    mount.type = "button";
    mount.textContent = "mount reference ticket";

    const catalog = document.createElement("button");
    catalog.id = "catalogResonanceV04";
    catalog.className = "quiet-button";
    catalog.type = "button";
    catalog.textContent = "catalog this comparison";

    const clear = document.createElement("button");
    clear.id = "clearResonanceV04";
    clear.className = "quiet-button danger";
    clear.type = "button";
    clear.textContent = "remove reference";

    const close = document.createElement("button");
    close.className = "quiet-button";
    close.type = "button";
    close.textContent = "close";

    mount.addEventListener("click", () => {
      try {
        const decoded = decodeReference(input.value);
        writeReference(decoded);
        input.value = "";
        showToast("Reference catalog mounted: " + decoded.sourceCode);
        refreshAll();
      } catch (error) {
        showToast("That reference ticket was not recognized.");
      }
    });

    catalog.addEventListener("click", () => {
      const cmp = comparison();
      if (!cmp) return;
      const reference = readReference();
      if (!reference) return;
      reference.cataloged = Array.isArray(reference.cataloged) ? reference.cataloged : [];
      if (!reference.cataloged.includes(cmp.signature)) reference.cataloged.push(cmp.signature);
      reference.cataloged = reference.cataloged.slice(-12);
      writeReference(reference);
      showToast("Resonance comparison cataloged.");
      refreshAll();
    });

    clear.addEventListener("click", () => {
      writeReference(null);
      showToast("Reference catalog removed.");
      refreshAll();
    });

    close.addEventListener("click", () => dialog.close());

    actions.append(mount, catalog, clear, close);
    dialog.append(mark, eyebrow, title, body, inputLabel, input, metrics, specimens, actions);
    document.body.append(dialog);
    return dialog;
  }

  function openDialog() {
    const dialog = ensureDialog();
    refreshDialog();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function refreshDialog() {
    const dialog = ensureDialog();
    const cmp = comparison();
    const title = document.getElementById("resonanceTitleV04");
    const body = document.getElementById("resonanceBodyV04");
    const metrics = document.getElementById("resonanceMetricsV04");
    const list = document.getElementById("resonanceSpecimensV04");
    const catalog = document.getElementById("catalogResonanceV04");
    const clear = document.getElementById("clearResonanceV04");

    if (!cmp) {
      if (title) title.textContent = "An Empty Resonance Cabinet";
      if (body) body.textContent = "Mount a second visitor's explicit share ticket as a reference. It will be compared locally with your museum without replacing your current visit.";
      if (metrics) metrics.textContent = "No reference specimen mounted.";
      if (list) list.replaceChildren();
      if (catalog) catalog.hidden = true;
      if (clear) clear.hidden = true;
      return dialog;
    }

    const reference = cmp.reference;
    const cataloged = Array.isArray(reference.cataloged) && reference.cataloged.includes(cmp.signature);
    if (title) title.textContent = cataloged ? "Cataloged Resonance" : "An Uncataloged Resonance";
    if (body) body.textContent = "Reference " + reference.sourceCode + " is mounted beside your current museum. The reference stays local to this browser and is not included when you export your own admission ticket.";
    if (metrics) {
      metrics.textContent = cmp.aligned.length + " aligned · " + cmp.divergent.length + " divergent · "
        + cmp.sharedEchoes.length + " shared echoes · "
        + (reference.cataloged?.length || 0) + " comparisons cataloged";
    }
    if (list) {
      list.replaceChildren();
      resonanceLines(cmp).forEach(line => {
        const item = document.createElement("li");
        item.textContent = line;
        list.append(item);
      });
    }
    if (catalog) {
      catalog.hidden = cataloged;
      catalog.textContent = cataloged ? "comparison cataloged" : "catalog this comparison";
    }
    if (clear) clear.hidden = false;
    return dialog;
  }

  function renderCabinet() {
    const layer = document.getElementById("exhibitLayer");
    if (!layer) return;
    const existing = layer.querySelector(".resonance-cabinet-v04");
    const cmp = comparison();

    if (!cmp || currentRoom() !== "observatory") {
      if (existing) existing.remove();
      return;
    }

    let node = existing;
    if (!node) {
      node = document.createElement("button");
      node.type = "button";
      node.className = "exhibit resonance-cabinet-v04";
      node.style.left = (CABINET_X / LOGICAL_W * 100) + "%";
      node.style.top = (CABINET_Y / LOGICAL_H * 100) + "%";
      node.setAttribute("aria-label", "Resonance Cabinet. Click to compare a mounted reference catalog.");

      const shape = document.createElement("div");
      shape.className = "exhibit-shape";
      shape.textContent = "≋";

      const label = document.createElement("div");
      label.className = "exhibit-name";
      label.textContent = "Resonance Cabinet";

      node.append(shape, label);
      node.addEventListener("click", openDialog);
      layer.append(node);
    }

    node.dataset.resonance = cmp.mood;
    node.classList.toggle("near", playerNearCabinet());

    const cataloged = Array.isArray(cmp.reference.cataloged) && cmp.reference.cataloged.includes(cmp.signature);
    node.dataset.cataloged = cataloged ? "true" : "false";
  }

  function serviceProximity() {
    if (!playerNearCabinet()) return;
    const prompt = document.getElementById("interactionPrompt");
    const interact = document.getElementById("interactButton");
    if (prompt) {
      const text = "E · compare mounted reference";
      if (prompt.textContent !== text) prompt.textContent = text;
      prompt.classList.add("show");
    }
    if (interact) interact.disabled = false;
  }

  function refreshPanel() {
    const section = ensureSidePanel();
    if (!section) return;
    const status = document.getElementById("resonanceStatusV04");
    const button = document.getElementById("openResonanceV04");
    const cmp = comparison();

    if (!cmp) {
      setNodeText(status, "Mount someone else's explicit share ticket without replacing your museum.");
      setNodeText(button, "mount reference ticket");
      return;
    }

    const cataloged = Array.isArray(cmp.reference.cataloged) && cmp.reference.cataloged.includes(cmp.signature);
    setNodeText(
      status,
      cmp.reference.sourceCode + " · " + cmp.aligned.length + " aligned / "
        + cmp.divergent.length + " divergent" + (cataloged ? " · cataloged" : " · uncataloged")
    );
    setNodeText(button, "inspect resonance");
  }

  function applyArchiveNote() {
    let note = document.getElementById("resonanceArchiveNoteV04");
    const cmp = comparison();
    if (!cmp) {
      if (note) note.remove();
      return;
    }

    if (!note) {
      note = document.createElement("p");
      note.id = "resonanceArchiveNoteV04";
      note.className = "resonance-archive-note-v04";
      const foreign = document.getElementById("foreignArchiveNoteV03");
      const archiveText = document.getElementById("archiveText");
      if (foreign) foreign.insertAdjacentElement("afterend", note);
      else if (archiveText) archiveText.insertAdjacentElement("afterend", note);
    }

    const count = Array.isArray(cmp.reference.cataloged) ? cmp.reference.cataloged.length : 0;
    const message = "Reference resonance: " + cmp.reference.sourceCode + " currently aligns on "
      + cmp.aligned.length + " of " + allowedExhibitIds.length + " exhibit states and diverges on "
      + cmp.divergent.length + ". " + count + " comparison snapshot" + (count === 1 ? " is" : "s are")
      + " cataloged locally.";
    if (note.textContent !== message) note.textContent = message;
  }

  function refreshAll() {
    refreshPanel();
    refreshDialog();
    renderCabinet();
    applyArchiveNote();
    lastSignature = comparison()?.signature || "";
  }

  document.addEventListener("keydown", event => {
    if ((event.key === "e" || event.key === "E" || event.key === " ") && !event.repeat && playerNearCabinet()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openDialog();
    }
  }, true);

  document.addEventListener("click", event => {
    if (event.target?.id === "interactButton" && playerNearCabinet()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openDialog();
    }
  }, true);

  const observer = new MutationObserver(() => {
    renderCabinet();
    refreshPanel();
    applyArchiveNote();
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open", "class"] });

  setInterval(() => {
    const signature = comparison()?.signature || "";
    if (signature !== lastSignature) {
      lastSignature = signature;
      refreshDialog();
      refreshPanel();
      renderCabinet();
      applyArchiveNote();
    }
    serviceProximity();
  }, 240);

  ensureSidePanel();
  ensureDialog();
  refreshAll();
})();