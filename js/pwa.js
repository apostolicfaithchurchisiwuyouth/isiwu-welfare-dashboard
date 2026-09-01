/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: pwa.js
   PURPOSE: PWA INSTALLATION CONTROLLER
   ============================================================ */

(function () {

    "use strict";


    /* ============================================================
       STATE
       ============================================================ */

    let deferredInstallPrompt = null;

    let serviceWorkerRegistration = null;

    let installInProgress = false;


    /* ============================================================
       DOM HELPER
       ============================================================ */

    function $(id) {

        return document.getElementById(id);

    }


    /* ============================================================
       ELEMENTS
       ============================================================ */

    let installButton = null;

    let helpButton = null;

    let hubButton = null;

    let status = null;

    let statusDot = null;

    let statusText = null;

    let installModal = null;

    let modalClose = null;

    let modalDone = null;


    /* ============================================================
       CACHE DOM
       ============================================================ */

    function cacheElements() {

        installButton =
            $("installAppBtn");

        helpButton =
            $("pwaHelpBtn");

        hubButton =
            $("hubButton");

        status =
            $("pwaStatus");

        statusDot =
            $("pwaStatusDot");

        statusText =
            $("pwaStatusText");

        installModal =
            $("pwaInstallModal");

        modalClose =
            $("pwaModalClose");

        modalDone =
            $("pwaModalDone");

    }


    /* ============================================================
       STATUS
       ============================================================ */

    function setStatus(
        type,
        message
    ) {

        if (status) {

            status.classList.remove(
                "available",
                "installed"
            );

            if (type) {

                status.classList.add(
                    type
                );

            }

        }


        if (statusText) {

            statusText.textContent =
                message;

        }

    }


    /* ============================================================
       INSTALLED CHECK
       ============================================================ */

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


    /* ============================================================
       IOS CHECK
       ============================================================ */

    function isIOS() {

        return (
            /iphone|ipad|ipod/i.test(
                navigator.userAgent
            )
        );

    }


    /* ============================================================
       ANDROID CHECK
       ============================================================ */

    function isAndroid() {

        return /android/i.test(
            navigator.userAgent
        );

    }


    /* ============================================================
       DESKTOP CHECK
       ============================================================ */

    function isDesktop() {

        return !isAndroid() &&
            !isIOS();

    }


    /* ============================================================
       INSTALL BUTTON
       ============================================================ */

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

    }


    function hideInstallButton() {

        if (!installButton) {

            return;

        }


        installButton.hidden =
            true;

        installButton.style.display =
            "none";

    }


    /* ============================================================
       MODAL
       ============================================================ */

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


    /* ============================================================
       NATIVE INSTALL PROMPT
       ============================================================ */

    async function triggerNativeInstall() {

        if (
            !deferredInstallPrompt
        ) {

            return false;

        }


        if (installInProgress) {

            return true;

        }


        installInProgress =
            true;


        try {

            console.log(
                "[PWA] Opening native install prompt."
            );


            /*
             * This is the REAL browser-controlled
             * PWA installation prompt.
             */

            await deferredInstallPrompt.prompt();


            const choice =
                await deferredInstallPrompt.userChoice;


            console.log(
                "[PWA] User installation choice:",
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

            }
            else {

                setStatus(
                    "available",
                    "Installation cancelled. You can install the app anytime."
                );

            }


            /*
             * Chrome requires the prompt object
             * to be discarded after it is used.
             */

            deferredInstallPrompt =
                null;


            return true;

        }
        catch (error) {

            console.error(
                "[PWA] Native installation failed:",
                error
            );


            setStatus(
                "",
                "The browser could not open the installation prompt."
            );


            return false;

        }
        finally {

            installInProgress =
                false;

        }

    }


    /* ============================================================
       INSTALL ACTION
       ============================================================ */

    async function installApp() {

        console.log(
            "[PWA] Install action requested."
        );


        /*
         * If already installed, there is nothing
         * to install.
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
         * Native Chrome / Android / supported
         * Chromium installation.
         */

        if (
            deferredInstallPrompt
        ) {

            await triggerNativeInstall();

            return;

        }


        /*
         * iPhone / iPad does not expose the same
         * beforeinstallprompt API.
         */

        openInstallModal();

    }


    /* ============================================================
       BEFORE INSTALL PROMPT
       ============================================================ */

    window.addEventListener(
        "beforeinstallprompt",
        function (event) {

            console.log(
                "[PWA] Native installation prompt available."
            );


            /*
             * Stop Chrome from showing the prompt
             * automatically.
             *
             * We want OUR Install App / Hub button
             * to trigger it.
             */

            event.preventDefault();


            deferredInstallPrompt =
                event;


            showInstallButton();


            setStatus(
                "available",
                "This app is ready to be installed."
            );


            /*
             * Tell the global page that PWA
             * installation is available.
             */

            document.documentElement.dataset.pwaInstallable =
                "true";

        }
    );


    /* ============================================================
       APP INSTALLED
       ============================================================ */

    window.addEventListener(
        "appinstalled",
        function () {

            console.log(
                "[PWA] AFC Isiu Youth Portal installed."
            );


            deferredInstallPrompt =
                null;


            installInProgress =
                false;


            document.documentElement.dataset.pwaInstalled =
                "true";


            setStatus(
                "installed",
                "AFC Isiu Youth Portal is now installed."
            );


            hideInstallButton();

        }
    );


    /* ============================================================
       HUB BUTTON
       ============================================================ */

    function setupHubInstall() {

        if (!hubButton) {

            return;

        }


        /*
         * IMPORTANT:
         *
         * We DO NOT permanently replace the Hub button.
         *
         * If the native PWA prompt exists,
         * the first click launches installation.
         *
         * If it does not exist, the existing Hub
         * navigation continues normally.
         */

        hubButton.addEventListener(
            "click",
            async function (event) {

                /*
                 * Already installed?
                 *
                 * Let the normal Hub button
                 * behavior continue.
                 */

                if (isAppInstalled()) {

                    return;

                }


                /*
                 * Native installation available?
                 *
                 * Intercept the Hub button and
                 * launch the real PWA prompt.
                 */

                if (
                    deferredInstallPrompt
                ) {

                    event.preventDefault();

                    event.stopImmediatePropagation();


                    await triggerNativeInstall();


                    return;

                }

            },
            true
        );

    }


    /* ============================================================
       INSTALL BUTTON
       ============================================================ */

    function setupInstallButton() {

        if (!installButton) {

            return;

        }


        installButton.addEventListener(
            "click",
            function () {

                installApp();

            }
        );

    }


    /* ============================================================
       HELP BUTTON
       ============================================================ */

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


    /* ============================================================
       MODAL EVENTS
       ============================================================ */

    function setupModal() {

        if (modalClose) {

            modalClose.addEventListener(
                "click",
                function () {

                    closeInstallModal();

                }
            );

        }


        if (modalDone) {

            modalDone.addEventListener(
                "click",
                function () {

                    closeInstallModal();

                }
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
                    event.key ===
                    "Escape"
                ) {

                    closeInstallModal();

                }

            }
        );

    }


    /* ============================================================
       SERVICE WORKER
       ============================================================ */

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

            /*
             * IMPORTANT:
             *
             * sw.js is at the ROOT of the
             * Vercel website.
             *
             * Therefore:
             *
             * /sw.js
             *
             * NOT:
             *
             * ../sw.js
             */

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
             * Check for an update.
             */

            try {

                await serviceWorkerRegistration.update();

            }
            catch (updateError) {

                console.warn(
                    "[PWA] Service worker update check failed:",
                    updateError
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
                "PWA service is not ready yet."
            );

        }

    }


    /* ============================================================
       MANIFEST CHECK
       ============================================================ */

    async function checkManifest() {

        try {

            const response =
                await fetch(
                    "/manifest.json",
                    {
                        cache:
                            "no-store"
                    }
                );


            if (!response.ok) {

                throw new Error(
                    "Manifest returned HTTP " +
                    response.status
                );

            }


            const manifest =
                await response.json();


            console.log(
                "[PWA] Manifest loaded:",
                manifest
            );


            if (
                !manifest.name ||
                !manifest.start_url ||
                !manifest.display
            ) {

                console.warn(
                    "[PWA] Manifest is missing important installation properties."
                );

            }

        }
        catch (error) {

            console.error(
                "[PWA] Manifest check failed:",
                error
            );

        }

    }


    /* ============================================================
       STANDALONE DISPLAY CHANGE
       ============================================================ */

    function monitorStandaloneMode() {

        if (
            !window.matchMedia
        ) {

            return;

        }


        const query =
            window.matchMedia(
                "(display-mode: standalone)"
            );


        function update() {

            if (
                query.matches
            ) {

                setStatus(
                    "installed",
                    "AFC Isiu Youth Portal is already installed."
                );


                hideInstallButton();


                document.documentElement.dataset.pwaInstalled =
                    "true";

            }

        }


        update();


        if (
            typeof query.addEventListener ===
            "function"
        ) {

            query.addEventListener(
                "change",
                update
            );

        }

        else if (
            typeof query.addListener ===
            "function"
        ) {

            query.addListener(
                update
            );

        }

    }


    /* ============================================================
       INITIALISE
       ============================================================ */

    async function initialise() {

        cacheElements();


        /*
         * If the app is already installed,
         * do not show installation UI.
         */

        if (
            isAppInstalled()
        ) {

            setStatus(
                "installed",
                "AFC Isiu Youth Portal is already installed."
            );


            hideInstallButton();

        }

        else {

            /*
             * Show the install button.
             *
             * It will use the native prompt if
             * Chrome supplies beforeinstallprompt.
             */

            showInstallButton();


            setStatus(
                "",
                "Checking installation availability..."
            );

        }


        setupInstallButton();

        setupHelpButton();

        setupModal();

        setupHubInstall();

        monitorStandaloneMode();


        /*
         * Register PWA infrastructure.
         */

        await registerServiceWorker();


        await checkManifest();


        console.log(
            "[PWA] AFC Isiu Youth Portal PWA controller ready."
        );

    }


    /* ============================================================
       START
       ============================================================ */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialise
        );

    }
    else {

        initialise();

    }


    /* ============================================================
       PUBLIC API
       ============================================================ */

    window.AFC_PWA = {

        install:
            installApp,

        isInstalled:
            isAppInstalled,

        openInstallHelp:
            openInstallModal,

        closeInstallHelp:
            closeInstallModal,

        getInstallPrompt:
            function () {

                return deferredInstallPrompt;

            }

    };


})();
