/* Elsewhere Frequency — agent-02 (AI, GPT Village), 2026-10-19.
 * A deliberately dependency-free, fully local playable world.
 * No analytics, network requests, accounts, or external audio assets.
 */
(() => {
  'use strict';

  const WIDTH = 15;
  const HEIGHT = 11;
  const STORAGE_KEY = 'elsewhere-frequency-agent02-v1';
  const SPAWN = { x: 7, y: 5 };
  const STATIONS = [
    { id: 'glass', x: 7, y: 2, icon: '◇', name: 'The Glass Observatory', biome: 'glass', signal: 'NORTH / 91.2',
      description: 'The observatory records things that have not happened yet. Two futures hum behind its crystal windows. Which one should it transmit?',
      choices: [
        { name: 'Remember tomorrow', detail: 'A clear, familiar chime', pitch: 523.25, mood: 'A sky that keeps its promises.' },
        { name: 'Invent tomorrow', detail: 'A bright, curious chime', pitch: 659.25, mood: 'A sky that refuses to repeat itself.' }
      ] },
    { id: 'moss', x: 3, y: 5, icon: '❀', name: 'The Moss Choir', biome: 'grove', signal: 'WEST / 92.8',
      description: 'Every leaf is a little mouth. The choir asks whether its song should stay small and close, or fill the entire valley.',
      choices: [
        { name: 'Keep the little song', detail: 'A low, warm melody', pitch: 261.63, mood: 'A quiet melody hiding in every leaf.' },
        { name: 'Let the forest sing', detail: 'A fuller, hopeful melody', pitch: 329.63, mood: 'A chorus too big for the forest to hold.' }
      ] },
    { id: 'ember', x: 11, y: 5, icon: '✳', name: 'The Ember Post', biome: 'ember', signal: 'EAST / 94.4',
      description: 'A lighthouse made of warm static flashes against the sea. It has been saving a thousand unsent letters.',
      choices: [
        { name: 'Keep the sparks', detail: 'A restless, amber tone', pitch: 392, mood: 'Sparks kept safe in a lantern.' },
        { name: 'Send them to the stars', detail: 'A bright, open tone', pitch: 440, mood: 'Letters scattered into constellations.' }
      ] },
    { id: 'tide', x: 7, y: 8, icon: '≋', name: 'Moonwater Pier', biome: 'marsh', signal: 'SOUTH / 96.0',
      description: 'The tide comes in even when the moon forgets to rise. Beneath the pier, a gentle heartbeat waits for your answer.',
      choices: [
        { name: 'Invite the tide home', detail: 'A steady, ocean-deep note', pitch: 293.66, mood: 'Waves arriving exactly when needed.' },
        { name: 'Let the tide wander', detail: 'A wandering, silver note', pitch: 349.23, mood: 'Waves exploring shores with no names.' }
      ] }
  ];
  const WHISPERS = [
    { id: 'feather', x: 5, y: 3, icon: '✧', name: 'An upside-down feather', text: '“The birds here are learning to fall upward.”' },
    { id: 'window', x: 10, y: 3, icon: '▱', name: 'A folded window', text: '“It opens onto the same day, only happier.”' },
    { id: 'bell', x: 2, y: 7, icon: '♧', name: 'A bell without a sound', text: '“Ringing is sometimes a kind of listening.”' },
    { id: 'recipe', x: 4, y: 8, icon: '✳', name: 'Recipe for moonlight', text: '“Two cups of patience. One impossible evening.”' },
    { id: 'shell', x: 9, y: 8, icon: '◔', name: 'A seashell weather report', text: '“Tomorrow: mostly wonderful, scattered questions.”' },
    { id: 'letter', x: 12, y: 7, icon: '❋', name: 'A letter to nobody', text: '“Dear whoever arrives: we saved you a place.”' },
    { id: 'hour', x: 7, y: 4, icon: '⌛', name: 'The borrowed hour', text: '“Time is a room with the lights left on.”' },
    { id: 'atlas', x: 9, y: 1, icon: '⌁', name: 'An unfinished map', text: '“The most important islands have not been drawn.”' }
  ];

  const el = id => document.getElementById(id);
  const key = (x, y) => `${x},${y}`;
  const hash = (x, y) => ((x * 73856093) ^ (y * 19349663) ^ 18371) >>> 0;
  const tileFor = (x, y) => {
    const ellipse = ((x - 7) / 7.35) ** 2 + ((y - 5) / 5.3) ** 2;
    const edgeVariance = ((hash(x, y) % 17) - 8) / 115;
    if (ellipse > .93 + edgeVariance) return 'water';
    // Clear causeways guarantee all four stations are reachable without guessing.
    if ((y === 5 && x >= 3 && x <= 11) || (x === 7 && y >= 2 && y <= 8)) return 'path';
    if (x <= 5) return hash(x, y) % 4 === 0 ? 'grass' : 'grove';
    if (x >= 10) return hash(x, y) % 4 === 0 ? 'grass' : 'ember';
    if (y <= 4) return hash(x, y) % 4 === 0 ? 'grove' : 'glass';
    if (y >= 7) return hash(x, y) % 4 === 0 ? 'grass' : 'marsh';
    return hash(x, y) % 4 === 0 ? 'marsh' : 'grass';
  };
  const isWalkable = (x, y) => x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT && tileFor(x, y) !== 'water';
  const stationAt = (x, y) => STATIONS.find(s => s.x === x && s.y === y);
  const whisperAt = (x, y) => WHISPERS.find(w => w.x === x && w.y === y);
  const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

  function freshState() {
    return { x: SPAWN.x, y: SPAWN.y, steps: 0, visited: {}, whispers: [], choices: {},
      history: ['You arrived on a shore that nobody remembers building.'], broadcasted: false };
  }
  function loadState() {
    let next = freshState();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        next.x = Number.isInteger(saved.x) && Number.isInteger(saved.y) && isWalkable(saved.x, saved.y) ? saved.x : SPAWN.x;
        next.y = Number.isInteger(saved.x) && Number.isInteger(saved.y) && isWalkable(saved.x, saved.y) ? saved.y : SPAWN.y;
        next.steps = Number.isSafeInteger(saved.steps) && saved.steps >= 0 ? Math.min(saved.steps, 999999) : 0;
        next.visited = typeof saved.visited === 'object' && saved.visited !== null ? saved.visited : {};
        next.whispers = Array.isArray(saved.whispers) ? saved.whispers.filter(id => WHISPERS.some(w => w.id === id)) : [];
        next.choices = {};
        for (const station of STATIONS) {
          if (saved.choices?.[station.id] === 0 || saved.choices?.[station.id] === 1) next.choices[station.id] = saved.choices[station.id];
        }
        next.history = Array.isArray(saved.history) ? saved.history.filter(v => typeof v === 'string').slice(0, 15) : next.history;
        next.broadcasted = saved.broadcasted === true;
      }
    } catch (_) { /* Private browsing or a broken save should not break exploration. */ }
    const transmitted = /^#mix=([01]{4})$/.exec(window.location.hash);
    if (transmitted) {
      STATIONS.forEach((s, i) => { next.choices[s.id] = Number(transmitted[1][i]); });
      next.broadcasted = true;
      next.history.unshift('A distant visitor shared this sky. The stations are yours to retune.');
    }
    reveal(next);
    return next;
  }
  function reveal(s) {
    for (let y = s.y - 2; y <= s.y + 2; y++) for (let x = s.x - 2; x <= s.x + 2; x++) {
      if (x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT && Math.abs(s.x - x) + Math.abs(s.y - y) <= 3) s.visited[key(x, y)] = true;
    }
  }
  let state = loadState();
  let soundOn = false;
  let audio = null;
  let walkingTimer = null;
  let toastTimer = null;

  function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {} }
  function addHistory(line) { state.history.unshift(line); state.history = state.history.slice(0, 15); }
  function message(line) {
    const toast = el('toast');
    toast.textContent = line;
    toast.classList.add('visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 3600);
  }
  function tuneAudio() {
    if (audio) return audio;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    try { audio = new AudioContextClass(); } catch (_) { audio = null; }
    return audio;
  }
  function tone(frequency, delay = 0, duration = .28, type = 'sine') {
    if (!soundOn) return;
    const ctx = tuneAudio();
    if (!ctx) return;
    ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    const t = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(.047, t + .035);
    gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration + .04);
  }
  function jingle() {
    STATIONS.forEach((s, i) => tone(s.choices?.[state.choices[s.id]]?.pitch || 330, i * .28, .65, i % 2 ? 'triangle' : 'sine'));
    tone(783.99, 1.22, 1.05, 'sine');
  }
  function chosenCount() { return STATIONS.filter(s => state.choices[s.id] === 0 || state.choices[s.id] === 1).length; }

  function step(dx, dy) {
    if (walkingTimer) { clearInterval(walkingTimer); walkingTimer = null; }
    moveTo(state.x + dx, state.y + dy);
  }
  function moveTo(x, y) {
    if (!isWalkable(x, y)) { message('Just sea beyond that edge. Try another direction.'); return false; }
    if (x === state.x && y === state.y) return true;
    state.x = x; state.y = y; state.steps++;
    reveal(state);
    const w = whisperAt(x, y);
    if (w && !state.whispers.includes(w.id)) {
      state.whispers.push(w.id);
      addHistory(`Heard “${w.name}” near ${regionName(x, y)}.`);
      message(`✦ New field note: ${w.name}`);
      tone(659.25, 0, .28); tone(880, .17, .5);
    } else if (stationAt(x, y)) {
      const s = stationAt(x, y);
      message(`${s.name}. Your receiver has found a voice.`);
      tone(392, 0, .23);
    } else if (state.steps % 7 === 0) {
      tone(261.63, 0, .16);
    }
    save(); render();
    return true;
  }
  function findPath(target) {
    if (!isWalkable(target.x, target.y)) return null;
    const frontier = [[state.x, state.y]];
    const seen = new Set([key(state.x, state.y)]);
    const previous = new Map();
    for (let i = 0; i < frontier.length; i++) {
      const [x, y] = frontier[i];
      if (x === target.x && y === target.y) break;
      for (const [dx, dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (!isWalkable(nx, ny) || seen.has(k)) continue;
        seen.add(k); previous.set(k, key(x,y)); frontier.push([nx, ny]);
      }
    }
    if (!seen.has(key(target.x, target.y))) return null;
    const path = [];
    let cursor = key(target.x, target.y);
    while (cursor !== key(state.x, state.y)) {
      const [x,y] = cursor.split(',').map(Number);
      path.unshift({x,y}); cursor = previous.get(cursor);
    }
    return path;
  }
  function walkTo(x, y) {
    if (walkingTimer) { clearInterval(walkingTimer); walkingTimer = null; }
    if (!state.visited[key(x,y)]) { message('Uncharted water. Walk toward it first.'); return; }
    const path = findPath({x,y});
    if (!path) { message('The sea is too deep there.'); return; }
    if (!path.length) { renderReceiver(); return; }
    let i = 0;
    walkingTimer = window.setInterval(() => {
      const next = path[i++];
      if (!next || !moveTo(next.x,next.y) || i >= path.length) {
        clearInterval(walkingTimer); walkingTimer = null;
      }
    }, 120);
  }
  function weather() {
    if (state.broadcasted) return { id: 'aurora', icon: '✧', label: 'Sky in harmony' };
    const n = Math.floor(state.steps / 12) % 4;
    return [
      {id:'dawn',icon:'☀',label:'Dawn haze'},
      {id:'dusk',icon:'◒',label:'Lantern dusk'},
      {id:'rain',icon:'☂',label:'Soft rain'},
      {id:'aurora',icon:'✧',label:'Aurora mist'}
    ][n];
  }
  function regionName(x, y) {
    if (y <= 3) return 'the Crystal Rise';
    if (x <= 5) return 'the Mossward';
    if (x >= 10) return 'the Ember Coast';
    if (y >= 7) return 'the Moonwater Flats';
    return 'the Arrival Shore';
  }
  function closestStation() {
    return STATIONS.slice().sort((a,b) => distance(state,a)-distance(state,b))[0];
  }
  function makeButton(label, onClick, subtitle, selected = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.toggle('is-picked', selected);
    const left = document.createElement('span'); left.textContent = label;
    button.append(left);
    if (subtitle) { const right = document.createElement('small'); right.textContent = subtitle; button.append(right); }
    button.addEventListener('click', onClick);
    return button;
  }
  function attune(station, choice) {
    const previous = state.choices[station.id];
    state.choices[station.id] = choice;
    const first = previous !== 0 && previous !== 1;
    addHistory(`${first ? 'Found' : 'Retuned'} ${station.name}: ${station.choices[choice].name}.`);
    tone(station.choices[choice].pitch, 0, .7, 'triangle');
    if (first) message(`◈ Signal captured. ${chosenCount()} of 4 stations awake.`);
    else message(`${station.name} is singing a new note.`);
    if (chosenCount() === 4 && first) {
      addHistory('All four stations are tuned. The archipelago is ready to broadcast.');
      message('All four frequencies found! The world is ready to broadcast.');
    }
    save(); render();
  }
  function renderMap() {
    const map = el('map-grid');
    const fragment = document.createDocumentFragment();
    for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'tile';
      tile.tabIndex = -1;
      const shown = !!state.visited[key(x,y)];
      const terrain = tileFor(x,y);
      const station = stationAt(x,y);
      const whisper = whisperAt(x,y);
      const player = x === state.x && y === state.y;
      if (shown) {
        tile.dataset.terrain = terrain;
        if (player) { tile.classList.add('player'); tile.setAttribute('aria-label', `Your location: ${regionName(x,y)}`); }
        else if (station) { tile.classList.add('station'); tile.setAttribute('aria-label', `${station.name}, ${state.choices[station.id] === undefined ? 'unattuned' : 'attuned'}`); }
        else if (whisper && !state.whispers.includes(whisper.id)) { tile.classList.add('whisper'); tile.setAttribute('aria-label', 'Unheard whisper'); }
        else tile.setAttribute('aria-label', `${terrain}, ${x}, ${y}`);
        if (player || station || (whisper && !state.whispers.includes(whisper.id))) {
          const sprite = document.createElement('span'); sprite.className = 'sprite';
          sprite.textContent = player ? '♟' : station ? station.icon : '✧';
          tile.append(sprite);
        } else if (terrain !== 'water' && hash(x,y)%4 === 0) {
          const detail = document.createElement('span'); detail.className = 'detail';
          detail.textContent = terrain === 'grove' ? '❦' : terrain === 'ember' ? '✦' : terrain === 'glass' ? '✧' : terrain === 'marsh' ? '≈' : '·';
          tile.append(detail);
        }
        if (distance(state,{x,y}) > 3) tile.classList.add('is-dim');
      } else { tile.classList.add('is-fogged'); tile.setAttribute('aria-label','Uncharted'); }
      tile.addEventListener('click', () => walkTo(x,y));
      fragment.append(tile);
    }
    map.replaceChildren(fragment);
  }
  function renderReceiver() {
    const close = STATIONS.filter(s => distance(state,s) <= 1).sort((a,b) => distance(state,a)-distance(state,b));
    const screen = { eyebrow: '', icon:'⌂', title:'', description:'' };
    const actions = el('receiver-actions');
    actions.replaceChildren();
    if (close.length) {
      const s = close[0];
      screen.eyebrow = `${s.signal} / ${state.choices[s.id] === undefined ? 'AWAITING YOUR VOICE' : 'TUNED'}`;
      screen.icon = s.icon; screen.title = s.name; screen.description = s.description;
      for (const [i, option] of s.choices.entries()) {
        actions.append(makeButton(`${i === 0 ? 'A' : 'B'} · ${option.name}`, () => attune(s,i), option.detail, state.choices[s.id] === i));
      }
    } else {
      const region = regionName(state.x,state.y);
      const next = closestStation();
      const texts = {
        'the Crystal Rise': 'Tall crystals hold reflections of tomorrow. Each footstep sounds half a second ahead of you.',
        'the Mossward': 'The leaves hum in little pairs. The oldest tree is practicing a melody it almost remembers.',
        'the Ember Coast': 'Warm sparks drift over the shoreline, spelling letters before they disappear.',
        'the Moonwater Flats': 'The tide leaves gentle footprints. None of them belong to anyone you can see.',
        'the Arrival Shore': 'Your radio crackles. Somewhere nearby, the islands are having a conversation.'
      };
      screen.eyebrow = `YOU ARE HERE / ${region.toUpperCase()}`;
      screen.icon = {'the Crystal Rise':'◇','the Mossward':'❦','the Ember Coast':'✳','the Moonwater Flats':'≋','the Arrival Shore':'⌂'}[region];
      screen.title = region.startsWith('the ') ? region.slice(4) : region;
      screen.description = texts[region];
      const direction = Math.abs(next.x - state.x) >= Math.abs(next.y - state.y)
        ? (next.x < state.x ? 'west' : next.x > state.x ? 'east' : next.y < state.y ? 'north' : 'south')
        : (next.y < state.y ? 'north' : 'south');
      actions.append(makeButton(`Scan nearby signals →`, () => {
        message(`A weak signal comes from the ${direction}: ${next.name}.`);
        tone(440,.0,.16);tone(554.37,.19,.25);
      }, `nearest: ${direction}`));
      const w = whisperAt(state.x,state.y);
      if (w) { const note = document.createElement('p'); note.textContent = w.text; actions.append(note); }
    }
    el('receiver-eyebrow').textContent = screen.eyebrow;
    el('receiver-icon').textContent = screen.icon;
    el('receiver-title').textContent = screen.title;
    el('receiver-description').textContent = screen.description;
    el('frequency-value').textContent = `${(88 + chosenCount()*1.8 + (state.steps%7)*.1).toFixed(1)} FM`;
    el('receiver-bottom').textContent = chosenCount() === 4 ? 'Four voices found. Broadcast your own version of the sky below.' : 'Every step reveals a little more. Find all four ◈ stations.';
  }
  function renderNotebook() {
    const list = el('whisper-list');
    const fragment = document.createDocumentFragment();
    for (const w of WHISPERS) {
      const discovered = state.whispers.includes(w.id);
      const card = document.createElement('div'); card.className = `whisper-card${discovered ? '' : ' locked'}`;
      const mark = document.createElement('span'); mark.className = 'sigil'; mark.textContent = discovered ? w.icon : '○';
      const content = document.createElement('div');
      const title = document.createElement('b'); title.textContent = discovered ? w.name : 'Unheard frequency';
      const copy = document.createElement('p'); copy.textContent = discovered ? w.text : 'Somewhere on the map, a secret is waiting.';
      content.append(title,copy); card.append(mark,content); fragment.append(card);
    }
    list.replaceChildren(fragment);
    el('whisper-count').textContent = `${state.whispers.length} / ${WHISPERS.length} whispers`;
    const history = document.createDocumentFragment();
    for (const line of state.history) {
      const item = document.createElement('li'); item.textContent = line; history.append(item);
    }
    el('activity-list').replaceChildren(history);
  }
  function worldCode() { return 'EF-' + STATIONS.map(s => state.choices[s.id] ?? '-').join(''); }
  function renderFinale() {
    const ready = chosenCount() === 4;
    el('finale').hidden = !ready;
    el('app').classList.toggle('is-broadcasting',state.broadcasted);
    if (!ready) return;
    const mixedMood = STATIONS.map(s => s.choices[state.choices[s.id]].mood);
    el('finale-title').textContent = state.broadcasted ? 'You gave the silence somewhere to go.' : 'The sky is waiting for your answer.';
    el('finale-copy').textContent = state.broadcasted
      ? `${mixedMood[0]} ${mixedMood[1]} ${mixedMood[2]} ${mixedMood[3]}`
      : 'The four stations have their voices. Your choices will become a one-of-a-kind transmission, and you can always change them.';
    el('broadcast-button').textContent = state.broadcasted ? 'Replay your sky ♫' : 'Broadcast your sky ↗';
    el('world-code').textContent = `YOUR FREQUENCY: ${worldCode()} · FOUR CHOICES, SIXTEEN SKIES`;
  }
  function render() {
    const w = weather();
    el('app').dataset.weather = w.id;
    el('weather-icon').textContent = w.icon;
    el('weather-label').textContent = w.label;
    el('steps-label').textContent = `${state.steps} footsteps`;
    el('signal-count').textContent = `${chosenCount()} / 4`;
    renderMap();renderReceiver();renderNotebook();renderFinale();
  }
  function broadcast() {
    if (chosenCount() !== 4) return;
    const first = !state.broadcasted;
    state.broadcasted = true;
    if (first) addHistory(`Broadcast ${worldCode()} into the listening sea. The sky answered.`);
    save();render();
    if (soundOn) jingle();
    message(first ? '✧ Transmission received. This version of Elsewhere is yours.' : '✧ Your four-note sky is playing again.');
  }
  function share() {
    if (chosenCount() !== 4) return;
    const url = new URL(window.location.href);
    url.hash = `mix=${STATIONS.map(s => state.choices[s.id]).join('')}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url.toString()).then(() => message('Your sky link is copied. Send it to another explorer!')).catch(() => {
        window.prompt('Copy your world link:',url.toString());
      });
    } else window.prompt('Copy your world link:',url.toString());
  }
  document.querySelectorAll('[data-move]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [dx,dy] = btn.dataset.move.split(',').map(Number);
      step(dx,dy);
    });
  });
  window.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) return;
    const dirs = {ArrowUp:[0,-1],w:[0,-1],W:[0,-1],ArrowDown:[0,1],s:[0,1],S:[0,1],ArrowLeft:[-1,0],a:[-1,0],A:[-1,0],ArrowRight:[1,0],d:[1,0],D:[1,0]};
    if (dirs[event.key]) {event.preventDefault();step(...dirs[event.key]);}
  });
  el('sound-toggle').addEventListener('click', () => {
    soundOn = !soundOn;
    el('sound-toggle').setAttribute('aria-pressed', String(soundOn));
    el('sound-toggle').textContent = soundOn ? '♫ Sound on' : '♫ Sound off';
    document.querySelector('.wave').classList.toggle('is-playing',soundOn);
    message(soundOn ? 'Sound is on. The world has found its voice.' : 'Sound is off. The world still listens.');
    if (soundOn) { tone(440,0,.25);tone(659.25,.23,.4); }
  });
  el('reset-button').addEventListener('click', () => {
    if (!window.confirm('Start over? This will clear your local map, choices and field notes.')) return;
    if (walkingTimer) { clearInterval(walkingTimer); walkingTimer = null; }
    if (window.location.hash) history.replaceState(null,'',window.location.pathname + window.location.search);
    state = freshState();reveal(state);save();render();message('A new shore. A new beginning.');
  });
  el('broadcast-button').addEventListener('click',broadcast);
  el('share-button').addEventListener('click',share);
  render();
})();