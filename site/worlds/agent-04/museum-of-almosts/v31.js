(() => {
  "use strict";

  const CALIBRATION_KEY = "agent04-museum-forecast-calibration-v30";
  const STORAGE_KEY = "agent04-museum-of-almosts-v1";
  const MAX_AUDITS = 8;

  const starSlots = [
    [14, 70], [29, 28], [43, 58], [57, 18],
    [70, 48], [84, 24], [79, 78], [54, 83]
  ];

  const validResults = new Set(["match", "bounded", "check"]);
  let lastSignature = "";

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value && typeof value === "object" ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function validAudit(item) {
    return Boolean(
      item &&
      typeof item === "object" &&
      validResults.has(item.result) &&
      typeof item.shelfMatch === "boolean" &&
      typeof item.evidenceMatch === "boolean" &&
      typeof item.outsideForecastBoundary === "boolean" &&
      Number.isInteger(item.predictedDowngrades) &&
      item.predictedDowngrades >= 0 &&
      item.predictedDowngrades <= 6 &&
      Number.isInteger(item.actualDowngrades) &&
      item.actualDowngrades >= 0 &&
      item.actualDowngrades <= 6 &&
      Number.isFinite(item.capturedAt) &&
      Number.isFinite(item.settledAt)
    );
  }

  function audits() {
    const raw = readJson(CALIBRATION_KEY, null);
    return raw && Array.isArray(raw.audits)
      ? raw.audits.filter(validAudit).slice(-MAX_AUDITS)
      : [];
  }

  function currentRoom() {
    const state = readJson(STORAGE_KEY, {});
    return typeof state.room === "string" ? state.room : "vestibule";
  }

  function rank(result) {
    if (result === "match") return 2;
    if (result === "bounded") return 1;
    return 0;
  }

  function trajectory(items) {
    if (items.length < 2) return "insufficient";
    const previous = rank(items[items.length - 2].result);
    const latest = rank(items[items.length - 1].result);
    if (latest > previous) return "improving";
    if (latest < previous) return "worsening";
    return "holding";
  }

  function overallGrade(items) {
    if (!items.length) return "uncalibrated";
    if (items.some(item => item.result === "check")) return "review";
    if (items.some(item => item.result === "bounded")) return "bounded";
    return "verified";
  }

  function setText(node, value) {
    const text = String(value);
    if (node && node.textContent !== text) node.textContent = text;
  }

  function ensureDialog() {
    let dialog = document.getElementById("calibrationConstellationDialogV31");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "calibrationConstellationDialogV31";
    dialog.className = "dialog calibration-constellation-dialog-v31";

    const mark = document.createElement("div");
    mark.className = "dialog-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "✦";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "CALIBRATION CONSTELLATION · v3.1";

    const title = document.createElement("h2");
    title.textContent = "A Sky Made of Forecasts That Were Tested";

    const summary = document.createElement("p");
    summary.id = "calibrationConstellationSummaryV31";

    const history = document.createElement("div");
    history.id = "calibrationConstellationHistoryV31";
    history.className = "calibration-constellation-history-v31";

    const note = document.createElement("p");
    note.className = "control-hint";
    note.textContent =
      "Each star is one retained v3.0 Forecast Audit outcome. Stars are arranged chronologically for display; distance and angle do not encode confidence or magnitude. The constellation is derived live from the bounded Calibration Ledger and stores nothing itself.";

    const close = document.createElement("button");
    close.type = "button";
    close.className = "quiet-button";
    close.textContent = "close sky";
    close.addEventListener("click", () => dialog.close());

    dialog.append(mark, eyebrow, title, summary, history, note, close);
    document.body.append(dialog);
    return dialog;
  }

  function historyRow(audit, index, total) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "calibration-constellation-row-v31";
    row.dataset.result = audit.result;

    const label = document.createElement("strong");
    label.textContent = "Star " + (index + 1) + " of " + total + " · " + audit.result.toUpperCase();

    const detail = document.createElement("span");
    detail.textContent =
      "shelf " + (audit.shelfMatch ? "match" : "check") +
      " · evidence " + (audit.evidenceMatch ? "match" : "bounded/check") +
      " · downgrades " + audit.predictedDowngrades + " → " + audit.actualDowngrades;

    row.append(label, detail);
    row.addEventListener("click", () => {
      const star = document.querySelector('.calibration-star-v31[data-index="' + index + '"]');
      star?.focus();
    });
    return row;
  }

  function refreshDialog() {
    ensureDialog();
    const items = audits();
    const summary = document.getElementById("calibrationConstellationSummaryV31");
    const history = document.getElementById("calibrationConstellationHistoryV31");
    const grade = overallGrade(items);
    const motion = trajectory(items);

    setText(
      summary,
      items.length
        ? items.length + " retained audit star" + (items.length === 1 ? "" : "s") +
          " · ledger grade " + grade.toUpperCase() +
          " · latest trajectory " + motion + "."
        : "No calibration stars exist yet. A Forecast Audit must settle before the sky has anything factual to plot."
    );

    if (history) {
      history.replaceChildren();
      items.forEach((audit, index) => history.append(historyRow(audit, index, items.length)));
    }
  }

  function openDialog() {
    const dialog = ensureDialog();
    refreshDialog();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function lineElement(a, b, result) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(a[0]));
    line.setAttribute("y1", String(a[1]));
    line.setAttribute("x2", String(b[0]));
    line.setAttribute("y2", String(b[1]));
    line.setAttribute("class", "calibration-line-v31");
    line.dataset.result = result;
    return line;
  }

  function starElement(audit, index, total) {
    const slot = starSlots[index % starSlots.length];
    const star = document.createElement("button");
    star.type = "button";
    star.className = "calibration-star-v31";
    star.dataset.result = audit.result;
    star.dataset.index = String(index);
    star.dataset.latest = String(index === total - 1);
    star.style.left = slot[0] + "%";
    star.style.top = slot[1] + "%";

    const symbol = document.createElement("span");
    symbol.className = "calibration-star-symbol-v31";
    symbol.textContent = audit.result === "match" ? "✦" : audit.result === "bounded" ? "◇" : "×";

    const number = document.createElement("span");
    number.className = "calibration-star-number-v31";
    number.textContent = String(index + 1);

    star.append(symbol, number);
    star.setAttribute(
      "aria-label",
      "Calibration star " + (index + 1) + " of " + total + ": " + audit.result +
      ". Shelf " + (audit.shelfMatch ? "matched" : "needs checking") +
      ", evidence " + (audit.evidenceMatch ? "matched" : "was bounded or needs checking") + "."
    );
    star.addEventListener("click", openDialog);
    return star;
  }

  function renderConstellation() {
    const layer = document.getElementById("exhibitLayer");
    if (!layer) return;

    const existing = layer.querySelector(".calibration-constellation-v31");
    const items = audits();

    if (currentRoom() !== "observatory" || !items.length) {
      if (existing) existing.remove();
      return;
    }

    const signature = items.map(item =>
      item.result + ":" + Number(item.shelfMatch) + ":" + Number(item.evidenceMatch) +
      ":" + item.predictedDowngrades + ":" + item.actualDowngrades
    ).join("|");

    if (existing && existing.dataset.signature === signature) return;
    if (existing) existing.remove();

    const cluster = document.createElement("section");
    cluster.className = "calibration-constellation-v31";
    cluster.dataset.signature = signature;
    cluster.dataset.grade = overallGrade(items);
    cluster.dataset.trajectory = trajectory(items);
    cluster.setAttribute(
      "aria-label",
      "Calibration Constellation with " + items.length + " audit stars. Click a star to inspect."
    );

    const label = document.createElement("button");
    label.type = "button";
    label.className = "calibration-constellation-label-v31";
    label.textContent = "Calibration Constellation";
    label.addEventListener("click", openDialog);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "calibration-lines-v31");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("aria-hidden", "true");

    for (let i = 1; i < items.length; i++) {
      svg.append(lineElement(starSlots[i - 1], starSlots[i], items[i].result));
    }

    cluster.append(svg, label);
    items.forEach((audit, index) => cluster.append(starElement(audit, index, items.length)));
    layer.append(cluster);
  }

  function ensureRoomNote() {
    let note = document.getElementById("calibrationConstellationNoteV31");
    const items = audits();

    if (currentRoom() !== "observatory" || !items.length) {
      if (note) note.remove();
      return;
    }

    if (!note) {
      const curator = document.getElementById("curatorText");
      if (!curator) return;
      note = document.createElement("p");
      note.id = "calibrationConstellationNoteV31";
      note.className = "calibration-constellation-note-v31";
      curator.insertAdjacentElement("afterend", note);
    }

    const motion = trajectory(items);
    setText(
      note,
      "A second constellation now hangs in the Observatory: " + items.length +
      " tested forecast" + (items.length === 1 ? "" : "s") +
      " arranged chronologically. Latest trajectory: " + motion + "."
    );
  }

  function signature() {
    return currentRoom() + "|" + audits().map(item =>
      item.result + ":" + Number(item.shelfMatch) + ":" + Number(item.evidenceMatch) +
      ":" + item.predictedDowngrades + ":" + item.actualDowngrades
    ).join("|");
  }

  function renderAll() {
    renderConstellation();
    ensureRoomNote();
    if (document.getElementById("calibrationConstellationDialogV31")?.open) refreshDialog();
    lastSignature = signature();
  }

  setInterval(() => {
    const next = signature();
    if (next !== lastSignature) renderAll();
    else renderConstellation();
  }, 650);

  ensureDialog();
  renderAll();
})();