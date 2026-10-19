(() => {
  "use strict";

  const STORAGE_KEY = "agent04-museum-of-almosts-v1";
  const EDITION_KEY = "agent04-museum-editions-v10";
  const LINEAGE_KEY = "agent04-museum-edition-lineage-v15";
  const MAX_RELATIONS = 6;
  const MAX_NODES = 12;

  const codePattern = /^ED1-[A-Z0-9]{5,10}-[A-Z0-9]{4,9}$/;
  const validLenses = new Set(["possibility", "provenance", "architecture"]);

  let startCode = null;
  let endCode = null;
  let lastGraphSignature = "";

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

  function editions() {
    const raw = readJson(EDITION_KEY, null);
    if (!raw || !Array.isArray(raw.editions)) return [];
    return raw.editions.filter(item =>
      item &&
      typeof item === "object" &&
      codePattern.test(item.code || "") &&
      validLenses.has(item.lens) &&
      validSummary(item.summary)
    ).slice(-4);
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

  function galleryCodes() {
    const codes = new Set(editions().map(item => item.code));
    relations().forEach(relation => {
      codes.add(relation.parentCode);
      codes.add(relation.childCode);
    });
    return Array.from(codes).slice(-MAX_NODES);
  }

  function adjacency() {
    const graph = new Map();
    galleryCodes().forEach(code => graph.set(code, []));

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
      if (edge) steps.push({
        from: previous.get(cursor),
        to: cursor,
        direction: edge.direction,
        relation: edge.relation
      });
      cursor = previous.get(cursor);
    }

    nodes.reverse();
    steps.reverse();
    return { nodes, steps };
  }

  function setText(node, value) {
    const text = String(value);
    if (node && node.textContent !== text) node.textContent = text;
  }

  function ensurePanel() {
    const dialog = document.getElementById("galleryDialogV20");
    if (!dialog) return null;

    let panel = document.getElementById("threadwalkPanelV21");
    if (panel) return panel;

    const shell = dialog.querySelector(".gallery-shell-v20") || dialog.firstElementChild;
    const detail = document.getElementById("galleryDetailV20");
    if (!shell || !detail) return null;

    panel = document.createElement("section");
    panel.id = "threadwalkPanelV21";
    panel.className = "threadwalk-panel-v21";

    const heading = document.createElement("div");
    heading.className = "threadwalk-heading-v21";

    const labelWrap = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "THREADWALK · v2.1";
    const title = document.createElement("h3");
    title.textContent = "Walk an explicit lineage path";
    labelWrap.append(eyebrow, title);

    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "quiet-button";
    clear.textContent = "clear path";
    clear.addEventListener("click", () => {
      startCode = null;
      endCode = null;
      refresh();
    });

    heading.append(labelWrap, clear);

    const controls = document.createElement("div");
    controls.className = "threadwalk-controls-v21";

    const startWrap = document.createElement("label");
    startWrap.textContent = "from";
    const start = document.createElement("select");
    start.id = "threadwalkStartV21";
    start.addEventListener("change", () => {
      startCode = start.value || null;
      refresh();
    });
    startWrap.append(start);

    const endWrap = document.createElement("label");
    endWrap.textContent = "to";
    const end = document.createElement("select");
    end.id = "threadwalkEndV21";
    end.addEventListener("change", () => {
      endCode = end.value || null;
      refresh();
    });
    endWrap.append(end);

    const swap = document.createElement("button");
    swap.type = "button";
    swap.className = "quiet-button threadwalk-swap-v21";
    swap.textContent = "swap";
    swap.addEventListener("click", () => {
      const oldStart = startCode;
      startCode = endCode;
      endCode = oldStart;
      refresh();
    });

    controls.append(startWrap, endWrap, swap);

    const status = document.createElement("p");
    status.id = "threadwalkStatusV21";
    status.className = "threadwalk-status-v21";

    const steps = document.createElement("ol");
    steps.id = "threadwalkStepsV21";
    steps.className = "threadwalk-steps-v21";

    const note = document.createElement("p");
    note.className = "control-hint";
    note.textContent = "Threadwalk uses only explicit retained parent→child lineage relations. It never infers a connection from similar summaries or nearby gallery placement.";

    panel.append(heading, controls, status, steps, note);
    shell.insertBefore(panel, detail);
    return panel;
  }

  function fillSelect(select, value) {
    if (!select) return;
    const codes = galleryCodes();
    const current = value && codes.includes(value) ? value : "";

    select.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "choose edition";
    select.append(placeholder);

    codes.forEach(code => {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = code;
      select.append(option);
    });

    select.value = current;
  }

  function normalizeEndpoints() {
    const codes = galleryCodes();
    if (startCode && !codes.includes(startCode)) startCode = null;
    if (endCode && !codes.includes(endCode)) endCode = null;

    if (!startCode && codes.length) startCode = codes[0];
    if (!endCode && codes.length > 1) endCode = codes[codes.length - 1];
    if (!endCode && codes.length === 1) endCode = codes[0];
  }

  function visibleRelations() {
    const visible = new Set(galleryCodes());
    return relations().filter(relation =>
      visible.has(relation.parentCode) && visible.has(relation.childCode)
    );
  }

  function applyHighlights(path) {
    const pathNodes = new Set(path?.nodes || []);
    const pathEdges = new Set((path?.steps || []).map(step =>
      step.relation.parentCode + ">" + step.relation.childCode
    ));

    document.querySelectorAll(".gallery-node-v20").forEach(node => {
      const code = node.querySelector("strong")?.textContent || "";
      node.dataset.threadwalk = pathNodes.has(code) ? "true" : "false";
      node.dataset.threadwalkStart = String(code === startCode);
      node.dataset.threadwalkEnd = String(code === endCode);
    });

    const lines = Array.from(document.querySelectorAll(".gallery-thread-v20"));
    const rels = visibleRelations();

    lines.forEach((line, index) => {
      const relation = rels[index];
      const key = relation ? relation.parentCode + ">" + relation.childCode : "";
      line.dataset.threadwalk = pathEdges.has(key) ? "true" : "false";
    });
  }

  function renderSteps(path) {
    const node = document.getElementById("threadwalkStepsV21");
    if (!node) return;
    node.replaceChildren();

    if (!path || !path.steps.length) return;

    path.steps.forEach((step, index) => {
      const item = document.createElement("li");
      item.className = "threadwalk-step-v21";

      const direction = step.direction === "forward"
        ? "parent → child"
        : "child → parent";

      const main = document.createElement("strong");
      main.textContent = (index + 1) + ". " + step.from + " → " + step.to;

      const meta = document.createElement("span");
      meta.textContent = direction + " · " + step.relation.lens;

      item.append(main, meta);
      node.append(item);
    });
  }

  function refresh() {
    const panel = ensurePanel();
    if (!panel) return;

    normalizeEndpoints();

    fillSelect(document.getElementById("threadwalkStartV21"), startCode);
    fillSelect(document.getElementById("threadwalkEndV21"), endCode);

    const path = shortestPath(startCode, endCode);
    const status = document.getElementById("threadwalkStatusV21");

    if (!galleryCodes().length) {
      setText(status, "The gallery has no editions or explicit lineage codes yet.");
    } else if (!startCode || !endCode) {
      setText(status, "Choose two gallery nodes.");
    } else if (!path) {
      setText(status, "No explicit lineage path connects these two gallery nodes.");
    } else if (!path.steps.length) {
      setText(status, "Start and end are the same edition.");
    } else {
      setText(
        status,
        "Shortest explicit path: " + path.steps.length + " thread" + (path.steps.length === 1 ? "" : "s") +
        " across " + path.nodes.length + " gallery nodes."
      );
    }

    renderSteps(path);
    applyHighlights(path);
    lastGraphSignature = graphSignature();
  }

  function graphSignature() {
    return galleryCodes().join("|") + "::" +
      relations().map(item => item.parentCode + ">" + item.childCode + ":" + item.lens).join("|");
  }

  function dialogOpen() {
    return Boolean(document.getElementById("galleryDialogV20")?.open);
  }

  const observer = new MutationObserver(() => {
    if (!dialogOpen()) return;
    ensurePanel();
    const next = graphSignature();
    if (next !== lastGraphSignature) refresh();
    else applyHighlights(shortestPath(startCode, endCode));
  });

  observer.observe(document.body, { childList: true, subtree: true });

  setInterval(() => {
    if (!dialogOpen()) return;
    const next = graphSignature();
    if (next !== lastGraphSignature || !document.getElementById("threadwalkPanelV21")) refresh();
    else applyHighlights(shortestPath(startCode, endCode));
  }, 380);

  if (dialogOpen()) refresh();
})();