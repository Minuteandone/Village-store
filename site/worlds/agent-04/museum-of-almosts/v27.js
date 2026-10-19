(() => {
  "use strict";

  const EDITION_KEY = "agent04-museum-editions-v10";
  const LINEAGE_KEY = "agent04-museum-edition-lineage-v15";
  const MAX_RELATIONS = 6;
  const SHELF_LIMIT = 4;
  const HORIZON = 4;

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

  function retainedEditions() {
    const raw = readJson(EDITION_KEY, null);
    if (!raw || !Array.isArray(raw.editions)) return [];

    return raw.editions.filter(item =>
      item &&
      typeof item === "object" &&
      codePattern.test(item.code || "") &&
      validLenses.has(item.lens) &&
      validSummary(item.summary)
    ).slice(-SHELF_LIMIT);
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

  function selectedEndpoints() {
    return {
      start: document.getElementById("threadwalkStartV21")?.value || "",
      end: document.getElementById("threadwalkEndV21")?.value || ""
    };
  }

  function graphCodes() {
    const codes = new Set(retainedEditions().map(item => item.code));
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
      graph.get(relation.parentCode).push({ code: relation.childCode, relation });
      graph.get(relation.childCode).push({ code: relation.parentCode, relation });
    });

    return graph;
  }

  function relationKey(relation) {
    return relation.parentCode + ">" + relation.childCode;
  }

  function shortestPath(start, end) {
    const graph = adjacency();

    if (!start || !end || !graph.has(start) || !graph.has(end)) return null;
    if (start === end) return { relations: [] };

    const queue = [start];
    const previous = new Map([[start, null]]);
    const via = new Map();

    while (queue.length) {
      const current = queue.shift();

      for (const edge of graph.get(current) || []) {
        if (previous.has(edge.code)) continue;

        previous.set(edge.code, current);
        via.set(edge.code, edge.relation);

        if (edge.code === end) {
          queue.length = 0;
          break;
        }

        queue.push(edge.code);
      }
    }

    if (!previous.has(end)) return null;

    const pathRelations = [];
    let cursor = end;

    while (cursor !== null) {
      const relation = via.get(cursor);
      if (relation) pathRelations.push(relation);
      cursor = previous.get(cursor);
    }

    pathRelations.reverse();
    return { relations: pathRelations };
  }

  function futureRetainedCodes(printCount) {
    const shelf = retainedEditions();
    const evictions = Math.max(0, shelf.length + printCount - SHELF_LIMIT);
    return new Set(shelf.slice(evictions).map(item => item.code));
  }

  function classifyRelation(relation, retainedCodes) {
    const parent = retainedCodes.has(relation.parentCode);
    const child = retainedCodes.has(relation.childCode);
    if (parent && child) return "documented";
    if (parent || child) return "partial";
    return "lineage-only";
  }

  function countsFor(relationList, retainedCodes) {
    const counts = { documented: 0, partial: 0, lineageOnly: 0 };

    relationList.forEach(relation => {
      const kind = classifyRelation(relation, retainedCodes);
      if (kind === "documented") counts.documented += 1;
      else if (kind === "partial") counts.partial += 1;
      else counts.lineageOnly += 1;
    });

    return counts;
  }

  function horizon() {
    const rels = relations();
    const { start, end } = selectedEndpoints();
    const path = shortestPath(start, end);
    const pathRelations = path?.relations || [];

    return Array.from({ length: HORIZON + 1 }, (_, printCount) => {
      const retainedCodes = futureRetainedCodes(printCount);
      return {
        printCount,
        retained: retainedCodes.size,
        global: countsFor(rels, retainedCodes),
        route: countsFor(pathRelations, retainedCodes),
        routeEdges: pathRelations.length
      };
    });
  }

  function total(counts) {
    return counts.documented + counts.partial + counts.lineageOnly;
  }

  function firstRouteLoss(rows) {
    if (!rows[0]?.routeEdges) return null;
    const baseline = rows[0].route.documented;
    return rows.find(row => row.printCount > 0 && row.route.documented < baseline)?.printCount || null;
  }

  function firstGlobalLoss(rows) {
    const baseline = rows[0]?.global.documented || 0;
    return rows.find(row => row.printCount > 0 && row.global.documented < baseline)?.printCount || null;
  }

  function setText(node, value) {
    const text = String(value);
    if (node && node.textContent !== text) node.textContent = text;
  }

  function ensurePanel() {
    const threadwalk = document.getElementById("threadwalkPanelV21");
    if (!threadwalk) return null;

    let panel = document.getElementById("horizonPanelV27");
    if (panel) return panel;

    panel = document.createElement("section");
    panel.id = "horizonPanelV27";
    panel.className = "horizon-panel-v27";

    const heading = document.createElement("div");
    heading.className = "horizon-heading-v27";

    const label = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "FOSSILIZATION HORIZON · v2.7";

    const title = document.createElement("h4");
    title.textContent = "How quickly would today's evidence fossilize?";

    label.append(eyebrow, title);

    const badge = document.createElement("strong");
    badge.id = "horizonBadgeV27";
    badge.className = "horizon-badge-v27";

    heading.append(label, badge);

    const status = document.createElement("p");
    status.id = "horizonStatusV27";
    status.className = "horizon-status-v27";

    const rows = document.createElement("div");
    rows.id = "horizonRowsV27";
    rows.className = "horizon-rows-v27";

    const note = document.createElement("p");
    note.className = "control-hint";
    note.textContent = "Horizon applies only the existing four-summary FIFO shelf rule to today's retained summaries. Hypothetical future editions are not added to the lineage graph, because no future relation is assumed.";

    panel.append(heading, status, rows, note);

    const preservation = document.getElementById("preservationPanelV26");
    const forecast = document.getElementById("forecastPanelV25");
    if (preservation?.nextSibling) threadwalk.insertBefore(panel, preservation.nextSibling);
    else if (preservation) threadwalk.append(panel);
    else if (forecast?.nextSibling) threadwalk.insertBefore(panel, forecast.nextSibling);
    else threadwalk.append(panel);

    return panel;
  }

  function bar(counts) {
    const wrap = document.createElement("div");
    wrap.className = "horizon-bar-v27";
    const count = total(counts);

    if (!count) {
      const empty = document.createElement("span");
      empty.className = "horizon-bar-empty-v27";
      wrap.append(empty);
      return wrap;
    }

    [
      ["documented", counts.documented],
      ["partial", counts.partial],
      ["lineage-only", counts.lineageOnly]
    ].forEach(([kind, value]) => {
      if (!value) return;
      const segment = document.createElement("span");
      segment.dataset.kind = kind;
      segment.style.flexGrow = String(value);
      segment.title = kind + ": " + value;
      wrap.append(segment);
    });

    return wrap;
  }

  function renderRows(data) {
    const node = document.getElementById("horizonRowsV27");
    if (!node) return;
    node.replaceChildren();

    data.forEach(row => {
      const item = document.createElement("div");
      item.className = "horizon-row-v27";
      item.dataset.step = String(row.printCount);

      const step = document.createElement("strong");
      step.textContent = row.printCount === 0 ? "NOW" : "+" + row.printCount + " PRINT" + (row.printCount === 1 ? "" : "S");

      const shelf = document.createElement("span");
      shelf.textContent = row.retained + " current summaries survive";

      const globalBar = bar(row.global);
      globalBar.dataset.scope = "gallery";

      const globalMeta = document.createElement("em");
      globalMeta.textContent =
        "G " + row.global.documented + "/" + row.global.partial + "/" + row.global.lineageOnly;

      const routeBar = bar(row.route);
      routeBar.dataset.scope = "route";

      const routeMeta = document.createElement("em");
      routeMeta.textContent = row.routeEdges
        ? "R " + row.route.documented + "/" + row.route.partial + "/" + row.route.lineageOnly
        : "R —";

      item.append(step, shelf, globalBar, globalMeta, routeBar, routeMeta);
      node.append(item);
    });
  }

  function render() {
    const panel = ensurePanel();
    if (!panel) return;

    const data = horizon();
    const routeLoss = firstRouteLoss(data);
    const globalLoss = firstGlobalLoss(data);
    const badge = document.getElementById("horizonBadgeV27");
    const status = document.getElementById("horizonStatusV27");

    if (routeLoss !== null) {
      setText(badge, "route loss +" + routeLoss);
      if (badge) badge.dataset.risk = "route";
    } else if (globalLoss !== null) {
      setText(badge, "gallery loss +" + globalLoss);
      if (badge) badge.dataset.risk = "gallery";
    } else {
      setText(badge, "no documented loss");
      if (badge) badge.dataset.risk = "none";
    }

    const current = data[0];
    const last = data[data.length - 1];

    setText(
      status,
      "Existing explicit lineage: " +
      current.global.documented + " documented / " +
      current.global.partial + " partial / " +
      current.global.lineageOnly + " lineage-only now. After +" + HORIZON +
      " distinct prints, today's surviving summaries would leave " +
      last.global.documented + " documented / " +
      last.global.partial + " partial / " +
      last.global.lineageOnly + " lineage-only."
    );

    renderRows(data);
    lastSignature = signature();
  }

  function signature() {
    const { start, end } = selectedEndpoints();
    const shelf = retainedEditions().map(item => item.code + ":" + item.lens).join("|");
    const rels = relations().map(item => item.parentCode + ">" + item.childCode + ":" + item.lens).join("|");
    return start + "::" + end + "::" + shelf + "::" + rels;
  }

  function galleryOpen() {
    return Boolean(document.getElementById("galleryDialogV20")?.open);
  }

  const observer = new MutationObserver(() => {
    if (!galleryOpen()) return;
    const next = signature();
    if (next !== lastSignature || !document.getElementById("horizonPanelV27")) render();
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
    if (next !== lastSignature || !document.getElementById("horizonPanelV27")) render();
  }, 510);

  if (galleryOpen()) render();
})();