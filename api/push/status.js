/**
 * AFC ISIU YOUTH PORTAL
 * FILE: /api/push/status.js
 *
 * PURPOSE:
 * Secure server-side status endpoint for the notification admin.
 *
 * IMPORTANT:
 * - Admin secret is never exposed in frontend source.
 * - Vercel calls Google Apps Script server-to-server.
 * - Apps Script status action is called with POST.
 */

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({
            success: false,
            message: "Method not allowed."
        });
    }

    try {
        const adminSecret = process.env.PUSH_ADMIN_SECRET;
        const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;

        if (!adminSecret) {
            console.error("[Push Status] PUSH_ADMIN_SECRET is missing.");

            return res.status(500).json({
                success: false,
                message: "Push admin secret is not configured."
            });
        }

        if (!appsScriptUrl) {
            console.error("[Push Status] GOOGLE_APPS_SCRIPT_URL is missing.");

            return res.status(500).json({
                success: false,
                message: "Google Apps Script URL is not configured."
            });
        }

        const authorization = req.headers.authorization || "";

        if (authorization !== `Bearer ${adminSecret}`) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized."
            });
        }

        /*
         * Apps Script expects POST for getPushSystemStatus.
         *
         * application/x-www-form-urlencoded avoids the browser CORS
         * problem because this request happens server-to-server.
         */
        const response = await fetch(appsScriptUrl, {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded;charset=UTF-8",
                "Accept": "application/json"
            },
            body: new URLSearchParams({
                action: "getPushSystemStatus",
                adminSecret: adminSecret
            }).toString()
        });

        const rawText = await response.text();

        console.log(
            "[Push Status] Apps Script response:",
            response.status,
            rawText
        );

        if (!response.ok) {
            return res.status(502).json({
                success: false,
                message: "Google Apps Script returned an error.",
                upstreamStatus: response.status
            });
        }

        let data;

        try {
            data = JSON.parse(rawText);
        } catch (parseError) {
            console.error(
                "[Push Status] Invalid Apps Script JSON:",
                rawText
            );

            return res.status(502).json({
                success: false,
                message: "Google Apps Script returned an invalid response."
            });
        }

        if (!data || data.success !== true) {
            return res.status(502).json({
                success: false,
                message:
                    data?.message ||
                    "Unable to retrieve push notification status."
            });
        }

        /*
         * Normalize the response so the admin frontend gets
         * predictable field names.
         */
        const source = data.data || data.result || data;

        const activeSubscriptions =
            Number(
                source.activeSubscriptions ??
                source.activeSubscriptionCount ??
                source.subscriptionCount ??
                0
            ) || 0;

        const scheduledNotifications =
            Number(
                source.scheduledNotifications ??
                source.scheduledNotificationCount ??
                0
            ) || 0;

        return res.status(200).json({
            success: true,

            activeSubscriptions,

            scheduledNotifications,

            timezone:
                source.timezone ||
                source.timeZone ||
                "Africa/Lagos",

            vapidConfigured:
                source.vapidConfigured ??
                Boolean(process.env.VAPID_PUBLIC_KEY),

            senderConfigured:
                source.senderConfigured ??
                Boolean(
                    process.env.VAPID_PUBLIC_KEY &&
                    process.env.VAPID_PRIVATE_KEY &&
                    process.env.VAPID_SUBJECT
                ),

            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("[Push Status] Server error:", error);

        return res.status(503).json({
            success: false,
            message: "Push status service is temporarily unavailable."
        });
    }
}
