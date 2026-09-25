"use strict";

/* ============================================================
AFC ISIU YOUTH PORTAL V2
FILE: slcreport-dashboard.js
PURPOSE: SLC REPORT DASHBOARD
============================================================ */

/* ============================================================
CONFIG
============================================================ */

const APPS_SCRIPT_URL =
"https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";

/* ============================================================
HELPERS
============================================================ */

const $ = (id) =>
document.getElementById(id);

let currentReport = null;

/* ============================================================
INITIALISE
============================================================ */

document.addEventListener(
"DOMContentLoaded",
function () {

 
    setupDashboard();

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
API
============================================================ */

async function callAppsScript(payload) {

 
const form =
    new URLSearchParams();

form.set(
    "payload",
    JSON.stringify(payload)
);

const response =
    await fetch(
        APPS_SCRIPT_URL,
        {
            method: "POST",

            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded;charset=UTF-8"
            },

            body:
                form.toString()
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

 
const lessonInput =
    $("dashboardLessonNo");

const button =
    $("loadDashboardButton");


const lessonNo =
    lessonInput
        ?.value
        .trim();


if (!lessonNo) {

    showStatus(
        "error",
        "Please enter a lesson number first."
    );

    lessonInput?.focus();

    return;

}


button.disabled =
    true;


button.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i><span>Loading...</span>';


hideStatus();


try {

    /*
     * This action reads the report already submitted
     * through the SLC Report page.
     */

    const result =
        await callAppsScript({
            action:
                "getSLCReportDashboard",

            lessonNo:
                lessonNo
        });


    if (!result.success) {

        throw new Error(
            result.message ||
            "Unable to load the SLC report."
        );

    }


    currentReport =
        result;


    renderDashboard(
        result
    );


    showStatus(
        "success",
        `Lesson ${lessonNo} report loaded successfully.`
    );


} catch (error) {

    console.error(
        "SLC dashboard error:",
        error
    );


    showStatus(
        "error",
        error.message ||
        "Unable to load the report."
    );


    hideDashboard();


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

function renderDashboard(data) {

 
const report =
    data.report ||
    data.data ||
    data;


const total =
    Number(
        report.totalMembers
    ) || 0;


const participated =
    Number(
        report.participated
    ) || 0;


const notParticipated =
    Number(
        report.notParticipated
    );


const calculatedNotParticipated =
    Math.max(
        total - participated,
        0
    );


const finalNotParticipated =
    Number.isFinite(
        notParticipated
    )
        ? Math.max(
            notParticipated,
            0
        )
        : calculatedNotParticipated;


const percentage =
    total > 0
        ? Math.round(
            (
                participated /
                total
            ) * 100
        )
        : 0;


/* --------------------------------------------------------
   STATISTICS
-------------------------------------------------------- */

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
    finalNotParticipated
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
        `${percentage}%`;

}


setText(
    "progressDescription",
    buildProgressDescription(
        total,
        participated,
        finalNotParticipated,
        percentage
    )
);


/* --------------------------------------------------------
   LESSON
-------------------------------------------------------- */

setText(
    "dashboardLessonTitle",
    `Lesson ${report.lessonNo || ""}`
);


setText(
    "dashboardReportDate",
    formatDate(
        report.reportDate
    )
);


/* --------------------------------------------------------
   GROUP
-------------------------------------------------------- */

setText(
    "groupNameDisplay",
    report.groupName ||
    "—"
);


setText(
    "groupLeaderDisplay",
    report.groupLeaderName ||
    "—"
);


setText(
    "reportVersionDisplay",
    report.version
        ? `Version ${report.version}`
        : "—"
);


setText(
    "reportDateDisplay",
    formatDate(
        report.reportDate
    )
);


/* --------------------------------------------------------
   NON PARTICIPANTS
-------------------------------------------------------- */

renderNonParticipants(
    report.nonParticipants ||
    []
);


/* --------------------------------------------------------
   OBSERVATIONS
-------------------------------------------------------- */

renderObservations(
    report.observations ||
    ""
);


/* --------------------------------------------------------
   SHOW
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
notParticipated,
percentage
) {

 
if (!total) {

    return "No members have been recorded for this report.";

}


if (
    participated === total
) {

    return "All recorded members participated in this week's quiz.";

}


return `${participated} of ${total} members participated. ${notParticipated} member${notParticipated === 1 ? "" : "s"} ${notParticipated === 1 ? "is" : "are"} yet to participate.`;
 

}

/* ============================================================
NON PARTICIPANTS
============================================================ */

function renderNonParticipants(
names
) {

 
const container =
    $("nonParticipantsDisplay");


const count =
    Array.isArray(names)
        ? names.filter(
            name =>
                String(
                    name || ""
                ).trim()
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
                No non-participating members were listed
                in this report.
            </p>

        </div>

    `;

    return;

}


container.innerHTML =
    count
        .map(
            function (
                name,
                index
            ) {

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

function renderObservations(
text
) {

 
const card =
    $("observationsCard");

const content =
    $("observationsDisplay");


if (!card || !content) return;


const value =
    String(
        text || ""
    ).trim();


if (!value) {

    card.classList.add(
        "hidden"
    );

    content.textContent =
        "";

    return;

}


content.textContent =
    value;


card.classList.remove(
    "hidden"
);
 

}

/* ============================================================
HIDE DASHBOARD
============================================================ */

function hideDashboard() {

 
$("dashboardSummary")
    ?.classList.add(
        "hidden"
    );


$("dashboardEmpty")
    ?.classList.remove(
        "hidden"
    );
 

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
