// Lecture de fichiers MIDI standard (format 0 et 1) → liste de notes en secondes.

class Reader {
  constructor(buffer) {
    this.v = new DataView(buffer);
    this.p = 0;
  }
  get left() { return this.v.byteLength - this.p; }
  u8() { return this.v.getUint8(this.p++); }
  u16() { const x = this.v.getUint16(this.p); this.p += 2; return x; }
  u32() { const x = this.v.getUint32(this.p); this.p += 4; return x; }
  str(n) { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(this.u8()); return s; }
  varlen() {
    let x = 0;
    for (let i = 0; i < 4; i++) {
      const b = this.u8();
      x = (x << 7) | (b & 0x7f);
      if (!(b & 0x80)) return x;
    }
    return x;
  }
}

/**
 * @param {ArrayBuffer} buffer
 * @returns {{notes:Array<{midi:number,start:number,end:number,vel:number,track:number,channel:number}>, duration:number, tracks:string[]}}
 */
export function parseMidi(buffer) {
  const r = new Reader(buffer);
  if (r.left < 14 || r.str(4) !== 'MThd') throw new Error('Ce n’est pas un fichier MIDI.');
  const headerLen = r.u32();
  const format = r.u16();
  const ntracks = r.u16();
  const division = r.u16();
  r.p += headerLen - 6;
  if (format > 1) throw new Error('Format MIDI non géré (format 2).');
  if (division & 0x8000) throw new Error('Format de temps MIDI non géré (SMPTE).');

  const tempos = [{ tick: 0, us: 500000 }];
  const events = [];
  const names = [];

  for (let t = 0; t < ntracks && r.left >= 8; t++) {
    const id = r.str(4);
    const len = r.u32();
    const end = r.p + len;
    if (id !== 'MTrk') { r.p = end; continue; }
    let tick = 0;
    let status = 0;
    names[t] = '';
    while (r.p < end) {
      tick += r.varlen();
      let b = r.u8();
      if (b === 0xff) {
        const type = r.u8();
        const l = r.varlen();
        if (type === 0x51 && l === 3) tempos.push({ tick, us: (r.u8() << 16) | (r.u8() << 8) | r.u8() });
        else if (type === 0x03) names[t] = r.str(l);
        else r.p += l;
        continue;
      }
      if (b === 0xf0 || b === 0xf7) { r.p += r.varlen(); continue; }
      if (b & 0x80) status = b;
      else { r.p--; b = status; } // « running status »
      const cmd = status & 0xf0;
      const ch = status & 0x0f;
      if (cmd === 0x90 || cmd === 0x80) {
        const note = r.u8();
        const vel = r.u8();
        events.push({ tick, on: cmd === 0x90 && vel > 0, note, vel, ch, track: t });
      } else if (cmd === 0xc0 || cmd === 0xd0) r.p += 1;
      else if (cmd === 0xa0 || cmd === 0xb0 || cmd === 0xe0) r.p += 2;
      else throw new Error('Fichier MIDI abîmé.');
    }
    r.p = end;
  }

  // Conversion ticks → secondes avec la carte des tempos.
  tempos.sort((a, b) => a.tick - b.tick);
  const marks = [];
  let sec = 0;
  for (let i = 0; i < tempos.length; i++) {
    if (i > 0) sec += ((tempos[i].tick - tempos[i - 1].tick) * tempos[i - 1].us) / 1e6 / division;
    marks.push({ tick: tempos[i].tick, sec, us: tempos[i].us });
  }
  const toSec = (tick) => {
    let m = marks[0];
    for (const x of marks) { if (x.tick <= tick) m = x; else break; }
    return m.sec + ((tick - m.tick) * m.us) / 1e6 / division;
  };

  events.sort((a, b) => a.tick - b.tick || (a.on ? 1 : -1)); // les fins de note avant les débuts au même instant
  const open = new Map();
  const notes = [];
  for (const e of events) {
    if (e.ch === 9) continue; // percussions
    const k = e.ch * 128 + e.note;
    if (e.on) {
      if (!open.has(k)) open.set(k, []);
      open.get(k).push(e);
    } else {
      const start = open.get(k)?.shift();
      if (start) notes.push({ midi: e.note, start: toSec(start.tick), end: toSec(e.tick), vel: start.vel / 127, track: start.track, channel: e.ch });
    }
  }
  for (const list of open.values()) {
    for (const s of list) notes.push({ midi: s.note, start: toSec(s.tick), end: toSec(s.tick) + 0.5, vel: s.vel / 127, track: s.track, channel: s.ch });
  }
  notes.sort((a, b) => a.start - b.start || a.midi - b.midi);
  for (const n of notes) if (n.end - n.start < 0.05) n.end = n.start + 0.05;
  const duration = notes.reduce((m, n) => Math.max(m, n.end), 0);
  return { notes, duration, tracks: names };
}
