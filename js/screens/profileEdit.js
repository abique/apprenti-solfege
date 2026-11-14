// Création / modification d'un joueur : prénom, compagnon, photo, tenue.
import { store, makeProfile, requestPersistence } from '../storage.js';
import { CREATURES, ACCESSORIES, creatureSVG, avatarHTML } from '../avatars.js';
import { cameraSupported, takePhoto, pickImage } from '../camera.js';
import { h, modal, BACK_ICON, confetti } from '../ui.js';
import { sfxPop, playNote } from '../audio.js';

export function renderProfileEdit({ app, navigate }, existing) {
  const isNew = !existing;
  const draft = {
    name: existing?.name || '',
    companion: existing?.companion || CREATURES[Math.floor(Math.random() * CREATURES.length)].id,
    photo: existing?.photo || null,
    accessory: existing?.accessory || 'none',
  };
  const notes = existing?.notes || 0;

  const preview = h('div', { class: 'big-avatar idle-bob' });
  const previewName = h('div', { class: 'profile-name', style: 'font-size:1.6rem' });
  function refresh() {
    preview.innerHTML = draft.photo
      ? `<img class="avatar-photo" src="${draft.photo}" width="130" height="130" alt="">`
      : creatureSVG(draft.companion, { accessory: draft.accessory, mood: 'happy', size: 130 });
    previewName.textContent = draft.name || (isNew ? 'Ton prénom ?' : '');
    removePhoto.hidden = !draft.photo;
    for (const b of creatureButtons) b.classList.toggle('selected', b.dataset.id === draft.companion);
    for (const b of accButtons) b.classList.toggle('selected', b.dataset.id === draft.accessory);
    for (const b of accButtons) b.innerHTML = accContent(b.dataset.id);
  }

  const nameInput = h('input', {
    class: 'text-input', type: 'text', maxlength: '24', autocomplete: 'off', placeholder: 'Ton prénom', value: draft.name,
    'aria-label': 'Prénom',
    oninput: (e) => { draft.name = e.target.value; previewName.textContent = draft.name || 'Ton prénom ?'; },
  });

  const creatureButtons = CREATURES.map((c, i) => h('button', {
    class: 'creature-choice', type: 'button', dataset: { id: c.id }, title: c.desc,
    onclick: () => { draft.companion = c.id; sfxPop(); playNote(60 + [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19][i], { dur: 0.6, vel: 0.5, quiet: true }); refresh(); },
    html: `${creatureSVG(c.id, { size: 84 })}<span>${c.name}</span>`,
  }));

  function accContent(id) {
    const a = ACCESSORIES.find((x) => x.id === id);
    const locked = a.need > notes;
    return `${creatureSVG(draft.companion, { accessory: id, size: 84 })}<span>${a.name}</span>${locked ? `<span class="need">🔒 ${a.need} ♪</span>` : ''}`;
  }
  const accButtons = ACCESSORIES.map((a) => {
    const locked = a.need > notes;
    return h('button', {
      class: `creature-choice ${locked ? 'locked' : ''}`, type: 'button', dataset: { id: a.id },
      onclick: () => {
        if (locked) return modal({ title: '🔒 Pas encore !', body: `Gagne ${a.need} ♪ en faisant des exercices pour débloquer « ${a.name} ». Tu en as ${notes}.` });
        draft.accessory = a.id;
        sfxPop();
        refresh();
      },
    });
  });

  const removePhoto = h('button', { class: 'btn ghost small', type: 'button', onclick: () => { draft.photo = null; refresh(); } }, 'Retirer la photo');
  const photoButtons = h('div', { class: 'row' },
    cameraSupported() ? h('button', { class: 'btn pink', type: 'button', onclick: async () => { const d = await takePhoto(); if (d) { draft.photo = d; refresh(); } } }, '📸 Prendre une photo') : null,
    h('button', { class: 'btn ghost', type: 'button', onclick: async () => { const d = await pickImage(); if (d) { draft.photo = d; refresh(); } } }, '🖼️ Choisir une image'),
    removePhoto);

  async function save() {
    const name = draft.name.trim();
    if (!name) {
      nameInput.focus();
      nameInput.animate?.([{ transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'none' }], { duration: 300 });
      return;
    }
    if (isNew) {
      const p = makeProfile({ name, companion: draft.companion, photo: draft.photo });
      store.add(p);
      requestPersistence();
      confetti(50);
      navigate('#/home');
    } else {
      Object.assign(existing, { name, companion: draft.companion, photo: draft.photo, accessory: draft.accessory });
      if (!store.save()) {
        await modal({ title: 'Oups', body: 'Impossible d’enregistrer (mémoire du navigateur pleine ?). Essaie sans photo.' });
        return;
      }
      navigate('#/home');
    }
  }

  async function remove() {
    const ok = await modal({
      title: `Supprimer ${existing.name} ?`,
      body: 'Toute sa progression sera effacée de cet appareil. Pense à exporter une sauvegarde avant si besoin.',
      actions: [{ label: 'Annuler', value: false, cls: 'ghost' }, { label: 'Supprimer', value: true, cls: 'danger' }],
    });
    if (!ok) return;
    store.remove(existing.id);
    navigate('#/profiles');
  }

  const canGoBack = store.state.profiles.length > 0;
  app.append(
    h('div', { class: 'topbar' },
      canGoBack ? h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Retour', html: BACK_ICON, onclick: () => navigate(isNew ? '#/profiles' : '#/home') }) : null,
      h('h1', { style: 'font-size:1.6rem' }, isNew ? (canGoBack ? 'Nouveau joueur' : 'Bienvenue ! ようこそ！') : 'Mon profil')),
    h('div', { class: 'form' },
      h('section', { class: 'card form-section' },
        h('div', { class: 'edit-preview' }, preview, h('div', { style: 'flex:1;min-width:200px;display:flex;flex-direction:column;gap:10px' },
          previewName,
          h('h3', {}, 'Comment tu t’appelles ?'),
          nameInput))),
      h('section', { class: 'card form-section' },
        h('h3', {}, 'Choisis ton compagnon'),
        h('p', { class: 'muted', style: 'margin:0' }, 'Il t’accompagnera pendant les exercices.'),
        h('div', { class: 'creature-grid' }, creatureButtons)),
      h('section', { class: 'card form-section' },
        h('h3', {}, 'Ta photo (si tu veux)'),
        h('p', { class: 'muted', style: 'margin:0' }, 'Elle reste uniquement sur cet appareil.'),
        photoButtons),
      isNew ? null : h('section', { class: 'card form-section' },
        h('h3', {}, 'La tenue de ton compagnon'),
        h('p', { class: 'muted', style: 'margin:0' }, `Tu as ${notes} ♪. Gagne des ♪ pour débloquer de nouvelles tenues !`),
        h('div', { class: 'creature-grid' }, accButtons)),
      h('div', { class: 'row', style: 'justify-content:center' },
        h('button', { class: 'btn big good', type: 'button', onclick: save }, isNew ? 'C’est parti ! 🎶' : 'Enregistrer'),
        isNew ? null : h('button', { class: 'btn ghost', type: 'button', onclick: remove }, 'Supprimer ce joueur')),
    ),
  );
  refresh();
  if (matchMedia('(hover: hover)').matches) nameInput.focus();
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
}
