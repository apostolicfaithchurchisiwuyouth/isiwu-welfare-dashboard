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

   IMPORTANT:

   - Summary = full lesson content.
   - Discussion = discussion questions.
   - Topic = displayed in the Lesson Topic Card.
   - Lesson = displayed in the Lesson information card.
   - YorubaAudio may contain:

       /audio/Junior-83.mp3

   - Relative audio paths are supported.
   - No duplicate lesson content.
   - No permanent loading spinner.
   ========================================================= */

"use strict";


/* =========================================================
   CONFIGURATION
========================================================= */

const LESSONS_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=201183837&single=true&output=csv";


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


    for (const name of possibleNames) {

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
            matchingKey !== undefined &&
            cleanText(row[matchingKey]) !== ""
        ) {

            return cleanText(
                row[matchingKey]
            );

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
                ["Lesson"]
            ),

        className:
            getSheetValue(
                row,
                ["Class"]
            ),

        topic:
            getSheetValue(
                row,
                ["Topic"]
            ),

        bibleText:
            getSheetValue(
                row,
                [
                    "BibleText",
                    "Bible Text"
                ]
            ),

        memoryVerse:
            getSheetValue(
                row,
                [
                    "MemoryVerse",
                    "Memory Verse"
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
                    "Yoruba Audio"
                ]
            )

    };

}


/* =========================================================
   FORMAT LESSON CONTENT
   Supports HTML stored directly in the Google Sheet Summary
========================================================= */

function formatLessonContent(html) {

    const value = cleanText(html);

    if (!value) {

        return `
            <div class="lesson-empty-state">
                <i class="fa-regular fa-file-lines"></i>
                <p>Lesson content is not available yet.</p>
            </div>
        `;

    }

    /*
     * Summary is trusted HTML coming from your
     * WeeklyLesson Google Sheet.
     *
     * Render it as HTML so headings, paragraphs,
     * lists, bold text, etc. work properly.
     */
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


    if (items.length <= 1) {

        items =
            escaped
                .split(/\r?\n/)
                .map(item => item.trim())
                .filter(Boolean);

    }


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


    return items
        .map((item, index) => {

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

        })
        .join("");

}


/* =========================================================
   FETCH LESSONS
========================================================= */

async function fetchWeeklyLessons() {

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
            typeof Papa === "undefined"
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
                    skipEmptyLines: true
                }
            );


        lessonsData =
            result.data
                .map(normalizeLessonRow)
                .filter(lesson => {

                    return (
                        lesson.className ||
                        lesson.topic ||
                        lesson.summary
                    );

                });


        console.log(
            "Parsed Lessons:",
            lessonsData
        );


        if (!lessonsData.length) {

            throw new Error(
                "No lesson records were found."
            );

        }


        renderSelectedClass();

    }

    catch (error) {

        console.error(
            "Weekly Lessons Error:",
            error
        );


        renderFetchError(
            error.message
        );

    }

}


/* =========================================================
   FIND LESSON
========================================================= */

function findLessonForClass(className) {

    const wanted =
        cleanText(className)
            .toLowerCase();


    return lessonsData.find(lesson => {

        return (
            cleanText(
                lesson.className
            ).toLowerCase() ===
            wanted
        );

    });

}


/* =========================================================
   UPDATE TABS
========================================================= */

function updateClassTabs(className) {

    document
        .querySelectorAll(".class-tab")
        .forEach(tab => {

            const tabClass =
                cleanText(
                    tab.dataset.class
                );


            const active =
                tabClass.toLowerCase() ===
                cleanText(className).toLowerCase();


            tab.classList.toggle(
                "active",
                active
            );


            tab.setAttribute(
                "aria-selected",
                active ? "true" : "false"
            );

        });

}


/* =========================================================
   RENDER SELECTED CLASS
========================================================= */

function renderSelectedClass() {

    let lesson =
        findLessonForClass(
            selectedLessonClass
        );


    if (!lesson) {

        lesson =
            findLessonForClass(
                "Senior"
            );

    }


    if (
        !lesson &&
        lessonsData.length
    ) {

        lesson =
            lessonsData[0];

    }


    if (!lesson) {

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

function renderLesson(lesson) {

    const lessonView =
        getElement("lessonView");


    if (lessonView) {

        lessonView.hidden = false;

    }


    /* ---------------------------------------------
       TOPIC CARD
       ONLY CLASS + TOPIC
    --------------------------------------------- */

    const classBadge =
        getElement("lessonClassBadge");

    const lessonTitle =
        getElement("lessonTitle");


    if (classBadge) {

        classBadge.textContent =
            `${cleanText(
                lesson.className
            ).toUpperCase()} LESSON`;

    }


    if (lessonTitle) {

        lessonTitle.textContent =
            lesson.topic ||
            "Weekly Lesson";

    }


    /* ---------------------------------------------
       LESSON INFORMATION
    --------------------------------------------- */

    const bibleText =
        getElement("lessonBibleText");

    const lessonNumber =
        getElement("lessonNumber");

    const lessonDate =
        getElement("lessonDate");

    const memoryVerse =
        getElement("lessonMemoryVerse");


    if (bibleText) {

        bibleText.textContent =
            lesson.bibleText ||
            "—";

    }


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


    /* ---------------------------------------------
       LESSON CONTENT
       SUMMARY ONLY
    --------------------------------------------- */

    const lessonContent =
        getElement("lessonContent");


    if (lessonContent) {

        lessonContent.innerHTML =
            formatLessonContent(
                lesson.summary
            );

    }


    /* ---------------------------------------------
       DISCUSSION
    --------------------------------------------- */

    const discussion =
        getElement("lessonDiscussion");


    if (discussion) {

        discussion.innerHTML =
            formatDiscussion(
                lesson.discussion
            );

    }


    /* ---------------------------------------------
       YORUBA AUDIO
    --------------------------------------------- */

    renderYorubaAudio(
        lesson.yorubaAudio
    );


    /* ---------------------------------------------
       METADATA
    --------------------------------------------- */

    updateLessonMeta(
        lesson
    );


    /* ---------------------------------------------
       PROGRESS
    --------------------------------------------- */

    resetLessonProgress();


    requestAnimationFrame(() => {

        setupReadingProgress();

    });

}


/* =========================================================
   FORMAT YORUBA AUDIO
========================================================= */

function formatAudio(audioValue) {

    const audioPath = cleanText(audioValue);

    if (!audioPath) {
        return "";
    }

    /*
     * Convert paths such as:
     *
     * /audio/Junior-83.mp3
     *
     * into:
     *
     * https://yourwebsite.com/audio/Junior-83.mp3
     */

    let audioURL = audioPath;

    try {

        if (
            audioPath.startsWith("/")
        ) {

            audioURL =
                window.location.origin +
                audioPath;

        }

        else if (
            !/^https?:\/\//i.test(audioPath)
        ) {

            audioURL =
                new URL(
                    audioPath,
                    window.location.href
                ).href;

        }

    }

    catch (error) {

        console.error(
            "Invalid Yoruba audio path:",
            audioPath,
            error
        );

        return "";

    }


    return `

        <div class="yoruba-audio-player">

            <div class="yoruba-audio-player-top">

                <div class="yoruba-audio-player-icon">

                    <i class="fa-solid fa-volume-high"></i>

                </div>

                <div>

                    <strong>
                        Listen in Yoruba
                    </strong>

                    <span>
                        Memory Verse Audio
                    </span>

                </div>

            </div>


            <audio
                controls
                preload="metadata"
                class="lesson-audio-player"
                src="${escapeHTML(audioURL)}"
            >

                Your browser does not support
                audio playback.

            </audio>

        </div>

    `;

}


/* =========================================================
   RENDER YORUBA AUDIO
========================================================= */

function renderAudio(audioValue) {

    const audioPath =
        cleanText(audioValue);


    const audioCard =
        getElement("yorubaAudioCard");


    const audioElement =
        getElement("yorubaAudio");


    /*
     * No audio supplied.
     */

    if (!audioPath) {

        if (audioCard) {
            audioCard.hidden = true;
        }

        return;

    }


    let audioURL =
        audioPath;


    try {

        /*
         * Google Sheet:
         *
         * /audio/Junior-83.mp3
         *
         * becomes:
         *
         * https://yourdomain.com/audio/Junior-83.mp3
         */

        if (
            audioPath.startsWith("/")
        ) {

            audioURL =
                window.location.origin +
                audioPath;

        }

        /*
         * Handles:
         *
         * audio/Junior-83.mp3
         */

        else if (
            !/^https?:\/\//i.test(audioPath)
        ) {

            audioURL =
                new URL(
                    audioPath,
                    window.location.href
                ).href;

        }

    }

    catch (error) {

        console.error(
            "Could not create Yoruba audio URL:",
            error
        );

        return;

    }


    console.log(
        "AFC Isiu — Yoruba Audio:",
        audioURL
    );


    /*
     * If your HTML contains a dedicated
     * <audio id="yorubaAudio">
     * use it directly.
     */

    if (audioElement) {

        audioElement.pause();

        audioElement.removeAttribute("src");

        audioElement.src =
            audioURL;

        audioElement.load();

        audioElement.hidden = false;

    }


    /*
     * Show the card.
     */

    if (audioCard) {

        audioCard.hidden = false;

        audioCard.style.display = "";

    }

}

/* =========================================================
   LESSON META
========================================================= */

function updateLessonMeta(lesson) {

    const summary =
        cleanText(
            lesson.summary
        );


    let sections = 0;


    if (summary) {

        sections =
            summary
                .split(/\r?\n\s*\r?\n/)
                .filter(Boolean)
                .length;

    }


    sections =
        Math.max(
            sections,
            1
        );


    const sectionCount =
        getElement("sectionCount");

    const mobileSectionCount =
        getElement("mobileSectionCount");


    if (sectionCount) {

        sectionCount.textContent =
            sections;

    }


    if (mobileSectionCount) {

        mobileSectionCount.textContent =
            sections;

    }


    const words =
        summary
            ? summary
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
        getElement("readingTime");

    const mobileReadingTime =
        getElement("mobileReadingTime");


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

    updateProgressUI(0);

}


/* =========================================================
   UPDATE PROGRESS
========================================================= */

function updateProgressUI(percent) {

    const safePercent =
        Math.min(
            100,
            Math.max(
                0,
                Math.round(percent)
            )
        );


    const progressPercent =
        getElement("progressPercent");

    const progressBar =
        getElement("progressBar");

    const progressText =
        getElement("progressText");

    const mobileProgressPercent =
        getElement("mobileProgressPercent");

    const mobileProgressBar =
        getElement("mobileProgressBar");


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

        if (safePercent >= 100) {

            progressText.textContent =
                "Lesson completed. Well done!";

        }

        else if (safePercent >= 75) {

            progressText.textContent =
                "Almost there. Finish the lesson.";

        }

        else if (safePercent >= 40) {

            progressText.textContent =
                "You're making good progress.";

        }

        else if (safePercent > 0) {

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

    if (progressScrollHandler) {

        window.removeEventListener(
            "scroll",
            progressScrollHandler
        );

    }


    progressScrollHandler =
        function () {

            const content =
                getElement("lessonContent");


            if (!content) {

                return;

            }


            const rect =
                content.getBoundingClientRect();


            const contentTop =
                window.scrollY +
                rect.top;


            const contentHeight =
                content.scrollHeight;


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


    updateProgressUI(100);


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
        .forEach(button => {

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

        });

}


/* =========================================================
   TAB EVENTS
========================================================= */

function initializeLessonTabs() {

    document
        .querySelectorAll(
            ".class-tab"
        )
        .forEach(tab => {

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
                () => {

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


                    renderSelectedClass();

                }
            );

        });

}


/* =========================================================
   FINISH BUTTONS
========================================================= */

function initializeFinishButtons() {

    document
        .querySelectorAll(
            "#finishReadingBtn, #mobileFinishReadingBtn"
        )
        .forEach(button => {

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

        });

}


/* =========================================================
   ERROR DISPLAY
========================================================= */

function renderFetchError(message) {

    const lessonContent =
        getElement("lessonContent");


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

    const lessonView =
        getElement("lessonView");


    if (!lessonView) {

        return;

    }


    initializeLessonTabs();

    initializeFinishButtons();

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


    switchClass(className) {

        selectedLessonClass =
            cleanText(className);


        localStorage.setItem(
            "selectedLessonClass",
            selectedLessonClass
        );


        renderSelectedClass();

    },


    reload() {

        fetchWeeklyLessons();

    }

};
