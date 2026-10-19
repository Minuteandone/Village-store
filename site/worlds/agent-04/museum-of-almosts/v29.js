(() => {
  "use strict";

  const EDITION_KEY = "agent04-museum-editions-v10";
  const LINEAGE_KEY = "agent04-museum-edition-lineage-v15";
  const SHELF_LIMIT = 4;
  const MAX_RELATIONS = 6;

  const codePattern = /^ED1-[A-Z0-9]{5,10}-[A-Z0-9]{4,9}$/;
  const validLenses = new Set(["possibility", "provenance", "architecture"]);
  const evidenceRank = new Map([
    ["lineage-only", 0],
    ["partial", 1],
    ["documented", 2]
  ]);

  let pending = null;
  let lastAudit = null;
  let lastRenderedSignature = "";

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
    ).slice(-SHELF_LIMIT);
  }

  function relationKey(relation) {
    return relation.parentCode + ">" + relation.childCode;
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
      const key = relationKey(item);
      if (seen.has(key)) return;
      seen.add(key);
      result.push({
        parentCode: item.parentCode,
        childCode: item.childCode,
        lens: item.lens,
        createdAt: item.createdAt
      });
    });

    return result;
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

  function downgradeSet(rels, beforeSet, afterSet) {
    return rels.map(relation => {
      const before = classifyRelation(relation, beforeSet);
      const after = classifyRelation(relation, afterSet);
      return { relation, before, after };
    }).filter(item => downgraded(item.before, item.after));
  }

  function changeKey(item) {
    return relationKey(item.relation) + ":" + item.before + ">" + item.after;
  }

  function sameChangeSet(a, b) {
    const aa = new Set(a.map(changeKey));
    const bb = new Set(b.map(changeKey));
    if (aa.size !== bb.size) return false;
    return Array.from(aa).every(key => bb.has(key));
  }

  function captureForecast() {
    const beforeEditions = editions();
    const beforeCodes = beforeEditions.map(item => item.code);
    const beforeSet = new Set(beforeCodes);
    const preRelations = relations();

    const predictedEvictedCode = beforeCodes.length >= SHELF_LIMIT ? beforeCodes[0] : null;
    const predictedRetained = new Set(
      beforeCodes.length >= SHELF_LIMIT ? beforeCodes.slice(1) : beforeCodes
    );

    pending = {
      beforeCodes,
      relations: preRelations,
      predictedEvictedCode,
      predictedChanges: downgradeSet(preRelations, beforeSet, predictedRetained),
      capturedAt: Date.now()
    };

    setTimeout(settleAudit, 90);
  }

  function settleAudit() {
    if (!pending) return;

    const before = pending;
    pending = null;

    const afterCodes = editions().map(item => item.code);
    const beforeSet = new Set(before.beforeCodes);
    const afterSet = new Set(afterCodes);
    const addedCodes = afterCodes.filter(code => !beforeSet.has(code));

    if (!addedCodes.length) return;

    const actualEvictedCode = before.beforeCodes.find(code => !afterSet.has(code)) || null;
    const actualChanges = downgradeSet(before.relations, beforeSet, afterSet);

    const shelfMatch = before.predictedEvictedCode === actualEvictedCode;
    const evidenceMatch = sameChangeSet(before.predictedChanges, actualChanges);
    const addedSet = new Set(addedCodes);
    const addedCodeTouchedOldRelation = before.relations.some(relation =>
      addedSet.has(relation.parentCode) || addedSet.has(relation.childCode)
    );

    const outsideForecastBoundary = !evidenceMatch && addedCodeTouchedOldRelation;
    const result =
      shelfMatch && evidenceMatch ? "match" :
      shelfMatch && outsideForecastBoundary ? "bounded" :
      "check";

    lastAudit = {
      addedCode: addedCodes[addedCodes.length - 1],
      predictedEvictedCode: before.predictedEvictedCode,
      actualEvictedCode,
      predictedChanges: before.predictedChanges,
      actualChanges,
      shelfMatch,
      evidenceMatch,
      outsideForecastBoundary,
      capturedAt: before.capturedAt
    };

    window.dispatchEvent(new CustomEvent("museum:forecast-audit-v29", {
      detail: {
        result,
        shelfMatch,
        evidenceMatch,
        outsideForecastBoundary,
        predictedDowngrades: before.predictedChanges.length,
        actualDowngrades: actualChanges.length,
        capturedAt: before.capturedAt,
        settledAt: Date.now()
      }
    }));

    renderAll();
  }

  function setText(node, value) {
    const text = String(value);
    if (node && node.textContent !== text) node.textContent = text;
  }

  function ensurePanel() {
    const dialog = document.getElementById("editionDialogV10");
    if (!dialog) return null;

    let panel = document.getElementById("forecastAuditPanelV29");
    if (panel) return panel;

    panel = document.createElement("section");
    panel.id = "forecastAuditPanelV29";
    panel.className = "forecast-audit-panel-v29";
    panel.hidden = true;

    const heading = document.createElement("div");
    heading.className = "forecast-audit-heading-v29";

    const labels = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "FORECAST AUDIT · v2.9";
    const title = document.createElement("h4");
    title.textContent = "Did the forecast match the print?";
    labels.append(eyebrow, title);

    const badge = document.createElement("strong");
    badge.id = "forecastAuditBadgeV29";
    badge.className = "forecast-audit-badge-v29";

    heading.append(labels, badge);

    const summary = document.createElement("p");
    summary.id = "forecastAuditSummaryV29";
    summary.className = "forecast-audit-summary-v29";

    const facts = document.createElement("div");
    facts.id = "forecastAuditFactsV29";
    facts.className = "forecast-audit-facts-v29";

    const changes = document.createElement("div");
    changes.id = "forecastAuditChangesV29";
    changes.className = "forecast-audit-changes-v29";

    const boundary = document.createElement("p");
    boundary.id = "forecastAuditBoundaryV29";
    boundary.className = "control-hint";

    panel.append(heading, summary, facts, changes, boundary);

    const receipt = document.getElementById("receiptPanelV28");
    const actions = dialog.querySelector(".edition-actions-v10");
    if (receipt) receipt.insertAdjacentElement("afterend", panel);
    else if (actions) dialog.insertBefore(panel, actions);
    else dialog.append(panel);

    return panel;
  }

  function fact(label, predicted, actual, match) {
    const item = document.createElement("div");
    item.className = "forecast-audit-fact-v29";
    item.dataset.match = match ? "true" : "false";

    const key = document.createElement("span");
    key.textContent = label;

    const values = document.createElement("strong");
    values.textContent = "forecast " + predicted + " · actual " + actual;

    item.append(key, values);
    return item;
  }

  function renderChanges(audit) {
    const node = document.getElementById("forecastAuditChangesV29");
    if (!node) return;
    node.replaceChildren();

    const predicted = new Map(audit.predictedChanges.map(item => [changeKey(item), item]));
    const actual = new Map(audit.actualChanges.map(item => [changeKey(item), item]));
    const keys = Array.from(new Set([...predicted.keys(), ...actual.keys()]));

    if (!keys.length) {
      const safe = document.createElement("div");
      safe.className = "forecast-audit-safe-v29";
      safe.textContent = "Neither forecast nor actual print produced a downgrade among pre-print lineage relations.";
      node.append(safe);
      return;
    }

    keys.forEach(key => {
      const predictedItem = predicted.get(key);
      const actualItem = actual.get(key);
      const item = predictedItem || actualItem;

      const row = document.createElement("div");
      row.className = "forecast-audit-change-v29";
      row.dataset.predicted = predictedItem ? "true" : "false";
      row.dataset.actual = actualItem ? "true" : "false";

      const relation = document.createElement("strong");
      relation.textContent = item.relation.parentCode + " → " + item.relation.childCode;

      const states = document.createElement("span");
      states.textContent = item.before + " → " + item.after;

      const verdict = document.createElement("em");
      verdict.textContent =
        predictedItem && actualItem ? "forecast + actual" :
        predictedItem ? "forecast only" :
        "actual only";

      row.append(relation, states, verdict);
      node.append(row);
    });
  }

  function renderAudit() {
    const panel = ensurePanel();
    if (!panel) return;

    if (!lastAudit) {
      panel.hidden = true;
      return;
    }

    panel.hidden = false;
    const audit = lastAudit;
    const badge = document.getElementById("forecastAuditBadgeV29");
    const summary = document.getElementById("forecastAuditSummaryV29");
    const facts = document.getElementById("forecastAuditFactsV29");
    const boundary = document.getElementById("forecastAuditBoundaryV29");

    const exact = audit.shelfMatch && audit.evidenceMatch;
    const bounded = audit.shelfMatch && !audit.evidenceMatch && audit.outsideForecastBoundary;

    if (badge) {
      badge.dataset.result = exact ? "match" : bounded ? "bounded" : "check";
      setText(badge, exact ? "MATCH" : bounded ? "BOUNDED" : "CHECK");
    }

    setText(
      summary,
      exact
        ? "The deterministic Accession Forecast matched the actual shelf eviction and every pre-print lineage evidence downgrade."
        : bounded
          ? "The known shelf eviction matched, but the new edition code changed a pre-existing lineage endpoint. That effect was outside v2.5's forecast boundary because future edition codes are never invented."
          : "Observed post-print evidence did not match the deterministic forecast. Inspect the differences below."
    );

    if (facts) {
      facts.replaceChildren(
        fact(
          "shelf eviction",
          audit.predictedEvictedCode || "none",
          audit.actualEvictedCode || "none",
          audit.shelfMatch
        ),
        fact(
          "evidence downgrades",
          String(audit.predictedChanges.length),
          String(audit.actualChanges.length),
          audit.evidenceMatch
        )
      );
    }

    renderChanges(audit);

    setText(
      boundary,
      "Audit compares only the bounded four-edition FIFO shelf and lineage relations that existed before the print. It does not grade newly recorded post-print lineage as something the forecast should have predicted."
    );
  }

  function decoratePress() {
    const button = document.getElementById("printEditionV10");
    if (!button) return;
    button.dataset.forecastAudit = "armed";
    button.title = "Print; v2.9 will compare the pre-print forecast with the actual bounded shelf result.";
  }

  function signature() {
    if (!lastAudit) return "none";
    return [
      lastAudit.addedCode,
      lastAudit.predictedEvictedCode || "-",
      lastAudit.actualEvictedCode || "-",
      lastAudit.predictedChanges.map(changeKey).join(","),
      lastAudit.actualChanges.map(changeKey).join(","),
      lastAudit.outsideForecastBoundary ? "bounded" : "ordinary"
    ].join("|");
  }

  function renderAll() {
    ensurePanel();
    renderAudit();
    decoratePress();
    lastRenderedSignature = signature();
  }

  document.addEventListener("click", event => {
    if (event.target?.id === "printEditionV10") captureForecast();
  }, true);

  const observer = new MutationObserver(() => {
    const next = signature();
    if (next !== lastRenderedSignature || (lastAudit && !document.getElementById("forecastAuditPanelV29"))) {
      renderAll();
    } else {
      decoratePress();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  setInterval(() => {
    const next = signature();
    if (next !== lastRenderedSignature || (lastAudit && !document.getElementById("forecastAuditPanelV29"))) {
      renderAll();
    } else {
      decoratePress();
    }
  }, 360);

  ensurePanel();
  renderAll();
})();