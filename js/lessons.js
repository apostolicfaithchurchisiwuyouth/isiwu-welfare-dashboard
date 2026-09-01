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
   - "Summary" contains the full lesson content.
   - "Discussion" contains the discussion questions.
   - "Topic" is displayed in the top lesson card.
   - "Lesson" is displayed as the lesson number/type.
   - No duplicate lesson content is created.
   - No permanent "Loading this week's lesson" spinner.
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

    if (value === null || value === undefined) {
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
   FORMAT LESSON CONTENT
=========================================================

   The Summary column may contain:

   - plain text
   - line breaks
   - headings
   - numbered sections
   - paragraphs

   We preserve the author's line breaks and make the
   content readable inside the Study Lesson card.
========================================================= */

function formatLessonContent(text) {

    const value = cleanText(text);

    if (!value) {

        return `
            <div class="lesson-empty-state">
                <i class="fa-regular fa-file-lines"></i>
                <p>Lesson content is not available yet.</p>
            </div>
        `;

    }


    const escaped =
        escapeHTML(value);


    const paragraphs =
        escaped
            .split(/\r?\n\s*\r?\n/)
            .map(part => part.trim())
            .filter(Boolean);


    if (paragraphs.length > 1) {

        return paragraphs
            .map(paragraph => {

                return `
                    <p>${paragraph.replace(/\r?\n/g, "<br>")}</p>
                `;

            })
            .join("");

    }


    return `
        <p>
            ${escaped.replace(/\r?\n/g, "<br>")}
        </p>
    `;

}


/* =========================================================
   FORMAT DISCUSSION
========================================================= */

function formatDiscussion(text) {

    const value = cleanText(text);

    if (!value) {

        return `
            <div class="discussion-empty">
                <i class="fa-regular fa-comments"></i>
                <p>No discussion questions have been added yet.</p>
            </div>
        `;

    }


    const escaped =
        escapeHTML(value);


    /*
       First try blank-line separation.
    */

    let items =
        escaped
            .split(/\r?\n\s*\r?\n/)
            .map(item => item.trim())
            .filter(Boolean);


    /*
       If the sheet uses normal line breaks instead,
       separate numbered/bulleted questions.
    */

    if (items.length <= 1) {

        items =
            escaped
                .split(/\r?\n/)
                .map(item => item.trim())
                .filter(Boolean);

    }


    /*
       If the entire discussion is one paragraph,
       display it normally.
    */

    if (items.length === 1) {

        return `
            <div class="discussion-question">
                <span class="discussion-number">1</span>
                <p>${items[0]}</p>
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
                        ${item.replace(/\r?\n/g, "<br>")}
                    </p>

                </div>
            `;

        })
        .join("");

}


/* =========================================================
   FORMAT AUDIO
========================================================= */

function formatAudio(audioValue) {

    const audio =
        cleanText(audioValue);

    if (!audio) {
        return "";
    }

    /*
       If Google Sheet contains a direct audio URL,
       create an audio player.
    */

    if (
        /^https?:\/\/.+/i.test(audio) &&
        /\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i.test(audio)
    ) {

        return `
            <audio
                controls
                preload="none"
                class="lesson-audio-player">

                <source
                    src="${escapeHTML(audio)}"
                >

                Your browser does not support audio.

            </audio>
        `;

    }


    /*
       If it is a normal web link, create a link.
    */

    if (/^https?:\/\//i.test(audio)) {

        return `
            <a
                href="${escapeHTML(audio)}"
                target="_blank"
                rel="noopener noreferrer"
                class="lesson-audio-link">

                <i class="fa-solid fa-volume-high"></i>

                Listen to Yoruba Memory Verse

            </a>
        `;

    }


    return "";
}


/* =========================================================
   SHOW / HIDE HELPERS
========================================================= */

function showElement(element) {

    if (!element) {
        return;
    }

    element.hidden = false;
    element.style.display = "";

}


function hideElement(element) {

    if (!element) {
        return;
    }

    element.hidden = true;

}


/* =========================================================
   LOADING STATE
=========================================================

   IMPORTANT:
   We deliberately do NOT show the old large spinner.

   The lesson page should not remain occupied by
   "Loading this week's lesson".
========================================================= */

function hideLoadingState() {

    const loading =
        getElement("lessonsLoading");

    if (loading) {

        loading.hidden = true;
        loading.style.display = "none";

    }

}


/* =========================================================
   ERROR STATE
========================================================= */

function showLessonsError(message) {

    hideLoadingState();

    const errorBox =
        getElement("lessonsError");

    const errorMessage =
        getElement("lessonsErrorMessage");

    const lessonView =
        getElement("lessonView");


    if (lessonView) {
        lessonView.hidden = true;
    }


    if (errorMessage) {

        errorMessage.textContent =
            message ||
            "Unable to load the lessons. Please try again.";

    }


    if (errorBox) {

        errorBox.hidden = false;
        errorBox.style.display = "";

    }

}


/* =========================================================
   HIDE ERROR
========================================================= */

function hideLessonsError() {

    const errorBox =
        getElement("lessonsError");

    if (errorBox) {

        errorBox.hidden = true;
        errorBox.style.display = "none";

    }

}


/* =========================================================
   NORMALIZE SHEET HEADERS
========================================================= */

function normalizeHeader(value) {

    return cleanText(value)
        .toLowerCase()
        .replace(/[\s_-]+/g, "");

}


/* =========================================================
   GET SHEET VALUE
========================================================= */

function getSheetValue(row, possibleNames) {

    if (!row) {
        return "";
    }


    const keys =
        Object.keys(row);


    for (const name of possibleNames) {

        const target =
            normalizeHeader(name);


        const matchingKey =
            keys.find(key =>
                normalizeHeader(key) === target
            );


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
   PARSE LESSON ROW
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
         * VERY IMPORTANT:
         *
         * The Google Sheet header is "Summary".
         *
         * This is the field used for the actual
         * Study Lesson content.
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
   FETCH LESSONS
========================================================= */

async function fetchWeeklyLessons() {

    hideLoadingState();
    hideLessonsError();


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
                .filter(row => {

                    return (
                        row.className ||
                        row.topic ||
                        row.summary
                    );

                });


        console.log(
            "AFC Isiu — Parsed Lessons:",
            lessonsData
        );


        if (!lessonsData.length) {

            throw new Error(
                "No lesson records were found in the WeeklyLesson sheet."
            );

        }


        hideLoadingState();

        renderSelectedClass();


    }

    catch (error) {

        console.error(
            "AFC Isiu — Weekly Lessons Error:",
            error
        );


        showLessonsError(
            error.message ||
            "Unable to load this week's lessons."
        );

    }

}


/* =========================================================
   FIND LESSON FOR CLASS
========================================================= */

function findLessonForClass(className) {

    const wanted =
        cleanText(className).toLowerCase();


    return lessonsData.find(
        lesson => {

            return (
                cleanText(
                    lesson.className
                ).toLowerCase() === wanted
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
            ".class-tab, .lesson-tab"
        )
        .forEach(tab => {

            const tabClass =
                cleanText(
                    tab.dataset.class ||
                    tab.getAttribute("data-class") ||
                    tab.textContent
                );


            const isActive =
                tabClass.toLowerCase() ===
                cleanText(className).toLowerCase();


            tab.classList.toggle(
                "active",
                isActive
            );


            tab.setAttribute(
                "aria-selected",
                isActive ? "true" : "false"
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
       If saved class does not exist,
       fall back to the first available lesson.
    */

    if (!lesson) {

        lesson =
            findLessonForClass("Senior");

    }


    if (!lesson && lessonsData.length) {

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

    hideLoadingState();
    hideLessonsError();


    const lessonView =
        getElement("lessonView");


    if (lessonView) {

        lessonView.hidden = false;
        lessonView.style.display = "";

    }


    /* =====================================================
       TOP LESSON CARD
       
       ONLY:
       - Lesson type / number
       - Topic
       
       No Summary here.
       No duplicate content here.
    ===================================================== */

    const classBadge =
        getElement("lessonClassBadge");

    const lessonTitle =
        getElement("lessonTitle");

    const lessonTheme =
        getElement("lessonTheme");

    const bibleText =
        getElement("lessonBibleText");

    const lessonNumber =
        getElement("lessonNumber");

    const lessonDate =
        getElement("lessonDate");

    const memoryVerse =
        getElement("lessonMemoryVerse");


    if (classBadge) {

        classBadge.textContent =
            cleanText(
                lesson.className
            ).toUpperCase();

    }


    /*
       lessonTitle = Topic only.
       
       This prevents the actual lesson content
       from appearing in the top card.
    */

    if (lessonTitle) {

        lessonTitle.textContent =
            lesson.topic ||
            "Weekly Lesson";

    }


    /*
       Do NOT put Summary inside lessonTheme.
       The Summary belongs only inside Study Lesson.
    */

    if (lessonTheme) {

        lessonTheme.textContent =
            "";

        lessonTheme.hidden = true;

    }


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


    /*
       Week/date remains available if the HTML contains
       this field. We do not force duplicate "THIS WEEK"
       content into the lesson topic card.
    */

    if (lessonDate) {

        const currentDate =
            new Date();


        lessonDate.textContent =
            currentDate.toLocaleDateString(
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
       STUDY LESSON CONTENT
       
       Summary is the actual lesson content.
       
       It is rendered ONLY here.
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
       
       Discussion is rendered into the discussion area.
       
       Supports several possible IDs so the controller
       remains compatible with the rebuilt lessons.html.
    ===================================================== */

    renderDiscussion(
        lesson.discussion
    );


    /* =====================================================
       AUDIO
    ===================================================== */

    renderAudio(
        lesson.yorubaAudio
    );


    /* =====================================================
       LESSON METADATA
    ===================================================== */

    updateLessonMeta(
        lesson
    );


    /* =====================================================
       READING PROGRESS
    ===================================================== */

    resetLessonProgress();


    /*
       Give the browser a moment to calculate the new
       lesson height before attaching scroll tracking.
    */

    requestAnimationFrame(() => {

        setupReadingProgress();

    });

}


/* =========================================================
   DISCUSSION RENDERER
========================================================= */

function renderDiscussion(discussion) {

    const possibleIds = [

        "lessonDiscussion",
        "discussionContent",
        "discussionQuestions",
        "lessonDiscussionContent",
        "discussionCardContent"

    ];


    let container = null;


    for (const id of possibleIds) {

        const element =
            getElement(id);


        if (element) {

            container =
                element;

            break;

        }

    }


    /*
       Also support a dedicated element selected by class.
    */

    if (!container) {

        container =
            document.querySelector(
                ".discussion-content"
            );

    }


    if (!container) {

        console.warn(
            "Discussion container not found in lessons.html."
        );

        return;

    }


    container.innerHTML =
        formatDiscussion(
            discussion
        );

}


/* =========================================================
   AUDIO RENDERER
========================================================= */

function renderAudio(audioValue) {

    const audio =
        cleanText(audioValue);


    const possibleIds = [

        "lessonAudio",
        "yorubaAudio",
        "audioContent",
        "lessonAudioContent"

    ];


    let container = null;


    for (const id of possibleIds) {

        const element =
            getElement(id);


        if (element) {

            container =
                element;

            break;

        }

    }


    if (!container) {

        container =
            document.querySelector(
                ".lesson-audio"
            );

    }


    /*
       If the HTML does not currently contain an
       audio container, simply do nothing.
    */

    if (!container) {

        return;

    }


    if (!audio) {

        container.innerHTML = "";

        container.hidden = true;

        return;

    }


    container.hidden = false;


    container.innerHTML = `

        <div class="lesson-audio-inner">

            <div class="lesson-audio-heading">

                <i class="fa-solid fa-volume-high"></i>

                <span>
                    Yoruba Memory Verse
                </span>

            </div>

            ${formatAudio(audio)}

        </div>

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


    const sectionCount =
        getElement("sectionCount");

    const mobileSectionCount =
        getElement("mobileSectionCount");


    /*
       Estimate sections from headings / paragraphs.
    */

    let sections = 0;


    if (summary) {

        const headingMatches =
            summary.match(
                /(^|\n)\s*(introduction|lesson|objective|aim|point|i\.|ii\.|iii\.|iv\.|v\.|conclusion|discussion)/gi
            );


        if (headingMatches) {

            sections =
                headingMatches.length;

        }


        if (sections === 0) {

            sections =
                summary
                    .split(/\r?\n\s*\r?\n/)
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
       Approximate reading time from word count.
       Average reading speed: 180 words/minute.
    */

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


    const readingTime =
        getElement("readingTime");

    const mobileReadingTime =
        getElement("mobileReadingTime");


    const readingLabel =
        `${minutes} min`;


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
   PROGRESS STATE
========================================================= */

let progressScrollHandler = null;


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


            const viewportHeight =
                window.innerHeight;


            const contentHeight =
                content.scrollHeight;


            if (contentHeight <= 0) {

                updateProgressUI(0);

                return;

            }


            const pageTop =
                window.scrollY +
                rect.top;


            const pageBottom =
                pageTop +
                contentHeight;


            const currentPosition =
                window.scrollY +
                viewportHeight * 0.65;


            let percent =
                (
                    (currentPosition - pageTop) /
                    contentHeight
                ) * 100;


            /*
               Keep the progress sensible before the
               user actually reaches the content.
            */

            if (
                currentPosition < pageTop
            ) {

                percent = 0;

            }


            if (
                currentPosition >= pageBottom
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
   FINISH READING
========================================================= */

function markLessonCompleted() {

    if (!currentLesson) {
        return;
    }


    updateProgressUI(100);


    const key =
        `lessonCompleted_${currentLesson.className}_${currentLesson.lesson}`;


    localStorage.setItem(
        key,
        "true"
    );


    const buttons =
        document.querySelectorAll(
            "#finishReadingBtn, #mobileFinishReadingBtn"
        );


    buttons.forEach(button => {

        button.classList.add(
            "completed"
        );


        const strong =
            button.querySelector(
               ("strong")
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

    const tabs =
        document.querySelectorAll(
            ".class-tab, .lesson-tab"
        );


    tabs.forEach(tab => {

        /*
           Prevent duplicate listeners if this function
           is accidentally called again.
        */

        if (
            tab.dataset.lessonTabInitialized ===
            "true"
        ) {

            return;

        }


        tab.dataset.lessonTabInitialized =
            "true";


        tab.addEventListener(
            "click",
            event => {

                event.preventDefault();


                const className =
                    cleanText(
                        tab.dataset.class ||
                        tab.getAttribute("data-class") ||
                        tab.textContent
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
                   Bring the lesson content into view
                   without jumping all the way to the
                   top of the page.
                */

                const lessonView =
                    getElement("lessonView");


                if (
                    lessonView &&
                    window.innerWidth <= 768
                ) {

                    setTimeout(() => {

                        lessonView.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });

                    }, 50);

                }

            }
        );

    });

}


/* =========================================================
   RETRY BUTTON
========================================================= */

function initializeRetryButton() {

    const retry =
        getElement("retryLessons");


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
   FINISH BUTTONS
========================================================= */

function initializeFinishButtons() {

    const buttons =
        document.querySelectorAll(
            "#finishReadingBtn, #mobileFinishReadingBtn"
        );


    buttons.forEach(button => {

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
   REMOVE OLD / DUPLICATE LOADING ELEMENTS
=========================================================

   This is intentionally defensive.

   If an older lessons.html contains another loader,
   it will not continue sitting over the lesson.
========================================================= */

function removeObsoleteLoadingElements() {

    const selectors = [

        ".lesson-loading",
        ".lesson-loader",
        ".weekly-lesson-loader",
        ".lesson-loading-state",
        "#lessonLoading"

    ];


    selectors.forEach(selector => {

        document
            .querySelectorAll(selector)
            .forEach(element => {

                /*
                   Do not remove the actual lessonsLoading
                   container here because hideLoadingState()
                   already handles it safely.
                */

                if (
                    element.id ===
                    "lessonsLoading"
                ) {

                    return;

                }


                element.remove();

            });

    });

}


/* =========================================================
   INITIALIZATION
========================================================= */

function initializeLessonsPage() {

    /*
       Only run lesson-page logic when the page actually
       contains the lesson interface.
    */

    const lessonView =
        getElement("lessonView");

    const lessonContent =
        getElement("lessonContent");

    const tabs =
        document.querySelectorAll(
            ".class-tab, .lesson-tab"
        );


    if (
        !lessonView &&
        !lessonContent &&
        !tabs.length
    ) {

        return;

    }


    removeObsoleteLoadingElements();

    hideLoadingState();

    initializeLessonTabs();

    initializeRetryButton();

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
   PUBLIC HELPERS
========================================================= */

window.AFCLessons = {

    getLessons: () =>
        lessonsData,

    getCurrentLesson: () =>
        currentLesson,

    switchClass: className => {

        selectedLessonClass =
            cleanText(className);

        localStorage.setItem(
            "selectedLessonClass",
            selectedLessonClass
        );

        renderSelectedClass();

    },

    reload: () =>
        fetchWeeklyLessons()

};
