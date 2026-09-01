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

   STRUCTURE:

   Topic Card
        ↓
   Lesson Information
        ↓
   Memory Verse
        ↓
   Yoruba Audio
        ↓
   Study Lesson (Summary)
        ↓
   Discussion
        ↓
   Reading Progress

   IMPORTANT:

   - Summary appears ONLY inside Study Lesson.
   - Topic appears ONLY at the top.
   - YorubaAudio controls the audio card.
   - No permanent loading spinner.
   - Supports Senior, Junior and Elementary.
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
    localStorage.getItem(
        "selectedLessonClass"
    ) || "Senior";


let currentLesson = null;

let progressScrollHandler = null;


/* =========================================================
   DOM HELPER
========================================================= */

function getElement(id) {

    return document.getElementById(id);

}


/* =========================================================
   TEXT CLEANER
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
        const name
        of possibleNames
    ) {

        const target =
            normalizeHeader(name);


        const matchingKey =
            keys.find(
                key =>
                    normalizeHeader(key) ===
                    target
            );


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


        /*
           SUMMARY IS THE ACTUAL
           LESSON CONTENT.
        */

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
========================================================= */

function formatLessonContent(text) {

    const value =
        cleanText(text);


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


    const escaped =
        escapeHTML(value);


    const paragraphs =
        escaped
            .split(/\r?\n\s*\r?\n/)
            .map(
                part =>
                    part.trim()
            )
            .filter(Boolean);


    if (
        paragraphs.length > 1
    ) {

        return paragraphs
            .map(
                paragraph => {

                    return `

                        <p>

                            ${paragraph.replace(
                                /\r?\n/g,
                                "<br>"
                            )}

                        </p>

                    `;

                }
            )
            .join("");

    }


    /*
       If there are single line breaks,
       preserve them.
    */

    return `

        <p>

            ${escaped.replace(
                /\r?\n/g,
                "<br>"
            )}

        </p>

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


    /*
       First try paragraphs.
    */

    let items =
        escaped
            .split(
                /\r?\n\s*\r?\n/
            )
            .map(
                item =>
                    item.trim()
            )
            .filter(Boolean);


    /*
       If only one paragraph,
       try individual lines.
    */

    if (
        items.length <= 1
    ) {

        items =
            escaped
                .split(/\r?\n/)
                .map(
                    item =>
                        item.trim()
                )
                .filter(Boolean);

    }


    /*
       Single question.
    */

    if (
        items.length === 1
    ) {

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
       Multiple questions.
    */

    return items
        .map(
            (
                item,
                index
            ) => {

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
   GOOGLE DRIVE AUDIO URL CONVERTER

   Supports links like:

   https://drive.google.com/file/d/FILE_ID/view

   It converts them into a direct playback URL.

   NOTE:
   The Drive file must be accessible to the user.
========================================================= */

function getPlayableAudioURL(url) {

    const value =
        cleanText(url);


    if (!value) {

        return "";

    }


    /*
       Google Drive:
       /file/d/FILE_ID/
    */

    const driveFileMatch =
        value.match(
            /drive\.google\.com\/file\/d\/([^/?]+)/i
        );


    if (driveFileMatch) {

        const fileId =
            driveFileMatch[1];


        return `https://drive.google.com/uc?export=download&id=${fileId}`;

    }


    /*
       Google Drive:
       ?id=FILE_ID
    */

    const driveIdMatch =
        value.match(
            /[?&]id=([^&]+)/i
        );


    if (
        /drive\.google\.com/i.test(value) &&
        driveIdMatch
    ) {

        return `https://drive.google.com/uc?export=download&id=${driveIdMatch[1]}`;

    }


    /*
       Normal audio URL.
    */

    return value;

}


/* =========================================================
   RENDER YORUBA AUDIO
========================================================= */

function renderAudio(audioValue) {

    const audioCard =
        getElement(
            "yorubaAudioCard"
        );


    const audioPlayer =
        getElement(
            "yorubaAudio"
        );


    if (
        !audioCard ||
        !audioPlayer
    ) {

        console.warn(
            "Yoruba audio card or player was not found."
        );

        return;

    }


    /*
       Stop previous audio.
    */

    try {

        audioPlayer.pause();

    }

    catch (error) {

        /* Ignore safely */

    }


    audioPlayer.removeAttribute(
        "src"
    );


    const rawAudio =
        cleanText(
            audioValue
        );


    /*
       No audio:
       Hide entire card.
    */

    if (!rawAudio) {

        audioCard.hidden = true;

        audioCard.style.display =
            "none";


        audioPlayer.load();

        return;

    }


    /*
       Convert Drive URL if needed.
    */

    const playableURL =
        getPlayableAudioURL(
            rawAudio
        );


    /*
       Show card.
    */

    audioCard.hidden = false;

    audioCard.style.display = "";


    /*
       Set source.
    */

    audioPlayer.src =
        playableURL;


    audioPlayer.preload =
        "none";


    audioPlayer.load();


    console.log(
        "AFC Isiu — Yoruba audio loaded:",
        playableURL
    );

}


/* =========================================================
   RENDER DISCUSSION
========================================================= */

function renderDiscussion(text) {

    const container =
        getElement(
            "lessonDiscussion"
        );


    if (!container) {

        console.warn(
            "Discussion container was not found."
        );

        return;

    }


    container.innerHTML =
        formatDiscussion(text);

}


/* =========================================================
   FETCH LESSONS
========================================================= */

async function fetchWeeklyLessons() {

    hideLessonsError();


    try {

        const response =
            await fetch(
                LESSONS_CSV_URL,
                {
                    method: "GET",

                    cache:
                        "no-store"
                }
            );


        if (
            !response.ok
        ) {

            throw new Error(
                `Unable to access WeeklyLesson sheet. HTTP ${response.status}`
            );

        }


        const csvText =
            await response.text();


        if (
            !csvText.trim()
        ) {

            throw new Error(
                "The WeeklyLesson sheet returned no data."
            );

        }


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

                    skipEmptyLines: true
                }
            );


        if (
            result.errors &&
            result.errors.length
        ) {

            console.warn(
                "CSV parsing warnings:",
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
                "No lesson records were found."
            );

        }


        renderSelectedClass();

    }

    catch (error) {

        console.error(
            "AFC Isiu — Lessons Error:",
            error
        );


        showLessonsError(
            error.message ||
            "Unable to load the lessons."
        );

    }

}


/* =========================================================
   FIND LESSON BY CLASS
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
                ).toLowerCase()
                ===
                wanted
            );

        }
    );

}


/* =========================================================
   UPDATE TABS
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
                    tabClass.toLowerCase()
                    ===
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
       Fallback:
       Senior.
    */

    if (!lesson) {

        lesson =
            findLessonForClass(
                "Senior"
            );

    }


    /*
       Final fallback:
       First available lesson.
    */

    if (
        !lesson &&
        lessonsData.length
    ) {

        lesson =
            lessonsData[0];

    }


    if (!lesson) {

        showLessonsError(
            "No lesson is available for this class yet."
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

function renderLesson(lesson) {

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


    hideLessonsError();


    /* -----------------------------------------------------
       TOPIC CARD
    ----------------------------------------------------- */

    const classBadge =
        getElement(
            "lessonClassBadge"
        );


    const lessonTitle =
        getElement(
            "lessonTitle"
        );


    const lessonNumberTop =
        getElement(
            "lessonNumberTop"
        );


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


    if (lessonNumberTop) {

        lessonNumberTop.textContent =
            lesson.lesson ||
            "—";

    }


    /* -----------------------------------------------------
       INFORMATION
    ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       MEMORY VERSE
    ----------------------------------------------------- */

    const memoryVerse =
        getElement(
            "lessonMemoryVerse"
        );


    if (memoryVerse) {

        memoryVerse.textContent =
            lesson.memoryVerse ||
            "—";

    }


    /* -----------------------------------------------------
       STUDY LESSON

       SUMMARY ONLY APPEARS HERE.
    ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       DISCUSSION
    ----------------------------------------------------- */

    renderDiscussion(
        lesson.discussion
    );


    /* -----------------------------------------------------
       YORUBA AUDIO
    ----------------------------------------------------- */

    renderAudio(
        lesson.yorubaAudio
    );


    /* -----------------------------------------------------
       META
    ----------------------------------------------------- */

    updateLessonMeta(
        lesson
    );


    /* -----------------------------------------------------
       PROGRESS
    ----------------------------------------------------- */

    resetLessonProgress();

    restoreCompletionState();


    requestAnimationFrame(
        () => {

            setupReadingProgress();

        }
    );

}


/* =========================================================
   UPDATE LESSON META
========================================================= */

function updateLessonMeta(
    lesson
) {

    const summary =
        cleanText(
            lesson.summary
        );


    /*
       WORD COUNT
    */

    const words =
        summary
            ? summary
                .split(/\s+/)
                .filter(Boolean)
                .length
            : 0;


    /*
       READING TIME

       Average:
       180 words per minute.
    */

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


    /*
       SECTION COUNT
    */

    let sections = 0;


    if (summary) {

        const paragraphSections =
            summary
                .split(
                    /\r?\n\s*\r?\n/
                )
                .filter(Boolean);


        sections =
            paragraphSections.length;


        /*
           If the content has no blank paragraphs,
           estimate sections from headings.
        */

        if (
            sections <= 1
        ) {

            const headings =
                summary.match(
                    /(^|\n)\s*(introduction|objective|aim|lesson|point|conclusion|application|discussion|i\.|ii\.|iii\.|iv\.|v\.)/gim
                );


            if (headings) {

                sections =
                    headings.length;

            }

        }

    }


    sections =
        Math.max(
            1,
            sections
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

}


/* =========================================================
   RESET PROGRESS
========================================================= */

function resetLessonProgress() {

    updateProgressUI(0);

}


/* =========================================================
   UPDATE PROGRESS UI
========================================================= */

function updateProgressUI(percent) {

    const safePercent =
        Math.max(
            0,
            Math.min(
                100,
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


            const rect =
                content.getBoundingClientRect();


            const pageTop =
                window.scrollY +
                rect.top;


            const contentHeight =
                content.scrollHeight;


            const pageBottom =
                pageTop +
                contentHeight;


            const viewportPosition =
                window.scrollY +
                (
                    window.innerHeight *
                    0.65
                );


            let percent = 0;


            if (
                viewportPosition >
                pageTop
            ) {

                percent =
                    (
                        (
                            viewportPosition -
                            pageTop
                        ) /
                        Math.max(
                            contentHeight,
                            1
                        )
                    ) *
                    100;

            }


            if (
                viewportPosition >=
                pageBottom
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
   COMPLETION KEY
========================================================= */

function getCompletionKey() {

    if (!currentLesson) {

        return null;

    }


    return `lessonCompleted_${cleanText(
        currentLesson.className
    )}_${cleanText(
        currentLesson.lesson
    )}`;

}


/* =========================================================
   MARK LESSON COMPLETED
========================================================= */

function markLessonCompleted() {

    if (!currentLesson) {

        return;

    }


    const key =
        getCompletionKey();


    if (key) {

        localStorage.setItem(
            key,
            "true"
        );

    }


    updateProgressUI(100);

    updateCompletionButtons(
        true
    );

}


/* =========================================================
   RESTORE COMPLETION
========================================================= */

function restoreCompletionState() {

    const key =
        getCompletionKey();


    const completed =
        key &&
        localStorage.getItem(key) ===
        "true";


    updateCompletionButtons(
        completed
    );


    if (completed) {

        updateProgressUI(100);

    }

}


/* =========================================================
   UPDATE COMPLETION BUTTONS
========================================================= */

function updateCompletionButtons(
    completed
) {

    const buttons =
        document.querySelectorAll(
            "#finishReadingBtn, #mobileFinishReadingBtn"
        );


    buttons.forEach(
        button => {

            button.classList.toggle(
                "completed",
                completed
            );


            const strong =
                button.querySelector(
                    "strong"
                );


            const small =
                button.querySelector(
                    "small"
                );


            if (completed) {

                if (strong) {

                    strong.textContent =
                        "Lesson completed";

                }


                if (small) {

                    small.textContent =
                        "Great job!";

                }

            }

            else {

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
   TAB EVENTS
========================================================= */

function initializeLessonTabs() {

    const tabs =
        document.querySelectorAll(
            ".class-tab"
        );


    tabs.forEach(
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


                    renderSelectedClass();


                    /*
                       On mobile,
                       bring the topic card into view.
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
                                            behavior: "smooth",

                                            block: "start"
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
   FINISH BUTTON EVENTS
========================================================= */

function initializeFinishButtons() {

    const buttons =
        document.querySelectorAll(
            "#finishReadingBtn, #mobileFinishReadingBtn"
        );


    buttons.forEach(
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
   SHOW ERROR
========================================================= */

function showLessonsError(
    message
) {

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

    }

}


/* =========================================================
   HIDE ERROR
========================================================= */

function hideLessonsError() {

    const errorBox =
        getElement(
            "lessonsError"
        );


    if (errorBox) {

        errorBox.hidden =
            true;

        errorBox.style.display =
            "none";

    }

}


/* =========================================================
   RETRY BUTTON
========================================================= */

function initializeRetryButton() {

    const retryButton =
        getElement(
            "retryLessons"
        );


    if (!retryButton) {

        return;

    }


    if (
        retryButton.dataset.initialized ===
        "true"
    ) {

        return;

    }


    retryButton.dataset.initialized =
        "true";


    retryButton.addEventListener(
        "click",
        fetchWeeklyLessons
    );

}


/* =========================================================
   REMOVE OLD LOADERS

   This prevents old HTML/CSS loaders from continuing
   to cover the lesson page.
========================================================= */

function removeOldLoadingElements() {

    const selectors = [

        "#lessonsLoading",

        "#lessonLoading",

        ".lesson-loading",

        ".lesson-loader",

        ".weekly-lesson-loader",

        ".lesson-loading-state"

    ];


    selectors.forEach(
        selector => {

            document
                .querySelectorAll(
                    selector
                )
                .forEach(
                    element => {

                        element.remove();

                    }
                );

        }
    );

}


/* =========================================================
   INITIALIZE LESSON PAGE
========================================================= */

function initializeLessonsPage() {

    const lessonView =
        getElement(
            "lessonView"
        );


    if (!lessonView) {

        return;

    }


    removeOldLoadingElements();

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
