/* =========================================================
   AFC ISIU YOUTH PORTAL
   FILE: lessons.js
   PURPOSE: WEEKLY LESSONS PAGE CONTROLLER
   VERSION: 4.0 — ISOLATED LESSON ENGINE

   IMPORTANT:
   - This file controls ONLY the lessons page.
   - Header/sidebar/bottom navigation are controlled by main.js.
   - No global functions are exposed unnecessarily.
   - Does not redefine parseCSV().
   - Works with the exact lessons.html structure.
   - Online Google Sheets data is preferred.
   - IndexedDB is used as offline cache.
   - LocalStorage is used as second fallback.
========================================================= */

(() => {

    "use strict";


    /* =====================================================
       CONFIGURATION
    ===================================================== */

    const CONFIG = {

        csv:
            "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=201183837&single=true&output=csv",

        localStorageKey:
            "afc_isiu_weekly_lessons_v4",

        selectedClassKey:
            "selectedLessonClass",

        dbName:
            "AFC_Isiu_Lessons",

        dbVersion:
            2,

        storeName:
            "lessons"

    };


    /* =====================================================
       STATE
    ===================================================== */

    let lessons = [];

    let currentClass = "Senior";

    let currentLesson = null;

    let isLoading = false;


    /* =====================================================
       DOM
    ===================================================== */

    let DOM = {};


    function cacheDOM() {

        DOM = {

            /* Page */

            page:
                document.querySelector(".lessons-page"),

            container:
                document.querySelector(".dashboard-container"),


            /* Header */

            lessonWeek:
                document.getElementById("lessonWeek"),


            /* Tabs */

            classTabs:
                document.querySelectorAll(".class-tab"),


            /* Loading */

            loading:
                document.getElementById("lessonsLoading"),


            /* Error */

            error:
                document.getElementById("lessonsError"),

            errorMessage:
                document.getElementById("lessonsErrorMessage"),

            retry:
                document.getElementById("retryLessons"),


            /* Main lesson */

            lessonView:
                document.getElementById("lessonView"),

            lessonClassBadge:
                document.getElementById("lessonClassBadge"),

            lessonStatus:
                document.getElementById("lessonStatus"),

            lessonTitle:
                document.getElementById("lessonTitle"),

            lessonTheme:
                document.getElementById("lessonTheme"),


            /* Information */

            lessonBibleText:
                document.getElementById("lessonBibleText"),

            lessonNumber:
                document.getElementById("lessonNumber"),

            lessonDate:
                document.getElementById("lessonDate"),


            /* Memory verse */

            lessonMemoryVerse:
                document.getElementById("lessonMemoryVerse"),


            /* Content */

            lessonContent:
                document.getElementById("lessonContent"),


            /* Desktop progress */

            progressPercent:
                document.getElementById("progressPercent"),

            progressBar:
                document.getElementById("progressBar"),

            progressText:
                document.getElementById("progressText"),

            readingTime:
                document.getElementById("readingTime"),

            sectionCount:
                document.getElementById("sectionCount"),

            finishReadingBtn:
                document.getElementById("finishReadingBtn"),


            /* Mobile progress */

            mobileReadingTime:
                document.getElementById("mobileReadingTime"),

            mobileSectionCount:
                document.getElementById("mobileSectionCount"),

            mobileProgressPercent:
                document.getElementById("mobileProgressPercent"),

            mobileProgressBar:
                document.getElementById("mobileProgressBar"),

            mobileFinishReadingBtn:
                document.getElementById(
                    "mobileFinishReadingBtn"
                )

        };

    }


    /* =====================================================
       SMALL HELPERS
    ===================================================== */

    function text(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }

        return String(value).trim();

    }


    function normalizeClass(value) {

        return text(value)
            .toLowerCase()
            .replace(/\s+/g, " ");

    }


    function escapeHTML(value) {

        return text(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    function show(element) {

        if (!element) {
            return;
        }

        element.hidden = false;

    }


    function hide(element) {

        if (!element) {
            return;
        }

        element.hidden = true;

    }


    /* =====================================================
       INDEXEDDB
    ===================================================== */

    function openLessonDB() {

        if (
            !("indexedDB" in window)
        ) {

            return Promise.reject(
                new Error(
                    "IndexedDB is not supported."
                )
            );

        }


        return new Promise(
            (resolve, reject) => {

                const request =
                    indexedDB.open(
                        CONFIG.dbName,
                        CONFIG.dbVersion
                    );


                request.onupgradeneeded =
                    event => {

                        const db =
                            event.target.result;


                        if (
                            !db.objectStoreNames.contains(
                                CONFIG.storeName
                            )
                        ) {

                            db.createObjectStore(
                                CONFIG.storeName,
                                {
                                    keyPath: "id"
                                }
                            );

                        }

                    };


                request.onsuccess =
                    () => {

                        resolve(
                            request.result
                        );

                    };


                request.onerror =
                    () => {

                        reject(
                            request.error ||
                            new Error(
                                "Unable to open lesson database."
                            )
                        );

                    };

            }
        );

    }


    async function saveLessonsToIndexedDB(
        data
    ) {

        try {

            const db =
                await openLessonDB();


            return new Promise(
                (resolve, reject) => {

                    const transaction =
                        db.transaction(
                            CONFIG.storeName,
                            "readwrite"
                        );


                    const store =
                        transaction.objectStore(
                            CONFIG.storeName
                        );


                    store.clear();


                    data.forEach(
                        (lesson, index) => {

                            store.put({

                                id:
                                    index + 1,

                                Lesson:
                                    lesson.Lesson,

                                Class:
                                    lesson.Class,

                                Topic:
                                    lesson.Topic,

                                BibleText:
                                    lesson.BibleText,

                                MemoryVerse:
                                    lesson.MemoryVerse,

                                Summary:
                                    lesson.Summary,

                                Discussion:
                                    lesson.Discussion,

                                YorubaAudio:
                                    lesson.YorubaAudio,

                                Week:
                                    lesson.Week,

                                Date:
                                    lesson.Date,

                                Theme:
                                    lesson.Theme

                            });

                        }
                    );


                    transaction.oncomplete =
                        () => {

                            db.close();

                            console.log(
                                "AFC Isiu Lessons: IndexedDB cache updated."
                            );

                            resolve();

                        };


                    transaction.onerror =
                        () => {

                            db.close();

                            reject(
                                transaction.error
                            );

                        };

                }
            );

        }

        catch (error) {

            console.warn(
                "AFC Isiu Lessons: IndexedDB save failed.",
                error
            );

        }

    }


    async function getLessonsFromIndexedDB() {

        try {

            const db =
                await openLessonDB();


            return new Promise(
                (resolve, reject) => {

                    const transaction =
                        db.transaction(
                            CONFIG.storeName,
                            "readonly"
                        );


                    const store =
                        transaction.objectStore(
                            CONFIG.storeName
                        );


                    const request =
                        store.getAll();


                    request.onsuccess =
                        () => {

                            db.close();

                            resolve(
                                request.result || []
                            );

                        };


                    request.onerror =
                        () => {

                            db.close();

                            reject(
                                request.error
                            );

                        };

                }
            );

        }

        catch (error) {

            console.warn(
                "AFC Isiu Lessons: IndexedDB read failed.",
                error
            );

            return [];

        }

    }


    /* =====================================================
       LOCAL STORAGE
    ===================================================== */

    function saveLessonsLocally(
        data
    ) {

        try {

            localStorage.setItem(

                CONFIG.localStorageKey,

                JSON.stringify({

                    savedAt:
                        new Date().toISOString(),

                    lessons:
                        data

                })

            );

        }

        catch (error) {

            console.warn(
                "AFC Isiu Lessons: LocalStorage save failed.",
                error
            );

        }

    }


    function getLessonsLocally() {

        try {

            const saved =
                localStorage.getItem(
                    CONFIG.localStorageKey
                );


            if (!saved) {

                return [];

            }


            const parsed =
                JSON.parse(saved);


            if (
                !parsed ||
                !Array.isArray(
                    parsed.lessons
                )
            ) {

                return [];

            }


            return parsed.lessons;

        }

        catch (error) {

            console.warn(
                "AFC Isiu Lessons: LocalStorage read failed.",
                error
            );

            return [];

        }

    }


    /* =====================================================
       CSV PARSER
       
       IMPORTANT:
       This is PRIVATE to lessons.js.
       It does not conflict with main.js parseCSV().
    ===================================================== */

    function parseLessonCSV(csv) {

        const rows = [];

        let row = [];

        let value = "";

        let insideQuotes = false;


        for (
            let i = 0;
            i < csv.length;
            i++
        ) {

            const char =
                csv[i];

            const next =
                csv[i + 1];


            if (
                char === '"'
            ) {

                if (
                    insideQuotes &&
                    next === '"'
                ) {

                    value += '"';

                    i++;

                }

                else {

                    insideQuotes =
                        !insideQuotes;

                }

            }

            else if (
                char === "," &&
                !insideQuotes
            ) {

                row.push(value);

                value = "";

            }

            else if (
                (
                    char === "\n" ||
                    char === "\r"
                ) &&
                !insideQuotes
            ) {

                if (
                    char === "\r" &&
                    next === "\n"
                ) {

                    i++;

                }


                row.push(value);

                rows.push(row);

                row = [];

                value = "";

            }

            else {

                value += char;

            }

        }


        if (
            value !== "" ||
            row.length
        ) {

            row.push(value);

            rows.push(row);

        }


        if (!rows.length) {

            return [];

        }


        const headers =
            rows[0].map(
                header =>
                    text(header)
                        .replace(
                            /^\uFEFF/,
                            ""
                        )
            );


        return rows
            .slice(1)
            .filter(
                row =>
                    row.some(
                        cell =>
                            text(cell) !== ""
                    )
            )
            .map(
                row => {

                    const object = {};


                    headers.forEach(
                        (
                            header,
                            index
                        ) => {

                            object[header] =
                                text(
                                    row[index] || ""
                                );

                        }
                    );


                    return object;

                }
            );

    }


    /* =====================================================
       NORMALIZE LESSON DATA
    ===================================================== */

    function normalizeLessons(
        data
    ) {

        if (!Array.isArray(data)) {

            return [];

        }


        return data
            .map(
                lesson => {

                    return {

                        Lesson:
                            text(
                                lesson.Lesson
                            ),

                        Class:
                            text(
                                lesson.Class
                            ),

                        Topic:
                            text(
                                lesson.Topic
                            ),

                        BibleText:
                            text(
                                lesson.BibleText
                            ),

                        MemoryVerse:
                            text(
                                lesson.MemoryVerse
                            ),

                        Summary:
                            text(
                                lesson.Summary
                            ),

                        Discussion:
                            text(
                                lesson.Discussion
                            ),

                        YorubaAudio:
                            text(
                                lesson.YorubaAudio
                            ),

                        Week:
                            text(
                                lesson.Week
                            ),

                        Date:
                            text(
                                lesson.Date
                            ),

                        Theme:
                            text(
                                lesson.Theme
                            )

                    };

                }
            )
            .filter(
                lesson =>
                    lesson.Class ||
                    lesson.Topic
            );

    }


    /* =====================================================
       LOADING UI
    ===================================================== */

    function showLessonsLoading() {

        show(DOM.loading);

        hide(DOM.error);

        hide(DOM.lessonView);

    }


    function hideLessonsLoading() {

        hide(DOM.loading);

    }


    /* =====================================================
       ERROR UI
    ===================================================== */

    function showLessonsError(
        message
    ) {

        hide(DOM.loading);

        hide(DOM.lessonView);

        show(DOM.error);


        if (DOM.errorMessage) {

            DOM.errorMessage.textContent =
                message ||
                "Unable to load the weekly lessons.";

        }

    }


    /* =====================================================
       WEEK LABEL
    ===================================================== */

    function updateWeekLabel(
        lesson
    ) {

        if (!DOM.lessonWeek) {

            return;

        }


        let value = "";


        if (lesson) {

            value =
                lesson.Week ||
                lesson.Date ||
                "";

        }


        if (!value) {

            value =
                "THIS WEEK";

        }


        DOM.lessonWeek.innerHTML = `

            <i class="fa-regular fa-calendar"></i>

            <span>
                ${escapeHTML(value)}
            </span>

        `;

    }


    /* =====================================================
       TAB STATE
    ===================================================== */

    function updateTabState(
        className
    ) {

        if (!DOM.classTabs) {

            return;

        }


        DOM.classTabs.forEach(
            tab => {

                const tabClass =
                    normalizeClass(
                        tab.dataset.class
                    );


                const selected =
                    tabClass ===
                    normalizeClass(
                        className
                    );


                tab.classList.toggle(
                    "active",
                    selected
                );


                tab.setAttribute(
                    "aria-selected",
                    selected
                        ? "true"
                        : "false"
                );

            }
        );

    }


    /* =====================================================
       FIND LESSON
    ===================================================== */

    function findLesson(
        className
    ) {

        const wanted =
            normalizeClass(
                className
            );


        return lessons.find(
            lesson =>
                normalizeClass(
                    lesson.Class
                ) === wanted
        );

    }


    /* =====================================================
       FORMAT LESSON CONTENT
    ===================================================== */

    function formatLessonContent(
        lesson
    ) {

        if (!DOM.lessonContent) {

            return;

        }


        const sections = [];


        if (lesson.Summary) {

            sections.push({

                title:
                    "Lesson Summary",

                content:
                    lesson.Summary

            });

        }


        if (lesson.Discussion) {

            sections.push({

                title:
                    "Discussion",

                content:
                    lesson.Discussion

            });

        }


        if (!sections.length) {

            DOM.lessonContent.innerHTML = `

                <div class="lesson-section">

                    <h2 class="section-title">
                        Lesson Content
                    </h2>

                    <p class="lesson-text">
                        Lesson content is not available yet.
                    </p>

                </div>

            `;

            return;

        }


        DOM.lessonContent.innerHTML =
            sections
                .map(
                    section => `

                        <section class="lesson-section">

                            <h2 class="section-title">
                                ${escapeHTML(
                                    section.title
                                )}
                            </h2>

                            <div class="lesson-text">
                                ${formatText(
                                    section.content
                                )}
                            </div>

                        </section>

                    `
                )
                .join("");

    }


    function formatText(
        value
    ) {

        const escaped =
            escapeHTML(value);


        return escaped
            .replace(
                /\r?\n\r?\n/g,
                "</p><p>"
            )
            .replace(
                /\r?\n/g,
                "<br>"
            );

    }


    /* =====================================================
       READING TIME
    ===================================================== */

    function calculateReadingTime() {

        if (!DOM.lessonContent) {

            return 1;

        }


        const content =
            DOM.lessonContent.innerText
                .trim();


        if (!content) {

            return 1;

        }


        const words =
            content.split(
                /\s+/
            ).filter(Boolean).length;


        return Math.max(
            1,
            Math.ceil(
                words / 200
            )
        );

    }


    /* =====================================================
       SECTION COUNT
    ===================================================== */

    function calculateSectionCount() {

        if (!DOM.lessonContent) {

            return 0;

        }


        return DOM.lessonContent
            .querySelectorAll(
                ".lesson-section"
            )
            .length;

    }


    /* =====================================================
       UPDATE LESSON META
    ===================================================== */

    function updateLessonMeta(
        lesson
    ) {

        const readingTime =
            calculateReadingTime();


        const sections =
            calculateSectionCount();


        if (DOM.readingTime) {

            DOM.readingTime.textContent =
                `${readingTime} min`;

        }


        if (DOM.mobileReadingTime) {

            DOM.mobileReadingTime.textContent =
                `${readingTime} min`;

        }


        if (DOM.sectionCount) {

            DOM.sectionCount.textContent =
                sections;

        }


        if (DOM.mobileSectionCount) {

            DOM.mobileSectionCount.textContent =
                sections;

        }

    }


    /* =====================================================
       RESET PROGRESS
    ===================================================== */

    function resetProgress() {

        updateProgress(0);

    }


    /* =====================================================
       PROGRESS
    ===================================================== */

    function updateProgress(
        percentage
    ) {

        const value =
            Math.min(
                100,
                Math.max(
                    0,
                    Math.round(
                        percentage
                    )
                )
            );


        if (DOM.progressPercent) {

            DOM.progressPercent.textContent =
                `${value}%`;

        }


        if (DOM.mobileProgressPercent) {

            DOM.mobileProgressPercent.textContent =
                `${value}%`;

        }


        if (DOM.progressBar) {

            DOM.progressBar.style.width =
                `${value}%`;

        }


        if (DOM.mobileProgressBar) {

            DOM.mobileProgressBar.style.width =
                `${value}%`;

        }


        if (DOM.progressText) {

            if (value >= 100) {

                DOM.progressText.textContent =
                    "Lesson completed. Well done!";

            }

            else if (value >= 75) {

                DOM.progressText.textContent =
                    "Almost there. Finish the lesson.";

            }

            else if (value >= 40) {

                DOM.progressText.textContent =
                    "Good progress. Keep reading.";

            }

            else if (value > 0) {

                DOM.progressText.textContent =
                    "Keep going with the lesson.";

            }

            else {

                DOM.progressText.textContent =
                    "Start reading this lesson.";

            }

        }

    }


    /* =====================================================
       SCROLL READING PROGRESS
    ===================================================== */

    function calculateReadingProgress() {

        if (
            !DOM.lessonContent ||
            !currentLesson
        ) {

            return;

        }


        const rect =
            DOM.lessonContent.getBoundingClientRect();


        const viewportHeight =
            window.innerHeight;


        const contentHeight =
            DOM.lessonContent.scrollHeight;


        if (
            contentHeight <=
            viewportHeight
        ) {

            updateProgress(100);

            return;

        }


        const pageTop =
            window.scrollY +
            rect.top;


        const scrollable =
            contentHeight -
            viewportHeight;


        const current =
            window.scrollY -
            pageTop +
            viewportHeight;


        const percentage =
            (
                current /
                scrollable
            ) * 100;


        updateProgress(
            Math.min(
                100,
                Math.max(
                    0,
                    percentage
                )
            )
        );

    }


    /* =====================================================
       RENDER LESSON
    ===================================================== */

    function renderLesson(
        className
    ) {

        const lesson =
            findLesson(
                className
            );


        if (!lesson) {

            currentLesson =
                null;


            updateTabState(
                className
            );


            if (DOM.lessonView) {

                hide(
                    DOM.lessonView
                );

            }


            showLessonsError(
                `${className} class lesson is not available yet.`
            );

            return;

        }


        currentLesson =
            lesson;

        currentClass =
            lesson.Class ||
            className;


        localStorage.setItem(
            CONFIG.selectedClassKey,
            currentClass
        );


        updateTabState(
            currentClass
        );


        /* ---------------------------------------------
           TOP SECTION
        --------------------------------------------- */

        if (DOM.lessonClassBadge) {

            DOM.lessonClassBadge.textContent =
                currentClass.toUpperCase();

        }


        if (DOM.lessonStatus) {

            DOM.lessonStatus.textContent =
                "THIS WEEK";

        }


        if (DOM.lessonTitle) {

            DOM.lessonTitle.textContent =
                lesson.Topic ||
                "Weekly Lesson";

        }


        if (DOM.lessonTheme) {

            DOM.lessonTheme.textContent =
                lesson.Theme ||
                "";

        }


        /* ---------------------------------------------
           INFORMATION
        --------------------------------------------- */

        if (DOM.lessonBibleText) {

            DOM.lessonBibleText.textContent =
                lesson.BibleText ||
                "—";

        }


        if (DOM.lessonNumber) {

            DOM.lessonNumber.textContent =
                lesson.Lesson ||
                "—";

        }


        if (DOM.lessonDate) {

            DOM.lessonDate.textContent =
                lesson.Date ||
                lesson.Week ||
                "This Week";

        }


        /* ---------------------------------------------
           MEMORY VERSE
        --------------------------------------------- */

        if (DOM.lessonMemoryVerse) {

            DOM.lessonMemoryVerse.textContent =
                lesson.MemoryVerse ||
                "—";

        }


        /* ---------------------------------------------
           CONTENT
        --------------------------------------------- */

        formatLessonContent(
            lesson
        );


        /* ---------------------------------------------
           META
        --------------------------------------------- */

        updateLessonMeta(
            lesson
        );


        /* ---------------------------------------------
           WEEK
        --------------------------------------------- */

        updateWeekLabel(
            lesson
        );


        /* ---------------------------------------------
           PROGRESS
        --------------------------------------------- */

        resetProgress();


        /* ---------------------------------------------
           DISPLAY
        --------------------------------------------- */

        hideLessonsLoading();

        hide(DOM.error);

        show(DOM.lessonView);


        /* ---------------------------------------------
           AUDIO
           The current lessons.html does not contain
           a Yoruba audio element, so we intentionally
           do not create one here.
        --------------------------------------------- */

        console.log(
            "AFC Isiu Lessons: Rendered",
            currentClass,
            lesson
        );


        /* ---------------------------------------------
           UPDATE AFTER LAYOUT
        --------------------------------------------- */

        requestAnimationFrame(
            () => {

                updateLessonMeta(
                    lesson
                );

                calculateReadingProgress();

            }
        );

    }


    /* =====================================================
       LOAD ONLINE LESSONS
    ===================================================== */

    async function loadOnlineLessons() {

        console.log(
            "AFC Isiu Lessons: Fetching Google Sheets..."
        );


        const response =
            await fetch(
                CONFIG.csv,
                {

                    method:
                        "GET",

                    cache:
                        "no-store"

                }
            );


        if (!response.ok) {

            throw new Error(
                `Google Sheets returned HTTP ${response.status}.`
            );

        }


        const csv =
            await response.text();


        if (!csv.trim()) {

            throw new Error(
                "Google Sheets returned empty data."
            );

        }


        let parsed;


        /* ---------------------------------------------
           PREFERRED: PAPAPARSE
        --------------------------------------------- */

        if (
            typeof Papa !== "undefined" &&
            typeof Papa.parse === "function"
        ) {

            const result =
                Papa.parse(
                    csv,
                    {

                        header:
                            true,

                        skipEmptyLines:
                            true,

                        transformHeader:
                            header =>
                                text(
                                    header
                                )

                    }
                );


            if (
                result.errors &&
                result.errors.length
            ) {

                console.warn(
                    "AFC Isiu Lessons: PapaParse warnings:",
                    result.errors
                );

            }


            parsed =
                result.data;

        }

        /* ---------------------------------------------
           FALLBACK PARSER
        --------------------------------------------- */

        else {

            console.warn(
                "AFC Isiu Lessons: PapaParse unavailable. Using internal parser."
            );


            parsed =
                parseLessonCSV(
                    csv
                );

        }


        const clean =
            normalizeLessons(
                parsed
            );


        if (!clean.length) {

            throw new Error(
                "No valid lessons were found in Google Sheets."
            );

        }


        lessons =
            clean;


        /* ---------------------------------------------
           SAVE CACHE
        --------------------------------------------- */

        saveLessonsLocally(
            lessons
        );


        await saveLessonsToIndexedDB(
            lessons
        );


        console.log(
            "AFC Isiu Lessons: Online lessons loaded.",
            lessons
        );


        return true;

    }


    /* =====================================================
       MASTER LOAD
    ===================================================== */

    async function loadLessons() {

        if (isLoading) {

            return;

        }


        isLoading =
            true;


        showLessonsLoading();


        try {

            /* -----------------------------------------
               ONLINE FIRST
            ----------------------------------------- */

            await loadOnlineLessons();


            const savedClass =
                localStorage.getItem(
                    CONFIG.selectedClassKey
                );


            const availableClasses =
                [
                    "Senior",
                    "Junior",
                    "Elementary"
                ];


            let classToShow =
                savedClass ||
                "Senior";


            const exists =
                lessons.some(
                    lesson =>
                        normalizeClass(
                            lesson.Class
                        ) ===
                        normalizeClass(
                            classToShow
                        )
                );


            if (!exists) {

                classToShow =
                    availableClasses.find(
                        className =>
                            findLesson(
                                className
                            )
                    ) ||
                    lessons[0].Class;

            }


            renderLesson(
                classToShow
            );


            return;

        }

        catch (onlineError) {

            console.warn(
                "AFC Isiu Lessons: Online loading failed.",
                onlineError
            );

        }


        /* ---------------------------------------------
           INDEXEDDB FALLBACK
        --------------------------------------------- */

        try {

            const cached =
                await getLessonsFromIndexedDB();


            if (
                cached &&
                cached.length
            ) {

                lessons =
                    normalizeLessons(
                        cached
                    );


                const savedClass =
                    localStorage.getItem(
                        CONFIG.selectedClassKey
                    ) ||
                    "Senior";


                const classExists =
                    findLesson(
                        savedClass
                    );


                renderLesson(
                    classExists
                        ? savedClass
                        : lessons[0].Class
                );


                console.log(
                    "AFC Isiu Lessons: Loaded from IndexedDB."
                );


                return;

            }

        }

        catch (indexedError) {

            console.warn(
                "AFC Isiu Lessons: IndexedDB failed.",
                indexedError
            );

        }


        /* ---------------------------------------------
           LOCAL STORAGE FALLBACK
        --------------------------------------------- */

        try {

            const cached =
                getLessonsLocally();


            if (
                cached &&
                cached.length
            ) {

                lessons =
                    normalizeLessons(
                        cached
                    );


                const savedClass =
                    localStorage.getItem(
                        CONFIG.selectedClassKey
                    ) ||
                    "Senior";


                const classExists =
                    findLesson(
                        savedClass
                    );


                renderLesson(
                    classExists
                        ? savedClass
                        : lessons[0].Class
                );


                console.log(
                    "AFC Isiu Lessons: Loaded from LocalStorage."
                );


                return;

            }

        }

        catch (storageError) {

            console.warn(
                "AFC Isiu Lessons: LocalStorage failed.",
                storageError
            );

        }


        /* ---------------------------------------------
           NOTHING AVAILABLE
        --------------------------------------------- */

        showLessonsError(
            "The lesson could not be loaded. Please check your internet connection and try again."
        );

    }

    finally {

        isLoading =
            false;

    }


    /* =====================================================
       CLASS TAB EVENTS
    ===================================================== */

    function initializeClassTabs() {

        if (!DOM.classTabs) {

            return;

        }


        DOM.classTabs.forEach(
            tab => {

                tab.addEventListener(
                    "click",
                    () => {

                        const className =
                            text(
                                tab.dataset.class
                            );


                        if (!className) {

                            return;

                        }


                        if (
                            !lessons.length
                        ) {

                            return;

                        }


                        renderLesson(
                            className
                        );


                        /* ---------------------------------
                           Scroll gently to lesson
                        --------------------------------- */

                        if (
                            DOM.lessonView
                        ) {

                            setTimeout(
                                () => {

                                    DOM.lessonView.scrollIntoView(
                                        {
                                            behavior:
                                                "smooth",

                                            block:
                                                "start"
                                        }
                                    );

                                },
                                50
                            );

                        }

                    }
                );

            }
        );

    }


    /* =====================================================
       RETRY BUTTON
    ===================================================== */

    function initializeRetry() {

        if (!DOM.retry) {

            return;

        }


        DOM.retry.addEventListener(
            "click",
            () => {

                loadLessons();

            }
        );

    }


    /* =====================================================
       FINISH READING BUTTON
       
       NOTE:
       This does NOT submit reflection or quiz data.
       It only marks the local reading state.
    ===================================================== */

    function markLessonAsRead(
        button
    ) {

        if (!currentLesson) {

            return;

        }


        const key =
            `lessonRead_${normalizeClass(
                currentLesson.Class
            )}_${currentLesson.Lesson || currentLesson.Topic}`;


        try {

            localStorage.setItem(
                key,
                JSON.stringify({

                    completed:
                        true,

                    completedAt:
                        new Date().toISOString()

                })
            );

        }

        catch (error) {

            console.warn(
                "AFC Isiu Lessons: Unable to save reading state.",
                error
            );

        }


        updateProgress(
            100
        );


        if (DOM.progressText) {

            DOM.progressText.textContent =
                "Lesson completed. Well done!";

        }


        if (button) {

            button.classList.add(
                "completed"
            );


            const strong =
                button.querySelector(
                    ".finish-text strong"
                );


            const small =
                button.querySelector(
                    ".finish-text small"
                );


            if (strong) {

                strong.textContent =
                    "Lesson completed";

            }


            if (small) {

                small.textContent =
                    "You have finished reading this lesson";

            }

        }


        /* ---------------------------------------------
           Keep both desktop/mobile buttons synchronized
        --------------------------------------------- */

        [
            DOM.finishReadingBtn,
            DOM.mobileFinishReadingBtn
        ]
            .filter(Boolean)
            .forEach(
                otherButton => {

                    otherButton.classList.add(
                        "completed"
                    );


                    const strong =
                        otherButton.querySelector(
                            ".finish-text strong"
                        );


                    const small =
                        otherButton.querySelector(
                            ".finish-text small"
                        );


                    if (strong) {

                        strong.textContent =
                            "Lesson completed";

                    }


                    if (small) {

                        small.textContent =
                            "You have finished reading this lesson";

                    }

                }
            );

    }


    function initializeFinishButtons() {

        if (
            DOM.finishReadingBtn
        ) {

            DOM.finishReadingBtn.addEventListener(
                "click",
                () => {

                    markLessonAsRead(
                        DOM.finishReadingBtn
                    );

                }
            );

        }


        if (
            DOM.mobileFinishReadingBtn
        ) {

            DOM.mobileFinishReadingBtn.addEventListener(
                "click",
                () => {

                    markLessonAsRead(
                        DOM.mobileFinishReadingBtn
                    );

                }
            );

        }

    }


    /* =====================================================
       RESTORE READING STATE
    ===================================================== */

    function restoreReadingState() {

        if (!currentLesson) {

            return;

        }


        const key =
            `lessonRead_${normalizeClass(
                currentLesson.Class
            )}_${currentLesson.Lesson || currentLesson.Topic}`;


        try {

            const saved =
                localStorage.getItem(
                    key
                );


            if (!saved) {

                return;

            }


            const state =
                JSON.parse(
                    saved
                );


            if (
                state &&
                state.completed
            ) {

                updateProgress(
                    100
                );


                if (DOM.progressText) {

                    DOM.progressText.textContent =
                        "Lesson completed. Well done!";

                }


                [
                    DOM.finishReadingBtn,
                    DOM.mobileFinishReadingBtn
                ]
                    .filter(Boolean)
                    .forEach(
                        button => {

                            button.classList.add(
                                "completed"
                            );


                            const strong =
                                button.querySelector(
                                    ".finish-text strong"
                                );


                            const small =
                                button.querySelector(
                                    ".finish-text small"
                                );


                            if (strong) {

                                strong.textContent =
                                    "Lesson completed";

                            }


                            if (small) {

                                small.textContent =
                                    "You have finished reading this lesson";

                            }

                        }
                    );

            }

        }

        catch (error) {

            console.warn(
                "AFC Isiu Lessons: Could not restore reading state.",
                error
            );

        }

    }


    /* =====================================================
       SCROLL LISTENER
    ===================================================== */

    let scrollTicking =
        false;


    function initializeProgressTracking() {

        window.addEventListener(
            "scroll",
            () => {

                if (
                    scrollTicking
                ) {

                    return;

                }


                scrollTicking =
                    true;


                requestAnimationFrame(
                    () => {

                        calculateReadingProgress();

                        scrollTicking =
                            false;

                    }
                );

            },
            {
                passive:
                    true
            }
        );

    }


    /* =====================================================
       RESIZE
    ===================================================== */

    function initializeResizeTracking() {

        window.addEventListener(
            "resize",
            () => {

                if (
                    currentLesson
                ) {

                    updateLessonMeta(
                        currentLesson
                    );

                    calculateReadingProgress();

                }

            },
            {
                passive:
                    true
            }
        );

    }


    /* =====================================================
       INITIALIZATION
    ===================================================== */

    function initialize() {

        cacheDOM();


        /* ---------------------------------------------
           Make sure this is actually the lessons page.
        --------------------------------------------- */

        if (
            !DOM.lessonView ||
            !DOM.lessonContent
        ) {

            console.warn(
                "AFC Isiu Lessons: lessons.html elements not found. Controller stopped."
            );

            return;

        }


        console.log(
            "AFC Isiu Lessons: Controller initialized."
        );


        initializeClassTabs();

        initializeRetry();

        initializeFinishButtons();

        initializeProgressTracking();

        initializeResizeTracking();

        loadLessons();

    }


    /* =====================================================
       START AFTER DOM IS READY
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            {
                once:
                    true
            }
        );

    }

    else {

        initialize();

    }


})();
