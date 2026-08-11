/* =========================================================
   AFC ISIU YOUTH PORTAL
   SERVICE WORKER
   PHASE 3 — OFFLINE APP SHELL
========================================================= */

const CACHE_NAME = "afc-isiu-pwa-v4";

/* =========================================================
   CORE APP FILES
========================================================= */

const APP_SHELL = [

    "/",
    "/index.html",

    "/manifest.json",

    "/css/main.css",
    "/css/layout.css",

    "/js/main.js",

    "/images/logo.png"

];

/* =========================================================
   LESSON PAGE FILES
========================================================= */

const LESSON_FILES = [

    "/pages/lessons.html",
    "/css/lessons.css",
    "/js/lessons.js"

];

/* =========================================================
   INSTALL
========================================================= */

self.addEventListener("install", event => {

    console.log(
        "AFC Isiu SW: Installing",
        CACHE_NAME
    );

    event.waitUntil(

        caches.open(CACHE_NAME)

            .then(cache => {

                return cache.addAll([
                    ...APP_SHELL,
                    ...LESSON_FILES
                ]);

            })

            .then(() => {

                console.log(
                    "AFC Isiu SW: App shell cached."
                );

                return self.skipWaiting();

            })

            .catch(error => {

                console.error(
                    "AFC Isiu SW: Cache installation failed:",
                    error
                );

            })

    );

});

/* =========================================================
   ACTIVATE
========================================================= */

self.addEventListener("activate", event => {

    console.log(
        "AFC Isiu SW: Activating",
        CACHE_NAME
    );

    event.waitUntil(

        caches.keys()

            .then(cacheNames => {

                return Promise.all(

                    cacheNames

                        .filter(
                            cacheName =>
                                cacheName !== CACHE_NAME
                        )

                        .map(
                            cacheName => {

                                console.log(
                                    "AFC Isiu SW: Removing old cache:",
                                    cacheName
                                );

                                return caches.delete(
                                    cacheName
                                );

                            }
                        )

                );

            })

            .then(() => {

                return self.clients.claim();

            })

    );

});

/* =========================================================
   FETCH
========================================================= */

self.addEventListener("fetch", event => {

    const request = event.request;

    /* Only handle GET requests */

    if (request.method !== "GET") {
        return;
    }

    /* =====================================================
       PAGE NAVIGATION
    ===================================================== */

    if (request.mode === "navigate") {

        event.respondWith(

            fetch(request)

                .then(response => {

                    /*
                    Save successful HTML pages
                    for future offline use.
                    */

                    const responseClone =
                        response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => {

                            cache.put(
                                request,
                                responseClone
                            );

                        });

                    return response;

                })

                .catch(() => {

                    /*
                    NETWORK FAILED
                    */

                    return caches.match(
                        request
                    )

                    .then(cachedPage => {

                        if (cachedPage) {
                            return cachedPage;
                        }

                        /*
                        If the exact requested page
                        isn't cached, return homepage.
                        */

                        return caches.match(
                            "/index.html"
                        );

                    });

                })

        );

        return;
    }

    /* =====================================================
       OTHER FILES
       CACHE FIRST
    ===================================================== */

    event.respondWith(

        caches.match(request)

            .then(cachedResponse => {

                if (cachedResponse) {

                    return cachedResponse;

                }

                return fetch(request)

                    .then(response => {

                        /*
                        Only cache successful responses.
                        */

                        if (
                            response &&
                            response.status === 200 &&
                            response.type !== "opaque"
                        ) {

                            const responseClone =
                                response.clone();

                            caches.open(CACHE_NAME)
                                .then(cache => {

                                    cache.put(
                                        request,
                                        responseClone
                                    );

                                });

                        }

                        return response;

                    });

            })

    );

});
