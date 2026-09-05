/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: layout.js

   PURPOSE:
   Shared portal shell loader.

   LOADS:
   - Sidebar
   - Topbar
   - Notification panel
   - Mobile bottom navigation

   ALSO HANDLES:
   - Active navigation
   - Mobile sidebar
   - Hub button
   - Notification panel
   - Theme button
   - Online-only navigation
============================================================ */

(function () {

    "use strict";


    /* =========================================================
       CONFIG
    ========================================================= */

    const COMPONENTS = {

        sidebar:
            "/components/sidebar.html",

        topbar:
            "/components/topbar.html",

        notification:
            "/components/notification.html",

        bottomNav:
            "/components/bottom-nav.html"

    };


    /* =========================================================
       HELPERS
    ========================================================= */

    function $(id) {

        return document.getElementById(id);

    }


    async function loadComponent(url) {

        const response =
            await fetch(url, {
                cache: "no-cache"
            });

        if (!response.ok) {

            throw new Error(
                `Unable to load component: ${url}`
            );

        }

        return response.text();

    }


    async function injectComponent(
        selector,
        url
    ) {

        const element =
            document.querySelector(selector);

        if (!element) {

            return;

        }

        element.innerHTML =
            await loadComponent(url);

    }


    /* =========================================================
       DETERMINE CURRENT ROUTE
    ========================================================= */

    function getCurrentRoute() {

        let path =
            window.location.pathname;

        path =
            path.replace(
                /\/index\.html$/,
                "/"
            );

        path =
            path.replace(
                /\.html$/,
                ""
            );

        if (
            path.length > 1 &&
            path.endsWith("/")
        ) {

            path =
                path.slice(
                    0,
                    -1
                );

        }

        return path || "/";

    }


    /* =========================================================
       ACTIVE NAVIGATION
    ========================================================= */

    function setActiveNavigation() {

        const currentRoute =
            getCurrentRoute();


        document
            .querySelectorAll(
                "[data-route]"
            )
            .forEach(
                link => {

                    const route =
                        link.dataset.route;


                    link.classList.remove(
                        "active"
                    );


                    if (
                        route === currentRoute
                    ) {

                        link.classList.add(
                            "active"
                        );

                    }

                }
            );

    }


    /* =========================================================
       SIDEBAR
    ========================================================= */

    function initializeSidebar() {

        const sidebar =
            $("sidebar");

        const overlay =
            $("sidebarOverlay");

        const menuButton =
            $("mobileMenuBtn");

        const hubButton =
            $("hubButton");


        if (
            !sidebar ||
            !overlay
        ) {

            return;

        }


        function openSidebar() {

            sidebar.classList.add(
                "show"
            );

            overlay.classList.add(
                "show"
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
                openSidebar
            );

        }


        if (hubButton) {

            hubButton.addEventListener(
                "click",
                openSidebar
            );

        }


        overlay.addEventListener(
            "click",
            closeSidebar
        );


        sidebar
            .querySelectorAll("a")
            .forEach(
                link => {

                    link.addEventListener(
                        "click",
                        () => {

                            if (
                                window.innerWidth <= 768
                            ) {

                                closeSidebar();

                            }

                        }
                    );

                }
            );


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape"
                ) {

                    closeSidebar();

                }

            }
        );


        window.addEventListener(
            "resize",
            () => {

                if (
                    window.innerWidth > 768
                ) {

                    closeSidebar();

                }

            }
        );

    }


    /* =========================================================
       NOTIFICATIONS
    ========================================================= */

    function initializeNotifications() {

        const button =
            $("notificationBtn");

        const panel =
            $("notificationPanel");

        const closeButton =
            $("notificationPanelClose");

        const enableButton =
            $("enableNotificationsBtn");

        const disableButton =
            $("disableNotificationsBtn");

        const statusText =
            $("notificationStatusText");

        const icon =
            $("notificationIcon");

        const dot =
            $("notifyDot");


        if (!button || !panel) {

            return;

        }


        function openPanel() {

            panel.classList.add(
                "show"
            );

            panel.setAttribute(
                "aria-hidden",
                "false"
            );

            button.setAttribute(
                "aria-expanded",
                "true"
            );

        }


        function closePanel() {

            panel.classList.remove(
                "show"
            );

            panel.setAttribute(
                "aria-hidden",
                "true"
            );

            button.setAttribute(
                "aria-expanded",
                "false"
            );

        }


        function setStatus(
            message,
            enabled
        ) {

            if (statusText) {

                statusText.textContent =
                    message;

            }


            if (icon) {

                icon.className =
                    enabled
                        ? "fa-solid fa-bell"
                        : "fa-regular fa-bell";

            }


            if (dot) {

                dot.classList.toggle(
                    "active",
                    Boolean(enabled)
                );

            }

        }


        button.addEventListener(
            "click",
            event => {

                event.stopPropagation();

                if (
                    panel.classList.contains(
                        "show"
                    )
                ) {

                    closePanel();

                } else {

                    openPanel();

                }

            }
        );


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                closePanel
            );

        }


        document.addEventListener(
            "click",
            event => {

                const wrapper =
                    $("notificationWrapper");

                if (
                    wrapper &&
                    !wrapper.contains(event.target)
                ) {

                    closePanel();

                }

            }
        );


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape"
                ) {

                    closePanel();

                }

            }
        );


        /* -------------------------------------------------------
           ENABLE
        ------------------------------------------------------- */

        if (enableButton) {

            enableButton.addEventListener(
                "click",
                async () => {

                    if (
                        !window.AFC_PWA ||
                        typeof window.AFC_PWA.subscribeToPush !==
                        "function"
                    ) {

                        setStatus(
                            "Notification service is not available yet.",
                            false
                        );

                        return;

                    }


                    enableButton.disabled =
                        true;


                    try {

                        const result =
                            await window.AFC_PWA
                                .subscribeToPush();


                        if (
                            result &&
                            result.success
                        ) {

                            setStatus(
                                "Notifications are enabled on this device.",
                                true
                            );

                        } else {

                            setStatus(
                                result?.message ||
                                "Unable to enable notifications.",
                                false
                            );

                        }

                    }
                    catch (error) {

                        console.error(
                            "Notification enable error:",
                            error
                        );


                        setStatus(
                            "Unable to enable notifications.",
                            false
                        );

                    }
                    finally {

                        enableButton.disabled =
                            false;

                    }

                }
            );

        }


        /* -------------------------------------------------------
           DISABLE
        ------------------------------------------------------- */

        if (disableButton) {

            disableButton.addEventListener(
                "click",
                async () => {

                    if (
                        !window.AFC_PWA ||
                        typeof window.AFC_PWA.unsubscribeFromPush !==
                        "function"
                    ) {

                        setStatus(
                            "Notification service is not available yet.",
                            true
                        );

                        return;

                    }


                    disableButton.disabled =
                        true;


                    try {

                        const result =
                            await window.AFC_PWA
                                .unsubscribeFromPush();


                        if (
                            result &&
                            result.success
                        ) {

                            setStatus(
                                "Notifications have been disabled.",
                                false
                            );

                        } else {

                            setStatus(
                                result?.message ||
                                "Unable to disable notifications.",
                                true
                            );

                        }

                    }
                    catch (error) {

                        console.error(
                            "Notification disable error:",
                            error
                        );


                        setStatus(
                            "Unable to disable notifications.",
                            true
                        );

                    }
                    finally {

                        disableButton.disabled =
                            false;

                    }

                }
            );

        }


        /* -------------------------------------------------------
           INITIAL STATE
        ------------------------------------------------------- */

        if (
            "Notification" in window
        ) {

            if (
                Notification.permission ===
                "granted"
            ) {

                setStatus(
                    "Notifications are enabled on this device.",
                    true
                );

            }
            else {

                setStatus(
                    "Notifications are currently disabled.",
                    false
                );

            }

        }

    }


    /* =========================================================
       THEME
    ========================================================= */

    function initializeTheme() {

        const button =
            $("themeBtn");

        const icon =
            $("themeIcon");


        if (!button) {

            return;

        }


        function applyTheme(
            theme
        ) {

            document.documentElement
                .setAttribute(
                    "data-theme",
                    theme
                );


            localStorage.setItem(
                "afcTheme",
                theme
            );


            if (icon) {

                icon.className =
                    theme === "dark"
                        ? "fa-solid fa-sun"
                        : "fa-solid fa-moon";

            }

        }


        let savedTheme =
            localStorage.getItem(
                "afcTheme"
            );


        if (
            savedTheme !== "dark" &&
            savedTheme !== "light"
        ) {

            savedTheme =
                window.matchMedia(
                    "(prefers-color-scheme: dark)"
                ).matches
                    ? "dark"
                    : "light";

        }


        applyTheme(
            savedTheme
        );


        button.addEventListener(
            "click",
            () => {

                const current =
                    document.documentElement
                        .getAttribute(
                            "data-theme"
                        );


                applyTheme(
                    current === "dark"
                        ? "light"
                        : "dark"
                );

            }
        );

    }


    /* =========================================================
       LOAD EVERYTHING
    ========================================================= */

    async function initializeLayout() {

        try {

            /*
             * The page contains empty placeholders:
             *
             * #app-sidebar
             * #app-topbar
             * #app-bottom-nav
             */

            await Promise.all([

                injectComponent(
                    "#app-sidebar",
                    COMPONENTS.sidebar
                ),

                injectComponent(
                    "#app-topbar",
                    COMPONENTS.topbar
                ),

                injectComponent(
                    "#app-bottom-nav",
                    COMPONENTS.bottomNav
                )

            ]);


            /*
             * Notification is loaded into
             * the topbar notification container.
             */

            await injectComponent(
                "#notificationPanelContainer",
                COMPONENTS.notification
            );


            setActiveNavigation();

            initializeSidebar();

            initializeNotifications();

            initializeTheme();


            /*
             * Tell other portal scripts that
             * the shared shell is ready.
             */

            window.dispatchEvent(
                new CustomEvent(
                    "afc:layout-ready"
                )
            );


            console.log(
                "AFC shared layout loaded successfully."
            );

        }
        catch (error) {

            console.error(
                "AFC layout initialization failed:",
                error
            );

        }

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
            initializeLayout
        );

    }
    else {

        initializeLayout();

    }


})();
