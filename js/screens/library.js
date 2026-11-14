// Salle de concert : grands compositeurs, morceaux d'étude et morceaux importés (MIDI).
import { PIECES, COMPOSERS, SECTIONS } from '../library/catalog.js';
import { listMyPieces, addMyPiece, deleteMyPiece } from '../library/mystore.js';
import { parseMidi } from '../midifile.js';
import { h, modal, toast, BACK_ICON } from '../ui.js';

function formatTime(s) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.round(s % 60)).padStart(2, '0')}`;
}

function pieceCard(piece, navigate, { showComposer = false } = {}) {
  const c = COMPOSERS[piece.composer];
  return h('button', { class: 'piece-card', type: 'button', onclick: () => navigate(`#/piece/${piece.id}`) },
    h('div', { class: 'piece-head' },
      h('span', { class: 'piece-title' }, piece.title),
      piece.level ? h('span', { class: 'piece-level', title: `Difficulté ${piece.level}/3` }, '★'.repeat(piece.level) + '☆'.repeat(3 - piece.level)) : null),
    h('div', { class: 'piece-meta' }, showComposer ? `${c.flag} ${c.name} · ` : '', [piece.work, piece.year].filter(Boolean).join(' · ')),
    h('div', { class: 'piece-desc' }, piece.desc));
}

function renderMasters(navigate) {
  const groups = [];
  for (const p of PIECES.filter((x) => x.section === 'maitres')) {
    let g = groups.find((x) => x.composer === p.composer);
    if (!g) groups.push((g = { composer: p.composer, pieces: [] }));
    g.pieces.push(p);
  }
  return groups.map((g) => {
    const c = COMPOSERS[g.composer];
    return h('section', { class: 'composer' },
      h('h2', { class: 'composer-name' }, `${c.flag} ${c.name}`, h('span', { class: 'muted' }, ` ${c.years} · ${c.country}`)),
      h('div', { class: 'piece-grid' }, g.pieces.map((p) => pieceCard(p, navigate))));
  });
}

function renderEtudes(navigate) {
  const list = PIECES.filter((x) => x.section === 'etudes').sort((a, b) => (a.level || 1) - (b.level || 1));
  return [
    h('p', { class: 'muted', style: 'margin:0' }, 'Les morceaux que jouent les apprentis pianistes du monde entier, du plus facile (★) au plus difficile (★★★).'),
    h('div', { class: 'piece-grid' }, list.map((p) => pieceCard(p, navigate, { showComposer: true }))),
  ];
}

function renderMine(navigate, container) {
  const listBox = h('div', { class: 'piece-grid' }, h('p', { class: 'muted' }, 'Chargement…'));
  const input = h('input', { type: 'file', accept: '.mid,.midi,audio/midi,audio/x-midi', multiple: true, hidden: true });

  async function refresh() {
    let items = [];
    try {
      items = await listMyPieces();
    } catch (e) {
      listBox.replaceChildren(h('p', { class: 'muted' }, `Impossible d’accéder au stockage de l’appareil (${e.message}).`));
      return;
    }
    if (!items.length) {
      listBox.replaceChildren(h('div', { class: 'card empty-mine' }, '🎹 Aucun morceau pour l’instant. Importe un fichier MIDI pour commencer !'));
      return;
    }
    listBox.replaceChildren(...items.map((it) => h('div', { class: 'piece-card mine' },
      h('button', { class: 'piece-open', type: 'button', onclick: () => navigate(`#/midi/${it.id}`) },
        h('div', { class: 'piece-head' }, h('span', { class: 'piece-title' }, `🎵 ${it.name}`)),
        h('div', { class: 'piece-meta' }, `${formatTime(it.duration || 0)} · ${it.noteCount || '?'} notes`)),
      h('button', {
        class: 'icon-btn small-del', type: 'button', 'aria-label': `Supprimer ${it.name}`, title: 'Supprimer',
        onclick: async () => {
          const ok = await modal({
            title: 'Supprimer ce morceau ?', body: `« ${it.name} » sera retiré de cet appareil.`,
            actions: [{ label: 'Annuler', value: false, cls: 'ghost' }, { label: 'Supprimer', value: true, cls: 'danger' }],
          });
          if (ok) { await deleteMyPiece(it.id); refresh(); }
        },
      }, '🗑️'))));
  }

  input.onchange = async () => {
    let added = 0;
    for (const file of input.files || []) {
      try {
        const data = await file.arrayBuffer();
        const midi = parseMidi(data);
        if (!midi.notes.length) throw new Error('aucune note trouvée');
        await addMyPiece({ name: file.name.replace(/\.(mid|midi)$/i, ''), data, duration: midi.duration, noteCount: midi.notes.length });
        added++;
      } catch (e) {
        await modal({ title: 'Oups', body: `« ${file.name} » n’a pas pu être importé : ${e.message}` });
      }
    }
    input.value = '';
    if (added) toast(`${added} morceau${added > 1 ? 'x' : ''} ajouté${added > 1 ? 's' : ''} 🎉`);
    refresh();
  };

  container.append(
    h('div', { class: 'card mine-intro' },
      h('p', { style: 'margin:0' }, 'Ajoute ici tes musiques préférées (Ghibli, animes, films…) au format ', h('strong', {}, 'MIDI'),
        ' : les notes tombent sur le clavier pendant la lecture, comme dans un jeu !'),
      h('p', { class: 'muted', style: 'margin:0' }, 'Uniquement des fichiers que tu as le droit d’utiliser (achetés, offerts, faits par toi…). Ils restent sur cet appareil et ne sont envoyés nulle part.'),
      h('div', { class: 'row' }, h('button', { class: 'btn pink', type: 'button', onclick: () => input.click() }, '📥 Importer un fichier MIDI'), input)),
    listBox);
  refresh();
}

export function renderLibrary({ app, navigate }, sectionId) {
  const section = SECTIONS.some((s) => s.id === sectionId) ? sectionId : 'maitres';
  const tabs = h('div', { class: 'segmented library-tabs', role: 'tablist' },
    SECTIONS.map((s) => h('button', {
      type: 'button', role: 'tab', 'aria-selected': String(s.id === section), class: s.id === section ? 'on' : '',
      onclick: () => navigate(`#/library/${s.id}`),
    }, `${s.emoji} ${s.title}`)));
  const content = h('div', { class: 'library-content' });

  app.append(
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Retour', html: BACK_ICON, onclick: () => navigate('#/home') }),
      h('h1', { style: 'font-size:1.6rem' }, 'Salle de concert 🎼')),
    tabs,
    content);

  if (section === 'maitres') content.append(...renderMasters(navigate));
  else if (section === 'etudes') content.append(...renderEtudes(navigate));
  else renderMine(navigate, content);
}
