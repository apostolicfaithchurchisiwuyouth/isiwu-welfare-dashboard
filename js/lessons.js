/* =========================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: lessons.js
   PURPOSE: WEEKLY LESSONS PAGE CONTROLLER

   FIXES:
   - Waits for DOM before accessing elements
   - Does not conflict with layout.js
   - Supports flexible Google Sheet headers
   - Supports online + IndexedDB + LocalStorage
   - Safe handling of missing DOM elements
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONFIG
    ===================================================== */

    const WEEKLY_LESSON_CSV =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=201183837&single=true&output=csv";


    const LESSON_STORAGE_KEY =
        "afc_isiu_weekly_lessons_v2";


    const LESSON_DB_NAME =
        "AFC_Isiu_Lessons";


    const LESSON_DB_VERSION =
        1;


    const LESSON_STORE =
        "lessons";


    /* =====================================================
       STATE
    ===================================================== */

    let lessons = [];


    let currentClass =
        "Senior";


    let elements =
        {};


    /* =====================================================
       START
    ===================================================== */

    document.addEventListener(

        "DOMContentLoaded",

        initLessonsPage

    );


    /* =====================================================
       INITIALIZE
    ===================================================== */

    async function initLessonsPage() {

        console.log(
            "AFC Isiu: Initializing lessons page..."
        );


        cacheElements();


        if (
            !elements.topic ||
            !elements.meta
        ) {

            console.error(
                "AFC Isiu: Required lesson elements were not found."
            );

            return;

        }


        bindTabEvents();


        await loadLessons();

    }


    /* =====================================================
       CACHE DOM ELEMENTS
    ===================================================== */

    function cacheElements() {

        elements = {

            topic:
                document.getElementById(
                    "topic"
                ),

            meta:
                document.getElementById(
                    "meta"
                ),

            bibleText:
                document.getElementById(
                    "bibleText"
                ),

            memoryVerse:
                document.getElementById(
                    "memoryVerse"
                ),

            summary:
                document.getElementById(
                    "summary"
                ),

            discussion:
                document.getElementById(
                    "discussion"
                ),

            audioContainer:
                document.getElementById(
                    "yorubaAudioContainer"
                ),

            audioPlayer:
                document.getElementById(
                    "yorubaAudioPlayer"
                ),

            audioSource:
                document.getElementById(
                    "yorubaAudioSource"
                ),

            lessonContent:
                document.getElementById(
                    "lessonContent"
                ),

            readingTime:
                document.getElementById(
                    "readingTime"
                ),

            tabs:
                Array.from(
                    document.querySelectorAll(
                        ".lessons-page .tab"
                    )
                )

        };


        console.log(
            "AFC Isiu: Lesson elements cached.",
            elements
        );

    }


    /* =====================================================
       TAB EVENTS
    ===================================================== */

    function bindTabEvents() {

        if (
            !elements.tabs.length
        ) {

            console.warn(
                "AFC Isiu: No lesson tabs found."
            );

            return;

        }


        elements.tabs.forEach(

            tab => {

                tab.addEventListener(

                    "click",

                    function () {

                        const className =
                            tab.dataset.class;


                        if (
                            !className
                        ) {

                            return;

                        }


                        currentClass =
                            className;


                        switchClass(
                            currentClass
                        );

                    }

                );

            }

        );

    }


    /* =====================================================
       OPEN INDEXEDDB
    ===================================================== */

    function openLessonDB() {

        return new Promise(

            function (
                resolve,
                reject
            ) {

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
                    function (
                        event
                    ) {

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
                    function () {

                        resolve(
                            request.result
                        );

                    };


                request.onerror =
                    function () {

                        reject(
                            request.error
                        );

                    };

            }

        );

    }


    /* =====================================================
       SAVE INDEXEDDB
    ===================================================== */

    async function saveLessonsOffline(
        lessonData
    ) {

        try {

            const db =
                await openLessonDB();


            return new Promise(

                function (
                    resolve,
                    reject
                ) {

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

                        function (
                            lesson,
                            index
                        ) {

                            store.put({

                                id:
                                    index + 1,

                                ...lesson

                            });

                        }

                    );


                    transaction.oncomplete =
                        function () {

                            db.close();

                            console.log(
                                "AFC Isiu: Lessons saved offline."
                            );

                            resolve();

                        };


                    transaction.onerror =
                        function () {

                            db.close();

                            reject(
                                transaction.error
                            );

                        };

                }

            );

        }

        catch (
            error
        ) {

            console.warn(
                "AFC Isiu: IndexedDB save failed.",
                error
            );

        }

    }


    /* =====================================================
       GET INDEXEDDB
    ===================================================== */

    async function getOfflineLessons() {

        try {

            const db =
                await openLessonDB();


            return new Promise(

                function (
                    resolve,
                    reject
                ) {

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
                        function () {

                            const data =
                                request.result ||
                                [];


                            db.close();


                            resolve(
                                data
                            );

                        };


                    request.onerror =
                        function () {

                            db.close();


                            reject(
                                request.error
                            );

                        };

                }

            );

        }

        catch (
            error
        ) {

            console.warn(
                "AFC Isiu: IndexedDB read failed.",
                error
            );


            return [];

        }

    }


    /* =====================================================
       LOCAL STORAGE SAVE
    ===================================================== */

    function saveLessonsLocally(
        lessonData
    ) {

        try {

            localStorage.setItem(

                LESSON_STORAGE_KEY,

                JSON.stringify({

                    savedAt:
                        new Date()
                            .toISOString(),

                    lessons:
                        lessonData

                })

            );

        }

        catch (
            error
        ) {

            console.warn(
                "AFC Isiu: LocalStorage save failed.",
                error
            );

        }

    }


    /* =====================================================
       LOCAL STORAGE GET
    ===================================================== */

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

        catch (
            error
        ) {

            console.warn(
                "AFC Isiu: LocalStorage read failed.",
                error
            );


            return [];

        }

    }


    /* =====================================================
       HELPER:
       GET VALUE FROM POSSIBLE HEADERS
    ===================================================== */

    function getField(
        row,
        possibleNames
    ) {

        if (
            !row ||
            typeof row !== "object"
        ) {

            return "";

        }


        const normalizedRow =
            {};


        Object.keys(
            row
        ).forEach(

            function (
                key
            ) {

                const normalizedKey =
                    String(
                        key
                    )

                        .replace(
                            /^\uFEFF/,
                            ""
                        )

                        .trim()

                        .toLowerCase()

                        .replace(
                            /[\s_-]+/g,
                            ""
                        );


                normalizedRow[
                    normalizedKey
                ] =
                    row[key];

            }

        );


        for (
            const name of possibleNames
        ) {

            const normalizedName =
                String(
                    name
                )

                    .trim()

                    .toLowerCase()

                    .replace(
                        /[\s_-]+/g,
                        ""
                    );


            if (
                Object.prototype.hasOwnProperty.call(

                    normalizedRow,

                    normalizedName

                )
            ) {

                return String(

                    normalizedRow[
                        normalizedName
                    ] ??
                    ""

                ).trim();

            }

        }


        return "";

    }


    /* =====================================================
       NORMALIZE LESSONS
    ===================================================== */

    function normalizeLessons(
        data
    ) {

        if (
            !Array.isArray(
                data
            )
        ) {

            return [];

        }


        return data

            .map(

                function (
                    lesson
                ) {

                    return {

                        Class:

                            getField(

                                lesson,

                                [

                                    "Class",
                                    "Lesson Class",
                                    "Category"

                                ]

                            ),


                        Topic:

                            getField(

                                lesson,

                                [

                                    "Topic",
                                    "Lesson Topic",
                                    "Title"

                                ]

                            ),


                        BibleText:

                            getField(

                                lesson,

                                [

                                    "BibleText",
                                    "Bible Text",
                                    "Bible Passage",
                                    "Text"

                                ]

                            ),


                        MemoryVerse:

                            getField(

                                lesson,

                                [

                                    "MemoryVerse",
                                    "Memory Verse"

                                ]

                            ),


                        Summary:

                            getField(

                                lesson,

                                [

                                    "Summary",
                                    "Lesson Summary",
                                    "Content"

                                ]

                            ),


                        Discussion:

                            getField(

                                lesson,

                                [

                                    "Discussion",
                                    "Discussion Questions",
                                    "Questions"

                                ]

                            ),


                        YorubaAudio:

                            getField(

                                lesson,

                                [

                                    "YorubaAudio",
                                    "Yoruba Audio",
                                    "Audio"

                                ]

                            )

                    };

                }

            )

            .filter(

                function (
                    lesson
                ) {

                    return (

                        lesson.Class ||
                        lesson.Topic

                    );

                }

            );

    }


    /* =====================================================
       LOADING STATE
    ===================================================== */

    function showLoading() {

        setText(

            elements.topic,

            "Loading lessons..."

        );


        setText(

            elements.meta,

            "Please wait..."

        );


        clearLessonContent();


        hideAudio();

    }


    /* =====================================================
       ERROR STATE
    ===================================================== */

    function showError(
        message
    ) {

        setText(

            elements.topic,

            "Lesson unavailable"

        );


        setText(

            elements.meta,

            message ||
            "Please check your internet connection."

        );


        clearLessonContent();


        hideAudio();

    }


    /* =====================================================
       CLEAR CONTENT
    ===================================================== */

    function clearLessonContent() {

        setText(
            elements.bibleText,
            ""
        );


        setText(
            elements.memoryVerse,
            ""
        );


        if (
            elements.summary
        ) {

            elements.summary.innerHTML =
                "";

        }


        setText(
            elements.discussion,
            ""
        );

    }


    /* =====================================================
       SAFE TEXT HELPER
    ===================================================== */

    function setText(
        element,
        value
    ) {

        if (
            element
        ) {

            element.textContent =
                value || "";

        }

    }


    /* =====================================================
       LOAD ONLINE LESSONS
    ===================================================== */

    async function loadOnlineLessons() {

        console.log(
            "AFC Isiu: Fetching lessons from Google Sheets..."
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

                `Google Sheets request failed: ${response.status}`

            );

        }


        const csv =
            await response.text();


        if (
            !csv ||
            !csv.trim()
        ) {

            throw new Error(
                "Google Sheets returned empty data."
            );

        }


        console.log(
            "AFC Isiu: CSV received."
        );


        let parsedData =
            [];


        if (
            typeof Papa !==
            "undefined"
            &&
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


            parsedData =
                result.data ||
                [];


            if (
                result.errors &&
                result.errors.length
            ) {

                console.warn(
                    "AFC Isiu: PapaParse warnings.",
                    result.errors
                );

            }

        }

        else {

            parsedData =
                parseCSV(
                    csv
                );

        }


        console.log(
            "AFC Isiu: Parsed lessons.",
            parsedData
        );


        const cleanLessons =
            normalizeLessons(
                parsedData
            );


        console.log(
            "AFC Isiu: Normalized lessons.",
            cleanLessons
        );


        if (
            !cleanLessons.length
        ) {

            throw new Error(
                "No valid lessons were found."
            );

        }


        lessons =
            cleanLessons;


        saveLessonsLocally(
            lessons
        );


        saveLessonsOffline(
            lessons
        );


        return lessons;

    }


    /* =====================================================
       CSV FALLBACK PARSER
    ===================================================== */

    function parseCSV(
        text
    ) {

        const rows =
            [];


        let row =
            [];


        let value =
            "";


        let insideQuotes =
            false;


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

                    insideQuotes

                    &&

                    next === '"'

                ) {

                    value +=
                        '"';


                    i++;

                }

                else {

                    insideQuotes =
                        !insideQuotes;

                }

            }

            else if (

                char === ","

                &&

                !insideQuotes

            ) {

                row.push(
                    value
                );


                value =
                    "";

            }

            else if (

                (
                    char === "\n"

                    ||

                    char === "\r"
                )

                &&

                !insideQuotes

            ) {

                if (

                    char === "\r"

                    &&

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


                row =
                    [];


                value =
                    "";

            }

            else {

                value +=
                    char;

            }

        }


        if (

            value !== ""

            ||

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

                function (
                    header
                ) {

                    return String(
                        header
                    )

                        .replace(
                            /^\uFEFF/,
                            ""
                        )

                        .trim();

                }

            );


        return rows

            .slice(
                1
            )

            .filter(

                function (
                    dataRow
                ) {

                    return dataRow.some(

                        function (
                            cell
                        ) {

                            return String(
                                cell
                            ).trim() !== "";

                        }

                    );

                }

            )

            .map(

                function (
                    dataRow
                ) {

                    const object =
                        {};


                    headers.forEach(

                        function (

                            header,

                            index

                        ) {

                            object[
                                header
                            ] =

                                String(

                                    dataRow[index]
                                    ??
                                    ""

                                ).trim();

                        }

                    );


                    return object;

                }

            );

    }


    /* =====================================================
       MASTER LOADER
    ===================================================== */

    async function loadLessons() {

        showLoading();


        /* ONLINE */

        try {

            await loadOnlineLessons();


            displayBestAvailableClass();


            console.log(
                "AFC Isiu: Online lessons loaded successfully."
            );


            return;

        }

        catch (
            onlineError
        ) {

            console.warn(
                "AFC Isiu: Online loading failed.",
                onlineError
            );

        }


        /* INDEXEDDB */

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


                displayBestAvailableClass();


                console.log(
                    "AFC Isiu: Loaded lessons from IndexedDB."
                );


                return;

            }

        }

        catch (
            error
        ) {

            console.warn(
                "AFC Isiu: IndexedDB fallback failed.",
                error
            );

        }


        /* LOCAL STORAGE */

        const savedLessons =
            getSavedLessons();


        if (
            savedLessons.length
        ) {

            lessons =
                normalizeLessons(
                    savedLessons
                );


            displayBestAvailableClass();


            console.log(
                "AFC Isiu: Loaded lessons from LocalStorage."
            );


            return;

        }


        /* NOTHING */

        showError(

            "Connect to the internet once to download the latest lesson."

        );

    }


    /* =====================================================
       DISPLAY BEST AVAILABLE CLASS
    ===================================================== */

    function displayBestAvailableClass() {

        const preferred =
            lessons.find(

                lesson =>

                    normalizeClassName(
                        lesson.Class
                    ) ===
                    normalizeClassName(
                        currentClass
                    )

            );


        if (
            preferred
        ) {

            switchClass(
                currentClass
            );

            return;

        }


        if (
            lessons.length
        ) {

            currentClass =
                lessons[0].Class;


            switchClass(
                currentClass
            );

        }

    }


    /* =====================================================
       NORMALIZE CLASS NAME
    ===================================================== */

    function normalizeClassName(
        value
    ) {

        return String(

            value ||
            ""

        )

            .trim()

            .toLowerCase();

    }


    /* =====================================================
       SWITCH CLASS
    ===================================================== */

    function switchClass(
        className
    ) {

        if (
            !className
        ) {

            return;

        }


        currentClass =
            className;


        const lesson =
            lessons.find(

                item =>

                    normalizeClassName(
                        item.Class
                    ) ===

                    normalizeClassName(
                        className
                    )

            );


        if (
            !lesson
        ) {

            console.warn(
                "AFC Isiu: Lesson not found for class:",
                className
            );


            showError(
                `${className} lesson is not available yet.`
            );


            updateActiveTab(
                className
            );


            return;

        }


        /* TOPIC */

        setText(

            elements.topic,

            lesson.Topic

        );


        /* META */

        setText(

            elements.meta,

            `${lesson.Class || className} Class`

        );


        /* BIBLE TEXT */

        setText(

            elements.bibleText,

            lesson.BibleText

        );


        /* MEMORY VERSE */

        setText(

            elements.memoryVerse,

            lesson.MemoryVerse

        );


        /* SUMMARY */

        if (
            elements.summary
        ) {

            /*
             * Summary comes from your
             * lesson content.
             */

            elements.summary.innerHTML =
                lesson.Summary || "";

        }


        /* DISCUSSION */

        setText(

            elements.discussion,

            lesson.Discussion

        );


        /* AUDIO */

        updateAudio(
            lesson.YorubaAudio
        );


        /* ACTIVE TAB */

        updateActiveTab(
            className
        );


        /* READING TIME */

        updateReadingTime();


        console.log(
            "AFC Isiu: Displaying lesson:",
            lesson
        );

    }


    /* =====================================================
       ACTIVE TAB
    ===================================================== */

    function updateActiveTab(
        className
    ) {

        elements.tabs.forEach(

            function (
                tab
            ) {

                const tabClass =
                    tab.dataset.class ||
                    "";


                const active =

                    normalizeClassName(
                        tabClass
                    )

                    ===

                    normalizeClassName(
                        className
                    );


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


    /* =====================================================
       AUDIO
    ===================================================== */

    function updateAudio(
        audioURL
    ) {

        if (

            !elements.audioContainer

            ||

            !elements.audioPlayer

            ||

            !elements.audioSource

        ) {

            return;

        }


        const cleanURL =
            String(
                audioURL ||
                ""
            ).trim();


        if (
            cleanURL
        ) {

            elements.audioSource.src =
                cleanURL;


            elements.audioPlayer.load();


            elements.audioContainer.style.display =
                "block";

        }

        else {

            hideAudio();

        }

    }


    function hideAudio() {

        if (

            elements.audioSource

        ) {

            elements.audioSource.removeAttribute(
                "src"
            );

        }


        if (

            elements.audioPlayer

        ) {

            elements.audioPlayer.load();

        }


        if (

            elements.audioContainer

        ) {

            elements.audioContainer.style.display =
                "none";

        }

    }


    /* =====================================================
       READING TIME
    ===================================================== */

    function updateReadingTime() {

        if (

            !elements.lessonContent

            ||

            !elements.readingTime

        ) {

            return;

        }


        const text =
            elements.lessonContent.innerText
                .trim();


        if (
            !text
        ) {

            elements.readingTime.textContent =
                "";

            return;

        }


        const words =
            text

                .split(
                    /\s+/
                )

                .filter(
                    Boolean
                )

                .length;


        const minutes =
            Math.max(

                1,

                Math.ceil(
                    words / 200
                )

            );


        elements.readingTime.textContent =
            `${minutes} min read`;

    }


    /* =====================================================
       DEBUG
    ===================================================== */

    console.log(
        "AFC Isiu: lessons.js loaded successfully."
    );


})();
