/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: main.js
   PURPOSE: MAIN APPLICATION CONTROLLER
   VERSION: 2.5

   RESPONSIBILITIES:
   - AOS
   - Offline state
   - Sidebar / mobile navigation
   - Mobile hub button
   - Notifications
   - Theme
   - Online-only navigation
   - Dashboard greeting
   - Header safety
   - Global error logging

   IMPORTANT:
   layout.js ONLY loads components.

   main.js owns the behavior of those components.
   ============================================================ */

(function () {

    "use strict";


    /* ========================================================
       CONFIGURATION
       ======================================================== */

    const AFC_MAIN_CONFIG = {

        VERSION: "2.5",

        MOBILE_BREAKPOINT: 768,

        THEME_STORAGE_KEY: "afcTheme",

        MEMBER_STORAGE_KEY:
            "afc_isiu_slc_member_v1",

        SESSION_STORAGE_KEY:
            "afc_isiu_slc_quiz_session_v1",

        OFFLINE_BANNER_ID:
            "afcOfflineBanner"
    };


    /* ========================================================
       STATE
       ======================================================== */

    let applicationInitialized = false;

    let navigationInitialized = false;

    let notificationInitialized = false;

    let themeInitialized = false;

    let onlineLinksInitialized = false;

    let headerSafetyInitialized = false;


    /* ========================================================
       DOM READY HELPER
       ======================================================== */

    function onDOMReady(callback) {

        if (
            document.readyState === "loading"
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


    /* ========================================================
       AOS
       ======================================================== */

    function initializeAOS() {

        if (
            typeof window.AOS === "undefined"
        ) {
            return;
        }

        try {

            window.AOS.init({

                duration: 650,

                easing: "ease-out-cubic",

                once: true,

                offset: 20,

                disable: function () {

                    return window.innerWidth < 480;
                }
            });

        } catch (error) {

            console.warn(
                "[AFC Main] AOS initialization failed:",
                error
            );
        }
    }


/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   OFFLINE CONNECTION STATUS
   ============================================================
 *
 * PURPOSE:
 * - Show a polished offline banner only when the browser
 *   reports that the device has no network connection.
 * - Keep the banner fixed at the very top of the screen.
 * - Create enough space so it never covers the portal header.
 * - Remove the banner immediately when the connection returns.
 *
 * IMPORTANT:
 * - This section does NOT control the sidebar.
 * - This section does NOT control notifications.
 * - This section does NOT control the PWA service worker.
 * - This section does NOT change page content.
 * ============================================================ */

(function initializeOfflineBanner() {

    "use strict";


    /* ========================================================
       CONSTANTS
    ======================================================== */

    const BANNER_ID =
        "afcOfflineBanner";

    const ROOT_VARIABLE =
        "--afc-offline-banner-height";

    const ACTIVE_CLASS =
        "offline-active";


    /* ========================================================
       CREATE BANNER
    ======================================================== */

    function createOfflineBanner() {

        let banner =
            document.getElementById(
                BANNER_ID
            );


        /*
         * Prevent duplicate banners.
         */

        if (banner) {
            return banner;
        }


        banner =
            document.createElement("div");


        banner.id =
            BANNER_ID;


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


        banner.setAttribute(
            "aria-hidden",
            "true"
        );


        banner.innerHTML = `
            <div class="offline-banner-inner">

                <div class="offline-banner-icon">
                    <i
                        class="fa-solid fa-wifi"
                        aria-hidden="true"
                    ></i>
                </div>

                <div class="offline-banner-copy">

                    <strong>
                        You're offline
                    </strong>

                    <span>
                        Some features may be unavailable
                        until you reconnect.
                    </span>

                </div>

            </div>
        `;


        /*
         * Put the banner at the very beginning
         * of the document so it sits above the portal.
         */

        document.body.prepend(
            banner
        );


        return banner;
    }


    /* ========================================================
       UPDATE BANNER HEIGHT
    ======================================================== */

    function updateOfflineBannerHeight(
        banner
    ) {

        if (!banner) {
            return;
        }


        if (
            !banner.classList.contains(
                "show"
            )
        ) {

            document.documentElement.style.setProperty(
                ROOT_VARIABLE,
                "0px"
            );

            return;
        }


        /*
         * Measure the real rendered height.
         *
         * This is important on mobile because the text can
         * wrap differently depending on screen width.
         */

        const height =
            banner.getBoundingClientRect()
                .height;


        document.documentElement.style.setProperty(
            ROOT_VARIABLE,
            `${Math.ceil(height)}px`
        );
    }


    /* ========================================================
       SET OFFLINE STATE
    ======================================================== */

    function setOfflineState(
        isOffline
    ) {

        const banner =
            document.getElementById(
                BANNER_ID
            );


        if (!banner) {
            return;
        }


        if (isOffline) {

            banner.classList.add(
                "show"
            );


            banner.setAttribute(
                "aria-hidden",
                "false"
            );


            document.body.classList.add(
                ACTIVE_CLASS
            );


            /*
             * Wait one frame so the browser has
             * calculated the banner's actual height.
             */

            requestAnimationFrame(
                () => {

                    updateOfflineBannerHeight(
                        banner
                    );

                }
            );

        }

        else {

            banner.classList.remove(
                "show"
            );


            banner.setAttribute(
                "aria-hidden",
                "true"
            );


            document.body.classList.remove(
                ACTIVE_CLASS
            );


            document.documentElement.style.setProperty(
                ROOT_VARIABLE,
                "0px"
            );
        }
    }


    /* ========================================================
       CHECK CONNECTION
    ======================================================== */

    function updateConnectionState() {

        /*
         * navigator.onLine is the browser's current
         * online/offline state.
         */

        const isOffline =
            navigator.onLine === false;


        setOfflineState(
            isOffline
        );
    }


    /* ========================================================
       INITIALIZE
    ======================================================== */

    function initialize() {

        /*
         * Make sure the DOM exists.
         */

        if (!document.body) {
            return;
        }


        createOfflineBanner();


        /*
         * Check immediately.
         */

        updateConnectionState();


        /*
         * Listen for connection changes.
         */

        window.addEventListener(
            "online",
            updateConnectionState
        );


        window.addEventListener(
            "offline",
            updateConnectionState
        );


        /*
         * Recalculate the banner height when
         * the device orientation or viewport changes.
         */

        window.addEventListener(
            "resize",
            () => {

                const banner =
                    document.getElementById(
                        BANNER_ID
                    );


                if (
                    banner &&
                    banner.classList.contains(
                        "show"
                    )
                ) {

                    updateOfflineBannerHeight(
                        banner
                    );
                }
            }
        );


        window.addEventListener(
            "orientationchange",
            () => {

                setTimeout(
                    () => {

                        const banner =
                            document.getElementById(
                                BANNER_ID
                            );


                        if (
                            banner &&
                            banner.classList.contains(
                                "show"
                            )
                        ) {

                            updateOfflineBannerHeight(
                                banner
                            );
                        }

                    },
                    100
                );
            }
        );
    }


    /* ========================================================
       START
    ======================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            {
                once: true
            }
        );

    }

    else {

        initialize();

    }

})(); 


    /* ========================================================
       ESCAPE HTML
       ======================================================== */

    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* ========================================================
       SIDEBAR / NAVIGATION
       ======================================================== */

    function initializeNavigation() {

        if (navigationInitialized) {
            return;
        }

        navigationInitialized = true;


        const sidebar =
            document.getElementById("sidebar");

        const sidebarOverlay =
            document.getElementById("sidebarOverlay");

        const mobileMenuBtn =
            document.getElementById("mobileMenuBtn");

        const hubButton =
            document.getElementById("hubButton");


        if (!sidebar) {

            console.warn(
                "[AFC Main] Sidebar not found."
            );

            return;
        }


        /*
         * The overlay and buttons are optional so that
         * a page can still operate if one is unavailable.
         */


        function isMobile() {

            return (
                window.innerWidth <=
                AFC_MAIN_CONFIG.MOBILE_BREAKPOINT
            );
        }


        function lockPageScroll() {

            /*
             * Use a class rather than directly changing
             * body.style.overflow.

             * This prevents JS from fighting with the
             * site's CSS/layout scrolling rules.
             */

            document.body.classList.add(
                "sidebar-open"
            );
        }


        function unlockPageScroll() {

            document.body.classList.remove(
                "sidebar-open"
            );
        }


        function openSidebar() {

            if (!isMobile()) {
                return;
            }

            sidebar.classList.add("show");

            if (sidebarOverlay) {

                sidebarOverlay.classList.add(
                    "show"
                );
            }

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

            lockPageScroll();
        }


        function closeSidebar() {

            sidebar.classList.remove("show");

            if (sidebarOverlay) {

                sidebarOverlay.classList.remove(
                    "show"
                );
            }

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

            unlockPageScroll();
        }


        function toggleSidebar() {

            if (
                sidebar.classList.contains("show")
            ) {

                closeSidebar();

            } else {

                openSidebar();
            }
        }


        /* ----------------------------------------------------
           INITIAL STATE
           ---------------------------------------------------- */

        closeSidebar();


        /* ----------------------------------------------------
           MOBILE MENU BUTTON
           ---------------------------------------------------- */

        if (mobileMenuBtn) {

            mobileMenuBtn.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    toggleSidebar();
                }
            );
        }


        /* ----------------------------------------------------
           HUB BUTTON
           ---------------------------------------------------- */

        if (hubButton) {

            hubButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    toggleSidebar();
                }
            );
        }


        /* ----------------------------------------------------
           OVERLAY
           ---------------------------------------------------- */

        if (sidebarOverlay) {

            sidebarOverlay.addEventListener(
                "click",
                function () {

                    closeSidebar();
                }
            );
        }


        /* ----------------------------------------------------
           SIDEBAR LINKS
           ---------------------------------------------------- */

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

                /*
                 * Let normal navigation happen.
                 * Only close the mobile drawer first.
                 */

                if (isMobile()) {

                    closeSidebar();
                }
            }
        );


        /* ----------------------------------------------------
           ESCAPE KEY
           ---------------------------------------------------- */

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Escape" ||
                    event.key === "Esc"
                ) {

                    closeSidebar();
                }
            }
        );


        /* ----------------------------------------------------
           RESIZE
           ---------------------------------------------------- */

        let resizeTimer = null;

        window.addEventListener(
            "resize",
            function () {

                clearTimeout(resizeTimer);

                resizeTimer =
                    setTimeout(function () {

                        if (!isMobile()) {

                            closeSidebar();
                        }

                    }, 100);
            }
        );


        /* ----------------------------------------------------
           PAGE SHOW
           ---------------------------------------------------- */

        window.addEventListener(
            "pageshow",
            function () {

                if (!isMobile()) {

                    closeSidebar();
                }
            }
        );


        /*
         * Safety cleanup.
         *
         * If another script previously left the old
         * inline overflow lock behind, remove only that
         * stale value when the page starts.
         */

        document.body.style.removeProperty(
            "overflow"
        );

        document.body.classList.remove(
            "sidebar-open"
        );
    }


    /* ========================================================
       MEMBER DATA
       ======================================================== */

    function getStoredMember() {

        let member = null;


        /*
         * First try the normal localStorage member record.
         */

        try {

            const stored =
                localStorage.getItem(
                    AFC_MAIN_CONFIG.MEMBER_STORAGE_KEY
                );

            if (stored) {

                member = JSON.parse(stored);
            }

        } catch (error) {

            console.warn(
                "[AFC Main] Could not read localStorage member data.",
                error
            );
        }


        /*
         * Fall back to the quiz session if necessary.
         */

        if (!member) {

            try {

                const session =
                    sessionStorage.getItem(
                        AFC_MAIN_CONFIG.SESSION_STORAGE_KEY
                    );

                if (session) {

                    member = JSON.parse(session);
                }

            } catch (error) {

                console.warn(
                    "[AFC Main] Could not read sessionStorage member data.",
                    error
                );
            }
        }


        return member;
    }


    /* ========================================================
       MEMBER ID
       ======================================================== */

    function getMemberId(member) {

        if (!member) {
            return "";
        }

        return String(
            member.memberId ||
            member.memberID ||
            member.id ||
            member.ID ||
            member.MemberID ||
            ""
        ).trim();
    }


    /* ========================================================
       MEMBER NAME
       ======================================================== */

    function getMemberName(member) {

        if (!member) {
            return "";
        }

        return String(
            member.memberName ||
            member.name ||
            member.fullName ||
            member.FullName ||
            member.Name ||
            ""
        ).trim();
    }


    /* ========================================================
       NOTIFICATIONS
       ======================================================== */

    function initializeNotifications() {

        if (notificationInitialized) {
            return;
        }

        notificationInitialized = true;


        const notificationBtn =
            document.getElementById(
                "notificationBtn"
            );

        const notificationPanel =
            document.getElementById(
                "notificationPanel"
            );

        const notificationPanelClose =
            document.getElementById(
                "notificationPanelClose"
            );

        const notificationStatus =
            document.getElementById(
                "notificationStatus"
            );

        const notificationStatusText =
            document.getElementById(
                "notificationStatusText"
            );

        const enableNotificationsBtn =
            document.getElementById(
                "enableNotificationsBtn"
            );

        const disableNotificationsBtn =
            document.getElementById(
                "disableNotificationsBtn"
            );

        const notificationIcon =
            document.getElementById(
                "notificationIcon"
            );

        const notifyDot =
            document.getElementById(
                "notifyDot"
            );


        if (!notificationBtn) {

            console.warn(
                "[AFC Main] Notification button not found."
            );

            return;
        }


        /* ----------------------------------------------------
           PANEL OPEN / CLOSE
           ---------------------------------------------------- */

        function openPanel() {

            if (!notificationPanel) {
                return;
            }

            notificationPanel.classList.add(
                "show"
            );

            notificationPanel.setAttribute(
                "aria-hidden",
                "false"
            );

            notificationBtn.setAttribute(
                "aria-expanded",
                "true"
            );

            updateNotificationState();
        }


        function closePanel() {

            if (!notificationPanel) {
                return;
            }

            notificationPanel.classList.remove(
                "show"
            );

            notificationPanel.setAttribute(
                "aria-hidden",
                "true"
            );

            notificationBtn.setAttribute(
                "aria-expanded",
                "false"
            );
        }


        function togglePanel() {

            if (
                notificationPanel &&
                notificationPanel.classList.contains(
                    "show"
                )
            ) {

                closePanel();

            } else {

                openPanel();
            }
        }


        /* ----------------------------------------------------
           STATUS
           ---------------------------------------------------- */

        function setNotificationStatus(
            type,
            message
        ) {

            if (notificationStatus) {

                notificationStatus.classList.remove(
                    "enabled",
                    "disabled",
                    "blocked",
                    "loading",
                    "error"
                );

                if (type) {

                    notificationStatus.classList.add(
                        type
                    );
                }
            }


            if (notificationStatusText) {

                notificationStatusText.textContent =
                    message;
            }
        }


        /* ----------------------------------------------------
           BELL
           ---------------------------------------------------- */

        function updateBell(
            enabled
        ) {

            if (notificationIcon) {

                notificationIcon.classList.toggle(
                    "fa-regular",
                    !enabled
                );

                notificationIcon.classList.toggle(
                    "fa-solid",
                    enabled
                );
            }


            if (notifyDot) {

                notifyDot.style.display =
                    enabled
                        ? "block"
                        : "none";
            }
        }


        /* ----------------------------------------------------
           BUTTON VISIBILITY
           ---------------------------------------------------- */

        function showEnableButton() {

            if (enableNotificationsBtn) {

                enableNotificationsBtn.hidden =
                    false;
            }

            if (disableNotificationsBtn) {

                disableNotificationsBtn.hidden =
                    true;
            }
        }


        function showDisableButton() {

            if (enableNotificationsBtn) {

                enableNotificationsBtn.hidden =
                    true;
            }

            if (disableNotificationsBtn) {

                disableNotificationsBtn.hidden =
                    false;
            }
        }


        /* ----------------------------------------------------
           SAFE DEFAULT
           ---------------------------------------------------- */

        function setSafeDefault() {

            showEnableButton();

            updateBell(false);

            setNotificationStatus(
                "disabled",
                "Notifications are currently disabled."
            );
        }


        /* ----------------------------------------------------
           UPDATE STATE
           ---------------------------------------------------- */

        async function updateNotificationState() {

            /*
             * Always start from a safe state.
             */

            setSafeDefault();


            const pwa =
                window.AFC_PWA;


            if (!pwa) {

                setNotificationStatus(
                    "disabled",
                    "Notification service is not available on this page."
                );

                return;
            }


            /*
             * Check whether push is supported.
             */

            let supported = false;

            try {

                if (
                    typeof pwa.isPushSupported ===
                    "function"
                ) {

                    supported =
                        pwa.isPushSupported();

                } else {

                    supported = Boolean(
                        pwa.isPushSupported
                    );
                }

            } catch (error) {

                console.warn(
                    "[AFC Main] Could not determine push support.",
                    error
                );

                supported = false;
            }


            if (!supported) {

                setNotificationStatus(
                    "disabled",
                    "Push notifications are not supported on this device or browser."
                );

                updateBell(false);

                return;
            }


            /*
             * Permission state.
             */

            let permission = "default";

            try {

                if (
                    typeof pwa.getPushPermissionState ===
                    "function"
                ) {

                    permission =
                        await pwa.getPushPermissionState();
                }

            } catch (error) {

                console.warn(
                    "[AFC Main] Could not read notification permission.",
                    error
                );

                permission =
                    typeof Notification !== "undefined"
                        ? Notification.permission
                        : "default";
            }


            /*
             * Existing subscription.
             */

            let subscription = null;

            try {

                if (
                    typeof pwa.getPushSubscription ===
                    "function"
                ) {

                    subscription =
                        await pwa.getPushSubscription();
                }

            } catch (error) {

                console.warn(
                    "[AFC Main] Could not read push subscription.",
                    error
                );
            }


            /*
             * Enabled.
             */

            if (
                subscription &&
                permission === "granted"
            ) {

                setNotificationStatus(
                    "enabled",
                    "Notifications are enabled on this device."
                );

                showDisableButton();

                updateBell(true);

                return;
            }


            /*
             * Browser has blocked notifications.
             */

            if (
                permission === "denied"
            ) {

                setNotificationStatus(
                    "blocked",
                    "Notifications are blocked in your browser settings."
                );

                showEnableButton();

                updateBell(false);

                return;
            }


            /*
             * Permission has not been granted yet.
             */

            setNotificationStatus(
                "disabled",
                "Notifications are currently disabled."
            );

            showEnableButton();

            updateBell(false);
        }


        /* ----------------------------------------------------
           ENABLE NOTIFICATIONS
           ---------------------------------------------------- */

        async function enableNotifications() {

            if (!enableNotificationsBtn) {
                return;
            }


            if (
                enableNotificationsBtn.dataset.loading ===
                "true"
            ) {
                return;
            }


            const pwa =
                window.AFC_PWA;


            if (
                !pwa ||
                typeof pwa.subscribeToPush !==
                "function"
            ) {

                setNotificationStatus(
                    "error",
                    "Notification service is not available."
                );

                return;
            }


            const member =
                getStoredMember();

            const memberId =
                getMemberId(member);

            const memberName =
                getMemberName(member);


            /*
             * The current PWA push system expects a member ID.
             */

            if (!memberId) {

                setNotificationStatus(
                    "error",
                    "Please log in or create your youth portal profile before enabling notifications."
                );

                return;
            }


            const originalHTML =
                enableNotificationsBtn.innerHTML;


            try {

                enableNotificationsBtn.dataset.loading =
                    "true";

                enableNotificationsBtn.disabled =
                    true;

                enableNotificationsBtn.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <span>Enabling...</span>
                `;


                setNotificationStatus(
                    "loading",
                    "Enabling notifications..."
                );


                const result =
                    await pwa.subscribeToPush(
                        memberId,
                        memberName
                    );


                if (
                    result &&
                    result.success === false
                ) {

                    throw new Error(
                        result.message ||
                        "Unable to enable notifications."
                    );
                }


                /*
                 * Refresh actual subscription state.
                 */

                await updateNotificationState();


            } catch (error) {

                console.error(
                    "[AFC Main] Enable notifications error:",
                    error
                );


                setNotificationStatus(
                    "error",
                    error.message ||
                    "Unable to enable notifications. Please try again."
                );


                enableNotificationsBtn.innerHTML =
                    originalHTML;

                enableNotificationsBtn.disabled =
                    false;

                showEnableButton();

                updateBell(false);


            } finally {

                enableNotificationsBtn.dataset.loading =
                    "false";

                enableNotificationsBtn.disabled =
                    false;

                /*
                 * Always refresh state after the operation.
                 */

                await updateNotificationState();
            }
        }


        /* ----------------------------------------------------
           DISABLE NOTIFICATIONS
           ---------------------------------------------------- */

        async function disableNotifications() {

            if (!disableNotificationsBtn) {
                return;
            }


            if (
                disableNotificationsBtn.dataset.loading ===
                "true"
            ) {
                return;
            }


            const pwa =
                window.AFC_PWA;


            if (
                !pwa ||
                typeof pwa.unsubscribeFromPush !==
                "function"
            ) {

                setNotificationStatus(
                    "error",
                    "Notification service is not available."
                );

                return;
            }


            const originalHTML =
                disableNotificationsBtn.innerHTML;


            try {

                disableNotificationsBtn.dataset.loading =
                    "true";

                disableNotificationsBtn.disabled =
                    true;

                disableNotificationsBtn.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <span>Disabling...</span>
                `;


                setNotificationStatus(
                    "loading",
                    "Disabling notifications..."
                );


                const result =
                    await pwa.unsubscribeFromPush();


                if (
                    result &&
                    result.success === false
                ) {

                    throw new Error(
                        result.message ||
                        "Unable to disable notifications."
                    );
                }


                await updateNotificationState();


            } catch (error) {

                console.error(
                    "[AFC Main] Disable notifications error:",
                    error
                );


                disableNotificationsBtn.innerHTML =
                    originalHTML;

                disableNotificationsBtn.disabled =
                    false;

                showDisableButton();

                updateBell(true);


                setNotificationStatus(
                    "error",
                    error.message ||
                    "Unable to disable notifications. Please try again."
                );


            } finally {

                disableNotificationsBtn.dataset.loading =
                    "false";

                disableNotificationsBtn.disabled =
                    false;

                await updateNotificationState();
            }
        }


        /* ----------------------------------------------------
           BUTTON EVENTS
           ---------------------------------------------------- */

        notificationBtn.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                event.stopPropagation();

                togglePanel();
            }
        );


        if (notificationPanelClose) {

            notificationPanelClose.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    closePanel();
                }
            );
        }


        if (enableNotificationsBtn) {

            enableNotificationsBtn.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    enableNotifications();
                }
            );
        }


        if (disableNotificationsBtn) {

            disableNotificationsBtn.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    disableNotifications();
                }
            );
        }


        /* ----------------------------------------------------
           OUTSIDE CLICK
           ---------------------------------------------------- */

        document.addEventListener(
            "click",
            function (event) {

                if (!notificationPanel) {
                    return;
                }

                if (
                    !notificationPanel.classList.contains(
                        "show"
                    )
                ) {
                    return;
                }


                const wrapper =
                    document.getElementById(
                        "notificationWrapper"
                    );


                if (
                    wrapper &&
                    !wrapper.contains(event.target)
                ) {

                    closePanel();
                }
            }
        );


        /* ----------------------------------------------------
           ESCAPE
           ---------------------------------------------------- */

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Escape" ||
                    event.key === "Esc"
                ) {

                    closePanel();
                }
            }
        );


        /* ----------------------------------------------------
           INITIAL STATE
           ---------------------------------------------------- */

        if (notificationPanel) {

            notificationPanel.classList.remove(
                "show"
            );

            notificationPanel.setAttribute(
                "aria-hidden",
                "true"
            );
        }

        notificationBtn.setAttribute(
            "aria-expanded",
            "false"
        );


        setSafeDefault();

        /*
         * Do not block the rest of page initialization.
         */

        updateNotificationState()
            .catch(function (error) {

                console.warn(
                    "[AFC Main] Initial notification state check failed:",
                    error
                );
            });
    }


    /* ========================================================
       ONLINE-ONLY LINKS
       ======================================================== */

    function initializeOnlineOnlyLinks() {

        if (onlineLinksInitialized) {
            return;
        }

        onlineLinksInitialized = true;


        const links =
            document.querySelectorAll(
                "[data-online-only]"
            );


        links.forEach(function (link) {

            if (
                link.dataset.onlineHandlerAttached ===
                "true"
            ) {
                return;
            }


            link.dataset.onlineHandlerAttached =
                "true";


            link.addEventListener(
                "click",
                function (event) {

                    if (navigator.onLine) {
                        return;
                    }


                    event.preventDefault();

                    const feature =
                        link.dataset.feature ||
                        "This feature";


                    showOfflineMessage(
                        `${feature} requires an internet connection.`
                    );
                }
            );
        });
    }


    /* ========================================================
       OFFLINE MESSAGE
       ======================================================== */

    function showOfflineMessage(
        message
    ) {

        const existing =
            document.getElementById(
                "afcOfflineMessage"
            );


        if (existing) {

            existing.remove();
        }


        const element =
            document.createElement("div");


        element.id =
            "afcOfflineMessage";

        element.className =
            "offline-toast";

        element.setAttribute(
            "role",
            "alert"
        );

        element.innerHTML = `
            <i class="fa-solid fa-wifi"></i>
            <span>${escapeHTML(message)}</span>
        `;


        document.body.appendChild(
            element
        );


        requestAnimationFrame(function () {

            element.classList.add(
                "show"
            );
        });


        setTimeout(function () {

            element.classList.remove(
                "show"
            );

            setTimeout(function () {

                element.remove();

            }, 300);

        }, 3500);
    }


    /* ========================================================
       THEME
       ======================================================== */

    function initializeTheme() {

        if (themeInitialized) {
            return;
        }

        themeInitialized = true;


        const themeBtn =
            document.getElementById(
                "themeBtn"
            );

        const themeIcon =
            document.getElementById(
                "themeIcon"
            );


        if (!themeBtn) {

            console.warn(
                "[AFC Main] Theme button not found."
            );

            return;
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


        function applyTheme(
            theme,
            save = true
        ) {

            const finalTheme =
                theme === "dark"
                    ? "dark"
                    : "light";


            document.documentElement.setAttribute(
                "data-theme",
                finalTheme
            );


            if (save) {

                localStorage.setItem(
                    AFC_MAIN_CONFIG.THEME_STORAGE_KEY,
                    finalTheme
                );
            }


            if (themeIcon) {

                themeIcon.classList.toggle(
                    "fa-moon",
                    finalTheme === "light"
                );

                themeIcon.classList.toggle(
                    "fa-sun",
                    finalTheme === "dark"
                );
            }


            themeBtn.setAttribute(
                "aria-label",
                finalTheme === "dark"
                    ? "Switch to light theme"
                    : "Switch to dark theme"
            );


            themeBtn.setAttribute(
                "title",
                finalTheme === "dark"
                    ? "Switch to light theme"
                    : "Switch to dark theme"
            );
        }


        let savedTheme = null;


        try {

            savedTheme =
                localStorage.getItem(
                    AFC_MAIN_CONFIG.THEME_STORAGE_KEY
                );

        } catch (error) {

            console.warn(
                "[AFC Main] Could not read saved theme.",
                error
            );
        }


        const initialTheme =
            savedTheme === "dark" ||
            savedTheme === "light"
                ? savedTheme
                : getSystemTheme();


        applyTheme(
            initialTheme,
            false
        );


        themeBtn.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                const currentTheme =
                    document.documentElement
                        .getAttribute(
                            "data-theme"
                        ) || "light";


                const nextTheme =
                    currentTheme === "dark"
                        ? "light"
                        : "dark";


                applyTheme(
                    nextTheme,
                    true
                );
            }
        );


        /*
         * Follow system theme only when the user has not
         * manually selected a theme.
         */

        if (
            window.matchMedia
        ) {

            const mediaQuery =
                window.matchMedia(
                    "(prefers-color-scheme: dark)"
                );


            const handleSystemThemeChange =
                function (event) {

                    let manuallySelected = null;


                    try {

                        manuallySelected =
                            localStorage.getItem(
                                AFC_MAIN_CONFIG.THEME_STORAGE_KEY
                            );

                    } catch (error) {
                        manuallySelected = null;
                    }


                    if (
                        manuallySelected === "dark" ||
                        manuallySelected === "light"
                    ) {
                        return;
                    }


                    applyTheme(
                        event.matches
                            ? "dark"
                            : "light",
                        false
                    );
                };


            if (
                typeof mediaQuery.addEventListener ===
                "function"
            ) {

                mediaQuery.addEventListener(
                    "change",
                    handleSystemThemeChange
                );

            } else if (
                typeof mediaQuery.addListener ===
                "function"
            ) {

                mediaQuery.addListener(
                    handleSystemThemeChange
                );
            }
        }
    }


    /* ========================================================
       DASHBOARD GREETING
       ======================================================== */

    function initializeDashboardGreeting() {

        const greetingElement =
            document.getElementById(
                "dashboardGreeting"
            );


        if (!greetingElement) {
            return;
        }


        const hour =
            new Date().getHours();


        let greeting;


        if (hour < 12) {

            greeting = "Good morning";

        } else if (hour < 17) {

            greeting = "Good afternoon";

        } else {

            greeting = "Good evening";
        }


        /*
         * Preserve any existing name that may already
         * be present in the greeting element.
         */

        const existingName =
            greetingElement.dataset.name ||
            "";


        if (existingName) {

            greetingElement.textContent =
                `${greeting}, ${existingName}`;

        } else {

            greetingElement.textContent =
                greeting;
        }
    }


    /* ========================================================
       HEADER SAFETY
       ======================================================== */

    function initializeHeaderSafety() {

        if (headerSafetyInitialized) {
            return;
        }

        headerSafetyInitialized = true;


        const buttons =
            document.querySelectorAll(
                "button:not([type])"
            );


        buttons.forEach(function (button) {

            button.setAttribute(
                "type",
                "button"
            );
        });
    }


    /* ========================================================
       GLOBAL ERROR HANDLING
       ======================================================== */

    function initializeGlobalErrorHandling() {

        window.addEventListener(
            "error",
            function (event) {

                console.error(
                    "[AFC Main] Window error:",
                    event.error ||
                    event.message ||
                    event
                );
            }
        );


        window.addEventListener(
            "unhandledrejection",
            function (event) {

                console.error(
                    "[AFC Main] Unhandled promise rejection:",
                    event.reason
                );
            }
        );
    }


    /* ========================================================
       CLEANUP BEFORE PAGE UNLOAD
       ======================================================== */

    function initializeUnloadSafety() {

        window.addEventListener(
            "beforeunload",
            function () {

                document.body.classList.remove(
                    "sidebar-open"
                );

                /*
                 * Remove any legacy inline scroll lock
                 * that might have been left by an older
                 * version of the portal.
                 */

                document.body.style.removeProperty(
                    "overflow"
                );
            }
        );
    }


    /* ========================================================
       APPLICATION INITIALIZATION
       ======================================================== */

    function initializeApplication() {

        if (applicationInitialized) {
            return;
        }

        applicationInitialized = true;


        console.log(
            `[AFC Main] Initializing AFC Isiu Youth Portal V2 — ${AFC_MAIN_CONFIG.VERSION}`
        );


        initializeAOS();

        initializeOfflineState();

        initializeGlobalErrorHandling();

        initializeUnloadSafety();

        initializeDashboardGreeting();


        /*
         * The shared shell may not exist yet.
         * Navigation, notifications, theme and online-only
         * links are initialized when layout.js announces
         * afc:layout-ready.
         */

        if (
            window.AFC_LAYOUT_READY
        ) {

            initializeNavigation();

            initializeNotifications();

            initializeTheme();

            initializeOnlineOnlyLinks();

            initializeHeaderSafety();

        } else {

            document.addEventListener(
                "afc:layout-ready",
                function () {

                    initializeNavigation();

                    initializeNotifications();

                    initializeTheme();

                    initializeOnlineOnlyLinks();

                    initializeHeaderSafety();

                },
                {
                    once: true
                }
            );
        }
    }


    /* ========================================================
       START APPLICATION
       ======================================================== */

    onDOMReady(
        initializeApplication
    );


})();
