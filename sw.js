/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: sw.js
   PURPOSE: SERVICE WORKER / OFFLINE ENGINE
   VERSION: 13

   RESPONSIBILITIES:
   - Cache the core application shell
   - Cache important page assets
   - Support offline navigation
   - Preserve real server 404 responses
   - Provide a built-in offline fallback screen
   - Never own application UI logic
   - Never register itself
   ============================================================ */

"use strict";


/* ============================================================
   CONFIGURATION
   ============================================================ */

const CACHE_VERSION = "afc-isiu-pwa-v13";

const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;

const APP_SHELL = [
    "/",
    "/index.html",
    "/manifest.json",

    /* Global CSS */
    "/css/main.css",
    "/css/layout.css",

    /* Global JavaScript */
    "/js/main.js",
    "/js/pwa.js",

    /* Lessons page */
    "/pages/lessons.html",
    "/css/lessons.css",
    "/js/lessons.js",

    /* Branding */
    "/images/logo.png"
];


/* ============================================================
   INSTALL
   ============================================================ */

self.addEventListener("install", event => {

    console.log(
        "[SW] Installing:",
        CACHE_VERSION
    );

    event.waitUntil(
        Promise.all([
            cacheAppShell(),
            self.skipWaiting()
        ])
    );
});


/* ============================================================
   CACHE APP SHELL
   ============================================================ */

async function cacheAppShell() {

    const cache = await caches.open(STATIC_CACHE);

    /*
     * Do not fail the entire installation because one optional
     * asset is temporarily unavailable.
     */
    await Promise.allSettled(
        APP_SHELL.map(async url => {

            try {

                const request = new Request(url, {
                    cache: "no-cache"
                });

                const response = await fetch(request);

                if (response.ok) {

                    await cache.put(
                        request,
                        response.clone()
                    );

                    console.log(
                        "[SW] Cached:",
                        url
                    );

                } else {

                    console.warn(
                        "[SW] Could not cache:",
                        url,
                        response.status
                    );

                }

            } catch (error) {

                console.warn(
                    "[SW] Cache failed:",
                    url,
                    error
                );

            }

        })
    );
}


/* ============================================================
   ACTIVATE
   ============================================================ */

self.addEventListener("activate", event => {

    console.log(
        "[SW] Activating:",
        CACHE_VERSION
    );

    event.waitUntil(
        Promise.all([
            removeOldCaches(),
            self.clients.claim()
        ])
    );
});


/* ============================================================
   REMOVE OLD CACHES
   ============================================================ */

async function removeOldCaches() {

    const cacheNames = await caches.keys();

    await Promise.all(

        cacheNames.map(cacheName => {

            if (
                cacheName.startsWith("afc-isiu-pwa-") &&
                !cacheName.startsWith(CACHE_VERSION)
            ) {

                console.log(
                    "[SW] Removing old cache:",
                    cacheName
                );

                return caches.delete(cacheName);

            }

            return Promise.resolve();

        })

    );
}


/* ============================================================
   FETCH
   ============================================================ */

self.addEventListener("fetch", event => {

    const request = event.request;

    /*
     * Only handle GET requests.
     */
    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    /*
     * Only control this website's own requests.
     *
     * External resources such as:
     * - Google Fonts
     * - Font Awesome CDN
     * - jsDelivr
     * - Google Sheets
     *
     * remain outside the service worker's cache control.
     */
    if (url.origin !== self.location.origin) {
        return;
    }


    /* --------------------------------------------------------
       AUDIO
       -------------------------------------------------------- */

    /*
     * Audio is intentionally not aggressively pre-cached.
     *
     * Yoruba audio may be large, so it continues to use the
     * network rather than filling the application cache.
     */
    if (url.pathname.startsWith("/audio/")) {

        event.respondWith(
            networkOnly(request)
        );

        return;
    }


    /* --------------------------------------------------------
       NAVIGATION REQUESTS
       -------------------------------------------------------- */

    if (request.mode === "navigate") {

        event.respondWith(
            handleNavigationRequest(request)
        );

        return;
    }


    /* --------------------------------------------------------
       NORMAL STATIC ASSETS
       -------------------------------------------------------- */

    event.respondWith(
        handleStaticRequest(request)
    );

});


/* ============================================================
   NAVIGATION HANDLER
   ============================================================ */

async function handleNavigationRequest(request) {

    try {

        /*
         * Always try the network first for pages.
         *
         * This means:
         * - New pages are available immediately.
         * - Vercel 404 pages remain real 404s.
         * - Updated HTML is received when online.
         */
        const networkResponse = await fetch(request);

        /*
         * IMPORTANT:
         *
         * Never replace a real 404 response with the offline
         * page.
         */
        if (
            networkResponse.status === 404 ||
            networkResponse.status === 410
        ) {

            return networkResponse;
        }


        /*
         * Cache successful HTML pages.
         */
        if (networkResponse.ok) {

            const cache = await caches.open(PAGE_CACHE);

            await cache.put(
                request,
                networkResponse.clone()
            );

        }

        return networkResponse;

    } catch (error) {

        console.warn(
            "[SW] Navigation network failed:",
            request.url
        );


        /*
         * First try the exact requested page from the page cache.
         */
        const cachedPage = await caches.match(request);

        if (cachedPage) {

            return cachedPage;
        }


        /*
         * Then try the exact requested page from the static cache.
         */
        const cachedStaticPage = await caches.match(request);

        if (cachedStaticPage) {

            return cachedStaticPage;
        }


        /*
         * If this is a known app-shell route, try the cached
         * corresponding file.
         */
        const pathname = new URL(
            request.url
        ).pathname;

        const shellMatch = APP_SHELL.find(
            shellPath => shellPath === pathname
        );

        if (shellMatch) {

            const shellResponse = await caches.match(
                shellMatch
            );

            if (shellResponse) {

                return shellResponse;
            }

        }


        /*
         * Nothing is available locally.
         *
         * Return the built-in offline page.
         */
        return createOfflineResponse();

    }

}


/* ============================================================
   STATIC REQUEST HANDLER
   ============================================================ */

async function handleStaticRequest(request) {

    /*
     * Cache first.
     *
     * This makes CSS, JS, images and other application assets
     * available immediately when offline.
     */
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {

        /*
         * For application assets we can return the cached
         * version immediately.
         */
        return cachedResponse;
    }


    /*
     * Not cached yet — try the network.
     */
    try {

        const networkResponse = await fetch(request);

        if (networkResponse.ok) {

            const cache = await caches.open(STATIC_CACHE);

            await cache.put(
                request,
                networkResponse.clone()
            );

        }

        return networkResponse;

    } catch (error) {

        console.warn(
            "[SW] Static request failed:",
            request.url
        );

        /*
         * No generic HTML fallback is returned here because
         * CSS/JS/image requests should fail naturally rather
         * than receiving an HTML document.
         */
        return new Response(
            "",
            {
                status: 503,
                statusText: "Offline"
            }
        );

    }

}


/* ============================================================
   NETWORK ONLY
   ============================================================ */

async function networkOnly(request) {

    try {

        return await fetch(request);

    } catch (error) {

        return new Response(
            "",
            {
                status: 503,
                statusText: "Offline"
            }
        );

    }

}


/* ============================================================
   BUILT-IN OFFLINE PAGE
   ============================================================ */

function createOfflineResponse() {

    const html = `
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
        You're Offline
    </title>

    <style>

        :root {
            color-scheme: dark;
        }

        * {
            box-sizing: border-box;
        }

        html,
        body {
            margin: 0;
            width: 100%;
            min-height: 100%;
        }

        body {

            min-height: 100vh;

            display: flex;

            align-items: center;

            justify-content: center;

            padding: 24px;

            overflow-x: hidden;

            background:
                radial-gradient(
                    circle at 20% 10%,
                    rgba(74, 7, 84, 0.45),
                    transparent 38%
                ),
                radial-gradient(
                    circle at 85% 90%,
                    rgba(234, 88, 12, 0.18),
                    transparent 35%
                ),
                #0A0016;

            color: #ffffff;

            font-family:
                Inter,
                system-ui,
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                sans-serif;

        }


        .offline-page {

            width: 100%;

            max-width: 520px;

            text-align: center;

            padding: 42px 26px;

            border: 1px solid
                rgba(255, 255, 255, 0.09);

            border-radius: 28px;

            background:
                rgba(255, 255, 255, 0.045);

            backdrop-filter: blur(22px);

            -webkit-backdrop-filter: blur(22px);

            box-shadow:
                0 24px 80px
                rgba(0, 0, 0, 0.35);

        }


        .offline-logo {

            width: 76px;

            height: 76px;

            object-fit: contain;

            margin-bottom: 24px;

            filter:
                drop-shadow(
                    0 8px 24px
                    rgba(234, 88, 12, 0.2)
                );

        }


        .wifi-icon {

            width: 72px;

            height: 72px;

            margin:
                0 auto 22px;

            position: relative;

        }


        .wifi-icon::before,
        .wifi-icon::after {

            content: "";

            position: absolute;

            left: 50%;

            transform:
                translateX(-50%)
                rotate(-45deg);

            border: 5px solid
                rgba(255, 255, 255, 0.78);

            border-left-color: transparent;

            border-bottom-color: transparent;

            border-radius: 50%;

        }


        .wifi-icon::before {

            width: 58px;

            height: 58px;

            top: 4px;

        }


        .wifi-icon::after {

            width: 34px;

            height: 34px;

            top: 16px;

        }


        .wifi-dot {

            position: absolute;

            width: 9px;

            height: 9px;

            border-radius: 50%;

            background: #ea580c;

            left: 50%;

            bottom: 8px;

            transform:
                translateX(-50%);

        }


        h1 {

            margin: 0 0 12px;

            font-size: clamp(
                1.7rem,
                5vw,
                2.35rem
            );

            line-height: 1.1;

            letter-spacing: -0.04em;

        }


        p {

            margin: 0 auto;

            max-width: 410px;

            color:
                rgba(255, 255, 255, 0.68);

            font-size: 0.95rem;

            line-height: 1.65;

        }


        .connection-status {

            display: inline-flex;

            align-items: center;

            gap: 8px;

            margin-top: 22px;

            padding: 9px 13px;

            border-radius: 999px;

            background:
                rgba(234, 88, 12, 0.1);

            border: 1px solid
                rgba(234, 88, 12, 0.18);

            color:
                rgba(255, 255, 255, 0.76);

            font-size: 0.78rem;

        }


        .status-dot {

            width: 7px;

            height: 7px;

            border-radius: 50%;

            background: #ea580c;

        }


        .offline-actions {

            display: flex;

            gap: 10px;

            justify-content: center;

            margin-top: 28px;

            flex-wrap: wrap;

        }


        button {

            border: 0;

            border-radius: 13px;

            padding: 12px 18px;

            font: inherit;

            font-size: 0.85rem;

            font-weight: 700;

            cursor: pointer;

            color: #ffffff;

            background:
                linear-gradient(
                    135deg,
                    #4a0754,
                    #6b1477
                );

        }


        button.secondary {

            background:
                rgba(255, 255, 255, 0.07);

            border: 1px solid
                rgba(255, 255, 255, 0.1);

        }


        button:active {

            transform: scale(0.98);

        }


        @media (max-width: 480px) {

            .offline-page {

                padding: 34px 20px;

                border-radius: 23px;

            }

            .offline-actions {

                flex-direction: column;

            }

            button {

                width: 100%;

            }

        }


        @media (prefers-reduced-motion: reduce) {

            * {
                scroll-behavior: auto !important;
                transition: none !important;
                animation: none !important;
            }

        }

    </style>

</head>


<body>

    <main class="offline-page">

        <img
            class="offline-logo"
            src="/images/logo.png"
            alt="AFC Isiwu Youth"
        >

        <div
            class="wifi-icon"
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

        <div class="connection-status">

            <span
                class="status-dot"
                aria-hidden="true"
            ></span>

            Waiting for connection

        </div>

        <div class="offline-actions">

            <button
                type="button"
                id="tryAgain"
            >
                Try Again
            </button>

            <button
                type="button"
                class="secondary"
                id="goHome"
            >
                Go Home
            </button>

        </div>

    </main>


    <script>

        const tryAgain =
            document.getElementById("tryAgain");

        const goHome =
            document.getElementById("goHome");


        if (tryAgain) {

            tryAgain.addEventListener(
                "click",
                () => {
                    window.location.reload();
                }
            );

        }


        if (goHome) {

            goHome.addEventListener(
                "click",
                () => {
                    window.location.href = "/";
                }
            );

        }


        window.addEventListener(
            "online",
            () => {
                window.location.reload();
            }
        );

    </script>

</body>

</html>
    `;

    return new Response(
        html,
        {
            status: 503,
            statusText: "Offline",
            headers: {
                "Content-Type": "text/html; charset=UTF-8"
            }
        }
    );

}
