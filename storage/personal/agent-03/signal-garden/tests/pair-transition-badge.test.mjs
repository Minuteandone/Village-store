import assert from 'node:assert/strict';
import test from 'node:test';
import {pairTransitionBadge} from '../pair-transition-badge.mjs';
import {pairMapHighlight} from '../pair-map-highlight.mjs';
import {pairTimelineHighlight} from '../pair-timeline-highlight.mjs';
globalThis.pairMapHighlight=pairMapHighlight;
function focus(forward=[], backward=[]) {
  return {source:0,target:1,forward,backward};
}
test('missing pair returns no badge',()=>{
  assert.equal(pairTransitionBadge(null,null),null);
  assert.equal(pairTransitionBadge({source:0,target:0,forward:[],backward:[]},null),null);
});
test('fresh garden does not invent a prior pulse',()=>{
  const b=pairTransitionBadge(focus(['life']),null);
  assert.equal(b.kind,'unavailable');
  assert.match(b.description,/awaiting the first completed pulse/);
});
test('quiet to traffic is new, traffic to quiet is ended',()=>{
  assert.equal(pairTransitionBadge(focus(['life']),focus()).kind,'new');
  assert.equal(pairTransitionBadge(focus(),focus(['life'])).kind,'ended');
});
test('two quiet cycles are explicitly quiet',()=>{
  assert.equal(pairTransitionBadge(focus(),focus()).kind,'quiet');
});
test('steady ignores family order and duplicate families',()=>{
  const b=pairTransitionBadge(focus(['memory','life','life'],['strange']),
    focus(['life','memory'],['strange','strange']));
  assert.equal(b.kind,'steady');
});
test('one-way to mutual and mutual to one-way are distinguished',()=>{
  assert.equal(pairTransitionBadge(focus(['life'],['memory']),focus(['life'])).kind,'mutual');
  assert.equal(pairTransitionBadge(focus(['life']),focus(['life'],['memory'])).kind,'one-way');
});
test('one-way reversal is distinguished from a retune',()=>{
  assert.equal(pairTransitionBadge(focus([],['life']),focus(['life'])).kind,'reversed');
  assert.equal(pairTransitionBadge(focus(['memory']),focus(['life'])).kind,'retuned');
});
test('mutual family retune is not steady',()=>{
  assert.equal(pairTransitionBadge(focus(['life'],['strange']),
    focus(['life'],['memory'])).kind,'retuned');
});
test('mismatched endpoints and malformed prior data cannot create false history',()=>{
  assert.equal(pairTransitionBadge(focus(['life']),{...focus(['life']),target:2}).kind,'unavailable');
  assert.equal(pairTransitionBadge(focus(['life']),{...focus(['life']),forward:'life'}).kind,'unavailable');
});
test('canonical last and next map models produce a transition without mutation',()=>{
  const rows=[{id:0,name:'<b>Imported</b>',incoming:[{from:1,type:'memory'}]},
    {id:1,name:'Other',incoming:[{from:0,type:'life'}]}];
  const transfers=[{from:0,to:1,type:'life'}];
  const before=JSON.stringify({rows,transfers});
  const next=pairMapHighlight(rows,0,1);
  const last=pairTimelineHighlight(rows,transfers,0,1,'last');
  const b=pairTransitionBadge(next,last);
  assert.equal(b.kind,'mutual');
  assert.match(b.description,/Becoming mutual/);
  assert.doesNotMatch(b.description,/<b>/);
  assert.equal(JSON.stringify({rows,transfers}),before);
});
test('description includes both directions without using imported names',()=>{
  const b=pairTransitionBadge(focus(['life'],['memory']),focus(['life']));
  assert.match(b.description,/Last pulse: outbound \(send life\)/);
  assert.match(b.description,/Next forecast: mutual \(send life; receive memory\)/);
});
