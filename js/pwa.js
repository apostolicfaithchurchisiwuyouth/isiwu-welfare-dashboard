/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: pwa.js
   PURPOSE:
   - PWA installation handling
   - Service worker registration
   - Push notification permission
   - Anonymous push subscription management
   - Notification status
   - Push API communication
   ============================================================ */

(function () {

    "use strict";


    /* ============================================================
       CONFIGURATION
       ============================================================ */

    const PWA_CONFIG = {

        SERVICE_WORKER: "/sw.js",

        MANIFEST: "/manifest.json",

        INSTALL_DISPLAY_MODE:
            "(display-mode: standalone)",

        INSTALL_DISPLAY_MODE_FULLSCREEN:
            "(display-mode: fullscreen)",

        /*
         * IMPORTANT:
         * This is the correct Apps Script deployment URL.
         *
         * Do NOT change the URL unless the Apps Script deployment
         * itself is changed.
         */
        PUSH_API_URL:
            "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec",

        /*
         * Vercel endpoint used to retrieve the public VAPID key.
         */
        PUSH_CONFIG_URL:
            "/api/push/config"

    };


    /* ============================================================
       INTERNAL STATE
       ============================================================ */

    let deferredInstallPrompt = null;

    let serviceWorkerRegistration = null;

    let pushPublicKey = null;


    /* ============================================================
       DOM HELPERS
       ============================================================ */

    function $(selector) {

        return document.querySelector(selector);

    }


    function $all(selector) {

        return document.querySelectorAll(selector);

    }


    /* ============================================================
       LOGGING
       ============================================================ */

    function log() {

        if (window.console) {

            console.log(
                "[AFC PWA]",
                ...arguments
            );

        }

    }


    function warn() {

        if (window.console) {

            console.warn(
                "[AFC PWA]",
                ...arguments
            );

        }

    }


    function error() {

        if (window.console) {

            console.error(
                "[AFC PWA]",
                ...arguments
            );

        }

    }


    /* ============================================================
       SERVICE WORKER SUPPORT
       ============================================================ */

    function isServiceWorkerSupported() {

        return (
            "serviceWorker" in navigator
        );

    }


    async function registerServiceWorker() {

        if (!isServiceWorkerSupported()) {

            warn(
                "Service workers are not supported by this browser."
            );

            return null;

        }


        try {

            serviceWorkerRegistration =
                await navigator.serviceWorker.register(
                    PWA_CONFIG.SERVICE_WORKER,
                    {
                        scope: "/"
                    }
                );


            log(
                "Service worker registered:",
                serviceWorkerRegistration.scope
            );


            /*
             * Wait until the current page is controlled where possible.
             */
            if (!navigator.serviceWorker.controller) {

                await new Promise(function (resolve) {

                    let finished = false;


                    function complete() {

                        if (finished) return;

                        finished = true;

                        navigator.serviceWorker.removeEventListener(
                            "controllerchange",
                            complete
                        );

                        resolve();

                    }


                    navigator.serviceWorker.addEventListener(
                        "controllerchange",
                        complete
                    );


                    setTimeout(
                        complete,
                        3000
                    );

                });

            }


            return serviceWorkerRegistration;

        } catch (err) {

            error(
                "Service worker registration failed:",
                err
            );

            return null;

        }

    }


    async function getPushRegistration() {

        if (!isServiceWorkerSupported()) {

            throw new Error(
                "This browser does not support service workers."
            );

        }


        if (serviceWorkerRegistration) {

            return serviceWorkerRegistration;

        }


        serviceWorkerRegistration =
            await navigator.serviceWorker.getRegistration("/");


        if (!serviceWorkerRegistration) {

            serviceWorkerRegistration =
                await registerServiceWorker();

        }


        if (!serviceWorkerRegistration) {

            throw new Error(
                "Unable to register the service worker."
            );

        }


        return serviceWorkerRegistration;

    }


    /* ============================================================
       PWA INSTALLATION
       ============================================================ */

    function isStandalone() {

        return (
            window.matchMedia &&
            (
                window.matchMedia(
                    PWA_CONFIG.INSTALL_DISPLAY_MODE
                ).matches ||
                window.matchMedia(
                    PWA_CONFIG.INSTALL_DISPLAY_MODE_FULLSCREEN
                ).matches
            )
        );

    }


    function isIOSStandalone() {

        return (
            window.navigator &&
            window.navigator.standalone === true
        );

    }


    function isPWAInstalled() {

        return (
            isStandalone() ||
            isIOSStandalone()
        );

    }


    function canInstallPWA() {

        return (
            deferredInstallPrompt !== null &&
            !isPWAInstalled()
        );

    }


    async function installPWA() {

        if (isPWAInstalled()) {

            return {
                success: true,
                installed: true,
                message: "The app is already installed."
            };

        }


        if (!deferredInstallPrompt) {

            return {
                success: false,
                installed: false,
                message:
                    "The installation prompt is not available right now."
            };

        }


        try {

            deferredInstallPrompt.prompt();

            const choice =
                await deferredInstallPrompt.userChoice;


            deferredInstallPrompt = null;


            if (
                choice &&
                choice.outcome === "accepted"
            ) {

                log(
                    "PWA installation accepted."
                );


                return {
                    success: true,
                    installed: true,
                    outcome: "accepted"
                };

            }


            log(
                "PWA installation dismissed."
            );


            return {
                success: false,
                installed: false,
                outcome: "dismissed"
            };

        } catch (err) {

            error(
                "PWA installation failed:",
                err
            );


            deferredInstallPrompt = null;


            return {
                success: false,
                installed: false,
                error: err.message
            };

        }

    }


    function handleBeforeInstallPrompt(event) {

        event.preventDefault();

        deferredInstallPrompt = event;


        log(
            "PWA installation prompt is available."
        );


        window.dispatchEvent(
            new CustomEvent(
                "afc:pwa-install-available"
            )
        );

    }


    function handleAppInstalled() {

        deferredInstallPrompt = null;


        log(
            "AFC Isiu Youth Portal was installed."
        );


        window.dispatchEvent(
            new CustomEvent(
                "afc:pwa-installed"
            )
        );

    }


    /* ============================================================
       PUSH NOTIFICATION SUPPORT
       ============================================================ */

    function isPushSupported() {

        return (
            "serviceWorker" in navigator &&
            "PushManager" in window &&
            "Notification" in window
        );

    }


    /*
     * Returns:
     *
     * "granted"
     * "denied"
     * "default"
     * "unsupported"
     */
    async function getPushPermissionState() {

        if (!isPushSupported()) {

            return "unsupported";

        }


        return Notification.permission;

    }


    async function requestPushPermission() {

        if (!isPushSupported()) {

            throw new Error(
                "Push notifications are not supported by this browser."
            );

        }


        if (
            Notification.permission === "granted"
        ) {

            return "granted";

        }


        if (
            Notification.permission === "denied"
        ) {

            return "denied";

        }


        const permission =
            await Notification.requestPermission();


        return permission;

    }


    /* ============================================================
       BASE64URL → UINT8ARRAY
       ============================================================ */

    function base64UrlToUint8Array(base64UrlData) {

        if (!base64UrlData) {

            throw new Error(
                "No VAPID public key was supplied."
            );

        }


        const padding =
            "=".repeat(
                (4 - (base64UrlData.length % 4)) % 4
            );


        const base64 =
            (
                base64UrlData +
                padding
            )
                .replace(/-/g, "+")
                .replace(/_/g, "/");


        const rawData =
            window.atob(base64);


        const outputArray =
            new Uint8Array(
                rawData.length
            );


        for (
            let i = 0;
            i < rawData.length;
            i++
        ) {

            outputArray[i] =
                rawData.charCodeAt(i);

        }


        return outputArray;

    }


    /* ============================================================
       FETCH VAPID PUBLIC KEY
       ============================================================ */

    async function getVapidPublicKey() {

        if (pushPublicKey) {

            return pushPublicKey;

        }


        const response =
            await fetch(
                PWA_CONFIG.PUSH_CONFIG_URL,
                {
                    method: "GET",
                    credentials: "same-origin",
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Unable to load notification configuration. HTTP " +
                response.status
            );

        }


        let result;


        try {

            result =
                await response.json();

        } catch (err) {

            throw new Error(
                "The notification configuration returned an invalid response."
            );

        }


        if (
            !result ||
            !result.success ||
            !result.publicKey
        ) {

            throw new Error(
                (
                    result &&
                    result.message
                ) ||
                "The VAPID public key is unavailable."
            );

        }


        pushPublicKey =
            result.publicKey;


        return pushPublicKey;

    }


    /* ============================================================
       PUSH API REQUEST
       ============================================================ */

    /*
     * IMPORTANT:
     *
     * Do NOT use:
     *
     * Content-Type: application/json
     *
     * here.
     *
     * Google Apps Script web apps can trigger a CORS preflight
     * with application/json.
     *
     * URLSearchParams is intentionally used so the request can
     * be sent as application/x-www-form-urlencoded without the
     * browser requiring the problematic JSON preflight.
     */

    async function postPushApi(payload) {

        if (!payload) {

            throw new Error(
                "No push API payload was supplied."
            );

        }


        const body =
            new URLSearchParams();


        body.set(
            "payload",
            JSON.stringify(payload)
        );


        const response =
            await fetch(
                PWA_CONFIG.PUSH_API_URL,
                {
                    method: "POST",
                    body: body
                }
            );


        if (!response.ok) {

            throw new Error(
                "Push API returned HTTP " +
                response.status
            );

        }


        let result;


        try {

            result =
                await response.json();

        } catch (err) {

            throw new Error(
                "The Push API returned an invalid response."
            );

        }


        if (
            !result ||
            !result.success
        ) {

            throw new Error(
                (
                    result &&
                    result.message
                ) ||
                "The Push API request failed."
            );

        }


        return result;

    }


    /* ============================================================
       SAVE PUSH SUBSCRIPTION
       ============================================================ */

    /*
     * Anonymous subscription.
     *
     * No login.
     * No member ID.
     * No member name required.
     *
     * Anyone who enables notifications becomes an active
     * notification subscriber.
     */

    async function savePushSubscription(subscription) {

        if (!subscription) {

            throw new Error(
                "No push subscription is available."
            );

        }


        return postPushApi({

            action:
                "savePushSubscription",

            subscription:
                subscription.toJSON(),

            userAgent:
                navigator.userAgent

        });

    }


    /* ============================================================
       DELETE PUSH SUBSCRIPTION
       ============================================================ */

    async function deletePushSubscription(
        subscription
    ) {

        if (!subscription) {

            return {
                success: true
            };

        }


        return postPushApi({

            action:
                "deletePushSubscription",

            endpoint:
                subscription.endpoint

        });

    }


    /* ============================================================
       SUBSCRIBE TO PUSH NOTIFICATIONS
       ============================================================ */

    async function subscribeToPush() {

        if (!isPushSupported()) {

            throw new Error(
                "Push notifications are not supported on this device."
            );

        }


        const registration =
            await getPushRegistration();


        /*
         * Check existing permission.
         */

        let permission =
            Notification.permission;


        /*
         * Request permission only when necessary.
         */

        if (
            permission === "default"
        ) {

            permission =
                await Notification.requestPermission();

        }


        if (
            permission !== "granted"
        ) {

            if (
                permission === "denied"
            ) {

                throw new Error(
                    "Notification permission was denied. Please enable notifications in your browser settings."
                );

            }


            throw new Error(
                "Notification permission was not granted."
            );

        }


        /*
         * Reuse an existing subscription where possible.
         */

        let subscription =
            await registration.pushManager.getSubscription();


        /*
         * Create a new subscription if none exists.
         */

        if (!subscription) {

            const publicKey =
                await getVapidPublicKey();


            subscription =
                await registration.pushManager.subscribe({

                    userVisibleOnly:
                        true,

                    applicationServerKey:
                        base64UrlToUint8Array(
                            publicKey
                        )

                });

        }


        /*
         * Save the subscription anonymously.
         */

        const saved =
            await savePushSubscription(
                subscription
            );


        log(
            "Push subscription saved successfully."
        );


        return {

            success:
                true,

            subscription:
                subscription,

            result:
                saved

        };

    }


    /* ============================================================
       UNSUBSCRIBE FROM PUSH
       ============================================================ */

    async function unsubscribeFromPush() {

        if (!isPushSupported()) {

            return {

                success:
                    true,

                unsubscribed:
                    false,

                supported:
                    false

            };

        }


        const registration =
            await getPushRegistration();


        const subscription =
            await registration.pushManager.getSubscription();


        if (!subscription) {

            return {

                success:
                    true,

                unsubscribed:
                    false

            };

        }


        /*
         * Tell Apps Script to remove the subscription first.
         */

        try {

            await deletePushSubscription(
                subscription
            );

        } catch (err) {

            warn(
                "Unable to remove subscription from server:",
                err
            );

        }


        /*
         * Then unsubscribe locally.
         */

        const unsubscribed =
            await subscription.unsubscribe();


        log(
            "Push subscription removed locally."
        );


        return {

            success:
                true,

            unsubscribed:
                unsubscribed

        };

    }


    /* ============================================================
       GET CURRENT PUSH STATUS
       ============================================================ */

    async function getPushStatus() {

        if (!isPushSupported()) {

            return {

                supported:
                    false,

                permission:
                    "unsupported",

                subscribed:
                    false

            };

        }


        const permission =
            Notification.permission;


        let subscribed =
            false;


        try {

            const registration =
                await getPushRegistration();


            const subscription =
                await registration.pushManager.getSubscription();


            subscribed =
                !!subscription;

        } catch (err) {

            warn(
                "Unable to inspect push subscription:",
                err
            );

        }


        return {

            supported:
                true,

            permission:
                permission,

            subscribed:
                subscribed

        };

    }


    /* ============================================================
       TEST LOCAL NOTIFICATION
       ============================================================ */

    async function showLocalNotification(
        title,
        options
    ) {

        if (!isPushSupported()) {

            throw new Error(
                "Notifications are not supported by this browser."
            );

        }


        if (
            Notification.permission !==
            "granted"
        ) {

            throw new Error(
                "Notification permission has not been granted."
            );

        }


        const registration =
            await getPushRegistration();


        const notificationOptions =
            Object.assign(

                {

                    body:
                        "AFC Isiu Youth Portal notification.",

                    icon:
                        "/images/logo.png",

                    badge:
                        "/images/logo.png",

                    tag:
                        "afc-isiu-test-notification",

                    renotify:
                        true,

                    requireInteraction:
                        false,

                    data:
                        {
                            url:
                                window.location.origin + "/"
                        }

                },

                options || {}

            );


        await registration.showNotification(

            title ||
            "AFC Isiu Youth Portal",

            notificationOptions

        );


        return {

            success:
                true

        };

    }


    /* ============================================================
       NOTIFICATION CLICK HELPERS
       ============================================================ */

    function openNotificationSettings() {

        /*
         * Browsers do not provide a universal JavaScript API for
         * opening the exact notification permission settings page.
         *
         * Returning the current state lets the UI tell the user
         * what to do.
         */

        return getPushPermissionState();

    }


    /* ============================================================
       ONLINE / OFFLINE STATE
       ============================================================ */

    function isOnline() {

        return navigator.onLine;

    }


    function handleOnline() {

        log(
            "Internet connection restored."
        );


        window.dispatchEvent(
            new CustomEvent(
                "afc:pwa-online"
            )
        );

    }


    function handleOffline() {

        warn(
            "The device is offline."
        );


        window.dispatchEvent(
            new CustomEvent(
                "afc:pwa-offline"
            )
        );

    }


    /* ============================================================
       SERVICE WORKER UPDATE CHECK
       ============================================================ */

    async function checkForServiceWorkerUpdate() {

        if (
            !serviceWorkerRegistration
        ) {

            try {

                await getPushRegistration();

            } catch (err) {

                return {

                    success:
                        false,

                    error:
                        err.message

                };

            }

        }


        try {

            await serviceWorkerRegistration.update();


            return {

                success:
                    true

            };

        } catch (err) {

            warn(
                "Service worker update check failed:",
                err
            );


            return {

                success:
                    false,

                error:
                    err.message

            };

        }

    }


    /* ============================================================
       APP INITIALIZATION
       ============================================================ */

    async function initializePWA() {

        log(
            "Initializing AFC Isiu Youth Portal PWA..."
        );


        /*
         * Register service worker.
         */

        await registerServiceWorker();


        /*
         * Notify application that PWA initialization is complete.
         */

        window.dispatchEvent(
            new CustomEvent(
                "afc:pwa-ready",
                {
                    detail: {

                        installed:
                            isPWAInstalled(),

                        installAvailable:
                            canInstallPWA(),

                        pushSupported:
                            isPushSupported(),

                        online:
                            isOnline()

                    }

                }
            )
        );


        log(
            "PWA initialization complete."
        );

    }


    /* ============================================================
       EVENT LISTENERS
       ============================================================ */

    window.addEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
    );


    window.addEventListener(
        "appinstalled",
        handleAppInstalled
    );


    window.addEventListener(
        "online",
        handleOnline
    );


    window.addEventListener(
        "offline",
        handleOffline
    );


    /*
     * Start once DOM is ready.
     */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializePWA,
            {
                once:
                    true
            }
        );

    } else {

        initializePWA();

    }


    /* ============================================================
       PUBLIC API
       ============================================================ */

    window.AFC_PWA = {

        /*
         * Configuration
         */

        config:
            PWA_CONFIG,


        /*
         * PWA installation
         */

        isStandalone:
            isStandalone,

        isPWAInstalled:
            isPWAInstalled,

        canInstallPWA:
            canInstallPWA,

        installPWA:
            installPWA,


        /*
         * Service worker
         */

        registerServiceWorker:
            registerServiceWorker,

        getPushRegistration:
            getPushRegistration,

        checkForServiceWorkerUpdate:
            checkForServiceWorkerUpdate,


        /*
         * Push support
         */

        isPushSupported:
            isPushSupported,

        getPushPermissionState:
            getPushPermissionState,

        requestPushPermission:
            requestPushPermission,

        getVapidPublicKey:
            getVapidPublicKey,


        /*
         * Push subscription
         */

        subscribeToPush:
            subscribeToPush,

        unsubscribeFromPush:
            unsubscribeFromPush,

        savePushSubscription:
            savePushSubscription,

        deletePushSubscription:
            deletePushSubscription,

        getPushStatus:
            getPushStatus,


        /*
         * Notification
         */

        showLocalNotification:
            showLocalNotification,

        openNotificationSettings:
            openNotificationSettings,


        /*
         * Network
         */

        isOnline:
            isOnline

    };


    /* ============================================================
       GLOBAL DEBUG ACCESS
       ============================================================ */

    log(
        "AFC_PWA API loaded successfully."
    );


    log(
        "Push supported:",
        isPushSupported()
    );


    log(
        "PWA installed:",
        isPWAInstalled()
    );


})();
