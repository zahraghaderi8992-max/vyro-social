const CACHE_NAME = 'vyro-shell-v4';
const APP_FILES = ['./', './index.html', './manifest.webmanifest', './vyro-icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_FILES.map(async path => {
      try { await cache.add(new Request(path, { cache: 'reload' })); } catch {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('vyro-shell-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Never cache auth, API, or user-specific Supabase requests.
  if (/supabase|\/auth\/|\/rest\/|\/functions\/|\/storage\/|\/graphql/i.test(url.href)) return;

  if (request.mode === 'navigate') {
    const cachePromise = caches.open(CACHE_NAME);
    const shellUrl = new URL('./index.html', self.registration.scope).toString();
    // Refresh the cached document in the background; never make a warm launch wait for GitHub Pages.
    const refreshPromise = fetch(request).then(async response => {
      if (response && response.ok) {
        const cache = await cachePromise;
        await cache.put(shellUrl, response.clone());
      }
      return response;
    }).catch(() => null);
    event.waitUntil(refreshPromise.then(() => undefined));
    event.respondWith((async () => {
      const cache = await cachePromise;
      const cached = await cache.match(request, { ignoreSearch: true }) || await cache.match(shellUrl) ||
        await cache.match(new URL('./', self.registration.scope).toString());
      if (cached) return cached;
      const response = await refreshPromise;
      return response || new Response('وایرو آفلاین است. پس از اتصال دوباره تلاش کن.', {
        status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
      fetch(request).then(async response => {
        if (response && response.ok && response.type === 'basic') await cache.put(request, response);
      }).catch(() => {});
      return cached;
    }
    try {
      const response = await fetch(request);
      if (response && response.ok && response.type === 'basic') cache.put(request, response.clone()).catch(() => {});
      return response;
    } catch {
      return Response.error();
    }
  })());
});