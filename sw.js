/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: sw.js
   VERSION: 12

   PURPOSE:
   - Progressive Web App service worker
   - Cache management
   - Offline page caching
   - Network-first navigation
   - Premium built-in offline screen
   - Asset caching
   - Safe 404 handling

   IMPORTANT:
   - offline.html is NO LONGER USED.
   - The offline experience is generated directly here.
   - pwa.js is responsible for registering this service worker.
   - main.js is NOT responsible for service-worker registration.
============================================================ */


/* ============================================================
   CONFIGURATION
============================================================ */

const CACHE_VERSION = "afc-isiu-pwa-v12";

const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;

const APP_SHELL = [

    "/",
    "/index.html",

    "/manifest.json",

    "/css/main.css",
    "/css/layout.css",

    "/js/main.js",
    "/js/pwa.js",

    "/images/logo.png"

];


/* ============================================================
   INSTALL
============================================================ */

self.addEventListener("install", event => {

    console.log(
        "AFC Isiu SW v12: Installing..."
    );

    event.waitUntil(

        caches.open(STATIC_CACHE)
            .then(cache => {

                /*
                 * Cache each asset individually.
                 *
                 * This prevents one unavailable asset
                 * from causing the entire installation to fail.
                 */

                return Promise.all(

                    APP_SHELL.map(url => {

                        return fetch(
                            new Request(url, {
                                cache: "no-cache"
                            })
                        )
                        .then(response => {

                            if (!response.ok) {

                                console.warn(
                                    `AFC Isiu SW v12: Could not cache ${url}`
                                );

                                return null;

                            }

                            return cache.put(
                                url,
                                response
                            );

                        })
                        .catch(error => {

                            console.warn(
                                `AFC Isiu SW v12: Cache failed for ${url}`,
                                error
                            );

                            return null;

                        });

                    })

                );

            })
            .then(() => {

                console.log(
                    "AFC Isiu SW v12: Installation complete."
                );

                /*
                 * Activate immediately.
                 */

                return self.skipWaiting();

            })

    );

});


/* ============================================================
   ACTIVATE
============================================================ */

self.addEventListener("activate", event => {

    console.log(
        "AFC Isiu SW v12: Activating..."
    );

    event.waitUntil(

        caches.keys()

            .then(cacheNames => {

                return Promise.all(

                    cacheNames.map(cacheName => {

                        /*
                         * Remove old AFC Isiu caches.
                         */

                        if (
                            cacheName.startsWith(
                                "afc-isiu-pwa-"
                            ) &&
                            cacheName !== STATIC_CACHE &&
                            cacheName !== PAGE_CACHE
                        ) {

                            console.log(
                                "AFC Isiu SW v12: Removing old cache:",
                                cacheName
                            );

                            return caches.delete(
                                cacheName
                            );

                        }

                        return null;

                    })

                );

            })

            .then(() => {

                console.log(
                    "AFC Isiu SW v12: Activation complete."
                );

                /*
                 * Take control of open pages immediately.
                 */

                return self.clients.claim();

            })

    );

});


/* ============================================================
   FETCH HANDLER
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
     * Only handle requests belonging to this portal.
     */

    if (url.origin !== self.location.origin) {
        return;
    }


    /*
     * Audio files should always try the network.
     *
     * This prevents large audio files from unnecessarily
     * filling the cache.
     */

    if (
        url.pathname.startsWith("/audio/")
    ) {

        event.respondWith(
            networkOnly(request)
        );

        return;

    }


    /*
     * Navigation requests need special handling.
     *
     * Example:
     *
     * /lessons.html
     * /profile.html
     * /gallery.html
     * /some-missing-page.html
     */

    if (request.mode === "navigate") {

        event.respondWith(
            handleNavigation(request)
        );

        return;

    }


    /*
     * All other assets use the asset strategy.
     */

    event.respondWith(
        handleAsset(request)
    );

});


/* ============================================================
   NAVIGATION HANDLER
============================================================ */

async function handleNavigation(request) {

    /*
     * --------------------------------------------------------
     * 1. TRY THE NETWORK FIRST
     * --------------------------------------------------------
     */

    try {

        const networkResponse = await fetch(
            request
        );


        /*
         * ----------------------------------------------------
         * IMPORTANT:
         *
         * If the server explicitly returns 404,
         * return that exact response.
         *
         * This allows Vercel's 404.html to work correctly.
         *
         * DO NOT replace it with the homepage.
         * ----------------------------------------------------
         */

        if (networkResponse.status === 404) {

            console.log(
                "AFC Isiu SW v12: Server 404 preserved:",
                request.url
            );

            return networkResponse;

        }


        /*
         * If the server successfully returned the page,
         * cache a copy for offline use.
         */

        if (networkResponse.ok) {

            const responseClone =
                networkResponse.clone();

            cachePage(
                request,
                responseClone
            );

            return networkResponse;

        }


        /*
         * Other non-OK responses are allowed to fall through
         * to cached content.
         */

        console.warn(
            "AFC Isiu SW v12: Navigation returned:",
            networkResponse.status,
            request.url
        );

    } catch (error) {

        /*
         * Network failed.
         *
         * This is normal when the user has no internet.
         */

        console.log(
            "AFC Isiu SW v12: Navigation network unavailable."
        );

    }


    /*
     * --------------------------------------------------------
     * 2. TRY THE PAGE CACHE
     * --------------------------------------------------------
     */

    const cachedPage =
        await caches.match(
            request
        );

    if (cachedPage) {

        console.log(
            "AFC Isiu SW v12: Serving cached page:",
            request.url
        );

        return cachedPage;

    }


    /*
     * --------------------------------------------------------
     * 3. TRY GENERAL CACHE MATCHING
     * --------------------------------------------------------
     */

    const cachedMatch =
        await caches.match(
            request,
            {
                ignoreSearch: true
            }
        );

    if (cachedMatch) {

        console.log(
            "AFC Isiu SW v12: Serving cached match:",
            request.url
        );

        return cachedMatch;

    }


    /*
     * --------------------------------------------------------
     * 4. NO PAGE AVAILABLE
     *
     * Generate the premium offline experience directly
     * from this Service Worker.
     * --------------------------------------------------------
     */

    console.log(
        "AFC Isiu SW v12: No cached page. Showing offline screen."
    );

    return createOfflineResponse();

}


/* ============================================================
   ASSET HANDLER
============================================================ */

async function handleAsset(request) {

    /*
     * Network first.
     *
     * This ensures updated CSS/JS/images can be retrieved
     * when the user has internet access.
     */

    try {

        const networkResponse =
            await fetch(request);


        /*
         * Preserve real 404 responses.
         */

        if (networkResponse.status === 404) {

            return networkResponse;

        }


        if (networkResponse.ok) {

            const responseClone =
                networkResponse.clone();

            cacheAsset(
                request,
                responseClone
            );

            return networkResponse;

        }

    } catch (error) {

        /*
         * Network unavailable.
         * Fall through to cache.
         */

    }


    /*
     * Try cache.
     */

    const cachedResponse =
        await caches.match(
            request
        );

    if (cachedResponse) {

        return cachedResponse;

    }


    /*
     * Nothing available.
     */

    return new Response(
        "Resource unavailable offline.",
        {
            status: 503,
            statusText: "Service Unavailable",
            headers: {
                "Content-Type": "text/plain; charset=UTF-8"
            }
        }
    );

}


/* ============================================================
   NETWORK ONLY
============================================================ */

async function networkOnly(request) {

    try {

        return await fetch(
            request
        );

    } catch (error) {

        return new Response(
            "This resource is unavailable offline.",
            {
                status: 503,
                statusText: "Service Unavailable",
                headers: {
                    "Content-Type":
                        "text/plain; charset=UTF-8"
                }
            }
        );

    }

}


/* ============================================================
   CACHE PAGE
============================================================ */

async function cachePage(
    request,
    response
) {

    try {

        const cache =
            await caches.open(
                PAGE_CACHE
            );

        await cache.put(
            request,
            response
        );

    } catch (error) {

        console.warn(
            "AFC Isiu SW v12: Could not cache page.",
            error
        );

    }

}


/* ============================================================
   CACHE ASSET
============================================================ */

async function cacheAsset(
    request,
    response
) {

    try {

        const cache =
            await caches.open(
                STATIC_CACHE
            );

        await cache.put(
            request,
            response
        );

    } catch (error) {

        console.warn(
            "AFC Isiu SW v12: Could not cache asset.",
            error
        );

    }

}


/* ============================================================
   PREMIUM OFFLINE RESPONSE
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

    <meta
        name="color-scheme"
        content="dark"
    >

    <title>
        You're Offline | AFC Isiu Youth
    </title>


    <style>

        /* ==================================================
           RESET
        ================================================== */

        * {

            box-sizing:
                border-box;

            margin:
                0;

            padding:
                0;

        }


        html {

            min-height:
                100%;

            background:
                #0A0016;

        }


        body {

            min-height:
                100vh;

            min-height:
                100dvh;

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            padding:
                20px;

            overflow-x:
                hidden;

            font-family:
                Arial,
                Helvetica,
                sans-serif;

            color:
                #ffffff;

            background:
                #0A0016;

        }


        /* ==================================================
           BACKGROUND
        ================================================== */

        .offline-background {

            position:
                fixed;

            inset:
                0;

            overflow:
                hidden;

            pointer-events:
                none;

        }


        .offline-background::before {

            content:
                "";

            position:
                absolute;

            width:
                420px;

            height:
                420px;

            top:
                -220px;

            right:
                -160px;

            border-radius:
                50%;

            background:
                rgba(
                    234,
                    88,
                    12,
                    .20
                );

            filter:
                blur(45px);

        }


        .offline-background::after {

            content:
                "";

            position:
                absolute;

            width:
                440px;

            height:
                440px;

            bottom:
                -240px;

            left:
                -190px;

            border-radius:
                50%;

            background:
                rgba(
                    74,
                    7,
                    84,
                    .42
                );

            filter:
                blur(45px);

        }


        /* ==================================================
           MAIN CARD
        ================================================== */

        .offline-card {

            position:
                relative;

            z-index:
                2;

            width:
                100%;

            max-width:
                440px;

            padding:
                34px 26px 26px;

            text-align:
                center;

            border:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    .09
                );

            border-radius:
                30px;

            background:
                rgba(
                    24,
                    16,
                    31,
                    .88
                );

            box-shadow:
                0 30px 90px
                rgba(
                    0,
                    0,
                    0,
                    .45
                );

            backdrop-filter:
                blur(20px);

            -webkit-backdrop-filter:
                blur(20px);

            animation:
                cardIn
                .5s
                ease
                both;

        }


        /* ==================================================
           LOGO
        ================================================== */

        .logo-container {

            position:
                relative;

            width:
                84px;

            height:
                84px;

            margin:
                0 auto 22px;

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            border:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    .10
                );

            border-radius:
                25px;

            background:
                rgba(
                    255,
                    255,
                    255,
                    .06
                );

            box-shadow:
                0 14px 35px
                rgba(
                    0,
                    0,
                    0,
                    .25
                );

        }


        .logo-container::before {

            content:
                "";

            position:
                absolute;

            inset:
                -7px;

            border:
                1px solid
                rgba(
                    234,
                    88,
                    12,
                    .18
                );

            border-radius:
                30px;

            animation:
                logoPulse
                2.4s
                ease-out
                infinite;

        }


        .logo {

            width:
                62px;

            height:
                62px;

            object-fit:
                contain;

            border-radius:
                16px;

        }


        /* ==================================================
           WIFI ICON
        ================================================== */

        .status-icon {

            width:
                66px;

            height:
                66px;

            margin:
                0 auto 22px;

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            border-radius:
                21px;

            background:
                rgba(
                    234,
                    88,
                    12,
                    .11
                );

            border:
                1px solid
                rgba(
                    234,
                    88,
                    12,
                    .16
                );

            color:
                #fb923c;

            font-size:
                28px;

        }


        /*
         * CSS-drawn Wi-Fi icon.
         *
         * This means the offline screen does not depend
         * on Font Awesome being available.
         */

        .wifi {

            position:
                relative;

            width:
                32px;

            height:
                25px;

        }


        .wifi::before,
        .wifi::after {

            content:
                "";

            position:
                absolute;

            left:
                50%;

            transform:
                translateX(-50%);

            border:
                3px
                solid
                currentColor;

            border-bottom:
                0;

            border-left-color:
                transparent;

            border-right-color:
                transparent;

            border-radius:
                50%
                50%
                0
                0;

        }


        .wifi::before {

            width:
                32px;

            height:
                25px;

            top:
                -1px;

        }


        .wifi::after {

            width:
                18px;

            height:
                14px;

            top:
                8px;

        }


        .wifi-dot {

            position:
                absolute;

            width:
                5px;

            height:
                5px;

            left:
                50%;

            bottom:
                0;

            transform:
                translateX(-50%);

            border-radius:
                50%;

            background:
                currentColor;

        }


        /* ==================================================
           TEXT
        ================================================== */

        h1 {

            font-family:
                Arial,
                Helvetica,
                sans-serif;

            font-size:
                clamp(
                    1.55rem,
                    7vw,
                    1.9rem
                );

            line-height:
                1.15;

            letter-spacing:
                -.025em;

            font-weight:
                700;

            margin-bottom:
                12px;

            color:
                #ffffff;

        }


        .description {

            max-width:
                355px;

            margin:
                0 auto 24px;

            color:
                #c7c0cc;

            font-size:
                .9rem;

            line-height:
                1.65;

        }


        /* ==================================================
           CONNECTION NOTICE
        ================================================== */

        .connection-notice {

            display:
                flex;

            align-items:
                flex-start;

            gap:
                12px;

            width:
                100%;

            padding:
                15px;

            margin-bottom:
                24px;

            text-align:
                left;

            border:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    .07
                );

            border-radius:
                17px;

            background:
                rgba(
                    255,
                    255,
                    255,
                    .045
                );

        }


        .notice-icon {

            flex:
                0 0 auto;

            width:
                34px;

            height:
                34px;

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            border-radius:
                11px;

            background:
                rgba(
                    234,
                    88,
                    12,
                    .13
                );

            color:
                #fb923c;

            font-size:
                14px;

        }


        .notice-text {

            color:
                #bdb6c4;

            font-size:
                .78rem;

            line-height:
                1.5;

        }


        .notice-text strong {

            display:
                block;

            margin-bottom:
                2px;

            color:
                #ffffff;

            font-size:
                .8rem;

        }


        /* ==================================================
           BUTTONS
        ================================================== */

        .actions {

            display:
                flex;

            flex-direction:
                column;

            gap:
                10px;

        }


        button,
        a {

            width:
                100%;

            min-height:
                50px;

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            gap:
                9px;

            border:
                0;

            border-radius:
                15px;

            font-family:
                Arial,
                Helvetica,
                sans-serif;

            font-size:
                .86rem;

            font-weight:
                700;

            text-decoration:
                none;

            cursor:
                pointer;

            transition:
                transform
                .2s
                ease,
                box-shadow
                .2s
                ease,
                background
                .2s
                ease;

        }


        .retry-button {

            background:
                #ea580c;

            color:
                #ffffff;

            box-shadow:
                0 12px 28px
                rgba(
                    234,
                    88,
                    12,
                    .22
                );

        }


        .retry-button:hover {

            transform:
                translateY(-2px);

            box-shadow:
                0 16px 34px
                rgba(
                    234,
                    88,
                    12,
                    .30
                );

        }


        .home-button {

            background:
                rgba(
                    255,
                    255,
                    255,
                    .07
                );

            color:
                #ffffff;

            border:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    .07
                );

        }


        .home-button:hover {

            transform:
                translateY(-2px);

            background:
                rgba(
                    255,
                    255,
                    255,
                    .11
                );

        }


        button:active,
        a:active {

            transform:
                translateY(0);

        }


        /* ==================================================
           FOOTER
        ================================================== */

        .footer {

            margin-top:
                22px;

            padding-top:
                17px;

            border-top:
                1px solid
                rgba(
                    255,
                    255,
                    255,
                    .06
                );

            color:
                #756e7d;

            font-size:
                .69rem;

            letter-spacing:
                .02em;

        }


        /* ==================================================
           ANIMATIONS
        ================================================== */

        @keyframes cardIn {

            from {

                opacity:
                    0;

                transform:
                    translateY(12px)
                    scale(.985);

            }

            to {

                opacity:
                    1;

                transform:
                    translateY(0)
                    scale(1);

            }

        }


        @keyframes logoPulse {

            0% {

                opacity:
                    .55;

                transform:
                    scale(.95);

            }

            70% {

                opacity:
                    0;

                transform:
                    scale(1.08);

            }

            100% {

                opacity:
                    0;

                transform:
                    scale(1.08);

            }

        }


        /* ==================================================
           SMALL SCREENS
        ================================================== */

        @media (max-width: 430px) {

            body {

                padding:
                    14px;

            }


            .offline-card {

                padding:
                    29px 19px 22px;

                border-radius:
                    26px;

            }


            .logo-container {

                width:
                    74px;

                height:
                    74px;

            }


            .logo {

                width:
                    55px;

                height:
                    55px;

            }


            .status-icon {

                width:
                    60px;

                height:
                    60px;

            }


            .description {

                font-size:
                    .86rem;

            }

        }


        /* ==================================================
           REDUCED MOTION
        ================================================== */

        @media (prefers-reduced-motion: reduce) {

            .offline-card,
            .logo-container::before {

                animation:
                    none;

            }


            button,
            a {

                transition:
                    none;

            }

        }

    </style>

</head>


<body>

    <div
        class="offline-background"
        aria-hidden="true"
    ></div>


    <main class="offline-card">


        <!-- ================================================
             AFC ISIU LOGO
             ================================================ -->

        <div class="logo-container">

            <img
                class="logo"
                src="/images/logo.png"
                alt="AFC Isiu Youth"
                onerror="this.style.display='none';"
            >

        </div>


        <!-- ================================================
             CONNECTION ICON
             ================================================ -->

        <div
            class="status-icon"
            aria-hidden="true"
        >

            <span class="wifi">

                <span class="wifi-dot"></span>

            </span>

        </div>


        <!-- ================================================
             MESSAGE
             ================================================ -->

        <h1>
            You're currently offline
        </h1>


        <p class="description">

            We couldn't connect to the internet
            right now, so this page can't load
            fresh information.

        </p>


        <!-- ================================================
             CONNECTION NOTICE
             ================================================ -->

        <div class="connection-notice">

            <div
                class="notice-icon"
                aria-hidden="true"
            >

                <span>!</span>

            </div>


            <div class="notice-text">

                <strong>
                    No internet connection
                </strong>

                Please switch on your mobile data
                or connect to Wi-Fi, then try again.

            </div>

        </div>


        <!-- ================================================
             ACTIONS
             ================================================ -->

        <div class="actions">

            <button
                class="retry-button"
                type="button"
                onclick="window.location.reload()"
            >

                <span aria-hidden="true">
                    ↻
                </span>

                Try Again

            </button>


            <a
                class="home-button"
                href="/"
            >

                <span aria-hidden="true">
                    ⌂
                </span>

                Go to Home

            </a>

        </div>


        <!-- ================================================
             FOOTER
             ================================================ -->

        <p class="footer">

            AFC Isiu Youth Portal

        </p>


    </main>

</body>

</html>

    `;


    return new Response(
        html,
        {
            status:
                503,

            statusText:
                "Service Unavailable",

            headers: {

                "Content-Type":
                    "text/html; charset=UTF-8",

                "Cache-Control":
                    "no-store"

            }

        }
    );

}


/* ============================================================
   SERVICE WORKER MESSAGE HANDLER
============================================================ */

self.addEventListener(
    "message",
    event => {

        if (!event.data) {
            return;
        }


        /*
         * Allows pwa.js or another page to tell
         * the service worker to activate immediately.
         */

        if (
            event.data.type ===
            "SKIP_WAITING"
        ) {

            self.skipWaiting();

        }

    }
);


/* ============================================================
   DEBUG MESSAGE
============================================================ */

console.log(
    "AFC Isiu Youth Portal: Service Worker v12 loaded."
);
