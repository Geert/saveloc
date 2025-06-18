const CACHE_PREFIX = 'saveloc-static-';
const TILE_CACHE = 'saveloc-tiles-v1';

async function getVersion() {
  try {
    const resp = await fetch('./manifest.json', { cache: 'no-store' });
    const data = await resp.json();
    if (data && data.version) {
      return `v${data.version}`;
    }
  } catch (e) {
    console.error('Unable to read manifest version', e);
  }
  return 'v1';
}
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './vendor/leaflet.css',
  './main.mjs',
  './vendor/leaflet.js',
  './manifest.json',
  './icons/icon-192x192.svg',
  './icons/icon-512x512.svg',
  './src/state.mjs',
  './src/ui.mjs',
  './src/storage.mjs',
  './src/permission.mjs',
  './src/map.mjs',
  './src/locations.mjs',
  './src/ui-controller.mjs'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const version = await getVersion();
    const cache = await caches.open(CACHE_PREFIX + version);
    await cache.addAll(STATIC_ASSETS);
  })());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const version = await getVersion();
    const currentCache = CACHE_PREFIX + version;
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k !== currentCache && k !== TILE_CACHE).map(k => caches.delete(k))
    );
  })());
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.hostname.match(/(tile\.openstreetmap\.org|basemaps\.cartocdn\.com|arcgisonline\.com)/)) {
    event.respondWith(
      caches.open(TILE_CACHE).then(cache => {
        return cache.match(event.request).then(response => {
          const fetchPromise = fetch(event.request).then(networkResp => {
            cache.put(event.request, networkResp.clone());
            return networkResp;
          });
          return response || fetchPromise;
        });
      })
    );
    return;
  }

  if (event.request.method === 'GET' && url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then(resp => resp || fetch(event.request))
    );
  }
});
