// Reconnaître les intervalles à l'oreille.
import { INTERVALS, INTERVAL_BY_ID, diatonicIndex, noteToMidi, midiToNote, noteName } from '../music.js';
import { playNote } from '../audio.js';
import { pickWeighted } from '../adaptive.js';
import { h, answerButton } from '../ui.js';
import { ICONS, toolButton, miniPiano, fullName } from './common.js';

const BASIC = ['m2', 'M2', 'm3', 'M3', 'P4', 'P5', 'M6', 'P8'];
const ALL = INTERVALS.map((i) => i.id);

const LEVELS = [
  { name: 'Tierce ou quinte ?', ids: ['M3', 'P5'], dirs: ['up'], tip: 'Un intervalle, c’est la distance entre deux notes. La quinte saute plus loin que la tierce !' },
  { name: 'Et l’octave', ids: ['M3', 'P5', 'P8'], dirs: ['up'], tip: 'L’octave : la même note, mais beaucoup plus aiguë !' },
  { name: 'Et la quarte', ids: ['M3', 'P4', 'P5', 'P8'], dirs: ['up'], tip: 'La quarte, c’est le début de « Mon beau sapin ».' },
  { name: 'Secondes et sixtes', ids: ['M2', 'M3', 'P4', 'P5', 'M6', 'P8'], dirs: ['up'], tip: 'La seconde, ce sont deux notes voisines. La sixte saute très haut !' },
  { name: 'Majeur ou mineur', ids: BASIC, dirs: ['up'], tip: 'Mineur = un demi-ton de moins que majeur. Ça sonne plus sombre.' },
  { name: 'Ça descend aussi !', ids: BASIC, dirs: ['up', 'down'], tip: 'Attention : maintenant les notes peuvent aussi descendre.' },
  { name: 'Tous les intervalles', ids: ALL, dirs: ['up', 'down'], tip: 'Voici le triton (comme dans Les Simpson) et les septièmes !' },
  { name: 'Notes ensemble', ids: ALL, dirs: ['up', 'down', 'harm'], tip: 'Parfois les deux notes sont jouées en même temps. Écoute bien !' },
];

const NUM = { m2: 1, M2: 1, m3: 2, M3: 2, P4: 3, TT: 3, P5: 4, m6: 5, M6: 5, m7: 6, M7: 6, P8: 7 };

/** Écrit correctement la note du haut (Do→Mi♭ plutôt que Do→Ré♯). */
export function spellUpper(root, id) {
  const d = diatonicIndex(root) + NUM[id];
  const step = d % 7;
  const octave = Math.floor(d / 7);
  const target = noteToMidi(root) + INTERVAL_BY_ID[id].semis;
  const alter = target - noteToMidi({ step, alter: 0, octave });
  const odd = Math.abs(alter) > 1 || (alter === 1 && (step === 2 || step === 6)) || (alter === -1 && (step === 3 || step === 0));
  return odd ? midiToNote(target) : { step, alter, octave };
}

const NAT_ROOTS = [55, 57, 59, 60, 62, 64, 65, 67]; // Sol3 … Sol4 (touches blanches)

export default {
  id: 'intervals',
  title: 'Les intervalles',
  subtitle: 'Mesurer la distance entre deux notes',
  color: '#9b83ff',
  icon: ICONS.intervals,
  ask: 'Quel est cet intervalle ?',
  levels: LEVELS,

  allItemKeys() {
    return ALL;
  },

  itemLabel(key) {
    return INTERVAL_BY_ID[key].short;
  },

  makeQuestion(level, track, recent) {
    const key = pickWeighted(level.ids, track, recent);
    const dir = level.dirs[Math.floor(Math.random() * level.dirs.length)];
    const rootMidi = NAT_ROOTS[Math.floor(Math.random() * NAT_ROOTS.length)];
    const root = midiToNote(rootMidi);
    const upper = spellUpper(root, key);
    return { key, dir, root, upper, low: rootMidi, high: rootMidi + INTERVAL_BY_ID[key].semis };
  },

  present(q, api) {
    const { stage, tools, answers, level } = api;
    const orb = h('button', { class: 'listen-orb', type: 'button', 'aria-label': 'Réécouter' }, q.dir === 'down' ? '↘' : q.dir === 'harm' ? '♫' : '↗');
    stage.append(orb);
    let glowTimer = 0;

    function playQuestion() {
      if (q.dir === 'harm') {
        playNote(q.low, { dur: 1.8, vel: 0.6 });
        playNote(q.high, { dur: 1.8, vel: 0.6 });
      } else {
        const [a, b] = q.dir === 'up' ? [q.low, q.high] : [q.high, q.low];
        playNote(a, { dur: 1.0 });
        playNote(b, { delay: 0.8, dur: 1.3 });
      }
      orb.classList.add('playing');
      clearTimeout(glowTimer);
      glowTimer = setTimeout(() => orb.classList.remove('playing'), 2000);
    }
    orb.onclick = playQuestion;
    api.onCleanup(() => clearTimeout(glowTimer));
    tools.append(toolButton('🔁 Réécouter', playQuestion));
    api.key(' ', playQuestion);

    const C4 = { step: 0, alter: 0, octave: 4 };
    let buttons = [];
    function choose(id) {
      if (api.isAnswered()) return;
      const correct = id === q.key;
      buttons[level.ids.indexOf(id)]?.classList.add(correct ? 'good' : 'bad');
      if (!correct) buttons[level.ids.indexOf(q.key)]?.classList.add('reveal');
      const iv = INTERVAL_BY_ID[q.key];
      const [a, b] = q.dir === 'down' ? [q.upper, q.root] : [q.root, q.upper];
      const arrow = q.dir === 'harm' ? ' + ' : ' → ';
      stage.replaceChildren(
        miniPiano([q.low, q.high], api.secondary),
        h('div', { class: 'reveal-text' },
          `${fullName(a, api.secondary)}${arrow}${fullName(b, api.secondary)} : ${iv.name} (${iv.semis} demi-ton${iv.semis > 1 ? 's' : ''})`,
          iv.hint && q.dir === 'up' ? h('span', { class: 'hint' }, `Comme le début de : ${iv.hint}`) : null),
      );
      setTimeout(playQuestion, 250);
      api.answer(correct);
    }

    buttons = level.ids.map((id, i) => {
      const iv = INTERVAL_BY_ID[id];
      return answerButton({
        label: iv.short,
        sub: `ex. Do → ${noteName(spellUpper(C4, id))}`,
        color: `hsl(${250 + iv.semis * 9} 85% 70%)`,
        index: i,
        onClick: () => choose(id),
      });
    });
    answers.classList.add('wide');
    answers.append(...buttons);

    const t = setTimeout(playQuestion, 350);
    api.onCleanup(() => clearTimeout(t));
  },
};
