/* =========================================================
   AFC ISIU YOUTH PORTAL
   SERVICE WORKER
   PHASE 3D — STABLE PWA + LESSON SUPPORT
========================================================= */

const CACHE_NAME = "afc-isiu-pwa-v4";


/* =========================================================
   APP SHELL
========================================================= */

const APP_SHELL = [

    "/",

    "/index.html",

    "/manifest.json",

    "/css/main.css",

    "/css/layout.css",

    "/pages/lessons.html",

    "/css/lessons.css",

    "/js/lessons.js"

];


/* =========================================================
   INSTALL
========================================================= */

self.addEventListener(
    "install",
    event => {

        console.log(
            "AFC Isiu SW: Installing v4..."
        );


        event.waitUntil(

            caches.open(CACHE_NAME)

                .then(cache => {

                    return cache.addAll(
                        APP_SHELL
                    );

                })

                .then(() => {

                    console.log(
                        "AFC Isiu SW: App shell cached."
                    );


                    return self.skipWaiting();

                })

                .catch(error => {

                    console.error(
                        "AFC Isiu SW: App shell caching failed.",
                        error
                    );

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
            "AFC Isiu SW: Activating v4..."
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
                                cacheName =>
                                    caches.delete(
                                        cacheName
                                    )
                            )

                    );

                })

                .then(() => {

                    console.log(
                        "AFC Isiu SW: Old caches removed."
                    );


                    return self.clients.claim();

                })

        );

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


        /* -------------------------------------------------
           ONLY HANDLE GET REQUESTS
        ------------------------------------------------- */

        if (
            request.method !== "GET"
        ) {

            return;

        }


        const url =
            new URL(request.url);


        /* -------------------------------------------------
           DO NOT CACHE GOOGLE SHEETS
           
           Lessons must always try to get the newest
           Google Sheet data when internet is available.
        ------------------------------------------------- */

        if (
            url.hostname.includes(
                "docs.google.com"
            )
        ) {

            return;

        }


        /* -------------------------------------------------
           SAME-ORIGIN REQUESTS
        ------------------------------------------------- */

        if (
            url.origin === self.location.origin
        ) {

            event.respondWith(

                networkFirst(
                    request
                )

            );

            return;

        }


        /* -------------------------------------------------
           EXTERNAL RESOURCES
           
           Fonts, icons, libraries etc.
        ------------------------------------------------- */

        event.respondWith(

            staleWhileRevalidate(
                request
            )

        );

    }
);


/* =========================================================
   NETWORK FIRST
========================================================= */

async function networkFirst(request) {

    try {

        const networkResponse =
            await fetch(request);


        if (
            networkResponse &&
            networkResponse.ok
        ) {

            const cache =
                await caches.open(
                    CACHE_NAME
                );


            cache.put(
                request,
                networkResponse.clone()
            );

        }


        return networkResponse;

    }

    catch (error) {

        console.warn(
            "AFC Isiu SW: Network unavailable:",
            request.url
        );


        const cachedResponse =
            await caches.match(
                request
            );


        if (cachedResponse) {

            return cachedResponse;

        }


        /* ---------------------------------------------
           SPECIAL OFFLINE NAVIGATION FALLBACK
        --------------------------------------------- */

        if (
            request.mode === "navigate"
        ) {

            const offlinePage =
                await caches.match(
                    "/index.html"
                );


            if (offlinePage) {

                return offlinePage;

            }

        }


        return new Response(
            "AFC Isiu Youth Portal is currently offline.",
            {
                status: 503,
                statusText: "Offline"
            }
        );

    }

}


/* =========================================================
   STALE WHILE REVALIDATE
========================================================= */

async function staleWhileRevalidate(request) {

    const cachedResponse =
        await caches.match(
            request
        );


    const networkFetch =
        fetch(request)

            .then(response => {

                if (
                    response &&
                    response.ok
                ) {

                    caches.open(
                        CACHE_NAME
                    )
                    .then(cache => {

                        cache.put(
                            request,
                            response.clone()
                        );

                    });

                }


                return response;

            })

            .catch(() => null);


    if (cachedResponse) {

        return cachedResponse;

    }


    const networkResponse =
        await networkFetch;


    if (networkResponse) {

        return networkResponse;

    }


    return new Response(
        "",
        {
            status: 503
        }
    );

}
