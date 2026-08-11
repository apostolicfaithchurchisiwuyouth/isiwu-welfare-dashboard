/* =========================================================
   AFC ISIU YOUTH PORTAL
   WEEKLY LESSONS
   PHASE 3D — STABLE ONLINE + OFFLINE LESSONS
========================================================= */


/* =========================================================
   GOOGLE SHEETS
========================================================= */

const WEEKLY_LESSON_CSV =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=201183837&single=true&output=csv";


/* =========================================================
   STORAGE KEYS
========================================================= */

const LESSON_STORAGE_KEY =
    "afc_isiu_weekly_lessons_v2";

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
   PAGE ELEMENTS
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

    return new Promise(
        (resolve, reject) => {

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
                                keyPath: "id"
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


/* =========================================================
   SAVE TO INDEXEDDB
========================================================= */

async function saveLessonsOffline(
    lessonData
) {

    try {

        const db =
            await openLessonDB();


        return new Promise(
            (resolve, reject) => {

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


                transaction.oncomplete =
                    () => {

                        db.close();

                        console.log(
                            "AFC Isiu: Lessons saved to IndexedDB."
                        );

                        resolve();

                    };


                transaction.onerror =
                    () => {

                        db.close();

                        reject(
                            transaction.error
                        );

                    };

            }
        );

    }

    catch (error) {

        console.warn(
            "AFC Isiu: IndexedDB save failed.",
            error
        );

    }

}


/* =========================================================
   GET FROM INDEXEDDB
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


                request.onsuccess =
                    () => {

                        db.close();

                        resolve(
                            request.result || []
                        );

                    };


                request.onerror =
                    () => {

                        db.close();

                        reject(
                            request.error
                        );

                    };

            }
        );

    }

    catch (error) {

        console.warn(
            "AFC Isiu: IndexedDB read failed.",
            error
        );

        return [];

    }

}


/* =========================================================
   LOCAL STORAGE
========================================================= */

function saveLessonsLocally(
    data
) {

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
            "AFC Isiu: LocalStorage save failed.",
            error
        );

    }

}


function getSavedLessons() {

    try {

        const saved =
            localStorage.getItem(
                LESSON_STORAGE_KEY
            );


        if (!saved) {

            return [];

        }


        const parsed =
            JSON.parse(saved);


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
            "AFC Isiu: LocalStorage read failed.",
            error
        );

        return [];

    }

}


/* =========================================================
   NORMALIZE DATA
========================================================= */

function normalizeLessons(
    data
) {

    return data
        .map(
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
        )
        .filter(
            lesson =>
                lesson.Class ||
                lesson.Topic
        );

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

function showError(
    message
) {

    topicEl.textContent =
        "Unable to load lesson";

    metaEl.textContent =
        message ||
        "Please connect to the internet and try again.";

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
   LOAD ONLINE LESSONS
========================================================= */

async function loadOnlineLessons() {

    console.log(
        "AFC Isiu: Loading lessons from Google Sheets..."
    );


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
            `Google Sheets request failed: ${response.status}`
        );

    }


    const csv =
        await response.text();


    if (!csv.trim()) {

        throw new Error(
            "Google Sheets returned empty data."
        );

    }


    let parsedData = [];


    /* -----------------------------------------------------
       PAPAPARSE
    ----------------------------------------------------- */

    if (
        typeof Papa !== "undefined" &&
        typeof Papa.parse === "function"
    ) {

        console.log(
            "AFC Isiu: Parsing with PapaParse."
        );


        const result =
            Papa.parse(
                csv,
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
                "PapaParse warnings:",
                result.errors
            );

        }


        parsedData =
            result.data;

    }

    else {

        console.warn(
            "PapaParse unavailable."
        );


        parsedData =
            parseCSV(csv);

    }


    const cleanLessons =
        normalizeLessons(
            parsedData
        );


    if (
        !cleanLessons.length
    ) {

        throw new Error(
            "No lessons were found in Google Sheets."
        );

    }


    lessons =
        cleanLessons;


    console.log(
        "AFC Isiu: Online lessons successfully loaded.",
        lessons
    );


    /* -----------------------------------------------------
       SAVE BOTH STORAGE SYSTEMS
    ----------------------------------------------------- */

    saveLessonsLocally(
        lessons
    );


    await saveLessonsOffline(
        lessons
    );


    return true;

}


/* =========================================================
   FALLBACK CSV PARSER
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

            value +=
                char;

        }

    }


    if (
        value !== "" ||
        row.length
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
                header
                    .trim()
                    .replace(
                        /^"|"$/g,
                        ""
                    )
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
        .map(
            row => {

                const object = {};


                headers.forEach(
                    (
                        header,
                        index
                    ) => {

                        object[header] =
                            (
                                row[index] ||
                                ""
                            ).trim();

                    }
                );


                return object;

            }
        );

}


/* =========================================================
   MASTER LOADER
========================================================= */

async function loadLessons() {

    showLoading();


    /* =====================================================
       ONLINE
    ===================================================== */

    try {

        await loadOnlineLessons();


        switchClass(
            "Senior"
        );


        console.log(
            "AFC Isiu: Fresh online lesson displayed."
        );


        return;

    }

    catch (onlineError) {

        console.warn(
            "AFC Isiu: Online loading failed.",
            onlineError
        );

    }


    /* =====================================================
       INDEXEDDB
    ===================================================== */

    try {

        const offlineLessons =
            await getOfflineLessons();


        if (
            offlineLessons.length
        ) {

            lessons =
                normalizeLessons(
                    offlineLessons
                );


            switchClass(
                "Senior"
            );


            console.log(
                "AFC Isiu: Lesson loaded from IndexedDB."
            );


            return;

        }

    }

    catch (indexedError) {

        console.warn(
            "AFC Isiu: IndexedDB fallback failed.",
            indexedError
        );

    }


    /* =====================================================
       LOCAL STORAGE
    ===================================================== */

    try {

        const savedLessons =
            getSavedLessons();


        if (
            savedLessons.length
        ) {

            lessons =
                normalizeLessons(
                    savedLessons
                );


            switchClass(
                "Senior"
            );


            console.log(
                "AFC Isiu: Lesson loaded from LocalStorage."
            );


            return;

        }

    }

    catch (storageError) {

        console.warn(
            "AFC Isiu: LocalStorage fallback failed.",
            storageError
        );

    }


    /* =====================================================
       NOTHING AVAILABLE
    ===================================================== */

    showError(
        "Connect to the internet once to download this week's lesson."
    );

}


/* =========================================================
   SWITCH CLASS
========================================================= */

function switchClass(
    className
) {

    const lesson =
        lessons.find(
            item =>
                item.Class &&
                item.Class.trim()
                    .toLowerCase() ===
                className
                    .trim()
                    .toLowerCase()
        );


    if (!lesson) {

        console.warn(
            "AFC Isiu: Lesson not found:",
            className
        );


        topicEl.textContent =
            "Lesson unavailable";

        metaEl.textContent =
            `${className} Class`;

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
       TOPIC
    ===================================================== */

    topicEl.textContent =
        lesson.Topic || "";


    metaEl.textContent =
        `${className} Class`;


    /* =====================================================
       BIBLE TEXT
    ===================================================== */

    bibleTextEl.textContent =
        lesson.BibleText || "";


    /* =====================================================
       MEMORY VERSE
    ===================================================== */

    memoryVerseEl.textContent =
        lesson.MemoryVerse || "";


    /* =====================================================
       SUMMARY
    ===================================================== */

    summaryEl.innerHTML =
        lesson.Summary || "";


    /* =====================================================
       DISCUSSION
    ===================================================== */

    discussionEl.textContent =
        lesson.Discussion || "";


    /* =====================================================
       YORUBA AUDIO
    ===================================================== */

    if (
        lesson.YorubaAudio &&
        lesson.YorubaAudio.trim()
    ) {

        audioSource.src =
            lesson.YorubaAudio.trim();


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
                tab.dataset.class
                    .trim()
                    .toLowerCase() ===
                className
                    .trim()
                    .toLowerCase()
            ) {

                tab.classList.add(
                    "active"
                );

            }

        }
    );


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
        text.split(
            /\s+/
        ).length;


    const minutes =
        Math.max(
            1,
            Math.ceil(
                words / 200
            )
        );


    readingTime.textContent =
        `${minutes} min`;

}


/* =========================================================
   START
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        loadLessons
    );

}

else {

    loadLessons();

}


/* =========================================================
   DEBUG
========================================================= */

console.log(
    "AFC Isiu: lessons.js loaded — Phase 3D."
);
