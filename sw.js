/* =========================================================
   AFC ISIU YOUTH PORTAL
   SERVICE WORKER
   PHASE 3 — SELECTIVE OFFLINE MODE
========================================================= */


/* =========================================================
   CACHE VERSION
========================================================= */

const CACHE_NAME = "afc-isiu-pwa-v3";


/* =========================================================
   APP SHELL
   These are the essential files needed for the portal
   to open and function offline.
========================================================= */

const APP_SHELL = [

    "/",
    "/index.html",

    "/manifest.json",

    "/css/main.css",
    "/css/layout.css",

    "/js/main.js",
    "/js/pwa.js"

];


/* =========================================================
   OFFLINE FALLBACK
========================================================= */

const OFFLINE_PAGE = "/index.html";


/* =========================================================
   INSTALL
========================================================= */

self.addEventListener("install", event => {

    console.log(
        "AFC Isiu PWA v3: Installing..."
    );


    event.waitUntil(

        caches.open(CACHE_NAME)

            .then(cache => {

                return cache.addAll(APP_SHELL);

            })

            .then(() => {

                console.log(
                    "AFC Isiu PWA v3: App shell cached."
                );

                return self.skipWaiting();

            })

    );

});


/* =========================================================
   ACTIVATE
========================================================= */

self.addEventListener("activate", event => {

    console.log(
        "AFC Isiu PWA v3: Activating..."
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

                        .map(cacheName => {

                            console.log(
                                "Deleting old cache:",
                                cacheName
                            );

                            return caches.delete(
                                cacheName
                            );

                        })

                );

            })

            .then(() => {

                return self.clients.claim();

            })

            .then(() => {

                console.log(
                    "AFC Isiu PWA v3: Activated."
                );

            })

    );

});


/* =========================================================
   FETCH HANDLER
========================================================= */

self.addEventListener("fetch", event => {

    const request = event.request;


    /* -----------------------------------------------------
       Only handle GET requests
    ----------------------------------------------------- */

    if (request.method !== "GET") {
        return;
    }


    const url = new URL(request.url);


    /* -----------------------------------------------------
       Ignore browser extensions and unsupported schemes
    ----------------------------------------------------- */

    if (
        url.protocol !== "http:" &&
        url.protocol !== "https:"
    ) {
        return;
    }


    /* =====================================================
       HTML / PAGE NAVIGATION
       
       Network first:
       - Get the newest page when online.
       - Fall back to cached page when offline.
    ===================================================== */

    if (request.mode === "navigate") {

        event.respondWith(

            fetch(request)

                .then(response => {

                    /*
                     Save a fresh copy of the page.
                    */

                    if (
                        response &&
                        response.status === 200
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

                })

                .catch(() => {

                    return caches.match(request)

                        .then(cachedPage => {

                            if (cachedPage) {

                                return cachedPage;

                            }


                            return caches.match(
                                OFFLINE_PAGE
                            );

                        });

                })

        );

        return;
    }


    /* =====================================================
       GOOGLE SHEETS / EXTERNAL LESSON DATA
       
       Network first:
       - Always try to get fresh lesson data.
       - Save the latest successful copy.
       - If offline, use the previously cached copy.
    ===================================================== */

    if (
        url.hostname === "docs.google.com" ||
        url.hostname === "docs.googleusercontent.com"
    ) {

        event.respondWith(

            fetch(request)

                .then(response => {

                    if (
                        response &&
                        response.status === 200
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

                })

                .catch(() => {

                    return caches.match(request);

                })

        );

        return;
    }


    /* =====================================================
       SAME-ORIGIN STATIC FILES
       
       Cache first:
       - CSS
       - JavaScript
       - Images
       - Icons
       - Fonts
       - Other static resources
       
       If not cached, fetch from network and save.
    ===================================================== */

    if (url.origin === self.location.origin) {

        event.respondWith(

            caches.match(request)

                .then(cachedResponse => {

                    if (cachedResponse) {

                        return cachedResponse;

                    }


                    return fetch(request)

                        .then(response => {

                            if (
                                response &&
                                response.status === 200
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

        return;
    }


    /* =====================================================
       OTHER EXTERNAL GET REQUESTS
       
       Let them go normally.
       
       We don't want the service worker blindly caching
       every external resource.
    ===================================================== */

});
