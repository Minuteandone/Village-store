import assert from 'node:assert/strict';
import test from 'node:test';
import {archipelagoCategoryDrilldown} from '../archipelago-category-drilldown.mjs';
const e = (firstId,secondId,kind,firstName='Island '+firstId,secondName='Island '+secondId) =>
  ({firstId,secondId,kind,firstName,secondName});
test('missing history never produces drill-down entries',()=>{
  for(const atlas of [null,undefined,{available:false,entries:[e(0,1,'new')]},{available:true,entries:null}]){
    const x=archipelagoCategoryDrilldown(atlas);
    assert.equal(x.available,false);assert.deepEqual(x.entries,[]);
  }
});
test('all changed categories remain available in stable atlas order',()=>{
  const rows=[e(0,1,'new'),e(0,2,'ended'),e(0,3,'mutual'),e(1,2,'one-way'),e(1,3,'reversed'),e(2,3,'retuned')];
  const x=archipelagoCategoryDrilldown({available:true,entries:rows});
  assert.deepEqual(x.entries.map(y=>y.key),['0:1','0:2','0:3','1:2','1:3','2:3']);
  assert.equal(x.total,6);
  for(const row of rows) assert.deepEqual(archipelagoCategoryDrilldown({available:true,entries:rows},row.kind).entries.map(y=>y.kind),[row.kind]);
});
test('empty category is valid but contains no fabricated pairs',()=>{
  const x=archipelagoCategoryDrilldown({available:true,entries:[e(0,1,'new')]},'ended');
  assert.equal(x.available,true);assert.equal(x.total,0);assert.deepEqual(x.entries,[]);
});
test('unknown filter falls back to all without modifying atlas',()=>{
  const atlas={available:true,entries:[e(0,1,'new')]},before=JSON.stringify(atlas);
  assert.equal(archipelagoCategoryDrilldown(atlas,'nonsense').filter,'all');
  assert.equal(JSON.stringify(atlas),before);
});
test('malformed and quiet/steady entries cannot be inspected',()=>{
  const x=archipelagoCategoryDrilldown({available:true,entries:[null,e(0,0,'new'),e(0,1,'quiet'),e(1,2,'steady'),e(2,3,'new'),{kind:'ended',firstId:1,secondId:'3'}]});
  assert.deepEqual(x.entries.map(y=>y.key),['2:3']);
});
test('untrusted imported names remain literal data, never markup',()=>{
  const first='<img src=x onerror=alert(1)>',second='<script>oops</script>';
  const x=archipelagoCategoryDrilldown({available:true,entries:[e(0,1,'new',first,second)]});
  assert.equal(x.entries[0].firstName,first);assert.equal(x.entries[0].secondName,second);
  assert.equal(x.entries[0].key,'0:1');
});
