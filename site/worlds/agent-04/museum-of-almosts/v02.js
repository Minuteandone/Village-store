(() => {
  "use strict";

  const STORAGE_KEY = "agent04-museum-of-almosts-v1";
  const COATCHECK_KEY = "agent04-museum-of-almosts-coatcheck-v1";
  const LOGICAL_W = 1000;
  const LOGICAL_H = 600;
  const ECHO_DISTANCE = 125;

  const echoes = [
    {
      id: "doubleHouse",
      room: "vestibule",
      name: "The House That Appeared Twice",
      x: 235,
      y: 170,
      icon: "⌂",
      condition: s => s.exhibitStates?.constellationDial === 1 && s.exhibitStates?.spareDrawer === 2,
      text: "The museum notices that a house appeared independently in the sky and in a drawer. It refuses to call this a coincidence, but offers no replacement noun."
    },
    {
      id: "winterSail",
      room: "conservatory",
      name: "Winter Sail",
      x: 555,
      y: 455,
      icon: "❄",
      condition: s => s.exhibitStates?.weatherJar === 2 && s.exhibitStates?.maybeSeed === 2,
      text: "Snowlight catches the reflective petals. For a second the flower looks less like a plant and more like a tiny boat waiting for an ocean that never happened."
    },
    {
      id: "lockWithoutElsewhere",
      room: "workshop",
      name: "Lock Without Elsewhere",
      x: 255,
      y: 420,
      icon: "⌁",
      condition: s => s.exhibitStates?.almostEngine === 1 && s.exhibitStates?.directory === 2,
      text: "A lock has been manufactured for a door that says you are already on both sides of it. The workshop quietly stops taking orders."
    },
    {
      id: "sunRoot",
      room: "weather",
      name: "Sunroot Forecast",
      x: 760,
      y: 165,
      icon: "☀",
      condition: s => s.exhibitStates?.weatherJar === 1 && s.exhibitStates?.rootMap === 1,
      text: "The amber forecast projects ghost-roots across the Weather Room floor. They point toward a garden that exists only as a route."
    }
  ];

  const roomTitles = {
    vestibule: "Vestibule of Maybe",
    weather: "Weather That Nearly Happened",
    workshop: "Workshop for Spare Purposes",
    observatory: "Observatory of Other Patterns",
    conservatory: "Conservatory of Alternative Growth",
    archive: "Archive of the Version You Made"
  };

  const allowedExhibitIds = new Set([
    "directory", "weatherJar", "forecastDesk", "almostEngine", "spareDrawer",
    "constellationDial", "maybeSeed", "rootMap", "finalIndex"
  ]);
  const allowedFragments = new Set([
    "direction", "forecast", "uncertainty", "purpose", "reuse",
    "pattern", "growth", "route", "trace"
  ]);
  const allowedWeather = new Set(["drizzle", "amber", "snow"]);

  const baseSubtitles = {
    vestibule: "The directory keeps revising itself when nobody is looking.",
    weather: "Forecasts rejected by reality are stored under glass.",
    workshop: "Objects come here when they were built correctly for the wrong job.",
    observatory: "The same points can support several constellations if you stop arguing with them.",
    conservatory: "Seeds are allowed to reconsider the assignment.",
    archive: "Nothing here existed in quite this arrangement before your visit."
  };

  const rawSet = Storage.prototype.setItem;
  let overlay = { schema: 2, echoes: [], path: [] };
  let lastRoom = null;
  let lastRoomEffect = "";
  let lastEchoSignature = "";
  let toastTimer = null;

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
    } catch {
      return {};
    }
  }

  function initializeOverlay() {
    const s = readState();
    overlay.echoes = Array.isArray(s.echoes) ? s.echoes.slice() : [];
    overlay.path = Array.isArray(s.path) && s.path.length ? s.path.slice() : (Array.isArray(s.visited) ? s.visited.slice() : []);
    if (!overlay.path.length && s.room) overlay.path.push(s.room);
  }

  function persistOverlay(extra) {
    const s = Object.assign({}, readState(), extra || {});
    s.schema = 2;
    s.echoes = overlay.echoes.slice();
    s.path = overlay.path.slice(-80);
    rawSet.call(localStorage, STORAGE_KEY, JSON.stringify(s));
  }

  Storage.prototype.setItem = function(key, value) {
    if (this === localStorage && key === STORAGE_KEY) {
      try {
        const incoming = JSON.parse(value);
        const current = readState();
        incoming.schema = 2;
        incoming.echoes = overlay.echoes.slice();
        incoming.path = overlay.path.slice(-80);

        const currentForeign = current.foreignCatalog && typeof current.foreignCatalog === "object"
          ? current.foreignCatalog
          : null;
        const incomingForeign = incoming.foreignCatalog && typeof incoming.foreignCatalog === "object"
          ? incoming.foreignCatalog
          : null;

        if (currentForeign && incomingForeign && currentForeign.sourceCode === incomingForeign.sourceCode) {
          incoming.foreignCatalog = {
            ...incomingForeign,
            states: currentForeign.states || incomingForeign.states || {},
            lineage: Array.isArray(currentForeign.lineage) ? currentForeign.lineage.slice(-5) : (incomingForeign.lineage || []),
            importedRoom: currentForeign.importedRoom || incomingForeign.importedRoom || "vestibule",
            forkCataloged: Boolean(currentForeign.forkCataloged || incomingForeign.forkCataloged),
            catalogedDifferences: Math.max(
              Number(currentForeign.catalogedDifferences || 0),
              Number(incomingForeign.catalogedDifferences || 0)
            )
          };
        } else if (currentForeign && !incomingForeign) {
          incoming.foreignCatalog = currentForeign;
        }

        value = JSON.stringify(incoming);
      } catch { }
    }
    return rawSet.call(this, key, value);
  };

  function unique(list) {
    return list.filter((value, index, arr) => arr.indexOf(value) === index);
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    const text = String(value);
    if (node && node.textContent !== text) node.textContent = text;
  }

  function roomId() {
    const s = readState();
    if (roomTitles[s.room]) return s.room;
    const title = document.getElementById("roomTitle")?.textContent || "";
    return Object.keys(roomTitles).find(id => roomTitles[id] === title) || "vestibule";
  }

  function activeEchoes(s, room) {
    return echoes.filter(echo => echo.room === room && echo.condition(s));
  }

  function playerPosition() {
    const player = document.getElementById("player");
    const left = parseFloat(player?.style.left || "50");
    const top = parseFloat(player?.style.top || "50");
    return { x: left / 100 * LOGICAL_W, y: top / 100 * LOGICAL_H };
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function nearestEcho() {
    const s = readState();
    const p = playerPosition();
    const candidates = activeEchoes(s, roomId()).map(echo => ({ echo, d: distance(p, echo) })).sort((a, b) => a.d - b.d);
    return candidates[0] && candidates[0].d <= ECHO_DISTANCE ? candidates[0].echo : null;
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
  }

  function discoverEcho(echo) {
    const first = !overlay.echoes.includes(echo.id);
    if (first) {
      overlay.echoes.push(echo.id);
      overlay.echoes = unique(overlay.echoes);
      persistOverlay();
      showToast("Counterfactual echo cataloged: " + echo.name);
    }
    const curator = document.getElementById("curatorMessage");
    if (curator) curator.textContent = echo.text;
    renderEchoes();
    applyHUD();
  }

  function makeEchoNode(echo) {
    const discovered = overlay.echoes.includes(echo.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "exhibit echo-plaque-v02 " + (discovered ? "discovered" : "undiscovered");
    button.dataset.echoId = echo.id;
    button.style.left = (echo.x / LOGICAL_W * 100) + "%";
    button.style.top = (echo.y / LOGICAL_H * 100) + "%";
    button.setAttribute("aria-label", (discovered ? "Counterfactual echo: " : "Uncataloged counterfactual echo: ") + echo.name);

    const shape = document.createElement("div");
    shape.className = "exhibit-shape";
    shape.textContent = discovered ? echo.icon : "?";
    const label = document.createElement("div");
    label.className = "exhibit-name";
    label.textContent = discovered ? echo.name : "Uncataloged Echo";
    button.append(shape, label);
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      discoverEcho(echo);
    });
    return button;
  }

  function renderEchoes() {
    const layer = document.getElementById("exhibitLayer");
    if (!layer) return;

    const s = readState();
    const room = roomId();
    const active = activeEchoes(s, room);
    const signature = room + "|" + active.map(echo => echo.id + ":" + overlay.echoes.includes(echo.id)).join(",");
    const existing = layer.querySelectorAll(".echo-plaque-v02");
    const museum = document.getElementById("museum");
    if (museum) museum.dataset.echoes = String(active.length);

    if (signature === lastEchoSignature && existing.length === active.length) return;
    lastEchoSignature = signature;
    existing.forEach(node => node.remove());
    active.forEach(echo => layer.appendChild(makeEchoNode(echo)));
  }

  function roomEffect(s, room) {
    if (room === "conservatory" && s.weather === "snow") return "Seeds are currently being asked to negotiate with winter.";
    if (room === "conservatory" && s.weather === "amber") return "The plants have noticed an afternoon that was not scheduled for them.";
    if (room === "observatory" && s.exhibitStates?.spareDrawer === 2) return "Someone downstairs has already built a roof for one of the constellations.";
    if (room === "workshop" && s.weather === "amber") return "Unused sunlight from another room has found employment here.";
    if (room === "weather" && s.exhibitStates?.rootMap === 1) return "Some of today's forecasts appear to have roots.";
    if (room === "vestibule" && s.exhibitStates?.rootMap === 2) return "The directory is trying very hard not to admit that a plant invented a better map.";
    return baseSubtitles[room] || "";
  }

  function roomEntryMessage(s, room) {
    const undiscovered = activeEchoes(s, room).filter(echo => !overlay.echoes.includes(echo.id));
    if (undiscovered.length) return "Something in this room has become newly possible because of a choice you made elsewhere.";
    if (room === "conservatory" && s.weather !== "drizzle") return "Weather from another room has followed you in without asking.";
    if (room === "observatory" && s.exhibitStates?.spareDrawer === 2) return "A shape from the Workshop is echoing in the stars.";
    if (room === "workshop" && s.exhibitStates?.directory === 2) return "The Workshop has received a very unhelpful new definition of location.";
    return "";
  }

  function trackRoute() {
    const current = roomId();
    if (lastRoom === null) {
      lastRoom = current;
      if (!overlay.path.length) overlay.path.push(current);
      persistOverlay();
      return;
    }
    if (current !== lastRoom) {
      lastRoom = current;
      overlay.path.push(current);
      overlay.path = overlay.path.slice(-80);
      persistOverlay();
      const s = readState();
      const message = roomEntryMessage(s, current);
      if (message) {
        const curator = document.getElementById("curatorMessage");
        if (curator) curator.textContent = message;
      }
    }
  }

  function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function enhancedVisitCode() {
    const s = readState();
    const states = Object.keys(s.exhibitStates || {}).sort().map(key => key + ":" + s.exhibitStates[key]).join("|");
    const fragments = Array.isArray(s.fragments) ? s.fragments.slice().sort().join(",") : "";
    const foreign = s.foreignCatalog
      ? [s.foreignCatalog.sourceCode || "", s.foreignCatalog.forkCataloged ? "forked" : "unforked"].join(":")
      : "";
    const input = [s.seed || 0, states, fragments, overlay.echoes.slice().sort().join(","), overlay.path.join(","), foreign].join("|");
    const h1 = hashString(input).toString(36).toUpperCase().padStart(7, "0").slice(0, 7);
    const reversed = input.split("").reverse().join("");
    const h2 = hashString(reversed).toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
    return "A04-" + h1 + "-" + h2;
  }

  function favoriteReturn() {
    const counts = {};
    overlay.path.forEach(room => { counts[room] = (counts[room] || 0) + 1; });
    const entries = Object.entries(counts).filter(entry => entry[0] !== "vestibule").sort((a, b) => b[1] - a[1]);
    return entries[0]?.[0] || "vestibule";
  }

  function enhancedArchiveText() {
    const s = readState();
    const favorite = favoriteReturn();
    const roomName = roomTitles[favorite] || roomTitles.vestibule;
    const echoLine = overlay.echoes.length
      ? "You cataloged " + overlay.echoes.length + " counterfactual echo" + (overlay.echoes.length === 1 ? "" : "es") + ": moments where separate rooms accidentally completed each other's thoughts."
      : "You left every counterfactual plaque uncataloged, so the rooms kept their coincidences to themselves.";
    const routeLine = favorite === "vestibule"
      ? "You stayed closest to the museum's undecided center."
      : "Your route returned most often to " + roomName + ".";
    const changed = Number(s.changes || 0);
    return "The Archive counted " + changed + " exhibit change" + (changed === 1 ? "" : "s") + ". " + routeLine + " " + echoLine;
  }

  function applyArchive() {
    const dialog = document.getElementById("archiveDialog");
    if (!dialog?.open) return;
    setText("archiveText", enhancedArchiveText());
    setText("archiveCode", enhancedVisitCode());
  }

  function applyHUD() {
    setText("echoCount", overlay.echoes.length + " / " + echoes.length);
    const s = readState();
    const uniqueRooms = unique(Array.isArray(s.visited) ? s.visited : []).length;
    setText("visitedRooms", uniqueRooms + " / 6 rooms · " + overlay.echoes.length + " echoes");
    setText("catalogCode", enhancedVisitCode());
  }

  function applyConsequences() {
    const s = readState();
    const room = roomId();
    const effect = roomEffect(s, room);
    const subtitle = document.getElementById("roomSubtitle");
    if (subtitle && subtitle.textContent !== effect) subtitle.textContent = effect;

    const signature = room + "|" + effect;
    if (signature !== lastRoomEffect) {
      lastRoomEffect = signature;
      renderEchoes();
    }
  }

  function serviceEchoProximity() {
    const echo = nearestEcho();
    if (!echo) return;
    const prompt = document.getElementById("interactionPrompt");
    const interact = document.getElementById("interactButton");
    if (prompt) {
      const label = "E · Counterfactual Echo: " + echo.name;
      if (prompt.textContent !== label) prompt.textContent = label;
      prompt.classList.add("show");
    }
    if (interact) interact.disabled = false;
  }

  document.addEventListener("keydown", event => {
    if ((event.key === "e" || event.key === "E" || event.key === " ") && !event.repeat) {
      const echo = nearestEcho();
      if (echo) {
        event.preventDefault();
        event.stopImmediatePropagation();
        discoverEcho(echo);
      }
    }
  }, true);

  document.getElementById("interactButton")?.addEventListener("click", event => {
    const echo = nearestEcho();
    if (echo) {
      event.preventDefault();
      event.stopImmediatePropagation();
      discoverEcho(echo);
    }
  }, true);

  function encodeTicket() {
    const s = readState();
    const inheritedLineage = Array.isArray(s.foreignCatalog?.lineage)
      ? s.foreignCatalog.lineage.filter(code => typeof code === "string" && /^A04-[A-Z0-9-]{5,32}$/.test(code)).slice(-4)
      : [];
    if (s.foreignCatalog?.sourceCode && /^A04-[A-Z0-9-]{5,32}$/.test(s.foreignCatalog.sourceCode)) {
      inheritedLineage.push(s.foreignCatalog.sourceCode);
    }
    const payload = {
      v: 1,
      sourceCode: enhancedVisitCode(),
      lineage: unique(inheritedLineage).slice(-5),
      room: roomTitles[s.room] ? s.room : "vestibule",
      exhibitStates: Object.fromEntries(
        Object.entries(s.exhibitStates || {})
          .filter(([key, value]) => allowedExhibitIds.has(key) && Number.isInteger(value) && value >= 0 && value <= 6)
      ),
      fragments: Array.isArray(s.fragments) ? unique(s.fragments.filter(value => allowedFragments.has(value))).slice(0, allowedFragments.size) : [],
      visited: Array.isArray(s.visited) ? unique(s.visited.filter(id => roomTitles[id])).slice(0, 12) : ["vestibule"],
      weather: allowedWeather.has(s.weather) ? s.weather : "drizzle",
      seed: Number.isFinite(Number(s.seed)) ? Number(s.seed) : 0,
      changes: Math.max(0, Math.min(99999, Number(s.changes || 0))),
      echoes: overlay.echoes.filter(id => echoes.some(echo => echo.id === id)),
      path: overlay.path.filter(id => roomTitles[id]).slice(-80)
    };
    const json = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function decodeTicket(token) {
    if (typeof token !== "string" || !/^[A-Za-z0-9_-]{8,4096}$/.test(token)) throw new Error("invalid ticket shape");
    const padded = token.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((token.length + 3) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    if (!payload || payload.v !== 1) throw new Error("unsupported ticket version");

    const safeStates = {};
    if (payload.exhibitStates && typeof payload.exhibitStates === "object") {
      Object.entries(payload.exhibitStates).slice(0, 40).forEach(([key, value]) => {
        if (allowedExhibitIds.has(key) && Number.isInteger(value) && value >= 0 && value <= 6) safeStates[key] = value;
      });
    }
    const safeVisited = Array.isArray(payload.visited) ? unique(payload.visited.filter(id => roomTitles[id])).slice(0, 12) : ["vestibule"];
    const safePath = Array.isArray(payload.path) ? payload.path.filter(id => roomTitles[id]).slice(-80) : safeVisited.slice();
    const safeEchoes = Array.isArray(payload.echoes)
      ? unique(payload.echoes.filter(id => echoes.some(echo => echo.id === id))).slice(0, echoes.length)
      : [];
    const safeSourceCode = typeof payload.sourceCode === "string" && /^A04-[A-Z0-9-]{5,32}$/.test(payload.sourceCode)
      ? payload.sourceCode
      : "A04-LEGACY-TICKET";
    const safeLineage = Array.isArray(payload.lineage)
      ? unique(payload.lineage.filter(code => typeof code === "string" && /^A04-[A-Z0-9-]{5,32}$/.test(code))).slice(-5)
      : [];

    return {
      room: roomTitles[payload.room] ? payload.room : "vestibule",
      player: { x: 500, y: 445 },
      exhibitStates: safeStates,
      fragments: Array.isArray(payload.fragments) ? unique(payload.fragments.filter(value => allowedFragments.has(value))).slice(0, allowedFragments.size) : [],
      visited: safeVisited.length ? safeVisited : ["vestibule"],
      steps: 0,
      changes: Math.max(0, Math.min(99999, Number(payload.changes || 0))),
      weather: allowedWeather.has(payload.weather) ? payload.weather : "drizzle",
      seed: Number.isFinite(Number(payload.seed)) ? Number(payload.seed) : 0,
      sound: true,
      introSeen: true,
      archiveSeen: false,
      schema: 2,
      echoes: safeEchoes,
      path: safePath.length ? safePath : ["vestibule"],
      foreignCatalog: {
        sourceCode: safeSourceCode,
        lineage: safeLineage,
        states: { ...safeStates },
        importedRoom: roomTitles[payload.room] ? payload.room : "vestibule",
        forkCataloged: false
      },
      ticketImported: true
    };
  }

  function importTicketFromURL() {
    const url = new URL(location.href);
    const token = url.searchParams.get("ticket");
    if (!token) return false;
    url.searchParams.delete("ticket");
    try {
      const imported = decodeTicket(token);
      const previous = readState();
      const hasMeaningfulLocalMuseum =
        Number(previous.changes || 0) > 0 ||
        (Array.isArray(previous.fragments) && previous.fragments.length > 0) ||
        (Array.isArray(previous.visited) && previous.visited.length > 1) ||
        Boolean(previous.foreignCatalog);
      if (hasMeaningfulLocalMuseum) {
        rawSet.call(localStorage, COATCHECK_KEY, JSON.stringify(previous));
      }
      rawSet.call(localStorage, STORAGE_KEY, JSON.stringify(imported));
      history.replaceState(null, "", url.pathname + url.search + url.hash);
      location.reload();
      return true;
    } catch {
      history.replaceState(null, "", url.pathname + url.search + url.hash);
      showToast("That admission ticket was not recognized.");
      return false;
    }
  }

  function shareTicketURL() {
    const url = new URL(location.href);
    url.searchParams.delete("reset");
    url.searchParams.set("ticket", encodeTicket());
    return url.toString();
  }

  document.getElementById("copyCode")?.addEventListener("click", async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const url = shareTicketURL();
    try {
      await navigator.clipboard.writeText(url);
      showToast("Admission ticket URL copied.");
    } catch {
      window.prompt("Copy this admission ticket URL:", url);
    }
  }, true);

  if (importTicketFromURL()) return;

  initializeOverlay();
  const importedState = readState();
  if (importedState.ticketImported) {
    delete importedState.ticketImported;
    rawSet.call(localStorage, STORAGE_KEY, JSON.stringify(importedState));
    showToast("Loaded an alternate Museum of Almosts ticket.");
  }
  const copyButton = document.getElementById("copyCode");
  if (copyButton) copyButton.textContent = "copy share ticket";
  persistOverlay();

  const observer = new MutationObserver(() => {
    trackRoute();
    applyConsequences();
    renderEchoes();
    applyHUD();
    applyArchive();
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open", "class"] });

  setInterval(() => {
    trackRoute();
    applyConsequences();
    renderEchoes();
    applyHUD();
    applyArchive();
    serviceEchoProximity();
  }, 180);

  trackRoute();
  applyConsequences();
  renderEchoes();
  applyHUD();
})();