(() => {
  "use strict";

  const STORAGE_KEY = "agent04-museum-of-almosts-v1";
  const EDITION_KEY = "agent04-museum-editions-v10";
  const LINEAGE_KEY = "agent04-museum-edition-lineage-v15";
  const MAX_RELATIONS = 6;
  const MAX_NODES = 12;
  const DOOR_X = 500;
  const DOOR_Y = 120;
  const DOOR_DISTANCE = 135;

  const codePattern = /^ED1-[A-Z0-9]{5,10}-[A-Z0-9]{4,9}$/;
  const validLenses = new Set(["possibility", "provenance", "architecture"]);

  let selectedCode = null;
  let lastSignature = "";

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value && typeof value === "object" ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function validSummary(summary) {
    if (!summary || typeof summary !== "object") return false;
    const numeric = ["almosts", "visitedRooms", "changes", "echoes", "afterimages", "curatedRevisions", "curatedExhibits", "blueprints"];
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
      codePattern.test(item.code || "") &&
      validLenses.has(item.lens) &&
      validSummary(item.summary) &&
      typeof item.createdAt === "string"
    ).slice(-4);
  }

  function editionMap() {
    return new Map(editions().map(item => [item.code, item]));
  }

  function relations() {
    const raw = readJson(LINEAGE_KEY, null);
    if (!raw || !Array.isArray(raw.relations)) return [];

    const seen = new Set();
    const result = [];

    raw.relations.filter(item =>
      item &&
      typeof item === "object" &&
      codePattern.test(item.parentCode || "") &&
      codePattern.test(item.childCode || "") &&
      item.parentCode !== item.childCode &&
      validLenses.has(item.lens) &&
      typeof item.createdAt === "string"
    ).slice(-MAX_RELATIONS).forEach(item => {
      const key = item.parentCode + ">" + item.childCode;
      if (seen.has(key)) return;
      seen.add(key);
      result.push(item);
    });

    return result;
  }

  function galleryNodes() {
    const shelf = editionMap();
    const codes = new Set(shelf.keys());

    relations().forEach(relation => {
      codes.add(relation.parentCode);
      codes.add(relation.childCode);
    });

    const latest = editions()[editions().length - 1]?.code || null;

    return Array.from(codes)
      .slice(-MAX_NODES)
      .map(code => ({
        code,
        edition: shelf.get(code) || null,
        retained: shelf.has(code),
        latest: code === latest
      }));
  }

  function parentMap() {
    const map = new Map();
    relations().forEach(relation => {
      if (!map.has(relation.childCode)) map.set(relation.childCode, relation.parentCode);
    });
    return map;
  }

  function nodeDepth(code) {
    const parents = parentMap();
    const seen = new Set();
    let cursor = code;
    let depth = 0;

    while (parents.has(cursor) && depth < MAX_RELATIONS + 1) {
      if (seen.has(cursor)) break;
      seen.add(cursor);
      cursor = parents.get(cursor);
      depth += 1;
    }

    return depth;
  }

  function layoutNodes() {
    const nodes = galleryNodes().map(node => ({ ...node, depth: nodeDepth(node.code) }));
    const byDepth = new Map();

    nodes.forEach(node => {
      if (!byDepth.has(node.depth)) byDepth.set(node.depth, []);
      byDepth.get(node.depth).push(node);
    });

    const depths = Array.from(byDepth.keys()).sort((a, b) => a - b);
    const maxDepth = Math.max(1, ...depths);

    const positioned = [];
    depths.forEach(depth => {
      const group = byDepth.get(depth).sort((a, b) => a.code.localeCompare(b.code));
      group.forEach((node, index) => {
        const count = group.length;
        const x = count === 1 ? 500 : 140 + (720 * index / Math.max(1, count - 1));
        const y = 110 + (390 * depth / maxDepth);
        positioned.push({ ...node, x, y });
      });
    });

    return positioned;
  }

  function setText(node, value) {
    const text = String(value);
    if (node && node.textContent !== text) node.textContent = text;
  }

  function currentRoom() {
    const state = readJson(STORAGE_KEY, {});
    return typeof state.room === "string" ? state.room : "vestibule";
  }

  function playerNearDoor() {
    if (currentRoom() !== "archive") return false;
    const state = readJson(STORAGE_KEY, {});
    const player = state.player || { x: 500, y: 300 };
    return Math.hypot(Number(player.x || 0) - DOOR_X, Number(player.y || 0) - DOOR_Y) <= DOOR_DISTANCE;
  }

  function ensurePanel() {
    let section = document.getElementById("galleryPanelV20");
    if (section) return section;

    const aside = document.querySelector(".side-card");
    if (!aside) return null;

    section = document.createElement("section");
    section.id = "galleryPanelV20";
    section.className = "visit-card gallery-panel-v20";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "EDITION GALLERY · v2.0";

    const status = document.createElement("p");
    status.id = "galleryStatusV20";
    status.className = "control-hint";

    const button = document.createElement("button");
    button.id = "openGalleryV20";
    button.className = "full-button";
    button.type = "button";
    button.textContent = "enter edition gallery";
    button.addEventListener("click", openGallery);

    section.append(eyebrow, status, button);

    const compass = aside.querySelector("#compassPanelV19");
    const distant = aside.querySelector(".distant-wings");
    if (compass?.nextSibling) aside.insertBefore(section, compass.nextSibling);
    else if (distant) aside.insertBefore(section, distant);
    else aside.append(section);

    return section;
  }

  function ensureDialog() {
    let dialog = document.getElementById("galleryDialogV20");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "galleryDialogV20";
    dialog.className = "gallery-dialog-v20";

    const shell = document.createElement("div");
    shell.className = "gallery-shell-v20";

    const header = document.createElement("header");
    header.className = "gallery-header-v20";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "ROOM 07 · EDITIONS AS ARCHITECTURE";

    const title = document.createElement("h2");
    title.textContent = "The Edition Gallery";

    const description = document.createElement("p");
    description.textContent = "Retained Living Catalog editions stand on lecterns. Lineage codes whose summaries aged off the shelf remain as fossil plaques. Threads show only explicit v1.5 parent→child relations.";

    header.append(eyebrow, title, description);

    const map = document.createElement("section");
    map.id = "galleryMapV20";
    map.className = "gallery-map-v20";
    map.setAttribute("aria-label", "Edition lineage gallery");

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = "galleryThreadsV20";
    svg.classList.add("gallery-threads-v20");
    svg.setAttribute("viewBox", "0 0 1000 600");
    svg.setAttribute("aria-hidden", "true");

    const nodes = document.createElement("div");
    nodes.id = "galleryNodesV20";
    nodes.className = "gallery-nodes-v20";

    map.append(svg, nodes);

    const detail = document.createElement("section");
    detail.id = "galleryDetailV20";
    detail.className = "gallery-detail-v20";

    const actions = document.createElement("div");
    actions.className = "gallery-actions-v20";

    const close = document.createElement("button");
    close.className = "quiet-button";
    close.type = "button";
    close.textContent = "return to Archive";
    close.addEventListener("click", () => dialog.close());

    actions.append(close);
    shell.append(header, map, detail, actions);
    dialog.append(shell);
    document.body.append(dialog);
    return dialog;
  }

  function renderThreads(positioned) {
    const svg = document.getElementById("galleryThreadsV20");
    if (!svg) return;
    svg.replaceChildren();

    const byCode = new Map(positioned.map(node => [node.code, node]));

    relations().forEach(relation => {
      const parent = byCode.get(relation.parentCode);
      const child = byCode.get(relation.childCode);
      if (!parent || !child) return;

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(parent.x));
      line.setAttribute("y1", String(parent.y));
      line.setAttribute("x2", String(child.x));
      line.setAttribute("y2", String(child.y));
      line.setAttribute("data-lens", relation.lens);
      line.classList.add("gallery-thread-v20");
      svg.append(line);
    });
  }

  function renderNodes(positioned) {
    const nodeLayer = document.getElementById("galleryNodesV20");
    if (!nodeLayer) return;
    nodeLayer.replaceChildren();

    positioned.forEach(item => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gallery-node-v20";
      button.dataset.retained = String(item.retained);
      button.dataset.latest = String(item.latest);
      button.style.left = (item.x / 10) + "%";
      button.style.top = (item.y / 6) + "%";
      button.setAttribute("aria-pressed", String(selectedCode === item.code));
      button.addEventListener("click", () => {
        selectedCode = item.code;
        renderGallery();
      });

      const mark = document.createElement("span");
      mark.className = "gallery-node-mark-v20";
      mark.textContent = item.retained ? (item.latest ? "▣" : "▤") : "▱";

      const code = document.createElement("strong");
      code.textContent = item.code;

      const meta = document.createElement("span");
      meta.textContent = item.retained
        ? item.edition.lens + (item.latest ? " · latest" : " · retained")
        : "fossil citation";

      button.append(mark, code, meta);
      nodeLayer.append(button);
    });
  }

  function relationFacts(code) {
    const incoming = relations().filter(item => item.childCode === code);
    const outgoing = relations().filter(item => item.parentCode === code);
    return { incoming, outgoing };
  }

  function renderDetail(positioned) {
    const detail = document.getElementById("galleryDetailV20");
    if (!detail) return;
    detail.replaceChildren();

    if (!positioned.length) {
      const empty = document.createElement("p");
      empty.className = "control-hint";
      empty.textContent = "No editions or explicit lineage relations exist yet. Print Living Catalog editions to populate the gallery.";
      detail.append(empty);
      return;
    }

    const selected = positioned.find(item => item.code === selectedCode) ||
      positioned.find(item => item.latest) ||
      positioned[positioned.length - 1];

    selectedCode = selected.code;

    document.querySelectorAll(".gallery-node-v20").forEach(node => {
      node.setAttribute("aria-pressed", String(node.querySelector("strong")?.textContent === selected.code));
    });

    const heading = document.createElement("div");
    heading.className = "gallery-detail-heading-v20";

    const title = document.createElement("h3");
    title.textContent = selected.retained ? "Retained Edition" : "Fossil Citation";

    const code = document.createElement("strong");
    code.textContent = selected.code;

    heading.append(title, code);
    detail.append(heading);

    const facts = relationFacts(selected.code);

    if (!selected.retained) {
      const warning = document.createElement("p");
      warning.className = "gallery-fossil-warning-v20";
      warning.textContent = "SUMMARY NOT RETAINED. This plaque exists only because code-level lineage still references the edition. Detailed contents are unavailable and are not reconstructed.";
      detail.append(warning);
    } else {
      const edition = selected.edition;

      const meta = document.createElement("p");
      meta.textContent = "Editorial lens: " + edition.lens + " · visit code: " + edition.visitCode + ".";
      detail.append(meta);

      const metrics = document.createElement("div");
      metrics.className = "gallery-metrics-v20";

      const rows = [
        ["Almosts", edition.summary.almosts],
        ["Rooms", edition.summary.visitedRooms],
        ["Echoes", edition.summary.echoes],
        ["Afterimages", edition.summary.afterimages],
        ["Curated revisions", edition.summary.curatedRevisions],
        ["Blueprints", edition.summary.blueprints]
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

      detail.append(metrics);
    }

    const relation = document.createElement("p");
    relation.className = "gallery-relation-summary-v20";
    relation.textContent =
      facts.incoming.length + " explicit parent relation" + (facts.incoming.length === 1 ? "" : "s") +
      " · " + facts.outgoing.length + " explicit child relation" + (facts.outgoing.length === 1 ? "" : "s") + ".";
    detail.append(relation);
  }

  function renderGallery() {
    ensureDialog();
    const positioned = layoutNodes();
    renderThreads(positioned);
    renderNodes(positioned);
    renderDetail(positioned);
  }

  function openGallery() {
    const dialog = ensureDialog();
    renderGallery();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function renderArchiveDoor() {
    const layer = document.getElementById("exhibitLayer");
    if (!layer) return;

    const existing = layer.querySelector(".gallery-door-v20");
    const hasContent = galleryNodes().length > 0;

    if (currentRoom() !== "archive") {
      if (existing) existing.remove();
      return;
    }

    let node = existing;
    if (!node) {
      node = document.createElement("button");
      node.type = "button";
      node.className = "exhibit gallery-door-v20";
      node.style.left = (DOOR_X / 1000 * 100) + "%";
      node.style.top = (DOOR_Y / 600 * 100) + "%";
      node.addEventListener("click", openGallery);

      const shape = document.createElement("div");
      shape.className = "exhibit-shape";
      shape.textContent = "▥";

      const label = document.createElement("div");
      label.className = "exhibit-name";
      label.textContent = "Edition Gallery";

      node.append(shape, label);
      layer.append(node);
    }

    node.dataset.empty = String(!hasContent);
    node.classList.toggle("near", playerNearDoor());
    node.setAttribute(
      "aria-label",
      hasContent
        ? "Door to the Edition Gallery. Click to inspect retained editions and explicit lineage."
        : "Door to the empty Edition Gallery."
    );
  }

  function refreshPanel() {
    ensurePanel();
    const status = document.getElementById("galleryStatusV20");
    const button = document.getElementById("openGalleryV20");
    const nodes = galleryNodes();
    const retained = nodes.filter(node => node.retained).length;
    const fossils = nodes.length - retained;
    const links = relations().length;

    if (!nodes.length) {
      setText(status, "Empty gallery · print Living Catalog editions to create lecterns.");
    } else {
      setText(
        status,
        retained + " retained edition" + (retained === 1 ? "" : "s") +
        " · " + fossils + " fossil plaque" + (fossils === 1 ? "" : "s") +
        " · " + links + " explicit lineage thread" + (links === 1 ? "" : "s")
      );
    }
    if (button) button.disabled = false;
  }

  function applyArchiveNote() {
    let note = document.getElementById("galleryArchiveNoteV20");
    const nodes = galleryNodes();

    if (!nodes.length) {
      if (note) note.remove();
      return;
    }

    if (!note) {
      note = document.createElement("p");
      note.id = "galleryArchiveNoteV20";
      note.className = "gallery-archive-note-v20";
      const compass = document.getElementById("compassArchiveNoteV19");
      const sibling = document.getElementById("siblingArchiveNoteV18");
      const archiveText = document.getElementById("archiveText");
      if (compass) compass.insertAdjacentElement("afterend", note);
      else if (sibling) sibling.insertAdjacentElement("afterend", note);
      else if (archiveText) archiveText.insertAdjacentElement("afterend", note);
    }

    const retained = nodes.filter(node => node.retained).length;
    const fossils = nodes.length - retained;
    setText(
      note,
      "Edition Gallery: " + retained + " retained lectern" + (retained === 1 ? "" : "s") +
      " · " + fossils + " fossil plaque" + (fossils === 1 ? "" : "s") +
      " · " + relations().length + " explicit lineage thread" + (relations().length === 1 ? "" : "s") + "."
    );
  }

  function serviceProximity() {
    if (!playerNearDoor()) return;
    const prompt = document.getElementById("interactionPrompt");
    const interact = document.getElementById("interactButton");
    if (prompt) {
      const text = "E · enter Edition Gallery";
      if (prompt.textContent !== text) prompt.textContent = text;
      prompt.classList.add("show");
    }
    if (interact) interact.disabled = false;
  }

  function signature() {
    const shelf = editions().map(item => item.code).join(",");
    const links = relations().map(item => item.parentCode + ">" + item.childCode).join(",");
    return currentRoom() + "|" + shelf + "|" + links;
  }

  function refreshAll() {
    refreshPanel();
    renderArchiveDoor();
    applyArchiveNote();
    if (document.getElementById("galleryDialogV20")?.open) renderGallery();
    lastSignature = signature();
  }

  document.addEventListener("keydown", event => {
    if ((event.key === "e" || event.key === "E" || event.key === " ") && !event.repeat && playerNearDoor()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openGallery();
    }
  }, true);

  document.addEventListener("click", event => {
    if (event.target?.id === "interactButton" && playerNearDoor()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openGallery();
    }
  }, true);

  setInterval(() => {
    serviceProximity();
    const next = signature();
    if (next !== lastSignature) refreshAll();
    else renderArchiveDoor();
  }, 440);

  ensurePanel();
  ensureDialog();
  refreshAll();
})();