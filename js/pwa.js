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


    /* ========================================================
       DOM HELPERS
    ======================================================== */

    function $(id) {

        return document.getElementById(id);

    }


    /* ========================================================
       ELEMENTS
    ======================================================== */

    const installButton =
        $("installAppBtn");

    const status =
        $("pwaStatus");

    const statusDot =
        $("pwaStatusDot");

    const statusText =
        $("pwaStatusText");


    /* ========================================================
       UPDATE STATUS
    ======================================================== */

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

                status.classList.add(type);

            }

        }


        if (statusText) {

            statusText.textContent =
                message;

        }

    }


    /* ========================================================
       CHECK IF APP IS ALREADY INSTALLED
    ======================================================== */

    function isAppInstalled() {

        /* Android / Chrome / most browsers */

        if (
            window.matchMedia &&
            window.matchMedia(
                "(display-mode: standalone)"
            ).matches
        ) {

            return true;

        }


        /* iOS Safari */

        if (
            window.navigator.standalone === true
        ) {

            return true;

        }


        return false;

    }


    /* ========================================================
       SHOW INSTALL BUTTON
    ======================================================== */

    function showInstallButton() {

        if (!installButton) {

            return;

        }


        installButton.hidden = false;

        installButton.style.display =
            "inline-flex";

        installButton.disabled = false;

    }


    /* ========================================================
       HIDE INSTALL BUTTON
    ======================================================== */

    function hideInstallButton() {

        if (!installButton) {

            return;

        }


        installButton.hidden = true;

        installButton.style.display =
            "none";

    }


    /* ========================================================
       INITIAL STATE
    ======================================================== */

    function initialise() {

        if (isAppInstalled()) {

            setStatus(
                "installed",
                "AFC Isiu Youth Portal is already installed."
            );

            hideInstallButton();

            return;

        }


        /*
         * We initially keep the button available.
         *
         * Chrome may fire beforeinstallprompt later.
         */

        showInstallButton();


        setStatus(
            "",
            "Checking installation availability..."
        );

    }


    /* ========================================================
       CHROME / EDGE INSTALL PROMPT
    ======================================================== */

    window.addEventListener(
        "beforeinstallprompt",
        function (event) {

            console.log(
                "[PWA] beforeinstallprompt received."
            );


            /*
             * Prevent Chrome from displaying
             * its own automatic mini-infobar.
             */

            event.preventDefault();


            /*
             * Save the event so we can trigger
             * the installation later.
             */

            deferredInstallPrompt =
                event;


            showInstallButton();


            setStatus(
                "available",
                "This app is ready to be installed."
            );

        }
    );


    /* ========================================================
       INSTALL BUTTON
    ======================================================== */

    if (installButton) {

        installButton.addEventListener(
            "click",
            async function () {

                console.log(
                    "[PWA] Install button clicked."
                );


                /*
                 * If Chrome supplied the native
                 * installation prompt, use it.
                 */

                if (deferredInstallPrompt) {

                    try {

                        installButton.disabled =
                            true;


                        deferredInstallPrompt.prompt();


                        const result =
                            await deferredInstallPrompt.userChoice;


                        console.log(
                            "[PWA] Installation result:",
                            result.outcome
                        );


                        if (
                            result.outcome ===
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
                                "Installation was cancelled. You can try again."
                            );

                        }


                    }
                    catch (error) {

                        console.error(
                            "[PWA] Installation error:",
                            error
                        );


                        setStatus(
                            "",
                            "Chrome could not start the installation."
                        );

                    }
                    finally {

                        /*
                         * The beforeinstallprompt event
                         * can only be used once.
                         */

                        deferredInstallPrompt =
                            null;

                        installButton.disabled =
                            false;

                    }


                    return;

                }


                /*
                 * If there is no native prompt,
                 * tell the user to use the manual
                 * installation instructions.
                 */

                console.log(
                    "[PWA] Native install prompt is not available."
                );


                const helpButton =
                    $("pwaHelpBtn");


                if (helpButton) {

                    helpButton.click();

                }
                else {

                    setStatus(
                        "",
                        "Use your browser menu and choose Install app or Add to Home screen."
                    );

                }

            }
        );

    }


    /* ========================================================
       INSTALL SUCCESS
    ======================================================== */

    window.addEventListener(
        "appinstalled",
        function () {

            console.log(
                "[PWA] App successfully installed."
            );


            deferredInstallPrompt =
                null;


            setStatus(
                "installed",
                "AFC Isiu Youth Portal is now installed."
            );


            hideInstallButton();

        }
    );


    /* ========================================================
       DISPLAY MODE CHANGE
    ======================================================== */

    if (window.matchMedia) {

        const standaloneQuery =
            window.matchMedia(
                "(display-mode: standalone)"
            );


        standaloneQuery.addEventListener(
            "change",
            function (event) {

                if (event.matches) {

                    setStatus(
                        "installed",
                        "AFC Isiu Youth Portal is already installed."
                    );

                    hideInstallButton();

                }

            }
        );

    }


    /* ========================================================
       SERVICE WORKER
    ======================================================== */

    if (
        "serviceWorker" in navigator
    ) {

        window.addEventListener(
            "load",
            function () {

                navigator.serviceWorker
                    .register("/sw.js")
                    .then(
                        function (registration) {

                            console.log(
                                "[PWA] Service worker registered:",
                                registration.scope
                            );

                        }
                    )
                    .catch(
                        function (error) {

                            console.error(
                                "[PWA] Service worker registration failed:",
                                error
                            );

                        }
                    );

            }
        );

    }


    /* ========================================================
       START
    ======================================================== */

    initialise();


})();
