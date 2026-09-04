/**
 * ============================================================
 * AFC ISIU YOUTH PORTAL
 * PUSH NOTIFICATION SENDER
 * FILE: api/push/send.js
 * ============================================================
 */

import webpush from "web-push";


export default async function handler(req, res) {

    /* ========================================================
       ONLY ALLOW POST
       ======================================================== */

    if (req.method !== "POST") {

        return res.status(405).json({
            success: false,
            message: "Method not allowed."
        });

    }


    /* ========================================================
       CHECK REQUIRED ENVIRONMENT VARIABLES
       ======================================================== */

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT;
    const adminSecret = process.env.PUSH_ADMIN_SECRET;
    const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;


    if (
        !vapidPublicKey ||
        !vapidPrivateKey ||
        !vapidSubject ||
        !adminSecret ||
        !appsScriptUrl
    ) {

        return res.status(500).json({
            success: false,
            message: "Push notification server is not fully configured."
        });

    }


    /* ========================================================
       CHECK ADMIN AUTHORIZATION
       ======================================================== */

    const authorization = req.headers.authorization || "";

    const expectedAuthorization = `Bearer ${adminSecret}`;


    if (authorization !== expectedAuthorization) {

        return res.status(401).json({
            success: false,
            message: "Unauthorized."
        });

    }


    /* ========================================================
       READ REQUEST BODY
       ======================================================== */

    let body;

    try {

        body = typeof req.body === "string"
            ? JSON.parse(req.body)
            : req.body;

    } catch (error) {

        return res.status(400).json({
            success: false,
            message: "Invalid JSON request."
        });

    }


    body = body || {};


    /* ========================================================
       NOTIFICATION DETAILS
       ======================================================== */

    const title =
        String(body.title || "AFC Isiu Youth Portal").trim();

    const message =
        String(
            body.body ||
            body.message ||
            "You have a new notification."
        ).trim();

    const url =
        typeof body.url === "string" && body.url.trim()
            ? body.url.trim()
            : "/";

    const tag =
        typeof body.tag === "string" && body.tag.trim()
            ? body.tag.trim()
            : "afc-isiu-notification";


    /* ========================================================
       PREPARE PUSH PAYLOAD
       ======================================================== */

    const payload = JSON.stringify({

        title: title,

        body: message,

        icon: "/images/logo.png",

        badge: "/images/logo.png",

        tag: tag,

        url: url

    });


    /* ========================================================
       CONFIGURE WEB PUSH
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

        return res.status(500).json({
            success: false,
            message: "Invalid VAPID configuration."
        });

    }


    /* ========================================================
       GET ACTIVE SUBSCRIPTIONS FROM GOOGLE APPS SCRIPT
       ======================================================== */

    let subscriptions;


    try {

        const response = await fetch(appsScriptUrl, {

            method: "POST",

            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },

            body: JSON.stringify({

                action: "getPushSubscriptions",

                adminSecret: adminSecret

            })

        });


        if (!response.ok) {

            throw new Error(
                `Google Apps Script returned ${response.status}`
            );

        }


        const result = await response.json();


        if (!result.success) {

            throw new Error(
                result.message ||
                "Unable to retrieve push subscriptions."
            );

        }


        subscriptions = Array.isArray(result.subscriptions)
            ? result.subscriptions
            : [];


    } catch (error) {

        console.error(
            "Subscription retrieval error:",
            error
        );

        return res.status(502).json({

            success: false,

            message:
                "Unable to retrieve push subscriptions.",

            error:
                error.message

        });

    }


    /* ========================================================
       NO SUBSCRIBERS
       ======================================================== */

    if (subscriptions.length === 0) {

        return res.status(200).json({

            success: true,

            message:
                "There are no active push subscriptions.",

            sent: 0,

            failed: 0,

            total: 0

        });

    }


    /* ========================================================
       SEND NOTIFICATION
       ======================================================== */

    let sent = 0;
    let failed = 0;

    const failures = [];


    for (const subscription of subscriptions) {

        try {

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
                        subscription?.endpoint || null,

                    message:
                        "Invalid push subscription."

                });

                continue;

            }


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


            await webpush.sendNotification(
                pushSubscription,
                payload
            );


            sent++;


        } catch (error) {

            failed++;


            failures.push({

                endpoint:
                    subscription.endpoint,

                statusCode:
                    error.statusCode || null,

                message:
                    error.message || "Push failed."

            });


            console.error(
                "Push notification failed:",
                error
            );

        }

    }


    /* ========================================================
       RETURN RESULT
       ======================================================== */

    return res.status(200).json({

        success: true,

        message:
            "Push notification process completed.",

        total:
            subscriptions.length,

        sent:
            sent,

        failed:
            failed,

        failures:
            failures

    });

}
