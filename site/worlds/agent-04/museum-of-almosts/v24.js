(() => {
  "use strict";

  const EDITION_KEY = "agent04-museum-editions-v10";
  const LINEAGE_KEY = "agent04-museum-edition-lineage-v15";
  const MAX_RELATIONS = 6;

  const codePattern = /^ED1-[A-Z0-9]{5,10}-[A-Z0-9]{4,9}$/;
  const validLenses = new Set(["possibility", "provenance", "architecture"]);

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
    const numeric = ["almosts","visitedRooms","changes","echoes","afterimages","curatedRevisions","curatedExhibits","blueprints"];
    return numeric.every(key => Number.isInteger(summary[key]) && summary[key] >= 0) &&
      typeof summary.referenceMounted === "boolean" &&
      typeof summary.importedLineage === "boolean";
  }

  function editionMap() {
    const raw = readJson(EDITION_KEY, null);
    const map = new Map();

    if (!raw || !Array.isArray(raw.editions)) return map;

    raw.editions.slice(-4).forEach(item => {
      if (
        item &&
        typeof item === "object" &&
        codePattern.test(item.code || "") &&
        validLenses.has(item.lens) &&
        validSummary(item.summary)
      ) {
        map.set(item.code, item);
      }
    });

    return map;
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
    const codes = new Set(editionMap().keys());

    relations().forEach(relation => {
      codes.add(relation.parentCode);
      codes.add(relation.childCode);
    });

    return codes;
  }

  function adjacency() {
    const graph = new Map(Array.from(graphCodes()).map(code => [code, []]));

    relations().forEach(relation => {
      if (!graph.has(relation.parentCode) || !graph.has(relation.childCode)) return;

      graph.get(relation.parentCode).push({
        code: relation.childCode,
        relation,
        direction: "forward"
      });
      graph.get(relation.childCode).push({
        code: relation.parentCode,
        relation,
        direction: "backward"
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
          relation: edge.relation,
          direction: edge.direction
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

  function classifyStep(step, shelf) {
    const fromRetained = shelf.has(step.from);
    const toRetained = shelf.has(step.to);

    if (fromRetained && toRetained) {
      return {
        ...step,
        evidence: "documented",
        retainedEndpoints: 2
      };
    }

    if (fromRetained || toRetained) {
      return {
        ...step,
        evidence: "partial",
        retainedEndpoints: 1
      };
    }

    return {
      ...step,
      evidence: "lineage-only",
      retainedEndpoints: 0
    };
  }

  function analyzePath(path) {
    const shelf = editionMap();

    if (!path) {
      return {
        path: null,
        steps: [],
        documented: 0,
        partial: 0,
        lineageOnly: 0,
        total: 0,
        grade: "no path"
      };
    }

    const steps = path.steps.map(step => classifyStep(step, shelf));
    const documented = steps.filter(step => step.evidence === "documented").length;
    const partial = steps.filter(step => step.evidence === "partial").length;
    const lineageOnly = steps.filter(step => step.evidence === "lineage-only").length;

    let grade = "fully documented";
    if (!steps.length) grade = "single edition";
    else if (documented === steps.length) grade = "fully documented";
    else if (documented === 0 && partial === 0) grade = "lineage-only";
    else grade = "partially fossilized";

    return {
      path,
      steps,
      documented,
      partial,
      lineageOnly,
      total: steps.length,
      grade
    };
  }

  function currentAnalysis() {
    const { start, end } = selectedEndpoints();
    return analyzePath(shortestPath(start, end));
  }

  function setText(node, value) {
    const text = String(value);
    if (node && node.textContent !== text) node.textContent = text;
  }

  function ensurePanel() {
    const threadwalk = document.getElementById("threadwalkPanelV21");
    if (!threadwalk) return null;

    let panel = document.getElementById("evidencePanelV24");
    if (panel) return panel;

    panel = document.createElement("section");
    panel.id = "evidencePanelV24";
    panel.className = "evidence-panel-v24";

    const heading = document.createElement("div");
    heading.className = "evidence-heading-v24";

    const label = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "EVIDENCE LEDGER · v2.4";

    const title = document.createElement("h4");
    title.textContent = "How much of this path is still documented?";

    label.append(eyebrow, title);

    const grade = document.createElement("strong");
    grade.id = "evidenceGradeV24";
    grade.className = "evidence-grade-v24";

    heading.append(label, grade);

    const status = document.createElement("p");
    status.id = "evidenceStatusV24";
    status.className = "evidence-status-v24";

    const meter = document.createElement("div");
    meter.id = "evidenceMeterV24";
    meter.className = "evidence-meter-v24";
    meter.setAttribute("aria-label", "Threadwalk evidence coverage");

    const legend = document.createElement("div");
    legend.className = "evidence-legend-v24";

    [
      ["documented", "both summaries retained"],
      ["partial", "one summary retained"],
      ["lineage-only", "lineage facts only"]
    ].forEach(([kind, text]) => {
      const item = document.createElement("span");
      item.dataset.kind = kind;
      item.textContent = text;
      legend.append(item);
    });

    const note = document.createElement("p");
    note.className = "control-hint";
    note.textContent = "Evidence Ledger never upgrades a fossil edge by inference. Field-level comparison exists only where both compact endpoint summaries are actually retained.";

    panel.append(heading, status, meter, legend, note);

    const lantern = document.getElementById("lanternPanelV23");
    if (lantern?.nextSibling) threadwalk.insertBefore(panel, lantern.nextSibling);
    else threadwalk.append(panel);

    return panel;
  }

  function renderMeter(analysis) {
    const meter = document.getElementById("evidenceMeterV24");
    if (!meter) return;

    meter.replaceChildren();

    if (!analysis.total) {
      const empty = document.createElement("span");
      empty.className = "evidence-empty-v24";
      empty.textContent = "no lineage edge selected";
      meter.append(empty);
      return;
    }

    analysis.steps.forEach((step, index) => {
      const segment = document.createElement("span");
      segment.className = "evidence-segment-v24";
      segment.dataset.kind = step.evidence;
      segment.setAttribute(
        "aria-label",
        "Thread " + (index + 1) + ": " + step.evidence + " · " + step.from + " to " + step.to
      );
      segment.title =
        "Thread " + (index + 1) + " · " +
        step.from + " → " + step.to + " · " +
        step.evidence;
      meter.append(segment);
    });
  }

  function render() {
    const panel = ensurePanel();
    if (!panel) return;

    const analysis = currentAnalysis();
    const grade = document.getElementById("evidenceGradeV24");
    const status = document.getElementById("evidenceStatusV24");

    setText(grade, analysis.grade);
    if (grade) grade.dataset.grade = analysis.grade.replace(/\s+/g, "-");

    if (!analysis.path) {
      setText(status, "No explicit Threadwalk path is currently available.");
    } else if (!analysis.total) {
      setText(status, "Start and end are the same edition, so no lineage edge needs evidence coverage.");
    } else {
      setText(
        status,
        analysis.documented + "/" + analysis.total + " edges support field-level comparison · " +
        analysis.partial + " partial · " +
        analysis.lineageOnly + " lineage-only"
      );
    }

    renderMeter(analysis);
    lastSignature = signature();
  }

  function signature() {
    const { start, end } = selectedEndpoints();
    const shelf = Array.from(editionMap().keys()).join("|");
    const rels = relations().map(item =>
      item.parentCode + ">" + item.childCode + ":" + item.lens
    ).join("|");

    return start + "::" + end + "::" + shelf + "::" + rels;
  }

  function galleryOpen() {
    return Boolean(document.getElementById("galleryDialogV20")?.open);
  }

  const observer = new MutationObserver(() => {
    if (!galleryOpen()) return;

    const next = signature();

    if (next !== lastSignature || !document.getElementById("evidencePanelV24")) {
      render();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener("change", event => {
    if (event.target?.id === "threadwalkStartV21" || event.target?.id === "threadwalkEndV21") {
      render();
    }
  });

  setInterval(() => {
    if (!galleryOpen()) return;

    const next = signature();

    if (next !== lastSignature || !document.getElementById("evidencePanelV24")) {
      render();
    }
  }, 460);

  if (galleryOpen()) render();
})();