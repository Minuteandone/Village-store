(() => {
  "use strict";

  const EDITION_KEY = "agent04-museum-editions-v10";
  const LINEAGE_KEY = "agent04-museum-edition-lineage-v15";
  const MAX_RELATIONS = 6;
  const SHELF_LIMIT = 4;

  const codePattern = /^ED1-[A-Z0-9]{5,10}-[A-Z0-9]{4,9}$/;
  const validLenses = new Set(["possibility", "provenance", "architecture"]);
  const evidenceRank = new Map([
    ["lineage-only", 0],
    ["partial", 1],
    ["documented", 2]
  ]);

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

  function selectedEndpoints() {
    return {
      start: document.getElementById("threadwalkStartV21")?.value || "",
      end: document.getElementById("threadwalkEndV21")?.value || ""
    };
  }

  function shortestPath(start, end) {
    const graph = adjacency();

    if (!start || !end || !graph.has(start) || !graph.has(end)) return null;
    if (start === end) return { nodes: [start], relations: [] };

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

  function classifyRelation(relation, retainedCodes) {
    const parent = retainedCodes.has(relation.parentCode);
    const child = retainedCodes.has(relation.childCode);
    if (parent && child) return "documented";
    if (parent || child) return "partial";
    return "lineage-only";
  }

  function downgraded(before, after) {
    return (evidenceRank.get(after) ?? -1) < (evidenceRank.get(before) ?? -1);
  }

  function relationKey(relation) {
    return relation.parentCode + ">" + relation.childCode;
  }

  function removalImpact(code) {
    const shelf = retainedEditions();
    const nowSet = new Set(shelf.map(item => item.code));
    const without = new Set(Array.from(nowSet).filter(item => item !== code));
    const rels = relations();
    const { start, end } = selectedEndpoints();
    const path = shortestPath(start, end);
    const pathKeys = new Set((path?.relations || []).map(relationKey));

    const changed = rels.map(relation => {
      const before = classifyRelation(relation, nowSet);
      const after = classifyRelation(relation, without);
      return {
        relation,
        before,
        after,
        route: pathKeys.has(relationKey(relation)),
        downgraded: downgraded(before, after)
      };
    }).filter(item => item.downgraded);

    return {
      code,
      changed,
      global: changed.length,
      route: changed.filter(item => item.route).length
    };
  }

  function loadClass(impact) {
    if (impact.route > 0) return "route-bearing";
    if (impact.global >= 2) return "load-bearing";
    if (impact.global === 1) return "supporting";
    return "isolated";
  }

  function loadLabel(impact) {
    if (impact.route > 0) return "route-bearing";
    if (impact.global >= 2) return "load-bearing";
    if (impact.global === 1) return "supporting";
    return "isolated";
  }

  function impacts() {
    return retainedEditions().map(edition => ({
      edition,
      impact: removalImpact(edition.code)
    }));
  }

  function setText(node, value) {
    const text = String(value);
    if (node && node.textContent !== text) node.textContent = text;
  }

  function ensurePanel() {
    const threadwalk = document.getElementById("threadwalkPanelV21");
    if (!threadwalk) return null;

    let panel = document.getElementById("preservationPanelV26");
    if (panel) return panel;

    panel = document.createElement("section");
    panel.id = "preservationPanelV26";
    panel.className = "preservation-panel-v26";

    const heading = document.createElement("div");
    heading.className = "preservation-heading-v26";

    const label = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "PRESERVATION LOAD · v2.6";

    const title = document.createElement("h4");
    title.textContent = "Which summaries are holding up the evidence?";

    label.append(eyebrow, title);

    const status = document.createElement("strong");
    status.id = "preservationStatusV26";
    status.className = "preservation-status-v26";

    heading.append(label, status);

    const list = document.createElement("div");
    list.id = "preservationListV26";
    list.className = "preservation-list-v26";

    const note = document.createElement("p");
    note.className = "control-hint";
    note.textContent = "Preservation Load asks a bounded counterfactual: if exactly one currently retained summary were unavailable, which explicit lineage edges would lose evidence? It does not remove anything or predict why a summary might disappear.";

    panel.append(heading, list, note);

    const forecast = document.getElementById("forecastPanelV25");
    const evidence = document.getElementById("evidencePanelV24");
    if (forecast?.nextSibling) threadwalk.insertBefore(panel, forecast.nextSibling);
    else if (forecast) threadwalk.append(panel);
    else if (evidence?.nextSibling) threadwalk.insertBefore(panel, evidence.nextSibling);
    else threadwalk.append(panel);

    return panel;
  }

  function renderList(data) {
    const list = document.getElementById("preservationListV26");
    if (!list) return;
    list.replaceChildren();

    if (!data.length) {
      const empty = document.createElement("div");
      empty.className = "preservation-empty-v26";
      empty.textContent = "No retained compact edition summaries are available.";
      list.append(empty);
      return;
    }

    data.forEach(({ edition, impact }) => {
      const row = document.createElement("div");
      row.className = "preservation-row-v26";
      row.dataset.load = loadClass(impact);

      const code = document.createElement("strong");
      code.textContent = edition.code;

      const label = document.createElement("span");
      label.textContent = loadLabel(impact);

      const metrics = document.createElement("em");
      metrics.textContent =
        impact.global + " edge" + (impact.global === 1 ? "" : "s") + " depend" +
        (impact.global === 1 ? "s" : "") + " · " +
        impact.route + " on current walk";

      row.append(code, label, metrics);
      list.append(row);
    });
  }

  function decorateGallery(data) {
    const byCode = new Map(data.map(item => [item.edition.code, item.impact]));

    document.querySelectorAll(".gallery-node-v20[data-retained='true']").forEach(node => {
      const code = node.querySelector("strong")?.textContent?.trim() || "";
      const impact = byCode.get(code);
      let badge = node.querySelector(".preservation-badge-v26");

      if (!impact) {
        node.removeAttribute("data-preservation-load");
        badge?.remove();
        return;
      }

      node.dataset.preservationLoad = loadClass(impact);

      if (!badge) {
        badge = document.createElement("span");
        badge.className = "preservation-badge-v26";
        node.append(badge);
      }

      badge.dataset.load = loadClass(impact);
      badge.textContent = impact.global + (impact.route ? " · R" + impact.route : "");
      badge.title =
        loadLabel(impact) + ": removing this retained summary would downgrade " +
        impact.global + " explicit lineage edge" + (impact.global === 1 ? "" : "s") +
        (impact.route ? ", including " + impact.route + " on the current Threadwalk." : ".");
    });
  }

  function render() {
    const panel = ensurePanel();
    if (!panel) return;

    const data = impacts();
    const status = document.getElementById("preservationStatusV26");
    const bearing = data.filter(item => item.impact.global > 0).length;
    const routeBearing = data.filter(item => item.impact.route > 0).length;

    setText(
      status,
      bearing + "/" + data.length + " evidence-bearing" +
      (routeBearing ? " · " + routeBearing + " current-route" : "")
    );

    renderList(data);
    decorateGallery(data);
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
    if (next !== lastSignature || !document.getElementById("preservationPanelV26")) render();
    else decorateGallery(impacts());
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
    if (next !== lastSignature || !document.getElementById("preservationPanelV26")) render();
    else decorateGallery(impacts());
  }, 490);

  if (galleryOpen()) render();
})();