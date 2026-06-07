const CACHE_NAME = 'albaranes-v1';
const urlsToCache = [
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/db.js',
  'js/camera.js',
  'manifest.json',
  'assets/icon-192.png'
];

// Instalación: guardar recursos en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Interceptar peticiones: primero caché, luego red
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Actualizar caché cuando cambie la versión
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
});


