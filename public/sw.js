const CACHE_NAME = 'mangablaze-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/home',
  '/browse',
  '/history',
  '/updates',
  '/favicon.png',
  '/logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Strategy: Stale-While-Revalidate for app shell and assets
  if (ASSETS_TO_CACHE.includes(url.pathname) || url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Strategy: Cache-First for manga images (if they were explicitly cached by the user)
  if (url.hostname.includes('mangadex') || url.hostname.includes('asurascans') || url.hostname.includes('comick')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request);
      })
    );
    return;
  }

  // Default: Network-First
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Listen for messages to cache specific URLs (Downloading)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.payload;
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return Promise.all(urls.map(url => {
           return fetch(url, { mode: 'no-cors' }).then(response => {
             return cache.put(url, response);
           }).catch(err => console.error('Failed to cache image:', url, err));
        }));
      })
    );
  }
});
