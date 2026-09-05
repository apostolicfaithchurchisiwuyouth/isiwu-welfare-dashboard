/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: admin/notifications.js
   PURPOSE: ADMIN PUSH NOTIFICATION DASHBOARD
   ============================================================ */

"use strict";


/* ============================================================
   CONFIG
============================================================ */

const ADMIN_CONFIG = {

    SEND_URL:
        "/api/push/send",

    STATUS_URL:
        "/api/push/status",

    SESSION_KEY:
        "afc_isiu_notification_admin_session",

    DEFAULT_TITLE:
        "AFC Isiu Youth"

};


/* ============================================================
   STATE
============================================================ */

let adminSecret = "";

let currentSubscriberCount = 0;


/* ============================================================
   DOM
============================================================ */

const $ = (id) =>
    document.getElementById(id);


/* ============================================================
   START
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        restoreAdminSession();

        setupLogin();

        setupDashboard();

        setupPreview();

        setupQuickNotifications();

    }
);


/* ============================================================
   LOGIN
============================================================ */

function setupLogin() {

    const form =
        $("loginForm");

    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const secret =
                String(
                    $("adminSecret").value || ""
                ).trim();


            if (!secret) {

                showLoginError(
                    "Please enter the admin password."
                );

                return;
            }


            setLoginLoading(
                true
            );


            try {

                const result =
                    await fetchStatus(
                        secret
                    );


                if (
                    !result ||
                    result.success !== true
                ) {

                    throw new Error(
                        result?.message ||
                        "Admin authentication failed."
                    );

                }


                adminSecret =
                    secret;


                sessionStorage.setItem(
                    ADMIN_CONFIG.SESSION_KEY,
                    adminSecret
                );


                showAdminScreen();


                applyStatus(
                    result
                );


                showToast(
                    "success",
                    "Admin access granted",
                    "Notification administration is ready."
                );


            }
            catch (error) {

                console.error(
                    "[Admin Login]",
                    error
                );


                showLoginError(
                    error.message ||
                    "Unable to verify admin access."
                );

            }
            finally {

                setLoginLoading(
                    false
                );

            }

        }
    );


    const toggle =
        $("togglePassword");


    if (toggle) {

        toggle.addEventListener(
            "click",
            function () {

                const input =
                    $("adminSecret");

                const icon =
                    toggle.querySelector("i");


                if (
                    input.type === "password"
                ) {

                    input.type =
                        "text";

                    icon.className =
                        "fa-solid fa-eye-slash";

                }
                else {

                    input.type =
                        "password";

                    icon.className =
                        "fa-solid fa-eye";

                }

            }
        );

    }

}


/* ============================================================
   RESTORE SESSION
============================================================ */

async function restoreAdminSession() {

    const saved =
        sessionStorage.getItem(
            ADMIN_CONFIG.SESSION_KEY
        );


    if (!saved) {
        return;
    }


    try {

        const result =
            await fetchStatus(
                saved
            );


        if (
            result &&
            result.success === true
        ) {

            adminSecret =
                saved;

            showAdminScreen();

            applyStatus(
                result
            );

        }
        else {

            sessionStorage.removeItem(
                ADMIN_CONFIG.SESSION_KEY
            );

        }

    }
    catch (error) {

        console.warn(
            "[Admin] Saved session could not be restored.",
            error
        );

    }

}


/* ============================================================
   SHOW ADMIN
============================================================ */

function showAdminScreen() {

    $("loginScreen")
        ?.classList.add("hidden");


    $("adminScreen")
        ?.classList.remove("hidden");


    refreshStatus();

}


/* ============================================================
   DASHBOARD
============================================================ */

function setupDashboard() {

    $("logoutButton")
        ?.addEventListener(
            "click",
            logoutAdmin
        );


    $("refreshButton")
        ?.addEventListener(
            "click",
            refreshStatus
        );


    $("notificationForm")
        ?.addEventListener(
            "submit",
            sendNotification
        );


    $("notificationBody")
        ?.addEventListener(
            "input",
            updateBodyCount
        );

}


/* ============================================================
   STATUS REQUEST
============================================================ */

async function fetchStatus(
    secret
) {

    const response =
        await fetch(
            ADMIN_CONFIG.STATUS_URL,
            {
                method:
                    "GET",

                headers: {
                    "Authorization":
                        "Bearer " + secret,

                    "Accept":
                        "application/json"
                },

                cache:
                    "no-store"
            }
        );


    let data = null;


    try {

        data =
            await response.json();

    }
    catch {

        throw new Error(
            "The server returned an invalid response."
        );

    }


    if (!response.ok) {

        throw new Error(
            data?.message ||
            "Unable to connect to notification server."
        );

    }


    return data;

}


/* ============================================================
   REFRESH STATUS
============================================================ */

async function refreshStatus() {

    if (!adminSecret) {
        return;
    }


    setHeaderStatus(
        "Checking..."
    );


    try {

        const result =
            await fetchStatus(
                adminSecret
            );


        if (
            !result ||
            result.success !== true
        ) {

            throw new Error(
                result?.message ||
                "Unable to load status."
            );

        }


        applyStatus(
            result
        );


    }
    catch (error) {

        console.error(
            "[Admin Status]",
            error
        );


        setHeaderStatus(
            "Offline"
        );


        showToast(
            "error",
            "Status unavailable",
            error.message
        );

    }

}


/* ============================================================
   APPLY STATUS
============================================================ */

function applyStatus(
    data
) {

    const subscribers =
        Number(
            data.activeSubscriptions ??
            data.subscribers ??
            data.activeSubscriberCount ??
            0
        );


    currentSubscriberCount =
        subscribers;


    $("subscriberCount").textContent =
        formatNumber(
            subscribers
        );


    $("systemSubscriberCount").textContent =
        formatNumber(
            subscribers
        );


    $("recipientPreview").textContent =
        formatNumber(
            subscribers
        );


    const systemReady =
        data.success === true &&
        (
            data.vapidConfigured !== false &&
            data.senderConfigured !== false
        );


    $("systemStatus").textContent =
        systemReady
            ? "Ready"
            : "Check setup";


    $("vapidStatus").textContent =
        data.vapidConfigured === true
            ? "Configured"
            : "Not configured";


    $("senderStatus").textContent =
        data.senderConfigured === true
            ? "Configured"
            : "Not configured";


    $("timezone").textContent =
        data.timezone ||
        "Africa/Lagos";


    $("lastChecked").textContent =
        new Date()
            .toLocaleString(
                "en-NG",
                {
                    dateStyle:
                        "medium",

                    timeStyle:
                        "short"
                }
            );


    setHeaderStatus(
        systemReady
            ? "Connected"
            : "Check setup"
    );

}


/* ============================================================
   HEADER STATUS
============================================================ */

function setHeaderStatus(
    text
) {

    const element =
        $("headerStatus");


    if (!element) {
        return;
    }


    element.innerHTML =
        `
        <span class="status-dot"></span>
        ${escapeHtml(text)}
        `;

}


/* ============================================================
   SEND NOTIFICATION
============================================================ */

async function sendNotification(
    event
) {

    event.preventDefault();


    if (!adminSecret) {

        showToast(
            "error",
            "Admin session expired",
            "Please sign in again."
        );

        logoutAdmin();

        return;

    }


    const title =
        String(
            $("notificationTitle").value ||
            ""
        ).trim();


    const body =
        String(
            $("notificationBody").value ||
            ""
        ).trim();


    const url =
        String(
            $("notificationUrl").value ||
            "/"
        ).trim();


    const tag =
        String(
            $("notificationTag").value ||
            ""
        ).trim();


    if (!title) {

        showToast(
            "error",
            "Missing title",
            "Enter a notification title."
        );

        return;

    }


    if (!body) {

        showToast(
            "error",
            "Missing message",
            "Enter a notification message."
        );

        return;

    }


    if (
        currentSubscriberCount < 1
    ) {

        showToast(
            "error",
            "No active subscribers",
            "Nobody has enabled notifications yet."
        );

        return;

    }


    const confirmed =
        window.confirm(
            `Send this notification to ${currentSubscriberCount} active subscriber${currentSubscriberCount === 1 ? "" : "s"}?`
        );


    if (!confirmed) {
        return;
    }


    setSendLoading(
        true
    );


    try {

        const response =
            await fetch(
                ADMIN_CONFIG.SEND_URL,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " +
                            adminSecret,

                        "Accept":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            title:
                                title,

                            body:
                                body,

                            url:
                                url,

                            tag:
                                tag ||
                                "afc-isiu-notification"
                        })
                }
            );


        const result =
            await response.json();


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            throw new Error(
                "Your admin password is no longer valid."
            );

        }


        if (
            !response.ok ||
            result.success === false
        ) {

            throw new Error(
                result.message ||
                result.error ||
                "Notification could not be sent."
            );

        }


        const sent =
            Number(
                result.sent ??
                result.successCount ??
                0
            );


        const failed =
            Number(
                result.failed ??
                result.failureCount ??
                0
            );


        showToast(
            "success",
            "Notification sent",
            `${sent} sent${failed ? ` · ${failed} failed` : ""}.`
        );


        $("notificationBody").value =
            "";


        updateBodyCount();


        updatePreview();


        await refreshStatus();

    }
    catch (error) {

        console.error(
            "[Admin Send]",
            error
        );


        showToast(
            "error",
            "Notification failed",
            error.message ||
            "Something went wrong."
        );

    }
    finally {

        setSendLoading(
            false
        );

    }

}


/* ============================================================
   PREVIEW
============================================================ */

function setupPreview() {

    [
        "notificationTitle",
        "notificationBody"
    ]
    .forEach(
        function (id) {

            $(id)?.addEventListener(
                "input",
                updatePreview
            );

        }
    );

}


function updatePreview() {

    const title =
        String(
            $("notificationTitle")?.value ||
            ADMIN_CONFIG.DEFAULT_TITLE
        ).trim();


    const body =
        String(
            $("notificationBody")?.value ||
            "Your notification message will appear here."
        ).trim();


    $("previewTitle").textContent =
        title ||
        ADMIN_CONFIG.DEFAULT_TITLE;


    $("previewBody").textContent =
        body ||
        "Your notification message will appear here.";

}


function updateBodyCount() {

    const value =
        String(
            $("notificationBody")?.value ||
            ""
        );


    $("bodyCount").textContent =
        value.length;

}


/* ============================================================
   QUICK NOTIFICATIONS
============================================================ */

function setupQuickNotifications() {

    document
        .querySelectorAll(".quick-card")
        .forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        $("notificationTitle").value =
                            button.dataset.title ||
                            ADMIN_CONFIG.DEFAULT_TITLE;


                        $("notificationBody").value =
                            button.dataset.message ||
                            "";


                        $("notificationUrl").value =
                            button.dataset.url ||
                            "/";


                        updateBodyCount();

                        updatePreview();


                        $("notificationTitle")
                            .scrollIntoView({
                                behavior:
                                    "smooth",

                                block:
                                    "center"
                            });

                    }
                );

            }
        );

}


/* ============================================================
   LOADING STATES
============================================================ */

function setLoginLoading(
    loading
) {

    const button =
        $("loginButton");


    if (!button) {
        return;
    }


    button.disabled =
        loading;


    button.innerHTML =
        loading
            ? `
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>Checking...</span>
              `
            : `
                <i class="fa-solid fa-arrow-right-to-bracket"></i>
                <span>Continue</span>
              `;

}


function setSendLoading(
    loading
) {

    const button =
        $("sendButton");


    if (!button) {
        return;
    }


    button.disabled =
        loading;


    button.innerHTML =
        loading
            ? `
                <i class="fa-solid fa-spinner fa-spin"></i>
                <span>Sending...</span>
              `
            : `
                <i class="fa-solid fa-paper-plane"></i>
                <span>Send notification</span>
              `;

}


/* ============================================================
   LOGOUT
============================================================ */

function logoutAdmin() {

    adminSecret =
        "";


    sessionStorage.removeItem(
        ADMIN_CONFIG.SESSION_KEY
    );


    $("adminScreen")
        ?.classList.add("hidden");


    $("loginScreen")
        ?.classList.remove("hidden");


    $("adminSecret").value =
        "";


    $("loginError")
        ?.classList.add("hidden");

}


/* ============================================================
   LOGIN ERROR
============================================================ */

function showLoginError(
    message
) {

    const error =
        $("loginError");


    if (!error) {
        return;
    }


    error.textContent =
        message;


    error.classList.remove(
        "hidden"
    );

}


/* ============================================================
   TOAST
============================================================ */

function showToast(
    type,
    title,
    message
) {

    const container =
        $("toastContainer");


    if (!container) {
        return;
    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        "toast " +
        type;


    toast.innerHTML =
        `
        <i class="fa-solid ${
            type === "success"
                ? "fa-circle-check"
                : "fa-circle-exclamation"
        }"></i>

        <div>

            <strong>
                ${escapeHtml(title)}
            </strong>

            <p>
                ${escapeHtml(message)}
            </p>

        </div>
        `;


    container.appendChild(
        toast
    );


    window.setTimeout(
        function () {

            toast.remove();

        },
        5000
    );

}


/* ============================================================
   UTILITIES
============================================================ */

function formatNumber(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-NG"
    );

}


function escapeHtml(
    value
) {

    return String(
        value ?? ""
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
