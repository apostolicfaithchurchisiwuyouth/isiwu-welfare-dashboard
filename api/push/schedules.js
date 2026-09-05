/**
 * AFC ISIU YOUTH PORTAL
 * VERCEL API
 * FILE: api/push/schedules.js
 *
 * Purpose:
 * Secure middleman between the admin notification dashboard
 * and Google Apps Script notification schedule API.
 */

const GOOGLE_APPS_SCRIPT_URL =
    process.env.GOOGLE_APPS_SCRIPT_URL;

const PUSH_ADMIN_SECRET =
    process.env.PUSH_ADMIN_SECRET;


/* ============================================================
   APPS SCRIPT REQUEST
   ============================================================ */

async function callAppsScript(action, data = {}) {

    if (!GOOGLE_APPS_SCRIPT_URL) {

        throw new Error(
            "GOOGLE_APPS_SCRIPT_URL is not configured."
        );

    }

    if (!PUSH_ADMIN_SECRET) {

        throw new Error(
            "PUSH_ADMIN_SECRET is not configured."
        );

    }


    const payload = {

        action:
            action,

        adminSecret:
            PUSH_ADMIN_SECRET,

        ...data

    };


    const response =
        await fetch(
            GOOGLE_APPS_SCRIPT_URL,
            {

                method:
                    "POST",

                headers: {

                    "Content-Type":
                        "application/x-www-form-urlencoded;charset=UTF-8"

                },

                body:
                    new URLSearchParams({

                        payload:
                            JSON.stringify(
                                payload
                            )

                    }).toString()

            }
        );


    const text =
        await response.text();


    let result;


    try {

        result =
            JSON.parse(
                text
            );

    }

    catch (error) {

        throw new Error(
            "Invalid response from Google Apps Script."
        );

    }


    if (
        !response.ok
    ) {

        throw new Error(
            result.message ||
            "Google Apps Script request failed."
        );

    }


    return result;

}


/* ============================================================
   GET
   ============================================================ */

export default async function handler(
    req,
    res
) {

    if (
        !PUSH_ADMIN_SECRET
    ) {

        return res.status(500).json({

            success: false,

            message:
                "Push admin secret is not configured."

        });

    }


    const authorization =
        String(
            req.headers.authorization ||
            ""
        );


    if (
        authorization !==
        `Bearer ${PUSH_ADMIN_SECRET}`
    ) {

        return res.status(401).json({

            success: false,

            message:
                "Unauthorized."

        });

    }


    try {

        /* ======================================================
           GET SCHEDULES
           ====================================================== */

        if (
            req.method === "GET"
        ) {

            const result =
                await callAppsScript(
                    "getNotificationSchedules"
                );


            return res.status(
                result.success === false
                    ? 400
                    : 200
            ).json(
                result
            );

        }


        /* ======================================================
           POST SCHEDULE ACTION
           ====================================================== */

        if (
            req.method === "POST"
        ) {

            let body =
                req.body;


            if (
                typeof body === "string"
            ) {

                try {

                    body =
                        JSON.parse(
                            body
                        );

                }

                catch (error) {

                    body = {};

                }

            }


            body =
                body ||
                {};


            const action =
                String(
                    body.action ||
                    ""
                ).trim();


            const allowedActions = [

                "createNotification",
                "updateNotification",
                "deleteNotification",
                "toggleNotification"

            ];


            if (
                allowedActions.indexOf(
                    action
                ) === -1
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid schedule action."

                });

            }


            const result =
                await callAppsScript(
                    action,
                    body
                );


            return res.status(
                result.success === false
                    ? 400
                    : 200
            ).json(
                result
            );

        }


        return res.status(405).json({

            success: false,

            message:
                "Method not allowed."

        });

    }

    catch (error) {

        console.error(
            "Push schedules error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Unable to process schedule request."

        });

    }

}
