/* ============================================================
   AFC ISIU YOUTH PORTAL
   FILE: lessons.js
   PURPOSE: WEEKLY LESSONS PAGE CONTROLLER
   ============================================================

   IMPORTANT:

   This file works with:

       main.css
       layout.css
       lessons.css

   It does NOT create a separate portal shell.

   The page already contains:

       .app-layout
       .sidebar
       .topbar
       .bottom-nav

   Lesson data is loaded from the existing lesson source.
   ============================================================ */

(function () {

    "use strict";


    /* ========================================================
       CONFIGURATION
    ======================================================== */

    const LESSON_CONFIG = {

        /*
         * Keep this URL the same as the lesson source
         * that was already working in the portal.
         *
         * If your existing working lessons.js already has
         * a specific CSV URL, replace ONLY the value below
         * with that exact URL.
         */

        CSV_URL:
            "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIit/pub?output=csv",

        DEFAULT_CLASS:
            "Senior"

    };


    /* ========================================================
       STATE
    ======================================================== */

    let allLessons = [];

    let currentClass =
        LESSON_CONFIG.DEFAULT_CLASS;

    let currentLesson = null;

    let readingTimer = null;

    let readingSeconds = 0;

    let hasStartedReading = false;


    /* ========================================================
       DOM HELPER
    ======================================================== */

    function $(id) {

        return document.getElementById(id);

    }


    /* ========================================================
       SAFE TEXT
    ======================================================== */

    function safeText(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }

        return String(value).trim();

    }


    /* ========================================================
       NORMALIZE HEADER
    ======================================================== */

    function normalizeHeader(value) {

        return safeText(value)
            .toLowerCase()
            .replace(/[\s_\-]+/g, "");

    }


    /* ========================================================
       FIND VALUE
    ======================================================== */

    function getField(row, names) {

        const keys =
            Object.keys(row || {});


        for (const wanted of names) {

            const normalizedWanted =
                normalizeHeader(wanted);


            const key =
                keys.find(item =>
                    normalizeHeader(item) ===
                    normalizedWanted
                );


            if (key !== undefined) {

                return safeText(row[key]);

            }

        }


        return "";

    }


    /* ========================================================
       HTML ESCAPE
    ======================================================== */

    function escapeHtml(value) {

        return safeText(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    /* ========================================================
       BASIC MARKDOWN
    ======================================================== */

    function markdownToHtml(text) {

        if (!text) {

            return "";

        }


        let value =
            escapeHtml(text);


        /*
         * Headings
         */

        value =
            value.replace(
                /^### (.*)$/gm,
                "<h4>$1</h4>"
            );


        value =
            value.replace(
                /^## (.*)$/gm,
                "<h3>$1</h3>"
            );


        value =
            value.replace(
                /^# (.*)$/gm,
                "<h2>$1</h2>"
            );


        /*
         * Bold
         */

        value =
            value.replace(
                /\*\*(.*?)\*\*/g,
                "<strong>$1</strong>"
            );


        /*
         * Italic
         */

        value =
            value.replace(
                /\*(.*?)\*/g,
                "<em>$1</em>"
            );


        /*
         * Bullet lists
         */

        value =
            value.replace(
                /^(?:[-•] .*(?:\n|$))+?/gm,
                block => {

                    const items =
                        block
                            .trim()
                            .split("\n")
                            .map(item =>
                                item
                                    .replace(
                                        /^[-•]\s*/,
                                        ""
                                    )
                            )
                            .filter(Boolean);


                    if (!items.length) {

                        return block;

                    }


                    return (
                        "<ul>" +
                        items
                            .map(item =>
                                `<li>${item}</li>`
                            )
                            .join("") +
                        "</ul>"
                    );

                }
            );


        /*
         * Numbered lists
         */

        value =
            value.replace(
                /^(?:\d+\.\s.*(?:\n|$))+?/gm,
                block => {

                    const items =
                        block
                            .trim()
                            .split("\n")
                            .map(item =>
                                item.replace(
                                    /^\d+\.\s*/,
                                    ""
                                )
                            )
                            .filter(Boolean);


                    if (!items.length) {

                        return block;

                    }


                    return (
                        "<ol>" +
                        items
                            .map(item =>
                                `<li>${item}</li>`
                            )
                            .join("") +
                        "</ol>"
                    );

                }
            );


        /*
         * Paragraphs
         */

        const lines =
            value.split(/\n{2,}/);


        value =
            lines
                .map(block => {

                    const trimmed =
                        block.trim();


                    if (!trimmed) {

                        return "";

                    }


                    if (
                        /^<h[234]>/.test(trimmed) ||
                        /^<(ul|ol|blockquote)/.test(trimmed)
                    ) {

                        return trimmed;

                    }


                    return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;

                })
                .join("");


        return value;

    }


    /* ========================================================
       NORMALIZE LESSON
    ======================================================== */

    function normalizeLesson(row) {

        const lessonClass =
            getField(
                row,
                [
                    "Class",
                    "Class Level",
                    "Category",
                    "Group",
                    "Type"
                ]
            );


        const title =
            getField(
                row,
                [
                    "Title",
                    "Lesson Title",
                    "Topic",
                    "Lesson Topic",
                    "Subject"
                ]
            );


        const theme =
            getField(
                row,
                [
                    "Theme",
                    "Lesson Theme",
                    "Subtopic",
                    "Subtitle"
                ]
            );


        const bibleText =
            getField(
                row,
                [
                    "Bible Text",
                    "BibleText",
                    "Scripture",
                    "Bible Passage",
                    "Bible Reference"
                ]
            );


        const memoryVerse =
            getField(
                row,
                [
                    "Memory Verse",
                    "MemoryVerse",
                    "Memory"
                ]
            );


        const lessonNumber =
            getField(
                row,
                [
                    "Lesson Number",
                    "Lesson No",
                    "Lesson",
                    "Number"
                ]
            );


        const week =
            getField(
                row,
                [
                    "Week",
                    "Week Number",
                    "Week No"
                ]
            );


        const date =
            getField(
                row,
                [
                    "Date",
                    "Lesson Date"
                ]
            );


        const content =
            getField(
                row,
                [
                    "Content",
                    "Lesson Content",
                    "Notes",
                    "Lesson Notes",
                    "Combined Lesson",
                    "Combined Lesson Note",
                    "Body"
                ]
            );


        return {

            ...row,

            className:
                lessonClass,

            title:
                title,

            theme:
                theme,

            bibleText:
                bibleText,

            memoryVerse:
                memoryVerse,

            lessonNumber:
                lessonNumber,

            week:
                week,

            date:
                date,

            content:
                content

        };

    }


    /* ========================================================
       DETERMINE CLASS
    ======================================================== */

    function lessonMatchesClass(
        lesson,
        className
    ) {

        const value =
            safeText(lesson.className)
                .toLowerCase();


        const target =
            safeText(className)
                .toLowerCase();


        if (!value) {

            return false;

        }


        return (
            value === target ||
            value.includes(target) ||
            target.includes(value)
        );

    }


    /* ========================================================
       FILTER LESSONS
    ======================================================== */

    function getLessonsForClass(
        className
    ) {

        const matched =
            allLessons.filter(
                lesson =>
                    lessonMatchesClass(
                        lesson,
                        className
                    )
            );


        return matched;

    }


    /* ========================================================
       FIND CURRENT LESSON
    ======================================================== */

    function getCurrentLesson(
        className
    ) {

        const lessons =
            getLessonsForClass(
                className
            );


        if (!lessons.length) {

            return null;

        }


        /*
         * Prefer the first lesson.
         * This preserves the normal weekly
         * sheet ordering.
         */

        return lessons[0];

    }


    /* ========================================================
       LOADING STATE
    ======================================================== */

    function showLoading() {

        const loading =
            $("lessonsLoading");

        const error =
            $("lessonsError");

        const view =
            $("lessonView");


        if (loading) {

            loading.hidden = false;

        }


        if (error) {

            error.hidden = true;

        }


        if (view) {

            view.hidden = true;

        }

    }


    /* ========================================================
       ERROR STATE
    ======================================================== */

    function showError(
        message
    ) {

        const loading =
            $("lessonsLoading");

        const error =
            $("lessonsError");

        const view =
            $("lessonView");

        const messageElement =
            $("lessonsErrorMessage");


        if (loading) {

            loading.hidden = true;

        }


        if (view) {

            view.hidden = true;

        }


        if (error) {

            error.hidden = false;

        }


        if (messageElement) {

            messageElement.textContent =
                message ||
                "Unable to load lessons.";

        }

    }


    /* ========================================================
       SHOW VIEW
    ======================================================== */

    function showLessonView() {

        const loading =
            $("lessonsLoading");

        const error =
            $("lessonsError");

        const view =
            $("lessonView");


        if (loading) {

            loading.hidden = true;

        }


        if (error) {

            error.hidden = true;

        }


        if (view) {

            view.hidden = false;

        }

    }


    /* ========================================================
       UPDATE CLASS TABS
    ======================================================== */

    function updateClassTabs() {

        document
            .querySelectorAll(".class-tab")
            .forEach(button => {

                const value =
                    safeText(
                        button.dataset.class
                    );


                button.classList.toggle(
                    "active",
                    value === currentClass
                );

            });

    }


    /* ========================================================
       RENDER LESSON
    ======================================================== */

    function renderLesson(
        lesson
    ) {

        if (!lesson) {

            showError(
                `No ${currentClass} lesson was found in the lesson data.`
            );

            return;

        }


        currentLesson =
            lesson;


        resetReadingProgress();


        const title =
            $("lessonTitle");

        const theme =
            $("lessonTheme");

        const classBadge =
            $("lessonClassBadge");

        const bibleText =
            $("lessonBibleText");

        const memoryVerse =
            $("lessonMemoryVerse");

        const lessonNumber =
            $("lessonNumber");

        const lessonDate =
            $("lessonDate");

        const lessonWeek =
            $("lessonWeek");

        const content =
            $("lessonContent");


        if (title) {

            title.textContent =
                lesson.title ||
                "Weekly Lesson";

        }


        if (theme) {

            theme.textContent =
                lesson.theme || "";

        }


        if (classBadge) {

            classBadge.textContent =
                currentClass.toUpperCase();

        }


        if (bibleText) {

            bibleText.textContent =
                lesson.bibleText ||
                "See lesson notes";

        }


        if (memoryVerse) {

            memoryVerse.textContent =
                lesson.memoryVerse ||
                "Memory verse not available.";

        }


        if (lessonNumber) {

            lessonNumber.textContent =
                lesson.lessonNumber ||
                "Weekly Lesson";

        }


        if (lessonDate) {

            lessonDate.textContent =
                lesson.date ||
                lesson.week ||
                "This Week";

        }


        if (lessonWeek) {

            const span =
                lessonWeek.querySelector("span");


            if (span) {

                span.textContent =
                    lesson.week ||
                    lesson.date ||
                    "This Week";

            }

        }


        if (content) {

            content.innerHTML =
                markdownToHtml(
                    lesson.content
                );

        }


        calculateLessonMeta();


        loadSavedProgress();


        showLessonView();

    }


    /* ========================================================
       LOAD LESSONS
    ======================================================== */

    async function loadLessons() {

        showLoading();


        try {

            /*
             * Papa Parse is preferred because the portal
             * already loads it globally.
             */

            if (
                typeof Papa === "undefined"
            ) {

                throw new Error(
                    "Papa Parse library is not available."
                );

            }


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
                    `Lesson source returned ${response.status}.`
                );

            }


            const csv =
                await response.text();


            if (!csv.trim()) {

                throw new Error(
                    "The lesson source returned empty data."
                );

            }


            const parsed =
                Papa.parse(
                    csv,
                    {
                        header: true,
                        skipEmptyLines: true
                    }
                );


            if (
                parsed.errors &&
                parsed.errors.length
            ) {

                console.warn(
                    "Lesson CSV parsing warnings:",
                    parsed.errors
                );

            }


            allLessons =
                (parsed.data || [])
                    .map(normalizeLesson)
                    .filter(lesson =>
                        Object.keys(lesson)
                            .some(key =>
                                safeText(
                                    lesson[key]
                                )
                            )
                    );


            console.log(
                "Parsed Lessons:",
                allLessons
            );


            if (!allLessons.length) {

                throw new Error(
                    "No lesson records were found."
                );

            }


            const firstLesson =
                getCurrentLesson(
                    currentClass
                );


            if (!firstLesson) {

                /*
                 * Do not destroy the page if the sheet
                 * uses slightly different class naming.
                 *
                 * Display available classes for debugging.
                 */

                const availableClasses =
                    [
                        ...new Set(
                            allLessons
                                .map(
                                    lesson =>
                                        lesson.className
                                )
                                .filter(Boolean)
                        )
                    ];


                throw new Error(
                    `No ${currentClass} lesson found. Available classes: ${availableClasses.join(", ")}`
                );

            }


            renderLesson(
                firstLesson
            );


        } catch (error) {

            console.error(
                "Lessons loading error:",
                error
            );


            showError(
                error.message ||
                "Unable to load lessons."
            );

        }

    }


    /* ========================================================
       SWITCH CLASS
    ======================================================== */

    function switchClass(
        className
    ) {

        currentClass =
            className;


        updateClassTabs();


        const lesson =
            getCurrentLesson(
                currentClass
            );


        if (!lesson) {

            showError(
                `No ${currentClass} lesson was found.`
            );

            return;

        }


        renderLesson(
            lesson
        );

    }


    /* ========================================================
       CALCULATE LESSON META
    ======================================================== */

    function calculateLessonMeta() {

        const content =
            $("lessonContent");


        if (!content) {

            return;

        }


        const paragraphs =
            content.querySelectorAll(
                "p"
            );


        const words =
            Array.from(
                content.querySelectorAll(
                    "p, li, h2, h3, h4"
                )
            )
                .map(
                    element =>
                        element.textContent
                )
                .join(" ")
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .length;


        const minutes =
            Math.max(
                1,
                Math.ceil(
                    words / 180
                )
            );


        const sections =
            content.querySelectorAll(
                "h2, h3"
            ).length;


        const readingTime =
            `${minutes} min`;


        if ($("readingTime")) {

            $("readingTime").textContent =
                readingTime;

        }


        if ($("mobileReadingTime")) {

            $("mobileReadingTime").textContent =
                readingTime;

        }


        if ($("sectionCount")) {

            $("sectionCount").textContent =
                sections ||
                Math.max(
                    1,
                    paragraphs.length
                );

        }


        if ($("mobileSectionCount")) {

            $("mobileSectionCount").textContent =
                sections ||
                Math.max(
                    1,
                    paragraphs.length
                );

        }

    }


    /* ========================================================
       READING PROGRESS
    ======================================================== */

    function startReadingTimer() {

        if (hasStartedReading) {

            return;

        }


        hasStartedReading =
            true;


        readingTimer =
            setInterval(
                () => {

                    readingSeconds++;

                },
                1000
            );

    }


    function stopReadingTimer() {

        if (readingTimer) {

            clearInterval(
                readingTimer
            );

            readingTimer = null;

        }

    }


    function updateProgress() {

        const content =
            $("lessonContent");


        if (!content) {

            return;

        }


        const rect =
            content.getBoundingClientRect();


        const contentHeight =
            content.scrollHeight;


        const viewportBottom =
            window.scrollY +
            window.innerHeight;


        const contentTop =
            window.scrollY +
            rect.top;


        const readableHeight =
            Math.max(
                1,
                contentHeight -
                window.innerHeight * .35
            );


        let percent =
            (
                (viewportBottom - contentTop) /
                readableHeight
            ) * 100;


        percent =
            Math.max(
                0,
                Math.min(
                    100,
                    percent
                )
            );


        const rounded =
            Math.round(
                percent
            );


        setProgress(
            rounded
        );


        if (
            rounded > 2
        ) {

            startReadingTimer();

        }


        if (
            rounded >= 95
        ) {

            setProgress(
                100
            );

        }

    }


    function setProgress(
        percent
    ) {

        const progressBar =
            $("progressBar");

        const mobileProgressBar =
            $("mobileProgressBar");

        const progressPercent =
            $("progressPercent");

        const mobileProgressPercent =
            $("mobileProgressPercent");

        const progressText =
            $("progressText");


        const value =
            `${percent}%`;


        if (progressBar) {

            progressBar.style.width =
                value;

        }


        if (mobileProgressBar) {

            mobileProgressBar.style.width =
                value;

        }


        if (progressPercent) {

            progressPercent.textContent =
                value;

        }


        if (mobileProgressPercent) {

            mobileProgressPercent.textContent =
                value;

        }


        if (progressText) {

            if (percent >= 100) {

                progressText.textContent =
                    "Lesson completed. Well done!";

            } else if (percent > 0) {

                progressText.textContent =
                    "Keep going — you're making progress.";

            } else {

                progressText.textContent =
                    "Start reading this lesson.";

            }

        }

    }


    /* ========================================================
       LOCAL STORAGE KEY
    ======================================================== */

    function getProgressKey() {

        const title =
            currentLesson &&
            currentLesson.title
                ? currentLesson.title
                : "lesson";


        return (
            "afc_isiwu_lesson_progress_" +
            currentClass +
            "_" +
            title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
        );

    }


    /* ========================================================
       LOAD SAVED PROGRESS
    ======================================================== */

    function loadSavedProgress() {

        try {

            const saved =
                localStorage.getItem(
                    getProgressKey()
                );


            if (
                saved === "completed"
            ) {

                setProgress(
                    100
                );


                markButtonsCompleted();

            } else {

                setProgress(
                    0
                );


                markButtonsIncomplete();

            }

        } catch (error) {

            console.warn(
                "Unable to load lesson progress:",
                error
            );

        }

    }


    /* ========================================================
       RESET READING
    ======================================================== */

    function resetReadingProgress() {

        stopReadingTimer();


        readingSeconds =
            0;


        hasStartedReading =
            false;


        markButtonsIncomplete();


        setProgress(
            0
        );

    }


    /* ========================================================
       MARK COMPLETE
    ======================================================== */

    function markLessonComplete() {

        try {

            localStorage.setItem(
                getProgressKey(),
                "completed"
            );

        } catch (error) {

            console.warn(
                "Unable to save lesson completion:",
                error
            );

        }


        stopReadingTimer();


        setProgress(
            100
        );


        markButtonsCompleted();

    }


    /* ========================================================
       BUTTON STATE
    ======================================================== */

    function markButtonsCompleted() {

        const buttons =
            document.querySelectorAll(
                ".finish-reading-btn"
            );


        buttons.forEach(
            button => {

                button.classList.add(
                    "completed"
                );


                const icon =
                    button.querySelector(
                        ".finish-icon i"
                    );


                const strong =
                    button.querySelector(
                        ".finish-text strong"
                    );


                const small =
                    button.querySelector(
                        ".finish-text small"
                    );


                if (icon) {

                    icon.className =
                        "fa-solid fa-check-double";

                }


                if (strong) {

                    strong.textContent =
                        "Lesson completed";

                }


                if (small) {

                    small.textContent =
                        "You've finished reading";

                }

            }
        );

    }


    function markButtonsIncomplete() {

        const buttons =
            document.querySelectorAll(
                ".finish-reading-btn"
            );


        buttons.forEach(
            button => {

                button.classList.remove(
                    "completed"
                );


                const icon =
                    button.querySelector(
                        ".finish-icon i"
                    );


                const strong =
                    button.querySelector(
                        ".finish-text strong"
                    );


                const small =
                    button.querySelector(
                        ".finish-text small"
                    );


                if (icon) {

                    icon.className =
                        "fa-solid fa-check";

                }


                if (strong) {

                    strong.textContent =
                        "I've read this lesson";

                }


                if (small) {

                    small.textContent =
                        "Mark lesson as completed";

                }

            }
        );

    }


    /* ========================================================
       FINISH BUTTONS
    ======================================================== */

    function setupFinishButtons() {

        document
            .querySelectorAll(
                ".finish-reading-btn"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        markLessonComplete
                    );

                }
            );

    }


    /* ========================================================
       CLASS TABS
    ======================================================== */

    function setupClassTabs() {

        document
            .querySelectorAll(
                ".class-tab"
            )
            .forEach(
                button => {

                    button.addEventListener(
                        "click",
                        () => {

                            const className =
                                button.dataset.class;


                            if (!className) {

                                return;

                            }


                            switchClass(
                                className
                            );

                        }
                    );

                }
            );

    }


    /* ========================================================
       MOBILE SIDEBAR
    ======================================================== */

    function setupMobileNavigation() {

        const sidebar =
            $("sidebar");

        const overlay =
            $("sidebarOverlay");

        const menuButton =
            $("mobileMenuBtn");

        const hubButton =
            $("hubButton");


        if (
            !sidebar ||
            !overlay
        ) {

            return;

        }


        function openMenu() {

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


        function closeMenu() {

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
                openMenu
            );

        }


        if (hubButton) {

            hubButton.addEventListener(
                "click",
                openMenu
            );

        }


        overlay.addEventListener(
            "click",
            closeMenu
        );


        sidebar
            .querySelectorAll("a")
            .forEach(
                link => {

                    link.addEventListener(
                        "click",
                        closeMenu
                    );

                }
            );


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape"
                ) {

                    closeMenu();

                }

            }
        );

    }


    /* ========================================================
       RETRY
    ======================================================== */

    function setupRetry() {

        const retry =
            $("retryLessons");


        if (!retry) {

            return;

        }


        retry.addEventListener(
            "click",
            loadLessons
        );

    }


    /* ========================================================
       SCROLL
    ======================================================== */

    function setupScrollTracking() {

        let ticking =
            false;


        window.addEventListener(
            "scroll",
            () => {

                if (ticking) {

                    return;

                }


                window.requestAnimationFrame(
                    () => {

                        updateProgress();

                        ticking =
                            false;

                    }
                );


                ticking =
                    true;

            },
            {
                passive: true
            }
        );

    }


    /* ========================================================
       INITIALIZE
    ======================================================== */

    async function initLessons() {

        setupClassTabs();

        setupFinishButtons();

        setupMobileNavigation();

        setupRetry();

        setupScrollTracking();

        updateClassTabs();

        await loadLessons();

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
            initLessons
        );

    } else {

        initLessons();

    }


    /* ========================================================
       OPTIONAL GLOBAL API
    ======================================================== */

    window.AFCLessons = {

        switchClass:
            switchClass,

        reload:
            loadLessons,

        getCurrentLesson:
            () => currentLesson

    };


})();
