/* ============================================================
   AFC ISIU YOUTH PORTAL
   FILE: lessons.js
   PURPOSE: WEEKLY LESSONS CONTROLLER

   FEATURES:
   - Loads lessons from Google Sheets
   - Supports Senior, Junior and Elementary
   - IndexedDB offline cache
   - LocalStorage fallback
   - Reading time calculation
   - Reading progress
   - Public lesson reading
   - Login-aware completion button
============================================================ */

(function () {

    "use strict";


    /* ========================================================
       CONFIGURATION
    ======================================================== */

    const WEEKLY_LESSON_CSV =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=201183837&single=true&output=csv";


    const LESSON_STORAGE_KEY =
        "afc_isiu_weekly_lessons_v3";


    const LESSON_DB_NAME =
        "AFC_Isiu_Lessons";


    const LESSON_DB_VERSION =
        1;


    const LESSON_STORE =
        "lessons";


    /* ========================================================
       STATE
    ======================================================== */

    let lessons = [];

    let activeClass = "Senior";

    let currentLesson = null;

    let progressListenerAttached = false;


    /* ========================================================
       DOM HELPERS
    ======================================================== */

    function $(id) {

        return document.getElementById(id);

    }


    const elements = {

        lessonWeek:
            $("lessonWeek"),

        loading:
            $("lessonsLoading"),

        error:
            $("lessonsError"),

        errorMessage:
            $("lessonsErrorMessage"),

        retryButton:
            $("retryLessons"),

        lessonView:
            $("lessonView"),

        classTabs:
            document.querySelectorAll(".class-tab"),

        classBadge:
            $("lessonClassBadge"),

        status:
            $("lessonStatus"),

        title:
            $("lessonTitle"),

        theme:
            $("lessonTheme"),

        bibleText:
            $("lessonBibleText"),

        lessonNumber:
            $("lessonNumber"),

        lessonDate:
            $("lessonDate"),

        memoryVerse:
            $("lessonMemoryVerse"),

        content:
            $("lessonContent"),

        readingTime:
            $("readingTime"),

        mobileReadingTime:
            $("mobileReadingTime"),

        sectionCount:
            $("sectionCount"),

        mobileSectionCount:
            $("mobileSectionCount"),

        progressPercent:
            $("progressPercent"),

        mobileProgressPercent:
            $("mobileProgressPercent"),

        progressBar:
            $("progressBar"),

        mobileProgressBar:
            $("mobileProgressBar"),

        progressText:
            $("progressText"),

        finishButton:
            $("finishReadingBtn"),

        mobileFinishButton:
            $("mobileFinishReadingBtn")

    };


    /* ========================================================
       SAFE TEXT
    ======================================================== */

    function cleanText(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }


        return String(value).trim();

    }


    /* ========================================================
       NORMALIZE COLUMN NAME
    ======================================================== */

    function normalizeKey(key) {

        return cleanText(key)

            .toLowerCase()

            .replace(/[^a-z0-9]/g, "");

    }


    /* ========================================================
       GET COLUMN VALUE

       Allows different Google Sheet column names.
    ======================================================== */

    function getValue(
        row,
        possibleKeys
    ) {

        if (!row) {

            return "";

        }


        const normalizedRow = {};


        Object.keys(row).forEach(
            key => {

                normalizedRow[
                    normalizeKey(key)
                ] = row[key];

            }
        );


        for (
            const key of possibleKeys
        ) {

            const normalizedKey =
                normalizeKey(key);


            if (
                normalizedRow[
                    normalizedKey
                ] !== undefined
            ) {

                return cleanText(
                    normalizedRow[
                        normalizedKey
                    ]
                );

            }

        }


        return "";

    }


    /* ========================================================
       NORMALIZE LESSON DATA
    ======================================================== */

    function normalizeLessons(data) {

        if (
            !Array.isArray(data)
        ) {

            return [];

        }


        return data

            .map(
                row => {

                    return {

                        Class:

                            getValue(
                                row,
                                [
                                    "Class",
                                    "Lesson Class",
                                    "Category"
                                ]
                            ),


                        Topic:

                            getValue(
                                row,
                                [
                                    "Topic",
                                    "Lesson Topic",
                                    "Title"
                                ]
                            ),


                        BibleText:

                            getValue(
                                row,
                                [
                                    "BibleText",
                                    "Bible Text",
                                    "Bible Passage"
                                ]
                            ),


                        MemoryVerse:

                            getValue(
                                row,
                                [
                                    "MemoryVerse",
                                    "Memory Verse"
                                ]
                            ),


                        Summary:

                            getValue(
                                row,
                                [
                                    "Summary",
                                    "Lesson Content",
                                    "Content",
                                    "Lesson"
                                ]
                            ),


                        Discussion:

                            getValue(
                                row,
                                [
                                    "Discussion",
                                    "Discussion Questions",
                                    "Questions"
                                ]
                            ),


                        Theme:

                            getValue(
                                row,
                                [
                                    "Theme",
                                    "Lesson Theme",
                                    "Introduction"
                                ]
                            ),


                        LessonNumber:

                            getValue(
                                row,
                                [
                                    "LessonNumber",
                                    "Lesson Number",
                                    "Number"
                                ]
                            ),


                        Date:

                            getValue(
                                row,
                                [
                                    "Date",
                                    "Week",
                                    "Lesson Date"
                                ]
                            )

                    };

                }
            )

            .filter(
                lesson =>
                    lesson.Class ||
                    lesson.Topic ||
                    lesson.Summary
            );

    }


    /* ========================================================
       SHOW LOADING
    ======================================================== */

    function showLoading() {

        if (elements.loading) {

            elements.loading.hidden = false;

        }


        if (elements.error) {

            elements.error.hidden = true;

        }


        if (elements.lessonView) {

            elements.lessonView.hidden = true;

        }

    }


    /* ========================================================
       SHOW ERROR
    ======================================================== */

    function showError(message) {

        if (elements.loading) {

            elements.loading.hidden = true;

        }


        if (elements.lessonView) {

            elements.lessonView.hidden = true;

        }


        if (elements.error) {

            elements.error.hidden = false;

        }


        if (elements.errorMessage) {

            elements.errorMessage.textContent =
                message ||
                "Please check your internet connection and try again.";

        }

    }


    /* ========================================================
       SHOW LESSON
    ======================================================== */

    function showLesson() {

        if (elements.loading) {

            elements.loading.hidden = true;

        }


        if (elements.error) {

            elements.error.hidden = true;

        }


        if (elements.lessonView) {

            elements.lessonView.hidden = false;

        }

    }


    /* ========================================================
       INDEXEDDB
    ======================================================== */

    function openLessonDB() {

        return new Promise(
            (resolve, reject) => {

                if (
                    !("indexedDB" in window)
                ) {

                    reject(
                        new Error(
                            "IndexedDB is not supported."
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


    /* ========================================================
       SAVE INDEXEDDB
    ======================================================== */

    async function saveLessonsOffline(data) {

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


                    data.forEach(
                        (
                            lesson,
                            index
                        ) => {

                            store.put({

                                id:
                                    index + 1,

                                data:
                                    lesson

                            });

                        }
                    );


                    transaction.oncomplete =
                        () => {

                            db.close();

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
                "Lessons: IndexedDB save failed.",
                error
            );

        }

    }


    /* ========================================================
       GET INDEXEDDB
    ======================================================== */

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

                            const records =
                                request.result || [];


                            const data =
                                records.map(
                                    item =>
                                        item.data || item
                                );


                            db.close();

                            resolve(data);

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
                "Lessons: IndexedDB read failed.",
                error
            );

            return [];

        }

    }


    /* ========================================================
       LOCAL STORAGE
    ======================================================== */

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

        }

        catch (error) {

            console.warn(
                "Lessons: LocalStorage save failed.",
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
                "Lessons: LocalStorage read failed.",
                error
            );

            return [];

        }

    }


    /* ========================================================
       LOAD ONLINE LESSONS
    ======================================================== */

    async function loadOnlineLessons() {

        console.log(
            "Lessons: Loading Google Sheet..."
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
                `Lesson request failed (${response.status})`
            );

        }


        const csv =
            await response.text();


        if (!csv.trim()) {

            throw new Error(
                "The lesson sheet returned no data."
            );

        }


        let parsedData = [];


        if (
            typeof Papa !== "undefined" &&
            typeof Papa.parse === "function"
        ) {

            const result =
                Papa.parse(
                    csv,
                    {
                        header: true,

                        skipEmptyLines:
                            "greedy"
                    }
                );


            parsedData =
                result.data || [];


            if (
                result.errors &&
                result.errors.length
            ) {

                console.warn(
                    "PapaParse warnings:",
                    result.errors
                );

            }

        }

        else {

            parsedData =
                parseCSV(csv);

        }


        const cleanLessons =
            normalizeLessons(
                parsedData
            );


        console.log(
            "Parsed Lessons:",
            cleanLessons
        );


        if (
            !cleanLessons.length
        ) {

            throw new Error(
                "No lesson records were found."
            );

        }


        lessons =
            cleanLessons;


        saveLessonsLocally(
            lessons
        );


        await saveLessonsOffline(
            lessons
        );


        return lessons;

    }


    /* ========================================================
       FALLBACK CSV PARSER
    ======================================================== */

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
            value ||
            row.length
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
                    cleanText(header)
            );


        return rows

            .slice(1)

            .filter(
                row =>
                    row.some(
                        cell =>
                            cleanText(cell)
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
                                row[index] || "";

                        }
                    );


                    return object;

                }
            );

    }


    /* ========================================================
       FIND LESSON BY CLASS
    ======================================================== */

    function findLesson(className) {

        const target =
            cleanText(
                className
            ).toLowerCase();


        return lessons.find(
            lesson =>
                cleanText(
                    lesson.Class
                ).toLowerCase() ===
                target
        );

    }


    /* ========================================================
       FORMAT LESSON CONTENT
    ======================================================== */

    function formatLessonContent(content) {

        const text =
            cleanText(content);


        if (!text) {

            return `
                <div class="empty-lesson-content">
                    <i class="fa-solid fa-book-open"></i>
                    <p>
                        Lesson content is not available yet.
                    </p>
                </div>
            `;

        }


        /*
        If the sheet already contains HTML,
        allow only the stored structure.
        */

        if (
            /<\/?[a-z][\s\S]*>/i.test(
                text
            )
        ) {

            return text;

        }


        const sections =
            text

                .split(
                    /\n\s*\n/
                )

                .filter(
                    section =>
                        section.trim()
                );


        if (
            sections.length > 1
        ) {

            return sections

                .map(
                    section =>
                        `<p>${escapeHTML(
                            section
                        ).replace(
                            /\n/g,
                            "<br>"
                        )}</p>`
                )

                .join("");

        }


        return `<p>${
            escapeHTML(text)
                .replace(
                    /\n/g,
                    "<br>"
                )
        }</p>`;

    }


    /* ========================================================
       ESCAPE HTML
    ======================================================== */

    function escapeHTML(text) {

        const div =
            document.createElement(
                "div"
            );


        div.textContent =
            text;


        return div.innerHTML;

    }


    /* ========================================================
       RENDER LESSON
    ======================================================== */

    function renderLesson(lesson) {

        if (!lesson) {

            showError(
                `${activeClass} lesson is not available yet.`
            );

            return;

        }


        currentLesson =
            lesson;


        showLesson();


        /* -----------------------------------------------
           CLASS BADGE
        ----------------------------------------------- */

        if (elements.classBadge) {

            elements.classBadge.textContent =
                activeClass.toUpperCase();

        }


        /* -----------------------------------------------
           STATUS
        ----------------------------------------------- */

        if (elements.status) {

            elements.status.textContent =
                "THIS WEEK";

        }


        /* -----------------------------------------------
           TITLE
        ----------------------------------------------- */

        if (elements.title) {

            elements.title.textContent =
                lesson.Topic ||
                "Weekly Lesson";

        }


        /* -----------------------------------------------
           THEME
        ----------------------------------------------- */

        if (elements.theme) {

            elements.theme.textContent =
                lesson.Theme ||
                "Study, learn and grow in the knowledge of God's Word.";

        }


        /* -----------------------------------------------
           BIBLE TEXT
        ----------------------------------------------- */

        if (elements.bibleText) {

            elements.bibleText.textContent =
                lesson.BibleText ||
                "—";

        }


        /* -----------------------------------------------
           LESSON NUMBER
        ----------------------------------------------- */

        if (elements.lessonNumber) {

            elements.lessonNumber.textContent =
                lesson.LessonNumber ||
                "Weekly Study";

        }


        /* -----------------------------------------------
           DATE
        ----------------------------------------------- */

        if (elements.lessonDate) {

            elements.lessonDate.textContent =
                lesson.Date ||
                "This Week";

        }


        /* -----------------------------------------------
           MEMORY VERSE
        ----------------------------------------------- */

        if (elements.memoryVerse) {

            elements.memoryVerse.textContent =
                lesson.MemoryVerse ||
                "—";

        }


        /* -----------------------------------------------
           CONTENT
        ----------------------------------------------- */

        if (elements.content) {

            let contentHTML =
                formatLessonContent(
                    lesson.Summary
                );


            /*
            Add discussion if available
            */

            if (
                lesson.Discussion
            ) {

                contentHTML += `

                    <section class="lesson-discussion">

                        <div class="discussion-heading">

                            <i class="fa-solid fa-comments"></i>

                            <h3>
                                Discussion & Reflection
                            </h3>

                        </div>

                        <div class="discussion-content">
                            ${
                                formatLessonContent(
                                    lesson.Discussion
                                )
                            }
                        </div>

                    </section>

                `;

            }


            elements.content.innerHTML =
                contentHTML;

        }


        /* -----------------------------------------------
           WEEK HEADER
        ----------------------------------------------- */

        updateWeekDisplay(
            lesson
        );


        /* -----------------------------------------------
           ACTIVE TAB
        ----------------------------------------------- */

        updateActiveTab();


        /* -----------------------------------------------
           READING DETAILS
        ----------------------------------------------- */

        updateReadingDetails();


        /* -----------------------------------------------
           RESET PROGRESS
        ----------------------------------------------- */

        updateReadingProgress();

    }


    /* ========================================================
       UPDATE ACTIVE TAB
    ======================================================== */

    function updateActiveTab() {

        elements.classTabs.forEach(
            tab => {

                const tabClass =
                    cleanText(
                        tab.dataset.class
                    );


                tab.classList.toggle(

                    "active",

                    tabClass.toLowerCase() ===
                    activeClass.toLowerCase()

                );

            }
        );

    }


    /* ========================================================
       UPDATE WEEK DISPLAY
    ======================================================== */

    function updateWeekDisplay(lesson) {

        if (
            !elements.lessonWeek
        ) {

            return;

        }


        const span =
            elements.lessonWeek.querySelector(
                "span"
            );


        if (!span) {

            return;

        }


        span.textContent =
            lesson.Date ||
            "This week's lesson";

    }


    /* ========================================================
       READING DETAILS
    ======================================================== */

    function updateReadingDetails() {

        if (
            !elements.content
        ) {

            return;

        }


        const text =
            elements.content.innerText
                .trim();


        const words =
            text
                ? text.split(/\s+/).length
                : 0;


        const minutes =
            Math.max(
                1,
                Math.ceil(
                    words / 200
                )
            );


        const sections =
            getSectionCount();


        if (elements.readingTime) {

            elements.readingTime.textContent =
                `${minutes} min`;

        }


        if (elements.mobileReadingTime) {

            elements.mobileReadingTime.textContent =
                `${minutes} min`;

        }


        if (elements.sectionCount) {

            elements.sectionCount.textContent =
                sections;

        }


        if (elements.mobileSectionCount) {

            elements.mobileSectionCount.textContent =
                sections;

        }

    }


    /* ========================================================
       GET SECTION COUNT
    ======================================================== */

    function getSectionCount() {

        if (
            !elements.content
        ) {

            return 0;

        }


        const headings =
            elements.content.querySelectorAll(
                "h1, h2, h3, h4"
            );


        const paragraphs =
            elements.content.querySelectorAll(
                "p"
            );


        if (
            headings.length
        ) {

            return headings.length;

        }


        return Math.max(
            1,
            Math.ceil(
                paragraphs.length / 3
            )
        );

    }


    /* ========================================================
       SWITCH CLASS
    ======================================================== */

    function switchClass(className) {

        activeClass =
            cleanText(
                className
            );


        const lesson =
            findLesson(
                activeClass
            );


        if (!lesson) {

            showError(
                `${activeClass} lesson is not available for this week yet.`
            );

            updateActiveTab();

            return;

        }


        renderLesson(
            lesson
        );


        /*
        Scroll lesson into view on mobile
        */

        if (
            window.innerWidth <= 700
        ) {

            window.scrollTo({

                top: 0,

                behavior:
                    "smooth"

            });

        }

    }


    /* ========================================================
       READING PROGRESS
    ======================================================== */

    function updateReadingProgress() {

        if (
            !elements.lessonView ||
            elements.lessonView.hidden
        ) {

            return;

        }


        if (
            !elements.content
        ) {

            return;

        }


        const rect =
            elements.content.getBoundingClientRect();


        const windowHeight =
            window.innerHeight;


        const contentHeight =
            Math.max(
                rect.height,
                1
            );


        const visibleStart =
            Math.max(
                0,
                windowHeight - rect.top
            );


        let percent =
            Math.round(

                (
                    visibleStart /
                    contentHeight
                ) * 100

            );


        percent =
            Math.max(
                0,
                Math.min(
                    100,
                    percent
                )
            );


        if (
            window.scrollY <= 20
        ) {

            percent = 0;

        }


        if (elements.progressPercent) {

            elements.progressPercent.textContent =
                `${percent}%`;

        }


        if (
            elements.mobileProgressPercent
        ) {

            elements.mobileProgressPercent.textContent =
                `${percent}%`;

        }


        if (elements.progressBar) {

            elements.progressBar.style.width =
                `${percent}%`;

        }


        if (
            elements.mobileProgressBar
        ) {

            elements.mobileProgressBar.style.width =
                `${percent}%`;

        }


        if (elements.progressText) {

            if (percent === 0) {

                elements.progressText.textContent =
                    "Start reading this lesson.";

            }

            else if (percent < 50) {

                elements.progressText.textContent =
                    "Keep reading. You're making progress.";

            }

            else if (percent < 100) {

                elements.progressText.textContent =
                    "Almost there. Continue studying.";

            }

            else {

                elements.progressText.textContent =
                    "You've reached the end of this lesson.";

            }

        }

    }


    /* ========================================================
       FINISH READING
    ======================================================== */

    function handleFinishReading() {

        /*
        Authentication will be connected
        to the portal's real auth system.
        */

        const isLoggedIn =
            checkLoginStatus();


        if (!isLoggedIn) {

            showLoginRequired();

            return;

        }


        markLessonCompleted();

    }


    /* ========================================================
       CHECK LOGIN STATUS
    ======================================================== */

    function checkLoginStatus() {

        /*
        Support possible authentication keys.
        The main authentication system can later
        expose window.AFCAuth or another method.
        */

        if (
            window.AFCAuth &&
            typeof window.AFCAuth.isLoggedIn ===
            "function"
        ) {

            return window.AFCAuth.isLoggedIn();

        }


        const possibleKeys = [

            "afc_user",

            "afc_auth_user",

            "afc_isiu_user",

            "currentUser"

        ];


        return possibleKeys.some(
            key =>
                localStorage.getItem(key)
        );

    }


    /* ========================================================
       LOGIN REQUIRED
    ======================================================== */

    function showLoginRequired() {

        const confirmed =
            window.confirm(
                "You can read lessons without logging in. Please log in or create an account to submit your reflection and mark this lesson as completed."
            );


        if (confirmed) {

            window.location.href =
                "login.html";

        }

    }


    /* ========================================================
       MARK COMPLETED
    ======================================================== */

    function markLessonCompleted() {

        const lessonId =
            `${activeClass}_${currentLesson?.Topic || "lesson"}`;


        try {

            const completed =
                JSON.parse(
                    localStorage.getItem(
                        "afc_completed_lessons"
                    ) || "[]"
                );


            if (
                !completed.includes(
                    lessonId
                )
            ) {

                completed.push(
                    lessonId
                );


                localStorage.setItem(

                    "afc_completed_lessons",

                    JSON.stringify(
                        completed
                    )

                );

            }


            alert(
                "Lesson marked as completed successfully."
            );

        }

        catch (error) {

            console.warn(
                "Unable to save completion.",
                error
            );

        }

    }


    /* ========================================================
       LOAD LESSONS
    ======================================================== */

    async function loadLessons() {

        showLoading();


        /*
        --------------------------------
        ONLINE
        --------------------------------
        */

        try {

            await loadOnlineLessons();


            switchClass(
                activeClass
            );


            console.log(
                "Lessons loaded from Google Sheets."
            );


            return;

        }

        catch (error) {

            console.warn(
                "Online lesson loading failed:",
                error
            );

        }


        /*
        --------------------------------
        INDEXEDDB
        --------------------------------
        */

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
                    activeClass
                );


                console.log(
                    "Lessons loaded from IndexedDB."
                );


                return;

            }

        }

        catch (error) {

            console.warn(
                "IndexedDB fallback failed:",
                error
            );

        }


        /*
        --------------------------------
        LOCAL STORAGE
        --------------------------------
        */

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
                    activeClass
                );


                console.log(
                    "Lessons loaded from LocalStorage."
                );


                return;

            }

        }

        catch (error) {

            console.warn(
                "LocalStorage fallback failed:",
                error
            );

        }


        showError(
            "Unable to load lessons. Please connect to the internet and try again."
        );

    }


    /* ========================================================
       EVENTS
    ======================================================== */

    function bindEvents() {

        /*
        CLASS TABS
        */

        elements.classTabs.forEach(
            tab => {

                tab.addEventListener(

                    "click",

                    function () {

                        const className =
                            this.dataset.class;


                        if (className) {

                            switchClass(
                                className
                            );

                        }

                    }

                );

            }
        );


        /*
        RETRY
        */

        if (elements.retryButton) {

            elements.retryButton.addEventListener(

                "click",

                loadLessons

            );

        }


        /*
        FINISH READING
        */

        if (elements.finishButton) {

            elements.finishButton.addEventListener(

                "click",

                handleFinishReading

            );

        }


        if (
            elements.mobileFinishButton
        ) {

            elements.mobileFinishButton.addEventListener(

                "click",

                handleFinishReading

            );

        }


        /*
        READING PROGRESS
        */

        if (!progressListenerAttached) {

            window.addEventListener(

                "scroll",

                updateReadingProgress,

                {
                    passive: true
                }

            );


            window.addEventListener(

                "resize",

                updateReadingProgress

            );


            progressListenerAttached =
                true;

        }

    }


    /* ========================================================
       START
    ======================================================== */

    function init() {

        console.log(
            "AFC Isiu: lessons.js initialized."
        );


        bindEvents();


        loadLessons();

    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(

            "DOMContentLoaded",

            init

        );

    }

    else {

        init();

    }


})();
