// Petits utilitaires d'interface : création d'éléments, modales, confettis, médailles…

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (typeof v !== 'string' && k in el) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function fromHTML(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Relance une animation CSS sur un élément. */
export function animate(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

export function confetti(count = 70) {
  const root = document.getElementById('fx-root');
  if (!root || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#ff8fab', '#ffd166', '#8ce99a', '#74c0fc', '#b197fc', '#ffa94d', '#f783ac'];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    p.className = `confetti ${pick(['', 'round', 'long'])}`;
    p.style.setProperty('--x', `${Math.random() * 100}vw`);
    p.style.setProperty('--dx', `${(Math.random() - 0.5) * 30}vw`);
    p.style.setProperty('--r', `${(Math.random() - 0.5) * 1440}deg`);
    p.style.setProperty('--d', `${1.8 + Math.random() * 1.6}s`);
    p.style.setProperty('--delay', `${Math.random() * 0.4}s`);
    p.style.background = pick(colors);
    root.append(p);
    setTimeout(() => p.remove(), 4000);
  }
}

export function toast(message, ms = 2600) {
  const root = document.getElementById('fx-root');
  const t = h('div', { class: 'toast', role: 'status' }, message);
  root.append(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

/**
 * Fenêtre modale. Résout avec la valeur du bouton choisi (null si fermée).
 * @param {{title?:string, body?:Node|string, actions?:Array<{label:string, value:any, cls?:string}>, cls?:string, dismissable?:boolean}} opts
 */
export function modal({ title, body, actions = [{ label: 'OK', value: true }], cls = '', dismissable = true } = {}) {
  return new Promise((resolve) => {
    let closed = false;
    const box = h('div', { class: `modal ${cls}`, role: 'dialog', 'aria-modal': 'true' },
      title ? h('h2', { class: 'modal-title' }, title) : null,
      typeof body === 'string' ? h('p', {}, body) : body,
      h('div', { class: 'modal-actions' }, actions.map((a) => h('button', {
        class: `btn ${a.cls || ''}`, type: 'button', onclick: () => close(a.value),
      }, a.label))));
    const back = h('div', { class: 'modal-back', onclick: (e) => { if (dismissable && e.target === back) close(null); } }, box);

    function onKey(e) {
      if (e.key === 'Escape' && dismissable) { e.preventDefault(); e.stopImmediatePropagation(); close(null); }
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopImmediatePropagation();
        const focused = document.activeElement;
        if (focused && box.contains(focused) && focused.tagName === 'BUTTON') focused.click();
        else close(actions[0]?.value ?? true);
      } else if (/^\d$/.test(e.key)) e.stopImmediatePropagation();
    }
    function close(v) {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey, true);
      back.classList.add('closing');
      setTimeout(() => back.remove(), 200);
      resolve(v);
    }
    document.addEventListener('keydown', onKey, true);
    document.getElementById('overlay-root').append(back);
    box.querySelector('.modal-actions .btn')?.focus({ preventScroll: true });
  });
}

const MEDAL_STYLE = [
  { fill: '#f1edf8', edge: '#cfc7e4', shine: '#ffffff', r1: '#d9d2ec', r2: '#e8e2f5' },
  { fill: '#f2b483', edge: '#c47a3a', shine: '#ffe0c4', r1: '#ff8fab', r2: '#ffb3c6' },
  { fill: '#e3e8ef', edge: '#97a3b6', shine: '#ffffff', r1: '#74c0fc', r2: '#a5d8ff' },
  { fill: '#ffd84d', edge: '#d99a00', shine: '#fff5bf', r1: '#ff6b6b', r2: '#ff9a9a' },
  { fill: '#c8f1f5', edge: '#5fb9cc', shine: '#ffffff', r1: '#b197fc', r2: '#d0bfff' },
  { fill: 'url(#G)', edge: '#8c6cf5', shine: '#ffffff', r1: '#f783ac', r2: '#74c0fc' },
];
let medalUid = 0;

export function medalSVG(tier, size = 44) {
  const m = MEDAL_STYLE[tier] || MEDAL_STYLE[0];
  const id = `mg${++medalUid}`;
  const fill = m.fill.replace('#G', `#${id}`);
  const icon = tier === 0
    ? `<path d="M24 42 V33 M24 35 C 18 35 16 31 16 28 C 21 28 24 31 24 35 M24 33 C 24 29 27 26 32 26 C 32 30 29 33 24 33" fill="#bfe3b4" stroke="#8cc27d" stroke-width="1.6" stroke-linejoin="round"/>`
    : `<path d="M24 25.5 l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" fill="${m.shine}" opacity=".95"/>`;
  const sparkles = tier === 5
    ? `<path d="M41 18 l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2z M8 40 l1 2.2 2.2 1-2.2 1-1 2.2-1-2.2-2.2-1 2.2-1z" fill="#ffd43b"/>`
    : '';
  return `<svg class="medal tier-${tier}" viewBox="0 0 48 56" width="${size}" height="${Math.round(size * 56 / 48)}" aria-hidden="true">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc9de"/><stop offset=".35" stop-color="#ffe9a8"/><stop offset=".65" stop-color="#b9f3e4"/><stop offset="1" stop-color="#c6d4ff"/></linearGradient></defs>
    <path d="M13 2 h9 l6 16 -8 5z" fill="${m.r1}"/><path d="M35 2 h-9 l-6 16 8 5z" fill="${m.r2}"/>
    <circle cx="24" cy="35" r="16" fill="${fill}" stroke="${m.edge}" stroke-width="3"/>
    <circle cx="24" cy="35" r="11.5" fill="none" stroke="${m.shine}" stroke-width="1.4" opacity=".8"/>
    ${icon}${sparkles}</svg>`;
}

export function starsHTML(n, total = 3) {
  return Array.from({ length: total }, (_, i) => `<span class="star ${i < n ? 'on' : ''}" style="--i:${i}">★</span>`).join('');
}

export function progressBar(frac, label = '') {
  return h('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(frac * 100)), 'aria-label': label },
    h('div', { class: 'progress-fill', style: `width:${Math.round(frac * 100)}%` }));
}

export function answerButton({ label, sub = '', color = '#a08cff', index = null, onClick, cls = '' }) {
  return h('button', { class: `answer ${cls}`, type: 'button', style: `--c:${color}`, onclick: onClick },
    index != null && index < 9 ? h('span', { class: 'kbd', 'aria-hidden': 'true' }, String(index + 1)) : null,
    h('span', { class: 'answer-label' }, label),
    sub ? h('span', { class: 'answer-sub' }, sub) : null);
}

export function iconButton(label, text, onClick, cls = '') {
  return h('button', { class: `icon-btn ${cls}`, type: 'button', 'aria-label': label, title: label, onclick: onClick }, text);
}

export const BACK_ICON = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
