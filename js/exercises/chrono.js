// Défi chrono : un maximum de bonnes réponses en 60 secondes, sur un niveau déjà débloqué.
// Le but est d'automatiser ce qu'on connaît déjà (lire une note d'un coup d'œil), pas d'apprendre sous pression :
// on se compare seulement à son propre record, une erreur montre la bonne réponse et coûte un peu de temps,
// et le défi ne change ni le niveau ni les médailles de l'exercice.
import { store, touchStreak, recordChrono } from '../storage.js';
import { getTrack } from '../adaptive.js';
import { creatureSVG, ACCESSORIES } from '../avatars.js';
import { sfxBad, sfxPop, sfxLevelUp, stopMusic, stopAll } from '../audio.js';
import { h, pick, animate, confetti, BACK_ICON, fromHTML } from '../ui.js';

export const CHRONO_SECONDS = 60;
const LOW_SECONDS = 10;

const BAD = ['Oups ! Regarde bien la bonne réponse.', 'Pas grave, on continue !', 'ドンマイ！ Donmai !', 'Presque !'];
const CHEER = ['Continue comme ça !', 'すごい！ Sugoi !', 'Tu es rapide !', 'Quelle vitesse !', 'がんばって！'];

/** Niveaux qu'on peut choisir pour le défi : ceux déjà atteints dans l'exercice. */
export function unlockedLevels(profile, cat) {
  const t = profile.progress[cat.id];
  return Math.min(cat.levels.length - 1, Math.max(t?.level ?? 0, t?.best ?? 0));
}

export function runChrono(ctx, cat, levelIndex) {
  const { app, navigate, onCleanup } = ctx;
  const profile = store.profile;
  const track = getTrack(profile, cat.id);
  const level = cat.levels[levelIndex];
  const secondary = profile.settings.secondary || 'en';
  const notesAtStart = profile.notes;
  const prevBest = profile.chrono[cat.id]?.[levelIndex]?.best || 0;
  const timing = cat.chrono;
  const recent = [];
  const missed = new Map(); // clé → nombre d'erreurs
  let score = 0;
  let errors = 0;
  let combo = 0;
  let answered = false;
  let running = false;
  let disposed = false;
  let qCleanups = [];
  let keyMap = {};
  let nextTimer = 0;
  let tickTimer = 0;
  let elapsed = 0;
  let lastTick = 0;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };

  // ---- Écran ----
  const scoreChip = h('span', { class: 'chip chrono-score', title: 'Bonnes réponses' }, '✓ 0');
  const recordChip = h('span', { class: 'chip', title: 'Ton record à ce niveau' }, prevBest ? `🏆 ${prevBest}` : '🏆 —');
  const barFill = h('span');
  const bar = h('div', { class: 'chrono-bar', role: 'progressbar', 'aria-label': 'Temps restant', 'aria-valuemin': '0', 'aria-valuemax': String(CHRONO_SECONDS) }, barFill);
  const timeText = h('div', { class: 'chrono-time', 'aria-hidden': 'true' }, String(CHRONO_SECONDS));
  const top = h('header', { class: 'ex-top' },
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Retour aux défis', title: 'Retour aux défis', html: BACK_ICON, onclick: () => navigate(`#/chrono/${cat.id}`) }),
    h('div', { class: 'ex-title' }, h('h2', {}, `Défi chrono · ${cat.title}`), h('div', { class: 'ex-level' }, `Niveau ${levelIndex + 1} · ${level.name}`)),
    h('div', { class: 'chrono-chips' }, scoreChip, recordChip),
    h('div', { class: 'chrono-timer' }, bar, timeText));
  const mascotSvg = h('div', { class: 'mascot-svg' });
  const bubble = h('div', { class: 'bubble', 'aria-live': 'polite' });
  const mascot = h('div', { class: 'ex-mascot' }, bubble, mascotSvg);
  const stage = h('div', { class: 'ex-stage card' });
  const tools = h('div', { class: 'ex-tools' });
  const answers = h('div', { class: 'ex-answers' });
  const footer = h('div', { class: 'ex-footer' });
  const main = h('div', { class: 'ex-main' }, mascot, h('div', { class: 'ex-play' }, stage, tools, answers, footer));
  const screen = h('section', { class: 'ex chrono', style: `--c:${cat.color}` }, top, main);
  app.append(screen);

  function setMood(mood = 'idle', anim = '') {
    mascotSvg.innerHTML = creatureSVG(profile.companion, { mood, accessory: profile.accessory, size: '100%' });
    mascotSvg.className = 'mascot-svg';
    if (anim) animate(mascotSvg, `anim-${anim}`);
    else if (mood === 'idle') mascotSvg.classList.add('idle-bob');
  }
  function say(text) {
    bubble.textContent = text;
    animate(bubble, 'pop');
  }

  // ---- Clavier (mêmes raccourcis que les exercices : 1 à 9 pour répondre) ----
  function onKey(e) {
    if (e.target.matches?.('input, textarea, select')) return;
    if (/^[1-9]$/.test(e.key)) {
      const btn = answers.querySelectorAll('.answer')[Number(e.key) - 1];
      if (btn && !answered && running) { e.preventDefault(); btn.click(); }
      return;
    }
    const fn = keyMap[e.key] || keyMap[e.code];
    if (fn) { e.preventDefault(); fn(e); }
  }
  window.addEventListener('keydown', onKey);

  // Le chrono s'arrête quand l'appli passe en arrière-plan (appel, autre appli…).
  function onVisibility() { lastTick = performance.now(); }
  document.addEventListener('visibilitychange', onVisibility);

  function cleanupQuestion() {
    clearTimeout(nextTimer);
    for (const fn of qCleanups.splice(0)) { try { fn(); } catch (err) { console.error(err); } }
    keyMap = {};
  }

  onCleanup(() => {
    disposed = true;
    running = false;
    clearInterval(tickTimer);
    for (const t of timers) clearTimeout(t);
    cleanupQuestion();
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVisibility);
    cat.dispose?.();
    stopAll();
  });

  // ---- Chronomètre ----
  function showTime(leftMs) {
    const frac = leftMs / (CHRONO_SECONDS * 1000);
    barFill.style.width = `${(frac * 100).toFixed(2)}%`;
    const secs = Math.ceil(leftMs / 1000);
    timeText.textContent = String(secs);
    bar.setAttribute('aria-valuenow', String(secs));
    bar.classList.toggle('low', secs <= LOW_SECONDS);
  }

  function tick() {
    const now = performance.now();
    if (!document.hidden) elapsed += now - lastTick;
    lastTick = now;
    const left = Math.max(0, CHRONO_SECONDS * 1000 - elapsed);
    showTime(left);
    if (left <= 0) finish();
  }

  // ---- Questions ----
  function makeApi(q) {
    return {
      stage, tools, answers, footer, level, profile, secondary,
      levelIndex,
      answer: (correct) => onAnswer(q, correct),
      isAnswered: () => answered || !running,
      stay: () => {},
      onCleanup: (fn) => qCleanups.push(fn),
      key: (k, fn) => { keyMap[k] = fn; },
      mood: setMood,
      say,
    };
  }

  function next() {
    if (disposed || !running) return;
    cleanupQuestion();
    stopMusic(); // laisse finir le petit bruit d'erreur
    stage.replaceChildren();
    tools.replaceChildren();
    answers.replaceChildren();
    answers.className = 'ex-answers';
    footer.replaceChildren();
    answered = false;
    const q = cat.makeQuestion(level, track, recent);
    recent.push(q.key);
    if (recent.length > 6) recent.shift();
    cat.present(q, makeApi(q));
  }

  function onAnswer(q, correct) {
    if (answered || !running || disposed) return;
    answered = true;
    answers.classList.add('answers-locked');
    if (correct) {
      score++;
      combo++;
      scoreChip.textContent = `✓ ${score}`;
      animate(scoreChip, 'pop-in');
      if (combo % 5 === 0) {
        setMood('happy', 'jump');
        say(combo >= 10 ? `${combo} d’affilée ! 🔥 ${pick(CHEER)}` : `${combo} d’affilée ! 🔥`);
      }
    } else {
      errors++;
      combo = 0;
      missed.set(q.key, (missed.get(q.key) || 0) + 1);
      sfxBad();
      setMood('sad', 'shake');
      say(pick(BAD));
    }
    // Une erreur laisse le temps de voir la correction : c'est aussi ce qui la rend « coûteuse ».
    nextTimer = setTimeout(() => {
      if (!correct) setMood('idle');
      next();
    }, correct ? timing.correctDelay : timing.wrongDelay);
  }

  // ---- Départ : 3, 2, 1… ----
  function countdown() {
    setMood('idle');
    say(prevBest ? `Ton record ici : ${prevBest}. À toi de le battre !` : 'Va le plus vite possible… sans te tromper !');
    showTime(CHRONO_SECONDS * 1000);
    const steps = ['3', '2', '1', 'Partez !'];
    steps.forEach((s, i) => later(() => {
      stage.replaceChildren(h('div', { class: 'chrono-count pop-in' }, s));
      sfxPop();
    }, i * 700));
    later(start, steps.length * 700);
  }

  function start() {
    if (disposed) return;
    running = true;
    elapsed = 0;
    lastTick = performance.now();
    tickTimer = setInterval(tick, 100);
    say(cat.chrono.ask || (typeof cat.ask === 'function' ? cat.ask({}, level) : cat.ask));
    next();
  }

  // ---- Fin ----
  function finish() {
    if (!running) return;
    running = false;
    clearInterval(tickTimer);
    cleanupQuestion();
    stopAll();
    touchStreak(profile);
    const res = recordChrono(profile, cat.id, levelIndex, score, errors);
    store.save();
    summary(res);
  }

  function summary(res) {
    const total = score + errors;
    const accuracy = total ? Math.round((100 * score) / total) : 0;
    const unlocked = ACCESSORIES.filter((a) => a.need > notesAtStart && a.need <= profile.notes);
    const beaten = res.isRecord && res.prevBest > 0;
    const first = res.isRecord && res.prevBest === 0;
    if (beaten) { sfxLevelUp(); confetti(90); } else if (first) confetti(40);

    const title = beaten ? 'Nouveau record ! 🏆' : first ? 'Premier record ! ⏱️' : score >= res.best * 0.9 ? 'Pas loin du record ! 💪' : 'Bien joué ! 👍';
    let advice = '';
    if (total && accuracy < 80) advice = 'Prends le temps de bien regarder : une erreur fait perdre plus de temps qu’une réponse réfléchie !';
    else if (!res.isRecord && res.best > score) advice = `Encore ${res.best - score + 1} bonne${res.best - score + 1 > 1 ? 's' : ''} réponse${res.best - score + 1 > 1 ? 's' : ''} pour battre ton record.`;
    const toReview = [...missed.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => cat.itemLabel(k));

    const replay = () => navigate(`#/chrono/${cat.id}/${levelIndex}`);
    const card = h('div', { class: 'summary card', style: `--c:${cat.color}` },
      h('div', { class: 'mascot-svg idle-bob', html: creatureSVG(profile.companion, { mood: score ? 'happy' : 'idle', accessory: profile.accessory, size: '100%' }) }),
      h('h2', {}, title),
      h('div', { class: 'summary-score' }, String(score), h('small', {}, ` bonne${score > 1 ? 's' : ''} réponse${score > 1 ? 's' : ''} en ${CHRONO_SECONDS} s`)),
      h('div', { class: 'summary-row' },
        h('span', { class: 'chip' }, `🎯 Précision ${accuracy} %`),
        h('span', { class: 'chip' }, `🏆 Record : ${res.best}`),
        h('span', { class: 'chip notes' }, `+${res.reward} ♪`),
        res.bonus ? h('span', { class: 'chip' }, `Record battu : +${res.bonus} ♪`) : null),
      advice ? h('p', { class: 'muted', style: 'margin:0;max-width:440px' }, advice) : null,
      toReview.length ? h('p', { style: 'margin:0' }, h('strong', {}, 'À revoir : '), toReview.join(', ')) : null,
      unlocked.map((a) => h('div', { class: 'unlock' },
        fromHTML(creatureSVG(profile.companion, { accessory: a.id, mood: 'happy', size: 64 })),
        `Nouvelle tenue débloquée : ${a.name} !`)),
      h('div', { class: 'summary-row' },
        h('button', { class: 'btn big', type: 'button', onclick: replay }, 'Rejouer ⏱'),
        h('button', { class: 'btn ghost big', type: 'button', onclick: () => navigate(`#/chrono/${cat.id}`) }, 'Autre niveau'),
        h('button', { class: 'btn ghost big', type: 'button', onclick: () => navigate('#/home') }, 'Menu')),
    );
    main.replaceWith(card);
    top.querySelector('.chrono-timer')?.remove();
    recordChip.textContent = `🏆 ${res.best}`;
    keyMap = { Enter: replay };
    card.querySelector('.btn')?.focus({ preventScroll: true });
  }

  countdown();
}
