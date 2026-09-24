"use strict";

/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: slcreport.js
   PURPOSE: SLC WEEKLY GROUP REPORT
   ============================================================ */


/* ============================================================
   CONFIG
   ============================================================ */

const APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";

const SESSION_KEY =
    "afc_isiu_slc_leader_session";

const COORDINATOR_NAME =
    "Olajimbiti Molayo";


/* ============================================================
   HELPERS
   ============================================================ */

const $ = (id) => document.getElementById(id);

let sessionToken = "";

let currentLessonLoaded = null;

let deadlineInfo = {
    isOpen: true,
    deadline: null
};


/* ============================================================
   INITIALISE
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {

    setupLogin();

    setupLogout();

    setupForm();

    setDefaultDates();

    setCoordinatorName();

    restoreSession();

});


/* ============================================================
   DEFAULT VALUES
   ============================================================ */

function setDefaultDates() {

    const today = new Date();

    if ($("reportDate")) {

        $("reportDate").valueAsDate = today;

    }

    if ($("coordinatorDate")) {

        $("coordinatorDate").valueAsDate = today;

    }

}


/* ============================================================
   COORDINATOR
   ============================================================ */

function setCoordinatorName() {

    const field = $("coordinatorName");

    if (!field) return;

    /*
     * The coordinator is intentionally fixed.
     * The user cannot edit this field.
     */

    field.value = COORDINATOR_NAME;

    field.readOnly = true;

}


/* ============================================================
   API HELPER
   ============================================================ */

async function callAppsScript(payload) {

    if (!APPS_SCRIPT_URL ||
        APPS_SCRIPT_URL.includes("PASTE_YOUR")) {

        throw new Error(
            "The Apps Script URL has not been configured yet."
        );

    }

    const form = new URLSearchParams();

    form.set(
        "payload",
        JSON.stringify(payload)
    );

    const response = await fetch(
        APPS_SCRIPT_URL,
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded;charset=UTF-8"
            },

            body: form.toString()
        }
    );

    if (!response.ok) {

        throw new Error(
            `Server error (${response.status}). Please try again.`
        );

    }

    const text = await response.text();

    let data;

    try {

        data = JSON.parse(text);

    } catch (error) {

        console.error(
            "Invalid Apps Script response:",
            text
        );

        throw new Error(
            "The server returned an invalid response."
        );

    }

    return data;

}


/* ============================================================
   LOGIN
   ============================================================ */

function setupLogin() {

    const form = $("loginForm");

    if (!form) return;

    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const username =
                $("loginUsername").value.trim();

            const password =
                $("loginPassword").value.trim();

            if (!username || !password) {

                showLoginError(
                    "Please enter your username and password."
                );

                return;

            }

            const button = $("loginButton");

            button.disabled = true;

            button.innerHTML =
                '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';

            hideLoginError();

            try {

                const result =
                    await callAppsScript({
                        action: "login",
                        username: username,
                        password: password
                    });

                if (!result.success) {

                    throw new Error(
                        result.message ||
                        result.error ||
                        "Login failed."
                    );

                }

                sessionToken =
                    result.token;

                /*
                 * IMPORTANT:
                 * Use localStorage instead of sessionStorage.
                 *
                 * This keeps the SLC report login available
                 * after the page is refreshed.
                 *
                 * The session is removed only when the user
                 * clicks the Logout button.
                 */

                localStorage.setItem(
                    SESSION_KEY,
                    JSON.stringify({
                        token: result.token,
                        user: result.user,
                        role: result.role
                    })
                );

                showReportScreen();

            } catch (error) {

                console.error(
                    "SLC report login error:",
                    error
                );

                showLoginError(
                    error.message ||
                    "Unable to log in right now."
                );

            } finally {

                button.disabled = false;

                button.innerHTML =
                    '<i class="fa-solid fa-arrow-right-to-bracket"></i> Log in';

            }

        }
    );

}


/* ============================================================
   LOGIN ERROR
   ============================================================ */

function showLoginError(message) {

    const errorBox = $("loginError");

    if (!errorBox) return;

    errorBox.textContent = message;

    errorBox.className =
        "report-banner error";

}

function hideLoginError() {

    const errorBox = $("loginError");

    if (!errorBox) return;

    errorBox.classList.add("hidden");

}


/* ============================================================
   RESTORE SESSION
   ============================================================ */

function restoreSession() {

    /*
     * IMPORTANT:
     * Read from localStorage so the session survives
     * a page refresh.
     */

    const saved =
        localStorage.getItem(SESSION_KEY);

    if (!saved) return;

    try {

        const parsed =
            JSON.parse(saved);

        if (!parsed.token) {

            localStorage.removeItem(
                SESSION_KEY
            );

            return;

        }

        sessionToken =
            parsed.token;

        showReportScreen();

    } catch (error) {

        console.error(
            "Unable to restore SLC report session:",
            error
        );

        localStorage.removeItem(
            SESSION_KEY
        );

    }

}


/* ============================================================
   SHOW REPORT SCREEN
   ============================================================ */

function showReportScreen() {

    $("loginScreen")
        .classList.add("hidden");

    $("reportScreen")
        .classList.remove("hidden");

    setDefaultDates();

    setCoordinatorName();

    renderNonParticipantFields(6);

    renderContactTable(1);

}


/* ============================================================
   LOGOUT
   ============================================================ */

function setupLogout() {

    const button =
        $("logoutButton");

    if (!button) return;

    button.addEventListener(
        "click",
        function () {

            sessionToken = "";

            currentLessonLoaded = null;

            /*
             * Explicit logout:
             * remove the persistent login session.
             */

            localStorage.removeItem(
                SESSION_KEY
            );

            $("reportScreen")
                .classList.add("hidden");

            $("loginScreen")
                .classList.remove("hidden");

            $("loginForm").reset();

            hideBanner();

            setDefaultDates();

            setCoordinatorName();

        }
    );

}


/* ============================================================
   FORM SETUP
   ============================================================ */

function setupForm() {

    const totalMembers =
        $("totalMembers");

    const participated =
        $("participated");

    const lessonNo =
        $("lessonNo");

    const form =
        $("reportForm");

    if (totalMembers) {

        totalMembers.addEventListener(
            "input",
            syncCalculations
        );

    }

    if (participated) {

        participated.addEventListener(
            "input",
            syncCalculations
        );

    }

    if (lessonNo) {

        lessonNo.addEventListener(
            "blur",
            loadExistingReportForLesson
        );

    }

    if (form) {

        form.addEventListener(
            "submit",
            submitReport
        );

    }

}


/* ============================================================
   NON-PARTICIPANT FIELDS
   ============================================================ */

function renderNonParticipantFields(count) {

    const container =
        $("nonParticipantsList");

    if (!container) return;

    container.innerHTML = "";

    for (
        let i = 1;
        i <= count;
        i++
    ) {

        const field =
            document.createElement("div");

        field.className =
            "report-name-field";

        field.innerHTML = `

            <span class="report-name-number">
                ${i}
            </span>

            <input
                type="text"
                id="nonParticipant${i}"
                class="nonParticipantInput"
                placeholder="Member's full name"
            >

        `;

        container.appendChild(
            field
        );

    }

}


/* ============================================================
   CONTACT TABLE
   ============================================================ */

function renderContactTable(rowCount) {

    const tbody =
        $("contactTableBody");

    if (!tbody) return;

    const existing =
        collectContactTable();

    tbody.innerHTML = "";

    const n =
        Math.max(
            1,
            Math.min(
                Number(rowCount) || 1,
                60
            )
        );

    for (
        let i = 1;
        i <= n;
        i++
    ) {

        const prior =
            existing[i - 1] || {
                name: "",
                contacted: "",
                reason: ""
            };

        const tr =
            document.createElement("tr");

        tr.innerHTML = `

            <td>
                ${i}
            </td>

            <td>

                <input
                    type="text"
                    class="contactName"
                    value="${escapeAttr(prior.name)}"
                    placeholder="Member name"
                >

            </td>

            <td>

                <select class="contactStatus">

                    <option value="">
                        --
                    </option>

                    <option
                        value="Yes"
                        ${prior.contacted === "Yes" ? "selected" : ""}
                    >
                        Yes
                    </option>

                    <option
                        value="No"
                        ${prior.contacted === "No" ? "selected" : ""}
                    >
                        No
                    </option>

                </select>

            </td>

            <td>

                <input
                    type="text"
                    class="contactReason"
                    value="${escapeAttr(prior.reason)}"
                    placeholder="Reason / response"
                >

            </td>

        `;

        tbody.appendChild(
            tr
        );

    }

}


/* ============================================================
   COLLECT CONTACT TABLE
   ============================================================ */

function collectContactTable() {

    const rows = [];

    document
        .querySelectorAll(
            "#contactTableBody tr"
        )
        .forEach(function (tr) {

            rows.push({

                name:
                    tr.querySelector(
                        ".contactName"
                    )?.value.trim() || "",

                contacted:
                    tr.querySelector(
                        ".contactStatus"
                    )?.value || "",

                reason:
                    tr.querySelector(
                        ".contactReason"
                    )?.value.trim() || ""

            });

        });

    return rows;

}


/* ============================================================
   ESCAPE HTML ATTRIBUTE
   ============================================================ */

function escapeAttr(value) {

    return String(
        value ?? ""
    )
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

}


/* ============================================================
   CALCULATIONS
   ============================================================ */

function syncCalculations() {

    const total =
        Math.max(
            Number(
                $("totalMembers").value
            ) || 0,
            0
        );

    let participated =
        Math.max(
            Number(
                $("participated").value
            ) || 0,
            0
        );

    /*
     * Participated should never exceed total members.
     */

    if (
        total > 0 &&
        participated > total
    ) {

        participated = total;

        $("participated").value =
            total;

    }

    const notParticipated =
        Math.max(
            total - participated,
            0
        );

    $("notParticipated").value =
        notParticipated;

    if (total > 0) {

        renderContactTable(
            total
        );

    } else {

        renderContactTable(
            1
        );

    }

}


/* ============================================================
   LOAD EXISTING REPORT
   ============================================================ */

async function loadExistingReportForLesson() {

    const lessonNo =
        $("lessonNo").value.trim();

    if (
        !lessonNo ||
        lessonNo === currentLessonLoaded
    ) {

        return;

    }

    currentLessonLoaded =
        lessonNo;

    try {

        const result =
            await callAppsScript({
                action: "getMySLCReport",
                token: sessionToken,
                lessonNo: lessonNo
            });

        if (!result.success) {

            showBanner(
                "error",
                result.message ||
                "Unable to check existing report."
            );

            return;

        }

        deadlineInfo = {

            isOpen:
                result.isOpen !== false,

            deadline:
                result.deadline || null

        };

        applyDeadlineState();

        if (
            result.exists &&
            result.report
        ) {

            fillFormFromReport(
                result.report
            );

            showBanner(
                "warn",
                `You already submitted a report for Lesson ${lessonNo} (version ${result.report.version}). Editing will save a new version.`
            );

        } else {

            hideBanner();

        }

    } catch (error) {

        console.error(
            "Load report error:",
            error
        );

        showBanner(
            "error",
            error.message ||
            "Unable to check existing report."
        );

    }

}


/* ============================================================
   DEADLINE STATE
   ============================================================ */

function applyDeadlineState() {

    const submitButton =
        $("submitButton");

    if (!submitButton) return;

    if (!deadlineInfo.isOpen) {

        submitButton.disabled =
            true;

        submitButton.innerHTML =
            '<i class="fa-solid fa-lock"></i><span>Deadline Passed — Editing Closed</span>';

        showBanner(
            "error",
            `The deadline for this lesson's report has passed${
                deadlineInfo.deadline
                    ? " (" +
                      new Date(
                          deadlineInfo.deadline
                      ).toLocaleString() +
                      ")"
                    : ""
            }.`
        );

    } else {

        submitButton.disabled =
            false;

        submitButton.innerHTML =
            '<i class="fa-solid fa-paper-plane"></i><span>Submit Report</span>';

    }

}


/* ============================================================
   FILL FORM FROM EXISTING REPORT
   ============================================================ */

function fillFormFromReport(report) {

    $("reportDate").value =
        report.reportDate ||
        $("reportDate").value;

    $("groupName").value =
        report.groupName || "";

    $("groupLeaderName").value =
        report.groupLeaderName || "";

    $("totalMembers").value =
        report.totalMembers ?? 0;

    $("participated").value =
        report.participated ?? 0;

    $("notParticipated").value =
        report.notParticipated ?? 0;


    /* --------------------------------------------------------
       NON PARTICIPANTS
       -------------------------------------------------------- */

    renderNonParticipantFields(6);

    (
        report.nonParticipants ||
        []
    ).forEach(
        function (name, index) {

            const input =
                $("nonParticipant" + (
                    index + 1
                ));

            if (input) {

                input.value =
                    name || "";

            }

        }
    );


    /* --------------------------------------------------------
       CONTACT TABLE
       -------------------------------------------------------- */

    const total =
        Math.max(
            Number(
                report.totalMembers
            ) || 1,
            1
        );

    renderContactTable(
        total
    );

    const rows =
        document.querySelectorAll(
            "#contactTableBody tr"
        );

    (
        report.contactedTable ||
        []
    ).forEach(
        function (entry, index) {

            const tr =
                rows[index];

            if (!tr) return;

            const name =
                tr.querySelector(
                    ".contactName"
                );

            const status =
                tr.querySelector(
                    ".contactStatus"
                );

            const reason =
                tr.querySelector(
                    ".contactReason"
                );

            if (name) {

                name.value =
                    entry.name || "";

            }

            if (status) {

                status.value =
                    entry.contacted || "";

            }

            if (reason) {

                reason.value =
                    entry.reason || "";

            }

        }
    );


    /* --------------------------------------------------------
       SUPPORT
       -------------------------------------------------------- */

    document
        .querySelectorAll(
            ".supportCheck"
        )
        .forEach(
            function (box) {

                box.checked =
                    (
                        report.supportGiven ||
                        []
                    ).includes(
                        box.value
                    );

            }
        );


    $("otherSupport").value =
        report.otherSupport || "";

    $("observations").value =
        report.observations || "";


    /* --------------------------------------------------------
       COORDINATOR
       -------------------------------------------------------- */

    /*
     * Do not trust or allow the stored coordinator name
     * to overwrite the fixed coordinator.
     */

    setCoordinatorName();

    if (
        report.coordinatorDate
    ) {

        const coordinatorDate =
            new Date(
                report.coordinatorDate
            );

        if (
            !Number.isNaN(
                coordinatorDate.getTime()
            )
        ) {

            $("coordinatorDate")
                .valueAsDate =
                coordinatorDate;

        }

    }

    $("note").value =
        report.note || "";

}


/* ============================================================
   SUBMIT REPORT
   ============================================================ */

async function submitReport(event) {

    event.preventDefault();

    if (!deadlineInfo.isOpen) {

        showBanner(
            "error",
            "The deadline for this lesson's report has passed."
        );

        return;

    }


    const lessonNo =
        $("lessonNo").value.trim();

    if (!lessonNo) {

        showBanner(
            "error",
            "Please enter the lesson number."
        );

        $("lessonNo").focus();

        return;

    }


    const totalMembers =
        Math.max(
            Number(
                $("totalMembers").value
            ) || 0,
            0
        );

    const participated =
        Math.min(
            Math.max(
                Number(
                    $("participated").value
                ) || 0,
                0
            ),
            totalMembers
        );


    /*
     * Keep the calculated value authoritative on the frontend.
     */

    const notParticipated =
        Math.max(
            totalMembers -
            participated,
            0
        );

    $("notParticipated").value =
        notParticipated;


    /* --------------------------------------------------------
       NON PARTICIPANTS
       -------------------------------------------------------- */

    const nonParticipants = [];

    document
        .querySelectorAll(
            ".nonParticipantInput"
        )
        .forEach(
            function (input) {

                const value =
                    input.value.trim();

                if (value) {

                    nonParticipants.push(
                        value
                    );

                }

            }
        );


    /* --------------------------------------------------------
       SUPPORT
       -------------------------------------------------------- */

    const supportGiven = [];

    document
        .querySelectorAll(
            ".supportCheck:checked"
        )
        .forEach(
            function (box) {

                supportGiven.push(
                    box.value
                );

            }
        );


    /* --------------------------------------------------------
       COORDINATOR
       -------------------------------------------------------- */

    /*
     * Always use the fixed coordinator constant.
     * This prevents accidental editing through the browser.
     */

    setCoordinatorName();


    /* --------------------------------------------------------
       PAYLOAD
       -------------------------------------------------------- */

    const payload = {

        action:
            "submitSLCReport",

        token:
            sessionToken,

        lessonNo:
            lessonNo,

        reportDate:
            $("reportDate").value,

        groupName:
            $("groupName").value.trim(),

        groupLeaderName:
            $("groupLeaderName").value.trim(),

        totalMembers:
            String(totalMembers),

        participated:
            String(participated),

        notParticipated:
            String(notParticipated),

        nonParticipants:
            nonParticipants,

        contactedTable:
            collectContactTable(),

        supportGiven:
            supportGiven,

        otherSupport:
            $("otherSupport").value.trim(),

        observations:
            $("observations").value.trim(),

        coordinatorName:
            COORDINATOR_NAME,

        coordinatorDate:
            $("coordinatorDate").value,

        note:
            $("note").value.trim()

    };


    /* --------------------------------------------------------
       SUBMIT BUTTON
       -------------------------------------------------------- */

    const submitButton =
        $("submitButton");

    submitButton.disabled =
        true;

    submitButton.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i><span>Submitting...</span>';

    hideBanner();


    try {

        const result =
            await callAppsScript(
                payload
            );


        if (!result.success) {

            if (
                result.status ===
                "deadline_passed"
            ) {

                deadlineInfo.isOpen =
                    false;

                applyDeadlineState();

            }

            throw new Error(
                result.message ||
                "Submission failed."
            );

        }


        showBanner(
            "success",
            `Report submitted successfully (version ${result.version}).`
        );


        submitButton.disabled =
            false;

        submitButton.innerHTML =
            '<i class="fa-solid fa-check"></i><span>Report Submitted</span>';


        /*
         * Keep the success state visible briefly,
         * then restore the normal button text.
         */

        setTimeout(
            function () {

                if (
                    deadlineInfo.isOpen
                ) {

                    submitButton.innerHTML =
                        '<i class="fa-solid fa-paper-plane"></i><span>Submit Report</span>';

                }

            },
            2500
        );


    } catch (error) {

        console.error(
            "SLC report submission error:",
            error
        );

        showBanner(
            "error",
            error.message ||
            "Something went wrong while submitting the report."
        );


        submitButton.disabled =
            false;

        if (
            deadlineInfo.isOpen
        ) {

            submitButton.innerHTML =
                '<i class="fa-solid fa-paper-plane"></i><span>Submit Report</span>';

        }

    }

}


/* ============================================================
   BANNER
   ============================================================ */

function showBanner(
    type,
    message
) {

    const banner =
        $("statusBanner");

    if (!banner) return;

    if (!message) {

        hideBanner();

        return;

    }

    banner.className =
        "report-banner " +
        type;

    banner.textContent =
        message;

    banner.classList.remove(
        "hidden"
    );

}


function hideBanner() {

    const banner =
        $("statusBanner");

    if (!banner) return;

    banner.classList.add(
        "hidden"
    );

}
 
