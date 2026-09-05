/**
 * ============================================================
 * AFC ISIU YOUTH PORTAL V2
 * SERVICE WORKER
 * VERSION: 18
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
 * - Push notification data comes from /api/push/send.js.
 * - Existing working notification architecture is preserved.
 * ============================================================
 */

"use strict";


/* ============================================================
   VERSION
   ============================================================ */

const VERSION = "18";

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
                 * This prevents one missing optional asset
                 * from breaking the entire service-worker install.
                 */

                for (const url of APP_SHELL) {

                    try {

                        await cache.add(url);

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
                 * Make the new service worker available
                 * immediately.
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

                        return null;

                    })

                );

            })

            .then(() => {

                /*
                 * Take control of all currently open pages.
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

                            await cache.add(url);

                            console.log(
                                "AFC Isiu PWA: Cached audio:",
                                url
                            );

                        } catch (error) {

                            console.warn(
                                "AFC Isiu PWA: Could not cache audio:",
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

        const normalized = value
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
 * Ensures a notification URL stays inside the AFC Isiu portal.
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
         * Never allow push notifications to redirect
         * users to an unrelated external website.
         */

        if (url.origin !== self.location.origin) {

            return fallback;

        }

        return `${url.pathname}${url.search}${url.hash}`;

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
function getNotificationActions(data, defaultUrl) {

    let actions = data.actions;

    /*
     * If actions arrive as JSON text, parse them.
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

    if (Array.isArray(actions) && actions.length) {

        return actions

            .slice(0, 2)

            .map(action => {

                if (!action || typeof action !== "object") {

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

                    action: actionName,

                    title: title.substring(0, 40),

                    ...(action.icon
                        ? {
                            icon: getSafeNotificationUrl(
                                action.icon
                            )
                        }
                        : {})

                };

            })

            .filter(Boolean);

    }


    /*
     * Otherwise create a sensible action automatically
     * based on notification type.
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

    const safeUrl = getSafeNotificationUrl(targetUrl);

    const absoluteUrl = new URL(
        safeUrl,
        self.location.origin
    ).href;


    /*
     * First try to find an already-open AFC Isiu tab/window.
     */

    const clients = await self.clients.matchAll({

        type: "window",

        includeUncontrolled: true

    });


    for (const client of clients) {

        try {

            const clientUrl = new URL(client.url);

            if (
                clientUrl.origin === self.location.origin
            ) {

                await client.navigate(absoluteUrl);

                if (typeof client.focus === "function") {

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
     * If no AFC Isiu window exists, open a new one.
     */

    if (self.clients.openWindow) {

        await self.clients.openWindow(absoluteUrl);

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
     * Parse push payload safely.
     */

    if (event.data) {

        try {

            data = event.data.json();

        } catch (error) {

            try {

                data = {

                    body: event.data.text()

                };

            } catch (textError) {

                data = {};

            }

        }

    }


    /* --------------------------------------------------------
       BASIC CONTENT
       -------------------------------------------------------- */

    const type = String(

        data.type ||
        data.category ||
        "announcement"

    )
        .trim()
        .toLowerCase();


    const title = String(

        data.title ||

        "AFC Isiu Youth"

    ).trim();


    const body = String(

        data.body ||

        data.message ||

        "You have a new notification."

    ).trim();


    /* --------------------------------------------------------
       BRAND ASSETS
       -------------------------------------------------------- */

    /*
     * We are temporarily using the existing logo.
     *
     * Later, these can become:
     *
     * /images/notification-icon.png
     * /images/notification-badge.png
     *
     * without changing the notification architecture.
     */

    const icon = getSafeNotificationUrl(

        data.icon ||

        "/images/logo.png"

    );


    const badge = getSafeNotificationUrl(

        data.badge ||

        "/images/logo.png"

    );


    /* --------------------------------------------------------
       DEEP LINK
       -------------------------------------------------------- */

    const targetUrl = getSafeNotificationUrl(

        data.url ||

        "/"

    );


    /* --------------------------------------------------------
       TAG
       -------------------------------------------------------- */

    const tag = String(

        data.tag ||

        `afc-isiu-${type}`

    )

        .trim()

        .substring(0, 100);


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
                null

        },

        actions: getNotificationActions(
            data,
            targetUrl
        )

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

            options.image = safeImage;

        }

    }


    /* --------------------------------------------------------
       OPTIONAL VIBRATION
       -------------------------------------------------------- */

    if (Array.isArray(data.vibrate)) {

        options.vibrate = data.vibrate;

    }


    /* --------------------------------------------------------
       SHOW NOTIFICATION
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


    /*
     * If an action has a custom URL, use it.
     */

    let targetUrl =
        notificationData.url || "/";


    /*
     * The backend can optionally provide:
     *
     * actionUrls: {
     *     open: "/pages/lessons",
     *     quiz: "/pages/quiz"
     * }
     */

    if (
        event.action &&
        notificationData.actionUrls &&
        typeof notificationData.actionUrls === "object"
    ) {

        const actionUrl =
            notificationData.actionUrls[
                event.action
            ];

        if (actionUrl) {

            targetUrl = actionUrl;

        }

    }


    /*
     * "dismiss" simply closes the notification.
     */

    if (event.action === "dismiss") {

        return;

    }


    event.waitUntil(

        openNotificationUrl(targetUrl)

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

self.addEventListener("notificationclose", event => {

    console.log(
        "AFC Isiu PWA: Notification dismissed."
    );

});


/* ============================================================
   FETCH
   ============================================================ */

self.addEventListener("fetch", event => {

    const request = event.request;


    /* --------------------------------------------------------
       ONLY HANDLE GET
       -------------------------------------------------------- */

    if (request.method !== "GET") {

        return;

    }


    let url;

    try {

        url = new URL(request.url);

    } catch (error) {

        return;

    }


    /* --------------------------------------------------------
       IMPORTANT: BYPASS API REQUESTS
       -------------------------------------------------------- */

    /*
     * This prevents the service worker from turning
     * /api/push/status
     * /api/push/schedules
     * /api/push/history
     * /api/push/run
     * /api/push/send
     *
     * into "Offline" responses.
     */

    if (

        url.origin === self.location.origin &&

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
        url.origin !== self.location.origin
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

                            cache.put(
                                request,
                                networkResponse.clone()
                            );

                        }

                        return networkResponse;

                    } catch (error) {

                        const cachedResponse =
                            await cache.match(request);

                        if (cachedResponse) {

                            return cachedResponse;

                        }

                        return new Response(
                            "",
                            {
                                status: 503,
                                statusText: "Offline"
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

            fetch(request)

                .then(response => {

                    /*
                     * Save successful navigation response.
                     */

                    if (
                        response &&
                        response.ok
                    ) {

                        const responseClone =
                            response.clone();

                        caches.open(STATIC_CACHE)
                            .then(cache => {

                                cache.put(
                                    request,
                                    responseClone
                                );

                            });

                    }

                    return response;

                })

                .catch(async () => {

                    /*
                     * First try the exact request.
                     */

                    const cachedResponse =
                        await caches.match(request);

                    if (cachedResponse) {

                        return cachedResponse;

                    }


                    /*
                     * Then check our clean URL map.
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
                     * Finally fall back to index.
                     */

                    const indexResponse =
                        await caches.match(
                            "/index.html"
                        );

                    if (indexResponse) {

                        return indexResponse;

                    }


                    return new Response(

                        "AFC Isiu Youth Portal is currently offline.",

                        {

                            status: 503,

                            statusText: "Offline",

                            headers: {

                                "Content-Type":
                                    "text/plain; charset=utf-8"

                            }

                        }

                    );

                })

        );

        return;

    }


    /* --------------------------------------------------------
       STATIC ASSETS
       -------------------------------------------------------- */

    event.respondWith(

        fetch(request)

            .then(response => {

                if (
                    response &&
                    response.ok
                ) {

                    caches.open(STATIC_CACHE)
                        .then(cache => {

                            cache.put(
                                request,
                                response.clone()
                            );

                        });

                }

                return response;

            })

            .catch(async () => {

                const cachedResponse =
                    await caches.match(request);

                if (cachedResponse) {

                    return cachedResponse;

                }


                return new Response(

                    "Offline",

                    {

                        status: 503,

                        statusText: "Offline"

                    }

                );

            })

    );

});
