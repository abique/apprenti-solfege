// « Mes morceaux » : fichiers MIDI importés, rangés dans IndexedDB (uniquement sur cet appareil).

const DB = 'apprenti-solfege';
const STORE = 'midi';

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const result = fn(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); resolve(result?.result ?? result); };
    t.onerror = () => { db.close(); reject(t.error); };
  });
}

export async function listMyPieces() {
  const all = await tx('readonly', (s) => s.getAll());
  return all.map(({ data, ...meta }) => meta).sort((a, b) => b.addedAt - a.addedAt);
}

export function getMyPiece(id) {
  return tx('readonly', (s) => s.get(id));
}

export function addMyPiece({ name, data, duration, noteCount }) {
  const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  return tx('readwrite', (s) => s.put({ id, name, data, duration, noteCount, size: data.byteLength, addedAt: Date.now() })).then(() => id);
}

export function deleteMyPiece(id) {
  return tx('readwrite', (s) => s.delete(id));
}
