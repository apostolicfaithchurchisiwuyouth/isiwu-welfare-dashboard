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
   INDEXEDDB
========================================================= */

const LESSON_DB_NAME =
    "AFC_Isiu_Lessons";

const LESSON_DB_VERSION =
    1;

const LESSON_STORE =
    "lessons";


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
   OPEN INDEXEDDB
========================================================= */

function openLessonDB() {

    return new Promise((resolve, reject) => {

        const request =
            indexedDB.open(
                LESSON_DB_NAME,
                LESSON_DB_VERSION
            );


        request.onupgradeneeded = event => {

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
                        keyPath: "id",
                        autoIncrement: true
                    }
                );

            }

        };


        request.onsuccess = () => {

            resolve(request.result);

        };


        request.onerror = () => {

            reject(request.error);

        };

    });

}


/* =========================================================
   SAVE LESSONS TO INDEXEDDB
========================================================= */

async function saveLessonsOffline(lessonData) {

    try {

        const db =
            await openLessonDB();


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
            (lesson, index) => {

                store.put({

                    id:
                        index + 1,

                    Class:
                        lesson.Class || "",

                    Topic:
                        lesson.Topic || "",

                    BibleText:
                        lesson.BibleText || "",

                    MemoryVerse:
                        lesson.MemoryVerse || "",

                    Summary:
                        lesson.Summary || "",

                    Discussion:
                        lesson.Discussion || "",

                    YorubaAudio:
                        lesson.YorubaAudio || ""

                });

            }
        );


        transaction.oncomplete = () => {

            console.log(
                "AFC Isiu: Lessons saved to IndexedDB."
            );

            db.close();

        };


        transaction.onerror = () => {

            console.error(
                "AFC Isiu: Unable to save lessons to IndexedDB.",
                transaction.error
            );

        };

    }

    catch (error) {

        console.error(
            "AFC Isiu: IndexedDB save error:",
            error
        );

    }

}


/* =========================================================
   GET LESSONS FROM INDEXEDDB
========================================================= */

async function getOfflineLessons() {

    try {

        const db =
            await openLessonDB();


        return new Promise(
            (resolve, reject) => {

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


                request.onsuccess = () => {

                    db.close();

                    resolve(
                        request.result || []
                    );

                };


                request.onerror = () => {

                    db.close();

                    reject(
                        request.error
                    );

                };

            }
        );

    }

    catch (error) {

        console.error(
            "AFC Isiu: Unable to retrieve offline lessons:",
            error
        );

        return [];

    }

}


/* =========================================================
   CSV PARSER FALLBACK
========================================================= */

function parseCSV(text) {

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
   NORMALIZE LESSON DATA
========================================================= */

function normalizeLessons(data) {

    return data
        .map(lesson => {

            return {

                Class:
                    (
                        lesson.Class || ""
                    ).trim(),

                Topic:
                    (
                        lesson.Topic || ""
                    ).trim(),

                BibleText:
                    (
                        lesson.BibleText || ""
                    ).trim(),

                MemoryVerse:
                    (
                        lesson.MemoryVerse || ""
                    ).trim(),

                Summary:
                    lesson.Summary || "",

                Discussion:
                    lesson.Discussion || "",

                YorubaAudio:
                    (
                        lesson.YorubaAudio || ""
                    ).trim()

            };

        })
        .filter(
            lesson =>
                lesson.Class ||
                lesson.Topic
        );

}


/* =========================================================
   SAVE TO LOCAL STORAGE
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
            "AFC Isiu: Lessons saved to LocalStorage."
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
   GET FROM LOCAL STORAGE
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
   ONLINE FIRST → INDEXEDDB → LOCALSTORAGE
========================================================= */

async function loadLessons() {

    showLoading();


    /* =====================================================
       1. TRY ONLINE FIRST
    ===================================================== */

    try {

        console.log(
            "AFC Isiu: Trying to load lessons online..."
        );


        const response =
            await fetch(
                WEEKLY_LESSON_CSV,
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP error: ${response.status}`
            );

        }


        const csv =
            await response.text();


        if (!csv.trim()) {

            throw new Error(
                "Google Sheets returned empty data."
            );

        }


        /* =================================================
           PARSE CSV
        ================================================= */

        let result;


        if (
            typeof Papa !== "undefined" &&
            typeof Papa.parse === "function"
        ) {

            console.log(
                "AFC Isiu: Using PapaParse."
            );


            const parsed =
                Papa.parse(
                    csv,
                    {
                        header: true,
                        skipEmptyLines: true
                    }
                );


            result =
                parsed.data;

        }

        else {

            console.log(
                "AFC Isiu: PapaParse unavailable. Using fallback parser."
            );


            result =
                parseCSV(csv);

        }


        /* =================================================
           NORMALIZE
        ================================================= */

        lessons =
            normalizeLessons(result);


        if (!lessons.length) {

            throw new Error(
                "No lesson records were found in the CSV."
            );

        }


        console.log(
            "AFC Isiu: Online lessons loaded.",
            lessons
        );


        /* =================================================
           SAVE OFFLINE
        ================================================= */

        saveLessonsLocally(
            lessons
        );


        await saveLessonsOffline(
            lessons
        );


        /* =================================================
           DISPLAY SENIOR
        ================================================= */

        switchClass(
            "Senior"
        );


        return;

    }

    catch (error) {

        console.warn(
            "AFC Isiu: Online lesson loading failed.",
            error
        );

    }


    /* =====================================================
       2. TRY INDEXEDDB
    ===================================================== */

    try {

        console.log(
            "AFC Isiu: Trying IndexedDB..."
        );


        const offlineLessons =
            await getOfflineLessons();


        if (
            offlineLessons &&
            offlineLessons.length > 0
        ) {

            lessons =
                normalizeLessons(
                    offlineLessons
                );


            console.log(
                "AFC Isiu: Lessons loaded from IndexedDB.",
                lessons
            );


            switchClass(
                "Senior"
            );


            return;

        }

    }

    catch (error) {

        console.warn(
            "AFC Isiu: IndexedDB unavailable.",
            error
        );

    }


    /* =====================================================
       3. TRY LOCAL STORAGE
    ===================================================== */

    try {

        console.log(
            "AFC Isiu: Trying LocalStorage..."
        );


        const saved =
            getSavedLessons();


        if (
            saved &&
            saved.lessons &&
            saved.lessons.length > 0
        ) {

            lessons =
                normalizeLessons(
                    saved.lessons
                );


            console.log(
                "AFC Isiu: Lessons loaded from LocalStorage.",
                lessons
            );


            switchClass(
                "Senior"
            );


            return;

        }

    }

    catch (error) {

        console.warn(
            "AFC Isiu: LocalStorage fallback failed.",
            error
        );

    }


    /* =====================================================
       4. NOTHING AVAILABLE
    ===================================================== */

    console.error(
        "AFC Isiu: No lesson data is available."
    );


    showError();

}


/* =========================================================
   SHOW LOADING
========================================================= */

function showLoading() {

    if (topicEl) {

        topicEl.textContent =
            "Loading lessons...";

    }


    if (metaEl) {

        metaEl.textContent =
            "";

    }


    if (bibleTextEl) {

        bibleTextEl.textContent =
            "";

    }


    if (memoryVerseEl) {

        memoryVerseEl.textContent =
            "";

    }


    if (summaryEl) {

        summaryEl.textContent =
            "";

    }


    if (discussionEl) {

        discussionEl.textContent =
            "";

    }


    if (audioContainer) {

        audioContainer.style.display =
            "none";

    }

}


/* =========================================================
   SHOW ERROR
========================================================= */

function showError() {

    if (topicEl) {

        topicEl.textContent =
            "Lesson unavailable";

    }


    if (metaEl) {

        metaEl.textContent =
            "Connect to the internet once to save this lesson.";

    }


    if (bibleTextEl) {

        bibleTextEl.textContent =
            "";

    }


    if (memoryVerseEl) {

        memoryVerseEl.textContent =
            "";

    }


    if (summaryEl) {

        summaryEl.textContent =
            "";

    }


    if (discussionEl) {

        discussionEl.textContent =
            "";

    }


    if (audioContainer) {

        audioContainer.style.display =
            "none";

    }

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

        console.warn(
            `AFC Isiu: No lesson found for ${className}.`,
            lessons
        );


        if (topicEl) {

            topicEl.textContent =
                "Lesson unavailable";

        }


        if (metaEl) {

            metaEl.textContent =
                `${className} Class`;

        }


        if (bibleTextEl) {

            bibleTextEl.textContent =
                "";

        }


        if (memoryVerseEl) {

            memoryVerseEl.textContent =
                "";

        }


        if (summaryEl) {

            summaryEl.textContent =
                "";

        }


        if (discussionEl) {

            discussionEl.textContent =
                "";

        }


        if (audioContainer) {

            audioContainer.style.display =
                "none";

        }


        return;

    }


    /* =====================================================
       TOP SECTION
    ===================================================== */

    if (topicEl) {

        topicEl.textContent =
            lesson.Topic || "";

    }


    if (metaEl) {

        metaEl.textContent =
            `${className} Class`;

    }


    /* =====================================================
       LESSON CONTENT
    ===================================================== */

    if (bibleTextEl) {

        bibleTextEl.textContent =
            lesson.BibleText || "";

    }


    if (memoryVerseEl) {

        memoryVerseEl.textContent =
            lesson.MemoryVerse || "";

    }


    if (summaryEl) {

        summaryEl.innerHTML =
            lesson.Summary || "";

    }


    if (discussionEl) {

        discussionEl.textContent =
            lesson.Discussion || "";

    }


    /* =====================================================
       YORUBA AUDIO
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


    /* =====================================================
       UPDATE READING TIME
    ===================================================== */

    updateReadingTime();

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

    const lessonContent =
        document.getElementById(
            "lessonContent"
        );


    const readingTime =
        document.getElementById(
            "readingTime"
        );


    if (
        !lessonContent ||
        !readingTime
    ) {

        return;

    }


    const text =
        lessonContent.innerText
            .trim();


    if (!text) {

        return;

    }


    const words =
        text.split(/\s+/).length;


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
    () => {

        loadLessons();

    }
);


/* =========================================================
   ALSO HANDLE PAGES THAT ARE ALREADY LOADED
========================================================= */

if (
    document.readyState === "interactive" ||
    document.readyState === "complete"
) {

    loadLessons();

}


/* =========================================================
   FINAL DEBUG MESSAGE
========================================================= */

console.log(
    "AFC Isiu Weekly Lessons JavaScript loaded successfully."
);
