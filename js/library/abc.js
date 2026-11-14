// Chargement d'abcjs (bibliothèque de gravure de partitions, licence MIT, copiée dans vendor/).

let abcjsPromise = null;

export function loadAbcjs() {
  if (window.ABCJS) return Promise.resolve(window.ABCJS);
  if (!abcjsPromise) {
    abcjsPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'vendor/abcjs-basic-min.js';
      s.onload = () => resolve(window.ABCJS);
      s.onerror = () => {
        abcjsPromise = null;
        reject(new Error('Impossible de charger le moteur de partitions.'));
      };
      document.head.append(s);
    });
  }
  return abcjsPromise;
}

/**
 * Sépare les titres (T:) et le compositeur (C:) du reste de la partition :
 * l'appli les affiche elle-même, abcjs ne dessine que la musique.
 */
export function splitHeader(abc) {
  const titles = [];
  let composer = '';
  const body = abc.split(/\r?\n/).filter((line) => {
    if (/^T:/.test(line)) { titles.push(line.slice(2).trim()); return false; }
    if (/^C:/.test(line)) { composer = line.slice(2).trim(); return false; }
    return true;
  }).join('\n');
  return { body, title: titles[0] || '', subtitle: titles.slice(1).join(' · '), composer };
}
