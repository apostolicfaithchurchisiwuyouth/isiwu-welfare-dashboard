"use strict";

/* ============================================================
AFC ISIU YOUTH PORTAL V2
FILE: slcreport-dashboard.js
PURPOSE: SECURE QUIZ COORDINATOR DASHBOARD
============================================================ */

/* ============================================================
CONFIG
============================================================ */

const APPS_SCRIPT_URL =
"https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";

const SESSION_KEY =
"afc_isiu_slc_leader_session";

/* ============================================================
HELPERS
============================================================ */

const $ = (id) =>
document.getElementById(id);

/* ============================================================
STATE
============================================================ */

let dashboardSession = null;

let dashboardQuestions = [];

/* ============================================================
INITIALISE
============================================================ */

document.addEventListener(
"DOMContentLoaded",
function () {

    setupDashboard();

    restoreDashboardSession();

}
);

/* ============================================================
SETUP
============================================================ */

function setupDashboard() {

    const button =
        $("loadDashboardButton");

    const lessonInput =
        $("dashboardLessonNo");


    if (button) {

        button.addEventListener(
            "click",
            loadDashboard
        );

    }


    if (lessonInput) {

        lessonInput.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Enter"
                ) {

                    event.preventDefault();

                    loadDashboard();

                }

            }
        );

    }


    setupQuestionsControls();

}

/* ============================================================
QUESTIONS CONTROLS
============================================================ */

function setupQuestionsControls() {

    const refreshButton =
        $("refreshQuestionsButton");

    const filterInput =
        $("questionsLessonFilter");


    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            loadQuizQuestions
        );

    }


    if (filterInput) {

        filterInput.addEventListener(
            "input",
            filterQuizQuestions
        );

    }

}

/* ============================================================
RESTORE LOGIN SESSION
============================================================ */

function restoreDashboardSession() {

    const saved =
        localStorage.getItem(
            SESSION_KEY
        );


    if (!saved) {

        showStatus(
            "error",
            "Please log in to the SLC Report page first."
        );

        disableDashboard();

        return;

    }


    try {

        const session =
            JSON.parse(saved);


        if (
            !session ||
            !session.token
        ) {

            throw new Error(
                "Invalid saved session."
            );

        }


        dashboardSession =
            session;


        /*
         * The token is not trusted simply because it exists
         * in localStorage.
         *
         * The Apps Script backend verifies the token and
         * checks the user's authorized SLC role.
         */

        verifyDashboardAccess(
            session.token
        );


    } catch (error) {

        console.error(
            "Dashboard session error:",
            error
        );


        localStorage.removeItem(
            SESSION_KEY
        );


        dashboardSession =
            null;


        disableDashboard();


        showStatus(
            "error",
            "Your login session could not be restored. Please log in again."
        );

    }

}

/* ============================================================
VERIFY SERVER-SIDE ACCESS
============================================================ */

async function verifyDashboardAccess(
token
) {

    try {

        const result =
            await callDashboardAPI(
                {
                    action:
                        "getSLCAdminOverview",

                    token:
                        token
                }
            );


        if (!result.success) {

            throw new Error(
                result.message ||
                "You are not authorized to access this dashboard."
            );

        }


        /*
         * The overview endpoint has already passed the
         * server-side authorization check.
         */

        renderDashboard(
            result
        );


        /*
         * Load Questions after the dashboard session
         * has been verified.
         *
         * If the Questions section is not present on the
         * current HTML, nothing happens.
         */

        if ($("questionsTableBody")) {

            loadQuizQuestions();

        }


    } catch (error) {

        console.error(
            "Dashboard authorization error:",
            error
        );


        dashboardSession =
            null;


        disableDashboard();


        showStatus(
            "error",
            error.message ||
            "Unable to verify your dashboard access."
        );

    }

}

/* ============================================================
DASHBOARD API
============================================================ */

async function callDashboardAPI(
payload
) {

    const params =
        new URLSearchParams();


    Object.keys(payload)
        .forEach(
            function (key) {

                const value =
                    payload[key];


                if (
                    value !== undefined &&
                    value !== null
                ) {

                    params.set(
                        key,
                        String(value)
                    );

                }

            }
        );


    const response =
        await fetch(
            `${APPS_SCRIPT_URL}?${params.toString()}`,
            {
                method: "GET"
            }
        );


    if (!response.ok) {

        throw new Error(
            `Server error (${response.status}). Please try again.`
        );

    }


    const text =
        await response.text();


    let data;


    try {

        data =
            JSON.parse(text);

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
LOAD DASHBOARD
============================================================ */

async function loadDashboard() {

    const button =
        $("loadDashboardButton");

    const lessonInput =
        $("dashboardLessonNo");


    /*
     * The current backend overview uses the active/current
     * Quiz Settings row.
     *
     * Therefore the lesson input remains optional for now.
     */

    const lessonNo =
        lessonInput
            ? lessonInput.value.trim()
            : "";


    if (button) {

        button.disabled =
            true;


        button.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i><span>Loading...</span>';

    }


    hideStatus();


    try {

        const saved =
            localStorage.getItem(
                SESSION_KEY
            );


        if (!saved) {

            throw new Error(
                "Your login session is missing. Please log in again."
            );

        }


        const session =
            JSON.parse(saved);


        if (
            !session ||
            !session.token
        ) {

            throw new Error(
                "Your login session is invalid. Please log in again."
            );

        }


        dashboardSession =
            session;


        const result =
            await callDashboardAPI(
                {
                    action:
                        "getSLCAdminOverview",

                    token:
                        session.token
                }
            );


        if (!result.success) {

            throw new Error(
                result.message ||
                "Unable to load the SLC dashboard."
            );

        }


        renderDashboard(
            result
        );


        const currentLesson =
            result.data &&
            result.data.currentQuiz
                ? result.data.currentQuiz.lessonNo
                : "";


        if (
            lessonNo &&
            currentLesson &&
            String(lessonNo) !==
            String(currentLesson)
        ) {

            showStatus(
                "success",
                `Dashboard loaded. The active quiz is Lesson ${currentLesson}.`
            );

        } else {

            showStatus(
                "success",
                "SLC dashboard loaded successfully."
            );

        }


    } catch (error) {

        console.error(
            "SLC dashboard error:",
            error
        );


        showStatus(
            "error",
            error.message ||
            "Unable to load the dashboard."
        );


    } finally {

        if (button) {

            button.disabled =
                false;


            button.innerHTML =
                '<i class="fa-solid fa-rotate"></i><span>Load Report</span>';

        }

    }

}

/* ============================================================
RENDER DASHBOARD
============================================================ */

function renderDashboard(
result
) {

    const data =
        result.data ||
        {};


    const statistics =
        data.statistics ||
        {};


    const currentQuiz =
        data.currentQuiz ||
        {};


    const participants =
        Array.isArray(
            data.participants
        )
            ? data.participants
            : [];


    const nonParticipants =
        Array.isArray(
            data.nonParticipants
        )
            ? data.nonParticipants
            : [];


    /* --------------------------------------------------------
       STATISTICS
    -------------------------------------------------------- */

    const total =
        Number(
            statistics.totalMembers
        ) || 0;


    const participated =
        Number(
            statistics.participated
        ) || 0;


    const notParticipated =
        Number(
            statistics.notParticipated
        ) || 0;


    const percentage =
        Number(
            statistics.participationPercentage
        ) || 0;


    setText(
        "statTotalMembers",
        total
    );


    setText(
        "statParticipated",
        participated
    );


    setText(
        "statNotParticipated",
        notParticipated
    );


    setText(
        "statParticipationRate",
        `${percentage}%`
    );


    setText(
        "progressPercentage",
        `${percentage}%`
    );


    const progress =
        $("participationProgress");


    if (progress) {

        progress.style.width =
            `${Math.max(
                0,
                Math.min(
                    percentage,
                    100
                )
            )}%`;

    }


    setText(
        "progressDescription",
        buildProgressDescription(
            total,
            participated,
            notParticipated
        )
    );


    /* --------------------------------------------------------
       CURRENT QUIZ
    -------------------------------------------------------- */

    const lessonNo =
        currentQuiz.lessonNo ||
        "—";


    setText(
        "dashboardLessonTitle",
        lessonNo === "—"
            ? "Weekly SLC Report"
            : `Lesson ${lessonNo}`
    );


    setText(
        "dashboardReportDate",
        currentQuiz.closeTime
            ? `Closes ${formatDateTime(
                currentQuiz.closeTime
            )}`
            : "Active quiz"
    );


    /* --------------------------------------------------------
       GROUP INFORMATION
    -------------------------------------------------------- */

    setText(
        "groupNameDisplay",
        "All SLC members"
    );


    setText(
        "groupLeaderDisplay",
        "—"
    );


    setText(
        "reportVersionDisplay",
        "Live overview"
    );


    setText(
        "reportDateDisplay",
        formatDate(
            new Date()
        )
    );


    /* --------------------------------------------------------
       NON PARTICIPANTS
    -------------------------------------------------------- */

    renderNonParticipants(
        nonParticipants
    );


    /* --------------------------------------------------------
       OBSERVATIONS
    -------------------------------------------------------- */

    hideObservations();


    /* --------------------------------------------------------
       SHOW DASHBOARD
    -------------------------------------------------------- */

    $("dashboardSummary")
        ?.classList.remove(
            "hidden"
        );


    $("dashboardEmpty")
        ?.classList.add(
            "hidden"
        );

}

/* ============================================================
PROGRESS DESCRIPTION
============================================================ */

function buildProgressDescription(
total,
participated,
notParticipated
) {

    if (!total) {

        return "No active members were found.";

    }


    if (
        participated === total
    ) {

        return "All active members have participated in this week's quiz.";

    }


    return `${participated} of ${total} active members have participated. ${notParticipated} member${notParticipated === 1 ? "" : "s"} ${notParticipated === 1 ? "is" : "are"} yet to participate.`;

}

/* ============================================================
NON PARTICIPANTS
============================================================ */

function renderNonParticipants(
members
) {

    const container =
        $("nonParticipantsDisplay");


    const count =
        Array.isArray(members)
            ? members.filter(
                function (member) {

                    return (
                        member &&
                        String(
                            member.name || ""
                        ).trim()
                    );

                }
            )
            : [];


    setText(
        "nonParticipantCount",
        count.length
    );


    if (!container) return;


    if (!count.length) {

        container.innerHTML = `

            <div class="slc-empty-state">

                <i class="fa-solid fa-circle-check"></i>

                <h3>
                    Everyone participated
                </h3>

                <p>
                    All active members have participated
                    in the selected quiz.
                </p>

            </div>

        `;

        return;

    }


    container.innerHTML =
        count
            .map(
                function (
                    member,
                    index
                ) {

                    const name =
                        member.name ||
                        "Unnamed member";


                    return `

                        <div class="slc-member-item">

                            <span class="slc-member-number">
                                ${index + 1}
                            </span>

                            <span>
                                ${escapeHtml(name)}
                            </span>

                        </div>

                    `;

                }
            )
            .join("");

}

/* ============================================================
QUIZ QUESTIONS
============================================================ */

/*
 * This section reads from the existing
 * "Quiz Questions" sheet through the secure
 * Apps Script admin endpoint.
 *
 * It does NOT modify the public quiz.
 */

async function loadQuizQuestions() {

    const container =
        $("questionsTableBody");


    /*
     * If the Questions section has not yet been
     * added to the HTML, simply do nothing.
     */

    if (!container) {

        return;

    }


    const refreshButton =
        $("refreshQuestionsButton");


    if (refreshButton) {

        refreshButton.disabled =
            true;

        refreshButton.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i><span>Loading...</span>';

    }


    setQuestionsStatus(
        "loading",
        "Loading quiz questions..."
    );


    try {

        const saved =
            localStorage.getItem(
                SESSION_KEY
            );


        if (!saved) {

            throw new Error(
                "Your login session is missing. Please log in again."
            );

        }


        const session =
            JSON.parse(saved);


        if (
            !session ||
            !session.token
        ) {

            throw new Error(
                "Your login session is invalid. Please log in again."
            );

        }


        dashboardSession =
            session;


        const result =
            await callDashboardAPI(
                {
                    action:
                        "getSLCAdminQuizQuestions",

                    token:
                        session.token
                }
            );


        if (!result.success) {

            throw new Error(
                result.message ||
                "Unable to load quiz questions."
            );

        }


        dashboardQuestions =
            Array.isArray(
                result.questions
            )
                ? result.questions
                : [];


        renderQuizQuestions(
            dashboardQuestions
        );


        setQuestionsStatus(
            "success",
            `${dashboardQuestions.length} question${dashboardQuestions.length === 1 ? "" : "s"} loaded.`
        );


    } catch (error) {

        console.error(
            "Quiz questions error:",
            error
        );


        dashboardQuestions =
            [];


        renderQuizQuestions(
            []
        );


        setQuestionsStatus(
            "error",
            error.message ||
            "Unable to load quiz questions."
        );


    } finally {

        if (refreshButton) {

            refreshButton.disabled =
                false;

            refreshButton.innerHTML =
                '<i class="fa-solid fa-rotate"></i><span>Refresh</span>';

        }

    }

}

/* ============================================================
RENDER QUIZ QUESTIONS
============================================================ */

function renderQuizQuestions(
questions
) {

    const container =
        $("questionsTableBody");


    if (!container) {

        return;

    }


    const filtered =
        getFilteredQuestions(
            questions
        );


    if (!filtered.length) {

        container.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    class="questions-empty-cell"
                >

                    <div class="slc-empty-state">

                        <i class="fa-solid fa-circle-question"></i>

                        <h3>
                            No questions found
                        </h3>

                        <p>
                            There are no quiz questions matching the current filter.
                        </p>

                    </div>

                </td>

            </tr>

        `;

        updateQuestionsCount(
            0
        );

        return;

    }


    container.innerHTML =
        filtered
            .map(
                function (
                    item
                ) {

                    return `

                        <tr>

                            <td>
                                <span class="question-lesson-badge">
                                    ${escapeHtml(item.lessonNo)}
                                </span>
                            </td>

                            <td>
                                <div class="admin-question-text">
                                    ${escapeHtml(item.question)}
                                </div>
                            </td>

                            <td>

                                <div class="question-options">

                                    <div>
                                        <strong>A.</strong>
                                        ${escapeHtml(item.optionA)}
                                    </div>

                                    <div>
                                        <strong>B.</strong>
                                        ${escapeHtml(item.optionB)}
                                    </div>

                                    <div>
                                        <strong>C.</strong>
                                        ${escapeHtml(item.optionC)}
                                    </div>

                                    <div>
                                        <strong>D.</strong>
                                        ${escapeHtml(item.optionD)}
                                    </div>

                                </div>

                            </td>

                            <td>
                                <span class="correct-answer-badge">
                                    ${escapeHtml(item.correctOption)}
                                </span>
                            </td>

                            <td>
                                ${escapeHtml(item.points)}
                            </td>

                            <td>

                                <button
                                    type="button"
                                    class="question-action-button edit"
                                    data-question-action="edit"
                                    data-row-number="${escapeHtml(item.rowNumber)}"
                                >
                                    <i class="fa-solid fa-pen"></i>
                                    <span>Edit</span>
                                </button>

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");


    updateQuestionsCount(
        filtered.length
    );

}

/* ============================================================
FILTER QUESTIONS
============================================================ */

function filterQuizQuestions() {

    renderQuizQuestions(
        dashboardQuestions
    );

}

/* ============================================================
GET FILTERED QUESTIONS
============================================================ */

function getFilteredQuestions(
questions
) {

    const filterInput =
        $("questionsLessonFilter");


    const filter =
        filterInput
            ? filterInput.value.trim().toLowerCase()
            : "";


    if (!filter) {

        return questions;

    }


    return questions.filter(
        function (item) {

            return String(
                item.lessonNo || ""
            )
            .toLowerCase()
            .includes(
                filter
            );

        }
    );

}

/* ============================================================
QUESTIONS STATUS
============================================================ */

function setQuestionsStatus(
type,
message
) {

    const box =
        $("questionsStatus");


    if (!box) {

        return;

    }


    box.className =
        `questions-status ${type}`;


    box.textContent =
        message;


    box.classList.remove(
        "hidden"
    );

}

/* ============================================================
QUESTIONS COUNT
============================================================ */

function updateQuestionsCount(
count
) {

    setText(
        "questionsCount",
        count
    );

}

/* ============================================================
OBSERVATIONS
============================================================ */

function hideObservations() {

    const card =
        $("observationsCard");


    const content =
        $("observationsDisplay");


    if (card) {

        card.classList.add(
            "hidden"
        );

    }


    if (content) {

        content.textContent =
            "";

    }

}

/* ============================================================
DISABLE DASHBOARD
============================================================ */

function disableDashboard() {

    const button =
        $("loadDashboardButton");


    if (button) {

        button.disabled =
            true;

    }

}

/* ============================================================
STATUS
============================================================ */

function showStatus(
type,
message
) {

    const box =
        $("dashboardStatus");


    if (!box) return;


    box.className =
        `slc-dashboard-status ${type}`;


    box.textContent =
        message;


    box.classList.remove(
        "hidden"
    );

}

function hideStatus() {

    const box =
        $("dashboardStatus");


    if (!box) return;


    box.classList.add(
        "hidden"
    );

}

/* ============================================================
TEXT
============================================================ */

function setText(
id,
value
) {

    const element =
        $(id);


    if (!element) return;


    element.textContent =
        value ?? "—";

}

/* ============================================================
DATE
============================================================ */

function formatDate(
value
) {

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
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );

}

function formatDateTime(
value
) {

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
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit"
        }
    );

}

/* ============================================================
ESCAPE HTML
============================================================ */

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
 
