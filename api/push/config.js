/**
 * ============================================================
 * AFC ISIU YOUTH PORTAL
 * PUSH NOTIFICATION CONFIGURATION
 * FILE: api/push/config.js
 * ============================================================
 */

export default function handler(req, res) {

    // Allow only GET requests
    if (req.method !== "GET") {
        return res.status(405).json({
            success: false,
            message: "Method not allowed."
        });
    }

    const publicKey = process.env.VAPID_PUBLIC_KEY;

    // Make sure the key has been added to Vercel
    if (!publicKey) {
        return res.status(500).json({
            success: false,
            message: "VAPID public key is not configured."
        });
    }

    return res.status(200).json({
        success: true,
        publicKey: publicKey
    });
}
