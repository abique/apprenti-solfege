// Moteur de difficulté adaptative.
// Chaque catégorie a une liste de niveaux. On garde une fenêtre glissante des dernières réponses :
//  - ≥ 80 % de réussite sur 10 réponses → niveau suivant ;
//  - ≤ 40 % sur 10 réponses → on redescend d'un niveau pour réviser.
// Dans un niveau, les éléments les moins bien maîtrisés reviennent plus souvent.

export const WINDOW = 10;
export const UP_RATIO = 0.8;
export const DOWN_RATIO = 0.4;

export const MEDALS = [
  { id: 'none', name: 'Débutant' },
  { id: 'bronze', name: 'Bronze' },
  { id: 'silver', name: 'Argent' },
  { id: 'gold', name: 'Or' },
  { id: 'platinum', name: 'Platine' },
  { id: 'diamond', name: 'Diamant' },
];

export function emptyTrack() {
  return { level: 0, best: 0, mastered: false, window: [], items: {}, total: 0, correct: 0, rounds: 0, last: 0 };
}

export function getTrack(profile, catId) {
  if (!profile.progress[catId]) profile.progress[catId] = emptyTrack();
  return profile.progress[catId];
}

/** Probabilité estimée de réussite d'un élément (lissage de Laplace sur les essais récents). */
export function itemSkill(track, key) {
  const it = track.items[key];
  if (!it || !it.recent.length) return null;
  const sum = it.recent.reduce((a, b) => a + b, 0);
  return (sum + 1) / (it.recent.length + 2);
}

/** Choisit un élément : les nouveaux et les plus ratés sont favorisés, on évite de répéter le dernier. */
export function pickWeighted(keys, track, recent = [], rnd = Math.random) {
  const last = recent[recent.length - 1];
  const weights = keys.map((k) => {
    const skill = itemSkill(track, k);
    let w = skill === null ? 2.2 : 0.5 + 2.5 * (1 - skill);
    if (keys.length > 1 && k === last) w *= 0.12;
    else if (recent.slice(-3).includes(k)) w *= 0.6;
    return w;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rnd() * total;
  for (let i = 0; i < keys.length; i++) {
    r -= weights[i];
    if (r <= 0) return keys[i];
  }
  return keys[keys.length - 1];
}

/**
 * Enregistre une réponse et ajuste le niveau.
 * @returns {null|'up'|'down'|'mastered'}
 */
export function record(track, key, correct, levelCount) {
  const v = correct ? 1 : 0;
  track.total++;
  track.correct += v;
  track.last = Date.now();
  const it = track.items[key] || (track.items[key] = { seen: 0, correct: 0, recent: [] });
  it.seen++;
  it.correct += v;
  it.recent = [...it.recent, v].slice(-6);

  track.window.push(v);
  if (track.window.length > WINDOW) track.window.shift();

  let event = null;
  if (track.window.length >= WINDOW) {
    const ratio = track.window.reduce((a, b) => a + b, 0) / track.window.length;
    if (ratio >= UP_RATIO) {
      if (track.level < levelCount - 1) {
        track.level++;
        track.window = [];
        event = 'up';
      } else if (!track.mastered) {
        track.mastered = true;
        track.window = [];
        event = 'mastered';
      }
    } else if (ratio <= DOWN_RATIO && track.level > 0) {
      track.level--;
      track.window = [];
      event = 'down';
    }
  }
  track.best = Math.max(track.best, track.level);
  return event;
}

/** Avancement vers le niveau suivant, entre 0 et 1. */
export function levelProgress(track) {
  const need = Math.ceil(UP_RATIO * WINDOW);
  const got = track.window.reduce((a, b) => a + b, 0);
  return Math.min(1, got / need);
}

/**
 * Médaille (0..5) d'après le meilleur niveau atteint : on ne perd jamais une médaille.
 * Bronze dès le 2e niveau, Diamant quand le dernier niveau est maîtrisé.
 */
export function medalTier(track, levelCount) {
  if (!track) return 0;
  if (track.mastered) return 5;
  const l = track.best;
  if (l <= 0) return 0;
  return Math.min(4, 1 + Math.floor(((l - 1) * 4) / Math.max(1, levelCount - 1)));
}
