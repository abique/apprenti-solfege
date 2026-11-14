// Écoute d'un morceau avec sa partition : les notes s'allument pendant la lecture.
import { store } from '../storage.js';
import { PIECE_BY_ID, COMPOSERS, imslpUrl } from '../library/catalog.js';
import { loadAbcjs, splitHeader } from '../library/abc.js';
import { getCtx, playNote, stopMusic } from '../audio.js';
import { midiToNote, noteName, noteSubName } from '../music.js';
import { creatureSVG } from '../avatars.js';
import { h, toast, BACK_ICON } from '../ui.js';

/**
 * abcjs traduit les nuances en vélocités très contrastées (p : 35 à 60, pp : 20 à 45, gain linéaire) :
 * les notes douces deviennent presque inaudibles. On resserre l'échelle en gardant l'ordre des nuances
 * (p reste plus doux que f, le 1er temps reste un peu appuyé).
 */
export function softenVelocity(v) {
  return v > 0 ? Math.min(127, Math.round(40 + v * 0.69)) : 0;
}

const TARGET_LOUDNESS = 0.22; // RMS visé des passages les plus sonores (proche du synthé des exercices)
const MAX_BOOST = 16; // au plus +24 dB
const LIMIT = 0.9; // plafond du limiteur (jamais de saturation)

/**
 * Normalise le morceau pré-rendu par abcjs (un seul tampon audio) avant la lecture :
 * 1) mesure du volume réel (RMS des blocs de 50 ms, 75e centile, silences exclus) et gain vers la cible ;
 * 2) limiteur à anticipation (attaque 4 ms, relâchement 120 ms) pour que les attaques ne saturent pas.
 */
function normalizeRendered(controller) {
  const buf = controller?.midiBuffer?.audioBuffers?.[0];
  if (!buf) return;
  const sr = buf.sampleRate;
  const chans = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
  const n = chans[0].length;

  const block = Math.round(sr * 0.05);
  const levels = [];
  for (let s = 0; s < n; s += block) {
    let sum = 0;
    let cnt = 0;
    for (const d of chans) {
      for (let i = s, e = Math.min(n, s + block); i < e; i++) { sum += d[i] * d[i]; cnt++; }
    }
    const r = Math.sqrt(sum / cnt);
    if (r > 1e-4) levels.push(r);
  }
  if (!levels.length) return;
  levels.sort((a, b) => a - b);
  const loudness = levels[Math.floor(levels.length * 0.75)];
  const gain = Math.min(MAX_BOOST, (TARGET_LOUDNESS * (store.device.volume ?? 0.8)) / loudness);

  // Gain de limitation par échantillon (canaux liés), lissé : descente anticipée, remontée douce.
  const g = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (const d of chans) { const a = (d[i] < 0 ? -d[i] : d[i]) * gain; if (a > m) m = a; }
    g[i] = m > LIMIT ? LIMIT / m : 1;
  }
  const att = 1 - Math.exp(-1 / (sr * 0.004));
  const rel = 1 - Math.exp(-1 / (sr * 0.12));
  for (let i = n - 2; i >= 0; i--) { const v = g[i + 1] + (1 - g[i + 1]) * att; if (v < g[i]) g[i] = v; }
  let prev = 1;
  for (let i = 0; i < n; i++) { const v = prev + (1 - prev) * rel; if (v < g[i]) g[i] = v; prev = g[i]; }
  for (const d of chans) for (let i = 0; i < n; i++) d[i] *= gain * g[i];
}

export function renderScore({ app, navigate, onCleanup }, id) {
  const piece = PIECE_BY_ID[id];
  if (!piece) return navigate('#/library');
  const composer = COMPOSERS[piece.composer];
  const p = store.profile;
  const secondary = p.settings.secondary || 'en';

  let ABCJS = null;
  let visualObj = null;
  let controller = null;
  let fallbackTimer = null;
  let mode = 'idle'; // idle | loading | playing | paused
  let warp = 100;
  let disposed = false;
  let lit = [];
  let currentLine = -1;

  // ---- Interface ----
  const subtitle = h('span', { class: 'chip', hidden: true });
  const playBtn = h('button', { class: 'btn big good play-btn', type: 'button', disabled: true }, '▶ Écouter');
  const restartBtn = h('button', { class: 'btn ghost', type: 'button', disabled: true, title: 'Recommencer' }, '⏮ Début');
  const tempoLabel = h('span', { class: 'tempo-label' }, 'Vitesse 100 %');
  const tempo = h('input', { type: 'range', min: '50', max: '130', step: '10', value: '100', 'aria-label': 'Vitesse' });
  const follow = h('input', { type: 'checkbox', checked: true });
  const noteInfo = h('span', { class: 'chip note-info' }, '👆 Touche une note pour l’entendre');
  const companion = h('div', { class: 'score-companion idle-bob', html: creatureSVG(p.companion, { accessory: p.accessory, size: '100%' }) });
  const paper = h('div', { class: 'score-paper' });
  const scoreBox = h('div', { class: 'score card' }, h('p', { class: 'muted score-loading' }, 'Chargement de la partition… 🎼'));
  const controls = h('div', { class: 'card score-controls' },
    playBtn, restartBtn,
    h('label', { class: 'tempo' }, '🐢', tempo, '🐇', tempoLabel),
    h('label', { class: 'switch' }, follow, 'Suivre la partition'));

  app.append(
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Retour', html: BACK_ICON, onclick: () => navigate(`#/library/${piece.section}`) }),
      h('div', { class: 'score-title' },
        h('h1', {}, piece.title),
        h('div', { class: 'muted' }, `${composer.flag} ${composer.name} (${composer.years})${piece.work ? ` · ${piece.work}` : ''} · ${piece.year}`))),
    h('div', { class: 'card score-about' }, companion,
      h('div', {}, h('strong', {}, 'Le savais-tu ? '), piece.desc, ' ', subtitle)),
    controls,
    h('div', { class: 'row' }, noteInfo),
    scoreBox,
    h('p', { class: 'muted', style: 'text-align:center;margin:0' },
      'Partition transcrite pour l’appli. ',
      h('a', { href: imslpUrl(piece), target: '_blank', rel: 'noopener' }, 'Voir la partition originale complète (IMSLP) ↗')),
  );

  function setMode(m) {
    mode = m;
    playBtn.disabled = m === 'loading';
    playBtn.textContent = m === 'loading' ? 'Chargement du piano… 🎹' : m === 'playing' ? '⏸ Pause' : '▶ Écouter';
    playBtn.classList.toggle('good', m !== 'playing');
    companion.classList.toggle('anim-sing', m === 'playing');
    companion.classList.toggle('idle-bob', m !== 'playing');
    companion.innerHTML = creatureSVG(p.companion, { accessory: p.accessory, size: '100%', mood: m === 'playing' ? 'sing' : 'idle' });
  }

  function clearLit() {
    for (const el of lit) el.classList.remove('playing');
    lit = [];
  }

  function onEvent(ev) {
    if (ev.measureStart && ev.left === null) return; // suite d'une liaison : rien de nouveau
    clearLit();
    for (const group of ev.elements || []) {
      for (const el of group) {
        el.classList.add('playing');
        lit.push(el);
      }
    }
    followLine();
  }

  /**
   * Défilement « tourne-page » : quand on change de ligne, si la ligne jouée est cachée (sous la barre
   * de contrôle collante ou en bas de l'écran) ou dans la moitié basse, on la remonte juste sous la barre.
   * On voit ainsi toujours la ligne en cours et les suivantes, y compris après une reprise.
   */
  function followLine() {
    const m = /\babcjs-l(\d+)\b/.exec(lit[0]?.getAttribute('class') || '');
    if (!m) return;
    const line = Number(m[1]);
    if (line === currentLine) return;
    currentLine = line;
    if (!follow.checked) return;

    let top = Infinity;
    let bottom = -Infinity;
    for (const el of paper.querySelectorAll(`.abcjs-staff.abcjs-l${line}`)) {
      const r = el.getBoundingClientRect();
      top = Math.min(top, r.top);
      bottom = Math.max(bottom, r.bottom);
    }
    if (!Number.isFinite(top)) ({ top, bottom } = lit[0].getBoundingClientRect());
    const margin = 34; // place pour les notes et hampes au-dessus de la portée
    top -= margin;
    bottom += margin * 0.6;
    const barBottom = controls.getBoundingClientRect().bottom;
    const visible = window.innerHeight - barBottom;
    const hidden = top < barBottom - 4 || bottom > window.innerHeight;
    const tooLow = top > barBottom + visible * 0.45;
    if (!hidden && !tooLow) return;
    // Une fois la barre collée en haut, son bas est à 8 px + sa hauteur.
    const stuckBottom = 8 + controls.offsetHeight + 8;
    window.scrollTo({ top: Math.max(0, window.scrollY + top - stuckBottom), behavior: 'smooth' });
  }

  function onFinished() {
    clearLit();
    currentLine = -1;
    setMode('idle');
  }

  // Joue une note touchée sur la partition et affiche son nom.
  function onClickNote(abcElem) {
    const pitches = abcElem?.midiPitches?.map((m) => m.pitch) || [];
    if (!pitches.length) return;
    for (const m of pitches) playNote(m, { dur: 1.1, vel: 0.6, quiet: true });
    noteInfo.textContent = '🎵 ' + [...new Set(pitches)].sort((a, b) => a - b).map((m) => {
      const n = midiToNote(m);
      const sub = noteSubName(n, secondary);
      return sub ? `${noteName(n)} (${sub})` : noteName(n);
    }).join(' + ');
  }

  // ---- Lecture avec notre synthé (secours si le piano échantillonné ne se charge pas) ----
  function startFallback() {
    const msPerMeasure = visualObj.millisecondsPerMeasure() * 100 / warp;
    const qpm = Math.round(visualObj.getBeatsPerMeasure() / msPerMeasure * 60000);
    fallbackTimer = new ABCJS.TimingCallbacks(visualObj, {
      qpm,
      beatSubdivisions: 2,
      eventCallback: (ev) => {
        if (!ev) { onFinished(); return undefined; }
        onEvent(ev);
        for (const n of ev.midiPitches || []) {
          playNote(n.pitch, { dur: Math.max(0.25, n.durationInMeasures * msPerMeasure / 1000), vel: Math.min(1, (n.volume ?? 80) / 110), quiet: true });
        }
        return undefined;
      },
    });
    fallbackTimer.start();
    setMode('playing');
  }

  async function togglePlay() {
    if (!visualObj || mode === 'loading') return;
    if (fallbackTimer) {
      if (mode === 'playing') { fallbackTimer.pause(); stopMusic(); setMode('paused'); }
      else { fallbackTimer.start(); setMode('playing'); }
      return;
    }
    const firstTime = !controller.isLoaded;
    if (firstTime) setMode('loading');
    try {
      ABCJS.synth.registerAudioContext(getCtx());
      await controller.play();
      if (disposed) return;
      setMode(controller.isStarted ? 'playing' : 'paused');
      restartBtn.disabled = false;
    } catch (e) {
      console.warn('Piano échantillonné indisponible, synthé de secours', e);
      if (disposed) return;
      toast('Son de piano simplifié (le vrai piano demande une connexion la première fois).');
      restartBtn.disabled = false;
      startFallback();
    }
  }

  function restart() {
    clearLit();
    currentLine = -1;
    if (fallbackTimer) {
      fallbackTimer.stop();
      stopMusic();
      fallbackTimer = null;
      startFallback();
    } else if (controller?.isLoaded) {
      controller.restart();
    }
    window.scrollTo({ top: scoreBox.offsetTop - 80, behavior: 'smooth' });
  }

  async function changeTempo() {
    warp = Number(tempo.value);
    tempoLabel.textContent = `Vitesse ${warp} %`;
    if (fallbackTimer) {
      const wasPlaying = mode === 'playing';
      fallbackTimer.stop();
      stopMusic();
      fallbackTimer = null;
      clearLit();
      if (wasPlaying) startFallback();
      else setMode('idle');
      return;
    }
    if (controller?.isLoaded) {
      setMode('loading');
      try {
        await controller.setWarp(warp);
        if (!disposed) setMode(controller.isStarted ? 'playing' : 'paused');
      } catch {
        setMode('idle');
      }
    } else {
      controller.warp = warp;
    }
  }

  // En réactivant le suivi pendant la lecture, on recale tout de suite sur la ligne en cours.
  follow.onchange = () => { if (follow.checked) { currentLine = -1; followLine(); } };
  playBtn.onclick = togglePlay;
  restartBtn.onclick = restart;
  tempo.onchange = changeTempo;
  tempo.oninput = () => { tempoLabel.textContent = `Vitesse ${tempo.value} %`; };

  function onKey(e) {
    if (e.target.matches?.('input, textarea')) return;
    if (e.key === ' ') { e.preventDefault(); togglePlay(); }
  }
  window.addEventListener('keydown', onKey);

  onCleanup(() => {
    disposed = true;
    window.removeEventListener('keydown', onKey);
    try { controller?.destroy(); } catch { /* rien */ }
    try { fallbackTimer?.stop(); } catch { /* rien */ }
    stopMusic();
  });

  // ---- Chargement ----
  (async () => {
    const [lib, text] = await Promise.all([
      loadAbcjs(),
      fetch(`music/${id}.abc`).then((r) => {
        if (!r.ok) throw new Error(`Partition introuvable (${r.status})`);
        return r.text();
      }),
    ]);
    if (disposed) return;
    ABCJS = lib;
    const { body, subtitle: sub } = splitHeader(text);
    if (sub) { subtitle.textContent = sub; subtitle.hidden = false; }
    scoreBox.replaceChildren(paper);
    visualObj = ABCJS.renderAbc(paper, body, {
      responsive: 'resize',
      add_classes: true,
      clickListener: onClickNote,
      foregroundColor: '#3b3355',
      selectionColor: '#ff7eaa',
      paddingtop: 6,
      paddingbottom: 6,
      paddingleft: 6,
      paddingright: 6,
    })[0];
    // Nuances moins écrasées : abcjs appelle setUpAudio à chaque préparation du son.
    const setUpAudio = visualObj.setUpAudio.bind(visualObj);
    visualObj.setUpAudio = (params) => {
      const seq = setUpAudio(params);
      for (const track of seq.tracks) for (const ev of track) if (ev.cmd === 'note') ev.volume = softenVelocity(ev.volume);
      return seq;
    };
    visualObj.setUpAudio(); // prépare les hauteurs MIDI (utile pour toucher une note)

    controller = new ABCJS.synth.SynthController();
    // onReady est appelé entre le rendu du morceau et le début de la lecture (aussi après un changement de tempo).
    controller.cursorControl = { beatSubdivisions: 2, onEvent, onFinished, onReady: normalizeRendered };
    await controller.setTune(visualObj, false, { program: 0, soundFontVolumeMultiplier: 3 });
    if (disposed) return;
    playBtn.disabled = false;
  })().catch((e) => {
    console.error(e);
    scoreBox.replaceChildren(h('p', { class: 'muted score-loading' }, `Oups : ${e.message}`));
  });
}
