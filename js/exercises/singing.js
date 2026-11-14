// Chanter une note : le micro écoute et vérifie la justesse (peu importe l'octave).
import { naturalRange, noteKey, parseNote, noteToMidi, noteName, midiOfFreq, centsToPitchClass, midiToNote, STEP_COLORS } from '../music.js';
import { staffSVG } from '../staff.js';
import { getCtx, playNote, isPlaying } from '../audio.js';
import { Microphone, micSupported } from '../pitch.js';
import { pickWeighted } from '../adaptive.js';
import { h } from '../ui.js';
import { ICONS, toolButton, bigName } from './common.js';

const keys = (from, to) => naturalRange(from, to).map(noteKey);
const SCALE = keys('C4', 'B4');

const LEVELS = [
  { name: 'Écoute et chante : Do, Mi, Sol', notes: ['C4', 'E4', 'G4'], mode: 'echo', tol: 70, tip: 'Écoute la note, puis chante-la sur « laaa ». Tiens-la jusqu’à remplir le cercle !' },
  { name: 'Écoute et chante : Do à Sol', notes: keys('C4', 'G4'), mode: 'echo', tol: 60, tip: 'Suis la boule : si elle est trop haute, chante plus grave ; trop basse, plus aigu.' },
  { name: 'Écoute et chante : la gamme', notes: SCALE, mode: 'echo', tol: 50, tip: 'Toute la gamme ! Écoute bien avant de chanter.' },
  { name: 'Avec le Do : Do, Mi, Sol', notes: ['C4', 'E4', 'G4'], mode: 'ref', tol: 50, tip: 'Maintenant je ne joue que le Do. À toi de trouver la note en chantant la gamme dans ta tête !' },
  { name: 'Avec le Do : la gamme', notes: SCALE, mode: 'ref', tol: 45, tip: 'Do, Ré, Mi, Fa, Sol, La, Si : monte la gamme dans ta tête jusqu’à la bonne note.' },
  { name: 'Sans aide', notes: SCALE, mode: 'free', tol: 40, tip: 'Lis la note et chante-la ! (le bouton « Do » est là si besoin)' },
  { name: 'Oreille d’or', notes: SCALE, mode: 'free', tol: 25, tip: 'Niveau expert : il faut chanter très juste !' },
];

const HOLD = 1.0; // secondes à tenir la note juste
const LIMIT = 20; // secondes d'écoute avant d'abandonner

let mic = null;

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function micErrorMessage(e) {
  if (!window.isSecureContext) return 'Le micro ne fonctionne que si l’appli est ouverte en https:// (ou sur localhost).';
  switch (e?.name) {
    case 'NotAllowedError': return 'Le micro a été refusé. Autorise-le dans les réglages du navigateur (le petit cadenas à côté de l’adresse), puis réessaie.';
    case 'NotFoundError': return 'Je ne trouve aucun micro sur cet appareil.';
    case 'NotReadableError': return 'Le micro est déjà utilisé par une autre application.';
    default: return `Impossible d’utiliser le micro (${e?.message || e}).`;
  }
}

export default {
  id: 'singing',
  title: 'Chanter juste',
  subtitle: 'Chanter la note demandée au micro',
  color: '#ffb52e',
  icon: ICONS.singing,
  ask: (q, level) => (level.mode === 'echo' ? 'Écoute, puis chante la note !' : level.mode === 'ref' ? 'Écoute le Do, puis chante la note !' : 'Chante cette note !'),
  autoDelay: 1800,
  levels: LEVELS,

  allItemKeys() {
    return SCALE;
  },

  itemLabel(key) {
    return noteName(parseNote(key));
  },

  init(api) {
    if (mic) return Promise.resolve(true);
    const { stage, navigate } = api;
    return new Promise((resolve) => {
      const msg = h('p', { class: 'reveal-text', style: 'max-width:440px' }, 'Pour vérifier si tu chantes juste, j’ai besoin d’écouter avec le micro 🎤. Rien n’est enregistré : tout reste sur cet appareil.');
      const start = h('button', { class: 'btn big', type: 'button' }, '🎤 Activer le micro');
      const back = h('button', { class: 'btn ghost', type: 'button', onclick: () => navigate('#/home') }, 'Retour au menu');
      stage.replaceChildren(msg, h('div', { class: 'row', style: 'justify-content:center' }, start));
      api.say('On chante ensemble ? 🎶');
      if (!window.isSecureContext || !micSupported()) {
        msg.textContent = micErrorMessage(null);
        start.replaceWith(back);
        resolve(false);
        return;
      }
      start.onclick = async () => {
        start.disabled = true;
        try {
          const m = new Microphone();
          await m.start(getCtx());
          mic = m;
          resolve(true);
        } catch (e) {
          console.warn(e);
          msg.textContent = micErrorMessage(e);
          start.disabled = false;
          start.textContent = 'Réessayer';
          start.after(back);
        }
      };
    });
  },

  dispose() {
    mic?.stop();
    mic = null;
  },

  makeQuestion(level, track, recent) {
    const key = pickWeighted(level.notes, track, recent);
    const note = parseNote(key);
    return { key, note, midi: noteToMidi(note) };
  },

  present(q, api) {
    const { stage, tools, answers, level, secondary } = api;
    const color = STEP_COLORS[q.note.step];
    const tol = level.tol;

    // --- Cible + jauge ---
    const target = h('div', { class: 'sing-target' },
      h('div', { class: 'staff-box small', html: staffSVG({ columns: [{ notes: [q.note], color }], minWidth: 150 }) }),
      bigName(q.note, secondary, color));
    const meter = h('div', { class: 'meter', 'aria-hidden': 'true' });
    const rowH = 100 / 13;
    for (let k = 6; k >= -6; k--) {
      const n = midiToNote(q.midi + k);
      meter.append(h('div', { class: `row ${k === 0 ? 'target' : ''}`, style: `top:${(6 - k) * rowH}%` }, n.alter ? '' : noteName(n)));
    }
    const bandH = ((2 * tol) / 100) * rowH;
    meter.append(h('div', { class: 'band', style: `top:${50 - bandH / 2}%;height:${bandH}%` }));
    const ball = h('div', { class: 'ball' });
    meter.append(ball);
    stage.append(h('div', { class: 'sing-wrap' }, target, meter));

    // --- Anneau de progression + statut ---
    const R = 38;
    const C = 2 * Math.PI * R;
    const ringFill = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ring.setAttribute('viewBox', '0 0 92 92');
    ring.classList.add('ring');
    ring.innerHTML = `<circle class="track" cx="46" cy="46" r="${R}"/>`;
    ringFill.setAttribute('class', 'fill');
    ringFill.setAttribute('cx', '46');
    ringFill.setAttribute('cy', '46');
    ringFill.setAttribute('r', String(R));
    ringFill.setAttribute('stroke-dasharray', String(C));
    ringFill.setAttribute('stroke-dashoffset', String(C));
    ring.append(ringFill);
    const status = h('div', { class: 'sing-status' }, '');
    answers.className = 'sing-panel';
    answers.append(ring, status);

    // --- Outils ---
    const playTarget = () => playNote(q.midi, { dur: 1.4 });
    const playRef = () => playNote(60, { dur: 1.2 });
    if (level.mode === 'echo') tools.append(toolButton('▶ Écouter la note', playTarget));
    tools.append(toolButton('🎵 Do (repère)', playRef));
    const skip = toolButton('Passer ⏭', () => finish(false));
    tools.append(skip);
    api.key(' ', level.mode === 'echo' ? playTarget : playRef);

    // --- Boucle d'écoute ---
    let hold = 0;
    let listened = 0;
    let last = performance.now();
    let lastVoiced = 0;
    let raf = 0;
    let finished = false;
    let singing = false;
    const freqs = [];

    function setSinging(on) {
      if (on === singing) return;
      singing = on;
      api.mood(on ? 'sing' : 'idle', on ? 'sing' : '');
    }

    function frame(now) {
      if (finished) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (isPlaying()) {
        status.textContent = 'Écoute… 👂';
        ball.classList.remove('on');
        freqs.length = 0;
      } else {
        listened += dt;
        const r = mic ? mic.read({ minRms: 0.006, threshold: 0.2 }) : { freq: 0 };
        if (r.freq > 0 && r.clarity > 0.72) {
          freqs.push(r.freq);
          if (freqs.length > 5) freqs.shift();
          lastVoiced = now;
        } else if (now - lastVoiced > 250) {
          freqs.length = 0;
        }
        if (freqs.length >= 3) {
          const m = midiOfFreq(median(freqs));
          const cents = centsToPitchClass(m, q.midi);
          const ok = Math.abs(cents) <= tol;
          ball.style.top = `${50 - (cents / 100) * rowH}%`;
          ball.classList.add('on');
          ball.classList.toggle('ok', ok);
          ball.classList.toggle('close', !ok && Math.abs(cents) <= 150);
          if (ok) {
            hold += dt;
            status.textContent = 'Parfait, tiens la note ! ✨';
          } else {
            hold = Math.max(0, hold - dt * 0.8);
            const sung = noteName(midiToNote(Math.round(m)));
            status.textContent = cents > 0 ? `Tu chantes ${sung} : un peu plus bas ⬇` : `Tu chantes ${sung} : un peu plus haut ⬆`;
          }
          setSinging(true);
        } else {
          ball.classList.remove('on');
          hold = Math.max(0, hold - dt * 0.5);
          status.textContent = `Chante « ${noteName(q.note)} » ! 🎤`;
          setSinging(false);
        }
      }
      ringFill.setAttribute('stroke-dashoffset', String(C * (1 - Math.min(1, hold / HOLD))));
      if (hold >= HOLD) return finish(true);
      if (listened >= LIMIT) return finish(false);
      raf = requestAnimationFrame(frame);
    }

    function finish(correct) {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      ball.classList.remove('on');
      skip.disabled = true;
      ringFill.setAttribute('stroke-dashoffset', correct ? '0' : String(C));
      status.textContent = correct ? 'Bravo, c’était juste ! 🎉' : `Écoute : voici le ${noteName(q.note)}.`;
      if (!correct) playNote(q.midi, { delay: 0.3, dur: 1.4 });
      api.answer(correct);
    }

    api.onCleanup(() => { finished = true; cancelAnimationFrame(raf); });

    const t = setTimeout(() => {
      if (level.mode === 'echo') playTarget();
      else if (level.mode === 'ref') playRef();
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }, 450);
    api.onCleanup(() => clearTimeout(t));
  },
};
