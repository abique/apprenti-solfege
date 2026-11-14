import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyTrack, record, pickWeighted, medalTier, levelProgress, itemSkill } from '../js/adaptive.js';

test('monte de niveau après 8 bonnes réponses sur 10', () => {
  const t = emptyTrack();
  const results = [1, 1, 0, 1, 1, 1, 0, 1, 1, 1];
  let event = null;
  results.forEach((r, i) => { event = record(t, `k${i % 3}`, !!r, 5); });
  assert.equal(event, 'up');
  assert.equal(t.level, 1);
  assert.deepEqual(t.window, []);
});

test('ne monte pas avec 7 sur 10', () => {
  const t = emptyTrack();
  [1, 1, 0, 1, 0, 1, 0, 1, 1, 1].forEach((r) => record(t, 'a', !!r, 5));
  assert.equal(t.level, 0);
});

test('redescend pour réviser, mais garde sa médaille', () => {
  const t = emptyTrack();
  for (let i = 0; i < 10; i++) record(t, 'a', true, 5);
  for (let i = 0; i < 10; i++) record(t, 'a', true, 5);
  assert.equal(t.level, 2);
  const tier = medalTier(t, 5);
  let ev = null;
  for (let i = 0; i < 10; i++) ev = record(t, 'a', i < 3, 5);
  assert.equal(ev, 'down');
  assert.equal(t.level, 1);
  assert.equal(t.best, 2);
  assert.equal(medalTier(t, 5), tier);
});

test('maîtrise du dernier niveau = diamant', () => {
  const t = emptyTrack();
  const events = [];
  for (let i = 0; i < 40; i++) events.push(record(t, 'a', true, 3));
  assert.equal(t.level, 2);
  assert.ok(events.includes('mastered'));
  assert.equal(t.mastered, true);
  assert.equal(medalTier(t, 3), 5);
});

test('paliers de médailles', () => {
  const tier = (best, n = 8) => medalTier({ ...emptyTrack(), best }, n);
  assert.equal(tier(0), 0);
  assert.equal(tier(1), 1); // bronze dès le 2e niveau
  assert.equal(tier(3), 2);
  assert.equal(tier(5), 3);
  assert.equal(tier(7), 4);
  assert.equal(medalTier(undefined, 8), 0);
});

test('progression vers le niveau suivant', () => {
  const t = emptyTrack();
  for (let i = 0; i < 4; i++) record(t, 'a', true, 5);
  assert.equal(levelProgress(t), 0.5);
});

test('les éléments ratés reviennent plus souvent, sans répétition immédiate', () => {
  const t = emptyTrack();
  for (let i = 0; i < 6; i++) { record(t, 'easy', true, 9); record(t, 'hard', false, 9); }
  assert.ok(itemSkill(t, 'hard') < itemSkill(t, 'easy'));
  // Générateur pseudo-aléatoire déterministe (mulberry32).
  let s = 12345;
  const rnd = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const counts = { easy: 0, hard: 0 };
  for (let i = 0; i < 2000; i++) counts[pickWeighted(['easy', 'hard'], t, [], rnd)]++;
  assert.ok(counts.hard > counts.easy * 2, JSON.stringify(counts));

  const counts2 = { a: 0, b: 0, c: 0 };
  for (let i = 0; i < 2000; i++) counts2[pickWeighted(['a', 'b', 'c'], emptyTrack(), ['a'], rnd)]++;
  assert.ok(counts2.a < counts2.b / 4, JSON.stringify(counts2));
});
