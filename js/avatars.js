// Petites créatures originales en SVG (compagnons) et leurs tenues.

const INK = '#3b3355';

export const CREATURES = [
  { id: 'mochi', name: 'Mochi', body: '#fff6ee', ears: 'round', inner: '#ffd1dc', desc: 'Tout doux, tout rond' },
  { id: 'hoshi', name: 'Hoshi', body: '#ffe680', ears: 'star', accent: '#ffb020', desc: 'Une petite étoile' },
  { id: 'kumo', name: 'Kumo', body: '#d4ecff', ears: 'cloud', desc: 'Un nuage câlin' },
  { id: 'momo', name: 'Momo', body: '#ffc2cf', ears: 'leaf', accent: '#5cbf6a', desc: 'Une pêche rigolote' },
  { id: 'yuzu', name: 'Yuzu', body: '#ffad66', ears: 'fox', inner: '#fff3e3', belly: '#fff3e3', tail: true, desc: 'Un renardeau malin' },
  { id: 'usa', name: 'Usa', body: '#e3d6ff', ears: 'bunny', inner: '#ffc9dd', desc: 'Un lapin qui saute' },
  { id: 'neko', name: 'Neko', body: '#d9dce6', ears: 'cat', inner: '#ffc9dd', whiskers: true, desc: 'Un chaton curieux' },
  { id: 'kuma', name: 'Kuma', body: '#d6a77a', ears: 'round', inner: '#f3d3b0', belly: '#f3d9bd', desc: 'Un ourson gourmand' },
  { id: 'tanu', name: 'Tanu', body: '#c99f7b', ears: 'round', earColor: '#6b5140', inner: '#8a6a55', mask: '#6b5140', belly: '#f3e2cf', desc: 'Un tanuki farceur' },
  { id: 'kero', name: 'Kero', body: '#a6e88a', ears: 'frog', belly: '#e4f9d6', desc: 'Une grenouille chanteuse' },
  { id: 'pan', name: 'Pan', body: '#ffffff', ears: 'round', earColor: '#4a4458', inner: '#4a4458', patches: '#4a4458', desc: 'Un panda paresseux' },
  { id: 'ryu', name: 'Ryū', body: '#9ee8d6', ears: 'horns', accent: '#fff1b0', wings: true, belly: '#e6fbf4', desc: 'Un mini dragon' },
];

export const CREATURE_BY_ID = Object.fromEntries(CREATURES.map((c) => [c.id, c]));

// Tenues débloquées avec les ♪ gagnées (on ne les dépense pas, c'est un palier).
export const ACCESSORIES = [
  { id: 'none', name: 'Rien', need: 0 },
  { id: 'ribbon', name: 'Ruban', need: 0 },
  { id: 'flower', name: 'Fleur de cerisier', need: 15 },
  { id: 'beret', name: 'Béret', need: 40 },
  { id: 'headphones', name: 'Casque audio', need: 80 },
  { id: 'hachimaki', name: 'Hachimaki', need: 130 },
  { id: 'glasses', name: 'Lunettes étoiles', need: 200 },
  { id: 'crown', name: 'Couronne', need: 300 },
  { id: 'halo', name: 'Arc-en-ciel', need: 450 },
];

function mix(hex, amt) {
  // amt < 0 : assombrit, amt > 0 : éclaircit.
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255;
  const p = Math.abs(amt);
  r = Math.round(r + (t - r) * p);
  g = Math.round(g + (t - g) * p);
  b = Math.round(b + (t - b) * p);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

const mirror = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${120 - Number(x)} ${y}`);

const BODY = 'M 16 80 C 16 48, 34 30, 60 30 C 86 30, 104 48, 104 80 C 104 100, 86 108, 60 108 C 34 108, 16 100, 16 80 Z';

function starPath(cx, cy, r1, r2, points = 5) {
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? r2 : r1;
    const a = (Math.PI / points) * i - Math.PI / 2;
    d += `${i ? 'L' : 'M'} ${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)} `;
  }
  return d + 'Z';
}

function ears(c, line) {
  const earFill = c.earColor || c.body;
  const inner = c.inner || mix(c.body, -0.12);
  switch (c.ears) {
    case 'round':
      return [32, 88].map((x) => `<circle cx="${x}" cy="42" r="14" fill="${earFill}" stroke="${line}" stroke-width="2.4"/><circle cx="${x}" cy="42" r="7.5" fill="${inner}"/>`).join('');
    case 'cat': {
      const l = 'M 22 60 L 28 20 Q 30 15 35 19 L 56 38 Z';
      const li = 'M 29 50 L 32 27 L 47 39 Z';
      return `<path d="${l}" fill="${earFill}" stroke="${line}" stroke-width="2.4" stroke-linejoin="round"/><path d="${li}" fill="${inner}"/>`
        + `<path d="${mirror(l)}" fill="${earFill}" stroke="${line}" stroke-width="2.4" stroke-linejoin="round"/><path d="${mirror(li)}" fill="${inner}"/>`;
    }
    case 'fox': {
      const l = 'M 18 64 L 23 14 Q 25 9 30 12 L 58 36 Z';
      const li = 'M 26 52 L 28 22 L 46 37 Z';
      return `<path d="${l}" fill="${earFill}" stroke="${line}" stroke-width="2.4" stroke-linejoin="round"/><path d="${li}" fill="${inner}"/>`
        + `<path d="${mirror(l)}" fill="${earFill}" stroke="${line}" stroke-width="2.4" stroke-linejoin="round"/><path d="${mirror(li)}" fill="${inner}"/>`;
    }
    case 'bunny':
      return [[42, -10], [78, 10]].map(([x, a]) => `<g transform="rotate(${a} ${x} 40)"><ellipse cx="${x}" cy="18" rx="10" ry="26" fill="${earFill}" stroke="${line}" stroke-width="2.4"/><ellipse cx="${x}" cy="20" rx="5" ry="18" fill="${inner}"/></g>`).join('');
    case 'frog':
      return [40, 80].map((x) => `<circle cx="${x}" cy="40" r="16" fill="${c.body}" stroke="${line}" stroke-width="2.4"/>`).join('');
    case 'horns': {
      const l = 'M 38 40 Q 32 20 40 12 Q 46 24 50 35 Z';
      return `<path d="${l}" fill="${c.accent}" stroke="${line}" stroke-width="2.2" stroke-linejoin="round"/><path d="${mirror(l)}" fill="${c.accent}" stroke="${line}" stroke-width="2.2" stroke-linejoin="round"/>`;
    }
    case 'leaf':
      return `<path d="M 60 33 Q 57 22 62 14" fill="none" stroke="#8a5a3c" stroke-width="3" stroke-linecap="round"/>`
        + `<path d="M 62 22 Q 76 8 90 16 Q 76 32 62 22 Z" fill="${c.accent}" stroke="${mix(c.accent, -0.3)}" stroke-width="2"/><path d="M 64 21 Q 76 17 86 17" fill="none" stroke="${mix(c.accent, -0.3)}" stroke-width="1.4"/>`;
    case 'star':
      return `<path d="M 60 33 Q 56 22 62 14" fill="none" stroke="${line}" stroke-width="2.4" stroke-linecap="round"/>`
        + `<path d="${starPath(62, 11, 10, 4.6)}" fill="${c.accent}" stroke="${mix(c.accent, -0.3)}" stroke-width="2" stroke-linejoin="round"/>`;
    default:
      return '';
  }
}

function cloudPuffs(c, line, withStroke) {
  const puffs = [[30, 56, 16], [46, 40, 18], [68, 36, 19], [88, 50, 16]];
  return puffs.map(([x, y, r]) => withStroke
    ? `<circle cx="${x}" cy="${y}" r="${r}" fill="${c.body}" stroke="${line}" stroke-width="2.4"/>`
    : `<circle cx="${x}" cy="${y}" r="${r - 1.3}" fill="${c.body}"/>`).join('');
}

function eyes(c, mood, ex, ey) {
  const pos = [ex, 120 - ex];
  if (mood === 'happy' || mood === 'sing') {
    return pos.map((x) => `<path d="M ${x - 6.5} ${ey + 2} Q ${x} ${ey - 7} ${x + 6.5} ${ey + 2}" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`).join('');
  }
  const scale = mood === 'wow' ? 1.15 : mood === 'sad' ? 0.88 : 1;
  const sclera = c.ears === 'frog'
    ? pos.map((x) => `<circle cx="${x}" cy="${ey}" r="10" fill="#fff"/>`).join('')
    : '';
  return sclera + pos.map((x) => `<g transform="translate(${x} ${ey}) scale(${scale})">
    <ellipse rx="6.4" ry="7.8" fill="${INK}"/>
    <circle cx="-2.2" cy="-3" r="2.6" fill="#fff"/>
    <circle cx="2.4" cy="2.8" r="1.2" fill="#fff"/>
  </g>`).join('');
}

function mouth(mood, my) {
  switch (mood) {
    case 'happy':
      return `<path d="M 52 ${my - 1} Q 60 ${my + 12} 68 ${my - 1} Z" fill="#ff7d96" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>`;
    case 'sad':
      return `<path d="M 55 ${my + 4} Q 60 ${my} 65 ${my + 4}" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`;
    case 'sing':
    case 'wow':
      return `<ellipse cx="60" cy="${my + 3}" rx="4.6" ry="5.6" fill="#ff7d96" stroke="${INK}" stroke-width="2.2"/>`;
    default:
      return `<path d="M 53 ${my} Q 56.5 ${my + 4.5} 60 ${my} Q 63.5 ${my + 4.5} 67 ${my}" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
}

function accessory(id) {
  switch (id) {
    case 'ribbon':
      return `<g stroke="${INK}" stroke-width="2" stroke-linejoin="round"><path d="M 88 36 L 74 27 Q 71 36 74 45 Z" fill="#ff6f91"/><path d="M 88 36 L 102 27 Q 105 36 102 45 Z" fill="#ff6f91"/><circle cx="88" cy="36" r="4.5" fill="#ff9fb6"/></g>`;
    case 'flower': {
      const petals = [0, 72, 144, 216, 288].map((a) => `<ellipse cx="34" cy="28" rx="5.5" ry="8" transform="rotate(${a} 34 36)" fill="#ffc0d6" stroke="#f08cb0" stroke-width="1.4"/>`).join('');
      return `${petals}<circle cx="34" cy="36" r="3.4" fill="#ffdd57"/>`;
    }
    case 'beret':
      return `<g stroke="${INK}" stroke-width="2" stroke-linejoin="round"><path d="M 28 42 Q 30 22 60 21 Q 92 21 94 38 Q 70 47 28 42 Z" fill="#ef4f5f"/><path d="M 58 21 L 60 14 L 63 21" fill="#ef4f5f"/></g>`;
    case 'headphones':
      return `<path d="M 20 66 Q 18 18 60 18 Q 102 18 100 66" fill="none" stroke="#7c6cf0" stroke-width="6" stroke-linecap="round"/>`
        + `<rect x="9" y="56" width="15" height="26" rx="7" fill="#7c6cf0" stroke="${INK}" stroke-width="2"/><rect x="96" y="56" width="15" height="26" rx="7" fill="#7c6cf0" stroke="${INK}" stroke-width="2"/>`
        + `<circle cx="16.5" cy="69" r="3" fill="#ffc0d6"/><circle cx="103.5" cy="69" r="3" fill="#ffc0d6"/>`;
    case 'hachimaki':
      return `<path d="M 18 57 Q 60 37 102 57" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round"/><path d="M 18 57 Q 60 37 102 57" fill="none" stroke="#fff" stroke-width="7.5" stroke-linecap="round"/>`
        + `<circle cx="60" cy="47" r="4.6" fill="#e5484d"/><path d="M 100 55 L 113 66 L 109 50 Z M 100 55 L 116 56 L 108 47 Z" fill="#fff" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>`;
    case 'glasses':
      return `<g fill="rgba(255,214,90,.35)" stroke="#ff9f1c" stroke-width="2.4" stroke-linejoin="round"><path d="${starPath(44, 70, 14, 7.5)}"/><path d="${starPath(76, 70, 14, 7.5)}"/></g><path d="M 54 68 Q 60 64 66 68" fill="none" stroke="#ff9f1c" stroke-width="2.4"/>`;
    case 'crown':
      return `<path d="M 40 34 L 42 14 L 52 24 L 60 9 L 68 24 L 78 14 L 80 34 Z" fill="#ffd23f" stroke="#c98b00" stroke-width="2.2" stroke-linejoin="round"/><circle cx="60" cy="27" r="3.2" fill="#ff6f91"/><circle cx="48" cy="29" r="2.2" fill="#6cc4f0"/><circle cx="72" cy="29" r="2.2" fill="#6cc4f0"/>`;
    case 'halo':
      return ['#ff8fab', '#ffd166', '#8ce99a', '#74c0fc'].map((col, i) => `<path d="M ${22 + i * 5} 30 Q 60 ${-8 + i * 7} ${98 - i * 5} 30" fill="none" stroke="${col}" stroke-width="4.5" stroke-linecap="round"/>`).join('');
    default:
      return '';
  }
}

/**
 * SVG d'une créature.
 * @param {string} id
 * @param {{mood?:string, accessory?:string, size?:number|string, cls?:string}} opts
 */
export function creatureSVG(id, { mood = 'idle', accessory: acc = 'none', size = 120, cls = '' } = {}) {
  const c = CREATURE_BY_ID[id] || CREATURES[0];
  const line = mix(c.body === '#ffffff' ? '#d8d4e6' : c.body, -0.38);
  const frog = c.ears === 'frog';
  const ex = 44;
  const ey = frog ? 40 : 70;
  const my = frog ? 78 : 81;
  const parts = [];

  if (c.tail) parts.push(`<path d="M 94 92 Q 124 86 116 54 Q 106 74 90 80 Z" fill="${c.body}" stroke="${line}" stroke-width="2.4" stroke-linejoin="round"/><path d="M 116 54 Q 112 66 104 72 Q 116 70 118 60 Z" fill="#fff8ee"/>`);
  if (c.wings) {
    const w = 'M 20 72 Q 2 62 6 44 Q 14 56 26 60 Z';
    parts.push(`<path d="${w}" fill="${c.accent}" stroke="${line}" stroke-width="2.2" stroke-linejoin="round"/><path d="${mirror(w)}" fill="${c.accent}" stroke="${line}" stroke-width="2.2" stroke-linejoin="round"/>`);
  }
  if (c.ears === 'cloud') parts.push(cloudPuffs(c, line, true));
  else parts.push(ears(c, line));

  parts.push(`<path d="${BODY}" fill="${c.body}" stroke="${line}" stroke-width="2.4"/>`);
  if (c.ears === 'cloud') parts.push(cloudPuffs(c, line, false));
  if (frog) parts.push([40, 80].map((x) => `<circle cx="${x}" cy="40" r="14.7" fill="${c.body}"/>`).join(''));
  if (c.belly) parts.push(`<ellipse cx="60" cy="92" rx="25" ry="14" fill="${c.belly}"/>`);
  parts.push(`<ellipse cx="40" cy="48" rx="10" ry="5.5" transform="rotate(-28 40 48)" fill="#fff" opacity=".55"/>`);
  parts.push(`<ellipse cx="42" cy="107" rx="10" ry="5" fill="${mix(c.body, -0.14)}" stroke="${line}" stroke-width="2"/><ellipse cx="78" cy="107" rx="10" ry="5" fill="${mix(c.body, -0.14)}" stroke="${line}" stroke-width="2"/>`);

  if (c.mask) parts.push(`<path d="M 26 70 Q 30 58 44 60 Q 60 64 76 60 Q 90 58 94 70 Q 90 82 78 78 Q 60 72 42 78 Q 30 82 26 70 Z" fill="${c.mask}"/>`);
  if (c.patches) parts.push(`<ellipse cx="43" cy="71" rx="10" ry="12" transform="rotate(20 43 71)" fill="${c.patches}"/><ellipse cx="77" cy="71" rx="10" ry="12" transform="rotate(-20 77 71)" fill="${c.patches}"/>`);

  const blushY = frog ? 70 : 83;
  parts.push(`<ellipse cx="30" cy="${blushY}" rx="7.5" ry="4.2" fill="#ff8fab" opacity=".55"/><ellipse cx="90" cy="${blushY}" rx="7.5" ry="4.2" fill="#ff8fab" opacity=".55"/>`);
  parts.push(`<g class="eyes">${eyes(c, mood, ex, ey)}</g>`);
  parts.push(mouth(mood, my));
  if (mood === 'sad') parts.push(`<path d="M 96 52 Q 101 60 96 64 Q 91 60 96 52 Z" fill="#9fd8ff" stroke="#6bb6e8" stroke-width="1.4"/>`);
  if (c.whiskers) parts.push(`<g stroke="${line}" stroke-width="1.8" stroke-linecap="round"><path d="M 24 80 L 10 77 M 24 85 L 10 87 M 96 80 L 110 77 M 96 85 L 110 87"/></g>`);
  parts.push(accessory(acc));

  const s = typeof size === 'number' ? `${size}` : size;
  return `<svg class="creature ${cls}" viewBox="-4 -6 128 128" width="${s}" height="${s}" role="img" aria-label="${c.name}">${parts.join('')}</svg>`;
}

/** Avatar d'un profil : photo si présente, sinon le compagnon. */
export function avatarHTML(profile, size = 64) {
  if (profile.photo) return `<img class="avatar-photo" src="${profile.photo}" width="${size}" height="${size}" alt="${escapeAttr(profile.name)}">`;
  return creatureSVG(profile.companion, { accessory: profile.accessory, size });
}

function escapeAttr(s) {
  return String(s).replace(/[&"<>]/g, (ch) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' }[ch]));
}
