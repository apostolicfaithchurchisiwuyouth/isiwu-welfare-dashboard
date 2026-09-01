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

   YORUBA AUDIO EXAMPLE:

   /audio/Junior-83.mp3

   IMPORTANT:
   - Summary contains HTML and is rendered as HTML.
   - Discussion contains discussion questions.
   - Topic appears only in the Lesson Topic Card.
   - Lesson number appears only in the information card.
   - YorubaAudio supports local paths and full URLs.
   ========================================================= */

"use strict";


/* =========================================================
   CONFIGURATION
========================================================= */

const LESSONS_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VJZ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=201183837&single=true&output=csv";


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
   HTML ESCAPE
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
   NORMALIZE SHEET HEADER
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

   The Summary column contains actual HTML.

   Example:

   <h3>Introduction</h3>

   <p>
       Jesus taught His disciples...
   </p>

   <h3>Lesson Objective</h3>

   <p>
       We should trust God...
   </p>

   This function intentionally DOES NOT escape the HTML.
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
       Also support one question per line.
    */

    if (items.length <= 1) {

        items =
            escaped
                .split(/\r?\n/)
                .map(item => item.trim())
                .filter(Boolean);

    }


    /*
       Remove empty items.
    */

    items =
        items.filter(Boolean);


    if (!items.length) {

        return `

            <div class="discussion-empty">

                <i class="fa-regular fa-comments"></i>

                <p>
                    No discussion questions have been added yet.
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

        console.log(
            "AFC Isiu — Fetching lessons..."
        );


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


        if (
            result.errors &&
            result.errors.length
        ) {

            console.warn(
                "Lesson CSV parsing warnings:",
                result.errors
            );

        }


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
            "AFC Isiu — Parsed Lessons:",
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
            "AFC Isiu — Weekly Lessons Error:",
            error
        );


        renderFetchError(
            error.message ||
            "Unable to load lessons."
        );

    }

}


/* =========================================================
   FIND LESSON FOR CLASS
========================================================= */

function findLessonForClass(className) {

    const wanted =
        cleanText(className)
            .toLowerCase();


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

function updateClassTabs(className) {

    document
        .querySelectorAll(
            ".class-tab"
        )
        .forEach(tab => {

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


    /*
       Fallback to Senior.
    */

    if (!lesson) {

        lesson =
            findLessonForClass(
                "Senior"
            );

    }


    /*
       Final fallback to first lesson.
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

function renderLesson(lesson) {

    const lessonView =
        getElement("lessonView");


    if (lessonView) {

        lessonView.hidden = false;

        lessonView.style.display =
            "";

    }


    /* =====================================================
       TOPIC CARD
       
       ONLY:
       - Class
       - Topic
       
       NO LESSON NUMBER.
    ===================================================== */

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


    /* =====================================================
       LESSON INFORMATION
    ===================================================== */

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


    /*
       Lesson number stays here only.
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
       
       IMPORTANT:
       Summary is HTML from Google Sheets.
       
       DO NOT escape it.
    ===================================================== */

    const lessonContent =
        getElement("lessonContent");


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
       META
    ===================================================== */

    updateLessonMeta(
        lesson
    );


    /* =====================================================
       PROGRESS
    ===================================================== */

    resetLessonProgress();


    requestAnimationFrame(() => {

        setupReadingProgress();

    });

}


/* =========================================================
   BUILD AUDIO URL
=========================================================

   Handles all of these:

   /audio/Junior-83.mp3
   audio/Junior-83.mp3
   ../audio/Junior-83.mp3
   https://example.com/audio/Junior-83.mp3
========================================================= */

function buildAudioURL(audioPath) {

    const value =
        cleanText(audioPath);


    if (!value) {

        return "";

    }


    /*
       Full URL.
    */

    if (
        /^https?:\/\//i.test(value)
    ) {

        return value;

    }


    try {

        /*
         * Root-relative path.
         *
         * /audio/Junior-83.mp3
         */

        if (
            value.startsWith("/")
        ) {

            return new URL(
                value,
                window.location.origin
            ).href;

        }


        /*
         * Relative path.
         *
         * audio/Junior-83.mp3
         *
         * ../audio/Junior-83.mp3
         */

        return new URL(
            value,
            window.location.href
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

    const audioCard =
        getElement(
            "yorubaAudioCard"
        );


    const audioElement =
        getElement(
            "yorubaAudio"
        );


    const audioPath =
        cleanText(
            audioValue
        );


    /*
       If the HTML does not contain
       the audio card, stop safely.
    */

    if (!audioCard) {

        console.warn(
            "AFC Isiu — #yorubaAudioCard not found."
        );

        return;

    }


    /*
       If no audio was supplied.
    */

    if (!audioPath) {

        audioCard.hidden = true;


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

        audioCard.hidden = true;

        return;

    }


    console.log(
        "AFC Isiu — Yoruba Audio Path:",
        audioPath
    );


    console.log(
        "AFC Isiu — Yoruba Audio URL:",
        audioURL
    );


    /*
       Update dedicated audio element.
    */

    if (audioElement) {

        /*
           Stop previous lesson audio.
        */

        audioElement.pause();


        /*
           Clear previous source.
        */

        audioElement.removeAttribute(
            "src"
        );


        /*
           Set new source.
        */

        audioElement.src =
            audioURL;


        /*
           Important:
           Force browser to recognize
           the new audio source.
        */

        audioElement.load();


        /*
           Show player.
        */

        audioElement.hidden =
            false;


        /*
           Helpful browser events.
        */

        audioElement.onloadedmetadata =
            function () {

                console.log(
                    "AFC Isiu — Yoruba audio loaded successfully:",
                    audioURL
                );

            };


        audioElement.onerror =
            function () {

                console.error(
                    "AFC Isiu — Yoruba audio FAILED:",
                    audioURL
                );


                showAudioError(
                    audioElement,
                    audioURL
                );

            };

    }


    /*
       Show card.
    */

    audioCard.hidden =
        false;


    audioCard.style.display =
        "";

}


/* =========================================================
   AUDIO ERROR
========================================================= */

function showAudioError(
    audioElement,
    audioURL
) {

    if (!audioElement) {

        return;

    }


    /*
       Do not destroy the player.
       Instead, place a small message
       below it.
    */

    let errorMessage =
        audioElement.parentElement
            ?.querySelector(
                ".yoruba-audio-error"
            );


    if (!errorMessage) {

        errorMessage =
            document.createElement(
                "p"
            );


        errorMessage.className =
            "yoruba-audio-error";


        audioElement.parentElement
            ?.appendChild(
                errorMessage
            );

    }


    errorMessage.innerHTML = `

        <i class="fa-solid fa-circle-exclamation"></i>

        Audio could not be loaded.
        Please check that the file exists at:

        <code>
            ${escapeHTML(audioURL)}
        </code>

    `;

}


/* =========================================================
   LESSON META
========================================================= */

function updateLessonMeta(lesson) {

    const summary =
        cleanText(
            lesson.summary
        );


    /*
       Count HTML headings when possible.
    */

    let sections = 0;


    if (summary) {

        const headingMatches =
            summary.match(
                /<h[1-6][^>]*>/gi
            );


        if (headingMatches) {

            sections =
                headingMatches.length;

        }


        /*
           If no headings exist,
           count paragraphs.
        */

        if (sections === 0) {

            const paragraphMatches =
                summary.match(
                    /<p[^>]*>/gi
                );


            if (paragraphMatches) {

                sections =
                    paragraphMatches.length;

            }

        }

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
       Strip HTML before counting words.
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

    if (progressScrollHandler) {

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


                    /*
                       On mobile, bring the
                       lesson into view.
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

                                    lessonView.scrollIntoView({
                                        behavior: "smooth",
                                        block: "start"
                                    });

                                },
                                50
                            );

                        }

                    }

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
       Do not run on unrelated pages.
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
            cleanText(
                className
            );


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
