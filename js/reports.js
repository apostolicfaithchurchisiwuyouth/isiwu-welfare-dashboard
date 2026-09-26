/**
 * ============================================================
 * AFC ISIU YOUTH PORTAL V2
 * FILE: reports.js
 * PURPOSE: PROGRAM REPORTS
 * ============================================================
 */

"use strict";


/* ============================================================
   DATA SOURCE
   ============================================================ */

const secretariatCSV =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTE5Ds6_y0OYFL9_pYfRekpMx1Jq-kijbtdXsL-LCyg5KsC8LVootmeHOew2xiqV2sAXEVUKm_3vz17/pub?gid=1085033955&single=true&output=csv";


/* ============================================================
   STATE
   ============================================================ */

let allReports = [];


/* ============================================================
   DOM
   ============================================================ */

const searchInput =
    document.getElementById("searchInput");

const typeFilter =
    document.getElementById("typeFilter");

const sortFilter =
    document.getElementById("sortFilter");

const reportsFeed =
    document.getElementById("reportsFeed");

const emptyState =
    document.getElementById("emptyState");

const reportsLoading =
    document.getElementById("reportsLoading");

const reportsCount =
    document.getElementById("reportsCount");


/* ============================================================
   UPDATE STATISTICS
   ============================================================ */

function updateStatistics() {

    const totalPrograms =
        allReports.length;


    const totalVirtual =
        allReports.filter(report =>
            report.programType
                .toLowerCase()
                .includes("virtual")
        ).length;


    const totalPhysical =
        totalPrograms -
        totalVirtual;


    const totalTypes =
        new Set(
            allReports
                .map(report =>
                    report.programType.trim()
                )
                .filter(Boolean)
        ).size;


    const totalProgramsElement =
        document.getElementById("totalPrograms");

    const totalVirtualElement =
        document.getElementById("totalVirtual");

    const totalPhysicalElement =
        document.getElementById("totalPhysical");

    const totalTypesElement =
        document.getElementById("totalTypes");


    if (totalProgramsElement) {

        totalProgramsElement.textContent =
            totalPrograms;

    }


    if (totalVirtualElement) {

        totalVirtualElement.textContent =
            totalVirtual;

    }


    if (totalPhysicalElement) {

        totalPhysicalElement.textContent =
            totalPhysical;

    }


    if (totalTypesElement) {

        totalTypesElement.textContent =
            totalTypes;

    }

}


/* ============================================================
   CSV PARSER
   ============================================================ */

function parseCSV(text) {

    const rows = [];

    let row = [];
    let current = "";

    let insideQuotes = false;


    for (
        let i = 0;
        i < text.length;
        i++
    ) {

        const char =
            text[i];

        const nextChar =
            text[i + 1];


        if (char === '"') {

            if (
                insideQuotes &&
                nextChar === '"'
            ) {

                current += '"';

                i++;

            } else {

                insideQuotes =
                    !insideQuotes;

            }


        } else if (
            char === "," &&
            !insideQuotes
        ) {

            row.push(
                current.trim()
            );

            current = "";


        } else if (
            char === "\n" &&
            !insideQuotes
        ) {

            row.push(
                current.trim()
            );

            rows.push(row);

            row = [];

            current = "";


        } else {

            current += char;

        }

    }


    if (current || row.length) {

        row.push(
            current.trim()
        );

        rows.push(row);

    }


    return rows;

}


/* ============================================================
   FETCH REPORTS
   ============================================================ */

async function fetchReports() {

    try {

        if (reportsLoading) {

            reportsLoading.style.display =
                "flex";

        }


        if (emptyState) {

            emptyState.style.display =
                "none";

        }


        const response =
            await fetch(secretariatCSV);


        if (!response.ok) {

            throw new Error(
                `Unable to load reports (${response.status})`
            );

        }


        const data =
            await response.text();


        const reports =
            parseCSV(data);


        const actualReports =
            reports.slice(1);


        allReports =
            actualReports.map(report => ({

                date:
                    report[0] || "",

                programTitle:
                    report[1] || "",

                programType:
                    report[2] || "",

                whatWentWell:
                    report[3] || "",

                reporter:
                    report[4] || ""

            }));


        populateProgramTypes();

        updateStatistics();

        renderReports();


    } catch (error) {

        console.error(
            "Reports loading error:",
            error
        );


        allReports = [];

        updateStatistics();

        renderReports();


    } finally {

        if (reportsLoading) {

            reportsLoading.style.display =
                "none";

        }

    }

}


/* ============================================================
   POPULATE PROGRAM TYPES
   ============================================================ */

function populateProgramTypes() {

    if (!typeFilter) {
        return;
    }


    /*
     * Keep the default option and remove
     * previously generated options.
     */

    while (
        typeFilter.options.length > 1
    ) {

        typeFilter.remove(1);

    }


    const uniqueTypes =
        [
            ...new Set(
                allReports
                    .map(report =>
                        report.programType.trim()
                    )
                    .filter(Boolean)
            )
        ];


    uniqueTypes
        .sort((a, b) =>
            a.localeCompare(b)
        )
        .forEach(type => {

            const option =
                document.createElement("option");


            option.value =
                type;


            option.textContent =
                type;


            typeFilter.appendChild(
                option
            );

        });

}


/* ============================================================
   ESCAPE HTML
   ============================================================ */

function escapeHTML(value) {

    return String(value || "")
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


/* ============================================================
   RENDER REPORTS
   ============================================================ */

function renderReports() {

    if (!reportsFeed) {
        return;
    }


    const searchValue =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    const typeValue =
        typeFilter
            ? typeFilter.value
            : "all";


    const sortValue =
        sortFilter
            ? sortFilter.value
            : "newest";


    let filteredReports =
        allReports.filter(report => {

            const matchesSearch =
                report.programTitle
                    .toLowerCase()
                    .includes(searchValue);


            const matchesType =
                typeValue === "all" ||
                report.programType === typeValue;


            return (
                matchesSearch &&
                matchesType
            );

        });


    /*
     * Do not reverse allReports directly.
     * Work on a copy so filtering/sorting
     * does not mutate the original data.
     */

    if (sortValue === "newest") {

        filteredReports =
            [...filteredReports].reverse();

    }


    reportsFeed.innerHTML = "";


    if (reportsCount) {

        reportsCount.textContent =
            `${filteredReports.length} ${
                filteredReports.length === 1
                    ? "report"
                    : "reports"
            }`;

    }


    if (
        filteredReports.length === 0
    ) {

        if (emptyState) {

            emptyState.style.display =
                "block";

        }

        return;

    }


    if (emptyState) {

        emptyState.style.display =
            "none";

    }


    filteredReports.forEach(report => {

        const card =
            document.createElement("article");


        card.className =
            "report-card";


        card.innerHTML = `

            <div class="report-top">

                <div class="report-badge">
                    ${escapeHTML(report.programType)}
                </div>

                <div class="report-date">
                    ${escapeHTML(report.date)}
                </div>

            </div>


            <h3 class="report-title">
                ${escapeHTML(report.programTitle)}
            </h3>


            <p class="report-summary">
                ${escapeHTML(report.whatWentWell)}
            </p>


            <div class="report-footer">

                <div>

                    <div class="reporter">
                        ${escapeHTML(report.reporter)}
                    </div>

                    <div class="reporter-role">
                        Secretariat Department
                    </div>

                </div>

            </div>

        `;


        reportsFeed.appendChild(card);

    });

}


/* ============================================================
   EVENT LISTENERS
   ============================================================ */

if (searchInput) {

    searchInput.addEventListener(
        "input",
        renderReports
    );

}


if (typeFilter) {

    typeFilter.addEventListener(
        "change",
        renderReports
    );

}


if (sortFilter) {

    sortFilter.addEventListener(
        "change",
        renderReports
    );

}


/* ============================================================
   INITIALIZE
   ============================================================ */

fetchReports();
