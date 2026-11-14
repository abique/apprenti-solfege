// Reconnaître la couleur des accords.
import { CHORDS, CHORD_BY_ID, chordNotes } from '../music.js';
import { playNote, playChord } from '../audio.js';
import { pickWeighted } from '../adaptive.js';
import { h, answerButton } from '../ui.js';
import { ICONS, toolButton, miniPiano, midiLabel } from './common.js';

const LEVELS = [
  { name: 'Joyeux ou triste ?', ids: ['maj', 'min'], arp: true, inv: false, tip: 'Un accord, ce sont plusieurs notes jouées ensemble. Majeur = joyeux ☀️, mineur = triste 🌧️.' },
  { name: 'Joyeux ou triste, d’un coup', ids: ['maj', 'min'], arp: false, inv: false, tip: 'Cette fois, les notes sont jouées toutes ensemble. Écoute la couleur !' },
  { name: 'L’accord diminué', ids: ['maj', 'min', 'dim'], arp: true, inv: false, tip: 'L’accord diminué sonne inquiétant, comme un fantôme 👻' },
  { name: 'Trois couleurs', ids: ['maj', 'min', 'dim'], arp: false, inv: false, tip: 'Majeur, mineur ou diminué ? Sans l’arpège maintenant !' },
  { name: 'L’accord augmenté', ids: ['maj', 'min', 'dim', 'aug'], arp: false, inv: false, tip: 'L’accord augmenté sonne mystérieux, comme de la magie 🔮' },
  { name: 'Renversements', ids: ['maj', 'min', 'dim', 'aug'], arp: false, inv: true, tip: 'Les notes changent de place (on dit « renversement »), mais la couleur reste la même !' },
  { name: 'Les accords de 7e', ids: ['maj', 'min', 'dom7', 'maj7', 'min7'], arp: true, inv: false, tip: 'Les accords de 7e ont 4 notes au lieu de 3.' },
  { name: 'Tous les accords', ids: CHORDS.map((c) => c.id), arp: false, inv: true, tip: 'Le grand défi : toutes les couleurs, dans tous les sens !' },
];

export default {
  id: 'chords',
  title: 'Les accords',
  subtitle: 'Entendre la couleur des accords',
  color: '#34c995',
  icon: ICONS.chords,
  ask: 'Quelle est la couleur de cet accord ?',
  autoDelay: 1900,
  levels: LEVELS,

  allItemKeys() {
    return CHORDS.map((c) => c.id);
  },

  itemLabel(key) {
    return CHORD_BY_ID[key].name;
  },

  makeQuestion(level, track, recent) {
    const key = pickWeighted(level.ids, track, recent);
    const root = 52 + Math.floor(Math.random() * 11); // Mi3 … Ré4
    const size = CHORD_BY_ID[key].semis.length;
    const inversion = level.inv ? Math.floor(Math.random() * size) : 0;
    return { key, root, notes: chordNotes(root, key, inversion), inversion };
  },

  present(q, api) {
    const { stage, tools, answers, level } = api;
    const orb = h('button', { class: 'listen-orb', type: 'button', 'aria-label': 'Réécouter' }, '♬');
    stage.append(orb);
    let glowTimer = 0;

    function playQuestion(arp = level.arp) {
      playChord(q.notes, { dur: 1.7 });
      let len = 1700;
      if (arp) {
        q.notes.forEach((m, i) => playNote(m, { delay: 1.5 + i * 0.32, dur: i === q.notes.length - 1 ? 1.2 : 0.7, vel: 0.6 }));
        len = 1500 + q.notes.length * 320 + 600;
      }
      orb.classList.add('playing');
      clearTimeout(glowTimer);
      glowTimer = setTimeout(() => orb.classList.remove('playing'), len);
    }
    orb.onclick = () => playQuestion();
    api.onCleanup(() => clearTimeout(glowTimer));
    tools.append(toolButton('🔁 Réécouter', () => playQuestion()), toolButton('🎼 Arpège', () => playQuestion(true)));
    api.key(' ', () => playQuestion());

    let buttons = [];
    function choose(id) {
      if (api.isAnswered()) return;
      const correct = id === q.key;
      buttons[level.ids.indexOf(id)]?.classList.add(correct ? 'good' : 'bad');
      if (!correct) buttons[level.ids.indexOf(q.key)]?.classList.add('reveal');
      const c = CHORD_BY_ID[q.key];
      stage.replaceChildren(
        miniPiano(q.notes, api.secondary),
        h('div', { class: 'reveal-text' }, `${midiLabel(q.root, api.secondary)} ${c.name.toLowerCase()} : ${c.mood} ${c.emoji}`,
          h('span', { class: 'hint' }, `Notes : ${q.notes.map((m) => midiLabel(m, api.secondary)).join(', ')}`)),
      );
      setTimeout(() => playQuestion(true), 250);
      api.answer(correct);
    }

    buttons = level.ids.map((id, i) => {
      const c = CHORD_BY_ID[id];
      return answerButton({
        label: `${c.emoji} ${c.name}`,
        sub: c.mood,
        color: ['#ffc94d', '#74a9f7', '#b197fc', '#f783ac', '#ff9a62', '#8fd3ff', '#c9a27e'][CHORDS.indexOf(c)],
        index: i,
        onClick: () => choose(id),
      });
    });
    answers.classList.add('wide');
    answers.append(...buttons);

    const t = setTimeout(() => playQuestion(), 350);
    api.onCleanup(() => clearTimeout(t));
  },
};
