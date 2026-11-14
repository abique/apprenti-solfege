import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMidi } from '../js/midifile.js';

// Petit constructeur de fichiers MIDI pour les tests.
function varlen(n) {
  const bytes = [n & 0x7f];
  while ((n >>= 7)) bytes.unshift((n & 0x7f) | 0x80);
  return bytes;
}
function chunk(id, bytes) {
  const len = bytes.length;
  return [...id].map((c) => c.charCodeAt(0)).concat([(len >>> 24) & 255, (len >>> 16) & 255, (len >>> 8) & 255, len & 255], bytes);
}
function midiFile(format, division, tracks) {
  const head = chunk('MThd', [0, format, 0, tracks.length, division >> 8, division & 255]);
  return Uint8Array.from(head.concat(...tracks.map((t) => chunk('MTrk', t)))).buffer;
}
const ev = (delta, ...bytes) => [...varlen(delta), ...bytes];
const END = ev(0, 0xff, 0x2f, 0);

test('notes, tempo et running status', () => {
  const track = [
    ...ev(0, 0xff, 0x51, 3, 0x07, 0xa1, 0x20), // 500000 µs = 120 noires/min
    ...ev(0, 0x90, 60, 100), // Do4
    ...ev(480, 64, 90), // running status : Mi4 après une noire
    ...ev(480, 0x80, 60, 0),
    ...ev(0, 0x90, 64, 0), // note-on vélocité 0 = fin de note
    ...END,
  ];
  const { notes, duration } = parseMidi(midiFile(0, 480, [track]));
  assert.equal(notes.length, 2);
  assert.deepEqual(notes.map((n) => n.midi), [60, 64]);
  assert.equal(notes[0].start, 0);
  assert.ok(Math.abs(notes[0].end - 1) < 1e-9);
  assert.ok(Math.abs(notes[1].start - 0.5) < 1e-9);
  assert.ok(Math.abs(duration - 1) < 1e-9);
});

test('format 1 : changement de tempo dans la piste de tempo', () => {
  const tempoTrack = [
    ...ev(0, 0xff, 0x51, 3, 0x07, 0xa1, 0x20), // 120 bpm
    ...ev(960, 0xff, 0x51, 3, 0x0f, 0x42, 0x40), // après 2 noires : 60 bpm
    ...END,
  ];
  const notesTrack = [
    ...ev(0, 0xff, 0x03, 2, 0x52, 0x48), // nom « RH »
    ...ev(960, 0x90, 67, 80),
    ...ev(480, 0x80, 67, 0),
    ...ev(0, 0x99, 36, 100), // percussion (canal 10) : ignorée
    ...ev(10, 0x89, 36, 0),
    ...END,
  ];
  const { notes, tracks } = parseMidi(midiFile(1, 480, [tempoTrack, notesTrack]));
  assert.equal(notes.length, 1);
  assert.ok(Math.abs(notes[0].start - 1) < 1e-9); // 2 noires à 120 = 1 s
  assert.ok(Math.abs(notes[0].end - 2) < 1e-9); // 1 noire à 60 = 1 s
  assert.equal(tracks[1], 'RH');
});

test('refuse ce qui n’est pas du MIDI', () => {
  assert.throws(() => parseMidi(new TextEncoder().encode('bonjour, je ne suis pas un MIDI').buffer), /MIDI/);
});
