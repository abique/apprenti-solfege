// Sauvegarde locale (localStorage) des joueurs et de leur progression.

const KEY = 'apprenti-solfege/v1';
const DEVICE_KEY = 'apprenti-solfege/device';

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function emptyState() {
  return { version: 1, profiles: [], currentId: null };
}

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('Lecture impossible', key, e);
    return null;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('Sauvegarde impossible', key, e);
    return false;
  }
}

export function normalizeProfile(p) {
  return {
    id: p.id || uid(),
    name: String(p.name || 'Joueur').slice(0, 24),
    companion: p.companion || 'mochi',
    accessory: p.accessory || 'none',
    photo: typeof p.photo === 'string' && p.photo.startsWith('data:image/') ? p.photo : null,
    createdAt: p.createdAt || Date.now(),
    settings: { secondary: 'en', pianoLabels: true, ...(p.settings || {}) },
    notes: Number(p.notes) || 0, // ♪ gagnées (monnaie du jeu)
    streak: { days: 0, last: null, ...(p.streak || {}) },
    progress: p.progress && typeof p.progress === 'object' ? p.progress : {},
  };
}

function normalizeState(s) {
  if (!s || !Array.isArray(s.profiles)) return emptyState();
  const profiles = s.profiles.map(normalizeProfile);
  const currentId = profiles.some((p) => p.id === s.currentId) ? s.currentId : null;
  return { version: 1, profiles, currentId };
}

export function makeProfile({ name, companion, photo = null }) {
  return normalizeProfile({ id: uid(), name, companion, photo });
}

export const store = {
  state: normalizeState(readJSON(KEY)),
  device: { volume: 0.8, sfx: true, midi: false, ...(readJSON(DEVICE_KEY) || {}) },

  get profile() {
    return this.state.profiles.find((p) => p.id === this.state.currentId) || null;
  },

  select(id) {
    this.state.currentId = id;
    this.save();
  },

  add(profile) {
    this.state.profiles.push(profile);
    this.state.currentId = profile.id;
    this.save();
  },

  remove(id) {
    this.state.profiles = this.state.profiles.filter((p) => p.id !== id);
    if (this.state.currentId === id) this.state.currentId = null;
    this.save();
  },

  save() {
    return writeJSON(KEY, this.state);
  },

  saveDevice() {
    return writeJSON(DEVICE_KEY, this.device);
  },

  exportText() {
    return JSON.stringify({ app: 'apprenti-solfege', exportedAt: new Date().toISOString(), ...this.state }, null, 1);
  },

  /** Fusionne une sauvegarde : les joueurs importés remplacent ceux de même identifiant. */
  importText(text) {
    const data = normalizeState(JSON.parse(text));
    if (!data.profiles.length) throw new Error('Aucun joueur dans ce fichier.');
    for (const p of data.profiles) {
      const i = this.state.profiles.findIndex((q) => q.id === p.id);
      if (i >= 0) this.state.profiles[i] = p;
      else this.state.profiles.push(p);
    }
    this.save();
    return data.profiles.length;
  },
};

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Met à jour la série de jours consécutifs. Renvoie vrai si c'est le premier jeu du jour. */
export function touchStreak(profile) {
  const today = todayKey();
  const s = profile.streak;
  if (s.last === today) return false;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  s.days = s.last === todayKey(y) ? s.days + 1 : 1;
  s.last = today;
  return true;
}

export async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch { /* pas grave */ }
}
