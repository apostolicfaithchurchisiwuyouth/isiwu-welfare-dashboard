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
   - PUBLIC push notification subscription
   - NO LOGIN REQUIRED FOR PUSH NOTIFICATIONS
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
            "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNpzsguBIaKR4q1dXVtgVHO2xZ1w/exec",

        PUSH_CONFIG_URL:
            "/api/push/config"

    };


    /* =====================================================
       STATE
       ===================================================== */

    let deferredInstallPrompt = null;

    let serviceWorkerRegistration = null;


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

                status.classList.add(type);

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

                statusDot.classList.add(type);

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

        if (!installButton) {

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

        if (!installButton) {

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
       SET INSTALL BUTTON READY
       ===================================================== */

    function setInstallButtonReady() {

        if (!installButton) {

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
       SET INSTALL BUTTON WAITING
       ===================================================== */

    function setInstallButtonWaiting() {

        if (!installButton) {

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
       INSTALL BUTTON LOADING STATE
       ===================================================== */

    function setInstallingState() {

        if (!installButton) {

            return;

        }


        installButton.disabled =
            true;


        installButton.classList.add(
            "is-installing"
        );


        const icon =
            installButton.querySelector("i");


        if (icon) {

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


        if (text) {

            text.textContent =
                "Installing...";

        }
        else {

            const textNodes =
                Array.from(
                    installButton.childNodes
                ).filter(
                    node =>
                        node.nodeType ===
                        Node.TEXT_NODE
                );


            if (textNodes.length) {

                textNodes[
                    textNodes.length - 1
                ].textContent =
                    " Installing...";

            }

        }

    }


    /* =====================================================
       RESET INSTALL BUTTON
       ===================================================== */

    function resetInstallButton() {

        if (!installButton) {

            return;

        }


        installButton.disabled =
            false;


        installButton.classList.remove(
            "is-installing"
        );


        const icon =
            installButton.querySelector("i");


        if (icon) {

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


        if (text) {

            text.textContent =
                "Install App";

        }

    }


    /* =====================================================
       OPEN MANUAL INSTALL HELP
       ===================================================== */

    function openInstallHelp() {

        const modal =
            $("pwaInstallModal");


        if (!modal) {

            console.warn(
                "[PWA] Install help modal not found."
            );

            return;

        }


        modal.classList.add("show");


        modal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "pwa-modal-open"
        );

    }


    /* =====================================================
       CLOSE MANUAL INSTALL HELP
       ===================================================== */

    function closeInstallHelp() {

        const modal =
            $("pwaInstallModal");


        if (!modal) {

            return;

        }


        modal.classList.remove("show");


        modal.setAttribute(
            "aria-hidden",
            "true"
        );


        document.body.classList.remove(
            "pwa-modal-open"
        );

    }


    /* =====================================================
       NATIVE INSTALL
       ===================================================== */

    async function triggerNativeInstall() {

        if (!deferredInstallPrompt) {

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
        catch (error) {

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

        if (!installButton) {

            console.warn(
                "[PWA] #installAppBtn not found."
            );

            return;

        }


        installButton.addEventListener(
            "click",
            async event => {

                event.preventDefault();


                console.log(
                    "[PWA] Install App clicked."
                );


                if (
                    !deferredInstallPrompt
                ) {

                    console.warn(
                        "[PWA] Chrome has not supplied a native install prompt yet."
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
       MANUAL HELP BUTTON
       ===================================================== */

    function bindHelpButton() {

        if (!helpButton) {

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


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    closeInstallHelp();

                }
            );

        }


        if (doneButton) {

            doneButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    closeInstallHelp();

                }
            );

        }


        if (modal) {

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


            console.log(
                "[PWA] Native installation is ready."
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

        if (!window.matchMedia) {

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
                window.navigator.standalone === true
            ) {

                setStatus(
                    "installed",
                    "AFC Isiu Youth Portal is installed and running as an app."
                );


                hideInstallButton();

            }

        }


        if (
            typeof standaloneQuery.addEventListener ===
            "function"
        ) {

            standaloneQuery.addEventListener(
                "change",
                checkMode
            );

        }


        if (
            typeof fullscreenQuery.addEventListener ===
            "function"
        ) {

            fullscreenQuery.addEventListener(
                "change",
                checkMode
            );

        }


        checkMode();

    }


    /* =====================================================
       SERVICE WORKER REGISTRATION
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

            console.log(
                "[PWA] Registering:",
                PWA_CONFIG.SERVICE_WORKER
            );


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


            await navigator.serviceWorker.ready;


            console.log(
                "[PWA] Service worker is ready."
            );


            return serviceWorkerRegistration;

        }
        catch (error) {

            console.error(
                "[PWA] Service worker registration failed:",
                error
            );


            setStatus(
                "unavailable",
                "PWA service is temporarily unavailable."
            );


            return null;

        }

    }


    /* =====================================================
       MANIFEST CHECK
       ===================================================== */

    async function checkManifest() {

        try {

            const response =
                await fetch(
                    PWA_CONFIG.MANIFEST,
                    {
                        cache: "no-store"
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `Manifest returned HTTP ${response.status}`
                );

            }


            const manifest =
                await response.json();


            console.log(
                "[PWA] Manifest loaded successfully:",
                manifest
            );


            if (
                !manifest.icons ||
                !manifest.icons.length
            ) {

                console.warn(
                    "[PWA] Manifest has no icons."
                );

            }


            return manifest;

        }
        catch (error) {

            console.error(
                "[PWA] Manifest check failed:",
                error
            );


            return null;

        }

    }


    /* =====================================================
       INITIAL STATE
       ===================================================== */

    function initialiseState() {

        if (
            isAppInstalled()
        ) {

            console.log(
                "[PWA] App is already running in standalone mode."
            );


            setStatus(
                "installed",
                "AFC Isiu Youth Portal is installed and running as an app."
            );


            hideInstallButton();


            return;

        }


        setInstallButtonWaiting();


        setStatus(
            "checking",
            "Checking PWA installation availability..."
        );

    }


    /* =====================================================
       PUSH NOTIFICATION HELPERS
       ===================================================== */

    function isPushSupported() {

        return (
            window.isSecureContext &&
            "serviceWorker" in navigator &&
            "PushManager" in window &&
            "Notification" in window
        );

    }


    /* =====================================================
       BASE64URL → UINT8ARRAY
       ===================================================== */

    function base64UrlToUint8Array(
        base64String
    ) {

        const padding =
            "=".repeat(
                (
                    4 -
                    (
                        base64String.length %
                        4
                    )
                ) % 4
            );


        const base64 =
            (
                base64String +
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


    /* =====================================================
       GET PUSH REGISTRATION
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


        if (!response.ok) {

            throw new Error(
                "Push configuration returned HTTP " +
                response.status
            );

        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to load push configuration."
            );

        }


        const publicKey =
            String(
                data.publicKey ||
                data.vapidPublicKey ||
                ""
            ).trim();


        if (!publicKey) {

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


        if (!registration) {

            return null;

        }


        return registration.pushManager
            .getSubscription();

    }


    /* =====================================================
       SAVE PUSH SUBSCRIPTION
       
       IMPORTANT:
       - NO LOGIN REQUIRED
       - NO MEMBER ID REQUIRED
       - NO MEMBER NAME REQUIRED
       ===================================================== */

    async function savePushSubscription(
        subscription
    ) {

        if (!subscription) {

            throw new Error(
                "No push subscription is available."
            );

        }


        const subscriptionData =
            subscription.toJSON();


        if (
            !subscriptionData ||
            !subscriptionData.endpoint
        ) {

            throw new Error(
                "The browser returned an invalid push subscription."
            );

        }


        const response =
            await fetch(
                PWA_CONFIG.PUSH_API_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "text/plain;charset=utf-8"
                    },

                    body:
                        JSON.stringify({

                            action:
                                "savePushSubscription",

                            subscription:
                                subscriptionData,

                            userAgent:
                                navigator.userAgent

                        })

                }
            );


        if (!response.ok) {

            throw new Error(
                "Push subscription could not be saved. HTTP " +
                response.status
            );

        }


        const result =
            await response.json();


        if (!result.success) {

            throw new Error(
                result.message ||
                "Push subscription could not be saved."
            );

        }


        console.log(
            "[PWA] Push subscription saved successfully."
        );


        return result;

    }


    /* =====================================================
       SUBSCRIBE TO PUSH
       
       PUBLIC:
       ANY VISITOR CAN ENABLE NOTIFICATIONS.
       
       There is deliberately NO:
       - member ID check
       - login check
       - account check
       ===================================================== */

    async function subscribeToPush() {

        if (
            !isPushSupported()
        ) {

            throw new Error(
                "Push notifications are not supported by this browser or app."
            );

        }


        console.log(
            "[PWA] Starting public push notification subscription."
        );


        const registration =
            await getPushRegistration();


        if (!registration) {

            throw new Error(
                "The AFC Isiu service worker is not ready."
            );

        }


        /* =================================================
           REQUEST NOTIFICATION PERMISSION
           ================================================= */

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


        console.log(
            "[PWA] Notification permission granted."
        );


        /* =================================================
           GET EXISTING SUBSCRIPTION
           ================================================= */

        let subscription =
            await registration.pushManager
                .getSubscription();


        /* =================================================
           CREATE NEW SUBSCRIPTION
           ================================================= */

        if (!subscription) {

            console.log(
                "[PWA] Creating new push subscription."
            );


            const publicKey =
                await getVapidPublicKey();


            subscription =
                await registration.pushManager
                    .subscribe({

                        userVisibleOnly:
                            true,

                        applicationServerKey:
                            base64UrlToUint8Array(
                                publicKey
                            )

                    });


            console.log(
                "[PWA] Browser push subscription created."
            );

        }
        else {

            console.log(
                "[PWA] Existing push subscription found."
            );

        }


        /* =================================================
           SAVE TO GOOGLE APPS SCRIPT
           ================================================= */

        const saved =
            await savePushSubscription(
                subscription
            );


        return {

            success:
                true,

            subscribed:
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

        if (!subscription) {

            return {
                success: true
            };

        }


        const endpoint =
            subscription.endpoint;


        if (!endpoint) {

            return {
                success: true
            };

        }


        const response =
            await fetch(
                PWA_CONFIG.PUSH_API_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "text/plain;charset=utf-8"
                    },

                    body:
                        JSON.stringify({

                            action:
                                "deletePushSubscription",

                            endpoint:
                                endpoint

                        })

                }
            );


        if (!response.ok) {

            throw new Error(
                "Push subscription could not be removed from the server. HTTP " +
                response.status
            );

        }


        const result =
            await response.json();


        if (!result.success) {

            throw new Error(
                result.message ||
                "Push subscription could not be removed from the server."
            );

        }


        return result;

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


        if (!registration) {

            return {

                success:
                    false,

                supported:
                    true,

                message:
                    "The service worker is not ready."

            };

        }


        const subscription =
            await registration.pushManager
                .getSubscription();


        if (!subscription) {

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
        catch (error) {

            console.warn(
                "[PWA] Server subscription removal failed:",
                error
            );

            /*
             * We continue with the browser unsubscribe.
             * This prevents the user from being stuck subscribed
             * locally if the server has a temporary problem.
             */

        }


        const unsubscribed =
            await subscription.unsubscribe();


        console.log(
            "[PWA] Browser push subscription removed:",
            unsubscribed
        );


        return {

            success:
                unsubscribed,

            subscribed:
                false

        };

    }


    /* =====================================================
       PUSH PERMISSION STATE
       ===================================================== */

    async function getPushPermissionState() {

        if (
            !isPushSupported()
        ) {

            return "unsupported";

        }


        return Notification.permission;

    }


    /* =====================================================
       PUBLIC API
       ===================================================== */

    window.AFC_PWA = {

        install:
            triggerNativeInstall,

        isInstalled:
            isAppInstalled,

        openInstallHelp:
            openInstallHelp,

        closeInstallHelp:
            closeInstallHelp,

        getInstallPrompt:
            function () {

                return deferredInstallPrompt;

            },

        getServiceWorkerRegistration:
            function () {

                return serviceWorkerRegistration;

            },

        isPushSupported:
            isPushSupported,

        getPushPermissionState:
            getPushPermissionState,

        getPushSubscription:
            getPushSubscription,

        subscribeToPush:
            subscribeToPush,

        unsubscribeFromPush:
            unsubscribeFromPush

    };


    /* =====================================================
       STARTUP
       ===================================================== */

    async function initialise() {

        cacheDOM();


        initialiseState();


        bindInstallButton();


        bindHelpButton();


        bindModalControls();


        monitorDisplayMode();


        await registerServiceWorker();


        await checkManifest();


        if (
            isAppInstalled()
        ) {

            setStatus(
                "installed",
                "AFC Isiu Youth Portal is installed and running as an app."
            );


            hideInstallButton();

        }


        console.log(
            "[PWA] AFC Isiu Youth Portal is ready."
        );

    }


    /* =====================================================
       RUN AFTER DOM
       ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialise,
            {
                once: true
            }
        );

    }
    else {

        initialise();

    }


})();
