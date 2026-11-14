// Piano libre : on joue, on entend et on voit la note sur la portée.
import { store } from '../storage.js';
import { midiToNote, noteName, noteSubName, STEP_COLORS } from '../music.js';
import { staffSVG } from '../staff.js';
import { createPiano } from '../piano.js';
import { playNote } from '../audio.js';
import { onMidi } from '../midi.js';
import { creatureSVG } from '../avatars.js';
import { h, animate, BACK_ICON } from '../ui.js';

// Touches de l'ordinateur (position physique, valable en AZERTY comme en QWERTY).
const KEY_CODES = ['KeyA', 'KeyW', 'KeyS', 'KeyE', 'KeyD', 'KeyF', 'KeyT', 'KeyG', 'KeyY', 'KeyH', 'KeyU', 'KeyJ', 'KeyK', 'KeyO', 'KeyL', 'KeyP', 'Semicolon'];

export function renderPiano({ app, navigate, onCleanup }) {
  const p = store.profile;
  const secondary = p.settings.secondary || 'en';
  let clef = 'treble';
  let piano = null;

  const staffBox = h('div', { class: 'staff-box' });
  const nameBox = h('div', { class: 'discover-name' });
  const companion = h('div', { class: 'companion idle-bob' });
  const stage = h('div', { class: 'card discover-stage' }, companion, staffBox, nameBox);
  const pianoWrap = h('div', { class: 'card', style: 'padding:12px' });
  let resetMood = 0;

  function showNote(midi) {
    const n = midiToNote(midi);
    const color = STEP_COLORS[n.step];
    const useClef = clef === 'bass' ? (midi > 64 ? 'treble' : 'bass') : (midi < 57 ? 'bass' : 'treble');
    staffBox.innerHTML = staffSVG({ clef: useClef, columns: [{ notes: [n], color }], minWidth: 170 });
    const sub = noteSubName(n, secondary);
    nameBox.replaceChildren(h('div', { class: 'big-name', style: `color:${color}` }, noteName(n), sub ? h('small', {}, sub) : null));
    animate(nameBox, 'pop-in');
    companion.innerHTML = creatureSVG(p.companion, { accessory: p.accessory, mood: 'sing', size: '100%' });
    animate(companion, 'anim-jump');
    const fl = h('span', { class: 'floating-note', style: `color:${color};left:${40 + Math.random() * 30}%;top:10%;--fx:${(Math.random() - 0.5) * 60}px` }, '♪');
    companion.style.position = 'relative';
    companion.append(fl);
    setTimeout(() => fl.remove(), 1400);
    clearTimeout(resetMood);
    resetMood = setTimeout(() => { companion.innerHTML = creatureSVG(p.companion, { accessory: p.accessory, size: '100%' }); }, 1200);
  }

  function press(midi, vel = 0.75) {
    playNote(midi, { dur: 1.6, vel, quiet: true });
    showNote(midi);
  }

  function buildPiano() {
    const from = clef === 'treble' ? 60 : 36;
    const narrow = window.innerWidth < 700;
    const to = from + (narrow ? 16 : 24);
    piano = createPiano({ from, to, onPress: (m) => press(m), labels: p.settings.pianoLabels !== false, secondary });
    pianoWrap.replaceChildren(piano.el);
  }

  const clefSwitch = h('div', { class: 'segmented' },
    ...[['treble', 'Clé de sol'], ['bass', 'Clé de fa']].map(([v, label]) => {
      const b = h('button', { type: 'button', class: v === clef ? 'on' : '' }, label);
      b.onclick = () => {
        clef = v;
        for (const x of clefSwitch.children) x.classList.toggle('on', x === b);
        buildPiano();
        staffBox.innerHTML = staffSVG({ clef, columns: [], minWidth: 170 });
      };
      return b;
    }));

  app.append(
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Retour', html: BACK_ICON, onclick: () => navigate('#/home') }),
      h('h1', { style: 'font-size:1.6rem' }, 'Piano libre 🎹'),
      h('div', { class: 'spacer' }),
      clefSwitch),
    stage,
    pianoWrap,
    h('p', { class: 'muted kbd-hint', style: 'text-align:center;margin:0' }, 'Astuce : sur l’ordinateur, les touches Q/A, S, D, F, G, H, J, K jouent les notes blanches (Z/W, E, T, Y, U les noires).'),
  );

  companion.innerHTML = creatureSVG(p.companion, { accessory: p.accessory, size: '100%' });
  staffBox.innerHTML = staffSVG({ clef, columns: [], minWidth: 170 });
  nameBox.replaceChildren(h('div', { class: 'muted', style: 'font-weight:800' }, 'Touche le piano !'));
  buildPiano();

  const held = new Set();
  function onKeyDown(e) {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const i = KEY_CODES.indexOf(e.code);
    if (i < 0) return;
    e.preventDefault();
    const midi = (clef === 'treble' ? 60 : 48) + i;
    held.add(e.code);
    piano.mark(midi, 'pressed');
    press(midi);
  }
  function onKeyUp(e) {
    const i = KEY_CODES.indexOf(e.code);
    if (i < 0) return;
    held.delete(e.code);
    piano.keys.get((clef === 'treble' ? 60 : 48) + i)?.classList.remove('pressed');
  }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  const offMidi = onMidi((e) => {
    if (e.type === 'on') { showNote(e.midi); piano.mark(e.midi, 'pressed'); }
    else piano.keys.get(e.midi)?.classList.remove('pressed');
  });
  onCleanup(() => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    offMidi();
    clearTimeout(resetMood);
  });
}
