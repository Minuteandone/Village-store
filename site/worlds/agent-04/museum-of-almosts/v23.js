(() => {
  "use strict";

  const EDITION_KEY = "agent04-museum-editions-v10";
  const LINEAGE_KEY = "agent04-museum-edition-lineage-v15";
  const MAX_RELATIONS = 6;

  const codePattern = /^ED1-[A-Z0-9]{5,10}-[A-Z0-9]{4,9}$/;
  const validLenses = new Set(["possibility", "provenance", "architecture"]);

  let stepIndex = 0;
  let lastPathKey = "";

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
    const numeric = ["almosts","visitedRooms","changes","echoes","afterimages","curatedRevisions","curatedExhibits","blueprints"];
    return numeric.every(key => Number.isInteger(summary[key]) && summary[key] >= 0) &&
      typeof summary.referenceMounted === "boolean" &&
      typeof summary.importedLineage === "boolean";
  }

  function editionCodes() {
    const raw = readJson(EDITION_KEY, null);
    if (!raw || !Array.isArray(raw.editions)) return [];

    return raw.editions.filter(item =>
      item &&
      typeof item === "object" &&
      codePattern.test(item.code || "") &&
      validLenses.has(item.lens) &&
      validSummary(item.summary)
    ).slice(-4).map(item => item.code);
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

  function graphCodes() {
    const codes = new Set(editionCodes());
    relations().forEach(relation => {
      codes.add(relation.parentCode);
      codes.add(relation.childCode);
    });
    return codes;
  }

  function adjacency() {
    const codes = graphCodes();
    const graph = new Map(Array.from(codes).map(code => [code, []]));

    relations().forEach(relation => {
      if (!graph.has(relation.parentCode) || !graph.has(relation.childCode)) return;

      graph.get(relation.parentCode).push({
        code: relation.childCode,
        direction: "forward",
        relation
      });
      graph.get(relation.childCode).push({
        code: relation.parentCode,
        direction: "backward",
        relation
      });
    });

    return graph;
  }

  function shortestPath(start, end) {
    const graph = adjacency();
    if (!start || !end || !graph.has(start) || !graph.has(end)) return null;
    if (start === end) return { nodes: [start], steps: [] };

    const queue = [start];
    const previous = new Map([[start, null]]);
    const via = new Map();

    while (queue.length) {
      const current = queue.shift();

      for (const edge of graph.get(current) || []) {
        if (previous.has(edge.code)) continue;
        previous.set(edge.code, current);
        via.set(edge.code, edge);

        if (edge.code === end) {
          queue.length = 0;
          break;
        }

        queue.push(edge.code);
      }
    }

    if (!previous.has(end)) return null;

    const nodes = [];
    const steps = [];
    let cursor = end;

    while (cursor !== null) {
      nodes.push(cursor);
      const edge = via.get(cursor);
      if (edge) {
        steps.push({
          from: previous.get(cursor),
          to: cursor,
          direction: edge.direction,
          relation: edge.relation
        });
      }
      cursor = previous.get(cursor);
    }

    nodes.reverse();
    steps.reverse();
    return { nodes, steps };
  }

  function selectedEndpoints() {
    return {
      start: document.getElementById("threadwalkStartV21")?.value || "",
      end: document.getElementById("threadwalkEndV21")?.value || ""
    };
  }

  function currentPath() {
    const { start, end } = selectedEndpoints();
    return shortestPath(start, end);
  }

  function pathKey(path) {
    if (!path) return "none";
    return path.nodes.join(">");
  }

  function ensurePanel() {
    const threadwalk = document.getElementById("threadwalkPanelV21");
    if (!threadwalk) return null;

    let panel = document.getElementById("lanternPanelV23");
    if (panel) return panel;

    panel = document.createElement("section");
    panel.id = "lanternPanelV23";
    panel.className = "lantern-panel-v23";

    const heading = document.createElement("div");
    heading.className = "lantern-heading-v23";

    const label = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "GALLERY LANTERN · v2.3";
    const title = document.createElement("h4");
    title.textContent = "Focus one explicit thread at a time";
    label.append(eyebrow, title);

    const controls = document.createElement("div");
    controls.className = "lantern-controls-v23";

    const previous = document.createElement("button");
    previous.id = "lanternPreviousV23";
    previous.type = "button";
    previous.className = "quiet-button";
    previous.textContent = "← previous";
    previous.addEventListener("click", () => {
      const path = currentPath();
      if (!path?.steps.length) return;
      stepIndex = Math.max(0, stepIndex - 1);
      render();
    });

    const next = document.createElement("button");
    next.id = "lanternNextV23";
    next.type = "button";
    next.className = "quiet-button";
    next.textContent = "next →";
    next.addEventListener("click", () => {
      const path = currentPath();
      if (!path?.steps.length) return;
      stepIndex = Math.min(path.steps.length - 1, stepIndex + 1);
      render();
    });

    controls.append(previous, next);
    heading.append(label, controls);

    const status = document.createElement("p");
    status.id = "lanternStatusV23";
    status.className = "lantern-status-v23";

    const note = document.createElement("p");
    note.className = "control-hint";
    note.textContent = "Gallery Lantern changes only visual focus. It never changes Threadwalk endpoints, edition data, lineage relations, or Thread Notes.";

    panel.append(heading, status, note);

    const notes = document.getElementById("threadnotesPanelV22");
    if (notes?.nextSibling) threadwalk.insertBefore(panel, notes.nextSibling);
    else threadwalk.append(panel);

    return panel;
  }

  function visibleRelations() {
    const visible = graphCodes();
    return relations().filter(relation =>
      visible.has(relation.parentCode) && visible.has(relation.childCode)
    );
  }

  function relationKey(relation) {
    return relation ? relation.parentCode + ">" + relation.childCode : "";
  }

  function setText(node, value) {
    const text = String(value);
    if (node && node.textContent !== text) node.textContent = text;
  }

  function clearFocus() {
    document.querySelectorAll(".gallery-node-v20").forEach(node => {
      delete node.dataset.lantern;
    });
    document.querySelectorAll(".gallery-thread-v20").forEach(line => {
      delete line.dataset.lantern;
    });
    document.querySelectorAll(".threadnotes-card-v22").forEach(card => {
      delete card.dataset.lantern;
    });
  }

  function applyFocus(path) {
    clearFocus();
    if (!path?.steps.length) return;

    stepIndex = Math.max(0, Math.min(stepIndex, path.steps.length - 1));
    const step = path.steps[stepIndex];

    document.querySelectorAll(".gallery-node-v20").forEach(node => {
      const code = node.querySelector("strong")?.textContent || "";
      if (code === step.from) node.dataset.lantern = "from";
      else if (code === step.to) node.dataset.lantern = "to";
      else if (path.nodes.includes(code)) node.dataset.lantern = "dimmed-path";
    });

    const rels = visibleRelations();
    const activeKey = relationKey(step.relation);
    Array.from(document.querySelectorAll(".gallery-thread-v20")).forEach((line, index) => {
      const relation = rels[index];
      const key = relationKey(relation);
      if (key === activeKey) line.dataset.lantern = "active";
      else if (path.steps.some(item => relationKey(item.relation) === key)) line.dataset.lantern = "dimmed-path";
    });

    Array.from(document.querySelectorAll(".threadnotes-card-v22")).forEach((card, index) => {
      card.dataset.lantern = index === stepIndex ? "active" : "dimmed";
    });
  }

  function render() {
    const panel = ensurePanel();
    if (!panel) return;

    const path = currentPath();
    const key = pathKey(path);

    if (key !== lastPathKey) {
      stepIndex = 0;
      lastPathKey = key;
    }

    const status = document.getElementById("lanternStatusV23");
    const previous = document.getElementById("lanternPreviousV23");
    const next = document.getElementById("lanternNextV23");

    if (!path) {
      setText(status, "No explicit Threadwalk path is available to illuminate.");
      if (previous) previous.disabled = true;
      if (next) next.disabled = true;
      clearFocus();
      return;
    }

    if (!path.steps.length) {
      setText(status, "Start and end are the same edition; there is no thread to illuminate.");
      if (previous) previous.disabled = true;
      if (next) next.disabled = true;
      clearFocus();
      return;
    }

    stepIndex = Math.max(0, Math.min(stepIndex, path.steps.length - 1));
    const step = path.steps[stepIndex];

    setText(
      status,
      "Lantern " + (stepIndex + 1) + " of " + path.steps.length + " · " +
      step.from + " → " + step.to + " · " +
      (step.direction === "forward" ? "parent → child" : "child → parent") +
      " · " + step.relation.lens
    );

    if (previous) previous.disabled = stepIndex === 0;
    if (next) next.disabled = stepIndex === path.steps.length - 1;

    applyFocus(path);
  }

  function galleryOpen() {
    return Boolean(document.getElementById("galleryDialogV20")?.open);
  }

  function signature() {
    const { start, end } = selectedEndpoints();
    const rels = relations().map(item => relationKey(item) + ":" + item.lens).join("|");
    return start + "::" + end + "::" + rels;
  }

  let lastSignature = "";

  const observer = new MutationObserver(() => {
    if (!galleryOpen()) return;
    const next = signature();
    if (next !== lastSignature || !document.getElementById("lanternPanelV23")) {
      lastSignature = next;
      render();
    } else {
      applyFocus(currentPath());
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener("change", event => {
    if (event.target?.id === "threadwalkStartV21" || event.target?.id === "threadwalkEndV21") {
      lastSignature = signature();
      render();
    }
  });

  setInterval(() => {
    if (!galleryOpen()) return;
    const next = signature();
    if (next !== lastSignature || !document.getElementById("lanternPanelV23")) {
      lastSignature = next;
      render();
    } else {
      applyFocus(currentPath());
    }
  }, 440);

  if (galleryOpen()) render();
})();