// Lecteur MIDI « notes qui tombent » : les notes descendent vers le clavier et s'allument en jouant.
import { store } from '../storage.js';
import { getMyPiece } from '../library/mystore.js';
import { parseMidi } from '../midifile.js';
import { createPiano, isBlack } from '../piano.js';
import { getCtx, playNote, stopMusic } from '../audio.js';
import { h, BACK_ICON } from '../ui.js';

const HAND_COLORS = ['#ff7eaa', '#4fb6ee', '#34c995', '#ffb52e', '#9b83ff', '#ff9a62'];
const VISIBLE_SECONDS = 3;
const LOOKAHEAD = 0.3;

function formatTime(s) {
  s = Math.max(0, s);
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export function renderMidiPlayer({ app, navigate, onCleanup }, id) {
  const p = store.profile;
  const title = h('h1', { style: 'font-size:1.5rem' }, 'Chargement…');
  const playBtn = h('button', { class: 'btn big good play-btn', type: 'button', disabled: true }, '▶ Écouter');
  const restartBtn = h('button', { class: 'btn ghost', type: 'button', disabled: true }, '⏮ Début');
  const tempoLabel = h('span', { class: 'tempo-label' }, 'Vitesse 100 %');
  const tempo = h('input', { type: 'range', min: '30', max: '130', step: '10', value: '100', 'aria-label': 'Vitesse' });
  const seek = h('input', { type: 'range', min: '0', max: '1000', value: '0', class: 'seek', 'aria-label': 'Position dans le morceau' });
  const timeLabel = h('span', { class: 'tempo-label' }, '0:00');
  const canvas = h('canvas', { class: 'fall-canvas' });
  const pianoWrap = h('div', { class: 'fall-piano' });
  const stage = h('div', { class: 'card fall-stage' }, canvas, pianoWrap);

  app.append(
    h('div', { class: 'topbar' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Retour', html: BACK_ICON, onclick: () => navigate('#/library/miens') }),
      title),
    h('div', { class: 'card score-controls' },
      playBtn, restartBtn,
      h('label', { class: 'tempo' }, '🐢', tempo, '🐇', tempoLabel),
      h('label', { class: 'tempo seek-wrap' }, seek, timeLabel)),
    stage,
    h('p', { class: 'muted kbd-hint', style: 'text-align:center;margin:0' }, 'Astuce : barre d’espace pour lecture / pause. Tu peux aussi jouer sur le clavier !'));

  let notes = [];
  let duration = 0;
  let piano = null;
  let geometry = new Map();
  let colorOf = () => HAND_COLORS[0];
  let playing = false;
  let speed = 1;
  let anchorSong = 0;
  let anchorCtx = 0;
  let nextIndex = 0;
  let scheduledUntil = 0;
  let raf = 0;
  let timer = 0;
  let disposed = false;
  let seeking = false;
  let litKeys = new Set();

  const now = () => (playing ? anchorSong + (getCtx().currentTime - anchorCtx) * speed : anchorSong);

  function indexAt(t) {
    let i = 0;
    while (i < notes.length && notes[i].start < t) i++;
    return i;
  }

  function schedule() {
    if (!playing) return;
    const t = now();
    const horizon = t + LOOKAHEAD * speed;
    while (nextIndex < notes.length && notes[nextIndex].start < horizon) {
      const n = notes[nextIndex++];
      if (n.start < scheduledUntil - 1e-6) continue;
      playNote(n.midi, { delay: Math.max(0, (n.start - t) / speed), dur: Math.max(0.15, (n.end - n.start) / speed), vel: 0.3 + 0.6 * n.vel, quiet: true });
    }
    scheduledUntil = horizon;
    if (t > duration + 0.6) {
      pause();
      anchorSong = 0;
      nextIndex = 0;
    }
  }

  function play() {
    getCtx();
    anchorCtx = getCtx().currentTime;
    nextIndex = indexAt(anchorSong);
    scheduledUntil = anchorSong;
    playing = true;
    playBtn.textContent = '⏸ Pause';
    playBtn.classList.remove('good');
    schedule();
  }

  function pause() {
    anchorSong = now();
    playing = false;
    stopMusic();
    playBtn.textContent = '▶ Écouter';
    playBtn.classList.add('good');
  }

  function jump(t) {
    const was = playing;
    if (playing) pause();
    anchorSong = Math.max(0, Math.min(duration, t));
    if (was) play();
  }

  function measure() {
    if (!piano) return;
    const width = pianoWrap.clientWidth;
    const height = Math.round(Math.min(420, Math.max(200, window.innerHeight * 0.42)));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    geometry = new Map();
    for (const [m, k] of piano.keys) geometry.set(m, { x: k.offsetLeft, w: k.offsetWidth, black: isBlack(m) });
  }

  function draw() {
    raf = requestAnimationFrame(draw);
    const g = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width / dpr;
    const H = canvas.height / dpr;
    const t = now();
    const pps = H / VISIBLE_SECONDS;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);

    // Repères : une ligne à chaque Do.
    g.strokeStyle = 'rgba(157,135,255,.15)';
    g.lineWidth = 1;
    for (const [m, geo] of geometry) {
      if (m % 12 === 0) { g.beginPath(); g.moveTo(geo.x + 0.5, 0); g.lineTo(geo.x + 0.5, H); g.stroke(); }
    }

    const active = new Set();
    for (let i = Math.max(0, indexAt(t - 8) - 1); i < notes.length; i++) {
      const n = notes[i];
      if (n.start > t + VISIBLE_SECONDS) break;
      if (n.end < t) continue;
      const geo = geometry.get(n.midi);
      if (!geo) continue;
      const on = n.start <= t && t < n.end;
      if (on) active.add(n.midi);
      const yBottom = Math.min(H, H - (n.start - t) * pps);
      const yTop = Math.max(0, H - (n.end - t) * pps);
      const pad = geo.black ? 1 : 2;
      g.fillStyle = colorOf(n);
      g.globalAlpha = on ? 1 : 0.85;
      g.beginPath();
      g.roundRect(geo.x + pad, yTop, Math.max(2, geo.w - pad * 2), Math.max(3, yBottom - yTop), 5);
      g.fill();
      if (on) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
    }
    g.globalAlpha = 1;

    for (const m of litKeys) if (!active.has(m)) piano.keys.get(m)?.classList.remove('lit');
    for (const m of active) if (!litKeys.has(m)) piano.keys.get(m)?.classList.add('lit');
    litKeys = active;

    if (!seeking && duration) seek.value = String(Math.round((Math.min(t, duration) / duration) * 1000));
    timeLabel.textContent = `${formatTime(t)} / ${formatTime(duration)}`;
  }

  playBtn.onclick = () => (playing ? pause() : play());
  restartBtn.onclick = () => jump(0);
  tempo.oninput = () => { tempoLabel.textContent = `Vitesse ${tempo.value} %`; };
  tempo.onchange = () => {
    const t = now();
    const was = playing;
    if (was) pause();
    speed = Number(tempo.value) / 100;
    anchorSong = t;
    if (was) play();
  };
  seek.oninput = () => { seeking = true; timeLabel.textContent = `${formatTime((seek.value / 1000) * duration)} / ${formatTime(duration)}`; };
  seek.onchange = () => { seeking = false; jump((seek.value / 1000) * duration); };

  function onKey(e) {
    if (e.target.matches?.('input[type=text], textarea')) return;
    if (e.key === ' ') { e.preventDefault(); if (!playBtn.disabled) playBtn.click(); }
  }
  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', measure);

  onCleanup(() => {
    disposed = true;
    cancelAnimationFrame(raf);
    clearInterval(timer);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', measure);
    stopMusic();
  });

  (async () => {
    const item = await getMyPiece(id);
    if (disposed) return;
    if (!item) { navigate('#/library/miens'); return; }
    title.textContent = `🎵 ${item.name}`;
    const midi = parseMidi(item.data);
    notes = midi.notes;
    duration = midi.duration;

    const tracksUsed = [...new Set(notes.map((n) => n.track))];
    colorOf = tracksUsed.length > 1
      ? (n) => HAND_COLORS[tracksUsed.indexOf(n.track) % HAND_COLORS.length]
      : (n) => (n.midi < 60 ? HAND_COLORS[1] : HAND_COLORS[0]);

    const lo = Math.min(...notes.map((n) => n.midi));
    const hi = Math.max(...notes.map((n) => n.midi));
    let from = Math.max(21, lo - (lo % 12));
    let to = Math.min(108, hi + (11 - (hi % 12)));
    if (to - from < 23) to = Math.min(108, from + 23);
    piano = createPiano({ from, to, labels: to - from <= 48, secondary: p.settings.secondary || 'en', onPress: (m) => playNote(m, { dur: 1, quiet: true }) });
    pianoWrap.replaceChildren(piano.el);
    measure();
    playBtn.disabled = false;
    restartBtn.disabled = false;
    timer = setInterval(schedule, 40);
    draw();
  })().catch((e) => {
    console.error(e);
    title.textContent = 'Oups';
    stage.replaceChildren(h('p', { class: 'muted', style: 'padding:20px' }, `Ce morceau ne peut pas être lu : ${e.message}`));
  });
}
