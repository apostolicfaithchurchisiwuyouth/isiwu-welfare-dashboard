/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: pwa.js
   PURPOSE: PWA INSTALLATION CONTROLLER
   ============================================================ */

(function () {

    "use strict";


    /* =========================================================
       STATE
    ========================================================= */

    let deferredInstallPrompt = null;

    let serviceWorkerRegistration = null;

    let installInProgress = false;


    /* =========================================================
       DOM HELPER
    ========================================================= */

    function $(id) {

        return document.getElementById(id);

    }


    /* =========================================================
       ELEMENTS
    ========================================================= */

    let installButton = null;
    let helpButton = null;

    let status = null;
    let statusText = null;

    let installModal = null;
    let modalClose = null;
    let modalDone = null;


    /* =========================================================
       CACHE DOM
    ========================================================= */

    function cacheElements() {

        installButton =
            $("installAppBtn");

        helpButton =
            $("pwaHelpBtn");

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


    /* =========================================================
       STATUS
    ========================================================= */

    function setStatus(type, message) {

        if (status) {

            status.classList.remove(
                "available",
                "installed",
                "installing",
                "unavailable"
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


    /* =========================================================
       INSTALLED CHECK
    ========================================================= */

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


    /* =========================================================
       SHOW / HIDE INSTALL BUTTON
    ========================================================= */

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


    function setInstallButtonLoading(isLoading) {

        if (!installButton) {

            return;

        }


        installButton.disabled =
            isLoading;


        if (isLoading) {

            installButton.dataset.originalText =
                installButton.innerHTML;


            installButton.innerHTML =
                `
                <i class="fa-solid fa-spinner fa-spin"></i>

                <span>
                    Installing...
                </span>
                `;

        }

        else if (
            installButton.dataset.originalText
        ) {

            installButton.innerHTML =
                installButton.dataset.originalText;

        }

    }


    /* =========================================================
       INSTALL MODAL
       ONLY FOR "HOW TO INSTALL"
    ========================================================= */

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


    /* =========================================================
       NATIVE INSTALL
    ========================================================= */

    async function triggerNativeInstall() {

        if (!deferredInstallPrompt) {

            return false;

        }


        if (installInProgress) {

            return false;

        }


        installInProgress = true;

        setInstallButtonLoading(true);

        setStatus(
            "installing",
            "Opening installation..."
        );


        try {

            /*
             * This opens the REAL browser-controlled
             * Progressive Web App installation prompt.
             */

            await deferredInstallPrompt.prompt();


            const choice =
                await deferredInstallPrompt.userChoice;


            console.log(
                "[PWA] Installation choice:",
                choice.outcome
            );


            /*
             * The prompt can only be used once.
             */

            deferredInstallPrompt =
                null;


            if (
                choice.outcome ===
                "accepted"
            ) {

                setStatus(
                    "installing",
                    "Installing AFC Isiu Youth Portal..."
                );

            }

            else {

                setStatus(
                    "available",
                    "Installation cancelled."
                );

                setInstallButtonLoading(false);

            }


            return true;

        }

        catch (error) {

            console.error(
                "[PWA] Installation error:",
                error
            );


            setStatus(
                "unavailable",
                "Installation could not be started. Please try again."
            );

            setInstallButtonLoading(false);


            return false;

        }

        finally {

            installInProgress =
                false;

        }

    }


    /* =========================================================
       INSTALL APP ACTION
    ========================================================= */

    async function installApp() {

        console.log(
            "[PWA] Install button clicked."
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
         * Native installation prompt available.
         */

        if (deferredInstallPrompt) {

            await triggerNativeInstall();

            return;

        }


        /*
         * IMPORTANT:
         *
         * DO NOT OPEN THE INSTRUCTIONS MODAL HERE.
         *
         * The Install button must remain dedicated
         * to native installation.
         */

        setStatus(
            "unavailable",
            "Installation is not ready yet. Please wait a moment and try again."
        );


        /*
         * Try checking for a service worker update.
         */

        if (serviceWorkerRegistration) {

            try {

                await serviceWorkerRegistration.update();

            }

            catch (error) {

                console.warn(
                    "[PWA] Update check failed:",
                    error
                );

            }

        }

    }


    /* =========================================================
       BEFORE INSTALL PROMPT
    ========================================================= */

    window.addEventListener(
        "beforeinstallprompt",
        function (event) {

            console.log(
                "[PWA] Native install prompt received."
            );


            /*
             * Prevent the browser from automatically
             * showing its own install prompt.
             */

            event.preventDefault();


            /*
             * Save the event.
             *
             * Our Install App button will trigger it.
             */

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


    /* =========================================================
       APP INSTALLED
    ========================================================= */

    window.addEventListener(
        "appinstalled",
        function () {

            console.log(
                "[PWA] Application installed successfully."
            );


            deferredInstallPrompt =
                null;


            installInProgress =
                false;


            document.documentElement.dataset.pwaInstalled =
                "true";


            setStatus(
                "installed",
                "AFC Isiu Youth Portal is installed."
            );


            hideInstallButton();

        }
    );


    /* =========================================================
       INSTALL BUTTON EVENT
    ========================================================= */

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


    /* =========================================================
       HELP BUTTON EVENT
    ========================================================= */

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


    /* =========================================================
       MODAL EVENTS
    ========================================================= */

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


    /* =========================================================
       SERVICE WORKER
    ========================================================= */

    async function registerServiceWorker() {

        if (
            !("serviceWorker" in navigator)
        ) {

            console.warn(
                "[PWA] Service workers are not supported."
            );


            setStatus(
                "unavailable",
                "This browser does not support PWA installation."
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


            await navigator.serviceWorker.ready;


            console.log(
                "[PWA] Service worker is ready."
            );


            /*
             * Check for updates.
             */

            try {

                await serviceWorkerRegistration.update();

            }

            catch (error) {

                console.warn(
                    "[PWA] Service worker update check failed:",
                    error
                );

            }

        }

        catch (error) {

            console.error(
                "[PWA] Service worker registration failed:",
                error
            );


            setStatus(
                "unavailable",
                "PWA service could not start."
            );

        }

    }


    /* =========================================================
       MANIFEST CHECK
    ========================================================= */

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
                    "Manifest HTTP " +
                    response.status
                );

            }


            const manifest =
                await response.json();


            console.log(
                "[PWA] Manifest loaded successfully:",
                manifest
            );


            if (
                !manifest.name ||
                !manifest.start_url ||
                !manifest.display ||
                !manifest.icons ||
                manifest.icons.length === 0
            ) {

                console.warn(
                    "[PWA] Manifest is missing required PWA information."
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


    /* =========================================================
       MONITOR DISPLAY MODE
    ========================================================= */

    function monitorStandaloneMode() {

        if (!window.matchMedia) {

            return;

        }


        const standaloneQuery =
            window.matchMedia(
                "(display-mode: standalone)"
            );


        function updateDisplayMode() {

            if (
                standaloneQuery.matches
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


        updateDisplayMode();


        if (
            typeof standaloneQuery.addEventListener ===
            "function"
        ) {

            standaloneQuery.addEventListener(
                "change",
                updateDisplayMode
            );

        }

        else if (
            typeof standaloneQuery.addListener ===
            "function"
        ) {

            standaloneQuery.addListener(
                updateDisplayMode
            );

        }

    }


    /* =========================================================
       INITIALISE
    ========================================================= */

    async function initialise() {

        cacheElements();


        setupInstallButton();

        setupHelpButton();

        setupModal();

        monitorStandaloneMode();


        /*
         * Already installed?
         */

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
                "",
                "Checking installation availability..."
            );

        }


        /*
         * Start PWA infrastructure.
         */

        await registerServiceWorker();

        await checkManifest();


        console.log(
            "[PWA] AFC Isiu Youth Portal is ready."
        );

    }


    /* =========================================================
       START
    ========================================================= */

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


    /* =========================================================
       PUBLIC API
    ========================================================= */

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
