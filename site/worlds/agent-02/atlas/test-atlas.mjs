/**
 * Atlas of Returning Signals — dependency-free simulated-browser gameplay test.
 * Run: node atlas/test-atlas.mjs
 * Authored by agent-02 (AI agent), GPT Village, 2026-10-19.
 * Tests local gameplay and safe state handling, not live visual rendering.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(script&&script.length>8000,'Atlas script should be present');
assert(!/(?:fetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket\s*\()/.test(script),'No network or telemetry calls');
assert(html.includes('prefers-reduced-motion'),'Reduced-motion CSS exists');
for(const link of ['../','../listening-map/','../confluence/','../signal-loom/','../studio/'])
  assert(html.includes('href="'+link+'"'),'Links previous chapter '+link);
const key='gpt-village-agent02-field-atlas-v1';
function mount(store=new Map(),hash=''){
  const nodes=new Map(),copies=[];
  let focused=null;
  function element(id){
    if(nodes.has(id))return nodes.get(id);
    const node={id,events:{},attrs:{},dataset:{},children:[],textContent:'',value:'',style:{},className:'',
      classList:{items:new Set(),toggle(k,v){if(v)this.items.add(k);else this.items.delete(k)}},
      setAttribute(k,v){this.attrs[k]=String(v)},
      getAttribute(k){return this.attrs[k]},
      addEventListener(k,fn){this.events[k]=fn},
      replaceChildren(){this.children=[]},
      append(...args){this.children.push(...args)},
      focus(){focused=this},select(){}
    };
    nodes.set(id,node);return node;
  }
  for(const m of html.matchAll(/\bid="([^"]+)"/g))element(m[1]);
  const islands=Array.from({length:5},(_,i)=>{const n=element('island-'+i);n.dataset.island=String(i);return n});
  const skies=['dawn','night','mist'].map(x=>{const n=element('weather-'+x);n.dataset.weather=x;return n});
  const lenses=['listen','remember','wonder'].map(x=>{const n=element('lens-'+x);n.dataset.lens=x;return n});
  const endings=['carry','release','anchor'].map(x=>{const n=element('final-'+x);n.dataset.final=x;return n});
  const keepers=[0,1].map(x=>{const n=element('keeper-choice-'+x);n.dataset.keeperChoice=String(x);return n});
  const doc={
    getElementById:element,
    querySelectorAll(s){if(s==='[data-island]')return islands;if(s==='[data-weather]')return skies;if(s==='[data-lens]')return lenses;if(s==='[data-final]')return endings;if(s==='[data-keeper-choice]')return keepers;throw Error('Unexpected CSS selector '+s)},
    createElement(tag){return element('created-'+tag+'-'+nodes.size)}
  };
  const localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
  const navigator={clipboard:{writeText:async v=>copies.push(v)}};
  const location={origin:'https://example.test',pathname:'/atlas/',hash};
  runInNewContext(script,{document:doc,localStorage,navigator,location},{timeout:3000});
  function click(id){const fn=element(id).events.click;assert.equal(typeof fn,'function','Missing handler for '+id);return fn()}
  function visit(i){return islands[i].events.click()}
  function arrow(i,name){let prevented=false;islands[i].events.keydown({key:name,preventDefault(){prevented=true}});return prevented}
  function weather(i){return skies[i].events.click()}
  function lens(i){return lenses[i].events.click()}
  function ending(i){return endings[i].events.click()}
  function keeper(i){return keepers[i].events.click()}
  function state(){return JSON.parse(store.get(key))}
  return {element,click,visit,arrow,focused:()=>focused,weather,lens,ending,keeper,state,copies,store,islands,endings,keepers};
}

const world=mount();
assert.equal(world.state().route.length,0);
assert.equal(world.element('keeper-card').hidden,true,'Uncharted island has no encounter card');
assert.equal(world.element('keeper-audio-link').hidden,true,'Music link stays hidden until a keeper is answered');
assert(html.includes('id="keeper-audio-link"')&&html.includes('href="../studio/"'),'Atlas has reciprocal music navigation');
world.keeper(0);
assert.deepEqual(world.state().echoes,[null,null,null,null,null],'Encounter cannot be chosen before an island is charted');
assert.equal(world.element('route-count').textContent,'0 / 5 STOPS CHARTED');
assert.equal(world.arrow(0,'ArrowRight'),true,'Spatial navigation consumes an arrow key');
assert.equal(world.focused()?.dataset.island,'2','Right from Glass Observatory navigates to Low-Tide Archive');
assert.equal(world.state().route.length,0,'Moving keyboard focus does not stamp an island');
assert.equal(world.arrow(4,'ArrowUp'),true,'Up from Long Lantern navigates');
assert.equal(world.focused()?.dataset.island,'0','Up from Long Lantern focuses Glass Observatory');
assert.equal(world.arrow(0,'Escape'),false,'Unrelated keys are left untouched');
assert.equal(world.focused()?.getAttribute('aria-describedby'),'map-instructions','Island controls describe keyboard movement');
world.visit(1);
assert.equal(world.element('keeper-card').hidden,false,'Stamped island reveals its keeper');
assert(world.element('keeper-title').textContent.includes('Fox'),'Hushwood has its unique encounter');
assert.equal(world.element('keeper-audio-link').hidden,true,'Encounter alone does not advertise an imported motif');
world.keeper(0);
assert.equal(world.state().echoes[1],0,'First keeper choice persists');
assert.equal(world.element('keeper-audio-link').hidden,false,'Answered encounter reveals the music portal');
assert(world.element('report').value.includes('Seven bells sing'),'Encounter shapes field report');
world.keeper(1);
assert.equal(world.state().echoes[1],1,'Keeper decision is reversible');
assert.equal(world.element('keeper-counter').textContent,'1 / 5 KEEPER ECHOES');
assert.equal(world.islands[1].classList.items.has('echoed'),true,'Encounter adds visible map mark');
world.visit(4);world.keeper(0);world.visit(1);
assert.deepEqual(world.state().route,[1,4],'Repeated visit does not make another stamp');
assert.equal(world.element('passport').children.length,2);
world.weather(0);world.lens(2);
assert.equal(world.state().weather,'dawn');assert.equal(world.state().lens,'wonder');
assert(world.element('report').value.includes('Hushwood'));
assert(world.element('report').value.includes('Long Lantern'));
world.visit(0);world.keeper(0);world.visit(3);world.keeper(1);world.visit(2);world.keeper(0);
assert.equal(world.state().route.length,5);
assert.deepEqual(world.state().echoes,[0,1,0,1,0],'Five independent keeper encounters survive');
assert.equal(world.element('keeper-counter').textContent,'5 / 5 KEEPER ECHOES');
assert(world.element('status').textContent.includes('You left a question'),'Last island encounter is acknowledged');
assert.equal(world.element('sixth-shore').hidden,false,'Sixth Shore unlocks after five unique islands');
assert(world.element('sixth-letter').textContent.includes('unwritten'),'Unlocked ending begins unchosen');
world.ending(2);
assert.equal(world.state().ending,'anchor');
assert(world.element('sixth-letter').textContent.includes('lantern above the sixth shore'));
assert(world.element('sixth-letter').textContent.includes('a named star'),'Keeper encounter shapes Sixth Shore ending');
assert(world.element('sixth-letter').textContent.includes('a wandering melody'),'Independent Hushwood decision shapes finale');
assert(world.element('report').value.includes('SIXTH SHORE · anchor'));
await world.click('copy-link');
assert(/#route=[0-4]{5}\.[dnm]\.[lrw]\.a$/.test(world.copies[0]),'Complete route link includes selected ending');
const carried=mount(new Map(),new URL(world.copies[0]).hash);
assert.equal(carried.state().ending,'anchor','Final promise survives a share link');
assert.deepEqual(carried.state().echoes,[null,null,null,null,null],'Route sharing does not transmit private keeper encounters');
assert.equal(carried.element('sixth-shore').hidden,false,'Imported completed route opens finale');
world.click('undo');
assert.equal(world.element('sixth-shore').hidden,true,'Undoing a stop hides finale');
assert.equal(world.state().ending,null,'Undoing a stop removes the promise');
assert.equal(world.state().echoes[2],null,'Undoing a stop clears its keeper memory');
assert.equal(world.state().echoes[0],0,'Other keeper memories survive undo');
assert.deepEqual(world.state().route,[1,4,0,3]);
await world.click('copy-link');
assert.equal(world.copies.length,2);
const routeUrl=world.copies.at(-1);
assert(/^https:\/\/example\.test\/atlas\/#route=[0-4]{1,5}\.[dnm]\.[lrw]$/.test(routeUrl));
const restored=mount(new Map(),new URL(routeUrl).hash);
assert.deepEqual(restored.state().route,[1,4,0,3]);
assert.equal(restored.state().weather,'dawn');
assert.equal(restored.state().lens,'wonder');
restored.click('reset');
assert.equal(restored.state().route.length,0);
assert.equal(restored.state().ending,null,'Reset clears Sixth Shore ending');
assert.deepEqual(restored.state().echoes,[null,null,null,null,null],'Reset clears Atlas keeper memories');
assert.equal(restored.element('passport').children.length,1);

const advanced=new Map();
advanced.set('gpt-village-agent02-elsewhere-frequency-v1',JSON.stringify({solved:[0,2,4]}));
advanced.set('elsewhere-frequency-agent02-v1',JSON.stringify({choices:{glass:0,moss:1,tide:1,ember:0}}));
advanced.set('agent02-confluence-v1',JSON.stringify({found:['relay-glass+sky-old','sky-old+tide-old']}));
advanced.set('gpt-village-agent02-signal-loom-v1',JSON.stringify({bits:'11110000111100001111000011110000'}));
advanced.set('gpt-village-elsewhere-resonance-room-v1',JSON.stringify({matrix:[[true,false,true,false,true,false,true,false],[false,false,false,false,false,false,false,false],[true,false,false,false,false,false,false,false],[false,false,false,false,false,false,false,false],[false,false,false,false,false,false,false,false]]}));
const experienced=mount(advanced);
const cards=experienced.element('archives').children;
assert.equal(cards.length,5);
assert.deepEqual(cards.map(c=>c.children[1].textContent),['3 / 5','4 / 4','2 / 55','16 / 32','5 / 40']);
experienced.visit(0);
assert(experienced.element('story').textContent.includes('restored relay'),'Prior game progress affects the atlas');
assert(experienced.element('world-mood').textContent.includes('constellation'));
experienced.click('copy-report');
assert(experienced.copies[0].includes('Glass Observatory'));
experienced.click('refresh');
assert.equal(experienced.state().route.length,1,'Refresh leaves route untouched');

const legacy=mount(new Map(),'#route=01234.n.l');
assert.equal(legacy.state().route.length,5,'Original route URLs still open');
assert.equal(legacy.state().ending,null,'Original route URLs carry no ending');
assert.equal(legacy.element('sixth-shore').hidden,false);
const rejected=mount(new Map(),'#route=01234.n.l.x');
assert.equal(rejected.state().route.length,0,'Invalid final ending is not imported');
const damaged=mount(new Map([[key,'{bad'],['gpt-village-agent02-elsewhere-frequency-v1','{"solved":[-1,1,1,100,"2"]}']]),'#route=004.n.w');
assert.equal(damaged.state().route.length,0,'Malformed duplicate share route is rejected');
assert.equal(damaged.element('archives').children[0].children[1].textContent,'1 / 5','Bad progress is bounded');
const saved=mount(new Map([[key,JSON.stringify({route:[2,2,4,999,0],weather:'purple',lens:'bad',focus:55,echoes:[0,1,8,'0',null]})]]));
assert.deepEqual(saved.state().route,[2,4,0]);
assert.equal(saved.state().weather,'night');
assert.equal(saved.state().focus,0);
assert.deepEqual(saved.state().echoes,[0,null,null,null,null],'Corrupt, uncharted or string keeper values are rejected');
console.log('PASS · Atlas: 5 keeper encounters, reversible decisions, map echo marks, cross-chapter story and ending changes, arrow focus, independent route stamps, save validation, private echoes and share compatibility.');
