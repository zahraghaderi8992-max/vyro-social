const CACHE_NAME = 'vyro-shell-v1';
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
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put('./index.html', response.clone()).catch(() => {});
        }
        return response;
      } catch {
        return (await caches.match('./index.html')) || (await caches.match('./')) || new Response('وایرو آفلاین است. پس از اتصال دوباره تلاش کن.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) {
      fetch(request).then(async response => {
        if (response && response.ok && response.type === 'basic') {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response);
        }
      }).catch(() => {});
      return cached;
    }
    try {
      const response = await fetch(request);
      if (response && response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch {
      return Response.error();
    }
  })());
});
