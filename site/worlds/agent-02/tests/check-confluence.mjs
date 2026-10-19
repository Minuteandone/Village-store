/**
 * Agent-02 Confluence dependency-free gameplay smoke tests.
 * Runs: node site/worlds/agent-02/tests/check-confluence.mjs
 * Does not replace real browser visual or accessibility testing.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=readFileSync(new URL('../confluence/index.html',import.meta.url),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(script?.length>8000,'Confluence game script present');
assert(html.includes('href="../"'),'Return to Chapter I');
assert(html.includes('href="../listening-map/"'),'Return to Chapter II');
assert(html.includes('aria-live="polite"'),'Accessible status region');

function mount(initial={}){
 const storage=new Map(Object.entries(initial)), nodes=new Map(), copied=[];
 function element(id){
  return {id,children:[],dataset:{},style:{},attrs:{},events:{},textContent:'',hidden:false,disabled:false,
    setAttribute(k,v){this.attrs[k]=String(v)},getAttribute(k){return this.attrs[k]},
    addEventListener(k,f){this.events[k]=f},append(...n){this.children.push(...n)},
    replaceChildren(...n){this.children=n},
    classList:{toggle(){},add(){}}
  };
 }
 for(const m of html.matchAll(/\bid="([^"]+)"/g))nodes.set(m[1],element(m[1]));
 nodes.get('loom').getContext=()=>null;
 const document={
  hidden:false,
  getElementById:id=>{assert(nodes.has(id),'Expected ID '+id);return nodes.get(id)},
  createElement:tag=>element(tag),
  addEventListener(){}
 };
 const window={matchMedia:()=>({matches:true}),addEventListener(){},confirm:()=>true,
   location:{href:'https://example.test/confluence/',hash:''}};
 const localStorage={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
 const navigator={clipboard:{writeText:async text=>{copied.push(text)}}};
 runInNewContext(script,{document,window,localStorage,navigator,URL,requestAnimationFrame:()=>{}},{timeout:3000});
 const el=id=>nodes.get(id);
 const click=id=>{assert.equal(typeof el(id)?.events.click,'function','click '+id);return el(id).events.click()};
 const star=id=>{
  const found=el('star-buttons').children.find(n=>n.dataset.id===id);
  assert(found,'Missing '+id);assert.equal(found.disabled,false,'Locked star '+id);
  found.events.click();
 };
 return {el,click,star,storage,copied};
}

const chapter1='gpt-village-agent02-elsewhere-frequency-v1';
const chapter2='elsewhere-frequency-agent02-v1';
const atlas='agent02-confluence-v1';
const fresh=mount();
assert.equal(fresh.el('available').textContent,'2 / 11 SIGNALS AWAKE','Fresh visitors have two voices');
assert.equal(fresh.el('star-buttons').children.length,11,'All stars represented');
assert.equal(fresh.el('weave').disabled,true,'Cannot weave one voice');
fresh.star('tide-old');
fresh.star('sky-old');
assert.equal(fresh.el('weave').disabled,false);
fresh.click('weave');
assert.equal(fresh.el('record-count').textContent,'1 / 55');
assert.equal(fresh.el('new-story').hidden,false,'Story appears');
assert.equal(JSON.parse(fresh.storage.get(atlas)).found.length,1,'Local save');
fresh.click('weave');
assert.equal(fresh.el('record-count').textContent,'1 / 55','Duplicate pair not counted');

const values={
 [chapter1]:JSON.stringify({solved:[0,4],choices:['outward',null,null,null,'inward'],sky:'mist'}),
 [chapter2]:JSON.stringify({choices:{glass:0,moss:1},whispers:['feather']})
};
const joined=mount(values);
assert.equal(joined.el('available').textContent,'6 / 11 SIGNALS AWAKE','Read each chapter');
joined.star('relay-glass');
joined.star('walk-moss');
joined.click('weave');
assert.equal(joined.el('record-count').textContent,'1 / 55','Cross-chapter pair saved');
assert.match(joined.el('story-text').textContent,/walking paths/);
await joined.click('copy');
assert.equal(joined.copied.length,1,'Copied constellation');
assert.match(joined.copied[0],/#pair=relay-glass%2Bwalk-moss|#pair=walk-moss%2Brelay-glass/);
assert.equal(joined.storage.get(chapter1),values[chapter1]);
assert.equal(joined.storage.get(chapter2),values[chapter2]);
joined.click('reset');
assert.equal(joined.el('record-count').textContent,'0 / 55');
assert.equal(joined.storage.get(chapter1),values[chapter1],'Chapter I not erased');
assert.equal(joined.storage.get(chapter2),values[chapter2],'Chapter II not erased');

const incompatible=mount({[atlas]:'{bad save', [chapter1]:'{bad save'});
assert.equal(incompatible.el('available').textContent,'2 / 11 SIGNALS AWAKE','Bad saves fail gracefully');

console.log('Confluence: initial play, 55 pair limit, choices, chapter unlock, save, copy, reset and corrupt save PASS');
