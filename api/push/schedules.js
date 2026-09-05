export default async function handler(req, res) {
    /*
     * ============================================================
     * AFC ISIU YOUTH PORTAL
     * VERCEL API — PUSH NOTIFICATION SCHEDULES
     *
     * GET:
     *   Load notification schedules
     *
     * POST:
     *   Create / update / delete / toggle schedules
     *
     * Architecture:
     *
     * Admin Dashboard
     *       ↓
     * Vercel /api/push/schedules
     *       ↓
     * Google Apps Script
     *       ↓
     * Google Sheets
     * ============================================================
     */

    /* ============================================================
       CORS
       ============================================================ */

    res.setHeader(
        "Access-Control-Allow-Origin",
        "https://afcisiuyouth.vercel.app"
    );

    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    );

    res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate"
    );


    /* ============================================================
       PREFLIGHT
       ============================================================ */

    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }


    /* ============================================================
       ENVIRONMENT
       ============================================================ */

    const appsScriptUrl =
        String(
            process.env.GOOGLE_APPS_SCRIPT_URL || ""
        ).trim();

    const adminSecret =
        String(
            process.env.PUSH_ADMIN_SECRET || ""
        ).trim();


    if (!appsScriptUrl) {

        console.error(
            "[Push Schedules] GOOGLE_APPS_SCRIPT_URL is missing."
        );

        return res.status(500).json({
            success: false,
            message:
                "Google Apps Script URL is not configured."
        });

    }


    if (!adminSecret) {

        console.error(
            "[Push Schedules] PUSH_ADMIN_SECRET is missing."
        );

        return res.status(500).json({
            success: false,
            message:
                "Push admin secret is not configured."
        });

    }


    /* ============================================================
       AUTHORISATION
       ============================================================ */

    const authorization =
        String(
            req.headers.authorization || ""
        ).trim();

    const expectedAuthorization =
        `Bearer ${adminSecret}`;


    if (
        authorization !==
        expectedAuthorization
    ) {

        console.warn(
            "[Push Schedules] Unauthorized request."
        );

        return res.status(401).json({
            success: false,
            message:
                "Unauthorized."
        });

    }


    /* ============================================================
       GET — LOAD SCHEDULES
       ============================================================ */

    if (req.method === "GET") {

        try {

            const url =
                new URL(
                    appsScriptUrl
                );

            url.searchParams.set(
                "action",
                "getNotificationSchedules"
            );

            url.searchParams.set(
                "adminSecret",
                adminSecret
            );


            console.log(
                "[Push Schedules] Loading schedules..."
            );


            const response =
                await fetch(
                    url.toString(),
                    {
                        method: "GET",
                        redirect: "follow",
                        cache: "no-store"
                    }
                );


            const text =
                await response.text();


            console.log(
                "[Push Schedules] Apps Script HTTP:",
                response.status
            );


            if (!response.ok) {

                console.error(
                    "[Push Schedules] Apps Script error:",
                    text
                );

                return res.status(502).json({
                    success: false,
                    message:
                        "Google Apps Script returned HTTP " +
                        response.status + ".",
                    details:
                        text.slice(0, 1000)
                });

            }


            let data;

            try {

                data =
                    JSON.parse(text);

            } catch (error) {

                console.error(
                    "[Push Schedules] Invalid Apps Script JSON:",
                    text
                );

                return res.status(502).json({
                    success: false,
                    message:
                        "Google Apps Script returned invalid JSON.",
                    details:
                        text.slice(0, 1000)
                });

            }


            return res.status(200).json(
                data
            );

        } catch (error) {

            console.error(
                "[Push Schedules] GET failed:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Unable to load notification schedules."
            });

        }

    }


    /* ============================================================
       POST — SCHEDULE MANAGEMENT
       ============================================================ */

    if (req.method === "POST") {

        try {

            let body =
                req.body || {};


            /*
             * Vercel normally parses JSON automatically,
             * but this also supports string bodies.
             */

            if (
                typeof body === "string"
            ) {

                try {

                    body =
                        JSON.parse(body);

                } catch (error) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "Invalid JSON request body."
                    });

                }

            }


            const action =
                String(
                    body.action || ""
                ).trim();


            const allowedActions = [
                "createNotification",
                "updateNotification",
                "deleteNotification",
                "toggleNotification"
            ];


            if (
                !allowedActions.includes(
                    action
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid notification schedule action."
                });

            }


            /*
             * Remove browser-supplied secret.
             *
             * Vercel always inserts the trusted
             * environment-variable secret.
             */

            const payload = {
                ...body,
                action:
                    action,
                adminSecret:
                    adminSecret
            };


            const form =
                new URLSearchParams();

            form.set(
                "payload",
                JSON.stringify(
                    payload
                )
            );


            console.log(
                "[Push Schedules] Sending action:",
                action
            );


            const response =
                await fetch(
                    appsScriptUrl,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/x-www-form-urlencoded;charset=UTF-8"
                        },

                        body:
                            form.toString(),

                        redirect:
                            "follow",

                        cache:
                            "no-store"
                    }
                );


            const text =
                await response.text();


            console.log(
                "[Push Schedules] Apps Script POST HTTP:",
                response.status
            );


            if (!response.ok) {

                console.error(
                    "[Push Schedules] Apps Script POST error:",
                    text
                );

                return res.status(502).json({
                    success: false,
                    message:
                        "Google Apps Script returned HTTP " +
                        response.status + ".",
                    details:
                        text.slice(0, 1000)
                });

            }


            let data;

            try {

                data =
                    JSON.parse(text);

            } catch (error) {

                console.error(
                    "[Push Schedules] Invalid POST JSON:",
                    text
                );

                return res.status(502).json({
                    success: false,
                    message:
                        "Google Apps Script returned invalid JSON.",
                    details:
                        text.slice(0, 1000)
                });

            }


            return res.status(200).json(
                data
            );


        } catch (error) {

            console.error(
                "[Push Schedules] POST failed:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Unable to manage notification schedule."
            });

        }

    }


    /* ============================================================
       METHOD NOT ALLOWED
       ============================================================ */

    return res.status(405).json({
        success: false,
        message:
            "Method not allowed."
    });

}
