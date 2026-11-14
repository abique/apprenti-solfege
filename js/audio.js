// Synthétiseur Web Audio : un petit piano doux, des effets sonores mignons.
import { freqOfMidi } from './music.js';

let ctx = null;
let master = null;
let dry = null;
let reverb = null; // { input, conv, out } — recréée à chaque interruption pour couper la traîne
let impulse = null;
let pianoWave = null;
let volume = 0.8;
let sfxEnabled = true;
let busyUntil = 0;
const voices = new Set();

const FADE = 0.012; // constante de temps du fondu d'arrêt (≈ 50 ms pour être inaudible)

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
    impulse = makeImpulse(ctx, 1.6);
    reverb = makeReverb();
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

function makeReverb() {
  const input = ctx.createGain();
  input.gain.value = 0.22;
  const conv = ctx.createConvolver();
  conv.buffer = impulse;
  const out = ctx.createGain();
  input.connect(conv);
  conv.connect(out);
  out.connect(master);
  return { input, conv, out };
}

/** Coupe la traîne de réverbération en cours (fondu court) et repart avec une réverb neuve. */
function resetReverb() {
  const old = reverb;
  old.out.gain.setTargetAtTime(0, ctx.currentTime, FADE);
  setTimeout(() => {
    for (const n of [old.input, old.conv, old.out]) {
      try { n.disconnect(); } catch { /* déjà déconnecté */ }
    }
  }, 300);
  reverb = makeReverb();
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

function disconnectAll(nodes) {
  for (const n of nodes) {
    try { n.disconnect(); } catch { /* déjà déconnecté */ }
  }
}

/**
 * Crée une « voix » : ses sources passent par un gain d'arrêt (vca) sans automation,
 * qu'on peut donc toujours baisser proprement, même si la note n'a pas encore commencé.
 * @param {'music'|'sfx'} kind
 */
function makeVoice(kind) {
  const vca = ctx.createGain();
  vca.connect(dry);
  vca.connect(reverb.input);
  const v = { kind, vca, sources: [], nodes: [vca] };
  voices.add(v);
  return v;
}

function startSources(v, t0, stopAt) {
  for (const s of v.sources) {
    s.start(t0);
    s.stop(stopAt);
  }
  v.sources[0].onended = () => {
    voices.delete(v);
    disconnectAll(v.nodes);
  };
}

/**
 * Joue une note MIDI au son de piano doux.
 * @param {number} midi
 * @param {{delay?:number, dur?:number, vel?:number, quiet?:boolean, kind?:'music'|'sfx'}} opts
 */
export function playNote(midi, { delay = 0, dur = 1.4, vel = 0.75, quiet = false, kind = 'music' } = {}) {
  const c = getCtx();
  const t0 = c.currentTime + 0.03 + delay;
  dur = Math.max(0.35, dur);
  const f = freqOfMidi(midi);
  // Les graves paraissent plus faibles : on compense un peu.
  const amp = vel * 0.3 * (1 + Math.max(0, 60 - midi) / 40) * (1 - Math.max(0, midi - 84) / 60);
  const v = makeVoice(kind);

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

  osc.connect(filt).connect(g).connect(v.vca);
  osc2.connect(g2).connect(v.vca);
  v.sources.push(osc, osc2);
  v.nodes.push(osc, osc2, filt, g, g2);
  startSources(v, t0, t0 + dur + 0.05);
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
  const v = makeVoice('sfx');
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vel, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0005, t0 + dur);
  osc.connect(g).connect(v.vca);
  v.sources.push(osc);
  v.nodes.push(osc, g);
  startSources(v, t0, t0 + dur + 0.05);
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
  [72, 76, 79, 84].forEach((m, i) => playNote(m, { delay: i * 0.11, dur: 0.9, vel: 0.55, quiet: true, kind: 'sfx' }));
  [2637, 3136, 3520].forEach((f, i) => blip(f, { delay: 0.5 + i * 0.07, dur: 0.25, vel: 0.06 }));
}

export function sfxPop() {
  if (!sfxEnabled) return;
  blip(880, { dur: 0.08, vel: 0.08, slideTo: 1400 });
}

/** Arrête les voix (toutes, ou d'un seul type) avec un fondu très court, y compris celles déjà programmées. */
function stopVoices(kind = null) {
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const v of [...voices]) {
    if (kind && v.kind !== kind) continue;
    voices.delete(v);
    v.vca.gain.setValueAtTime(v.vca.gain.value, now);
    v.vca.gain.setTargetAtTime(0, now, FADE);
    for (const s of v.sources) {
      s.onended = null;
      try { s.stop(now + 0.15); } catch { /* déjà arrêtée */ }
    }
    setTimeout(() => disconnectAll(v.nodes), 300);
  }
  resetReverb();
  busyUntil = 0;
}

/** Arrête la musique en cours (notes, accords, arpèges programmés) mais laisse finir les bruitages. */
export function stopMusic() {
  stopVoices('music');
}

/** Arrête tout : musique et bruitages. */
export function stopAll() {
  stopVoices();
}
