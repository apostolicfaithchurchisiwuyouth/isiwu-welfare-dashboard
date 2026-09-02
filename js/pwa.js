/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: pwa.js
   PURPOSE: PWA INSTALLATION CONTROLLER
   ============================================================ */

(function () {

    "use strict";


    /* ========================================================
       STATE
       ======================================================== */

    let deferredInstallPrompt = null;

    let serviceWorkerRegistration = null;

    let installInProgress = false;


    /* ========================================================
       DOM HELPER
       ======================================================== */

    function $(id) {

        return document.getElementById(id);

    }


    /* ========================================================
       ELEMENTS
       ======================================================== */

    let installButton = null;

    let helpButton = null;

    let hubButton = null;

    let status = null;

    let statusText = null;

    let installModal = null;

    let modalClose = null;

    let modalDone = null;


    /* ========================================================
       CACHE DOM
       ======================================================== */

    function cacheElements() {

        installButton =
            $("installAppBtn");

        helpButton =
            $("pwaHelpBtn");

        hubButton =
            $("hubButton");

        status =
            $("pwaStatus");

        statusText =
            $("pwaStatusText");

        installModal =
            $("pwaInstallModal");

        modalClose =
            $("pwaModalClose");

        modalDone =
            $("pwaModalDone");

    }


    /* ========================================================
       STATUS
       ======================================================== */

    function setStatus(type, message) {

        if (status) {

            status.classList.remove(
                "available",
                "installed",
                "checking"
            );

            if (type) {

                status.classList.add(type);

            }

        }


        if (statusText) {

            statusText.textContent =
                message;

        }

    }


    /* ========================================================
       CHECK IF INSTALLED
       ======================================================== */

    function isAppInstalled() {

        if (
            window.matchMedia &&
            window.matchMedia(
                "(display-mode: standalone)"
            ).matches
        ) {

            return true;

        }


        if (
            window.matchMedia &&
            window.matchMedia(
                "(display-mode: fullscreen)"
            ).matches
        ) {

            return true;

        }


        if (
            window.navigator.standalone === true
        ) {

            return true;

        }


        return false;

    }


    /* ========================================================
       PLATFORM CHECKS
       ======================================================== */

    function isIOS() {

        return /iphone|ipad|ipod/i.test(
            navigator.userAgent
        );

    }


    function isAndroid() {

        return /android/i.test(
            navigator.userAgent
        );

    }


    /* ========================================================
       INSTALL BUTTON VISIBILITY
       ======================================================== */

    function showInstallButton() {

        if (!installButton) {

            return;

        }


        installButton.hidden = false;

        installButton.disabled = false;

        installButton.style.display =
            "inline-flex";

    }


    function hideInstallButton() {

        if (!installButton) {

            return;

        }


        installButton.hidden = true;

        installButton.style.display =
            "none";

    }


    /* ========================================================
       MODAL
       ======================================================== */

    function openInstallModal() {

        if (!installModal) {

            return;

        }


        installModal.classList.add(
            "is-open"
        );

        installModal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "pwa-modal-open"
        );

    }


    function closeInstallModal() {

        if (!installModal) {

            return;

        }


        installModal.classList.remove(
            "is-open"
        );

        installModal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "pwa-modal-open"
        );

    }


    /* ========================================================
       NATIVE INSTALL
       ======================================================== */

    async function triggerNativeInstall() {

        if (!deferredInstallPrompt) {

            return false;

        }


        if (installInProgress) {

            return true;

        }


        installInProgress = true;


        if (installButton) {

            installButton.disabled = true;

        }


        try {

            console.log(
                "[PWA] Opening native install prompt."
            );


            /*
             * Open the real browser installation prompt.
             */

            deferredInstallPrompt.prompt();


            const choice =
                await deferredInstallPrompt.userChoice;


            console.log(
                "[PWA] User choice:",
                choice.outcome
            );


            if (
                choice.outcome === "accepted"
            ) {

                setStatus(
                    "installed",
                    "Installing AFC Isiu Youth Portal..."
                );

            }
            else {

                setStatus(
                    "available",
                    "Installation was cancelled. You can try again."
                );

            }


            /*
             * The event can only be used once.
             */

            deferredInstallPrompt = null;


            return true;

        }
        catch (error) {

            console.error(
                "[PWA] Installation error:",
                error
            );


            setStatus(
                "",
                "The installation prompt could not be opened."
            );


            return false;

        }
        finally {

            installInProgress = false;


            if (
                installButton &&
                !isAppInstalled()
            ) {

                installButton.disabled = false;

            }

        }

    }


    /* ========================================================
       INSTALL APP
       ======================================================== */

    async function installApp() {

        console.log(
            "[PWA] Install requested."
        );


        /*
         * Already installed.
         */

        if (isAppInstalled()) {

            setStatus(
                "installed",
                "AFC Isiu Youth Portal is already installed."
            );

            hideInstallButton();

            return;

        }


        /*
         * Real native install prompt available.
         */

        if (deferredInstallPrompt) {

            await triggerNativeInstall();

            return;

        }


        /*
         * iOS does not support beforeinstallprompt.
         */

        if (isIOS()) {

            openInstallModal();

            return;

        }


        /*
         * Android / desktop fallback.
         *
         * The browser may not yet consider the app installable.
         * Do not pretend installation happened.
         */

        setStatus(
            "",
            "Install prompt is not available yet."
        );


        openInstallModal();

    }


    /* ========================================================
       BEFORE INSTALL PROMPT
       ======================================================== */

    window.addEventListener(
        "beforeinstallprompt",
        function (event) {

            console.log(
                "[PWA] Native install prompt is available."
            );


            /*
             * Prevent automatic browser prompt.
             * We will show it when the user clicks Install App.
             */

            event.preventDefault();


            deferredInstallPrompt =
                event;


            showInstallButton();


            setStatus(
                "available",
                "Ready to install on this device."
            );


            document.documentElement.dataset.pwaInstallable =
                "true";

        }
    );


    /* ========================================================
       APP INSTALLED
       ======================================================== */

    window.addEventListener(
        "appinstalled",
        function () {

            console.log(
                "[PWA] App installed successfully."
            );


            deferredInstallPrompt = null;

            installInProgress = false;


            document.documentElement.dataset.pwaInstalled =
                "true";


            setStatus(
                "installed",
                "AFC Isiu Youth Portal is installed."
            );


            hideInstallButton();


            closeInstallModal();

        }
    );


    /* ========================================================
       HUB BUTTON
       ======================================================== */

    function setupHubButton() {

        if (!hubButton) {

            return;

        }


        /*
         * IMPORTANT:
         *
         * The Hub button is NOT forced to become
         * an installation button.
         *
         * This prevents conflicts with your main.js
         * Hub navigation functionality.
         *
         * Installation is handled by Install App.
         */

    }


    /* ========================================================
       INSTALL BUTTON EVENTS
       ======================================================== */

    function setupInstallButton() {

        if (!installButton) {

            return;

        }


        installButton.addEventListener(
            "click",
            async function () {

                await installApp();

            }
        );

    }


    /* ========================================================
       HELP BUTTON
       ======================================================== */

    function setupHelpButton() {

        if (!helpButton) {

            return;

        }


        helpButton.addEventListener(
            "click",
            function () {

                openInstallModal();

            }
        );

    }


    /* ========================================================
       MODAL EVENTS
       ======================================================== */

    function setupModal() {

        if (modalClose) {

            modalClose.addEventListener(
                "click",
                closeInstallModal
            );

        }


        if (modalDone) {

            modalDone.addEventListener(
                "click",
                closeInstallModal
            );

        }


        if (installModal) {

            installModal.addEventListener(
                "click",
                function (event) {

                    if (
                        event.target ===
                        installModal
                    ) {

                        closeInstallModal();

                    }

                }
            );

        }


        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Escape"
                ) {

                    closeInstallModal();

                }

            }
        );

    }


    /* ========================================================
       SERVICE WORKER
       ======================================================== */

    async function registerServiceWorker() {

        if (
            !("serviceWorker" in navigator)
        ) {

            console.warn(
                "[PWA] Service workers are not supported."
            );

            return;

        }


        try {

            serviceWorkerRegistration =
                await navigator.serviceWorker.register(
                    "/sw.js",
                    {
                        scope: "/"
                    }
                );


            console.log(
                "[PWA] Service worker registered:",
                serviceWorkerRegistration.scope
            );


            /*
             * Check for updates.
             */

            serviceWorkerRegistration.update()
                .catch(
                    function (error) {

                        console.warn(
                            "[PWA] Update check failed:",
                            error
                        );

                    }
                );


            /*
             * Listen for a new waiting service worker.
             */

            if (
                serviceWorkerRegistration.waiting
            ) {

                serviceWorkerRegistration.waiting.postMessage(
                    {
                        type: "SKIP_WAITING"
                    }
                );

            }

        }
        catch (error) {

            console.error(
                "[PWA] Service worker registration failed:",
                error
            );


            setStatus(
                "",
                "PWA service could not start."
            );

        }

    }


    /* ========================================================
       MANIFEST CHECK
       ======================================================== */

    async function checkManifest() {

        try {

            const response =
                await fetch(
                    "/manifest.json",
                    {
                        cache: "no-store"
                    }
                );


            if (!response.ok) {

                throw new Error(
                    "Manifest HTTP " +
                    response.status
                );

            }


            const manifest =
                await response.json();


            console.log(
                "[PWA] Manifest loaded:",
                manifest
            );

        }
        catch (error) {

            console.error(
                "[PWA] Manifest check failed:",
                error
            );

        }

    }


    /* ========================================================
       MONITOR DISPLAY MODE
       ======================================================== */

    function monitorStandaloneMode() {

        if (!window.matchMedia) {

            return;

        }


        const query =
            window.matchMedia(
                "(display-mode: standalone)"
            );


        function updateDisplayMode() {

            if (isAppInstalled()) {

                setStatus(
                    "installed",
                    "AFC Isiu Youth Portal is already installed."
                );


                hideInstallButton();


                document.documentElement.dataset.pwaInstalled =
                    "true";

            }

        }


        updateDisplayMode();


        if (
            typeof query.addEventListener ===
            "function"
        ) {

            query.addEventListener(
                "change",
                updateDisplayMode
            );

        }
        else if (
            typeof query.addListener ===
            "function"
        ) {

            query.addListener(
                updateDisplayMode
            );

        }

    }


    /* ========================================================
       INITIALISE
       ======================================================== */

    async function initialise() {

        cacheElements();


        setupInstallButton();

        setupHelpButton();

        setupModal();

        setupHubButton();


        if (isAppInstalled()) {

            setStatus(
                "installed",
                "AFC Isiu Youth Portal is already installed."
            );

            hideInstallButton();

        }
        else {

            showInstallButton();

            setStatus(
                "checking",
                "Checking if this device can install the app..."
            );

        }


        monitorStandaloneMode();


        await registerServiceWorker();


        await checkManifest();


        /*
         * If beforeinstallprompt has not fired yet,
         * do not automatically show instructions.
         *
         * Chrome may fire the event later.
         */

        if (
            !isAppInstalled() &&
            !deferredInstallPrompt
        ) {

            setTimeout(
                function () {

                    if (
                        !isAppInstalled() &&
                        !deferredInstallPrompt
                    ) {

                        setStatus(
                            "",
                            "Waiting for browser installation availability."
                        );

                    }

                },
                2000
            );

        }


        console.log(
            "[PWA] Controller ready."
        );

    }


    /* ========================================================
       START
       ======================================================== */

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialise
        );

    }
    else {

        initialise();

    }


    /* ========================================================
       PUBLIC API
       ======================================================== */

    window.AFC_PWA = {

        install: installApp,

        isInstalled: isAppInstalled,

        openInstallHelp: openInstallModal,

        closeInstallHelp: closeInstallModal,

        getInstallPrompt: function () {

            return deferredInstallPrompt;

        }

    };


})();
