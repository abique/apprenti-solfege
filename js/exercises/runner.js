// Moteur commun des exercices : une partie = 10 questions, retour immédiat, montée de niveau.
import { store, touchStreak } from '../storage.js';
import { getTrack, record, medalTier, levelProgress, MEDALS } from '../adaptive.js';
import { creatureSVG, ACCESSORIES } from '../avatars.js';
import { sfxGood, sfxBad, sfxLevelUp, stopAll } from '../audio.js';
import { h, pick, animate, confetti, modal, toast, medalSVG, starsHTML, progressBar, BACK_ICON, fromHTML } from '../ui.js';

export const ROUND = 10;

const GOOD = ['Bravo !', 'Super !', 'すごい！ Sugoi !', 'Parfait !', 'やったね！ Yatta !', 'Génial !', 'じょうず！ Jōzu !', 'Magnifique !', 'Trop fort !', 'Oui !'];
const BAD = ['Presque !', 'Pas grave, on continue !', 'がんばって！ Ganbatte !', 'Oups ! Regarde la bonne réponse.', 'ドンマイ！ Donmai !', 'La prochaine sera la bonne !'];

export function runExercise(ctx, cat) {
  const { app, navigate, onCleanup } = ctx;
  const profile = store.profile;
  const track = getTrack(profile, cat.id);
  const secondary = profile.settings.secondary || 'en';
  const notesAtStart = profile.notes;
  const recent = [];
  let index = 0;
  let score = 0;
  let answered = false;
  let disposed = false;
  let qCleanups = [];
  let keyMap = {};
  let continueFn = null;
  let autoTimer = 0;
  let lastLevelShown = -1;

  // ---- Construction de l'écran ----
  const dots = h('div', { class: 'dots', 'aria-hidden': 'true' }, Array.from({ length: ROUND }, () => h('span')));
  const levelLabel = h('div', { class: 'ex-level' });
  const medalBox = h('div', { class: 'ex-medal' });
  const top = h('header', { class: 'ex-top' },
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Retour au menu', title: 'Retour au menu', html: BACK_ICON, onclick: () => navigate('#/home') }),
    h('div', { class: 'ex-title' }, h('h2', {}, cat.title), levelLabel),
    dots, medalBox);
  const mascotSvg = h('div', { class: 'mascot-svg' });
  const bubble = h('div', { class: 'bubble', 'aria-live': 'polite' });
  const mascot = h('div', { class: 'ex-mascot' }, bubble, mascotSvg);
  const stage = h('div', { class: 'ex-stage card' });
  const tools = h('div', { class: 'ex-tools' });
  const answers = h('div', { class: 'ex-answers' });
  const footer = h('div', { class: 'ex-footer' });
  const play = h('div', { class: 'ex-play' }, stage, tools, answers, footer);
  const main = h('div', { class: 'ex-main' }, mascot, play);
  const screen = h('section', { class: 'ex', style: `--c:${cat.color}` }, top, main);
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

  function updateHeader() {
    const level = cat.levels[track.level];
    levelLabel.textContent = `Niveau ${track.level + 1}/${cat.levels.length} · ${level.name}`;
    medalBox.innerHTML = medalSVG(medalTier(track, cat.levels.length), 40);
    [...dots.children].forEach((d, i) => d.classList.toggle('current', i === index));
  }

  // ---- Clavier ----
  function onKey(e) {
    if (e.target.matches?.('input, textarea, select')) return;
    if (e.key === 'Enter' && continueFn) { e.preventDefault(); continueFn(); return; }
    if (/^[1-9]$/.test(e.key)) {
      const btn = answers.querySelectorAll('.answer')[Number(e.key) - 1];
      if (btn && !answered) { e.preventDefault(); btn.click(); }
      return;
    }
    const fn = keyMap[e.key] || keyMap[e.code];
    if (fn) { e.preventDefault(); fn(e); }
  }
  window.addEventListener('keydown', onKey);

  function cleanupQuestion() {
    clearTimeout(autoTimer);
    for (const fn of qCleanups.splice(0)) { try { fn(); } catch (err) { console.error(err); } }
    keyMap = {};
    continueFn = null;
  }

  onCleanup(() => {
    disposed = true;
    cleanupQuestion();
    window.removeEventListener('keydown', onKey);
    cat.dispose?.();
    stopAll();
  });

  // ---- Déroulement ----
  function makeApi(q, level) {
    return {
      stage, tools, answers, footer, level, profile, secondary,
      levelIndex: track.level,
      answer: (correct) => onAnswer(q, correct),
      isAnswered: () => answered,
      onCleanup: (fn) => qCleanups.push(fn),
      key: (k, fn) => { keyMap[k] = fn; },
      mood: setMood,
      say,
    };
  }

  function next() {
    if (disposed) return;
    cleanupQuestion();
    // Coupe proprement tout ce qui sonne encore (accord, arpège programmé, réverbération…).
    stopAll();
    stage.replaceChildren();
    tools.replaceChildren();
    answers.replaceChildren();
    answers.className = 'ex-answers';
    footer.replaceChildren();
    if (index >= ROUND) return summary();

    updateHeader();
    answered = false;
    const level = cat.levels[track.level];
    const q = cat.makeQuestion(level, track, recent);
    recent.push(q.key);
    if (recent.length > 6) recent.shift();
    setMood('idle');
    if (lastLevelShown !== track.level && level.tip) say(level.tip);
    else say(typeof cat.ask === 'function' ? cat.ask(q, level) : cat.ask);
    lastLevelShown = track.level;
    cat.present(q, makeApi(q, level));
  }

  function showContinue(fn, label = 'Continuer') {
    continueFn = () => { continueFn = null; fn(); };
    footer.replaceChildren(h('button', { class: 'btn big', type: 'button', onclick: () => continueFn?.() },
      label, h('span', { class: 'kbd-hint muted', style: 'color:#fff;opacity:.8;font-size:.8rem' }, '⏎')));
  }

  function onAnswer(q, correct) {
    if (answered || disposed) return;
    answered = true;
    answers.classList.add('answers-locked');
    const tierBefore = medalTier(track, cat.levels.length);
    const event = record(track, q.key, correct, cat.levels.length);
    dots.children[index]?.classList.remove('current');
    dots.children[index]?.classList.add(correct ? 'good' : 'bad');
    if (correct) {
      score++;
      profile.notes += 1;
      sfxGood();
      setMood('happy', 'jump');
      say(pick(GOOD));
    } else {
      sfxBad();
      setMood('sad', 'shake');
      say(pick(BAD));
    }
    store.save();
    index++;

    const proceed = async () => {
      clearTimeout(autoTimer);
      continueFn = null;
      if (event) await showLevelEvent(event, tierBefore);
      next();
    };
    showContinue(proceed, index >= ROUND ? 'Voir mon score' : 'Continuer');
    if (correct && !event) autoTimer = setTimeout(proceed, cat.autoDelay ?? 1500);
  }

  async function showLevelEvent(event, tierBefore) {
    if (disposed) return;
    const tier = medalTier(track, cat.levels.length);
    const level = cat.levels[track.level];
    if (event === 'down') {
      toast(`On révise un peu : niveau ${track.level + 1} · ${level.name} 💪`);
      return;
    }
    sfxLevelUp();
    confetti();
    const newMedal = tier > tierBefore;
    const body = h('div', { class: 'row', style: 'flex-direction:column;gap:10px' },
      newMedal ? h('div', { class: 'big-medal', html: medalSVG(tier, 110) }) : h('div', { class: 'mascot-svg', style: 'max-width:130px', html: creatureSVG(profile.companion, { mood: 'happy', accessory: profile.accessory, size: '100%' }) }),
      newMedal ? h('p', { style: 'font-size:1.2rem;font-weight:800' }, `Nouvelle médaille : ${MEDALS[tier].name} !`) : null,
      event === 'mastered'
        ? h('p', {}, `Tu maîtrises tous les niveaux de « ${cat.title} » ! Tu peux continuer à t'entraîner pour garder la forme.`)
        : h('p', {}, h('strong', {}, `Niveau ${track.level + 1} : ${level.name}`), level.tip ? h('br') : null, level.tip || ''));
    await modal({
      title: event === 'mastered' ? 'Incroyable ! 🏆' : 'Niveau suivant ! ✨',
      body,
      actions: [{ label: 'Super, on continue !', value: true }],
      dismissable: false,
    });
    lastLevelShown = track.level;
  }

  function summary() {
    stopAll();
    track.rounds++;
    track.history = [...(track.history || []), score].slice(-30);
    touchStreak(profile);
    const stars = score >= 9 ? 3 : score >= 7 ? 2 : score >= 5 ? 1 : 0;
    if (stars === 3) profile.notes += 3;
    store.save();
    updateHeader();
    const earned = profile.notes - notesAtStart;
    const unlocked = ACCESSORIES.filter((a) => a.need > notesAtStart && a.need <= profile.notes);

    if (stars >= 2) confetti(stars === 3 ? 90 : 40);
    const tier = medalTier(track, cat.levels.length);
    const level = cat.levels[track.level];
    const title = stars === 3 ? 'Fantastique ! 🌟' : stars === 2 ? 'Très bien ! 🎉' : stars === 1 ? 'Bien joué ! 👍' : 'On s’entraîne encore ? 💪';

    const card = h('div', { class: 'summary card' },
      h('div', { class: 'mascot-svg idle-bob', html: creatureSVG(profile.companion, { mood: stars ? 'happy' : 'idle', accessory: profile.accessory, size: '100%' }) }),
      h('h2', {}, title),
      h('div', { class: 'stars', html: starsHTML(stars) }),
      h('div', { class: 'summary-score' }, String(score), h('small', {}, ` / ${ROUND}`)),
      h('div', { class: 'summary-row' },
        h('span', { class: 'chip notes' }, `+${earned} ♪`),
        stars === 3 ? h('span', { class: 'chip' }, 'Bonus 3 étoiles : +3 ♪') : null),
      h('div', { class: 'summary-row', style: `--c:${cat.color};width:100%;max-width:420px` },
        h('div', { html: medalSVG(tier, 48) }),
        h('div', { style: 'flex:1;text-align:left' },
          h('div', { class: 'cat-level' }, `Niveau ${track.level + 1}/${cat.levels.length} · ${level.name}`),
          progressBar(track.mastered ? 1 : levelProgress(track), 'Progression vers le niveau suivant'))),
      unlocked.map((a) => h('div', { class: 'unlock' },
        fromHTML(creatureSVG(profile.companion, { accessory: a.id, mood: 'happy', size: 64 })),
        `Nouvelle tenue débloquée : ${a.name} !`)),
      h('div', { class: 'summary-row' },
        h('button', { class: 'btn big', type: 'button', onclick: () => navigate(`#/play/${cat.id}`) }, 'Encore une partie !'),
        h('button', { class: 'btn ghost big', type: 'button', onclick: () => navigate('#/home') }, 'Menu')),
    );
    main.replaceWith(card);
    dots.remove();
    keyMap = {};
    continueFn = () => navigate(`#/play/${cat.id}`);
    card.querySelector('.btn')?.focus({ preventScroll: true });
  }

  // ---- Démarrage ----
  (async () => {
    updateHeader();
    setMood('idle');
    if (cat.init) {
      const ok = await cat.init({ stage, tools, answers, footer, profile, say, mood: setMood, navigate });
      if (!ok || disposed) return;
    }
    next();
  })();
}
