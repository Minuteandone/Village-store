import assert from 'node:assert/strict';
import test from 'node:test';
import {pairMapHighlight} from '../pair-map-highlight.mjs';
import {pairTimelineHighlight} from '../pair-timeline-highlight.mjs';
import {pairTransitionBadge} from '../pair-transition-badge.mjs';
import {archipelagoChangeAtlas} from '../archipelago-change-atlas.mjs';
Object.assign(globalThis,{pairMapHighlight,pairTimelineHighlight,pairTransitionBadge});
const row=(id,incoming=[],name='Island '+id)=>({id,incoming,name});
const e=(from,type)=>({from,type});
const t=(from,to,type)=>({from,to,type});
test('requires actual history; no fabricated pulse',()=>{
  assert.equal(archipelagoChangeAtlas([row(0),row(1)],null,2).available,false);
  assert.match(archipelagoChangeAtlas([row(0)],undefined,2).text,/complete a pulse/);
  assert.equal(archipelagoChangeAtlas(null,[],2).available,false);
});
test('all-quiet world counts unique unordered pairs',()=>{
  const x=archipelagoChangeAtlas([row(2),row(0),row(1)],[],3);
  assert.equal(x.pairCount,3);assert.equal(x.quiet,3);assert.equal(x.total,0);
  assert.match(x.text,/No changed relationships/);
});
test('new and ended across distinct pairs are each counted once',()=>{
  const x=archipelagoChangeAtlas([row(0),row(1,[e(0,'life')]),row(2),row(3)],[t(2,3,'memory')],3);
  assert.equal(x.pairCount,6);assert.equal(x.total,2);
  assert.equal(x.counts.new,1);assert.equal(x.counts.ended,1);
  assert.deepEqual(x.entries.map(y=>[y.firstId,y.secondId,y.kind]),[[0,1,'new'],[2,3,'ended']]);
});
test('mutual, one-way, reversed, retuned and steady are distinct',()=>{
  const rows=[row(0,[e(1,'memory'),e(3,'strange')]),
    row(1,[e(0,'life')]),row(2,[e(0,'life')]),row(3),
    row(4,[e(0,'memory')]),row(5,[e(0,'life')])];
  const history=[t(0,1,'life'),t(0,2,'life'),t(2,0,'memory'),t(0,3,'strange'),t(0,4,'life'),t(0,5,'life')];
  const x=archipelagoChangeAtlas(rows,history,4);
  assert.equal(x.counts.mutual,1);assert.equal(x.counts['one-way'],1);
  assert.equal(x.counts.reversed,1);assert.equal(x.counts.retuned,1);assert.ok(x.steady>=1);
});
test('duplicate IDs, rows and traffic are stable and ordered',()=>{
  const rows=[row(7,[e(3,'life'),e(3,'life')]),row(3),row(1),row(7,[e(3,'life'),e(3,'life')])];
  const a=archipelagoChangeAtlas(rows,[],3),b=archipelagoChangeAtlas([...rows].reverse(),[],3);
  assert.equal(a.pairCount,3);assert.equal(a.total,1);
  assert.deepEqual(a.entries.map(x=>[x.firstId,x.secondId]),[[3,7]]);
  assert.deepEqual(b.entries.map(x=>[x.firstId,x.secondId]),[[3,7]]);
});
test('invalid endpoints, families and self-links are ignored',()=>{
  const x=archipelagoChangeAtlas([row(0,[e(0,'life')]),row(1,[e(99,'life'),e(0,'bogus')])],
    [null,t(0,99,'life'),t(0,0,'life'),t(0,1,'bogus')],3);
  assert.equal(x.total,0);assert.equal(x.quiet,1);
});
test('imported names remain literal text and inputs stay untouched',()=>{
  const rows=[row(0,[],'<img src=x>'),row(1,[e(0,'life')],'<script>')],history=[];
  const before=JSON.stringify({rows,history});
  const x=archipelagoChangeAtlas(rows,history,3);
  assert.ok(x.text.includes('<img src=x> ↔ <script>'));
  assert.equal(JSON.stringify({rows,history}),before);
});
