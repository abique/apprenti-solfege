// Synthétiseur Web Audio : un petit piano doux, des effets sonores mignons.
import { freqOfMidi } from './music.js';

let ctx = null;
let master = null;
let dry = null;
let wet = null;
let pianoWave = null;
let volume = 0.8;
let sfxEnabled = true;
let busyUntil = 0;
const voices = new Set();

export function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC({ latencyHint: 'interactive' });

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 14;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    comp.connect(ctx.destination);

    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(comp);

    dry = ctx.createGain();
    dry.connect(master);

    // Petite réverbération synthétique pour un son plus « doux ».
    const conv = ctx.createConvolver();
    conv.buffer = makeImpulse(ctx, 1.6);
    wet = ctx.createGain();
    wet.gain.value = 0.22;
    wet.connect(conv);
    conv.connect(master);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function makeImpulse(c, seconds) {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2) * (i < 60 ? i / 60 : 1);
    }
  }
  return buf;
}

function getPianoWave() {
  if (!pianoWave) {
    const amps = [0, 1, 0.45, 0.22, 0.15, 0.09, 0.055, 0.035, 0.022, 0.014, 0.009, 0.006, 0.004];
    const real = new Float32Array(amps.length);
    const imag = Float32Array.from(amps);
    pianoWave = ctx.createPeriodicWave(real, imag);
  }
  return pianoWave;
}

export function setVolume(v) {
  volume = v;
  if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
}

export function setSfx(enabled) {
  sfxEnabled = enabled;
}

/** Vrai tant qu'un son joué par l'appli est encore bien audible (utile pour ignorer le micro). */
export function isPlaying() {
  return ctx ? ctx.currentTime < busyUntil : false;
}

function track(nodes, stopAt) {
  const v = { nodes, stopAt };
  voices.add(v);
  nodes[0].onended = () => {
    voices.delete(v);
    for (const n of nodes) {
      try { n.disconnect(); } catch { /* déjà déconnecté */ }
    }
  };
  return v;
}

/**
 * Joue une note MIDI au son de piano doux.
 * @param {number} midi
 * @param {{delay?:number, dur?:number, vel?:number, quiet?:boolean}} opts
 */
export function playNote(midi, { delay = 0, dur = 1.4, vel = 0.75, quiet = false } = {}) {
  const c = getCtx();
  const t0 = c.currentTime + 0.03 + delay;
  dur = Math.max(0.35, dur);
  const f = freqOfMidi(midi);
  // Les graves paraissent plus faibles : on compense un peu.
  const amp = vel * 0.3 * (1 + Math.max(0, 60 - midi) / 40) * (1 - Math.max(0, midi - 84) / 60);

  const osc = c.createOscillator();
  osc.setPeriodicWave(getPianoWave());
  osc.frequency.value = f;

  const filt = c.createBiquadFilter();
  filt.type = 'lowpass';
  filt.Q.value = 0.6;
  filt.frequency.setValueAtTime(Math.min(16000, f * 9 + 900), t0);
  filt.frequency.exponentialRampToValueAtTime(Math.min(10000, f * 2.6 + 300), t0 + 0.7);

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(amp, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(amp * 0.42, t0 + 0.28);
  g.gain.exponentialRampToValueAtTime(0.0006, t0 + dur);

  // Une harmonique cristalline qui s'éteint vite : côté « boîte à musique ».
  const osc2 = c.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = f * 2;
  const g2 = c.createGain();
  g2.gain.setValueAtTime(0.0001, t0);
  g2.gain.linearRampToValueAtTime(amp * 0.22, t0 + 0.004);
  g2.gain.exponentialRampToValueAtTime(0.0004, t0 + 0.45);

  osc.connect(filt).connect(g);
  osc2.connect(g2);
  g.connect(dry);
  g2.connect(dry);
  g.connect(wet);

  const stopAt = t0 + dur + 0.05;
  osc.start(t0);
  osc2.start(t0);
  osc.stop(stopAt);
  osc2.stop(stopAt);
  track([osc, osc2, filt, g, g2], stopAt);
  if (!quiet) busyUntil = Math.max(busyUntil, t0 + Math.min(dur, 1.1) + 0.12);
  return t0;
}

export function playChord(midis, { delay = 0, dur = 1.8, vel = 0.75 } = {}) {
  const v = vel / Math.sqrt(midis.length) * 1.25;
  midis.forEach((m, i) => playNote(m, { delay: delay + i * 0.012, dur, vel: v }));
}

/** notes: [{ midi, at (s), dur? }] */
export function playSequence(notes, { vel = 0.75 } = {}) {
  for (const n of notes) playNote(n.midi, { delay: n.at, dur: n.dur ?? 1.0, vel });
}

function blip(freq, { delay = 0, dur = 0.18, type = 'sine', vel = 0.25, slideTo = null } = {}) {
  const c = getCtx();
  const t0 = c.currentTime + 0.02 + delay;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vel, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0005, t0 + dur);
  osc.connect(g);
  g.connect(dry);
  g.connect(wet);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
  track([osc, g], t0 + dur);
}

export function sfxGood() {
  if (!sfxEnabled) return;
  blip(1318.5, { dur: 0.16, vel: 0.16 });
  blip(1760, { delay: 0.09, dur: 0.32, vel: 0.16 });
}

export function sfxBad() {
  if (!sfxEnabled) return;
  blip(330, { dur: 0.28, type: 'triangle', vel: 0.22, slideTo: 196 });
}

export function sfxLevelUp() {
  if (!sfxEnabled) return;
  [72, 76, 79, 84].forEach((m, i) => playNote(m, { delay: i * 0.11, dur: 0.9, vel: 0.55, quiet: true }));
  [2637, 3136, 3520].forEach((f, i) => blip(f, { delay: 0.5 + i * 0.07, dur: 0.25, vel: 0.06 }));
}

export function sfxPop() {
  if (!sfxEnabled) return;
  blip(880, { dur: 0.08, vel: 0.08, slideTo: 1400 });
}

export function stopAll() {
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const v of voices) {
    for (const n of v.nodes) {
      if (n instanceof GainNode) {
        n.gain.cancelScheduledValues(now);
        n.gain.setTargetAtTime(0, now, 0.015);
      }
    }
    try { v.nodes[0].stop(now + 0.08); } catch { /* déjà arrêté */ }
  }
  busyUntil = 0;
}
