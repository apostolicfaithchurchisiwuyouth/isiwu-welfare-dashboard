/**
 * ============================================================
 * AFC ISIU YOUTH PORTAL V2
 * SERVICE WORKER
 * VERSION: 19
 * ============================================================
 *
 * PURPOSE:
 * - PWA installation
 * - Offline support
 * - Lesson/audio caching
 * - Push notifications
 * - Premium branded notification handling
 * - Notification deep linking
 *
 * IMPORTANT:
 * - API requests under /api/ bypass the service worker.
 * - API responses are NEVER cached.
 * - Runtime caching is defensive so cache failures cannot
 *   interfere with normal page/network responses.
 * ============================================================
 */

"use strict";


/* ============================================================
   VERSION
   ============================================================ */

const VERSION = "19";

const CACHE_NAME = `afc-isiu-pwa-v${VERSION}`;

const STATIC_CACHE = `afc-isiu-static-v${VERSION}`;

const LESSON_CACHE = `afc-isiu-lessons-v${VERSION}`;


/* ============================================================
   APP SHELL
   ============================================================ */

const APP_SHELL = [

    "/",

    "/index.html",

    "/manifest.json",

    "/css/main.css",

    "/css/layout.css",

    "/css/lessons.css",

   "/css/academichelp.css",

    "/js/main.js",

    "/js/pwa.js",

    "/js/lessons.js",

    "/images/logo.png",

    "/pages/lessons.html"

];


/* ============================================================
   CLEAN PAGE MAP
   ============================================================ */

const CLEAN_PAGE_MAP = {

    "/pages/lessons": "/pages/lessons.html"

};


/* ============================================================
   INSTALL
   ============================================================ */

self.addEventListener("install", event => {

    console.log(
        `AFC Isiu PWA: Installing service worker V${VERSION}`
    );

    event.waitUntil(

        caches.open(STATIC_CACHE)

            .then(async cache => {

                /*
                 * Cache files individually.
                 *
                 * One missing file must never prevent the
                 * service worker from installing.
                 */

                for (const url of APP_SHELL) {

                    try {

                        await cache.add(url);

                        console.log(
                            "AFC Isiu PWA: Cached app shell:",
                            url
                        );

                    } catch (error) {

                        console.warn(
                            "AFC Isiu PWA: Could not cache:",
                            url,
                            error
                        );

                    }

                }

            })

            .then(() => {

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
        `AFC Isiu PWA: Activating service worker V${VERSION}`
    );

    event.waitUntil(

        caches.keys()

            .then(cacheNames => {

                return Promise.all(

                    cacheNames.map(cacheName => {

                        if (

                            cacheName.startsWith("afc-isiu-") &&

                            cacheName !== STATIC_CACHE &&

                            cacheName !== LESSON_CACHE

                        ) {

                            console.log(
                                "AFC Isiu PWA: Removing old cache:",
                                cacheName
                            );

                            return caches.delete(cacheName);

                        }

                        return Promise.resolve();

                    })

                );

            })

            .then(() => {

                /*
                 * Take control of existing pages.
                 */

                return self.clients.claim();

            })

    );

});


/* ============================================================
   MESSAGE HANDLER
   ============================================================ */

self.addEventListener("message", event => {

    if (!event.data) {

        return;

    }


    /* --------------------------------------------------------
       FORCE ACTIVATION
       -------------------------------------------------------- */

    if (event.data.type === "SKIP_WAITING") {

        self.skipWaiting();

        return;

    }


    /* --------------------------------------------------------
       CACHE LESSON AUDIO
       -------------------------------------------------------- */

    if (event.data.type === "CACHE_LESSON_AUDIO") {

        const urls = Array.isArray(event.data.urls)
            ? event.data.urls
            : [];


        if (!urls.length) {

            return;

        }


        event.waitUntil(

            caches.open(LESSON_CACHE)

                .then(async cache => {

                    for (const url of urls) {

                        try {

                            const response =
                                await fetch(url);


                            if (
                                !response ||
                                !response.ok
                            ) {

                                console.warn(
                                    "AFC Isiu PWA: Audio request failed:",
                                    url
                                );

                                continue;

                            }


                            /*
                             * Clone IMMEDIATELY.
                             *
                             * The clone is given to the cache.
                             * The original response is not consumed.
                             */

                            let cacheResponse;

                            try {

                                cacheResponse =
                                    response.clone();

                            } catch (cloneError) {

                                console.warn(
                                    "AFC Isiu PWA: Could not clone audio response:",
                                    url,
                                    cloneError
                                );

                                continue;

                            }


                            try {

                                await cache.put(
                                    url,
                                    cacheResponse
                                );

                                console.log(
                                    "AFC Isiu PWA: Cached audio:",
                                    url
                                );

                            } catch (cacheError) {

                                console.warn(
                                    "AFC Isiu PWA: Could not cache audio:",
                                    url,
                                    cacheError
                                );

                            }

                        } catch (error) {

                            console.warn(
                                "AFC Isiu PWA: Could not download audio:",
                                url,
                                error
                            );

                        }

                    }

                })

        );

    }

});


/* ============================================================
   PUSH NOTIFICATION HELPERS
   ============================================================ */


/**
 * Safely converts different values into booleans.
 */
function toBoolean(value, fallback = false) {

    if (typeof value === "boolean") {

        return value;

    }


    if (typeof value === "string") {

        const normalized =
            value
                .trim()
                .toLowerCase();


        if (
            normalized === "true" ||
            normalized === "1" ||
            normalized === "yes"
        ) {

            return true;

        }


        if (
            normalized === "false" ||
            normalized === "0" ||
            normalized === "no"
        ) {

            return false;

        }

    }


    if (typeof value === "number") {

        return value !== 0;

    }


    return fallback;

}


/**
 * Ensures notification URLs stay inside the AFC Isiu portal.
 */
function getSafeNotificationUrl(value) {

    const fallback = "/";


    if (
        typeof value !== "string" ||
        !value.trim()
    ) {

        return fallback;

    }


    const rawUrl = value.trim();


    try {

        const url = new URL(
            rawUrl,
            self.location.origin
        );


        /*
         * Never allow a notification to redirect
         * outside the AFC Isiu Youth Portal.
         */

        if (
            url.origin !== self.location.origin
        ) {

            return fallback;

        }


        return (
            url.pathname +
            url.search +
            url.hash
        );

    } catch (error) {

        console.warn(
            "AFC Isiu PWA: Invalid notification URL:",
            value
        );

        return fallback;

    }

}


/**
 * Creates safe notification actions.
 */
function getNotificationActions(data) {

    let actions = data.actions;


    /*
     * Actions may arrive as JSON text.
     */

    if (typeof actions === "string") {

        try {

            actions = JSON.parse(actions);

        } catch (error) {

            actions = [];

        }

    }


    /*
     * Use supplied actions when valid.
     */

    if (
        Array.isArray(actions) &&
        actions.length
    ) {

        return actions

            .slice(0, 2)

            .map(action => {

                if (
                    !action ||
                    typeof action !== "object"
                ) {

                    return null;

                }


                const actionName =
                    typeof action.action === "string"
                        ? action.action.trim()
                        : "open";


                const title =
                    typeof action.title === "string"
                        ? action.title.trim()
                        : "";


                if (!title) {

                    return null;

                }


                return {

                    action:
                        actionName.substring(0, 40),

                    title:
                        title.substring(0, 40),

                    ...(action.icon
                        ? {
                            icon:
                                getSafeNotificationUrl(
                                    action.icon
                                )
                        }
                        : {})

                };

            })

            .filter(Boolean);

    }


    /*
     * Automatic action based on notification type.
     */

    const type = String(

        data.type ||
        data.category ||
        ""

    )
        .trim()
        .toLowerCase();


    const actionTitles = {

        lesson: "Read Lesson",

        new_lesson: "Read Lesson",

        quiz: "Take Quiz",

        new_quiz: "Take Quiz",

        programme: "View Programme",

        birthday: "Open Portal",

        announcement: "Open",

        once: "Open",

        weekly: "View Programme"

    };


    const actionTitle =
        actionTitles[type] || "Open";


    return [{

        action: "open",

        title: actionTitle

    }];

}


/**
 * Opens/focuses the AFC Isiu portal.
 */
async function openNotificationUrl(targetUrl) {

    const safeUrl =
        getSafeNotificationUrl(targetUrl);


    const absoluteUrl =
        new URL(
            safeUrl,
            self.location.origin
        ).href;


    const clients =
        await self.clients.matchAll({

            type: "window",

            includeUncontrolled: true

        });


    /*
     * First look for an already-open portal window.
     */

    for (const client of clients) {

        try {

            const clientUrl =
                new URL(client.url);


            if (
                clientUrl.origin ===
                self.location.origin
            ) {

                await client.navigate(
                    absoluteUrl
                );


                if (
                    typeof client.focus ===
                    "function"
                ) {

                    await client.focus();

                }


                return;

            }

        } catch (error) {

            console.warn(
                "AFC Isiu PWA: Could not focus existing client:",
                error
            );

        }

    }


    /*
     * No existing portal window.
     * Open a new one.
     */

    if (self.clients.openWindow) {

        await self.clients.openWindow(
            absoluteUrl
        );

    }

}


/* ============================================================
   PUSH EVENT
   ============================================================ */

self.addEventListener("push", event => {

    console.log(
        "AFC Isiu PWA: Push notification received."
    );


    let data = {};


    /*
     * Safely parse push payload.
     */

    if (event.data) {

        try {

            data = event.data.json();

        } catch (error) {

            try {

                data = {

                    body:
                        event.data.text()

                };

            } catch (textError) {

                data = {};

            }

        }

    }


    /* --------------------------------------------------------
       TYPE
       -------------------------------------------------------- */

    const type = String(

        data.type ||
        data.category ||
        "announcement"

    )
        .trim()
        .toLowerCase();


    /* --------------------------------------------------------
       TITLE
       -------------------------------------------------------- */

    const title = String(

        data.title ||

        "AFC Isiu Youth"

    ).trim();


    /* --------------------------------------------------------
       BODY
       -------------------------------------------------------- */

    const body = String(

        data.body ||

        data.message ||

        "You have a new notification."

    ).trim();


    /* --------------------------------------------------------
       BRAND ASSETS
       -------------------------------------------------------- */

    const icon =
        getSafeNotificationUrl(

            data.icon ||
            "/images/logo.png"

        );


    const badge =
        getSafeNotificationUrl(

            data.badge ||
            "/images/logo.png"

        );


    /* --------------------------------------------------------
       DEEP LINK
       -------------------------------------------------------- */

    const targetUrl =
        getSafeNotificationUrl(

            data.url ||
            "/"

        );


    /* --------------------------------------------------------
       UNIQUE TAG
       -------------------------------------------------------- */

    /*
     * A notification should NOT accidentally replace
     * another notification.
     *
     * If the backend deliberately supplies groupTag,
     * use that tag for intentional grouping/replacement.
     */

    let tag;


    if (
        typeof data.groupTag === "string" &&
        data.groupTag.trim()
    ) {

        tag =
            data.groupTag
                .trim()
                .substring(0, 100);

    } else {

        const suppliedTag =
            typeof data.tag === "string" &&
            data.tag.trim()
                ? data.tag.trim()
                : "";


        /*
         * Legacy tags such as:
         *
         * afc-isiu-notification
         *
         * are deliberately NOT reused.
         */

        if (
            suppliedTag &&
            suppliedTag !== "afc-isiu-notification" &&
            suppliedTag !== "afc-isiu-notification-default"
        ) {

            tag =
                suppliedTag
                    .substring(0, 100);

        } else {

            tag =
                `afc-isiu-${type}-${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2, 8)}`
                    .substring(0, 100);

        }

    }


    /* --------------------------------------------------------
       OPTIONS
       -------------------------------------------------------- */

    const options = {

        body: body,

        icon: icon,

        badge: badge,

        tag: tag,

        renotify: toBoolean(
            data.renotify,
            false
        ),

        requireInteraction: toBoolean(
            data.requireInteraction,
            false
        ),

        silent: toBoolean(
            data.silent,
            false
        ),

        dir: "auto",

        lang: "en-NG",

        timestamp: Date.now(),

        data: {

            url: targetUrl,

            type: type,

            category: type,

            notificationId:
                data.notificationId ||
                data.id ||
                null,

            actionUrls:
                data.actionUrls || {}

        },

        actions:
            getNotificationActions(data)

    };


    /* --------------------------------------------------------
       OPTIONAL LARGE IMAGE
       -------------------------------------------------------- */

    if (

        typeof data.image === "string" &&

        data.image.trim()

    ) {

        const safeImage =
            getSafeNotificationUrl(
                data.image
            );


        if (safeImage !== "/") {

            options.image =
                safeImage;

        }

    }


    /* --------------------------------------------------------
       OPTIONAL VIBRATION
       -------------------------------------------------------- */

    if (
        Array.isArray(data.vibrate)
    ) {

        options.vibrate =
            data.vibrate;

    }


    /* --------------------------------------------------------
       DISPLAY
       -------------------------------------------------------- */

    event.waitUntil(

        self.registration

            .showNotification(
                title,
                options
            )

            .then(() => {

                console.log(
                    "AFC Isiu PWA: Notification displayed:",
                    title
                );

            })

            .catch(error => {

                console.error(
                    "AFC Isiu PWA: Unable to display notification:",
                    error
                );

            })

    );

});


/* ============================================================
   NOTIFICATION CLICK
   ============================================================ */

self.addEventListener("notificationclick", event => {

    console.log(
        "AFC Isiu PWA: Notification clicked:",
        event.action || "body"
    );


    event.notification.close();


    const notificationData =
        event.notification.data || {};


    let targetUrl =
        notificationData.url || "/";


    /*
     * Custom action URL.
     */

    if (

        event.action &&

        notificationData.actionUrls &&

        typeof notificationData.actionUrls ===
        "object"

    ) {

        const actionUrl =
            notificationData.actionUrls[
                event.action
            ];


        if (actionUrl) {

            targetUrl =
                actionUrl;

        }

    }


    /*
     * Dismiss action.
     */

    if (
        event.action === "dismiss"
    ) {

        return;

    }


    event.waitUntil(

        openNotificationUrl(
            targetUrl
        )

            .catch(error => {

                console.error(
                    "AFC Isiu PWA: Could not open notification URL:",
                    error
                );

            })

    );

});


/* ============================================================
   NOTIFICATION CLOSE
   ============================================================ */

self.addEventListener(
    "notificationclose",
    event => {

        console.log(
            "AFC Isiu PWA: Notification dismissed."
        );

    }
);


/* ============================================================
   FETCH
   ============================================================ */

self.addEventListener("fetch", event => {

    const request =
        event.request;


    /* --------------------------------------------------------
       ONLY GET REQUESTS
       -------------------------------------------------------- */

    if (
        request.method !== "GET"
    ) {

        return;

    }


    let url;


    try {

        url =
            new URL(request.url);

    } catch (error) {

        return;

    }


    /* --------------------------------------------------------
       API BYPASS
       -------------------------------------------------------- */

    /*
     * THIS IS VERY IMPORTANT.
     *
     * Quiz requests, authentication requests, leaderboard
     * requests, push APIs, Apps Script-related requests,
     * etc. must not be cached by this service worker.
     */

    if (

        url.origin ===
        self.location.origin &&

        url.pathname.startsWith("/api/")

    ) {

        console.log(
            "AFC Isiu PWA: API request bypassing service worker:",
            url.pathname
        );

        return;

    }


    /* --------------------------------------------------------
       EXTERNAL ORIGINS
       -------------------------------------------------------- */

    if (
        url.origin !==
        self.location.origin
    ) {

        return;

    }


    /* --------------------------------------------------------
       AUDIO
       -------------------------------------------------------- */

    if (
        url.pathname.startsWith("/audio/")
    ) {

        event.respondWith(

            caches.open(LESSON_CACHE)

                .then(async cache => {

                    try {

                        const networkResponse =
                            await fetch(request);


                        if (
                            networkResponse &&
                            networkResponse.ok
                        ) {

                            /*
                             * CRITICAL FIX:
                             *
                             * Clone immediately.
                             *
                             * Do NOT wait until after
                             * asynchronous operations.
                             */

                            let responseForCache;


                            try {

                                responseForCache =
                                    networkResponse.clone();

                            } catch (cloneError) {

                                console.warn(
                                    "AFC Isiu PWA: Audio response could not be cloned:",
                                    cloneError
                                );

                                /*
                                 * Return the network response
                                 * normally even if caching fails.
                                 */

                                return networkResponse;

                            }


                            /*
                             * Cache asynchronously.
                             *
                             * Failure must never affect
                             * the actual audio response.
                             */

                            cache.put(
                                request,
                                responseForCache
                            )
                                .catch(cacheError => {

                                    console.warn(
                                        "AFC Isiu PWA: Audio cache failed:",
                                        cacheError
                                    );

                                });

                        }


                        /*
                         * Return the original response.
                         */

                        return networkResponse;

                    } catch (error) {

                        console.warn(
                            "AFC Isiu PWA: Audio network request failed:",
                            error
                        );


                        const cachedResponse =
                            await cache.match(
                                request
                            );


                        if (cachedResponse) {

                            return cachedResponse;

                        }


                        return new Response(

                            "",

                            {

                                status: 503,

                                statusText:
                                    "Offline"

                            }

                        );

                    }

                })

        );

        return;

    }


    /* --------------------------------------------------------
       NAVIGATION
       -------------------------------------------------------- */

    if (
        request.mode === "navigate"
    ) {

        event.respondWith(

            (async () => {

                try {

                    const networkResponse =
                        await fetch(request);


                    /*
                     * CRITICAL FIX:
                     *
                     * Clone immediately.
                     */

                    let responseForCache = null;


                    if (
                        networkResponse &&
                        networkResponse.ok
                    ) {

                        try {

                            responseForCache =
                                networkResponse.clone();

                        } catch (cloneError) {

                            console.warn(
                                "AFC Isiu PWA: Navigation response could not be cloned:",
                                cloneError
                            );

                        }

                    }


                    /*
                     * Cache using the clone.
                     *
                     * This operation is deliberately
                     * independent from the response returned
                     * to the page.
                     */

                    if (responseForCache) {

                        caches.open(STATIC_CACHE)

                            .then(cache => {

                                return cache.put(
                                    request,
                                    responseForCache
                                );

                            })

                            .catch(cacheError => {

                                console.warn(
                                    "AFC Isiu PWA: Navigation cache failed:",
                                    cacheError
                                );

                            });

                    }


                    /*
                     * Return the ORIGINAL network response.
                     */

                    return networkResponse;

                } catch (networkError) {

                    console.warn(
                        "AFC Isiu PWA: Navigation network request failed:",
                        networkError
                    );


                    /*
                     * Exact request first.
                     */

                    const cachedResponse =
                        await caches.match(
                            request
                        );


                    if (cachedResponse) {

                        return cachedResponse;

                    }


                    /*
                     * Clean URL mapping.
                     */

                    const mappedPath =
                        CLEAN_PAGE_MAP[
                            url.pathname
                        ];


                    if (mappedPath) {

                        const mappedResponse =
                            await caches.match(
                                mappedPath
                            );


                        if (mappedResponse) {

                            return mappedResponse;

                        }

                    }


                    /*
                     * Finally fall back to index.html.
                     */

                    const indexResponse =
                        await caches.match(
                            "/index.html"
                        );


                    if (indexResponse) {

                        return indexResponse;

                    }


                    /*
                     * Final offline response.
                     */

                    return new Response(

                        "AFC Isiu Youth Portal is currently offline.",

                        {

                            status: 503,

                            statusText:
                                "Offline",

                            headers: {

                                "Content-Type":
                                    "text/plain; charset=utf-8"

                            }

                        }

                    );

                }

            })()

        );

        return;

    }


    /* --------------------------------------------------------
       STATIC ASSETS
       -------------------------------------------------------- */

    event.respondWith(

        (async () => {

            try {

                const networkResponse =
                    await fetch(request);


                /*
                 * CRITICAL FIX:
                 *
                 * Clone immediately.
                 */

                let responseForCache = null;


                if (
                    networkResponse &&
                    networkResponse.ok
                ) {

                    try {

                        responseForCache =
                            networkResponse.clone();

                    } catch (cloneError) {

                        console.warn(
                            "AFC Isiu PWA: Asset response could not be cloned:",
                            request.url,
                            cloneError
                        );

                    }

                }


                /*
                 * Cache the clone independently.
                 */

                if (responseForCache) {

                    caches.open(STATIC_CACHE)

                        .then(cache => {

                            return cache.put(
                                request,
                                responseForCache
                            );

                        })

                        .catch(cacheError => {

                            console.warn(
                                "AFC Isiu PWA: Asset cache failed:",
                                request.url,
                                cacheError
                            );

                        });

                }


                /*
                 * ALWAYS return the original network response.
                 */

                return networkResponse;

            } catch (networkError) {

                console.warn(
                    "AFC Isiu PWA: Asset network request failed:",
                    request.url
                );


                const cachedResponse =
                    await caches.match(
                        request
                    );


                if (cachedResponse) {

                    return cachedResponse;

                }


                return new Response(

                    "Offline",

                    {

                        status: 503,

                        statusText:
                            "Offline",

                        headers: {

                            "Content-Type":
                                "text/plain; charset=utf-8"

                        }

                    }

                );

            }

        })()

    );

});
 
