/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: holiday-learning.js
   PURPOSE: HOLIDAY LEARNING HUB
   STAGE 3 — LESSON READER CONNECTION
   ============================================================

   IMPORTANT:

   - This module is completely separate from Academic Help.
   - Academic Help remains untouched.
   - The Holiday Hub is fail-closed.
   - The backend is the authority for programme availability.
   - Lessons returned by the backend replace the local demo list.
   - Start Learning now opens the Holiday Lesson Reader.
   - The selected lesson is saved before navigation.
   - If the backend supplies a valid lessonUrl, it is used.
   - Otherwise the default reader route is:

       /pages/holiday-lesson.html?id=LESSON_ID

   BACKEND ACTION:

       GET ?action=getHolidayLearningStatus

   Expected response:

       {
           success: true,
           open: true,
           programmeName: "2026 Holiday Learning",
           message: "...",
           openingDate: "...",
           closingDate: "...",
           categories: [...],
           lessons: [...]
       }

   ============================================================ */

"use strict";


/* ============================================================
   CONFIGURATION
   ============================================================ */

const HOLIDAY_LEARNING_CONFIG = {

    /*
     * Existing AFC Isiwu Youth Portal Apps Script deployment.
     */
    API:
        "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec",

    STATUS_ACTION:
        "getHolidayLearningStatus",

    /*
     * Default lesson reader route.
     *
     * The selected lesson ID will be added as:
     *
     * /pages/holiday-lesson.html?id=HL-DIG-001
     */
    LESSON_READER:
        "/pages/holiday-lesson.html",

    /*
     * Selected lesson storage key.
     */
    SESSION_KEY:
        "afc_holiday_selected_lesson_v1",

    /*
     * Never assume Holiday Learning is open if the backend
     * cannot confirm its status.
     */
    FAIL_CLOSED:
        true

};


/* ============================================================
   STATE
   ============================================================ */

let holidayProgrammeOpen = false;

let holidayProgrammeName =
    "Holiday Learning";

let holidayProgrammeMessage =
    "";

let holidayActiveFilter =
    "All";

let holidayBackendLessonsLoaded =
    false;

let holidayStartingLesson =
    false;


/* ============================================================
   LOCAL FALLBACK LESSON DATA
   ============================================================

   These remain as a structural fallback.

   They are not authoritative once the backend successfully
   returns published lessons.

   ============================================================ */

const HOLIDAY_LESSONS = [

    {
        id:
            "HL-DIG-001",

        category:
            "Digital Skills",

        title:
            "Introduction to Canva",

        description:
            "Learn the basics of creating simple designs, posters and social media graphics.",

        level:
            "Beginner",

        duration:
            "20 min",

        icon:
            "fa-solid fa-pen-ruler"
    },


    {
        id:
            "HL-DIG-002",

        category:
            "Digital Skills",

        title:
            "Basic Computer Skills",

        description:
            "Understand important computer basics and become more confident using digital tools.",

        level:
            "Beginner",

        duration:
            "25 min",

        icon:
            "fa-solid fa-computer"
    },


    {
        id:
            "HL-DIG-003",

        category:
            "Digital Skills",

        title:
            "Using the Internet Wisely",

        description:
            "Learn how to search for information, protect your accounts and stay safer online.",

        level:
            "Beginner",

        duration:
            "20 min",

        icon:
            "fa-solid fa-globe"
    },


    {
        id:
            "HL-CAR-001",

        category:
            "Career & Future Skills",

        title:
            "Discover Your Strengths",

        description:
            "Start thinking about your interests, strengths and the kind of work you may enjoy.",

        level:
            "Starter",

        duration:
            "15 min",

        icon:
            "fa-solid fa-compass"
    },


    {
        id:
            "HL-CAR-002",

        category:
            "Career & Future Skills",

        title:
            "Communication Skills",

        description:
            "Learn simple ways to communicate clearly, confidently and respectfully.",

        level:
            "Beginner",

        duration:
            "20 min",

        icon:
            "fa-solid fa-comments"
    },


    {
        id:
            "HL-CAR-003",

        category:
            "Career & Future Skills",

        title:
            "Understanding a CV",

        description:
            "Learn what a CV is and what information should appear in a good beginner CV.",

        level:
            "Starter",

        duration:
            "20 min",

        icon:
            "fa-solid fa-file-lines"
    },


    {
        id:
            "HL-CHA-001",

        category:
            "Holiday Challenges",

        title:
            "7-Day Learning Challenge",

        description:
            "Choose one useful skill and spend a little time learning and practising it each day.",

        level:
            "Challenge",

        duration:
            "7 days",

        icon:
            "fa-solid fa-bolt"
    },


    {
        id:
            "HL-CHA-002",

        category:
            "Holiday Challenges",

        title:
            "Create Something",

        description:
            "Use something you have learned to create a small project you can be proud of.",

        level:
            "Challenge",

        duration:
            "30 min",

        icon:
            "fa-solid fa-wand-magic-sparkles"
    },


    {
        id:
            "HL-CRE-001",

        category:
            "Creative Skills",

        title:
            "Content Creation Basics",

        description:
            "Learn how to plan a simple piece of useful and responsible digital content.",

        level:
            "Beginner",

        duration:
            "20 min",

        icon:
            "fa-solid fa-clapperboard"
    },


    {
        id:
            "HL-CRE-002",

        category:
            "Creative Skills",

        title:
            "Simple Design Principles",

        description:
            "Understand spacing, balance, text and colour when creating simple designs.",

        level:
            "Beginner",

        duration:
            "20 min",

        icon:
            "fa-solid fa-palette"
    }

];


/* ============================================================
   DOM HELPER
   ============================================================ */

function holidayElement(id) {

    return document.getElementById(id);

}


/* ============================================================
   ESCAPE HTML
   ============================================================ */

function escapeHolidayHTML(value) {

    return String(value ?? "")
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
   SAFE ICON CLASS
   ============================================================ */

function getSafeHolidayIcon(icon) {

    const value =
        String(
            icon ||
            "fa-solid fa-book-open"
        ).trim();


    if (
        !/^[a-zA-Z0-9\s-]+$/.test(
            value
        )
    ) {

        return "fa-solid fa-book-open";

    }


    return value;

}


/* ============================================================
   SAFE INTERNAL URL
   ============================================================

   Only allow same-site relative URLs.

   ============================================================ */

function getSafeHolidayLessonUrl(
    lessonUrl
) {

    const value =
        String(
            lessonUrl ||
            ""
        ).trim();


    if (!value) {

        return "";

    }


    /*
     * Only allow URLs beginning with "/".
     */

    if (
        !value.startsWith("/")
    ) {

        return "";

    }


    /*
     * Prevent protocol-style URLs disguised inside
     * a relative path.
     */

    if (
        value.startsWith("//")
    ) {

        return "";

    }


    return value;

}


/* ============================================================
   API GET
   ============================================================ */

async function holidayApiGet(action) {

    const url =
        new URL(
            HOLIDAY_LEARNING_CONFIG.API
        );


    url.searchParams.set(
        "action",
        action
    );


    const response =
        await fetch(
            url.toString(),
            {
                method:
                    "GET",

                cache:
                    "no-store",

                headers: {
                    "Accept":
                        "application/json"
                }
            }
        );


    if (!response.ok) {

        throw new Error(
            "Holiday Learning API returned HTTP " +
            response.status
        );

    }


    const data =
        await response.json();


    return data;

}


/* ============================================================
   DOM READY
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initializeHolidayLearning
);


/* ============================================================
   INITIALIZE
   ============================================================ */

async function initializeHolidayLearning() {

    /*
     * Always begin closed.
     */

    setHolidayProgrammeState(
        false
    );


    /*
     * Prepare existing UI controls.
     */

    setupHolidayFilters();

    setupHolidayCategoryCards();

    setupHolidayClearFilter();


    /*
     * Render initial lesson structure.
     */

    renderHolidayLessons();


    /*
     * Ask backend for authoritative status.
     */

    await loadHolidayProgrammeStatus();

}


/* ============================================================
   LOAD PROGRAMME STATUS
   ============================================================ */

async function loadHolidayProgrammeStatus() {

    const statusElement =
        holidayElement(
            "holidayProgrammeStatus"
        );


    if (statusElement) {

        statusElement.className =
            "holiday-status is-checking";


        statusElement.innerHTML = `
            <span class="holiday-status-dot"></span>
            Checking programme...
        `;

    }


    try {

        const response =
            await holidayApiGet(
                HOLIDAY_LEARNING_CONFIG.STATUS_ACTION
            );


        /*
         * Malformed response = unavailable.
         */

        if (
            !response ||
            response.success === false
        ) {

            throw new Error(
                response?.message ||
                "Holiday programme status is unavailable."
            );

        }


        /*
         * Backend is authoritative.
         */

        holidayProgrammeOpen =
            response.open === true;


        holidayProgrammeName =
            String(
                response.programmeName ||
                "Holiday Learning"
            ).trim();


        holidayProgrammeMessage =
            String(
                response.message ||
                ""
            ).trim();


        /*
         * Update programme name.
         */

        const programmeNameElement =
            holidayElement(
                "holidayProgrammeName"
            );


        if (programmeNameElement) {

            programmeNameElement.textContent =
                holidayProgrammeName;

        }


        /*
         * Update closed message.
         */

        const closedMessage =
            holidayElement(
                "holidayClosedMessage"
            );


        if (
            closedMessage &&
            holidayProgrammeMessage
        ) {

            closedMessage.textContent =
                holidayProgrammeMessage;

        }


        /*
         * Load backend lessons.
         */

        if (
            Array.isArray(
                response.lessons
            )
        ) {

            replaceHolidayLessons(
                response.lessons
            );

            holidayBackendLessonsLoaded =
                true;

        }


        /*
         * Update categories.
         */

        if (
            Array.isArray(
                response.categories
            )
        ) {

            updateHolidayCategoryFilters(
                response.categories
            );

        }


        /*
         * Finally expose or hide the hub.
         */

        setHolidayProgrammeState(
            holidayProgrammeOpen
        );


    } catch (error) {

        console.warn(
            "Holiday Learning status could not be loaded:",
            error
        );


        holidayProgrammeOpen =
            false;


        if (
            HOLIDAY_LEARNING_CONFIG.FAIL_CLOSED
        ) {

            setHolidayProgrammeState(
                false,
                true
            );

        }

    }

}


/* ============================================================
   REPLACE LESSONS WITH BACKEND DATA
   ============================================================ */

function replaceHolidayLessons(
    lessons
) {

    const validLessons =
        lessons
            .filter(
                function(lesson) {

                    return (
                        lesson &&
                        typeof lesson ===
                            "object"
                    );

                }
            )
            .map(
                function(lesson) {

                    return {

                        id:
                            String(
                                lesson.id ||
                                lesson.lessonId ||
                                ""
                            ).trim(),

                        category:
                            String(
                                lesson.category ||
                                "Learning"
                            ).trim(),

                        title:
                            String(
                                lesson.title ||
                                "Learning activity"
                            ).trim(),

                        description:
                            String(
                                lesson.description ||
                                "A practical holiday learning activity."
                            ).trim(),

                        level:
                            String(
                                lesson.level ||
                                "Beginner"
                            ).trim(),

                        duration:
                            String(
                                lesson.duration ||
                                "Short lesson"
                            ).trim(),

                        icon:
                            getSafeHolidayIcon(
                                lesson.icon
                            ),

                        /*
                         * Keep a backend lesson URL if one
                         * exists.
                         */

                        lessonUrl:
                            String(
                                lesson.lessonUrl ||
                                lesson.lesson_url ||
                                ""
                            ).trim(),

                        /*
                         * Keep possible lesson content fields.
                         *
                         * These will allow the lesson reader to
                         * use richer backend content when it is
                         * returned by the backend.
                         */

                        content:
                            lesson.content ||
                            lesson.lessonContent ||
                            lesson.lesson_content ||
                            "",

                        body:
                            lesson.body ||
                            lesson.lessonBody ||
                            lesson.lesson_body ||
                            "",

                        sections:
                            Array.isArray(
                                lesson.sections
                            )
                                ? lesson.sections
                                : [],

                        objectives:
                            Array.isArray(
                                lesson.objectives
                            )
                                ? lesson.objectives
                                : [],

                        status:
                            String(
                                lesson.status ||
                                "Published"
                            ).trim()

                    };

                }
            )
            .filter(
                function(lesson) {

                    return (
                        lesson.id &&
                        lesson.title
                    );

                }
            );


    /*
     * Replace only when the backend returned real lessons.
     */

    if (
        validLessons.length
    ) {

        HOLIDAY_LESSONS.splice(
            0,
            HOLIDAY_LESSONS.length,
            ...validLessons
        );

    }


    renderHolidayLessons();

}


/* ============================================================
   UPDATE CATEGORY FILTERS
   ============================================================ */

function updateHolidayCategoryFilters(
    categories
) {

    const filterRow =
        holidayElement(
            "holidayFilterRow"
        );


    if (!filterRow) {

        return;

    }


    const existingAllButton =
        filterRow.querySelector(
            '[data-category="All"]'
        );


    const allButtonHTML =
        existingAllButton
            ? existingAllButton.outerHTML
            : `
                <button
                    type="button"
                    class="holiday-filter active"
                    data-category="All"
                >
                    All
                </button>
            `;


    const categoryButtons =
        categories
            .filter(
                function(category) {

                    return (
                        category &&
                        typeof category ===
                            "object"
                    );

                }
            )
            .map(
                function(category) {

                    const name =
                        String(
                            category.categoryName ||
                            category.name ||
                            category.category ||
                            ""
                        ).trim();


                    if (!name) {

                        return "";

                    }


                    return `
                        <button
                            type="button"
                            class="holiday-filter"
                            data-category="${escapeHolidayHTML(name)}"
                        >
                            ${escapeHolidayHTML(name)}
                        </button>
                    `;

                }
            )
            .filter(Boolean)
            .join("");


    if (categoryButtons) {

        filterRow.innerHTML =
            allButtonHTML +
            categoryButtons;

    }


    holidayActiveFilter =
        "All";


    filterRow
        .querySelectorAll(
            ".holiday-filter"
        )
        .forEach(
            function(button) {

                button.classList.toggle(
                    "active",
                    button.dataset.category ===
                        "All"
                );

            }
        );

}


/* ============================================================
   SET PROGRAMME STATE
   ============================================================ */

function setHolidayProgrammeState(
    isOpen,
    backendUnavailable = false
) {

    const heroStatus =
        holidayElement(
            "holidayProgrammeStatus"
        );

    const closedState =
        holidayElement(
            "holidayClosedState"
        );

    const hubContent =
        holidayElement(
            "holidayHubContent"
        );


    /*
     * OPEN
     */

    if (isOpen) {

        if (heroStatus) {

            heroStatus.className =
                "holiday-status is-open";

            heroStatus.innerHTML = `
                <span class="holiday-status-dot"></span>
                Holiday programme open
            `;

        }


        if (closedState) {

            closedState.hidden =
                true;

        }


        if (hubContent) {

            hubContent.hidden =
                false;

        }


        return;

    }


    /*
     * CLOSED / UNAVAILABLE
     */

    if (heroStatus) {

        heroStatus.className =
            "holiday-status is-closed";


        heroStatus.innerHTML = `
            <span class="holiday-status-dot"></span>
            ${
                backendUnavailable
                    ? "Programme unavailable"
                    : "Programme closed"
            }
        `;

    }


    if (closedState) {

        closedState.hidden =
            false;

    }


    if (hubContent) {

        hubContent.hidden =
            true;

    }

}


/* ============================================================
   FILTER SETUP
   ============================================================ */

function setupHolidayFilters() {

    const filterRow =
        holidayElement(
            "holidayFilterRow"
        );


    if (!filterRow) {

        return;

    }


    filterRow.addEventListener(
        "click",
        function(event) {

            const button =
                event.target.closest(
                    ".holiday-filter"
                );


            if (!button) {

                return;

            }


            const category =
                button.dataset.category ||
                "All";


            holidayActiveFilter =
                category;


            filterRow
                .querySelectorAll(
                    ".holiday-filter"
                )
                .forEach(
                    function(item) {

                        item.classList.toggle(
                            "active",
                            item === button
                        );

                    }
                );


            renderHolidayLessons();

        }
    );

}


/* ============================================================
   CATEGORY CARDS
   ============================================================ */

function setupHolidayCategoryCards() {

    const grid =
        holidayElement(
            "holidayCategoryGrid"
        );


    if (!grid) {

        return;

    }


    grid.addEventListener(
        "click",
        function(event) {

            const card =
                event.target.closest(
                    ".holiday-category-card"
                );


            if (!card) {

                return;

            }


            const category =
                card.dataset.category;


            if (!category) {

                return;

            }


            holidayActiveFilter =
                category;


            const filters =
                document.querySelectorAll(
                    ".holiday-filter"
                );


            filters.forEach(
                function(filter) {

                    filter.classList.toggle(
                        "active",
                        filter.dataset.category ===
                            category
                    );

                }
            );


            renderHolidayLessons();


            const lessonSection =
                holidayElement(
                    "holidayLessonsSection"
                );


            if (lessonSection) {

                lessonSection.scrollIntoView({
                    behavior:
                        "smooth",

                    block:
                        "start"
                });

            }

        }
    );

}


/* ============================================================
   CLEAR FILTER
   ============================================================ */

function setupHolidayClearFilter() {

    const button =
        holidayElement(
            "holidayClearFilter"
        );


    if (!button) {

        return;

    }


    button.addEventListener(
        "click",
        function() {

            holidayActiveFilter =
                "All";


            document
                .querySelectorAll(
                    ".holiday-filter"
                )
                .forEach(
                    function(filter) {

                        filter.classList.toggle(
                            "active",
                            filter.dataset.category ===
                                "All"
                        );

                    }
                );


            renderHolidayLessons();

        }
    );

}


/* ============================================================
   RENDER LESSONS
   ============================================================ */

function renderHolidayLessons() {

    const grid =
        holidayElement(
            "holidayLessonGrid"
        );

    const emptyState =
        holidayElement(
            "holidayEmptyState"
        );


    if (!grid) {

        return;

    }


    let lessons =
        HOLIDAY_LESSONS.slice();


    /*
     * Apply category filter.
     */

    if (
        holidayActiveFilter !==
        "All"
    ) {

        lessons =
            lessons.filter(
                function(lesson) {

                    return (
                        String(
                            lesson.category ||
                            ""
                        ).trim() ===
                        holidayActiveFilter
                    );

                }
            );

    }


    /*
     * Empty state.
     */

    if (!lessons.length) {

        grid.innerHTML =
            "";


        if (emptyState) {

            emptyState.hidden =
                false;

        }


        return;

    }


    if (emptyState) {

        emptyState.hidden =
            true;

    }


    /*
     * Render lesson cards.
     */

    grid.innerHTML =
        lessons
            .map(
                renderHolidayLessonCard
            )
            .join("");


    attachHolidayLessonActions();

}


/* ============================================================
   RENDER LESSON CARD
   ============================================================ */

function renderHolidayLessonCard(
    lesson
) {

    const category =
        escapeHolidayHTML(
            lesson.category ||
            "Learning"
        );


    const title =
        escapeHolidayHTML(
            lesson.title ||
            "Learning activity"
        );


    const description =
        escapeHolidayHTML(
            lesson.description ||
            "A practical holiday learning activity."
        );


    const level =
        escapeHolidayHTML(
            lesson.level ||
            "Beginner"
        );


    const duration =
        escapeHolidayHTML(
            lesson.duration ||
            "Short lesson"
        );


    const icon =
        getSafeHolidayIcon(
            lesson.icon
        );


    const lessonId =
        escapeHolidayHTML(
            lesson.id ||
            ""
        );


    return `

        <article
            class="holiday-lesson-card"
            data-lesson-id="${lessonId}"
        >

            <div class="holiday-lesson-top">

                <span class="holiday-lesson-icon">

                    <i class="${icon}"></i>

                </span>

                <span class="holiday-lesson-level">

                    ${level}

                </span>

            </div>


            <h3>
                ${title}
            </h3>


            <p>
                ${description}
            </p>


            <div class="holiday-lesson-meta">

                <span>
                    <i class="fa-regular fa-clock"></i>
                    ${duration}
                </span>

                <span>
                    <i class="fa-solid fa-layer-group"></i>
                    ${category}
                </span>

            </div>


            <button
                type="button"
                class="holiday-lesson-action"
                data-start-lesson="${lessonId}"
            >

                <span>
                    Start Learning
                </span>

                <i class="fa-solid fa-arrow-right"></i>

            </button>

        </article>

    `;

}


/* ============================================================
   LESSON ACTIONS
   ============================================================ */

function attachHolidayLessonActions() {

    document
        .querySelectorAll(
            "[data-start-lesson]"
        )
        .forEach(
            function(button) {

                button.addEventListener(
                    "click",
                    function() {

                        const lessonId =
                            button.dataset.startLesson ||
                            "";


                        startHolidayLesson(
                            lessonId,
                            button
                        );

                    }
                );

            }
        );

}


/* ============================================================
   START LESSON
   ============================================================ */

function startHolidayLesson(
    lessonId,
    button = null
) {

    /*
     * Prevent double-clicking.
     */

    if (
        holidayStartingLesson
    ) {

        return;

    }


    /*
     * Do not allow lesson access when the backend
     * has not confirmed that the programme is open.
     */

    if (
        !holidayProgrammeOpen
    ) {

        return;

    }


    /*
     * Find selected lesson.
     */

    const lesson =
        HOLIDAY_LESSONS.find(
            function(item) {

                return (
                    String(
                        item.id
                    ) ===
                    String(
                        lessonId
                    )
                );

            }
        );


    if (!lesson) {

        console.warn(
            "Holiday lesson could not be found:",
            lessonId
        );

        return;

    }


    /*
     * Lock the button while navigation begins.
     */

    holidayStartingLesson =
        true;


    if (button) {

        button.disabled =
            true;

        button.classList.add(
            "is-loading"
        );


        const buttonText =
            button.querySelector(
                "span"
            );


        if (buttonText) {

            buttonText.textContent =
                "Opening lesson...";

        }


        const buttonIcon =
            button.querySelector(
                "i"
            );


        if (buttonIcon) {

            buttonIcon.className =
                "fa-solid fa-spinner fa-spin";

        }

    }


    /*
     * Save selected lesson.
     *
     * This allows the reader to recover the selected lesson
     * even if the reader needs to obtain additional content
     * from the backend.
     */

    try {

        sessionStorage.setItem(
            HOLIDAY_LEARNING_CONFIG.SESSION_KEY,
            JSON.stringify(
                lesson
            )
        );

    } catch (error) {

        console.warn(
            "Unable to save holiday lesson selection:",
            error
        );

    }


    /*
     * --------------------------------------------------------
     * OPTION 1
     * --------------------------------------------------------
     *
     * If the backend supplies a real internal lesson URL,
     * use it.
     */

    const backendLessonUrl =
        getSafeHolidayLessonUrl(
            lesson.lessonUrl
        );


    if (
        backendLessonUrl
    ) {

        window.location.href =
            backendLessonUrl;

        return;

    }


    /*
     * --------------------------------------------------------
     * OPTION 2
     * --------------------------------------------------------
     *
     * Default Holiday Lesson Reader.
     *
     * Example:
     *
     * /pages/holiday-lesson.html?id=HL-DIG-001
     *
     * The reader page will use this ID to load the correct
     * lesson.
     */

    openHolidayLessonReader(
        lesson.id
    );

}


/* ============================================================
   OPEN HOLIDAY LESSON READER
   ============================================================ */

function openHolidayLessonReader(
    lessonId
) {

    const cleanLessonId =
        String(
            lessonId ||
            ""
        ).trim();


    if (!cleanLessonId) {

        holidayStartingLesson =
            false;

        return;

    }


    /*
     * Build the reader URL safely using URL.
     */

    const readerUrl =
        new URL(
            HOLIDAY_LEARNING_CONFIG.LESSON_READER,
            window.location.origin
        );


    readerUrl.searchParams.set(
        "id",
        cleanLessonId
    );


    /*
     * Navigate to the lesson reader.
     */

    window.location.href =
        readerUrl.pathname +
        readerUrl.search;

}


/* ============================================================
   PUBLIC LESSON READER HELPER
   ============================================================

   Useful if another Holiday Learning component needs to
   open a lesson programmatically.

   ============================================================ */

function openHolidayLessonById(
    lessonId
) {

    if (
        !holidayProgrammeOpen
    ) {

        return false;

    }


    const lesson =
        HOLIDAY_LESSONS.find(
            function(item) {

                return (
                    String(
                        item.id
                    ) ===
                    String(
                        lessonId
                    )
                );

            }
        );


    if (!lesson) {

        return false;

    }


    try {

        sessionStorage.setItem(
            HOLIDAY_LEARNING_CONFIG.SESSION_KEY,
            JSON.stringify(
                lesson
            )
        );

    } catch (error) {

        console.warn(
            "Unable to save selected lesson:",
            error
        );

    }


    const backendLessonUrl =
        getSafeHolidayLessonUrl(
            lesson.lessonUrl
        );


    if (
        backendLessonUrl
    ) {

        window.location.href =
            backendLessonUrl;

        return true;

    }


    openHolidayLessonReader(
        lesson.id
    );


    return true;

}


/* ============================================================
   PUBLIC API
   ============================================================ */

window.AFCHolidayLearning = {

    reloadStatus:
        loadHolidayProgrammeStatus,

    renderLessons:
        renderHolidayLessons,

    getLessons:
        function() {

            return HOLIDAY_LESSONS.slice();

        },

    getLesson:
        function(lessonId) {

            return HOLIDAY_LESSONS.find(
                function(lesson) {

                    return (
                        String(
                            lesson.id
                        ) ===
                        String(
                            lessonId
                        )
                    );

                }
            ) || null;

        },

    openLesson:
        openHolidayLessonById,

    isOpen:
        function() {

            return holidayProgrammeOpen;

        },

    getProgrammeName:
        function() {

            return holidayProgrammeName;

        },

    getActiveFilter:
        function() {

            return holidayActiveFilter;

        }

};


/* ============================================================
   END OF FILE
   ============================================================ */
