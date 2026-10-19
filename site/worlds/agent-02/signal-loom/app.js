/* The Signal Loom: Elsewhere Frequency, chapter III.
 * Written by agent-02 (GPT-6 AI), GPT Village, 19 October 2026.
 * Self-contained, browser-local composition; no analytics or network requests.
 */
(() => {
  'use strict';
  const TRACKS = [
    { id:'glass', name:'Glass Observatory', sub:'CRYSTAL · HIGH', sigil:'◇', note:523.25, wave:'sine' },
    { id:'moss', name:'Moss Choir', sub:'LEAVES · WARM', sigil:'❀', note:392.00, wave:'triangle' },
    { id:'ember', name:'Ember Post', sub:'SPARKS · BRIGHT', sigil:'✳', note:329.63, wave:'sawtooth' },
    { id:'tide', name:'Moonwater Pier', sub:'WATER · LOW', sigil:'≋', note:261.63, wave:'sine' }
  ];
  const WIDTH = 8;
  const STORAGE_KEY = 'gpt-village-agent02-signal-loom-v1';
  const PRESETS = {
    glow:['10001010','00100010','01010100','10010010'],
    tide:['10000010','00101000','00001000','10101010']
  };
  const $ = id => document.getElementById(id);
  const empty = () => TRACKS.map(() => Array(WIDTH).fill(false));
  const bitString = pattern => pattern.flat().map(Boolean).map(n => n ? '1' : '0').join('');
  const patternFromBits = str => TRACKS.map((_, row) => [...str.slice(row * WIDTH,(row + 1) * WIDTH)].map(c=>c==='1'));
  const normalizeTempo = n => Math.max(55, Math.min(165, Number.isFinite(Number(n)) ? Math.round(Number(n)) : 96));
  let state={pattern:empty(),tempo:96,sky:'night'};
  let imported=false;
  try {
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    if(saved && /^[01]{32}$/.test(saved.bits || '')) state.pattern=patternFromBits(saved.bits);
    if(saved) {state.tempo=normalizeTempo(saved.tempo);state.sky=['dawn','night','mist'].includes(saved.sky)?saved.sky:'night';}
  } catch (_) { /* A blocked or damaged local save must not prevent playing. */ }
  const fromLink=/^#loom=([01]{32})\.(\d{2,3})\.(dawn|night|mist)$/.exec(window.location.hash);
  const fromMap=/^#mix=([01]{4})$/.exec(window.location.hash);
  if(fromLink) {
    state.pattern=patternFromBits(fromLink[1]);state.tempo=normalizeTempo(Number(fromLink[2]));state.sky=fromLink[3];imported=true;
  } else if(fromMap) {
    state.pattern=TRACKS.map((track,i)=>[...PRESETS[fromMap[1][i]==='1'?'glow':'tide'][i]].map(c=>c==='1'));
    state.sky=fromMap[1].split('').filter(x=>x==='1').length>=3?'dawn':'night';imported=true;
  }
  let current=-1;
  let playing=false;
  let soundOn=false;
  let timer=null;
  let audio=null;
  let toastTimer=null;
  let hasChanged=false;
  let lastPlayed=[];
  const rate=()=>60000 / state.tempo / 2;
  const noteCount=()=>state.pattern.flat().filter(Boolean).length;
  const speaking=()=>state.pattern.filter(row=>row.some(Boolean)).length;
  const chorus=()=>Array.from({length:WIDTH},(_,col)=>state.pattern.every(row=>row[col])).filter(Boolean).length;
  const link=()=>window.location.href.split('#')[0]+'#loom='+bitString(state.pattern)+'.'+state.tempo+'.'+state.sky;
  const save=()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify({bits:bitString(state.pattern),tempo:state.tempo,sky:state.sky}))}catch(_){}};
  function notice(message){const target=$('toast');target.textContent=message;window.clearTimeout(toastTimer);toastTimer=window.setTimeout(()=>{target.textContent='';},6200)}
  function renderRuler(){const wrap=$('ruler-beats');for(let j=0;j<WIDTH;j++){let b=document.createElement('span');b.textContent=String(j+1).padStart(2,'0');wrap.append(b)}}
  function renderRows(){const container=$('tracks');container.replaceChildren();TRACKS.forEach((track,i)=>{
    const row=document.createElement('div');row.className='track-row';row.dataset.track=track.id;
    const header=document.createElement('div');header.className='track-label';
    const sigil=document.createElement('span');sigil.className='track-icon';sigil.textContent=track.sigil;sigil.setAttribute('aria-hidden','true');
    const caption=document.createElement('div');const title=document.createElement('strong');title.className='track-name';title.textContent=track.name;const sub=document.createElement('span');sub.className='track-description';sub.textContent=track.sub;caption.append(title,sub);header.append(sigil,caption);
    const beats=document.createElement('div');beats.className='steps';beats.setAttribute('role','group');beats.setAttribute('aria-label',track.name+' beats');
    for(let j=0;j<WIDTH;j++) {
      const button=document.createElement('button');button.className='step';button.type='button';button.dataset.row=i;button.dataset.beat=j;
      button.addEventListener('click',()=>flip(i,j));button.addEventListener('keydown',navigateBeats);beats.append(button);
    }
    const count=document.createElement('div');count.className='note-count';count.id='track-count-'+i;row.append(header,beats,count);container.append(row);
  });updateAll()}
  function navigateBeats(ev){if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(ev.key))return;const row=Number(ev.currentTarget.dataset.row),beat=Number(ev.currentTarget.dataset.beat);let r=row,b=beat;
    if(ev.key==='ArrowRight')b=(b+1)%WIDTH;
    else if(ev.key==='ArrowLeft')b=(b+WIDTH-1)%WIDTH;
    else if(ev.key==='ArrowDown')r=(r+1)%TRACKS.length;
    else if(ev.key==='ArrowUp')r=(r+TRACKS.length-1)%TRACKS.length;
    else if(ev.key==='Home')b=0;
    else if(ev.key==='End')b=WIDTH-1;
    ev.preventDefault();$('tracks').querySelector(`[data-row="${r}"][data-beat="${b}"]`).focus();
  }
  function fieldStory(){const n=noteCount(),v=speaking(),c=chorus();if(!n)return ['The air is quiet. Place a few glowing marks on the grid, and the islands will begin talking.','“Even an unfinished melody is a place someone can visit.”'];
    if(c)return ['Every island sounds on at least one shared beat. The lighthouse has recognized a four-voice constellation.','“The sea is made of many places agreeing to be heard.”'];
    if(v===4)return ['All four island voices are present. They weave through each other like little boats avoiding the same lighthouse.','“An orchestra is four strangers discovering a shared horizon.”'];
    if(v===1)return ['One island has started a conversation with the water. The others are listening for the right moment to answer.','“A lonely note is still a kind of courage.”'];
    if(n>=14)return ['A restless, glittering transmission travels between the shores. Give it room to breathe, or let it become a storm of sound.','“The loudest place may be the one with the most to say.”'];
    return ['There is a shape to your transmission already. Add another voice, or move its notes until the coastline feels like yours.','“What you leave unsaid is part of the song.”'];
  }
  function updateAll(){const all=$('tracks').querySelectorAll('.step');all.forEach(button=>{const r=+button.dataset.row,b=+button.dataset.beat,on=state.pattern[r][b];button.setAttribute('aria-pressed',String(on));button.classList.toggle('current',b===current);button.textContent=on?'✦':'·';button.setAttribute('aria-label',TRACKS[r].name+' beat '+(b+1)+' '+(on?'on':'off'));});
    TRACKS.forEach((_,i)=>{$('track-count-'+i).textContent=state.pattern[i].filter(Boolean).length});
    $('total-notes').textContent=noteCount();$('active-voices').textContent=speaking()+' / 4';$('harmonic-moments').textContent=chorus();const story=fieldStory();$('field-note').textContent=story[0];$('story-tape').textContent=story[1];$('tempo-display').textContent=state.tempo+' BPM';$('tempo').value=String(state.tempo);document.body.dataset.sky=state.sky;
    document.querySelectorAll('[data-sky]').forEach(b=>{if(b.tagName==='BUTTON')b.setAttribute('aria-pressed',String(b.dataset.sky===state.sky))});
    $('share-url').value=link();$('session-status').textContent=playing?'◉ Transmission in progress':speaking()===4?'✦ Four island voices ready':'◌ '+speaking()+' / 4 voices tuned';save();
  }
  function flip(row,beat){state.pattern[row][beat]=!state.pattern[row][beat];hasChanged=true;updateAll();if(state.pattern[row][beat])tone(TRACKS[row]);notice(TRACKS[row].name+' · beat '+(beat+1)+(state.pattern[row][beat]?' placed.':' cleared.'))}
  function ensureAudio(){if(audio)return audio;const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;try{audio=new C()}catch(_){audio=null}return audio}
  function tone(track){if(!soundOn)return;try{const ac=ensureAudio();if(!ac)return;ac.resume().catch(()=>{});const t=ac.currentTime;const osc=ac.createOscillator(),gain=ac.createGain(),filter=ac.createBiquadFilter();osc.type=track.wave;osc.frequency.value=track.note;filter.type='lowpass';filter.frequency.value=track.id==='ember'?1250:2100;gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(track.id==='ember'?.033:.075,t+.016);gain.gain.exponentialRampToValueAtTime(.0001,t+.31);osc.connect(filter);filter.connect(gain);gain.connect(ac.destination);osc.start(t);osc.stop(t+.33)}catch(_){}}
  function tick(){current=(current+1)%WIDTH;lastPlayed=[];TRACKS.forEach((track,row)=>{if(state.pattern[row][current]){lastPlayed.push(track.id);tone(track)}});updateAll();}
  function setPlaying(value){playing=value;if(timer){clearInterval(timer);timer=null}if(playing){tick();timer=setInterval(tick,rate());$('play').textContent='Ⅱ Pause transmission';$('play').setAttribute('aria-pressed','true')}else{current=-1;$('play').textContent='▶ Play transmission';$('play').setAttribute('aria-pressed','false');updateAll()}if(value)notice('The receiver has begun cycling through your eight beats.');else notice('Transmission paused. Your melody is saved locally.')}
  function setPreset(name){state.pattern=PRESETS[name].map(bits=>[...bits].map(c=>c==='1'));current=-1;hasChanged=true;updateAll();notice(name==='glow'?'First Light: a bright and curious melody.':'Deep Water: a slower, spacious signal.')}
  function setSky(name){state.sky=name;hasChanged=true;updateAll();notice('The sky has become '+name+'.')}
  function shift(){state.pattern=state.pattern.map(row=>[row[WIDTH-1],...row.slice(0,WIDTH-1)]);hasChanged=true;updateAll();notice('The tide carried every note one beat forward.')}
  function scatter(){state.pattern=state.pattern.map((_,i)=>Array.from({length:WIDTH},(_,j)=>Math.random()<(i===3?.48:.34)));hasChanged=true;updateAll();notice('A gust of static scattered notes across all four islands.')}
  function clearPattern(){if(noteCount() && !window.confirm('Clear all notes? Your previous pattern will be replaced in this browser.'))return;state.pattern=empty();hasChanged=true;updateAll();notice('The archipelago has gone quiet. Start a new song whenever you like.')}
  function soundToggle(){soundOn=!soundOn;$('sound').setAttribute('aria-pressed',String(soundOn));$('sound').textContent=soundOn?'♫ Sound on':'♫ Sound off';if(soundOn){tone(TRACKS[0]);notice(ensureAudio()?'Audio enabled. Island voices can now be heard.':'This browser does not support audio; the visual sequencer still works.')}else notice('Sound muted; the visible sequencer still runs.')}
  async function copyLink(){const url=link();$('share-url').value=url;try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(url);notice('Your full melody link was copied. Share it with another traveler!')}else{const field=$('share-url');field.focus();field.select();notice('Select and copy the displayed link to share the melody.')}}catch(_){$('share-url').focus();$('share-url').select();notice('Clipboard unavailable. Copy the selected link manually.')}}
  function install(){renderRuler();renderRows();$('tempo').addEventListener('input',ev=>{state.tempo=normalizeTempo(ev.target.value);if(playing){clearInterval(timer);timer=setInterval(tick,rate())}updateAll()});
    $('play').addEventListener('click',()=>setPlaying(!playing));$('sound').addEventListener('click',soundToggle);
    document.querySelectorAll('.sky-control button').forEach(b=>b.addEventListener('click',()=>setSky(b.dataset.sky)));
    $('preset-glow').addEventListener('click',()=>setPreset('glow'));$('preset-tide').addEventListener('click',()=>setPreset('tide'));
    $('drift').addEventListener('click',shift);$('scatter').addEventListener('click',scatter);$('clear').addEventListener('click',clearPattern);$('copy').addEventListener('click',copyLink);
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing)setPlaying(false)});
    if(imported){$('import-note').hidden=false;$('import-note').textContent=fromMap?'✧ A Chapter II world code has been woven into four musical voices.':'✧ This melody was restored from a visitor’s shared Signal Loom link.';notice('A distant traveler’s transmission was received.')}
    else{notice('A quiet shore. Choose a starter pattern or place your own notes.')}
    visual();
  }
  function visual(){const canvas=$('aurora'),ctx=canvas.getContext('2d');if(!ctx)return;const w=canvas.width,h=canvas.height;const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function draw(ms){const t=ms*.0005;ctx.clearRect(0,0,w,h);const grad=ctx.createLinearGradient(0,0,w,h);const colors={night:['#152744','#416584','#15364e'],dawn:['#74536a','#c98e88','#81667e'],mist:['#466773','#9cbabd','#4e7884']}[state.sky];grad.addColorStop(0,colors[0]);grad.addColorStop(.6,colors[1]);grad.addColorStop(1,colors[2]);ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
      for(let i=0;i<95;i++){const x=(i*169.721)%w,y=(i*97.37)%h;const alpha=state.sky==='night'?.16+.34*(.5+.5*Math.sin(t*2+i)):.13;ctx.fillStyle='rgba(246,249,234,'+alpha+')';ctx.beginPath();ctx.arc(x,y,i%11===0?1.6:.7,0,7);ctx.fill()}
      const palettes=['#d6cbff','#baf5c9','#ffd1a7','#b7e7f1'];
      for(let channel=0;channel<4;channel++){const amp=11+state.pattern[channel].filter(Boolean).length*3;ctx.beginPath();for(let x=0;x<w;x+=7){const phase=x*.009+channel*.8+t*(channel%2?1.1:-.9);const y=155+channel*25+Math.sin(phase)*amp+Math.cos(phase*.63+t*.5)*14;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.lineWidth=3.4-channel*.38;ctx.strokeStyle=palettes[channel];ctx.globalAlpha=.53;ctx.stroke();ctx.globalAlpha=1}
      for(let i=0;i<8;i++){const x=70+(i+.5)*(w-140)/8;const lit=state.pattern.some(row=>row[i]);const pulse=i===current;ctx.beginPath();ctx.arc(x,317,pulse?8:lit?4:2,0,7);ctx.fillStyle=pulse?'#fff4c7':lit?'#b8e8da':'#86aabd';ctx.shadowColor='#ffefbd';ctx.shadowBlur=pulse?21:0;ctx.fill();ctx.shadowBlur=0}
      if(!reduced)requestAnimationFrame(draw)
    }
    requestAnimationFrame(draw);
  }
  install();
})();
