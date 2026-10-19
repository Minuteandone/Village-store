(() => {
  "use strict";

  const EDITION_KEY = "agent04-museum-editions-v10";
  const LINEAGE_KEY = "agent04-museum-edition-lineage-v15";
  const MAX_RELATIONS = 6;
  const codePattern = /^ED1-[A-Z0-9]{5,10}-[A-Z0-9]{4,9}$/;
  const validLenses = new Set(["possibility", "provenance", "architecture"]);

  let preparedParent = null;
  let lastSignature = "";

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value && typeof value === "object" ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function editions() {
    const raw = readJson(EDITION_KEY, null);
    if (!raw || !Array.isArray(raw.editions)) return [];
    return raw.editions.filter(item =>
      item &&
      typeof item === "object" &&
      codePattern.test(item.code || "") &&
      validLenses.has(item.lens)
    ).slice(-4);
  }

  function latestEdition() {
    const items = editions();
    return items[items.length - 1] || null;
  }

  function validRelation(item) {
    return Boolean(
      item &&
      typeof item === "object" &&
      codePattern.test(item.parentCode || "") &&
      codePattern.test(item.childCode || "") &&
      item.parentCode !== item.childCode &&
      validLenses.has(item.lens) &&
      typeof item.createdAt === "string"
    );
  }

  function readLineage() {
    const raw = readJson(LINEAGE_KEY, null);
    const relations = raw && Array.isArray(raw.relations)
      ? raw.relations.filter(validRelation)
      : [];

    const seen = new Set();
    const deduped = [];
    relations.forEach(item => {
      const key = item.parentCode + ">" + item.childCode;
      if (seen.has(key)) return;
      seen.add(key);
      deduped.push(item);
    });

    return { schema: 1, relations: deduped.slice(-MAX_RELATIONS) };
  }

  function writeLineage(value) {
    const safe = {
      schema: 1,
      relations: Array.isArray(value.relations)
        ? value.relations.filter(validRelation).slice(-MAX_RELATIONS)
        : []
    };
    localStorage.setItem(LINEAGE_KEY, JSON.stringify(safe));
  }

  function recordRelation(parent, child) {
    if (!parent || !child) return false;
    if (!codePattern.test(parent.code || "") || !codePattern.test(child.code || "")) return false;
    if (parent.code === child.code || parent.lens !== child.lens || !validLenses.has(parent.lens)) return false;

    const lineage = readLineage();
    if (lineage.relations.some(item => item.parentCode === parent.code && item.childCode === child.code)) return false;

    lineage.relations.push({
      parentCode: parent.code,
      childCode: child.code,
      lens: parent.lens,
      createdAt: new Date().toISOString()
    });
    lineage.relations = lineage.relations.slice(-MAX_RELATIONS);
    writeLineage(lineage);
    return true;
  }

  function relationDepth(code) {
    if (!codePattern.test(code || "")) return 0;
    const relations = readLineage().relations;
    const parentByChild = new Map(relations.map(item => [item.childCode, item.parentCode]));
    const seen = new Set();
    let cursor = code;
    let depth = 0;

    while (parentByChild.has(cursor) && depth < MAX_RELATIONS + 1) {
      if (seen.has(cursor)) break;
      seen.add(cursor);
      cursor = parentByChild.get(cursor);
      depth += 1;
    }
    return depth;
  }

  function setText(node, value) {
    const text = String(value);
    if (node && node.textContent !== text) node.textContent = text;
  }

  function ensurePanel() {
    let section = document.getElementById("lineagePanelV15");
    if (section) return section;

    const aside = document.querySelector(".side-card");
    if (!aside) return null;

    section = document.createElement("section");
    section.id = "lineagePanelV15";
    section.className = "visit-card lineage-panel-v15";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "EDITION LINEAGE · v1.5";

    const status = document.createElement("p");
    status.id = "lineageStatusV15";
    status.className = "control-hint";

    const button = document.createElement("button");
    button.id = "openLineageV15";
    button.className = "full-button";
    button.type = "button";
    button.textContent = "open edition genealogy";
    button.addEventListener("click", openDialog);

    section.append(eyebrow, status, button);

    const reissue = aside.querySelector("#reissuePanelV14");
    const distant = aside.querySelector(".distant-wings");
    if (reissue?.nextSibling) aside.insertBefore(section, reissue.nextSibling);
    else if (distant) aside.insertBefore(section, distant);
    else aside.append(section);

    return section;
  }

  function ensureDialog() {
    let dialog = document.getElementById("lineageDialogV15");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "lineageDialogV15";
    dialog.className = "dialog lineage-dialog-v15";

    const mark = document.createElement("div");
    mark.className = "dialog-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "⟿";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "KNOWN DESCENT · v1.5";

    const title = document.createElement("h2");
    title.textContent = "Edition Lineage";

    const body = document.createElement("p");
    body.id = "lineageBodyV15";

    const list = document.createElement("div");
    list.id = "lineageListV15";
    list.className = "lineage-list-v15";

    const note = document.createElement("p");
    note.className = "control-hint";
    note.textContent = "Only explicit Second Edition reissues are linked. Ordinary prints are not guessed into a family tree.";

    const close = document.createElement("button");
    close.type = "button";
    close.className = "quiet-button";
    close.textContent = "close genealogy";
    close.addEventListener("click", () => dialog.close());

    dialog.append(mark, eyebrow, title, body, list, note, close);
    document.body.append(dialog);
    return dialog;
  }

  function renderDialog() {
    ensureDialog();
    const lineage = readLineage();
    const shelfCodes = new Set(editions().map(item => item.code));
    const body = document.getElementById("lineageBodyV15");
    const list = document.getElementById("lineageListV15");

    if (!lineage.relations.length) {
      setText(body, "No explicit Second Edition lineage has been recorded yet.");
      list?.replaceChildren();
      return;
    }

    const latest = latestEdition();
    setText(
      body,
      lineage.relations.length + " explicit parent→child relation" + (lineage.relations.length === 1 ? "" : "s") +
      " retained locally" +
      (latest ? "; latest edition depth is " + relationDepth(latest.code) + "." : ".")
    );

    if (!list) return;
    list.replaceChildren();

    lineage.relations.slice().reverse().forEach(item => {
      const row = document.createElement("section");
      row.className = "lineage-row-v15";

      const parent = document.createElement("div");
      parent.className = "lineage-node-v15";
      const pCode = document.createElement("strong");
      pCode.textContent = item.parentCode;
      const pMeta = document.createElement("span");
      pMeta.textContent = shelfCodes.has(item.parentCode) ? "parent · on local shelf" : "parent · no longer on local shelf";
      parent.append(pCode, pMeta);

      const arrow = document.createElement("span");
      arrow.className = "lineage-arrow-v15";
      arrow.textContent = "→";

      const child = document.createElement("div");
      child.className = "lineage-node-v15";
      const cCode = document.createElement("strong");
      cCode.textContent = item.childCode;
      const cMeta = document.createElement("span");
      cMeta.textContent = item.lens + " · " + (shelfCodes.has(item.childCode) ? "on local shelf" : "no longer on local shelf");
      child.append(cCode, cMeta);

      row.append(parent, arrow, child);
      list.append(row);
    });
  }

  function openDialog() {
    const dialog = ensureDialog();
    renderDialog();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function refreshPanel() {
    ensurePanel();
    const status = document.getElementById("lineageStatusV15");
    const button = document.getElementById("openLineageV15");
    const lineage = readLineage();
    const latest = latestEdition();

    if (!lineage.relations.length) {
      setText(status, "No explicit Second Edition descendants yet.");
    } else {
      setText(
        status,
        lineage.relations.length + "/" + MAX_RELATIONS + " lineage relation" + (lineage.relations.length === 1 ? "" : "s") +
        (latest ? " · latest depth " + relationDepth(latest.code) : "")
      );
    }
    if (button) button.disabled = !lineage.relations.length;
  }

  function renderVestibuleThread() {
    const layer = document.getElementById("exhibitLayer");
    if (!layer) return;

    const main = readJson("agent04-museum-of-almosts-v1", {});
    const room = typeof main.room === "string" ? main.room : "vestibule";
    const existing = layer.querySelector(".lineage-thread-v15");
    const lineage = readLineage();
    const latest = latestEdition();

    if (room !== "vestibule" || !lineage.relations.length || !latest) {
      if (existing) existing.remove();
      return;
    }

    let node = existing;
    if (!node) {
      node = document.createElement("button");
      node.type = "button";
      node.className = "lineage-thread-v15";
      node.style.left = "64%";
      node.style.top = "82%";
      node.addEventListener("click", openDialog);

      const mark = document.createElement("span");
      mark.className = "lineage-thread-mark-v15";
      mark.textContent = "⟿";

      const label = document.createElement("span");
      label.className = "lineage-thread-label-v15";

      node.append(mark, label);
      layer.append(node);
    }

    const depth = relationDepth(latest.code);
    setText(node.querySelector(".lineage-thread-label-v15"), "LINEAGE · " + depth);
    node.setAttribute("aria-label", "Edition lineage. Latest edition has " + depth + " explicit reissue ancestor" + (depth === 1 ? "" : "s") + ".");
  }

  function clearPendingParent() {
    preparedParent = null;
  }

  function markPreparedParent() {
    const latest = latestEdition();
    if (!latest) return;
    preparedParent = { code: latest.code, lens: latest.lens };
  }

  function watchPrint() {
    if (!preparedParent) return;
    const parent = { ...preparedParent };
    const before = new Set(editions().map(item => item.code));

    setTimeout(() => {
      const child = latestEdition();
      if (
        child &&
        child.code !== parent.code &&
        child.lens === parent.lens &&
        !before.has(child.code)
      ) {
        recordRelation(parent, child);
      }
      clearPendingParent();
      refreshAll();
    }, 0);
  }

  function bindEditionDialogClose() {
    const dialog = document.getElementById("editionDialogV10");
    if (!dialog || dialog.dataset.lineageBound === "true") return;
    dialog.dataset.lineageBound = "true";
    dialog.addEventListener("close", clearPendingParent);
  }

  function signature() {
    const lineage = readLineage();
    const latest = latestEdition();
    return lineage.relations.map(item => item.parentCode + ">" + item.childCode).join(",") + "|" + (latest?.code || "-");
  }

  function refreshAll() {
    bindEditionDialogClose();
    refreshPanel();
    renderVestibuleThread();
    if (document.getElementById("lineageDialogV15")?.open) renderDialog();
    lastSignature = signature();
  }

  document.addEventListener("click", event => {
    const id = event.target?.id;
    if (id === "prepareReissueV14" || id === "prepareReissueDialogV14") {
      markPreparedParent();
      return;
    }
    if (id === "printEditionV10") watchPrint();
  }, true);

  setInterval(() => {
    bindEditionDialogClose();
    const next = signature();
    if (next !== lastSignature) refreshAll();
    else renderVestibuleThread();
  }, 400);

  ensurePanel();
  ensureDialog();
  refreshAll();
})();