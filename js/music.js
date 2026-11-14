// Théorie musicale : notes, noms, intervalles, accords.
// Une note = { step: 0..6 (Do..Si), alter: -1|0|1, octave: n } — octave 4 = octave du La 440.

export const STEP_SEMI = [0, 2, 4, 5, 7, 9, 11];
export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

// Le nom principal est toujours Do Ré Mi ; un nom secondaire (C D E par défaut) est affiché en petit.
export const FR_NAMES = ['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
export const EN_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export const JA_NAMES = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ'];

export const SECONDARY = {
  en: 'C D E',
  both: 'C D E + ドレミ',
  ja: 'ドレミ',
  none: 'Aucun',
};

// Couleurs « arc-en-ciel » associées aux notes (aide à la mémorisation).
export const STEP_COLORS = ['#ff6b6b', '#ff9f43', '#f7c531', '#51cf66', '#4dabf7', '#9775fa', '#f783ac'];

export function parseNote(str) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(str);
  if (!m) throw new Error(`Note invalide : ${str}`);
  return {
    step: LETTERS.indexOf(m[1]),
    alter: m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0,
    octave: Number(m[3]),
  };
}

export function noteKey(n) {
  return LETTERS[n.step] + (n.alter === 1 ? '#' : n.alter === -1 ? 'b' : '') + n.octave;
}

export function noteToMidi(n) {
  return 12 * (n.octave + 1) + STEP_SEMI[n.step] + (n.alter || 0);
}

const PC_TO_STEP = [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [5, 0], [5, 1], [6, 0]];

export function midiToNote(midi) {
  const pc = ((midi % 12) + 12) % 12;
  const [step, alter] = PC_TO_STEP[pc];
  return { step, alter, octave: Math.floor(midi / 12) - 1 };
}

export function pitchClass(midi) {
  return ((Math.round(midi) % 12) + 12) % 12;
}

export function diatonicIndex(n) {
  return n.octave * 7 + n.step;
}

/** Liste des notes naturelles (sans altération) entre deux notes incluses. */
export function naturalRange(from, to) {
  const a = diatonicIndex(parseNote(from));
  const b = diatonicIndex(parseNote(to));
  const out = [];
  for (let d = a; d <= b; d++) out.push({ step: ((d % 7) + 7) % 7, alter: 0, octave: Math.floor(d / 7) });
  return out;
}

export function freqOfMidi(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export function midiOfFreq(f) {
  return 69 + 12 * Math.log2(f / 440);
}

export function accidental(alter) {
  return alter === 1 ? '♯' : alter === -1 ? '♭' : '';
}

/** Nom principal d'une note : Do, Ré♯, Si♭… */
export function noteName(n) {
  return FR_NAMES[n.step] + accidental(n.alter);
}

/** Nom secondaire d'une note selon le réglage : « C♯ », « ド♯ », « C♯ · ド♯ » ou rien. */
export function noteSubName(n, secondary = 'en') {
  const acc = accidental(n.alter);
  switch (secondary) {
    case 'none': return '';
    case 'ja': return JA_NAMES[n.step] + acc;
    case 'both': return `${EN_NAMES[n.step]}${acc} · ${JA_NAMES[n.step]}${acc}`;
    default: return EN_NAMES[n.step] + acc;
  }
}

export function stepName(step) {
  return FR_NAMES[step];
}

export function stepSubName(step, secondary = 'en') {
  return noteSubName({ step, alter: 0 }, secondary);
}

export function midiName(midi) {
  return noteName(midiToNote(midi));
}

export function midiSubName(midi, secondary = 'en') {
  return noteSubName(midiToNote(midi), secondary);
}

/** Écart en cents entre une hauteur (midi flottant) et la classe de hauteur cible, ramené à [-600, 600[. */
export function centsToPitchClass(midiFloat, targetMidi) {
  let d = (midiFloat - targetMidi) % 12;
  if (d < -6) d += 12;
  if (d >= 6) d -= 12;
  return d * 100;
}

export const INTERVALS = [
  { id: 'm2', semis: 1, name: 'Seconde mineure', short: '2de mineure', hint: 'Les Dents de la mer 🦈' },
  { id: 'M2', semis: 2, name: 'Seconde majeure', short: '2de majeure', hint: 'Frère Jacques (« Frè-re ») 🔔' },
  { id: 'm3', semis: 3, name: 'Tierce mineure', short: '3ce mineure', hint: 'Smoke on the Water 🎸' },
  { id: 'M3', semis: 4, name: 'Tierce majeure', short: '3ce majeure', hint: 'Oh When the Saints 🎺' },
  { id: 'P4', semis: 5, name: 'Quarte juste', short: 'Quarte', hint: 'Mon beau sapin (« Mon beau ») 🎄' },
  { id: 'TT', semis: 6, name: 'Triton', short: 'Triton', hint: 'Les Simpson (« The Simp- ») 🍩' },
  { id: 'P5', semis: 7, name: 'Quinte juste', short: 'Quinte', hint: 'Ah ! vous dirai-je maman ⭐ ou Star Wars' },
  { id: 'm6', semis: 8, name: 'Sixte mineure', short: '6te mineure', hint: null },
  { id: 'M6', semis: 9, name: 'Sixte majeure', short: '6te majeure', hint: 'My Bonnie (« My Bon- ») 🌊' },
  { id: 'm7', semis: 10, name: 'Septième mineure', short: '7e mineure', hint: 'Star Trek (la série) 🚀' },
  { id: 'M7', semis: 11, name: 'Septième majeure', short: '7e majeure', hint: null },
  { id: 'P8', semis: 12, name: 'Octave', short: 'Octave', hint: 'Over the Rainbow (« Some-where ») 🌈' },
];

export const INTERVAL_BY_ID = Object.fromEntries(INTERVALS.map((i) => [i.id, i]));

export const CHORDS = [
  { id: 'maj', name: 'Majeur', semis: [0, 4, 7], mood: 'joyeux', emoji: '☀️' },
  { id: 'min', name: 'Mineur', semis: [0, 3, 7], mood: 'triste', emoji: '🌧️' },
  { id: 'dim', name: 'Diminué', semis: [0, 3, 6], mood: 'inquiétant', emoji: '👻' },
  { id: 'aug', name: 'Augmenté', semis: [0, 4, 8], mood: 'mystérieux', emoji: '🔮' },
  { id: 'dom7', name: '7e de dominante', semis: [0, 4, 7, 10], mood: 'qui veut avancer', emoji: '🚂' },
  { id: 'maj7', name: '7e majeure', semis: [0, 4, 7, 11], mood: 'rêveur', emoji: '🌙' },
  { id: 'min7', name: '7e mineure', semis: [0, 3, 7, 10], mood: 'doux', emoji: '☕' },
];

export const CHORD_BY_ID = Object.fromEntries(CHORDS.map((c) => [c.id, c]));

/** Notes MIDI d'un accord, avec renversement éventuel (0 = état fondamental). */
export function chordNotes(root, chordId, inversion = 0) {
  const notes = CHORD_BY_ID[chordId].semis.map((s) => root + s);
  for (let i = 0; i < inversion; i++) notes.push(notes.shift() + 12);
  return notes;
}
