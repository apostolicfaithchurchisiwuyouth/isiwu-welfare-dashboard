/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: shell.js
   PURPOSE: GLOBAL PORTAL SHELL
   PHASE 4B
============================================================ */

(function () {

    "use strict";


    /* ========================================================
       CONFIGURATION
    ======================================================== */

    const SHELL_CONFIG = {

        portalName:
            "AFC Isiwu Youth Portal",

        portalShortName:
            "AFC Isiwu Youth",

        logo:
            "../assets/images/logo.png"

    };


    /* ========================================================
       CURRENT PAGE
    ======================================================== */

    function getCurrentPage() {

        let path =
            window.location.pathname
                .split("/")
                .pop()
                .toLowerCase();


        if (
            !path ||
            path === "index" ||
            path === "index.html"
        ) {

            return "home";

        }


        return path
            .replace(".html", "")
            .replace(".htm", "");

    }


    /* ========================================================
       CREATE SHELL
    ======================================================== */

    function createShell() {

        const currentPage =
            getCurrentPage();


        const shell =
            document.createElement("div");


        shell.id =
            "portalShell";


        shell.innerHTML = `

            <div class="app-layout">


                <!-- ==========================================
                     SIDEBAR
                =========================================== -->

                <aside
                    class="sidebar"
                    id="sidebar"
                    aria-label="Main navigation"
                >


                    <!-- LOGO -->

                    <div class="sidebar-logo">

                        <div class="sidebar-logo-mark">

                            <i class="fas fa-cross"></i>

                        </div>


                        <div>

                            <h2>
                                ${SHELL_CONFIG.portalShortName}
                            </h2>

                            <span>
                                Youth Portal
                            </span>

                        </div>

                    </div>


                    <!-- MAIN MENU -->

                    <nav class="sidebar-menu">


                        <a
                            href="../index"
                            data-page="home"
                            class="${
                                currentPage === "home"
                                    ? "active"
                                    : ""
                            }"
                        >

                            <i class="fas fa-house"></i>

                            <span>
                                Home
                            </span>

                        </a>


                        <a
                            href="lessons"
                            data-page="lessons"
                            class="${
                                currentPage === "lessons"
                                    ? "active"
                                    : ""
                            }"
                        >

                            <i class="fas fa-book-open"></i>

                            <span>
                                Lessons
                            </span>

                        </a>


                        <a
                            href="leaderboard"
                            data-page="leaderboard"
                            class="${
                                currentPage === "leaderboard"
                                    ? "active"
                                    : ""
                            }"
                        >

                            <i class="fas fa-trophy"></i>

                            <span>
                                Leaderboard
                            </span>

                        </a>


                        <a
                            href="gallery"
                            data-page="gallery"
                            class="${
                                currentPage === "gallery"
                                    ? "active"
                                    : ""
                            }"
                        >

                            <i class="fas fa-images"></i>

                            <span>
                                Gallery
                            </span>

                        </a>


                        <a
                            href="profile"
                            data-page="profile"
                            class="${
                                currentPage === "profile"
                                    ? "active"
                                    : ""
                            }"
                        >

                            <i class="fas fa-user"></i>

                            <span>
                                Profile
                            </span>

                        </a>

                    </nav>


                    <!-- BOTTOM SIDEBAR MENU -->

                    <div class="sidebar-bottom">


                        <a
                            href="settings"
                            data-page="settings"
                            class="${
                                currentPage === "settings"
                                    ? "active"
                                    : ""
                            }"
                        >

                            <i class="fas fa-gear"></i>

                            <span>
                                Settings
                            </span>

                        </a>


                        <a
                            href="../index"
                            data-shell-action="logout"
                        >

                            <i class="fas fa-right-from-bracket"></i>

                            <span>
                                Logout
                            </span>

                        </a>

                    </div>

                </aside>


                <!-- ==========================================
                     OVERLAY
                =========================================== -->

                <div
                    class="sidebar-overlay"
                    id="sidebarOverlay"
                ></div>


                <!-- ==========================================
                     MAIN AREA
                =========================================== -->

                <div class="main-area">


                    <!-- ======================================
                         TOPBAR
                    ======================================= -->

                    <header class="topbar">


                        <div class="topbar-left">


                            <button
                                class="mobile-menu-btn"
                                id="mobileMenuBtn"
                                type="button"
                                aria-label="Open menu"
                                aria-expanded="false"
                            >

                                <i class="fas fa-bars"></i>

                            </button>


                            <div class="portal-brand">

                                <div>

                                    <h2>
                                        ${SHELL_CONFIG.portalName}
                                    </h2>


                                    <p>
                                        Growing together in Christ
                                    </p>

                                </div>

                            </div>

                        </div>


                        <div class="topbar-right">


                            <button
                                class="header-icon"
                                type="button"
                                id="notificationButton"
                                aria-label="Notifications"
                            >

                                <i class="fas fa-bell"></i>


                                <span
                                    class="notify-dot"
                                    id="notificationDot"
                                ></span>

                            </button>


                            <a
                                href="profile"
                                class="header-icon"
                                aria-label="Profile"
                            >

                                <i class="fas fa-user"></i>

                            </a>

                        </div>

                    </header>


                    <!-- ======================================
                         PAGE CONTENT
                    ======================================= -->

                    <main
                        class="page-content"
                        id="pageContent"
                    ></main>


                </div>


                <!-- ==========================================
                     MOBILE BOTTOM NAV
                =========================================== -->

                <nav
                    class="bottom-nav"
                    id="bottomNav"
                    aria-label="Mobile navigation"
                >


                    <a
                        href="../index"
                        data-page="home"
                        class="${
                            currentPage === "home"
                                ? "active"
                                : ""
                        }"
                    >

                        <i class="fas fa-house"></i>

                        <span>
                            Home
                        </span>

                    </a>


                    <a
                        href="lessons"
                        data-page="lessons"
                        class="${
                            currentPage === "lessons"
                                ? "active"
                                : ""
                        }"
                    >

                        <i class="fas fa-book-open"></i>

                        <span>
                            Lessons
                        </span>

                    </a>


                    <button
                        type="button"
                        class="bottom-nav-center"
                        id="hubButton"
                        aria-label="Open menu"
                        aria-expanded="false"
                    >

                        <i class="fas fa-plus"></i>

                    </button>


                    <a
                        href="gallery"
                        data-page="gallery"
                        class="${
                            currentPage === "gallery"
                                ? "active"
                                : ""
                        }"
                    >

                        <i class="fas fa-images"></i>

                        <span>
                            Gallery
                        </span>

                    </a>


                    <a
                        href="profile"
                        data-page="profile"
                        class="${
                            currentPage === "profile"
                                ? "active"
                                : ""
                        }"
                    >

                        <i class="fas fa-user"></i>

                        <span>
                            Profile
                        </span>

                    </a>

                </nav>


            </div>

        `;


        document.body.prepend(shell);


        return shell;

    }


    /* ========================================================
       MOVE PAGE CONTENT
    ======================================================== */

    function movePageContent() {

        const pageContent =
            document.getElementById(
                "pageContent"
            );


        const existingContent =
            document.querySelector(
                "[data-page-content]"
            );


        if (
            !pageContent ||
            !existingContent
        ) {

            console.warn(
                "Portal Shell: [data-page-content] not found."
            );

            return;

        }


        while (
            existingContent.firstChild
        ) {

            pageContent.appendChild(
                existingContent.firstChild
            );

        }


        existingContent.remove();

    }


    /* ========================================================
       SIDEBAR
    ======================================================== */

    function setupSidebar() {

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
                        closeSidebar
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

    }


    /* ========================================================
       NOTIFICATIONS
    ======================================================== */

    function setupNotifications() {

        const button =
            document.getElementById(
                "notificationButton"
            );


        if (!button) {

            return;

        }


        button.addEventListener(
            "click",
            () => {

                console.log(
                    "Notifications clicked."
                );

            }
        );

    }


    /* ========================================================
       LOGOUT
    ======================================================== */

    function setupLogout() {

        const logout =
            document.querySelector(
                '[data-shell-action="logout"]'
            );


        if (!logout) {

            return;

        }


        logout.addEventListener(
            "click",
            event => {

                event.preventDefault();


                localStorage.removeItem(
                    "authToken"
                );


                localStorage.removeItem(
                    "currentUser"
                );


                localStorage.removeItem(
                    "user"
                );


                window.location.href =
                    "../index";

            }
        );

    }


    /* ========================================================
       INITIALIZE
    ======================================================== */

    function initShell() {

        createShell();

        movePageContent();

        setupSidebar();

        setupNotifications();

        setupLogout();


        console.log(
            "AFC Portal Shell initialized."
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
            initShell
        );

    }

    else {

        initShell();

    }


})();
