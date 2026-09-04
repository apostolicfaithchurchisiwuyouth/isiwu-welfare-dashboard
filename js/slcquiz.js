/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: slcquiz.js
   PURPOSE: WEEKLY SLC QUIZ CONTROLLER
   ============================================================

   FLOW:

   Quiz Opens
        ↓
   Select Participant
        ↓
   Add Name if Necessary
        ↓
   Lock Participant
        ↓
   Check CURRENT LESSON status
        ↓
   ┌─────────────────────────────────────┐
   │                                     │
   │ Quiz already completed              │
   │        ↓                            │
   │ Show completed state                │
   │                                     │
   │ Quiz NOT completed                  │
   │        ↓                            │
   │ Reflection already submitted?       │
   │        ↓                            │
   │ YES → Open Quiz directly            │
   │ NO  → Show Reflection               │
   │                                     │
   │ Reflection submitted                │
   │        ↓                            │
   │ Quiz                                │
   │        ↓                            │
   │ Submit                              │
   │        ↓                            │
   │ Results                             │
   └─────────────────────────────────────┘

   IMPORTANT:

   - Completion is checked by memberId + current lesson.
   - Previous lessons do NOT block the current lesson.
   - Reflection completion and quiz completion are separate.
   - Refreshing after reflection skips reflection.
   - Refreshing during quiz restores saved answers.
   - Completed quizzes cannot be repeated.
   - Backend remains the final authority.
   ============================================================ */

"use strict";


/* ============================================================
   API
============================================================ */

const API =
    "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNpsguBIaKR4q1dXVtgVHO2xZ1w/exec";


/* ============================================================
   CONFIG
============================================================ */

const REFLECTION_MIN_CHARACTERS = 100;

const SESSION_KEY =
    "afc_isiu_slc_quiz_session_v1";

const ANSWERS_KEY =
    "afc_isiu_slc_saved_answers_v2";

const LAST_REVIEW_KEY =
    "lastQuizReview";

const LAST_QUESTIONS_KEY =
    "lastQuizQuestions";

const LAST_SCORE_KEY =
    "lastQuizScore";

const LAST_POINTS_KEY =
    "lastQuizPoints";

const LAST_TOTAL_KEY =
    "lastQuizTotal";

const LAST_RESULT_LESSON_KEY =
    "lastQuizResultLesson";


/* ============================================================
   STATE
============================================================ */

let quizData = [];

let selectedLesson = "";

let reviewData = [];

let reviewQuestions = [];

let quizCloseTime = null;

let quizOpenTime = null;

let countdownInterval = null;

let selectedMemberId = "";

let selectedMemberName = "";

let reflectionSubmitted = false;

let quizLoaded = false;

let quizSubmitted = false;

let quizCompleted = false;

let completionCheckInProgress = false;


/* ============================================================
   DOM READY
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        if (typeof AOS !== "undefined") {

            AOS.init({
                duration: 650,
                once: true
            });

        }

        setupReflectionListeners();

        setupParticipantListeners();

        setupQuizListeners();

        await loadQuiz();

        if (!quizLoaded) {
            return;
        }

        await loadMembers();

        await restoreQuizSession();

    }
);


/* ============================================================
   DOM HELPERS
============================================================ */

function getElement(id) {

    return document.getElementById(id);

}


function showElement(id) {

    const element =
        getElement(id);

    if (element) {

        element.classList.remove("hidden");

    }

}


function hideElement(id) {

    const element =
        getElement(id);

    if (element) {

        element.classList.add("hidden");

    }

}


/* ============================================================
   SAFE HTML
============================================================ */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* ============================================================
   LOAD QUIZ
============================================================ */

async function loadQuiz() {

    const status =
        getElement("quizStatus");

    const countdown =
        getElement("quizCountdown");

    if (!status) {
        return;
    }

    try {

        status.textContent =
            "Loading quiz...";

        const response =
            await fetch(
                `${API}?action=getQuiz`,
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }

        const data =
            await response.json();

        console.log(
            "Quiz response:",
            data
        );


        /* ====================================================
           CLOSED
        ==================================================== */

        if (
            data.status === "closed"
        ) {

            status.textContent =
                "🔒 This week's quiz has closed.";

            if (countdown) {

                countdown.style.display =
                    "none";

            }

            hideElement("participantSection");
            hideElement("lockedParticipantSection");
            hideElement("reflectionSection");
            hideElement("quizSection");
            hideElement("resultSection");
            hideElement("completedSection");

            quizLoaded =
                false;

            return;

        }


        /* ====================================================
           NOT OPEN
        ==================================================== */

        if (
            data.status === "not_open"
        ) {

            status.textContent =
                "⏳ The weekly SLC quiz opens soon.";

            hideElement("participantSection");
            hideElement("lockedParticipantSection");
            hideElement("reflectionSection");
            hideElement("quizSection");
            hideElement("resultSection");
            hideElement("completedSection");

            if (data.openTime) {

                quizOpenTime =
                    new Date(
                        data.openTime
                    );

                startCountdown("open");

            }

            quizLoaded =
                false;

            return;

        }


        /* ====================================================
           API ERROR
        ==================================================== */

        if (
            data.success === false
        ) {

            status.textContent =
                data.message ||
                "Unable to load the quiz.";

            hideElement(
                "participantSection"
            );

            quizLoaded =
                false;

            return;

        }


        /* ====================================================
           ACTIVE QUIZ
        ==================================================== */

        quizData =
            Array.isArray(data.questions)
                ? data.questions
                : [];

        selectedLesson =
            String(
                data.lessonNo || ""
            ).trim();

        quizCloseTime =
            data.closeTime
                ? new Date(data.closeTime)
                : null;

        quizOpenTime =
            data.openTime
                ? new Date(data.openTime)
                : null;

        quizCompleted =
            false;

        quizSubmitted =
            false;

        reflectionSubmitted =
            false;

        quizLoaded =
            true;


        status.textContent =
            `🟢 Lesson ${selectedLesson} Quiz is Open`;


        const questionBadge =
            getElement(
                "questionCountBadge"
            );

        if (questionBadge) {

            questionBadge.textContent =
                `${quizData.length} Questions`;

        }


        if (quizCloseTime) {

            startCountdown("close");

        }


        /*
         * Always begin with participant selection.
         *
         * restoreQuizSession() will decide whether
         * this participant should resume at reflection,
         * quiz, or completed state.
         */

        showElement(
            "participantSection"
        );

        hideElement(
            "lockedParticipantSection"
        );

        hideElement(
            "reflectionSection"
        );

        hideElement(
            "quizSection"
        );

        hideElement(
            "resultSection"
        );

        hideElement(
            "completedSection"
        );

    }
    catch (error) {

        console.error(
            "loadQuiz error:",
            error
        );

        status.textContent =
            "Unable to connect to the quiz service.";

        hideElement(
            "participantSection"
        );

    }

}


/* ============================================================
   COUNTDOWN
============================================================ */

function startCountdown(mode) {

    clearInterval(
        countdownInterval
    );

    const countdown =
        getElement(
            "quizCountdown"
        );

    if (!countdown) {
        return;
    }

    countdown.style.display =
        "";


    countdownInterval =
        setInterval(
            function () {

                const target =
                    mode === "open"
                        ? quizOpenTime
                        : quizCloseTime;

                if (!target) {

                    clearInterval(
                        countdownInterval
                    );

                    return;

                }


                const diff =
                    target -
                    new Date();


                if (
                    diff <= 0
                ) {

                    clearInterval(
                        countdownInterval
                    );

                    window.location.reload();

                    return;

                }


                const days =
                    Math.floor(
                        diff /
                        86400000
                    );


                const hours =
                    Math.floor(
                        (
                            diff %
                            86400000
                        ) /
                        3600000
                    );


                const mins =
                    Math.floor(
                        (
                            diff %
                            3600000
                        ) /
                        60000
                    );


                const secs =
                    Math.floor(
                        (
                            diff %
                            60000
                        ) /
                        1000
                    );


                countdown.innerHTML = `
                    ${
                        mode === "open"
                            ? "⏳ Opens in"
                            : "⏳ Closes in"
                    }

                    <strong>
                        ${days}d
                        ${hours}h
                        ${mins}m
                        ${secs}s
                    </strong>
                `;

            },
            1000
        );

}


/* ============================================================
   LOAD MEMBERS
============================================================ */

async function loadMembers() {

    const select =
        getElement(
            "memberSelect"
        );

    if (!select) {
        return;
    }

    select.innerHTML = `
        <option value="">
            Select your name here
        </option>
    `;


    try {

        const response =
            await fetch(
                `${API}?action=getMembers`,
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        if (
            !data.success ||
            !Array.isArray(data.members)
        ) {

            return;

        }


        data.members.forEach(
            function (member) {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    String(
                        member.memberId
                    );

                option.textContent =
                    member.name;

                select.appendChild(
                    option
                );

            }
        );

    }
    catch (error) {

        console.error(
            "loadMembers error:",
            error
        );

    }

}


/* ============================================================
   PARTICIPANT LISTENERS
============================================================ */

function setupParticipantListeners() {

    const select =
        getElement(
            "memberSelect"
        );

    const continueBtn =
        getElement(
            "continueToReflectionBtn"
        );

    const addButton =
        getElement(
            "addNameBtn"
        );


    if (select) {

        select.addEventListener(
            "change",
            function () {

                if (
                    selectedMemberId ||
                    quizCompleted
                ) {

                    return;

                }

                if (continueBtn) {

                    continueBtn.disabled =
                        !select.value;

                }

            }
        );

    }


    if (continueBtn) {

        continueBtn.addEventListener(
            "click",
            lockSelectedParticipant
        );

    }


    /*
     * The HTML already has onclick="addNewMember()".
     *
     * Therefore we intentionally DO NOT add another
     * click listener here. This prevents duplicate
     * requests to the backend.
     */

}


/* ============================================================
   ADD NEW MEMBER
============================================================ */

async function addNewMember() {

    if (
        selectedMemberId ||
        quizCompleted
    ) {

        return;

    }


    const input =
        getElement(
            "newName"
        );

    const button =
        getElement(
            "addNameBtn"
        );

    const select =
        getElement(
            "memberSelect"
        );


    if (
        !input ||
        !button ||
        !select
    ) {

        return;

    }


    const name =
        input.value.trim();


    if (!name) {

        alert(
            "Please enter your name."
        );

        input.focus();

        return;

    }


    if (
        name.length < 2
    ) {

        alert(
            "Please enter your full name."
        );

        input.focus();

        return;

    }


    const oldHTML =
        button.innerHTML;


    button.disabled =
        true;

    button.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Adding...
    `;


    try {

        const response =
            await fetch(
                API,
                {
                    method: "POST",
                    body: JSON.stringify({
                        action:
                            "addMember",
                        name:
                            name
                    })
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        if (
            !data.success
        ) {

            alert(
                data.message ||
                "Unable to add your name."
            );

            return;

        }


        await loadMembers();


        select.value =
            String(
                data.memberId
            );


        input.value =
            "";


        const continueBtn =
            getElement(
                "continueToReflectionBtn"
            );


        if (continueBtn) {

            continueBtn.disabled =
                false;

        }


        alert(
            "Your name has been added successfully."
        );

    }
    catch (error) {

        console.error(
            "addNewMember error:",
            error
        );

        alert(
            "Unable to add your name. Please try again."
        );

    }
    finally {

        button.disabled =
            false;

        button.innerHTML =
            oldHTML;

    }

}


/* ============================================================
   LOCK PARTICIPANT
============================================================ */

async function lockSelectedParticipant() {

    if (
        selectedMemberId ||
        quizCompleted
    ) {

        return;

    }


    const select =
        getElement(
            "memberSelect"
        );


    if (!select) {
        return;
    }


    const memberId =
        String(
            select.value || ""
        ).trim();


    if (!memberId) {

        alert(
            "Please select your name first."
        );

        return;

    }


    const selectedOption =
        select.options[
            select.selectedIndex
        ];


    const memberName =
        selectedOption
            ? selectedOption.textContent.trim()
            : "";


    if (!memberName) {

        alert(
            "Unable to identify the selected participant."
        );

        return;

    }


    selectedMemberId =
        memberId;

    selectedMemberName =
        memberName;


    reflectionSubmitted =
        false;

    quizCompleted =
        false;

    quizSubmitted =
        false;


    /*
     * Lock participant controls.
     */

    select.disabled =
        true;


    const input =
        getElement(
            "newName"
        );

    if (input) {

        input.disabled =
            true;

    }


    const addButton =
        getElement(
            "addNameBtn"
        );

    if (addButton) {

        addButton.disabled =
            true;

    }


    const continueBtn =
        getElement(
            "continueToReflectionBtn"
        );

    if (continueBtn) {

        continueBtn.disabled =
            true;

    }


    const lockedName =
        getElement(
            "lockedMemberName"
        );

    if (lockedName) {

        lockedName.textContent =
            selectedMemberName;

    }


    showElement(
        "lockedParticipantSection"
    );

    hideElement(
        "participantSection"
    );

    hideElement(
        "reflectionSection"
    );

    hideElement(
        "quizSection"
    );

    hideElement(
        "completedSection"
    );


    saveQuizSession();


    /*
     * IMPORTANT:
     *
     * Do not assume the participant needs reflection.
     *
     * Check the server first.
     *
     * The server decides:
     *
     * 1. Quiz completed
     * 2. Reflection completed
     * 3. Nothing completed
     */

    await checkCompletionStatus();

}


/* ============================================================
   SAVE QUIZ SESSION
============================================================ */

function saveQuizSession() {

    if (
        !selectedMemberId ||
        !selectedLesson
    ) {

        return;

    }


    const session = {

        memberId:
            selectedMemberId,

        memberName:
            selectedMemberName,

        lessonNo:
            selectedLesson,

        savedAt:
            new Date().toISOString()

    };


    try {

        sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify(session)
        );

    }
    catch (error) {

        console.warn(
            "Unable to save quiz session:",
            error
        );

    }

}


/* ============================================================
   RESTORE QUIZ SESSION
============================================================ */

async function restoreQuizSession() {

    if (
        !quizLoaded ||
        !selectedLesson
    ) {

        return;

    }


    let saved;


    try {

        const raw =
            sessionStorage.getItem(
                SESSION_KEY
            );


        if (!raw) {

            return;

        }


        saved =
            JSON.parse(raw);

    }
    catch (error) {

        console.warn(
            "Invalid saved quiz session.",
            error
        );

        sessionStorage.removeItem(
            SESSION_KEY
        );

        return;

    }


    /*
     * Only restore a session belonging
     * to the current active lesson.
     */

    if (
        !saved ||
        String(saved.lessonNo).trim()
        !==
        String(selectedLesson).trim()
    ) {

        sessionStorage.removeItem(
            SESSION_KEY
        );

        return;

    }


    if (!saved.memberId) {
        return;
    }


    const select =
        getElement(
            "memberSelect"
        );


    if (!select) {
        return;
    }


    const option =
        Array.from(
            select.options
        ).find(
            function (item) {

                return (
                    String(item.value) ===
                    String(saved.memberId)
                );

            }
        );


    if (!option) {

        sessionStorage.removeItem(
            SESSION_KEY
        );

        return;

    }


    selectedMemberId =
        String(
            saved.memberId
        );


    selectedMemberName =
        String(
            saved.memberName ||
            option.textContent ||
            ""
        ).trim();


    reflectionSubmitted =
        false;

    quizCompleted =
        false;

    quizSubmitted =
        false;


    const lockedName =
        getElement(
            "lockedMemberName"
        );


    if (lockedName) {

        lockedName.textContent =
            selectedMemberName;

    }


    select.disabled =
        true;


    const input =
        getElement(
            "newName"
        );

    if (input) {

        input.disabled =
            true;

    }


    const addButton =
        getElement(
            "addNameBtn"
        );

    if (addButton) {

        addButton.disabled =
            true;

    }


    const continueBtn =
        getElement(
            "continueToReflectionBtn"
        );

    if (continueBtn) {

        continueBtn.disabled =
            true;

    }


    showElement(
        "lockedParticipantSection"
    );

    hideElement(
        "participantSection"
    );

    hideElement(
        "reflectionSection"
    );

    hideElement(
        "quizSection"
    );

    hideElement(
        "completedSection"
    );


    /*
     * VERY IMPORTANT:
     *
     * Never trust the old session as proof
     * that the reflection was completed.
     *
     * Check the backend again.
     */

    await checkCompletionStatus();

}


/* ============================================================
   CHECK CURRENT LESSON COMPLETION
============================================================ */

async function checkCompletionStatus() {

    if (
        !selectedMemberId ||
        !selectedLesson
    ) {

        return;

    }


    /*
     * Prevent multiple simultaneous checks.
     */

    if (completionCheckInProgress) {

        return;

    }


    completionCheckInProgress =
        true;


    /*
     * While checking, do not accidentally
     * show reflection or quiz.
     */

    hideElement(
        "reflectionSection"
    );

    hideElement(
        "quizSection"
    );

    hideElement(
        "completedSection"
    );


    const message =
        getElement(
            "reflectionMessage"
        );


    if (message) {

        message.className =
            "reflection-message show";

        message.textContent =
            "Checking your quiz status...";

    }


    try {

        const url =
            `${API}?action=getSLCCompletionStatus` +
            `&memberId=${encodeURIComponent(selectedMemberId)}` +
            `&lessonNo=${encodeURIComponent(selectedLesson)}`;


        const response =
            await fetch(
                url,
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "SLC completion status:",
            {
                memberId:
                    selectedMemberId,

                lessonNo:
                    selectedLesson,

                response:
                    data
            }
        );


        if (
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to check quiz status."
            );

        }


        /*
         * ======================================================
         * SERVER STATE
         * ======================================================
         *
         * The backend should return:
         *
         * quizCompleted
         * reflectionCompleted
         *
         * for THIS member + THIS lesson.
         */


        const currentLessonQuizCompleted =
            data.quizCompleted === true;


        const currentLessonReflectionCompleted =
            data.reflectionCompleted === true;


        /* ====================================================
           CASE 1 — QUIZ ALREADY COMPLETED
        ==================================================== */

        if (
            currentLessonQuizCompleted
        ) {

            quizCompleted =
                true;

            quizSubmitted =
                true;

            reflectionSubmitted =
                true;


            clearSavedAnswers();

            clearQuizSession();


            showCompletedState(
                data
            );


            return;

        }


        /* ====================================================
           CASE 2 — REFLECTION ALREADY COMPLETED
        ==================================================== */

        if (
            currentLessonReflectionCompleted
        ) {

            quizCompleted =
                false;

            quizSubmitted =
                false;

            reflectionSubmitted =
                true;


            saveQuizSession();


            /*
             * THIS IS THE IMPORTANT PART.
             *
             * The participant has already completed
             * the reflection.
             *
             * Therefore:
             *
             * DO NOT SHOW REFLECTION AGAIN.
             *
             * Go directly to the quiz.
             */

            unlockQuiz();


            return;

        }


        /* ====================================================
           CASE 3 — NOTHING COMPLETED
        ==================================================== */

        quizCompleted =
            false;

        quizSubmitted =
            false;

        reflectionSubmitted =
            false;


        saveQuizSession();


        showElement(
            "reflectionSection"
        );

        hideElement(
            "quizSection"
        );

        hideElement(
            "completedSection"
        );


        if (message) {

            message.className =
                "reflection-message";

            message.textContent =
                "";

        }


        updateReflectionProgress();


        /*
         * Clear old reflection text so a previous
         * lesson/session cannot accidentally appear.
         */

        clearReflectionFields();


    }
    catch (error) {

        console.error(
            "checkCompletionStatus error:",
            error
        );


        /*
         * SECURITY/STATE RULE:
         *
         * If we cannot verify the status,
         * do NOT unlock the quiz.
         *
         * Keep the quiz hidden.
         */

        hideElement(
            "quizSection"
        );


        hideElement(
            "completedSection"
        );


        showElement(
            "reflectionSection"
        );


        if (message) {

            message.className =
                "reflection-message show error";

            message.textContent =
                "We could not check your quiz status. Please check your connection and try again.";

        }

    }
    finally {

        completionCheckInProgress =
            false;

    }

}


/* ============================================================
   SHOW COMPLETED STATE
============================================================ */

function showCompletedState(data) {

    hideElement(
        "participantSection"
    );

    hideElement(
        "lockedParticipantSection"
    );

    hideElement(
        "reflectionSection"
    );

    hideElement(
        "quizSection"
    );


    /*
     * Use existing result/completion section if
     * your HTML contains one.
     */

    const completedSection =
        getElement(
            "completedSection"
        );


    if (!completedSection) {

        const container =
            document.querySelector(
                ".slcquiz-container"
            );


        if (!container) {
            return;
        }


        const card =
            document.createElement(
                "section"
            );


        card.id =
            "completedSection";


        card.className =
            "quiz-card completed-card";


        card.innerHTML = `
            <div class="completed-icon">
                <i class="fa-solid fa-circle-check"></i>
            </div>

            <h2>
                You've already completed this quiz
            </h2>

            <p>
                You have already completed Lesson
                ${escapeHTML(selectedLesson)}.
                You cannot repeat the reflection or quiz
                for the same lesson.
            </p>

            <a
                href="results.html?memberId=${encodeURIComponent(selectedMemberId)}&lessonNo=${encodeURIComponent(selectedLesson)}"
                class="purple-btn"
            >
                <span>View My Results</span>
                <i class="fa-solid fa-arrow-right"></i>
            </a>
        `;


        container.appendChild(
            card
        );


        return;

    }


    const completedLesson =
        getElement(
            "completedLesson"
        );


    if (completedLesson) {

        completedLesson.textContent =
            selectedLesson;

    }


    showElement(
        "completedSection"
    );


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


/* ============================================================
   CLEAR QUIZ SESSION
============================================================ */

function clearQuizSession() {

    try {

        sessionStorage.removeItem(
            SESSION_KEY
        );

    }
    catch (error) {

        console.warn(
            "Unable to clear quiz session:",
            error
        );

    }

}


/* ============================================================
   REFLECTION LISTENERS
============================================================ */

function setupReflectionListeners() {

    const ids = [

        "reflection1",
        "reflection2",
        "reflection3"

    ];


    ids.forEach(
        function (id) {

            const field =
                getElement(id);


            if (!field) {
                return;
            }


            field.addEventListener(
                "input",
                updateReflectionProgress
            );

        }
    );


    const button =
        getElement(
            "submitReflectionBtn"
        );


    if (button) {

        button.addEventListener(
            "click",
            submitReflection
        );

    }

}


/* ============================================================
   CLEAR REFLECTION FIELDS
============================================================ */

function clearReflectionFields() {

    [
        "reflection1",
        "reflection2",
        "reflection3"
    ].forEach(
        function (id) {

            const field =
                getElement(id);


            if (field) {

                field.value =
                    "";

            }

        }
    );


    updateReflectionProgress();

}


/* ============================================================
   CLEAN REFLECTION TEXT
============================================================ */

function cleanReflectionText(text) {

    return String(text || "")
        .replace(/\s+/g, " ")
        .trim();

}


/* ============================================================
   MEANINGFUL CHARACTER COUNT
============================================================ */

function getReflectionCharacterCount() {

    const fields = [

        "reflection1",
        "reflection2",
        "reflection3"

    ];


    return fields.reduce(
        function (total, id) {

            const field =
                getElement(id);


            const text =
                cleanReflectionText(
                    field
                        ? field.value
                        : ""
                );


            return (
                total +
                text
                    .replace(/\s/g, "")
                    .length
            );

        },
        0
    );

}


/* ============================================================
   CHECK REFLECTION REQUIREMENTS
============================================================ */

function reflectionRequirementsMet() {

    const answers = [

        cleanReflectionText(
            getElement(
                "reflection1"
            )?.value
        ),

        cleanReflectionText(
            getElement(
                "reflection2"
            )?.value
        ),

        cleanReflectionText(
            getElement(
                "reflection3"
            )?.value
        )

    ];


    const allAnswered =
        answers.every(
            Boolean
        );


    return (
        allAnswered &&
        getReflectionCharacterCount()
            >=
            REFLECTION_MIN_CHARACTERS
    );

}


/* ============================================================
   UPDATE REFLECTION PROGRESS
============================================================ */

function updateReflectionProgress() {

    const count =
        getReflectionCharacterCount();


    const button =
        getElement(
            "submitReflectionBtn"
        );


    const countDisplay =
        getElement(
            "reflectionCharacterCount"
        );


    const progressBar =
        getElement(
            "reflectionProgressBar"
        );


    const requirementText =
        getElement(
            "reflectionRequirementText"
        );


    const answers = [

        cleanReflectionText(
            getElement(
                "reflection1"
            )?.value
        ),

        cleanReflectionText(
            getElement(
                "reflection2"
            )?.value
        ),

        cleanReflectionText(
            getElement(
                "reflection3"
            )?.value
        )

    ];


    const answeredCount =
        answers.filter(
            Boolean
        ).length;


    if (countDisplay) {

        countDisplay.textContent =
            `${count} / ${REFLECTION_MIN_CHARACTERS} characters`;

    }


    if (progressBar) {

        const percentage =
            Math.min(
                100,
                Math.round(
                    (
                        count /
                        REFLECTION_MIN_CHARACTERS
                    ) *
                    100
                )
            );


        progressBar.style.width =
            `${percentage}%`;

    }


    const ready =
        reflectionRequirementsMet();


    if (button) {

        button.disabled =
            !ready;

    }


    if (requirementText) {

        if (ready) {

            requirementText.textContent =
                "You're ready. Submit your reflection to unlock the quiz.";

        }
        else if (
            answeredCount < 3
        ) {

            requirementText.textContent =
                `Answer all three questions. ${answeredCount}/3 answered.`;

        }
        else {

            const remaining =
                Math.max(
                    0,
                    REFLECTION_MIN_CHARACTERS -
                    count
                );


            requirementText.textContent =
                `You need ${remaining} more meaningful characters.`;

        }

    }

}


/* ============================================================
   SUBMIT REFLECTION
============================================================ */

async function submitReflection() {

    if (
        reflectionSubmitted ||
        quizCompleted
    ) {

        /*
         * Reflection has already been completed.
         *
         * If this function somehow gets called again,
         * simply move the participant to the quiz.
         */

        if (
            reflectionSubmitted &&
            !quizCompleted
        ) {

            unlockQuiz();

        }

        return;

    }


    if (!selectedMemberId) {

        alert(
            "Please select your name first."
        );

        return;

    }


    if (!selectedLesson) {

        alert(
            "The current quiz lesson could not be identified."
        );

        return;

    }


    if (!reflectionRequirementsMet()) {

        updateReflectionProgress();

        alert(
            "Please answer all three reflection questions and write at least 100 meaningful characters altogether."
        );

        return;

    }


    const answer1 =
        cleanReflectionText(
            getElement(
                "reflection1"
            ).value
        );


    const answer2 =
        cleanReflectionText(
            getElement(
                "reflection2"
            ).value
        );


    const answer3 =
        cleanReflectionText(
            getElement(
                "reflection3"
            ).value
        );


    const button =
        getElement(
            "submitReflectionBtn"
        );


    const message =
        getElement(
            "reflectionMessage"
        );


    if (button) {

        button.disabled =
            true;

        button.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Saving Reflection...
        `;

    }


    if (message) {

        message.className =
            "reflection-message show";

        message.textContent =
            "Saving your reflection...";

    }


    try {

        const response =
            await fetch(
                API,
                {
                    method: "POST",

                    body: JSON.stringify({

                        action:
                            "submitReflection",

                        memberId:
                            selectedMemberId,

                        lessonNo:
                            selectedLesson,

                        question1:
                            answer1,

                        question2:
                            answer2,

                        question3:
                            answer3

                    })
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Submit reflection response:",
            data
        );


        /*
         * The reflection may already have been
         * submitted from another tab/device.
         *
         * That still means the participant is
         * allowed to continue to the quiz,
         * unless the quiz itself has already
         * been completed.
         */

        if (
            data.status ===
            "already_completed"
        ) {

            reflectionSubmitted =
                true;


            saveQuizSession();


            await checkCompletionStatus();


            return;

        }


        if (
            !data.success
        ) {

            if (message) {

                message.className =
                    "reflection-message show error";

                message.textContent =
                    data.message ||
                    "Unable to save your reflection.";

            }


            restoreReflectionButton();

            return;

        }


        reflectionSubmitted =
            true;


        saveQuizSession();


        if (message) {

            message.className =
                "reflection-message show success";

            message.textContent =
                "Reflection saved successfully. Your quiz is now unlocked.";

        }


        /*
         * Do not immediately assume everything is fine.
         *
         * Re-check the server.
         *
         * This makes the backend the final authority
         * and protects against duplicate/completed
         * quiz attempts.
         */

        setTimeout(
            async function () {

                await checkCompletionStatus();

            },
            500
        );

    }
    catch (error) {

        console.error(
            "submitReflection error:",
            error
        );


        if (message) {

            message.className =
                "reflection-message show error";

            message.textContent =
                "Unable to save your reflection. Please check your connection and try again.";

        }


        restoreReflectionButton();

    }

}


/* ============================================================
   RESTORE REFLECTION BUTTON
============================================================ */

function restoreReflectionButton() {

    const button =
        getElement(
            "submitReflectionBtn"
        );


    if (!button) {
        return;
    }


    button.disabled =
        !reflectionRequirementsMet();


    button.innerHTML = `
        <span>
            Submit Reflection
        </span>

        <i class="fa-solid fa-arrow-right"></i>
    `;

}


/* ============================================================
   UNLOCK QUIZ
============================================================ */

function unlockQuiz() {

    if (
        !selectedMemberId ||
        !selectedLesson ||
        quizCompleted
    ) {

        return;

    }


    reflectionSubmitted =
        true;

    quizCompleted =
        false;

    quizSubmitted =
        false;


    saveQuizSession();


    const lockedName =
        getElement(
            "lockedMemberName"
        );


    if (lockedName) {

        lockedName.textContent =
            selectedMemberName;

    }


    showElement(
        "lockedParticipantSection"
    );

    hideElement(
        "participantSection"
    );

    hideElement(
        "reflectionSection"
    );

    hideElement(
        "completedSection"
    );


    renderQuestions();


    /*
     * Restore answers that were saved locally
     * before the participant left/closed the page.
     */

    restoreSavedAnswers();


    showElement(
        "quizSection"
    );


    if (typeof AOS !== "undefined") {

        AOS.refresh();

    }


    setTimeout(
        function () {

            const quiz =
                getElement(
                    "quizSection"
                );


            if (quiz) {

                quiz.scrollIntoView({

                    behavior:
                        "smooth",

                    block:
                        "start"

                });

            }

        },
        100
    );

}


/* ============================================================
   RENDER QUESTIONS
============================================================ */

function renderQuestions() {

    const container =
        getElement(
            "questions"
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    if (
        !quizData.length
    ) {

        container.innerHTML = `
            <div class="question-card">

                <h3>
                    No quiz questions are available right now.
                </h3>

            </div>
        `;

        return;

    }


    quizData.forEach(
        function (
            question,
            index
        ) {

            let options =
                "";


            [
                "A",
                "B",
                "C",
                "D"

            ].forEach(
                function (letter) {

                    const text =
                        question[
                            `option${letter}`
                        ];


                    if (!text) {
                        return;
                    }


                    options += `
                        <label class="option">

                            <input
                                type="radio"
                                name="q${index}"
                                value="${escapeHTML(letter)}"
                            >

                            <span>

                                <strong>
                                    ${escapeHTML(letter)}.
                                </strong>

                                ${escapeHTML(text)}

                            </span>

                        </label>
                    `;

                }
            );


            container.innerHTML += `

                <div class="question-card">

                    <div class="question-number">
                        QUESTION ${index + 1}
                    </div>

                    <h3>
                        ${escapeHTML(
                            question.question
                        )}
                    </h3>

                    <div class="options">
                        ${options}
                    </div>

                </div>

            `;

        }
    );


    /*
     * Save answers immediately whenever
     * an option is selected.
     */

    container
        .querySelectorAll(
            'input[type="radio"]'
        )
        .forEach(
            function (radio) {

                radio.addEventListener(
                    "change",
                    saveCurrentAnswers
                );

            }
        );

}


/* ============================================================
   QUIZ LISTENERS
============================================================ */

function setupQuizListeners() {

    const submitBtn =
        getElement(
            "submitBtn"
        );


    if (!submitBtn) {

        console.warn(
            "submitBtn was not found on the page."
        );

        return;

    }


    /*
     * IMPORTANT:
     *
     * We use ONLY this listener.
     *
     * Do not add another onclick listener
     * in JavaScript because the HTML already
     * contains onclick="submitQuiz()".
     */

    submitBtn.addEventListener(
        "click",
        submitQuiz
    );

}


/* ============================================================
   ANSWERS STORAGE KEY
============================================================ */

function getAnswersStorageKey() {

    return (
        `${ANSWERS_KEY}_` +
        `${selectedLesson}_` +
        `${selectedMemberId}`
    );

}


/* ============================================================
   SAVE CURRENT ANSWERS
============================================================ */

function saveCurrentAnswers() {

    if (
        !selectedLesson ||
        !selectedMemberId
    ) {

        return;

    }


    const answers = {};


    quizData.forEach(
        function (
            question,
            index
        ) {

            const selected =
                document.querySelector(
                    `input[name="q${index}"]:checked`
                );


            if (selected) {

                answers[index] =
                    selected.value;

            }

        }
    );


    try {

        localStorage.setItem(

            getAnswersStorageKey(),

            JSON.stringify({

                lessonNo:
                    selectedLesson,

                memberId:
                    selectedMemberId,

                answers:
                    answers,

                savedAt:
                    new Date().toISOString()

            })

        );

    }
    catch (error) {

        console.warn(
            "Unable to save quiz answers:",
            error
        );

    }

}


/* ============================================================
   RESTORE SAVED ANSWERS
============================================================ */

function restoreSavedAnswers() {

    if (
        !selectedLesson ||
        !selectedMemberId
    ) {

        return;

    }


    try {

        const raw =
            localStorage.getItem(
                getAnswersStorageKey()
            );


        if (!raw) {
            return;
        }


        const saved =
            JSON.parse(raw);


        if (
            !saved ||
            String(saved.lessonNo) !==
            String(selectedLesson) ||
            String(saved.memberId) !==
            String(selectedMemberId)
        ) {

            return;

        }


        const answers =
            saved.answers || {};


        Object.keys(
            answers
        ).forEach(
            function (index) {

                const value =
                    answers[index];


                const radio =
                    document.querySelector(
                        `input[name="q${index}"][value="${CSS.escape(value)}"]`
                    );


                if (radio) {

                    radio.checked =
                        true;

                }

            }
        );


        console.log(
            "Saved quiz answers restored."
        );

    }
    catch (error) {

        console.warn(
            "Unable to restore saved answers:",
            error
        );

    }

}


/* ============================================================
   CLEAR SAVED ANSWERS
============================================================ */

function clearSavedAnswers() {

    if (
        !selectedLesson ||
        !selectedMemberId
    ) {

        return;

    }


    try {

        localStorage.removeItem(
            getAnswersStorageKey()
        );

    }
    catch (error) {

        console.warn(
            "Unable to clear saved answers:",
            error
        );

    }

}


/* ============================================================
   SUBMIT QUIZ
============================================================ */

async function submitQuiz() {

    if (
        quizCompleted ||
        quizSubmitted
    ) {

        return;

    }


    if (!selectedMemberId) {

        alert(
            "Your participant has not been selected."
        );

        return;

    }


    /*
     * Reflection must already be completed.
     */

    if (!reflectionSubmitted) {

        /*
         * Before telling the participant to
         * complete reflection, check the backend.
         *
         * It may already have been completed
         * from another tab/device.
         */

        await checkCompletionStatus();


        if (!reflectionSubmitted) {

            alert(
                "Please complete the reflection before taking the quiz."
            );

        }


        return;

    }


    if (!selectedLesson) {

        alert(
            "The current quiz lesson could not be identified."
        );

        return;

    }


    const answers = [];


    for (
        let i = 0;
        i < quizData.length;
        i++
    ) {

        const selected =
            document.querySelector(
                `input[name="q${i}"]:checked`
            );


        if (!selected) {

            alert(
                `Please answer question ${i + 1}.`
            );


            const questionCards =
                document.querySelectorAll(
                    ".question-card"
                );


            if (
                questionCards[i]
            ) {

                questionCards[i].scrollIntoView({

                    behavior:
                        "smooth",

                    block:
                        "center"

                });

            }


            return;

        }


        answers.push(
            selected.value
        );

    }


    const submitBtn =
        getElement(
            "submitBtn"
        );


    if (submitBtn) {

        submitBtn.disabled =
            true;

        submitBtn.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Submitting...
        `;

    }


    quizSubmitted =
        true;


    try {

        const response =
            await fetch(
                API,
                {
                    method: "POST",

                    body: JSON.stringify({

                        action:
                            "scoreQuiz",

                        memberId:
                            selectedMemberId,

                        lessonNo:
                            selectedLesson,

                        answers:
                            answers

                    })

                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Score response:",
            data
        );


        /* ====================================================
           DUPLICATE ATTEMPT
        ==================================================== */

        if (
            data.status ===
            "already_attempted"
        ) {

            quizCompleted =
                true;

            quizSubmitted =
                true;


            clearSavedAnswers();

            clearQuizSession();


            alert(
                data.message ||
                "You have already completed this quiz."
            );


            window.location.href =
                `results.html?memberId=${encodeURIComponent(selectedMemberId)}&lessonNo=${encodeURIComponent(selectedLesson)}`;


            return;

        }


        /* ====================================================
           REFLECTION REQUIRED
        ==================================================== */

        if (
            data.status ===
            "reflection_required"
        ) {

            quizSubmitted =
                false;

            reflectionSubmitted =
                false;


            /*
             * DO NOT blindly show reflection.
             *
             * Ask the backend again.
             *
             * If the backend says reflection is already
             * completed, checkCompletionStatus() will
             * send the participant directly back to quiz.
             *
             * If not completed, it will show reflection.
             */

            await checkCompletionStatus();


            if (
                !reflectionSubmitted
            ) {

                alert(
                    data.message ||
                    "Please complete your reflection before taking the quiz."
                );

            }


            restoreQuizSubmitButton();


            return;

        }


        /* ====================================================
           OTHER ERROR
        ==================================================== */

        if (
            !data.success
        ) {

            quizSubmitted =
                false;


            alert(
                data.message ||
                "Unable to submit quiz."
            );


            restoreQuizSubmitButton();


            return;

        }


        /* ====================================================
           SUCCESS
        ==================================================== */

        quizCompleted =
            true;

        quizSubmitted =
            true;

        reflectionSubmitted =
            true;


        /*
         * Save result information before clearing
         * the participant session.
         */

        try {

            localStorage.setItem(
                LAST_REVIEW_KEY,
                JSON.stringify(
                    data.review ||
                    data.answers ||
                    []
                )
            );


            localStorage.setItem(
                LAST_QUESTIONS_KEY,
                JSON.stringify(
                    quizData
                )
            );


            localStorage.setItem(
                LAST_SCORE_KEY,
                String(
                    data.score ?? 0
                )
            );


            localStorage.setItem(
                LAST_POINTS_KEY,
                String(
                    data.points ?? 0
                )
            );


            localStorage.setItem(
                LAST_TOTAL_KEY,
                String(
                    data.totalPoints ??
                    data.total ??
                    0
                )
            );


            localStorage.setItem(
                LAST_RESULT_LESSON_KEY,
                String(
                    selectedLesson
                )
            );

        }
        catch (storageError) {

            console.warn(
                "Unable to save result information:",
                storageError
            );

        }


        /*
         * The quiz has now been permanently completed
         * for this participant + lesson.
         *
         * Remove temporary answers and session.
         */

        clearSavedAnswers();

        clearQuizSession();


        /*
         * Send participant to the results page.
         *
         * The backend remains the source of truth.
         */

        window.location.href =
            `results.html?memberId=${encodeURIComponent(selectedMemberId)}&lessonNo=${encodeURIComponent(selectedLesson)}&completed=1`;

    }
    catch (error) {

        console.error(
            "submitQuiz error:",
            error
        );


        /*
         * Allow another attempt if the request
         * genuinely failed.
         */

        quizSubmitted =
            false;


        alert(
            "Unable to submit quiz. Please check your connection and try again."
        );


        restoreQuizSubmitButton();

    }

}


/* ============================================================
   RESTORE QUIZ SUBMIT BUTTON
============================================================ */

function restoreQuizSubmitButton() {

    const submitBtn =
        getElement(
            "submitBtn"
        );


    if (!submitBtn) {
        return;
    }


    submitBtn.disabled =
        false;


    submitBtn.innerHTML = `
        <i class="fa-solid fa-paper-plane"></i>
        Submit Quiz
    `;

}


/* ============================================================
   REVIEW
============================================================ */

function showReview() {

    const reviewSection =
        getElement(
            "reviewSection"
        );


    const reviewContainer =
        getElement(
            "reviewContainer"
        );


    if (
        !reviewSection ||
        !reviewContainer
    ) {

        return;

    }


    reviewContainer.innerHTML =
        "";


    let review =
        reviewData;


    if (
        !Array.isArray(review) ||
        !review.length
    ) {

        try {

            const saved =
                localStorage.getItem(
                    LAST_REVIEW_KEY
                );


            if (saved) {

                review =
                    JSON.parse(
                        saved
                    );

            }

        }
        catch (error) {

            console.warn(
                "Unable to load saved review:",
                error
            );

        }

    }


    if (
        !Array.isArray(review) ||
        !review.length
    ) {

        reviewContainer.innerHTML = `
            <div class="question-card">
                <h3>
                    Review information is not available.
                </h3>
            </div>
        `;

        showElement(
            "reviewSection"
        );

        hideElement(
            "resultSection"
        );

        return;

    }


    review.forEach(
        function (
            item,
            index
        ) {

            const question =
                item.question ||
                item.questionText ||
                quizData[index]?.question ||
                "";


            const selected =
                item.selectedAnswer ||
                item.answer ||
                item.userAnswer ||
                "";


            const correct =
                item.correctAnswer ||
                item.correct ||
                "";


            const isCorrect =
                String(selected).trim().toUpperCase() ===
                String(correct).trim().toUpperCase();


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "question-card";


            card.innerHTML = `

                <div class="question-number">
                    QUESTION ${index + 1}
                </div>

                <h3>
                    ${escapeHTML(question)}
                </h3>

                <p>
                    <strong>
                        Your answer:
                    </strong>

                    ${escapeHTML(selected)}
                </p>

                <p>
                    <strong>
                        Correct answer:
                    </strong>

                    ${escapeHTML(correct)}
                </p>

                <p class="${isCorrect ? "review-correct" : "review-wrong"}">
                    ${
                        isCorrect
                            ? "✓ Correct"
                            : "✗ Incorrect"
                    }
                </p>

            `;


            reviewContainer.appendChild(
                card
            );

        }
    );


    showElement(
        "reviewSection"
    );


    hideElement(
        "resultSection"
    );


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


/* ============================================================
   HIDE REVIEW
============================================================ */

function hideReview() {

    hideElement(
        "reviewSection"
    );

}


/* ============================================================
   BACK TO QUIZ
============================================================ */

function backToQuiz() {

    hideElement(
        "reviewSection"
    );

    showElement(
        "quizSection"
    );

}


/* ============================================================
   OPEN SAVED SCORE
============================================================ */

function openSavedScore() {

    try {

        const score =
            localStorage.getItem(
                LAST_SCORE_KEY
            );

        const points =
            localStorage.getItem(
                LAST_POINTS_KEY
            );

        const total =
            localStorage.getItem(
                LAST_TOTAL_KEY
            );


        if (score !== null) {

            const scoreText =
                getElement(
                    "scoreText"
                );

            if (scoreText) {

                scoreText.textContent =
                    score;

            }

        }


        if (points !== null) {

            const pointsText =
                getElement(
                    "pointsText"
                );

            if (pointsText) {

                pointsText.textContent =
                    points;

            }

        }


        if (total !== null) {

            const totalPointsText =
                getElement(
                    "totalPointsText"
                );

            if (totalPointsText) {

                totalPointsText.textContent =
                    total;

            }

        }


        showElement(
            "resultSection"
        );

    }
    catch (error) {

        console.warn(
            "Unable to open saved score:",
            error
        );

    }

}


/* ============================================================
   OPEN SAVED REVIEW
============================================================ */

function openSavedReview() {

    try {

        const rawReview =
            localStorage.getItem(
                LAST_REVIEW_KEY
            );


        const rawQuestions =
            localStorage.getItem(
                LAST_QUESTIONS_KEY
            );


        if (rawQuestions) {

            reviewQuestions =
                JSON.parse(
                    rawQuestions
                );

        }


        if (rawReview) {

            reviewData =
                JSON.parse(
                    rawReview
                );

        }


        showReview();

    }
    catch (error) {

        console.warn(
            "Unable to open saved review:",
            error
        );

    }

}
