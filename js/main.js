// Point d'entrée : routeur, fond animé, audio, MIDI, service worker.
import { store } from './storage.js';
import { getCtx, setVolume, setSfx, stopAll, playNote } from './audio.js';
import { enableMidi, onMidi } from './midi.js';
import { renderProfiles } from './screens/profiles.js';
import { renderProfileEdit } from './screens/profileEdit.js';
import { renderHome } from './screens/home.js';
import { renderSettings } from './screens/settings.js';
import { renderPiano } from './screens/piano.js';
import { renderProgress } from './screens/progress.js';
import { renderLibrary } from './screens/library.js';
import { renderScore } from './screens/score.js';
import { renderMidiPlayer } from './screens/midiplayer.js';
import { runExercise } from './exercises/runner.js';
import { runChrono, unlockedLevels } from './exercises/chrono.js';
import { renderChronoSetup, CHRONO_CATEGORIES } from './screens/chrono.js';
import { CATEGORIES } from './exercises/index.js';

const app = document.getElementById('app');
let cleanups = [];

function navigate(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

function render() {
  for (const fn of cleanups.splice(0)) {
    try { fn(); } catch (e) { console.error(e); }
  }
  stopAll();
  document.getElementById('overlay-root').replaceChildren();
  app.replaceChildren();
  window.scrollTo(0, 0);

  const [route = '', arg, arg2] = location.hash.replace(/^#\/?/, '').split('/');
  const profile = store.profile;
  const ctx = { app, navigate, onCleanup: (fn) => cleanups.push(fn) };

  if (!store.state.profiles.length && route !== 'new') return navigate('#/new');
  if (['home', 'play', 'chrono', 'piano', 'settings', 'progress', 'edit', 'library', 'piece', 'midi'].includes(route) && !profile) return navigate('#/profiles');

  try {
    switch (route) {
      case 'profiles': return renderProfiles(ctx);
      case 'new': return renderProfileEdit(ctx, null);
      case 'edit': return renderProfileEdit(ctx, profile);
      case 'home': return renderHome(ctx);
      case 'piano': return renderPiano(ctx);
      case 'settings': return renderSettings(ctx);
      case 'progress': return renderProgress(ctx);
      case 'library': return renderLibrary(ctx, arg);
      case 'piece': return renderScore(ctx, arg);
      case 'midi': return renderMidiPlayer(ctx, arg);
      case 'play': {
        const cat = CATEGORIES.find((c) => c.id === arg);
        return cat ? runExercise(ctx, cat) : navigate('#/home');
      }
      case 'chrono': {
        // #/chrono/<exercice> : choix du niveau ; #/chrono/<exercice>/<niveau> : défi.
        const cat = CHRONO_CATEGORIES.find((c) => c.id === arg);
        const level = Number(arg2);
        if (cat && arg2 && Number.isInteger(level) && level >= 0 && level <= unlockedLevels(profile, cat)) return runChrono(ctx, cat, level);
        if (cat && arg2) return navigate(`#/chrono/${cat.id}`);
        return renderChronoSetup(ctx, arg);
      }
      default: return navigate(profile ? '#/home' : '#/profiles');
    }
  } catch (e) {
    console.error(e);
    app.innerHTML = '<div class="card" style="padding:24px;text-align:center"><h2>Oups, un petit bug 🐞</h2><p><a href="#/home">Retour au menu</a></p></div>';
  }
}

function decorateBackground() {
  const bg = document.getElementById('bg');
  if (!bg || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const petal = (c) => `<svg width="22" height="22" viewBox="0 0 20 20"><path d="M10 2 C 15 5 16 12 10 18 C 4 12 5 5 10 2 Z" fill="${c}"/></svg>`;
  const items = ['♪', '♫', '♩', '♬'];
  const colors = ['#ff8fab', '#9d87ff', '#5cbdf0', '#3fcf9c', '#ffbe3d'];
  const n = window.innerWidth < 700 ? 9 : 16;
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div');
    el.className = 'float';
    const isPetal = i % 3 === 0;
    el.innerHTML = isPetal ? petal(i % 2 ? '#ffc0d6' : '#ffd6e5') : items[i % items.length];
    if (!isPetal) {
      el.style.color = colors[i % colors.length];
      el.style.fontSize = `${18 + Math.random() * 22}px`;
      el.style.fontWeight = '800';
    }
    el.style.left = `${Math.random() * 100}vw`;
    el.style.setProperty('--d', `${26 + Math.random() * 30}s`);
    el.style.setProperty('--delay', `${-Math.random() * 50}s`);
    el.style.setProperty('--dx', `${(Math.random() - 0.5) * 30}vw`);
    el.style.setProperty('--rot', `${(Math.random() - 0.5) * 720}deg`);
    bg.append(el);
  }
}

// Le son ne peut démarrer qu'après un geste de l'utilisateur.
const unlockAudio = () => getCtx();
window.addEventListener('pointerdown', unlockAudio, { passive: true });
window.addEventListener('keydown', unlockAudio, { passive: true });

setVolume(store.device.volume);
setSfx(store.device.sfx);
if (store.device.midi) enableMidi();
onMidi((e) => { if (e.type === 'on') playNote(e.midi, { vel: 0.35 + 0.65 * e.vel, dur: 1.6, quiet: true }); });

window.addEventListener('hashchange', render);
decorateBackground();
render();

if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service worker', e));
}
