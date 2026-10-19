(() => {
  "use strict";

  const EDITION_KEY = "agent04-museum-editions-v10";
  const LINEAGE_KEY = "agent04-museum-edition-lineage-v15";
  const MAX_RELATIONS = 6;

  const codePattern = /^ED1-[A-Z0-9]{5,10}-[A-Z0-9]{4,9}$/;
  const validLenses = new Set(["possibility", "provenance", "architecture"]);
  const fields = [
    ["almosts", "Almosts"],
    ["visitedRooms", "Visited rooms"],
    ["changes", "Exhibit changes"],
    ["echoes", "Counterfactual echoes"],
    ["afterimages", "Afterimages"],
    ["referenceMounted", "Mounted reference"],
    ["importedLineage", "Imported lineage"],
    ["curatedRevisions", "Curated revisions"],
    ["curatedExhibits", "Curated exhibits"],
    ["blueprints", "Sealed blueprints"]
  ];

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
    const start = document.getElementById("threadwalkStartV21")?.value || "";
    const end = document.getElementById("threadwalkEndV21")?.value || "";
    return { start, end };
  }

  function formatValue(value) {
    return typeof value === "boolean" ? (value ? "yes" : "no") : String(value);
  }

  function summaryDifferences(fromEdition, toEdition) {
    if (!fromEdition || !toEdition) return null;

    return fields.map(([key, label]) => {
      const before = fromEdition.summary[key];
      const after = toEdition.summary[key];
      if (before === after) return null;
      return {
        key,
        label,
        before,
        after
      };
    }).filter(Boolean);
  }

  function ensurePanel() {
    const threadwalk = document.getElementById("threadwalkPanelV21");
    if (!threadwalk) return null;

    let panel = document.getElementById("threadnotesPanelV22");
    if (panel) return panel;

    panel = document.createElement("section");
    panel.id = "threadnotesPanelV22";
    panel.className = "threadnotes-panel-v22";

    const heading = document.createElement("div");
    heading.className = "threadnotes-heading-v22";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "THREAD NOTES · v2.2";

    const title = document.createElement("h4");
    title.textContent = "What survives along each explicit step";

    heading.append(eyebrow, title);

    const body = document.createElement("p");
    body.className = "control-hint";
    body.textContent = "Detailed field changes appear only when both endpoint compact summaries still exist on the four-edition shelf. Fossil-only endpoints are never reconstructed.";

    const list = document.createElement("div");
    list.id = "threadnotesListV22";
    list.className = "threadnotes-list-v22";

    panel.append(heading, body, list);

    const steps = document.getElementById("threadwalkStepsV21");
    if (steps?.nextSibling) threadwalk.insertBefore(panel, steps.nextSibling);
    else threadwalk.append(panel);

    return panel;
  }

  function renderRetainedStep(container, step, fromEdition, toEdition) {
    const differences = summaryDifferences(fromEdition, toEdition);

    const state = document.createElement("p");
    state.className = "threadnotes-state-v22";

    if (!differences?.length) {
      state.textContent = "Both compact summaries are retained. No stored summary field changed along this step.";
      container.append(state);
      return;
    }

    state.textContent = differences.length + " compact summary field" + (differences.length === 1 ? "" : "s") + " changed.";
    container.append(state);

    const changes = document.createElement("div");
    changes.className = "threadnotes-changes-v22";

    differences.forEach(change => {
      const row = document.createElement("div");
      row.className = "threadnotes-change-v22";

      const label = document.createElement("strong");
      label.textContent = change.label;

      const values = document.createElement("span");
      values.textContent = formatValue(change.before) + " → " + formatValue(change.after);

      row.append(label, values);
      changes.append(row);
    });

    container.append(changes);
  }

  function renderFossilStep(container, step, fromEdition, toEdition) {
    const missing = [];
    if (!fromEdition) missing.push(step.from);
    if (!toEdition) missing.push(step.to);

    const warning = document.createElement("p");
    warning.className = "threadnotes-fossil-v22";
    warning.textContent =
      "Lineage relation retained, but compact summary detail is unavailable for " +
      missing.join(" and ") +
      ". No field-level changes are reconstructed from the edition code.";
    container.append(warning);
  }

  function render() {
    const panel = ensurePanel();
    if (!panel) return;

    const list = document.getElementById("threadnotesListV22");
    if (!list) return;

    const { start, end } = selectedEndpoints();
    const path = shortestPath(start, end);
    const shelf = editionMap();

    list.replaceChildren();

    if (!start || !end) {
      const empty = document.createElement("p");
      empty.className = "control-hint";
      empty.textContent = "Choose Threadwalk endpoints to annotate their lineage path.";
      list.append(empty);
      lastSignature = signature();
      return;
    }

    if (!path) {
      const empty = document.createElement("p");
      empty.className = "control-hint";
      empty.textContent = "No explicit lineage path exists, so there are no thread notes to annotate.";
      list.append(empty);
      lastSignature = signature();
      return;
    }

    if (!path.steps.length) {
      const empty = document.createElement("p");
      empty.className = "control-hint";
      empty.textContent = "Start and end are the same edition; there is no lineage edge to annotate.";
      list.append(empty);
      lastSignature = signature();
      return;
    }

    path.steps.forEach((step, index) => {
      const card = document.createElement("article");
      card.className = "threadnotes-card-v22";

      const header = document.createElement("div");
      header.className = "threadnotes-card-heading-v22";

      const title = document.createElement("strong");
      title.textContent = "Thread " + (index + 1) + " · " + step.from + " → " + step.to;

      const meta = document.createElement("span");
      meta.textContent =
        (step.direction === "forward" ? "parent → child" : "child → parent") +
        " · " + step.relation.lens;

      header.append(title, meta);
      card.append(header);

      const fromEdition = shelf.get(step.from) || null;
      const toEdition = shelf.get(step.to) || null;

      if (fromEdition && toEdition) {
        renderRetainedStep(card, step, fromEdition, toEdition);
        card.dataset.detail = "retained";
      } else {
        renderFossilStep(card, step, fromEdition, toEdition);
        card.dataset.detail = "fossil";
      }

      list.append(card);
    });

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
    if (next !== lastSignature || !document.getElementById("threadnotesPanelV22")) render();
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
    if (next !== lastSignature || !document.getElementById("threadnotesPanelV22")) render();
  }, 420);

  if (galleryOpen()) render();
})();