import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeProfile, normalizeProfile, recordChrono, bestChrono } from '../js/storage.js';

test('défi chrono : record par exercice et par niveau, ♪ gagnées', () => {
  const p = makeProfile({ name: 'Test', companion: 'mochi' });

  // Premier défi : c'est un record, mais pas un record « battu » (pas de bonus).
  let r = recordChrono(p, 'reading', 2, 12, 1);
  assert.deepEqual(r, { best: 12, prevBest: 0, isRecord: true, reward: 2, bonus: 0 });
  assert.equal(p.notes, 2);

  // Moins bien : le record reste.
  r = recordChrono(p, 'reading', 2, 9);
  assert.equal(r.isRecord, false);
  assert.equal(r.best, 12);
  assert.equal(r.reward, 1);

  // Record battu : bonus de 3 ♪.
  r = recordChrono(p, 'reading', 2, 15);
  assert.deepEqual(r, { best: 15, prevBest: 12, isRecord: true, reward: 6, bonus: 3 });

  // Un autre niveau a son propre record.
  recordChrono(p, 'reading', 0, 30);
  assert.equal(p.chrono.reading[0].best, 30);
  assert.equal(p.chrono.reading[2].best, 15);
  assert.equal(p.chrono.reading[2].runs, 3);
  assert.deepEqual(p.chrono.reading[2].history.at(-1), { score: 15, errors: 0 });

  // Sur l'accueil : le record du niveau le plus avancé.
  assert.deepEqual(bestChrono(p, 'reading'), { level: 2, best: 15 });
  assert.equal(bestChrono(p, 'listening'), null);
});

test('défi chrono : les records survivent à la sauvegarde et à l’import', () => {
  const p = makeProfile({ name: 'Test', companion: 'mochi' });
  recordChrono(p, 'listening', 1, 8);
  const copy = normalizeProfile(JSON.parse(JSON.stringify(p)));
  assert.equal(copy.chrono.listening[1].best, 8);
  assert.deepEqual(normalizeProfile({ name: 'Ancien' }).chrono, {});
});
