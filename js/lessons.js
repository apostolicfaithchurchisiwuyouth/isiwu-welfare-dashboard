/* =========================================================
   AFC ISIU YOUTH PORTAL
   WEEKLY LESSONS
   PHASE 3B — OFFLINE LESSON SUPPORT
========================================================= */


/* =========================================================
   GOOGLE SHEETS
========================================================= */

const WEEKLY_LESSON_CSV =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=201183837&single=true&output=csv";


/* =========================================================
   LOCAL STORAGE
========================================================= */

const LESSON_STORAGE_KEY =
    "afc_isiu_weekly_lessons_v1";


/* =========================================================
   LESSON DATA
========================================================= */

let lessons = [];


/* =========================================================
   ELEMENTS
========================================================= */

const topicEl =
    document.getElementById("topic");

const metaEl =
    document.getElementById("meta");

const bibleTextEl =
    document.getElementById("bibleText");

const memoryVerseEl =
    document.getElementById("memoryVerse");

const summaryEl =
    document.getElementById("summary");

const discussionEl =
    document.getElementById("discussion");

const audioContainer =
    document.getElementById("yorubaAudioContainer");

const audioPlayer =
    document.getElementById("yorubaAudioPlayer");

const audioSource =
    document.getElementById("yorubaAudioSource");

const tabs =
    document.querySelectorAll(".tab");


/* =========================================================
   CSV PARSER
   Self-contained fallback parser so the lesson page does
   not completely depend on PapaParse being available.
========================================================= */

function parseCSV(text) {

    const rows = [];

    let row = [];

    let value = "";

    let insideQuotes = false;


    for (let i = 0; i < text.length; i++) {

        const char = text[i];

        const next = text[i + 1];


        if (char === '"') {

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

            row.push(value);

            value = "";

        }

        else if (
            (char === "\n" ||
             char === "\r") &&
            !insideQuotes
        ) {

            if (
                char === "\r" &&
                next === "\n"
            ) {

                i++;

            }


            row.push(value);

            rows.push(row);

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

        row.push(value);

        rows.push(row);

    }


    if (!rows.length) {

        return [];

    }


    const headers =
        rows[0].map(
            header =>
                header
                    .trim()
                    .replace(/^"|"$/g, "")
        );


    return rows
        .slice(1)
        .filter(
            row =>
                row.some(
                    cell =>
                        cell.trim() !== ""
                )
        )
        .map(row => {

            const object = {};

            headers.forEach(
                (header, index) => {

                    object[header] =
                        (
                            row[index] || ""
                        ).trim();

                }
            );

            return object;

        });

}


/* =========================================================
   SAVE LESSONS LOCALLY
========================================================= */

function saveLessonsLocally(data) {

    try {

        localStorage.setItem(

            LESSON_STORAGE_KEY,

            JSON.stringify({

                savedAt:
                    new Date().toISOString(),

                lessons:
                    data

            })

        );

        console.log(
            "AFC Isiu: Lessons saved locally."
        );

    }

    catch (error) {

        console.warn(
            "AFC Isiu: Unable to save lessons locally.",
            error
        );

    }

}


/* =========================================================
   GET SAVED LESSONS
========================================================= */

function getSavedLessons() {

    try {

        const saved =
            localStorage.getItem(
                LESSON_STORAGE_KEY
            );


        if (!saved) {

            return null;

        }


        const parsed =
            JSON.parse(saved);


        if (
            !parsed ||
            !Array.isArray(
                parsed.lessons
            )
        ) {

            return null;

        }


        return parsed;

    }

    catch (error) {

        console.warn(
            "AFC Isiu: Unable to read saved lessons.",
            error
        );

        return null;

    }

}


/* =========================================================
   LOAD LESSONS
========================================================= */

async function loadLessons() {

    showLoading();


    /*
    ---------------------------------------------------------
    FIRST: TRY INTERNET
    ---------------------------------------------------------
    */

    try {

        const response =
            await fetch(
                WEEKLY_LESSON_CSV,
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Unable to fetch lessons."
            );

        }


        const csv =
            await response.text();


        /*
        -----------------------------------------------------
        PARSE CSV
        -----------------------------------------------------
        */

        let result;


        /*
        Use PapaParse if it is available.
        Otherwise use our internal parser.
        */

        if (
            typeof Papa !== "undefined" &&
            typeof Papa.parse === "function"
        ) {

            result =
                Papa.parse(
                    csv,
                    {
                        header: true,
                        skipEmptyLines: true
                    }
                ).data;

        }

        else {

            result =
                parseCSV(csv);

        }


        /*
        -----------------------------------------------------
        CLEAN DATA
        -----------------------------------------------------
        */

        lessons =
            result.map(
                lesson => {

                    return {

                        Class:
                            (
                                lesson.Class ||
                                ""
                            ).trim(),

                        Topic:
                            (
                                lesson.Topic ||
                                ""
                            ).trim(),

                        BibleText:
                            (
                                lesson.BibleText ||
                                ""
                            ).trim(),

                        MemoryVerse:
                            (
                                lesson.MemoryVerse ||
                                ""
                            ).trim(),

                        Summary:
                            lesson.Summary ||
                            "",

                        Discussion:
                            lesson.Discussion ||
                            "",

                        YorubaAudio:
                            (
                                lesson.YorubaAudio ||
                                ""
                            ).trim()

                    };

                }
            );


        /*
        -----------------------------------------------------
        SAVE LOCALLY
        -----------------------------------------------------
        */

        saveLessonsLocally(
            lessons
        );


        /*
        -----------------------------------------------------
        DISPLAY SENIOR
        -----------------------------------------------------
        */

        switchClass("Senior");


        console.log(
            "AFC Isiu: Fresh lessons loaded online."
        );


    }

    catch (error) {

        console.warn(
            "AFC Isiu: Online lesson loading failed.",
            error
        );


        /*
        -----------------------------------------------------
        OFFLINE FALLBACK
        -----------------------------------------------------
        */

        const saved =
            getSavedLessons();


        if (
            saved &&
            saved.lessons.length
        ) {

            lessons =
                saved.lessons;


            switchClass("Senior");


            console.log(
                "AFC Isiu: Offline lesson loaded from local storage."
            );


            return;

        }


        /*
        -----------------------------------------------------
        NOTHING AVAILABLE
        -----------------------------------------------------
        */

        showError();

    }

}


/* =========================================================
   SHOW LOADING
========================================================= */

function showLoading() {

    topicEl.textContent =
        "Loading lessons...";

    metaEl.textContent =
        "";

    bibleTextEl.textContent =
        "";

    memoryVerseEl.textContent =
        "";

    summaryEl.textContent =
        "";

    discussionEl.textContent =
        "";

    audioContainer.style.display =
        "none";

}


/* =========================================================
   SHOW ERROR
========================================================= */

function showError() {

    topicEl.textContent =
        "Lesson unavailable";

    metaEl.textContent =
        "Connect to the internet once to save this lesson.";

    bibleTextEl.textContent =
        "";

    memoryVerseEl.textContent =
        "";

    summaryEl.textContent =
        "";

    discussionEl.textContent =
        "";

    audioContainer.style.display =
        "none";

}


/* =========================================================
   SWITCH CLASS
========================================================= */

function switchClass(className) {

    const lesson =
        lessons.find(
            item =>

                item.Class &&
                item.Class.trim() === className

        );


    if (!lesson) {

        topicEl.textContent =
            "Lesson unavailable";

        metaEl.textContent =
            className;

        bibleTextEl.textContent =
            "";

        memoryVerseEl.textContent =
            "";

        summaryEl.textContent =
            "";

        discussionEl.textContent =
            "";

        audioContainer.style.display =
            "none";

        return;

    }


    /* =====================================================
       TOP SECTION
    ===================================================== */

    topicEl.textContent =
        lesson.Topic || "";

    metaEl.textContent =
        `${className} Class`;


    /* =====================================================
       LESSON CONTENT
    ===================================================== */

    bibleTextEl.textContent =
        lesson.BibleText || "";

    memoryVerseEl.textContent =
        lesson.MemoryVerse || "";


    /*
    Summary intentionally uses innerHTML because your
    Google Sheet may contain formatted HTML content.
    */

    summaryEl.innerHTML =
        lesson.Summary || "";


    discussionEl.textContent =
        lesson.Discussion || "";


    /* =====================================================
       AUDIO
    ===================================================== */

    const audio =
        lesson.YorubaAudio;


    if (
        audio &&
        audio.trim() !== ""
    ) {

        audioSource.src =
            audio.trim();


        audioPlayer.load();


        audioContainer.style.display =
            "block";


        /*
        Let the service worker see the audio request
        when the browser loads it.
        */

        console.log(
            "AFC Isiu: Yoruba audio available:",
            audio
        );

    }

    else {

        audioSource.src =
            "";

        audioPlayer.load();

        audioContainer.style.display =
            "none";

    }


    /* =====================================================
       ACTIVE TAB
    ===================================================== */

    tabs.forEach(
        tab => {

            tab.classList.remove(
                "active"
            );


            if (
                tab.dataset.class ===
                className
            ) {

                tab.classList.add(
                    "active"
                );

            }

        }
    );

}


/* =========================================================
   TAB EVENTS
========================================================= */

tabs.forEach(
    tab => {

        tab.addEventListener(
            "click",
            () => {

                switchClass(
                    tab.dataset.class
                );

            }
        );

    }
);


/* =========================================================
   HEADER EFFECT
========================================================= */

const header =
    document.querySelector(
        ".main-header"
    );


if (header) {

    window.addEventListener(
        "scroll",
        () => {

            if (
                window.scrollY > 50
            ) {

                header.style.boxShadow =
                    "0 12px 40px rgba(0,0,0,.08)";

            }

            else {

                header.style.boxShadow =
                    "0 8px 30px rgba(0,0,0,.05)";

            }

        }
    );

}


/* =========================================================
   READING TIME
========================================================= */

function updateReadingTime() {

    const lesson =
        document.getElementById(
            "lessonContent"
        );


    const readingTime =
        document.getElementById(
            "readingTime"
        );


    if (
        !lesson ||
        !readingTime
    ) {

        return;

    }


    const text =
        lesson.innerText.trim();


    if (!text) {

        return;

    }


    const words =
        text
            .split(/\s+/)
            .length;


    const minutes =
        Math.max(
            1,
            Math.ceil(
                words / 200
            )
        );


    readingTime.textContent =
        minutes + " min";

}


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    loadLessons
);


window.addEventListener(
    "load",
    updateReadingTime
);
