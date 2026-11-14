// Clavier de piano tactile (multi-touch, souris).
import { midiToNote, noteName, noteSubName, STEP_COLORS } from './music.js';

export function isBlack(midi) {
  return [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);
}

/**
 * @param {{from?:number, to?:number, onPress?:(midi:number)=>void, onRelease?:(midi:number)=>void, labels?:boolean, secondary?:string, cls?:string, interactive?:boolean}} opts
 */
export function createPiano({ from = 60, to = 84, onPress, onRelease, labels = true, secondary = 'en', cls = '', interactive = true } = {}) {
  const el = document.createElement('div');
  el.className = `piano ${cls}`;
  const keys = new Map();
  const whites = [];
  for (let m = from; m <= to; m++) if (!isBlack(m)) whites.push(m);
  const w = 100 / whites.length;
  let wi = 0;

  for (let m = from; m <= to; m++) {
    const black = isBlack(m);
    const k = document.createElement(interactive ? 'button' : 'div');
    if (interactive) k.type = 'button';
    k.className = `key ${black ? 'black' : 'white'}`;
    k.dataset.midi = String(m);
    const n = midiToNote(m);
    k.setAttribute('aria-label', noteName(n));
    if (black) {
      k.style.left = `${wi * w - w * 0.31}%`;
      k.style.width = `${w * 0.62}%`;
    } else {
      k.style.left = `${wi * w}%`;
      k.style.width = `${w}%`;
      k.style.setProperty('--kc', STEP_COLORS[n.step]);
      wi++;
    }
    keys.set(m, k);
    el.append(k);
  }

  function setLabels(show, sec = secondary) {
    secondary = sec;
    for (const [m, k] of keys) {
      if (isBlack(m)) continue;
      const n = midiToNote(m);
      const sub = noteSubName(n, secondary);
      k.innerHTML = show ? `<span class="key-label">${noteName(n)}${sub ? `<small>${sub}</small>` : ''}</span>` : '';
    }
  }
  setLabels(labels);

  const active = new Map(); // pointerId -> midi
  function press(m, pointerId) {
    const k = keys.get(m);
    if (!k) return;
    k.classList.add('pressed');
    if (pointerId != null) active.set(pointerId, m);
    onPress?.(m);
  }
  function release(pointerId) {
    const m = active.get(pointerId);
    if (m == null) return;
    active.delete(pointerId);
    keys.get(m)?.classList.remove('pressed');
    onRelease?.(m);
  }

  if (interactive) {
    el.addEventListener('pointerdown', (e) => {
      const k = e.target.closest('.key');
      if (!k) return;
      e.preventDefault();
      try { el.releasePointerCapture?.(e.pointerId); } catch { /* rien */ }
      press(Number(k.dataset.midi), e.pointerId);
    });
    // Glissando : on suit le doigt d'une touche à l'autre.
    el.addEventListener('pointermove', (e) => {
      if (!active.has(e.pointerId)) return;
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.key');
      if (!target || !el.contains(target)) return;
      const m = Number(target.dataset.midi);
      if (m !== active.get(e.pointerId)) {
        release(e.pointerId);
        press(m, e.pointerId);
      }
    });
    for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
      el.addEventListener(type, (e) => {
        if (type === 'pointerleave' && e.pointerType !== 'mouse') return;
        release(e.pointerId);
      });
    }
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  return {
    el,
    keys,
    setLabels,
    /** Allume une touche (classe CSS), éventuellement temporairement. */
    mark(midi, cls = 'lit', ms = 0) {
      const k = keys.get(midi);
      if (!k) return;
      k.classList.add(cls);
      if (ms) setTimeout(() => k.classList.remove(cls), ms);
    },
    clearMarks() {
      for (const k of keys.values()) k.classList.remove('lit', 'good', 'bad', 'pressed', 'hint');
    },
  };
}
