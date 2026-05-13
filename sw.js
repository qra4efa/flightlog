// Service Worker — Consumabili EFA
// Strategia: Network-first con fallback cache
// Quando c'è rete → scarica sempre la versione più recente
// Senza rete → serve dalla cache

const CACHE_NAME = 'consumabili-efa-v1';
const URLS_TO_CACHE = [
  '/flightlog/',
  '/flightlog/index.html',
  '/flightlog/manifest.json',
  '/flightlog/icon-192.jpg',
  '/flightlog/icon-512.jpg'
];

// Install: pre-cacha le risorse essenziali
self.addEventListener('install', event => {
  self.skipWaiting(); // Attiva subito senza aspettare che le tab vecchie chiudano
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

// Activate: elimina cache vecchie e prendi controllo immediato
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim()) // Prendi controllo di tutte le tab aperte
  );
});

// Fetch: network-first
self.addEventListener('fetch', event => {
  // Ignora richieste non-GET e richieste cross-origin (es. raw.githubusercontent.com)
  if(event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then(networkResponse => {
        // Aggiorna la cache con la versione fresca
        if(networkResponse && networkResponse.ok){
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => {
        // Nessuna rete → fallback dalla cache
        return caches.match(event.request);
      })
  );
});

// Messaggio dal client: forza aggiornamento e ricarica
self.addEventListener('message', event => {
  if(event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
