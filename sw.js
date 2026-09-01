/* =========================================================
   AFC ISIU YOUTH PORTAL
   SERVICE WORKER
   PWA CACHE + OFFLINE SUPPORT
========================================================= */

"use strict";


/* =========================================================
   CACHE VERSION
========================================================= */

const CACHE_VERSION = "afc-isiu-pwa-v6";

const STATIC_CACHE = `${CACHE_VERSION}-static`;

const PAGE_CACHE = `${CACHE_VERSION}-pages`;

const OFFLINE_CACHE = `${CACHE_VERSION}-offline`;


/* =========================================================
   APP SHELL
========================================================= */

const APP_SHELL = [

    "/",

    "/index.html",

    "/offline.html",

    "/manifest.json",

    /* Main CSS */

    "/css/main.css",

    "/css/layout.css",

    /* Lessons CSS */

    "/css/lessons.css",

    /* Main JavaScript */

    "/js/main.js",

    /* Lessons JavaScript */

    "/js/lessons.js",

    /* PWA JavaScript */

    "/js/pwa.js",

    /* Logo */

    "/images/logo.png"

];


/* =========================================================
   OFFLINE PAGE
========================================================= */

const OFFLINE_PAGE = "/offline.html";


/* =========================================================
   INSTALL
========================================================= */

self.addEventListener(
    "install",
    event => {

        console.log(
            "AFC Isiu PWA: Installing service worker..."
        );


        event.waitUntil(

            Promise.all([

                caches
                    .open(STATIC_CACHE)
                    .then(cache => {

                        return cache.addAll(
                            APP_SHELL
                        );

                    }),

                caches
                    .open(OFFLINE_CACHE)
                    .then(cache => {

                        return cache.add(
                            OFFLINE_PAGE
                        );

                    })

            ])

            .then(() => {

                console.log(
                    "AFC Isiu PWA: Static files cached."
                );


                /*
                 * Activate the new service worker
                 * immediately.
                 */

                return self.skipWaiting();

            })

            .catch(error => {

                console.error(
                    "AFC Isiu PWA: Installation cache error:",
                    error
                );

                /*
                 * Do not prevent the service worker
                 * from installing if one optional
                 * shell file fails.
                 */

                return self.skipWaiting();

            })

        );

    }
);


/* =========================================================
   ACTIVATE
========================================================= */

self.addEventListener(
    "activate",
    event => {

        console.log(
            "AFC Isiu PWA: Activating service worker..."
        );


        event.waitUntil(

            caches.keys()

                .then(cacheNames => {

                    return Promise.all(

                        cacheNames

                            .filter(cacheName => {

                                return (

                                    cacheName.startsWith(
                                        "afc-isiu-pwa-"
                                    )

                                    &&

                                    cacheName !==
                                        STATIC_CACHE

                                    &&

                                    cacheName !==
                                        PAGE_CACHE

                                    &&

                                    cacheName !==
                                        OFFLINE_CACHE

                                );

                            })

                            .map(cacheName => {

                                console.log(
                                    "AFC Isiu PWA: Deleting old cache:",
                                    cacheName
                                );


                                return caches.delete(
                                    cacheName
                                );

                            })

                    );

                })

                .then(() => {

                    console.log(
                        "AFC Isiu PWA: Service worker activated."
                    );


                    /*
                     * Take control of all open pages.
                     */

                    return self.clients.claim();

                })

        );

    }
);


/* =========================================================
   FETCH
========================================================= */

self.addEventListener(
    "fetch",
    event => {

        const request =
            event.request;


        /*
         * Only handle GET requests.
         */

        if (
            request.method !== "GET"
        ) {

            return;

        }


        const url =
            new URL(request.url);


        /*
         * VERY IMPORTANT:
         *
         * Never intercept requests to:
         *
         * - Google Sheets
         * - Google Fonts
         * - PapaParse CDN
         * - Font Awesome
         * - Remix Icons
         * - Other external services
         *
         * The browser should communicate with
         * those services directly.
         */

        if (
            url.origin !==
            self.location.origin
        ) {

            return;

        }


        /*
         * PAGE NAVIGATION
         */

        if (
            request.mode === "navigate"
        ) {

            event.respondWith(
                handleNavigation(request)
            );

            return;

        }


        /*
         * LOCAL ASSETS
         */

        event.respondWith(
            handleAsset(request)
        );

    }
);


/* =========================================================
   NAVIGATION HANDLER
========================================================= */

async function handleNavigation(request) {

    const pageCache =
        await caches.open(
            PAGE_CACHE
        );


    /*
     * FIRST:
     *
     * Try the network.
     *
     * This is important because it means
     * updated HTML is preferred whenever
     * the user is online.
     */

    try {

        const networkResponse =
            await fetch(request);


        if (
            networkResponse &&
            networkResponse.ok
        ) {

            /*
             * Save the latest page.
             */

            await pageCache.put(
                request,
                networkResponse.clone()
            );

            return networkResponse;

        }

    }

    catch (error) {

        console.log(
            "AFC Isiu PWA: Network unavailable."
        );

    }


    /*
     * SECOND:
     *
     * Use cached page if available.
     */

    const cachedPage =
        await pageCache.match(
            request
        );


    if (cachedPage) {

        return cachedPage;

    }


    /*
     * THIRD:
     *
     * Try static cache.
     */

    const staticPage =
        await caches.match(
            request
        );


    if (staticPage) {

        return staticPage;

    }


    /*
     * FOURTH:
     *
     * Show offline page.
     */

    const offlineCache =
        await caches.open(
            OFFLINE_CACHE
        );


    const offlinePage =
        await offlineCache.match(
            OFFLINE_PAGE
        );


    if (offlinePage) {

        return offlinePage;

    }


    /*
     * LAST RESORT
     */

    return new Response(

        `
        <!DOCTYPE html>

        <html lang="en">

        <head>

            <meta charset="UTF-8">

            <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
            >

            <title>Offline | AFC Isiu Youth Portal</title>

        </head>

        <body>

            <h1>You're offline</h1>

            <p>
                Please reconnect to the internet
                and try again.
            </p>

        </body>

        </html>
        `,

        {

            status: 503,

            headers: {

                "Content-Type":
                    "text/html; charset=UTF-8"

            }

        }

    );

}


/* =========================================================
   ASSET HANDLER
========================================================= */

async function handleAsset(request) {

    /*
     * FIRST:
     *
     * Look in cache.
     */

    const cachedResponse =
        await caches.match(
            request
        );


    if (cachedResponse) {

        /*
         * For important JS/CSS files we still
         * prefer the network when online.
         *
         * However, the cached version gives us
         * offline support.
         */

        try {

            const networkResponse =
                await fetch(request);


            if (
                networkResponse &&
                networkResponse.ok
            ) {

                const cache =
                    await caches.open(
                        STATIC_CACHE
                    );


                await cache.put(
                    request,
                    networkResponse.clone()
                );


                return networkResponse;

            }

        }

        catch (error) {

            /*
             * Network unavailable.
             *
             * Return cached asset.
             */

            return cachedResponse;

        }


        return cachedResponse;

    }


    /*
     * SECOND:
     *
     * Try network.
     */

    try {

        const networkResponse =
            await fetch(request);


        if (
            networkResponse &&
            networkResponse.ok
        ) {

            const cache =
                await caches.open(
                    STATIC_CACHE
                );


            await cache.put(
                request,
                networkResponse.clone()
            );

        }


        return networkResponse;

    }

    catch (error) {

        console.log(
            "AFC Isiu PWA: Asset unavailable:",
            request.url
        );


        /*
         * Let the browser handle the failure.
         */

        throw error;

    }

}
