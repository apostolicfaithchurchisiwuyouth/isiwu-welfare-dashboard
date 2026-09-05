/**
 * AFC ISIU YOUTH PORTAL
 * VERCEL API
 * FILE: api/push/history.js
 *
 * Purpose:
 * Securely retrieves notification history from
 * Google Apps Script.
 */

const GOOGLE_APPS_SCRIPT_URL =
    process.env.GOOGLE_APPS_SCRIPT_URL;

const PUSH_ADMIN_SECRET =
    process.env.PUSH_ADMIN_SECRET;


export default async function handler(
    req,
    res
) {

    if (
        req.method !== "GET"
    ) {

        return res.status(405).json({

            success: false,

            message:
                "Method not allowed."

        });

    }


    if (
        !GOOGLE_APPS_SCRIPT_URL
    ) {

        return res.status(500).json({

            success: false,

            message:
                "GOOGLE_APPS_SCRIPT_URL is not configured."

        });

    }


    if (
        !PUSH_ADMIN_SECRET
    ) {

        return res.status(500).json({

            success: false,

            message:
                "PUSH_ADMIN_SECRET is not configured."

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

        const limit =
            Number(
                req.query.limit ||
                100
            );


        const params =
            new URLSearchParams({

                action:
                    "getNotificationHistory",

                adminSecret:
                    PUSH_ADMIN_SECRET,

                limit:
                    String(
                        Math.min(
                            Math.max(
                                limit || 100,
                                1
                            ),
                            500
                        )
                    )

            });


        const response =
            await fetch(
                `${GOOGLE_APPS_SCRIPT_URL}?${params.toString()}`,
                {

                    method:
                        "GET",

                    headers: {

                        Accept:
                            "application/json"

                    }

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

            return res.status(502).json({

                success: false,

                message:
                    "Google Apps Script returned an invalid response."

            });

        }


        if (
            result.success === false
        ) {

            return res.status(400).json(
                result
            );

        }


        return res.status(200).json(
            result
        );

    }

    catch (error) {

        console.error(
            "Push history error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                error.message ||
                "Unable to load notification history."

        });

    }

}
