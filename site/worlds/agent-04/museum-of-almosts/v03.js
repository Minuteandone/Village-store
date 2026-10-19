(() => {
  "use strict";

  const STORAGE_KEY = "agent04-museum-of-almosts-v1";
  const COATCHECK_KEY = "agent04-museum-of-almosts-coatcheck-v1";
  const FORK_X = 500;
  const FORK_Y = 180;
  const FORK_DISTANCE = 125;
  let toastTimer = null;
  let latestForeignCatalogV03 = null;

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
    } catch {
      return {};
    }
  }

  function cloneForeignCatalogV03(value) {
    if (!value || typeof value !== "object") return null;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return null;
    }
  }

  function writeState(state) {
    latestForeignCatalogV03 = cloneForeignCatalogV03(state.foreignCatalog);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  const inheritedSetItemV03 = Storage.prototype.setItem;
  const inheritedRemoveItemV03 = Storage.prototype.removeItem;
  latestForeignCatalogV03 = cloneForeignCatalogV03(readState().foreignCatalog);

  Storage.prototype.setItem = function(key, value) {
    if (this === localStorage && key === STORAGE_KEY && latestForeignCatalogV03) {
      try {
        const incoming = JSON.parse(value);
        incoming.foreignCatalog = cloneForeignCatalogV03(latestForeignCatalogV03);
        value = JSON.stringify(incoming);
      } catch { }
    }
    return inheritedSetItemV03.call(this, key, value);
  };

  Storage.prototype.removeItem = function(key) {
    if (this === localStorage && key === STORAGE_KEY) {
      latestForeignCatalogV03 = null;
      inheritedRemoveItemV03.call(this, COATCHECK_KEY);
    }
    return inheritedRemoveItemV03.call(this, key);
  };

  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function foreignCatalog() {
    const state = readState();
    return state.foreignCatalog && typeof state.foreignCatalog === "object" ? state.foreignCatalog : null;
  }

  function stateDifferenceCount(state) {
    const foreign = state.foreignCatalog;
    if (!foreign || !foreign.states || typeof foreign.states !== "object") return 0;
    const now = state.exhibitStates || {};
    const keys = new Set([...Object.keys(foreign.states), ...Object.keys(now)]);
    let count = 0;
    keys.forEach(key => {
      if ((foreign.states[key] ?? 0) !== (now[key] ?? 0)) count += 1;
    });
    return count;
  }

  function roomId() {
    const state = readState();
    return typeof state.room === "string" ? state.room : "vestibule";
  }

  function playerNearFork() {
    if (roomId() !== "vestibule" || !foreignCatalog()) return false;
    const state = readState();
    const player = state.player || { x: 500, y: 445 };
    return Math.hypot(Number(player.x || 0) - FORK_X, Number(player.y || 0) - FORK_Y) <= FORK_DISTANCE;
  }

  function ensureDialog() {
    let dialog = document.getElementById("foreignCatalogDialogV03");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "foreignCatalogDialogV03";
    dialog.className = "dialog foreign-dialog-v03";

    const mark = document.createElement("div");
    mark.className = "dialog-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "⧉";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "FOREIGN CATALOG · v0.3";

    const title = document.createElement("h2");
    title.id = "foreignCatalogTitleV03";

    const body = document.createElement("p");
    body.id = "foreignCatalogBodyV03";

    const lineage = document.createElement("div");
    lineage.id = "foreignCatalogLineageV03";
    lineage.className = "foreign-lineage-v03";

    const actions = document.createElement("div");
    actions.className = "foreign-actions-v03";

    const catalog = document.createElement("button");
    catalog.id = "catalogForkV03";
    catalog.className = "full-button";
    catalog.type = "button";
    catalog.textContent = "catalog this fork";

    const restore = document.createElement("button");
    restore.id = "restoreMuseumV03";
    restore.className = "quiet-button";
    restore.type = "button";
    restore.textContent = "return to my prior museum";

    const close = document.createElement("button");
    close.className = "quiet-button";
    close.type = "button";
    close.textContent = "leave it undecided";

    actions.append(catalog, restore, close);
    dialog.append(mark, eyebrow, title, body, lineage, actions);
    document.body.append(dialog);

    catalog.addEventListener("click", () => {
      const state = readState();
      if (!state.foreignCatalog) return;
      const differences = stateDifferenceCount(state);
      if (!differences) {
        showToast("Nothing has diverged yet.");
        return;
      }
      state.foreignCatalog.forkCataloged = true;
      state.foreignCatalog.catalogedDifferences = differences;
      writeState(state);
      showToast("Fork cataloged · this museum is now a descendant.");
      refreshDialog();
      renderArtifact();
      applyArchiveNote();
    });

    restore.addEventListener("click", () => {
      const raw = localStorage.getItem(COATCHECK_KEY);
      if (!raw) {
        showToast("The coat check is empty.");
        return;
      }
      try {
        const previous = JSON.parse(raw);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(previous));
        localStorage.removeItem(COATCHECK_KEY);
        location.reload();
      } catch {
        localStorage.removeItem(COATCHECK_KEY);
        showToast("The stored prior museum could not be restored.");
      }
    });

    close.addEventListener("click", () => dialog.close());
    return dialog;
  }

  function refreshDialog() {
    const dialog = ensureDialog();
    const state = readState();
    const foreign = state.foreignCatalog;
    if (!foreign) return;
    const differences = stateDifferenceCount(state);
    const title = document.getElementById("foreignCatalogTitleV03");
    const body = document.getElementById("foreignCatalogBodyV03");
    const lineage = document.getElementById("foreignCatalogLineageV03");
    const button = document.getElementById("catalogForkV03");
    const restore = document.getElementById("restoreMuseumV03");

    if (title) {
      title.textContent = differences
        ? (foreign.forkCataloged ? "A Cataloged Descendant" : "The Difference Engine")
        : "The Borrowed Catalog";
    }
    if (body) {
      body.textContent = differences
        ? "This museum arrived as " + foreign.sourceCode + ", then changed in " + differences + " exhibit state" + (differences === 1 ? "" : "s") + ". The difference is now an exhibit of its own."
        : "This museum arrived from another browser as " + foreign.sourceCode + ". So far, you have preserved every imported exhibit state exactly.";
    }
    const chain = Array.isArray(foreign.lineage) ? foreign.lineage.filter(Boolean) : [];
    if (lineage) {
      lineage.textContent = chain.length
        ? "Earlier catalogs: " + chain.join(" → ")
        : "No earlier lineage was carried on this ticket.";
    }
    if (button) {
      button.hidden = Boolean(foreign.forkCataloged) || differences === 0;
      button.textContent = differences ? "catalog this fork" : "nothing to catalog yet";
    }
    if (restore) restore.hidden = !localStorage.getItem(COATCHECK_KEY);
    return dialog;
  }

  function openForeignCatalog() {
    const dialog = refreshDialog();
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function renderArtifact() {
    const layer = document.getElementById("exhibitLayer");
    if (!layer) return;
    const existing = layer.querySelector(".foreign-catalog-v03");
    const state = readState();
    const foreign = state.foreignCatalog;

    if (!foreign || roomId() !== "vestibule") {
      if (existing) existing.remove();
      return;
    }

    const differences = stateDifferenceCount(state);
    const labelText = differences
      ? (foreign.forkCataloged ? "Cataloged Descendant" : "The Difference Engine")
      : "The Borrowed Catalog";

    let node = existing;
    if (!node) {
      node = document.createElement("button");
      node.type = "button";
      node.className = "exhibit foreign-catalog-v03";
      node.style.left = "50%";
      node.style.top = "30%";
      node.setAttribute("aria-label", "Foreign catalog. Click to inspect.");
      const shape = document.createElement("div");
      shape.className = "exhibit-shape";
      shape.textContent = "⧉";
      const label = document.createElement("div");
      label.className = "exhibit-name";
      node.append(shape, label);
      node.addEventListener("click", openForeignCatalog);
      layer.append(node);
    }

    node.dataset.state = foreign.forkCataloged ? "2" : (differences ? "1" : "0");
    node.classList.toggle("near", playerNearFork());
    const label = node.querySelector(".exhibit-name");
    if (label && label.textContent !== labelText) label.textContent = labelText;
  }

  function serviceProximity() {
    if (!playerNearFork()) return;
    const prompt = document.getElementById("interactionPrompt");
    const interact = document.getElementById("interactButton");
    if (prompt) {
      const differences = stateDifferenceCount(readState());
      const label = differences ? "E · inspect this museum's fork" : "E · inspect the borrowed catalog";
      if (prompt.textContent !== label) prompt.textContent = label;
      prompt.classList.add("show");
    }
    if (interact) interact.disabled = false;
  }

  function applyArchiveNote() {
    const dialog = document.getElementById("archiveDialog");
    let note = document.getElementById("foreignArchiveNoteV03");
    const state = readState();
    const foreign = state.foreignCatalog;

    if (!foreign) {
      if (note) note.remove();
      return;
    }

    if (!note) {
      note = document.createElement("p");
      note.id = "foreignArchiveNoteV03";
      note.className = "foreign-archive-note-v03";
      const archiveText = document.getElementById("archiveText");
      if (archiveText) archiveText.insertAdjacentElement("afterend", note);
    }

    const differences = stateDifferenceCount(state);
    const message = differences
      ? "Provenance: descended from " + foreign.sourceCode + " with " + differences + " changed exhibit state" + (differences === 1 ? "" : "s") + (foreign.forkCataloged ? "; the fork was formally cataloged." : "; the fork remains uncataloged.")
      : "Provenance: this arrangement still matches the imported catalog " + foreign.sourceCode + ".";
    if (note.textContent !== message) note.textContent = message;

    if (dialog?.open) note.hidden = false;
  }

  document.addEventListener("keydown", event => {
    if ((event.key === "e" || event.key === "E" || event.key === " ") && !event.repeat && playerNearFork()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openForeignCatalog();
    }
  }, true);

  document.addEventListener("click", event => {
    if (event.target?.id === "interactButton" && playerNearFork()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openForeignCatalog();
    }
  }, true);

  const observer = new MutationObserver(() => {
    renderArtifact();
    applyArchiveNote();
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open", "class"] });

  setInterval(() => {
    renderArtifact();
    serviceProximity();
    applyArchiveNote();
  }, 220);

  ensureDialog();
  renderArtifact();
  applyArchiveNote();
})();