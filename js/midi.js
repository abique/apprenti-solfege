// Clavier MIDI (Web MIDI API) : optionnel, activé depuis les réglages.

const listeners = new Set();
let access = null;
let status = 'off';

export function midiSupported() {
  return typeof navigator !== 'undefined' && !!navigator.requestMIDIAccess;
}

export function onMidi(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(ev) {
  for (const fn of listeners) fn(ev);
}

function handle(e) {
  const [st, d1, d2] = e.data;
  const cmd = st & 0xf0;
  if (cmd === 0x90 && d2 > 0) emit({ type: 'on', midi: d1, vel: d2 / 127 });
  else if (cmd === 0x80 || (cmd === 0x90 && d2 === 0)) emit({ type: 'off', midi: d1 });
}

function bind() {
  for (const input of access.inputs.values()) input.onmidimessage = handle;
}

export async function enableMidi() {
  if (!midiSupported()) return (status = 'unsupported');
  if (access) return status;
  try {
    access = await navigator.requestMIDIAccess({ sysex: false });
    bind();
    access.onstatechange = bind;
    status = 'on';
  } catch {
    status = 'denied';
  }
  return status;
}

export function disableMidi() {
  if (access) for (const input of access.inputs.values()) input.onmidimessage = null;
  access = null;
  status = 'off';
}

export function midiStatus() {
  return status;
}

export function midiInputNames() {
  return access ? [...access.inputs.values()].map((i) => i.name) : [];
}
