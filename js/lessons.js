/* =========================================================
   AFC ISIU YOUTH PORTAL
   FILE: lessons.js

   PURPOSE:
   WEEKLY LESSONS PAGE CONTROLLER

   VERSION:
   CLEAN REBUILD

   RESPONSIBILITIES:
   - Load weekly lessons from Google Sheets
   - Switch Senior / Junior / Elementary
   - Display lesson topic/title once
   - Display Bible text
   - Display lesson number
   - Display week
   - Display memory verse
   - Display lesson content
   - Display discussion questions
   - Calculate reading time
   - Calculate reading progress
   - Handle "I've read this lesson"
   - Save selected class locally

   IMPORTANT:
   - Does NOT control sidebar navigation
   - Does NOT control PWA
   - Does NOT create loading spinners
   - Does NOT duplicate lesson content
========================================================= */

"use strict";


(function () {


    /* =====================================================
       CONFIGURATION
    ===================================================== */

    const LESSON_CSV =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=201183837&single=true&output=csv";


    const STORAGE_CLASS =
        "selectedLessonClass";


    const DEFAULT_CLASS =
        "Senior";


    /* =====================================================
       STATE
    ===================================================== */

    let lessonsData = [];

    let currentLesson = null;

    let currentClass = DEFAULT_CLASS;

    let lessonLoaded = false;


    /* =====================================================
       DOM HELPER
    ===================================================== */

    function $(id) {

        return document.getElementById(id);

    }


    /* =====================================================
       SAFE TEXT
    ===================================================== */

    function safeText(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }

        return String(value).trim();

    }


    /* =====================================================
       NORMALIZE HEADER
    ===================================================== */

    function normalizeHeader(value) {

        return safeText(value)
            .toLowerCase()
            .replace(
                /[\s_-]+/g,
                ""
            );

    }


    /* =====================================================
       GET VALUE FROM ROW
       
       Allows:
       Topic
       topic
       Lesson Topic
       lesson_topic
       etc.
    ===================================================== */

    function getRowValue(row, possibleNames) {

        if (!row) {

            return "";

        }


        const keys =
            Object.keys(row);


        for (
            const wanted of possibleNames
        ) {

            const normalizedWanted =
                normalizeHeader(wanted);


            const matchingKey =
                keys.find(
                    key =>
                        normalizeHeader(key) ===
                        normalizedWanted
                );


            if (
                matchingKey !== undefined
            ) {

                const value =
                    safeText(
                        row[matchingKey]
                    );


                if (value !== "") {

                    return value;

                }

            }

        }


        return "";

    }


    /* =====================================================
       HTML ESCAPE
       
       Used before inserting text into HTML.
    ===================================================== */

    function escapeHTML(value) {

        return safeText(value)
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


    /* =====================================================
       BASIC TEXT FORMATTER
       
       Converts plain spreadsheet text into readable HTML.
       
       Existing simple HTML is preserved.
    ===================================================== */

    function formatLessonContent(text) {

        const value =
            safeText(text);


        if (!value) {

            return `
                <p class="lesson-placeholder">
                    No lesson content is available yet.
                </p>
            `;

        }


        /*
         * If the sheet already contains HTML,
         * render it as HTML.
         */

        if (
            /<([a-z][\s\S]*?)>/i.test(value)
        ) {

            return value;

        }


        /*
         * Otherwise turn paragraphs/new lines
         * into readable HTML.
         */

        const paragraphs =
            value
                .split(
                    /\n\s*\n/
                )
                .map(
                    paragraph =>
                        paragraph.trim()
                )
                .filter(Boolean);


        if (
            paragraphs.length === 0
        ) {

            return `
                <p>
                    ${escapeHTML(value)}
                </p>
            `;

        }


        return paragraphs
            .map(
                paragraph => {

                    const lines =
                        paragraph
                            .split(/\n/)
                            .map(
                                line =>
                                    line.trim()
                            )
                            .filter(Boolean);


                    if (
                        lines.length === 1
                    ) {

                        return `
                            <p>
                                ${escapeHTML(
                                    lines[0]
                                )}
                            </p>
                        `;

                    }


                    return `
                        <p>
                            ${lines
                                .map(
                                    line =>
                                        escapeHTML(
                                            line
                                        )
                                )
                                .join(
                                    "<br>"
                                )}
                        </p>
                    `;

                }
            )
            .join("");

    }


    /* =====================================================
       DISCUSSION FORMATTER
       
       Supports:
       1. Question 1
       2. Question 2

       OR

       Question 1?
       Question 2?
       
       OR newline separated text.
    ===================================================== */

    function formatDiscussion(text) {

        const value =
            safeText(text);


        if (!value) {

            return `
                <p class="discussion-placeholder">
                    No discussion questions are available
                    for this lesson yet.
                </p>
            `;

        }


        let questions = [];


        /*
         * First attempt:
         * numbered questions
         */

        const numbered =
            value
                .split(
                    /(?:^|\n)\s*(?:\d+[\.\)]|-)\s+/g
                )
                .map(
                    item =>
                        item.trim()
                )
                .filter(Boolean);


        if (
            numbered.length > 1
        ) {

            questions =
                numbered;

        }


        /*
         * Second attempt:
         * line separated questions
         */

        else {

            questions =
                value
                    .split(/\n+/)
                    .map(
                        item =>
                            item.trim()
                    )
                    .filter(Boolean);

        }


        /*
         * If everything is still one block,
         * display it as one question/content item.
         */

        if (
            questions.length === 0
        ) {

            questions = [value];

        }


        return questions
            .map(
                (question, index) => {

                    return `
                        <div class="discussion-question">

                            <span class="discussion-number">
                                ${index + 1}
                            </span>

                            <p>
                                ${escapeHTML(
                                    question
                                )}
                            </p>

                        </div>
                    `;

                }
            )
            .join("");

    }


    /* =====================================================
       READING TIME
       
       Approx. 200 words/minute.
    ===================================================== */

    function calculateReadingTime(text) {

        const clean =
            safeText(text);


        if (!clean) {

            return "1 min";

        }


        const words =
            clean
                .split(/\s+/)
                .filter(Boolean)
                .length;


        const minutes =
            Math.max(
                1,
                Math.ceil(
                    words / 200
                )
            );


        return `${minutes} min`;

    }


    /* =====================================================
       SECTION COUNT
    ===================================================== */

    function calculateSectionCount(text) {

        const clean =
            safeText(text);


        if (!clean) {

            return 0;

        }


        /*
         * Count headings where possible.
         */

        const headingMatches =
            clean.match(
                /<h[1-6][^>]*>/gi
            );


        if (
            headingMatches &&
            headingMatches.length > 0
        ) {

            return headingMatches.length;

        }


        /*
         * Fallback:
         * Count paragraphs.
         */

        const paragraphs =
            clean
                .split(
                    /\n\s*\n/
                )
                .map(
                    item =>
                        item.trim()
                )
                .filter(Boolean);


        return Math.max(
            1,
            paragraphs.length
        );

    }


    /* =====================================================
       RESET PROGRESS
    ===================================================== */

    function resetProgress() {

        setProgress(0);

    }


    /* =====================================================
       SET PROGRESS
    ===================================================== */

    function setProgress(percent) {

        const safePercent =
            Math.min(
                100,
                Math.max(
                    0,
                    Math.round(percent)
                )
            );


        const progressBar =
            $("progressBar");


        const mobileProgressBar =
            $("mobileProgressBar");


        const progressPercent =
            $("progressPercent");


        const mobileProgressPercent =
            $("mobileProgressPercent");


        if (progressBar) {

            progressBar.style.width =
                `${safePercent}%`;

        }


        if (mobileProgressBar) {

            mobileProgressBar.style.width =
                `${safePercent}%`;

        }


        if (progressPercent) {

            progressPercent.textContent =
                `${safePercent}%`;

        }


        if (mobileProgressPercent) {

            mobileProgressPercent.textContent =
                `${safePercent}%`;

        }


        const progressText =
            $("progressText");


        if (progressText) {

            if (
                safePercent >= 100
            ) {

                progressText.textContent =
                    "Lesson completed. Well done!";

            }

            else if (
                safePercent >= 75
            ) {

                progressText.textContent =
                    "Almost there. Finish strong.";

            }

            else if (
                safePercent >= 40
            ) {

                progressText.textContent =
                    "You're making good progress.";

            }

            else if (
                safePercent > 0
            ) {

                progressText.textContent =
                    "Keep reading. You're doing well.";

            }

            else {

                progressText.textContent =
                    "Start reading this lesson.";

            }

        }

    }


    /* =====================================================
       CALCULATE SCROLL PROGRESS
    ===================================================== */

    function calculateScrollProgress() {

        if (!lessonLoaded) {

            return;

        }


        const content =
            $("lessonContent");


        if (!content) {

            return;

        }


        const rect =
            content.getBoundingClientRect();


        const viewportHeight =
            window.innerHeight;


        const contentHeight =
            content.scrollHeight;


        if (
            contentHeight <= 0
        ) {

            return;

        }


        const start =
            window.scrollY +
            rect.top;


        const end =
            start +
            contentHeight;


        const current =
            window.scrollY +
            viewportHeight;


        const total =
            end -
            start;


        let progress =
            (
                (
                    current -
                    start
                ) /
                total
            ) *
            100;


        progress =
            Math.max(
                0,
                Math.min(
                    100,
                    progress
                )
            );


        setProgress(progress);

    }


    /* =====================================================
       UPDATE LESSON META
    ===================================================== */

    function updateLessonMeta(lesson) {

        const readingTime =
            calculateReadingTime(
                lesson.content
            );


        const sectionCount =
            calculateSectionCount(
                lesson.content
            );


        const desktopReadingTime =
            $("readingTime");


        const mobileReadingTime =
            $("mobileReadingTime");


        const desktopSectionCount =
            $("sectionCount");


        const mobileSectionCount =
            $("mobileSectionCount");


        if (desktopReadingTime) {

            desktopReadingTime.textContent =
                readingTime;

        }


        if (mobileReadingTime) {

            mobileReadingTime.textContent =
                readingTime;

        }


        if (desktopSectionCount) {

            desktopSectionCount.textContent =
                sectionCount;

        }


        if (mobileSectionCount) {

            mobileSectionCount.textContent =
                sectionCount;

        }

    }


    /* =====================================================
       RENDER DISCUSSION
    ===================================================== */

    function renderDiscussion(lesson) {

        const discussionContent =
            $("discussionContent");


        if (!discussionContent) {

            return;

        }


        discussionContent.innerHTML =
            formatDiscussion(
                lesson.discussion
            );

    }


    /* =====================================================
       RENDER LESSON
    ===================================================== */

    function renderLesson(lesson) {

        if (!lesson) {

            showLessonError(
                "This class does not have a lesson available yet."
            );

            return;

        }


        currentLesson =
            lesson;


        lessonLoaded =
            false;


        /*
         * CLASS
         */

        const classBadge =
            $("lessonClassBadge");


        if (classBadge) {

            classBadge.textContent =
                safeText(
                    lesson.className
                ).toUpperCase();

        }


        /*
         * STATUS
         */

        const lessonStatus =
            $("lessonStatus");


        if (lessonStatus) {

            lessonStatus.textContent =
                "THIS WEEK";

        }


        /*
         * TITLE / TOPIC
         */

        const lessonTitle =
            $("lessonTitle");


        if (lessonTitle) {

            lessonTitle.textContent =
                lesson.topic ||
                "Weekly Lesson";

        }


        /*
         * Small theme line.
         *
         * If there is no separate theme,
         * we do not duplicate the topic.
         */

        const lessonTheme =
            $("lessonTheme");


        if (lessonTheme) {

            if (
                lesson.summary
            ) {

                lessonTheme.textContent =
                    lesson.summary;

            }

            else {

                lessonTheme.textContent =
                    "";

            }

        }


        /*
         * BIBLE TEXT
         */

        const bibleText =
            $("lessonBibleText");


        if (bibleText) {

            bibleText.textContent =
                lesson.bibleText ||
                "—";

        }


        /*
         * LESSON NUMBER
         */

        const lessonNumber =
            $("lessonNumber");


        if (lessonNumber) {

            lessonNumber.textContent =
                lesson.lesson
                    ? `Lesson ${lesson.lesson}`
                    : "—";

        }


        /*
         * WEEK
         */

        const lessonDate =
            $("lessonDate");


        if (lessonDate) {

            lessonDate.textContent =
                lesson.week ||
                lesson.date ||
                "This Week";

        }


        /*
         * MEMORY VERSE
         */

        const memoryVerse =
            $("lessonMemoryVerse");


        if (memoryVerse) {

            memoryVerse.textContent =
                lesson.memoryVerse ||
                "—";

        }


        /*
         * MAIN CONTENT
         */

        const lessonContent =
            $("lessonContent");


        if (lessonContent) {

            lessonContent.innerHTML =
                formatLessonContent(
                    lesson.content
                );

        }


        /*
         * DISCUSSION
         */

        renderDiscussion(
            lesson
        );


        /*
         * META
         */

        updateLessonMeta(
            lesson
        );


        /*
         * PROGRESS
         */

        resetProgress();


        /*
         * SHOW CONTENT
         */

        const lessonView =
            $("lessonView");


        if (lessonView) {

            lessonView.hidden =
                false;

            lessonView.style.display =
                "";

        }


        /*
         * Mark as loaded only after
         * DOM has been populated.
         */

        requestAnimationFrame(
            () => {

                lessonLoaded =
                    true;

                calculateScrollProgress();

            }
        );

    }


    /* =====================================================
       ERROR DISPLAY
    ===================================================== */

    function showLessonError(message) {

        const lessonView =
            $("lessonView");


        if (!lessonView) {

            return;

        }


        lessonView.hidden =
            false;


        lessonView.innerHTML = `

            <section class="lesson-content-card">

                <div class="lesson-content">

                    <h2>
                        Unable to display this lesson
                    </h2>

                    <p>
                        ${escapeHTML(message)}
                    </p>

                    <button
                        type="button"
                        id="retryLessonButton"
                        class="finish-reading-btn"
                        style="margin-top:18px; max-width:220px;"
                    >

                        <span class="finish-icon">

                            <i class="fa-solid fa-rotate-right"></i>

                        </span>

                        <span class="finish-text">

                            <strong>
                                Try Again
                            </strong>

                            <small>
                                Reload the lesson
                            </small>

                        </span>

                    </button>

                </div>

            </section>

        `;


        const retry =
            $("retryLessonButton");


        if (retry) {

            retry.addEventListener(
                "click",
                loadLessons
            );

        }

    }


    /* =====================================================
       NORMALIZE LESSON ROW
    ===================================================== */

    function normalizeLessonRow(row) {

        return {

            lesson:
                getRowValue(
                    row,
                    [
                        "Lesson",
                        "Lesson Number",
                        "LessonNo",
                        "Number"
                    ]
                ),

            className:
                getRowValue(
                    row,
                    [
                        "Class",
                        "Class Name",
                        "Category"
                    ]
                ),

            topic:
                getRowValue(
                    row,
                    [
                        "Topic",
                        "Lesson Topic",
                        "Title",
                        "Lesson Title"
                    ]
                ),

            bibleText:
                getRowValue(
                    row,
                    [
                        "BibleText",
                        "Bible Text",
                        "Bible",
                        "Scripture",
                        "Bible Passage"
                    ]
                ),

            memoryVerse:
                getRowValue(
                    row,
                    [
                        "MemoryVerse",
                        "Memory Verse"
                    ]
                ),

            summary:
                getRowValue(
                    row,
                    [
                        "Summary",
                        "Lesson Summary"
                    ]
                ),

            content:
                getRowValue(
                    row,
                    [
                        "Content",
                        "Lesson Content",
                        "Lesson",
                        "Body",
                        "Introduction"
                    ]
                ),

            discussion:
                getRowValue(
                    row,
                    [
                        "Discussion",
                        "Discussion Questions",
                        "Questions",
                        "Think About It"
                    ]
                ),

            week:
                getRowValue(
                    row,
                    [
                        "Week",
                        "Week Date",
                        "Date",
                        "Lesson Date"
                    ]
                ),

            yorubaAudio:
                getRowValue(
                    row,
                    [
                        "YorubaAudio",
                        "Yoruba Audio",
                        "Audio"
                    ]
                )

        };

    }


    /* =====================================================
       LOAD LESSONS
    ===================================================== */

    async function loadLessons() {

        console.log(
            "AFC Lessons: Loading lesson data..."
        );


        /*
         * Show a simple text state only.
         *
         * NO SPINNER.
         */

        const lessonTitle =
            $("lessonTitle");


        if (lessonTitle) {

            lessonTitle.textContent =
                "Loading lesson...";

        }


        try {

            const response =
                await fetch(
                    LESSON_CSV,
                    {
                        method: "GET",
                        cache: "no-store"
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );

            }


            const csvText =
                await response.text();


            if (
                !csvText.trim()
            ) {

                throw new Error(
                    "The lesson spreadsheet returned no data."
                );

            }


            /*
             * PapaParse required.
             */

            if (
                typeof Papa ===
                "undefined"
            ) {

                throw new Error(
                    "PapaParse is not available."
                );

            }


            const result =
                Papa.parse(
                    csvText,
                    {
                        header: true,
                        skipEmptyLines: true,
                        transformHeader: header =>
                            safeText(header)
                    }
                );


            if (
                result.errors &&
                result.errors.length
            ) {

                console.warn(
                    "AFC Lessons: CSV warnings:",
                    result.errors
                );

            }


            const rows =
                Array.isArray(
                    result.data
                )
                    ? result.data
                    : [];


            lessonsData =
                rows
                    .map(
                        normalizeLessonRow
                    )
                    .filter(
                        lesson =>
                            lesson.className ||
                            lesson.topic
                    );


            console.log(
                "AFC Lessons: Parsed lessons:",
                lessonsData
            );


            if (
                lessonsData.length === 0
            ) {

                throw new Error(
                    "No lesson records were found in the spreadsheet."
                );

            }


            /*
             * Get saved class.
             */

            const savedClass =
                localStorage.getItem(
                    STORAGE_CLASS
                );


            /*
             * Make sure the saved class
             * actually exists.
             */

            const validClasses =
                lessonsData.map(
                    lesson =>
                        normalizeClass(
                            lesson.className
                        )
                );


            if (
                savedClass &&
                validClasses.includes(
                    normalizeClass(
                        savedClass
                    )
                )
            ) {

                currentClass =
                    savedClass;

            }

            else {

                currentClass =
                    DEFAULT_CLASS;

            }


            /*
             * Render.
             */

            switchLesson(
                currentClass
            );


        }

        catch (error) {

            console.error(
                "AFC Lessons: Failed to load:",
                error
            );


            showLessonError(
                "We could not load the lesson. Please check your internet connection and try again."
            );

        }

    }


    /* =====================================================
       NORMALIZE CLASS NAME
    ===================================================== */

    function normalizeClass(value) {

        return safeText(value)
            .toLowerCase()
            .replace(
                /\s+/g,
                ""
            );

    }


    /* =====================================================
       FIND CLASS LESSON
    ===================================================== */

    function findLessonByClass(className) {

        const wanted =
            normalizeClass(
                className
            );


        return lessonsData.find(
            lesson =>
                normalizeClass(
                    lesson.className
                ) === wanted
        );

    }


    /* =====================================================
       SWITCH LESSON
    ===================================================== */

    function switchLesson(className) {

        currentClass =
            className;


        localStorage.setItem(
            STORAGE_CLASS,
            className
        );


        /*
         * Update tab state.
         */

        document
            .querySelectorAll(
                ".class-tab"
            )
            .forEach(
                tab => {

                    const tabClass =
                        tab.dataset.class;


                    const isActive =
                        normalizeClass(
                            tabClass
                        ) ===
                        normalizeClass(
                            className
                        );


                    tab.classList.toggle(
                        "active",
                        isActive
                    );

                }
            );


        const lesson =
            findLessonByClass(
                className
            );


        if (!lesson) {

            showLessonError(
                `No ${className} lesson is available yet.`
            );

            return;

        }


        renderLesson(
            lesson
        );


        /*
         * Return user to the beginning
         * of the lesson rather than keeping
         * the previous scroll position.
         */

        window.scrollTo(
            {
                top: 0,
                behavior: "smooth"
            }
        );

    }


    /* =====================================================
       FINISH LESSON
    ===================================================== */

    function finishLesson() {

        if (!currentLesson) {

            return;

        }


        setProgress(100);


        const key =
            `lessonCompleted_${currentClass}_${currentLesson.lesson}_${currentLesson.topic}`;


        localStorage.setItem(
            key,
            "true"
        );


        const progressText =
            $("progressText");


        if (progressText) {

            progressText.textContent =
                "Lesson completed. Well done!";

        }


        /*
         * Change buttons visually.
         */

        document
            .querySelectorAll(
                "#finishReadingBtn, #mobileFinishReadingBtn"
            )
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
                            "Lesson Completed";

                    }


                    if (small) {

                        small.textContent =
                            "Great job!";

                    }

                }
            );

    }


    /* =====================================================
       CHECK SAVED COMPLETION
    ===================================================== */

    function checkCompletion() {

        if (!currentLesson) {

            return;

        }


        const key =
            `lessonCompleted_${currentClass}_${currentLesson.lesson}_${currentLesson.topic}`;


        if (
            localStorage.getItem(key) ===
            "true"
        ) {

            setProgress(100);


            const progressText =
                $("progressText");


            if (progressText) {

                progressText.textContent =
                    "Lesson completed. Well done!";

            }

        }

    }


    /* =====================================================
       TAB EVENTS
    ===================================================== */

    function initializeTabs() {

        document
            .querySelectorAll(
                ".class-tab"
            )
            .forEach(
                tab => {

                    tab.addEventListener(
                        "click",
                        () => {

                            const className =
                                tab.dataset.class;


                            if (!className) {

                                return;

                            }


                            switchLesson(
                                className
                            );

                        }
                    );

                }
            );

    }


    /* =====================================================
       FINISH BUTTON EVENTS
    ===================================================== */

    function initializeFinishButtons() {

        const desktopButton =
            $("finishReadingBtn");


        const mobileButton =
            $("mobileFinishReadingBtn");


        if (desktopButton) {

            desktopButton.addEventListener(
                "click",
                finishLesson
            );

        }


        if (mobileButton) {

            mobileButton.addEventListener(
                "click",
                finishLesson
            );

        }

    }


    /* =====================================================
       SCROLL EVENTS
    ===================================================== */

    function initializeProgressTracking() {

        let ticking =
            false;


        window.addEventListener(
            "scroll",
            () => {

                if (!lessonLoaded) {

                    return;

                }


                if (ticking) {

                    return;

                }


                window.requestAnimationFrame(
                    () => {

                        calculateScrollProgress();

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


        window.addEventListener(
            "resize",
            () => {

                if (!lessonLoaded) {

                    return;

                }


                calculateScrollProgress();

            }
        );

    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    function initialize() {

        /*
         * Only run on the lessons page.
         */

        if (
            !$("lessonView")
        ) {

            return;

        }


        console.log(
            "AFC Lessons: Initializing..."
        );


        initializeTabs();

        initializeFinishButtons();

        initializeProgressTracking();

        loadLessons();

    }


    /* =====================================================
       DOM READY
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    }

    else {

        initialize();

    }


})();
