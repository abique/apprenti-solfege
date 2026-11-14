// Menu principal : compagnon, catégories d'exercices, médailles.
import { store } from '../storage.js';
import { avatarHTML, creatureSVG } from '../avatars.js';
import { medalTier, levelProgress, MEDALS } from '../adaptive.js';
import { CATEGORIES } from '../exercises/index.js';
import { ICONS } from '../exercises/common.js';
import { h, pick, animate, medalSVG, progressBar, iconButton } from '../ui.js';
import { playNote } from '../audio.js';

function greeting(name) {
  const hour = new Date().getHours();
  const fr = hour < 12 ? 'Bonjour' : hour < 18 ? 'Coucou' : 'Bonsoir';
  const ja = hour < 11 ? 'おはよう' : hour < 18 ? 'こんにちは' : 'こんばんは';
  return [`${fr} ${name} !`, `${ja}！`];
}

export function renderHome({ app, navigate }) {
  const p = store.profile;

  // Suggestion : la catégorie la moins travaillée récemment (hors chant si jamais essayé ? non : toutes).
  const suggested = [...CATEGORIES].sort((a, b) => (p.progress[a.id]?.last || 0) - (p.progress[b.id]?.last || 0))[0];

  const topbar = h('div', { class: 'topbar' },
    h('button', { class: 'player-chip', type: 'button', title: 'Changer de joueur', onclick: () => navigate('#/profiles') },
      h('span', { html: avatarHTML(p, 46) }), p.name),
    h('span', { class: 'chip notes', title: 'Notes gagnées' }, `♪ ${p.notes}`),
    p.streak.days > 1 ? h('span', { class: 'chip streak', title: 'Jours d’affilée' }, `🔥 ${p.streak.days} jours`) : null,
    h('div', { class: 'spacer' }),
    iconButton('Mes progrès', '📊', () => navigate('#/progress')),
    iconButton('Mon profil', '🎨', () => navigate('#/edit')),
    iconButton('Réglages', '⚙️', () => navigate('#/settings')));

  const [g1, g2] = greeting(p.name);
  const bubble = h('div', { class: 'bubble' }, g1, ' ', h('span', { class: 'ja' }, g2), h('br'),
    `Aujourd’hui, on essaie « ${suggested.title} » ?`);
  const companion = h('div', { class: 'companion idle-bob', title: 'Clique-moi !', role: 'button', tabindex: '0', html: creatureSVG(p.companion, { accessory: p.accessory, size: '100%' }) });
  const tickle = () => {
    companion.innerHTML = creatureSVG(p.companion, { accessory: p.accessory, mood: 'happy', size: '100%' });
    animate(companion, 'anim-jump');
    const m = pick([60, 62, 64, 65, 67, 69, 71, 72]);
    playNote(m, { dur: 0.8, vel: 0.5, quiet: true });
    bubble.textContent = pick(['Hihi, ça chatouille !', 'La la la ♪', 'On joue ?', 'くすぐったい！', 'Je t’aime bien !', 'Do, ré, mi… ♪']);
    animate(bubble, 'pop');
    setTimeout(() => { companion.innerHTML = creatureSVG(p.companion, { accessory: p.accessory, size: '100%' }); }, 900);
  };
  companion.addEventListener('click', tickle);
  companion.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tickle(); } });

  const cards = CATEGORIES.map((c) => {
    const t = p.progress[c.id];
    const level = t?.level ?? 0;
    const tier = medalTier(t, c.levels.length);
    return h('button', { class: 'cat-card', type: 'button', style: `--c:${c.color}`, onclick: () => navigate(`#/play/${c.id}`) },
      c === suggested ? h('span', { class: 'badge' }, 'Suggestion ✨') : null,
      h('div', { class: 'cat-icon', html: c.icon }),
      h('div', {}, h('div', { class: 'cat-title' }, c.title), h('div', { class: 'cat-sub' }, c.subtitle)),
      h('div', { class: 'medal-slot', html: `${medalSVG(tier, 44)}<span>${MEDALS[tier].name}</span>` }),
      h('div', { class: 'cat-foot' },
        h('div', { class: 'cat-level' }, `Niveau ${level + 1}/${c.levels.length} · ${c.levels[level].name}`),
        progressBar(t?.mastered ? 1 : t ? levelProgress(t) : 0, 'Progression')));
  });

  const piano = h('button', { class: 'cat-card', type: 'button', style: '--c:#ff9a62', onclick: () => navigate('#/piano') },
    h('div', { class: 'cat-icon', html: ICONS.piano }),
    h('div', {}, h('div', { class: 'cat-title' }, 'Piano libre'), h('div', { class: 'cat-sub' }, 'Jouer, écouter et voir les notes sur la portée')),
    h('div', { class: 'cat-foot' }, h('div', { class: 'cat-level' }, 'Pour découvrir et s’amuser 🎹')));

  app.append(topbar,
    h('div', { class: 'home-hero' }, companion, bubble),
    h('div', { class: 'cat-grid' }, cards, piano));
}
