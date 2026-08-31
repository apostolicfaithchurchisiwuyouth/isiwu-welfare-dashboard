/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: lessons.js
   PURPOSE: WEEKLY LESSONS PAGE CONTROLLER
============================================================ */

(function () {

    "use strict";


    /* ========================================================
       CONFIGURATION
    ======================================================== */

    const LESSON_CONFIG = {

        /*
         * Keep your existing published lesson CSV endpoint here
         * if it is different from this value.
         */
        CSV_URL:
            "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIit/pub?output=csv",

        reflectionPage:
            "reflection.html",

        loginPage:
            "../index.html"

    };


    /* ========================================================
       STATE
    ======================================================== */

    let lessonData = null;

    let readingStartedAt = null;

    let readingTimer = null;


    /* ========================================================
       DOM HELPER
    ======================================================== */

    function $(id) {

        return document.getElementById(id);

    }


    /* ========================================================
       AUTHENTICATION
    ======================================================== */

    function getCurrentUser() {

        const possibleKeys = [

            "currentUser",

            "user",

            "loggedInUser",

            "authUser"

        ];


        for (const key of possibleKeys) {

            const raw =
                localStorage.getItem(key);


            if (!raw) continue;


            try {

                const parsed =
                    JSON.parse(raw);


                if (parsed) {

                    return parsed;

                }

            } catch (error) {

                /*
                 * Some implementations may store
                 * a plain string rather than JSON.
                 */

                return {

                    name: raw

                };

            }

        }


        return null;

    }


    function isLoggedIn() {

        const token =
            localStorage.getItem("authToken");


        const user =
            getCurrentUser();


        return Boolean(
            token || user
        );

    }


    /* ========================================================
       NORMALIZE DATA
    ======================================================== */

    function cleanValue(value) {

        if (
            value === undefined ||
            value === null
        ) {

            return "";

        }


        return String(value).trim();

    }


    function normalizeKey(key) {

        return cleanValue(key)

            .toLowerCase()

            .replace(/[\s_-]+/g, "")

            .replace(/[^\w]/g, "");

    }


    function getField(row, possibleNames) {

        if (!row || typeof row !== "object") {

            return "";

        }


        const normalizedRow = {};


        Object.keys(row).forEach(key => {

            normalizedRow[
                normalizeKey(key)
            ] = row[key];

        });


        for (const name of possibleNames) {

            const value =
                normalizedRow[
                    normalizeKey(name)
                ];


            if (
                value !== undefined &&
                value !== null &&
                String(value).trim() !== ""
            ) {

                return value;

            }

        }


        return "";

    }


    /* ========================================================
       FETCH LESSON DATA
    ======================================================== */

    async function fetchLessons() {

        const response =
            await fetch(
                LESSON_CONFIG.CSV_URL,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `Unable to fetch lessons (${response.status})`
            );

        }


        const csvText =
            await response.text();


        if (
            typeof Papa === "undefined"
        ) {

            throw new Error(
                "PapaParse is not available."
            );

        }


        const parsed =
            Papa.parse(
                csvText,
                {
                    header: true,
                    skipEmptyLines: true
                }
            );


        if (
            !parsed ||
            !Array.isArray(parsed.data) ||
            parsed.data.length === 0
        ) {

            throw new Error(
                "No lesson data was found."
            );

        }


        return parsed.data;

    }


    /* ========================================================
       FIND CURRENT LESSON
    ======================================================== */

    function findCurrentLesson(rows) {

        if (
            !Array.isArray(rows) ||
            rows.length === 0
        ) {

            return null;

        }


        /*
         * If your sheet has a Current / Active / Published
         * field, use it first.
         */

        const activeLesson =
            rows.find(row => {

                const active =
                    getField(
                        row,
                        [
                            "active",
                            "current",
                            "published",
                            "status"
                        ]
                    ).toLowerCase();


                return (

                    active === "yes" ||

                    active === "true" ||

                    active === "active" ||

                    active === "current" ||

                    active === "published"

                );

            });


        if (activeLesson) {

            return activeLesson;

        }


        /*
         * Otherwise use the last non-empty lesson row.
         */

        const validRows =
            rows.filter(row => {

                return Object.values(row)
                    .some(
                        value =>
                            cleanValue(value) !== ""
                    );

            });


        return validRows.length
            ? validRows[validRows.length - 1]
            : null;

    }


    /* ========================================================
       FORMAT READING TIME
    ======================================================== */

    function formatReadingTime(value) {

        const raw =
            cleanValue(value);


        if (!raw) {

            return "10 minutes";

        }


        if (
            /minute|min/i.test(raw)
        ) {

            return raw;

        }


        const number =
            Number(raw);


        if (
            Number.isFinite(number)
        ) {

            return `${number} minutes`;

        }


        return raw;

    }


    /* ========================================================
       FORMAT LESSON CONTENT
    ======================================================== */

    function formatContent(value) {

        const text =
            cleanValue(value);


        if (!text) {

            return "No lesson note is available yet.";

        }


        /*
         * If the sheet already contains HTML,
         * preserve it.
         */

        if (
            /<([a-z][\s\S]*?)>/i.test(text)
        ) {

            return text;

        }


        /*
         * Otherwise convert paragraphs and
         * basic line breaks safely.
         */

        return escapeHTML(text)

            .replace(
                /\r\n\r\n|\n\n/g,
                "</p><p>"
            )

            .replace(
                /\r\n|\n/g,
                "<br>"
            )

            .replace(
                /^/,
                "<p>"
            )

            .replace(
                /$/,
                "</p>"
            );

    }


    function escapeHTML(value) {

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


    /* ========================================================
       RENDER LESSON
    ======================================================== */

    function renderLesson(row) {

        lessonData = row;


        const title =
            getField(
                row,
                [
                    "topic",
                    "lesson topic",
                    "title",
                    "lesson title",
                    "lesson"
                ]
            );


        const introduction =
            getField(
                row,
                [
                    "introduction",
                    "intro",
                    "description",
                    "subtitle",
                    "overview"
                ]
            );


        const bibleText =
            getField(
                row,
                [
                    "bible text",
                    "bibletext",
                    "scripture",
                    "bible"
                ]
            );


        const memoryVerse =
            getField(
                row,
                [
                    "memory verse",
                    "memoryverse",
                    "memory"
                ]
            );


        const memoryReference =
            getField(
                row,
                [
                    "memory verse reference",
                    "memoryversereference",
                    "verse reference",
                    "reference"
                ]
            );


        const content =
            getField(
                row,
                [
                    "lesson content",
                    "lessoncontent",
                    "content",
                    "notes",
                    "lesson note",
                    "lesson notes",
                    "combined lesson",
                    "combined lesson note"
                ]
            );


        const className =
            getField(
                row,
                [
                    "class",
                    "category",
                    "group",
                    "level"
                ]
            );


        const week =
            getField(
                row,
                [
                    "week",
                    "week number",
                    "lesson number"
                ]
            );


        const readingTime =
            formatReadingTime(
                getField(
                    row,
                    [
                        "reading time",
                        "readingtime",
                        "duration",
                        "time"
                    ]
                )
            );


        const keyPointsRaw =
            getField(
                row,
                [
                    "key points",
                    "keypoints",
                    "takeaways",
                    "key lessons"
                ]
            );


        if ($("lessonTitle")) {

            $("lessonTitle").textContent =
                title || "Weekly Lesson";

        }


        if ($("lessonIntroduction")) {

            $("lessonIntroduction").textContent =
                introduction ||
                "Study the Word carefully, reflect on its truth, and allow God's Word to shape your life.";

        }


        if ($("bibleText")) {

            $("bibleText").textContent =
                bibleText ||
                "Bible text not provided.";

        }


        if ($("memoryVerse")) {

            $("memoryVerse").textContent =
                memoryVerse ||
                "Memory verse not provided.";

        }


        if ($("memoryVerseReference")) {

            $("memoryVerseReference").textContent =
                memoryReference;

            $("memoryVerseReference").style.display =
                memoryReference
                    ? "block"
                    : "none";

        }


        if ($("lessonBody")) {

            $("lessonBody").innerHTML =
                formatContent(content);

        }


        if ($("lessonClass")) {

            $("lessonClass").textContent =
                className || "Weekly Lesson";

        }


        if ($("lessonNumber")) {

            $("lessonNumber").textContent =
                week || "This Week";

        }


        if ($("lessonWeek")) {

            $("lessonWeek").textContent =
                week
                    ? `Week ${week}`
                    : "This Week";

        }


        if ($("readingTime")) {

            $("readingTime").textContent =
                readingTime;

        }


        if ($("finishReadingTime")) {

            $("finishReadingTime").textContent =
                readingTime;

        }


        renderKeyPoints(keyPointsRaw);


        setupLessonAvailability();


        startReadingTimer();

    }


    /* ========================================================
       KEY POINTS
    ======================================================== */

    function renderKeyPoints(value) {

        const card =
            $("keyPointsCard");

        const container =
            $("keyPoints");


        if (!card || !container) {

            return;

        }


        if (!value) {

            card.hidden = true;

            container.innerHTML = "";

            return;

        }


        const points =
            value
                .split(/\r\n|\n|;|\|/)
                .map(
                    item =>
                        item.trim()
                )
                .filter(Boolean);


        if (!points.length) {

            card.hidden = true;

            return;

        }


        container.innerHTML =
            points.map(point => `

                <div class="key-point-item">

                    <i class="fa-solid fa-check"></i>

                    <span>
                        ${escapeHTML(point)}
                    </span>

                </div>

            `).join("");


        card.hidden = false;

    }


    /* ========================================================
       READING TIMER
    ======================================================== */

    function startReadingTimer() {

        readingStartedAt =
            Date.now();


        if (readingTimer) {

            clearInterval(
                readingTimer
            );

        }


        /*
         * The visible reading time is the estimated
         * lesson reading time from the sheet.
         *
         * We do not replace it with a live timer because
         * the user asked for "Reading time" as a lesson
         * estimate rather than a stopwatch.
         */

        readingTimer = null;

    }


    /* ========================================================
       AUTHENTICATED ACTION STATE
    ======================================================== */

    function setupLessonAvailability() {

        const checkbox =
            $("lessonReadCheckbox");

        const button =
            $("continueLessonBtn");

        const loginMessage =
            $("loginRequiredMessage");


        if (!checkbox || !button) {

            return;

        }


        const loggedIn =
            isLoggedIn();


        /*
         * Everyone can read the lesson.
         *
         * Only authenticated users can confirm
         * that they have read it.
         */

        if (!loggedIn) {

            checkbox.checked = false;

            checkbox.disabled = true;

            button.disabled = true;


            if (loginMessage) {

                loginMessage.hidden = false;

            }

            return;

        }


        checkbox.disabled = false;


        if (loginMessage) {

            loginMessage.hidden = true;

        }


        updateContinueButton();


        checkbox.addEventListener(
            "change",
            updateContinueButton
        );

    }


    function updateContinueButton() {

        const checkbox =
            $("lessonReadCheckbox");

        const button =
            $("continueLessonBtn");


        if (!checkbox || !button) {

            return;

        }


        button.disabled =
            !checkbox.checked ||
            !isLoggedIn();

    }


    /* ========================================================
       CONTINUE TO REFLECTION
    ======================================================== */

    function setupContinueButton() {

        const button =
            $("continueLessonBtn");


        if (!button) {

            return;

        }


        button.addEventListener(
            "click",
            () => {

                if (!isLoggedIn()) {

                    window.location.href =
                        LESSON_CONFIG.loginPage;

                    return;

                }


                const checkbox =
                    $("lessonReadCheckbox");


                if (
                    !checkbox ||
                    !checkbox.checked
                ) {

                    return;

                }


                /*
                 * Store temporary lesson state so the
                 * reflection page knows which lesson was read.
                 */

                try {

                    localStorage.setItem(
                        "currentLesson",
                        JSON.stringify(
                            lessonData
                        )
                    );


                    localStorage.setItem(
                        "lessonReadConfirmed",
                        "true"
                    );


                    localStorage.setItem(
                        "lessonReadAt",
                        new Date().toISOString()
                    );

                } catch (error) {

                    console.warn(
                        "Unable to save lesson reading state.",
                        error
                    );

                }


                window.location.href =
                    LESSON_CONFIG.reflectionPage;

            }
        );

    }


    /* ========================================================
       RETRY
    ======================================================== */

    function setupRetry() {

        const button =
            $("lessonRetryBtn");


        if (!button) {

            return;

        }


        button.addEventListener(
            "click",
            loadLesson
        );

    }


    /* ========================================================
       LOADING / ERROR STATES
    ======================================================== */

    function showLoading() {

        if ($("lessonLoading")) {

            $("lessonLoading").hidden =
                false;

        }


        if ($("lessonReader")) {

            $("lessonReader").hidden =
                true;

        }


        if ($("lessonError")) {

            $("lessonError").hidden =
                true;

        }

    }


    function showReader() {

        if ($("lessonLoading")) {

            $("lessonLoading").hidden =
                true;

        }


        if ($("lessonError")) {

            $("lessonError").hidden =
                true;

        }


        if ($("lessonReader")) {

            $("lessonReader").hidden =
                false;

        }

    }


    function showError(message) {

        if ($("lessonLoading")) {

            $("lessonLoading").hidden =
                true;

        }


        if ($("lessonReader")) {

            $("lessonReader").hidden =
                true;

        }


        if ($("lessonError")) {

            $("lessonError").hidden =
                false;

        }


        if ($("lessonErrorMessage")) {

            $("lessonErrorMessage").textContent =
                message ||
                "Something went wrong while loading the lesson.";

        }

    }


    /* ========================================================
       LOAD LESSON
    ======================================================== */

    async function loadLesson() {

        showLoading();


        try {

            const rows =
                await fetchLessons();


            const currentLesson =
                findCurrentLesson(rows);


            if (!currentLesson) {

                throw new Error(
                    "No current lesson is available."
                );

            }


            renderLesson(
                currentLesson
            );


            showReader();


            console.log(
                "AFC Lessons: lesson loaded.",
                currentLesson
            );

        } catch (error) {

            console.error(
                "AFC Lessons:",
                error
            );


            showError(
                error.message ||
                "Unable to load this week's lesson."
            );

        }

    }


    /* ========================================================
       AOS
    ======================================================== */

    function initAOS() {

        if (
            typeof AOS !== "undefined"
        ) {

            AOS.init({

                duration: 550,

                once: true,

                offset: 30

            });

        }

    }


    /* ========================================================
       INITIALIZE
    ======================================================== */

    function initLessons() {

        initAOS();

        setupContinueButton();

        setupRetry();

        loadLesson();

        console.log(
            "AFC Portal Lessons initialized."
        );

    }


    /* ========================================================
       START
    ======================================================== */

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initLessons
        );

    } else {

        initLessons();

    }


})();
