// Éléments partagés par les exercices.
import { STEP_COLORS, stepName, stepSubName, midiToNote, noteName, noteSubName } from '../music.js';
import { answerButton, h } from '../ui.js';
import { createPiano } from '../piano.js';

export const ICONS = {
  reading: '<svg viewBox="0 0 48 48" aria-hidden="true"><g stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 13h38M5 20h38M5 27h38M5 34h38"/></g><ellipse cx="25" cy="30.5" rx="6" ry="4.4" transform="rotate(-20 25 30.5)" fill="currentColor"/><path d="M30.6 29.5V8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  listening: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M9 30v-5a15 15 0 0 1 30 0v5" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><rect x="6" y="27" width="10" height="15" rx="5" fill="currentColor"/><rect x="32" y="27" width="10" height="15" rx="5" fill="currentColor"/></svg>',
  singing: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="17" y="5" width="14" height="24" rx="7" fill="currentColor"/><path d="M11 22a13 13 0 0 0 26 0M24 35v7M16 43h16" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg>',
  intervals: '<svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="13" cy="35" rx="6" ry="4.6" transform="rotate(-20 13 35)" fill="currentColor"/><ellipse cx="35" cy="14" rx="6" ry="4.6" transform="rotate(-20 35 14)" fill="currentColor"/><path d="M18 30 30 18" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="1 6"/><path d="M24 17h7v7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chords: '<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="currentColor"><ellipse cx="20" cy="36" rx="6.5" ry="4.8" transform="rotate(-20 20 36)"/><ellipse cx="20" cy="25" rx="6.5" ry="4.8" transform="rotate(-20 20 25)"/><ellipse cx="20" cy="14" rx="6.5" ry="4.8" transform="rotate(-20 20 14)"/></g><path d="M26 36V4" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M34 12l3-6 3 6-3 2z" fill="currentColor"/></svg>',
  piano: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="9" width="38" height="30" rx="5" fill="none" stroke="currentColor" stroke-width="3.2"/><path d="M14.5 9v30M24 9v30M33.5 9v30" stroke="currentColor" stroke-width="2.4"/><g fill="currentColor"><rect x="11" y="9" width="7" height="17" rx="2"/><rect x="20.5" y="9" width="7" height="17" rx="2"/><rect x="30" y="9" width="7" height="17" rx="2"/></g></svg>',
};

/** Boutons Do, Ré, Mi… (avec le nom secondaire en petit). */
export function stepButtons(steps, secondary, onChoose) {
  return steps.map((step, i) => answerButton({
    label: stepName(step),
    sub: stepSubName(step, secondary),
    color: STEP_COLORS[step],
    index: i,
    onClick: () => onChoose(step),
  }));
}

export function noteLabel(note, secondary) {
  const sub = noteSubName(note, secondary);
  return { main: noteName(note), sub };
}

export function bigName(note, secondary, color) {
  const { main, sub } = noteLabel(note, secondary);
  return h('div', { class: 'big-name', style: color ? `color:${color}` : '' }, main, sub ? h('small', {}, sub) : null);
}

/** « Sol (G) » : nom principal + nom secondaire entre parenthèses. */
export function fullName(note, secondary) {
  const sub = noteSubName(note, secondary);
  return sub ? `${noteName(note)} (${sub})` : noteName(note);
}

export function midiLabel(midi, secondary) {
  return fullName(midiToNote(midi), secondary);
}

/** Petit clavier non interactif qui montre des notes allumées. */
export function miniPiano(midis, secondary, cls = 'good') {
  const lo = Math.min(...midis);
  const hi = Math.max(...midis);
  const from = lo - (((lo % 12) + 12) % 12);
  const to = Math.max(from + 11, hi + (11 - (((hi % 12) + 12) % 12)));
  const p = createPiano({ from, to, interactive: false, cls: 'mini', secondary });
  for (const m of midis) p.mark(m, cls);
  return p.el;
}

export function toolButton(label, onClick, cls = 'ghost') {
  return h('button', { class: `btn ${cls}`, type: 'button', onclick: onClick }, label);
}
