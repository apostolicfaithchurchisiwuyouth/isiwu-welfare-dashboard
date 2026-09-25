"use strict";

/* ============================================================
AFC ISIU YOUTH PORTAL V2
FILE: slcreport-dashboard.js
PURPOSE: SECURE SLC ADMIN DASHBOARD
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


    /*
     * The token is not trusted simply because it exists
     * in localStorage.
     *
     * The Apps Script backend will verify it and check
     * the user's authorized SLC role.
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
     *
     * Display the returned data immediately.
     */

    renderDashboard(
        result
    );


} catch (error) {

    console.error(
        "Dashboard authorization error:",
        error
    );


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
 * Therefore the lesson input is optional for now.
 */

const lessonNo =
    lessonInput
        ? lessonInput.value.trim()
        : "";


button.disabled =
    true;


button.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i><span>Loading...</span>';


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

    button.disabled =
        false;


    button.innerHTML =
        '<i class="fa-solid fa-rotate"></i><span>Load Report</span>';

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

/*
 * The overview endpoint is a participation overview,
 * not the submitted report itself.
 *
 * Therefore these fields remain clearly marked when
 * no report-specific data has been supplied.
 */

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
