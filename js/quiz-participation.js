/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: quiz-participation.js
   PURPOSE: QUIZ PARTICIPATION TRACKING
   ============================================================ */


/* ============================================================
   CONFIGURATION
   ============================================================ */

const PARTICIPATION_API_URL =
    "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";


/* ============================================================
   STATE
   ============================================================ */

let participationData = null;

let currentLessonNo = "";

let lessonsData = [];


/* ============================================================
   DOM ELEMENTS
   ============================================================ */

const lessonSelect =
    document.getElementById(
        "participationLessonSelect"
    );

const loadingState =
    document.getElementById(
        "participationLoadingState"
    );

const errorState =
    document.getElementById(
        "participationErrorState"
    );

const errorMessage =
    document.getElementById(
        "participationErrorMessage"
    );

const content =
    document.getElementById(
        "participationContent"
    );

const totalMembers =
    document.getElementById(
        "participationTotalMembers"
    );

const takenCount =
    document.getElementById(
        "participationTakenCount"
    );

const notTakenCount =
    document.getElementById(
        "participationNotTakenCount"
    );

const takenBadge =
    document.getElementById(
        "participationTakenBadge"
    );

const notTakenBadge =
    document.getElementById(
        "participationNotTakenBadge"
    );

const takenList =
    document.getElementById(
        "participationTakenList"
    );

const notTakenList =
    document.getElementById(
        "participationNotTakenList"
    );

const takenEmpty =
    document.getElementById(
        "participationTakenEmpty"
    );

const notTakenEmpty =
    document.getElementById(
        "participationNotTakenEmpty"
    );

const searchInput =
    document.getElementById(
        "participationSearchInput"
    );


/* ============================================================
   INITIALIZE
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeParticipationPage();

    }
);


/* ============================================================
   INITIALIZE PAGE
   ============================================================ */

async function initializeParticipationPage() {

    try {

        showLoading(
            "Loading available lessons..."
        );

        await loadLessons();

        const initialLesson =
            getInitialLessonNumber();

        if (initialLesson) {

            currentLessonNo =
                initialLesson;

            lessonSelect.value =
                initialLesson;

            await loadParticipation(
                initialLesson
            );

        } else {

            hideLoading();

            showError(
                "No lesson is currently available."
            );

        }

    } catch (error) {

        console.error(
            "Quiz participation initialization error:",
            error
        );

        showError(
            error.message ||
            "Unable to load the quiz participation page."
        );

    }

}


/* ============================================================
   LOAD LESSONS
   ============================================================ */

async function loadLessons() {

    const url =
        PARTICIPATION_API_URL +
        "?action=getLessons";

    const response =
        await fetch(url);

    if (!response.ok) {

        throw new Error(
            "Unable to load lessons."
        );

    }

    const data =
        await response.json();

    if (
        !data ||
        data.success !== true
    ) {

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

}


/* ============================================================
   POPULATE LESSON SELECT
   ============================================================ */

function populateLessonSelect(
    lessons
) {

    lessonSelect.innerHTML = "";

    if (!lessons.length) {

        lessonSelect.innerHTML = `
            <option value="">
                No lessons available
            </option>
        `;

        lessonSelect.disabled = true;

        return;

    }

    lessonSelect.disabled = false;

    lessons.forEach(
        function (lesson) {

            const lessonNo =
                String(
                    lesson.lessonNo ??
                    lesson.lesson ??
                    lesson.number ??
                    ""
                ).trim();

            if (!lessonNo) {
                return;
            }

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                lessonNo;

            option.textContent =
                getLessonLabel(
                    lesson,
                    lessonNo
                );

            lessonSelect.appendChild(
                option
            );

        }
    );

}


/* ============================================================
   LESSON LABEL
   ============================================================ */

function getLessonLabel(
    lesson,
    lessonNo
) {

    const title =
        String(
            lesson.title ??
            lesson.lessonTitle ??
            lesson.topic ??
            lesson.name ??
            ""
        ).trim();

    if (title) {

        return (
            "Lesson " +
            lessonNo +
            " — " +
            title
        );

    }

    return (
        "Lesson " +
        lessonNo
    );

}


/* ============================================================
   GET INITIAL LESSON
   ============================================================ */

function getInitialLessonNumber() {

    /*
     * If a lessonNo is supplied in the page URL,
     * use it first.
     *
     * Example:
     *
     * quiz-participation.html?lessonNo=89
     */

    const params =
        new URLSearchParams(
            window.location.search
        );

    const urlLesson =
        String(
            params.get("lessonNo") ||
            ""
        ).trim();

    if (urlLesson) {
        return urlLesson;
    }


    /*
     * Otherwise try to identify the active/current lesson.
     */

    const activeLesson =
        lessonsData.find(
            function (lesson) {

                return (
                    lesson.active === true ||
                    lesson.isActive === true ||
                    String(
                        lesson.status ||
                        ""
                    ).toLowerCase() === "active" ||
                    String(
                        lesson.status ||
                        ""
                    ).toLowerCase() === "published"
                );

            }
        );

    if (activeLesson) {

        return String(
            activeLesson.lessonNo ??
            activeLesson.lesson ??
            activeLesson.number ??
            ""
        ).trim();

    }


    /*
     * Final fallback:
     * use the first available lesson.
     */

    const firstLesson =
        lessonsData[0];

    if (firstLesson) {

        return String(
            firstLesson.lessonNo ??
            firstLesson.lesson ??
            firstLesson.number ??
            ""
        ).trim();

    }

    return "";

}


/* ============================================================
   LESSON SELECT CHANGE
   ============================================================ */

if (lessonSelect) {

    lessonSelect.addEventListener(
        "change",
        async function () {

            const lessonNo =
                String(
                    this.value ||
                    ""
                ).trim();

            if (!lessonNo) {
                return;
            }

            currentLessonNo =
                lessonNo;

            await loadParticipation(
                lessonNo
            );

        }
    );

}


/* ============================================================
   LOAD PARTICIPATION
   ============================================================ */

async function loadParticipation(
    lessonNo
) {

    try {

        showLoading(
            "Loading quiz participation..."
        );

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
                "Unable to load quiz participation."
            );

        }

        const data =
            await response.json();

        if (
            !data ||
            data.success !== true
        ) {

            throw new Error(
                data?.message ||
                "Unable to load quiz participation."
            );

        }

        participationData =
            data;

        renderParticipation(
            data
        );

        hideLoading();

        showContent();

    } catch (error) {

        console.error(
            "Participation loading error:",
            error
        );

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
        Array.isArray(
            data.participated
        )
            ? data.participated
            : [];

    const notParticipated =
        Array.isArray(
            data.notParticipated
        )
            ? data.notParticipated
            : [];


    /*
     * Summary
     */

    totalMembers.textContent =
        Number(
            data.totalMembers ||
            0
        ).toLocaleString();

    takenCount.textContent =
        Number(
            data.participatedCount ||
            participated.length ||
            0
        ).toLocaleString();

    notTakenCount.textContent =
        Number(
            data.notParticipatedCount ||
            notParticipated.length ||
            0
        ).toLocaleString();


    /*
     * Badges
     */

    takenBadge.textContent =
        participated.length;

    notTakenBadge.textContent =
        notParticipated.length;


    /*
     * Lists
     */

    renderMemberList(
        participated,
        takenList,
        takenEmpty,
        false
    );

    renderMemberList(
        notParticipated,
        notTakenList,
        notTakenEmpty,
        true
    );

}


/* ============================================================
   RENDER MEMBER LIST
   ============================================================ */

function renderMemberList(
    members,
    container,
    emptyState,
    pending
) {

    container.innerHTML = "";

    if (!members.length) {

        emptyState.classList.remove(
            "hidden"
        );

        return;

    }

    emptyState.classList.add(
        "hidden"
    );


    members.forEach(
        function (member) {

            const name =
                String(
                    member.name ||
                    "Unnamed Member"
                ).trim();

            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "participation-member-item" +
                (
                    pending
                        ? " pending"
                        : ""
                );


            const avatar =
                document.createElement(
                    "div"
                );

            avatar.className =
                "participation-member-avatar";

            avatar.textContent =
                getInitials(name);


            const nameElement =
                document.createElement(
                    "span"
                );

            nameElement.className =
                "participation-member-name";

            nameElement.textContent =
                name;


            item.appendChild(
                avatar
            );

            item.appendChild(
                nameElement
            );

            container.appendChild(
                item
            );

        }
    );

}


/* ============================================================
   GET INITIALS
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
   SEARCH
   ============================================================ */

if (searchInput) {

    searchInput.addEventListener(
        "input",
        function () {

            filterParticipationLists(
                this.value
            );

        }
    );

}


/* ============================================================
   FILTER LISTS
   ============================================================ */

function filterParticipationLists(
    searchTerm
) {

    if (!participationData) {
        return;
    }

    const query =
        String(
            searchTerm ||
            ""
        )
            .trim()
            .toLowerCase();


    const participated =
        Array.isArray(
            participationData.participated
        )
            ? participationData.participated
            : [];


    const notParticipated =
        Array.isArray(
            participationData.notParticipated
        )
            ? participationData.notParticipated
            : [];


    const filteredParticipated =
        participated.filter(
            function (member) {

                return String(
                    member.name ||
                    ""
                )
                    .toLowerCase()
                    .includes(query);

            }
        );


    const filteredNotParticipated =
        notParticipated.filter(
            function (member) {

                return String(
                    member.name ||
                    ""
                )
                    .toLowerCase()
                    .includes(query);

            }
        );


    renderMemberList(
        filteredParticipated,
        takenList,
        takenEmpty,
        false
    );

    renderMemberList(
        filteredNotParticipated,
        notTakenList,
        notTakenEmpty,
        true
    );

}


/* ============================================================
   SHOW LOADING
   ============================================================ */

function showLoading(
    message
) {

    if (loadingState) {

        const span =
            loadingState.querySelector(
                "span"
            );

        if (span && message) {
            span.textContent =
                message;
        }

        loadingState.classList.remove(
            "hidden"
        );

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

}


/* ============================================================
   SHOW ERROR
   ============================================================ */

function showError(
    message
) {

    hideLoading();

    if (content) {

        content.classList.add(
            "hidden"
        );

    }

    if (errorMessage) {

        errorMessage.textContent =
            message ||
            "Unable to load quiz participation.";

    }

    if (errorState) {

        errorState.classList.remove(
            "hidden"
        );

    }

}
