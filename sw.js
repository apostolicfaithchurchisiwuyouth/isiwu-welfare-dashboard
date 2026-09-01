/* =========================================================
   AFC ISIU YOUTH PORTAL
   SERVICE WORKER
   PWA CACHE + OFFLINE SUPPORT
   ========================================================= */

"use strict";


/* =========================================================
   CACHE VERSION
========================================================= */

const CACHE_VERSION = "afc-isiu-pwa-v8";

const STATIC_CACHE =
    `${CACHE_VERSION}-static`;

const PAGE_CACHE =
    `${CACHE_VERSION}-pages`;

const AUDIO_CACHE =
    `${CACHE_VERSION}-audio`;

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
            "AFC Isiu PWA: Installing v8..."
        );


        event.waitUntil(

            Promise.all([

                caches
                    .open(STATIC_CACHE)
                    .then(cache => {

                        return Promise.all(

                            APP_SHELL.map(
                                async file => {

                                    try {

                                        const response =
                                            await fetch(
                                                file,
                                                {
                                                    cache:
                                                        "no-cache"
                                                }
                                            );


                                        if (
                                            response.ok
                                        ) {

                                            await cache.put(
                                                file,
                                                response
                                            );

                                        }

                                    }

                                    catch (error) {

                                        console.warn(
                                            "Could not cache:",
                                            file,
                                            error
                                        );

                                    }

                                }
                            )

                        );

                    }),


                caches
                    .open(OFFLINE_CACHE)
                    .then(async cache => {

                        try {

                            const response =
                                await fetch(
                                    OFFLINE_PAGE,
                                    {
                                        cache:
                                            "no-cache"
                                    }
                                );


                            if (response.ok) {

                                await cache.put(
                                    OFFLINE_PAGE,
                                    response
                                );

                            }

                        }

                        catch (error) {

                            console.warn(
                                "Could not cache offline page:",
                                error
                            );

                        }

                    })

            ])

            .then(() => {

                console.log(
                    "AFC Isiu PWA: Installation complete."
                );


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
            "AFC Isiu PWA: Activating v8..."
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
                                        AUDIO_CACHE

                                    &&

                                    cacheName !==
                                        OFFLINE_CACHE

                                );

                            })

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

                    console.log(
                        "AFC Isiu PWA: v8 activated."
                    );


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
         * Only handle files hosted
         * on AFC Isiu's own domain.
         */

        if (
            url.origin !==
            self.location.origin
        ) {

            return;

        }


        /* -----------------------------------------------
           AUDIO
        ------------------------------------------------ */

        if (
            isAudioRequest(url)
        ) {

            event.respondWith(
                handleAudio(request)
            );

            return;

        }


        /* -----------------------------------------------
           PAGE NAVIGATION
        ------------------------------------------------ */

        if (
            request.mode === "navigate"
        ) {

            event.respondWith(
                handleNavigation(request)
            );

            return;

        }


        /* -----------------------------------------------
           NORMAL LOCAL ASSETS
        ------------------------------------------------ */

        event.respondWith(
            handleAsset(request)
        );

    }
);


/* =========================================================
   AUDIO DETECTION
========================================================= */

function isAudioRequest(url) {

    return (
        /\.(mp3|wav|ogg|m4a|aac)$/i
            .test(url.pathname)
    );

}


/* =========================================================
   AUDIO HANDLER
========================================================= */

async function handleAudio(request) {

    const audioCache =
        await caches.open(
            AUDIO_CACHE
        );


    /*
     * Try network first.
     *
     * This means a newly uploaded/replaced
     * audio file can update normally.
     */

    try {

        const networkResponse =
            await fetch(
                request
            );


        if (
            networkResponse &&
            networkResponse.ok
        ) {

            await audioCache.put(
                request,
                networkResponse.clone()
            );


            console.log(
                "AFC Isiu PWA: Audio cached:",
                request.url
            );


            return networkResponse;

        }

    }

    catch (error) {

        console.log(
            "AFC Isiu PWA: Audio network unavailable."
        );

    }


    /*
     * If offline, use cached audio.
     */

    const cachedResponse =
        await audioCache.match(
            request
        );


    if (cachedResponse) {

        return cachedResponse;

    }


    /*
     * Audio doesn't exist in cache.
     */

    return new Response(
        "Audio unavailable.",
        {
            status: 404,
            headers: {
                "Content-Type":
                    "text/plain"
            }
        }
    );

}


/* =========================================================
   NAVIGATION HANDLER
========================================================= */

async function handleNavigation(request) {

    const pageCache =
        await caches.open(
            PAGE_CACHE
        );


    /*
     * NETWORK FIRST
     */

    try {

        const networkResponse =
            await fetch(
                request,
                {
                    cache:
                        "no-cache"
                }
            );


        if (
            networkResponse &&
            networkResponse.ok
        ) {

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
     * CACHE SECOND
     */

    const cachedPage =
        await pageCache.match(
            request
        );


    if (cachedPage) {

        return cachedPage;

    }


    /*
     * APP SHELL CACHE
     */

    const staticPage =
        await caches.match(
            request
        );


    if (staticPage) {

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

            <title>
                Offline | AFC Isiu Youth Portal
            </title>

        </head>

        <body>

            <h1>
                You're offline
            </h1>

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

    const staticCache =
        await caches.open(
            STATIC_CACHE
        );


    /*
     * NETWORK FIRST
     *
     * This is particularly important for:
     *
     * lessons.js
     * main.js
     * CSS
     * HTML-related assets
     */

    try {

        const networkResponse =
            await fetch(
                request,
                {
                    cache:
                        "no-cache"
                }
            );


        if (
            networkResponse &&
            networkResponse.ok
        ) {

            await staticCache.put(
                request,
                networkResponse.clone()
            );


            return networkResponse;

        }

    }

    catch (error) {

        console.log(
            "AFC Isiu PWA: Asset network unavailable."
        );

    }


    /*
     * FALL BACK TO CACHE
     */

    const cachedResponse =
        await staticCache.match(
            request
        );


    if (cachedResponse) {

        return cachedResponse;

    }


    /*
     * Try all caches as a final fallback.
     */

    const anyCachedResponse =
        await caches.match(
            request
        );


    if (anyCachedResponse) {

        return anyCachedResponse;

    }


    /*
     * Nothing available.
     */

    return new Response(
        "Asset unavailable.",
        {
            status: 404,
            headers: {
                "Content-Type":
                    "text/plain"
            }
        }
    );

}
