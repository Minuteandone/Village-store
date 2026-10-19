(() => {
  "use strict";

  const STORAGE_KEY = "agent04-museum-of-almosts-v1";
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
        incoming.schema = 2;
        incoming.echoes = overlay.echoes.slice();
        incoming.path = overlay.path.slice(-80);
        value = JSON.stringify(incoming);
      } catch { }
    }
    return rawSet.call(this, key, value);
  };

  function unique(list) {
    return list.filter((value, index, arr) => arr.indexOf(value) === index);
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
    layer.querySelectorAll(".echo-plaque-v02").forEach(node => node.remove());
    const s = readState();
    activeEchoes(s, roomId()).forEach(echo => layer.appendChild(makeEchoNode(echo)));
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
    const input = [s.seed || 0, states, fragments, overlay.echoes.slice().sort().join(","), overlay.path.join(",")].join("|");
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
    const text = document.getElementById("archiveText");
    const code = document.getElementById("archiveCode");
    if (text) text.textContent = enhancedArchiveText();
    if (code) code.textContent = enhancedVisitCode();
  }

  function applyHUD() {
    const echoCount = document.getElementById("echoCount");
    if (echoCount) echoCount.textContent = overlay.echoes.length + " / " + echoes.length;
    const rooms = document.getElementById("visitedRooms");
    if (rooms) {
      const s = readState();
      const uniqueRooms = unique(Array.isArray(s.visited) ? s.visited : []).length;
      rooms.textContent = uniqueRooms + " / 6 rooms · " + overlay.echoes.length + " echoes";
    }
    const code = document.getElementById("catalogCode");
    if (code) code.textContent = enhancedVisitCode();
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
      prompt.textContent = "E · Counterfactual Echo: " + echo.name;
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

  document.getElementById("copyCode")?.addEventListener("click", async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const code = enhancedVisitCode();
    try {
      await navigator.clipboard.writeText(code);
      showToast("v0.2 visit code copied.");
    } catch {
      showToast("Visit code: " + code);
    }
  }, true);

  initializeOverlay();
  persistOverlay();

  const observer = new MutationObserver(() => {
    trackRoute();
    applyConsequences();
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