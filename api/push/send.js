/**
 * ============================================================
 * AFC ISIU YOUTH PORTAL
 * PREMIUM PUSH NOTIFICATION SENDER
 * FILE: api/push/send.js
 * VERSION: 18
 * ============================================================
 *
 * PURPOSE:
 * - Authenticate admin push requests
 * - Retrieve active subscriptions from Google Apps Script
 * - Send Web Push notifications
 * - Support branded notification metadata
 * - Support notification types/categories
 * - Support deep links
 * - Support notification actions
 * - Support optional large notification images
 *
 * IMPORTANT:
 * - Existing Google Apps Script architecture is preserved.
 * - Existing VAPID environment variables are preserved.
 * - Existing PUSH_ADMIN_SECRET is preserved.
 * ============================================================
 */

import webpush from "web-push";


/* ============================================================
   CONSTANTS
   ============================================================ */

const PORTAL_ORIGIN =
    "https://afcisiuyouth.vercel.app";

const DEFAULT_ICON =
    "/images/logo.png";

const DEFAULT_BADGE =
    "/images/logo.png";

const DEFAULT_TAG =
    "afc-isiu-notification";


/* ============================================================
   RESPONSE HELPERS
   ============================================================ */

function jsonResponse(res, status, data) {

    return res
        .status(status)
        .json(data);

}


/* ============================================================
   BOOLEAN HELPER
   ============================================================ */

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


/* ============================================================
   URL HELPER
   ============================================================ */

/**
 * Only allows internal portal URLs.
 *
 * Relative URLs are preferred:
 *
 * /pages/lessons
 * /pages/quiz
 * /
 *
 * External URLs are rejected.
 */
function normalizePortalUrl(value) {

    if (
        typeof value !== "string" ||
        !value.trim()
    ) {

        return "/";

    }

    const rawUrl =
        value.trim();


    try {

        const parsed =
            new URL(
                rawUrl,
                PORTAL_ORIGIN
            );


        if (
            parsed.origin !==
            PORTAL_ORIGIN
        ) {

            return "/";

        }


        return (
            parsed.pathname +
            parsed.search +
            parsed.hash
        );

    } catch (error) {

        return "/";

    }

}


/* ============================================================
   TYPE NORMALIZATION
   ============================================================ */

function normalizeNotificationType(value) {

    const raw =
        String(
            value ||
            "announcement"
        )
            .trim()
            .toLowerCase();


    const aliases = {

        "newlesson": "lesson",

        "new_lesson": "lesson",

        "new-lesson": "lesson",

        "lesson": "lesson",

        "newquiz": "quiz",

        "new_quiz": "quiz",

        "new-quiz": "quiz",

        "quiz": "quiz",

        "program": "programme",

        "programmes": "programme",

        "programme": "programme",

        "weekly": "weekly",

        "birthday": "birthday",

        "announcement": "announcement",

        "once": "once"

    };


    return aliases[raw] || raw;

}


/* ============================================================
   DEFAULT ACTIONS
   ============================================================ */

function getDefaultActions(type) {

    switch (type) {

        case "lesson":

            return [

                {

                    action: "open",

                    title: "Read Lesson"

                }

            ];


        case "quiz":

            return [

                {

                    action: "open",

                    title: "Take Quiz"

                }

            ];


        case "programme":

        case "weekly":

            return [

                {

                    action: "open",

                    title: "View Programme"

                }

            ];


        case "birthday":

            return [

                {

                    action: "open",

                    title: "Open Portal"

                }

            ];


        case "announcement":

        case "once":

        default:

            return [

                {

                    action: "open",

                    title: "Open"

                }

            ];

    }

}


/* ============================================================
   ACTION SANITIZER
   ============================================================ */

function sanitizeActions(actions, type) {

    /*
     * If actions arrive as a JSON string,
     * attempt to parse them.
     */

    if (typeof actions === "string") {

        try {

            actions =
                JSON.parse(actions);

        } catch (error) {

            actions = null;

        }

    }


    /*
     * If valid actions were supplied,
     * use at most two.
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


                const cleaned = {

                    action:
                        actionName
                            .substring(0, 40),

                    title:
                        title
                            .substring(0, 40)

                };


                /*
                 * Action icons are optional.
                 */

                if (
                    typeof action.icon === "string" &&
                    action.icon.trim()
                ) {

                    cleaned.icon =
                        normalizePortalUrl(
                            action.icon
                        );

                }


                return cleaned;

            })

            .filter(Boolean);

    }


    /*
     * Otherwise automatically select
     * an appropriate action.
     */

    return getDefaultActions(type);

}


/* ============================================================
   REQUEST BODY PARSER
   ============================================================ */

function parseRequestBody(req) {

    if (!req.body) {

        return {};

    }


    if (
        typeof req.body === "object"
    ) {

        return req.body;

    }


    if (
        typeof req.body === "string"
    ) {

        try {

            return JSON.parse(
                req.body
            );

        } catch (error) {

            return null;

        }

    }


    return {};

}


/* ============================================================
   MAIN HANDLER
   ============================================================ */

export default async function handler(
    req,
    res
) {

    /* --------------------------------------------------------
       METHOD
       -------------------------------------------------------- */

    if (
        req.method !== "POST"
    ) {

        return jsonResponse(
            res,
            405,
            {

                success: false,

                message:
                    "Method not allowed."

            }
        );

    }


    /* --------------------------------------------------------
       ENVIRONMENT
       -------------------------------------------------------- */

    const vapidPublicKey =
        process.env.VAPID_PUBLIC_KEY;

    const vapidPrivateKey =
        process.env.VAPID_PRIVATE_KEY;

    const vapidSubject =
        process.env.VAPID_SUBJECT;

    const adminSecret =
        process.env.PUSH_ADMIN_SECRET;

    const appsScriptUrl =
        process.env.GOOGLE_APPS_SCRIPT_URL;


    if (
        !vapidPublicKey ||
        !vapidPrivateKey ||
        !vapidSubject ||
        !adminSecret ||
        !appsScriptUrl
    ) {

        console.error(
            "Push server configuration is incomplete."
        );

        return jsonResponse(
            res,
            500,
            {

                success: false,

                message:
                    "Push notification server is not fully configured."

            }
        );

    }


    /* --------------------------------------------------------
       AUTHENTICATION
       -------------------------------------------------------- */

    const authorization =
        req.headers.authorization ||
        "";

    const expectedAuthorization =
        `Bearer ${adminSecret}`;


    if (
        authorization !==
        expectedAuthorization
    ) {

        return jsonResponse(
            res,
            401,
            {

                success: false,

                message:
                    "Unauthorized."

            }
        );

    }


    /* --------------------------------------------------------
       REQUEST BODY
       -------------------------------------------------------- */

    const body =
        parseRequestBody(req);


    if (body === null) {

        return jsonResponse(
            res,
            400,
            {

                success: false,

                message:
                    "Invalid JSON request."

            }
        );

    }


    /* --------------------------------------------------------
       NOTIFICATION TYPE
       -------------------------------------------------------- */

    const type =
        normalizeNotificationType(

            body.type ||

            body.category ||

            body.notificationType

        );


    /* --------------------------------------------------------
       TITLE
       -------------------------------------------------------- */

    const defaultTitles = {

        lesson:
            "New Lesson Available",

        quiz:
            "New Quiz Available",

        programme:
            "Youth Programme",

        weekly:
            "AFC Isiu Youth",

        birthday:
            "Birthday Celebration 🎉",

        announcement:
            "AFC Isiu Youth",

        once:
            "AFC Isiu Youth"

    };


    const title =
        String(

            body.title ||

            defaultTitles[type] ||

            "AFC Isiu Youth"

        )
            .trim()
            .substring(0, 120);


    /* --------------------------------------------------------
       MESSAGE
       -------------------------------------------------------- */

    const message =
        String(

            body.body ||

            body.message ||

            "You have a new notification."

        )
            .trim()
            .substring(0, 500);


    /* --------------------------------------------------------
       DEEP LINK
       -------------------------------------------------------- */

    const url =
        normalizePortalUrl(
            body.url || "/"
        );


    /* --------------------------------------------------------
       TAG
       -------------------------------------------------------- */

    const suppliedTag =
        typeof body.tag === "string" &&
        body.tag.trim()
            ? body.tag.trim()
            : "";


    const tag =
        (
            suppliedTag ||

            `afc-isiu-${type}` ||

            DEFAULT_TAG

        )
            .substring(0, 100);


    /* --------------------------------------------------------
       BRAND ICON
       -------------------------------------------------------- */

    /*
     * Current temporary asset:
     *
     * /images/logo.png
     *
     * Later we can change this to:
     *
     * /images/notification-icon.png
     */

    const icon =
        normalizePortalUrl(

            body.icon ||

            DEFAULT_ICON

        );


    /* --------------------------------------------------------
       BADGE
       -------------------------------------------------------- */

    /*
     * Current temporary asset:
     *
     * /images/logo.png
     *
     * Later we can change this to:
     *
     * /images/notification-badge.png
     */

    const badge =
        normalizePortalUrl(

            body.badge ||

            DEFAULT_BADGE

        );


    /* --------------------------------------------------------
       OPTIONAL LARGE IMAGE
       -------------------------------------------------------- */

    let image = null;


    if (
        typeof body.image === "string" &&
        body.image.trim()
    ) {

        image =
            normalizePortalUrl(
                body.image
            );

        if (image === "/") {

            image = null;

        }

    }


    /* --------------------------------------------------------
       NOTIFICATION BEHAVIOR
       -------------------------------------------------------- */

    const renotify =
        toBoolean(
            body.renotify,
            false
        );


    const requireInteraction =
        toBoolean(
            body.requireInteraction,
            false
        );


    const silent =
        toBoolean(
            body.silent,
            false
        );


    /* --------------------------------------------------------
       ACTIONS
       -------------------------------------------------------- */

    const actions =
        sanitizeActions(
            body.actions,
            type
        );


    /* --------------------------------------------------------
       ACTION URLS
       -------------------------------------------------------- */

    let actionUrls = {};


    if (
        body.actionUrls &&
        typeof body.actionUrls === "object"
    ) {

        for (
            const [action, actionUrl]
            of Object.entries(
                body.actionUrls
            )
        ) {

            if (
                typeof actionUrl === "string"
            ) {

                actionUrls[action] =
                    normalizePortalUrl(
                        actionUrl
                    );

            }

        }

    }


    /*
     * For the normal "open" action,
     * always make sure the main notification
     * destination is available.
     */

    if (!actionUrls.open) {

        actionUrls.open =
            url;

    }


    /* ========================================================
       FINAL WEB PUSH PAYLOAD
       ======================================================== */

    const notificationPayload = {

        title,

        body: message,

        icon,

        badge,

        tag,

        url,

        type,

        category: type,

        renotify,

        requireInteraction,

        silent,

        actions,

        actionUrls,

        timestamp:
            Date.now()

    };


    if (image) {

        notificationPayload.image =
            image;

    }


    const payload =
        JSON.stringify(
            notificationPayload
        );


    /* ========================================================
       VAPID CONFIGURATION
       ======================================================== */

    try {

        webpush.setVapidDetails(

            vapidSubject,

            vapidPublicKey,

            vapidPrivateKey

        );

    } catch (error) {

        console.error(
            "VAPID configuration error:",
            error
        );

        return jsonResponse(
            res,
            500,
            {

                success: false,

                message:
                    "Invalid VAPID configuration."

            }
        );

    }


    /* ========================================================
       GET ACTIVE SUBSCRIPTIONS
       ======================================================== */

    let subscriptions;


    try {

        const response =
            await fetch(
                appsScriptUrl,
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "text/plain;charset=utf-8"

                    },

                    body:
                        JSON.stringify({

                            action:
                                "getPushSubscriptions",

                            adminSecret:
                                adminSecret

                        })

                }
            );


        if (!response.ok) {

            throw new Error(

                `Google Apps Script returned ${response.status}`

            );

        }


        const result =
            await response.json();


        if (!result.success) {

            throw new Error(

                result.message ||

                "Unable to retrieve push subscriptions."

            );

        }


        subscriptions =
            Array.isArray(
                result.subscriptions
            )
                ? result.subscriptions
                : [];


    } catch (error) {

        console.error(
            "Subscription retrieval error:",
            error
        );

        return jsonResponse(
            res,
            502,
            {

                success: false,

                message:
                    "Unable to retrieve push subscriptions.",

                error:
                    error.message

            }
        );

    }


    /* ========================================================
       NO SUBSCRIBERS
       ======================================================== */

    if (
        subscriptions.length === 0
    ) {

        return jsonResponse(
            res,
            200,
            {

                success: true,

                message:
                    "There are no active push subscriptions.",

                total: 0,

                sent: 0,

                failed: 0,

                notification: {

                    title,

                    type,

                    url

                }

            }
        );

    }


    /* ========================================================
       SEND NOTIFICATIONS
       ======================================================== */

    let sent = 0;

    let failed = 0;

    const failures = [];


    for (
        const subscription
        of subscriptions
    ) {

        try {

            /* ------------------------------------------------
               VALIDATE SUBSCRIPTION
               ------------------------------------------------ */

            if (
                !subscription ||
                !subscription.endpoint ||
                !subscription.keys ||
                !subscription.keys.p256dh ||
                !subscription.keys.auth
            ) {

                failed++;

                failures.push({

                    endpoint:
                        subscription?.endpoint ||
                        null,

                    message:
                        "Invalid push subscription."

                });

                continue;

            }


            /* ------------------------------------------------
               BUILD WEB PUSH SUBSCRIPTION
               ------------------------------------------------ */

            const pushSubscription = {

                endpoint:
                    subscription.endpoint,

                keys: {

                    p256dh:
                        subscription.keys.p256dh,

                    auth:
                        subscription.keys.auth

                }

            };


            /* ------------------------------------------------
               SEND
               ------------------------------------------------ */

            await webpush.sendNotification(

                pushSubscription,

                payload

            );


            sent++;


        } catch (error) {

            failed++;


            const statusCode =
                error.statusCode ||
                null;


            const endpoint =
                subscription.endpoint;


            failures.push({

                endpoint,

                statusCode,

                message:
                    error.message ||
                    "Push failed."

            });


            console.error(

                "Push notification failed:",

                {

                    endpoint,

                    statusCode,

                    message:
                        error.message

                }

            );

        }

    }


    /* ========================================================
       RESULT
       ======================================================== */

    return jsonResponse(
        res,
        200,
        {

            success: true,

            message:
                "Premium push notification process completed.",

            total:
                subscriptions.length,

            sent,

            failed,

            notification: {

                title,

                type,

                category: type,

                url,

                tag,

                icon,

                badge,

                actions,

                image

            },

            failures

        }
    );

}
