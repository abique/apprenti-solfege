// Lire les notes sur la portée.
import { naturalRange, noteKey, parseNote, noteName, noteToMidi, pitchClass, STEP_COLORS } from '../music.js';
import { staffSVG } from '../staff.js';
import { playNote } from '../audio.js';
import { onMidi } from '../midi.js';
import { pickWeighted } from '../adaptive.js';
import { h } from '../ui.js';
import { ICONS, stepButtons, noteLabel } from './common.js';

const items = (clef, from, to) => naturalRange(from, to).map((n) => `${clef}:${noteKey(n)}`);
const list = (clef, notes) => notes.map((n) => `${clef}:${n}`);

const LEVELS = [
  { name: 'Do, Mi, Sol', items: list('treble', ['C4', 'E4', 'G4']), tip: 'Le Sol est sur la 2e ligne, là où s’enroule la clé de sol. Le Do a sa petite ligne à lui, tout en bas !' },
  { name: 'De Do à Sol', items: items('treble', 'C4', 'G4'), tip: 'Les notes montent comme un escalier : une ligne, un espace, une ligne… Do, Ré, Mi, Fa, Sol !' },
  { name: 'La gamme de Do', items: items('treble', 'C4', 'C5'), tip: 'Après Sol viennent La, Si… et on retrouve Do, plus aigu !' },
  { name: 'Toute la portée', items: items('treble', 'C4', 'A5'), tip: 'Astuce : le Fa du haut est sur la 5e ligne, le Mi du bas sur la 1re.' },
  { name: 'Lignes supplémentaires', items: items('treble', 'A3', 'C6'), tip: 'Quand la portée ne suffit plus, on ajoute de petites lignes au-dessus ou en dessous.' },
  { name: 'Clé de fa : premiers pas', items: items('bass', 'C3', 'C4'), tip: 'Voici la clé de fa ! Ses deux points entourent la 4e ligne : c’est le Fa.' },
  { name: 'Clé de fa : toute la portée', items: items('bass', 'E2', 'C4'), tip: 'En clé de fa, la ligne du bas est un Sol et la ligne du haut un La.' },
  { name: 'Les deux clés', items: [...items('treble', 'A3', 'C6'), ...items('bass', 'E2', 'E4')], tip: 'Regarde bien la clé avant de répondre !' },
];

function parseItem(key) {
  const [clef, n] = key.split(':');
  return { clef, note: parseNote(n) };
}

export default {
  id: 'reading',
  title: 'Lire les notes',
  subtitle: 'Reconnaître les notes sur la portée',
  color: '#ff7eaa',
  icon: ICONS.reading,
  ask: 'Comment s’appelle cette note ?',
  levels: LEVELS,
  // Défi chrono : délai avant la question suivante après une bonne réponse / une erreur (ms).
  chrono: { correctDelay: 350, wrongDelay: 1500 },

  allItemKeys() {
    return [...new Set(LEVELS.flatMap((l) => l.items))];
  },

  itemLabel(key) {
    const { clef, note } = parseItem(key);
    // Convention française : le Do du milieu du piano est Do3.
    return `${noteName(note)}${note.octave - 1}${clef === 'bass' ? ' (fa)' : ''}`;
  },

  makeQuestion(level, track, recent) {
    const key = pickWeighted(level.items, track, recent);
    return { key, ...parseItem(key) };
  },

  present(q, api) {
    const { stage, answers, secondary } = api;
    const steps = [...new Set(api.level.items.map((k) => parseItem(k).note.step))].sort((a, b) => a - b);
    const staffBox = h('div', { class: 'staff-box', html: staffSVG({ clef: q.clef, columns: [{ notes: [q.note] }], minWidth: 170 }) });
    stage.append(staffBox);

    const midi = noteToMidi(q.note);
    let buttons = [];
    function choose(step) {
      if (api.isAnswered()) return;
      const correct = step === q.note.step;
      buttons[steps.indexOf(step)]?.classList.add(correct ? 'good' : 'bad');
      if (!correct) buttons[steps.indexOf(q.note.step)]?.classList.add('reveal');
      const { main, sub } = noteLabel(q.note, secondary);
      staffBox.innerHTML = staffSVG({
        clef: q.clef,
        columns: [{ notes: [q.note], color: correct ? '#2fc58a' : STEP_COLORS[q.note.step], label: sub ? `${main} · ${sub}` : main, labelColor: STEP_COLORS[q.note.step] }],
        minWidth: 170,
      });
      playNote(midi, { delay: 0.15, dur: 1.2 });
      api.answer(correct);
    }
    buttons = stepButtons(steps, secondary, choose);
    answers.append(...buttons);

    // Réponse possible avec un clavier MIDI (n'importe quelle octave).
    api.onCleanup(onMidi((e) => {
      if (e.type !== 'on' || api.isAnswered()) return;
      const pc = pitchClass(e.midi);
      const step = [0, 2, 4, 5, 7, 9, 11].indexOf(pc);
      if (step >= 0 && steps.includes(step)) choose(step);
    }));
  },
};
