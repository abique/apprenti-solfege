// « Qui joue aujourd'hui ? »
import { store } from '../storage.js';
import { avatarHTML } from '../avatars.js';
import { medalTier } from '../adaptive.js';
import { CATEGORIES } from '../exercises/index.js';
import { h, medalSVG } from '../ui.js';
import { sfxPop } from '../audio.js';
import { importBackup } from './settings.js';

export function medalsRow(profile, size = 26) {
  return CATEGORIES.map((c) => medalTier(profile.progress[c.id], c.levels.length))
    .filter((t) => t > 0)
    .map((t) => medalSVG(t, size))
    .join('');
}

export function renderProfiles({ app, navigate }) {
  const header = h('header', { class: 'hero' },
    h('h1', { class: 'logo' }, 'Apprenti Solfège ', h('span', { class: 'note' }, '♪')),
    h('p', { class: 'subtitle' }, h('span', { class: 'ja' }, 'おんがくの ぼうけん'), ' · Qui joue aujourd’hui ?'));

  const cards = store.state.profiles.map((p) => h('button', {
    class: 'profile-card',
    type: 'button',
    onclick: () => { sfxPop(); store.select(p.id); navigate('#/home'); },
  },
  h('div', { class: 'idle-bob', html: avatarHTML(p, 120) }),
  h('div', { class: 'profile-name' }, p.name),
  h('div', { class: 'profile-medals', html: medalsRow(p) || `<span class="muted">${p.notes} ♪</span>` })));

  const add = h('button', { class: 'profile-card add', type: 'button', onclick: () => navigate('#/new') },
    h('div', { class: 'plus' }, '+'), h('div', { class: 'profile-name' }, 'Nouveau joueur'));

  app.append(header, h('div', { class: 'profile-grid' }, cards, add),
    h('div', { class: 'row', style: 'justify-content:center;margin-top:8px' },
      h('button', { class: 'btn ghost small', type: 'button', onclick: async () => { if (await importBackup()) navigate('#/profiles'); } }, '📥 Importer une sauvegarde')));
}
