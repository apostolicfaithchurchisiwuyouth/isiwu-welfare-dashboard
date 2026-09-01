/* =========================================================
   AFC ISIU YOUTH PORTAL
   WEEKLY LESSONS CONTROLLER
   COMPLETE REBUILT VERSION
========================================================= */

"use strict";


(() => {


    /* =====================================================
       CONFIGURATION
    ===================================================== */

    const WEEKLY_LESSON_CSV =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=201183837&single=true&output=csv";


    /* =====================================================
       STATE
    ===================================================== */

    let lessonsData = [];

    let selectedClass = "Senior";

    let currentLesson = null;

    let progressHandlerAttached = false;


    /* =====================================================
       DOM HELPER
    ===================================================== */

    function $(id) {

        return document.getElementById(id);

    }


    function escapeHTML(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }


        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    /* =====================================================
       NORMALIZE TEXT
    ===================================================== */

    function normalize(value) {

        return String(value || "")
            .trim()
            .replace(/\s+/g, " ");

    }


    /* =====================================================
       FIND CSV COLUMN
       Makes the code tolerant of slightly different
       spreadsheet header names.
    ===================================================== */

    function getColumn(row, possibleNames) {

        const keys =
            Object.keys(row || {});


        for (const name of possibleNames) {

            const exact =
                keys.find(
                    key =>
                        normalize(key).toLowerCase() ===
                        normalize(name).toLowerCase()
                );


            if (exact) {

                return normalize(
                    row[exact]
                );

            }

        }


        return "";

    }


    /* =====================================================
       FIND LESSON CONTENT COLUMN
    ===================================================== */

    function getLessonContent(row) {

        const possibleNames = [

            "Content",

            "LessonContent",

            "Lesson Content",

            "Body",

            "LessonBody",

            "Lesson Body",

            "StudyLesson",

            "Study Lesson",

            "Introduction"

        ];


        for (const name of possibleNames) {

            const value =
                getColumn(
                    row,
                    [name]
                );


            if (value) {

                return value;

            }

        }


        return "";

    }


    /* =====================================================
       PARSE LESSON ROW
    ===================================================== */

    function normalizeLessonRow(row) {

        return {

            lesson:
                getColumn(
                    row,
                    [
                        "Lesson",
                        "Lesson Number",
                        "LessonNo",
                        "Lesson No"
                    ]
                ),

            className:
                getColumn(
                    row,
                    [
                        "Class",
                        "ClassName",
                        "Class Name"
                    ]
                ),

            topic:
                getColumn(
                    row,
                    [
                        "Topic",
                        "Lesson Topic",
                        "Theme"
                    ]
                ),

            bibleText:
                getColumn(
                    row,
                    [
                        "BibleText",
                        "Bible Text",
                        "Bible",
                        "Bible Passage"
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

            content:
                getLessonContent(row),

            summary:
                getColumn(
                    row,
                    [
                        "Summary",
                        "Lesson Summary"
                    ]
                ),

            discussion:
                getColumn(
                    row,
                    [
                        "Discussion",
                        "Discussion Questions",
                        "Questions"
                    ]
                ),

            yorubaAudio:
                getColumn(
                    row,
                    [
                        "YorubaAudio",
                        "Yoruba Audio",
                        "Audio",
                        "Audio URL",
                        "AudioURL"
                    ]
                ),

            date:
                getColumn(
                    row,
                    [
                        "Date",
                        "Lesson Date",
                        "Week",
                        "Week Date"
                    ]
                )

        };

    }


    /* =====================================================
       FORMAT LESSON NUMBER
    ===================================================== */

    function formatLessonNumber(value) {

        const clean =
            normalize(value);


        if (!clean) {

            return "—";

        }


        if (
            /^lesson\s+/i.test(clean)
        ) {

            return clean;

        }


        return `Lesson ${clean}`;

    }


    /* =====================================================
       FORMAT CLASS
    ===================================================== */

    function formatClassName(value) {

        const clean =
            normalize(value);


        if (!clean) {

            return selectedClass;

        }


        return clean
            .charAt(0)
            .toUpperCase() +
            clean
                .slice(1)
                .toLowerCase();

    }


    /* =====================================================
       FORMAT DATE
    ===================================================== */

    function formatDate(value) {

        const clean =
            normalize(value);


        if (!clean) {

            return "This Week";

        }


        const parsed =
            new Date(clean);


        if (
            !Number.isNaN(
                parsed.getTime()
            )
        ) {

            return parsed.toLocaleDateString(
                "en-GB",
                {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                }
            );

        }


        return clean;

    }


    /* =====================================================
       CONVERT CONTENT INTO HTML
    ===================================================== */

    function contentToHTML(content) {

        if (!content) {

            return `
                <div class="lesson-error-message">

                    <i class="fa-solid fa-book-open"></i>

                    <strong>
                        Lesson content is not available yet.
                    </strong>

                    <p>
                        The lesson information has loaded,
                        but the study content is empty in the
                        Google Sheet.
                    </p>

                </div>
            `;

        }


        let text =
            String(content)
                .replace(/\r\n/g, "\n")
                .replace(/\r/g, "\n")
                .trim();


        /*
         * If the spreadsheet contains HTML,
         * allow the existing formatting to remain.
         */

        if (
            /<\/?[a-z][\s\S]*>/i.test(text)
        ) {

            return text;

        }


        /*
         * Otherwise convert normal spreadsheet
         * line breaks into readable paragraphs.
         */

        const blocks =
            text
                .split(/\n\s*\n/)
                .map(
                    block =>
                        block.trim()
                )
                .filter(Boolean);


        if (!blocks.length) {

            return `
                <p>
                    ${escapeHTML(text)}
                </p>
            `;

        }


        return blocks
            .map(
                block => {

                    const lines =
                        block
                            .split("\n")
                            .map(
                                line =>
                                    line.trim()
                            )
                            .filter(Boolean);


                    /*
                     * Heading detection
                     */

                    if (
                        lines.length === 1 &&
                        (
                            /^introduction:?$/i.test(lines[0]) ||
                            /^conclusion:?$/i.test(lines[0]) ||
                            /^lesson outline:?$/i.test(lines[0]) ||
                            /^objectives?:?$/i.test(lines[0]) ||
                            /^aim:?$/i.test(lines[0])
                        )
                    ) {

                        return `
                            <h3>
                                ${escapeHTML(lines[0])}
                            </h3>
                        `;

                    }


                    /*
                     * Bullet list
                     */

                    const isList =
                        lines.length > 1 &&
                        lines.every(
                            line =>
                                /^[-•*]\s+/.test(line) ||
                                /^\d+[.)]\s+/.test(line)
                        );


                    if (isList) {

                        const ordered =
                            lines.every(
                                line =>
                                    /^\d+[.)]\s+/.test(line)
                            );


                        const tag =
                            ordered
                                ? "ol"
                                : "ul";


                        const items =
                            lines
                                .map(
                                    line =>
                                        line
                                            .replace(
                                                /^[-•*]\s+/,
                                                ""
                                            )
                                            .replace(
                                                /^\d+[.)]\s+/,
                                                ""
                                            )
                                )
                                .map(
                                    line =>
                                        `
                                        <li>
                                            ${escapeHTML(line)}
                                        </li>
                                        `
                                )
                                .join("");


                        return `
                            <${tag}>
                                ${items}
                            </${tag}>
                        `;

                    }


                    /*
                     * Multiple lines inside one block.
                     */

                    return `
                        <p>
                            ${lines
                                .map(
                                    line =>
                                        escapeHTML(line)
                                )
                                .join("<br>")}
                        </p>
                    `;

                }
            )
            .join("");

    }


    /* =====================================================
       CONVERT DISCUSSION INTO QUESTIONS
    ===================================================== */

    function discussionToHTML(discussion) {

        const container =
            $("lessonDiscussion");


        if (!container) {

            return;

        }


        if (!discussion) {

            container.innerHTML = `
                <p class="discussion-empty">
                    No discussion questions available.
                </p>
            `;

            return;

        }


        let text =
            String(discussion)
                .replace(/\r\n/g, "\n")
                .replace(/\r/g, "\n")
                .trim();


        /*
         * Split on line breaks first.
         */

        let questions =
            text
                .split(/\n+/)
                .map(
                    item =>
                        item
                            .trim()
                            .replace(
                                /^\d+[\.\):\-]\s*/,
                                ""
                            )
                            .replace(
                                /^[-•*]\s*/,
                                ""
                            )
                )
                .filter(Boolean);


        /*
         * If the cell is one long line separated by
         * question marks, split it into questions.
         */

        if (
            questions.length === 1 &&
            (
                text.match(/\?/g) || []
            ).length > 1
        ) {

            questions =
                text
                    .split("?")
                    .map(
                        item =>
                            item.trim()
                    )
                    .filter(Boolean)
                    .map(
                        item =>
                            `${item}?`
                    );

        }


        if (!questions.length) {

            container.innerHTML = `
                <p class="discussion-empty">
                    No discussion questions available.
                </p>
            `;

            return;

        }


        container.innerHTML =
            questions
                .map(
                    (question, index) => `
                        <div class="discussion-question">

                            <span class="discussion-number">
                                ${index + 1}
                            </span>

                            <p>
                                ${escapeHTML(question)}
                            </p>

                        </div>
                    `
                )
                .join("");

    }


    /* =====================================================
       CALCULATE READING TIME
    ===================================================== */

    function calculateReadingTime(text) {

        const clean =
            String(text || "")
                .replace(/<[^>]*>/g, " ")
                .replace(/\s+/g, " ")
                .trim();


        if (!clean) {

            return "—";

        }


        const words =
            clean.split(" ").length;


        const minutes =
            Math.max(
                1,
                Math.ceil(
                    words / 180
                )
            );


        return `${minutes} min`;

    }


    /* =====================================================
       COUNT SECTIONS
    ===================================================== */

    function calculateSections(text) {

        const clean =
            String(text || "")
                .replace(/\r\n/g, "\n")
                .replace(/\r/g, "\n")
                .trim();


        if (!clean) {

            return 0;

        }


        const headings =
            clean.match(
                /(?:^|\n)\s*(?:introduction|lesson outline|aim|objectives?|conclusion|discussion)\s*:?\s*(?:\n|$)/gi
            );


        if (headings && headings.length) {

            return headings.length;

        }


        const paragraphs =
            clean
                .split(/\n\s*\n/)
                .filter(
                    item =>
                        item.trim()
                );


        return Math.max(
            1,
            Math.min(
                paragraphs.length,
                12
            )
        );

    }


    /* =====================================================
       RESET PROGRESS
    ===================================================== */

    function resetProgress() {

        setProgress(0);

        const lessonView =
            $("lessonView");


        if (lessonView) {

            lessonView.classList.remove(
                "lesson-completed"
            );

        }


        const progressText =
            $("progressText");


        if (progressText) {

            progressText.textContent =
                "Start reading this lesson.";

        }


        const finishButtons =
            document.querySelectorAll(
                "#finishReadingBtn, #mobileFinishReadingBtn"
            );


        finishButtons.forEach(
            button => {

                button.disabled = false;

                button.innerHTML = `
                    <span class="finish-icon">
                        <i class="fa-solid fa-check"></i>
                    </span>

                    <span class="finish-text">

                        <strong>
                            I've read this lesson
                        </strong>

                        <small>
                            Mark lesson as completed
                        </small>

                    </span>
                `;

            }
        );

    }


    /* =====================================================
       SET PROGRESS
    ===================================================== */

    function setProgress(percent) {

        const safePercent =
            Math.max(
                0,
                Math.min(
                    100,
                    Math.round(percent)
                )
            );


        const desktopPercent =
            $("progressPercent");


        const mobilePercent =
            $("mobileProgressPercent");


        const desktopBar =
            $("progressBar");


        const mobileBar =
            $("mobileProgressBar");


        if (desktopPercent) {

            desktopPercent.textContent =
                `${safePercent}%`;

        }


        if (mobilePercent) {

            mobilePercent.textContent =
                `${safePercent}%`;

        }


        if (desktopBar) {

            desktopBar.style.width =
                `${safePercent}%`;

        }


        if (mobileBar) {

            mobileBar.style.width =
                `${safePercent}%`;

        }

    }


    /* =====================================================
       UPDATE LESSON DISPLAY
    ===================================================== */

    function displayLesson(lesson) {

        if (!lesson) {

            showLessonError(
                "No lesson was found for this class."
            );

            return;

        }


        currentLesson =
            lesson;


        const className =
            formatClassName(
                lesson.className
            );


        /* ---------------------------------------------
           CLASS + TOPIC CARD
        --------------------------------------------- */

        const classBadge =
            $("lessonClassBadge");


        const lessonTitle =
            $("lessonTitle");


        const lessonTheme =
            $("lessonTheme");


        if (classBadge) {

            classBadge.textContent =
                `${className.toUpperCase()} LESSON`;

        }


        if (lessonTitle) {

            /*
             * The requested first card only displays
             * the lesson topic/title.
             */

            lessonTitle.textContent =
                lesson.topic ||
                "Weekly Lesson";

        }


        /*
         * We intentionally do not put summary here.
         */

        if (lessonTheme) {

            lessonTheme.textContent =
                lesson.topic || "";

        }


        /*
         * If the topic and title are the same,
         * don't visually duplicate them.
         */

        if (
            lessonTitle &&
            lessonTheme &&
            normalize(lessonTitle.textContent).toLowerCase() ===
            normalize(lessonTheme.textContent).toLowerCase()
        ) {

            lessonTheme.textContent = "";

        }


        /* ---------------------------------------------
           BIBLE TEXT
        --------------------------------------------- */

        const bibleText =
            $("lessonBibleText");


        if (bibleText) {

            bibleText.textContent =
                lesson.bibleText ||
                "—";

        }


        /* ---------------------------------------------
           LESSON NUMBER
        --------------------------------------------- */

        const lessonNumber =
            $("lessonNumber");


        if (lessonNumber) {

            lessonNumber.textContent =
                formatLessonNumber(
                    lesson.lesson
                );

        }


        /* ---------------------------------------------
           WEEK / DATE
        --------------------------------------------- */

        const lessonDate =
            $("lessonDate");


        if (lessonDate) {

            lessonDate.textContent =
                formatDate(
                    lesson.date
                );

        }


        const weekText =
            $("lessonWeekText");


        if (weekText) {

            weekText.textContent =
                lesson.date
                    ? formatDate(
                        lesson.date
                    )
                    : "This Week";

        }


        /* ---------------------------------------------
           MEMORY VERSE
        --------------------------------------------- */

        const memoryVerse =
            $("lessonMemoryVerse");


        if (memoryVerse) {

            memoryVerse.textContent =
                lesson.memoryVerse ||
                "—";

        }


        /* ---------------------------------------------
           STUDY LESSON
        --------------------------------------------- */

        const content =
            $("lessonContent");


        if (content) {

            content.innerHTML =
                contentToHTML(
                    lesson.content
                );

        }


        /* ---------------------------------------------
           DISCUSSION
        --------------------------------------------- */

        discussionToHTML(
            lesson.discussion
        );


        /* ---------------------------------------------
           READING TIME
        --------------------------------------------- */

        const readingTime =
            calculateReadingTime(
                lesson.content
            );


        const readingTimeElement =
            $("readingTime");


        const mobileReadingTime =
            $("mobileReadingTime");


        if (readingTimeElement) {

            readingTimeElement.textContent =
                readingTime;

        }


        if (mobileReadingTime) {

            mobileReadingTime.textContent =
                readingTime;

        }


        /* ---------------------------------------------
           SECTION COUNT
        --------------------------------------------- */

        const sectionCount =
            calculateSections(
                lesson.content
            );


        const sectionElement =
            $("sectionCount");


        const mobileSectionElement =
            $("mobileSectionCount");


        if (sectionElement) {

            sectionElement.textContent =
                sectionCount || "—";

        }


        if (mobileSectionElement) {

            mobileSectionElement.textContent =
                sectionCount || "—";

        }


        /* ---------------------------------------------
           RESET PROGRESS
        --------------------------------------------- */

        resetProgress();


        /* ---------------------------------------------
           SAVE CLASS
        --------------------------------------------- */

        localStorage.setItem(
            "selectedLessonClass",
            selectedClass
        );


        /*
         * Scroll back to the beginning of the lesson
         * only when the user deliberately changes tabs.
         * Initial page load does not jump.
         */

    }


    /* =====================================================
       SHOW ERROR
    ===================================================== */

    function showLessonError(message) {

        const content =
            $("lessonContent");


        if (content) {

            content.innerHTML = `
                <div class="lesson-error-message">

                    <i class="fa-solid fa-circle-exclamation"></i>

                    <strong>
                        Unable to display this lesson.
                    </strong>

                    <p>
                        ${escapeHTML(message)}
                    </p>

                </div>
            `;

        }


        const discussion =
            $("lessonDiscussion");


        if (discussion) {

            discussion.innerHTML = `
                <p class="discussion-empty">
                    Discussion questions are unavailable.
                </p>
            `;

        }

    }


    /* =====================================================
       SELECT LESSON
    ===================================================== */

    function selectLesson(
        className,
        shouldScroll = false
    ) {

        selectedClass =
            className;


        const normalizedClass =
            normalize(
                className
            ).toLowerCase();


        /*
         * Exact match first.
         */

        let lesson =
            lessonsData.find(
                item =>
                    normalize(
                        item.className
                    ).toLowerCase() ===
                    normalizedClass
            );


        /*
         * Fallback for things such as:
         * "Senior Class"
         */

        if (!lesson) {

            lesson =
                lessonsData.find(
                    item =>
                        normalize(
                            item.className
                        )
                            .toLowerCase()
                            .includes(
                                normalizedClass
                            )
                );

        }


        if (!lesson) {

            showLessonError(
                `There is no ${className} lesson available in the current lesson data.`
            );

            return;

        }


        /*
         * Update active tab.
         */

        document
            .querySelectorAll(
                ".class-tab"
            )
            .forEach(
                tab => {

                    const tabClass =
                        normalize(
                            tab.dataset.class
                        ).toLowerCase();


                    tab.classList.toggle(
                        "active",
                        tabClass ===
                        normalizedClass
                    );

                }
            );


        displayLesson(
            lesson
        );


        if (shouldScroll) {

            const topicCard =
                document.querySelector(
                    ".lesson-topic-card"
                );


            if (topicCard) {

                const offset =
                    85;


                const top =
                    topicCard.getBoundingClientRect().top +
                    window.scrollY -
                    offset;


                window.scrollTo({

                    top:
                        Math.max(
                            0,
                            top
                        ),

                    behavior:
                        "smooth"

                });

            }

        }

    }


    /* =====================================================
       FETCH LESSON DATA
    ===================================================== */

    async function loadLessons() {

        /*
         * Do not create a loading screen.
         *
         * The page structure is already visible.
         */

        try {

            console.log(
                "AFC Lessons: Fetching lesson data..."
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
                    `HTTP ${response.status}`
                );

            }


            const csvText =
                await response.text();


            if (!csvText.trim()) {

                throw new Error(
                    "The lesson spreadsheet returned empty data."
                );

            }


            if (
                typeof Papa ===
                "undefined"
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
                    "AFC Lessons CSV warnings:",
                    result.errors
                );

            }


            lessonsData =
                result.data
                    .map(
                        normalizeLessonRow
                    )
                    .filter(
                        lesson =>
                            lesson.className ||
                            lesson.topic ||
                            lesson.content
                    );


            console.log(
                "AFC Lessons: Parsed lessons:",
                lessonsData
            );


            if (!lessonsData.length) {

                throw new Error(
                    "No valid lessons were found in the spreadsheet."
                );

            }


            /*
             * Restore previously selected class.
             */

            const savedClass =
                localStorage.getItem(
                    "selectedLessonClass"
                );


            const availableClass =
                lessonsData.find(
                    item =>
                        normalize(
                            item.className
                        ).toLowerCase() ===
                        normalize(
                            savedClass || "Senior"
                        ).toLowerCase()
                );


            selectedClass =
                availableClass
                    ? formatClassName(
                        availableClass.className
                    )
                    : "Senior";


            selectLesson(
                selectedClass,
                false
            );


            console.log(
                "AFC Lessons: Lesson loaded successfully."
            );

        }

        catch (error) {

            console.error(
                "AFC Lessons: Failed to load lessons:",
                error
            );


            showLessonError(
                "The lesson data could not be loaded. Please check your internet connection and try again."
            );

        }

    }


    /* =====================================================
       CLASS TAB EVENTS
    ===================================================== */

    function setupClassTabs() {

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


                        if (!className) {

                            return;

                        }


                        selectLesson(
                            className,
                            true
                        );

                    }
                );

            }
        );

    }


    /* =====================================================
       READING PROGRESS
    ===================================================== */

    function updateReadingProgress() {

        const content =
            $("lessonContent");


        if (!content) {

            return;

        }


        const rect =
            content.getBoundingClientRect();


        const contentHeight =
            content.scrollHeight;


        const viewportBottom =
            window.scrollY +
            window.innerHeight;


        const contentTop =
            window.scrollY +
            rect.top;


        const readableHeight =
            Math.max(
                1,
                contentHeight -
                window.innerHeight * 0.55
            );


        const current =
            viewportBottom -
            contentTop -
            window.innerHeight * 0.12;


        const percent =
            Math.round(
                (
                    current /
                    readableHeight
                ) * 100
            );


        setProgress(
            Math.max(
                0,
                Math.min(
                    100,
                    percent
                )
            )
        );


        const progressText =
            $("progressText");


        if (!progressText) {

            return;

        }


        const safe =
            Math.max(
                0,
                Math.min(
                    100,
                    percent
                )
            );


        if (safe >= 100) {

            progressText.textContent =
                "Lesson completed. Well done!";

        }

        else if (safe >= 70) {

            progressText.textContent =
                "You're almost there.";

        }

        else if (safe >= 30) {

            progressText.textContent =
                "Keep going. You're doing well.";

        }

        else {

            progressText.textContent =
                "Start reading this lesson.";

        }

    }


    /* =====================================================
       FINISH LESSON
    ===================================================== */

    function finishLesson() {

        const lessonView =
            $("lessonView");


        if (lessonView) {

            lessonView.classList.add(
                "lesson-completed"
            );

        }


        setProgress(
            100
        );


        const progressText =
            $("progressText");


        if (progressText) {

            progressText.textContent =
                "Lesson completed. Well done!";

        }


        const buttons =
            document.querySelectorAll(
                "#finishReadingBtn, #mobileFinishReadingBtn"
            );


        buttons.forEach(
            button => {

                button.disabled = true;

                button.innerHTML = `
                    <span class="finish-icon">
                        <i class="fa-solid fa-circle-check"></i>
                    </span>

                    <span class="finish-text">

                        <strong>
                            Lesson Completed
                        </strong>

                        <small>
                            You have marked this lesson as read
                        </small>

                    </span>
                `;

            }
        );


        /*
         * Store locally for now.
         *
         * This does NOT submit anything to the backend.
         * It simply remembers that the lesson was read
         * on this device.
         */

        if (currentLesson) {

            const key =
                `lesson-read-${selectedClass}-${currentLesson.lesson}-${currentLesson.topic}`;


            localStorage.setItem(
                key,
                "true"
            );

        }

    }


    /* =====================================================
       FINISH BUTTON EVENTS
    ===================================================== */

    function setupFinishButtons() {

        const desktopButton =
            $("finishReadingBtn");


        const mobileButton =
            $("mobileFinishReadingBtn");


        if (desktopButton) {

            desktopButton.addEventListener(
                "click",
                finishLesson
            );

        }


        if (mobileButton) {

            mobileButton.addEventListener(
                "click",
                finishLesson
            );

        }

    }


    /* =====================================================
       SETUP READING PROGRESS
    ===================================================== */

    function setupReadingProgress() {

        if (progressHandlerAttached) {

            return;

        }


        progressHandlerAttached = true;


        let ticking = false;


        window.addEventListener(
            "scroll",
            () => {

                if (ticking) {

                    return;

                }


                window.requestAnimationFrame(
                    () => {

                        updateReadingProgress();

                        ticking = false;

                    }
                );


                ticking = true;

            },
            {
                passive: true
            }
        );


        window.addEventListener(
            "resize",
            () => {

                updateReadingProgress();

            }
        );

    }


    /* =====================================================
       INITIALIZATION
    ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            /*
             * Only initialize if this is actually
             * the lessons page.
             */

            if (
                !document.querySelector(
                    ".lessons-page"
                )
            ) {

                return;

            }


            console.log(
                "AFC Lessons: Initializing..."
            );


            setupClassTabs();

            setupFinishButtons();

            setupReadingProgress();

            loadLessons();

        }
    );


})();
