(() => {
  "use strict";

  const STORAGE_KEY = "agent04-museum-of-almosts-v1";
  const AFTERIMAGE_KEY = "agent04-museum-afterimages-v05";
  const MAX_SNAPSHOTS = 6;
  const PROJECTOR_X = 760;
  const PROJECTOR_Y = 395;
  const PROJECTOR_DISTANCE = 132;

  const exhibitIds = [
    "directory", "weatherJar", "forecastDesk", "almostEngine", "spareDrawer",
    "constellationDial", "maybeSeed", "rootMap", "finalIndex"
  ];
  const echoIds = ["doubleHouse", "winterSail", "lockWithoutElsewhere", "sunRoot"];
  const rooms = ["vestibule", "weather", "workshop", "observatory", "conservatory", "archive"];

  let toastTimer = null;
  let lastProjectionSignature = "";

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
    } catch {
      return {};
    }
  }

  function emptyArchive() {
    return { schema: 1, snapshots: [], projectedId: null };
  }

  function readArchive() {
    try {
      const raw = JSON.parse(localStorage.getItem(AFTERIMAGE_KEY) || "null");
      if (!raw || typeof raw !== "object") return emptyArchive();

      const snapshots = Array.isArray(raw.snapshots)
        ? raw.snapshots.filter(validSnapshot).slice(-MAX_SNAPSHOTS)
        : [];

      return {
        schema: 1,
        snapshots,
        projectedId: snapshots.some(snapshot => snapshot.id === raw.projectedId) ? raw.projectedId : null
      };
    } catch {
      return emptyArchive();
    }
  }

  function writeArchive(archive) {
    const safe = {
      schema: 1,
      snapshots: Array.isArray(archive.snapshots) ? archive.snapshots.filter(validSnapshot).slice(-MAX_SNAPSHOTS) : [],
      projectedId: typeof archive.projectedId === "string" ? archive.projectedId : null
    };
    if (!safe.snapshots.some(snapshot => snapshot.id === safe.projectedId)) safe.projectedId = null;
    localStorage.setItem(AFTERIMAGE_KEY, JSON.stringify(safe));
  }

  function validSnapshot(snapshot) {
    return Boolean(
      snapshot &&
      typeof snapshot === "object" &&
      typeof snapshot.id === "string" &&
      typeof snapshot.code === "string" &&
      snapshot.states &&
      typeof snapshot.states === "object"
    );
  }

  function safeStates(state) {
    const source = state.exhibitStates && typeof state.exhibitStates === "object" ? state.exhibitStates : {};
    const out = {};
    exhibitIds.forEach(id => {
      const value = source[id];
      out[id] = Number.isInteger(value) && value >= 0 && value <= 6 ? value : 0;
    });
    return out;
  }

  function safeEchoes(state) {
    return Array.isArray(state.echoes)
      ? state.echoes.filter(id => echoIds.includes(id)).filter((id, index, list) => list.indexOf(id) === index)
      : [];
  }

  function safeVisited(state) {
    return Array.isArray(state.visited)
      ? state.visited.filter(id => rooms.includes(id)).filter((id, index, list) => list.indexOf(id) === index).slice(0, rooms.length)
      : [];
  }

  function catalogCode() {
    const value = document.getElementById("catalogCode")?.textContent?.trim();
    return value && /^A04-[A-Z0-9-]{5,40}$/.test(value) ? value : "A04-LOCAL-ARCHIVE";
  }

  function snapshotSignature(snapshot) {
    return JSON.stringify({
      states: snapshot.states,
      echoes: snapshot.echoes,
      weather: snapshot.weather,
      visited: snapshot.visited
    });
  }

  function makeSnapshot() {
    const state = readState();
    const states = safeStates(state);
    const echoes = safeEchoes(state);
    const visited = safeVisited(state);
    const code = catalogCode();
    const signature = JSON.stringify({ states, echoes, weather: state.weather || "drizzle", visited });
    let hash = 2166136261 >>> 0;
    for (let i = 0; i < signature.length; i++) {
      hash ^= signature.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return {
      id: "AF-" + (hash >>> 0).toString(36).toUpperCase(),
      code,
      capturedAt: new Date().toISOString(),
      states,
      echoes,
      visited,
      weather: ["drizzle", "amber", "snow"].includes(state.weather) ? state.weather : "drizzle",
      changes: Math.max(0, Math.min(999999, Number(state.changes || 0)))
    };
  }

  function captureArchiveSnapshot() {
    const state = readState();
    if (!state.archiveSeen) return false;

    const archive = readArchive();
    const next = makeSnapshot();
    const nextSignature = snapshotSignature(next);
    const previous = archive.snapshots[archive.snapshots.length - 1];

    if (previous && snapshotSignature(previous) === nextSignature) return false;

    archive.snapshots.push(next);
    archive.snapshots = archive.snapshots.slice(-MAX_SNAPSHOTS);
    writeArchive(archive);
    showToast("Afterimage archived: " + next.code);
    refreshAll();
    return true;
  }

  function projectedSnapshot() {
    const archive = readArchive();
    return archive.snapshots.find(snapshot => snapshot.id === archive.projectedId) || null;
  }

  function stateDifference(snapshot) {
    const current = safeStates(readState());
    const differing = [];
    exhibitIds.forEach(id => {
      if ((snapshot.states[id] ?? 0) !== (current[id] ?? 0)) differing.push(id);
    });
    return differing;
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

  function ensurePanel() {
    let section = document.getElementById("afterimagePanelV05");
    if (section) return section;

    const aside = document.querySelector(".side-card");
    if (!aside) return null;

    section = document.createElement("section");
    section.id = "afterimagePanelV05";
    section.className = "visit-card afterimage-panel-v05";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "AFTERIMAGE ARCHIVE · v0.5";

    const status = document.createElement("p");
    status.id = "afterimageStatusV05";
    status.className = "control-hint";

    const button = document.createElement("button");
    button.id = "openAfterimagesV05";
    button.className = "full-button";
    button.type = "button";
    button.textContent = "inspect afterimages";
    button.addEventListener("click", openDialog);

    section.append(eyebrow, status, button);

    const resonance = aside.querySelector("#resonancePanelV04");
    const distant = aside.querySelector(".distant-wings");
    if (resonance?.nextSibling) aside.insertBefore(section, resonance.nextSibling);
    else if (distant) aside.insertBefore(section, distant);
    else aside.append(section);

    return section;
  }

  function ensureDialog() {
    let dialog = document.getElementById("afterimageDialogV05");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "afterimageDialogV05";
    dialog.className = "dialog afterimage-dialog-v05";

    const mark = document.createElement("div");
    mark.className = "dialog-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "◌";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "LOCAL CATALOG MEMORY · v0.5";

    const title = document.createElement("h2");
    title.id = "afterimageTitleV05";
    title.textContent = "Afterimages";

    const body = document.createElement("p");
    body.id = "afterimageBodyV05";

    const list = document.createElement("div");
    list.id = "afterimageListV05";
    list.className = "afterimage-list-v05";

    const actions = document.createElement("div");
    actions.className = "afterimage-actions-v05";

    const unproject = document.createElement("button");
    unproject.id = "unprojectAfterimageV05";
    unproject.className = "quiet-button";
    unproject.type = "button";
    unproject.textContent = "stop projection";
    unproject.addEventListener("click", () => {
      const archive = readArchive();
      archive.projectedId = null;
      writeArchive(archive);
      showToast("Afterimage projection ended.");
      refreshAll();
    });

    const clear = document.createElement("button");
    clear.id = "clearAfterimagesV05";
    clear.className = "quiet-button danger";
    clear.type = "button";
    clear.textContent = "clear local afterimages";
    clear.addEventListener("click", () => {
      localStorage.removeItem(AFTERIMAGE_KEY);
      showToast("Local afterimages cleared.");
      refreshAll();
    });

    const close = document.createElement("button");
    close.className = "quiet-button";
    close.type = "button";
    close.textContent = "close";
    close.addEventListener("click", () => dialog.close());

    actions.append(unproject, clear, close);
    dialog.append(mark, eyebrow, title, body, list, actions);
    document.body.append(dialog);
    return dialog;
  }

  function renderSnapshotList() {
    const list = document.getElementById("afterimageListV05");
    if (!list) return;
    const archive = readArchive();
    list.replaceChildren();

    archive.snapshots.slice().reverse().forEach((snapshot, reverseIndex) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "afterimage-row-v05";
      if (snapshot.id === archive.projectedId) row.classList.add("projected");
      row.dataset.afterimageId = snapshot.id;

      const number = archive.snapshots.length - reverseIndex;
      const heading = document.createElement("strong");
      heading.textContent = "Afterimage " + number + " · " + snapshot.code;

      const meta = document.createElement("span");
      const diff = stateDifference(snapshot).length;
      meta.textContent = diff + " states different now · " + snapshot.echoes.length + " echoes · " + snapshot.visited.length + " rooms";

      row.append(heading, meta);
      row.addEventListener("click", () => {
        const nextArchive = readArchive();
        nextArchive.projectedId = snapshot.id;
        writeArchive(nextArchive);
        showToast("Projecting " + snapshot.code);
        refreshAll();
      });
      list.append(row);
    });
  }

  function refreshDialog() {
    ensureDialog();
    const archive = readArchive();
    const snapshot = projectedSnapshot();
    const body = document.getElementById("afterimageBodyV05");
    const unproject = document.getElementById("unprojectAfterimageV05");
    const clear = document.getElementById("clearAfterimagesV05");

    if (!archive.snapshots.length) {
      setText(body, "No afterimages yet. Reach the Archive and catalog a changed version of the museum; up to six distinct local versions will be remembered on this device.");
    } else if (!snapshot) {
      setText(body, archive.snapshots.length + " cataloged version" + (archive.snapshots.length === 1 ? " is" : "s are") + " stored locally. Select one to project it over the current rooms.");
    } else {
      const diff = stateDifference(snapshot);
      setText(body, "Projecting " + snapshot.code + ". It currently differs from this museum in " + diff.length + " exhibit state" + (diff.length === 1 ? "" : "s") + ".");
    }

    if (unproject) unproject.hidden = !snapshot;
    if (clear) clear.hidden = !archive.snapshots.length;
    renderSnapshotList();
  }

  function openDialog() {
    const dialog = ensureDialog();
    refreshDialog();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function currentRoom() {
    const state = readState();
    return rooms.includes(state.room) ? state.room : "vestibule";
  }

  function playerNearProjector() {
    if (currentRoom() !== "archive") return false;
    const state = readState();
    const player = state.player || { x: 500, y: 300 };
    return Math.hypot(Number(player.x || 0) - PROJECTOR_X, Number(player.y || 0) - PROJECTOR_Y) <= PROJECTOR_DISTANCE;
  }

  function renderProjector() {
    const layer = document.getElementById("exhibitLayer");
    if (!layer) return;
    const archive = readArchive();
    const existing = layer.querySelector(".afterimage-projector-v05");

    if (currentRoom() !== "archive") {
      if (existing) existing.remove();
      return;
    }

    let node = existing;
    if (!node) {
      node = document.createElement("button");
      node.type = "button";
      node.className = "exhibit afterimage-projector-v05";
      node.style.left = (PROJECTOR_X / 1000 * 100) + "%";
      node.style.top = (PROJECTOR_Y / 600 * 100) + "%";
      node.setAttribute("aria-label", "Afterimage Projector. Click to inspect local catalog memories.");

      const shape = document.createElement("div");
      shape.className = "exhibit-shape";
      shape.textContent = "◌";

      const label = document.createElement("div");
      label.className = "exhibit-name";
      label.textContent = archive.snapshots.length ? "Afterimage Projector" : "Empty Afterimage Projector";

      node.append(shape, label);
      node.addEventListener("click", openDialog);
      layer.append(node);
    }

    node.dataset.count = String(archive.snapshots.length);
    node.dataset.projecting = archive.projectedId ? "true" : "false";
    node.classList.toggle("near", playerNearProjector());
    const label = node.querySelector(".exhibit-name");
    setText(label, archive.snapshots.length ? "Afterimage Projector" : "Empty Afterimage Projector");
  }

  function removeGhosts() {
    document.querySelectorAll(".afterimage-ghost-v05").forEach(node => node.remove());
  }

  function renderGhosts() {
    const layer = document.getElementById("exhibitLayer");
    if (!layer) return;
    const snapshot = projectedSnapshot();

    if (!snapshot) {
      removeGhosts();
      lastProjectionSignature = "";
      return;
    }

    const state = readState();
    const currentStates = safeStates(state);
    const baseNodes = Array.from(layer.querySelectorAll(".exhibit[data-id]"));
    const signature = currentRoom() + "|" + snapshot.id + "|" + baseNodes.map(node => {
      const id = node.dataset.id;
      return id + ":" + currentStates[id] + ":" + (snapshot.states[id] ?? 0);
    }).join(",");

    const existing = layer.querySelectorAll(".afterimage-ghost-v05");
    const expectedCount = baseNodes.filter(node => (snapshot.states[node.dataset.id] ?? 0) !== (currentStates[node.dataset.id] ?? 0)).length;
    if (signature === lastProjectionSignature && existing.length === expectedCount) return;

    lastProjectionSignature = signature;
    removeGhosts();

    baseNodes.forEach(node => {
      const id = node.dataset.id;
      const before = snapshot.states[id] ?? 0;
      const now = currentStates[id] ?? 0;
      if (before === now) return;

      const ghost = document.createElement("button");
      ghost.type = "button";
      ghost.className = "afterimage-ghost-v05";
      ghost.dataset.exhibitId = id;
      ghost.style.left = node.style.left;
      ghost.style.top = node.style.top;
      ghost.setAttribute("aria-label", "Afterimage of " + id + ": previously state " + before + ", now state " + now + ".");

      const ring = document.createElement("span");
      ring.className = "afterimage-ring-v05";
      ring.textContent = "◌";

      const label = document.createElement("span");
      label.className = "afterimage-label-v05";
      label.textContent = "was " + (before + 1);

      ghost.append(ring, label);
      ghost.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        showToast(id + " · afterimage state " + (before + 1) + " → current state " + (now + 1));
      });
      layer.append(ghost);
    });
  }

  function serviceProximity() {
    if (!playerNearProjector()) return;
    const prompt = document.getElementById("interactionPrompt");
    const interact = document.getElementById("interactButton");
    if (prompt) {
      const text = "E · inspect afterimages";
      if (prompt.textContent !== text) prompt.textContent = text;
      prompt.classList.add("show");
    }
    if (interact) interact.disabled = false;
  }

  function refreshPanel() {
    ensurePanel();
    const archive = readArchive();
    const snapshot = projectedSnapshot();
    const status = document.getElementById("afterimageStatusV05");
    const button = document.getElementById("openAfterimagesV05");

    if (!archive.snapshots.length) {
      setText(status, "No prior cataloged versions yet. The Archive creates afterimages when a changed arrangement is recorded.");
      setText(button, "inspect afterimages");
      return;
    }

    if (!snapshot) {
      setText(status, archive.snapshots.length + " local afterimage" + (archive.snapshots.length === 1 ? "" : "s") + " stored · none projected");
    } else {
      const diff = stateDifference(snapshot).length;
      setText(status, archive.snapshots.length + " stored · projecting " + snapshot.code + " · " + diff + " differences");
    }
    setText(button, "inspect afterimages");
  }

  function applyArchiveNote() {
    let note = document.getElementById("afterimageArchiveNoteV05");
    const archive = readArchive();
    const snapshot = projectedSnapshot();

    if (!archive.snapshots.length) {
      if (note) note.remove();
      return;
    }

    if (!note) {
      note = document.createElement("p");
      note.id = "afterimageArchiveNoteV05";
      note.className = "afterimage-archive-note-v05";
      const resonance = document.getElementById("resonanceArchiveNoteV04");
      const foreign = document.getElementById("foreignArchiveNoteV03");
      const archiveText = document.getElementById("archiveText");
      if (resonance) resonance.insertAdjacentElement("afterend", note);
      else if (foreign) foreign.insertAdjacentElement("afterend", note);
      else if (archiveText) archiveText.insertAdjacentElement("afterend", note);
    }

    const text = snapshot
      ? "Afterimage projection: " + snapshot.code + " differs from the current museum in " + stateDifference(snapshot).length + " exhibit states. " + archive.snapshots.length + " local catalog versions are retained."
      : "Afterimage archive: " + archive.snapshots.length + " distinct local catalog version" + (archive.snapshots.length === 1 ? " is" : "s are") + " retained; none is currently projected.";
    setText(note, text);
  }

  function maybeCaptureFromArchiveDialog() {
    const dialog = document.getElementById("archiveDialog");
    if (dialog?.open) captureArchiveSnapshot();
  }

  function refreshAll() {
    refreshPanel();
    refreshDialog();
    renderProjector();
    renderGhosts();
    applyArchiveNote();
  }

  document.addEventListener("keydown", event => {
    if ((event.key === "e" || event.key === "E" || event.key === " ") && !event.repeat && playerNearProjector()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openDialog();
    }
  }, true);

  document.addEventListener("click", event => {
    if (event.target?.id === "interactButton" && playerNearProjector()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openDialog();
    }
  }, true);

  const observer = new MutationObserver(() => {
    maybeCaptureFromArchiveDialog();
    renderProjector();
    renderGhosts();
    refreshPanel();
    applyArchiveNote();
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open", "class"] });

  setInterval(() => {
    serviceProximity();
    renderProjector();
    renderGhosts();
  }, 260);

  ensurePanel();
  ensureDialog();
  refreshAll();
})();
