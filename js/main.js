/* =========================================================
   AFC ISIU YOUTH PORTAL
   MAIN JAVASCRIPT
   VERSION 2.1
   PURPOSE:
   - Shared portal functionality
   - Sidebar / mobile navigation
   - Bottom hub button
   - Reliable offline status
   - Online-only navigation
   - Theme toggle
   - Dashboard greeting
   - Safe page initialization

   IMPORTANT:
   This file does NOT control the Lessons page.
   lessons.js controls all lesson-specific functionality.
========================================================= */

"use strict";


/* =========================================================
   GLOBAL CONFIG
========================================================= */

const AFC_MAIN_CONFIG = {

    MOBILE_BREAKPOINT: 768,

    OFFLINE_BANNER_ID: "offlineBanner",

    OFFLINE_MESSAGE_ID: "offlineMessage",

    THEME_STORAGE_KEY: "afcTheme"

};


/* =========================================================
   DOM READY HELPER
========================================================= */

function onDOMReady(callback) {

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            callback,
            {
                once: true
            }
        );

    } else {

        callback();

    }

}


/* =========================================================
   AOS
========================================================= */

onDOMReady(() => {

    if (
        typeof AOS !== "undefined" &&
        typeof AOS.init === "function"
    ) {

        AOS.init({

            duration: 900,

            easing: "ease-out-cubic",

            once: true,

            offset: 120

        });

    }

});


/* =========================================================
   OFFLINE STATUS
========================================================= */

/*
 * IMPORTANT:
 *
 * We intentionally DO NOT use navigator.onLine during
 * initial page load to display the banner.
 *
 * Some browsers and installed PWAs can temporarily report
 * navigator.onLine incorrectly while the page/service worker
 * is starting.
 *
 * The banner is therefore shown only after the browser
 * actually fires an "offline" event.
 *
 * When an "online" event fires, the banner disappears.
 */

onDOMReady(() => {

    let offlineBanner =
        document.getElementById(
            AFC_MAIN_CONFIG.OFFLINE_BANNER_ID
        );


    /* -----------------------------------------------------
       CREATE BANNER ONLY IF NEEDED
    ----------------------------------------------------- */

    function createOfflineBanner() {

        if (offlineBanner) {

            return offlineBanner;

        }


        offlineBanner =
            document.createElement("div");


        offlineBanner.id =
            AFC_MAIN_CONFIG.OFFLINE_BANNER_ID;


        offlineBanner.innerHTML = `

            <div class="offline-banner-content">

                <i class="fa-solid fa-wifi"></i>

                <div>

                    <strong>
                        You're offline
                    </strong>

                    <span>
                        Some features are unavailable
                        until you reconnect.
                    </span>

                </div>

            </div>

        `;


        document.body.prepend(
            offlineBanner
        );


        return offlineBanner;

    }


    /* -----------------------------------------------------
       SHOW OFFLINE BANNER
    ----------------------------------------------------- */

    function showOfflineBanner() {

        const banner =
            createOfflineBanner();


        banner.classList.add(
            "show"
        );

    }


    /* -----------------------------------------------------
       HIDE OFFLINE BANNER
    ----------------------------------------------------- */

    function hideOfflineBanner() {

        if (!offlineBanner) {

            return;

        }


        offlineBanner.classList.remove(
            "show"
        );

    }


    /* -----------------------------------------------------
       REAL OFFLINE EVENT
    ----------------------------------------------------- */

    window.addEventListener(
        "offline",
        () => {

            console.warn(
                "AFC Isiu: Browser reported offline."
            );


            showOfflineBanner();

        }
    );


    /* -----------------------------------------------------
       REAL ONLINE EVENT
    ----------------------------------------------------- */

    window.addEventListener(
        "online",
        () => {

            console.log(
                "AFC Isiu: Browser reported online."
            );


            hideOfflineBanner();

        }
    );


    /*
     * IMPORTANT:
     *
     * Do NOT call showOfflineBanner() here.
     *
     * We intentionally leave the banner hidden during
     * initial page load.
     */

});


/* =========================================================
   ONLINE-ONLY FEATURES
========================================================= */

onDOMReady(() => {

    const onlineOnlyLinks =
        document.querySelectorAll(
            "[data-online-only]"
        );


    if (!onlineOnlyLinks.length) {

        return;

    }


    onlineOnlyLinks.forEach(
        link => {

            link.addEventListener(
                "click",
                event => {

                    /*
                     * Allow navigation when browser
                     * reports that it is online.
                     */

                    if (navigator.onLine) {

                        return;

                    }


                    /*
                     * Stop navigation while offline.
                     */

                    event.preventDefault();


                    showOfflineMessage(
                        link.dataset.feature ||
                        "This feature"
                    );

                }
            );

        }
    );

});


/* =========================================================
   OFFLINE MESSAGE
========================================================= */

function showOfflineMessage(
    featureName
) {

    /*
     * Remove an existing message first.
     */

    const existing =
        document.getElementById(
            AFC_MAIN_CONFIG.OFFLINE_MESSAGE_ID
        );


    if (existing) {

        existing.remove();

    }


    const message =
        document.createElement("div");


    message.id =
        AFC_MAIN_CONFIG.OFFLINE_MESSAGE_ID;


    message.innerHTML = `

        <div class="offline-message-card">

            <div class="offline-message-icon">

                <i class="fa-solid fa-cloud-arrow-up"></i>

            </div>


            <h3>
                Internet Connection Required
            </h3>


            <p>
                ${escapeHTML(featureName)}
                requires an internet connection.
                Please turn on your data or connect
                to Wi-Fi and try again.
            </p>


            <button
                type="button"
                id="closeOfflineMessage"
            >
                Okay
            </button>

        </div>

    `;


    document.body.appendChild(
        message
    );


    const closeButton =
        document.getElementById(
            "closeOfflineMessage"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            () => {

                message.remove();

            }
        );

    }


    /*
     * Close when clicking outside the card.
     */

    message.addEventListener(
        "click",
        event => {

            if (
                event.target === message
            ) {

                message.remove();

            }

        }
    );


    /*
     * If connection comes back while the
     * message is open, close it automatically.
     */

    const closeWhenOnline = () => {

        if (message) {

            message.remove();

        }


        window.removeEventListener(
            "online",
            closeWhenOnline
        );

    };


    window.addEventListener(
        "online",
        closeWhenOnline
    );

}


/* =========================================================
   SIMPLE HTML ESCAPE
========================================================= */

function escapeHTML(
    value
) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   SIDEBAR / MOBILE NAVIGATION
========================================================= */

onDOMReady(() => {

    const sidebar =
        document.getElementById(
            "sidebar"
        );


    const overlay =
        document.getElementById(
            "sidebarOverlay"
        );


    const menuButton =
        document.getElementById(
            "mobileMenuBtn"
        );


    const hubButton =
        document.getElementById(
            "hubButton"
        );


    /*
     * If this page doesn't contain the
     * shared navigation, stop safely.
     */

    if (
        !sidebar ||
        !overlay
    ) {

        return;

    }


    /* -----------------------------------------------------
       OPEN SIDEBAR
    ----------------------------------------------------- */

    function openSidebar() {

        sidebar.classList.add(
            "show"
        );


        overlay.classList.add(
            "show"
        );


        document.body.classList.add(
            "sidebar-open"
        );


        document.body.style.overflow =
            "hidden";


        if (menuButton) {

            menuButton.setAttribute(
                "aria-expanded",
                "true"
            );

        }


        if (hubButton) {

            hubButton.setAttribute(
                "aria-expanded",
                "true"
            );

        }

    }


    /* -----------------------------------------------------
       CLOSE SIDEBAR
    ----------------------------------------------------- */

    function closeSidebar() {

        sidebar.classList.remove(
            "show"
        );


        overlay.classList.remove(
            "show"
        );


        document.body.classList.remove(
            "sidebar-open"
        );


        document.body.style.overflow =
            "";


        if (menuButton) {

            menuButton.setAttribute(
                "aria-expanded",
                "false"
            );

        }


        if (hubButton) {

            hubButton.setAttribute(
                "aria-expanded",
                "false"
            );

        }

    }


    /* -----------------------------------------------------
       MOBILE MENU BUTTON
    ----------------------------------------------------- */

    if (menuButton) {

        menuButton.addEventListener(
            "click",
            event => {

                event.preventDefault();

                event.stopPropagation();


                if (
                    sidebar.classList.contains(
                        "show"
                    )
                ) {

                    closeSidebar();

                } else {

                    openSidebar();

                }

            }
        );

    }


    /* -----------------------------------------------------
       CENTER HUB BUTTON
    ----------------------------------------------------- */

    if (hubButton) {

        hubButton.addEventListener(
            "click",
            event => {

                event.preventDefault();

                event.stopPropagation();


                if (
                    sidebar.classList.contains(
                        "show"
                    )
                ) {

                    closeSidebar();

                } else {

                    openSidebar();

                }

            }
        );

    }


    /* -----------------------------------------------------
       OVERLAY
    ----------------------------------------------------- */

    overlay.addEventListener(
        "click",
        event => {

            event.preventDefault();

            closeSidebar();

        }
    );


    /* -----------------------------------------------------
       SIDEBAR LINKS
    ----------------------------------------------------- */

    const sidebarLinks =
        sidebar.querySelectorAll(
            "a"
        );


    sidebarLinks.forEach(
        link => {

            link.addEventListener(
                "click",
                () => {

                    if (
                        window.innerWidth <=
                        AFC_MAIN_CONFIG.MOBILE_BREAKPOINT
                    ) {

                        closeSidebar();

                    }

                }
            );

        }
    );


    /* -----------------------------------------------------
       ESCAPE KEY
    ----------------------------------------------------- */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                sidebar.classList.contains(
                    "show"
                )
            ) {

                closeSidebar();

            }

        }
    );


    /* -----------------------------------------------------
       RESIZE
    ----------------------------------------------------- */

    window.addEventListener(
        "resize",
        () => {

            if (
                window.innerWidth >
                AFC_MAIN_CONFIG.MOBILE_BREAKPOINT
            ) {

                closeSidebar();

            }

        }
    );


    /* -----------------------------------------------------
       INITIAL ARIA STATE
    ----------------------------------------------------- */

    if (menuButton) {

        menuButton.setAttribute(
            "aria-expanded",
            "false"
        );

    }


    if (hubButton) {

        hubButton.setAttribute(
            "aria-expanded",
            "false"
        );

    }

});


/* =========================================================
   THEME TOGGLE
========================================================= */

onDOMReady(() => {

    const themeButton =
        document.getElementById(
            "themeBtn"
        );


    if (!themeButton) {

        return;

    }


    const icon =
        themeButton.querySelector(
            "i"
        );


    function applyTheme(
        theme
    ) {

        if (
            theme === "dark"
        ) {

            document.documentElement.setAttribute(
                "data-theme",
                "dark"
            );


            if (icon) {

                icon.classList.remove(
                    "fa-moon"
                );

                icon.classList.add(
                    "fa-sun"
                );

            }

        } else {

            document.documentElement.setAttribute(
                "data-theme",
                "light"
            );


            if (icon) {

                icon.classList.remove(
                    "fa-sun"
                );

                icon.classList.add(
                    "fa-moon"
                );

            }

        }

    }


    /* -----------------------------------------------------
       LOAD SAVED THEME
    ----------------------------------------------------- */

    const savedTheme =
        localStorage.getItem(
            AFC_MAIN_CONFIG.THEME_STORAGE_KEY
        );


    if (
        savedTheme === "dark" ||
        savedTheme === "light"
    ) {

        applyTheme(
            savedTheme
        );

    } else {

        const prefersDark =
            window.matchMedia &&
            window.matchMedia(
                "(prefers-color-scheme: dark)"
            ).matches;


        applyTheme(
            prefersDark
                ? "dark"
                : "light"
        );

    }


    /* -----------------------------------------------------
       TOGGLE
    ----------------------------------------------------- */

    themeButton.addEventListener(
        "click",
        event => {

            event.preventDefault();


            const currentTheme =
                document.documentElement.getAttribute(
                    "data-theme"
                );


            const nextTheme =
                currentTheme === "dark"
                    ? "light"
                    : "dark";


            applyTheme(
                nextTheme
            );


            localStorage.setItem(
                AFC_MAIN_CONFIG.THEME_STORAGE_KEY,
                nextTheme
            );

        }
    );

});


/* =========================================================
   DASHBOARD GREETING
========================================================= */

onDOMReady(() => {

    const greetingText =
        document.getElementById(
            "greetingText"
        );


    const currentDate =
        document.getElementById(
            "currentDate"
        );


    if (
        !greetingText &&
        !currentDate
    ) {

        return;

    }


    const now =
        new Date();


    const hour =
        now.getHours();


    let greeting =
        "Good Evening, Dear User.";


    if (
        hour >= 5 &&
        hour < 12
    ) {

        greeting =
            "Good Morning, Dear User.";

    }

    else if (
        hour >= 12 &&
        hour < 17
    ) {

        greeting =
            "Good Afternoon, Dear User.";

    }

    else if (
        hour >= 17 &&
        hour < 21
    ) {

        greeting =
            "Good Evening, Dear User.";

    }

    else {

        greeting =
            "Good Night, Dear User.";

    }


    if (greetingText) {

        greetingText.textContent =
            greeting;

    }


    if (currentDate) {

        currentDate.textContent =
            now.toLocaleDateString(
                "en-GB",
                {

                    weekday:
                        "long",

                    day:
                        "numeric",

                    month:
                        "long",

                    year:
                        "numeric"

                }
            );

    }

});


/* =========================================================
   PORTAL BRAND / HEADER SAFETY
========================================================= */

onDOMReady(() => {

    /*
     * Prevent accidental form submission
     * from shared header buttons.
     */

    const headerButtons =
        document.querySelectorAll(
            ".mobile-menu-btn, .header-icon, .hub-button"
        );


    headerButtons.forEach(
        button => {

            if (
                !button.getAttribute("type")
            ) {

                button.setAttribute(
                    "type",
                    "button"
                );

            }

        }
    );

});


/* =========================================================
   SERVICE WORKER
========================================================= */

onDOMReady(() => {

    /*
     * Register the PWA service worker only if
     * supported by the browser.
     */

    if (
        "serviceWorker" in navigator
    ) {

        window.addEventListener(
            "load",
            () => {

                navigator.serviceWorker
                    .register(
                        "/service-worker.js"
                    )
                    .then(
                        registration => {

                            console.log(
                                "AFC Isiu: Service worker registered.",
                                registration.scope
                            );

                        }
                    )
                    .catch(
                        error => {

                            console.warn(
                                "AFC Isiu: Service worker registration failed.",
                                error
                            );

                        }
                    );

            }
        );

    }

});


/* =========================================================
   GLOBAL ERROR REPORTING
========================================================= */

window.addEventListener(
    "error",
    event => {

        console.error(
            "AFC Isiu Portal Error:",
            event.error ||
            event.message
        );

    }
);


/* =========================================================
   GLOBAL PROMISE ERROR REPORTING
========================================================= */

window.addEventListener(
    "unhandledrejection",
    event => {

        console.error(
            "AFC Isiu Portal Promise Error:",
            event.reason
        );

    }
);


/* =========================================================
   STARTUP MESSAGE
========================================================= */

console.log(
    "AFC Isiu Youth Portal: main.js loaded successfully."
);
 
