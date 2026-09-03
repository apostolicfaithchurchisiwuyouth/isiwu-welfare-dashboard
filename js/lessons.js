/* =========================================================
   AFC ISIU YOUTH PORTAL
   LESSONS PAGE CONTROLLER
   =========================================================


   GOOGLE SHEET COLUMNS:

   Lesson
   Class
   Topic
   BibleText
   MemoryVerse
   Summary
   Discussion
   YorubaAudio

   EXAMPLE YorubaAudio:

   /audio/Senior-77.mp3
   /audio/Junior-83.mp3

   IMPORTANT:
   - Summary contains HTML and is rendered as HTML.
   - Topic Card displays Topic only.
   - Lesson number is NOT displayed in Topic Card.
   - Yoruba audio is optional.
   - Audio errors NEVER prevent the lesson from loading.
   ========================================================= */


"use strict";


/* =========================================================
   CONFIGURATION
========================================================= */

const LESSONS_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=201183837&single=true&output=csv";


/*
 * Your website root.
 *
 * This is used for audio paths such as:
 *
 * /audio/Senior-77.mp3
 *
 * becoming:
 *
 * https://afcisiuyouth.vercel.app/audio/Senior-77.mp3
 */

const SITE_ORIGIN =
    window.location.origin;


/* =========================================================
   STATE
========================================================= */

let lessonsData = [];

let selectedLessonClass =
    localStorage.getItem("selectedLessonClass") ||
    "Senior";

let currentLesson = null;

let progressScrollHandler = null;


/* =========================================================
   DOM HELPER
========================================================= */

function getElement(id) {

    return document.getElementById(id);

}


/* =========================================================
   TEXT HELPERS
========================================================= */

function cleanText(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }

    return String(value)
        .replace(/\u00A0/g, " ")
        .trim();

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    return cleanText(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   NORMALIZE HEADER
========================================================= */

function normalizeHeader(value) {

    return cleanText(value)
        .toLowerCase()
        .replace(/[\s_-]+/g, "");

}


/* =========================================================
   GET GOOGLE SHEET VALUE
========================================================= */

function getSheetValue(
    row,
    possibleNames
) {

    if (!row) {

        return "";

    }

    const keys =
        Object.keys(row);


    for (
        const name of possibleNames
    ) {

        const wanted =
            normalizeHeader(name);


        const matchingKey =
            keys.find(key => {

                return (
                    normalizeHeader(key) ===
                    wanted
                );

            });


        if (
            matchingKey !== undefined
        ) {

            const value =
                cleanText(
                    row[matchingKey]
                );


            if (value) {

                return value;

            }

        }

    }


    return "";

}


/* =========================================================
   NORMALIZE LESSON ROW
========================================================= */

function normalizeLessonRow(row) {

    return {

        lesson:
            getSheetValue(
                row,
                [
                    "Lesson"
                ]
            ),


        className:
            getSheetValue(
                row,
                [
                    "Class"
                ]
            ),


        topic:
            getSheetValue(
                row,
                [
                    "Topic"
                ]
            ),


        bibleText:
            getSheetValue(
                row,
                [
                    "BibleText",
                    "Bible Text",
                    "Bible_Text"
                ]
            ),


        memoryVerse:
            getSheetValue(
                row,
                [
                    "MemoryVerse",
                    "Memory Verse",
                    "Memory_Verse"
                ]
            ),


        summary:
            getSheetValue(
                row,
                [
                    "Summary"
                ]
            ),


        discussion:
            getSheetValue(
                row,
                [
                    "Discussion"
                ]
            ),


        yorubaAudio:
            getSheetValue(
                row,
                [
                    "YorubaAudio",
                    "Yoruba Audio",
                    "Yoruba_Audio"
                ]
            )

    };

}


/* =========================================================
   RENDER SUMMARY HTML
=========================================================

   The Summary column contains HTML.

   Example:

   <h2>Introduction</h2>
   <p>This is the lesson...</p>

   We intentionally DO NOT use escapeHTML()
   here because we want the HTML to work.

   IMPORTANT:
   Only use this with lesson content you control.
========================================================= */

function formatLessonContent(html) {

    const value =
        cleanText(html);


    if (!value) {

        return `

            <div class="lesson-empty-state">

                <i class="fa-regular fa-file-lines"></i>

                <p>
                    Lesson content is not available yet.
                </p>

            </div>

        `;

    }


    return `

        <div class="lesson-rich-content">

            ${value}

        </div>

    `;

}


/* =========================================================
   FORMAT DISCUSSION
========================================================= */

function formatDiscussion(text) {

    const value =
        cleanText(text);


    if (!value) {

        return `

            <div class="discussion-empty">

                <i class="fa-regular fa-comments"></i>

                <p>
                    No discussion questions have been added yet.
                </p>

            </div>

        `;

    }


    const escaped =
        escapeHTML(value);


    let items =
        escaped
            .split(/\r?\n\s*\r?\n/)
            .map(item => item.trim())
            .filter(Boolean);


    /*
     * Also support one question per line.
     */

    if (items.length <= 1) {

        items =
            escaped
                .split(/\r?\n/)
                .map(item => item.trim())
                .filter(Boolean);

    }


    /*
     * One question.
     */

    if (items.length === 1) {

        return `

            <div class="discussion-question">

                <span class="discussion-number">
                    1
                </span>

                <p>
                    ${items[0]}
                </p>

            </div>

        `;

    }


    /*
     * Multiple questions.
     */

    return items
        .map(
            (item, index) => {

                return `

                    <div class="discussion-question">

                        <span class="discussion-number">

                            ${index + 1}

                        </span>

                        <p>

                            ${item.replace(
                                /\r?\n/g,
                                "<br>"
                            )}

                        </p>

                    </div>

                `;

            }
        )
        .join("");

}


/* =========================================================
   BUILD AUDIO URL
========================================================= */

function buildAudioURL(audioPath) {

    const value =
        cleanText(audioPath);


    if (!value) {

        return "";

    }


    try {

        /*
         * Full URL:
         *
         * https://...
         */

        if (
            /^https?:\/\//i.test(value)
        ) {

            return value;

        }


        /*
         * Root-relative:
         *
         * /audio/Senior-77.mp3
         */

        if (
            value.startsWith("/")
        ) {

            return (
                SITE_ORIGIN +
                value
            );

        }


        /*
         * Relative:
         *
         * audio/Senior-77.mp3
         */

        return new URL(
            value,
            SITE_ORIGIN + "/"
        ).href;

    }

    catch (error) {

        console.error(
            "AFC Isiu — Invalid audio path:",
            value,
            error
        );

        return "";

    }

}


/* =========================================================
   RENDER YORUBA AUDIO
========================================================= */

function renderYorubaAudio(audioValue) {

    const audioPath =
        cleanText(audioValue);


    const audioCard =
        getElement(
            "yorubaAudioCard"
        );


    const audioElement =
        getElement(
            "yorubaAudio"
        );


    /*
     * If there is no audio field,
     * simply hide the card.
     */

    if (!audioPath) {

        if (audioCard) {

            audioCard.hidden = true;

            audioCard.style.display =
                "none";

        }


        if (audioElement) {

            audioElement.pause();

            audioElement.removeAttribute(
                "src"
            );

            audioElement.load();

        }


        return;

    }


    const audioURL =
        buildAudioURL(
            audioPath
        );


    if (!audioURL) {

        if (audioCard) {

            audioCard.hidden = true;

            audioCard.style.display =
                "none";

        }

        return;

    }


    console.log(
        "AFC Isiu — Yoruba Audio URL:",
        audioURL
    );


    /*
     * Use existing <audio>
     * if lessons.html contains it.
     */

    if (audioElement) {

        audioElement.pause();

        audioElement.removeAttribute(
            "src"
        );

        audioElement.src =
            audioURL;

        audioElement.preload =
            "metadata";

        audioElement.load();


        /*
         * Helpful diagnostic.
         */

        audioElement.onloadedmetadata =
            function () {

                console.log(
                    "AFC Isiu — Yoruba audio loaded:",
                    audioURL
                );

            };


        audioElement.onerror =
            function () {

                console.error(
                    "AFC Isiu — Yoruba audio failed to load:",
                    audioURL,
                    audioElement.error
                );

            };


        audioElement.hidden =
            false;

    }


    /*
     * Show audio card.
     */

    if (audioCard) {

        audioCard.hidden =
            false;

        audioCard.style.display =
            "";

    }

}


/* =========================================================
   FETCH LESSONS
========================================================= */

async function fetchWeeklyLessons() {

    console.log(
        "AFC Isiu — Fetching lessons..."
    );


    try {

        /*
         * PapaParse must exist.
         */

        if (
            typeof Papa === "undefined"
        ) {

            throw new Error(
                "PapaParse is not loaded. Please make sure PapaParse is included in lessons.html."
            );

        }


        const response =
            await fetch(
                LESSONS_CSV_URL,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        console.log(
            "AFC Isiu — Lessons CSV status:",
            response.status
        );


        if (!response.ok) {

            throw new Error(
                `Unable to access lessons sheet. HTTP ${response.status}`
            );

        }


        const csvText =
            await response.text();


        if (!csvText.trim()) {

            throw new Error(
                "The lessons sheet returned no data."
            );

        }


        const result =
            Papa.parse(
                csvText,
                {
                    header: true,
                    skipEmptyLines: true
                }
            );


        if (
            result.errors &&
            result.errors.length
        ) {

            console.warn(
                "AFC Isiu — CSV parsing warnings:",
                result.errors
            );

        }


        lessonsData =
            result.data
                .map(
                    normalizeLessonRow
                )
                .filter(
                    lesson => {

                        return (
                            lesson.className ||
                            lesson.topic ||
                            lesson.summary
                        );

                    }
                );


        console.log(
            "AFC Isiu — Parsed Lessons:",
            lessonsData
        );


        if (
            !lessonsData.length
        ) {

            throw new Error(
                "No lesson records were found in the Google Sheet."
            );

        }


        /*
         * Now render.
         */

        renderSelectedClass();


    }

    catch (error) {

        console.error(
            "AFC Isiu — Weekly Lessons Error:",
            error
        );


        renderFetchError(
            error.message
        );

    }

}


/* =========================================================
   FIND LESSON FOR CLASS
========================================================= */

function findLessonForClass(
    className
) {

    const wanted =
        cleanText(
            className
        ).toLowerCase();


    return lessonsData.find(
        lesson => {

            return (
                cleanText(
                    lesson.className
                ).toLowerCase() ===
                wanted
            );

        }
    );

}


/* =========================================================
   UPDATE CLASS TABS
========================================================= */

function updateClassTabs(
    className
) {

    document
        .querySelectorAll(
            ".class-tab"
        )
        .forEach(
            tab => {

                const tabClass =
                    cleanText(
                        tab.dataset.class
                    );


                const isActive =
                    tabClass.toLowerCase() ===
                    cleanText(
                        className
                    ).toLowerCase();


                tab.classList.toggle(
                    "active",
                    isActive
                );


                tab.setAttribute(
                    "aria-selected",
                    isActive
                        ? "true"
                        : "false"
                );

            }
        );

}


/* =========================================================
   RENDER SELECTED CLASS
========================================================= */

function renderSelectedClass() {

    let lesson =
        findLessonForClass(
            selectedLessonClass
        );


    /*
     * If saved class does not exist,
     * try Senior.
     */

    if (!lesson) {

        lesson =
            findLessonForClass(
                "Senior"
            );

    }


    /*
     * If Senior does not exist,
     * use the first available lesson.
     */

    if (
        !lesson &&
        lessonsData.length
    ) {

        lesson =
            lessonsData[0];

    }


    if (!lesson) {

        renderFetchError(
            "No lesson is available right now."
        );

        return;

    }


    currentLesson =
        lesson;


    selectedLessonClass =
        lesson.className;


    localStorage.setItem(
        "selectedLessonClass",
        selectedLessonClass
    );


    updateClassTabs(
        selectedLessonClass
    );


    renderLesson(
        lesson
    );

}


/* =========================================================
   RENDER LESSON
========================================================= */

function renderLesson(
    lesson
) {

    console.log(
        "AFC Isiu — Rendering lesson:",
        lesson
    );


    /*
     * Show lesson view.
     */

    const lessonView =
        getElement(
            "lessonView"
        );


    if (lessonView) {

        lessonView.hidden =
            false;

        lessonView.style.display =
            "";

    }


    /* =====================================================
       LESSON TOPIC CARD

       IMPORTANT:
       NO LESSON NUMBER HERE.
    ===================================================== */

    const classBadge =
        getElement(
            "lessonClassBadge"
        );


    const lessonTitle =
        getElement(
            "lessonTitle"
        );


    if (classBadge) {

        classBadge.textContent =
            cleanText(
                lesson.className
            ).toUpperCase();

    }


    if (lessonTitle) {

        lessonTitle.textContent =
            lesson.topic ||
            "Weekly Lesson";

    }


    /* =====================================================
       LESSON INFORMATION
    ===================================================== */

    const bibleText =
        getElement(
            "lessonBibleText"
        );


    const lessonNumber =
        getElement(
            "lessonNumber"
        );


    const lessonDate =
        getElement(
            "lessonDate"
        );


    const memoryVerse =
        getElement(
            "lessonMemoryVerse"
        );


    if (bibleText) {

        bibleText.textContent =
            lesson.bibleText ||
            "—";

    }


    /*
     * Lesson number belongs here,
     * NOT in the Topic Card.
     */

    if (lessonNumber) {

        lessonNumber.textContent =
            lesson.lesson ||
            "—";

    }


    if (lessonDate) {

        const today =
            new Date();


        lessonDate.textContent =
            today.toLocaleDateString(
                "en-GB",
                {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                }
            );

    }


    if (memoryVerse) {

        memoryVerse.textContent =
            lesson.memoryVerse ||
            "—";

    }


    /* =====================================================
       SUMMARY
    ===================================================== */

    const lessonContent =
        getElement(
            "lessonContent"
        );


    if (lessonContent) {

        lessonContent.innerHTML =
            formatLessonContent(
                lesson.summary
            );

    }


    /* =====================================================
       DISCUSSION
    ===================================================== */

    const discussion =
        getElement(
            "lessonDiscussion"
        );


    if (discussion) {

        discussion.innerHTML =
            formatDiscussion(
                lesson.discussion
            );

    }


    /* =====================================================
       YORUBA AUDIO

       IMPORTANT:
       An audio failure must NOT stop
       the rest of the lesson.
    ===================================================== */

    try {

        renderYorubaAudio(
            lesson.yorubaAudio
        );

    }

    catch (audioError) {

        console.error(
            "AFC Isiu — Audio rendering error:",
            audioError
        );

    }


    /* =====================================================
       METADATA
    ===================================================== */

    updateLessonMeta(
        lesson
    );


    /* =====================================================
       PROGRESS
    ===================================================== */

    resetLessonProgress();


    /*
     * Recalculate after HTML has rendered.
     */

    requestAnimationFrame(
        () => {

            setupReadingProgress();

        }
    );

}


/* =========================================================
   LESSON META
========================================================= */

function updateLessonMeta(
    lesson
) {

    const summary =
        cleanText(
            lesson.summary
        );


    /*
     * Count paragraphs / major blocks.
     */

    let sections = 0;


    if (summary) {

        sections =
            summary
                .split(
                    /\r?\n\s*\r?\n/
                )
                .filter(Boolean)
                .length;

    }


    sections =
        Math.max(
            sections,
            1
        );


    const sectionCount =
        getElement(
            "sectionCount"
        );


    const mobileSectionCount =
        getElement(
            "mobileSectionCount"
        );


    if (sectionCount) {

        sectionCount.textContent =
            sections;

    }


    if (mobileSectionCount) {

        mobileSectionCount.textContent =
            sections;

    }


    /*
     * Reading time.
     */

    const words =
        summary
            ? summary
                .replace(
                    /<[^>]*>/g,
                    " "
                )
                .split(/\s+/)
                .filter(Boolean)
                .length
            : 0;


    const minutes =
        Math.max(
            1,
            Math.ceil(
                words / 180
            )
        );


    const readingLabel =
        `${minutes} min`;


    const readingTime =
        getElement(
            "readingTime"
        );


    const mobileReadingTime =
        getElement(
            "mobileReadingTime"
        );


    if (readingTime) {

        readingTime.textContent =
            readingLabel;

    }


    if (mobileReadingTime) {

        mobileReadingTime.textContent =
            readingLabel;

    }

}


/* =========================================================
   RESET PROGRESS
========================================================= */

function resetLessonProgress() {

    updateProgressUI(
        0
    );

}


/* =========================================================
   UPDATE PROGRESS UI
========================================================= */

function updateProgressUI(
    percent
) {

    const safePercent =
        Math.min(
            100,
            Math.max(
                0,
                Math.round(
                    percent
                )
            )
        );


    const progressPercent =
        getElement(
            "progressPercent"
        );


    const progressBar =
        getElement(
            "progressBar"
        );


    const progressText =
        getElement(
            "progressText"
        );


    const mobileProgressPercent =
        getElement(
            "mobileProgressPercent"
        );


    const mobileProgressBar =
        getElement(
            "mobileProgressBar"
        );


    if (progressPercent) {

        progressPercent.textContent =
            `${safePercent}%`;

    }


    if (progressBar) {

        progressBar.style.width =
            `${safePercent}%`;

    }


    if (mobileProgressPercent) {

        mobileProgressPercent.textContent =
            `${safePercent}%`;

    }


    if (mobileProgressBar) {

        mobileProgressBar.style.width =
            `${safePercent}%`;

    }


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
                "Almost there. Finish the lesson.";

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
                "Keep reading the lesson.";

        }

        else {

            progressText.textContent =
                "Start reading this lesson.";

        }

    }

}


/* =========================================================
   READING PROGRESS
========================================================= */

function setupReadingProgress() {

    /*
     * Remove old listener.
     */

    if (
        progressScrollHandler
    ) {

        window.removeEventListener(
            "scroll",
            progressScrollHandler
        );

    }


    progressScrollHandler =
        function () {

            const content =
                getElement(
                    "lessonContent"
                );


            if (!content) {

                return;

            }


            const contentHeight =
                content.scrollHeight;


            if (
                contentHeight <= 0
            ) {

                updateProgressUI(
                    0
                );

                return;

            }


            const rect =
                content.getBoundingClientRect();


            const contentTop =
                window.scrollY +
                rect.top;


            const contentBottom =
                contentTop +
                contentHeight;


            const currentPosition =
                window.scrollY +
                (
                    window.innerHeight *
                    0.65
                );


            let percent =
                (
                    (
                        currentPosition -
                        contentTop
                    ) /
                    contentHeight
                ) *
                100;


            if (
                currentPosition <
                contentTop
            ) {

                percent =
                    0;

            }


            if (
                currentPosition >=
                contentBottom
            ) {

                percent =
                    100;

            }


            updateProgressUI(
                percent
            );

        };


    window.addEventListener(
        "scroll",
        progressScrollHandler,
        {
            passive: true
        }
    );


    progressScrollHandler();

}


/* =========================================================
   MARK LESSON COMPLETED
========================================================= */

function markLessonCompleted() {

    if (!currentLesson) {

        return;

    }


    updateProgressUI(
        100
    );


    const storageKey =
        `lessonCompleted_${currentLesson.className}_${currentLesson.lesson}`;


    localStorage.setItem(
        storageKey,
        "true"
    );


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
                        "strong"
                    );


                const small =
                    button.querySelector(
                        "small"
                    );


                if (strong) {

                    strong.textContent =
                        "Lesson completed";

                }


                if (small) {

                    small.textContent =
                        "Great job!";

                }

            }
        );

}


/* =========================================================
   TAB EVENTS
========================================================= */

function initializeLessonTabs() {

    document
        .querySelectorAll(
            ".class-tab"
        )
        .forEach(
            tab => {

                if (
                    tab.dataset.initialized ===
                    "true"
                ) {

                    return;

                }


                tab.dataset.initialized =
                    "true";


                tab.addEventListener(
                    "click",
                    function () {

                        const className =
                            cleanText(
                                tab.dataset.class
                            );


                        if (!className) {

                            return;

                        }


                        selectedLessonClass =
                            className;


                        localStorage.setItem(
                            "selectedLessonClass",
                            selectedLessonClass
                        );


                        updateClassTabs(
                            selectedLessonClass
                        );


                        renderSelectedClass();


                        /*
                         * On mobile, gently bring
                         * the lesson into view.
                         */

                        if (
                            window.innerWidth <=
                            768
                        ) {

                            const lessonView =
                                getElement(
                                    "lessonView"
                                );


                            if (lessonView) {

                                setTimeout(
                                    () => {

                                        lessonView.scrollIntoView(
                                            {
                                                behavior:
                                                    "smooth",
                                                block:
                                                    "start"
                                            }
                                        );

                                    },
                                    80
                                );

                            }

                        }

                    }
                );

            }
        );

}


/* =========================================================
   FINISH BUTTONS
========================================================= */

function initializeFinishButtons() {

    document
        .querySelectorAll(
            "#finishReadingBtn, #mobileFinishReadingBtn"
        )
        .forEach(
            button => {

                if (
                    button.dataset.initialized ===
                    "true"
                ) {

                    return;

                }


                button.dataset.initialized =
                    "true";


                button.addEventListener(
                    "click",
                    markLessonCompleted
                );

            }
        );

}


/* =========================================================
   RETRY BUTTON
========================================================= */

function initializeRetryButton() {

    const retry =
        getElement(
            "retryLessons"
        );


    if (!retry) {

        return;

    }


    if (
        retry.dataset.initialized ===
        "true"
    ) {

        return;

    }


    retry.dataset.initialized =
        "true";


    retry.addEventListener(
        "click",
        function () {

            fetchWeeklyLessons();

        }
    );

}


/* =========================================================
   ERROR DISPLAY
========================================================= */

function renderFetchError(
    message
) {

    console.error(
        "AFC Isiu — Lesson error:",
        message
    );


    const errorBox =
        getElement(
            "lessonsError"
        );


    const errorMessage =
        getElement(
            "lessonsErrorMessage"
        );


    const lessonView =
        getElement(
            "lessonView"
        );


    if (lessonView) {

        lessonView.hidden =
            true;

    }


    if (errorMessage) {

        errorMessage.textContent =
            message ||
            "Unable to load the lessons.";

    }


    if (errorBox) {

        errorBox.hidden =
            false;

        errorBox.style.display =
            "";

        return;

    }


    /*
     * If the HTML does not have an
     * error box, put the error inside
     * lessonContent instead.
     */

    const lessonContent =
        getElement(
            "lessonContent"
        );


    if (lessonContent) {

        lessonContent.innerHTML = `

            <div class="lesson-empty-state">

                <i class="fa-solid fa-triangle-exclamation"></i>

                <p>
                    ${escapeHTML(
                        message ||
                        "Unable to load lessons."
                    )}
                </p>

            </div>

        `;

    }

}


/* =========================================================
   INITIALIZATION
========================================================= */

function initializeLessonsPage() {

    console.log(
        "AFC Isiu — Initializing Lessons Page..."
    );


    /*
     * We need at least one of these
     * elements to know that this is
     * the lessons page.
     */

    const lessonView =
        getElement(
            "lessonView"
        );


    const lessonContent =
        getElement(
            "lessonContent"
        );


    const tabs =
        document.querySelectorAll(
            ".class-tab"
        );


    if (
        !lessonView &&
        !lessonContent &&
        !tabs.length
    ) {

        console.warn(
            "AFC Isiu — Lessons interface not found. lessons.js stopped."
        );

        return;

    }


    initializeLessonTabs();

    initializeFinishButtons();

    initializeRetryButton();

    fetchWeeklyLessons();

}


/* =========================================================
   DOM READY
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeLessonsPage
    );

}

else {

    initializeLessonsPage();

}


/* =========================================================
   PUBLIC API
========================================================= */

window.AFCLessons = {

    getLessons() {

        return lessonsData;

    },


    getCurrentLesson() {

        return currentLesson;

    },


    switchClass(
        className
    ) {

        const cleanClass =
            cleanText(
                className
            );


        if (!cleanClass) {

            return;

        }


        selectedLessonClass =
            cleanClass;


        localStorage.setItem(
            "selectedLessonClass",
            selectedLessonClass
        );


        updateClassTabs(
            selectedLessonClass
        );


        renderSelectedClass();

    },


    reload() {

        return fetchWeeklyLessons();

    }

};
</html>
