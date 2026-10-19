(() => {
  "use strict";

  let pinned = null;
  let lastSignature = "";

  function setText(node, value) {
    const text = String(value);
    if (node && node.textContent !== text) node.textContent = text;
  }

  function currentCluster() {
    return document.querySelector(".calibration-constellation-v31");
  }

  function currentReading(cluster) {
    return cluster?.dataset.parallax || "flight";
  }

  function readingLabel(id) {
    if (id === "house") return "House frame";
    if (id === "raw") return "Raw stars";
    return "Flight path";
  }

  function currentPoints(cluster) {
    if (!cluster) return [];
    return Array.from(cluster.querySelectorAll(".calibration-star-v31"))
      .sort((a, b) => Number(a.dataset.index || 0) - Number(b.dataset.index || 0))
      .slice(0, 8)
      .map(star => ({
        x: parseFloat(star.style.left) || 0,
        y: parseFloat(star.style.top) || 0
      }));
  }

  function captureTrace() {
    const cluster = currentCluster();
    if (!cluster) return;

    const points = currentPoints(cluster);
    if (!points.length) return;

    pinned = {
      reading: currentReading(cluster),
      points: points.map(point => ({ x: point.x, y: point.y })),
      starCount: points.length
    };

    renderAll();
  }

  function clearTrace() {
    pinned = null;
    renderAll();
  }

  function ensureControls() {
    const cluster = currentCluster();
    if (!cluster) return null;

    let controls = cluster.querySelector(".parallax-trace-controls-v33");
    if (controls) return controls;

    controls = document.createElement("div");
    controls.className = "parallax-trace-controls-v33";

    const pin = document.createElement("button");
    pin.id = "pinParallaxTraceV33";
    pin.type = "button";
    pin.className = "parallax-trace-button-v33";
    pin.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      captureTrace();
    });

    const clear = document.createElement("button");
    clear.id = "clearParallaxTraceV33";
    clear.type = "button";
    clear.className = "parallax-trace-button-v33";
    clear.textContent = "clear trace";
    clear.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      clearTrace();
    });

    controls.append(pin, clear);
    cluster.append(controls);
    return controls;
  }

  function svgLine(a, b) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(a.x));
    line.setAttribute("y1", String(a.y));
    line.setAttribute("x2", String(b.x));
    line.setAttribute("y2", String(b.y));
    line.setAttribute("class", "parallax-trace-line-v33");
    return line;
  }

  function svgPoint(point, index) {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", String(point.x));
    circle.setAttribute("cy", String(point.y));
    circle.setAttribute("r", "2.3");
    circle.setAttribute("class", "parallax-trace-point-v33");

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", String(point.x + 3.2));
    text.setAttribute("y", String(point.y - 2.4));
    text.setAttribute("class", "parallax-trace-index-v33");
    text.textContent = String(index + 1);

    group.append(circle, text);
    return group;
  }

  function renderTrace() {
    const cluster = currentCluster();
    if (!cluster) return;

    cluster.querySelector(".parallax-trace-layer-v33")?.remove();

    if (!pinned || !pinned.points.length) return;
    const current = currentReading(cluster);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "parallax-trace-layer-v33");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("aria-hidden", "true");
    svg.dataset.from = pinned.reading;
    svg.dataset.to = current;

    for (let i = 1; i < pinned.points.length; i++) {
      svg.append(svgLine(pinned.points[i - 1], pinned.points[i]));
    }
    pinned.points.forEach((point, index) => svg.append(svgPoint(point, index)));

    cluster.insertBefore(svg, cluster.firstChild);
  }

  function ensureReadout() {
    const base = document.getElementById("calibrationParallaxNoteV32");
    let note = document.getElementById("parallaxTraceNoteV33");

    if (!base) {
      if (note) note.remove();
      return;
    }

    if (!note) {
      note = document.createElement("p");
      note.id = "parallaxTraceNoteV33";
      note.className = "parallax-trace-note-v33";
      base.insertAdjacentElement("afterend", note);
    }

    const cluster = currentCluster();
    const now = currentReading(cluster);

    if (!pinned) {
      setText(note, "Parallax Trace is empty. Pin this reading, then turn the Constellation Dial to compare two presentations of the same audit stars.");
      note.dataset.state = "empty";
      return;
    }

    note.dataset.state = pinned.reading === now ? "same" : "comparison";
    setText(
      note,
      "Pinned " + readingLabel(pinned.reading) + " → current " + readingLabel(now) +
      ". The ghost trace preserves only session-memory geometry; calibration facts remain unchanged."
    );
  }

  function ensureDialogReadout() {
    const dialog = document.getElementById("calibrationConstellationDialogV31");
    if (!dialog) return;

    let panel = document.getElementById("parallaxTraceDialogV33");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "parallaxTraceDialogV33";
      panel.className = "parallax-trace-dialog-v33";

      const eyebrow = document.createElement("p");
      eyebrow.className = "eyebrow";
      eyebrow.textContent = "PARALLAX TRACE · v3.3";

      const text = document.createElement("p");
      text.id = "parallaxTraceDialogTextV33";

      panel.append(eyebrow, text);

      const close = dialog.querySelector(".quiet-button");
      if (close) dialog.insertBefore(panel, close);
      else dialog.append(panel);
    }

    if (!pinned) {
      setText(
        document.getElementById("parallaxTraceDialogTextV33"),
        "No reading is pinned. Pin the Observatory constellation, then turn the original Dial to compare geometry."
      );
    } else {
      const now = currentReading(currentCluster());
      setText(
        document.getElementById("parallaxTraceDialogTextV33"),
        "Session trace: " + readingLabel(pinned.reading) + " → " + readingLabel(now) +
        ". The trace stores no audit outcomes and disappears on reload."
      );
    }
  }

  function refreshControls() {
    const cluster = currentCluster();
    const controls = ensureControls();
    if (!cluster || !controls) return;

    const pin = controls.querySelector("#pinParallaxTraceV33");
    const clear = controls.querySelector("#clearParallaxTraceV33");
    const reading = currentReading(cluster);

    setText(pin, pinned ? "replace with " + readingLabel(reading) : "pin " + readingLabel(reading));
    if (clear) clear.hidden = !pinned;
  }

  function signature() {
    const cluster = currentCluster();
    const reading = currentReading(cluster);
    const points = currentPoints(cluster);
    const pinSig = pinned
      ? pinned.reading + ":" + pinned.points.map(point => point.x + "," + point.y).join(";")
      : "-";
    return reading + "|" + points.length + "|" + pinSig;
  }

  function renderAll() {
    refreshControls();
    renderTrace();
    ensureReadout();
    ensureDialogReadout();
    lastSignature = signature();
  }

  const observer = new MutationObserver(() => {
    if (currentCluster() || document.getElementById("calibrationConstellationDialogV31")) {
      renderAll();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  setInterval(() => {
    const next = signature();
    if (next !== lastSignature) renderAll();
  }, 450);

  renderAll();
})();