/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: lessons.js
   PURPOSE: LESSONS PAGE CONTROLLER
   VERSION: 2.1.0

   PUBLIC FLOW:

        Lessons Hub
             ↓
        Open Lesson
             ↓
        Read Sections
             ↓
        Click "I've read this lesson"
             ↓
        Reflection / Quiz

   OFFLINE BEHAVIOUR:

   ONLINE:
        Google Sheets
             ↓
        lessons.js
             ↓
        Normalize lesson data
             ↓
        Save to localStorage
             ↓
        Render lesson

   OFFLINE:
        localStorage
             ↓
        Load last downloaded lessons
             ↓
        Render lesson

   IMPORTANT:

   - Lessons are publicly readable.
   - Reading lessons works offline after the data has
     successfully been downloaded at least once.
   - Lesson completion is stored locally.
   - Quiz/reflection submission remains online-only.
   ============================================================ */

(function () {

    "use strict";


    /* ========================================================
       CONFIGURATION
       ======================================================== */

    const LESSONS_CSV_URL =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=201183837&single=true&output=csv";


    /*
     * Local lesson-data cache.
     *
     * The cache contains the normalized lesson objects,
     * not the raw CSV.
     */
    const LESSONS_CACHE_KEY =
        "afcIsiuLessonsCacheV1";

    const LESSONS_CACHE_META_KEY =
        "afcIsiuLessonsCacheMetaV1";


    /*
     * Network timeout prevents the page from hanging for a
     * long time when the browser incorrectly reports that it
     * is online but the network is unavailable.
     */
    const NETWORK_TIMEOUT_MS = 7000;


    /* ========================================================
       STATE
       ======================================================== */

    let lessonsData = [];

    let selectedLessonClass =
        localStorage.getItem(
            "selectedLessonClass"
        ) || "Senior";

    let currentLesson = null;

    let progressScrollHandler = null;


    /* ========================================================
       DOM HELPERS
       ======================================================== */

    function $(id) {

        return document.getElementById(id);

    }


    function qs(selector, parent = document) {

        return parent.querySelector(selector);

    }


    function qsa(selector, parent = document) {

        return Array.from(
            parent.querySelectorAll(selector)
        );

    }


    /* ========================================================
       TEXT HELPERS
       ======================================================== */

    function cleanText(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }

        return String(value)
            .replace(/\uFEFF/g, "")
            .trim();

    }


    function escapeHTML(value) {

        return cleanText(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    function normalizeHeader(value) {

        return cleanText(value)
            .toLowerCase()
            .replace(/[\s_\-]+/g, "");

    }


    /* ========================================================
       SHEET VALUE HELPER
       ======================================================== */

    function getSheetValue(row, possibleNames) {

        if (
            !row ||
            typeof row !== "object"
        ) {

            return "";

        }


        const keys = Object.keys(row);

        for (const wantedName of possibleNames) {

            const normalizedWanted =
                normalizeHeader(wantedName);


            const matchingKey =
                keys.find(key =>
                    normalizeHeader(key) ===
                    normalizedWanted
                );


            if (matchingKey) {

                return cleanText(
                    row[matchingKey]
                );

            }

        }


        return "";

    }


    /* ========================================================
       NORMALIZE LESSON ROW
       ======================================================== */

    function normalizeLessonRow(row) {

        return {

            lesson: getSheetValue(
                row,
                [
                    "Lesson",
                    "Week",
                    "Lesson Number",
                    "Lesson No"
                ]
            ),

            className: getSheetValue(
                row,
                [
                    "Class",
                    "Class Name",
                    "Category",
                    "Level"
                ]
            ),

            topic: getSheetValue(
                row,
                [
                    "Topic",
                    "Lesson Topic",
                    "Title"
                ]
            ),

            bibleText: getSheetValue(
                row,
                [
                    "Bible Text",
                    "BibleText",
                    "Bible Reference",
                    "Scripture"
                ]
            ),

            memoryVerse: getSheetValue(
                row,
                [
                    "Memory Verse",
                    "MemoryVerse"
                ]
            ),

            summary: getSheetValue(
                row,
                [
                    "Summary",
                    "Lesson Summary",
                    "Notes",
                    "Lesson Notes"
                ]
            ),

            discussion: getSheetValue(
                row,
                [
                    "Discussion",
                    "Discussion Questions",
                    "Questions"
                ]
            ),

            yorubaAudio: getSheetValue(
                row,
                [
                    "Yoruba Audio",
                    "YorubaAudio",
                    "Audio",
                    "Audio URL"
                ]
            )

        };

    }


    /* ========================================================
       LOCAL LESSON CACHE
       ======================================================== */

    function saveLessonsToLocalCache(data) {

        if (!Array.isArray(data)) {

            return false;

        }


        try {

            localStorage.setItem(
                LESSONS_CACHE_KEY,
                JSON.stringify(data)
            );

            localStorage.setItem(
                LESSONS_CACHE_META_KEY,
                new Date().toISOString()
            );

            console.log(
                "[Lessons] Lesson data saved locally:",
                data.length
            );

            return true;

        } catch (error) {

            console.warn(
                "[Lessons] Could not save lesson cache:",
                error
            );

            return false;

        }

    }


    function loadLessonsFromLocalCache() {

        try {

            const raw =
                localStorage.getItem(
                    LESSONS_CACHE_KEY
                );


            if (!raw) {

                return [];

            }


            const parsed =
                JSON.parse(raw);


            if (!Array.isArray(parsed)) {

                return [];

            }


            return parsed;

        } catch (error) {

            console.warn(
                "[Lessons] Could not read lesson cache:",
                error
            );

            return [];

        }

    }


    function getLessonsCacheDate() {

        try {

            return localStorage.getItem(
                LESSONS_CACHE_META_KEY
            ) || "";

        } catch (error) {

            return "";

        }

    }


    function formatCacheDate(dateString) {

        if (!dateString) {

            return "";

        }


        const date =
            new Date(dateString);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "";

        }


        try {

            return date.toLocaleString(
                undefined,
                {
                    dateStyle: "medium",
                    timeStyle: "short"
                }
            );

        } catch (error) {

            return date.toLocaleString();

        }

    }


    /* ========================================================
       NETWORK HELPERS
       ======================================================== */

    async function fetchWithTimeout(
        url,
        options = {},
        timeout = NETWORK_TIMEOUT_MS
    ) {

        const controller =
            new AbortController();


        const timeoutId =
            setTimeout(
                () => controller.abort(),
                timeout
            );


        try {

            return await fetch(
                url,
                {
                    ...options,
                    signal: controller.signal
                }
            );

        } finally {

            clearTimeout(timeoutId);

        }

    }


    /* ========================================================
       FETCH WEEKLY LESSONS
       ======================================================== */

    async function fetchWeeklyLessons() {

        /*
         * If the browser knows that it is offline, do not
         * waste time attempting the Google Sheets request.
         */
        if (!navigator.onLine) {

            console.log(
                "[Lessons] Browser is offline. Loading local cache."
            );

            const cachedLessons =
                loadLessonsFromLocalCache();


            if (cachedLessons.length) {

                lessonsData =
                    cachedLessons;

                renderSelectedClass();

                showCachedLessonNotice();

                return;

            }


            renderFetchError(
                "Lessons have not been downloaded yet. Connect to the internet once to download the lessons for offline reading."
            );

            return;

        }


        /*
         * Online path.
         */
        try {

            console.log(
                "[Lessons] Downloading latest lesson data..."
            );


            const response =
                await fetchWithTimeout(
                    LESSONS_CSV_URL,
                    {
                        method: "GET",
                        cache: "no-store"
                    }
                );


            if (!response.ok) {

                throw new Error(
                    `Lesson data request failed (${response.status}).`
                );

            }


            const csvText =
                await response.text();


            if (!csvText.trim()) {

                throw new Error(
                    "The lesson data source returned an empty response."
                );

            }


            /*
             * PapaParse is required for the online CSV path.
             */
            if (
                typeof Papa === "undefined" ||
                typeof Papa.parse !== "function"
            ) {

                throw new Error(
                    "PapaParse could not be loaded. Please check your internet connection and try again."
                );

            }


            const parsed =
                Papa.parse(
                    csvText,
                    {
                        header: true,
                        skipEmptyLines: true
                    }
                );


            if (
                parsed.errors &&
                parsed.errors.length
            ) {

                console.warn(
                    "[Lessons] CSV parsing warnings:",
                    parsed.errors
                );

            }


            const normalizedLessons =
                Array.isArray(parsed.data)
                    ? parsed.data
                        .map(normalizeLessonRow)
                        .filter(row =>
                            row.topic ||
                            row.summary ||
                            row.lesson
                        )
                    : [];


            if (!normalizedLessons.length) {

                throw new Error(
                    "No valid lessons were found in the lesson data."
                );

            }


            lessonsData =
                normalizedLessons;


            /*
             * THIS IS THE IMPORTANT OFFLINE STEP.
             */
            saveLessonsToLocalCache(
                lessonsData
            );


            console.log(
                "[Lessons] Latest lessons loaded:",
                lessonsData.length
            );


            renderSelectedClass();


            hideCachedLessonNotice();

        } catch (error) {

            console.warn(
                "[Lessons] Online lesson fetch failed:",
                error
            );


            /*
             * Network failed while the browser thought it
             * was online. Fall back to the local cache.
             */
            const cachedLessons =
                loadLessonsFromLocalCache();


            if (cachedLessons.length) {

                console.log(
                    "[Lessons] Using previously cached lessons."
                );


                lessonsData =
                    cachedLessons;


                renderSelectedClass();

                showCachedLessonNotice();

                return;

            }


            /*
             * Nothing has ever been cached.
             */
            renderFetchError(
                "We couldn't load the lessons. Please connect to the internet once so the lessons can be downloaded for offline reading."
            );

        }

    }


    /* ========================================================
       OFFLINE CACHE NOTICE
       ======================================================== */

    function showCachedLessonNotice() {

        const existing =
            $("lessonCacheNotice");


        if (existing) {

            existing.remove();

        }


        const timestamp =
            formatCacheDate(
                getLessonsCacheDate()
            );


        const notice =
            document.createElement("div");


        notice.id =
            "lessonCacheNotice";


        notice.className =
            "lesson-cache-notice";


        notice.innerHTML = `

            <div class="lesson-cache-notice-icon">

                <i
                    class="fa-solid fa-cloud-arrow-down"
                    aria-hidden="true"
                ></i>

            </div>

            <div class="lesson-cache-notice-text">

                <strong>
                    Offline lesson copy
                </strong>

                <span>
                    ${timestamp
                        ? `Showing the lessons saved on ${escapeHTML(timestamp)}.`
                        : "Showing your saved lesson copy."
                    }
                </span>

            </div>

        `;


        const container =
            qs(
                ".lessons-page"
            ) ||
            qs(
                "main"
            );


        if (container) {

            container.prepend(
                notice
            );

        }

    }


    function hideCachedLessonNotice() {

        const notice =
            $("lessonCacheNotice");


        if (notice) {

            notice.remove();

        }

    }


    /* ========================================================
       FIND LESSON FOR CLASS
       ======================================================== */

    function findLessonForClass(
        className
    ) {

        const normalizedClass =
            cleanText(
                className
            ).toLowerCase();


        /*
         * Prefer the most recent/first matching class
         * according to the existing sheet order.
         */
        return lessonsData.find(
            lesson =>
                cleanText(
                    lesson.className
                ).toLowerCase() ===
                normalizedClass
        ) || null;

    }


    /* ========================================================
       UPDATE CLASS TABS
       ======================================================== */

    function updateClassTabs() {

        const tabs =
            qsa(
                "[data-lesson-class]"
            );


        tabs.forEach(tab => {

            const tabClass =
                cleanText(
                    tab.dataset.lessonClass
                );


            const isActive =
                tabClass.toLowerCase() ===
                selectedLessonClass.toLowerCase();


            tab.classList.toggle(
                "active",
                isActive
            );


            tab.setAttribute(
                "aria-selected",
                isActive
                    ? "true"
                    : "false"
            );

        });

    }


    /* ========================================================
       RENDER SELECTED CLASS
       ======================================================== */

    function renderSelectedClass() {

        updateClassTabs();


        currentLesson =
            findLessonForClass(
                selectedLessonClass
            );


        if (!currentLesson) {

            renderLessonNotFound();

            return;

        }


        renderLesson(
            currentLesson
        );

    }


    /* ========================================================
       FORMAT LESSON CONTENT
       ======================================================== */

    function formatLessonContent(html) {

        /*
         * Summary is intentionally treated as HTML because
         * the lesson sheet may contain:
         *
         * - headings
         * - paragraphs
         * - ordered lists
         * - unordered lists
         * - bold text
         * - emphasis
         *
         * This matches the existing lesson-content design.
         */
        return cleanText(html);

    }


    /* ========================================================
       FORMAT DISCUSSION
       ======================================================== */

    function formatDiscussion(text) {

        const cleaned =
            cleanText(text);


        if (!cleaned) {

            return `
                <div class="empty-state">
                    No discussion questions are available
                    for this lesson.
                </div>
            `;

        }


        const questions =
            cleaned
                .split(/\r?\n/)
                .map(item =>
                    item.trim()
                )
                .filter(Boolean);


        if (!questions.length) {

            return `
                <div class="discussion-question">

                    ${escapeHTML(cleaned)}

                </div>
            `;

        }


        return questions
            .map((question, index) => {

                /*
                 * Remove common numbering formats.
                 */
                const cleanQuestion =
                    question.replace(
                        /^\s*(?:\d+[\.\)]|[-•])\s*/,
                        ""
                    );


                return `

                    <article
                        class="discussion-question"
                    >

                        <div
                            class="discussion-question-number"
                        >
                            ${index + 1}
                        </div>

                        <div
                            class="discussion-question-text"
                        >
                            ${escapeHTML(
                                cleanQuestion
                            )}
                        </div>

                    </article>

                `;

            })
            .join("");

    }


    /* ========================================================
       BUILD AUDIO URL
       ======================================================== */

    function buildAudioURL(
        audioValue
    ) {

        const value =
            cleanText(audioValue);


        if (!value) {

            return "";

        }


        /*
         * Full URL.
         */
        if (
            /^https?:\/\//i.test(value)
        ) {

            return value;

        }


        /*
         * Root-relative path.
         */
        if (
            value.startsWith("/")
        ) {

            return value;

        }


        /*
         * Relative audio path.
         */
        return `/${value.replace(/^\/+/, "")}`;

    }


    /* ========================================================
       RENDER YORUBA AUDIO
       ======================================================== */

    function renderYorubaAudio(
        audioValue
    ) {

        const audioURL =
            buildAudioURL(
                audioValue
            );


        if (!audioURL) {

            return "";

        }


        return `

            <section
                class="lesson-audio-card"
            >

                <div
                    class="lesson-audio-icon"
                    aria-hidden="true"
                >

                    <i
                        class="fa-solid fa-volume-high"
                    ></i>

                </div>


                <div
                    class="lesson-audio-info"
                >

                    <strong>
                        Yoruba Memory Verse
                    </strong>

                    <span>
                        Listen to the memory verse
                    </span>

                </div>


                <audio
                    class="lesson-audio-player"
                    controls
                    preload="none"
                >

                    <source
                        src="${escapeHTML(audioURL)}"
                    >

                    Your browser does not support
                    audio playback.

                </audio>

            </section>

        `;

    }


    /* ========================================================
       COMPLETION STATE
       ======================================================== */

    function getLessonStorageKey(
        lesson
    ) {

        if (!lesson) {

            return "";

        }


        const className =
            cleanText(
                lesson.className
            ) || "Unknown";


        const lessonNumber =
            cleanText(
                lesson.lesson
            ) || "Unknown";


        return (
            `lessonCompleted_${className}_${lessonNumber}`
        );

    }


    function isLessonCompleted(
        lesson
    ) {

        const key =
            getLessonStorageKey(
                lesson
            );


        if (!key) {

            return false;

        }


        return (
            localStorage.getItem(
                key
            ) === "true"
        );

    }


    /* ========================================================
       RENDER LESSON
       ======================================================== */

    function renderLesson(
        lesson
    ) {

        currentLesson =
            lesson;


        const topicElement =
            $("lessonTopic");


        const bibleTextElement =
            $("lessonBibleText");


        const memoryVerseElement =
            $("memoryVerse");


        const summaryElement =
            $("lessonSummary");


        const discussionElement =
            $("discussionQuestions");


        const audioElement =
            $("yorubaAudio");


        const lessonNumberElement =
            $("lessonNumber");


        if (topicElement) {

            topicElement.textContent =
                lesson.topic ||
                "Untitled Lesson";

        }


        if (bibleTextElement) {

            bibleTextElement.textContent =
                lesson.bibleText ||
                "Bible text not available.";

        }


        if (memoryVerseElement) {

            memoryVerseElement.textContent =
                lesson.memoryVerse ||
                "Memory verse not available.";

        }


        if (summaryElement) {

            summaryElement.innerHTML =
                formatLessonContent(
                    lesson.summary
                ) ||
                `
                    <p>
                        Lesson notes are not available.
                    </p>
                `;

        }


        if (discussionElement) {

            discussionElement.innerHTML =
                formatDiscussion(
                    lesson.discussion
                );

        }


        if (audioElement) {

            audioElement.innerHTML =
                renderYorubaAudio(
                    lesson.yorubaAudio
                );

        }


        if (lessonNumberElement) {

            lessonNumberElement.textContent =
                lesson.lesson
                    ? `Lesson ${lesson.lesson}`
                    : "";

        }


        updateClassTabs();

        setupProgressTracking();


        /*
         * Restore completion state after rendering.
         */
        if (
            isLessonCompleted(
                lesson
            )
        ) {

            updateProgressUI(
                100
            );

            markCompletionButtonsAsCompleted();

        } else {

            updateProgressUI(
                calculateReadingProgress()
            );

        }


        /*
         * Allow page-specific hooks to run after content is
         * rendered.
         */
        document.dispatchEvent(
            new CustomEvent(
                "afc:lesson-rendered",
                {
                    detail: {
                        lesson
                    }
                }
            )
        );

    }


    /* ========================================================
       LESSON NOT FOUND
       ======================================================== */

    function renderLessonNotFound() {

        const topicElement =
            $("lessonTopic");


        if (topicElement) {

            topicElement.textContent =
                "Lesson unavailable";

        }


        const summaryElement =
            $("lessonSummary");


        if (summaryElement) {

            summaryElement.innerHTML = `

                <div class="empty-state">

                    <strong>
                        This lesson is not available yet.
                    </strong>

                    <p>
                        Please try another class or reconnect
                        to the internet when new lessons are
                        published.
                    </p>

                </div>

            `;

        }


        const discussionElement =
            $("discussionQuestions");


        if (discussionElement) {

            discussionElement.innerHTML =
                "";

        }


        const audioElement =
            $("yorubaAudio");


        if (audioElement) {

            audioElement.innerHTML =
                "";

        }


        updateProgressUI(
            0
        );

    }


    /* ========================================================
       PROGRESS CALCULATION
       ======================================================== */

    function calculateReadingProgress() {

        const article =
            qs(
                ".lesson-content"
            );


        if (!article) {

            return 0;

        }


        const scrollTop =
            window.scrollY ||
            document.documentElement.scrollTop ||
            0;


        const viewportHeight =
            window.innerHeight;


        const documentHeight =
            document.documentElement.scrollHeight;


        const readableHeight =
            Math.max(
                documentHeight -
                viewportHeight,
                1
            );


        const percentage =
            (
                scrollTop /
                readableHeight
            ) * 100;


        return Math.max(
            0,
            Math.min(
                100,
                Math.round(
                    percentage
                )
            )
        );

    }


    /* ========================================================
       UPDATE PROGRESS UI
       ======================================================== */

    function updateProgressUI(
        percentage
    ) {

        const progress =
            Math.max(
                0,
                Math.min(
                    100,
                    Number(percentage) || 0
                )
            );


        const progressBars =
            qsa(
                "[data-lesson-progress]"
            );


        progressBars.forEach(bar => {

            bar.style.width =
                `${progress}%`;

        });


        const progressValues =
            qsa(
                "[data-lesson-progress-value]"
            );


        progressValues.forEach(value => {

            value.textContent =
                `${progress}%`;

        });


        /*
         * Common progress elements used by the current
         * Lessons UI.
         */
        const progressBar =
            $("lessonProgressBar");


        if (progressBar) {

            progressBar.style.width =
                `${progress}%`;

        }


        const progressText =
            $("lessonProgress");


        if (progressText) {

            progressText.textContent =
                `${progress}%`;

        }


        if (
            progress >= 100
        ) {

            markCompletionButtonsAsCompleted();

        }

    }


    /* ========================================================
       PROGRESS SCROLL TRACKING
       ======================================================== */

    function setupProgressTracking() {

        if (progressScrollHandler) {

            window.removeEventListener(
                "scroll",
                progressScrollHandler
            );

        }


        progressScrollHandler =
            () => {

                if (
                    !currentLesson ||
                    isLessonCompleted(
                        currentLesson
                    )
                ) {

                    return;

                }


                updateProgressUI(
                    calculateReadingProgress()
                );

            };


        window.addEventListener(
            "scroll",
            progressScrollHandler,
            {
                passive: true
            }
        );


        /*
         * Initial calculation.
         */
        setTimeout(
            () => {

                if (
                    currentLesson &&
                    isLessonCompleted(
                        currentLesson
                    )
                ) {

                    updateProgressUI(
                        100
                    );

                } else {

                    updateProgressUI(
                        calculateReadingProgress()
                    );

                }

            },
            100
        );

    }


    /* ========================================================
       MARK LESSON COMPLETED
       ======================================================== */

    function markLessonCompleted() {

        if (!currentLesson) {

            return;

        }


        const storageKey =
            getLessonStorageKey(
                currentLesson
            );


        if (!storageKey) {

            return;

        }


        try {

            localStorage.setItem(
                storageKey,
                "true"
            );

        } catch (error) {

            console.warn(
                "[Lessons] Could not save completion:",
                error
            );

        }


        updateProgressUI(
            100
        );


        markCompletionButtonsAsCompleted();


        /*
         * Let the rest of the portal know that the lesson
         * was completed.
         */
        document.dispatchEvent(
            new CustomEvent(
                "afc:lesson-completed",
                {
                    detail: {
                        lesson: currentLesson
                    }
                }
            )
        );

    }


    /* ========================================================
       COMPLETION BUTTON UI
       ======================================================== */

    function markCompletionButtonsAsCompleted() {

        const buttons =
            qsa(
                "[data-mark-lesson-complete]"
            );


        buttons.forEach(button => {

            button.classList.add(
                "completed"
            );


            button.setAttribute(
                "aria-pressed",
                "true"
            );


            const originalText =
                button.dataset.completedText ||
                "Lesson Completed";


            const textElement =
                qs(
                    "[data-complete-label]",
                    button
                );


            if (textElement) {

                textElement.textContent =
                    originalText;

            } else {

                /*
                 * Only update plain buttons if they do not
                 * contain complex child markup.
                 */
                if (
                    button.children.length === 0
                ) {

                    button.textContent =
                        originalText;

                }

            }

        });


        /*
         * Existing button IDs used by earlier versions.
         */
        const legacyButtons = [
            $("finishLesson"),
            $("finishLessonMobile")
        ].filter(Boolean);


        legacyButtons.forEach(button => {

            button.classList.add(
                "completed"
            );

            button.setAttribute(
                "aria-pressed",
                "true"
            );


            if (
                button.children.length === 0
            ) {

                button.textContent =
                    "Lesson Completed";

            }

        });

    }


    /* ========================================================
       CLASS TAB EVENTS
       ======================================================== */

    function setupClassTabs() {

        const tabs =
            qsa(
                "[data-lesson-class]"
            );


        tabs.forEach(tab => {

            tab.addEventListener(
                "click",
                event => {

                    event.preventDefault();


                    const className =
                        cleanText(
                            tab.dataset.lessonClass
                        );


                    if (!className) {

                        return;

                    }


                    selectedLessonClass =
                        className;


                    try {

                        localStorage.setItem(
                            "selectedLessonClass",
                            selectedLessonClass
                        );

                    } catch (error) {

                        console.warn(
                            "[Lessons] Could not save selected class:",
                            error
                        );

                    }


                    renderSelectedClass();

                }
            );

        });

    }


    /* ========================================================
       FINISH BUTTONS
       ======================================================== */

    function setupFinishButtons() {

        const buttons =
            qsa(
                "[data-mark-lesson-complete]"
            );


        buttons.forEach(button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    markLessonCompleted();

                }
            );

        });


        /*
         * Legacy IDs.
         */
        const legacyButtons = [
            $("finishLesson"),
            $("finishLessonMobile")
        ].filter(Boolean);


        legacyButtons.forEach(button => {

            if (
                button.dataset.lessonBound ===
                "true"
            ) {

                return;

            }


            button.dataset.lessonBound =
                "true";


            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    markLessonCompleted();

                }
            );

        });

    }


    /* ========================================================
       RETRY BUTTON
       ======================================================== */

    function setupRetryButton() {

        const retryButtons =
            qsa(
                "[data-lessons-retry]"
            );


        retryButtons.forEach(button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    fetchWeeklyLessons();

                }
            );

        });


        const legacyRetry =
            $("retryLessons");


        if (
            legacyRetry &&
            legacyRetry.dataset.lessonRetryBound !==
            "true"
        ) {

            legacyRetry.dataset.lessonRetryBound =
                "true";


            legacyRetry.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    fetchWeeklyLessons();

                }
            );

        }

    }


    /* ========================================================
       FETCH ERROR
       ======================================================== */

    function renderFetchError(
        message
    ) {

        const main =
            qs(
                ".lessons-page"
            ) ||
            qs(
                "main"
            );


        if (!main) {

            return;

        }


        main.innerHTML = `

            <section
                class="lesson-error"
                role="alert"
            >

                <div
                    class="lesson-error-icon"
                >

                    <i
                        class="fa-solid fa-book-open"
                        aria-hidden="true"
                    ></i>

                </div>


                <h2>
                    Lessons unavailable
                </h2>


                <p>
                    ${escapeHTML(message)}
                </p>


                <button
                    type="button"
                    class="lesson-retry-button"
                    data-lessons-retry
                >

                    <i
                        class="fa-solid fa-rotate-right"
                        aria-hidden="true"
                    ></i>

                    Try Again

                </button>

            </section>

        `;


        const retry =
            qs(
                "[data-lessons-retry]",
                main
            );


        if (retry) {

            retry.addEventListener(
                "click",
                () => {

                    window.location.reload();

                }
            );

        }

    }


    /* ========================================================
       CONNECTION CHANGES
       ======================================================== */

    function setupConnectionHandling() {

        window.addEventListener(
            "online",
            () => {

                console.log(
                    "[Lessons] Connection restored."
                );


                /*
                 * Refresh lesson data automatically when the
                 * user comes back online.
                 */
                fetchWeeklyLessons();

            }
        );


        window.addEventListener(
            "offline",
            () => {

                console.log(
                    "[Lessons] Connection lost."
                );


                /*
                 * If current data is already in memory,
                 * there is no need to interrupt the user.
                 */
                if (lessonsData.length) {

                    showCachedLessonNotice();

                }

            }
        );

    }


    /* ========================================================
       INIT
       ======================================================== */

    function initLessons() {

        setupClassTabs();

        setupFinishButtons();

        setupRetryButton();

        setupConnectionHandling();

        fetchWeeklyLessons();

    }


    /* ========================================================
       PUBLIC API
       ======================================================== */

    window.AFCLessons = {

        getLessons: () => {

            return lessonsData.slice();

        },


        getCurrentLesson: () => {

            return currentLesson;

        },


        getSelectedClass: () => {

            return selectedLessonClass;

        },


        refresh: () => {

            return fetchWeeklyLessons();

        },


        clearLessonCache: () => {

            try {

                localStorage.removeItem(
                    LESSONS_CACHE_KEY
                );

                localStorage.removeItem(
                    LESSONS_CACHE_META_KEY
                );

                console.log(
                    "[Lessons] Local lesson cache cleared."
                );

            } catch (error) {

                console.warn(
                    "[Lessons] Could not clear cache:",
                    error
                );

            }

        },


        isOfflineCopyAvailable: () => {

            return (
                loadLessonsFromLocalCache()
                    .length > 0
            );

        }

    };


    /* ========================================================
       START
       ======================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initLessons,
            {
                once: true
            }
        );

    } else {

        initLessons();

    }

})();
