(() => {
  "use strict";

  const STORAGE_KEY = "agent04-museum-of-almosts-v1";
  const REFERENCE_KEY = "agent04-museum-resonance-v04";
  const AFTERIMAGE_KEY = "agent04-museum-afterimages-v05";
  const CURATOR_KEY = "agent04-museum-curator-v06";
  const UNBUILT_KEY = "agent04-museum-unbuilt-v08";
  const EDITION_KEY = "agent04-museum-editions-v10";

  const graph = {
    vestibule: { north: "observatory", east: "weather", south: "conservatory", west: "workshop" },
    weather: { west: "vestibule", east: "archive" },
    workshop: { east: "vestibule" },
    observatory: { south: "vestibule" },
    conservatory: { north: "vestibule" },
    archive: { west: "weather" }
  };

  const roomNames = {
    vestibule: "Vestibule of Maybe",
    weather: "Weather That Nearly Happened",
    workshop: "Workshop for Spare Purposes",
    observatory: "Observatory of Other Patterns",
    conservatory: "Conservatory of Alternative Growth",
    archive: "Archive of the Version You Made"
  };

  const driftRooms = {
    almosts: "conservatory",
    visitedRooms: "vestibule",
    changes: "workshop",
    echoes: "observatory",
    afterimages: "archive",
    referenceMounted: "vestibule",
    importedLineage: "vestibule",
    curatedRevisions: "workshop",
    curatedExhibits: "workshop",
    blueprints: "archive"
  };

  const acknowledgedRooms = new Set();
  let lastEditionCode = null;
  let lastSignature = "";

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value && typeof value === "object" ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function boundedCount(value, max = 999999) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? Math.max(0, Math.min(max, Math.floor(number))) : 0;
  }

  function currentSummary() {
    const main = readJson(STORAGE_KEY, {});
    const reference = readJson(REFERENCE_KEY, null);
    const afterimages = readJson(AFTERIMAGE_KEY, null);
    const curator = readJson(CURATOR_KEY, null);
    const unbuilt = readJson(UNBUILT_KEY, null);
    const fragments = Array.isArray(main.fragments) ? main.fragments : [];
    const visited = Array.isArray(main.visited) ? main.visited : [];
    const echoes = Array.isArray(main.echoes) ? main.echoes : [];
    const interventions = curator && Array.isArray(curator.interventions)
      ? curator.interventions.filter(item => item && typeof item.exhibitId === "string")
      : [];
    const curatedExhibits = new Set(interventions.map(item => item.exhibitId));
    const foreign = main.foreignCatalog && typeof main.foreignCatalog === "object" ? main.foreignCatalog : null;

    return {
      almosts: boundedCount(new Set(fragments).size, 32),
      visitedRooms: boundedCount(new Set(visited).size, 32),
      changes: boundedCount(main.changes),
      echoes: boundedCount(new Set(echoes).size, 32),
      afterimages: boundedCount(Array.isArray(afterimages?.snapshots) ? afterimages.snapshots.length : 0, 16),
      referenceMounted: Boolean(reference && reference.states && typeof reference.states === "object"),
      importedLineage: Boolean(foreign),
      curatedRevisions: boundedCount(interventions.length, 64),
      curatedExhibits: boundedCount(curatedExhibits.size, 32),
      blueprints: boundedCount(Array.isArray(unbuilt?.blueprints) ? unbuilt.blueprints.length : 0, 16)
    };
  }

  function latestEdition() {
    const raw = readJson(EDITION_KEY, null);
    if (!raw || !Array.isArray(raw.editions)) return null;
    const items = raw.editions.filter(item =>
      item &&
      typeof item === "object" &&
      typeof item.code === "string" &&
      item.summary &&
      typeof item.summary === "object"
    ).slice(-4);
    return items[items.length - 1] || null;
  }

  function footnoteTargets() {
    const edition = latestEdition();
    if (!edition) return { edition: null, rooms: [], fields: [] };
    const now = currentSummary();
    const fields = Object.entries(driftRooms)
      .filter(([key]) => edition.summary[key] !== now[key])
      .map(([key, room]) => ({ key, room }));
    const rooms = [...new Set(fields.map(item => item.room))];
    return { edition, rooms, fields };
  }

  function currentRoom() {
    const main = readJson(STORAGE_KEY, {});
    return Object.prototype.hasOwnProperty.call(graph, main.room) ? main.room : "vestibule";
  }

  function neighbors(room) {
    return Object.entries(graph[room] || {}).map(([direction, target]) => ({ direction, target }));
  }

  function shortestPath(start, target) {
    if (start === target) return [start];
    const queue = [[start]];
    const seen = new Set([start]);

    while (queue.length) {
      const path = queue.shift();
      const room = path[path.length - 1];
      for (const { target: next } of neighbors(room)) {
        if (seen.has(next)) continue;
        const nextPath = [...path, next];
        if (next === target) return nextPath;
        seen.add(next);
        queue.push(nextPath);
      }
    }
    return null;
  }

  function permutations(items) {
    if (items.length <= 1) return [items.slice()];
    const result = [];
    items.forEach((item, index) => {
      const rest = items.slice(0, index).concat(items.slice(index + 1));
      permutations(rest).forEach(tail => result.push([item, ...tail]));
    });
    return result;
  }

  function routeCost(start, targets) {
    let total = 0;
    let cursor = start;
    const legs = [];
    for (const target of targets) {
      const path = shortestPath(cursor, target);
      if (!path) return { total: Infinity, legs: [] };
      total += Math.max(0, path.length - 1);
      legs.push(path);
      cursor = target;
    }
    return { total, legs };
  }

  function bestTour(start, targets) {
    if (!targets.length) return { targets: [], total: 0, legs: [] };
    let best = null;
    const ordered = targets.slice().sort();
    permutations(ordered).forEach(order => {
      const scored = routeCost(start, order);
      const key = order.join("|");
      if (!best || scored.total < best.total || (scored.total === best.total && key < best.key)) {
        best = { targets: order, total: scored.total, legs: scored.legs, key };
      }
    });
    return best || { targets: [], total: 0, legs: [] };
  }

  function routeState() {
    const data = footnoteTargets();

    if (data.edition?.code !== lastEditionCode) {
      acknowledgedRooms.clear();
      lastEditionCode = data.edition?.code || null;
    }

    const active = new Set(data.rooms);
    [...acknowledgedRooms].forEach(room => {
      if (!active.has(room)) acknowledgedRooms.delete(room);
    });

    const room = currentRoom();
    const pending = data.rooms.filter(target => !acknowledgedRooms.has(target));
    const mustReadHere = pending.includes(room);
    const routedTargets = pending.filter(target => target !== room);
    const tour = bestTour(room, routedTargets);

    let nextStep = null;
    let nextTarget = tour.targets[0] || null;

    if (!mustReadHere && nextTarget) {
      const path = shortestPath(room, nextTarget);
      nextStep = path && path.length > 1 ? path[1] : null;
    }

    return {
      edition: data.edition,
      allTargets: data.rooms,
      pending,
      room,
      mustReadHere,
      tour,
      nextTarget,
      nextStep
    };
  }

  function directionTo(room, nextRoom) {
    const match = neighbors(room).find(item => item.target === nextRoom);
    return match ? match.direction : null;
  }

  function setText(node, value) {
    const text = String(value);
    if (node && node.textContent !== text) node.textContent = text;
  }

  function clearDoorHighlights() {
    ["North","East","South","West"].forEach(name => {
      const door = document.getElementById("door" + name);
      if (!door) return;
      door.classList.remove("crossref-next-v13");
      delete door.dataset.crossref;
      door.removeAttribute("aria-describedby");
    });
  }

  function renderDoorHighlight(state) {
    clearDoorHighlights();
    if (state.mustReadHere || !state.nextStep) return;

    const direction = directionTo(state.room, state.nextStep);
    if (!direction) return;
    const door = document.getElementById("door" + direction[0].toUpperCase() + direction.slice(1));
    if (!door || !door.classList.contains("active")) return;

    door.classList.add("crossref-next-v13");
    door.dataset.crossref = state.nextTarget ? roomNames[state.nextTarget] : "";
    door.setAttribute("aria-describedby", "crossrefStatusV13");
  }

  function ensurePanel() {
    let section = document.getElementById("crossrefPanelV13");
    if (section) return section;

    const aside = document.querySelector(".side-card");
    if (!aside) return null;

    section = document.createElement("section");
    section.id = "crossrefPanelV13";
    section.className = "visit-card crossref-panel-v13";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "CROSS-REFERENCE ROUTE · v1.3";

    const status = document.createElement("p");
    status.id = "crossrefStatusV13";
    status.className = "control-hint";

    const button = document.createElement("button");
    button.id = "openCrossrefV13";
    button.className = "full-button";
    button.type = "button";
    button.textContent = "show suggested route";
    button.addEventListener("click", openDialog);

    section.append(eyebrow, status, button);

    const footnote = aside.querySelector("#footnotePanelV12");
    const distant = aside.querySelector(".distant-wings");
    if (footnote?.nextSibling) aside.insertBefore(section, footnote.nextSibling);
    else if (distant) aside.insertBefore(section, distant);
    else aside.append(section);

    return section;
  }

  function ensureDialog() {
    let dialog = document.getElementById("crossrefDialogV13");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "crossrefDialogV13";
    dialog.className = "dialog crossref-dialog-v13";

    const mark = document.createElement("div");
    mark.className = "dialog-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "↝";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "FOOTNOTES AS A WALK · v1.3";

    const title = document.createElement("h2");
    title.textContent = "Cross-Reference Route";

    const body = document.createElement("p");
    body.id = "crossrefBodyV13";

    const route = document.createElement("div");
    route.id = "crossrefRouteV13";
    route.className = "crossref-route-v13";

    const note = document.createElement("p");
    note.className = "control-hint";
    note.textContent = "Reviewing a footnote room is session-only. Reloading forgets the route progress and starts the walk fresh.";

    const close = document.createElement("button");
    close.type = "button";
    close.className = "quiet-button";
    close.textContent = "close route";
    close.addEventListener("click", () => dialog.close());

    dialog.append(mark, eyebrow, title, body, route, note, close);
    document.body.append(dialog);
    return dialog;
  }

  function renderRouteDialog(state) {
    const body = document.getElementById("crossrefBodyV13");
    const route = document.getElementById("crossrefRouteV13");
    if (!body || !route) return;
    route.replaceChildren();

    if (!state.edition) {
      setText(body, "No printed edition exists yet, so there is no errata route.");
      return;
    }
    if (!state.allTargets.length) {
      setText(body, state.edition.code + " is current. There are no Walking Footnotes to route through.");
      return;
    }
    if (!state.pending.length) {
      setText(body, "All current footnote locations have been reviewed in this page session.");
      const done = document.createElement("div");
      done.className = "crossref-done-v13";
      done.textContent = "Route complete · " + state.allTargets.length + " subsystem stop" + (state.allTargets.length === 1 ? "" : "s") + " reviewed";
      route.append(done);
      return;
    }

    setText(
      body,
      state.mustReadHere
        ? "This room contains an unreviewed Walking Footnote. Inspect its physical footnote marker before continuing."
        : "Suggested shortest remaining tour: " + state.tour.total + " doorway transition" + (state.tour.total === 1 ? "" : "s") + "."
    );

    const sequence = state.mustReadHere
      ? [state.room, ...state.tour.targets]
      : state.tour.targets;

    sequence.forEach((room, index) => {
      const row = document.createElement("div");
      row.className = "crossref-stop-v13";
      row.dataset.current = room === state.room ? "true" : "false";

      const number = document.createElement("span");
      number.textContent = String(index + 1);

      const copy = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = roomNames[room] || room;
      const meta = document.createElement("span");
      meta.textContent = room === state.room
        ? (state.mustReadHere ? "read footnote here" : "current room")
        : "remaining footnote stop";

      copy.append(name, meta);
      row.append(number, copy);
      route.append(row);
    });
  }

  function openDialog() {
    const dialog = ensureDialog();
    renderRouteDialog(routeState());
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function refreshPanel() {
    ensurePanel();
    const state = routeState();
    const status = document.getElementById("crossrefStatusV13");
    const button = document.getElementById("openCrossrefV13");

    if (!state.edition) {
      setText(status, "No printed edition · no cross-reference route.");
      if (button) button.disabled = true;
    } else if (!state.allTargets.length) {
      setText(status, "Latest edition is current · no route needed.");
      if (button) button.disabled = false;
    } else if (!state.pending.length) {
      setText(status, "Route complete for this page session · all current footnote rooms reviewed.");
      if (button) button.disabled = false;
    } else if (state.mustReadHere) {
      setText(status, "Footnote stop here · inspect this room's Walking Footnote marker to continue.");
      if (button) button.disabled = false;
    } else {
      setText(
        status,
        "Next: " + (roomNames[state.nextTarget] || state.nextTarget) +
        " · " + state.tour.total + " remaining doorway transition" + (state.tour.total === 1 ? "" : "s")
      );
      if (button) button.disabled = false;
    }
  }

  function signature() {
    const state = routeState();
    return [
      state.edition?.code || "-",
      state.room,
      state.allTargets.join(","),
      state.pending.join(","),
      [...acknowledgedRooms].sort().join(",")
    ].join("|");
  }

  function refreshAll() {
    const state = routeState();
    refreshPanel();
    renderDoorHighlight(state);
    if (document.getElementById("crossrefDialogV13")?.open) renderRouteDialog(state);
    lastSignature = signature();
  }

  document.addEventListener("click", event => {
    const marker = event.target?.closest?.(".walking-footnote-v12");
    if (!marker) return;
    const room = currentRoom();
    const active = footnoteTargets().rooms;
    if (!active.includes(room)) return;
    acknowledgedRooms.add(room);
    setTimeout(refreshAll, 0);
  }, true);

  setInterval(() => {
    const next = signature();
    if (next !== lastSignature) refreshAll();
    else renderDoorHighlight(routeState());
  }, 360);

  ensurePanel();
  ensureDialog();
  refreshAll();
})();