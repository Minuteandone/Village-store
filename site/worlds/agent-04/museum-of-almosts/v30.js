(() => {
  "use strict";

  const CALIBRATION_KEY = "agent04-museum-forecast-calibration-v30";
  const MAX_AUDITS = 8;
  const validResults = new Set(["match", "bounded", "check"]);

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

  function readStore() {
    const raw = readJson(CALIBRATION_KEY, null);
    return {
      schema: 1,
      audits: raw && Array.isArray(raw.audits)
        ? raw.audits.filter(validAudit).slice(-MAX_AUDITS)
        : []
    };
  }

  function writeStore(store) {
    const safe = {
      schema: 1,
      audits: Array.isArray(store.audits)
        ? store.audits.filter(validAudit).slice(-MAX_AUDITS)
        : []
    };
    localStorage.setItem(CALIBRATION_KEY, JSON.stringify(safe));
  }

  function appendAudit(detail) {
    if (!validAudit(detail)) return;

    const store = readStore();
    const duplicate = store.audits.some(item =>
      item.capturedAt === detail.capturedAt &&
      item.settledAt === detail.settledAt
    );
    if (duplicate) return;

    store.audits.push({
      result: detail.result,
      shelfMatch: detail.shelfMatch,
      evidenceMatch: detail.evidenceMatch,
      outsideForecastBoundary: detail.outsideForecastBoundary,
      predictedDowngrades: detail.predictedDowngrades,
      actualDowngrades: detail.actualDowngrades,
      capturedAt: detail.capturedAt,
      settledAt: detail.settledAt
    });
    store.audits = store.audits.slice(-MAX_AUDITS);
    writeStore(store);
    renderAll();
  }

  function setText(node, value) {
    const text = String(value);
    if (node && node.textContent !== text) node.textContent = text;
  }

  function counts(audits) {
    return audits.reduce((acc, item) => {
      acc[item.result] += 1;
      if (item.shelfMatch) acc.shelfMatch += 1;
      if (item.evidenceMatch) acc.evidenceMatch += 1;
      return acc;
    }, {
      match: 0,
      bounded: 0,
      check: 0,
      shelfMatch: 0,
      evidenceMatch: 0
    });
  }

  function overallGrade(audits) {
    if (!audits.length) return "uncalibrated";
    if (audits.some(item => item.result === "check")) return "review";
    if (audits.some(item => item.result === "bounded")) return "bounded";
    return "verified";
  }

  function gradeLabel(grade) {
    if (grade === "verified") return "VERIFIED";
    if (grade === "bounded") return "BOUNDED";
    if (grade === "review") return "REVIEW";
    return "UNCALIBRATED";
  }

  function percent(n, d) {
    return d ? Math.round((n / d) * 100) + "%" : "—";
  }

  function ensurePanel() {
    const dialog = document.getElementById("editionDialogV10");
    if (!dialog) return null;

    let panel = document.getElementById("calibrationPanelV30");
    if (panel) return panel;

    panel = document.createElement("section");
    panel.id = "calibrationPanelV30";
    panel.className = "calibration-panel-v30";

    const heading = document.createElement("div");
    heading.className = "calibration-heading-v30";

    const labels = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "CALIBRATION LEDGER · v3.0";
    const title = document.createElement("h4");
    title.textContent = "How has the bounded forecast behaved?";
    labels.append(eyebrow, title);

    const badge = document.createElement("strong");
    badge.id = "calibrationBadgeV30";
    badge.className = "calibration-badge-v30";

    heading.append(labels, badge);

    const summary = document.createElement("p");
    summary.id = "calibrationSummaryV30";
    summary.className = "calibration-summary-v30";

    const metrics = document.createElement("div");
    metrics.id = "calibrationMetricsV30";
    metrics.className = "calibration-metrics-v30";

    const history = document.createElement("div");
    history.id = "calibrationHistoryV30";
    history.className = "calibration-history-v30";

    const note = document.createElement("p");
    note.className = "control-hint";
    note.textContent =
      "Calibration stores only compact audit verdicts, match booleans, downgrade counts, and timestamps. It does not retain edition codes, relation IDs, compact summaries, or lineage graphs.";

    const clear = document.createElement("button");
    clear.id = "clearCalibrationV30";
    clear.className = "quiet-button";
    clear.type = "button";
    clear.textContent = "clear local calibration history";
    clear.addEventListener("click", () => {
      localStorage.removeItem(CALIBRATION_KEY);
      renderAll();
    });

    panel.append(heading, summary, metrics, history, note, clear);

    const audit = document.getElementById("forecastAuditPanelV29");
    const receipt = document.getElementById("receiptPanelV28");
    const actions = dialog.querySelector(".edition-actions-v10");
    if (audit) audit.insertAdjacentElement("afterend", panel);
    else if (receipt) receipt.insertAdjacentElement("afterend", panel);
    else if (actions) dialog.insertBefore(panel, actions);
    else dialog.append(panel);

    return panel;
  }

  function metric(label, value) {
    const item = document.createElement("div");
    const key = document.createElement("span");
    key.textContent = label;
    const val = document.createElement("strong");
    val.textContent = value;
    item.append(key, val);
    return item;
  }

  function renderMetrics(audits) {
    const node = document.getElementById("calibrationMetricsV30");
    if (!node) return;
    const c = counts(audits);
    node.replaceChildren(
      metric("audits", String(audits.length) + "/" + MAX_AUDITS),
      metric("exact matches", String(c.match)),
      metric("bounded cases", String(c.bounded)),
      metric("checks", String(c.check)),
      metric("shelf agreement", percent(c.shelfMatch, audits.length)),
      metric("evidence exactness", percent(c.evidenceMatch, audits.length))
    );
  }

  function renderHistory(audits) {
    const node = document.getElementById("calibrationHistoryV30");
    if (!node) return;
    node.replaceChildren();

    if (!audits.length) {
      const empty = document.createElement("div");
      empty.className = "calibration-empty-v30";
      empty.textContent = "No Forecast Audit outcomes have been recorded on this device yet.";
      node.append(empty);
      return;
    }

    audits.slice().reverse().forEach((audit, reverseIndex) => {
      const row = document.createElement("div");
      row.className = "calibration-row-v30";
      row.dataset.result = audit.result;

      const index = document.createElement("strong");
      index.textContent = "#" + (audits.length - reverseIndex) + " · " + audit.result.toUpperCase();

      const details = document.createElement("span");
      details.textContent =
        "shelf " + (audit.shelfMatch ? "match" : "check") +
        " · evidence " + (audit.evidenceMatch ? "match" : "bounded/check") +
        " · downgrades " + audit.predictedDowngrades + " → " + audit.actualDowngrades;

      row.append(index, details);
      node.append(row);
    });
  }

  function decorateForecast(audits) {
    const panel = document.getElementById("forecastPanelV25");
    if (!panel) return;

    const grade = overallGrade(audits);
    panel.dataset.calibration = grade;

    let badge = document.getElementById("forecastCalibrationSealV30");
    if (!badge) {
      badge = document.createElement("span");
      badge.id = "forecastCalibrationSealV30";
      badge.className = "forecast-calibration-seal-v30";
      const heading = panel.querySelector(".forecast-heading-v25") || panel.firstElementChild;
      if (heading) heading.append(badge);
      else panel.prepend(badge);
    }

    badge.dataset.grade = grade;
    setText(badge, "CAL " + gradeLabel(grade));
  }

  function renderAll() {
    ensurePanel();
    const audits = readStore().audits;
    const grade = overallGrade(audits);
    const badge = document.getElementById("calibrationBadgeV30");
    const summary = document.getElementById("calibrationSummaryV30");
    const clear = document.getElementById("clearCalibrationV30");

    if (badge) {
      badge.dataset.grade = grade;
      setText(badge, gradeLabel(grade));
    }

    setText(
      summary,
      audits.length
        ? "This ledger summarizes the last " + audits.length + " bounded Forecast Audit outcome" + (audits.length === 1 ? "" : "s") + " retained locally."
        : "The ledger is empty. Print a distinct Living Catalog edition after v2.9 is active to record a compact calibration outcome."
    );

    if (clear) clear.hidden = !audits.length;
    renderMetrics(audits);
    renderHistory(audits);
    decorateForecast(audits);
  }

  window.addEventListener("museum:forecast-audit-v29", event => {
    appendAudit(event.detail);
  });

  const observer = new MutationObserver(() => {
    if (!document.getElementById("calibrationPanelV30") || !document.getElementById("forecastCalibrationSealV30")) {
      renderAll();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  setInterval(renderAll, 700);

  ensurePanel();
  renderAll();
})();