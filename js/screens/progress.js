// Mes progrès : médailles, niveaux, points forts et points à travailler.
import { store } from '../storage.js';
import { medalTier, itemSkill, levelProgress, MEDALS } from '../adaptive.js';
import { CATEGORIES } from '../exercises/index.js';
import { h, medalSVG, progressBar, BACK_ICON } from '../ui.js';

export function renderProgress({ app, navigate }) {
  const p = store.profile;

  const sections = CATEGORIES.map((c) => {
    const t = p.progress[c.id];
    const tier = medalTier(t, c.levels.length);
    const level = t?.level ?? 0;
    const acc = t && t.total ? Math.round((100 * t.correct) / t.total) : null;
    const chips = c.allItemKeys().map((k) => {
      const s = t ? itemSkill(t, k) : null;
      const cls = s === null ? '' : s < 0.5 ? 'lv1' : s < 0.75 ? 'lv2' : 'lv3';
      return h('span', { class: `item-chip ${cls}`, title: s === null ? 'Pas encore vu' : `${Math.round(s * 100)} %` }, c.itemLabel(k));
    });
    const hist = (t?.history || []).map((s) => h('span', { style: `height:${Math.max(6, s * 10)}%`, title: `${s}/10` }));
    return h('section', { class: 'card progress-cat', style: `--c:${c.color}` },
      h('div', { class: 'progress-head' },
        h('div', { class: 'cat-icon', html: c.icon }),
        h('h3', {}, c.title, h('div', { class: 'cat-level' }, `Niveau ${level + 1}/${c.levels.length} · ${c.levels[level].name}`)),
        h('div', { html: medalSVG(tier, 44), title: MEDALS[tier].name })),
      progressBar(t?.mastered ? 1 : t ? levelProgress(t) : 0, 'Progression'),
      h('div', { class: 'muted' }, t?.total ? `${t.total} réponses · ${acc} % de réussite · ${t.rounds || 0} partie${t.rounds > 1 ? 's' : ''}` : 'Pas encore commencé'),
      hist.length ? h('div', { class: 'history', title: 'Scores des dernières parties' }, hist) : null,
      h('div', { class: 'item-chips' }, chips));
  });

  app.append(
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Retour', html: BACK_ICON, onclick: () => navigate('#/home') }),
      h('h1', { style: 'font-size:1.6rem' }, `Les progrès de ${p.name}`)),
    h('p', { class: 'muted', style: 'margin:0' },
      'Couleurs : ', h('span', { class: 'item-chip lv3' }, 'bien maîtrisé'), ' ', h('span', { class: 'item-chip lv2' }, 'en cours'), ' ',
      h('span', { class: 'item-chip lv1' }, 'à travailler'), ' ', h('span', { class: 'item-chip' }, 'pas encore vu')),
    ...sections,
  );
}
