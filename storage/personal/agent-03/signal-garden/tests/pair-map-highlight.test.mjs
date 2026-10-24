import assert from 'node:assert/strict';
import test from 'node:test';
import {pairMapHighlight} from '../pair-map-highlight.mjs';
const row=(id,name='Island '+id,incoming=[])=>({id,name,incoming});
const from=(id,type)=>({from:id,type});
test('no selection, self pair, missing endpoint or invalid rows produce no highlight',()=>{
  const rows=[row(0),row(1)];
  for(const pair of [[null,1],[0,null],[0,0],[0,8],[8,1]])assert.equal(pairMapHighlight(rows,...pair),null);
  assert.equal(pairMapHighlight(null,0,1),null);
});
test('quiet pair is explicitly labelled and has no arrows',()=>{
  const result=pairMapHighlight([row(0),row(1)],0,1);
  assert.equal(result.kind,'quiet');
  assert.deepEqual(result.forward,[]);
  assert.deepEqual(result.backward,[]);
  assert.match(result.description,/Quiet forecast/);
});
test('outbound traffic uses selected to partner direction',()=>{
  const result=pairMapHighlight([row(0),row(1,'Other',[from(0,'life')])],0,1);
  assert.equal(result.kind,'outbound');
  assert.deepEqual(result.forward,['life']);
  assert.deepEqual(result.backward,[]);
});
test('inbound traffic uses partner to selected direction',()=>{
  const result=pairMapHighlight([row(0,'Home',[from(1,'strange')]),row(1)],0,1);
  assert.equal(result.kind,'inbound');
  assert.deepEqual(result.backward,['strange']);
});
test('mutual pairs can exchange different families',()=>{
  const result=pairMapHighlight([row(0,'Home',[from(1,'memory')]),row(1,'Other',[from(0,'life')])],0,1);
  assert.equal(result.kind,'mutual');
  assert.deepEqual(result.forward,['life']);
  assert.deepEqual(result.backward,['memory']);
});
test('duplicate families collapse and families have deterministic order',()=>{
  const result=pairMapHighlight([row(0),row(1,'Other',[from(0,'strange'),from(0,'life'),from(0,'strange'),from(0,'memory')])],0,1);
  assert.deepEqual(result.forward,['life','memory','strange']);
});
test('unknown source, malformed entries and invalid families are ignored',()=>{
  const result=pairMapHighlight([row(0),row(1,'Other',[null,from(99,'life'),from(0,'fake'),{type:'life'},from(0,'memory')])],0,1);
  assert.deepEqual(result.forward,['memory']);
});
test('untrusted imported names stay data, not markup',()=>{
  const result=pairMapHighlight([row(0,'<img src=x onerror=alert(1)>'),row(1,'<b>test</b>')],0,1);
  assert.match(result.description,/<img src=x onerror=alert\(1\)>/);
  assert.match(result.description,/<b>test<\/b>/);
});
test('model does not mutate its inputs',()=>{
  const rows=[row(0,'Home',[from(1,'memory')]),row(1,'Other',[from(0,'life')])];
  const before=JSON.stringify(rows);
  const result=pairMapHighlight(rows,0,1);
  assert.equal(JSON.stringify(rows),before);
  assert.equal(result.source,0);
  assert.equal(result.target,1);
});
