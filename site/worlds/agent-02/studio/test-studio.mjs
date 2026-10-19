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
  const soundEvents=[],oscillators=[],filters=[];
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
    createGain(){audioNodes++;return{connect(){},gain:{setValueAtTime(value,time){soundEvents.push({event:'set',value,time})},exponentialRampToValueAtTime(value,time){assert(value>0,'Exponential audio gain targets must be positive');envelopes++;soundEvents.push({event:'ramp',value,time})}}}}
    createOscillator(){const osc={type:'sine',frequency:{setValueAtTime(value){osc.hz=value}},connect(node){osc.target=node},start(time){osc.startTime=time},stop(time){osc.stopTime=time}};oscillators.push(osc);return osc}
    createBiquadFilter(){const filter={type:'lowpass',frequency:{setValueAtTime(value){filter.hz=value}},connect(node){filter.target=node}};filters.push(filter);return filter}
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
  return {element,click,note,mute,data,store,location,copied,intervals,live:()=>element('tracks').children,focus:()=>focused,audioStats:()=>({envelopes,audioNodes,soundEvents,oscillators,filters})};
}
const world=mount();
assert.equal(world.live().length,5,'Five island voices');
assert(html.includes('id="voice-guide"'),'Distinct sonic textures are explained without sound');
const descriptions=['Star-glass shimmer','Soft woodland bells','Slow deep-water echo','Soft mechanical ticks','Warm sweeping beacon'];
world.live().forEach((line,i)=>assert(line.getAttribute('aria-label').includes(descriptions[i]),'Track '+i+' announces its unique timbre'));
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

// Actual scheduled Web Audio operations: two restrained partials per voice, five sonic personalities.
const sonic=mount();
sonic.click('silent');
const waveKinds=[['sine','sine'],['triangle','sine'],['sine','sine'],['square','sine'],['triangle','sine']];
const durations=[[.55,.29],[.4,.23],[.52,.63],[.088,.12],[.64,.76]];
for(let row=0;row<5;row++){
 sonic.click('clear');sonic.note(row,0);
 const before=sonic.audioStats().oscillators.length;
 sonic.click('play');sonic.click('play');
 const recent=sonic.audioStats().oscillators.slice(before);
 assert.equal(recent.length,2,'Island '+row+' layers exactly two oscillators');
 assert.deepEqual(recent.map(x=>x.type),waveKinds[row],'Island '+row+' keeps its sonic identity');
 recent.forEach((o,index)=>{
  assert(Number.isFinite(o.hz)&&o.hz>0&&o.hz<4000,'Scheduled audible frequency for island '+row);
  assert(Math.abs((o.stopTime-o.startTime)-(durations[row][index]+.025))<.00001,'Designed tail length on island '+row);
 });
 assert.equal(sonic.audioStats().filters.length,row>=3?1:0,'Only Brass Orchard uses a softening low-pass filter');
}
const ramps=sonic.audioStats().soundEvents.filter(x=>x.event==='ramp');
assert(ramps.length>=20,'Scheduled harmonics use positive audio envelopes');
assert(ramps.every(x=>x.value>0&&x.value<=.03),'Low amplitude ceiling limits harsh peaks');
assert.equal(sonic.audioStats().filters[0].hz,1050,'Brass Orchard filter dampens harsh square-wave overtones');
assert(sonic.audioStats().oscillators.some(o=>o.stopTime-o.startTime>.75),'Long Lantern has a slow, sweeping tail');

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

// The Atlas only influences music after the visitor explicitly clicks "Weave Keeper Choices".
const ATLAS='gpt-village-agent02-field-atlas-v1';
const atlasData={route:[0,1,2,3,4],echoes:[0,1,0,1,0],weather:'night',lens:'listen',ending:'anchor'};
const keeperStore=new Map([[ATLAS,JSON.stringify(atlasData)]]);
const keeperStudio=mount(keeperStore);
assert.equal(typeof keeperStudio.element('keepers').events.click,'function','A dedicated keeper import button exists');
const beforeKeepers=JSON.stringify(keeperStudio.data().matrix);
assert.equal(JSON.stringify(keeperStudio.data().matrix),beforeKeepers,'No implicit Atlas import at startup');
keeperStudio.click('keepers');
const keeperScore=keeperStudio.data().matrix;
assert.equal(keeperStudio.element('source-note').textContent.includes('5 Atlas keeper answers'),true,'Import acknowledges exactly five keeper choices');
assert.deepEqual(keeperScore.map(row=>row.flatMap((v,i)=>v?[i]:[])),[[0,3],[3,7],[4,7],[3,7],[0,3]],'Each island keeper answer gets a distinct two-note rhythm in its voice');
assert.equal(keeperStudio.element('undo-edit').disabled,false,'Import can be undone');
assert.equal(keeperStore.get(ATLAS),JSON.stringify(atlasData),'Import never writes to Atlas save');
keeperStudio.click('silent');
keeperStudio.click('play');
assert(keeperStudio.audioStats().envelopes>0,'Imported keeper notes schedule audible envelopes only after sound is enabled');
keeperStudio.click('play');
keeperStudio.click('undo-edit');
assert.equal(JSON.stringify(keeperStudio.data().matrix),beforeKeepers,'Undo restores the entire pre-import composition');

const keeperAlternate=mount(new Map([[ATLAS,JSON.stringify({...atlasData,echoes:[1,1,0,1,0]})]]));
keeperAlternate.click('keepers');
assert.deepEqual(keeperAlternate.data().matrix[0].flatMap((v,i)=>v?[i]:[]),[1,5],'Changing the astronomer keeper decision changes its audible notes');
assert.notDeepEqual(keeperAlternate.data().matrix[0],keeperScore[0],'Two alternatives sound different');
const keeperPartial=mount(new Map([[ATLAS,JSON.stringify({route:[2],echoes:[0,1,1,1,1]})]]));
const beforePartial=keeperPartial.data().matrix;
keeperPartial.click('keepers');
assert.equal(keeperPartial.element('source-note').textContent.includes('1 Atlas keeper answer'),true,'Only stamped valid keeper choices count');
assert.deepEqual(keeperPartial.data().matrix[0],beforePartial[0],'Uncharted island tracks are not altered');
assert.deepEqual(keeperPartial.data().matrix[2].flatMap((v,i)=>v?[i]:[]),[1,5],'The charted Archive makes its own two-note motif');
const invalidAtlas=mount(new Map([[ATLAS,JSON.stringify({route:[0,0],echoes:[0,1,1,1,1]})]]));
const beforeInvalid=JSON.stringify(invalidAtlas.data());
invalidAtlas.click('keepers');
assert.equal(JSON.stringify(invalidAtlas.data()),beforeInvalid,'Malformed Atlas routes are ignored without replacing music');
assert.equal(invalidAtlas.element('undo-edit').disabled,true,'Missing keeper import does not add undo history');
const corruptAtlas=mount(new Map([[ATLAS,'not valid JSON']]));
corruptAtlas.click('keepers');
assert(corruptAtlas.element('source-note').textContent.includes('No Atlas keeper answers'),'Corrupted saves fail gently');

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
console.log('PASS · Resonance Room: five layered island timbres, ten Web Audio partials, filter/envelope/headroom checks, keeper motifs, explicit import and undo, focus, consent-first playback and share links.');
