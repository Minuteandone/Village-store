import assert from 'node:assert/strict';
import test from 'node:test';
import {pairMapHighlight} from '../pair-map-highlight.mjs';
import {pairTimelineHighlight} from '../pair-timeline-highlight.mjs';
import {pairTransitionBadge} from '../pair-transition-badge.mjs';
import {changedPairPartners} from '../changed-pair-navigation.mjs';
import {stepActivePairPartner} from '../active-pair-navigation.mjs';
globalThis.pairMapHighlight = pairMapHighlight;
globalThis.pairTimelineHighlight = pairTimelineHighlight;
globalThis.pairTransitionBadge = pairTransitionBadge;
const row = (id, incoming = [], name = 'Island ' + id) => ({id, incoming, name});
const e = (from, type) => ({from, type});
const t = (from, to, type) => ({from, to, type});

test('no history, missing selection, malformed inputs yield no changed pairs', () => {
  const rows = [row(0), row(1, [e(0, 'life')])];
  assert.deepEqual(changedPairPartners(rows, null, 0), []);
  assert.deepEqual(changedPairPartners(rows, undefined, 0), []);
  assert.deepEqual(changedPairPartners(rows, [], null), []);
  assert.deepEqual(changedPairPartners(rows, [], 99), []);
  assert.deepEqual(changedPairPartners(null, [], 0), []);
});
test('quiet and steady relationships are not falsely marked changed', () => {
  const rows = [row(0), row(1, [e(0, 'life')]), row(2)];
  assert.deepEqual(changedPairPartners(rows, [t(0, 1, 'life')], 0), []);
  assert.deepEqual(changedPairPartners([row(0), row(1)], [], 0), []);
});
test('new next-cycle traffic is included even without historical transfers', () => {
  const rows = [row(0), row(1, [e(0, 'life')]), row(2)];
  assert.deepEqual(changedPairPartners(rows, [], 0), [1]);
});
test('ended exchanges remain navigable even when forecast has no active pair', () => {
  const rows = [row(0), row(1), row(2)];
  assert.deepEqual(changedPairPartners(rows, [t(1, 0, 'memory')], 0), [1]);
});
test('new mutual exchanges and becoming one-way are recognized', () => {
  const rows = [row(0, [e(1, 'memory')]), row(1, [e(0, 'life')]), row(2)];
  assert.deepEqual(changedPairPartners(rows, [t(0, 1, 'life')], 0), [1]);
  assert.deepEqual(changedPairPartners([row(0), row(1, [e(0, 'life')])],
    [t(0, 1, 'life'), t(1, 0, 'memory')], 0), [1]);
});
test('reversal and family retune are included', () => {
  const rows = [row(0, [e(1, 'memory')]), row(1), row(2, [e(0, 'strange')])];
  assert.deepEqual(changedPairPartners(rows, [t(0, 1, 'life'), t(0, 2, 'life')], 0), [1, 2]);
});
test('results are stable, numeric, unique and independent of row order', () => {
  const rows = [row(10, [e(3, 'life')]), row(3), row(2, [e(3, 'memory')]),
    row(1, [e(3, 'strange')])];
  assert.deepEqual(changedPairPartners(rows, [], 3), [1, 2, 10]);
  assert.deepEqual(changedPairPartners([...rows].reverse(), [], 3), [1, 2, 10]);
});
test('malformed transfers, invalid families and unknown endpoints are ignored', () => {
  const rows = [row(0, [e(0, 'life'), e(99, 'life')]),
    row(1, [e(0, 'bogus')]), row(2)];
  assert.deepEqual(changedPairPartners(rows,
    [null, t(0, 99, 'life'), t(0, 0, 'life'), t(0, 1, 'bogus')], 0), []);
});
test('changed partners can be wrapped using existing navigation without losing ended pairs', () => {
  const rows = [row(0), row(1), row(2, [e(0, 'life')]), row(3)];
  const changed = changedPairPartners(rows, [t(0, 1, 'life')], 0);
  assert.deepEqual(changed, [1, 2]);
  assert.equal(stepActivePairPartner(changed, 2, 1), 1);
  assert.equal(stepActivePairPartner(changed, 1, -1), 2);
  assert.equal(stepActivePairPartner(changed, 3, -1), 2);
});
test('read-only calculation never changes rows, historical transfers or imported names', () => {
  const rows = [row(0, [], '<img src=x onerror=alert(1)>'),
    row(1, [e(0, 'life')], '<script>')];
  const history = [t(1, 0, 'memory')];
  const before = JSON.stringify({rows, history});
  assert.deepEqual(changedPairPartners(rows, history, 0), [1]);
  assert.equal(JSON.stringify({rows, history}), before);
});
