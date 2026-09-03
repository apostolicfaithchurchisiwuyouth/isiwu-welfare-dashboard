/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: lessons.js
   PURPOSE: WEEKLY LESSONS CONTROLLER
   ============================================================

   DATA SOURCE:

   Google Sheets CSV

   Columns supported:

   Lesson
   Class
   Topic
   BibleText
   MemoryVerse
   Summary
   Discussion
   YorubaAudio

   OFFLINE:

   Google Sheets
        ↓
   lessons.js
        ↓
   IndexedDB
        ↓
   Offline Lessons

   ============================================================ */

"use strict";


/* ============================================================
   GOOGLE SHEETS
   ============================================================ */

const WEEKLY_LESSON_CSV =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=201183837&single=true&output=csv";


/* ============================================================
   LOCAL STORAGE
   ============================================================ */

const LESSON_STORAGE_KEY =
    "afc_isiu_weekly_lessons_v2";


/* ============================================================
   INDEXED DB
   ============================================================ */

const LESSON_DB_NAME =
    "AFC_Isiu_Lessons_V2";

const LESSON_DB_VERSION =
    1;

const LESSON_STORE =
    "lessons";


/* ============================================================
   STATE
   ============================================================ */

let lessons = [];

let selectedClass =
    localStorage.getItem(
        "selectedLessonClass"
    ) || "Senior";


/* ============================================================
   DOM HELPER
   ============================================================ */

function getElement(
    ...ids
) {

    for (
        const id of ids
    ) {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            return element;

        }

    }


    return null;

}


/* ============================================================
   ELEMENTS
   ============================================================ */

const topicEl =
    getElement(
        "lessonTitle",
        "lessonTopic",
        "topic"
    );


const themeEl =
    getElement(
        "lessonTheme"
    );


const bibleTextEl =
    getElement(
        "lessonBibleText",
        "bibleText"
    );


const memoryVerseEl =
    getElement(
        "lessonMemoryVerse",
        "memoryVerse"
    );


const summaryEl =
    getElement(
        "lessonContent",
        "lessonSummary",
        "summary"
    );


const discussionEl =
    getElement(
        "discussion",
        "lessonDiscussion"
    );


const lessonWeekEl =
    getElement(
        "lessonWeek"
    );


const lessonNumberEl =
    getElement(
        "lessonNumber"
    );


const lessonDateEl =
    getElement(
        "lessonDate"
    );


const lessonClassBadgeEl =
    getElement(
        "lessonClassBadge"
    );


const lessonStatusEl =
    getElement(
        "lessonStatus"
    );


const lessonsLoadingEl =
    getElement(
        "lessonsLoading"
    );


const lessonsErrorEl =
    getElement(
        "lessonsError"
    );


const lessonsErrorMessageEl =
    getElement(
        "lessonsErrorMessage"
    );


const lessonViewEl =
    getElement(
        "lessonView"
    );


const readingTimeEl =
    getElement(
        "readingTime"
    );


const mobileReadingTimeEl =
    getElement(
        "mobileReadingTime"
    );


const sectionCountEl =
    getElement(
        "sectionCount"
    );


const mobileSectionCountEl =
    getElement(
        "mobileSectionCount"
    );


const progressBarEl =
    getElement(
        "progressBar"
    );


const mobileProgressBarEl =
    getElement(
        "mobileProgressBar"
    );


const progressPercentEl =
    getElement(
        "progressPercent"
    );


const mobileProgressPercentEl =
    getElement(
        "mobileProgressPercent"
    );


const progressTextEl =
    getElement(
        "progressText"
    );


const finishReadingBtn =
    getElement(
        "finishReadingBtn"
    );


const mobileFinishReadingBtn =
    getElement(
        "mobileFinishReadingBtn"
    );


/* ============================================================
   TEXT CLEANER
   ============================================================ */

function cleanText(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .replace(
            /\uFEFF/g,
            ""
        )
        .trim();

}


/* ============================================================
   HTML ESCAPE
   ============================================================ */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
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


/* ============================================================
   CSV PARSER
   ============================================================

   This parser is included so the Lessons page can still
   understand CSV even if PapaParse is unavailable.

   ============================================================ */

function parseCSV(
    text
) {

    const rows = [];

    let row = [];

    let value = "";

    let insideQuotes = false;


    for (
        let i = 0;
        i < text.length;
        i++
    ) {

        const char =
            text[i];

        const next =
            text[i + 1];


        if (
            char === '"'
        ) {

            if (
                insideQuotes &&
                next === '"'
            ) {

                value += '"';

                i++;

            }

            else {

                insideQuotes =
                    !insideQuotes;

            }

        }


        else if (
            char === "," &&
            !insideQuotes
        ) {

            row.push(
                value
            );

            value = "";

        }


        else if (
            (
                char === "\n" ||
                char === "\r"
            ) &&
            !insideQuotes
        ) {

            if (
                char === "\r" &&
                next === "\n"
            ) {

                i++;

            }


            row.push(
                value
            );


            rows.push(
                row
            );


            row = [];

            value = "";

        }


        else {

            value += char;

        }

    }


    if (
        value !== "" ||
        row.length > 0
    ) {

        row.push(
            value
        );

        rows.push(
            row
        );

    }


    if (
        !rows.length
    ) {

        return [];

    }


    const headers =
        rows[0].map(
            header =>
                cleanText(
                    header
                )
        );


    return rows
        .slice(1)
        .filter(
            row =>
                row.some(
                    cell =>
                        cleanText(
                            cell
                        ) !== ""
                )
        )
        .map(
            row => {

                const object =
                    {};


                headers.forEach(
                    (
                        header,
                        index
                    ) => {

                        object[
                            header
                        ] =
                            cleanText(
                                row[index] ||
                                ""
                            );

                    }
                );


                return object;

            }
        );

}


/* ============================================================
   HEADER LOOKUP
   ============================================================ */

function getColumn(
    row,
    ...names
) {

    if (
        !row ||
        typeof row !== "object"
    ) {

        return "";

    }


    const keys =
        Object.keys(
            row
        );


    for (
        const wanted of names
    ) {

        const exact =
            keys.find(
                key =>
                    cleanText(
                        key
                    ).toLowerCase() ===
                    cleanText(
                        wanted
                    ).toLowerCase()
            );


        if (
            exact
        ) {

            return cleanText(
                row[exact]
            );

        }

    }


    return "";

}


/* ============================================================
   NORMALIZE LESSON
   ============================================================ */

function normalizeLesson(
    row
) {

    return {

        Lesson:
            getColumn(
                row,
                "Lesson",
                "Lesson Number",
                "Lesson No",
                "Week"
            ),

        Class:
            getColumn(
                row,
                "Class",
                "Class Name",
                "Category",
                "Level"
            ),

        Topic:
            getColumn(
                row,
                "Topic",
                "Lesson Topic",
                "Title"
            ),

        BibleText:
            getColumn(
                row,
                "BibleText",
                "Bible Text",
                "Bible Reference",
                "Scripture"
            ),

        MemoryVerse:
            getColumn(
                row,
                "MemoryVerse",
                "Memory Verse"
            ),

        Summary:
            getColumn(
                row,
                "Summary",
                "Lesson Summary",
                "Combined Lesson Note",
                "Lesson Notes",
                "Content"
            ),

        Discussion:
            getColumn(
                row,
                "Discussion",
                "Discussion Questions",
                "Questions"
            ),

        YorubaAudio:
            getColumn(
                row,
                "YorubaAudio",
                "Yoruba Audio",
                "Audio",
                "Audio URL"
            ),

        Date:
            getColumn(
                row,
                "Date",
                "Lesson Date",
                "Week Date"
            )

    };

}


/* ============================================================
   OPEN INDEXED DB
   ============================================================ */

function openLessonDB() {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            if (
                !window.indexedDB
            ) {

                reject(
                    new Error(
                        "IndexedDB is not available."
                    )
                );

                return;

            }


            const request =
                indexedDB.open(
                    LESSON_DB_NAME,
                    LESSON_DB_VERSION
                );


            request.onupgradeneeded =
                event => {

                    const db =
                        event.target.result;


                    if (
                        !db.objectStoreNames.contains(
                            LESSON_STORE
                        )
                    ) {

                        db.createObjectStore(
                            LESSON_STORE,
                            {
                                keyPath:
                                    "id"
                            }
                        );

                    }

                };


            request.onsuccess =
                () => {

                    resolve(
                        request.result
                    );

                };


            request.onerror =
                () => {

                    reject(
                        request.error
                    );

                };

        }
    );

}


/* ============================================================
   SAVE TO INDEXED DB
   ============================================================ */

async function saveLessonsOffline(
    lessonData
) {

    if (
        !Array.isArray(
            lessonData
        ) ||
        !lessonData.length
    ) {

        return;

    }


    try {

        const db =
            await openLessonDB();


        await new Promise(
            (
                resolve,
                reject
            ) => {

                const transaction =
                    db.transaction(
                        LESSON_STORE,
                        "readwrite"
                    );


                const store =
                    transaction.objectStore(
                        LESSON_STORE
                    );


                store.clear();


                lessonData.forEach(
                    (
                        lesson,
                        index
                    ) => {

                        store.put({

                            id:
                                String(
                                    index + 1
                                ),

                            ...lesson

                        });

                    }
                );


                transaction.oncomplete =
                    () => {

                        resolve();

                    };


                transaction.onerror =
                    () => {

                        reject(
                            transaction.error
                        );

                    };

            }
        );


        db.close();


        console.log(
            "AFC Isiu: Lessons saved offline."
        );

    }

    catch (error) {

        console.warn(
            "AFC Isiu: IndexedDB save failed.",
            error
        );

    }

}


/* ============================================================
   LOAD FROM INDEXED DB
   ============================================================ */

async function getOfflineLessons() {

    try {

        const db =
            await openLessonDB();


        const data =
            await new Promise(
                (
                    resolve,
                    reject
                ) => {

                    const transaction =
                        db.transaction(
                            LESSON_STORE,
                            "readonly"
                        );


                    const store =
                        transaction.objectStore(
                            LESSON_STORE
                        );


                    const request =
                        store.getAll();


                    request.onsuccess =
                        () => {

                            resolve(
                                request.result ||
                                []
                            );

                        };


                    request.onerror =
                        () => {

                            reject(
                                request.error
                            );

                        };

                }
            );


        db.close();


        return data;

    }

    catch (error) {

        console.warn(
            "AFC Isiu: IndexedDB read failed.",
            error
        );


        return [];

    }

}


/* ============================================================
   SAVE BACKUP TO LOCAL STORAGE
   ============================================================ */

function saveLessonsLocally(
    data
) {

    try {

        localStorage.setItem(

            LESSON_STORAGE_KEY,

            JSON.stringify({

                savedAt:
                    new Date()
                        .toISOString(),

                lessons:
                    data

            })

        );

    }

    catch (error) {

        console.warn(
            "AFC Isiu: Local storage save failed.",
            error
        );

    }

}


/* ============================================================
   GET LOCAL STORAGE BACKUP
   ============================================================ */

function getSavedLessons() {

    try {

        const saved =
            localStorage.getItem(
                LESSON_STORAGE_KEY
            );


        if (
            !saved
        ) {

            return [];

        }


        const parsed =
            JSON.parse(
                saved
            );


        if (
            !parsed ||
            !Array.isArray(
                parsed.lessons
            )
        ) {

            return [];

        }


        return parsed.lessons;

    }

    catch (error) {

        console.warn(
            "AFC Isiu: Local lesson backup could not be read.",
            error
        );


        return [];

    }

}


/* ============================================================
   SHOW LOADING
   ============================================================ */

function showLoading() {

    if (
        lessonsLoadingEl
    ) {

        lessonsLoadingEl.hidden =
            false;

    }


    if (
        lessonsErrorEl
    ) {

        lessonsErrorEl.hidden =
            true;

    }


    if (
        lessonViewEl
    ) {

        lessonViewEl.hidden =
            true;

    }

}


/* ============================================================
   HIDE LOADING
   ============================================================ */

function hideLoading() {

    if (
        lessonsLoadingEl
    ) {

        lessonsLoadingEl.hidden =
            true;

    }

}


/* ============================================================
   SHOW ERROR
   ============================================================ */

function showError(
    message
) {

    hideLoading();


    if (
        lessonViewEl
    ) {

        lessonViewEl.hidden =
            true;

    }


    if (
        lessonsErrorEl
    ) {

        lessonsErrorEl.hidden =
            false;

    }


    if (
        lessonsErrorMessageEl
    ) {

        lessonsErrorMessageEl.textContent =
            message;

    }

}


/* ============================================================
   HIDE ERROR
   ============================================================ */

function hideError() {

    if (
        lessonsErrorEl
    ) {

        lessonsErrorEl.hidden =
            true;

    }

}


/* ============================================================
   FORMAT LESSON CONTENT
   ============================================================ */

function formatLessonContent(
    content
) {

    const value =
        String(
            content || ""
        ).trim();


    if (
        !value
    ) {

        return `
            <div class="lesson-empty-content">

                <p>
                    Lesson content is not available yet.
                </p>

            </div>
        `;

    }


    /*
     * Your combined lesson notes may already contain HTML.
     *
     * If HTML is present, preserve it.
     */

    if (
        /<\s*(p|div|h1|h2|h3|h4|ul|ol|li|br|strong|em|blockquote)\b/i
            .test(value)
    ) {

        return value;

    }


    /*
     * Otherwise convert normal text into paragraphs.
     */

    return escapeHtml(
        value
    )
        .split(
            /\n\s*\n/
        )
        .map(
            paragraph => {

                const text =
                    paragraph
                        .trim()
                        .replace(
                            /\n/g,
                            "<br>"
                        );


                if (
                    !text
                ) {

                    return "";

                }


                return `
                    <p>
                        ${text}
                    </p>
                `;

            }
        )
        .join("");

}


/* ============================================================
   FORMAT DISCUSSION
   ============================================================ */

function formatDiscussion(
    content
) {

    const value =
        String(
            content || ""
        ).trim();


    if (
        !value
    ) {

        return `
            <p>
                No discussion questions are available
                for this lesson.
            </p>
        `;

    }


    /*
     * Preserve HTML if discussion already contains it.
     */

    if (
        /<\s*(p|div|ol|ul|li|br|strong)\b/i
            .test(value)
    ) {

        return value;

    }


    return escapeHtml(
        value
    )
        .replace(
            /\r?\n/g,
            "<br>"
        );

}


/* ============================================================
   CALCULATE READING TIME
   ============================================================ */

function calculateReadingTime(
    content
) {

    if (
        !content
    ) {

        return "—";

    }


    const temporary =
        document.createElement(
            "div"
        );


    temporary.innerHTML =
        content;


    const text =
        temporary
            .innerText
            .trim();


    if (
        !text
    ) {

        return "—";

    }


    const words =
        text
            .split(
                /\s+/
            )
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


/* ============================================================
   COUNT SECTIONS
   ============================================================ */

function countSections(
    content
) {

    if (
        !content
    ) {

        return 0;

    }


    const temporary =
        document.createElement(
            "div"
        );


    temporary.innerHTML =
        content;


    const headings =
        temporary.querySelectorAll(
            "h2, h3, h4"
        );


    if (
        headings.length
    ) {

        return headings.length;

    }


    const paragraphs =
        temporary.querySelectorAll(
            "p"
        );


    return paragraphs.length
        ? paragraphs.length
        : 1;

}


/* ============================================================
   UPDATE WEEK
   ============================================================ */

function updateWeekDisplay(
    lesson
) {

    if (
        !lesson
    ) {

        return;

    }


    const lessonNumber =
        cleanText(
            lesson.Lesson
        );


    const date =
        cleanText(
            lesson.Date
        );


    if (
        lessonWeekEl
    ) {

        if (
            date
        ) {

            lessonWeekEl.innerHTML = `

                <i
                    class="fa-regular fa-calendar"
                ></i>

                <span>
                    ${escapeHtml(date)}
                </span>

            `;

        }

        else if (
            lessonNumber
        ) {

            lessonWeekEl.innerHTML = `

                <i
                    class="fa-regular fa-calendar"
                ></i>

                <span>
                    Lesson ${escapeHtml(
                        lessonNumber
                    )}
                </span>

            `;

        }

        else {

            lessonWeekEl.innerHTML = `

                <i
                    class="fa-regular fa-calendar"
                ></i>

                <span>
                    This Week
                </span>

            `;

        }

    }


    if (
        lessonNumberEl
    ) {

        lessonNumberEl.textContent =
            lessonNumber ||
            "—";

    }


    if (
        lessonDateEl
    ) {

        lessonDateEl.textContent =
            date ||
            "This Week";

    }

}


/* ============================================================
   RENDER LESSON
   ============================================================ */

function renderLesson(
    lesson,
    className
) {

    if (
        !lesson
    ) {

        showError(
            `No lesson is available for the ${className} class.`
        );

        return;

    }


    const topic =
        cleanText(
            lesson.Topic
        );


    const bibleText =
        cleanText(
            lesson.BibleText
        );


    const memoryVerse =
        cleanText(
            lesson.MemoryVerse
        );


    const summary =
        lesson.Summary ||
        "";


    const discussion =
        lesson.Discussion ||
        "";


    /*
     * TOPIC
     */

    if (
        topicEl
    ) {

        topicEl.textContent =
            topic ||
            "Weekly Lesson";

    }


    /*
     * THEME
     */

    if (
        themeEl
    ) {

        themeEl.textContent =
            className
                ? `${className} Class`
                : "";

    }


    /*
     * CLASS BADGE
     */

    if (
        lessonClassBadgeEl
    ) {

        lessonClassBadgeEl.textContent =
            (
                className ||
                "Senior"
            ).toUpperCase();

    }


    /*
     * STATUS
     */

    if (
        lessonStatusEl
    ) {

        lessonStatusEl.textContent =
            "THIS WEEK";

    }


    /*
     * BIBLE TEXT
     */

    if (
        bibleTextEl
    ) {

        bibleTextEl.textContent =
            bibleText ||
            "—";

    }


    /*
     * MEMORY VERSE
     */

    if (
        memoryVerseEl
    ) {

        memoryVerseEl.textContent =
            memoryVerse ||
            "—";

    }


    /*
     * LESSON CONTENT
     */

    if (
        summaryEl
    ) {

        summaryEl.innerHTML =
            formatLessonContent(
                summary
            );

    }


    /*
     * DISCUSSION
     */

    if (
        discussionEl
    ) {

        discussionEl.innerHTML =
            formatDiscussion(
                discussion
            );

    }


    /*
     * WEEK / LESSON NUMBER
     */

    updateWeekDisplay(
        lesson
    );


    /*
     * READING TIME
     */

    const readingTime =
        calculateReadingTime(
            summary
        );


    if (
        readingTimeEl
    ) {

        readingTimeEl.textContent =
            readingTime;

    }


    if (
        mobileReadingTimeEl
    ) {

        mobileReadingTimeEl.textContent =
            readingTime;

    }


    /*
     * SECTION COUNT
     */

    const sectionCount =
        countSections(
            summary
        );


    if (
        sectionCountEl
    ) {

        sectionCountEl.textContent =
            sectionCount;

    }


    if (
        mobileSectionCountEl
    ) {

        mobileSectionCountEl.textContent =
            sectionCount;

    }


    /*
     * SHOW LESSON.
     */

    hideLoading();

    hideError();


    if (
        lessonViewEl
    ) {

        lessonViewEl.hidden =
            false;

    }


    /*
     * Restore reading progress.
     */

    setupReadingProgress(
        lesson
    );


    /*
     * Restore completion status.
     */

    updateCompletionUI(
        lesson
    );


    /*
     * Refresh icons if the global icon system exists.
     */

    if (
        window.lucide &&
        typeof window.lucide.createIcons ===
            "function"
    ) {

        try {

            window.lucide.createIcons();

        }

        catch (error) {

            console.warn(
                "AFC Lessons: icon refresh failed.",
                error
            );

        }

    }


    console.log(
        "AFC Isiu: Rendered lesson:",
        lesson
    );

}


/* ============================================================
   FIND LESSON
   ============================================================ */

function findLesson(
    className
) {

    const wanted =
        cleanText(
            className
        ).toLowerCase();


    return lessons.find(
        lesson =>
            cleanText(
                lesson.Class
            ).toLowerCase() ===
            wanted
    );

}


/* ============================================================
   SWITCH CLASS
   ============================================================ */

function switchClass(
    className
) {

    const cleanClass =
        cleanText(
            className
        ) || "Senior";


    selectedClass =
        cleanClass;


    try {

        localStorage.setItem(
            "selectedLessonClass",
            selectedClass
        );

    }

    catch (error) {

        console.warn(
            "AFC Lessons: Could not save selected class.",
            error
        );

    }


    /*
     * Update tabs.
     */

    document
        .querySelectorAll(
            ".class-tab, .lesson-tab, [data-class], [data-lesson-class]"
        )
        .forEach(
            tab => {

                const tabClass =
                    cleanText(
                        tab.dataset.class ||
                        tab.dataset.lessonClass ||
                        tab.textContent
                    );


                tab.classList.toggle(
                    "active",
                    tabClass.toLowerCase() ===
                        cleanClass.toLowerCase()
                );

            }
        );


    const lesson =
        findLesson(
            cleanClass
        );


    if (
        !lesson
    ) {

        showError(
            `No lesson is available for the ${cleanClass} class.`
        );

        return;

    }


    renderLesson(
        lesson,
        cleanClass
    );

}


/* ============================================================
   GLOBAL CLASS SWITCH
   ============================================================ */

window.switchClass =
    switchClass;


/*
 * Some older versions of the page used switchLesson().
 * Keep it working.
 */

window.switchLesson =
    switchClass;


/* ============================================================
   LOAD LESSONS
   ============================================================ */

async function loadLessons() {

    showLoading();


    /*
     * ========================================================
     * ONLINE
     * ========================================================
     */

    if (
        navigator.onLine
    ) {

        try {

            console.log(
                "AFC Isiu: Downloading latest lessons..."
            );


            const response =
                await fetch(
                    WEEKLY_LESSON_CSV,
                    {
                        method:
                            "GET",

                        cache:
                            "no-store"
                    }
                );


            if (
                !response.ok
            ) {

                throw new Error(
                    `Lesson request failed: ${response.status}`
                );

            }


            const csv =
                await response.text();


            if (
                !csv.trim()
            ) {

                throw new Error(
                    "The lesson spreadsheet returned no data."
                );

            }


            /*
             * PapaParse if available.
             */

            let parsedRows;


            if (
                window.Papa &&
                typeof Papa.parse ===
                    "function"
            ) {

                const result =
                    Papa.parse(
                        csv,
                        {
                            header:
                                true,

                            skipEmptyLines:
                                true
                        }
                    );


                parsedRows =
                    result.data;

            }

            else {

                parsedRows =
                    parseCSV(
                        csv
                    );

            }


            /*
             * Normalize.
             */

            const normalized =
                parsedRows
                    .map(
                        normalizeLesson
                    )
                    .filter(
                        lesson =>
                            lesson.Class ||
                            lesson.Topic ||
                            lesson.Summary
                    );


            if (
                !normalized.length
            ) {

                throw new Error(
                    "The spreadsheet was reached, but no valid lessons were found."
                );

            }


            lessons =
                normalized;


            /*
             * SAVE BOTH:
             *
             * IndexedDB
             * LocalStorage backup
             */

            await saveLessonsOffline(
                lessons
            );


            saveLessonsLocally(
                lessons
            );


            console.log(
                "AFC Isiu: Latest lessons loaded online.",
                lessons
            );


            switchClass(
                selectedClass
            );


            return;

        }

        catch (error) {

            console.warn(
                "AFC Isiu: Online lesson loading failed.",
                error
            );

        }

    }


    /*
     * ========================================================
     * OFFLINE
     * ========================================================
     */

    console.log(
        "AFC Isiu: Trying offline lesson storage..."
    );


    /*
     * First IndexedDB.
     */

    let offlineLessons =
        await getOfflineLessons();


    /*
     * If IndexedDB has nothing, use LocalStorage backup.
     */

    if (
        !offlineLessons.length
    ) {

        offlineLessons =
            getSavedLessons();

    }


    if (
        offlineLessons.length
    ) {

        lessons =
            offlineLessons;


        console.log(
            "AFC Isiu: Offline lessons loaded.",
            lessons
        );


        switchClass(
            selectedClass
        );


        return;

    }


    /*
     * Nothing has ever been downloaded.
     */

    showError(
        "No saved lessons are available on this device yet. Connect to the internet once to download the lessons."
    );

}


/* ============================================================
   READING PROGRESS
   ============================================================ */

let progressHandler =
    null;


function setupReadingProgress(
    lesson
) {

    if (
        progressHandler
    ) {

        window.removeEventListener(
            "scroll",
            progressHandler
        );

    }


    progressHandler =
        () => {

            const completed =
                isLessonCompleted(
                    lesson
                );


            if (
                completed
            ) {

                updateProgress(
                    100
                );

                return;

            }


            const scrollTop =
                window.scrollY ||
                document.documentElement.scrollTop ||
                0;


            const scrollHeight =
                document.documentElement
                    .scrollHeight;


            const viewportHeight =
                window.innerHeight;


            const total =
                Math.max(
                    scrollHeight -
                        viewportHeight,
                    1
                );


            const progress =
                Math.round(
                    (
                        scrollTop /
                        total
                    ) * 100
                );


            updateProgress(
                Math.max(
                    0,
                    Math.min(
                        100,
                        progress
                    )
                )
            );

        };


    window.addEventListener(
        "scroll",
        progressHandler,
        {
            passive:
                true
        }
    );


    setTimeout(
        progressHandler,
        100
    );

}


/* ============================================================
   UPDATE PROGRESS
   ============================================================ */

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
        progressBarEl
    ) {

        progressBarEl.style.width =
            `${value}%`;

    }


    if (
        mobileProgressBarEl
    ) {

        mobileProgressBarEl.style.width =
            `${value}%`;

    }


    if (
        progressPercentEl
    ) {

        progressPercentEl.textContent =
            `${value}%`;

    }


    if (
        mobileProgressPercentEl
    ) {

        mobileProgressPercentEl.textContent =
            `${value}%`;

    }


    if (
        progressTextEl
    ) {

        if (
            value >= 100
        ) {

            progressTextEl.textContent =
                "Lesson completed.";

        }

        else if (
            value >= 75
        ) {

            progressTextEl.textContent =
                "Almost there. Keep reading.";

        }

        else if (
            value >= 40
        ) {

            progressTextEl.textContent =
                "You're making good progress.";

        }

        else {

            progressTextEl.textContent =
                "Start reading this lesson.";

        }

    }

}


/* ============================================================
   COMPLETION STORAGE KEY
   ============================================================ */

function getCompletionKey(
    lesson
) {

    return (
        "lessonCompleted_" +
        cleanText(
            lesson.Class
        ) +
        "_" +
        cleanText(
            lesson.Lesson ||
            lesson.Topic
        )
    );

}


/* ============================================================
   IS COMPLETED
   ============================================================ */

function isLessonCompleted(
    lesson
) {

    if (
        !lesson
    ) {

        return false;

    }


    try {

        return (
            localStorage.getItem(
                getCompletionKey(
                    lesson
                )
            ) ===
            "true"
        );

    }

    catch (error) {

        return false;

    }

}


/* ============================================================
   UPDATE COMPLETION UI
   ============================================================ */

function updateCompletionUI(
    lesson
) {

    const completed =
        isLessonCompleted(
            lesson
        );


    const buttons = [
        finishReadingBtn,
        mobileFinishReadingBtn
    ].filter(
        Boolean
    );


    buttons.forEach(
        button => {

            button.classList.toggle(
                "completed",
                completed
            );


            if (
                completed
            ) {

                const strong =
                    button.querySelector(
                        ".finish-text strong"
                    );


                const small =
                    button.querySelector(
                        ".finish-text small"
                    );


                if (
                    strong
                ) {

                    strong.textContent =
                        "Lesson Completed";

                }


                if (
                    small
                ) {

                    small.textContent =
                        "Saved on this device";

                }

            }

        }
    );


    if (
        completed
    ) {

        updateProgress(
            100
        );

    }

}


/* ============================================================
   MARK LESSON COMPLETED
   ============================================================ */

function markLessonCompleted() {

    const lesson =
        findLesson(
            selectedClass
        );


    if (
        !lesson
    ) {

        return;

    }


    try {

        localStorage.setItem(
            getCompletionKey(
                lesson
            ),
            "true"
        );

    }

    catch (error) {

        console.warn(
            "AFC Lessons: Could not save completion.",
            error
        );

    }


    updateCompletionUI(
        lesson
    );


    /*
     * Notify the rest of the portal.
     */

    document.dispatchEvent(
        new CustomEvent(
            "afc:lesson-completed",
            {
                detail: {
                    lesson:
                        lesson
                }
            }
        )
    );


    console.log(
        "AFC Isiu: Lesson marked completed."
    );

}


/* ============================================================
   FINISH BUTTONS
   ============================================================ */

function setupFinishButtons() {

    [
        finishReadingBtn,
        mobileFinishReadingBtn
    ]
        .filter(
            Boolean
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        markLessonCompleted();

                    }
                );

            }
        );

}


/* ============================================================
   CLASS TAB EVENTS
   ============================================================ */

function setupClassTabs() {

    const tabs =
        document.querySelectorAll(
            ".class-tab, .lesson-tab, [data-class], [data-lesson-class]"
        );


    tabs.forEach(
        tab => {

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
                event => {

                    event.preventDefault();


                    const className =
                        cleanText(
                            tab.dataset.class ||
                            tab.dataset.lessonClass ||
                            tab.textContent
                        );


                    if (
                        className
                    ) {

                        switchClass(
                            className
                        );

                    }

                }
            );

        }
    );

}


/* ============================================================
   RETRY BUTTON
   ============================================================ */

function setupRetryButton() {

    const button =
        getElement(
            "retryLessons"
        );


    if (
        !button
    ) {

        return;

    }


    button.addEventListener(
        "click",
        event => {

            event.preventDefault();

            loadLessons();

        }
    );

}


/* ============================================================
   CONNECTION EVENTS
   ============================================================ */

function setupConnectionEvents() {

    window.addEventListener(
        "online",
        () => {

            console.log(
                "AFC Lessons: Connection restored."
            );


            /*
             * Refresh lessons when the internet comes back.
             */

            loadLessons();

        }
    );


    window.addEventListener(
        "offline",
        () => {

            console.log(
                "AFC Lessons: Device is offline."
            );

        }
    );

}


/* ============================================================
   INITIALIZE
   ============================================================ */

function initializeLessons() {

    setupClassTabs();

    setupFinishButtons();

    setupRetryButton();

    setupConnectionEvents();

    loadLessons();

}


/* ============================================================
   DOM READY
   ============================================================ */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeLessons,
        {
            once:
                true
        }
    );

}

else {

    initializeLessons();

}


/* ============================================================
   PUBLIC API
   ============================================================ */

window.AFCLessons = {

    getLessons:
        function () {

            return [
                ...lessons
            ];

        },


    getCurrentLesson:
        function () {

            return findLesson(
                selectedClass
            );

        },


    getSelectedClass:
        function () {

            return selectedClass;

        },


    refresh:
        function () {

            return loadLessons();

        },


    markCompleted:
        function () {

            markLessonCompleted();

        },


    isOfflineAvailable:
        function () {

            return (
                lessons.length >
                0
            );

        }

};
