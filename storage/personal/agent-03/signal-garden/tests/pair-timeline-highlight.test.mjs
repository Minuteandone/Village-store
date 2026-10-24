import assert from 'node:assert/strict';
import test from 'node:test';
import {pairTimelineHighlight} from '../pair-timeline-highlight.mjs';
import {pairMapHighlight} from '../pair-map-highlight.mjs';
globalThis.pairMapHighlight=pairMapHighlight;
const rows=[{id:0,name:'Home',incoming:[{from:1,type:'memory'}]},
  {id:1,name:'Other',incoming:[{from:0,type:'life'}]},
  {id:2,name:'Quiet',incoming:[]}];
const old=[{from:0,to:1,type:'strange'}];
test('next view reuses canonical forecast without rewriting it',()=>{
  assert.deepEqual(pairTimelineHighlight(rows,old,0,1,'next'),pairMapHighlight(rows,0,1));
});
test('last view never invents history before a completed pulse',()=>{
  assert.equal(pairTimelineHighlight(rows,null,0,1,'last'),null);
});
test('last view shows actual previous direction and family, not forecast',()=>{
  const focus=pairTimelineHighlight(rows,old,0,1,'last');
  assert.equal(focus.kind,'outbound');
  assert.deepEqual(focus.forward,['strange']);
  assert.deepEqual(focus.backward,[]);
  assert.match(focus.description,/last completed pulse.*Outgoing-only last pulse: send strange/);
  assert.doesNotMatch(focus.description,/next cycle/);
});
test('last view correctly renders a mutual historical exchange',()=>{
  const focus=pairTimelineHighlight(rows,[...old,{from:1,to:0,type:'life'}],0,1,'last');
  assert.equal(focus.kind,'mutual');
  assert.deepEqual(focus.forward,['strange']);
  assert.deepEqual(focus.backward,['life']);
});
test('last view labels quiet history even when next forecast is mutual',()=>{
  const focus=pairTimelineHighlight(rows,[],0,1,'last');
  assert.equal(focus.kind,'quiet');
  assert.match(focus.description,/Quiet last pulse/);
});
test('invalid endpoints, phase and malformed rows fail safely',()=>{
  assert.equal(pairTimelineHighlight(rows,old,0,0,'last'),null);
  assert.equal(pairTimelineHighlight(rows,old,0,8,'last'),null);
  assert.equal(pairTimelineHighlight(null,old,0,1,'last'),null);
  assert.equal(pairTimelineHighlight(rows,old,0,1,'unknown'),null);
});
test('invalid transfers, duplicate families and unknown islands are filtered',()=>{
  const focus=pairTimelineHighlight(rows,[null,{from:99,to:1,type:'life'},
    {from:0,to:1,type:'unknown'},{from:0,to:1,type:'life'},
    {from:0,to:1,type:'life'},{from:0,to:1,type:'memory'},
    {from:0,to:0,type:'strange'}],0,1,'last');
  assert.deepEqual(focus.forward,['life','memory']);
});
test('imported names stay text and both inputs remain unchanged',()=>{
  const named=[{id:0,name:'<img onerror=alert(1)>',incoming:[]},
    {id:1,name:'<script>oops</script>',incoming:[]}];
  const transfers=[{from:0,to:1,type:'life'}];
  const before=JSON.stringify({named,transfers});
  const focus=pairTimelineHighlight(named,transfers,0,1,'last');
  assert.match(focus.description,/<img onerror=alert\(1\)>/);
  assert.match(focus.description,/<script>oops<\/script>/);
  assert.equal(JSON.stringify({named,transfers}),before);
});
