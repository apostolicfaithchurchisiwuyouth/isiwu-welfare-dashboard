/* =========================================================
   AFC ISIU YOUTH PORTAL
   FILE: lessons.js

   PURPOSE:
   WEEKLY LESSONS PAGE CONTROLLER

   STRUCTURE:
   Class Tabs
        ↓
   Topic
        ↓
   Bible Text / Lesson Number / Audio
        ↓
   Memory Verse
        ↓
   Week
        ↓
   Summary
        ↓
   Lesson Content
        ↓
   Discussion
        ↓
   Reading Progress

   IMPORTANT:
   - Lessons are publicly readable.
   - Only ONE lesson is rendered at a time.
   - Switching class replaces the existing content.
   - No duplicate summary.
   - No duplicate lesson title.
   - No infinite loading.
========================================================= */

"use strict";


/* =========================================================
   CONFIGURATION
========================================================= */

const LESSONS_CONFIG = {

    csv:
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=201183837&single=true&output=csv",

    defaultClass:
        "Senior",

    storageKey:
        "selectedLessonClass"

};


/* =========================================================
   STATE
========================================================= */

let lessonsData = [];

let selectedLessonClass =
    localStorage.getItem(
        LESSONS_CONFIG.storageKey
    ) ||
    LESSONS_CONFIG.defaultClass;

let currentLesson = null;

let lessonsLoaded = false;


/* =========================================================
   DOM HELPER
========================================================= */

function lessonElement(id) {

    return document.getElementById(id);

}


/* =========================================================
   TEXT HELPER
========================================================= */

function cleanLessonText(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }

    return String(value).trim();

}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeLessonHTML(value) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   SAFE CONTENT FORMATTER

   Allows normal text from Google Sheets to display
   as readable paragraphs without creating duplicate
   sections.
========================================================= */

function formatLessonContent(text) {

    const value =
        cleanLessonText(text);

    if (!value) {

        return `
            <div class="lesson-empty-content">
                Lesson content is not available yet.
            </div>
        `;

    }


    /*
     * If the content already contains HTML,
     * preserve common formatting.
     */

    if (
        /<p[\s>]|<h[1-6][\s>]|<ul[\s>]|<ol[\s>]|<br[\s/]*>/i
            .test(value)
    ) {

        return value;

    }


    /*
     * Convert line breaks to paragraphs.
     */

    const paragraphs =
        value
            .split(/\n\s*\n/)
            .map(
                paragraph =>
                    paragraph.trim()
            )
            .filter(Boolean);


    if (!paragraphs.length) {

        return `
            <p>
                ${escapeLessonHTML(value)}
            </p>
        `;

    }


    return paragraphs
        .map(
            paragraph => {

                const formatted =
                    escapeLessonHTML(
                        paragraph
                    )
                    .replace(
                        /\n/g,
                        "<br>"
                    );

                return `
                    <p>
                        ${formatted}
                    </p>
                `;

            }
        )
        .join("");

}


/* =========================================================
   DISCUSSION FORMATTER
========================================================= */

function formatDiscussion(text) {

    const value =
        cleanLessonText(text);

    if (!value) {

        return "";

    }


    /*
     * Preserve existing HTML.
     */

    if (
        /<p[\s>]|<ol[\s>]|<ul[\s>]|<li[\s>]/i
            .test(value)
    ) {

        return value;

    }


    /*
     * Detect numbered questions.

     * Examples:
     * 1. Question
     * 2. Question
     * 3. Question
     */

    const lines =
        value
            .split(/\r?\n/)
            .map(
                line =>
                    line.trim()
            )
            .filter(Boolean);


    const numbered =
        lines.length > 0 &&
        lines.every(
            line =>
                /^\d+[\.\)]\s+/.test(line)
        );


    if (numbered) {

        const items =
            lines
                .map(
                    line =>
                        line.replace(
                            /^\d+[\.\)]\s+/,
                            ""
                        )
                )
                .map(
                    item => `
                        <li>
                            ${escapeLessonHTML(item)}
                        </li>
                    `
                )
                .join("");


        return `
            <ol>
                ${items}
            </ol>
        `;

    }


    /*
     * If separated by blank lines,
     * display as paragraphs.
     */

    const paragraphs =
        value
            .split(/\n\s*\n/)
            .map(
                paragraph =>
                    paragraph.trim()
            )
            .filter(Boolean);


    return paragraphs
        .map(
            paragraph => `
                <p>
                    ${escapeLessonHTML(
                        paragraph
                    ).replace(
                        /\n/g,
                        "<br>"
                    )}
                </p>
            `
        )
        .join("");

}


/* =========================================================
   PARSE CSV
========================================================= */

async function loadLessonsCSV() {

    if (
        typeof Papa ===
        "undefined"
    ) {

        throw new Error(
            "PapaParse is not available."
        );

    }


    const response =
        await fetch(
            LESSONS_CONFIG.csv,
            {
                method: "GET",
                cache: "no-store"
            }
        );


    if (!response.ok) {

        throw new Error(
            `Lesson feed returned HTTP ${response.status}.`
        );

    }


    const csvText =
        await response.text();


    if (
        !csvText ||
        !csvText.trim()
    ) {

        throw new Error(
            "The lesson spreadsheet returned an empty response."
        );

    }


    const result =
        Papa.parse(
            csvText,
            {
                header: true,
                skipEmptyLines: true,
                transformHeader:
                    header =>
                        cleanLessonText(
                            header
                        )
            }
        );


    if (
        result.errors &&
        result.errors.length
    ) {

        console.warn(
            "Lesson CSV warnings:",
            result.errors
        );

    }


    return result.data
        .map(
            row => ({

                lesson:
                    cleanLessonText(
                        row.Lesson
                    ),

                className:
                    cleanLessonText(
                        row.Class
                    ),

                topic:
                    cleanLessonText(
                        row.Topic
                    ),

                bibleText:
                    cleanLessonText(
                        row.BibleText
                    ),

                memoryVerse:
                    cleanLessonText(
                        row.MemoryVerse
                    ),

                summary:
                    cleanLessonText(
                        row.Summary
                    ),

                discussion:
                    cleanLessonText(
                        row.Discussion
                    ),

                yorubaAudio:
                    cleanLessonText(
                        row.YorubaAudio
                    )

            })
        )
        .filter(
            lesson =>
                lesson.className ||
                lesson.topic ||
                lesson.lesson
        );

}


/* =========================================================
   GET LESSON FOR CLASS
========================================================= */

function getLessonForClass(className) {

    const target =
        cleanLessonText(
            className
        ).toLowerCase();


    return lessonsData.find(
        lesson =>
            cleanLessonText(
                lesson.className
            ).toLowerCase() === target
    );

}


/* =========================================================
   SET ACTIVE TAB
========================================================= */

function updateClassTabs(className) {

    document
        .querySelectorAll(
            ".class-tab"
        )
        .forEach(
            tab => {

                const tabClass =
                    cleanLessonText(
                        tab.dataset.class
                    );


                tab.classList.toggle(
                    "active",
                    tabClass.toLowerCase() ===
                    className.toLowerCase()
                );

            }
        );

}


/* =========================================================
   SHOW LOADING
========================================================= */

function showLessonsLoading() {

    const loading =
        lessonElement(
            "lessonsLoading"
        );

    const error =
        lessonElement(
            "lessonsError"
        );

    const view =
        lessonElement(
            "lessonView"
        );


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


/* =========================================================
   HIDE LOADING
========================================================= */

function hideLessonsLoading() {

    const loading =
        lessonElement(
            "lessonsLoading"
        );


    if (loading) {

        loading.hidden = true;

    }

}


/* =========================================================
   SHOW ERROR
========================================================= */

function showLessonsError(message) {

    const loading =
        lessonElement(
            "lessonsLoading"
        );

    const error =
        lessonElement(
            "lessonsError"
        );

    const errorMessage =
        lessonElement(
            "lessonsErrorMessage"
        );

    const view =
        lessonElement(
            "lessonView"
        );


    if (loading) {

        loading.hidden = true;

    }


    if (view) {

        view.hidden = true;

    }


    if (errorMessage) {

        errorMessage.textContent =
            message ||
            "Unable to load lessons.";

    }


    if (error) {

        error.hidden = false;

    }

}


/* =========================================================
   HIDE ERROR
========================================================= */

function hideLessonsError() {

    const error =
        lessonElement(
            "lessonsError"
        );


    if (error) {

        error.hidden = true;

    }

}


/* =========================================================
   UPDATE TOPIC
========================================================= */

function renderLessonHero(lesson) {

    const title =
        lessonElement(
            "lessonTitle"
        );

    const badge =
        lessonElement(
            "lessonClassBadge"
        );


    if (title) {

        title.textContent =
            lesson.topic ||
            lesson.lesson ||
            "Weekly Lesson";

    }


    if (badge) {

        badge.textContent =
            (
                lesson.className ||
                selectedLessonClass
            ).toUpperCase();

    }

}


/* =========================================================
   UPDATE INFORMATION CARDS
========================================================= */

function renderLessonInfo(lesson) {

    const bibleText =
        lessonElement(
            "lessonBibleText"
        );

    const lessonNumber =
        lessonElement(
            "lessonNumber"
        );


    if (bibleText) {

        bibleText.textContent =
            lesson.bibleText ||
            "Not provided";

    }


    if (lessonNumber) {

        const value =
            lesson.lesson ||
            "—";


        /*
         * If the spreadsheet already contains
         * "Lesson 87", don't add another "Lesson".
         */

        if (
            /^lesson\s+/i.test(value)
        ) {

            lessonNumber.textContent =
                value;

        } else if (value !== "—") {

            lessonNumber.textContent =
                `Lesson ${value}`;

        } else {

            lessonNumber.textContent =
                "—";

        }

    }

}


/* =========================================================
   UPDATE AUDIO
========================================================= */

function renderLessonAudio(lesson) {

    const card =
        lessonElement(
            "lessonAudioCard"
        );

    const audio =
        lessonElement(
            "lessonAudio"
        );


    if (
        !card ||
        !audio
    ) {

        return;

    }


    const audioURL =
        cleanLessonText(
            lesson.yorubaAudio
        );


    audio.pause();


    if (!audioURL) {

        audio.removeAttribute(
            "src"
        );

        card.classList.add(
            "no-audio"
        );

        return;

    }


    card.classList.remove(
        "no-audio"
    );


    audio.src =
        audioURL;

}


/* =========================================================
   UPDATE MEMORY VERSE
========================================================= */

function renderMemoryVerse(lesson) {

    const memoryVerse =
        lessonElement(
            "lessonMemoryVerse"
        );


    if (!memoryVerse) {

        return;

    }


    memoryVerse.textContent =
        lesson.memoryVerse ||
        "Memory verse not provided.";

}


/* =========================================================
   UPDATE WEEK
========================================================= */

function renderLessonWeek(lesson) {

    const week =
        lessonElement(
            "lessonDate"
        );


    if (!week) {

        return;

    }


    /*
     * The spreadsheet does not currently expose
     * a dedicated Week field in the existing structure.
     *
     * Therefore we display a clean generic label
     * rather than inventing a date.
     */

    week.textContent =
        "This Week";

}


/* =========================================================
   UPDATE SUMMARY
========================================================= */

function renderLessonSummary(lesson) {

    const summary =
        lessonElement(
            "lessonSummary"
        );


    if (!summary) {

        return;

    }


    summary.innerHTML =
        formatLessonContent(
            lesson.summary
        );

}


/* =========================================================
   UPDATE LESSON CONTENT
========================================================= */

function renderLessonContent(lesson) {

    const content =
        lessonElement(
            "lessonContent"
        );


    if (!content) {

        return;

    }


    /*
     * IMPORTANT:
     *
     * The actual lesson body comes from the Summary/Discussion
     * structure only once.
     *
     * We do NOT inject the entire lesson again into the hero.
     */

    content.innerHTML =
        formatLessonContent(
            lesson.summary
        );

}


/* =========================================================
   UPDATE DISCUSSION
========================================================= */

function renderDiscussion(lesson) {

    const card =
        lessonElement(
            "discussionCard"
        );

    const discussion =
        lessonElement(
            "lessonDiscussion"
        );


    if (
        !card ||
        !discussion
    ) {

        return;

    }


    if (
        !cleanLessonText(
            lesson.discussion
        )
    ) {

        card.hidden = true;

        discussion.innerHTML = "";

        return;

    }


    card.hidden = false;


    discussion.innerHTML =
        formatDiscussion(
            lesson.discussion
        );

}


/* =========================================================
   COUNT SECTIONS
========================================================= */

function calculateSectionCount(lesson) {

    let count = 0;


    if (
        cleanLessonText(
            lesson.summary
        )
    ) {

        count++;

    }


    if (
        cleanLessonText(
            lesson.discussion
        )
    ) {

        count++;

    }


    /*
     * Main lesson content counts as a section
     * when available.
     */

    if (
        cleanLessonText(
            lesson.summary
        )
    ) {

        count++;

    }


    return Math.max(
        count,
        1
    );

}


/* =========================================================
   ESTIMATE READING TIME
========================================================= */

function calculateReadingTime(lesson) {

    const text = [

        lesson.topic,

        lesson.bibleText,

        lesson.memoryVerse,

        lesson.summary,

        lesson.discussion

    ]
        .filter(Boolean)
        .join(" ");


    const words =
        text
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .length;


    /*
     * Approximate youth reading speed.
     */

    const minutes =
        Math.max(
            1,
            Math.ceil(
                words / 180
            )
        );


    return `${minutes} min`;

}


/* =========================================================
   UPDATE META
========================================================= */

function renderLessonMeta(lesson) {

    const readingTime =
        calculateReadingTime(
            lesson
        );


    const sectionCount =
        calculateSectionCount(
            lesson
        );


    const readingTimeDesktop =
        lessonElement(
            "readingTime"
        );

    const readingTimeMobile =
        lessonElement(
            "mobileReadingTime"
        );

    const sectionCountDesktop =
        lessonElement(
            "sectionCount"
        );

    const sectionCountMobile =
        lessonElement(
            "mobileSectionCount"
        );


    if (readingTimeDesktop) {

        readingTimeDesktop.textContent =
            readingTime;

    }


    if (readingTimeMobile) {

        readingTimeMobile.textContent =
            readingTime;

    }


    if (sectionCountDesktop) {

        sectionCountDesktop.textContent =
            sectionCount;

    }


    if (sectionCountMobile) {

        sectionCountMobile.textContent =
            sectionCount;

    }

}


/* =========================================================
   RESET READING PROGRESS
========================================================= */

function resetLessonProgress() {

    const elements = [

        "progressPercent",

        "mobileProgressPercent"

    ];


    elements.forEach(
        id => {

            const element =
                lessonElement(id);

            if (element) {

                element.textContent =
                    "0%";

            }

        }
    );


    const bars = [

        "progressBar",

        "mobileProgressBar"

    ];


    bars.forEach(
        id => {

            const element =
                lessonElement(id);

            if (element) {

                element.style.width =
                    "0%";

            }

        }
    );


    const progressText =
        lessonElement(
            "progressText"
        );


    if (progressText) {

        progressText.textContent =
            "Start reading this lesson.";

    }

}


/* =========================================================
   UPDATE READING PROGRESS
========================================================= */

function updateReadingProgress() {

    if (!currentLesson) {

        return;

    }


    const content =
        lessonElement(
            "lessonContent"
        );


    if (!content) {

        return;

    }


    const rect =
        content.getBoundingClientRect();


    const viewportHeight =
        window.innerHeight;


    const contentHeight =
        Math.max(
            content.scrollHeight,
            1
        );


    /*
     * Determine how far through the lesson
     * the reader has progressed.
     */

    const visibleTop =
        Math.max(
            0,
            viewportHeight - rect.top
        );


    const rawProgress =
        (
            visibleTop /
            (
                contentHeight +
                viewportHeight
            )
        ) *
        100;


    const progress =
        Math.min(
            100,
            Math.max(
                0,
                Math.round(
                    rawProgress
                )
            )
        );


    const progressPercent =
        lessonElement(
            "progressPercent"
        );

    const mobileProgressPercent =
        lessonElement(
            "mobileProgressPercent"
        );

    const progressBar =
        lessonElement(
            "progressBar"
        );

    const mobileProgressBar =
        lessonElement(
            "mobileProgressBar"
        );


    if (progressPercent) {

        progressPercent.textContent =
            `${progress}%`;

    }


    if (mobileProgressPercent) {

        mobileProgressPercent.textContent =
            `${progress}%`;

    }


    if (progressBar) {

        progressBar.style.width =
            `${progress}%`;

    }


    if (mobileProgressBar) {

        mobileProgressBar.style.width =
            `${progress}%`;

    }


    const progressText =
        lessonElement(
            "progressText"
        );


    if (progressText) {

        if (progress >= 100) {

            progressText.textContent =
                "Lesson completed. Well done!";

        }

        else if (progress >= 75) {

            progressText.textContent =
                "Almost there. Keep reading.";

        }

        else if (progress >= 40) {

            progressText.textContent =
                "Good progress. Keep going.";

        }

        else {

            progressText.textContent =
                "Keep reading this lesson.";

        }

    }

}


/* =========================================================
   FINISH LESSON
========================================================= */

function finishCurrentLesson() {

    if (!currentLesson) {

        return;

    }


    const storageKey =
        `lessonCompleted_${selectedLessonClass}_${currentLesson.lesson || currentLesson.topic}`;


    localStorage.setItem(
        storageKey,
        "true"
    );


    const progressPercent =
        lessonElement(
            "progressPercent"
        );

    const mobileProgressPercent =
        lessonElement(
            "mobileProgressPercent"
        );

    const progressBar =
        lessonElement(
            "progressBar"
        );

    const mobileProgressBar =
        lessonElement(
            "mobileProgressBar"
        );


    if (progressPercent) {

        progressPercent.textContent =
            "100%";

    }


    if (mobileProgressPercent) {

        mobileProgressPercent.textContent =
            "100%";

    }


    if (progressBar) {

        progressBar.style.width =
            "100%";

    }


    if (mobileProgressBar) {

        mobileProgressBar.style.width =
            "100%";

    }


    const progressText =
        lessonElement(
            "progressText"
        );


    if (progressText) {

        progressText.textContent =
            "Lesson completed. Well done!";

    }


    document
        .querySelectorAll(
            "#finishReadingBtn, #mobileFinishReadingBtn"
        )
        .forEach(
            button => {

                button.disabled =
                    true;

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
                        "You've marked this lesson as read";

                }

            }
        );

}


/* =========================================================
   RESTORE COMPLETION STATE
========================================================= */

function restoreCompletionState() {

    if (!currentLesson) {

        return;

    }


    const storageKey =
        `lessonCompleted_${selectedLessonClass}_${currentLesson.lesson || currentLesson.topic}`;


    const completed =
        localStorage.getItem(
            storageKey
        ) === "true";


    const buttons =
        document.querySelectorAll(
            "#finishReadingBtn, #mobileFinishReadingBtn"
        );


    buttons.forEach(
        button => {

            button.disabled =
                completed;


            const strong =
                button.querySelector(
                    ".finish-text strong"
                );

            const small =
                button.querySelector(
                    ".finish-text small"
                );


            if (completed) {

                if (strong) {

                    strong.textContent =
                        "Lesson completed";

                }


                if (small) {

                    small.textContent =
                        "You've marked this lesson as read";

                }

            } else {

                if (strong) {

                    strong.textContent =
                        "I've read this lesson";

                }


                if (small) {

                    small.textContent =
                        "Mark lesson as completed";

                }

            }

        }
    );

}


/* =========================================================
   RENDER ONE LESSON
========================================================= */

function renderLesson(lesson) {

    if (!lesson) {

        showLessonsError(
            `There is no lesson available for the ${selectedLessonClass} class yet.`
        );

        return;

    }


    currentLesson =
        lesson;


    /*
     * IMPORTANT:
     *
     * We update existing DOM elements.
     *
     * We DO NOT create another lesson-view.
     * We DO NOT append another summary.
     * We DO NOT append another title.
     */

    renderLessonHero(
        lesson
    );

    renderLessonInfo(
        lesson
    );

    renderLessonAudio(
        lesson
    );

    renderMemoryVerse(
        lesson
    );

    renderLessonWeek(
        lesson
    );

    renderLessonSummary(
        lesson
    );

    renderLessonContent(
        lesson
    );

    renderDiscussion(
        lesson
    );

    renderLessonMeta(
        lesson
    );


    resetLessonProgress();

    restoreCompletionState();


    hideLessonsError();

    hideLessonsLoading();


    const view =
        lessonElement(
            "lessonView"
        );


    if (view) {

        view.hidden = false;

    }


    updateClassTabs(
        selectedLessonClass
    );


    /*
     * Recalculate after browser has rendered
     * the lesson content.
     */

    requestAnimationFrame(
        () => {

            updateReadingProgress();

        }
    );

}


/* =========================================================
   SWITCH CLASS
========================================================= */

function switchLesson(className) {

    const cleanClass =
        cleanLessonText(
            className
        ) ||
        LESSONS_CONFIG.defaultClass;


    selectedLessonClass =
        cleanClass;


    localStorage.setItem(
        LESSONS_CONFIG.storageKey,
        selectedLessonClass
    );


    updateClassTabs(
        selectedLessonClass
    );


    /*
     * Don't show the global loading spinner
     * when simply switching between already
     * loaded Senior / Junior / Elementary data.
     */

    if (!lessonsLoaded) {

        return;

    }


    const lesson =
        getLessonForClass(
            selectedLessonClass
        );


    if (!lesson) {

        const view =
            lessonElement(
                "lessonView"
            );


        if (view) {

            view.hidden = true;

        }


        showLessonsError(
            `No ${selectedLessonClass} lesson is available yet.`
        );


        return;

    }


    renderLesson(
        lesson
    );

}


/* =========================================================
   FETCH ALL LESSONS
========================================================= */

async function fetchWeeklyLessons() {

    showLessonsLoading();


    hideLessonsError();


    try {

        console.log(
            "AFC Isiu Lessons: Loading lesson feed..."
        );


        const data =
            await loadLessonsCSV();


        lessonsData =
            data;


        console.log(
            "AFC Isiu Lessons: Parsed lessons:",
            lessonsData
        );


        if (
            !lessonsData.length
        ) {

            throw new Error(
                "No lessons were found in the spreadsheet."
            );

        }


        lessonsLoaded =
            true;


        /*
         * Find selected class.
         */

        let lesson =
            getLessonForClass(
                selectedLessonClass
            );


        /*
         * If saved class no longer exists,
         * fall back to Senior.
         */

        if (!lesson) {

            selectedLessonClass =
                LESSONS_CONFIG.defaultClass;


            localStorage.setItem(
                LESSONS_CONFIG.storageKey,
                selectedLessonClass
            );


            lesson =
                getLessonForClass(
                    selectedLessonClass
                );

        }


        /*
         * If Senior doesn't exist either,
         * use the first available lesson.
         */

        if (!lesson) {

            lesson =
                lessonsData[0];

            selectedLessonClass =
                lesson.className ||
                LESSONS_CONFIG.defaultClass;

        }


        if (!lesson) {

            throw new Error(
                "No usable lesson was found."
            );

        }


        renderLesson(
            lesson
        );


    }

    catch (error) {

        console.error(
            "AFC Isiu Lessons Error:",
            error
        );


        lessonsLoaded =
            false;


        showLessonsError(
            error.message ||
            "Unable to load this week's lessons. Please try again."
        );

    }

}


/* =========================================================
   RETRY
========================================================= */

function retryLessons() {

    lessonsLoaded =
        false;


    currentLesson =
        null;


    fetchWeeklyLessons();

}


/* =========================================================
   CLASS TAB EVENTS
========================================================= */

function initialiseLessonTabs() {

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


/* =========================================================
   FINISH BUTTON EVENTS
========================================================= */

function initialiseFinishButtons() {

    document
        .querySelectorAll(
            "#finishReadingBtn, #mobileFinishReadingBtn"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    finishCurrentLesson
                );

            }
        );

}


/* =========================================================
   RETRY BUTTON
========================================================= */

function initialiseRetryButton() {

    const button =
        lessonElement(
            "retryLessons"
        );


    if (!button) {

        return;

    }


    button.addEventListener(
        "click",
        retryLessons
    );

}


/* =========================================================
   READING PROGRESS EVENTS
========================================================= */

function initialiseReadingProgress() {

    let ticking =
        false;


    function handleScroll() {

        if (ticking) {

            return;

        }


        ticking =
            true;


        requestAnimationFrame(
            () => {

                updateReadingProgress();

                ticking =
                    false;

            }
        );

    }


    window.addEventListener(
        "scroll",
        handleScroll,
        {
            passive: true
        }
    );


    window.addEventListener(
        "resize",
        handleScroll
    );

}


/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "AFC Isiu Lessons: Page initialized."
        );


        initialiseLessonTabs();

        initialiseFinishButtons();

        initialiseRetryButton();

        initialiseReadingProgress();


        /*
         * Start loading only ONCE.
         *
         * This prevents the endless/repeated
         * "Loading this week's lesson..." problem.
         */

        fetchWeeklyLessons();

    }
);
