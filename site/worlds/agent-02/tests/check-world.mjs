/**
 * Elsewhere Frequency: dependency-free simulated-browser gameplay smoke tests.
 * Run: node site/worlds/agent-02/tests/check-world.mjs
 * This validates application logic; it does not replace testing real browsers.
 * agent-02 (AI agent), GPT Village, October 19 2026.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(script?.length>5000,'Game script is present');
assert(html.includes('href="./listening-map/"'),'Chapter II is linked');
assert((html.match(/class="island(?: selected)?"/g)||[]).length===5,'Five island controls');
assert((script.match(/answer:[1-9]/g)||[]).length===5,'Five valid frequencies');

function mount(store=new Map()){
  const nodes=new Map();
  function el(id){
    if(nodes.has(id))return nodes.get(id);
    const result={
      id,value:'1',textContent:'',hidden:false,disabled:false,style:{},attrs:{},events:{},dataset:{},children:[],
      classList:{items:new Set(),toggle(name,on){if(on)this.items.add(name);else this.items.delete(name)}},
      setAttribute(name,value){this.attrs[name]=String(value)},
      getAttribute(name){return this.attrs[name]},
      replaceChildren(){this.children=[]},
      append(...children){this.children.push(...children)},
      addEventListener(type,handler){this.events[type]=handler},
      scrollIntoView(){},
      getContext(){return {}}
    };
    nodes.set(id,result);
    return result;
  }
  [...html.matchAll(/id="([^"]+)"/g)].forEach(m=>el(m[1]));
  const islands=Array.from({length:5},(_,i)=>{const e=el('island-button'+i);e.dataset.id=String(i);return e});
  const skies=['dawn','night','mist'].map(name=>{const e=el('sky-'+name);e.dataset.sky=name;return e});
  const segments=Array.from({length:5},(_,i)=>el('mood-segment'+i));
  const doc={
    body:{dataset:{}},
    querySelector(selector){assert(selector.startsWith('#'),'Only ID selectors expected: '+selector);assert(nodes.has(selector.slice(1)),'Missing target '+selector);return nodes.get(selector.slice(1))},
    querySelectorAll(selector){
      if(selector==='.island')return islands;
      if(selector==='.sky-btn')return skies;
      if(selector==='.mood-segment')return segments;
      throw Error('Unexpected selector '+selector);
    },
    createElement(tag){return el('created-'+tag+'-'+nodes.size)}
  };
  const localStorage={getItem:key=>store.get(key)||null,setItem:(key,val)=>store.set(key,val)};
  const window={matchMedia:()=>({matches:true}),confirm:()=>true};
  const clipboard={writeText:async value=>store.set('copied',value)};
  const navigator={clipboard};
  runInNewContext(script,{document:doc,window,localStorage,navigator,requestAnimationFrame:()=>{}},{timeout:2500});
  function click(name){
    const handler=el(name).events.click;
    assert.equal(typeof handler,'function','Expected click handler on '+name);
    return handler();
  }
  function island(i){const handler=islands[i].events.click;assert.equal(typeof handler,'function');return handler()}
  function tune(n){const slider=el('frequency');slider.value=String(n);slider.events.input({target:slider});click('transmit')}
  return {el,click,island,tune,store,skies};
}

const world=mount();
assert.equal(world.el('counter').textContent,'0 / 5 LINKED','Fresh start');
assert(world.el('echo-choice').hidden,'Prompts hidden before decoding');
world.tune(4);
assert.equal(world.el('counter').textContent,'0 / 5 LINKED','Wrong frequency does not decode');
world.tune(3);
assert.equal(world.el('counter').textContent,'1 / 5 LINKED','Decoded relay');
assert(!world.el('echo-choice').hidden,'Decision available after decoding');
world.click('choose-outward');
assert.equal(world.el('mood-count').textContent,'1 broadcast · 0 sheltered');
assert.equal(world.el('choose-outward').getAttribute('aria-pressed'),'true');
world.click('choose-inward');
assert.equal(world.el('mood-count').textContent,'0 broadcast · 1 sheltered','Decisions can be revised');
world.click('choose-outward');

const answers=[3,7,2,9,5];
for(let i=1;i<5;i++){
  world.island(i);
  world.tune(answers[i]);
  world.click(i%2?'choose-inward':'choose-outward');
}
assert.equal(world.el('counter').textContent,'5 / 5 LINKED');
assert(!world.el('ending').hidden,'Ending unlocked');
assert.equal(world.el('mood-count').textContent,'3 broadcast · 2 sheltered');
world.click('open-world');
assert(world.el('ending-text').textContent.includes('3 echoes were shared and 2 were sheltered'),'Variable epilogue');
await world.click('copy-report');
assert(world.store.get('copied').includes('3 echoes shared · 2 sheltered'),'Shareable report');
assert(world.store.get('copied').includes('Glass Observatory'),'Report names discoveries');
world.skies[0].events.click();
assert.equal(world.el('mood-count').textContent,'3 broadcast · 2 sheltered','Weather changes preserve choices');

const resumed=mount(world.store);
assert.equal(resumed.el('counter').textContent,'5 / 5 LINKED','Relays persist across sessions');
assert.equal(resumed.el('mood-count').textContent,'3 broadcast · 2 sheltered','Echo choices persist');
assert.equal(resumed.el('ending-title').textContent,'You let the world be heard.','Ending persists');
resumed.click('reset');
assert.equal(resumed.el('counter').textContent,'0 / 5 LINKED','Reset clears relays');
assert.equal(resumed.el('mood-count').textContent,'0 broadcast · 0 sheltered','Reset clears echo choices');
assert(resumed.el('ending').hidden,'Reset hides the ending');

console.log('✓ Elsewhere Frequency: simulated-browser gameplay smoke tests passed');
console.log('✓ Frequencies, errors, promises, endings, export, persistence, reset and chapter navigation verified');
