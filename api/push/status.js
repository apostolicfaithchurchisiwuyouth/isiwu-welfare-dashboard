/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: api/push/status.js

   PURPOSE:
   Secure admin status endpoint for push notifications.

   IMPORTANT:
   PUSH_ADMIN_SECRET is NEVER exposed to frontend source.
   ============================================================ */

export default async function handler(req, res) {

    if (req.method !== "GET") {

        return res.status(405).json({
            success: false,
            message: "Method not allowed."
        });

    }


    const adminSecret =
        process.env.PUSH_ADMIN_SECRET;


    const appsScriptUrl =
        process.env.GOOGLE_APPS_SCRIPT_URL;


    if (!adminSecret) {

        return res.status(500).json({
            success: false,
            message:
                "PUSH_ADMIN_SECRET is not configured."
        });

    }


    if (!appsScriptUrl) {

        return res.status(500).json({
            success: false,
            message:
                "GOOGLE_APPS_SCRIPT_URL is not configured."
        });

    }


    const authorization =
        req.headers.authorization || "";


    const expected =
        `Bearer ${adminSecret}`;


    if (authorization !== expected) {

        return res.status(401).json({
            success: false,
            message:
                "Unauthorized."
        });

    }


    try {

        /*
         * Ask Google Apps Script for the
         * notification system status.
         */

        const url =
            new URL(
                appsScriptUrl
            );


        url.searchParams.set(
            "action",
            "getPushSystemStatus"
        );


        url.searchParams.set(
            "adminSecret",
            adminSecret
        );


        const response =
            await fetch(
                url.toString(),
                {
                    method:
                        "GET",

                    headers: {
                        "Accept":
                            "application/json"
                    },

                    cache:
                        "no-store"
                }
            );


        if (!response.ok) {

            return res.status(502).json({
                success: false,
                message:
                    "Google Apps Script returned HTTP " +
                    response.status
            });

        }


        const data =
            await response.json();


        if (
            data &&
            data.success === false
        ) {

            return res.status(502).json({
                success: false,
                message:
                    data.message ||
                    "Unable to retrieve push status."
            });

        }


        /*
         * Normalize the response so the frontend
         * does not need to know the internal
         * Google Apps Script structure.
         */

        const activeSubscriptions =
            Number(
                data.activeSubscriptions ??
                data.subscribers ??
                data.activeSubscriberCount ??
                data.count ??
                0
            );


        return res.status(200).json({

            success:
                true,

            activeSubscriptions:
                activeSubscriptions,

            timezone:
                data.timezone ||
                "Africa/Lagos",

            vapidConfigured:
                data.vapidConfigured !== false,

            senderConfigured:
                true

        });

    }
    catch (error) {

        console.error(
            "[Push Status]",
            error
        );


        return res.status(500).json({

            success:
                false,

            message:
                "Unable to retrieve notification status.",

            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined

        });

    }

}
