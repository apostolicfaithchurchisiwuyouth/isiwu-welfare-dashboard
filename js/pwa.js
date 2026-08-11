/* =========================================================
   AFC ISIU YOUTH PORTAL
   PWA CORE + INSTALL MANAGER
========================================================= */

(() => {

    "use strict";


    /* =====================================================
       SERVICE WORKER
    ===================================================== */

    if ("serviceWorker" in navigator) {

        window.addEventListener("load", async () => {

            try {

                const registration =
                    await navigator.serviceWorker.register("/sw.js", {
                        scope: "/"
                    });

                console.log(
                    "AFC Isiu PWA: Service worker registered.",
                    registration.scope
                );

            } catch (error) {

                console.error(
                    "AFC Isiu PWA: Service worker registration failed.",
                    error
                );

            }

        });

    }


    /* =====================================================
       INSTALL PROMPT
    ===================================================== */

    let deferredInstallPrompt = null;


    /* =====================================================
       CHECK IF APP IS ALREADY INSTALLED
    ===================================================== */

    function isAppInstalled() {

        /* Android / Chrome / Edge / other browsers */

        if (
            window.matchMedia &&
            window.matchMedia("(display-mode: standalone)").matches
        ) {
            return true;
        }


        /* iPhone / iPad */

        if (window.navigator.standalone === true) {
            return true;
        }


        return false;

    }


    /* =====================================================
       DETECT DEVICE
    ===================================================== */

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


    /* =====================================================
       BEFORE INSTALL PROMPT
    ===================================================== */

    window.addEventListener(
        "beforeinstallprompt",
        event => {

            console.log(
                "AFC Isiu PWA: Native install prompt available."
            );

            event.preventDefault();

            deferredInstallPrompt = event;

            updateInstallButtons();

        }
    );


    /* =====================================================
       APP INSTALLED
    ===================================================== */

    window.addEventListener(
        "appinstalled",
        () => {

            console.log(
                "AFC Isiu PWA: Application installed."
            );

            deferredInstallPrompt = null;

            updateInstallButtons();

        }
    );


    /* =====================================================
       UPDATE INSTALL BUTTONS
    ===================================================== */

    function updateInstallButtons() {

        const buttons =
            document.querySelectorAll(
                "#installAppBtn, [data-install-app]"
            );


        buttons.forEach(button => {

            if (isAppInstalled()) {

                button.innerHTML = `
                    <i class="fa-solid fa-circle-check"></i>
                    Installed
                `;

                button.disabled = true;

                button.classList.add("installed");

                return;

            }


            button.disabled = false;

            button.classList.remove("installed");


            button.innerHTML = `
                <i class="fa-solid fa-download"></i>
                Install App
            `;

        });

    }


    /* =====================================================
       INSTALL BUTTON CLICK
    ===================================================== */

    document.addEventListener(
        "click",
        async event => {

            const button =
                event.target.closest(
                    "#installAppBtn, [data-install-app]"
                );


            if (!button) {
                return;
            }


            event.preventDefault();


            /* =============================================
               ALREADY INSTALLED
            ============================================= */

            if (isAppInstalled()) {

                showInstallMessage(
                    "AFC Isiu Youth Portal is already installed on this device.",
                    "success"
                );

                return;

            }


            /* =============================================
               NATIVE INSTALL PROMPT AVAILABLE
            ============================================= */

            if (deferredInstallPrompt) {

                try {

                    button.disabled = true;

                    button.innerHTML = `
                        <i class="fa-solid fa-spinner fa-spin"></i>
                        Installing...
                    `;


                    await deferredInstallPrompt.prompt();


                    const result =
                        await deferredInstallPrompt.userChoice;


                    console.log(
                        "AFC Isiu installation result:",
                        result.outcome
                    );


                    deferredInstallPrompt = null;


                    if (result.outcome === "accepted") {

                        button.innerHTML = `
                            <i class="fa-solid fa-check"></i>
                            Installing...
                        `;

                    } else {

                        button.disabled = false;

                        button.innerHTML = `
                            <i class="fa-solid fa-download"></i>
                            Install App
                        `;

                    }

                }

                catch (error) {

                    console.error(
                        "AFC Isiu PWA installation error:",
                        error
                    );

                    button.disabled = false;

                    button.innerHTML = `
                        <i class="fa-solid fa-download"></i>
                        Install App
                    `;

                }

                return;

            }


            /* =============================================
               iOS INSTALLATION
            ============================================= */

            if (isIOS()) {

                showIOSInstallInstructions();

                return;

            }


            /* =============================================
               ANDROID / OTHER BROWSER
               NO NATIVE PROMPT AVAILABLE
            ============================================= */

            if (isAndroid()) {

                showAndroidInstallInstructions();

                return;

            }


            /* =============================================
               DESKTOP / OTHER BROWSER
            ============================================= */

            showInstallMessage(
                "Installation is not currently available from this browser. Open this portal in Chrome or Edge and try again.",
                "info"
            );

        }
    );


    /* =====================================================
       iOS INSTALL INSTRUCTIONS
    ===================================================== */

    function showIOSInstallInstructions() {

        showInstallModal({

            icon: "fa-brands fa-apple",

            title: "Install AFC Isiu Youth Portal",

            content: `
                <p>
                    You can install AFC Isiu Youth Portal
                    directly from Safari.
                </p>

                <div class="pwa-install-steps">

                    <div class="pwa-step">

                        <span>1</span>

                        <div>
                            <strong>Tap Share</strong>
                            <small>
                                Tap the Share button
                                at the bottom of Safari.
                            </small>
                        </div>

                    </div>


                    <div class="pwa-step">

                        <span>2</span>

                        <div>
                            <strong>Add to Home Screen</strong>
                            <small>
                                Scroll down and select
                                "Add to Home Screen".
                            </small>
                        </div>

                    </div>


                    <div class="pwa-step">

                        <span>3</span>

                        <div>
                            <strong>Tap Add</strong>
                            <small>
                                Tap Add to place AFC Isiu
                                on your home screen.
                            </small>
                        </div>

                    </div>

                </div>
            `

        });

    }


    /* =====================================================
       ANDROID INSTALL INSTRUCTIONS
    ===================================================== */

    function showAndroidInstallInstructions() {

        showInstallModal({

            icon: "fa-brands fa-android",

            title: "Install AFC Isiu Youth Portal",

            content: `
                <p>
                    Chrome has not provided the automatic
                    installation prompt yet.
                </p>

                <div class="pwa-install-steps">

                    <div class="pwa-step">

                        <span>1</span>

                        <div>
                            <strong>Open Chrome Menu</strong>
                            <small>
                                Tap the three-dot menu
                                in Chrome.
                            </small>
                        </div>

                    </div>


                    <div class="pwa-step">

                        <span>2</span>

                        <div>
                            <strong>Install App</strong>
                            <small>
                                Look for "Install app"
                                or "Add to Home screen".
                            </small>
                        </div>

                    </div>


                    <div class="pwa-step">

                        <span>3</span>

                        <div>
                            <strong>Confirm Installation</strong>
                            <small>
                                Follow the prompt to install
                                AFC Isiu Youth Portal.
                            </small>
                        </div>

                    </div>

                </div>
            `

        });

    }


    /* =====================================================
       GENERIC INSTALL MODAL
    ===================================================== */

    function showInstallModal({
        icon,
        title,
        content
    }) {

        const existing =
            document.getElementById(
                "pwaInstallModal"
            );


        if (existing) {
            existing.remove();
        }


        const modal =
            document.createElement("div");


        modal.id = "pwaInstallModal";

        modal.className =
            "pwa-install-modal";


        modal.innerHTML = `

            <div class="pwa-install-backdrop"></div>

            <div
                class="pwa-install-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="pwaInstallTitle">

                <button
                    type="button"
                    class="pwa-install-close"
                    aria-label="Close">

                    <i class="fa-solid fa-xmark"></i>

                </button>


                <div class="pwa-install-modal-icon">

                    <i class="${icon}"></i>

                </div>


                <h2 id="pwaInstallTitle">
                    ${title}
                </h2>


                <div class="pwa-install-modal-content">

                    ${content}

                </div>


                <button
                    type="button"
                    class="pwa-install-done">

                    Got It

                </button>

            </div>

        `;


        document.body.appendChild(modal);


        requestAnimationFrame(() => {

            modal.classList.add("show");

        });


        const closeModal = () => {

            modal.classList.remove("show");

            setTimeout(() => {

                modal.remove();

            }, 250);

        };


        modal
            .querySelector(".pwa-install-close")
            .addEventListener(
                "click",
                closeModal
            );


        modal
            .querySelector(".pwa-install-backdrop")
            .addEventListener(
                "click",
                closeModal
            );


        modal
            .querySelector(".pwa-install-done")
            .addEventListener(
                "click",
                closeModal
            );

    }


    /* =====================================================
       SIMPLE MESSAGE
    ===================================================== */

    function showInstallMessage(
        message,
        type = "info"
    ) {

        const old =
            document.querySelector(
                ".pwa-install-toast"
            );


        if (old) {
            old.remove();
        }


        const toast =
            document.createElement("div");


        toast.className =
            `pwa-install-toast ${type}`;


        toast.innerHTML = `

            <i class="fa-solid ${
                type === "success"
                    ? "fa-circle-check"
                    : "fa-circle-info"
            }"></i>

            <span>${message}</span>

        `;


        document.body.appendChild(toast);


        requestAnimationFrame(() => {

            toast.classList.add("show");

        });


        setTimeout(() => {

            toast.classList.remove("show");

            setTimeout(() => {

                toast.remove();

            }, 250);

        }, 4000);

    }


    /* =====================================================
       INITIAL STATE
    ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            updateInstallButtons();

        }
    );


})();
