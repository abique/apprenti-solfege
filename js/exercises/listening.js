// Reconnaître une note à l'oreille (avec le Do comme repère).
import { midiToNote, noteName, noteSubName, pitchClass, STEP_COLORS } from '../music.js';
import { staffSVG } from '../staff.js';
import { playNote } from '../audio.js';
import { onMidi } from '../midi.js';
import { pickWeighted } from '../adaptive.js';
import { h, answerButton } from '../ui.js';
import { ICONS, toolButton, noteLabel } from './common.js';

const NAT = [0, 2, 4, 5, 7, 9, 11];
const CHROMA = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const LEVELS = [
  { name: 'Do ou Sol ?', pcs: [0, 7], ref: true, tip: 'Je joue d’abord le Do (le repère), puis une note mystère. Est-ce encore Do… ou Sol, plus haut ?' },
  { name: 'Do, Mi, Sol', pcs: [0, 4, 7], ref: true, tip: 'Le Mi est entre le Do et le Sol.' },
  { name: 'De Do à Sol', pcs: [0, 2, 4, 5, 7], ref: true, tip: 'Chante dans ta tête : Do, Ré, Mi, Fa, Sol… jusqu’à la note mystère !' },
  { name: 'Toute la gamme', pcs: NAT, ref: true, tip: 'La et Si sont tout en haut de la gamme, juste avant le Do suivant.' },
  { name: 'Autres octaves', pcs: NAT, ref: true, octaves: [3, 4, 5], tip: 'Plus grave ou plus aigu, un Do reste un Do ! Le repère change d’octave avec la note.' },
  { name: 'Sans le repère', pcs: NAT, ref: false, tip: 'Je ne joue plus le Do tout seul. Appuie sur « Do » si tu as besoin de l’entendre.' },
  { name: 'Les touches noires', pcs: CHROMA, ref: true, tip: 'Voici les dièses ! Do♯ est juste entre Do et Ré.' },
];

const PC_NOTE = (pc) => midiToNote(60 + pc);

export default {
  id: 'listening',
  title: 'L’oreille musicale',
  subtitle: 'Associer le son au nom de la note',
  color: '#4fb6ee',
  icon: ICONS.listening,
  ask: (q, level) => (level.ref ? 'Écoute le Do… puis la note mystère !' : 'Quelle est cette note ?'),
  levels: LEVELS,

  allItemKeys() {
    return CHROMA.map(String);
  },

  itemLabel(key) {
    return noteName(PC_NOTE(Number(key)));
  },

  makeQuestion(level, track, recent) {
    const key = pickWeighted(level.pcs.map(String), track, recent);
    const octaves = level.octaves || [4];
    const octave = octaves[Math.floor(Math.random() * octaves.length)];
    const ref = 12 * (octave + 1);
    return { key, pc: Number(key), ref, midi: ref + Number(key) };
  },

  present(q, api) {
    const { stage, tools, answers, level, secondary } = api;
    const orb = h('button', { class: 'listen-orb', type: 'button', 'aria-label': 'Réécouter' }, '?');
    stage.append(orb);
    let playTimer = 0;

    function glow(ms) {
      orb.classList.add('playing');
      clearTimeout(playTimer);
      playTimer = setTimeout(() => orb.classList.remove('playing'), ms);
    }
    function playQuestion(withRef = level.ref) {
      if (withRef) {
        playNote(q.ref, { dur: 0.9 });
        playNote(q.midi, { delay: 1.0, dur: 1.3 });
        glow(2300);
      } else {
        playNote(q.midi, { dur: 1.3 });
        glow(1300);
      }
    }
    function playRef() {
      playNote(q.ref, { dur: 1.0 });
    }
    orb.onclick = () => playQuestion();
    api.onCleanup(() => clearTimeout(playTimer));

    tools.append(
      toolButton('🔁 Réécouter', () => playQuestion()),
      toolButton('🎵 Do (repère)', playRef),
    );
    api.key(' ', () => playQuestion());
    api.key('r', playRef);

    let buttons = [];
    function choose(pc) {
      if (api.isAnswered()) return;
      const correct = pc === q.pc;
      buttons[level.pcs.indexOf(pc)]?.classList.add(correct ? 'good' : 'bad');
      if (!correct) buttons[level.pcs.indexOf(q.pc)]?.classList.add('reveal');
      const note = midiToNote(q.midi);
      const clef = q.midi < 60 ? 'bass' : 'treble';
      const { main, sub } = noteLabel(note, secondary);
      const color = STEP_COLORS[note.step];
      stage.replaceChildren(h('div', { class: 'staff-box small', html: staffSVG({ clef, columns: [{ notes: [note], color, label: sub ? `${main} · ${sub}` : main, labelColor: color }], minWidth: 150 }) }));
      playNote(q.midi, { delay: 0.2, dur: 1.2 });
      api.answer(correct);
    }

    buttons = level.pcs.map((pc, i) => {
      const n = PC_NOTE(pc);
      return answerButton({
        label: noteName(n),
        sub: noteSubName(n, secondary),
        color: STEP_COLORS[n.step],
        cls: n.alter ? 'sharp' : '',
        index: i,
        onClick: () => choose(pc),
      });
    });
    if (level.pcs.length > 7) answers.classList.add('chromatic');
    answers.append(...buttons);

    api.onCleanup(onMidi((e) => {
      if (e.type === 'on' && !api.isAnswered() && level.pcs.includes(pitchClass(e.midi))) choose(pitchClass(e.midi));
    }));

    // Laisse le temps à l'écran de s'afficher avant de jouer.
    const t = setTimeout(() => playQuestion(), 350);
    api.onCleanup(() => clearTimeout(t));
  },
};
