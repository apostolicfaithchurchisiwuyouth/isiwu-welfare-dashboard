/* =========================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: pwa.js
   VERSION: 3.1

   PURPOSE:
   - PWA service worker registration
   - Native PWA installation
   - Install prompt handling
   - Installed-state detection
   - Manifest verification
   - PWA diagnostics
   - Push notification subscription

   IMPORTANT:
   - Push notifications do NOT require login.
   - Push notifications do NOT require member ID.
   - Any visitor can enable notifications.
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONFIG
       ===================================================== */

    const PWA_CONFIG = {

        SERVICE_WORKER:
            "/sw.js",

        MANIFEST:
            "/manifest.json",

        INSTALL_DISPLAY_MODE:
            "(display-mode: standalone)",

        INSTALL_DISPLAY_MODE_FULLSCREEN:
            "(display-mode: fullscreen)",

        PUSH_API_URL:
            "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec",

        PUSH_CONFIG_URL:
            "/api/push/config"

    };


    /* =====================================================
       STATE
       ===================================================== */

    let deferredInstallPrompt =
        null;

    let serviceWorkerRegistration =
        null;


    /* =====================================================
       DOM HELPERS
       ===================================================== */

    function $(id) {

        return document.getElementById(id);

    }


    /* =====================================================
       DOM ELEMENTS
       ===================================================== */

    let installButton = null;

    let helpButton = null;

    let status = null;

    let statusDot = null;

    let statusText = null;


    /* =====================================================
       INITIALISE DOM REFERENCES
       ===================================================== */

    function cacheDOM() {

        installButton =
            $("installAppBtn");

        helpButton =
            $("pwaHelpBtn");

        status =
            $("pwaStatus");

        statusDot =
            $("pwaStatusDot");

        statusText =
            $("pwaStatusText");

    }


    /* =====================================================
       STATUS
       ===================================================== */

    function setStatus(
        type,
        message
    ) {

        if (status) {

            status.classList.remove(
                "available",
                "installed",
                "checking",
                "unavailable"
            );


            if (type) {

                status.classList.add(
                    type
                );

            }

        }


        if (statusDot) {

            statusDot.classList.remove(
                "available",
                "installed",
                "checking",
                "unavailable"
            );


            if (type) {

                statusDot.classList.add(
                    type
                );

            }

        }


        if (statusText) {

            statusText.textContent =
                message;

        }

    }


    /* =====================================================
       INSTALLED DETECTION
       ===================================================== */

    function isAppInstalled() {

        const standalone =
            window.matchMedia &&
            window.matchMedia(
                PWA_CONFIG.INSTALL_DISPLAY_MODE
            ).matches;


        const fullscreen =
            window.matchMedia &&
            window.matchMedia(
                PWA_CONFIG.INSTALL_DISPLAY_MODE_FULLSCREEN
            ).matches;


        const iosStandalone =
            window.navigator.standalone === true;


        return (

            standalone ||

            fullscreen ||

            iosStandalone

        );

    }


    /* =====================================================
       SHOW INSTALL BUTTON
       ===================================================== */

    function showInstallButton() {

        if (
            !installButton
        ) {

            return;

        }


        installButton.hidden =
            false;


        installButton.style.display =
            "inline-flex";


        installButton.disabled =
            false;


        installButton.removeAttribute(
            "aria-hidden"
        );

    }


    /* =====================================================
       HIDE INSTALL BUTTON
       ===================================================== */

    function hideInstallButton() {

        if (
            !installButton
        ) {

            return;

        }


        installButton.hidden =
            true;


        installButton.style.display =
            "none";


        installButton.setAttribute(
            "aria-hidden",
            "true"
        );

    }


    /* =====================================================
       INSTALL BUTTON READY
       ===================================================== */

    function setInstallButtonReady() {

        if (
            !installButton
        ) {

            return;

        }


        showInstallButton();


        installButton.disabled =
            false;


        installButton.classList.add(
            "pwa-install-ready"
        );


        installButton.setAttribute(
            "aria-label",
            "Install AFC Isiu Youth Portal"
        );

    }


    /* =====================================================
       INSTALL BUTTON WAITING
       ===================================================== */

    function setInstallButtonWaiting() {

        if (
            !installButton
        ) {

            return;

        }


        showInstallButton();


        installButton.disabled =
            false;


        installButton.classList.remove(
            "pwa-install-ready"
        );

    }


    /* =====================================================
       INSTALLING STATE
       ===================================================== */

    function setInstallingState() {

        if (
            !installButton
        ) {

            return;

        }


        installButton.disabled =
            true;


        installButton.classList.add(
            "is-installing"
        );


        const icon =
            installButton.querySelector(
                "i"
            );


        if (
            icon
        ) {

            icon.classList.remove(
                "fa-download",
                "fa-mobile-screen-button",
                "fa-plus"
            );


            icon.classList.add(
                "fa-spinner",
                "fa-spin"
            );

        }


        const text =
            installButton.querySelector(
                ".install-button-text"
            );


        if (
            text
        ) {

            text.textContent =
                "Installing...";

        }

    }


    /* =====================================================
       RESET INSTALL BUTTON
       ===================================================== */

    function resetInstallButton() {

        if (
            !installButton
        ) {

            return;

        }


        installButton.disabled =
            false;


        installButton.classList.remove(
            "is-installing"
        );


        const icon =
            installButton.querySelector(
                "i"
            );


        if (
            icon
        ) {

            icon.classList.remove(
                "fa-spinner",
                "fa-spin"
            );


            icon.classList.add(
                "fa-download"
            );

        }


        const text =
            installButton.querySelector(
                ".install-button-text"
            );


        if (
            text
        ) {

            text.textContent =
                "Install App";

        }

    }


    /* =====================================================
       OPEN INSTALL HELP
       ===================================================== */

    function openInstallHelp() {

        const modal =
            $("pwaInstallModal");


        if (
            !modal
        ) {

            console.warn(
                "[PWA] Install help modal not found."
            );

            return;

        }


        modal.classList.add(
            "show"
        );


        modal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "pwa-modal-open"
        );

    }


    /* =====================================================
       CLOSE INSTALL HELP
       ===================================================== */

    function closeInstallHelp() {

        const modal =
            $("pwaInstallModal");


        if (
            !modal
        ) {

            return;

        }


        modal.classList.remove(
            "show"
        );


        modal.setAttribute(
            "aria-hidden",
            "true"
        );


        document.body.classList.remove(
            "pwa-modal-open"
        );

    }


    /* =====================================================
       REGISTER SERVICE WORKER
       ===================================================== */

    async function registerServiceWorker() {

        if (
            !("serviceWorker" in navigator)
        ) {

            console.warn(
                "[PWA] Service workers are not supported."
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


            console.log(
                "[PWA] Service worker registered:",
                serviceWorkerRegistration.scope
            );


            return serviceWorkerRegistration;

        }

        catch (
            error
        ) {

            console.error(
                "[PWA] Service worker registration failed:",
                error
            );


            return null;

        }

    }


    /* =====================================================
       PWA SUPPORT
       ===================================================== */

    function isPWASupported() {

        return (
            "serviceWorker" in navigator
        );

    }


    /* =====================================================
       PUSH SUPPORT
       ===================================================== */

    function isPushSupported() {

        return (

            "serviceWorker" in navigator &&

            "PushManager" in window &&

            "Notification" in window

        );

    }


    /* =====================================================
       BASE64 URL → UINT8 ARRAY
       ===================================================== */

    function base64UrlToUint8Array(
        base64UrlData
    ) {

        const padding =
            "=".repeat(
                (
                    4 -
                    base64UrlData.length % 4
                ) % 4
            );


        const base64 =
            (
                base64UrlData +
                padding
            )
            .replace(
                /-/g,
                "+"
            )
            .replace(
                /_/g,
                "/"
            );


        const rawData =
            window.atob(
                base64
            );


        const outputArray =
            new Uint8Array(
                rawData.length
            );


        for (
            let i = 0;
            i < rawData.length;
            ++i
        ) {

            outputArray[i] =
                rawData.charCodeAt(
                    i
                );

        }


        return outputArray;

    }


    /* =====================================================
       GET SERVICE WORKER REGISTRATION
       ===================================================== */

    async function getPushRegistration() {

        if (
            serviceWorkerRegistration
        ) {

            return serviceWorkerRegistration;

        }


        if (
            !("serviceWorker" in navigator)
        ) {

            return null;

        }


        return registerServiceWorker();

    }


    /* =====================================================
       GET VAPID PUBLIC KEY
       ===================================================== */

    async function getVapidPublicKey() {

        const response =
            await fetch(
                PWA_CONFIG.PUSH_CONFIG_URL,
                {
                    method: "GET",

                    cache: "no-store",

                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );


        if (
            !response.ok
        ) {

            throw new Error(
                "Push configuration returned HTTP " +
                response.status
            );

        }


        const data =
            await response.json();


        const publicKey =
            String(
                data.publicKey ||
                data.vapidPublicKey ||
                ""
            ).trim();


        if (
            !publicKey
        ) {

            throw new Error(
                "The push server did not provide a VAPID public key."
            );

        }


        return publicKey;

    }


    /* =====================================================
       GET CURRENT PUSH SUBSCRIPTION
       ===================================================== */

    async function getPushSubscription() {

        if (
            !isPushSupported()
        ) {

            return null;

        }


        const registration =
            await getPushRegistration();


        if (
            !registration
        ) {

            return null;

        }


        return registration
            .pushManager
            .getSubscription();

    }


    /* =====================================================
       POST TO PUSH API
       
       IMPORTANT:
       -----------------------------------------------------
       URLSearchParams creates an
       application/x-www-form-urlencoded request.
       
       This avoids the CORS preflight that was causing:
       
       "No Access-Control-Allow-Origin header"
       
       and:
       
       "404 (Not Found)"
       ===================================================== */

    async function postPushApi(
        payload
    ) {

        const body =
            new URLSearchParams();


        body.set(
            "payload",
            JSON.stringify(
                payload
            )
        );


        const response =
            await fetch(
                PWA_CONFIG.PUSH_API_URL,
                {

                    method: "POST",

                    body: body

                }
            );


        if (
            !response.ok
        ) {

            throw new Error(
                "Push API returned HTTP " +
                response.status
            );

        }


        let result;


        try {

            result =
                await response.json();

        }

        catch (
            error
        ) {

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
                )
                ||
                "The Push API request failed."

            );

        }


        return result;

    }


    /* =====================================================
       SAVE PUSH SUBSCRIPTION
       
       IMPORTANT:
       -----------------------------------------------------
       NO MEMBER ID.
       NO LOGIN.
       NO ACCOUNT.
       
       Any visitor can subscribe.
       ===================================================== */

    async function savePushSubscription(
        subscription
    ) {

        if (
            !subscription
        ) {

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


    /* =====================================================
       SUBSCRIBE TO PUSH
       ===================================================== */

    async function subscribeToPush() {

        if (
            !isPushSupported()
        ) {

            throw new Error(
                "Push notifications are not supported by this browser or app."
            );

        }


        const registration =
            await getPushRegistration();


        if (
            !registration
        ) {

            throw new Error(
                "The AFC Isiu service worker is not ready."
            );

        }


        let permission =
            Notification.permission;


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
                    "Notifications are blocked. Enable notifications for AFC Isiu in your browser settings."
                );

            }


            throw new Error(
                "Notification permission was not granted."
            );

        }


        let subscription =
            await registration
                .pushManager
                .getSubscription();


        if (
            !subscription
        ) {

            const publicKey =
                await getVapidPublicKey();


            subscription =
                await registration
                    .pushManager
                    .subscribe({

                        userVisibleOnly:
                            true,

                        applicationServerKey:
                            base64UrlToUint8Array(
                                publicKey
                            )

                    });

        }


        /*
         * Do not report success until Apps Script
         * confirms that the subscription was saved.
         */

        const saved =
            await savePushSubscription(
                subscription
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


    /* =====================================================
       DELETE PUSH SUBSCRIPTION FROM SERVER
       ===================================================== */

    async function deletePushSubscriptionFromServer(
        subscription
    ) {

        if (
            !subscription
        ) {

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


    /* =====================================================
       UNSUBSCRIBE FROM PUSH
       ===================================================== */

    async function unsubscribeFromPush() {

        if (
            !isPushSupported()
        ) {

            return {

                success:
                    false,

                supported:
                    false,

                message:
                    "Push notifications are not supported."

            };

        }


        const registration =
            await getPushRegistration();


        if (
            !registration
        ) {

            return {

                success:
                    false,

                message:
                    "The service worker is not available."

            };

        }


        const subscription =
            await registration
                .pushManager
                .getSubscription();


        if (
            !subscription
        ) {

            return {

                success:
                    true,

                subscribed:
                    false

            };

        }


        try {

            await deletePushSubscriptionFromServer(
                subscription
            );

        }

        catch (
            error
        ) {

            console.warn(
                "[Notifications] Could not remove subscription from server:",
                error
            );

        }


        const unsubscribed =
            await subscription.unsubscribe();


        return {

            success:
                unsubscribed,

            subscribed:
                false

        };

    }


    /* =====================================================
       CHECK PUSH STATUS
       ===================================================== */

    async function getPushStatus() {

        if (
            !isPushSupported()
        ) {

            return {

                supported:
                    false,

                permission:
                    "unsupported",

                subscribed:
                    false

            };

        }


        const subscription =
            await getPushSubscription();


        return {

            supported:
                true,

            permission:
                Notification.permission,

            subscribed:
                Boolean(
                    subscription
                ),

            subscription:
                subscription

        };

    }


    /* =====================================================
       NATIVE INSTALL
       ===================================================== */

    async function triggerNativeInstall() {

        if (
            !deferredInstallPrompt
        ) {

            console.warn(
                "[PWA] Native installation prompt is not available."
            );


            return false;

        }


        try {

            console.log(
                "[PWA] Starting native PWA installation."
            );


            setInstallingState();


            deferredInstallPrompt.prompt();


            const choice =
                await deferredInstallPrompt.userChoice;


            console.log(
                "[PWA] Installation choice:",
                choice.outcome
            );


            if (
                choice.outcome ===
                "accepted"
            ) {

                setStatus(
                    "installed",
                    "Installing AFC Isiu Youth Portal..."
                );


                return true;

            }


            setStatus(
                "available",
                "Installation was cancelled. Tap Install App to try again."
            );


            resetInstallButton();


            return false;

        }

        catch (
            error
        ) {

            console.error(
                "[PWA] Native installation failed:",
                error
            );


            setStatus(
                "unavailable",
                "The browser could not start the installation."
            );


            resetInstallButton();


            return false;

        }

        finally {

            deferredInstallPrompt =
                null;

        }

    }


    /* =====================================================
       INSTALL BUTTON
       ===================================================== */

    function bindInstallButton() {

        if (
            !installButton
        ) {

            console.warn(
                "[PWA] #installAppBtn not found."
            );


            return;

        }


        installButton.addEventListener(
            "click",
            async event => {

                event.preventDefault();


                if (
                    !deferredInstallPrompt
                ) {

                    console.warn(
                        "[PWA] Native installation prompt is not available."
                    );


                    setStatus(
                        "unavailable",
                        "Native installation is not currently available in this browser session."
                    );


                    return;

                }


                await triggerNativeInstall();

            }
        );

    }


    /* =====================================================
       HELP BUTTON
       ===================================================== */

    function bindHelpButton() {

        if (
            !helpButton
        ) {

            return;

        }


        helpButton.addEventListener(
            "click",
            event => {

                event.preventDefault();


                openInstallHelp();

            }
        );

    }


    /* =====================================================
       MODAL CONTROLS
       ===================================================== */

    function bindModalControls() {

        const modal =
            $("pwaInstallModal");


        const closeButton =
            $("pwaModalClose");


        const doneButton =
            $("pwaModalDone");


        if (
            closeButton
        ) {

            closeButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();


                    closeInstallHelp();

                }
            );

        }


        if (
            doneButton
        ) {

            doneButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();


                    closeInstallHelp();

                }
            );

        }


        if (
            modal
        ) {

            modal.addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        modal
                    ) {

                        closeInstallHelp();

                    }

                }
            );

        }


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Escape"
                ) {

                    closeInstallHelp();

                }

            }
        );

    }


    /* =====================================================
       BEFORE INSTALL PROMPT
       ===================================================== */

    window.addEventListener(
        "beforeinstallprompt",
        event => {

            console.log(
                "[PWA] beforeinstallprompt received."
            );


            event.preventDefault();


            deferredInstallPrompt =
                event;


            setInstallButtonReady();


            setStatus(
                "available",
                "AFC Isiu Youth Portal is ready to install."
            );

        }
    );


    /* =====================================================
       APP INSTALLED
       ===================================================== */

    window.addEventListener(
        "appinstalled",
        () => {

            console.log(
                "[PWA] AFC Isiu Youth Portal installed successfully."
            );


            deferredInstallPrompt =
                null;


            setStatus(
                "installed",
                "AFC Isiu Youth Portal is now installed."
            );


            hideInstallButton();


            resetInstallButton();

        }
    );


    /* =====================================================
       DISPLAY MODE CHANGE
       ===================================================== */

    function monitorDisplayMode() {

        if (
            !window.matchMedia
        ) {

            return;

        }


        const standaloneQuery =
            window.matchMedia(
                PWA_CONFIG.INSTALL_DISPLAY_MODE
            );


        const fullscreenQuery =
            window.matchMedia(
                PWA_CONFIG.INSTALL_DISPLAY_MODE_FULLSCREEN
            );


        function checkMode() {

            if (

                standaloneQuery.matches ||

                fullscreenQuery.matches ||

                window.navigator.standalone ===
                    true

            ) {

                setStatus(
                    "installed",
                    "AFC Isiu Youth Portal is installed and running as an app."
                );


                hideInstallButton();

            }

        }


        checkMode();


        if (
            standaloneQuery.addEventListener
        ) {

            standaloneQuery.addEventListener(
                "change",
                checkMode
            );

        }

        else if (
            standaloneQuery.addListener
        ) {

            standaloneQuery.addListener(
                checkMode
            );

        }


        if (
            fullscreenQuery.addEventListener
        ) {

            fullscreenQuery.addEventListener(
                "change",
                checkMode
            );

        }

        else if (
            fullscreenQuery.addListener
        ) {

            fullscreenQuery.addListener(
                checkMode
            );

        }

    }


    /* =====================================================
       MANIFEST CHECK
       ===================================================== */

    async function verifyManifest() {

        try {

            const response =
                await fetch(
                    PWA_CONFIG.MANIFEST,
                    {
                        cache:
                            "no-store"
                    }
                );


            if (
                !response.ok
            ) {

                console.warn(
                    "[PWA] Manifest returned HTTP",
                    response.status
                );


                return false;

            }


            const manifest =
                await response.json();


            console.log(
                "[PWA] Manifest verified:",
                manifest.name ||
                manifest.short_name
            );


            return true;

        }

        catch (
            error
        ) {

            console.warn(
                "[PWA] Manifest verification failed:",
                error
            );


            return false;

        }

    }


    /* =====================================================
       INITIALISE PWA
       ===================================================== */

    async function initialisePWA() {

        cacheDOM();


        if (
            isAppInstalled()
        ) {

            setStatus(
                "installed",
                "AFC Isiu Youth Portal is installed and running as an app."
            );


            hideInstallButton();

        }

        else {

            setInstallButtonWaiting();

        }


        bindInstallButton();

        bindHelpButton();

        bindModalControls();

        monitorDisplayMode();


        await verifyManifest();


        if (
            isPWASupported()
        ) {

            await registerServiceWorker();

        }


        console.log(
            "[PWA] AFC Isiu Youth Portal PWA initialised."
        );

    }


    /* =====================================================
       PUBLIC API
       ===================================================== */

    window.AFC_PWA = {

        isAppInstalled:
            isAppInstalled,

        isPWASupported:
            isPWASupported,

        isPushSupported:
            isPushSupported,

        getPushSubscription:
            getPushSubscription,

        getPushStatus:
            getPushStatus,

        subscribeToPush:
            subscribeToPush,

        unsubscribeFromPush:
            unsubscribeFromPush,

        savePushSubscription:
            savePushSubscription,

        deletePushSubscriptionFromServer:
            deletePushSubscriptionFromServer,

        getVapidPublicKey:
            getVapidPublicKey,

        triggerNativeInstall:
            triggerNativeInstall,

        openInstallHelp:
            openInstallHelp,

        closeInstallHelp:
            closeInstallHelp,

        config:
            PWA_CONFIG

    };


    /* =====================================================
       DOM READY
       ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialisePWA
        );

    }

    else {

        initialisePWA();

    }

})();
