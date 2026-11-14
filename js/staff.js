// Portée musicale en SVG : clé de sol / clé de fa, rondes, lignes supplémentaires.
import { diatonicIndex } from './music.js';

const INK = '#3b3355';
const S = 10; // écart entre deux lignes

// Note de la ligne du haut : Fa5 en clé de sol, La3 en clé de fa.
const TOP_LINE = { treble: diatonicIndex({ step: 3, octave: 5 }), bass: diatonicIndex({ step: 5, octave: 3 }) };

export function noteY(note, clef = 'treble') {
  return (TOP_LINE[clef] - diatonicIndex(note)) * (S / 2);
}

const G_CLEF = `<g fill="none" stroke="${INK}" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round">
  <path d="M 11 50 C 10 57, 20 58, 20.5 50 C 21 40, 18 16, 18.5 2 C 19 -8, 21 -16, 25 -16 C 29 -16, 29 -6, 24 0 C 18 7, 6 14, 6 27 C 6 37, 13 41, 20 40 C 28 39, 31 28, 23 23 C 16 19, 10 28, 15 32 C 17 33.5, 19 33, 20 31"/>
</g><circle cx="12.5" cy="50" r="3.8" fill="${INK}"/>`;

const F_CLEF = `<path d="M 7 10 C 5 2, 12 -2, 19 -1 C 28 0, 31 8, 29 16 C 27 26, 17 35, 5 42" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>
<circle cx="9" cy="10" r="4.4" fill="${INK}"/><circle cx="36" cy="5" r="2.5" fill="${INK}"/><circle cx="36" cy="15" r="2.5" fill="${INK}"/>`;

function sharp(x, y) {
  return `<g transform="translate(${x} ${y})" stroke="${INK}" stroke-linecap="butt">
    <line x1="-2" y1="-9" x2="-2" y2="8" stroke-width="1.3"/><line x1="2.2" y1="-8" x2="2.2" y2="9" stroke-width="1.3"/>
    <line x1="-5" y1="-1.5" x2="5" y2="-4.5" stroke-width="2.6"/><line x1="-5" y1="4.5" x2="5" y2="1.5" stroke-width="2.6"/></g>`;
}

function flat(x, y) {
  return `<path transform="translate(${x} ${y})" d="M -3 -13 L -3 5 C 3 2, 6 -2, 3.5 -4.5 C 1.5 -6, -1.5 -4, -3 -2" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
}

function noteHead(x, y, color) {
  return `<g transform="translate(${x} ${y})" class="note-head">
    <ellipse rx="7.6" ry="5.3" transform="rotate(-20)" fill="${color}"/>
    <ellipse rx="4.1" ry="2.5" transform="rotate(62)" fill="#fff"/></g>`;
}

function ledgers(x, y) {
  let out = '';
  for (let ly = -S; ly >= y - 0.1; ly -= S) out += `<line x1="${x - 12}" x2="${x + 12}" y1="${ly}" y2="${ly}" stroke="${INK}" stroke-width="1.4"/>`;
  for (let ly = 5 * S; ly <= y + 0.1; ly += S) out += `<line x1="${x - 12}" x2="${x + 12}" y1="${ly}" y2="${ly}" stroke="${INK}" stroke-width="1.4"/>`;
  return out;
}

/**
 * @param {{clef?:'treble'|'bass', columns?:Array<{notes:Array<object>, color?:string, label?:string, labelColor?:string}>, minWidth?:number}} opts
 */
export function staffSVG({ clef = 'treble', columns = [], minWidth = 150 } = {}) {
  const first = 64;
  const gap = 40;
  const width = Math.max(minWidth, first + Math.max(0, columns.length - 1) * gap + 34);
  let body = '';
  for (let i = 0; i < 5; i++) body += `<line x1="2" x2="${width - 2}" y1="${i * S}" y2="${i * S}" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>`;
  body += `<g class="clef">${clef === 'bass' ? F_CLEF : G_CLEF}</g>`;

  columns.forEach((col, i) => {
    const x = first + i * gap;
    const color = col.color || INK;
    const notes = col.notes || [];
    body += `<g class="note-col" data-col="${i}">`;
    for (const n of notes) {
      const y = noteY(n, clef);
      body += ledgers(x, y);
      if (n.alter === 1) body += sharp(x - 17, y);
      if (n.alter === -1) body += flat(x - 15, y);
      body += noteHead(x, y, color);
    }
    if (col.label) body += `<text x="${x}" y="84" text-anchor="middle" font-size="15" font-weight="800" fill="${col.labelColor || color}" class="note-label">${col.label}</text>`;
    body += '</g>';
  });

  return `<svg class="staff" viewBox="0 -36 ${width} 126" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Portée">${body}</svg>`;
}
