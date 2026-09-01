/* =========================================================
   AFC ISIU YOUTH PORTAL
   FILE: lessons.js
   PURPOSE: WEEKLY LESSONS PAGE CONTROLLER
========================================================= */

"use strict";


/* =========================================================
   GOOGLE SHEETS CSV
========================================================= */

const WEEKLY_LESSON_CSV =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=201183837&single=true&output=csv";


/* =========================================================
   GLOBAL STATE
========================================================= */

let lessonsData = [];

let selectedClass =
    localStorage.getItem(
        "selectedLessonClass"
    ) || "Senior";

let currentLesson = null;

let readingStarted = false;

let lessonCompleted = false;


/* =========================================================
   DOM HELPER
========================================================= */

function $(id) {

    return document.getElementById(id);

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


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


/* =========================================================
   NORMALIZE TEXT
========================================================= */

function cleanText(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .replace(
            /\r\n/g,
            "\n"
        )
        .replace(
            /\r/g,
            "\n"
        )
        .trim();

}


/* =========================================================
   FIND CSV COLUMN
========================================================= */

function getColumn(
    row,
    possibleNames
) {

    const keys =
        Object.keys(row || {});


    for (
        const name of possibleNames
    ) {

        const exact =
            keys.find(
                key =>
                    key
                        .trim()
                        .toLowerCase() ===
                    name
                        .trim()
                        .toLowerCase()
            );


        if (
            exact !==
            undefined
        ) {

            return cleanText(
                row[exact]
            );

        }

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

}


function hideElement(element) {

    if (!element) {
        return;
    }


    element.hidden = true;

}


/* =========================================================
   PAGE STATE
========================================================= */

function showLoading() {

    showElement(
        $("lessonsLoading")
    );

    hideElement(
        $("lessonsError")
    );

    hideElement(
        $("lessonView")
    );

}


function hideLoading() {

    hideElement(
        $("lessonsLoading")
    );

}


function showError(message) {

    hideLoading();

    hideElement(
        $("lessonView")
    );


    const errorBox =
        $("lessonsError");

    const errorMessage =
        $("lessonsErrorMessage");


    if (
        errorMessage
    ) {

        errorMessage.textContent =
            message ||
            "Unable to load this week's lesson. Please try again.";

    }


    showElement(
        errorBox
    );

}


/* =========================================================
   FETCH WEEKLY LESSON DATA
========================================================= */

async function loadLessons() {

    showLoading();


    try {

        console.log(
            "AFC Lessons: Fetching lesson CSV..."
        );


        const response =
            await fetch(
                WEEKLY_LESSON_CSV,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        console.log(
            "AFC Lessons: Response status:",
            response.status
        );


        if (
            !response.ok
        ) {

            throw new Error(
                `Lesson server returned HTTP ${response.status}.`
            );

        }


        const csvText =
            await response.text();


        console.log(
            "AFC Lessons: CSV received:",
            csvText.length,
            "characters"
        );


        if (
            !csvText ||
            csvText.trim() === ""
        ) {

            throw new Error(
                "The lesson spreadsheet returned an empty response."
            );

        }


        /* -------------------------------------------------
           PapaParse check
        ------------------------------------------------- */

        if (
            typeof Papa ===
            "undefined"
        ) {

            throw new Error(
                "PapaParse is not loaded."
            );

        }


        /* -------------------------------------------------
           Parse CSV
        ------------------------------------------------- */

        const result =
            Papa.parse(
                csvText,
                {
                    header: true,
                    skipEmptyLines: true,
                    transformHeader:
                        header =>
                            cleanText(
                                header
                            )
                }
            );


        if (
            result.errors &&
            result.errors.length
        ) {

            console.warn(
                "AFC Lessons: CSV parsing warnings:",
                result.errors
            );

        }


        if (
            !result.data ||
            !result.data.length
        ) {

            throw new Error(
                "No lesson records were found in the spreadsheet."
            );

        }


        /* -------------------------------------------------
           Convert spreadsheet rows
        ------------------------------------------------- */

        lessonsData =
            result.data
                .map(row => {

                    return {

                        lesson:
                            getColumn(
                                row,
                                [
                                    "Lesson",
                                    "Lesson Number",
                                    "LessonNo",
                                    "No"
                                ]
                            ),

                        className:
                            getColumn(
                                row,
                                [
                                    "Class",
                                    "Class Name"
                                ]
                            ),

                        topic:
                            getColumn(
                                row,
                                [
                                    "Topic",
                                    "Theme",
                                    "Lesson Topic"
                                ]
                            ),

                        bibleText:
                            getColumn(
                                row,
                                [
                                    "BibleText",
                                    "Bible Text",
                                    "Bible Reference",
                                    "Bible Text / Reference"
                                ]
                            ),

                        memoryVerse:
                            getColumn(
                                row,
                                [
                                    "MemoryVerse",
                                    "Memory Verse"
                                ]
                            ),

                        summary:
                            getColumn(
                                row,
                                [
                                    "Summary",
                                    "Lesson Summary",
                                    "Content"
                                ]
                            ),

                        discussion:
                            getColumn(
                                row,
                                [
                                    "Discussion",
                                    "Discussion Questions"
                                ]
                            ),

                        yorubaAudio:
                            getColumn(
                                row,
                                [
                                    "YorubaAudio",
                                    "Yoruba Audio"
                                ]
                            ),

                        date:
                            getColumn(
                                row,
                                [
                                    "Date",
                                    "Lesson Date",
                                    "Week Date"
                                ]
                            ),

                        week:
                            getColumn(
                                row,
                                [
                                    "Week",
                                    "Week Number"
                                ]
                            ),

                        readingTime:
                            getColumn(
                                row,
                                [
                                    "ReadingTime",
                                    "Reading Time"
                                ]
                            )

                    };

                })
                .filter(
                    lesson =>
                        lesson.className ||
                        lesson.topic ||
                        lesson.summary
                );


        console.log(
            "AFC Lessons: Parsed lessons:",
            lessonsData
        );


        if (
            !lessonsData.length
        ) {

            throw new Error(
                "The spreadsheet loaded, but no usable lessons were found."
            );

        }


        /* -------------------------------------------------
           Populate selected class
        ------------------------------------------------- */

        updateWeekDisplay();


        selectClass(
            selectedClass
        );


    }

    catch (error) {

        console.error(
            "AFC Lessons: Loading failed:",
            error
        );


        showError(
            error.message ||
            "Unable to load this week's lesson. Please check your internet connection and try again."
        );

    }

}


/* =========================================================
   FIND LESSON FOR CLASS
========================================================= */

function findLessonForClass(
    className
) {

    if (
        !lessonsData.length
    ) {

        return null;

    }


    const wanted =
        cleanText(
            className
        ).toLowerCase();


    /* -------------------------------------------------
       Exact match first
    ------------------------------------------------- */

    let lesson =
        lessonsData.find(
            item =>
                cleanText(
                    item.className
                ).toLowerCase() ===
                wanted
        );


    if (
        lesson
    ) {

        return lesson;

    }


    /* -------------------------------------------------
       Flexible match
    ------------------------------------------------- */

    lesson =
        lessonsData.find(
            item => {

                const value =
                    cleanText(
                        item.className
                    ).toLowerCase();


                return (
                    value.includes(
                        wanted
                    ) ||
                    wanted.includes(
                        value
                    )
                );

            }
        );


    return lesson || null;

}


/* =========================================================
   SELECT CLASS
========================================================= */

function selectClass(
    className
) {

    const lesson =
        findLessonForClass(
            className
        );


    if (
        !lesson
    ) {

        console.warn(
            "AFC Lessons: No lesson found for class:",
            className
        );


        updateClassTabs(
            className
        );


        showError(
            `No lesson was found for the ${className} class this week.`
        );


        return;

    }


    selectedClass =
        className;


    currentLesson =
        lesson;


    localStorage.setItem(
        "selectedLessonClass",
        className
    );


    updateClassTabs(
        className
    );


    renderLesson(
        lesson
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


                tab.classList.toggle(
                    "active",
                    tabClass.toLowerCase() ===
                        cleanText(
                            className
                        ).toLowerCase()
                );

            }
        );

}


/* =========================================================
   RENDER LESSON
========================================================= */

function renderLesson(
    lesson
) {

    if (
        !lesson
    ) {

        return;

    }


    hideLoading();

    hideElement(
        $("lessonsError")
    );

    showElement(
        $("lessonView")
    );


    readingStarted =
        false;

    lessonCompleted =
        false;


    /* -------------------------------------------------
       HERO
    ------------------------------------------------- */

    const lessonTitle =
        $("lessonTitle");

    const lessonTheme =
        $("lessonTheme");

    const lessonClassBadge =
        $("lessonClassBadge");

    const lessonStatus =
        $("lessonStatus");


    if (
        lessonTitle
    ) {

        lessonTitle.textContent =
            lesson.topic ||
            "Weekly Lesson";

    }


    if (
        lessonTheme
    ) {

        lessonTheme.textContent =
            lesson.summary ||
            "";

    }


    if (
        lessonClassBadge
    ) {

        lessonClassBadge.textContent =
            (
                lesson.className ||
                selectedClass
            ).toUpperCase();

    }


    if (
        lessonStatus
    ) {

        lessonStatus.textContent =
            "THIS WEEK";

    }


    /* -------------------------------------------------
       INFORMATION CARDS
    ------------------------------------------------- */

    const bibleText =
        $("lessonBibleText");

    const lessonNumber =
        $("lessonNumber");

    const lessonDate =
        $("lessonDate");


    if (
        bibleText
    ) {

        bibleText.textContent =
            lesson.bibleText ||
            "—";

    }


    if (
        lessonNumber
    ) {

        lessonNumber.textContent =
            lesson.lesson ||
            "—";

    }


    if (
        lessonDate
    ) {

        lessonDate.textContent =
            lesson.date ||
            lesson.week ||
            "This week";

    }


    /* -------------------------------------------------
       MEMORY VERSE
    ------------------------------------------------- */

    const memoryVerse =
        $("lessonMemoryVerse");


    if (
        memoryVerse
    ) {

        memoryVerse.textContent =
            lesson.memoryVerse ||
            "—";

    }


    /* -------------------------------------------------
       LESSON BODY
    ------------------------------------------------- */

    renderLessonContent(
        lesson
    );


    /* -------------------------------------------------
       META
    ------------------------------------------------- */

    const readingTime =
        calculateReadingTime(
            lesson
        );


    const sectionCount =
        calculateSectionCount(
            lesson
        );


    if (
        $("readingTime")
    ) {

        $("readingTime").textContent =
            readingTime;

    }


    if (
        $("mobileReadingTime")
    ) {

        $("mobileReadingTime").textContent =
            readingTime;

    }


    if (
        $("sectionCount")
    ) {

        $("sectionCount").textContent =
            sectionCount;

    }


    if (
        $("mobileSectionCount")
    ) {

        $("mobileSectionCount").textContent =
            sectionCount;

    }


    /* -------------------------------------------------
       RESET PROGRESS
    ------------------------------------------------- */

    updateProgress(
        0
    );


    updateFinishButton();


    /* -------------------------------------------------
       Scroll to lesson
    ------------------------------------------------- */

    const lessonView =
        $("lessonView");


    if (
        lessonView
    ) {

        requestAnimationFrame(
            () => {

                lessonView.scrollIntoView({
                    behavior:
                        "smooth",
                    block:
                        "start"
                });

            }
        );

    }

}


/* =========================================================
   RENDER LESSON CONTENT
========================================================= */

function renderLessonContent(
    lesson
) {

    const container =
        $("lessonContent");


    if (
        !container
    ) {

        return;

    }


    const blocks = [];


    /* -------------------------------------------------
       SUMMARY
    ------------------------------------------------- */

    if (
        lesson.summary
    ) {

        blocks.push(`

            <section class="lesson-section">

                <h2>
                    <i class="fa-solid fa-book-open"></i>
                    Lesson Overview
                </h2>

                <div class="lesson-section-text">
                    ${formatLessonText(
                        lesson.summary
                    )}
                </div>

            </section>

        `);

    }


    /* -------------------------------------------------
       DISCUSSION
    ------------------------------------------------- */

    if (
        lesson.discussion
    ) {

        blocks.push(`

            <section class="lesson-section">

                <h2>
                    <i class="fa-solid fa-comments"></i>
                    Discussion
                </h2>

                <div class="lesson-section-text">
                    ${formatLessonText(
                        lesson.discussion
                    )}
                </div>

            </section>

        `);

    }


    /* -------------------------------------------------
       YORUBA AUDIO
    ------------------------------------------------- */

    if (
        lesson.yorubaAudio
    ) {

        const safeAudio =
            escapeHTML(
                lesson.yorubaAudio
            );


        blocks.push(`

            <section class="lesson-section lesson-audio-section">

                <h2>
                    <i class="fa-solid fa-volume-high"></i>
                    Yoruba Memory Verse
                </h2>

                <audio
                    controls
                    preload="none"
                    src="${safeAudio}">
                </audio>

            </section>

        `);

    }


    /* -------------------------------------------------
       EMPTY CONTENT
    ------------------------------------------------- */

    if (
        !blocks.length
    ) {

        blocks.push(`

            <section class="lesson-section">

                <div class="lesson-empty">

                    <i class="fa-solid fa-book-open"></i>

                    <h2>
                        Lesson content
                    </h2>

                    <p>
                        The lesson content is being prepared.
                        Please check back shortly.
                    </p>

                </div>

            </section>

        `);

    }


    container.innerHTML =
        blocks.join("");


    attachReadingObserver();

}


/* =========================================================
   FORMAT LESSON TEXT
========================================================= */

function formatLessonText(
    text
) {

    const cleaned =
        cleanText(
            text
        );


    if (
        !cleaned
    ) {

        return "";

    }


    const paragraphs =
        cleaned
            .split(
                /\n\s*\n/
            )
            .map(
                paragraph =>
                    paragraph.trim()
            )
            .filter(
                paragraph =>
                    paragraph.length
            );


    return paragraphs
        .map(
            paragraph => {

                const safe =
                    escapeHTML(
                        paragraph
                    );


                return `
                    <p>
                        ${safe.replace(
                            /\n/g,
                            "<br>"
                        )}
                    </p>
                `;

            }
        )
        .join("");

}


/* =========================================================
   READING TIME
========================================================= */

function calculateReadingTime(
    lesson
) {

    if (
        lesson.readingTime
    ) {

        return lesson.readingTime;

    }


    const text =
        [
            lesson.summary,
            lesson.discussion,
            lesson.memoryVerse
        ]
            .join(" ");


    const words =
        text
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .length;


    if (
        !words
    ) {

        return "5 min";

    }


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
   SECTION COUNT
========================================================= */

function calculateSectionCount(
    lesson
) {

    let count = 0;


    if (
        lesson.summary
    ) {

        count++;

    }


    if (
        lesson.discussion
    ) {

        count++;

    }


    if (
        lesson.yorubaAudio
    ) {

        count++;

    }


    return count || 1;

}


/* =========================================================
   WEEK DISPLAY
========================================================= */

function updateWeekDisplay() {

    const weekElement =
        $("lessonWeek");


    if (
        !weekElement
    ) {

        return;

    }


    const icon =
        weekElement.querySelector(
            "i"
        );


    if (
        icon
    ) {

        icon.className =
            "fa-regular fa-calendar";

    }


    const text =
        weekElement.querySelector(
            "span"
        );


    if (
        text
    ) {

        text.textContent =
            "This Week";

    }

}


/* =========================================================
   READING OBSERVER
========================================================= */

function attachReadingObserver() {

    const content =
        $("lessonContent");


    if (
        !content
    ) {

        return;

    }


    if (
        !("IntersectionObserver" in window)
    ) {

        return;

    }


    const sections =
        content.querySelectorAll(
            ".lesson-section"
        );


    if (
        !sections.length
    ) {

        return;

    }


    let viewed =
        new Set();


    const observer =
        new IntersectionObserver(
            entries => {

                entries.forEach(
                    entry => {

                        if (
                            entry.isIntersecting
                        ) {

                            viewed.add(
                                entry.target
                            );

                            readingStarted =
                                true;


                            const percentage =
                                Math.round(
                                    (
                                        viewed.size /
                                        sections.length
                                    ) * 100
                                );


                            updateProgress(
                                Math.min(
                                    percentage,
                                    100
                                )
                            );

                        }

                    }
                );


                if (
                    viewed.size >=
                    sections.length
                ) {

                    updateProgress(
                        100
                    );

                }

            },
            {
                threshold:
                    0.35
            }
        );


    sections.forEach(
        section =>
            observer.observe(
                section
            )
    );

}


/* =========================================================
   MANUAL SCROLL PROGRESS
========================================================= */

function calculateScrollProgress() {

    const content =
        $("lessonContent");


    if (
        !content
    ) {

        return 0;

    }


    const rect =
        content.getBoundingClientRect();


    const viewportHeight =
        window.innerHeight;


    const total =
        rect.height +
        viewportHeight;


    const passed =
        viewportHeight -
        rect.top;


    if (
        total <= 0
    ) {

        return 0;

    }


    return Math.max(
        0,
        Math.min(
            100,
            Math.round(
                (
                    passed /
                    total
                ) * 100
            )
        )
    );

}


/* =========================================================
   PROGRESS
========================================================= */

function updateProgress(
    percentage
) {

    const value =
        Math.max(
            0,
            Math.min(
                100,
                Number(
                    percentage
                ) || 0
            )
        );


    if (
        $("progressBar")
    ) {

        $("progressBar").style.width =
            `${value}%`;

    }


    if (
        $("mobileProgressBar")
    ) {

        $("mobileProgressBar").style.width =
            `${value}%`;

    }


    if (
        $("progressPercent")
    ) {

        $("progressPercent").textContent =
            `${value}%`;

    }


    if (
        $("mobileProgressPercent")
    ) {

        $("mobileProgressPercent").textContent =
            `${value}%`;

    }


    if (
        $("progressText")
    ) {

        if (
            value >= 100
        ) {

            $("progressText").textContent =
                "You've finished reading this lesson.";

        }

        else if (
            value > 0
        ) {

            $("progressText").textContent =
                "Keep going — you're making progress.";

        }

        else {

            $("progressText").textContent =
                "Start reading this lesson.";

        }

    }

}


/* =========================================================
   SCROLL LISTENER
========================================================= */

let scrollTimer = null;


window.addEventListener(
    "scroll",
    () => {

        if (
            !currentLesson
        ) {

            return;

        }


        if (
            scrollTimer
        ) {

            return;

        }


        scrollTimer =
            requestAnimationFrame(
                () => {

                    const progress =
                        calculateScrollProgress();


                    if (
                        progress >
                        0
                    ) {

                        readingStarted =
                            true;

                    }


                    updateProgress(
                        progress
                    );


                    scrollTimer =
                        null;

                }
            );

    },
    {
        passive: true
    }
);


/* =========================================================
   FINISH BUTTON
========================================================= */

function handleFinishReading() {

    if (
        !currentLesson
    ) {

        return;

    }


    /* -------------------------------------------------
       This page is publicly readable.
       Completion requires authentication.
    ------------------------------------------------- */

    const authState =
        getAuthenticationState();


    if (
        !authState.loggedIn
    ) {

        showLoginRequiredMessage();

        return;

    }


    /* -------------------------------------------------
       Require reading progress
    ------------------------------------------------- */

    const progress =
        calculateScrollProgress();


    if (
        progress <
        80
    ) {

        showReadingReminder();

        return;

    }


    lessonCompleted =
        true;


    updateProgress(
        100
    );


    updateFinishButton();


    saveLessonCompletion();

}


/* =========================================================
   AUTHENTICATION STATE
========================================================= */

function getAuthenticationState() {

    /*
     * This intentionally checks several common keys
     * used by the AFC portal authentication system.
     *
     * It does NOT assume that lessons themselves
     * require login.
     */

    const possibleKeys = [

        "authToken",
        "accessToken",
        "token",
        "userToken",
        "loggedIn",
        "isLoggedIn"

    ];


    for (
        const key of possibleKeys
    ) {

        const value =
            localStorage.getItem(
                key
            );


        if (
            value &&
            value !==
                "false" &&
            value !==
                "null" &&
            value !==
                "undefined"
        ) {

            return {
                loggedIn:
                    true
            };

        }

    }


    return {
        loggedIn:
            false
    };

}


/* =========================================================
   LOGIN REQUIRED MESSAGE
========================================================= */

function showLoginRequiredMessage() {

    showSimpleLessonMessage(
        "Please log in to mark this lesson as completed.",
        "info"
    );

}


/* =========================================================
   READING REMINDER
========================================================= */

function showReadingReminder() {

    showSimpleLessonMessage(
        "Please continue reading the lesson before marking it as completed.",
        "info"
    );

}


/* =========================================================
   SIMPLE LESSON MESSAGE
========================================================= */

function showSimpleLessonMessage(
    message,
    type = "info"
) {

    const existing =
        document.getElementById(
            "lessonMessage"
        );


    if (
        existing
    ) {

        existing.remove();

    }


    const messageBox =
        document.createElement(
            "div"
        );


    messageBox.id =
        "lessonMessage";


    messageBox.className =
        `lesson-message ${type}`;


    messageBox.innerHTML = `

        <div class="lesson-message-card">

            <div class="lesson-message-icon">

                <i class="fa-solid fa-circle-info"></i>

            </div>

            <p>
                ${escapeHTML(
                    message
                )}
            </p>

            <button
                type="button"
                class="lesson-message-close"
            >
                Okay
            </button>

        </div>

    `;


    document.body.appendChild(
        messageBox
    );


    requestAnimationFrame(
        () => {

            messageBox.classList.add(
                "show"
            );

        }
    );


    const close =
        () => {

            messageBox.classList.remove(
                "show"
            );


            setTimeout(
                () => {

                    messageBox.remove();

                },
                200
            );

        };


    const closeButton =
        messageBox.querySelector(
            ".lesson-message-close"
        );


    if (
        closeButton
    ) {

        closeButton.addEventListener(
            "click",
            close
        );

    }


    messageBox.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                messageBox
            ) {

                close();

            }

        }
    );

}


/* =========================================================
   UPDATE FINISH BUTTON
========================================================= */

function updateFinishButton() {

    const buttons = [

        $("finishReadingBtn"),

        $("mobileFinishReadingBtn")

    ];


    buttons.forEach(
        button => {

            if (
                !button
            ) {

                return;

            }


            const strong =
                button.querySelector(
                    "strong"
                );


            const small =
                button.querySelector(
                    "small"
                );


            if (
                lessonCompleted
            ) {

                button.classList.add(
                    "completed"
                );


                if (
                    strong
                ) {

                    strong.textContent =
                        "Lesson completed";

                }


                if (
                    small
                ) {

                    small.textContent =
                        "You've completed this lesson";

                }

            }

            else {

                button.classList.remove(
                    "completed"
                );


                if (
                    strong
                ) {

                    strong.textContent =
                        "I've read this lesson";

                }


                if (
                    small
                ) {

                    small.textContent =
                        "Mark lesson as completed";

                }

            }

        }
    );

}


/* =========================================================
   SAVE LESSON COMPLETION
========================================================= */

function saveLessonCompletion() {

    if (
        !currentLesson
    ) {

        return;

    }


    const completionKey =
        `lessonCompleted_${selectedClass}_${currentLesson.lesson || currentLesson.topic}`;


    localStorage.setItem(
        completionKey,
        JSON.stringify({
            completed:
                true,
            date:
                new Date()
                    .toISOString()
        })
    );


    console.log(
        "AFC Lessons: Lesson completion saved locally."
    );

}


/* =========================================================
   CLASS TAB EVENTS
========================================================= */

function initializeClassTabs() {

    const tabs =
        document.querySelectorAll(
            ".class-tab"
        );


    tabs.forEach(
        tab => {

            tab.addEventListener(
                "click",
                () => {

                    const className =
                        tab.dataset.class;


                    if (
                        !className
                    ) {

                        return;

                    }


                    selectClass(
                        className
                    );

                }
            );

        }
    );

}


/* =========================================================
   RETRY BUTTON
========================================================= */

function initializeRetry() {

    const retry =
        $("retryLessons");


    if (
        !retry
    ) {

        return;

    }


    retry.addEventListener(
        "click",
        () => {

            loadLessons();

        }
    );

}


/* =========================================================
   FINISH BUTTON EVENTS
========================================================= */

function initializeFinishButtons() {

    const desktopButton =
        $("finishReadingBtn");


    const mobileButton =
        $("mobileFinishReadingBtn");


    if (
        desktopButton
    ) {

        desktopButton.addEventListener(
            "click",
            handleFinishReading
        );

    }


    if (
        mobileButton
    ) {

        mobileButton.addEventListener(
            "click",
            handleFinishReading
        );

    }

}


/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "AFC Lessons: Page initializing..."
        );


        initializeClassTabs();


        initializeRetry();


        initializeFinishButtons();


        updateWeekDisplay();


        loadLessons();

    }
);
