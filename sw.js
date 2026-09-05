/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: sw.js
   PURPOSE: PWA SERVICE WORKER
   VERSION: 17
   ============================================================ */

"use strict";


/* ============================================================
   CACHE VERSION
   ============================================================ */

const CACHE_VERSION =
    "afc-isiu-pwa-v17";

const STATIC_CACHE =
    `${CACHE_VERSION}-static`;

const PAGE_CACHE =
    `${CACHE_VERSION}-pages`;

const AUDIO_CACHE =
    `${CACHE_VERSION}-audio`;


/* ============================================================
   APPLICATION SHELL
   ============================================================ */

const APP_SHELL = [

    "/",
    "/index.html",
    "/manifest.json",

    /* Global CSS */
    "/css/main.css",
    "/css/layout.css",

    /* Lessons CSS */
    "/css/lessons.css",

    /* Global JS */
    "/js/main.js",
    "/js/pwa.js",

    /* Lessons JS */
    "/js/lessons.js",

    /* Branding */
    "/images/logo.png",

    /* Lessons page */
    "/pages/lessons.html"

];


/* ============================================================
   OFFLINE PAGE ROUTES
   ============================================================ */

const CLEAN_PAGE_MAP = {

    "/pages/lessons":
        "/pages/lessons.html"

};


/* ============================================================
   INSTALL
   ============================================================ */

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

                    const cache =
                        await caches.open(
                            STATIC_CACHE
                        );


                    /*
                     * Cache application shell
                     * one file at a time.
                     */

                    for (
                        const file of APP_SHELL
                    ) {

                        try {

                            const response =
                                await fetch(
                                    file,
                                    {
                                        cache:
                                            "no-store"
                                    }
                                );


                            if (
                                response &&
                                response.ok
                            ) {

                                await cache.put(
                                    file,
                                    response.clone()
                                );


                                console.log(
                                    "AFC Isiu PWA: Cached:",
                                    file
                                );

                            }

                        }

                        catch (error) {

                            console.warn(
                                "AFC Isiu PWA: Could not cache:",
                                file,
                                error
                            );

                        }

                    }


                    /*
                     * ------------------------------------------------
                     * CACHE CLEAN LESSON URL
                     * ------------------------------------------------
                     */

                    try {

                        const lessonPage =
                            await cache.match(
                                "/pages/lessons.html"
                            );


                        if (
                            lessonPage
                        ) {

                            await cache.put(
                                "/pages/lessons",
                                lessonPage.clone()
                            );


                            console.log(
                                "AFC Isiu PWA: Cached clean lesson URL:",
                                "/pages/lessons"
                            );

                        }

                    }

                    catch (error) {

                        console.warn(
                            "AFC Isiu PWA: Could not cache clean lesson URL:",
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


/* ============================================================
   ACTIVATE
   ============================================================ */

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
                             * Remove old AFC caches.
                             */

                            if (
                                cacheName.startsWith(
                                    "afc-isiu-pwa-"
                                ) &&

                                cacheName !==
                                    STATIC_CACHE &&

                                cacheName !==
                                    PAGE_CACHE &&

                                cacheName !==
                                    AUDIO_CACHE
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
                    "AFC Isiu PWA: Service worker activated."
                );

            })()

        );

    }

);


/* ============================================================
   MESSAGE HANDLER
   ============================================================ */

self.addEventListener(
    "message",
    event => {

        if (
            !event.data
        ) {

            return;

        }


        /*
         * Existing update mechanism.
         */

        if (
            event.data.type ===
            "SKIP_WAITING"
        ) {

            self.skipWaiting();

            return;

        }


        /*
         * LESSON AUDIO CACHE REQUEST
         */

        if (
            event.data.type ===
            "CACHE_LESSON_AUDIO"
        ) {

            const audioUrls =
                Array.isArray(
                    event.data.urls
                )
                    ? event.data.urls
                    : [];


            event.waitUntil(

                cacheLessonAudio(
                    audioUrls
                )

            );

        }

    }

);


/* ============================================================
   PUSH NOTIFICATIONS
   ============================================================ */

self.addEventListener(
    "push",
    event => {

        let data = {};


        /*
         * Read the push payload.
         */

        try {

            if (
                event.data
            ) {

                data =
                    event.data.json();

            }

        }

        catch (error) {

            console.warn(
                "AFC Isiu PWA: Invalid push JSON.",
                error
            );


            /*
             * Fallback for plain text.
             */

            try {

                data = {

                    body:
                        event.data
                            ? event.data.text()
                            : "You have a new notification."

                };

            }

            catch (textError) {

                data = {};

            }

        }


        /*
         * Notification content.
         */

        const title =
            String(
                data.title ||
                "AFC Isiu Youth Portal"
            );


        const body =
            String(
                data.body ||
                "You have a new notification."
            );


        const icon =
            String(
                data.icon ||
                "/images/logo.png"
            );


        const badge =
            String(
                data.badge ||
                "/images/logo.png"
            );


        const tag =
            String(
                data.tag ||
                "afc-isiu-notification"
            );


        /*
         * Only allow notification links
         * belonging to this portal.
         */

        let targetUrl = "/";


        try {

            const parsedUrl =
                new URL(
                    String(
                        data.url ||
                        "/"
                    ),
                    self.location.origin
                );


            if (
                parsedUrl.origin ===
                self.location.origin
            ) {

                targetUrl =
                    parsedUrl.pathname +
                    parsedUrl.search +
                    parsedUrl.hash;

            }

        }

        catch (error) {

            targetUrl = "/";

        }


        /*
         * Display notification.
         */

        event.waitUntil(

            self.registration.showNotification(
                title,
                {

                    body,

                    icon,

                    badge,

                    tag,

                    renotify:
                        Boolean(
                            data.renotify
                        ),

                    requireInteraction:
                        Boolean(
                            data.requireInteraction
                        ),

                    data: {

                        url:
                            targetUrl

                    }

                }
            )

        );

    }

);


/* ============================================================
   NOTIFICATION CLICK
   ============================================================ */

self.addEventListener(
    "notificationclick",
    event => {

        /*
         * Close the notification immediately.
         */

        event.notification.close();


        /*
         * Default destination.
         */

        let targetUrl =
            self.location.origin +
            "/";


        /*
         * Read notification destination.
         */

        try {

            const parsedUrl =
                new URL(

                    String(
                        event
                            .notification
                            ?.data
                            ?.url ||
                        "/"
                    ),

                    self.location.origin

                );


            /*
             * Only navigate to our own website.
             */

            if (
                parsedUrl.origin ===
                self.location.origin
            ) {

                targetUrl =
                    parsedUrl.href;

            }

        }

        catch (error) {

            console.warn(
                "AFC Isiu PWA: Invalid notification URL.",
                error
            );

        }


        event.waitUntil(

            (async () => {

                /*
                 * Look for an existing portal window.
                 */

                const clients =
                    await self.clients.matchAll(
                        {
                            type:
                                "window",

                            includeUncontrolled:
                                true
                        }
                    );


                /*
                 * If portal is already open,
                 * navigate/focus it.
                 */

                for (
                    const client of clients
                ) {

                    try {

                        if (
                            typeof client.navigate ===
                            "function"
                        ) {

                            await client.navigate(
                                targetUrl
                            );

                        }

                    }

                    catch (error) {

                        console.warn(
                            "AFC Isiu PWA: Could not navigate existing window.",
                            error
                        );

                    }


                    if (
                        typeof client.focus ===
                        "function"
                    ) {

                        return client.focus();

                    }

                }


                /*
                 * Otherwise open a new portal window.
                 */

                if (
                    typeof self.clients.openWindow ===
                    "function"
                ) {

                    return self.clients.openWindow(
                        targetUrl
                    );

                }


                return undefined;

            })()

        );

    }

);


/* ============================================================
   FETCH
   ============================================================ */

self.addEventListener(
    "fetch",
    event => {

        const request =
            event.request;


        /*
         * ========================================================
         * IMPORTANT:
         * NEVER INTERCEPT API REQUESTS
         * ========================================================
         *
         * Vercel API routes such as:
         *
         *   /api/push/config
         *   /api/push/send
         *   /api/push/status
         *   /api/push/schedules
         *   /api/push/history
         *   /api/push/run
         *
         * must always go directly to the network.
         *
         * We deliberately do NOT call event.respondWith()
         * for these requests.
         *
         * This prevents the generic offline asset handler
         * from turning API failures into:
         *
         *   503 Offline
         *
         * ========================================================
         */

        let url;

        try {

            url =
                new URL(
                    request.url
                );

        }

        catch (error) {

            return;

        }


        if (
            url.origin ===
                self.location.origin &&

            url.pathname.startsWith(
                "/api/"
            )
        ) {

            console.log(
                "AFC Isiu PWA: API request bypassing service worker:",
                url.pathname
            );


            return;

        }


        /*
         * Only GET requests below this point.
         */

        if (
            request.method !== "GET"
        ) {

            return;

        }


        /* ========================================================
           EXTERNAL ORIGINS
        ======================================================== */

        /*
         * Google Sheets, Google Fonts,
         * Font Awesome, jsDelivr, etc.
         *
         * These are intentionally not intercepted.
         */

        if (
            url.origin !==
            self.location.origin
        ) {

            return;

        }


        /* ========================================================
           AUDIO
        ======================================================== */

        if (
            url.pathname.startsWith(
                "/audio/"
            )
        ) {

            event.respondWith(

                handleAudio(
                    request
                )

            );

            return;

        }


        /* ========================================================
           NAVIGATION
        ======================================================== */

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


        /* ========================================================
           OTHER ASSETS
        ======================================================== */

        event.respondWith(

            handleAsset(
                request
            )

        );

    }

);


/* ============================================================
   CACHE ALL LESSON AUDIO
   ============================================================ */

async function cacheLessonAudio(
    audioUrls
) {

    if (
        !audioUrls.length
    ) {

        console.log(
            "AFC Isiu PWA: No lesson audio to cache."
        );

        return;

    }


    const cache =
        await caches.open(
            AUDIO_CACHE
        );


    /*
     * Remove duplicates.
     */

    const uniqueUrls =
        [
            ...new Set(
                audioUrls
                    .filter(Boolean)
                    .map(
                        value =>
                            String(value)
                    )
            )
        ];


    console.log(
        "AFC Isiu PWA: Preparing to cache lesson audio:",
        uniqueUrls.length
    );


    for (
        const audioUrl of uniqueUrls
    ) {

        try {

            const url =
                new URL(
                    audioUrl,
                    self.location.origin
                );


            /*
             * Only cache audio belonging
             * to this website.
             */

            if (
                url.origin !==
                self.location.origin
            ) {

                console.warn(
                    "AFC Isiu PWA: Skipping external audio:",
                    audioUrl
                );

                continue;

            }


            /*
             * Fetch audio from network.
             */

            const response =
                await fetch(
                    url.href,
                    {
                        cache:
                            "no-store"
                    }
                );


            if (
                response &&
                response.ok
            ) {

                await cache.put(
                    url.href,
                    response.clone()
                );


                console.log(
                    "AFC Isiu PWA: Audio cached:",
                    url.href
                );

            }

            else {

                console.warn(
                    "AFC Isiu PWA: Audio could not be cached:",
                    url.href,
                    response
                        ? response.status
                        : "No response"
                );

            }

        }

        catch (error) {

            /*
             * One bad audio file must NEVER
             * stop remaining audio files.
             */

            console.warn(
                "AFC Isiu PWA: Audio cache error:",
                audioUrl,
                error
            );

        }

    }


    console.log(
        "AFC Isiu PWA: Lesson audio caching finished."
    );

}


/* ============================================================
   AUDIO HANDLER
   ============================================================ */

async function handleAudio(
    request
) {

    const cache =
        await caches.open(
            AUDIO_CACHE
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
                        "no-store"
                }
            );


        if (
            networkResponse &&
            networkResponse.ok
        ) {

            await cache.put(
                request,
                networkResponse.clone()
            );


            return networkResponse;

        }

    }

    catch (error) {

        console.log(
            "AFC Isiu PWA: Audio network unavailable:",
            request.url
        );

    }


    /*
     * OFFLINE AUDIO FALLBACK.
     */

    const cachedAudio =
        await cache.match(
            request
        );


    if (
        cachedAudio
    ) {

        console.log(
            "AFC Isiu PWA: Serving cached audio:",
            request.url
        );


        return cachedAudio;

    }


    /*
     * Also search every cache.
     */

    const anyCachedAudio =
        await caches.match(
            request
        );


    if (
        anyCachedAudio
    ) {

        return anyCachedAudio;

    }


    /*
     * Audio unavailable.
     */

    return new Response(
        "",
        {
            status:
                503,

            statusText:
                "Offline"
        }
    );

}


/* ============================================================
   NAVIGATION HANDLER
   ============================================================ */

async function handleNavigation(
    request
) {

    const pageCache =
        await caches.open(
            PAGE_CACHE
        );


    const requestUrl =
        new URL(
            request.url
        );


    /* ========================================================
       NETWORK FIRST
    ======================================================== */

    try {

        const networkResponse =
            await fetch(
                request,
                {
                    cache:
                        "no-store"
                }
            );


        /*
         * Never replace genuine 404/410.
         */

        if (
            networkResponse.status ===
                404 ||

            networkResponse.status ===
                410
        ) {

            return networkResponse;

        }


        /*
         * Cache successful pages.
         */

        if (
            networkResponse.ok
        ) {

            await pageCache.put(
                request,
                networkResponse.clone()
            );


            /*
             * Clean lesson URL.
             */

            if (
                requestUrl.pathname ===
                "/pages/lessons"
            ) {

                await pageCache.put(
                    "/pages/lessons",
                    networkResponse.clone()
                );


                await pageCache.put(
                    "/pages/lessons.html",
                    networkResponse.clone()
                );


                console.log(
                    "AFC Isiu PWA: Lesson page cached under both URLs."
                );

            }

        }


        return networkResponse;

    }

    catch (error) {

        console.log(
            "AFC Isiu PWA: Navigation network unavailable:",
            requestUrl.pathname
        );

    }


    /* ========================================================
       EXACT PAGE CACHE
    ======================================================== */

    const cachedPage =
        await pageCache.match(
            request
        );


    if (
        cachedPage
    ) {

        console.log(
            "AFC Isiu PWA: Serving exact cached page:",
            requestUrl.pathname
        );


        return cachedPage;

    }


    /* ========================================================
       CLEAN URL → REAL HTML PAGE
    ======================================================== */

    const mappedPage =
        CLEAN_PAGE_MAP[
            requestUrl.pathname
        ];


    if (
        mappedPage
    ) {

        /*
         * First search page cache.
         */

        const mappedFromPageCache =
            await pageCache.match(
                mappedPage
            );


        if (
            mappedFromPageCache
        ) {

            console.log(
                "AFC Isiu PWA: Serving mapped lesson page from page cache:",
                mappedPage
            );


            return mappedFromPageCache;

        }


        /*
         * Then search all caches.
         */

        const mappedFromAnyCache =
            await caches.match(
                mappedPage
            );


        if (
            mappedFromAnyCache
        ) {

            console.log(
                "AFC Isiu PWA: Serving mapped lesson page:",
                mappedPage
            );


            return mappedFromAnyCache;

        }

    }


    /* ========================================================
       STATIC CACHE
    ======================================================== */

    const staticPage =
        await caches.match(
            request
        );


    if (
        staticPage
    ) {

        return staticPage;

    }


    /* ========================================================
       PATHNAME CACHE
    ======================================================== */

    const shellPage =
        await caches.match(
            requestUrl.pathname
        );


    if (
        shellPage
    ) {

        return shellPage;

    }


    /* ========================================================
       FINAL BUILT-IN OFFLINE PAGE
    ======================================================== */

    return createOfflineResponse();

}


/* ============================================================
   ASSET HANDLER
   ============================================================ */

async function handleAsset(
    request
) {

    /*
     * NETWORK FIRST.
     */

    try {

        const networkResponse =
            await fetch(
                request,
                {
                    cache:
                        "no-store"
                }
            );


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

        console.log(
            "AFC Isiu PWA: Asset network unavailable:",
            request.url
        );

    }


    /*
     * OFFLINE FALLBACK.
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
     * Normal 503.
     */

    return new Response(
        "",
        {
            status:
                503,

            statusText:
                "Offline"
        }
    );

}


/* ============================================================
   BUILT-IN OFFLINE PAGE
   ============================================================ */

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
        content="#0A0016"
    >

    <title>
        You're Offline | AFC Isiu Youth
    </title>

    <style>

        * {
            box-sizing: border-box;
        }


        html,
        body {
            margin: 0;
            min-height: 100%;
        }


        body {

            min-height: 100vh;

            display: flex;

            align-items: center;

            justify-content: center;

            padding: 24px;

            background:

                radial-gradient(
                    circle at 15% 15%,
                    rgba(74, 7, 84, .5),
                    transparent 35%
                ),

                radial-gradient(
                    circle at 85% 85%,
                    rgba(234, 88, 12, .2),
                    transparent 35%
                ),

                #0A0016;

            color: white;

            font-family:
                "DM Sans",
                Arial,
                sans-serif;

        }


        .offline-card {

            width: 100%;

            max-width: 500px;

            padding: 40px 28px;

            text-align: center;

            border-radius: 26px;

            background:
                rgba(255,255,255,.05);

            border:
                1px solid
                rgba(255,255,255,.1);

            backdrop-filter:
                blur(20px);

        }


        .offline-logo {

            width: 72px;

            height: 72px;

            object-fit: contain;

            margin-bottom: 22px;

        }


        .wifi {

            width: 64px;

            height: 54px;

            margin:
                0 auto 24px;

            position: relative;

        }


        .wifi::before,
        .wifi::after {

            content: "";

            position: absolute;

            left: 50%;

            transform:
                translateX(-50%)
                rotate(-45deg);

            border:
                5px solid
                rgba(255,255,255,.8);

            border-left-color:
                transparent;

            border-bottom-color:
                transparent;

            border-radius:
                50%;

        }


        .wifi::before {

            width: 56px;

            height: 56px;

            top: 0;

        }


        .wifi::after {

            width: 34px;

            height: 34px;

            top: 12px;

        }


        .wifi-dot {

            position: absolute;

            left: 50%;

            bottom: 0;

            width: 8px;

            height: 8px;

            transform:
                translateX(-50%);

            border-radius: 50%;

            background:
                #ea580c;

        }


        h1 {

            margin:
                0 0 12px;

            font-family:
                "Bricolage Grotesque",
                Arial,
                sans-serif;

            font-size:
                2rem;

            line-height:
                1.1;

        }


        p {

            margin: 0;

            color:
                rgba(255,255,255,.68);

            line-height:
                1.65;

            font-size:
                .9rem;

        }


        .actions {

            display:
                flex;

            justify-content:
                center;

            gap: 10px;

            margin-top: 28px;

        }


        button {

            border: 0;

            border-radius:
                12px;

            padding:
                12px 18px;

            background:
                #4a0754;

            color: white;

            font:
                inherit;

            font-size:
                .82rem;

            font-weight:
                700;

            cursor:
                pointer;

        }


        button,
        a {

            -webkit-tap-highlight-color:
                transparent;

        }


        button:focus,
        button:focus-visible,
        a:focus,
        a:focus-visible {

            outline: none !important;

            box-shadow: none !important;

        }


        button.secondary {

            background:
                rgba(255,255,255,.08);

        }


        @media(max-width:480px) {

            .offline-card {

                padding:
                    32px 20px;

            }


            .actions {

                flex-direction:
                    column;

            }


            button {

                width: 100%;

            }

        }

    </style>

</head>


<body>

    <main class="offline-card">

        <img
            src="/images/logo.png"
            class="offline-logo"
            alt="AFC Isiu Youth"
        >


        <div
            class="wifi"
            aria-hidden="true"
        >

            <span class="wifi-dot"></span>

        </div>


        <h1>
            You're currently offline
        </h1>


        <p>
            We couldn't connect to the internet right now,
            so this page can't load fresh information.
        </p>


        <div class="actions">

            <button
                type="button"
                onclick="location.reload()"
            >
                Try Again
            </button>


            <button
                type="button"
                class="secondary"
                onclick="location.href='/'"
            >
                Go Home
            </button>

        </div>

    </main>

</body>

</html>
        `,

        {
            status:
                503,

            headers: {

                "Content-Type":
                    "text/html; charset=UTF-8"

            }

        }

    );

}
