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

  let pending = null;
  let lastReceipt = null;
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

  function relationKey(relation) {
    return relation.parentCode + ">" + relation.childCode;
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

  function captureBeforePrint() {
    const beforeEditions = editions();
    pending = {
      editionCodes: beforeEditions.map(item => item.code),
      relations: relations(),
      capturedAt: Date.now()
    };

    setTimeout(settleReceipt, 25);
  }

  function settleReceipt() {
    if (!pending) return;

    const before = pending;
    pending = null;

    const afterEditions = editions();
    const beforeSet = new Set(before.editionCodes);
    const afterCodes = afterEditions.map(item => item.code);
    const afterSet = new Set(afterCodes);

    const added = afterCodes.filter(code => !beforeSet.has(code));
    if (!added.length) return;

    const evicted = before.editionCodes.filter(code => !afterSet.has(code));

    const evidenceChanges = before.relations.map(relation => {
      const beforeKind = classifyRelation(relation, beforeSet);
      const afterKind = classifyRelation(relation, afterSet);
      return {
        relation,
        before: beforeKind,
        after: afterKind,
        downgraded: downgraded(beforeKind, afterKind)
      };
    }).filter(item => item.downgraded);

    const beforeRelationKeys = new Set(before.relations.map(relationKey));
    const newRelations = relations().filter(relation => !beforeRelationKeys.has(relationKey(relation)));

    lastReceipt = {
      addedCode: added[added.length - 1],
      evictedCode: evicted[0] || null,
      evidenceChanges,
      newRelationCount: newRelations.length,
      beforeCount: before.editionCodes.length,
      afterCount: afterCodes.length,
      capturedAt: before.capturedAt
    };

    renderAll();
  }

  function setText(node, value) {
    const text = String(value);
    if (node && node.textContent !== text) node.textContent = text;
  }

  function ensurePanel() {
    const dialog = document.getElementById("editionDialogV10");
    if (!dialog) return null;

    let panel = document.getElementById("receiptPanelV28");
    if (panel) return panel;

    panel = document.createElement("section");
    panel.id = "receiptPanelV28";
    panel.className = "receipt-panel-v28";
    panel.hidden = true;

    const heading = document.createElement("div");
    heading.className = "receipt-heading-v28";

    const label = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "ACCESSION RECEIPT · v2.8";

    const title = document.createElement("h4");
    title.textContent = "What actually changed when you printed?";

    label.append(eyebrow, title);

    const badge = document.createElement("strong");
    badge.id = "receiptBadgeV28";
    badge.className = "receipt-badge-v28";

    heading.append(label, badge);

    const summary = document.createElement("p");
    summary.id = "receiptSummaryV28";
    summary.className = "receipt-summary-v28";

    const facts = document.createElement("div");
    facts.id = "receiptFactsV28";
    facts.className = "receipt-facts-v28";

    const impacts = document.createElement("div");
    impacts.id = "receiptImpactsV28";
    impacts.className = "receipt-impacts-v28";

    const note = document.createElement("p");
    note.className = "control-hint";
    note.textContent = "Receipt compares only the shelf and explicit lineage relations that existed immediately before this print. Any new relation recorded after printing is acknowledged but is not retroactively treated as pre-print evidence.";

    panel.append(heading, summary, facts, impacts, note);

    const actions = dialog.querySelector(".edition-actions-v10");
    if (actions) dialog.insertBefore(panel, actions);
    else dialog.append(panel);

    return panel;
  }

  function fact(label, value) {
    const item = document.createElement("div");
    const key = document.createElement("span");
    key.textContent = label;
    const val = document.createElement("strong");
    val.textContent = value;
    item.append(key, val);
    return item;
  }

  function renderFacts(receipt) {
    const node = document.getElementById("receiptFactsV28");
    if (!node) return;
    node.replaceChildren();

    node.append(
      fact("added", receipt.addedCode),
      fact("aged off", receipt.evictedCode || "none"),
      fact("shelf", receipt.beforeCount + " → " + receipt.afterCount),
      fact("evidence losses", String(receipt.evidenceChanges.length))
    );
  }

  function renderImpacts(receipt) {
    const node = document.getElementById("receiptImpactsV28");
    if (!node) return;
    node.replaceChildren();

    if (!receipt.evidenceChanges.length) {
      const safe = document.createElement("div");
      safe.className = "receipt-safe-v28";
      safe.textContent = "No lineage relation that existed before this print lost an evidence level.";
      node.append(safe);
    } else {
      receipt.evidenceChanges.forEach(item => {
        const row = document.createElement("div");
        row.className = "receipt-impact-v28";

        const relation = document.createElement("strong");
        relation.textContent = item.relation.parentCode + " → " + item.relation.childCode;

        const change = document.createElement("span");
        change.textContent = item.before + " → " + item.after;

        row.append(relation, change);
        node.append(row);
      });
    }

    if (receipt.newRelationCount) {
      const newNote = document.createElement("div");
      newNote.className = "receipt-new-lineage-v28";
      newNote.textContent =
        receipt.newRelationCount + " new lineage relation" +
        (receipt.newRelationCount === 1 ? " was" : "s were") +
        " recorded after the print and therefore sit outside this pre-print evidence comparison.";
      node.append(newNote);
    }
  }

  function renderReceipt() {
    const panel = ensurePanel();
    if (!panel) return;

    if (!lastReceipt) {
      panel.hidden = true;
      return;
    }

    panel.hidden = false;
    const receipt = lastReceipt;
    const badge = document.getElementById("receiptBadgeV28");
    const summary = document.getElementById("receiptSummaryV28");

    const lossCount = receipt.evidenceChanges.length;
    setText(badge, lossCount ? lossCount + " evidence loss" + (lossCount === 1 ? "" : "es") : "no evidence loss");
    if (badge) badge.dataset.loss = lossCount ? "yes" : "no";

    setText(
      summary,
      receipt.evictedCode
        ? "The print added " + receipt.addedCode + " and aged off " + receipt.evictedCode + "."
        : "The print added " + receipt.addedCode + " without aging off a retained summary."
    );

    renderFacts(receipt);
    renderImpacts(receipt);
  }

  function decoratePress() {
    const press = document.querySelector(".edition-press-v10");
    if (!press) return;

    let badge = press.querySelector(".accession-receipt-badge-v28");
    if (!lastReceipt) {
      badge?.remove();
      return;
    }

    if (!badge) {
      badge = document.createElement("span");
      badge.className = "accession-receipt-badge-v28";
      badge.textContent = "RECEIPT";
      badge.setAttribute("aria-hidden", "true");
      press.append(badge);
    }

    badge.dataset.loss = lastReceipt.evidenceChanges.length ? "yes" : "no";
    badge.title = lastReceipt.evidenceChanges.length
      ? "Last print caused " + lastReceipt.evidenceChanges.length + " pre-existing evidence downgrade(s)."
      : "Last print caused no pre-existing evidence downgrade.";
  }

  function renderAll() {
    renderReceipt();
    decoratePress();
    lastRenderedSignature = signature();
  }

  function signature() {
    if (!lastReceipt) return "none";
    return [
      lastReceipt.addedCode,
      lastReceipt.evictedCode || "-",
      lastReceipt.evidenceChanges.map(item => relationKey(item.relation) + ":" + item.before + ">" + item.after).join(","),
      lastReceipt.newRelationCount
    ].join("|");
  }

  document.addEventListener("click", event => {
    if (event.target?.id === "printEditionV10") captureBeforePrint();
  }, true);

  const observer = new MutationObserver(() => {
    const next = signature();
    if (next !== lastRenderedSignature || (lastReceipt && !document.getElementById("receiptPanelV28"))) {
      renderAll();
    } else {
      decoratePress();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  setInterval(() => {
    const next = signature();
    if (next !== lastRenderedSignature || (lastReceipt && !document.getElementById("receiptPanelV28"))) {
      renderAll();
    } else {
      decoratePress();
    }
  }, 340);

  ensurePanel();
  renderAll();
})();