/* =========================================================
   AFC ISIU YOUTH PORTAL
   FILE: main.js
   VERSION: 2.4

   PURPOSE:
   - Shared portal functionality
   - Sidebar / mobile navigation
   - Bottom hub button
   - Notification controls
   - Reliable offline status
   - Online-only navigation
   - Theme toggle
   - Dashboard greeting
   - Safe page initialization

   IMPORTANT:
   - layout.js injects shared components.
   - main.js initializes shared component behaviour.
   - layout.css controls header positioning.
   - lessons.js controls lesson-specific functionality.
   - pwa.js is the ONLY file responsible for:
       * service worker
       * push subscription
       * PWA installation
========================================================= */

"use strict";


/* =========================================================
   GLOBAL CONFIG
========================================================= */

const AFC_MAIN_CONFIG = {

    MOBILE_BREAKPOINT: 768,

    OFFLINE_BANNER_ID:
        "offlineBanner",

    OFFLINE_MESSAGE_ID:
        "offlineMessage",

    THEME_STORAGE_KEY:
        "afcTheme"

};


/* =========================================================
   DOM READY HELPER
========================================================= */

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


    function showOfflineBanner() {

        const banner =
            createOfflineBanner();


        banner.classList.add("show");

    }


    function hideOfflineBanner() {

        if (!offlineBanner) {

            return;

        }


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
   OFFLINE MESSAGE
========================================================= */

function showOfflineMessage(
    featureName
) {

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
   SHARED LAYOUT READY
=========================================================

   layout.js injects:

       Sidebar
       Topbar
       Notification panel
       Bottom navigation

   Only after that happens should we initialize
   interactions that depend on those elements.
========================================================= */

document.addEventListener(
    "afc:layout-ready",
    () => {

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


/* =========================================================
   NAVIGATION
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


    const menuButton =
        document.getElementById(
            "mobileMenuBtn"
        );


    const hubButton =
        document.getElementById(
            "hubButton"
        );


    if (
        !sidebar ||
        !overlay
    ) {

        console.warn(
            "AFC Isiu: Navigation elements were not found."
        );

        return;

    }


    /* -----------------------------------------------------
       BODY SCROLL LOCK
    ----------------------------------------------------- */

    function lockPageScroll() {

        document.body.classList.add(
            "sidebar-open"
        );

    }


    function unlockPageScroll() {

        document.body.classList.remove(
            "sidebar-open"
        );

        /*
         * Safety cleanup.
         * This guarantees that no old inline
         * overflow value can remain.
         */
        document.body.style.removeProperty(
            "overflow"
        );

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


        lockPageScroll();


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


        unlockPageScroll();


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
       INITIAL STATE
    ----------------------------------------------------- */

    closeSidebar();


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

                    closeSidebar();

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
       PAGE VISIBILITY SAFETY
    -----------------------------------------------------

       If the browser restores the page after being
       backgrounded or restored from history, make sure
       the page isn't accidentally left scroll-locked.
    ----------------------------------------------------- */

    window.addEventListener(
        "pageshow",
        () => {

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
   ONLINE-ONLY FEATURES
========================================================= */

function initializeOnlineOnlyLinks() {

    const onlineOnlyLinks =
        document.querySelectorAll(
            "[data-online-only]"
        );


    if (!onlineOnlyLinks.length) {

        return;

    }


    onlineOnlyLinks.forEach(
        link => {

            /*
             * Prevent duplicate listeners if layout
             * is ever reinitialized.
             */

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
                event => {

                    if (
                        navigator.onLine
                    ) {

                        return;

                    }


                    event.preventDefault();


                    showOfflineMessage(
                        link.dataset.feature ||
                        "This feature"
                    );

                }
            );

        }
    );

}


/* =========================================================
   NOTIFICATION CONTROLLER
========================================================= */

function initializeNotifications() {

    const button =
        document.getElementById(
            "notificationBtn"
        );


    const panel =
        document.getElementById(
            "notificationPanel"
        );


    const closeButton =
        document.getElementById(
            "notificationPanelClose"
        );


    const enableButton =
        document.getElementById(
            "enableNotificationsBtn"
        );


    const disableButton =
        document.getElementById(
            "disableNotificationsBtn"
        );


    const statusText =
        document.getElementById(
            "notificationStatusText"
        );


    const statusBox =
        document.getElementById(
            "notificationStatus"
        );


    const icon =
        document.getElementById(
            "notificationIcon"
        );


    const dot =
        document.getElementById(
            "notifyDot"
        );


    if (
        !button ||
        !panel ||
        !enableButton
    ) {

        console.warn(
            "AFC Isiu: Notification UI elements were not found."
        );

        return;

    }


    /* -----------------------------------------------------
       GUARANTEE CORRECT INITIAL BUTTON STATE
    ----------------------------------------------------- */

    enableButton.hidden =
        false;


    if (disableButton) {

        disableButton.hidden =
            true;

    }


    /* -----------------------------------------------------
       PANEL STATE
    ----------------------------------------------------- */

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


        updateNotificationState();

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


    /* -----------------------------------------------------
       STATUS
    ----------------------------------------------------- */

    function setNotificationStatus(
        message,
        state
    ) {

        if (statusText) {

            statusText.textContent =
                message;

        }


        if (statusBox) {

            statusBox.dataset.state =
                state || "";

        }

    }


    /* -----------------------------------------------------
       BELL
    ----------------------------------------------------- */

    function updateBell(
        enabled
    ) {

        if (icon) {

            icon.classList.toggle(
                "fa-regular",
                !enabled
            );


            icon.classList.toggle(
                "fa-solid",
                enabled
            );

        }


        if (dot) {

            dot.style.display =
                enabled
                    ? "block"
                    : "none";

        }

    }


    /* -----------------------------------------------------
       BUTTON STATE
    ----------------------------------------------------- */

    function showEnableButton() {

        enableButton.hidden =
            false;


        enableButton.disabled =
            false;


        if (disableButton) {

            disableButton.hidden =
                true;

        }

    }


    function showDisableButton() {

        enableButton.hidden =
            true;


        enableButton.disabled =
            false;


        if (disableButton) {

            disableButton.hidden =
                false;

            disableButton.disabled =
                false;

        }

    }


    /* -----------------------------------------------------
       CHECK CURRENT STATE
    ----------------------------------------------------- */

    async function updateNotificationState() {

        /*
         * Always establish the safe visual state
         * before checking anything asynchronously.
         */

        showEnableButton();

        updateBell(false);


        if (
            !window.AFC_PWA
        ) {

            setNotificationStatus(
                "The notification service is still loading. Please try again in a moment.",
                "loading"
            );

            return;

        }


        if (
            typeof AFC_PWA.isPushSupported !==
            "function"
        ) {

            setNotificationStatus(
                "Push notifications are not supported by this browser.",
                "unsupported"
            );

            showEnableButton();

            return;

        }


        if (
            !AFC_PWA.isPushSupported()
        ) {

            setNotificationStatus(
                "Push notifications are not supported by this browser.",
                "unsupported"
            );

            showEnableButton();

            return;

        }


        try {

            const permission =
                await AFC_PWA.getPushPermissionState();


            const subscription =
                await AFC_PWA.getPushSubscription();


            /*
             * ENABLED
             */

            if (
                subscription &&
                permission === "granted"
            ) {

                setNotificationStatus(
                    "Notifications are enabled on this device. You will receive AFC Isiu Youth updates here.",
                    "enabled"
                );


                showDisableButton();


                updateBell(true);


                return;

            }


            /*
             * BLOCKED
             */

            if (
                permission === "denied"
            ) {

                setNotificationStatus(
                    "Notifications are blocked in your browser. Please allow notifications in your browser settings.",
                    "blocked"
                );


                showEnableButton();


                updateBell(false);


                return;

            }


            /*
             * NOT ENABLED
             */

            setNotificationStatus(
                "Turn on notifications to receive important AFC Isiu Youth updates.",
                "disabled"
            );


            showEnableButton();


            updateBell(false);

        }

        catch (error) {

            console.error(
                "AFC Isiu: Unable to determine notification state.",
                error
            );


            setNotificationStatus(
                "Unable to check notification status. Please try again.",
                "error"
            );


            showEnableButton();


            updateBell(false);

        }

    }


    /* -----------------------------------------------------
       ENABLE NOTIFICATIONS
    ----------------------------------------------------- */

    enableButton.addEventListener(
        "click",
        async event => {

            event.preventDefault();


            if (
                enableButton.disabled
            ) {

                return;

            }


            /*
             * IMPORTANT:
             * Do NOT allow the user to click the button
             * repeatedly while subscription is happening.
             */

            enableButton.disabled =
                true;


            enableButton.hidden =
                false;


            const originalHTML =
                enableButton.innerHTML;


            enableButton.innerHTML = `

                <i class="fa-solid fa-spinner fa-spin"></i>

                <span>
                    Enabling Notifications...
                </span>

            `;


            setNotificationStatus(
                "Setting up notifications on this device...",
                "loading"
            );


            try {

                if (
                    !window.AFC_PWA
                ) {

                    throw new Error(
                        "Notification service is unavailable."
                    );

                }


                if (
                    typeof AFC_PWA.subscribeToPush !==
                    "function"
                ) {

                    throw new Error(
                        "Push subscription is unavailable."
                    );

                }


                /*
                 * The current PWA implementation expects
                 * a member ID.
                 *
                 * Try the existing stored member data.
                 */

                let memberId = "";
                let memberName = "";


                try {

                    const savedMember =
                        localStorage.getItem(
                            "afc_isiu_slc_member_v1"
                        );


                    if (savedMember) {

                        const parsed =
                            JSON.parse(
                                savedMember
                            );


                        memberId =
                            String(
                                parsed?.memberId ||
                                ""
                            ).trim();


                        memberName =
                            String(
                                parsed?.memberName ||
                                ""
                            ).trim();

                    }

                }

                catch (storageError) {

                    console.warn(
                        "AFC Isiu: Unable to read saved member data.",
                        storageError
                    );

                }


                /*
                 * Also check the SLC session.
                 */

                if (!memberId) {

                    try {

                        const session =
                            sessionStorage.getItem(
                                "afc_isiu_slc_quiz_session_v1"
                            );


                        if (session) {

                            const parsed =
                                JSON.parse(
                                    session
                                );


                            memberId =
                                String(
                                    parsed?.memberId ||
                                    ""
                                ).trim();


                            memberName =
                                String(
                                    parsed?.memberName ||
                                    ""
                                ).trim();

                        }

                    }

                    catch (sessionError) {

                        console.warn(
                            "AFC Isiu: Unable to read SLC session.",
                            sessionError
                        );

                    }

                }


                /*
                 * Subscribe.
                 */

                const result =
                    await AFC_PWA.subscribeToPush(
                        memberId,
                        memberName
                    );


                if (
                    !result ||
                    result.success !== true
                ) {

                    throw new Error(
                        result?.message ||
                        "Unable to enable notifications."
                    );

                }


                /*
                 * IMPORTANT:
                 *
                 * Do NOT manually assume the state.
                 * Ask pwa.js for the actual subscription
                 * after subscribing.
                 */

                await updateNotificationState();


                /*
                 * If updateNotificationState() sees
                 * the real subscription, the Enable
                 * button will automatically disappear
                 * and Disable will appear.
                 */

            }

            catch (error) {

                console.error(
                    "AFC Isiu: Enable notification error.",
                    error
                );


                setNotificationStatus(
                    error?.message ||
                    "Unable to enable notifications. Please try again.",
                    "error"
                );


                /*
                 * Restore original button.
                 */

                enableButton.innerHTML =
                    originalHTML;


                showEnableButton();

            }

            finally {

                /*
                 * Re-check the real state.
                 */

                try {

                    await updateNotificationState();

                }

                catch (stateError) {

                    console.warn(
                        "AFC Isiu: Final notification state check failed.",
                        stateError
                    );

                }

            }

        }
    );


    /* -----------------------------------------------------
       DISABLE NOTIFICATIONS
    ----------------------------------------------------- */

    if (disableButton) {

        disableButton.addEventListener(
            "click",
            async event => {

                event.preventDefault();


                if (
                    disableButton.disabled
                ) {

                    return;

                }


                disableButton.disabled =
                    true;


                const originalHTML =
                    disableButton.innerHTML;


                disableButton.innerHTML = `

                    <i class="fa-solid fa-spinner fa-spin"></i>

                    <span>
                        Disabling...
                    </span>

                `;


                setNotificationStatus(
                    "Disabling notifications on this device...",
                    "loading"
                );


                try {

                    if (
                        !window.AFC_PWA
                    ) {

                        throw new Error(
                            "Notification service is unavailable."
                        );

                    }


                    if (
                        typeof AFC_PWA.unsubscribeFromPush !==
                        "function"
                    ) {

                        throw new Error(
                            "Push unsubscribe function is unavailable."
                        );

                    }


                    const result =
                        await AFC_PWA.unsubscribeFromPush();


                    if (
                        !result ||
                        result.success !== true
                    ) {

                        throw new Error(
                            result?.message ||
                            "Unable to disable notifications."
                        );

                    }


                    /*
                     * IMPORTANT:
                     *
                     * Ask pwa.js again for the actual
                     * subscription state.
                     *
                     * This makes Enable reappear only
                     * after unsubscribe has really completed.
                     */

                    await updateNotificationState();

                }

                catch (error) {

                    console.error(
                        "AFC Isiu: Disable notification error.",
                        error
                    );


                    setNotificationStatus(
                        error?.message ||
                        "Unable to disable notifications. Please try again.",
                        "error"
                    );


                    disableButton.innerHTML =
                        originalHTML;


                    showDisableButton();


                    updateBell(true);

                }

                finally {

                    disableButton.disabled =
                        false;

                }

            }
        );

    }


    /* -----------------------------------------------------
       NOTIFICATION BUTTON
    ----------------------------------------------------- */

    button.addEventListener(
        "click",
        event => {

            event.preventDefault();

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


    /* -----------------------------------------------------
       CLOSE BUTTON
    ----------------------------------------------------- */

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            event => {

                event.preventDefault();

                event.stopPropagation();

                closePanel();

            }
        );

    }


    /* -----------------------------------------------------
       CLICK OUTSIDE
    ----------------------------------------------------- */

    document.addEventListener(
        "click",
        event => {

            if (
                !panel.classList.contains(
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


    /* -----------------------------------------------------
       ESCAPE
    ----------------------------------------------------- */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                panel.classList.contains(
                    "show"
                )
            ) {

                closePanel();

            }

        }
    );


    /* -----------------------------------------------------
       INITIAL STATE
    ----------------------------------------------------- */

    panel.setAttribute(
        "aria-hidden",
        "true"
    );


    button.setAttribute(
        "aria-expanded",
        "false"
    );


    /*
     * Do not wait for the user to open the panel.
     * Establish the correct bell/button state immediately.
     */

    updateNotificationState();

}


/* =========================================================
   THEME TOGGLE
========================================================= */

function initializeTheme() {

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

        }

        else {

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

    }

    else {

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

}


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

                    weekday: "long",

                    day: "numeric",

                    month: "long",

                    year: "numeric"

                }
            );

    }

});


/* =========================================================
   HEADER SAFETY
========================================================= */

function initializeHeaderSafety() {

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

}


/* =========================================================
   SAFETY CLEANUP
========================================================= */

window.addEventListener(
    "beforeunload",
    () => {

        /*
         * Never leave the document scroll locked
         * if the browser is navigating away.
         */

        document.body.classList.remove(
            "sidebar-open"
        );


        document.body.style.removeProperty(
            "overflow"
        );

    }
);


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
    "AFC Isiu Youth Portal: main.js v2.4 loaded successfully."
);
