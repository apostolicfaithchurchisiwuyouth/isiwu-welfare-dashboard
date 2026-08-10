const CACHE_NAME = "afc-isiu-pwa-v1";

const APP_SHELL = [
    "/",
    "/index.html",
    "/manifest.json",
    "/css/main.css",
    "/css/layout.css",
    "/js/main.js"
];

self.addEventListener("install", event => {

    event.waitUntil(

        caches.open(CACHE_NAME)

            .then(cache => cache.addAll(APP_SHELL))

            .then(() => self.skipWaiting())

    );

});


self.addEventListener("activate", event => {

    event.waitUntil(

        caches.keys()

            .then(cacheNames => {

                return Promise.all(

                    cacheNames

                        .filter(cacheName => cacheName !== CACHE_NAME)

                        .map(cacheName => caches.delete(cacheName))

                );

            })

            .then(() => self.clients.claim())

    );

});


self.addEventListener("fetch", event => {

    if (event.request.method !== "GET") {
        return;
    }

    event.respondWith(

        caches.match(event.request)

            .then(cachedResponse => {

                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request);

            })

    );

});
