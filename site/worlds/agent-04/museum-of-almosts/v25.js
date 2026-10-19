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

  function retainedSetAfterNextPrint() {
    const shelf = retainedEditions();
    if (shelf.length < SHELF_LIMIT) return new Set(shelf.map(item => item.code));
    return new Set(shelf.slice(1).map(item => item.code));
  }

  function evictionCandidate() {
    const shelf = retainedEditions();
    return shelf.length >= SHELF_LIMIT ? shelf[0] : null;
  }

  function classifyRelation(relation, retainedCodes) {
    const parent = retainedCodes.has(relation.parentCode);
    const child = retainedCodes.has(relation.childCode);
    if (parent && child) return "documented";
    if (parent || child) return "partial";
    return "lineage-only";
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

    const nodes = [];
    const pathRelations = [];
    let cursor = end;

    while (cursor !== null) {
      nodes.push(cursor);
      const relation = via.get(cursor);
      if (relation) pathRelations.push(relation);
      cursor = previous.get(cursor);
    }

    nodes.reverse();
    pathRelations.reverse();
    return { nodes, relations: pathRelations };
  }

  function downgrade(before, after) {
    return (evidenceRank.get(after) ?? -1) < (evidenceRank.get(before) ?? -1);
  }

  function forecast() {
    const shelf = retainedEditions();
    const candidate = evictionCandidate();
    const nowSet = new Set(shelf.map(item => item.code));
    const futureSet = retainedSetAfterNextPrint();
    const rels = relations();

    const globalChanges = rels.map(relation => {
      const before = classifyRelation(relation, nowSet);
      const after = classifyRelation(relation, futureSet);
      return { relation, before, after, downgraded: downgrade(before, after) };
    }).filter(item => item.downgraded);

    const { start, end } = selectedEndpoints();
    const path = shortestPath(start, end);
    const pathChanges = path
      ? path.relations.map(relation => {
          const before = classifyRelation(relation, nowSet);
          const after = classifyRelation(relation, futureSet);
          return { relation, before, after, downgraded: downgrade(before, after) };
        }).filter(item => item.downgraded)
      : [];

    return {
      shelf,
      candidate,
      nowSet,
      futureSet,
      globalChanges,
      path,
      pathChanges,
      freeSlot: shelf.length < SHELF_LIMIT
    };
  }

  function setText(node, value) {
    const text = String(value);
    if (node && node.textContent !== text) node.textContent = text;
  }

  function ensurePanel() {
    const threadwalk = document.getElementById("threadwalkPanelV21");
    if (!threadwalk) return null;

    let panel = document.getElementById("forecastPanelV25");
    if (panel) return panel;

    panel = document.createElement("section");
    panel.id = "forecastPanelV25";
    panel.className = "forecast-panel-v25";

    const heading = document.createElement("div");
    heading.className = "forecast-heading-v25";

    const textWrap = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "ACCESSION FORECAST · v2.5";

    const title = document.createElement("h4");
    title.textContent = "What would one more edition cost?";

    textWrap.append(eyebrow, title);

    const badge = document.createElement("strong");
    badge.id = "forecastBadgeV25";
    badge.className = "forecast-badge-v25";

    heading.append(textWrap, badge);

    const status = document.createElement("p");
    status.id = "forecastStatusV25";
    status.className = "forecast-status-v25";

    const candidate = document.createElement("div");
    candidate.id = "forecastCandidateV25";
    candidate.className = "forecast-candidate-v25";

    const impacts = document.createElement("div");
    impacts.id = "forecastImpactsV25";
    impacts.className = "forecast-impacts-v25";

    const note = document.createElement("p");
    note.className = "control-hint";
    note.textContent = "Forecast simulates only the four-edition shelf eviction caused by one additional distinct print. It does not invent the future edition, a future lineage relation, or any future summary values.";

    panel.append(heading, status, candidate, impacts, note);

    const evidence = document.getElementById("evidencePanelV24");
    const lantern = document.getElementById("lanternPanelV23");
    if (evidence?.nextSibling) threadwalk.insertBefore(panel, evidence.nextSibling);
    else if (evidence) threadwalk.append(panel);
    else if (lantern?.nextSibling) threadwalk.insertBefore(panel, lantern.nextSibling);
    else threadwalk.append(panel);

    return panel;
  }

  function relationLabel(relation) {
    return relation.parentCode + " → " + relation.childCode;
  }

  function renderImpacts(data) {
    const node = document.getElementById("forecastImpactsV25");
    if (!node) return;
    node.replaceChildren();

    if (data.freeSlot) {
      const safe = document.createElement("div");
      safe.className = "forecast-safe-v25";
      safe.textContent = "No retained edition would age off. The shelf still has an empty slot.";
      node.append(safe);
      return;
    }

    if (!data.globalChanges.length) {
      const safe = document.createElement("div");
      safe.className = "forecast-safe-v25";
      safe.textContent = "The oldest summary would age off, but none of the retained explicit lineage edges would lose an evidence level.";
      node.append(safe);
      return;
    }

    data.globalChanges.forEach(item => {
      const row = document.createElement("div");
      row.className = "forecast-impact-v25";
      row.dataset.path = String(
        data.pathChanges.some(pathItem =>
          pathItem.relation.parentCode === item.relation.parentCode &&
          pathItem.relation.childCode === item.relation.childCode
        )
      );

      const relation = document.createElement("strong");
      relation.textContent = relationLabel(item.relation);

      const change = document.createElement("span");
      change.textContent = item.before + " → " + item.after;

      const marker = document.createElement("em");
      marker.textContent = row.dataset.path === "true" ? "CURRENT WALK" : "gallery";

      row.append(relation, change, marker);
      node.append(row);
    });
  }

  function render() {
    const panel = ensurePanel();
    if (!panel) return;

    const data = forecast();
    const badge = document.getElementById("forecastBadgeV25");
    const status = document.getElementById("forecastStatusV25");
    const candidate = document.getElementById("forecastCandidateV25");

    if (data.freeSlot) {
      setText(badge, "no eviction");
      if (badge) badge.dataset.risk = "none";
      setText(status, data.shelf.length + "/" + SHELF_LIMIT + " compact edition summaries retained. One more distinct print fits without aging anything off.");
      setText(candidate, "Next print keeps all currently retained summaries.");
    } else {
      const pathCount = data.pathChanges.length;
      const globalCount = data.globalChanges.length;
      const risk = globalCount === 0 ? "low" : pathCount ? "route" : "gallery";

      setText(badge, risk === "route" ? "route evidence at risk" : risk === "gallery" ? "gallery evidence at risk" : "summary eviction");
      if (badge) badge.dataset.risk = risk;

      setText(
        status,
        "One more distinct print would evict the oldest retained summary and downgrade " +
        globalCount + " explicit lineage edge" + (globalCount === 1 ? "" : "s") +
        (pathCount ? ", including " + pathCount + " on the current Threadwalk." : ".")
      );

      if (candidate) {
        candidate.replaceChildren();

        const label = document.createElement("span");
        label.textContent = "NEXT SUMMARY TO AGE OFF";

        const code = document.createElement("strong");
        code.textContent = data.candidate.code;

        const meta = document.createElement("em");
        meta.textContent = data.candidate.lens + " · currently retained";

        candidate.append(label, code, meta);
      }
    }

    renderImpacts(data);
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
    if (next !== lastSignature || !document.getElementById("forecastPanelV25")) render();
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
    if (next !== lastSignature || !document.getElementById("forecastPanelV25")) render();
  }, 470);

  if (galleryOpen()) render();
})();