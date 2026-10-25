import assert from 'node:assert/strict';
import test from 'node:test';
import {stepArchipelagoPair} from '../archipelago-pair-navigation.mjs';
const e=(firstId,secondId)=>({firstId,secondId,key:firstId+':'+secondId});
test('no history or no matching category means no pair to navigate',()=>{
  for(const x of [null,undefined,[],{},'bad']) assert.equal(stepArchipelagoPair(x,'0:1',1),null);
});
test('cycles in stable supplied atlas order and wraps both directions',()=>{
  const rows=[e(0,2),e(0,3),e(1,3)];
  assert.equal(stepArchipelagoPair(rows,'0:2',1),'0:3');
  assert.equal(stepArchipelagoPair(rows,'1:3',1),'0:2');
  assert.equal(stepArchipelagoPair(rows,'0:2',-1),'1:3');
  assert.equal(stepArchipelagoPair(rows,'0:3',-1),'0:2');
});
test('unknown or now-filtered-out pair starts at directional edge',()=>{
  const rows=[e(0,2),e(1,3)];
  assert.equal(stepArchipelagoPair(rows,'0:1',1),'0:2');
  assert.equal(stepArchipelagoPair(rows,'0:1',-1),'1:3');
});
test('one pair wraps to itself without modifying the entry',()=>{
  const rows=[e(0,1)],before=JSON.stringify(rows);
  assert.equal(stepArchipelagoPair(rows,'0:1',1),'0:1');
  assert.equal(stepArchipelagoPair(rows,'0:1',-1),'0:1');
  assert.equal(JSON.stringify(rows),before);
});
test('malformed and duplicate keys are ignored without inventing a route',()=>{
  const rows=[null,{...e(0,1),key:'bad'},e(0,1),e(0,1),e(1,1),e(2,1),{...e(1,2),firstId:'1'},e(1,2)];
  assert.equal(stepArchipelagoPair(rows,'0:1',1),'1:2');
  assert.equal(stepArchipelagoPair(rows,'1:2',1),'0:1');
});
test('invalid directions do not navigate',()=>{
  for(const d of [0,NaN,Infinity,-Infinity,'next',null]) assert.equal(stepArchipelagoPair([e(0,1)],'0:1',d),null);
});
test('imported island names remain untouched and are never evaluated',()=>{
  const rows=[{...e(0,1),firstName:'<img onerror=alert(1)>',secondName:'<script>x</script>'},e(0,2)];
  const before=JSON.stringify(rows);
  assert.equal(stepArchipelagoPair(rows,'0:1',1),'0:2');
  assert.equal(JSON.stringify(rows),before);
});
