const CACHE_NAME = "bentoul-creation-v11";

const APP_ROUTE = /^\/(?:accueil|home|cours|course|courses|serie|series|lesson|lessons|lecon|lecons|episode|episodes|compte|profil|profile|auth|connexion|admin|administration)(?:\/|$)/i;

const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/js/visite.js",
  "/images/logo.png",
  "/images/home.jpg",
  "/images/hero-accueil-betoul.jpg",
  "/images/blog-securite-android.jpg",
  "/images/blog-stockage-android.jpg",
  "/images/blog-google-drive.jpg",
  "/images/pwa-192.png",
  "/images/pwa-512.png",
  "/images/pwa-maskable-512.png",
  "/images/apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache =>
        Promise.all(APP_SHELL.map(path => cache.add(path).catch(() => null)))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function handleNavigation(event) {
  const url = new URL(event.request.url);
  const cache = await caches.open(CACHE_NAME);
  const isShellRoute =
    url.pathname === "/" ||
    url.pathname === "/index.html" ||
    APP_ROUTE.test(url.pathname);

  // Réseau d'abord : les mises à jour du site sont visibles dès le chargement.
  // Le cache ne sert que si le réseau est indisponible.
  if (isShellRoute) {
    try {
      const response = await fetch(event.request);

      if (response && response.ok) {
        await cache.put("/index.html", response.clone());
        return response;
      }
    } catch {
      // Passage au cache hors ligne.
    }

    const cachedShell = await cache.match("/index.html");
    if (cachedShell) return cachedShell;
  }

  try {
    const response = await fetch(event.request);

    if (response && response.ok) {
      if (url.pathname === "/" || url.pathname === "/index.html") {
        await cache.put("/index.html", response.clone());
      }

      return response;
    }

    return (await cache.match("/index.html")) || response;
  } catch {
    return (await cache.match("/index.html")) || Response.error();
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches
              .open(CACHE_NAME)
              .then(cache => cache.put(request, copy))
              .catch(() => {});
          }

          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
