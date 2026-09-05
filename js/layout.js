/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: layout.js
   PURPOSE: SHARED LAYOUT LOADER
   VERSION: 2.5

   RESPONSIBILITY:
   - Load shared HTML components
   - Set active navigation item
   - Notify main.js when layout is ready

   IMPORTANT:
   - NO sidebar behavior here
   - NO notification behavior here
   - NO theme behavior here
   - NO scroll locking here
   - NO push subscription logic here

   main.js owns all UI behavior.
   ============================================================ */

(function () {

    "use strict";


    /* ========================================================
       CONFIGURATION
       ======================================================== */

    const COMPONENTS = {
        sidebar: "/components/sidebar.html",
        topbar: "/components/topbar.html",
        notification: "/components/notification.html",
        bottomNav: "/components/bottom-nav.html"
    };


    /* ========================================================
       DOM HELPER
       ======================================================== */

    function $(selector) {
        return document.querySelector(selector);
    }


    /* ========================================================
       LOAD COMPONENT
       ======================================================== */

    async function loadComponent(url) {

        const response = await fetch(url, {
            method: "GET",
            cache: "no-cache",
            credentials: "same-origin"
        });

        if (!response.ok) {
            throw new Error(
                `Failed to load component: ${url} (${response.status})`
            );
        }

        return response.text();
    }


    /* ========================================================
       INJECT COMPONENT
       ======================================================== */

    async function injectComponent(container, url) {

        const element = $(container);

        if (!element) {
            console.warn(
                `[AFC Layout] Container not found: ${container}`
            );
            return false;
        }

        try {

            const html = await loadComponent(url);

            element.innerHTML = html;

            return true;

        } catch (error) {

            console.error(
                `[AFC Layout] Could not load ${url}`,
                error
            );

            element.innerHTML = "";

            return false;
        }
    }


    /* ========================================================
       GET CURRENT ROUTE
       ======================================================== */

    function getCurrentRoute() {

        let path = window.location.pathname || "/";

        /*
         * Convert index.html to /
         */
        if (
            path === "/index.html" ||
            path === "index.html"
        ) {
            path = "/";
        }

        /*
         * Remove .html from routes
         */
        if (path.endsWith(".html")) {
            path = path.slice(0, -5);
        }

        /*
         * Normalize trailing slash.
         */
        if (
            path.length > 1 &&
            path.endsWith("/")
        ) {
            path = path.slice(0, -1);
        }

        return path || "/";
    }


    /* ========================================================
       SET ACTIVE NAVIGATION
       ======================================================== */

    function setActiveNavigation() {

        const currentRoute = getCurrentRoute();

        const navigationItems =
            document.querySelectorAll("[data-route]");

        navigationItems.forEach(function (item) {

            const route = item.getAttribute("data-route");

            if (!route) {
                return;
            }

            let normalizedRoute = route;

            if (
                normalizedRoute !== "/" &&
                normalizedRoute.endsWith("/")
            ) {
                normalizedRoute =
                    normalizedRoute.slice(0, -1);
            }

            if (
                normalizedRoute === "/index.html"
            ) {
                normalizedRoute = "/";
            }

            if (
                normalizedRoute.endsWith(".html")
            ) {
                normalizedRoute =
                    normalizedRoute.slice(0, -5);
            }

            const isActive =
                normalizedRoute === currentRoute;

            item.classList.toggle(
                "active",
                isActive
            );

            if (isActive) {

                item.setAttribute(
                    "aria-current",
                    "page"
                );

            } else {

                item.removeAttribute(
                    "aria-current"
                );
            }
        });
    }


    /* ========================================================
       DISPATCH LAYOUT READY EVENT
       ======================================================== */

    function dispatchLayoutReady() {

        /*
         * Mark the layout as ready as well as dispatching
         * the event. This gives other scripts a reliable
         * way to know that the shared shell exists.
         */

        window.AFC_LAYOUT_READY = true;

        document.dispatchEvent(
            new CustomEvent("afc:layout-ready")
        );

        console.log(
            "[AFC Layout] Shared layout ready."
        );
    }


    /* ========================================================
       INITIALIZE LAYOUT
       ======================================================== */

    async function initializeLayout() {

        console.log(
            "[AFC Layout] Loading shared components..."
        );

        const results = await Promise.all([
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
         * Notification panel is intentionally loaded
         * after the topbar because the topbar contains
         * #notificationPanelContainer.
         */

        const notificationLoaded =
            await injectComponent(
                "#notificationPanelContainer",
                COMPONENTS.notification
            );


        /*
         * Update active navigation only after all
         * shared navigation components exist.
         */

        setActiveNavigation();


        /*
         * Report any failed component loads.
         */

        if (
            results.includes(false) ||
            notificationLoaded === false
        ) {

            console.warn(
                "[AFC Layout] One or more shared components failed to load."
            );
        }


        /*
         * Give main.js control from this point onward.
         */

        dispatchLayoutReady();
    }


    /* ========================================================
       START
       ======================================================== */

    function start() {

        initializeLayout()
            .catch(function (error) {

                console.error(
                    "[AFC Layout] Fatal layout initialization error:",
                    error
                );

                /*
                 * Even if something goes wrong, notify the
                 * application that layout initialization
                 * has finished attempting to run.
                 */

                window.AFC_LAYOUT_READY = true;

                document.dispatchEvent(
                    new CustomEvent("afc:layout-ready")
                );
            });
    }


    /* ========================================================
       DOM READY
       ======================================================== */

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            start,
            {
                once: true
            }
        );

    } else {

        start();
    }


})();
