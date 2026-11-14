import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPitch } from '../js/pitch.js';
import { midiOfFreq } from '../js/music.js';

const SR = 48000;

function voice(freq, n = 2048, { noise = 0, harmonics = [1, 0.5, 0.3, 0.15] } = {}) {
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    harmonics.forEach((a, k) => { s += a * Math.sin(2 * Math.PI * freq * (k + 1) * i / SR); });
    buf[i] = 0.25 * s + noise * (Math.random() * 2 - 1);
  }
  return buf;
}

const cents = (a, b) => 1200 * Math.log2(a / b);

test('détecte la hauteur à ±5 cents (voix d’enfant et d’adulte)', () => {
  for (const f of [98, 130.81, 196, 261.63, 329.63, 440, 523.25, 698.46, 880]) {
    const r = detectPitch(voice(f), SR);
    assert.ok(Math.abs(cents(r.freq, f)) < 5, `${f} Hz → ${r.freq.toFixed(2)} Hz`);
    assert.ok(r.clarity > 0.8);
  }
});

test('reste fiable avec du bruit', () => {
  const f = 293.66;
  const r = detectPitch(voice(f, 2048, { noise: 0.05 }), SR);
  assert.ok(Math.abs(cents(r.freq, f)) < 10, `${r.freq}`);
});

test('fondamentale faible (son riche en harmoniques)', () => {
  const f = 220;
  const r = detectPitch(voice(f, 2048, { harmonics: [0.3, 1, 0.8, 0.4] }), SR);
  const d = midiOfFreq(r.freq) - midiOfFreq(f);
  // Une erreur d'octave serait acceptable pour le chant (octave indifférente), pas une autre note.
  assert.ok(Math.abs(d - Math.round(d / 12) * 12) < 0.1, `${r.freq}`);
});

test('silence et bruit ne donnent pas de note', () => {
  assert.equal(detectPitch(new Float32Array(2048), SR).freq, 0);
  const noise = Float32Array.from({ length: 2048 }, () => (Math.random() * 2 - 1) * 0.3);
  assert.equal(detectPitch(noise, SR).freq, 0);
});
