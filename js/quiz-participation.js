/* ============================================================
   AFC ISIU YOUTH PORTAL
   FILE: quiz-participation.js
   PURPOSE: WEEKLY QUIZ PARTICIPATION
   ============================================================ */

const PARTICIPATION_API_URL =
    "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";


/* ============================================================
   PAGE STATE
   ============================================================ */

let participationData = null;
let currentLessonNo = "";
let lessonsData = [];


/* ============================================================
   DOM ELEMENTS
   ============================================================ */

const lessonSelect =
    document.getElementById("participationLessonSelect");

const loadingState =
    document.getElementById("participationLoadingState");

const errorState =
    document.getElementById("participationErrorState");

const errorMessage =
    document.getElementById("participationErrorMessage");

const content =
    document.getElementById("participationContent");

const totalMembers =
    document.getElementById("participationTotalMembers");

const takenCount =
    document.getElementById("participationTakenCount");

const notTakenCount =
    document.getElementById("participationNotTakenCount");

const searchInput =
    document.getElementById("participationSearchInput");

const takenList =
    document.getElementById("participationTakenList");

const notTakenList =
    document.getElementById("participationNotTakenList");

const takenEmpty =
    document.getElementById("participationTakenEmpty");

const notTakenEmpty =
    document.getElementById("participationNotTakenEmpty");

const takenBadge =
    document.getElementById("participationTakenBadge");

const notTakenBadge =
    document.getElementById("participationNotTakenBadge");


/* ============================================================
   INITIALIZE PAGE
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initializeParticipationPage
);


async function initializeParticipationPage() {

    showLoading("Loading quiz participation...");

    try {

        /*
         * First check whether a lesson number was supplied
         * in the page URL.
         *
         * Example:
         * quiz-participation.html?lessonNo=89
         */

        const urlLessonNo =
            new URLSearchParams(window.location.search)
                .get("lessonNo");


        if (urlLessonNo) {

            currentLessonNo =
                String(urlLessonNo).trim();

            await loadParticipation(
                currentLessonNo
            );

            return;
        }


        /*
         * If there is no lessonNo in the URL,
         * we still load the lessons endpoint.
         *
         * This keeps the page ready for future lesson
         * selection when the backend provides lesson numbers.
         */

        await loadLessons();


        /*
         * Your current getLessons() response does not contain
         * lesson numbers, so there may be no usable lesson
         * number here.
         */

        const initialLesson =
            getInitialLessonNumber();


        if (initialLesson) {

            currentLessonNo =
                String(initialLesson);

            if (lessonSelect) {
                lessonSelect.value =
                    currentLessonNo;
            }

            await loadParticipation(
                currentLessonNo
            );

            return;
        }


        hideLoading();

        showError(
            "Please open this page with a lesson number, for example: ?lessonNo=89"
        );

    } catch (error) {

        console.error(
            "Quiz participation initialization error:",
            error
        );

        hideLoading();

        showError(
            error.message ||
            "Unable to load quiz participation."
        );
    }
}


/* ============================================================
   LOAD LESSONS
   ============================================================ */

async function loadLessons() {

    try {

        const response =
            await fetch(
                PARTICIPATION_API_URL +
                "?action=getLessons"
            );


        if (!response.ok) {
            throw new Error(
                "Unable to connect to the lessons service."
            );
        }


        const data =
            await response.json();


        if (!data || data.success !== true) {

            throw new Error(
                data?.message ||
                "Unable to load lessons."
            );
        }


        lessonsData =
            Array.isArray(data.lessons)
                ? data.lessons
                : [];


        populateLessonSelect(
            lessonsData
        );

    } catch (error) {

        console.error(
            "loadLessons error:",
            error
        );

        /*
         * We don't immediately show the error here because
         * the page may still work using ?lessonNo=89.
         */

        lessonsData = [];

        if (lessonSelect) {
            lessonSelect.innerHTML =
                '<option value="">Select a lesson</option>';
        }
    }
}


/* ============================================================
   POPULATE LESSON SELECT
   ============================================================ */

function populateLessonSelect(
    lessons
) {

    if (!lessonSelect) {
        return;
    }


    lessonSelect.innerHTML =
        '<option value="">Select a lesson</option>';


    lessons.forEach(
        (lesson, index) => {

            /*
             * Your current getLessons() response does NOT
             * provide lessonNo.
             *
             * Therefore we only use these fields if they
             * are actually available.
             */

            const lessonNo =
                lesson.lessonNo ??
                lesson.lesson ??
                lesson.number ??
                lesson.lessonNumber ??
                lesson.no ??
                lesson.id;


            if (
                lessonNo === undefined ||
                lessonNo === null ||
                String(lessonNo).trim() === ""
            ) {
                return;
            }


            const topic =
                lesson.topic ||
                lesson.title ||
                lesson.lessonTitle ||
                `Lesson ${lessonNo}`;


            const option =
                document.createElement("option");


            option.value =
                String(lessonNo);


            option.textContent =
                `Lesson ${lessonNo} — ${topic}`;


            lessonSelect.appendChild(
                option
            );
        }
    );


    /*
     * Listen for manual lesson selection.
     */

    lessonSelect.onchange =
        async function () {

            const selectedLesson =
                String(
                    this.value || ""
                ).trim();


            if (!selectedLesson) {
                return;
            }


            currentLessonNo =
                selectedLesson;


            await loadParticipation(
                currentLessonNo
            );
        };
}


/* ============================================================
   DETERMINE INITIAL LESSON NUMBER
   ============================================================ */

function getInitialLessonNumber() {

    /*
     * 1. URL parameter
     */

    const urlLessonNo =
        new URLSearchParams(
            window.location.search
        ).get("lessonNo");


    if (urlLessonNo) {

        return String(
            urlLessonNo
        ).trim();
    }


    /*
     * 2. Look through getLessons() data in case
     * a future backend version includes lessonNo.
     */

    const activeLesson =
        lessonsData.find(
            lesson => {

                const lessonNo =
                    lesson.lessonNo ??
                    lesson.lesson ??
                    lesson.number ??
                    lesson.lessonNumber ??
                    lesson.no ??
                    lesson.id;


                if (
                    lessonNo === undefined ||
                    lessonNo === null ||
                    String(lessonNo).trim() === ""
                ) {
                    return false;
                }


                return (
                    lesson.active === true ||
                    lesson.isActive === true ||
                    String(
                        lesson.status || ""
                    ).toLowerCase() === "active"
                );
            }
        );


    if (activeLesson) {

        return String(
            activeLesson.lessonNo ??
            activeLesson.lesson ??
            activeLesson.number ??
            activeLesson.lessonNumber ??
            activeLesson.no ??
            activeLesson.id
        ).trim();
    }


    return "";
}


/* ============================================================
   LOAD PARTICIPATION
   ============================================================ */

async function loadParticipation(
    lessonNo
) {

    if (!lessonNo) {

        showError(
            "No lesson number was provided."
        );

        return;
    }


    showLoading(
        `Loading participation for Lesson ${lessonNo}...`
    );


    try {

        const url =
            PARTICIPATION_API_URL +
            "?action=getQuizParticipation" +
            "&lessonNo=" +
            encodeURIComponent(
                lessonNo
            );


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "Unable to connect to the participation service."
            );
        }


        const data =
            await response.json();


        if (!data || data.success !== true) {

            throw new Error(
                data?.message ||
                "Unable to load quiz participation."
            );
        }


        participationData =
            data;


        currentLessonNo =
            String(
                data.lessonNo ??
                lessonNo
            );


        if (lessonSelect) {

            lessonSelect.value =
                currentLessonNo;
        }


        renderParticipation(
            participationData
        );


        hideLoading();

        showContent();

    } catch (error) {

        console.error(
            "loadParticipation error:",
            error
        );

        hideLoading();

        showError(
            error.message ||
            "Unable to load quiz participation."
        );
    }
}


/* ============================================================
   RENDER PARTICIPATION
   ============================================================ */

function renderParticipation(
    data
) {

    const participated =
        Array.isArray(data.participated)
            ? data.participated
            : [];


    const notParticipated =
        Array.isArray(data.notParticipated)
            ? data.notParticipated
            : [];


    const total =
        Number(
            data.totalMembers ??
            participated.length +
            notParticipated.length
        );


    const taken =
        Number(
            data.participatedCount ??
            participated.length
        );


    const notTaken =
        Number(
            data.notParticipatedCount ??
            notParticipated.length
        );


    /*
     * Summary
     */

    if (totalMembers) {
        totalMembers.textContent =
            total;
    }


    if (takenCount) {
        takenCount.textContent =
            taken;
    }


    if (notTakenCount) {
        notTakenCount.textContent =
            notTaken;
    }


    /*
     * Badges
     */

    if (takenBadge) {
        takenBadge.textContent =
            taken;
    }


    if (notTakenBadge) {
        notTakenBadge.textContent =
            notTaken;
    }


    /*
     * Member lists
     */

    renderMemberList(
        takenList,
        takenEmpty,
        participated
    );


    renderMemberList(
        notTakenList,
        notTakenEmpty,
        notParticipated
    );


    /*
     * Search
     */

    if (searchInput) {

        searchInput.value = "";

        searchInput.oninput =
            handleParticipationSearch;
    }
}


/* ============================================================
   RENDER MEMBER LIST
   ============================================================ */

function renderMemberList(
    listElement,
    emptyElement,
    members
) {

    if (!listElement) {
        return;
    }


    listElement.innerHTML = "";


    if (!members.length) {

        if (emptyElement) {
            emptyElement.classList.remove(
                "hidden"
            );
        }

        return;
    }


    if (emptyElement) {
        emptyElement.classList.add(
            "hidden"
        );
    }


    members.forEach(
        member => {

            const name =
                member.name ||
                "Unnamed member";


            const memberId =
                member.memberId ||
                member.id ||
                "";


            const item =
                document.createElement("div");


            item.className =
                "participation-member";


            item.dataset.name =
                name.toLowerCase();


            item.innerHTML = `
                <div class="participation-member-avatar">
                    ${getInitials(name)}
                </div>

                <div class="participation-member-info">
                    <div class="participation-member-name">
                        ${escapeHtml(name)}
                    </div>

                    ${
                        memberId
                            ? `
                                <div class="participation-member-id">
                                    ${escapeHtml(memberId)}
                                </div>
                              `
                            : ""
                    }
                </div>
            `;


            listElement.appendChild(
                item
            );
        }
    );
}


/* ============================================================
   SEARCH
   ============================================================ */

function handleParticipationSearch() {

    const query =
        String(
            searchInput?.value || ""
        )
        .trim()
        .toLowerCase();


    filterMemberList(
        takenList,
        query
    );


    filterMemberList(
        notTakenList,
        query
    );
}


function filterMemberList(
    listElement,
    query
) {

    if (!listElement) {
        return;
    }


    const items =
        listElement.querySelectorAll(
            ".participation-member"
        );


    items.forEach(
        item => {

            const name =
                item.dataset.name || "";


            item.style.display =
                !query ||
                name.includes(query)
                    ? ""
                    : "none";
        }
    );
}


/* ============================================================
   INITIALS
   ============================================================ */

function getInitials(
    name
) {

    const words =
        String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if (!words.length) {
        return "?";
    }


    if (words.length === 1) {

        return words[0]
            .substring(0, 2)
            .toUpperCase();
    }


    return (
        words[0][0] +
        words[words.length - 1][0]
    ).toUpperCase();
}


/* ============================================================
   HTML ESCAPE
   ============================================================ */

function escapeHtml(
    value
) {

    return String(value)
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
   LOADING
   ============================================================ */

function showLoading(
    message
) {

    if (loadingState) {

        loadingState.classList.remove(
            "hidden"
        );

        const messageElement =
            loadingState.querySelector(
                "[data-loading-message]"
            );

        if (messageElement) {
            messageElement.textContent =
                message;
        }
    }


    if (errorState) {
        errorState.classList.add(
            "hidden"
        );
    }


    if (content) {
        content.classList.add(
            "hidden"
        );
    }
}


/* ============================================================
   HIDE LOADING
   ============================================================ */

function hideLoading() {

    if (loadingState) {

        loadingState.classList.add(
            "hidden"
        );
    }
}


/* ============================================================
   SHOW CONTENT
   ============================================================ */

function showContent() {

    if (content) {

        content.classList.remove(
            "hidden"
        );
    }


    if (errorState) {

        errorState.classList.add(
            "hidden"
        );
    }
}


/* ============================================================
   SHOW ERROR
   ============================================================ */

function showError(
    message
) {

    if (loadingState) {

        loadingState.classList.add(
            "hidden"
        );
    }


    if (content) {

        content.classList.add(
            "hidden"
        );
    }


    if (errorState) {

        errorState.classList.remove(
            "hidden"
        );
    }


    if (errorMessage) {

        errorMessage.textContent =
            message;
    }
}
