// Service worker : permet d'utiliser l'appli hors ligne une fois installée.
// Stratégie « réseau d'abord » : toujours la dernière version quand on est en ligne, le cache sinon.
const CACHE = 'apprenti-solfege-v2';
const CORE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'icons/icon.svg',
  'icons/icon-192.png',
  'js/main.js',
  'js/music.js',
  'js/audio.js',
  'js/pitch.js',
  'js/midi.js',
  'js/storage.js',
  'js/adaptive.js',
  'js/avatars.js',
  'js/staff.js',
  'js/piano.js',
  'js/ui.js',
  'js/camera.js',
  'js/exercises/index.js',
  'js/exercises/runner.js',
  'js/exercises/common.js',
  'js/exercises/reading.js',
  'js/exercises/listening.js',
  'js/exercises/singing.js',
  'js/exercises/intervals.js',
  'js/exercises/chords.js',
  'js/screens/profiles.js',
  'js/screens/profileEdit.js',
  'js/screens/home.js',
  'js/screens/settings.js',
  'js/screens/piano.js',
  'js/screens/progress.js',
  'js/screens/library.js',
  'js/screens/score.js',
  'js/screens/midiplayer.js',
  'js/library/catalog.js',
  'js/library/abc.js',
  'js/library/mystore.js',
  'js/midifile.js',
  'vendor/abcjs-basic-min.js',
];

// Partitions : mises en cache à la première ouverture (stratégie « réseau d'abord » ci-dessous).
// Le son du piano échantillonné vient de paulrosen.github.io (police sonore FluidR3, utilisée par abcjs).
const RUNTIME_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'paulrosen.github.io'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !RUNTIME_HOSTS.includes(url.hostname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    } catch {
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;
      if (req.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
      return Response.error();
    }
  })());
});
