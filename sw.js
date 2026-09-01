/* =========================================================
   AFC ISIU YOUTH PORTAL
   SERVICE WORKER
   PWA CACHE + OFFLINE SUPPORT
   ========================================================= */

"use strict";


/* =========================================================
   CACHE VERSION
   CHANGE THIS EVERY TIME YOU MAKE A MAJOR PWA UPDATE
========================================================= */

const CACHE_VERSION = "afc-isiu-pwa-v8";

const STATIC_CACHE =
    `${CACHE_VERSION}-static`;

const PAGE_CACHE =
    `${CACHE_VERSION}-pages`;

const OFFLINE_CACHE =
    `${CACHE_VERSION}-offline`;


/* =========================================================
   APP SHELL
========================================================= */

const APP_SHELL = [

    "/",

    "/index.html",

    "/offline.html",

    "/manifest.json",

    /* CSS */

    "/css/main.css",

    "/css/layout.css",

    "/css/lessons.css",

    /* JavaScript */

    "/js/main.js",

    "/js/lessons.js",

    "/js/pwa.js",

    /* Images */

    "/images/logo.png"

];


/* =========================================================
   OFFLINE PAGE
========================================================= */

const OFFLINE_PAGE =
    "/offline.html";


/* =========================================================
   INSTALL
========================================================= */

self.addEventListener(
    "install",
    event => {

        console.log(
            "AFC Isiu PWA: Installing service worker:",
            CACHE_VERSION
        );


        event.waitUntil(

            (async () => {

                try {

                    /*
                     * Open static cache.
                     */

                    const staticCache =
                        await caches.open(
                            STATIC_CACHE
                        );


                    /*
                     * Cache files individually.
                     *
                     * This is safer than cache.addAll()
                     * because one missing file will not
                     * destroy the whole installation.
                     */

                    for (
                        const file of APP_SHELL
                    ) {

                        try {

                            const response =
                                await fetch(
                                    file,
                                    {
                                        cache: "no-store"
                                    }
                                );


                            if (
                                response.ok
                            ) {

                                await staticCache.put(
                                    file,
                                    response.clone()
                                );

                                console.log(
                                    "AFC Isiu PWA: Cached:",
                                    file
                                );

                            }

                            else {

                                console.warn(
                                    "AFC Isiu PWA: Could not cache:",
                                    file,
                                    response.status
                                );

                            }

                        }

                        catch (error) {

                            console.warn(
                                "AFC Isiu PWA: Cache failed:",
                                file,
                                error
                            );

                        }

                    }


                    /*
                     * Offline page.
                     */

                    const offlineCache =
                        await caches.open(
                            OFFLINE_CACHE
                        );


                    try {

                        const offlineResponse =
                            await fetch(
                                OFFLINE_PAGE,
                                {
                                    cache: "no-store"
                                }
                            );


                        if (
                            offlineResponse.ok
                        ) {

                            await offlineCache.put(
                                OFFLINE_PAGE,
                                offlineResponse.clone()
                            );

                        }

                    }

                    catch (error) {

                        console.warn(
                            "AFC Isiu PWA: Offline page cache failed.",
                            error
                        );

                    }


                    /*
                     * Activate immediately.
                     */

                    await self.skipWaiting();


                    console.log(
                        "AFC Isiu PWA: Installation complete."
                    );

                }

                catch (error) {

                    console.error(
                        "AFC Isiu PWA: Installation failed:",
                        error
                    );

                }

            })()

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
            "AFC Isiu PWA: Activating:",
            CACHE_VERSION
        );


        event.waitUntil(

            (async () => {

                const cacheNames =
                    await caches.keys();


                await Promise.all(

                    cacheNames.map(
                        cacheName => {

                            /*
                             * Delete every old AFC cache.
                             */

                            if (
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
                            ) {

                                console.log(
                                    "AFC Isiu PWA: Deleting old cache:",
                                    cacheName
                                );


                                return caches.delete(
                                    cacheName
                                );

                            }


                            return Promise.resolve();

                        }
                    )

                );


                /*
                 * Take control immediately.
                 */

                await self.clients.claim();


                console.log(
                    "AFC Isiu PWA: Service worker activated:",
                    CACHE_VERSION
                );

            })()

        );

    }
);


/* =========================================================
   MESSAGE HANDLER
   Allows the website to tell the service worker
   to activate immediately.
========================================================= */

self.addEventListener(
    "message",
    event => {

        if (
            event.data &&
            event.data.type ===
                "SKIP_WAITING"
        ) {

            self.skipWaiting();

        }

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
         * Only GET requests.
         */

        if (
            request.method !== "GET"
        ) {

            return;

        }


        const url =
            new URL(
                request.url
            );


        /*
         * =================================================
         * EXTERNAL REQUESTS
         * =================================================
         *
         * Do NOT intercept:
         *
         * - Google Sheets
         * - Google APIs
         * - Google Fonts
         * - CDN resources
         * - PapaParse
         * - Font Awesome
         * - other external services
         */

        if (
            url.origin !==
            self.location.origin
        ) {

            return;

        }


        /*
         * =================================================
         * AUDIO
         * =================================================
         *
         * Do not cache lesson audio automatically.
         *
         * This means:
         *
         * /audio/Senior-77.mp3
         *
         * is fetched directly from Vercel.
         */

        if (
            url.pathname.startsWith(
                "/audio/"
            )
        ) {

            event.respondWith(
                fetch(request)
            );

            return;

        }


        /*
         * =================================================
         * PAGE NAVIGATION
         * =================================================
         */

        if (
            request.mode === "navigate"
        ) {

            event.respondWith(
                handleNavigation(
                    request
                )
            );

            return;

        }


        /*
         * =================================================
         * LOCAL ASSETS
         * =================================================
         */

        event.respondWith(
            handleAsset(
                request
            )
        );

    }
);


/* =========================================================
   NAVIGATION HANDLER
========================================================= */

async function handleNavigation(
    request
) {

    const pageCache =
        await caches.open(
            PAGE_CACHE
        );


    /*
     * NETWORK FIRST
     *
     * Always try to obtain the latest
     * version of the page.
     */

    try {

        const networkResponse =
            await fetch(
                request,
                {
                    cache: "no-store"
                }
            );


        if (
            networkResponse &&
            networkResponse.ok
        ) {

            /*
             * Save latest page.
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
            "AFC Isiu PWA: Navigation network unavailable."
        );

    }


    /*
     * CACHE FALLBACK
     */

    const cachedPage =
        await pageCache.match(
            request
        );


    if (
        cachedPage
    ) {

        return cachedPage;

    }


    /*
     * APP SHELL FALLBACK
     */

    const staticPage =
        await caches.match(
            request
        );


    if (
        staticPage
    ) {

        return staticPage;

    }


    /*
     * OFFLINE PAGE
     */

    const offlineCache =
        await caches.open(
            OFFLINE_CACHE
        );


    const offlinePage =
        await offlineCache.match(
            OFFLINE_PAGE
        );


    if (
        offlinePage
    ) {

        return offlinePage;

    }


    /*
     * FINAL FALLBACK
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

            <title>
                Offline | AFC Isiu Youth Portal
            </title>

            <style>

                body {

                    margin: 0;

                    min-height: 100vh;

                    display: flex;

                    align-items: center;

                    justify-content: center;

                    padding: 24px;

                    box-sizing: border-box;

                    font-family:
                        Arial,
                        sans-serif;

                    text-align: center;

                    background:
                        #0a0016;

                    color: white;

                }

                .offline-box {

                    max-width: 420px;

                }

                h1 {

                    margin-bottom: 12px;

                }

                p {

                    opacity: 0.8;

                    line-height: 1.6;

                }

            </style>

        </head>

        <body>

            <div class="offline-box">

                <h1>
                    You're offline
                </h1>

                <p>
                    Please reconnect to the internet
                    and try again.
                </p>

            </div>

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

async function handleAsset(
    request
) {

    /*
     * IMPORTANT:
     *
     * NETWORK FIRST.
     *
     * This makes updated lessons.js,
     * CSS and other assets available
     * without waiting for an old cache.
     */

    try {

        const networkResponse =
            await fetch(
                request,
                {
                    cache: "no-store"
                }
            );


        if (
            networkResponse &&
            networkResponse.ok
        ) {

            const staticCache =
                await caches.open(
                    STATIC_CACHE
                );


            await staticCache.put(
                request,
                networkResponse.clone()
            );


            return networkResponse;

        }

    }

    catch (error) {

        console.log(
            "AFC Isiu PWA: Asset network unavailable:",
            request.url
        );

    }


    /*
     * NETWORK FAILED.
     *
     * Use cached version.
     */

    const cachedResponse =
        await caches.match(
            request
        );


    if (
        cachedResponse
    ) {

        return cachedResponse;

    }


    /*
     * Nothing available.
     */

    return new Response(
        "",
        {
            status: 504,
            statusText:
                "Gateway Timeout"
        }
    );

}
