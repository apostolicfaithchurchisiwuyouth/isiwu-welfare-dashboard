/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: admin/notifications.js
   PURPOSE:
   ADMIN PUSH NOTIFICATION DASHBOARD
   SEND / SCHEDULE / AUTOMATION / HISTORY
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

    SCHEDULES_URL:
        "/api/push/schedules",

    HISTORY_URL:
        "/api/push/history",

    RUN_URL:
        "/api/push/run",

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

let currentSchedules = [];

let currentHistory = [];

let editingScheduleId = null;


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

        setupLogin();

        setupDashboard();

        setupPreview();

        setupQuickNotifications();

        setupScheduleForm();

        setupScheduleType();

        restoreAdminSession();

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


            setLoginLoading(true);


            try {

                const result =
                    await fetchStatus(secret);


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

                applyStatus(result);

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

                setLoginLoading(false);

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
                        "fa-solid fa-eye";

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
            await fetchStatus(saved);


        if (
            result &&
            result.success === true
        ) {

            adminSecret =
                saved;

            showAdminScreen();

            applyStatus(result);

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


    refreshAll();

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
            refreshAll
        );


    $("refreshHistoryButton")
        ?.addEventListener(
            "click",
            loadHistory
        );


    $("runSchedulerButton")
        ?.addEventListener(
            "click",
            runScheduler
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


    $("scheduleMessage")
        ?.addEventListener(
            "input",
            updateScheduleBodyCount
        );


    $("cancelScheduleEdit")
        ?.addEventListener(
            "click",
            cancelScheduleEdit
        );

}


/* ============================================================
   REFRESH ALL
============================================================ */

async function refreshAll() {

    if (!adminSecret) {
        return;
    }


    setHeaderStatus("Checking...");


    await Promise.allSettled([
        refreshStatus(),
        loadSchedules(),
        loadHistory()
    ]);

}


/* ============================================================
   STATUS REQUEST
============================================================ */

async function fetchStatus(secret) {

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
   GENERIC ADMIN REQUEST
============================================================ */

async function adminRequest(
    url,
    options = {}
) {

    if (!adminSecret) {

        throw new Error(
            "Your admin session has expired."
        );

    }


    const headers = {

        ...(options.headers || {}),

        "Authorization":
            "Bearer " + adminSecret,

        "Accept":
            "application/json"

    };


    if (
        options.body &&
        typeof options.body !== "string"
    ) {

        headers["Content-Type"] =
            "application/json";

        options.body =
            JSON.stringify(
                options.body
            );

    }


    const response =
        await fetch(
            url,
            {
                ...options,
                headers,
                cache: "no-store"
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


    if (
        response.status === 401 ||
        response.status === 403
    ) {

        logoutAdmin();

        throw new Error(
            "Your admin password is no longer valid."
        );

    }


    if (!response.ok) {

        throw new Error(
            data?.message ||
            data?.error ||
            "The request could not be completed."
        );

    }


    if (
        data &&
        data.success === false
    ) {

        throw new Error(
            data.message ||
            data.error ||
            "The request could not be completed."
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


        applyStatus(result);

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

function applyStatus(data) {

    const subscribers =
        Number(
            data.activeSubscriptions ??
            data.subscribers ??
            data.activeSubscriberCount ??
            0
        );


    const scheduled =
        Number(
            data.scheduledNotifications ??
            data.scheduledCount ??
            0
        );


    currentSubscriberCount =
        subscribers;


    $("subscriberCount").textContent =
        formatNumber(subscribers);


    $("systemSubscriberCount").textContent =
        formatNumber(subscribers);


    $("recipientPreview").textContent =
        formatNumber(subscribers);


    $("scheduledCount").textContent =
        formatNumber(scheduled);


    $("systemScheduledCount").textContent =
        formatNumber(scheduled);


    const systemReady =
        data.success === true &&
        data.vapidConfigured !== false &&
        data.senderConfigured !== false;


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

function setHeaderStatus(text) {

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
   SEND NOW
============================================================ */

async function sendNotification(event) {

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


    if (currentSubscriberCount < 1) {

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


    setSendLoading(true);


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


        await Promise.allSettled([
            refreshStatus(),
            loadHistory()
        ]);

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

        setSendLoading(false);

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


    updatePreview();

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
   SCHEDULE FORM
============================================================ */

function setupScheduleForm() {

    $("scheduleForm")
        ?.addEventListener(
            "submit",
            saveSchedule
        );

}


function setupScheduleType() {

    $("scheduleType")
        ?.addEventListener(
            "change",
            updateScheduleFields
        );


    updateScheduleFields();

}


function updateScheduleFields() {

    const type =
        $("scheduleType")?.value ||
        "once";


    const dateGroup =
        $("scheduleDateGroup");


    const dayGroup =
        $("scheduleDayGroup");


    const dateInput =
        $("scheduleDate");


    const dayInput =
        $("scheduleDay");


    if (!dateGroup || !dayGroup) {
        return;
    }


    if (type === "once") {

        dateGroup.classList.remove(
            "hidden"
        );

        dayGroup.classList.add(
            "hidden"
        );

        dateInput.required =
            true;

        dayInput.required =
            false;

    }
    else if (type === "weekly") {

        dateGroup.classList.add(
            "hidden"
        );

        dayGroup.classList.remove(
            "hidden"
        );

        dateInput.required =
            false;

        dayInput.required =
            true;

    }
    else {

        dateGroup.classList.add(
            "hidden"
        );

        dayGroup.classList.add(
            "hidden"
        );

        dateInput.required =
            false;

        dayInput.required =
            false;

    }

}


function updateScheduleBodyCount() {

    const value =
        String(
            $("scheduleMessage")?.value ||
            ""
        );


    $("scheduleBodyCount").textContent =
        value.length;

}


/* ============================================================
   SAVE SCHEDULE
============================================================ */

async function saveSchedule(event) {

    event.preventDefault();


    if (!adminSecret) {

        logoutAdmin();

        return;

    }


    const type =
        String(
            $("scheduleType").value ||
            "once"
        );


    const title =
        String(
            $("scheduleTitle").value ||
            ""
        ).trim();


    const message =
        String(
            $("scheduleMessage").value ||
            ""
        ).trim();


    const url =
        String(
            $("scheduleUrl").value ||
            "/"
        ).trim();


    const date =
        String(
            $("scheduleDate").value ||
            ""
        ).trim();


    const day =
        String(
            $("scheduleDay").value ||
            ""
        ).trim();


    const time =
        String(
            $("scheduleTime").value ||
            ""
        ).trim();


    const tag =
        String(
            $("scheduleTag").value ||
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


    if (!message) {

        showToast(
            "error",
            "Missing message",
            "Enter the notification message."
        );

        return;

    }


    if (type === "once" && !date) {

        showToast(
            "error",
            "Missing date",
            "Choose the date for this notification."
        );

        return;

    }


    if (type === "weekly" && !day) {

        showToast(
            "error",
            "Missing day",
            "Choose the weekly notification day."
        );

        return;

    }


    if (!time) {

        showToast(
            "error",
            "Missing time",
            "Choose the notification time."
        );

        return;

    }


    const payload = {

        action:
            editingScheduleId
                ? "updateNotification"
                : "createNotification",

        id:
            editingScheduleId ||
            "",

        title:
            title,

        message:
            message,

        type:
            type,

        date:
            date,

        day:
            day,

        time:
            time,

        url:
            url,

        tag:
            tag,

        active:
            true

    };


    setScheduleLoading(true);


    try {

        const result =
            await adminRequest(
                ADMIN_CONFIG.SCHEDULES_URL,
                {
                    method:
                        "POST",

                    body:
                        payload
                }
            );


        showToast(
            "success",
            editingScheduleId
                ? "Schedule updated"
                : "Schedule created",
            result.message ||
            "The notification schedule has been saved."
        );


        resetScheduleForm();

        await Promise.allSettled([
            loadSchedules(),
            refreshStatus()
        ]);

    }
    catch (error) {

        console.error(
            "[Admin Schedule]",
            error
        );


        showToast(
            "error",
            "Schedule failed",
            error.message
        );

    }
    finally {

        setScheduleLoading(false);

    }

}


/* ============================================================
   LOAD SCHEDULES
============================================================ */

async function loadSchedules() {

    if (!adminSecret) {
        return;
    }


    const list =
        $("scheduleList");


    if (!list) {
        return;
    }


    $("scheduleListStatus").textContent =
        "Loading...";


    try {

        const result =
            await adminRequest(
                ADMIN_CONFIG.SCHEDULES_URL,
                {
                    method:
                        "GET"
                }
            );


        currentSchedules =
            Array.isArray(result.schedules)
                ? result.schedules
                : Array.isArray(result.data)
                    ? result.data
                    : [];


        renderSchedules();


        $("scheduleListStatus").textContent =
            `${currentSchedules.length} schedule${currentSchedules.length === 1 ? "" : "s"}`;

    }
    catch (error) {

        console.error(
            "[Admin Schedules]",
            error
        );


        $("scheduleListStatus").textContent =
            "Unavailable";


        list.innerHTML =
            createEmptyState(
                "fa-solid fa-triangle-exclamation",
                "Unable to load schedules",
                error.message
            );

    }

}


/* ============================================================
   RENDER SCHEDULES
============================================================ */

function renderSchedules() {

    const list =
        $("scheduleList");


    if (!list) {
        return;
    }


    if (!currentSchedules.length) {

        list.innerHTML =
            createEmptyState(
                "fa-solid fa-calendar-days",
                "No schedules yet",
                "Create your first automatic notification above."
            );

        return;

    }


    list.innerHTML =
        currentSchedules
            .map(
                function (schedule) {

                    return renderScheduleItem(
                        schedule
                    );

                }
            )
            .join("");


    list
        .querySelectorAll(
            "[data-schedule-action]"
        )
        .forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    handleScheduleAction
                );

            }
        );

}


/* ============================================================
   RENDER ONE SCHEDULE
============================================================ */

function renderScheduleItem(schedule) {

    const id =
        schedule.id ||
        schedule.notificationId ||
        schedule.notificationID ||
        "";


    const active =
        isTruthy(
            schedule.active ??
            schedule.enabled ??
            schedule.status
        );


    const type =
        String(
            schedule.type ||
            "once"
        );


    const title =
        schedule.title ||
        ADMIN_CONFIG.DEFAULT_TITLE;


    const message =
        schedule.message ||
        schedule.body ||
        "";


    const time =
        schedule.time ||
        "—";


    const date =
        schedule.date ||
        "";


    const day =
        schedule.day ||
        "";


    const lastSent =
        schedule.lastSent ||
        schedule.last_sent ||
        "";


    const nextSend =
        schedule.nextSend ||
        schedule.next_send ||
        "";


    let timing = "";


    if (type === "once") {

        timing =
            date
                ? `Once · ${formatDate(date)} at ${time}`
                : `Once · ${time}`;

    }
    else if (type === "weekly") {

        timing =
            `${day || "Weekly"} · ${time}`;

    }
    else if (type === "birthday") {

        timing =
            `Birthday · ${time}`;

    }
    else {

        timing =
            `${formatType(type)} · ${time}`;

    }


    return `

        <article class="schedule-item">

            <div class="schedule-main">

                <div class="schedule-topline">

                    <strong class="schedule-title">
                        ${escapeHtml(title)}
                    </strong>

                    <span class="schedule-type">
                        ${escapeHtml(
                            formatType(type)
                        )}
                    </span>

                    <span class="${
                        active
                            ? "schedule-active"
                            : "schedule-inactive"
                    }">

                        <i class="fa-solid fa-circle"
                           style="font-size:.42rem;"></i>

                        ${active ? "Active" : "Disabled"}

                    </span>

                </div>


                <p class="schedule-message">
                    ${escapeHtml(message)}
                </p>


                <div class="schedule-meta">

                    <span>
                        <i class="fa-solid fa-clock"></i>
                        ${escapeHtml(timing)}
                    </span>

                    ${
                        nextSend
                            ? `
                                <span>
                                    <i class="fa-solid fa-forward"></i>
                                    Next: ${escapeHtml(
                                        formatDateTime(nextSend)
                                    )}
                                </span>
                              `
                            : ""
                    }

                    ${
                        lastSent
                            ? `
                                <span>
                                    <i class="fa-solid fa-paper-plane"></i>
                                    Last sent: ${escapeHtml(
                                        formatDateTime(lastSent)
                                    )}
                                </span>
                              `
                            : ""
                    }

                </div>

            </div>


            <div class="schedule-item-actions">

                <button
                    type="button"
                    class="item-button"
                    data-schedule-action="toggle"
                    data-id="${escapeHtml(id)}"
                    title="${active ? "Disable" : "Enable"} schedule"
                >

                    <i class="fa-solid ${
                        active
                            ? "fa-pause"
                            : "fa-play"
                    }"></i>

                </button>


                <button
                    type="button"
                    class="item-button"
                    data-schedule-action="edit"
                    data-id="${escapeHtml(id)}"
                    title="Edit schedule"
                >

                    <i class="fa-solid fa-pen"></i>

                </button>


                <button
                    type="button"
                    class="item-button danger"
                    data-schedule-action="delete"
                    data-id="${escapeHtml(id)}"
                    title="Delete schedule"
                >

                    <i class="fa-solid fa-trash"></i>

                </button>

            </div>

        </article>

    `;

}


/* ============================================================
   SCHEDULE ACTION
============================================================ */

async function handleScheduleAction(event) {

    const button =
        event.currentTarget;


    const action =
        button.dataset.scheduleAction;


    const id =
        button.dataset.id;


    if (!id) {

        showToast(
            "error",
            "Missing schedule ID",
            "The selected schedule could not be identified."
        );

        return;

    }


    const schedule =
        currentSchedules.find(
            function (item) {

                return String(
                    item.id ||
                    item.notificationId ||
                    item.notificationID ||
                    ""
                ) === String(id);

            }
        );


    if (!schedule) {

        showToast(
            "error",
            "Schedule not found",
            "Refresh the page and try again."
        );

        return;

    }


    if (action === "edit") {

        startScheduleEdit(schedule);

        return;

    }


    if (action === "toggle") {

        await toggleSchedule(
            schedule
        );

        return;

    }


    if (action === "delete") {

        await deleteSchedule(
            schedule
        );

    }

}


/* ============================================================
   TOGGLE SCHEDULE
============================================================ */

async function toggleSchedule(schedule) {

    const id =
        schedule.id ||
        schedule.notificationId ||
        schedule.notificationID;


    const currentlyActive =
        isTruthy(
            schedule.active ??
            schedule.enabled ??
            schedule.status
        );


    const confirmed =
        window.confirm(
            currentlyActive
                ? "Disable this notification schedule?"
                : "Enable this notification schedule?"
        );


    if (!confirmed) {
        return;
    }


    try {

        await adminRequest(
            ADMIN_CONFIG.SCHEDULES_URL,
            {
                method:
                    "POST",

                body: {

                    action:
                        "toggleNotification",

                    id:
                        id,

                    active:
                        !currentlyActive

                }

            }
        );


        showToast(
            "success",
            currentlyActive
                ? "Schedule disabled"
                : "Schedule enabled",
            "The schedule status has been updated."
        );


        await loadSchedules();

    }
    catch (error) {

        console.error(
            "[Admin Toggle Schedule]",
            error
        );


        showToast(
            "error",
            "Unable to update schedule",
            error.message
        );

    }

}


/* ============================================================
   DELETE SCHEDULE
============================================================ */

async function deleteSchedule(schedule) {

    const id =
        schedule.id ||
        schedule.notificationId ||
        schedule.notificationID;


    const confirmed =
        window.confirm(
            `Delete "${schedule.title || "this schedule"}"?\n\nThis cannot be undone.`
        );


    if (!confirmed) {
        return;
    }


    try {

        await adminRequest(
            ADMIN_CONFIG.SCHEDULES_URL,
            {
                method:
                    "POST",

                body: {

                    action:
                        "deleteNotification",

                    id:
                        id

                }

            }
        );


        showToast(
            "success",
            "Schedule deleted",
            "The notification schedule has been removed."
        );


        await Promise.allSettled([
            loadSchedules(),
            refreshStatus()
        ]);

    }
    catch (error) {

        console.error(
            "[Admin Delete Schedule]",
            error
        );


        showToast(
            "error",
            "Delete failed",
            error.message
        );

    }

}


/* ============================================================
   EDIT SCHEDULE
============================================================ */

function startScheduleEdit(schedule) {

    editingScheduleId =
        schedule.id ||
        schedule.notificationId ||
        schedule.notificationID;


    $("scheduleTitle").value =
        schedule.title ||
        "";


    $("scheduleMessage").value =
        schedule.message ||
        schedule.body ||
        "";


    $("scheduleType").value =
        schedule.type ||
        "once";


    $("scheduleUrl").value =
        schedule.url ||
        "/";


    $("scheduleDate").value =
        normalizeDateInput(
            schedule.date
        );


    $("scheduleDay").value =
        schedule.day ||
        "Sunday";


    $("scheduleTime").value =
        normalizeTimeInput(
            schedule.time
        ) ||
        "18:00";


    $("scheduleTag").value =
        schedule.tag ||
        "";


    $("scheduleSubmitButton").innerHTML =
        `
        <i class="fa-solid fa-floppy-disk"></i>
        <span>Save changes</span>
        `;


    $("cancelScheduleEdit")
        .classList.remove(
            "hidden"
        );


    updateScheduleBodyCount();

    updateScheduleFields();


    $("scheduleForm")
        .scrollIntoView({
            behavior:
                "smooth",

            block:
                "start"
        });

}


/* ============================================================
   CANCEL EDIT
============================================================ */

function cancelScheduleEdit() {

    resetScheduleForm();

}


function resetScheduleForm() {

    editingScheduleId =
        null;


    $("scheduleForm")
        ?.reset();


    $("scheduleType").value =
        "once";


    $("scheduleUrl").value =
        "/";


    $("scheduleDay").value =
        "Sunday";


    $("scheduleTime").value =
        "18:00";


    $("scheduleSubmitButton").innerHTML =
        `
        <i class="fa-solid fa-calendar-plus"></i>
        <span>Add schedule</span>
        `;


    $("cancelScheduleEdit")
        ?.classList.add(
            "hidden"
        );


    updateScheduleBodyCount();

    updateScheduleFields();

}


/* ============================================================
   SCHEDULE LOADING
============================================================ */

function setScheduleLoading(
    loading
) {

    const button =
        $("scheduleSubmitButton");


    if (!button) {
        return;
    }


    button.disabled =
        loading;


    if (loading) {

        button.innerHTML =
            `
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Saving...</span>
            `;

        return;

    }


    button.innerHTML =
        editingScheduleId
            ? `
                <i class="fa-solid fa-floppy-disk"></i>
                <span>Save changes</span>
              `
            : `
                <i class="fa-solid fa-calendar-plus"></i>
                <span>Add schedule</span>
              `;

}


/* ============================================================
   HISTORY
============================================================ */

async function loadHistory() {

    if (!adminSecret) {
        return;
    }


    const list =
        $("historyList");


    if (!list) {
        return;
    }


    list.innerHTML =
        createEmptyState(
            "fa-solid fa-spinner fa-spin",
            "Loading notification history",
            ""
        );


    try {

        const result =
            await adminRequest(
                ADMIN_CONFIG.HISTORY_URL,
                {
                    method:
                        "GET"
                }
            );


        currentHistory =
            Array.isArray(result.history)
                ? result.history
                : Array.isArray(result.logs)
                    ? result.logs
                    : Array.isArray(result.data)
                        ? result.data
                        : [];


        renderHistory();

    }
    catch (error) {

        console.error(
            "[Admin History]",
            error
        );


        list.innerHTML =
            createEmptyState(
                "fa-solid fa-triangle-exclamation",
                "Unable to load history",
                error.message
            );

    }

}


/* ============================================================
   RENDER HISTORY
============================================================ */

function renderHistory() {

    const list =
        $("historyList");


    if (!currentHistory.length) {

        list.innerHTML =
            createEmptyState(
                "fa-solid fa-clock-rotate-left",
                "No notification history yet",
                "Notifications sent by the system will appear here."
            );

        return;

    }


    list.innerHTML =
        currentHistory
            .map(
                renderHistoryItem
            )
            .join("");

}


function renderHistoryItem(item) {

    const title =
        item.title ||
        ADMIN_CONFIG.DEFAULT_TITLE;


    const type =
        item.type ||
        "notification";


    const sent =
        Number(
            item.sent ??
            item.success ??
            item.successCount ??
            0
        );


    const failed =
        Number(
            item.failed ??
            item.failure ??
            item.failureCount ??
            0
        );


    const status =
        String(
            item.status ||
            ""
        ).toLowerCase();


    let statusClass =
        "history-success";


    let statusText =
        "Sent";


    if (
        failed > 0 &&
        sent > 0
    ) {

        statusClass =
            "history-mixed";

        statusText =
            "Partial";

    }
    else if (
        failed > 0 ||
        status === "failed"
    ) {

        statusClass =
            "history-failed";

        statusText =
            "Failed";

    }


    const date =
        item.sentAt ||
        item.sent_at ||
        item.date ||
        item.timestamp ||
        "";


    const message =
        item.message ||
        "";


    return `

        <article class="history-item">

            <div>

                <strong class="history-title">
                    ${escapeHtml(title)}
                </strong>


                <div class="history-meta">

                    <span>
                        <i class="fa-solid fa-tag"></i>
                        ${escapeHtml(
                            formatType(type)
                        )}
                    </span>

                    ${
                        date
                            ? `
                                <span>
                                    <i class="fa-solid fa-clock"></i>
                                    ${escapeHtml(
                                        formatDateTime(date)
                                    )}
                                </span>
                              `
                            : ""
                    }

                    ${
                        message
                            ? `
                                <span>
                                    ${escapeHtml(message)}
                                </span>
                              `
                            : ""
                    }

                </div>

            </div>


            <div class="history-status">

                <strong class="${statusClass}">
                    ${escapeHtml(statusText)}
                </strong>

                <span>
                    ${sent} sent
                    ${failed ? ` · ${failed} failed` : ""}
                </span>

            </div>

        </article>

    `;

}


/* ============================================================
   RUN SCHEDULER
============================================================ */

async function runScheduler() {

    if (!adminSecret) {

        logoutAdmin();

        return;

    }


    const confirmed =
        window.confirm(
            "Run the notification scheduler now?\n\nThe scheduler will check all active schedules that are currently due."
        );


    if (!confirmed) {
        return;
    }


    const button =
        $("runSchedulerButton");


    const original =
        button.innerHTML;


    button.disabled =
        true;


    button.innerHTML =
        `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Running...
        `;


    try {

        const result =
            await adminRequest(
                ADMIN_CONFIG.RUN_URL,
                {
                    method:
                        "POST",

                    body:
                        {
                            action:
                                "runNotificationScheduler"
                        }
                }
            );


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


        const processed =
            Number(
                result.processed ??
                result.processedCount ??
                0
            );


        showToast(
            "success",
            "Scheduler completed",
            `${processed} processed · ${sent} sent${failed ? ` · ${failed} failed` : ""}.`
        );


        await Promise.allSettled([
            loadSchedules(),
            loadHistory(),
            refreshStatus()
        ]);

    }
    catch (error) {

        console.error(
            "[Admin Scheduler]",
            error
        );


        showToast(
            "error",
            "Scheduler failed",
            error.message
        );

    }
    finally {

        button.disabled =
            false;

        button.innerHTML =
            original;

    }

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


    currentSchedules =
        [];

    currentHistory =
        [];

    editingScheduleId =
        null;


    sessionStorage.removeItem(
        ADMIN_CONFIG.SESSION_KEY
    );


    $("adminScreen")
        ?.classList.add("hidden");


    $("loginScreen")
        ?.classList.remove("hidden");


    if ($("adminSecret")) {

        $("adminSecret").value =
            "";

    }


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
                : type === "warning"
                    ? "fa-triangle-exclamation"
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

function formatNumber(value) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-NG"
    );

}


function escapeHtml(value) {

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


function isTruthy(value) {

    if (
        value === true ||
        value === 1
    ) {
        return true;
    }


    const normalized =
        String(
            value ?? ""
        )
        .trim()
        .toLowerCase();


    return [
        "true",
        "1",
        "yes",
        "active",
        "enabled"
    ].includes(
        normalized
    );

}


function formatType(type) {

    const labels = {

        once:
            "One-time",

        weekly:
            "Weekly",

        birthday:
            "Birthday",

        new_lesson:
            "New lesson",

        new_quiz:
            "New quiz",

        programme:
            "Programme",

        announcement:
            "Announcement"

    };


    return labels[type] ||
        String(type || "Notification")
            .replace(
                /_/g,
                " "
            );

}


function formatDate(value) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);

    }


    return date.toLocaleDateString(
        "en-NG",
        {
            dateStyle:
                "medium"
        }
    );

}


function formatDateTime(value) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);

    }


    return date.toLocaleString(
        "en-NG",
        {
            dateStyle:
                "medium",

            timeStyle:
                "short"
        }
    );

}


function normalizeDateInput(value) {

    if (!value) {
        return "";
    }


    const text =
        String(value);


    if (
        /^\d{4}-\d{2}-\d{2}$/.test(
            text
        )
    ) {

        return text;

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}


function normalizeTimeInput(value) {

    if (!value) {
        return "";
    }


    const text =
        String(value)
            .trim();


    const match =
        text.match(
            /^(\d{1,2}):(\d{2})/
        );


    if (!match) {
        return "";
    }


    return (
        String(
            Number(
                match[1]
            )
        ).padStart(
            2,
            "0"
        )
        +
        ":" +
        match[2]
    );

}


function createEmptyState(
    icon,
    title,
    message
) {

    return `

        <div class="empty-state">

            <i class="${escapeHtml(icon)}"></i>

            <strong>
                ${escapeHtml(title)}
            </strong>

            ${
                message
                    ? `
                        <span>
                            ${escapeHtml(message)}
                        </span>
                      `
                    : ""
            }

        </div>

    `;

}
