// Réglages : noms des notes, son, clavier MIDI, sauvegarde.
import { store } from '../storage.js';
import { SECONDARY } from '../music.js';
import { setVolume, setSfx, playNote, sfxGood } from '../audio.js';
import { enableMidi, disableMidi, midiSupported, midiStatus, midiInputNames } from '../midi.js';
import { h, modal, toast, BACK_ICON } from '../ui.js';

export function exportBackup() {
  const blob = new Blob([store.exportText()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: `apprenti-solfege-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Importe un fichier de sauvegarde. Résout avec vrai si des joueurs ont été importés. */
export function importBackup() {
  return new Promise((resolve) => {
    const input = h('input', { type: 'file', accept: 'application/json,.json' });
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(false);
      try {
        const n = store.importText(await file.text());
        toast(`${n} joueur${n > 1 ? 's' : ''} importé${n > 1 ? 's' : ''} ✅`);
        resolve(true);
      } catch (e) {
        await modal({ title: 'Oups', body: `Ce fichier n’est pas une sauvegarde valide (${e.message}).` });
        resolve(false);
      }
    };
    input.click();
  });
}

function segmented(options, current, onChange) {
  const wrap = h('div', { class: 'segmented', role: 'radiogroup' });
  for (const [value, label] of options) {
    const b = h('button', { type: 'button', role: 'radio', 'aria-checked': String(value === current), class: value === current ? 'on' : '' }, label);
    b.onclick = () => {
      for (const x of wrap.children) { x.classList.remove('on'); x.setAttribute('aria-checked', 'false'); }
      b.classList.add('on');
      b.setAttribute('aria-checked', 'true');
      onChange(value);
    };
    wrap.append(b);
  }
  return wrap;
}

export function renderSettings({ app, navigate }) {
  const p = store.profile;
  const dev = store.device;

  const secExample = h('p', { class: 'muted', style: 'margin:0' });
  const updateExample = () => {
    const s = p.settings.secondary;
    const map = { en: 'Do (C) · Ré (D) · Mi (E)…', ja: 'Do (ド) · Ré (レ) · Mi (ミ)…', both: 'Do (C · ド) · Ré (D · レ)…', none: 'Do · Ré · Mi…' };
    secExample.textContent = `Exemple : ${map[s] || map.en}`;
  };
  updateExample();

  const midiInfo = h('p', { class: 'muted', style: 'margin:0' });
  const refreshMidi = () => {
    const st = midiStatus();
    if (!midiSupported()) midiInfo.textContent = 'Ce navigateur ne gère pas le MIDI.';
    else if (st === 'on') {
      const names = midiInputNames();
      midiInfo.textContent = names.length ? `Connecté : ${names.join(', ')}` : 'Activé. Branche un clavier MIDI (il sera détecté automatiquement).';
    } else if (st === 'denied') midiInfo.textContent = 'L’accès MIDI a été refusé par le navigateur.';
    else midiInfo.textContent = 'Permet de répondre et de jouer avec un vrai clavier MIDI. (Firefox demandera une autorisation.)';
  };
  refreshMidi();

  const volume = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(dev.volume), 'aria-label': 'Volume' });
  volume.oninput = () => { dev.volume = Number(volume.value); setVolume(dev.volume); store.saveDevice(); };
  volume.onchange = () => playNote(67, { dur: 0.6, vel: 0.6, quiet: true });

  const sfx = h('input', { type: 'checkbox', checked: dev.sfx });
  sfx.onchange = () => { dev.sfx = sfx.checked; setSfx(dev.sfx); store.saveDevice(); if (dev.sfx) sfxGood(); };

  const midi = h('input', { type: 'checkbox', checked: dev.midi, disabled: !midiSupported() });
  midi.onchange = async () => {
    dev.midi = midi.checked;
    store.saveDevice();
    if (dev.midi) await enableMidi();
    else disableMidi();
    refreshMidi();
  };

  const labels = h('input', { type: 'checkbox', checked: p.settings.pianoLabels !== false });
  labels.onchange = () => { p.settings.pianoLabels = labels.checked; store.save(); };

  app.append(
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Retour', html: BACK_ICON, onclick: () => navigate('#/home') }),
      h('h1', { style: 'font-size:1.6rem' }, 'Réglages')),
    h('div', { class: 'form' },
      h('section', { class: 'card form-section' },
        h('h3', {}, `Noms des notes pour ${p.name}`),
        h('p', { class: 'muted', style: 'margin:0' }, 'Les notes s’appellent toujours Do, Ré, Mi… Choisis ce qui est écrit en petit à côté :'),
        segmented(Object.entries(SECONDARY), p.settings.secondary || 'en', (v) => { p.settings.secondary = v; store.save(); updateExample(); }),
        secExample,
        h('label', { class: 'switch' }, labels, 'Afficher les noms sur les touches du piano libre')),
      h('section', { class: 'card form-section' },
        h('h3', {}, 'Son'),
        h('label', { class: 'switch' }, '🔈', volume, '🔊'),
        h('label', { class: 'switch' }, sfx, 'Petits bruitages (bonne / mauvaise réponse)')),
      h('section', { class: 'card form-section' },
        h('h3', {}, 'Clavier MIDI'),
        h('label', { class: 'switch' }, midi, 'Utiliser un clavier MIDI'),
        midiInfo),
      h('section', { class: 'card form-section' },
        h('h3', {}, 'Sauvegarde'),
        h('p', { class: 'muted', style: 'margin:0' }, 'La progression est enregistrée dans ce navigateur. Exporte-la pour la garder en lieu sûr ou la transférer sur un autre appareil.'),
        h('div', { class: 'row' },
          h('button', { class: 'btn sky', type: 'button', onclick: exportBackup }, '📤 Exporter'),
          h('button', { class: 'btn ghost', type: 'button', onclick: async () => { if (await importBackup()) navigate('#/home'); } }, '📥 Importer'))),
      h('section', { class: 'card form-section' },
        h('h3', {}, 'Joueur'),
        h('div', { class: 'row' },
          h('button', { class: 'btn ghost', type: 'button', onclick: () => navigate('#/edit') }, '🎨 Modifier mon profil'),
          h('button', { class: 'btn ghost', type: 'button', onclick: () => navigate('#/profiles') }, '👥 Changer de joueur'))),
      h('p', { class: 'muted', style: 'text-align:center' }, 'Apprenti Solfège · tout fonctionne dans le navigateur, sans compte ni serveur.'),
    ),
  );
}
