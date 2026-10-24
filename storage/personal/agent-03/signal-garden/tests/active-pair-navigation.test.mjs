import assert from 'node:assert/strict';
import test from 'node:test';
import {activePairPartners,stepActivePairPartner} from '../active-pair-navigation.mjs';
const row=(id,incoming=[])=>({id,name:'island '+id,incoming});
const entry=(from,type)=>({from,type});
test('no selection and missing island yield no partners',()=>{
  const rows=[row(0),row(1,[entry(0,'life')])];
  assert.deepEqual(activePairPartners(rows,null),[]);
  assert.deepEqual(activePairPartners(rows,99),[]);
  assert.deepEqual(activePairPartners(null,0),[]);
});
test('quiet islands yield no active forecast partners',()=>{
  assert.deepEqual(activePairPartners([row(0),row(1),row(2)],0),[]);
  assert.equal(stepActivePairPartner([],null,1),null);
});
test('outgoing and incoming count equally as active',()=>{
  const rows=[row(0,[entry(2,'memory')]),row(1,[entry(0,'life')]),row(2)];
  assert.deepEqual(activePairPartners(rows,0),[1,2]);
});
test('mutual routes and repeated families never duplicate a partner',()=>{
  const rows=[row(0,[entry(1,'life'),entry(1,'strange')]),row(1,[entry(0,'memory'),entry(0,'life')])];
  assert.deepEqual(activePairPartners(rows,0),[1]);
});
test('sorting is numeric and independent of input order',()=>{
  const rows=[row(10,[entry(3,'memory')]),row(3),row(1,[entry(3,'life')]),row(2,[entry(3,'strange')])];
  assert.deepEqual(activePairPartners(rows,3),[1,2,10]);
});
test('invalid transfers, unknown ids, self loops, and families are ignored',()=>{
  const rows=[row(0,[entry(0,'life'),entry(1,'bogus'),entry(99,'life'),null]),row(1,[entry(0,'life')]),row(2)];
  assert.deepEqual(activePairPartners(rows,0),[1]);
});
test('forward and backward wrap through active ids',()=>{
  assert.equal(stepActivePairPartner([1,3,8],8,1),1);
  assert.equal(stepActivePairPartner([1,3,8],1,-1),8);
  assert.equal(stepActivePairPartner([1,3,8],3,1),8);
  assert.equal(stepActivePairPartner([1,3,8],3,-1),1);
});
test('jumping from a quiet partner enters the nearest end',()=>{
  assert.equal(stepActivePairPartner([1,3,8],5,1),1);
  assert.equal(stepActivePairPartner([1,3,8],5,-1),8);
  assert.equal(stepActivePairPartner([1,3,8],null,1),1);
});
test('invalid direction and no active partners return null',()=>{
  assert.equal(stepActivePairPartner([1],1,0),null);
  assert.equal(stepActivePairPartner([1],1,2),null);
  assert.equal(stepActivePairPartner([],1,-1),null);
});
test('projection and stepping are read-only',()=>{
  const rows=[row(0),row(1,[entry(0,'life')])], before=JSON.stringify(rows);
  const partners=activePairPartners(rows,0);
  assert.equal(stepActivePairPartner(partners,1,1),1);
  assert.equal(JSON.stringify(rows),before);
  assert.deepEqual(partners,[1]);
});
