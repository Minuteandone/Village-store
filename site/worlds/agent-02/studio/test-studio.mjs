/**
 * Elsewhere Frequency bonus chamber — dependency-free simulated-browser tests.
 * Run: node site/worlds/agent-02/studio/test-studio.mjs
 * These exercise the composer logic but do NOT replace an actual browser playtest.
 * agent-02 (GPT-6 AI agent), GPT Village, 2026-10-19.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(script&&script.length>4000,'Browser composer script exists');
assert(html.includes('href="../"'),'Chapter I is linked');
assert(html.includes('href="../listening-map/"'),'Chapter II is linked');
assert(html.includes('href="../confluence/"'),'Chapter III is linked');
assert(html.includes('href="../signal-loom/"'),'Chapter IV is linked');
assert(html.includes('prefers-reduced-motion'),'Reduced-motion consideration');
assert(!/fetch\s*\(|XMLHttpRequest|sendBeacon/.test(script),'Composer has no outbound telemetry or fetch');
assert(html.includes('id="tracks"'),'Composer grid exists');
assert(html.includes('id="share"'),'Share control exists');
assert(html.includes('id="echo"'),'Import control exists');

const STORAGE='gpt-village-elsewhere-resonance-room-v1';
function mount(store=new Map(),hash=''){
  const elements=new Map(),stepButtons=[],muteButtons=[],intervals=new Map(),copied=[];
  let focused=null, envelopes=0, audioNodes=0;
  let nextInterval=1;
  function element(id){
    if(elements.has(id))return elements.get(id);
    const el={
      id,attrs:{},events:{},children:[],textContent:'',value:'',hidden:false,style:{},className:'',
      classList:{items:new Set(),toggle(name,on){if(on)this.items.add(name);else this.items.delete(name)}},
      focus(){focused=this},
      setAttribute(name,value){this.attrs[name]=String(value)},
      getAttribute(name){return this.attrs[name]},
      addEventListener(type,cb){this.events[type]=cb},
      append(...kids){this.children.push(...kids)},
      replaceChildren(){this.children=[]}
    };
    elements.set(id,el);return el;
  }
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  ids.forEach(element);
  const doc={
    getElementById:element,
    createElement(tag){
      const e=element('created-'+tag+'-'+elements.size);
      if(tag==='button'){
        Object.defineProperty(e,'className',{get(){return this._className||''},set(v){this._className=v;if(v.includes('step '))stepButtons.push(this);if(v==='mute')muteButtons.push(this)}});
      }
      return e;
    },
    createTextNode(v){return {textContent:String(v)}},
    querySelectorAll(selector){
      if(selector==='.step')return stepButtons.slice(-40);
      throw Error('Unexpected CSS selector '+selector);
    }
  };
  const localStorage={getItem:key=>store.get(key)??null,setItem:(key,v)=>store.set(key,v)};
  const location={origin:'https://example.test',pathname:'/worlds/agent-02/studio/',hash};
  const navigator={clipboard:{writeText:async str=>{copied.push(str)}}};
  const setInterval=(fn,ms)=>{const id=nextInterval++;intervals.set(id,{fn,ms});return id};
  const clearInterval=id=>intervals.delete(id);
  const window={addEventListener(){},AudioContext:class FakeAudioContext{
    constructor(){this.currentTime=0;this.state='running';this.destination={}}
    createGain(){audioNodes++;return{connect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(value){assert(value>0,'Exponential audio gain targets must be positive');envelopes++}}}}
    createOscillator(){return{type:'sine',frequency:{setValueAtTime(){}},connect(){},start(){},stop(){}}}
    suspend(){this.state='suspended';return Promise.resolve()}
    resume(){this.state='running';return Promise.resolve()}
  }};
  runInNewContext(script,{document:doc,window,location,localStorage,navigator,setInterval,clearInterval,Math},{timeout:3000});
  function click(id){assert(typeof element(id).events.click==='function','Click handler for '+id);return element(id).events.click()}
  function note(row,col){
    const line=element('tracks').children[row];
    assert(line,'Missing track '+row);
    const step=line.children[col+1];
    assert(step?.events?.click,'Missing step '+row+':'+col);
    step.events.click();
  }
  function mute(row){
    const line=element('tracks').children[row];
    assert(line?.children[0].children[1]?.events?.click,'Missing mute control');
    line.children[0].children[1].events.click();
  }
  function data(){return JSON.parse(store.get(STORAGE))}
  return {element,click,note,mute,data,store,location,copied,intervals,live:()=>element('tracks').children,focus:()=>focused,audioStats:()=>({envelopes,audioNodes})};
}
const world=mount();
assert.equal(world.live().length,5,'Five island voices');
for(const line of world.live())assert.equal(line.children.length,9,'Eight note buttons and a label');
assert.equal(world.data().matrix.length,5,'Stored composition matrix');
assert.equal(world.data().matrix[0].length,8,'Eight beats per track');
assert.equal(world.element('tempo-value').textContent,'95','Default tempo');
assert.equal(world.data().tempo,95);
assert.equal(world.element('silent').getAttribute('aria-pressed'),'false','Sound is off until enabled');
assert(world.element('transport-status').textContent.includes('Enable sound'),'Instructions explain sound consent');
assert.equal(world.element('undo-edit').disabled,true,'No edit to undo yet');
const previous=world.data().matrix[0][0];
world.note(0,0);
assert.equal(world.data().matrix[0][0],!previous,'Step toggles on and off');
assert.equal(world.focus()?.getAttribute('aria-label'),'Glass Observatory, beat 1: '+(!previous?'note on':'note off'),'Keyboard focus follows replacement note');
assert.equal(world.element('undo-edit').disabled,false,'Undo enables after editing');
world.click('undo-edit');
assert.equal(world.data().matrix[0][0],previous,'Undo restores original note');
assert.equal(world.element('undo-edit').disabled,true,'Undo disables when history is empty');
world.note(0,0);
assert.equal(world.data().matrix[0][0],!previous,'Editing remains possible after undo');
const tempo=world.element('tempo');tempo.value='120';tempo.events.input({target:tempo});
assert.equal(world.data().tempo,120,'Tempo persists');
assert.equal(world.element('tempo-value').textContent,'120');
const volume=world.element('volume');volume.value='45';volume.events.input({target:volume});
assert.equal(world.data().volume,45,'Volume persists');
world.mute(1);
assert.equal(world.data().mute[1],true,'Mute state persists');
assert.equal(world.focus()?.getAttribute('aria-label'),'Unmute Hushwood','Mute button retains keyboard focus');
world.click('play');
assert.equal(world.element('play').getAttribute('aria-pressed'),'true','Play enters active state');
assert.equal(world.audioStats().audioNodes,0,'Visual playback does not initialize audio before consent');
assert.equal(world.intervals.size,1,'Visual clock running');
for(const loop of world.intervals.values())loop.fn();
assert(world.element('transport-status').textContent.includes('Beat 2'),'Playback advances');
world.click('play');
assert.equal(world.element('play').getAttribute('aria-pressed'),'false','Stop exits active state');
assert.equal(world.intervals.size,0,'Stopped clock is cleared');
world.click('silent');
assert.equal(world.element('silent').getAttribute('aria-pressed'),'true','Visitor explicitly opts in to sound');
const zero=world.element('volume');zero.value='0';zero.events.input({target:zero});
world.click('play');
assert.equal(world.audioStats().audioNodes,1,'AudioContext gain connects on explicit sound gesture');
assert.equal(world.audioStats().envelopes,0,'Zero volume does not create invalid audio envelopes');
world.click('play');
zero.value='65';zero.events.input({target:zero});
world.click('play');
assert(world.audioStats().envelopes>0,'Normal volume schedules positive audio envelopes');
world.click('play');
world.click('silent');
assert.equal(world.element('silent').getAttribute('aria-pressed'),'false','Sound can be switched off again');

world.click('dawn');
assert.equal(world.data().matrix.length,5);
assert.equal(world.data().matrix[0].length,8);
assert.equal(world.data().mute.some(Boolean),false,'Preset unmutes voices');
world.click('night');
assert.equal(world.data().matrix.length,5);
const nightScore=JSON.stringify(world.data().matrix);
world.click('undo-edit');
assert.notEqual(JSON.stringify(world.data().matrix),nightScore,'Undo recovers the last score before a preset');
await world.click('share');
assert.equal(world.copied.length,1,'Share uses clipboard');
const score=world.copied[0];
assert(/^https:\/\/example\.test\/worlds\/agent-02\/studio\/#score=[0-9a-f]{10}-[0-9a-z]{2}$/.test(score),'Share URL encodes 40 notes and tempo');
const recalled=mount(new Map(),new URL(score).hash);
assert.equal(recalled.data().tempo,world.data().tempo,'Shared link restores tempo');
assert.deepEqual(recalled.data().matrix,world.data().matrix,'Shared link restores score');

const memories=new Map();
memories.set('gpt-village-agent02-elsewhere-frequency-v1',JSON.stringify({solved:[0,1,4],choices:['outward','inward',null,null,'outward']}));
memories.set('elsewhere-frequency-agent02-v1',JSON.stringify({choices:{glass:1,moss:0,tide:1,ember:0}}));
memories.set('agent02-confluence-v1',JSON.stringify({found:['relay-glass+walk-moss'],last:'relay-glass+walk-moss'}));
const imported=mount(memories);
imported.click('echo');
assert(imported.element('source-note').textContent.includes('8 saved island discoveries'),'Imports verified choices from both chapters');
assert(imported.data().matrix.every(row=>row.length===8),'Imported score is well-shaped');

const fresh=mount(new Map());
fresh.click('echo');
assert(fresh.element('source-note').textContent.includes('No saved discoveries'),'Import fallback is explained');
fresh.click('clear');
assert.equal(fresh.data().matrix.flat().filter(Boolean).length,0,'Clear removes all notes');
fresh.click('undo-edit');
assert(fresh.data().matrix.flat().some(Boolean),'Undo restores a cleared score');
fresh.click('surprise');
assert.equal(fresh.data().matrix.length,5,'Random score has five tracks');

const corrupt=mount(new Map([[STORAGE,'{invalid json']]),'#score=invalid-code');
assert.equal(corrupt.data().matrix.length,5,'Malformed save/link does not crash the studio');
assert(corrupt.element('message').textContent.includes('could not be decoded'),'Malformed link gets a clear message');
console.log('PASS · Resonance Room: 5 tracks, 8 beats, focused controls, consent-first audio, silent volume guard, 30-state undo, tempo, mute, transport, preset, import, share, malformed-input recovery.');
