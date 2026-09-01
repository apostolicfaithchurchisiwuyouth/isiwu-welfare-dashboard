/* =========================================================
AFC ISIU YOUTH PORTAL
LESSONS PAGE CONTROLLER
lessons.js

RESPONSIBILITY:

* Load weekly lessons
* Switch Senior / Junior / Elementary
* Render lesson
* Handle reading progress
* Handle audio
* Handle mobile/desktop finish button
* Keep lesson page independent from main.js
  ========================================================= */

(() => {

 
"use strict";


/* =====================================================
   CONFIGURATION
===================================================== */

const WEEKLY_LESSON_CSV =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=201183837&single=true&output=csv";


const STORAGE_CLASS =
    "selectedLessonClass";


/* =====================================================
   STATE
===================================================== */

let lessonsData = [];

let selectedClass =
    localStorage.getItem(STORAGE_CLASS) ||
    "Senior";

let currentLesson = null;

let progressHandlerAttached = false;


/* =====================================================
   DOM HELPER
===================================================== */

function $(id) {

    return document.getElementById(id);

}


/* =====================================================
   TEXT NORMALIZER
===================================================== */

function clean(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }

    return String(value)
        .replace(/\r/g, "")
        .trim();

}


/* =====================================================
   HEADER FINDER
   Allows flexible spreadsheet column names.
===================================================== */

function getValue(row, names) {

    const keys =
        Object.keys(row || {});


    for (
        const name of names
    ) {

        const exact =
            keys.find(
                key =>
                    clean(key)
                        .toLowerCase() ===
                    name.toLowerCase()
            );


        if (exact) {

            const value =
                clean(row[exact]);


            if (value !== "") {

                return value;

            }

        }

    }


    /* -------------------------------------------------
       Also try normalized comparison.
    ------------------------------------------------- */

    const normalizeKey =
        value =>
            clean(value)
                .toLowerCase()
                .replace(
                    /[\s_-]+/g,
                    ""
                );


    for (
        const name of names
    ) {

        const wanted =
            normalizeKey(name);


        const matchingKey =
            keys.find(
                key =>
                    normalizeKey(key) ===
                    wanted
            );


        if (matchingKey) {

            const value =
                clean(row[matchingKey]);


            if (value !== "") {

                return value;

            }

        }

    }


    return "";

}


/* =====================================================
   SHOW / HIDE HELPERS
===================================================== */

function showLoading() {

    const loading =
        $("lessonsLoading");

    const error =
        $("lessonsError");

    const lessonView =
        $("lessonView");


    if (loading) {

        loading.hidden = false;

        loading.style.display = "";

    }


    if (error) {

        error.hidden = true;

    }


    if (lessonView) {

        lessonView.hidden = true;

        lessonView.style.display = "none";

    }

}


function hideLoading() {

    const loading =
        $("lessonsLoading");


    if (loading) {

        loading.hidden = true;

        loading.style.display = "none";

    }

}


function showLessonView() {

    const lessonView =
        $("lessonView");


    const loading =
        $("lessonsLoading");


    const error =
        $("lessonsError");


    if (loading) {

        loading.hidden = true;

        loading.style.display = "none";

    }


    if (error) {

        error.hidden = true;

    }


    if (lessonView) {

        lessonView.hidden = false;

        lessonView.style.display = "block";

    }

}


function showError(message) {

    const loading =
        $("lessonsLoading");

    const error =
        $("lessonsError");

    const errorMessage =
        $("lessonsErrorMessage");

    const lessonView =
        $("lessonView");


    if (loading) {

        loading.hidden = true;

        loading.style.display = "none";

    }


    if (lessonView) {

        lessonView.hidden = true;

        lessonView.style.display = "none";

    }


    if (errorMessage) {

        errorMessage.textContent =
            message;

    }


    if (error) {

        error.hidden = false;

        error.style.display = "";

    }

}


/* =====================================================
   PARSE LESSON ROW
===================================================== */

function normalizeLesson(row) {

    return {

        lesson:
            getValue(
                row,
                [
                    "Lesson",
                    "Lesson Number",
                    "LessonNo",
                    "Lesson No",
                    "Number"
                ]
            ),

        className:
            getValue(
                row,
                [
                    "Class",
                    "Class Name",
                    "Level"
                ]
            ),

        topic:
            getValue(
                row,
                [
                    "Topic",
                    "Lesson Topic",
                    "Title",
                    "Lesson Title"
                ]
            ),

        bibleText:
            getValue(
                row,
                [
                    "BibleText",
                    "Bible Text",
                    "Bible",
                    "Bible Passage",
                    "Scripture"
                ]
            ),

        memoryVerse:
            getValue(
                row,
                [
                    "MemoryVerse",
                    "Memory Verse",
                    "Memory"
                ]
            ),

        summary:
            getValue(
                row,
                [
                    "Summary",
                    "Lesson Summary",
                    "Introduction"
                ]
            ),

        discussion:
            getValue(
                row,
                [
                    "Discussion",
                    "Discussion Questions",
                    "Questions"
                ]
            ),

        content:
            getValue(
                row,
                [
                    "Content",
                    "Lesson Content",
                    "Body",
                    "Lesson Body"
                ]
            ),

        week:
            getValue(
                row,
                [
                    "Week",
                    "Week Number",
                    "Week No"
                ]
            ),

        date:
            getValue(
                row,
                [
                    "Date",
                    "Lesson Date",
                    "Week Date"
                ]
            ),

        readingTime:
            getValue(
                row,
                [
                    "ReadingTime",
                    "Reading Time",
                    "Time"
                ]
            ),

        sections:
            getValue(
                row,
                [
                    "Sections",
                    "Section Count"
                ]
            ),

        yorubaAudio:
            getValue(
                row,
                [
                    "YorubaAudio",
                    "Yoruba Audio",
                    "Audio",
                    "Audio URL",
                    "AudioURL"
                ]
            )

    };

}


/* =====================================================
   FETCH LESSON DATA
===================================================== */

async function fetchLessons() {

    showLoading();


    try {

        if (
            typeof Papa ===
            "undefined"
        ) {

            throw new Error(
                "PapaParse is not available. Please check the PapaParse script."
            );

        }


        const response =
            await fetch(
                WEEKLY_LESSON_CSV,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `Lesson server returned ${response.status}.`
            );

        }


        const csvText =
            await response.text();


        if (
            !csvText ||
            csvText.trim() === ""
        ) {

            throw new Error(
                "The lesson spreadsheet returned no data."
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
                "Lesson CSV warnings:",
                result.errors
            );

        }


        if (
            !Array.isArray(
                result.data
            ) ||
            result.data.length === 0
        ) {

            throw new Error(
                "No lesson records were found in the spreadsheet."
            );

        }


        lessonsData =
            result.data
                .map(normalizeLesson)
                .filter(
                    lesson =>
                        lesson.className ||
                        lesson.topic ||
                        lesson.bibleText
                );


        console.log(
            "AFC Isiu Lessons:",
            lessonsData
        );


        if (
            lessonsData.length === 0
        ) {

            throw new Error(
                "The spreadsheet was reached, but no usable lesson rows were found."
            );

        }


        setupClassTabs();


        const availableClasses =
            getAvailableClasses();


        if (
            !availableClasses.includes(
                selectedClass
            )
        ) {

            selectedClass =
                availableClasses[0] ||
                "Senior";

        }


        renderSelectedLesson();


    }

    catch (error) {

        console.error(
            "AFC Isiu Lessons Error:",
            error
        );


        showError(
            error.message ||
            "Unable to load the lesson. Please try again."
        );

    }

}


/* =====================================================
   GET AVAILABLE CLASSES
===================================================== */

function getAvailableClasses() {

    return [
        ...new Set(
            lessonsData
                .map(
                    lesson =>
                        clean(
                            lesson.className
                        )
                )
                .filter(Boolean)
        )
    ];

}


/* =====================================================
   CLASS MATCHING
===================================================== */

function classMatches(
    lessonClass,
    selected
) {

    const a =
        clean(lessonClass)
            .toLowerCase();

    const b =
        clean(selected)
            .toLowerCase();


    if (a === b) {

        return true;

    }


    return (
        a.includes(b) ||
        b.includes(a)
    );

}


/* =====================================================
   FIND SELECTED LESSON
===================================================== */

function findLesson(
    className
) {

    const matching =
        lessonsData.filter(
            lesson =>
                classMatches(
                    lesson.className,
                    className
                )
        );


    if (!matching.length) {

        return null;

    }


    /*
     * If multiple records exist for the same class,
     * use the last record. This works well with a
     * weekly sheet where newer lessons are appended.
     */

    return matching[
        matching.length - 1
    ];

}


/* =====================================================
   SET ACTIVE TAB
===================================================== */

function updateActiveTab(
    className
) {

    document
        .querySelectorAll(
            ".class-tab"
        )
        .forEach(
            tab => {

                const tabClass =
                    clean(
                        tab.dataset.class
                    );


                tab.classList.toggle(
                    "active",
                    classMatches(
                        tabClass,
                        className
                    )
                );

            }
        );

}


/* =====================================================
   SET TEXT SAFELY
===================================================== */

function setText(
    id,
    value,
    fallback = "—"
) {

    const element =
        $(id);


    if (!element) {

        return;

    }


    element.textContent =
        clean(value) ||
        fallback;

}


/* =====================================================
   FORMAT LESSON NUMBER
===================================================== */

function formatLessonNumber(
    lesson
) {

    const value =
        clean(
            lesson.lesson
        );


    if (!value) {

        return "—";

    }


    if (
        /^lesson\s/i.test(
            value
        )
    ) {

        return value;

    }


    return `Lesson ${value}`;

}


/* =====================================================
   FORMAT WEEK
===================================================== */

function formatWeek(
    lesson
) {

    const week =
        clean(
            lesson.week
        );


    const date =
        clean(
            lesson.date
        );


    if (week) {

        if (
            /^week\s/i.test(
                week
            )
        ) {

            return week;

        }


        return `Week ${week}`;

    }


    if (date) {

        return date;

    }


    return "This Week";

}


/* =====================================================
   UPDATE PAGE WEEK BADGE
===================================================== */

function updatePageWeek(
    lesson
) {

    const element =
        $("lessonWeek");


    if (!element) {

        return;

    }


    const text =
        formatWeek(lesson);


    element.innerHTML = `

        <i class="fa-regular fa-calendar"></i>

        <span>
            ${escapeHTML(text)}
        </span>

    `;

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHTML(
    value
) {

    return String(value)
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
   CONTENT RENDERER
===================================================== */

function renderContent(
    lesson
) {

    const content =
        $("lessonContent");


    if (!content) {

        return;

    }


    let html = "";


    /*
     * Main Content
     */

    if (
        lesson.content
    ) {

        html +=
            lesson.content;

    }


    /*
     * If the spreadsheet doesn't have a Content
     * column, use Summary.
     */

    else if (
        lesson.summary
    ) {

        html += `

            <h2>Lesson Overview</h2>

            <p>
                ${escapeHTML(
                    lesson.summary
                )}
            </p>

        `;

    }


    /*
     * Discussion
     */

    if (
        lesson.discussion
    ) {

        html += `

            <h2>Discussion</h2>

            <div>
                ${lesson.discussion}
            </div>

        `;

    }


    if (!html.trim()) {

        html = `

            <p>
                The lesson content is being prepared.
                Please check back shortly.
            </p>

        `;

    }


    content.innerHTML =
        html;

}


/* =====================================================
   AUDIO
===================================================== */

function renderAudio(
    lesson
) {

    const card =
        $("lessonAudioCard");

    const audio =
        $("lessonAudio");


    if (
        !card ||
        !audio
    ) {

        return;

    }


    const audioURL =
        clean(
            lesson.yorubaAudio
        );


    if (!audioURL) {

        card.hidden = true;

        card.style.display = "none";

        audio.removeAttribute(
            "src"
        );

        audio.load();

        return;

    }


    /*
     * Only allow normal web URLs.
     */

    if (
        !/^https?:\/\//i.test(
            audioURL
        )
    ) {

        card.hidden = true;

        card.style.display = "none";

        return;

    }


    audio.src =
        audioURL;

    audio.load();


    card.hidden = false;

    card.style.display = "flex";

}


/* =====================================================
   LESSON META
===================================================== */

function renderMeta(
    lesson
) {

    setText(
        "readingTime",
        lesson.readingTime,
        "—"
    );


    setText(
        "mobileReadingTime",
        lesson.readingTime,
        "—"
    );


    setText(
        "sectionCount",
        lesson.sections,
        "—"
    );


    setText(
        "mobileSectionCount",
        lesson.sections,
        "—"
    );


    /*
     * If section count is not supplied,
     * calculate it from visible headings.
     */

    if (
        !lesson.sections
    ) {

        const content =
            $("lessonContent");


        if (content) {

            const count =
                content.querySelectorAll(
                    "h2, h3"
                ).length;


            if (count > 0) {

                setText(
                    "sectionCount",
                    count,
                    "—"
                );

                setText(
                    "mobileSectionCount",
                    count,
                    "—"
                );

            }

        }

    }

}


/* =====================================================
   RESET PROGRESS
===================================================== */

function resetProgress() {

    updateProgress(
        0
    );

}


/* =====================================================
   UPDATE PROGRESS UI
===================================================== */

function updateProgress(
    percent
) {

    const value =
        Math.max(
            0,
            Math.min(
                100,
                Math.round(
                    percent
                )
            )
        );


    setText(
        "progressPercent",
        `${value}%`,
        "0%"
    );


    setText(
        "mobileProgressPercent",
        `${value}%`,
        "0%"
    );


    const desktopBar =
        $("progressBar");

    const mobileBar =
        $("mobileProgressBar");


    if (desktopBar) {

        desktopBar.style.width =
            `${value}%`;

    }


    if (mobileBar) {

        mobileBar.style.width =
            `${value}%`;

    }


    const progressText =
        $("progressText");


    if (progressText) {

        if (value >= 100) {

            progressText.textContent =
                "Lesson completed.";

        }

        else if (value >= 70) {

            progressText.textContent =
                "Almost there. Keep reading.";

        }

        else if (value >= 30) {

            progressText.textContent =
                "Good progress. Keep going.";

        }

        else {

            progressText.textContent =
                "Start reading this lesson.";

        }

    }

}


/* =====================================================
   READING PROGRESS
===================================================== */

function attachProgressTracking() {

    if (
        progressHandlerAttached
    ) {

        return;

    }


    progressHandlerAttached =
        true;


    window.addEventListener(
        "scroll",
        updateReadingProgress,
        {
            passive: true
        }
    );

}


function updateReadingProgress() {

    const lessonView =
        $("lessonView");


    if (
        !lessonView ||
        lessonView.hidden ||
        !currentLesson
    ) {

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
        content.offsetHeight;


    if (
        contentHeight <=
        viewportHeight
    ) {

        updateProgress(
            100
        );

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


    const percentage =
        (
            (current - start) /
            (end - start)
        ) * 100;


    updateProgress(
        percentage
    );

}


/* =====================================================
   FINISH READING
===================================================== */

function finishReading() {

    if (!currentLesson) {

        return;

    }


    updateProgress(
        100
    );


    const buttons =
        document.querySelectorAll(
            "#finishReadingBtn, #mobileFinishReadingBtn"
        );


    buttons.forEach(
        button => {

            button.disabled =
                true;

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
                    "You have finished reading";

            }

        }
    );


    /*
     * Store locally.
     * This does not submit a reflection or quiz.
     * It only remembers reading completion on this device.
     */

    const key =
        getProgressKey();


    localStorage.setItem(
        key,
        "completed"
    );

}


/* =====================================================
   PROGRESS STORAGE KEY
===================================================== */

function getProgressKey() {

    const lessonNumber =
        clean(
            currentLesson?.lesson
        ) || "unknown";


    const className =
        clean(
            currentLesson?.className
        ) || selectedClass;


    return (
        "lessonCompleted_" +
        className +
        "_" +
        lessonNumber
    );

}


/* =====================================================
   RESTORE COMPLETION
===================================================== */

function restoreCompletion() {

    const completed =
        localStorage.getItem(
            getProgressKey()
        );


    if (
        completed !==
        "completed"
    ) {

        updateProgress(
            0
        );

        return;

    }


    updateProgress(
        100
    );


    const buttons =
        document.querySelectorAll(
            "#finishReadingBtn, #mobileFinishReadingBtn"
        );


    buttons.forEach(
        button => {

            button.disabled =
                true;


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
                    "You have finished reading";

            }

        }
    );

}


/* =====================================================
   RESET FINISH BUTTON
===================================================== */

function resetFinishButtons() {

    const buttons =
        document.querySelectorAll(
            "#finishReadingBtn, #mobileFinishReadingBtn"
        );


    buttons.forEach(
        button => {

            button.disabled =
                false;


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
                    "I've read this lesson";

            }


            if (small) {

                small.textContent =
                    "Mark lesson as completed";

            }

        }
    );

}


/* =====================================================
   RENDER SELECTED LESSON
===================================================== */

function renderSelectedLesson() {

    const lesson =
        findLesson(
            selectedClass
        );


    if (!lesson) {

        showError(
            `No ${selectedClass} lesson was found in the current lesson data.`
        );

        return;

    }


    currentLesson =
        lesson;


    updateActiveTab(
        selectedClass
    );


    /*
     * TOPIC
     * The lesson topic is the large title.
     */

    setText(
        "lessonTitle",
        lesson.topic,
        "Lesson Topic"
    );


    /*
     * Theme / secondary topic line.
     * We use summary only when available.
     */

    setText(
        "lessonTheme",
        lesson.summary,
        ""
    );


    const theme =
        $("lessonTheme");


    if (
        theme &&
        !lesson.summary
    ) {

        theme.style.display =
            "none";

    }

    else if (theme) {

        theme.style.display =
            "";

    }


    /*
     * CLASS
     */

    setText(
        "lessonClassBadge",
        (
            clean(
                lesson.className
            ) ||
            selectedClass
        ).toUpperCase()
    );


    /*
     * BIBLE TEXT
     */

    setText(
        "lessonBibleText",
        lesson.bibleText,
        "—"
    );


    /*
     * LESSON NUMBER
     */

    setText(
        "lessonNumber",
        formatLessonNumber(
            lesson
        ),
        "—"
    );


    /*
     * MEMORY VERSE
     */

    setText(
        "lessonMemoryVerse",
        lesson.memoryVerse,
        "—"
    );


    /*
     * WEEK
     */

    setText(
        "lessonDate",
        formatWeek(
            lesson
        ),
        "This Week"
    );


    updatePageWeek(
        lesson
    );


    /*
     * BODY
     */

    renderContent(
        lesson
    );


    /*
     * AUDIO
     */

    renderAudio(
        lesson
    );


    /*
     * META
     */

    renderMeta(
        lesson
    );


    /*
     * PROGRESS
     */

    resetFinishButtons();

    restoreCompletion();


    /*
     * Finally show the lesson.
     *
     * IMPORTANT:
     * This happens only AFTER the lesson has
     * successfully been rendered.
     */

    showLessonView();


    /*
     * Update reading progress after layout exists.
     */

    requestAnimationFrame(
        () => {

            updateReadingProgress();

        }
    );

}


/* =====================================================
   CLASS TAB EVENTS
===================================================== */

function setupClassTabs() {

    document
        .querySelectorAll(
            ".class-tab"
        )
        .forEach(
            tab => {

                /*
                 * Avoid duplicate listeners.
                 */

                if (
                    tab.dataset.lessonBound ===
                    "true"
                ) {

                    return;

                }


                tab.dataset.lessonBound =
                    "true";


                tab.addEventListener(
                    "click",
                    () => {

                        const className =
                            clean(
                                tab.dataset.class
                            );


                        if (!className) {

                            return;

                        }


                        selectedClass =
                            className;


                        localStorage.setItem(
                            STORAGE_CLASS,
                            selectedClass
                        );


                        renderSelectedLesson();


                        window.scrollTo(
                            {
                                top: 0,
                                behavior: "smooth"
                            }
                        );

                    }
                );

            }
        );

}


/* =====================================================
   RETRY BUTTON
===================================================== */

function setupRetry() {

    const button =
        $("retryLessons");


    if (
        !button ||
        button.dataset.bound ===
        "true"
    ) {

        return;

    }


    button.dataset.bound =
        "true";


    button.addEventListener(
        "click",
        () => {

            fetchLessons();

        }
    );

}


/* =====================================================
   FINISH BUTTONS
===================================================== */

function setupFinishButtons() {

    const buttons =
        document.querySelectorAll(
            "#finishReadingBtn, #mobileFinishReadingBtn"
        );


    buttons.forEach(
        button => {

            if (
                button.dataset.bound ===
                "true"
            ) {

                return;

            }


            button.dataset.bound =
                "true";


            button.addEventListener(
                "click",
                finishReading
            );

        }
    );

}


/* =====================================================
   INITIALIZATION
===================================================== */

function initialize() {

    setupRetry();

    setupFinishButtons();

    setupClassTabs();

    attachProgressTracking();

    fetchLessons();

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
        initialize,
        {
            once: true
        }
    );

}

else {

    initialize();

}
 

})();
