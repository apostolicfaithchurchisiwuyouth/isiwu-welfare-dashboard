/* =========================================================
   AFC ISIU YOUTH PORTAL
   SERVICE WORKER
   PWA CACHE + OFFLINE SUPPORT
   ========================================================= */

"use strict";


/* =========================================================
   CACHE VERSION
   ========================================================= */

const CACHE_VERSION = "afc-isiu-pwa-v9";

const STATIC_CACHE =
    `${CACHE_VERSION}-static`;

const PAGE_CACHE =
    `${CACHE_VERSION}-pages`;

const OFFLINE_CACHE =
    `${CACHE_VERSION}-offline`;


/* =========================================================
   OFFLINE PAGE
   ========================================================= */

const OFFLINE_PAGE =
    "/offline.html";


/* =========================================================
   APP SHELL
========================================================= */

const APP_SHELL = [

    "/",

    "/index.html",

    "/offline.html",

    "/manifest.json",

    /* =====================================================
       CSS
    ===================================================== */

    "/css/main.css",

    "/css/layout.css",

    "/css/lessons.css",

    "/css/pwa.css",


    /* =====================================================
       JAVASCRIPT
    ===================================================== */

    "/js/main.js",

    "/js/lessons.js",

    "/js/pwa.js",


    /* =====================================================
       BRAND
    ===================================================== */

    "/images/logo.png"

];


/* =========================================================
   INSTALL
========================================================= */

self.addEventListener(
    "install",
    event => {

        console.log(
            "AFC Isiu PWA: Installing:",
            CACHE_VERSION
        );


        event.waitUntil(

            (async () => {

                try {

                    const staticCache =
                        await caches.open(
                            STATIC_CACHE
                        );


                    /*
                     * Cache app-shell files individually.
                     *
                     * This is intentional.
                     *
                     * If one file is unavailable,
                     * the remaining files can still
                     * be cached.
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
                                response &&
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
                                    response
                                        ? response.status
                                        : "No response"
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
                     * Activate immediately.
                     */

                    await self.skipWaiting();


                    console.log(
                        "AFC Isiu PWA: Installation complete."
                    );

                }

                catch (error) {

                    console.error(
                        "AFC Isiu PWA: Installation error:",
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

                try {

                    const cacheNames =
                        await caches.keys();


                    await Promise.all(

                        cacheNames.map(
                            cacheName => {

                                /*
                                 * Remove previous AFC
                                 * PWA cache versions.
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
                                        "AFC Isiu PWA: Removing old cache:",
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
                        "AFC Isiu PWA: Activated:",
                        CACHE_VERSION
                    );

                }

                catch (error) {

                    console.error(
                        "AFC Isiu PWA: Activation error:",
                        error
                    );

                }

            })()

        );

    }
);


/* =========================================================
   MESSAGE HANDLER
========================================================= */

self.addEventListener(
    "message",
    event => {

        if (
            !event.data
        ) {

            return;

        }


        if (
            event.data.type ===
                "SKIP_WAITING"
        ) {

            console.log(
                "AFC Isiu PWA: SKIP_WAITING received."
            );


            self.skipWaiting();

        }

    }
);


/* =========================================================
   FETCH HANDLER
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
            request.method !==
                "GET"
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
         * Do not intercept:
         *
         * - Google Apps Script
         * - Google Sheets
         * - Google APIs
         * - Google Fonts
         * - CDNs
         * - Font Awesome
         * - PapaParse
         * - other external resources
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
         * Audio files are intentionally NOT cached.
         */

        if (
            url.pathname.startsWith(
                "/audio/"
            )
        ) {

            event.respondWith(

                fetch(
                    request
                )

            );

            return;

        }


        /*
         * =================================================
         * PAGE NAVIGATION
         * =================================================
         */

        if (
            request.mode ===
                "navigate"
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
     * =====================================================
     * NETWORK FIRST
     * =====================================================
     *
     * Always attempt to load the newest page first.
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
             * Save the newest page.
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
     * =====================================================
     * PAGE CACHE FALLBACK
     * =====================================================
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
     * =====================================================
     * APP SHELL FALLBACK
     * =====================================================
     */

    const shellPage =
        await caches.match(
            request
        );


    if (
        shellPage
    ) {

        return shellPage;

    }


    /*
     * =====================================================
     * ROOT FALLBACK
     * =====================================================
     */

    const rootPage =
        await caches.match(
            "/"
        );


    if (
        rootPage
    ) {

        return rootPage;

    }


    /*
     * =====================================================
     * OFFLINE PAGE
     * =====================================================
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
     * =====================================================
     * FINAL FALLBACK
     * =====================================================
     */

    return createOfflineResponse();

}


/* =========================================================
   ASSET HANDLER
========================================================= */

async function handleAsset(
    request
) {

    /*
     * =====================================================
     * NETWORK FIRST
     * =====================================================
     *
     * This is important for development.
     *
     * Updated:
     *
     * - CSS
     * - JS
     * - images
     * - manifest
     *
     * are obtained from the network whenever possible.
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
     * =====================================================
     * CACHE FALLBACK
     * =====================================================
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
     * =====================================================
     * NO CACHE
     * =====================================================
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


/* =========================================================
   OFFLINE RESPONSE
========================================================= */

function createOfflineResponse() {

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

            <meta
                name="theme-color"
                content="#ea580c"
            >

            <title>
                Offline | AFC Isiu Youth Portal
            </title>

            <style>

                * {
                    box-sizing: border-box;
                }

                body {

                    margin: 0;

                    min-height: 100vh;

                    display: flex;

                    align-items: center;

                    justify-content: center;

                    padding: 24px;

                    font-family:
                        Arial,
                        sans-serif;

                    text-align: center;

                    background:
                        #0a0016;

                    color:
                        #ffffff;

                }

                .offline-box {

                    width: 100%;

                    max-width: 420px;

                }

                .offline-icon {

                    width: 72px;

                    height: 72px;

                    margin:
                        0 auto 24px;

                    border-radius: 20px;

                    display: flex;

                    align-items: center;

                    justify-content: center;

                    background:
                        #ea580c;

                    font-size: 32px;

                }

                h1 {

                    margin:
                        0 0 12px;

                    font-size: 28px;

                }

                p {

                    margin: 0;

                    opacity: 0.8;

                    line-height: 1.6;

                    font-size: 15px;

                }

                button {

                    margin-top: 24px;

                    padding:
                        12px 20px;

                    border: 0;

                    border-radius: 10px;

                    background:
                        #ea580c;

                    color:
                        #ffffff;

                    font-weight: 600;

                    cursor: pointer;

                }

            </style>

        </head>

        <body>

            <main class="offline-box">

                <div
                    class="offline-icon"
                    aria-hidden="true"
                >
                    ↻
                </div>

                <h1>
                    You're offline
                </h1>

                <p>
                    Please reconnect to the internet
                    and try again.
                </p>

                <button
                    type="button"
                    onclick="location.reload()"
                >
                    Try Again
                </button>

            </main>

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
