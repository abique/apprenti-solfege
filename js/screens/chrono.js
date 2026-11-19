// Défi chrono : choix de l'exercice et du niveau, avec le record de chacun.
import { store } from '../storage.js';
import { creatureSVG } from '../avatars.js';
import { CATEGORIES } from '../exercises/index.js';
import { CHRONO_SECONDS, unlockedLevels } from '../exercises/chrono.js';
import { h, BACK_ICON } from '../ui.js';

export const CHRONO_CATEGORIES = CATEGORIES.filter((c) => c.chrono);

export function renderChronoSetup({ app, navigate }, catId) {
  const p = store.profile;
  const cat = CHRONO_CATEGORIES.find((c) => c.id === catId) || CHRONO_CATEGORIES[0];
  const track = p.progress[cat.id];
  const unlocked = unlockedLevels(p, cat);
  const records = p.chrono[cat.id] || {};

  const tabs = h('div', { class: 'segmented', role: 'tablist' },
    CHRONO_CATEGORIES.map((c) => h('button', {
      type: 'button', role: 'tab', class: c === cat ? 'on' : '', 'aria-selected': c === cat ? 'true' : 'false',
      onclick: () => navigate(`#/chrono/${c.id}`),
    }, c.title)));

  const rows = cat.levels.map((level, i) => {
    const locked = i > unlocked;
    const best = records[i]?.best || 0;
    const status = locked ? '🔒' : i < (track?.level ?? 0) || track?.mastered ? '✓ réussi' : 'en cours';
    return h('button', {
      type: 'button', class: `chrono-level${locked ? ' locked' : ''}`, disabled: locked,
      title: locked ? 'Ce niveau se débloque en progressant dans l’exercice' : `Lancer le défi au niveau ${i + 1}`,
      onclick: () => navigate(`#/chrono/${cat.id}/${i}`),
    },
    h('span', { class: 'chrono-level-num' }, String(i + 1)),
    h('span', { class: 'chrono-level-name' }, level.name, h('small', {}, status)),
    h('span', { class: 'chrono-level-best' }, locked ? '' : best ? `🏆 ${best}` : 'Pas encore de record'));
  });

  app.append(
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Retour', html: BACK_ICON, onclick: () => navigate('#/home') }),
      h('h1', { style: 'font-size:1.6rem' }, 'Défi chrono ⏱')),
    h('section', { class: 'card chrono-intro', style: `--c:${cat.color}` },
      h('div', { class: 'mascot-svg', html: creatureSVG(p.companion, { accessory: p.accessory, mood: 'happy', size: '100%' }) }),
      h('div', {},
        h('p', { style: 'margin:0 0 6px;font-weight:800' }, `${CHRONO_SECONDS} secondes pour donner le plus de bonnes réponses possible !`),
        h('p', { class: 'muted', style: 'margin:0' }, 'Choisis un niveau que tu connais bien : le but, c’est d’aller de plus en plus vite. Une erreur montre la bonne réponse et fait perdre un peu de temps. Ton record ne compte que pour toi, et le défi ne change pas ton niveau.'))),
    tabs,
    h('section', { class: 'chrono-levels', style: `--c:${cat.color}` }, rows),
  );
}
