/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: settings.js
   PURPOSE: SETTINGS PAGE CONTROLLER

   RESPONSIBILITY:
   - Manage PWA installation UI
   - Connect Settings to AFC_PWA
   - Show installation status
   - Open / close installation help modal

   IMPORTANT:
   - Does NOT load sidebar
   - Does NOT load topbar
   - Does NOT load bottom navigation
   - Does NOT manage notifications
   - Does NOT create a second PWA system

   layout.js owns the shared layout.
   pwa.js owns PWA installation.
   main.js owns global application behavior.
   ============================================================ */

(function () {

    "use strict";


    /* ============================================================
       STATE
       ============================================================ */

    let installButton;
    let helpButton;

    let installModal;
    let modalClose;
    let modalDone;

    let statusBox;
    let statusDot;
    let statusText;

    let installCard;


    /* ============================================================
       DOM HELPER
       ============================================================ */

    function $(selector) {

        return document.querySelector(selector);

    }


    /* ============================================================
       SET STATUS
       ============================================================ */

    function setStatus(
        type,
        message
    ) {

        if (!statusBox) {
            return;
        }


        statusBox.classList.remove(
            "is-ready",
            "is-installed",
            "is-error",
            "is-loading"
        );


        if (type) {

            statusBox.classList.add(
                `is-${type}`
            );

        }


        if (statusText) {

            statusText.textContent =
                message;

        }

    }


    /* ============================================================
       SHOW INSTALL BUTTON
       ============================================================ */

    function showInstallButton() {

        if (!installButton) {
            return;
        }

        installButton.hidden = false;

    }


    /* ============================================================
       HIDE INSTALL BUTTON
       ============================================================ */

    function hideInstallButton() {

        if (!installButton) {
            return;
        }

        installButton.hidden = true;

    }


    /* ============================================================
       CHECK PWA STATE
       ============================================================ */

    function updateInstallState() {

        const pwa =
            window.AFC_PWA;


        if (!pwa) {

            setStatus(
                "error",
                "PWA service is unavailable."
            );

            hideInstallButton();

            return;

        }


        /* --------------------------------------------------------
           Already installed
           -------------------------------------------------------- */

        if (
            typeof pwa.isPWAInstalled ===
                "function" &&
            pwa.isPWAInstalled()
        ) {

            setStatus(
                "installed",
                "The portal is already installed on this device."
            );

            hideInstallButton();

            return;

        }


        /* --------------------------------------------------------
           Native installation prompt available
           -------------------------------------------------------- */

        if (
            typeof pwa.canInstallPWA ===
                "function" &&
            pwa.canInstallPWA()
        ) {

            setStatus(
                "ready",
                "The app is ready to be installed."
            );

            showInstallButton();

            return;

        }


        /* --------------------------------------------------------
           Installation prompt not currently available
           -------------------------------------------------------- */

        setStatus(
            "",
            "Installation is available from your browser menu."
        );

        hideInstallButton();

    }


    /* ============================================================
       NATIVE INSTALLATION
       ============================================================ */

    async function installApp() {

        if (!installButton) {
            return;
        }


        const pwa =
            window.AFC_PWA;


        if (
            !pwa ||
            typeof pwa.installPWA !==
                "function"
        ) {

            setStatus(
                "error",
                "The installation service is unavailable."
            );

            return;

        }


        if (
            installButton.dataset.loading ===
            "true"
        ) {

            return;

        }


        try {

            installButton.dataset.loading =
                "true";

            installButton.disabled =
                true;


            const originalHTML =
                installButton.innerHTML;


            installButton.dataset.originalHTML =
                originalHTML;


            installButton.innerHTML = `
                <i
                    class="fa-solid fa-spinner fa-spin"
                    aria-hidden="true"
                ></i>

                <span>
                    Installing...
                </span>
            `;


            setStatus(
                "loading",
                "Opening the installation prompt..."
            );


            const result =
                await pwa.installPWA();


            /* ----------------------------------------------------
               Installation accepted
               ---------------------------------------------------- */

            if (
                result &&
                result.installed === true
            ) {

                setStatus(
                    "installed",
                    "The portal has been installed successfully."
                );

                hideInstallButton();

                return;

            }


            /* ----------------------------------------------------
               User dismissed prompt
               ---------------------------------------------------- */

            if (
                result &&
                result.outcome ===
                    "dismissed"
            ) {

                setStatus(
                    "",
                    "Installation was cancelled. You can try again anytime."
                );

                showInstallButton();

                return;

            }


            /* ----------------------------------------------------
               Prompt unavailable
               ---------------------------------------------------- */

            if (
                result &&
                result.message
            ) {

                setStatus(
                    "",
                    result.message
                );

                hideInstallButton();

                return;

            }


            setStatus(
                "",
                "The installation prompt is not available right now."
            );

            hideInstallButton();

        } catch (error) {

            console.error(
                "[AFC Settings] PWA installation error:",
                error
            );


            setStatus(
                "error",
                error.message ||
                "Unable to install the app right now."
            );

        } finally {

            installButton.dataset.loading =
                "false";

            installButton.disabled =
                false;


            const originalHTML =
                installButton.dataset.originalHTML;


            if (originalHTML) {

                installButton.innerHTML =
                    originalHTML;

            }


            /*
             * Re-check because pwa.js may have
             * consumed the installation prompt.
             */

            setTimeout(
                updateInstallState,
                150
            );

        }

    }


    /* ============================================================
       MODAL
       ============================================================ */

    function openInstallHelp() {

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


        if (modalClose) {

            setTimeout(
                function () {

                    modalClose.focus();

                },
                50
            );

        }

    }


    function closeInstallHelp() {

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
       ESCAPE KEY
       ============================================================ */

    function handleEscape(event) {

        if (
            event.key ===
            "Escape"
        ) {

            if (
                installModal &&
                installModal.classList.contains(
                    "is-open"
                )
            ) {

                closeInstallHelp();

            }

        }

    }


    /* ============================================================
       MODAL BACKDROP
       ============================================================ */

    function handleModalBackdrop(event) {

        if (
            event.target ===
            installModal
        ) {

            closeInstallHelp();

        }

    }


    /* ============================================================
       PWA READY EVENT
       ============================================================ */

    function handlePWAReady(event) {

        console.log(
            "[AFC Settings] PWA ready:",
            event.detail
        );


        updateInstallState();

    }


    /* ============================================================
       INSTALL AVAILABLE EVENT
       ============================================================ */

    function handleInstallAvailable() {

        console.log(
            "[AFC Settings] Native PWA installation is available."
        );


        updateInstallState();

    }


    /* ============================================================
       APP INSTALLED EVENT
       ============================================================ */

    function handleAppInstalled() {

        console.log(
            "[AFC Settings] PWA installation completed."
        );


        setStatus(
            "installed",
            "The portal has been installed successfully."
        );


        hideInstallButton();

    }


    /* ============================================================
       BIND EVENTS
       ============================================================ */

    function bindEvents() {

        if (installButton) {

            installButton.addEventListener(
                "click",
                installApp
            );

        }


        if (helpButton) {

            helpButton.addEventListener(
                "click",
                openInstallHelp
            );

        }


        if (modalClose) {

            modalClose.addEventListener(
                "click",
                closeInstallHelp
            );

        }


        if (modalDone) {

            modalDone.addEventListener(
                "click",
                closeInstallHelp
            );

        }


        if (installModal) {

            installModal.addEventListener(
                "click",
                handleModalBackdrop
            );

        }


        document.addEventListener(
            "keydown",
            handleEscape
        );


        window.addEventListener(
            "afc:pwa-ready",
            handlePWAReady
        );


        window.addEventListener(
            "afc:pwa-install-available",
            handleInstallAvailable
        );


        window.addEventListener(
            "afc:pwa-installed",
            handleAppInstalled
        );

    }


    /* ============================================================
       CACHE DOM
       ============================================================ */

    function cacheDOM() {

        installButton =
            $("#installAppBtn");

        helpButton =
            $("#pwaHelpBtn");

        installModal =
            $("#pwaInstallModal");

        modalClose =
            $("#pwaModalClose");

        modalDone =
            $("#pwaModalDone");

        statusBox =
            $("#pwaStatus");

        statusDot =
            $("#pwaStatusDot");

        statusText =
            $("#pwaStatusText");

        installCard =
            $("#pwaInstallCard");

    }


    /* ============================================================
       INITIALIZE
       ============================================================ */

    function initializeSettings() {

        cacheDOM();

        bindEvents();


        /*
         * pwa.js is loaded before settings.js,
         * so AFC_PWA should normally already exist.
         */

        if (window.AFC_PWA) {

            updateInstallState();

        } else {

            setStatus(
                "loading",
                "Loading installation service..."
            );


            /*
             * Give pwa.js a moment to initialize.
             */

            setTimeout(
                updateInstallState,
                500
            );

        }

    }


    /* ============================================================
       DOM READY
       ============================================================ */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeSettings,
            {
                once: true
            }
        );

    } else {

        initializeSettings();

    }


})();
