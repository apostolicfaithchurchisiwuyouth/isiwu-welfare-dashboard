/**
 * ============================================================
 * AFC ISIU YOUTH PORTAL V2
 * FILE: main.js
 * PURPOSE: GLOBAL PORTAL CONTROLLER
 * VERSION: 2.5
 * ============================================================
 *
 * RESPONSIBILITIES
 * ------------------------------------------------------------
 * - Global page transition loader
 * - Sidebar
 * - Mobile navigation
 * - Bottom navigation support
 * - Theme handling
 * - Offline banner
 * - Online-only feature protection
 * - AOS initialization
 * - Global UI helpers
 *
 * IMPORTANT
 * ------------------------------------------------------------
 * PWA / SERVICE WORKER REGISTRATION IS OWNED BY pwa.js.
 * Do NOT register the service worker here.
 *
 * GLOBAL LOADER
 * ------------------------------------------------------------
 * The global loader is available as:
 *
 * window.AFCPageLoader
 * window.AFC_Loader
 *
 * Both expose:
 *
 *     show(message)
 *     hide(force)
 *
 * ============================================================
 */

(function () {

    "use strict";


    /* =========================================================
       GLOBAL CONFIGURATION
    ========================================================= */

    const AFC_MAIN_CONFIG = {

        VERSION:
            "2.5",

        MOBILE_BREAKPOINT:
            768,

        OFFLINE_BANNER_ID:
            "offlineBanner",

        OFFLINE_MESSAGE_ID:
            "offlineMessage",

        THEME_STORAGE_KEY:
            "afcTheme",

        PAGE_LOADER_ID:
            "pageTransitionLoader",

        /*
         * Minimum time the loader remains visible.
         *
         * This prevents a distracting flash on fast devices.
         */
        PAGE_LOADER_MIN_TIME:
            420,

        /*
         * Absolute safety timeout.
         *
         * A broken page must never leave the loader
         * permanently covering the application.
         */
        PAGE_LOADER_MAX_TIME:
            12000,

        /*
         * Time used for the visual exit animation.
         */
        PAGE_LOADER_EXIT_TIME:
            420

    };


    /* =========================================================
       DOM READY HELPER
    ========================================================= */

    function onDOMReady(callback) {

        if (
            document.readyState ===
            "loading"
        ) {

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
       PAGE TRANSITION LOADER
    ========================================================= */

    (function initPageTransitionLoader() {

        let loader = null;

        let shownAt =
            0;

        let minimumTimer =
            null;

        let safetyTimer =
            null;

        let hideTimer =
            null;

        let initialLoadComplete =
            false;

        let initialized =
            false;


        /* =====================================================
           CREATE LOADER
        ===================================================== */

        function createLoader() {

            const existing =
                document.getElementById(
                    AFC_MAIN_CONFIG.PAGE_LOADER_ID
                );

            if (existing) {

                loader =
                    existing;

                return loader;

            }


            if (!document.body) {

                return null;

            }


            loader =
                document.createElement(
                    "div"
                );


            loader.id =
                AFC_MAIN_CONFIG.PAGE_LOADER_ID;


            loader.className =
                "page-transition-loader";


            loader.setAttribute(
                "aria-hidden",
                "true"
            );


            loader.innerHTML = `

                <div
                    class="page-transition-glow"
                    aria-hidden="true"
                ></div>


                <div
                    class="page-transition-stars"
                    aria-hidden="true"
                ></div>


                <div
                    class="page-transition-content"
                >

                    <div
                        class="page-transition-logo-wrap"
                    >

                        <div
                            class="page-transition-logo-halo"
                            aria-hidden="true"
                        ></div>


                        <div
                            class="page-transition-logo-ring"
                            aria-hidden="true"
                        ></div>


                        <img
                            src="/images/logo.png"
                            alt="AFC Isiu Youth Portal"
                            class="page-transition-logo"
                        >

                    </div>


                    <div
                        class="page-transition-brand"
                    >
                        AFC ISIU
                    </div>


                    <div
                        class="page-transition-subtitle"
                    >
                        YOUTH PORTAL
                    </div>


                    <div
                        class="page-transition-progress"
                        aria-hidden="true"
                    >
                        <span></span>
                    </div>


                    <div
                        class="page-transition-status"
                        aria-live="polite"
                    >
                        Loading
                    </div>

                </div>

            `;


            document.body.appendChild(
                loader
            );


            return loader;

        }


        /* =====================================================
           SET STATUS
        ===================================================== */

        function setStatus(
            message
        ) {

            if (!loader) {

                return;

            }


            const status =
                loader.querySelector(
                    ".page-transition-status"
                );


            if (!status) {

                return;

            }


            status.textContent =
                message ||
                "Loading";

        }


        /* =====================================================
           CLEAR TIMERS
        ===================================================== */

        function clearTimers() {

            if (minimumTimer) {

                clearTimeout(
                    minimumTimer
                );

                minimumTimer =
                    null;

            }


            if (safetyTimer) {

                clearTimeout(
                    safetyTimer
                );

                safetyTimer =
                    null;

            }


            if (hideTimer) {

                clearTimeout(
                    hideTimer
                );

                hideTimer =
                    null;

            }

        }


        /* =====================================================
           SHOW LOADER
        ===================================================== */

        function showPageLoader(
            message
        ) {

            loader =
                loader ||
                createLoader();


            if (!loader) {

                return;

            }


            clearTimers();


            /*
             * If the loader was already visible,
             * do not restart its timing unnecessarily.
             */
            const alreadyVisible =
                loader.classList.contains(
                    "is-visible"
                );


            if (!alreadyVisible) {

                shownAt =
                    Date.now();

            }


            loader.classList.remove(
                "is-leaving"
            );


            /*
             * Force a browser layout read before
             * applying the visible state.
             *
             * This helps the CSS transition reliably
             * trigger even when navigation is immediate.
             */
            void loader.offsetWidth;


            loader.classList.add(
                "is-visible"
            );


            loader.setAttribute(
                "aria-hidden",
                "false"
            );


            setStatus(
                message ||
                "Loading"
            );


            /*
             * Safety timeout.
             *
             * Even if a page has a JavaScript error,
             * the user must not be trapped behind
             * the loader forever.
             */
            safetyTimer =
                setTimeout(
                    function () {

                        hidePageLoader(
                            true
                        );

                    },
                    AFC_MAIN_CONFIG.PAGE_LOADER_MAX_TIME
                );

        }


        /* =====================================================
           HIDE LOADER
        ===================================================== */

        function hidePageLoader(
            force
        ) {

            if (!loader) {

                return;

            }


            if (
                !loader.classList.contains(
                    "is-visible"
                )
            ) {

                return;

            }


            /*
             * Force mode bypasses the minimum display
             * time. Used only for the safety timeout.
             */
            if (!force) {

                const elapsed =
                    Date.now() -
                    shownAt;


                const remaining =
                    Math.max(
                        0,
                        AFC_MAIN_CONFIG.PAGE_LOADER_MIN_TIME -
                        elapsed
                    );


                if (remaining > 0) {

                    minimumTimer =
                        setTimeout(
                            function () {

                                hidePageLoader(
                                    false
                                );

                            },
                            remaining
                        );

                    return;

                }

            }


            clearTimers();


            loader.classList.remove(
                "is-visible"
            );


            loader.classList.add(
                "is-leaving"
            );


            loader.setAttribute(
                "aria-hidden",
                "true"
            );


            hideTimer =
                setTimeout(
                    function () {

                        if (!loader) {

                            return;

                        }


                        loader.classList.remove(
                            "is-leaving"
                        );


                        /*
                         * Keep the element in the DOM.
                         *
                         * This means subsequent navigations
                         * do not need to create another element.
                         */

                    },
                    AFC_MAIN_CONFIG.PAGE_LOADER_EXIT_TIME
                );

        }


        /* =====================================================
           SHOULD THIS LINK USE THE LOADER?
        ===================================================== */

        function shouldUseLoader(
            link
        ) {

            if (!link) {

                return false;

            }


            /*
             * Only normal anchor navigation.
             */
            if (
                link.tagName
                    .toLowerCase() !==
                "a"
            ) {

                return false;

            }


            /*
             * Respect disabled navigation.
             */
            if (
                link.hasAttribute(
                    "disabled"
                )
            ) {

                return false;

            }


            /*
             * Explicit opt-out.
             */
            if (
                link.hasAttribute(
                    "data-no-page-loader"
                )
            ) {

                return false;

            }


            /*
             * Downloads should not show the loader.
             */
            if (
                link.hasAttribute(
                    "download"
                )
            ) {

                return false;

            }


            /*
             * Do not intercept target=_blank etc.
             */
            const target =
                (
                    link.getAttribute(
                        "target"
                    ) ||
                    ""
                ).toLowerCase();


            if (
                target &&
                target !== "_self"
            ) {

                return false;

            }


            const href =
                link.getAttribute(
                    "href"
                );


            if (
                !href ||
                href === "#"
            ) {

                return false;

            }


            /*
             * Non-page links.
             */
            if (
                href.startsWith(
                    "#"
                ) ||
                href.startsWith(
                    "mailto:"
                ) ||
                href.startsWith(
                    "tel:"
                ) ||
                href.startsWith(
                    "javascript:"
                )
            ) {

                return false;

            }


            /*
             * Online-only links are handled separately.
             * We still allow the normal navigation loader
             * when online.
             */
            if (
                !navigator.onLine &&
                link.hasAttribute(
                    "data-online-only"
                )
            ) {

                return false;

            }


            let url;

            try {

                url =
                    new URL(
                        href,
                        window.location.href
                    );

            } catch (
                error
            ) {

                return false;

            }


            /*
             * External links do not use the portal loader.
             */
            if (
                url.origin !==
                window.location.origin
            ) {

                return false;

            }


            /*
             * Same document hash navigation.
             */
            if (
                url.pathname ===
                    window.location.pathname &&
                url.search ===
                    window.location.search &&
                url.hash
            ) {

                return false;

            }


            /*
             * Same exact URL.
             */
            if (
                url.href ===
                window.location.href
            ) {

                return false;

            }


            return true;

        }


        /* =====================================================
           INITIAL PAGE LOADER
        ===================================================== */

        function startInitialLoader() {

            loader =
                loader ||
                createLoader();


            if (!loader) {

                return;

            }


            /*
             * The initial loader should be visible while
             * the document is actually becoming usable.
             */
            showPageLoader(
                "Loading"
            );


            /*
             * DOMContentLoaded alone is too early for a
             * branded page transition because external
             * fonts, images and other resources may still
             * be loading.
             *
             * Therefore we intentionally wait for window.load.
             */
            window.addEventListener(
                "load",
                function () {

                    initialLoadComplete =
                        true;


                    hidePageLoader();

                },
                {
                    once: true
                }
            );


            /*
             * Safety fallback in case window.load is
             * delayed indefinitely.
             */
            setTimeout(
                function () {

                    if (
                        !initialLoadComplete
                    ) {

                        initialLoadComplete =
                            true;

                        hidePageLoader();

                    }

                },
                AFC_MAIN_CONFIG.PAGE_LOADER_MAX_TIME
            );

        }


        /* =====================================================
           NAVIGATION HANDLER
        ===================================================== */

        function bindNavigationLoader() {

            document.addEventListener(
                "click",
                function (event) {

                    /*
                     * Modifier-clicks open tabs/windows
                     * and should not be intercepted.
                     */
                    if (
                        event.defaultPrevented ||
                        event.button !== 0 ||
                        event.metaKey ||
                        event.ctrlKey ||
                        event.shiftKey ||
                        event.altKey
                    ) {

                        return;

                    }


                    const link =
                        event.target.closest(
                            "a"
                        );


                    if (
                        !link
                    ) {

                        return;

                    }


                    if (
                        !shouldUseLoader(
                            link
                        )
                    ) {

                        return;

                    }


                    /*
                     * Show the loader immediately.
                     *
                     * Capture phase means this happens before
                     * most bubbling click handlers and before
                     * browser navigation begins.
                     */
                    showPageLoader(
                        "Opening"
                    );


                    /*
                     * If another script prevents navigation,
                     * remove the loader.
                     */
                    setTimeout(
                        function () {

                            if (
                                event.defaultPrevented
                            ) {

                                hidePageLoader(
                                    true
                                );

                            }

                        },
                        80
                    );

                },
                true
            );

        }


        /* =====================================================
           PAGE LIFECYCLE
        ===================================================== */

        function bindPageLifecycle() {

            /*
             * pageshow fires for normal page loads and
             * bfcache restoration.
             */
            window.addEventListener(
                "pageshow",
                function (event) {

                    if (
                        event.persisted
                    ) {

                        hidePageLoader(
                            true
                        );

                    }

                }
            );


            /*
             * If a page is restored from browser history,
             * make sure no stale loader remains.
             */
            window.addEventListener(
                "pagehide",
                function () {

                    /*
                     * Do not hide the loader here.
                     *
                     * The loader is intentionally allowed
                     * to cover the current page while the
                     * browser moves to the next document.
                     */

                }
            );

        }


        /* =====================================================
           PUBLIC API
        ===================================================== */

        function initialise() {

            if (
                initialized
            ) {

                return;

            }


            initialized =
                true;


            if (
                document.body
            ) {

                createLoader();

                startInitialLoader();

            } else {

                onDOMReady(
                    function () {

                        createLoader();

                        startInitialLoader();

                    }
                );

            }


            bindNavigationLoader();

            bindPageLifecycle();

        }


        /*
         * Public API.
         */
        window.AFCPageLoader = {

            show:
                showPageLoader,

            hide:
                hidePageLoader

        };


        /*
         * Backwards-compatible API.
         *
         * lessons.js already uses AFC_Loader.
         */
        window.AFC_Loader = {

            show:
                showPageLoader,

            hide:
                hidePageLoader

        };


        initialise();

    })();


    /* =========================================================
       AOS
    ========================================================= */

    function initializeAOS() {

        if (
            typeof window.AOS !==
            "undefined" &&
            typeof window.AOS.init ===
            "function"
        ) {

            try {

                window.AOS.init({

                    duration:
                        650,

                    easing:
                        "ease-out-cubic",

                    once:
                        true,

                    offset:
                        20,

                    disable:
                        function () {

                            return window.matchMedia(
                                "(prefers-reduced-motion: reduce)"
                            ).matches;

                        }

                });

            } catch (
                error
            ) {

                console.warn(
                    "AFC Portal: AOS initialization failed.",
                    error
                );

            }

        }

    }


    /* =========================================================
       OFFLINE BANNER
    ========================================================= */

    function initializeOfflineBanner() {

        let banner =
            document.getElementById(
                AFC_MAIN_CONFIG.OFFLINE_BANNER_ID
            );


        /*
         * Create the banner if the current page
         * does not already contain one.
         */
        if (
            !banner &&
            document.body
        ) {

            banner =
                document.createElement(
                    "div"
                );


            banner.id =
                AFC_MAIN_CONFIG.OFFLINE_BANNER_ID;


            banner.className =
                "offline-banner";


            banner.setAttribute(
                "role",
                "status"
            );


            banner.setAttribute(
                "aria-live",
                "polite"
            );


            banner.innerHTML = `

                <span
                    class="offline-banner-dot"
                    aria-hidden="true"
                ></span>

                <span
                    id="${AFC_MAIN_CONFIG.OFFLINE_MESSAGE_ID}"
                >
                    You are currently offline.
                </span>

            `;


            document.body.appendChild(
                banner
            );

        }


        function updateOfflineState() {

            if (!banner) {

                return;

            }


            const message =
                document.getElementById(
                    AFC_MAIN_CONFIG.OFFLINE_MESSAGE_ID
                );


            if (
                navigator.onLine
            ) {

                banner.classList.remove(
                    "show"
                );


                if (message) {

                    message.textContent =
                        "Back online.";

                }

            } else {

                banner.classList.add(
                    "show"
                );


                if (message) {

                    message.textContent =
                        "You are offline. Some features may be unavailable.";

                }

            }

        }


        window.addEventListener(
            "online",
            updateOfflineState
        );


        window.addEventListener(
            "offline",
            updateOfflineState
        );


        updateOfflineState();

    }


    /* =========================================================
       OFFLINE MESSAGE
    ========================================================= */

    function showOfflineMessage(
        featureName
    ) {

        const name =
            featureName ||
            "This feature";


        /*
         * Use a native alert only as a fallback.
         * This keeps the global system dependency-free.
         */
        alert(
            name +
            " requires an internet connection. Please reconnect and try again."
        );

    }


    /* =========================================================
       ONLINE-ONLY FEATURES
    ========================================================= */

    function initializeOnlineOnlyFeatures() {

        document.addEventListener(
            "click",
            function (event) {

                const element =
                    event.target.closest(
                        "[data-online-only]"
                    );


                if (!element) {

                    return;

                }


                if (
                    navigator.onLine
                ) {

                    return;

                }


                event.preventDefault();


                const feature =
                    element.getAttribute(
                        "data-feature"
                    ) ||
                    "This feature";


                showOfflineMessage(
                    feature
                );

            }
        );

    }


    /* =========================================================
       ESCAPE HTML
    ========================================================= */

    function escapeHTML(
        value
    ) {

        return String(
            value ??
            ""
        )
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


    window.AFC_escapeHTML =
        escapeHTML;


    /* =========================================================
       SIDEBAR / MOBILE NAVIGATION
    ========================================================= */

    function initializeNavigation() {

        const sidebar =
            document.getElementById(
                "sidebar"
            );


        const overlay =
            document.getElementById(
                "sidebarOverlay"
            );


        const mobileMenuBtn =
            document.getElementById(
                "mobileMenuBtn"
            );


        const hubButton =
            document.getElementById(
                "hubButton"
            );


        if (
            !sidebar
        ) {

            return;

        }


        function openSidebar() {

            sidebar.classList.add(
                "show"
            );


            if (overlay) {

                overlay.classList.add(
                    "show"
                );

            }


            document.body.classList.add(
                "sidebar-open"
            );


            document.body.style.overflow =
                "hidden";


            if (mobileMenuBtn) {

                mobileMenuBtn.setAttribute(
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


            if (overlay) {

                overlay.classList.remove(
                    "show"
                );

            }


            document.body.classList.remove(
                "sidebar-open"
            );


            document.body.style.overflow =
                "";


            if (mobileMenuBtn) {

                mobileMenuBtn.setAttribute(
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


        function toggleSidebar() {

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


        if (
            mobileMenuBtn
        ) {

            mobileMenuBtn.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    toggleSidebar();

                }
            );

        }


        /*
         * The centre bottom-nav button opens the sidebar.
         *
         * It does NOT control PWA installation.
         */
        if (
            hubButton
        ) {

            hubButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    toggleSidebar();

                }
            );

        }


        if (
            overlay
        ) {

            overlay.addEventListener(
                "click",
                closeSidebar
            );

        }


        /*
         * Close mobile navigation after selecting a link.
         */
        sidebar.addEventListener(
            "click",
            function (event) {

                const link =
                    event.target.closest(
                        "a"
                    );


                if (!link) {

                    return;

                }


                if (
                    window.innerWidth <=
                    AFC_MAIN_CONFIG.MOBILE_BREAKPOINT
                ) {

                    closeSidebar();

                }

            }
        );


        /*
         * Escape closes mobile navigation.
         */
        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key ===
                    "Escape"
                ) {

                    closeSidebar();

                }

            }
        );


        /*
         * Desktop should never retain the mobile
         * sidebar-open body lock.
         */
        window.addEventListener(
            "resize",
            function () {

                if (
                    window.innerWidth >
                    AFC_MAIN_CONFIG.MOBILE_BREAKPOINT
                ) {

                    closeSidebar();

                }

            }
        );

    }


    /* =========================================================
       THEME SYSTEM
    ========================================================= */

    function initializeTheme() {

        const root =
            document.documentElement;


        const themeBtn =
            document.getElementById(
                "themeBtn"
            );


        function getStoredTheme() {

            try {

                return localStorage.getItem(
                    AFC_MAIN_CONFIG.THEME_STORAGE_KEY
                );

            } catch (
                error
            ) {

                return null;

            }

        }


        function getSystemTheme() {

            if (
                window.matchMedia &&
                window.matchMedia(
                    "(prefers-color-scheme: dark)"
                ).matches
            ) {

                return "dark";

            }


            return "light";

        }


        function updateThemeIcon(
            theme
        ) {

            if (
                !themeBtn
            ) {

                return;

            }


            const icon =
                themeBtn.querySelector(
                    "i"
                );


            if (!icon) {

                return;

            }


            if (
                theme ===
                "dark"
            ) {

                icon.className =
                    "fa-solid fa-sun";

                themeBtn.setAttribute(
                    "aria-label",
                    "Switch to light theme"
                );

                themeBtn.setAttribute(
                    "title",
                    "Switch to light theme"
                );

            } else {

                icon.className =
                    "fa-solid fa-moon";

                themeBtn.setAttribute(
                    "aria-label",
                    "Switch to dark theme"
                );

                themeBtn.setAttribute(
                    "title",
                    "Switch to dark theme"
                );

            }

        }


        function applyTheme(
            theme,
            save
        ) {

            const validTheme =
                theme === "dark"
                    ? "dark"
                    : "light";


            root.setAttribute(
                "data-theme",
                validTheme
            );


            root.style.colorScheme =
                validTheme;


            updateThemeIcon(
                validTheme
            );


            if (
                save
            ) {

                try {

                    localStorage.setItem(
                        AFC_MAIN_CONFIG.THEME_STORAGE_KEY,
                        validTheme
                    );

                } catch (
                    error
                ) {

                    console.warn(
                        "AFC Portal: Unable to save theme preference.",
                        error
                    );

                }

            }

        }


        const storedTheme =
            getStoredTheme();


        /*
         * If the user has selected a theme before,
         * respect that selection.
         *
         * Otherwise follow the system.
         */
        applyTheme(
            storedTheme ||
            getSystemTheme(),
            false
        );


        if (
            themeBtn
        ) {

            themeBtn.addEventListener(
                "click",
                function () {

                    const current =
                        root.getAttribute(
                            "data-theme"
                        ) ||
                        "light";


                    applyTheme(
                        current === "dark"
                            ? "light"
                            : "dark",
                        true
                    );

                }
            );

        }


        /*
         * Only follow system changes when the user
         * has NOT explicitly chosen a theme.
         */
        if (
            window.matchMedia
        ) {

            const media =
                window.matchMedia(
                    "(prefers-color-scheme: dark)"
                );


            const handleSystemChange =
                function () {

                    const stored =
                        getStoredTheme();


                    if (
                        stored
                    ) {

                        return;

                    }


                    applyTheme(
                        media.matches
                            ? "dark"
                            : "light",
                        false
                    );

                };


            if (
                typeof media.addEventListener ===
                "function"
            ) {

                media.addEventListener(
                    "change",
                    handleSystemChange
                );

            } else if (
                typeof media.addListener ===
                "function"
            ) {

                media.addListener(
                    handleSystemChange
                );

            }

        }

    }


    /* =========================================================
       DASHBOARD GREETING
    ========================================================= */

    function initializeGreeting() {

        const greeting =
            document.getElementById(
                "greeting"
            );


        if (!greeting) {

            return;

        }


        const hour =
            new Date().getHours();


        let message;


        if (
            hour < 12
        ) {

            message =
                "Good morning";

        } else if (
            hour < 17
        ) {

            message =
                "Good afternoon";

        } else {

            message =
                "Good evening";

        }


        greeting.textContent =
            message;

    }


    /* =========================================================
       BUTTON SAFETY
    ========================================================= */

    function initializeButtonSafety() {

        document
            .querySelectorAll(
                "button:not([type])"
            )
            .forEach(
                function (button) {

                    button.type =
                        "button";

                }
            );

    }


    /* =========================================================
       GLOBAL ERROR HANDLING
    ========================================================= */

    function initializeErrorHandling() {

        window.addEventListener(
            "error",
            function (event) {

                console.error(
                    "AFC Portal global error:",
                    event.error ||
                    event.message
                );

            }
        );


        window.addEventListener(
            "unhandledrejection",
            function (event) {

                console.error(
                    "AFC Portal unhandled promise rejection:",
                    event.reason
                );

            }
        );

    }


    /* =========================================================
       INITIALIZE GLOBAL SYSTEMS
    ========================================================= */

    onDOMReady(
        function () {

            initializeAOS();

            initializeOfflineBanner();

            initializeOnlineOnlyFeatures();

            initializeNavigation();

            initializeTheme();

            initializeGreeting();

            initializeButtonSafety();

            initializeErrorHandling();


            console.log(
                "AFC Isiu Youth Portal main.js loaded.",
                "Version:",
                AFC_MAIN_CONFIG.VERSION
            );

        }
    );


})();
