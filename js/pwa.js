/* =========================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: pwa.js
   VERSION: 3.0

   PURPOSE:
   - PWA service worker registration
   - Native PWA installation
   - Install prompt handling
   - Installed-state detection
   - Manifest verification
   - PWA diagnostics

   IMPORTANT:
   - This is the ONLY file that registers the service worker.
   - Service worker: /sw.js
   - Native installation uses beforeinstallprompt.
   - Manual installation instructions are NEVER shown
     automatically by the Install App button when the
     native installation prompt is available.
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
            "(display-mode: fullscreen)"

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

    let installButton =
        null;

    let helpButton =
        null;

    let status =
        null;

    let statusDot =
        null;

    let statusText =
        null;


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
            installButton.querySelector(
                "i"
            );


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

            /*
             * Fallback for buttons without
             * the optional text span.
             */

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
            installButton.querySelector(
                "i"
            );


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
       CLOSE MANUAL INSTALL HELP
    ===================================================== */

    function closeInstallHelp() {

        const modal =
            $("pwaInstallModal");


        if (!modal) {

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
       NATIVE INSTALL
    ===================================================== */

    async function triggerNativeInstall() {

        /*
         * This is the critical part.

         * The browser supplies this event through
         * beforeinstallprompt.

         * We MUST use the stored event.
         *
         * There is no other JavaScript API that can
         * force Chrome to install a PWA.
         */

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


            /*
             * IMPORTANT:
             *
             * prompt() MUST be called from the
             * user's button interaction.
             */

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


                /*
                 * Chrome fires appinstalled after
                 * successful installation.
                 */

                return true;

            }


            /*
             * User dismissed installation.
             */

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

            /*
             * A BeforeInstallPromptEvent should not
             * be reused after prompt().
             */

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


                /*
                 * NEVER open the manual help modal
                 * from this button.
                 *
                 * The user specifically wants the
                 * Install App button to be the native
                 * installation action.
                 */

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


                    /*
                     * Do NOT open the manual
                     * installation instructions.
                     */

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


            /*
             * Stop Chrome from showing its own
             * automatic mini-infobar/prompt.
             *
             * We will launch it from the user's
             * Install App button.
             */

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


        /*
         * Keep Install App visible.
         *
         * The button itself will only work when
         * Chrome supplies beforeinstallprompt.
         */

        setInstallButtonWaiting();


        setStatus(
            "checking",
            "Checking PWA installation availability..."
        );

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

            }

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


        /*
         * Register SW and check manifest.
         *
         * These are intentionally independent
         * of the button click.
         */

        await registerServiceWorker();


        await checkManifest();


        /*
         * Re-check standalone state after SW setup.
         */

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

    } else {

        initialise();

    }


})();
 
