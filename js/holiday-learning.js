/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: holiday-learning.js
   PURPOSE: HOLIDAY LEARNING HUB
   STAGE 2
   ============================================================

   IMPORTANT:

   - This module is completely separate from Academic Help.
   - Academic Help remains untouched.
   - The Holiday Hub is fail-closed.
   - The backend must confirm that the programme is open.
   - Until the Holiday Hub backend is connected, the page
     will safely show the closed state.

   EXPECTED FUTURE BACKEND ACTION:

       GET ?action=getHolidayLearningStatus

   Expected response:

       {
           success: true,
           open: true,
           programmeName: "2026 Holiday Learning",
           message: "...",
           categories: [...]
       }

   ============================================================ */

"use strict";


/* ============================================================
   CONFIGURATION
   ============================================================ */

const HOLIDAY_LEARNING_CONFIG = {

    API:
        "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNpzsguBIaKR4q1dXVtgVHO2xZ1w/exec",

    STATUS_ACTION:
        "getHolidayLearningStatus",

    FAIL_CLOSED:
        true

};


/* ============================================================
   STATE
   ============================================================ */

let holidayProgrammeOpen = false;

let holidayProgrammeName =
    "Holiday Learning";

let holidayActiveFilter =
    "All";


/* ============================================================
   DEMO LESSON DATA
   ============================================================

   These are the initial Stage 2 learning cards.

   They are deliberately kept in the frontend for now so that
   the complete hub structure can be built before the backend
   lesson database is connected.

   The backend can replace this list later.
   ============================================================ */

const HOLIDAY_LESSONS = [

    {
        id:
            "digital-canva",

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
            "digital-computer",

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
            "digital-internet",

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
            "career-discovery",

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
            "career-communication",

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
            "career-cv",

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
            "challenge-seven-day",

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
            "challenge-create",

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
            "creative-content",

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
            "creative-design",

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

    setupHolidayFilters();

    setupHolidayCategoryCards();

    setupHolidayClearFilter();

    renderHolidayLessons();


    /*
     * Always start safely closed.
     */

    setHolidayProgrammeState(
        false
    );


    /*
     * Ask backend whether the programme is open.
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


        if (
            !response ||
            response.success === false
        ) {

            throw new Error(
                response?.message ||
                "Holiday programme status is unavailable."
            );

        }


        holidayProgrammeOpen =
            response.open === true;


        holidayProgrammeName =
            String(
                response.programmeName ||
                "Holiday Learning"
            ).trim();


        const programmeNameElement =
            holidayElement(
                "holidayProgrammeName"
            );


        if (programmeNameElement) {

            programmeNameElement.textContent =
                holidayProgrammeName;

        }


        if (response.message) {

            const closedMessage =
                holidayElement(
                    "holidayClosedMessage"
                );

            if (closedMessage) {

                closedMessage.textContent =
                    String(
                        response.message
                    );

            }

        }


        setHolidayProgrammeState(
            holidayProgrammeOpen
        );


        /*
         * If backend eventually sends lessons,
         * we can replace the local list here.
         */

        if (
            Array.isArray(
                response.lessons
            ) &&
            response.lessons.length
        ) {

            HOLIDAY_LESSONS.splice(
                0,
                HOLIDAY_LESSONS.length,
                ...response.lessons
            );

            renderHolidayLessons();

        }


    } catch (error) {

        console.warn(
            "Holiday Learning status could not be loaded:",
            error
        );


        /*
         * IMPORTANT:
         *
         * Never assume the programme is open if
         * the backend cannot be reached.
         */

        if (
            HOLIDAY_LEARNING_CONFIG.FAIL_CLOSED
        ) {

            holidayProgrammeOpen =
                false;

            setHolidayProgrammeState(
                false,
                true
            );

        }

    }

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
     * CLOSED
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


    if (
        holidayActiveFilter !==
        "All"
    ) {

        lessons =
            lessons.filter(
                function(lesson) {

                    return (
                        String(
                            lesson.category || ""
                        ).trim() ===
                        holidayActiveFilter
                    );

                }
            );

    }


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
        lesson.icon ||
        "fa-solid fa-book-open";


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
                            lessonId
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
    lessonId
) {

    /*
     * This is intentionally a controlled
     * placeholder for the next stage.
     *
     * We do NOT redirect to a fake lesson page.
     */

    const lesson =
        HOLIDAY_LESSONS.find(
            function(item) {

                return (
                    String(item.id) ===
                    String(lessonId)
                );

            }
        );


    if (!lesson) {

        return;

    }


    /*
     * For now, make the selected lesson
     * available to the next lesson-reader
     * stage through sessionStorage.
     */

    try {

        sessionStorage.setItem(
            "afc_holiday_selected_lesson_v1",
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
     * The actual lesson reader will be
     * connected in the next stage.
     */

    alert(
        lesson.title +
        "\n\nThis lesson reader will be opened when the Holiday Learning lesson system is connected."
    );

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

        }

};
