import assert from 'node:assert/strict';
import test from 'node:test';
import {pairMapHighlight} from '../pair-map-highlight.mjs';
import {pairTimelineHighlight} from '../pair-timeline-highlight.mjs';
import {pairTransitionBadge} from '../pair-transition-badge.mjs';
import {changedPairCategoryOverview} from '../changed-pair-category-filter.mjs';
globalThis.pairMapHighlight = pairMapHighlight;
globalThis.pairTimelineHighlight = pairTimelineHighlight;
globalThis.pairTransitionBadge = pairTransitionBadge;
const row = (id, incoming = [], name = 'Island ' + id) => ({id, incoming, name});
const e = (from, type) => ({from, type});
const t = (from, to, type) => ({from, to, type});

test('history is required; invalid selection and malformed rows are unavailable', () => {
  const rows = [row(0), row(1, [e(0, 'life')])];
  for (const history of [null, undefined]) {
    const x = changedPairCategoryOverview(rows, history, 0);
    assert.equal(x.available, false);
    assert.deepEqual(x.partnerIds, []);
  }
  assert.equal(changedPairCategoryOverview(rows, [], 99).available, false);
  assert.equal(changedPairCategoryOverview(null, [], 0).available, false);
});
test('quiet and steady pairs do not count as changed', () => {
  const rows = [row(0), row(1, [e(0, 'life')]), row(2)];
  const x = changedPairCategoryOverview(rows, [t(0, 1, 'life')], 0);
  assert.equal(x.available, true);
  assert.equal(x.total, 0);
  assert.deepEqual(x.partnerIds, []);
  assert.equal(Object.values(x.counts).reduce((a,b)=>a+b,0), 0);
});
test('new and ended exchanges are counted and filterable, including ended-only pairs', () => {
  const rows = [row(0), row(1), row(2, [e(0, 'life')]), row(3)];
  const history = [t(0, 1, 'life')];
  const all = changedPairCategoryOverview(rows, history, 0);
  assert.deepEqual(all.partnerIds, [1, 2]);
  assert.equal(all.counts.ended, 1);
  assert.equal(all.counts.new, 1);
  assert.deepEqual(changedPairCategoryOverview(rows, history, 0, 'ended').partnerIds, [1]);
  assert.deepEqual(changedPairCategoryOverview(rows, history, 0, 'new').partnerIds, [2]);
  assert.deepEqual(changedPairCategoryOverview(rows, history, 0, 'retuned').partnerIds, []);
});
test('becoming mutual, becoming one-way and reversed directions classify independently', () => {
  const rows = [row(0, [e(1, 'memory'), e(3, 'strange')]),
    row(1, [e(0, 'life')]), row(2, [e(0, 'life')]), row(3)];
  const history = [t(0, 1, 'life'), t(0, 2, 'life'), t(2, 0, 'memory'),
    t(0, 3, 'strange')];
  const x = changedPairCategoryOverview(rows, history, 0);
  assert.equal(x.counts.mutual, 1);
  assert.equal(x.counts['one-way'], 1);
  assert.equal(x.counts.reversed, 1);
  assert.deepEqual(x.partnerIds, [1, 2, 3]);
});
test('same-direction family retunes count without inventing a reversal', () => {
  const rows = [row(0), row(1, [e(0, 'memory')])];
  const x = changedPairCategoryOverview(rows, [t(0, 1, 'life')], 0);
  assert.equal(x.counts.retuned, 1);
  assert.deepEqual(x.partnerIds, [1]);
});
test('ordering, deduplication and unknown filter fallback are deterministic', () => {
  const rows = [row(10, [e(3, 'life')]), row(3), row(2, [e(3, 'memory')]),
    row(1, [e(3, 'strange')]), row(2, [e(3, 'memory')])];
  const expected = [1,2,10];
  assert.deepEqual(changedPairCategoryOverview(rows, [], 3).partnerIds, expected);
  assert.deepEqual(changedPairCategoryOverview([...rows].reverse(), [], 3).partnerIds, expected);
  assert.equal(changedPairCategoryOverview(rows, [], 3, 'bogus').filter, 'all');
});
test('invalid transfers, self-links and unknown endpoints are ignored', () => {
  const rows = [row(0, [e(0, 'life')]), row(1, [e(0, 'bogus')]), row(2)];
  const x = changedPairCategoryOverview(rows,
    [null, t(0, 99, 'life'), t(0, 0, 'life'), t(0, 1, 'bogus')], 0);
  assert.equal(x.total, 0);
});
test('imported names and inputs are never mutated or copied into summary', () => {
  const rows = [row(0, [], '<img src=x onerror=alert(1)>'),
    row(1, [e(0, 'life')], '<script>')];
  const history = [];
  const before = JSON.stringify({rows,history});
  const x = changedPairCategoryOverview(rows, history, 0);
  assert.deepEqual(x.partnerIds, [1]);
  assert.equal(JSON.stringify({rows,history}), before);
  assert.equal(JSON.stringify(x).includes('<script>'), false);
});
