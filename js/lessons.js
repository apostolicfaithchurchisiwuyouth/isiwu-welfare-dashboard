 javascript
/* =========================================================
   AFC ISIU YOUTH PORTAL
   FILE: lessons.js
   PURPOSE: LESSONS PAGE CONTROLLER

   GOOGLE SHEET COLUMNS:

   Lesson
   Class
   Topic
   BibleText
   MemoryVerse
   Summary
   Discussion
   YorubaAudio

   IMPORTANT
   ---------------------------------------------------------
   Summary:
   - Contains the complete lesson.
   - May contain HTML.
   - HTML is rendered directly.

   YorubaAudio:
   - May contain:
       /audio/Senior-77.mp3
       /audio/Junior-83.mp3
       /audio/Elementary-10.mp3
   - Relative paths are converted to the live Vercel URL.

   Topic Card:
   - Shows ONLY the topic.
   - Does NOT show the lesson number.

   Lesson Information:
   - Lesson number is shown separately.

   ========================================================= */

"use strict";


/* =========================================================
   CONFIGURATION
========================================================= */

const LESSONS_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VJZ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=201183837&single=true&output=csv";


/*
 * Your production website.
 *
 * Audio paths from the Google Sheet such as:
 *
 * /audio/Senior-77.mp3
 *
 * will become:
 *
 * https://afcisiuyouth.vercel.app/audio/Senior-77.mp3
 */

const SITE_ORIGIN =
    "https://afcisiuyouth.vercel.app";


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
   TEXT HELPER
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
   GET SHEET VALUE
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

        const target =
            normalizeHeader(name);


        const matchingKey =
            keys.find(key => {

                return (
                    normalizeHeader(key) ===
                    target
                );

            });


        if (
            matchingKey !== undefined
        ) {

            const value =
                cleanText(
                    row[matchingKey]
                );


            if (value !== "") {

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
   FORMAT LESSON CONTENT
=========================================================

   SUMMARY CONTAINS HTML.

   Example from Google Sheet:

   <h2>Introduction</h2>
   <p>Jesus showed compassion...</p>

   The HTML is intentionally rendered directly.

   DO NOT use escapeHTML() here because that would turn
   the HTML into visible text instead of rendering it.
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
     * If questions are separated by ordinary
     * line breaks, split them.
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
   AUDIO URL RESOLVER
=========================================================

   Handles:

   1. /audio/Senior-77.mp3

   2. audio/Senior-77.mp3

   3. https://afcisiuyouth.vercel.app/audio/Senior-77.mp3

   4. Any other absolute HTTP/HTTPS URL.

========================================================= */

function resolveAudioURL(audioValue) {

    const audioPath =
        cleanText(audioValue);


    if (!audioPath) {

        return "";

    }


    /*
     * Already an absolute URL.
     */

    if (
        /^https?:\/\//i.test(
            audioPath
        )
    ) {

        return audioPath;

    }


    try {

        /*
         * Paths beginning with /
         *
         * /audio/Senior-77.mp3
         */

        if (
            audioPath.startsWith("/")
        ) {

            return (
                SITE_ORIGIN +
                audioPath
            );

        }


        /*
         * Paths without the first slash.
         *
         * audio/Senior-77.mp3
         */

        return new URL(
            audioPath,
            SITE_ORIGIN + "/"
        ).href;

    }

    catch (error) {

        console.error(
            "AFC Isiu — Invalid audio path:",
            audioPath,
            error
        );

        return "";

    }

}


/* =========================================================
   FORMAT YORUBA AUDIO
========================================================= */

function formatYorubaAudio(
    audioValue
) {

    const audioURL =
        resolveAudioURL(
            audioValue
        );


    if (!audioURL) {

        return "";

    }


    return `

        <div class="yoruba-audio-player">

            <div class="yoruba-audio-header">

                <div class="yoruba-audio-icon">

                    <i class="fa-solid fa-volume-high"></i>

                </div>

                <div class="yoruba-audio-title">

                    <strong>
                        Listen in Yoruba
                    </strong>

                    <span>
                        Memory Verse Audio
                    </span>

                </div>

            </div>


            <audio
                class="lesson-audio-player"
                controls
                preload="metadata"
                src="${escapeHTML(audioURL)}"
            >
                Your browser does not support
                audio playback.
            </audio>


            <div class="yoruba-audio-status">

                <span>
                    Yoruba Memory Verse
                </span>

            </div>

        </div>

    `;

}


/* =========================================================
   RENDER YORUBA AUDIO
========================================================= */

function renderYorubaAudio(
    audioValue
) {

    const audioCard =
        getElement(
            "yorubaAudioCard"
        );


    const audioContainer =
        getElement(
            "yorubaAudio"
        );


    const audioPath =
        cleanText(
            audioValue
        );


    /*
     * No audio in Google Sheet.
     */

    if (!audioPath) {

        if (audioCard) {

            audioCard.hidden = true;

            audioCard.style.display =
                "none";

        }


        if (audioContainer) {

            audioContainer.innerHTML =
                "";

        }


        return;

    }


    const audioURL =
        resolveAudioURL(
            audioPath
        );


    console.log(
        "AFC Isiu — Yoruba Audio Path:",
        audioPath
    );


    console.log(
        "AFC Isiu — Yoruba Audio URL:",
        audioURL
    );


    if (!audioURL) {

        if (audioCard) {

            audioCard.hidden = true;

        }

        return;

    }


    /*
     * Preferred method:
     *
     * If lessons.html contains:
     *
     * <div id="yorubaAudio"></div>
     *
     * put the player inside it.
     */

    if (audioContainer) {

        audioContainer.innerHTML =
            formatYorubaAudio(
                audioPath
            );

    }


    /*
     * Show the card.
     */

    if (audioCard) {

        audioCard.hidden = false;

        audioCard.style.display =
            "";

    }


    /*
     * Verify that the browser can reach
     * the actual audio file.
     */

    const audio =
        audioContainer
            ? audioContainer.querySelector(
                "audio"
            )
            : null;


    if (audio) {

        audio.addEventListener(
            "error",
            () => {

                console.error(
                    "AFC Isiu — Yoruba audio could not be loaded:",
                    audioURL
                );

                const status =
                    audioContainer.querySelector(
                        ".yoruba-audio-status"
                    );


                if (status) {

                    status.innerHTML = `

                        <span>
                            Audio could not be loaded.
                        </span>

                    `;

                }

            },
            {
                once: true
            }
        );

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

        const response =
            await fetch(
                LESSONS_CSV_URL,
                {
                    method: "GET",
                    cache: "no-store"
                }
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


        if (
            typeof Papa ===
            "undefined"
        ) {

            throw new Error(
                "PapaParse is not available on this page."
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


        console.log(
            "AFC Isiu — Number of lessons:",
            lessonsData.length
        );


        if (
            !lessonsData.length
        ) {

            throw new Error(
                "No lesson records were found in the WeeklyLesson sheet."
            );

        }


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


                const active =
                    tabClass.toLowerCase() ===
                    cleanText(
                        className
                    ).toLowerCase();


                tab.classList.toggle(
                    "active",
                    active
                );


                tab.setAttribute(
                    "aria-selected",
                    active
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
     * If saved class no longer exists,
     * use Senior.
     */

    if (!lesson) {

        lesson =
            findLessonForClass(
                "Senior"
            );

    }


    /*
     * Final fallback:
     * first available lesson.
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
            "No lesson is available for this class yet."
        );

        return;

    }


    currentLesson =
        lesson;


    selectedLessonClass =
        cleanText(
            lesson.className
        );


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

       ONLY:
       - Class
       - Topic

       NO LESSON NUMBER
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
            cleanText(
                lesson.topic
            ) ||
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
            cleanText(
                lesson.bibleText
            ) ||
            "—";

    }


    if (lessonNumber) {

        lessonNumber.textContent =
            cleanText(
                lesson.lesson
            ) ||
            "—";

    }


    if (lessonDate) {

        const today =
            new Date();


        lessonDate.textContent =
            today.toLocaleDateString(
                "en-GB",
                {
                    day:
                        "numeric",

                    month:
                        "short",

                    year:
                        "numeric"
                }
            );

    }


    if (memoryVerse) {

        memoryVerse.textContent =
            cleanText(
                lesson.memoryVerse
            ) ||
            "—";

    }


    /* =====================================================
       SUMMARY
       
       HTML FROM GOOGLE SHEET IS RENDERED.
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
    ===================================================== */

    renderYorubaAudio(
        lesson.yorubaAudio
    );


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
   LESSON METADATA
========================================================= */

function updateLessonMeta(
    lesson
) {

    const summary =
        cleanText(
            lesson.summary
        );


    const sectionCount =
        getElement(
            "sectionCount"
        );


    const mobileSectionCount =
        getElement(
            "mobileSectionCount"
        );


    /*
     * Count actual headings in HTML when possible.
     */

    let sections = 0;


    if (summary) {

        const headingMatches =
            summary.match(
                /<h[1-6][^>]*>/gi
            );


        if (
            headingMatches &&
            headingMatches.length
        ) {

            sections =
                headingMatches.length;

        }

        else {

            sections =
                summary
                    .split(
                        /\r?\n\s*\r?\n/
                    )
                    .filter(Boolean)
                    .length;

        }

    }


    sections =
        Math.max(
            sections,
            1
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
     *
     * Remove HTML tags before counting words.
     */

    const plainText =
        summary
            .replace(
                /<[^>]*>/g,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();


    const words =
        plainText
            ? plainText
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
   PROGRESS
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
                Math.round(percent)
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

                percent = 0;

            }


            if (
                currentPosition >=
                contentBottom
            ) {

                percent = 100;

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
                    event => {

                        event.preventDefault();


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
                         * On mobile, bring the lesson
                         * into view.
                         */

                        if (
                            window.innerWidth <=
                            768
                        ) {

                            const lessonView =
                                getElement(
                                    "lessonView"
                                );


                            if (
                                lessonView
                            ) {

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
                                    50
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
        () => {

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

    const lessonView =
        getElement(
            "lessonView"
        );


    const lessonContent =
        getElement(
            "lessonContent"
        );


    if (lessonView) {

        lessonView.hidden =
            true;

    }


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

                <button
                    type="button"
                    id="retryLessons"
                    class="lesson-retry-button"
                >
                    Try Again
                </button>

            </div>

        `;


        const retry =
            getElement(
                "retryLessons"
            );


        if (retry) {

            retry.addEventListener(
                "click",
                fetchWeeklyLessons
            );

        }

    }

}


/* =========================================================
   INITIALIZATION
========================================================= */

function initializeLessonsPage() {

    console.log(
        "AFC Isiu — Lessons page initialized."
    );


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


    /*
     * Do not run on pages that are not
     * the lessons page.
     */

    if (
        !lessonView &&
        !lessonContent &&
        !tabs.length
    ) {

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

        const wanted =
            cleanText(
                className
            );


        if (!wanted) {

            return;

        }


        selectedLessonClass =
            wanted;


        localStorage.setItem(
            "selectedLessonClass",
            selectedLessonClass
        );


        renderSelectedClass();

    },


    reload() {

        fetchWeeklyLessons();

    },


    resolveAudioURL(
        audioPath
    ) {

        return resolveAudioURL(
            audioPath
        );

    }

};
 
