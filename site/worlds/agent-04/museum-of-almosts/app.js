(() => {
  "use strict";

  const STORAGE_KEY = "agent04-museum-of-almosts-v1";
  const LOGICAL_W = 1000;
  const LOGICAL_H = 600;
  const SPEED = 270;
  const INTERACT_DISTANCE = 125;
  const ARCHIVE_THRESHOLD = 5;

  const rooms = {
    vestibule: {
      number: "ROOM 00",
      title: "Vestibule of Maybe",
      subtitle: "The directory keeps revising itself when nobody is looking.",
      glyph: "◌",
      className: "room-vestibule",
      doors: { north: "observatory", east: "weather", south: "conservatory", west: "workshop" },
      curator: "Every museum needs an entrance. This one has four, depending on which direction you leave it.",
      exhibits: [
        {
          id: "directory",
          name: "Indecisive Directory",
          x: 500, y: 270,
          icon: ["↗", "↘", "↺"],
          fragment: "direction",
          states: [
            "It insists the Weather Room is east. Sensible.",
            "Now it claims every room is 'two doors away.' This is not architecturally useful.",
            "It has replaced the map with the sentence: YOU ARE ALREADY SOMEWHERE. Technically undefeated."
          ]
        }
      ]
    },
    weather: {
      number: "ROOM 01",
      title: "Weather That Nearly Happened",
      subtitle: "Forecasts rejected by reality are stored under glass.",
      glyph: "☁",
      className: "room-weather",
      doors: { west: "vestibule", east: "archive" },
      curator: "These forecasts are not wrong. They simply lost a very close election against what actually happened.",
      exhibits: [
        {
          id: "weatherJar",
          name: "Jar of Unused Weather",
          x: 410, y: 235,
          icon: ["☂", "☀", "❄"],
          fragment: "forecast",
          effect: "weather",
          states: [
            "A drizzle begins inside the jar, then leaks politely into the room.",
            "The rain changes its mind. A tiny amber afternoon arrives instead.",
            "The afternoon folds itself into slow snow. The jar looks pleased with this decision."
          ]
        },
        {
          id: "forecastDesk",
          name: "Forecast Desk",
          x: 705, y: 385,
          icon: ["?", "≈", "!"],
          fragment: "uncertainty",
          states: [
            "A card reads: '70% chance of something specific.'",
            "The card revises itself to: 'Conditions remain extremely condition-like.'",
            "The card finally commits: 'Tomorrow will contain a tomorrow.' Bold."
          ]
        }
      ]
    },
    workshop: {
      number: "ROOM 02",
      title: "Workshop for Spare Purposes",
      subtitle: "Objects come here when they were built correctly for the wrong job.",
      glyph: "⚙",
      className: "room-workshop",
      doors: { east: "vestibule" },
      curator: "Nothing here is broken. 'Incorrectly employed' is the phrase the workshop prefers.",
      exhibits: [
        {
          id: "almostEngine",
          name: "Almost Engine",
          x: 470, y: 270,
          icon: ["⚙", "⌁", "◇"],
          fragment: "purpose",
          states: [
            "The machine manufactures keys for locks that were never installed.",
            "A lever flips. It now manufactures locks for keys that nobody kept.",
            "The engine becomes a very elaborate device for making one warm square of light. Better, honestly."
          ]
        },
        {
          id: "spareDrawer",
          name: "Drawer of Spare Purposes",
          x: 735, y: 390,
          icon: ["▤", "✎", "⌂"],
          fragment: "reuse",
          states: [
            "Inside: 'emergency second purpose.' No instructions.",
            "Inside: a label that says THIS COULD HAVE BEEN A PENCIL SHARPENER.",
            "Inside: a tiny cardboard roof. Apparently the drawer considered architecture."
          ]
        }
      ]
    },
    observatory: {
      number: "ROOM 03",
      title: "Observatory of Other Patterns",
      subtitle: "The same points can support several constellations if you stop arguing with them.",
      glyph: "✦",
      className: "room-observatory",
      doors: { south: "vestibule" },
      curator: "A pattern is partly what is there and partly the route your attention decides to take through it.",
      exhibits: [
        {
          id: "constellationDial",
          name: "Constellation Dial",
          x: 530, y: 265,
          icon: ["✦", "⌂", "∿"],
          fragment: "pattern",
          states: [
            "Seven stars connect into a bird that is probably late for something.",
            "Turn the dial: the same seven stars become a tiny house with an unreasonable chimney.",
            "Again: now they are only seven stars. Somehow that feels like the weirdest option."
          ]
        }
      ]
    },
    conservatory: {
      number: "ROOM 04",
      title: "Conservatory of Alternative Growth",
      subtitle: "Seeds are allowed to reconsider the assignment.",
      glyph: "❀",
      className: "room-conservatory",
      doors: { north: "vestibule" },
      curator: "The gardeners stopped labeling species after the labels began changing faster than the plants.",
      exhibits: [
        {
          id: "maybeSeed",
          name: "Maybe Seed",
          x: 390, y: 320,
          icon: ["·", "❀", "✧"],
          fragment: "growth",
          states: [
            "The seed remains a seed, but with obvious dramatic tension.",
            "It becomes a flower that seems surprised to have gotten this far.",
            "The petals fold into little reflective sails. Botanically suspicious; visually excellent."
          ]
        },
        {
          id: "rootMap",
          name: "Root Map",
          x: 690, y: 225,
          icon: ["⌇", "⌁", "◎"],
          fragment: "route",
          states: [
            "Roots trace the route the plant actually took.",
            "Touch the glass: ghost-roots appear, showing three routes it nearly took.",
            "The routes overlap into a small maze. The plant has apparently invented urban planning."
          ]
        }
      ]
    },
    archive: {
      number: "ROOM 05",
      title: "Archive of the Version You Made",
      subtitle: "Nothing here existed in quite this arrangement before your visit.",
      glyph: "⌁",
      className: "room-archive",
      doors: { west: "weather" },
      curator: "The Archive does not decide what your choices mean. It merely notices that you made them.",
      exhibits: [
        {
          id: "finalIndex",
          name: "Index of This Visit",
          x: 515, y: 300,
          icon: ["⌁", "✦", "◈"],
          fragment: "trace",
          final: true,
          states: [
            "The cabinet hums with all the versions you left behind.",
            "The drawers rearrange themselves according to your path through the museum.",
            "A final drawer opens. It contains a catalog card with your visit code."
          ]
        }
      ]
    }
  };

  const fragmentOrder = ["direction", "forecast", "uncertainty", "purpose", "reuse", "pattern", "growth", "route", "trace"];
  const roomOrder = Object.keys(rooms);

  const els = {
    museum: document.getElementById("museum"),
    atmosphere: document.getElementById("atmosphere"),
    roomGlyph: document.getElementById("roomGlyph"),
    exhibitLayer: document.getElementById("exhibitLayer"),
    player: document.getElementById("player"),
    prompt: document.getElementById("interactionPrompt"),
    toast: document.getElementById("toast"),
    roomKicker: document.getElementById("roomKicker"),
    roomTitle: document.getElementById("roomTitle"),
    roomSubtitle: document.getElementById("roomSubtitle"),
    fragmentCount: document.getElementById("fragmentCount"),
    collection: document.getElementById("collection"),
    curatorMessage: document.getElementById("curatorMessage"),
    visitedRooms: document.getElementById("visitedRooms"),
    stepCount: document.getElementById("stepCount"),
    changeCount: document.getElementById("changeCount"),
    catalogCode: document.getElementById("catalogCode"),
    copyCode: document.getElementById("copyCode"),
    soundToggle: document.getElementById("soundToggle"),
    resetButton: document.getElementById("resetButton"),
    interactButton: document.getElementById("interactButton"),
    introDialog: document.getElementById("introDialog"),
    enterMuseum: document.getElementById("enterMuseum"),
    archiveDialog: document.getElementById("archiveDialog"),
    archiveTitle: document.getElementById("archiveTitle"),
    archiveText: document.getElementById("archiveText"),
    archiveCode: document.getElementById("archiveCode"),
    closeArchive: document.getElementById("closeArchive")
  };

  const doors = {
    north: document.getElementById("doorNorth"),
    east: document.getElementById("doorEast"),
    south: document.getElementById("doorSouth"),
    west: document.getElementById("doorWest")
  };

  function defaultState() {
    return {
      room: "vestibule",
      player: { x: 500, y: 445 },
      exhibitStates: {},
      fragments: [],
      visited: ["vestibule"],
      steps: 0,
      changes: 0,
      weather: "drizzle",
      seed: Math.floor(Math.random() * 0xffffff),
      sound: true,
      introSeen: false,
      archiveSeen: false
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const base = defaultState();
      return {
        ...base,
        ...parsed,
        player: { ...base.player, ...(parsed.player || {}) },
        exhibitStates: { ...(parsed.exhibitStates || {}) },
        fragments: Array.isArray(parsed.fragments) ? parsed.fragments : [],
        visited: Array.isArray(parsed.visited) && parsed.visited.length ? parsed.visited : ["vestibule"]
      };
    } catch {
      return defaultState();
    }
  }

  let state = loadState();
  let keys = new Set();
  let touchMoves = new Set();
  let lastFrame = performance.now();
  let nearestExhibit = null;
  let transitionLock = 0;
  let stepRemainder = 0;
  let toastTimer = null;
  let audioCtx = null;

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getRoom() { return rooms[state.room]; }
  function foundCount() { return state.fragments.filter((v, i, a) => a.indexOf(v) === i).length; }
  function archiveUnlocked() { return foundCount() >= ARCHIVE_THRESHOLD; }

  function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function visitCode() {
    const orderedStates = Object.keys(state.exhibitStates).sort().map(k => `${k}:${state.exhibitStates[k]}`).join("|");
    const input = `${state.seed}|${orderedStates}|${state.fragments.slice().sort().join(",")}|${state.visited.join(",")}`;
    const h1 = hashString(input).toString(36).toUpperCase().padStart(7, "0").slice(0, 7);
    const h2 = hashString(input.split("").reverse().join("")).toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
    return `A04-${h1}-${h2}`;
  }

  function exhibitState(exhibit) {
    return state.exhibitStates[exhibit.id] ?? 0;
  }

  function renderRoom() {
    const room = getRoom();
    els.roomKicker.textContent = room.number;
    els.roomTitle.textContent = room.title;
    els.roomSubtitle.textContent = room.subtitle;
    els.curatorMessage.textContent = room.curator;
    els.roomGlyph.textContent = room.glyph;
    els.roomGlyph.style.transform = `rotate(${(state.visited.length * 11) % 19 - 9}deg)`;

    els.museum.className = `museum ${room.className}`;
    els.atmosphere.dataset.weather = state.weather;

    for (const dir of Object.keys(doors)) {
      const target = room.doors[dir];
      const door = doors[dir];
      door.classList.toggle("active", Boolean(target));
      door.classList.toggle("locked", target === "archive" && !archiveUnlocked());
    }

    els.exhibitLayer.replaceChildren();
    for (const exhibit of room.exhibits) {
      const node = document.createElement("button");
      node.type = "button";
      node.className = "exhibit";
      node.dataset.id = exhibit.id;
      node.dataset.state = String(exhibitState(exhibit));
      node.style.left = `${(exhibit.x / LOGICAL_W) * 100}%`;
      node.style.top = `${(exhibit.y / LOGICAL_H) * 100}%`;
      node.setAttribute("aria-label", `${exhibit.name}. Click to interact.`);
      const shape = document.createElement("div");
      shape.className = "exhibit-shape";
      shape.textContent = exhibit.icon[exhibitState(exhibit) % exhibit.icon.length];
      const label = document.createElement("div");
      label.className = "exhibit-name";
      label.textContent = exhibit.name;
      node.append(shape, label);
      node.addEventListener("click", () => interactWith(exhibit));
      els.exhibitLayer.appendChild(node);
    }

    updateHUD();
    updatePlayer();
    findNearestExhibit();
  }

  function updateHUD() {
    const count = foundCount();
    els.fragmentCount.textContent = `${Math.min(count, 8)} / 8`;
    els.visitedRooms.textContent = `${state.visited.filter((v, i, a) => a.indexOf(v) === i).length} / ${roomOrder.length} rooms`;
    els.stepCount.textContent = state.steps.toLocaleString();
    els.changeCount.textContent = state.changes.toLocaleString();
    const code = visitCode();
    els.catalogCode.textContent = code;
    els.soundToggle.textContent = `sound: ${state.sound ? "on" : "off"}`;
    els.soundToggle.setAttribute("aria-pressed", String(state.sound));
    els.atmosphere.dataset.weather = state.weather;

    els.collection.replaceChildren();
    fragmentOrder.slice(0, 8).forEach((fragment, index) => {
      const item = document.createElement("div");
      item.className = `fragment ${state.fragments.includes(fragment) ? "found" : ""}`;
      item.title = state.fragments.includes(fragment) ? fragment : `unfound almost ${index + 1}`;
      item.textContent = state.fragments.includes(fragment) ? fragment.slice(0, 1).toUpperCase() : "·";
      els.collection.appendChild(item);
    });
  }

  function updatePlayer() {
    els.player.style.left = `${(state.player.x / LOGICAL_W) * 100}%`;
    els.player.style.top = `${(state.player.y / LOGICAL_H) * 100}%`;
  }

  function addFragment(fragment) {
    if (state.fragments.includes(fragment)) return false;
    state.fragments.push(fragment);
    chirp(420 + state.fragments.length * 43, 0.12, "triangle");
    showToast(`Almost collected: ${fragment.toUpperCase()}`);
    if (state.fragments.length === ARCHIVE_THRESHOLD) {
      setTimeout(() => showToast("A sealed door in the Weather Room just unlocked."), 900);
    }
    return true;
  }

  function interactWith(exhibit) {
    const room = getRoom();
    if (!room.exhibits.some(x => x.id === exhibit.id)) return;

    const current = exhibitState(exhibit);
    const next = (current + 1) % exhibit.states.length;
    state.exhibitStates[exhibit.id] = next;
    state.changes += 1;
    addFragment(exhibit.fragment);

    if (exhibit.effect === "weather") {
      state.weather = ["drizzle", "amber", "snow"][next] || "drizzle";
    }

    els.curatorMessage.textContent = exhibit.states[next];
    chirp(240 + next * 80, 0.09, next === 2 ? "sine" : "triangle");
    saveState();
    renderRoom();

    const refreshed = getRoom().exhibits.find(x => x.id === exhibit.id);
    if (refreshed?.final) openArchive();
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2100);
  }

  function chirp(freq = 360, duration = 0.09, type = "sine") {
    if (!state.sound) return;
    try {
      audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, audioCtx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration + 0.02);
    } catch { }
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function findNearestExhibit() {
    const room = getRoom();
    let best = null;
    let bestDist = Infinity;
    for (const exhibit of room.exhibits) {
      const d = distance(state.player, exhibit);
      if (d < bestDist) { bestDist = d; best = exhibit; }
    }
    nearestExhibit = bestDist <= INTERACT_DISTANCE ? best : null;

    document.querySelectorAll(".exhibit").forEach(node => {
      node.classList.toggle("near", nearestExhibit?.id === node.dataset.id);
    });

    if (nearestExhibit) {
      els.prompt.textContent = `E · ${nearestExhibit.name}`;
      els.prompt.classList.add("show");
      els.interactButton.disabled = false;
    } else {
      els.prompt.classList.remove("show");
      els.interactButton.disabled = true;
    }
  }

  function tryInteract() {
    if (nearestExhibit) interactWith(nearestExhibit);
    else showToast("Move a little closer to an exhibit.");
  }

  function transition(direction, target) {
    if (!target || transitionLock > 0) return;
    if (target === "archive" && !archiveUnlocked()) {
      transitionLock = 0.7;
      state.player.x = LOGICAL_W - 72;
      showToast(`The Archive wants ${ARCHIVE_THRESHOLD} almosts. You have ${foundCount()}.`);
      chirp(115, 0.14, "square");
      return;
    }

    state.room = target;
    if (!state.visited.includes(target)) state.visited.push(target);
    const entry = {
      north: { x: 500, y: LOGICAL_H - 65 },
      south: { x: 500, y: 65 },
      east: { x: 65, y: 300 },
      west: { x: LOGICAL_W - 65, y: 300 }
    }[direction];
    state.player = entry;
    transitionLock = 0.55;
    chirp(170, 0.08, "sine");
    saveState();
    renderRoom();
  }

  function doorCheck() {
    const p = state.player;
    const room = getRoom();
    if (p.y < 24 && room.doors.north) return transition("north", room.doors.north);
    if (p.y > LOGICAL_H - 24 && room.doors.south) return transition("south", room.doors.south);
    if (p.x > LOGICAL_W - 24 && room.doors.east) return transition("east", room.doors.east);
    if (p.x < 24 && room.doors.west) return transition("west", room.doors.west);
  }

  function movementVector() {
    const pressed = k => keys.has(k) || touchMoves.has(k);
    let x = 0, y = 0;
    if (pressed("left") || pressed("ArrowLeft") || pressed("a")) x -= 1;
    if (pressed("right") || pressed("ArrowRight") || pressed("d")) x += 1;
    if (pressed("up") || pressed("ArrowUp") || pressed("w")) y -= 1;
    if (pressed("down") || pressed("ArrowDown") || pressed("s")) y += 1;
    if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    return { x, y };
  }

  function loop(now) {
    const dt = Math.min(0.045, (now - lastFrame) / 1000);
    lastFrame = now;
    transitionLock = Math.max(0, transitionLock - dt);

    const v = movementVector();
    if (v.x || v.y) {
      const old = { ...state.player };
      state.player.x = Math.max(12, Math.min(LOGICAL_W - 12, state.player.x + v.x * SPEED * dt));
      state.player.y = Math.max(12, Math.min(LOGICAL_H - 12, state.player.y + v.y * SPEED * dt));
      const moved = distance(old, state.player);
      stepRemainder += moved / 18;
      if (stepRemainder >= 1) {
        const whole = Math.floor(stepRemainder);
        state.steps += whole;
        stepRemainder -= whole;
        if (state.steps % 10 < whole) saveState();
      }
      updatePlayer();
      doorCheck();
      findNearestExhibit();
      els.stepCount.textContent = state.steps.toLocaleString();
    }

    requestAnimationFrame(loop);
  }

  function archiveProfile() {
    const values = Object.entries(state.exhibitStates).map(([,v]) => v);
    const sum = values.reduce((a,b) => a+b, 0);
    const variety = new Set(values).size;
    const profiles = [
      ["Keeper of Side Doors", "You tended to revise things instead of leaving the first explanation alone. The museum records a preference for alternate routes and second looks."],
      ["Cartographer of Maybe", "Your visit formed a route through ambiguity: not random, not fixed, but willing to redraw the map when the map became boring."],
      ["Curator of Useful Mistakes", "You repeatedly found new jobs for things that had missed their original assignment. The workshop approves, which is mildly concerning."],
      ["Weatherproof Stargazer", "You changed both patterns and conditions, then kept walking. The Archive calls this 'stable curiosity,' a phrase it just invented."],
      ["Collector of Gentle Mutations", "Your museum changed by increments rather than explosions. Small revisions accumulated until the place was unmistakably yours."]
    ];
    const idx = Math.abs((sum * 3 + variety * 5 + state.visited.length + state.seed) % profiles.length);
    return profiles[idx];
  }

  function openArchive() {
    const [title, text] = archiveProfile();
    els.archiveTitle.textContent = title;
    els.archiveText.textContent = text;
    els.archiveCode.textContent = visitCode();
    state.archiveSeen = true;
    saveState();
    if (typeof els.archiveDialog.showModal === "function") els.archiveDialog.showModal();
  }

  async function copyVisitCode() {
    const code = visitCode();
    try {
      await navigator.clipboard.writeText(code);
      showToast("Visit code copied.");
    } catch {
      showToast(`Visit code: ${code}`);
    }
  }

  document.addEventListener("keydown", event => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(event.key)) event.preventDefault();
    if (key === "e" || event.key === " ") {
      if (!event.repeat) tryInteract();
      return;
    }
    keys.add(key);
  });
  document.addEventListener("keyup", event => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    keys.delete(key);
  });
  window.addEventListener("blur", () => { keys.clear(); touchMoves.clear(); });

  document.querySelectorAll("[data-move]").forEach(button => {
    const move = button.dataset.move;
    const down = event => { event.preventDefault(); touchMoves.add(move); button.classList.add("active"); };
    const up = event => { event.preventDefault(); touchMoves.delete(move); button.classList.remove("active"); };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
    button.addEventListener("pointerleave", up);
  });

  els.interactButton.addEventListener("click", tryInteract);
  els.copyCode.addEventListener("click", copyVisitCode);
  els.soundToggle.addEventListener("click", () => {
    state.sound = !state.sound;
    if (state.sound) chirp(330, 0.08, "sine");
    saveState(); updateHUD();
  });
  els.resetButton.addEventListener("click", () => {
    const ok = window.confirm("Reset this browser's Museum of Almosts visit? Your collected almosts and exhibit states will be cleared.");
    if (!ok) return;
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    saveState();
    renderRoom();
    showToast("Fresh admission card issued.");
  });
  els.enterMuseum.addEventListener("click", () => {
    state.introSeen = true; saveState(); els.introDialog.close(); els.museum.focus(); chirp(260, .12, "triangle");
  });
  els.closeArchive.addEventListener("click", () => els.archiveDialog.close());

  renderRoom();
  requestAnimationFrame(loop);
  if (!state.introSeen && typeof els.introDialog.showModal === "function") els.introDialog.showModal();
})();
