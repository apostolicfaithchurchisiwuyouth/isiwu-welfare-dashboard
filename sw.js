const CACHE_VERSION = "afc-isiu-pwa-v5";

const STATIC_CACHE = `${CACHE_VERSION}-static`;

const PAGE_CACHE = `${CACHE_VERSION}-pages`;

const OFFLINE_CACHE = `${CACHE_VERSION}-offline`;

/* =========================================================
FILES REQUIRED FOR THE BASIC APP
========================================================= */

const APP_SHELL = [

```
"/",

"/index.html",

"/offline.html",

"/manifest.json",

"/css/main.css",

"/css/layout.css",

"/js/main.js",

"/images/logo.png"


];

/* =========================================================
OFFLINE PAGE
========================================================= */

const OFFLINE_PAGE = "/offline.html";

/* =========================================================
INSTALL
========================================================= */

self.addEventListener("install", event => {

```
event.waitUntil(

    Promise.all([

        caches
            .open(STATIC_CACHE)
            .then(cache => {

                return cache.addAll(APP_SHELL);

            }),

        caches
            .open(OFFLINE_CACHE)
            .then(cache => {

                return cache.add(OFFLINE_PAGE);

            })

    ])

    .then(() => {

        console.log(
            "AFC Isiu PWA: Service worker installed."
        );

        return self.skipWaiting();

    })

);


});

/* =========================================================
ACTIVATE
========================================================= */

self.addEventListener("activate", event => {

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

                            cacheName !== STATIC_CACHE

                            &&

                            cacheName !== PAGE_CACHE

                            &&

                            cacheName !== OFFLINE_CACHE

                        );

                    })

                    .map(cacheName => {

                        console.log(
                            "AFC Isiu PWA: Removing old cache:",
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

            return self.clients.claim();

        })

);


});

/* =========================================================
FETCH HANDLER
========================================================= */

self.addEventListener("fetch", event => {


const request = event.request;


/* -----------------------------------------------------
   Only GET requests
----------------------------------------------------- */

if (
    request.method !== "GET"
) {

    return;

}


const url =
    new URL(request.url);


/* -----------------------------------------------------
   Ignore external websites
   Example: Google Sheets, Google Fonts, CDNs
----------------------------------------------------- */

if (
    url.origin !== self.location.origin
) {

    return;

}


/* =====================================================
   PAGE NAVIGATION
===================================================== */

if (
    request.mode === "navigate"
) {

    event.respondWith(

        handleNavigation(request)

    );

    return;

}


/* =====================================================
   OTHER ASSETS
===================================================== */

event.respondWith(

    handleAsset(request)

);


});

/* =========================================================
NAVIGATION HANDLER
========================================================= */

async function handleNavigation(request) {


const pageCache =
    await caches.open(PAGE_CACHE);


/* -----------------------------------------------------
   FIRST:
   Check whether this exact page already exists.
----------------------------------------------------- */

const cachedPage =
    await pageCache.match(request);


if (cachedPage) {

    try {

        const networkResponse =
            await fetch(request);


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
            "AFC Isiu PWA: Offline. Using cached page."
        );

    }


    return cachedPage;

}


/* -----------------------------------------------------
   SECOND:
   Try the network.
----------------------------------------------------- */

try {

    const networkResponse =
        await fetch(request);


    if (
        networkResponse &&
        networkResponse.ok
    ) {

        await pageCache.put(
            request,
            networkResponse.clone()
        );

    }


    return networkResponse;

}

catch (error) {

    console.log(
        "AFC Isiu PWA: Page unavailable offline."
    );


    /* -------------------------------------------------
       THIRD:
       Return our custom offline page.
    ------------------------------------------------- */

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


    /* -------------------------------------------------
       Last-resort response.
    ------------------------------------------------- */

    return new Response(

        `
        <!DOCTYPE html>

        <html>

        <head>

            <meta charset="UTF-8">

            <meta
                name="viewport"
                content="width=device-width,initial-scale=1"
            >

            <title>Offline</title>

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
                    "text/html"

            }

        }

    );

}


}

/* =========================================================
ASSET HANDLER
========================================================= */

async function handleAsset(request) {


const cachedResponse =
    await caches.match(request);


if (cachedResponse) {

    return cachedResponse;

}


try {

    const networkResponse =
        await fetch(request);


    if (
        networkResponse &&
        networkResponse.ok
    ) {

        const cache =
            await caches.open(
                PAGE_CACHE
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
        "AFC Isiu PWA: Asset unavailable offline:",
        request.url
    );


    /*
    For CSS, JS, images and other assets,
    simply allow the request to fail.

    The navigation handler above is what
    supplies offline.html for page navigation.
    */

    throw error;

}


}
