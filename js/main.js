/* =========================================================
   AFC ISIU YOUTH PORTAL
   FILE: main.js
   VERSION: 2.4

   PURPOSE:
   - Shared portal functionality
   - Sidebar / mobile navigation
   - Bottom hub button
   - Reliable offline status
   - Online-only navigation
   - Theme toggle
   - Dashboard greeting
   - Universal page-transition loader
   - Safe page initialization

   IMPORTANT:
   - layout.css controls header positioning.
   - This file does NOT control header positioning.
   - lessons.js controls lesson-specific functionality.
   - pwa.js is the ONLY file responsible for the
     Progressive Web App service worker and installation.
========================================================= */

"use strict";


/* =========================================================
   GLOBAL CONFIGURATION
========================================================= */

const AFC_MAIN_CONFIG = {

    MOBILE_BREAKPOINT: 768,

    OFFLINE_BANNER_ID: "offlineBanner",

    OFFLINE_MESSAGE_ID: "offlineMessage",

    THEME_STORAGE_KEY: "afcTheme",

    PAGE_LOADER_ID: "pageTransitionLoader",

    PAGE_LOADER_MIN_TIME: 320,

    PAGE_LOADER_MAX_TIME: 8000

};


/* =========================================================
   DOM READY HELPER
========================================================= */

function onDOMReady(callback) {

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            callback,
            { once: true }
        );

    } else {

        callback();

    }

}


/* =========================================================
   UNIVERSAL PAGE TRANSITION LOADER
========================================================= */

(function initPageTransitionLoader() {

    let loader = null;

    let hideTimer = null;

    let safetyTimer = null;

    let shownAt = 0;


    /* -----------------------------------------------------
       CREATE LOADER
    ----------------------------------------------------- */

    function createLoader() {

        if (loader && document.body.contains(loader)) {
            return loader;
        }


        if (!document.body) {
            return null;
        }


        loader = document.getElementById(
            AFC_MAIN_CONFIG.PAGE_LOADER_ID
        );


        if (loader) {
            return loader;
        }


        loader = document.createElement("div");

        loader.id = AFC_MAIN_CONFIG.PAGE_LOADER_ID;

        loader.className = "page-transition-loader";

        loader.setAttribute("aria-hidden", "true");

        loader.innerHTML = `

            <div class="page-transition-glow"></div>

            <div class="page-transition-content">

                <div class="page-transition-logo-wrap">

                    <div class="page-transition-logo-ring"></div>

                    <img
                        src="/images/logo.png"
                        alt="AFC Isiu Youth Portal"
                        class="page-transition-logo"
                    >

                </div>


                <div class="page-transition-brand">
                    AFC ISIU
                </div>


                <div class="page-transition-subtitle">
                    YOUTH PORTAL
                </div>


                <div
                    class="page-transition-progress"
                    aria-hidden="true"
                >
                    <span></span>
                </div>


                <div class="page-transition-status">
                    Loading
                </div>

            </div>

        `;


        document.body.appendChild(loader);

        return loader;

    }


    /* -----------------------------------------------------
       SHOW LOADER
    ----------------------------------------------------- */

    function showPageLoader() {

        const element = createLoader();

        if (!element) return;


        clearTimeout(hideTimer);

        clearTimeout(safetyTimer);


        shownAt = performance.now();


        element.classList.remove("is-leaving");

        element.classList.add("is-visible");

        element.setAttribute("aria-hidden", "false");


        safetyTimer = setTimeout(() => {

            hidePageLoader(true);

        }, AFC_MAIN_CONFIG.PAGE_LOADER_MAX_TIME);

    }


    /* -----------------------------------------------------
       HIDE LOADER
    ----------------------------------------------------- */

    function hidePageLoader(force = false) {

        const element = loader;

        if (!element) return;


        clearTimeout(hideTimer);

        clearTimeout(safetyTimer);


        const elapsed =
            performance.now() - shownAt;


        const remaining =
            AFC_MAIN_CONFIG.PAGE_LOADER_MIN_TIME - elapsed;


        if (!force && remaining > 0) {

            hideTimer = setTimeout(
                () => hidePageLoader(false),
                remaining
            );

            return;

        }


        element.classList.add("is-leaving");


        element.setAttribute("aria-hidden", "true");


        hideTimer = setTimeout(() => {

            if (!loader) return;

            loader.classList.remove(
                "is-visible",
                "is-leaving"
            );

        }, 420);

    }


    /* -----------------------------------------------------
       CHECK WHETHER LINK SHOULD USE LOADER
    ----------------------------------------------------- */

    function shouldUseLoader(link, event) {

        if (!link) return false;


        if (
            event.button !== undefined &&
            event.button !== 0
        ) {
            return false;
        }


        if (
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.altKey
        ) {
            return false;
        }


        if (link.hasAttribute("download")) {
            return false;
        }


        if (link.hasAttribute("data-no-page-loader")) {
            return false;
        }


        const target =
            link.getAttribute("target");


        if (
            target &&
            target !== "_self"
        ) {
            return false;
        }


        const rawHref =
            link.getAttribute("href");


        if (!rawHref) {
            return false;
        }


        const href =
            rawHref.trim();


        if (!href) {
            return false;
        }


        if (
            href.startsWith("#") ||
            href.startsWith("mailto:") ||
            href.startsWith("tel:") ||
            href.startsWith("javascript:")
        ) {
            return false;
        }


        let destination;

        try {

            destination =
                new URL(
                    href,
                    window.location.href
                );

        } catch (error) {

            return false;

        }


        if (
            destination.origin !==
            window.location.origin
        ) {
            return false;
        }


        const current =
            new URL(window.location.href);


        /*
         * Same document navigation.
         * Do not show the loader when only the
         * hash/anchor changes.
         */

        if (
            destination.pathname === current.pathname &&
            destination.search === current.search &&
            destination.hash !== current.hash
        ) {
            return false;
        }


        /*
         * Online-only features should never display
         * the loader when the click will immediately
         * be blocked because the browser is offline.
         */

        if (
            link.hasAttribute("data-online-only") &&
            !navigator.onLine
        ) {
            return false;
        }


        return true;

    }


    /* -----------------------------------------------------
       INITIAL PAGE LOAD
    ----------------------------------------------------- */

    function startInitialLoader() {

        if (!document.body) return;


        showPageLoader();


        /*
         * Hide as soon as the DOM is ready.
         * window.load below provides an additional
         * safety point for images and other assets.
         */

        onDOMReady(() => {

            hidePageLoader();

        });

    }


    /* -----------------------------------------------------
       INTERNAL NAVIGATION
    ----------------------------------------------------- */

    function bindNavigationLoader() {

        /*
         * Capture phase lets the loader appear immediately
         * before the browser starts leaving the current page.
         */

        document.addEventListener(
            "click",
            event => {

                const link =
                    event.target.closest &&
                    event.target.closest("a[href]");


                if (!link) return;


                if (
                    !shouldUseLoader(
                        link,
                        event
                    )
                ) {
                    return;
                }


                showPageLoader();


                /*
                 * If another click handler cancels the
                 * navigation, remove our loader again.
                 */

                setTimeout(() => {

                    if (event.defaultPrevented) {

                        hidePageLoader(true);

                    }

                }, 0);

            },
            true
        );

    }


    /* -----------------------------------------------------
       BROWSER BACK / FORWARD / BFCACHE
    ----------------------------------------------------- */

    function bindPageLifecycle() {

        window.addEventListener(
            "pageshow",
            () => {

                hidePageLoader(true);

            }
        );


        window.addEventListener(
            "load",
            () => {

                hidePageLoader();

            }
        );

    }


    /* -----------------------------------------------------
       EXPOSE SAFE PUBLIC API
    ----------------------------------------------------- */

    window.AFCPageLoader = {

        show: showPageLoader,

        hide: hidePageLoader

    };


    /*
     * The loader needs the body, so initialize immediately
     * when possible and otherwise wait for DOM ready.
     */

    if (document.body) {

        startInitialLoader();

    } else {

        document.addEventListener(
            "DOMContentLoaded",
            startInitialLoader,
            { once: true }
        );

    }


    bindNavigationLoader();

    bindPageLifecycle();


})();


/* =========================================================
   AOS INITIALIZATION
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
   OFFLINE STATUS BANNER
========================================================= */

onDOMReady(() => {

    let offlineBanner =
        document.getElementById(
            AFC_MAIN_CONFIG.OFFLINE_BANNER_ID
        );


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

                    <strong>You're offline</strong>

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


    function showOfflineBanner() {

        const banner =
            createOfflineBanner();


        banner.classList.add("show");

    }


    function hideOfflineBanner() {

        if (!offlineBanner) return;


        offlineBanner.classList.remove(
            "show"
        );

    }


    window.addEventListener(
        "offline",
        () => {

            console.warn(
                "AFC Isiu: Browser reported offline."
            );

            showOfflineBanner();

        }
    );


    window.addEventListener(
        "online",
        () => {

            console.log(
                "AFC Isiu: Browser reported online."
            );

            hideOfflineBanner();

        }
    );


    if (!navigator.onLine) {

        showOfflineBanner();

    }

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


    onlineOnlyLinks.forEach(link => {

        link.addEventListener(
            "click",
            event => {

                if (navigator.onLine) {
                    return;
                }


                event.preventDefault();


                showOfflineMessage(
                    link.dataset.feature ||
                    "This feature"
                );

            }
        );

    });

});


/* =========================================================
   OFFLINE MESSAGE
========================================================= */

function showOfflineMessage(featureName) {

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
            () => message.remove()
        );

    }


    message.addEventListener(
        "click",
        event => {

            if (event.target === message) {

                message.remove();

            }

        }
    );


    const closeWhenOnline = () => {

        if (
            message &&
            message.parentNode
        ) {

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
   HTML ESCAPE HELPER
========================================================= */

function escapeHTML(value) {

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


    if (!sidebar || !overlay) {
        return;
    }


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


    overlay.addEventListener(
        "click",
        event => {

            event.preventDefault();

            closeSidebar();

        }
    );


    const sidebarLinks =
        sidebar.querySelectorAll(
            "a"
        );


    sidebarLinks.forEach(link => {

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

    });


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


    function applyTheme(theme) {

        if (theme === "dark") {

            document.documentElement
                .setAttribute(
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

            document.documentElement
                .setAttribute(
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


    themeButton.addEventListener(
        "click",
        event => {

            event.preventDefault();


            const currentTheme =
                document.documentElement
                    .getAttribute(
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

    } else if (
        hour >= 12 &&
        hour < 17
    ) {

        greeting =
            "Good Afternoon, Dear User.";

    } else if (
        hour >= 17 &&
        hour < 21
    ) {

        greeting =
            "Good Evening, Dear User.";

    } else {

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
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                }
            );

    }

});


/* =========================================================
   SAFE BUTTON TYPES
========================================================= */

onDOMReady(() => {

    const headerButtons =
        document.querySelectorAll(
            ".mobile-menu-btn, .header-icon, .hub-button"
        );


    headerButtons.forEach(button => {

        if (
            !button.getAttribute(
                "type"
            )
        ) {

            button.setAttribute(
                "type",
                "button"
            );

        }

    });

});


/* =========================================================
   SERVICE WORKER
=========================================================

   Service worker registration is intentionally REMOVED
   from main.js.

   pwa.js is the single owner of /sw.js and the
   browser's PWA installation flow.
========================================================= */


/* =========================================================
   GLOBAL ERROR HANDLING
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


window.addEventListener(
    "unhandledrejection",
    event => {

        console.error(
            "AFC Isiu Portal Promise Error:",
            event.reason
        );

    }
);


console.log(
    "AFC Isiu Youth Portal: main.js loaded successfully."
);
