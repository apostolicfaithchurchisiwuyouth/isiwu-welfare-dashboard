/**
 * ============================================================
 * AFC ISIU YOUTH PORTAL V2
 * FILE: lessons.js
 * PURPOSE: WEEKLY LESSONS PAGE CONTROLLER
 * ============================================================
 *
 * PUBLIC:
 * - View lessons
 * - Open lessons
 * - Read lesson sections
 * - Track reading progress
 *
 * AUTHENTICATED:
 * - Confirm lesson completion
 * - Reflection
 * - Quiz unlock
 *
 * ============================================================
 */

"use strict";


const LessonsPage = (function () {


    /* ========================================================
       STATE
    ======================================================== */

    let lessons = [];

    let currentLessonId = null;

    let currentContainer = null;

    let progressHandler = null;

    let readingStartedAt = null;


    /* ========================================================
       HELPERS
    ======================================================== */

    function $(id) {

        return document.getElementById(id);

    }


    function escapeHtml(value) {

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


    function refreshIcons() {

        if (
            window.lucide &&
            typeof window.lucide.createIcons ===
                "function"
        ) {

            try {

                window.lucide.createIcons();

            } catch (error) {

                console.warn(
                    "[LESSONS] Icon refresh failed:",
                    error
                );

            }

        }

    }


    function showGlobalLoader(message) {

        if (
            window.AFC_Loader &&
            typeof window.AFC_Loader.show ===
                "function"
        ) {

            window.AFC_Loader.show(
                message
            );

        }

    }


    function hideGlobalLoader() {

        if (
            window.AFC_Loader &&
            typeof window.AFC_Loader.hide ===
                "function"
        ) {

            window.AFC_Loader.hide();

        }

    }


    /* ========================================================
       RESPONSE NORMALIZER
    ======================================================== */

    function getResponseData(response) {

        if (!response) {

            return null;

        }


        /*
         * Normal portal response:
         *
         * {
         *     success: true,
         *     data: [...]
         * }
         */

        if (
            response.data !== undefined
        ) {

            return response.data;

        }


        /*
         * Some API layers return:
         *
         * {
         *     success: true,
         *     result: [...]
         * }
         */

        if (
            response.result !== undefined
        ) {

            return response.result;

        }


        /*
         * Direct array.
         */

        return response;

    }


    /* ========================================================
       DATE
    ======================================================== */

    function formatDate(value) {

        if (!value) {

            return "";

        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return String(value);

        }


        return date.toLocaleDateString(
            "en-NG",
            {
                day:
                    "numeric",

                month:
                    "short",

                year:
                    "numeric"
            }
        );

    }


    /* ========================================================
       SORT
    ======================================================== */

    function sortLessons(list) {

        return [
            ...list
        ]

        .sort(
            function (a, b) {

                const aDate =
                    new Date(
                        a.lesson_date ||
                        a.published_at ||
                        a.created_at ||
                        0
                    );


                const bDate =
                    new Date(
                        b.lesson_date ||
                        b.published_at ||
                        b.created_at ||
                        0
                    );


                return (
                    bDate -
                    aDate
                );

            }
        );

    }


    /* ========================================================
       LESSON ID
    ======================================================== */

    function getLessonId(lesson) {

        return String(
            lesson?.lesson_id ||
            lesson?.id ||
            ""
        ).trim();

    }


    /* ========================================================
       API CHECK
    ======================================================== */

    function getApi() {

        if (
            window.API &&
            typeof window.API.get ===
                "function"
        ) {

            return window.API;

        }


        /*
         * Some older portal code exposes API
         * globally rather than through window.API.
         */

        if (
            typeof API !== "undefined" &&
            API &&
            typeof API.get ===
                "function"
        ) {

            return API;

        }


        return null;

    }


    /* ========================================================
       FETCH ALL LESSONS
    ======================================================== */

    async function fetchLessons() {

        const api =
            getApi();


        if (!api) {

            throw new Error(
                "The portal API is not available on this page."
            );

        }


        console.log(
            "[LESSONS] Requesting getLessons..."
        );


        const response =
            await api.get(
                "getLessons"
            );


        console.log(
            "[LESSONS] getLessons response:",
            response
        );


        const data =
            getResponseData(
                response
            );


        /*
         * Backend returns an array inside data.
         */

        if (
            Array.isArray(data)
        ) {

            return data;

        }


        /*
         * Defensive support for:
         *
         * {
         *     lessons: [...]
         * }
         */

        if (
            data &&
            Array.isArray(
                data.lessons
            )
        ) {

            return data.lessons;

        }


        throw new Error(
            "The lessons API returned an unexpected format."
        );

    }


    /* ========================================================
       FETCH ONE LESSON
    ======================================================== */

    async function fetchLesson(
        lessonId
    ) {

        const cleanId =
            String(
                lessonId || ""
            ).trim();


        if (!cleanId) {

            throw new Error(
                "No lesson ID was supplied."
            );

        }


        const api =
            getApi();


        if (!api) {

            throw new Error(
                "The portal API is not available on this page."
            );

        }


        console.log(
            "[LESSONS] Opening lesson:",
            cleanId
        );


        const response =
            await api.get(
                "getLesson",
                {
                    lesson_id:
                        cleanId
                }
            );


        console.log(
            "[LESSONS] getLesson response:",
            response
        );


        const data =
            getResponseData(
                response
            );


        if (!data) {

            throw new Error(
                "The backend returned no lesson data."
            );

        }


        /*
         * Normal backend response:
         *
         * {
         *     lesson: {...},
         *     sections: [...]
         * }
         */

        if (
            data.lesson
        ) {

            if (
                !Array.isArray(
                    data.sections
                )
            ) {

                data.sections = [];

            }


            if (
                !Array.isArray(
                    data.reflection_questions
                )
            ) {

                data.reflection_questions = [];

            }


            return data;

        }


        /*
         * Defensive support in case
         * the API returns the lesson directly.
         */

        if (
            data.lesson_id ||
            data.id
        ) {

            return {
                lesson:
                    data,

                sections:
                    [],

                reflection_questions:
                    []
            };

        }


        throw new Error(
            "The requested lesson could not be loaded."
        );

    }


    /* ========================================================
       LOADING
    ======================================================== */

    function renderLoading() {

        return `

            <div
                class="lessons-page lessons-loading-state"
            >

                <div class="lesson-loading-icon">

                    <span
                        data-lucide="book-open"
                    ></span>

                </div>


                <h1>
                    Loading weekly lessons...
                </h1>


                <p>
                    Please wait while we bring you
                    this week's lessons.
                </p>

            </div>

        `;

    }


    /* ========================================================
       EMPTY
    ======================================================== */

    function renderEmpty() {

        return `

            <div class="lessons-page">

                <div class="lesson-state">

                    <div class="lesson-state-icon">

                        <span
                            data-lucide="book-open"
                        ></span>

                    </div>


                    <h2>
                        No lessons yet
                    </h2>


                    <p>
                        There are currently no published
                        lessons available.
                    </p>

                </div>

            </div>

        `;

    }


    /* ========================================================
       ERROR
    ======================================================== */

    function renderError(
        message
    ) {

        return `

            <div class="lessons-page">

                <div
                    class="
                        lesson-state
                        lesson-state-error
                    "
                >

                    <div class="lesson-state-icon">

                        <span
                            data-lucide="triangle-alert"
                        ></span>

                    </div>


                    <h2>
                        Unable to load lessons
                    </h2>


                    <p>
                        ${escapeHtml(
                            message ||
                            "Something went wrong while loading the lessons."
                        )}
                    </p>


                    <button
                        type="button"
                        class="lesson-retry-button"
                        id="retryLessonsButton"
                    >

                        <span
                            data-lucide="rotate-cw"
                        ></span>

                        <span>
                            Try Again
                        </span>

                    </button>

                </div>

            </div>

        `;

    }


    /* ========================================================
       LESSON CARD
    ======================================================== */

    function renderLessonCard(
        lesson
    ) {

        const lessonId =
            getLessonId(
                lesson
            );


        return `

            <article
                class="lesson-card"
            >

                <div
                    class="lesson-card-top"
                >

                    <span
                        class="lesson-card-week"
                    >

                        ${
                            lesson.week_number
                                ? `Week ${escapeHtml(
                                    lesson.week_number
                                )}`
                                : "Weekly Lesson"
                        }

                    </span>


                    <span
                        class="lesson-card-type"
                    >

                        ${escapeHtml(
                            lesson.lesson_type ||
                            "Youth Lesson"
                        )}

                    </span>

                </div>


                <div
                    class="lesson-card-body"
                >

                    <h3>

                        ${escapeHtml(
                            lesson.title ||
                            "Untitled Lesson"
                        )}

                    </h3>


                    <p>

                        ${escapeHtml(
                            lesson.description ||
                            "Open this lesson to begin reading."
                        )}

                    </p>

                </div>


                <div
                    class="lesson-card-footer"
                >

                    <span
                        class="lesson-card-date"
                    >

                        ${escapeHtml(
                            formatDate(
                                lesson.lesson_date
                            )
                        )}

                    </span>


                    <button
                        type="button"
                        class="lesson-card-button"
                        data-open-lesson="${escapeHtml(
                            lessonId
                        )}"
                    >

                        <span>
                            Read lesson
                        </span>

                        <span
                            data-lucide="arrow-up-right"
                        ></span>

                    </button>

                </div>

            </article>

        `;

    }


    /* ========================================================
       LESSON HUB
    ======================================================== */

    function renderHub(
        lessonList
    ) {

        if (
            !Array.isArray(
                lessonList
            ) ||
            lessonList.length === 0
        ) {

            return renderEmpty();

        }


        const sorted =
            sortLessons(
                lessonList
            );


        const featured =
            sorted[0];


        const previous =
            sorted.slice(1);


        const featuredId =
            getLessonId(
                featured
            );


        return `

            <div class="lessons-page">


                <!-- PAGE HEADING -->

                <header
                    class="lesson-page-heading"
                >

                    <div>

                        <span class="eyebrow">
                            Weekly Lessons
                        </span>


                        <h1>
                            Grow in God's Word.
                        </h1>


                        <p>
                            Read, reflect and keep growing
                            in your walk with Christ.
                        </p>

                    </div>

                </header>


                <!-- FEATURED -->

                <article
                    class="lesson-featured"
                >


                    <div
                        class="lesson-featured-content"
                    >

                        <div
                            class="lesson-featured-top"
                        >

                            <span
                                class="lesson-current-badge"
                            >

                                <span
                                    class="status-dot"
                                ></span>

                                Current lesson

                            </span>


                            ${
                                featured.week_number
                                    ? `
                                        <span
                                            class="lesson-featured-week"
                                        >
                                            Week ${escapeHtml(
                                                featured.week_number
                                            )}
                                        </span>
                                    `
                                    : ""
                            }

                        </div>


                        <h2>

                            ${escapeHtml(
                                featured.title ||
                                "Weekly Lesson"
                            )}

                        </h2>


                        <p>

                            ${escapeHtml(
                                featured.description ||
                                "Start reading this week's lesson."
                            )}

                        </p>


                        <div
                            class="lesson-featured-meta"
                        >

                            ${
                                featured.lesson_type
                                    ? `
                                        <span>

                                            <span
                                                data-lucide="book-open"
                                            ></span>

                                            ${escapeHtml(
                                                featured.lesson_type
                                            )}

                                        </span>
                                    `
                                    : ""
                            }


                            ${
                                featured.lesson_date
                                    ? `
                                        <span>

                                            <span
                                                data-lucide="calendar-days"
                                            ></span>

                                            ${escapeHtml(
                                                formatDate(
                                                    featured.lesson_date
                                                )
                                            )}

                                        </span>
                                    `
                                    : ""
                            }

                        </div>


                        <button
                            type="button"
                            class="lesson-start-button"
                            data-open-lesson="${escapeHtml(
                                featuredId
                            )}"
                        >

                            <span>
                                Start reading
                            </span>

                            <span
                                data-lucide="arrow-right"
                            ></span>

                        </button>

                    </div>


                    <div
                        class="lesson-featured-art"
                        aria-hidden="true"
                    >

                        <div
                            class="
                                lesson-art-circle
                                circle-one
                            "
                        ></div>


                        <div
                            class="
                                lesson-art-circle
                                circle-two
                            "
                        ></div>


                        <div
                            class="lesson-art-book"
                        >

                            <span
                                data-lucide="book-open"
                            ></span>

                        </div>

                    </div>

                </article>


                <!-- PREVIOUS -->

                ${
                    previous.length
                        ? `

                            <section
                                class="lessons-history"
                            >

                                <div
                                    class="
                                        lessons-section-heading
                                    "
                                >

                                    <div>

                                        <span
                                            class="eyebrow"
                                        >
                                            Library
                                        </span>

                                        <h2>
                                            Previous lessons
                                        </h2>

                                    </div>


                                    <span
                                        class="lesson-count"
                                    >

                                        ${previous.length}

                                        ${
                                            previous.length === 1
                                                ? "lesson"
                                                : "lessons"
                                        }

                                    </span>

                                </div>


                                <div
                                    class="lessons-grid"
                                >

                                    ${previous
                                        .map(
                                            renderLessonCard
                                        )
                                        .join("")}

                                </div>

                            </section>

                        `
                        : ""
                }

            </div>

        `;

    }


    /* ========================================================
       FORMAT CONTENT
    ======================================================== */

    function formatContent(
        content
    ) {

        if (!content) {

            return "";

        }


        /*
         * Your lesson section content may already
         * contain HTML formatting.
         *
         * We therefore preserve HTML here.
         */

        return String(
            content
        );

    }


    /* ========================================================
       READER
    ======================================================== */

    function renderReader(
        data
    ) {

        const lesson =
            data.lesson;


        const sections =
            Array.isArray(
                data.sections
            )
                ? data.sections
                : [];


        readingStartedAt =
            Date.now();


        return `

            <div
                class="lessons-page lesson-reader"
            >


                <!-- BACK -->

                <div
                    class="lesson-reader-topbar"
                >

                    <button
                        type="button"
                        class="lesson-back-button"
                        id="backToLessonsButton"
                    >

                        <span
                            data-lucide="arrow-left"
                        ></span>

                        <span>
                            All lessons
                        </span>

                    </button>


                    <span
                        class="lesson-reader-label"
                    >
                        Reading
                    </span>

                </div>


                <!-- HEADER -->

                <header
                    class="lesson-reader-header"
                >

                    <div
                        class="lesson-reader-badges"
                    >

                        ${
                            lesson.week_number
                                ? `
                                    <span
                                        class="reader-badge"
                                    >
                                        Week ${escapeHtml(
                                            lesson.week_number
                                        )}
                                    </span>
                                `
                                : ""
                        }


                        ${
                            lesson.lesson_type
                                ? `
                                    <span
                                        class="
                                            reader-badge
                                            muted
                                        "
                                    >
                                        ${escapeHtml(
                                            lesson.lesson_type
                                        )}
                                    </span>
                                `
                                : ""
                        }

                    </div>


                    <h1>

                        ${escapeHtml(
                            lesson.title ||
                            "Weekly Lesson"
                        )}

                    </h1>


                    ${
                        lesson.description
                            ? `
                                <p
                                    class="
                                        lesson-reader-description
                                    "
                                >
                                    ${escapeHtml(
                                        lesson.description
                                    )}
                                </p>
                            `
                            : ""
                    }


                    <div
                        class="lesson-reader-meta"
                    >

                        ${
                            lesson.lesson_date
                                ? `
                                    <span>

                                        <span
                                            data-lucide="calendar-days"
                                        ></span>

                                        ${escapeHtml(
                                            formatDate(
                                                lesson.lesson_date
                                            )
                                        )}

                                    </span>
                                `
                                : ""
                        }


                        ${
                            sections.length
                                ? `
                                    <span>

                                        <span
                                            data-lucide="book-open"
                                        ></span>

                                        ${sections.length}

                                        ${
                                            sections.length === 1
                                                ? " section"
                                                : " sections"
                                        }

                                    </span>
                                `
                                : ""
                        }

                    </div>

                </header>


                <!-- READING PROGRESS -->

                <div
                    class="reading-progress-track"
                    aria-label="Reading progress"
                >

                    <div
                        class="reading-progress-value"
                        id="readingProgressBar"
                    ></div>

                </div>


                <!-- READER -->

                <div
                    class="lesson-reader-layout"
                >


                    <main
                        class="lesson-reading-content"
                    >

                        ${
                            sections.length
                                ? sections
                                    .map(
                                        function (
                                            section,
                                            index
                                        ) {

                                            return `

                                                <section
                                                    class="
                                                        lesson-reading-section
                                                    "
                                                    id="
                                                        lesson-section-${index + 1}
                                                    "
                                                >

                                                    <div
                                                        class="section-number"
                                                    >

                                                        ${escapeHtml(
                                                            section.section_number ||
                                                            index + 1
                                                        )}

                                                    </div>


                                                    <div
                                                        class="section-main"
                                                    >

                                                        ${
                                                            section.title
                                                                ? `
                                                                    <h2>

                                                                        ${escapeHtml(
                                                                            section.title
                                                                        )}

                                                                    </h2>
                                                                `
                                                                : ""
                                                        }


                                                        <div
                                                            class="section-text"
                                                        >

                                                            ${formatContent(
                                                                section.content
                                                            )}

                                                        </div>

                                                    </div>

                                                </section>

                                            `;

                                        }
                                    )
                                    .join("")
                                : `

                                    <div
                                        class="lesson-no-content"
                                    >

                                        <span
                                            data-lucide="book-open"
                                        ></span>

                                        <h2>
                                            Lesson content is coming soon
                                        </h2>

                                        <p>
                                            This lesson has been published,
                                            but its reading sections are
                                            not available yet.
                                        </p>

                                    </div>

                                `
                        }

                    </main>


                    <!-- SIDEBAR -->

                    <aside
                        class="lesson-reader-sidebar"
                    >

                        <div
                            class="reader-sidebar-card"
                        >

                            <span
                                class="reader-sidebar-icon"
                            >

                                <span
                                    data-lucide="sparkles"
                                ></span>

                            </span>


                            <h3>
                                Read with purpose
                            </h3>


                            <p>
                                Take your time. Think about
                                what God is teaching you and
                                how you can apply it.
                            </p>

                        </div>


                        ${
                            sections.length
                                ? `

                                    <div
                                        class="reader-section-list"
                                    >

                                        <span
                                            class="
                                                reader-sidebar-heading
                                            "
                                        >
                                            In this lesson
                                        </span>


                                        ${sections
                                            .map(
                                                function (
                                                    section,
                                                    index
                                                ) {

                                                    return `

                                                        <a
                                                            href="#lesson-section-${index + 1}"
                                                            class="
                                                                reader-section-link
                                                            "
                                                        >

                                                            <span>
                                                                ${index + 1}
                                                            </span>

                                                            <strong>

                                                                ${escapeHtml(
                                                                    section.title ||
                                                                    "Section " +
                                                                    (index + 1)
                                                                )}

                                                            </strong>

                                                        </a>

                                                    `;

                                                }
                                            )
                                            .join("")}

                                    </div>

                                `
                                : ""
                        }

                    </aside>

                </div>


                <!-- =================================================
                     COMPLETION
                ================================================== -->

                <section
                    class="lesson-completion-card"
                >

                    <div
                        class="completion-icon"
                    >

                        <span
                            data-lucide="check"
                        ></span>

                    </div>


                    <div
                        class="completion-copy"
                    >

                        <span
                            class="eyebrow"
                        >
                            Finished reading?
                        </span>


                        <h3>
                            I've read this lesson
                        </h3>


                        <p>
                            Confirm that you have finished
                            reading this lesson to continue
                            to the reflection step.
                        </p>


                        <span
                            class="lesson-reading-time"
                            id="lessonReadingTime"
                        >

                            <span
                                data-lucide="clock-3"
                            ></span>

                            Reading time: calculating...

                        </span>

                    </div>


                    <button
                        type="button"
                        class="lesson-complete-button"
                        id="lessonReadCompleteButton"
                    >

                        <span
                            data-lucide="check"
                        ></span>

                        <span>
                            I've read this lesson
                        </span>

                    </button>

                </section>

            </div>

        `;

    }


    /* ========================================================
       HUB EVENTS
    ======================================================== */

    function bindHubEvents(
        container
    ) {

        if (!container) {

            return;

        }


        container
            .querySelectorAll(
                "[data-open-lesson]"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            const lessonId =
                                String(
                                    button.getAttribute(
                                        "data-open-lesson"
                                    ) || ""
                                ).trim();


                            if (!lessonId) {

                                console.error(
                                    "[LESSONS] Missing lesson ID."
                                );

                                return;

                            }


                            openLesson(
                                lessonId,
                                container
                            );

                        }
                    );

                }
            );


        refreshIcons();

    }


    /* ========================================================
       ERROR EVENTS
    ======================================================== */

    function bindErrorEvents(
        container
    ) {

        const retry =
            container.querySelector(
                "#retryLessonsButton"
            );


        if (retry) {

            retry.addEventListener(
                "click",
                function () {

                    render(
                        container
                    );

                }
            );

        }


        refreshIcons();

    }


    /* ========================================================
       READER EVENTS
    ======================================================== */

    function bindReaderEvents(
        container
    ) {

        if (!container) {

            return;

        }


        const back =
            container.querySelector(
                "#backToLessonsButton"
            );


        const complete =
            container.querySelector(
                "#lessonReadCompleteButton"
            );


        if (back) {

            back.addEventListener(
                "click",
                function () {

                    removeProgressListener();


                    window.scrollTo({
                        top: 0,
                        behavior: "smooth"
                    });


                    render(
                        container
                    );

                }
            );

        }


        if (complete) {

            complete.addEventListener(
                "click",
                function () {

                    handleLessonCompletion(
                        currentLessonId
                    );

                }
            );

        }


        container
            .querySelectorAll(
                ".reader-section-link"
            )
            .forEach(
                function (link) {

                    link.addEventListener(
                        "click",
                        function (event) {

                            event.preventDefault();


                            const href =
                                link.getAttribute(
                                    "href"
                                ) || "";


                            const targetId =
                                href.replace(
                                    "#",
                                    ""
                                );


                            const target =
                                document.getElementById(
                                    targetId
                                );


                            if (target) {

                                target.scrollIntoView({
                                    behavior:
                                        "smooth",

                                    block:
                                        "start"
                                });

                            }

                        }
                    );

                }
            );


        refreshIcons();

    }


    /* ========================================================
       READING TIME
    ======================================================== */

    function updateReadingTime() {

        const element =
            $("lessonReadingTime");


        if (
            !element ||
            !readingStartedAt
        ) {

            return;

        }


        const seconds =
            Math.max(
                0,
                Math.floor(
                    (
                        Date.now() -
                        readingStartedAt
                    ) / 1000
                )
            );


        const minutes =
            Math.floor(
                seconds / 60
            );


        const remainingSeconds =
            seconds % 60;


        let text;


        if (minutes > 0) {

            text =
                `Reading time: ${minutes}m ${String(
                    remainingSeconds
                ).padStart(2, "0")}s`;

        } else {

            text =
                `Reading time: ${remainingSeconds}s`;

        }


        const icon =
            element.querySelector(
                "svg"
            );


        element.textContent =
            "";


        if (icon) {

            element.appendChild(
                icon
            );

        }


        element.appendChild(
            document.createTextNode(
                text
            )
        );

    }


    /* ========================================================
       READING PROGRESS
    ======================================================== */

    function initialiseReadingProgress() {

        removeProgressListener();


        const progressBar =
            $("readingProgressBar");


        if (!progressBar) {

            return;

        }


        function updateProgress() {

            const documentHeight =
                document.documentElement
                    .scrollHeight;


            const viewportHeight =
                window.innerHeight;


            const scrollable =
                Math.max(
                    1,
                    documentHeight -
                    viewportHeight
                );


            const current =
                window.scrollY;


            const percentage =
                Math.min(
                    100,
                    Math.max(
                        0,
                        (
                            current /
                            scrollable
                        ) * 100
                    )
                );


            progressBar.style.width =
                percentage + "%";


            updateReadingTime();

        }


        progressHandler =
            updateProgress;


        window.addEventListener(
            "scroll",
            progressHandler,
            {
                passive: true
            }
        );


        updateProgress();

    }


    /* ========================================================
       REMOVE PROGRESS LISTENER
    ======================================================== */

    function removeProgressListener() {

        if (
            progressHandler
        ) {

            window.removeEventListener(
                "scroll",
                progressHandler
            );

        }


        progressHandler =
            null;

    }


    /* ========================================================
       LESSON COMPLETION
    ======================================================== */

    function handleLessonCompletion(
        lessonId
    ) {

        console.log(
            "[LESSONS] Completion requested:",
            lessonId
        );


        /*
         * PUBLIC READING
         * -----------------------------
         *
         * Reading is public.
         *
         * Completion/reflection requires
         * authentication.
         */


        const authenticated =
            window.AFC &&
            window.AFC.state
                ? Boolean(
                    window.AFC.state
                        .authenticated
                )
                : false;


        if (!authenticated) {

            /*
             * Send the visitor to login.
             *
             * Preserve the lesson ID so we can
             * continue the flow later.
             */

            const returnUrl =
                encodeURIComponent(
                    window.location.pathname +
                    "?lesson=" +
                    encodeURIComponent(
                        lessonId
                    )
                );


            window.location.href =
                "../login.html?return=" +
                returnUrl;


            return;

        }


        /*
         * Phase 4B reflection flow.
         *
         * We intentionally stop here for now.
         */

        if (
            window.AFC &&
            typeof window.AFC.toast ===
                "function"
        ) {

            window.AFC.toast(
                "Lesson completed. Reflection will open next.",
                "success"
            );

        } else {

            alert(
                "Lesson completed. The reflection step will open next."
            );

        }

    }


    /* ========================================================
       MAIN RENDER
    ======================================================== */

    async function render(
        container
    ) {

        if (!container) {

            return;

        }


        currentContainer =
            container;


        removeProgressListener();


        currentLessonId =
            null;


        container.innerHTML =
            renderLoading();


        refreshIcons();


        showGlobalLoader(
            "Loading weekly lessons..."
        );


        try {

            lessons =
                await fetchLessons();


            lessons =
                sortLessons(
                    lessons
                );


            console.log(
                "[LESSONS] Lessons loaded:",
                lessons.length
            );


            container.innerHTML =
                renderHub(
                    lessons
                );


            bindHubEvents(
                container
            );


        } catch (error) {

            console.error(
                "[LESSONS LOAD ERROR]",
                error
            );


            container.innerHTML =
                renderError(
                    error?.message ||
                    "Unable to load lessons."
                );


            bindErrorEvents(
                container
            );

        } finally {

            hideGlobalLoader();

        }

    }


    /* ========================================================
       OPEN LESSON
    ======================================================== */

    async function openLesson(
        lessonId,
        container
    ) {

        if (
            !lessonId ||
            !container
        ) {

            return;

        }


        currentContainer =
            container;


        currentLessonId =
            String(
                lessonId
            ).trim();


        removeProgressListener();


        container.innerHTML =
            renderLoading();


        refreshIcons();


        showGlobalLoader(
            "Opening lesson..."
        );


        try {

            const data =
                await fetchLesson(
                    currentLessonId
                );


            container.innerHTML =
                renderReader(
                    data
                );


            bindReaderEvents(
                container
            );


            initialiseReadingProgress();


            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });


            updateReadingTime();


        } catch (error) {

            console.error(
                "[LESSON OPEN ERROR]",
                error
            );


            container.innerHTML =
                renderError(
                    error?.message ||
                    "Unable to load this lesson."
                );


            bindErrorEvents(
                container
            );

        } finally {

            hideGlobalLoader();

        }

    }


    /* ========================================================
       INITIALIZE
    ======================================================== */

    function initialize() {

        const container =
            $("lessonsPage");


        if (!container) {

            console.error(
                "[LESSONS] #lessonsPage was not found."
            );

            return;

        }


        render(
            container
        );

    }


    /* ========================================================
       PUBLIC API
    ======================================================== */

    return {

        render:
            render,

        openLesson:
            openLesson,

        fetchLessons:
            fetchLessons,

        fetchLesson:
            fetchLesson,

        reload:
            function () {

                if (
                    currentContainer
                ) {

                    render(
                        currentContainer
                    );

                }

            }

    };


})();


/* ============================================================
   GLOBAL EXPORT
============================================================ */

window.LessonsPage =
    LessonsPage;


/* ============================================================
   START
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        refreshLessonPageIcons();

        LessonsPage.render(
            document.getElementById(
                "lessonsPage"
            )
        );

    }
);


/* ============================================================
   ICON HELPER
============================================================ */

function refreshLessonPageIcons() {

    if (
        window.lucide &&
        typeof window.lucide.createIcons ===
            "function"
    ) {

        try {

            window.lucide.createIcons();

        } catch (error) {

            console.warn(
                "[LESSONS] Initial icon render failed:",
                error
            );

        }

    }

}


console.log(
    "AFC Isiu Youth Portal — lessons.js loaded."
);
