import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseNote, noteToMidi, midiToNote, noteName, noteSubName, naturalRange, freqOfMidi, midiOfFreq,
  centsToPitchClass, chordNotes,
} from '../js/music.js';
import { spellUpper } from '../js/exercises/intervals.js';
import { noteY } from '../js/staff.js';

test('conversion note ↔ MIDI', () => {
  assert.equal(noteToMidi(parseNote('C4')), 60);
  assert.equal(noteToMidi(parseNote('A4')), 69);
  assert.equal(noteToMidi(parseNote('F#3')), 54);
  assert.equal(noteToMidi(parseNote('Bb2')), 46);
  assert.deepEqual(midiToNote(61), { step: 0, alter: 1, octave: 4 });
  for (let m = 21; m <= 108; m++) assert.equal(noteToMidi(midiToNote(m)), m);
});

test('Do Ré Mi en nom principal, C D E en nom secondaire', () => {
  assert.equal(noteName(parseNote('G4')), 'Sol');
  assert.equal(noteName(parseNote('C#4')), 'Do♯');
  assert.equal(noteSubName(parseNote('G4')), 'G');
  assert.equal(noteSubName(parseNote('G4'), 'ja'), 'ソ');
  assert.equal(noteSubName(parseNote('Eb4'), 'both'), 'E♭ · ミ♭');
  assert.equal(noteSubName(parseNote('G4'), 'none'), '');
});

test('gamme naturelle', () => {
  assert.deepEqual(naturalRange('C4', 'C5').map(noteName), ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si', 'Do']);
  assert.equal(naturalRange('A3', 'C6').length, 17);
});

test('fréquences', () => {
  assert.ok(Math.abs(freqOfMidi(69) - 440) < 1e-9);
  assert.ok(Math.abs(freqOfMidi(60) - 261.6256) < 1e-3);
  assert.ok(Math.abs(midiOfFreq(523.2511) - 72) < 1e-4);
});

test('écart à la classe de hauteur (octave indifférente)', () => {
  assert.equal(Math.round(centsToPitchClass(72, 60)), 0); // Do une octave au-dessus
  assert.equal(Math.round(centsToPitchClass(48.2, 60)), 20);
  assert.equal(Math.round(centsToPitchClass(59.5, 60)), -50);
  assert.equal(Math.round(centsToPitchClass(55, 60)), -500); // Sol sous le Do : chanter plus haut
  assert.equal(Math.round(centsToPitchClass(65, 60)), 500);
});

test('accords et renversements', () => {
  assert.deepEqual(chordNotes(60, 'maj'), [60, 64, 67]);
  assert.deepEqual(chordNotes(60, 'min', 1), [63, 67, 72]);
  assert.deepEqual(chordNotes(60, 'dom7', 3), [70, 72, 76, 79]);
});

test('orthographe des intervalles', () => {
  const C4 = parseNote('C4');
  assert.equal(noteName(spellUpper(C4, 'm3')), 'Mi♭');
  assert.equal(noteName(spellUpper(C4, 'TT')), 'Fa♯');
  assert.equal(noteName(spellUpper(C4, 'm7')), 'Si♭');
  assert.equal(noteName(spellUpper(parseNote('B3'), 'M3')), 'Ré♯');
  assert.equal(noteName(spellUpper(parseNote('F4'), 'P4')), 'Si♭');
  // Si + triton donnerait Mi♯ : on simplifie en Fa.
  assert.equal(noteName(spellUpper(parseNote('B3'), 'TT')), 'Fa');
  for (const id of ['m2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8']) {
    for (const root of ['G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4']) {
      const r = parseNote(root);
      const semis = noteToMidi(spellUpper(r, id)) - noteToMidi(r);
      assert.ok(semis >= 1 && semis <= 12, `${root} ${id}`);
    }
  }
});

test('position des notes sur la portée', () => {
  assert.equal(noteY(parseNote('F5'), 'treble'), 0); // 5e ligne
  assert.equal(noteY(parseNote('E4'), 'treble'), 40); // 1re ligne
  assert.equal(noteY(parseNote('G4'), 'treble'), 30); // ligne de la clé de sol
  assert.equal(noteY(parseNote('C4'), 'treble'), 50); // ligne supplémentaire
  assert.equal(noteY(parseNote('F3'), 'bass'), 10); // ligne de la clé de fa
  assert.equal(noteY(parseNote('G2'), 'bass'), 40);
});
