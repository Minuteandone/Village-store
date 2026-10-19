(() => {
  "use strict";

  const STORAGE_KEY = "agent04-museum-of-almosts-v1";

  const readings = [
    {
      id: "flight",
      label: "Flight path",
      note: "Chronology is emphasized as a route through retained audit stars."
    },
    {
      id: "house",
      label: "House frame",
      note: "The same retained audit stars are rearranged into an architectural frame."
    },
    {
      id: "raw",
      label: "Raw stars",
      note: "Connections are suppressed so only the retained audit outcomes remain."
    }
  ];

  const slots = {
    flight: [
      [14, 70], [29, 28], [43, 58], [57, 18],
      [70, 48], [84, 24], [79, 78], [54, 83]
    ],
    house: [
      [19, 77], [19, 43], [34, 24], [50, 10],
      [66, 24], [81, 43], [81, 77], [50, 77]
    ],
    raw: [
      [17, 24], [39, 18], [62, 27], [82, 19],
      [23, 62], [46, 72], [68, 58], [84, 76]
    ]
  };

  let lastSignature = "";

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value && typeof value === "object" ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function dialState() {
    const state = readJson(STORAGE_KEY, {});
    const value = state.exhibitStates && state.exhibitStates.constellationDial;
    return Number.isInteger(value) && value >= 0 && value <= 2 ? value : 0;
  }

  function currentReading() {
    return readings[dialState()] || readings[0];
  }

  function setText(node, value) {
    const text = String(value);
    if (node && node.textContent !== text) node.textContent = text;
  }

  function applyStarGeometry(cluster, reading) {
    const geometry = slots[reading.id];
    const stars = Array.from(cluster.querySelectorAll(".calibration-star-v31"))
      .sort((a, b) => Number(a.dataset.index || 0) - Number(b.dataset.index || 0));

    stars.forEach((star, index) => {
      const point = geometry[index % geometry.length];
      star.style.left = point[0] + "%";
      star.style.top = point[1] + "%";
    });

    const lines = Array.from(cluster.querySelectorAll(".calibration-line-v31"));
    lines.forEach((line, index) => {
      const a = geometry[index % geometry.length];
      const b = geometry[(index + 1) % geometry.length];
      line.setAttribute("x1", String(a[0]));
      line.setAttribute("y1", String(a[1]));
      line.setAttribute("x2", String(b[0]));
      line.setAttribute("y2", String(b[1]));
    });
  }

  function decorateCluster() {
    const cluster = document.querySelector(".calibration-constellation-v31");
    if (!cluster) return;

    const reading = currentReading();
    cluster.dataset.parallax = reading.id;

    applyStarGeometry(cluster, reading);

    const label = cluster.querySelector(".calibration-constellation-label-v31");
    setText(label, "Calibration Constellation · " + reading.label);

    cluster.setAttribute(
      "aria-label",
      "Calibration Constellation under the " + reading.label +
      " presentation. The audit facts are unchanged; only the constellation geometry changes."
    );
  }

  function ensureRoomReadout() {
    const base = document.getElementById("calibrationConstellationNoteV31");
    let note = document.getElementById("calibrationParallaxNoteV32");

    if (!base) {
      if (note) note.remove();
      return;
    }

    if (!note) {
      note = document.createElement("p");
      note.id = "calibrationParallaxNoteV32";
      note.className = "calibration-parallax-note-v32";
      base.insertAdjacentElement("afterend", note);
    }

    const reading = currentReading();
    note.dataset.reading = reading.id;
    setText(
      note,
      "Parallax reading: " + reading.label + ". " + reading.note +
      " This changes presentation only; MATCH / BOUNDED / CHECK facts remain identical."
    );
  }

  function ensureDialogReadout() {
    const dialog = document.getElementById("calibrationConstellationDialogV31");
    if (!dialog) return;

    let readout = document.getElementById("calibrationParallaxDialogV32");
    if (!readout) {
      readout = document.createElement("section");
      readout.id = "calibrationParallaxDialogV32";
      readout.className = "calibration-parallax-dialog-v32";

      const eyebrow = document.createElement("p");
      eyebrow.className = "eyebrow";
      eyebrow.textContent = "CALIBRATION PARALLAX · v3.2";

      const title = document.createElement("strong");
      title.id = "calibrationParallaxTitleV32";

      const note = document.createElement("p");
      note.id = "calibrationParallaxBodyV32";

      readout.append(eyebrow, title, note);

      const close = dialog.querySelector(".quiet-button");
      if (close) dialog.insertBefore(readout, close);
      else dialog.append(readout);
    }

    const reading = currentReading();
    readout.dataset.reading = reading.id;
    setText(document.getElementById("calibrationParallaxTitleV32"), reading.label);
    setText(
      document.getElementById("calibrationParallaxBodyV32"),
      reading.note +
      " The original Constellation Dial is selecting a visual reading, not changing calibration evidence."
    );
  }

  function signature() {
    const cluster = document.querySelector(".calibration-constellation-v31");
    const starCount = cluster ? cluster.querySelectorAll(".calibration-star-v31").length : 0;
    const clusterSignature = cluster?.dataset.signature || "";
    return dialState() + "|" + starCount + "|" + clusterSignature;
  }

  function renderAll() {
    decorateCluster();
    ensureRoomReadout();
    ensureDialogReadout();
    lastSignature = signature();
  }

  const observer = new MutationObserver(() => {
    if (document.querySelector(".calibration-constellation-v31") ||
        document.getElementById("calibrationConstellationDialogV31")) {
      renderAll();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  setInterval(() => {
    const next = signature();
    if (next !== lastSignature) renderAll();
  }, 500);

  renderAll();
})();