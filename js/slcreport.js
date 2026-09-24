"use strict";

/**
 * ============================================================
 * AFC ISIU YOUTH PORTAL V2
 * FILE: slcreport.js
 * PURPOSE: SLC COORDINATOR WEEKLY REPORT
 * ============================================================
 *
 * SESSION BEHAVIOUR:
 * - Login is remembered across page refreshes.
 * - Login is remembered even after closing/reopening the page.
 * - Only the Logout button removes the saved session.
 * - sessionStorage is NOT used for coordinator login.
 * ============================================================
 */


/* ============================================================
   CONFIGURATION
   ============================================================ */

const APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";

/*
 * IMPORTANT:
 * This must remain localStorage.
 *
 * sessionStorage is cleared when the page/tab session ends
 * and can cause the login screen to appear again.
 *
 * localStorage keeps the login session until Logout is clicked.
 */
const SESSION_KEY = "afc_isiu_slc_leader_session";

const COORDINATOR_NAME = "Olajimbiti Molayo";


/* ============================================================
   SESSION STATE
   ============================================================ */

let sessionToken = "";
let currentLessonLoaded = null;

let deadlineInfo = {
    isOpen: true,
    deadline: null
};


/* ============================================================
   DOM READY
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {

    setupLogin();
    setupLogout();
    setupForm();
    setDefaultDates();
    setCoordinatorName();

    /*
     * Restore the coordinator session immediately.
     *
     * This is intentionally called AFTER the page elements
     * have loaded so showReportScreen() can safely update
     * the interface.
     */
    restoreSession();

});


/* ============================================================
   APPS SCRIPT API
   ============================================================ */

async function callAppsScript(payload) {

    try {

        const response = await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
            },
            body: "payload=" + encodeURIComponent(JSON.stringify(payload))
        });

        if (!response.ok) {
            throw new Error("Server returned HTTP " + response.status);
        }

        const text = await response.text();

        let result;

        try {
            result = JSON.parse(text);
        } catch (parseError) {
            console.error("Invalid Apps Script response:", text);
            throw new Error("Invalid response received from server.");
        }

        return result;

    } catch (error) {

        console.error("Apps Script request failed:", error);

        throw error;
    }
}


/* ============================================================
   LOGIN
   ============================================================ */

function setupLogin() {

    const loginForm = document.getElementById("loginForm");

    if (!loginForm) {
        return;
    }

    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const usernameInput = document.getElementById("username");
        const passwordInput = document.getElementById("password");
        const loginButton = document.getElementById("loginButton");
        const loginMessage = document.getElementById("loginMessage");

        const username = usernameInput
            ? usernameInput.value.trim()
            : "";

        const password = passwordInput
            ? passwordInput.value
            : "";

        if (!username || !password) {

            showLoginMessage(
                "Please enter your username and password.",
                "error"
            );

            return;
        }

        if (loginButton) {
            loginButton.disabled = true;
            loginButton.dataset.originalText =
                loginButton.textContent;
            loginButton.textContent = "Signing in...";
        }

        if (loginMessage) {
            loginMessage.textContent = "";
            loginMessage.className = "";
        }

        try {

            const result = await callAppsScript({
                action: "login",
                username: username,
                password: password
            });

            console.log("Login response:", result);

            if (!result || !result.success) {

                showLoginMessage(
                    result && result.message
                        ? result.message
                        : "Login failed. Please check your details.",
                    "error"
                );

                return;
            }

            /*
             * Save the token in memory.
             */
            sessionToken = result.token || "";

            /*
             * IMPORTANT:
             *
             * Save the complete login session in localStorage.
             *
             * This is what makes refresh safe.
             *
             * Do NOT change this back to sessionStorage.
             */
            const sessionData = {
                token: result.token || "",
                user: result.user || null,
                role: result.role || null,
                savedAt: Date.now()
            };

            localStorage.setItem(
                SESSION_KEY,
                JSON.stringify(sessionData)
            );

            /*
             * Confirm that the browser actually saved it.
             */
            const savedSession =
                localStorage.getItem(SESSION_KEY);

            if (!savedSession) {

                console.error(
                    "Login succeeded, but the browser could not save the session."
                );

                showLoginMessage(
                    "Login succeeded, but your session could not be saved. Please try again.",
                    "error"
                );

                sessionToken = "";
                return;
            }

            showReportScreen();

            /*
             * Load the current lesson/report information
             * after the coordinator has been authenticated.
             */
            await loadExistingReportForLesson();

        } catch (error) {

            console.error("Login error:", error);

            showLoginMessage(
                error.message ||
                "Something went wrong while logging in. Please try again.",
                "error"
            );

        } finally {

            if (loginButton) {

                loginButton.disabled = false;

                loginButton.textContent =
                    loginButton.dataset.originalText ||
                    "Login";
            }
        }

    });

}


/* ============================================================
   LOGIN MESSAGE
   ============================================================ */

function showLoginMessage(message, type) {

    const loginMessage =
        document.getElementById("loginMessage");

    if (!loginMessage) {
        return;
    }

    loginMessage.textContent = message;

    loginMessage.className =
        type === "error"
            ? "error"
            : type === "success"
                ? "success"
                : "";
}


/* ============================================================
   RESTORE SESSION
   ============================================================ */

function restoreSession() {

    console.log("Checking for saved SLC coordinator session...");

    /*
     * IMPORTANT:
     * Read from localStorage, NOT sessionStorage.
     */
    const saved = localStorage.getItem(SESSION_KEY);

    /*
     * No saved session means the coordinator has never logged in
     * on this browser, or has explicitly logged out.
     */
    if (!saved) {

        console.log("No saved SLC coordinator session found.");

        showLoginScreen();

        return;
    }

    let parsed;

    try {

        parsed = JSON.parse(saved);

    } catch (error) {

        console.error(
            "Saved SLC session could not be read:",
            error
        );

        /*
         * Only remove the item because it is corrupted.
         */
        localStorage.removeItem(SESSION_KEY);

        sessionToken = "";

        showLoginScreen();

        return;
    }

    /*
     * A valid saved session must contain a token.
     */
    if (!parsed || !parsed.token) {

        console.warn(
            "Saved SLC session does not contain a valid token."
        );

        localStorage.removeItem(SESSION_KEY);

        sessionToken = "";

        showLoginScreen();

        return;
    }

    /*
     * Restore the token into memory.
     */
    sessionToken = parsed.token;

    console.log("Saved SLC coordinator session restored.");

    /*
     * IMPORTANT:
     *
     * Do NOT show the login page first and then switch to the
     * report page.
     *
     * Go directly to the authenticated report screen.
     */
    showReportScreen();

    /*
     * Restore the report data for the current lesson.
     */
    loadExistingReportForLesson().catch(function (error) {

        console.error(
            "Could not restore existing report after login:",
            error
        );

    });

}


/* ============================================================
   LOGOUT
   ============================================================ */

function setupLogout() {

    const logoutButton =
        document.getElementById("logoutButton");

    if (!logoutButton) {
        return;
    }

    logoutButton.addEventListener("click", function (event) {

        event.preventDefault();

        /*
         * THIS is the ONLY normal action that should remove
         * the saved coordinator login.
         */
        localStorage.removeItem(SESSION_KEY);

        /*
         * Clear the in-memory token as well.
         */
        sessionToken = "";

        currentLessonLoaded = null;

        /*
         * Return to login screen.
         */
        showLoginScreen();

        /*
         * Reset login form.
         */
        const loginForm =
            document.getElementById("loginForm");

        if (loginForm) {
            loginForm.reset();
        }

        showLoginMessage("", "");

        /*
         * Reset dates/coordinator display if required.
         */
        setDefaultDates();
        setCoordinatorName();

        console.log("SLC coordinator logged out.");

    });

}


/* ============================================================
   SHOW LOGIN SCREEN
   ============================================================ */

function showLoginScreen() {

    const loginScreen =
        document.getElementById("loginScreen");

    const reportScreen =
        document.getElementById("reportScreen");

    if (loginScreen) {
        loginScreen.style.display = "";
    }

    if (reportScreen) {
        reportScreen.style.display = "none";
    }

}


/* ============================================================
   SHOW REPORT SCREEN
   ============================================================ */

function showReportScreen() {

    const loginScreen =
        document.getElementById("loginScreen");

    const reportScreen =
        document.getElementById("reportScreen");

    if (loginScreen) {
        loginScreen.style.display = "none";
    }

    if (reportScreen) {
        reportScreen.style.display = "";
    }

}


/* ============================================================
   COORDINATOR NAME
   ============================================================ */

function setCoordinatorName() {

    const coordinatorFields = document.querySelectorAll(
        '[data-coordinator], #coordinator, #coordinatorName'
    );

    coordinatorFields.forEach(function (field) {

        if (
            field.tagName === "INPUT" ||
            field.tagName === "TEXTAREA"
        ) {

            field.value = COORDINATOR_NAME;

            /*
             * Coordinator is fixed for this report page.
             */
            field.readOnly = true;

        } else {

            field.textContent = COORDINATOR_NAME;

        }

    });

}


/* ============================================================
   FORM SETUP
   ============================================================ */

function setupForm() {

    const form =
        document.getElementById("slcReportForm");

    if (!form) {
        return;
    }

    const totalMembers =
        document.getElementById("totalMembers");

    const participated =
        document.getElementById("participated");

    if (totalMembers) {

        totalMembers.addEventListener(
            "input",
            calculateParticipation
        );

    }

    if (participated) {

        participated.addEventListener(
            "input",
            calculateParticipation
        );

    }

    const lessonNo =
        document.getElementById("lessonNo");

    if (lessonNo) {

        lessonNo.addEventListener(
            "blur",
            function () {

                loadExistingReportForLesson();

            }
        );

    }

    form.addEventListener("submit", submitReport);

}


/* ============================================================
   DEFAULT DATES
   ============================================================ */

function setDefaultDates() {

    const today = new Date();

    const dateString =
        today.toISOString().split("T")[0];

    const reportDate =
        document.getElementById("reportDate");

    if (
        reportDate &&
        !reportDate.value
    ) {

        reportDate.value = dateString;

    }

}


/* ============================================================
   PARTICIPATION CALCULATION
   ============================================================ */

function calculateParticipation() {

    const totalInput =
        document.getElementById("totalMembers");

    const participatedInput =
        document.getElementById("participated");

    const yetToParticipateInput =
        document.getElementById("yetToParticipate");

    const percentageInput =
        document.getElementById("participationPercentage");

    const total =
        Number(totalInput ? totalInput.value : 0);

    const participated =
        Number(
            participatedInput
                ? participatedInput.value
                : 0
        );

    const yetToParticipate =
        Math.max(total - participated, 0);

    const percentage =
        total > 0
            ? (participated / total) * 100
            : 0;

    if (yetToParticipateInput) {

        yetToParticipateInput.value =
            yetToParticipate;

    }

    if (percentageInput) {

        percentageInput.value =
            percentage.toFixed(1) + "%";

    }

}


/* ============================================================
   LOAD EXISTING REPORT
   ============================================================ */

async function loadExistingReportForLesson() {

    if (!sessionToken) {
        return;
    }

    const lessonNoInput =
        document.getElementById("lessonNo");

    if (!lessonNoInput) {
        return;
    }

    const lessonNo =
        lessonNoInput.value.trim();

    if (!lessonNo) {
        return;
    }

    /*
     * Avoid unnecessary duplicate requests for the same lesson.
     */
    if (currentLessonLoaded === lessonNo) {
        return;
    }

    try {

        const result = await callAppsScript({
            action: "getMySLCReport",
            token: sessionToken,
            lessonNo: lessonNo
        });

        console.log(
            "Existing SLC report:",
            result
        );

        if (!result || !result.success) {

            /*
             * If the backend specifically tells us that the
             * session is invalid, then the saved token can no
             * longer be used.
             */
            if (
                result &&
                (
                    result.code === "INVALID_TOKEN" ||
                    result.code === "UNAUTHORIZED" ||
                    result.code === "AUTH_REQUIRED"
                )
            ) {

                handleExpiredSession();

                return;
            }

            return;
        }

        currentLessonLoaded = lessonNo;

        if (result.report) {

            fillExistingReport(result.report);

        }

        if (result.deadline) {

            deadlineInfo.deadline =
                result.deadline;

        }

        if (
            typeof result.isOpen !== "undefined"
        ) {

            deadlineInfo.isOpen =
                result.isOpen;

        }

        updateDeadlineUI();

    } catch (error) {

        console.error(
            "Error loading existing report:",
            error
        );

    }

}


/* ============================================================
   HANDLE EXPIRED SESSION
   ============================================================ */

function handleExpiredSession() {

    /*
     * This is different from a page refresh.
     *
     * We only clear localStorage if the server has actually
     * rejected the saved token.
     */
    localStorage.removeItem(SESSION_KEY);

    sessionToken = "";

    currentLessonLoaded = null;

    showLoginScreen();

    showLoginMessage(
        "Your login session has expired. Please log in again.",
        "error"
    );

}


/* ============================================================
   FILL EXISTING REPORT
   ============================================================ */

function fillExistingReport(report) {

    if (!report) {
        return;
    }

    const fields = [
        "reportDate",
        "lessonNo",
        "totalMembers",
        "participated",
        "supportGiven",
        "observations"
    ];

    fields.forEach(function (fieldName) {

        const element =
            document.getElementById(fieldName);

        if (
            element &&
            typeof report[fieldName] !== "undefined"
        ) {

            element.value =
                report[fieldName];

        }

    });

    calculateParticipation();

    /*
     * Non-participants
     */
    if (
        Array.isArray(report.nonParticipants)
    ) {

        const container =
            document.getElementById(
                "nonParticipantsContainer"
            );

        if (container) {

            container.innerHTML = "";

            report.nonParticipants.forEach(
                function (person) {

                    addNonParticipantRow(person);

                }
            );

        }

    }

    /*
     * Contacted table
     */
    if (
        Array.isArray(report.contactedTable)
    ) {

        const container =
            document.getElementById(
                "contactedTableBody"
            );

        if (container) {

            container.innerHTML = "";

            report.contactedTable.forEach(
                function (person) {

                    addContactedRow(person);

                }
            );

        }

    }

}


/* ============================================================
   NON-PARTICIPANT ROW
   ============================================================ */

function addNonParticipantRow(person) {

    const container =
        document.getElementById(
            "nonParticipantsContainer"
        );

    if (!container) {
        return;
    }

    const row =
        document.createElement("div");

    row.className = "non-participant-row";

    const name =
        typeof person === "string"
            ? person
            : person.name || "";

    row.innerHTML = `
        <input
            type="text"
            name="nonParticipantName"
            value="${escapeHtmlAttribute(name)}"
            placeholder="Member name"
        >
    `;

    container.appendChild(row);

}


/* ============================================================
   CONTACTED ROW
   ============================================================ */

function addContactedRow(person) {

    const tbody =
        document.getElementById(
            "contactedTableBody"
        );

    if (!tbody) {
        return;
    }

    const row =
        document.createElement("tr");

    const name =
        person && person.name
            ? person.name
            : "";

    const contacted =
        person && person.contacted
            ? person.contacted
            : "";

    const response =
        person && person.response
            ? person.response
            : "";

    row.innerHTML = `
        <td>
            <input
                type="text"
                value="${escapeHtmlAttribute(name)}"
                name="contactedName"
            >
        </td>

        <td>
            <input
                type="text"
                value="${escapeHtmlAttribute(contacted)}"
                name="contactedMethod"
            >
        </td>

        <td>
            <input
                type="text"
                value="${escapeHtmlAttribute(response)}"
                name="contactedResponse"
            >
        </td>
    `;

    tbody.appendChild(row);

}


/* ============================================================
   SUBMIT REPORT
   ============================================================ */

async function submitReport(event) {

    event.preventDefault();

    if (!sessionToken) {

        showLoginScreen();

        showLoginMessage(
            "Please log in before submitting your report.",
            "error"
        );

        return;
    }

    if (!deadlineInfo.isOpen) {

        showReportMessage(
            "The SLC report submission period has closed.",
            "error"
        );

        return;
    }

    const submitButton =
        document.getElementById("submitReportButton");

    if (submitButton) {

        submitButton.disabled = true;

        submitButton.dataset.originalText =
            submitButton.textContent;

        submitButton.textContent =
            "Submitting...";

    }

    try {

        const report = collectReportData();

        const result = await callAppsScript({
            action: "submitSLCReport",
            token: sessionToken,
            lessonNo: report.lessonNo,
            reportDate: report.reportDate,
            totalMembers: report.totalMembers,
            participated: report.participated,
            nonParticipants: report.nonParticipants,
            contactedTable: report.contactedTable,
            supportGiven: report.supportGiven,
            observations: report.observations,
            coordinator: COORDINATOR_NAME,
            note: report.note
        });

        console.log(
            "Submit report response:",
            result
        );

        if (!result || !result.success) {

            if (
                result &&
                (
                    result.code === "INVALID_TOKEN" ||
                    result.code === "UNAUTHORIZED" ||
                    result.code === "AUTH_REQUIRED"
                )
            ) {

                handleExpiredSession();

                return;
            }

            showReportMessage(
                result && result.message
                    ? result.message
                    : "Unable to submit report.",
                "error"
            );

            return;
        }

        showReportMessage(
            result.message ||
            "SLC report submitted successfully.",
            "success"
        );

        currentLessonLoaded =
            report.lessonNo;

    } catch (error) {

        console.error(
            "Submit report error:",
            error
        );

        showReportMessage(
            error.message ||
            "Something went wrong while submitting the report.",
            "error"
        );

    } finally {

        if (submitButton) {

            submitButton.disabled = false;

            submitButton.textContent =
                submitButton.dataset.originalText ||
                "Submit Report";

        }

    }

}


/* ============================================================
   COLLECT REPORT DATA
   ============================================================ */

function collectReportData() {

    const getValue = function (id) {

        const element =
            document.getElementById(id);

        return element
            ? element.value.trim()
            : "";

    };

    const totalMembers =
        Number(getValue("totalMembers")) || 0;

    const participated =
        Number(getValue("participated")) || 0;

    const nonParticipants = [];

    const nonParticipantInputs =
        document.querySelectorAll(
            'input[name="nonParticipantName"]'
        );

    nonParticipantInputs.forEach(
        function (input) {

            const name =
                input.value.trim();

            if (name) {

                nonParticipants.push({
                    name: name
                });

            }

        }
    );

    const contactedTable = [];

    const contactedRows =
        document.querySelectorAll(
            "#contactedTableBody tr"
        );

    contactedRows.forEach(
        function (row) {

            const inputs =
                row.querySelectorAll("input");

            if (!inputs.length) {
                return;
            }

            const name =
                inputs[0]
                    ? inputs[0].value.trim()
                    : "";

            const contacted =
                inputs[1]
                    ? inputs[1].value.trim()
                    : "";

            const response =
                inputs[2]
                    ? inputs[2].value.trim()
                    : "";

            if (name || contacted || response) {

                contactedTable.push({
                    name: name,
                    contacted: contacted,
                    response: response
                });

            }

        }
    );

    return {

        reportDate:
            getValue("reportDate"),

        lessonNo:
            getValue("lessonNo"),

        totalMembers:
            totalMembers,

        participated:
            participated,

        nonParticipants:
            nonParticipants,

        contactedTable:
            contactedTable,

        supportGiven:
            getValue("supportGiven"),

        observations:
            getValue("observations"),

        note:
            getValue("note")

    };

}


/* ============================================================
   REPORT MESSAGE
   ============================================================ */

function showReportMessage(message, type) {

    const element =
        document.getElementById("reportMessage");

    if (!element) {
        return;
    }

    element.textContent = message;

    element.className =
        type === "error"
            ? "error"
            : type === "success"
                ? "success"
                : "";

}


/* ============================================================
   DEADLINE UI
   ============================================================ */

function updateDeadlineUI() {

    const element =
        document.getElementById("deadlineMessage");

    if (!element) {
        return;
    }

    if (!deadlineInfo.isOpen) {

        element.textContent =
            deadlineInfo.deadline
                ? "Report submission is closed."
                : "Report submission is currently closed.";

        element.classList.add("closed");

        return;
    }

    element.classList.remove("closed");

    if (deadlineInfo.deadline) {

        element.textContent =
            "Submission deadline: " +
            formatDateTime(deadlineInfo.deadline);

    } else {

        element.textContent =
            "";

    }

}


/* ============================================================
   DATE/TIME FORMATTER
   ============================================================ */

function formatDateTime(value) {

    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString(
        "en-NG",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );

}


/* ============================================================
   HTML ESCAPE HELPERS
   ============================================================ */

function escapeHtmlAttribute(value) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}


/* ============================================================
   OPTIONAL GLOBAL HELPERS
   ============================================================
   These are kept available in case the HTML uses buttons
   with onclick handlers for adding rows.
   ============================================================ */

window.addNonParticipantRow =
    addNonParticipantRow;

window.addContactedRow =
    addContactedRow;

window.calculateParticipation =
    calculateParticipation;

window.submitReport =
    submitReport;
 
