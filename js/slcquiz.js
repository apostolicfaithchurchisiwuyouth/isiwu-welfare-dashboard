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
    "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";


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

let quizSubmitting = false;

/* Prevent duplicate Add Name requests. */
let addingMember = false;

let quizCompleted = false;

let completionCheckInProgress = false;


/* ============================================================
   PAGE TRANSITION LOADER
   ============================================================

   This loader is intentionally created by JavaScript so no
   existing HTML/CSS needs to be changed. It only appears while
   the participant is moving between participant → reflection
   or reflection → quiz.
   ============================================================ */

let slcTransitionLoader = null;

function createTransitionLoader() {

    if (slcTransitionLoader) {
        return slcTransitionLoader;
    }

    const loader = document.createElement("div");

    loader.id = "slcTransitionLoader";

    loader.setAttribute("aria-live", "polite");

    loader.setAttribute("aria-busy", "true");

    loader.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: rgba(10, 0, 22, 0.82);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
    `;

    loader.innerHTML = `
        <div
            style="
                width: min(360px, 100%);
                box-sizing: border-box;
                padding: 30px 24px;
                border-radius: 20px;
                background: #ffffff;
                text-align: center;
                box-shadow: 0 18px 50px rgba(0,0,0,0.22);
            "
        >
            <div
                style="
                    width: 42px;
                    height: 42px;
                    margin: 0 auto 18px;
                    border: 4px solid rgba(74, 7, 84, 0.16);
                    border-top-color: #4a0754;
                    border-radius: 50%;
                    animation: afcSlcTransitionSpin 0.8s linear infinite;
                "
            ></div>

            <div
                id="slcTransitionLoaderText"
                style="
                    font-family: inherit;
                    font-size: 1rem;
                    font-weight: 700;
                    line-height: 1.4;
                    color: #0a0016;
                "
            >
                Preparing...
            </div>

            <div
                style="
                    margin-top: 8px;
                    font-family: inherit;
                    font-size: 0.85rem;
                    line-height: 1.5;
                    color: #6b6470;
                "
            >
                Please wait a moment.
            </div>
        </div>
    `;

    if (!document.getElementById("afcSlcTransitionLoaderStyle")) {

        const style =
            document.createElement("style");

        style.id =
            "afcSlcTransitionLoaderStyle";

        style.textContent = `
            @keyframes afcSlcTransitionSpin {
                to { transform: rotate(360deg); }
            }
        `;

        document.head.appendChild(style);
    }

    document.body.appendChild(loader);

    slcTransitionLoader = loader;

    return loader;
}


function showTransitionLoader(message) {

    const loader =
        createTransitionLoader();

    const text =
        loader.querySelector(
            "#slcTransitionLoaderText"
        );

    if (text) {

        text.textContent =
            message || "Preparing...";
    }

    loader.style.display =
        "flex";

    loader.setAttribute(
        "aria-busy",
        "true"
    );

    document.body.style.overflow =
        "hidden";
}


function hideTransitionLoader() {

    if (!slcTransitionLoader) {
        return;
    }

    slcTransitionLoader.style.display =
        "none";

    slcTransitionLoader.setAttribute(
        "aria-busy",
        "false"
    );

    document.body.style.overflow =
        "";
}


async function checkCompletionStatusWithLoader(message) {

    showTransitionLoader(message);

    try {

        return await checkCompletionStatus();

    }
    finally {

        hideTransitionLoader();
    }
}


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

        element.classList.remove(
            "hidden"
        );
    }
}


function hideElement(id) {

    const element =
        getElement(id);

    if (element) {

        element.classList.add(
            "hidden"
        );
    }
}


/* ============================================================
   SAFE HTML
============================================================ */

function escapeHTML(value) {

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
   LOAD QUIZ
============================================================ */

async function loadQuiz() {

    const status =
        getElement(
            "quizStatus"
        );

    const countdown =
        getElement(
            "quizCountdown"
        );

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

            hideElement(
                "resultSection"
            );

            hideElement(
                "completedSection"
            );

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

            hideElement(
                "resultSection"
            );

            hideElement(
                "completedSection"
            );

            if (data.openTime) {

                quizOpenTime =
                    new Date(
                        data.openTime
                    );

                startCountdown(
                    "open"
                );
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
            Array.isArray(
                data.questions
            )
                ? data.questions
                : [];

        selectedLesson =
            String(
                data.lessonNo || ""
            ).trim();

        quizCloseTime =
            data.closeTime
                ? new Date(
                    data.closeTime
                )
                : null;

        quizOpenTime =
            data.openTime
                ? new Date(
                    data.openTime
                )
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

            startCountdown(
                "close"
            );
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
            !Array.isArray(
                data.members
            )
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

        continueBtn.onclick =
            lockSelectedParticipant;
    }


    /*
     * One assigned handler for Add Name.
     * The function itself also has a hard request lock.
     */

    if (addButton) {

        addButton.onclick =
            addNewMember;
    }
}


/* ============================================================
   ADD NEW MEMBER
============================================================ */

async function addNewMember() {

    /* HARD LOCK: one Add Name request at a time. */

    if (
        addingMember ||
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


    /* Lock before starting the network request. */

    addingMember =
        true;


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

        addingMember =
            false;

        button.disabled =
            false;

        button.innerHTML =
            oldHTML;
    }
}


/* ============================================================
   LOCK SELECTED PARTICIPANT
============================================================ */

async function lockSelectedParticipant() {

    if (
        completionCheckInProgress
    ) {

        return;
    }


    const select =
        getElement(
            "memberSelect"
        );

    const continueBtn =
        getElement(
            "continueToReflectionBtn"
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


    selectedMemberId =
        memberId;


    selectedMemberName =
        selectedOption
            ? selectedOption.textContent.trim()
            : "";


    if (continueBtn) {

        continueBtn.disabled =
            true;
    }


    saveQuizSession();


    await checkCompletionStatusWithLoader(
        "Checking your quiz status..."
    );
}


/* ============================================================
   CHECK COMPLETION STATUS
============================================================ */

async function checkCompletionStatus() {

    if (
        !selectedMemberId ||
        !selectedLesson
    ) {

        return;
    }


    if (
        completionCheckInProgress
    ) {

        return;
    }


    completionCheckInProgress =
        true;


    try {

        const response =
            await fetch(
                API,
                {
                    method: "POST",
                    body: JSON.stringify({
                        action:
                            "checkQuizCompletion",
                        memberId:
                            selectedMemberId,
                        lessonNo:
                            selectedLesson
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
            "Completion response:",
            data
        );


        /*
         * If the backend confirms that this participant
         * has already completed the CURRENT lesson quiz,
         * show the completed state.
         */

        if (
            data.completed === true ||
            data.quizCompleted === true
        ) {

            quizCompleted =
                true;

            quizSubmitted =
                true;

            reflectionSubmitted =
                true;


            saveQuizSession();


            showCompletedState(
                data
            );

            return;
        }


        /*
         * Participant has NOT completed the current
         * lesson quiz.
         */

        quizCompleted =
            false;

        quizSubmitted =
            false;


        /*
         * Reflection may already have been submitted.
         * If yes, open quiz directly.
         * If no, show reflection.
         */

        const reflectionDone =
            data.reflectionSubmitted === true ||
            data.reflectionCompleted === true;


        if (reflectionDone) {

            reflectionSubmitted =
                true;

            saveQuizSession();

            showQuizSection();

        }
        else {

            reflectionSubmitted =
                false;

            saveQuizSession();

            showReflectionSection();
        }

    }
    catch (error) {

        console.error(
            "checkCompletionStatus error:",
            error
        );

        /*
         * If completion checking fails, do not silently
         * mark the quiz as completed. Let the participant
         * retry instead.
         */

        alert(
            "Unable to check your quiz status. Please try again."
        );

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

    hideElement(
        "resultSection"
    );

    showElement(
        "completedSection"
    );


    const completedName =
        getElement(
            "completedName"
        );


    if (completedName) {

        completedName.textContent =
            selectedMemberName ||
            "Participant";
    }


    const completedMessage =
        getElement(
            "completedMessage"
        );


    if (completedMessage) {

        completedMessage.textContent =
            data.message ||
            "You have already completed this week's quiz.";
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* ============================================================
   SHOW REFLECTION SECTION
============================================================ */

function showReflectionSection() {

    hideElement(
        "participantSection"
    );

    hideElement(
        "lockedParticipantSection"
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


    showElement(
        "reflectionSection"
    );


    const reflectionName =
        getElement(
            "reflectionMemberName"
        );


    if (reflectionName) {

        reflectionName.textContent =
            selectedMemberName;
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* ============================================================
   SHOW QUIZ SECTION
============================================================ */

function showQuizSection() {

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
        "resultSection"
    );

    hideElement(
        "completedSection"
    );


    showElement(
        "quizSection"
    );


    renderQuizQuestions();


    restoreSavedAnswers();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* ============================================================
   REFLECTION LISTENERS
============================================================ */

function setupReflectionListeners() {

    const reflectionForm =
        getElement(
            "reflectionForm"
        );

    const reflectionInput =
        getElement(
            "reflectionText"
        );

    const reflectionBtn =
        getElement(
            "submitReflectionBtn"
        );


    if (reflectionInput) {

        reflectionInput.addEventListener(
            "input",
            function () {

                const count =
                    reflectionInput
                        .value
                        .trim()
                        .length;

                const counter =
                    getElement(
                        "reflectionCharacterCount"
                    );

                if (counter) {

                    counter.textContent =
                        `${count}/${REFLECTION_MIN_CHARACTERS}`;
                }


                if (reflectionBtn) {

                    reflectionBtn.disabled =
                        count <
                        REFLECTION_MIN_CHARACTERS;
                }
            }
        );
    }


    if (reflectionForm) {

        reflectionForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();

                submitReflection();
            }
        );
    }


    if (reflectionBtn) {

        reflectionBtn.onclick =
            submitReflection;
    }
}


/* ============================================================
   SUBMIT REFLECTION
============================================================ */

async function submitReflection() {

    if (
        !selectedMemberId ||
        !selectedLesson
    ) {

        alert(
            "Please select your name first."
        );

        return;
    }


    if (
        reflectionSubmitted
    ) {

        showQuizSection();

        return;
    }


    const input =
        getElement(
            "reflectionText"
        );

    const button =
        getElement(
            "submitReflectionBtn"
        );


    if (!input) {
        return;
    }


    const reflection =
        input.value.trim();


    if (
        reflection.length <
        REFLECTION_MIN_CHARACTERS
    ) {

        alert(
            `Please write at least ${REFLECTION_MIN_CHARACTERS} characters for your reflection.`
        );

        input.focus();

        return;
    }


    if (button) {

        button.disabled =
            true;

        button.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Submitting...
        `;
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
                        reflection:
                            reflection
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
            "Reflection response:",
            data
        );


        if (
            !data.success
        ) {

            alert(
                data.message ||
                "Unable to submit your reflection."
            );

            return;
        }


        reflectionSubmitted =
            true;


        saveQuizSession();


        showQuizSection();

    }
    catch (error) {

        console.error(
            "submitReflection error:",
            error
        );

        alert(
            "Unable to submit your reflection. Please try again."
        );

    }
    finally {

        if (button) {

            button.disabled =
                false;

            button.innerHTML = `
                <i class="fa-solid fa-arrow-right"></i>
                Continue to Quiz
            `;
        }
    }
}


/* ============================================================
   QUIZ LISTENERS
============================================================ */

function setupQuizListeners() {

    const quizForm =
        getElement(
            "quizForm"
        );

    const submitBtn =
        getElement(
            "submitBtn"
        );


    if (quizForm) {

        quizForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();

                submitQuiz();
            }
        );
    }


    if (submitBtn) {

        submitBtn.onclick =
            submitQuiz;
    }


    const reviewBtn =
        getElement(
            "reviewBtn"
        );


    if (reviewBtn) {

        reviewBtn.onclick =
            showReview;
    }
}


/* ============================================================
   RENDER QUIZ QUESTIONS
============================================================ */

function renderQuizQuestions() {

    const container =
        getElement(
            "quizQuestions"
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    if (
        !Array.isArray(
            quizData
        ) ||
        quizData.length === 0
    ) {

        container.innerHTML = `
            <div class="quiz-empty-state">
                <p>No quiz questions are available.</p>
            </div>
        `;

        return;
    }


    quizData.forEach(
        function (
            question,
            index
        ) {

            const questionNumber =
                index + 1;


            const questionText =
                question.question ||
                question.questionText ||
                question.text ||
                "";


            const letters = [
                "A",
                "B",
                "C",
                "D"
            ];


            const options =
                letters.map(
                    function (letter) {

                        return {
                            letter:
                                letter,

                            text:
                                question[
                                    `option${letter}`
                                ] ||
                                question[
                                    letter
                                ] ||
                                ""
                        };
                    }
                );


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "question-card";


            card.dataset.questionNumber =
                questionNumber;


            card.innerHTML = `
                <div class="question-number">
                    Question ${questionNumber}
                </div>

                <div class="question-text">
                    ${escapeHTML(
                        questionText
                    )}
                </div>

                <div class="options-list">

                    ${options
                        .map(
                            function (
                                option
                            ) {

                                return `
                                    <label class="option">

                                        <input
                                            type="radio"
                                            name="q${index}"
                                            value="${escapeHTML(
                                                option.letter
                                            )}"
                                            data-question-index="${index}"
                                            data-option-letter="${escapeHTML(
                                                option.letter
                                            )}"
                                        >

                                        <span class="option-letter">
                                            ${escapeHTML(
                                                option.letter
                                            )}
                                        </span>

                                        <span class="option-text">
                                            ${escapeHTML(
                                                option.text
                                            )}
                                        </span>

                                    </label>
                                `;
                            }
                        )
                        .join("")}

                </div>
            `;


            container.appendChild(
                card
            );
        }
    );


    /*
     * Save answers immediately whenever a participant
     * selects an option.
     *
     * IMPORTANT:
     * The answer is stored using QUESTION NUMBER starting
     * from 1, because the backend scoreQuiz() expects:
     *
     * {
     *     1: "A",
     *     2: "C",
     *     3: "B"
     * }
     *
     * NOT:
     *
     * [
     *     "A",
     *     "C",
     *     "B"
     * ]
     */

    container
        .querySelectorAll(
            'input[type="radio"]'
        )
        .forEach(
            function (radio) {

                radio.addEventListener(
                    "change",
                    function () {

                        saveCurrentAnswers();

                        markSelectedAnswer(
                            radio
                        );
                    }
                );
            }
        );
}


/* ============================================================
   MARK SELECTED ANSWER
============================================================ */

function markSelectedAnswer(radio) {

    if (!radio) {
        return;
    }


    const questionCard =
        radio.closest(
            ".question-card"
        );


    if (!questionCard) {
        return;
    }


    questionCard
        .querySelectorAll(
            ".option.selected-answer"
        )
        .forEach(
            function (option) {

                option.classList.remove(
                    "selected-answer"
                );
            }
        );


    const label =
        radio.closest(
            ".option"
        );


    if (label) {

        label.classList.add(
            "selected-answer"
        );
    }
}


/* ============================================================
   SAVE CURRENT ANSWERS
============================================================ */

function saveCurrentAnswers() {

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

                /*
                 * CRITICAL FIX:
                 *
                 * Backend uses question numbers beginning
                 * at 1.
                 *
                 * Therefore question index 0 becomes key 1,
                 * question index 1 becomes key 2, etc.
                 */

                answers[index + 1] =
                    selected.value;
            }
        }
    );


    try {

        localStorage.setItem(
            ANSWERS_KEY,
            JSON.stringify(
                answers
            )
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

    try {

        const saved =
            localStorage.getItem(
                ANSWERS_KEY
            );


        if (!saved) {
            return;
        }


        const answers =
            JSON.parse(
                saved
            );


        if (
            !answers ||
            typeof answers !== "object"
        ) {

            return;
        }


        Object.keys(
            answers
        ).forEach(
            function (
                questionNumber
            ) {

                /*
                 * Stored question numbers begin at 1.
                 *
                 * HTML radio names use zero-based indexes:
                 * q0 = question 1
                 * q1 = question 2
                 * q2 = question 3
                 */

                const index =
                    Number(
                        questionNumber
                    ) - 1;


                if (
                    index < 0
                ) {

                    return;
                }


                const answer =
                    String(
                        answers[
                            questionNumber
                        ] || ""
                    ).trim();


                if (!answer) {
                    return;
                }


                const radio =
                    document.querySelector(
                        `input[name="q${index}"][value="${CSS.escape(
                            answer
                        )}"]`
                    );


                if (radio) {

                    radio.checked =
                        true;

                    markSelectedAnswer(
                        radio
                    );
                }
            }
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

    try {

        localStorage.removeItem(
            ANSWERS_KEY
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
        quizSubmitting
    ) {

        return;
    }


    if (
        quizSubmitted ||
        quizCompleted
    ) {

        return;
    }


    if (
        !selectedMemberId
    ) {

        alert(
            "Please select your name first."
        );

        return;
    }


    if (
        !selectedLesson
    ) {

        alert(
            "The current lesson could not be identified."
        );

        return;
    }


    if (
        !Array.isArray(
            quizData
        ) ||
        quizData.length === 0
    ) {

        alert(
            "There are no quiz questions to submit."
        );

        return;
    }


    /*
     * ========================================================
     * CRITICAL SCORING FIX
     * ========================================================
     *
     * Build answers as an OBJECT whose keys are question
     * numbers beginning at 1.
     *
     * This matches the Apps Script scoreQuiz() function.
     *
     * Example:
     *
     * answers = {
     *     1: "A",
     *     2: "C",
     *     3: "B"
     * };
     *
     * The old version used a zero-based array:
     *
     * answers = ["A", "C", "B"];
     *
     * That caused the backend to read the answer for the
     * WRONG question number.
     *
     * This is why a participant could select the correct
     * answer and still receive an incorrect score.
     * ========================================================
     */

    const answers = {};


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


        /*
         * IMPORTANT:
         *
         * i + 1 is intentional.
         *
         * Question 1 → answers[1]
         * Question 2 → answers[2]
         * Question 3 → answers[3]
         */

        answers[i + 1] =
            selected.value;
    }


    /*
     * Final request lock.
     */

    if (
        quizSubmitting
    ) {

        return;
    }


    quizSubmitting =
        true;


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


        if (
            !data.success
        ) {

            quizSubmitted =
                false;

            alert(
                data.message ||
                "Unable to submit your quiz."
            );

            return;
        }


        /*
         * ====================================================
         * SUCCESSFUL QUIZ SUBMISSION
         * ====================================================
         */

        quizCompleted =
            true;

        quizSubmitted =
            true;

        reflectionSubmitted =
            true;


        /*
         * Store the backend review and result information
         * locally so the review/result page can use it.
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
                    data.pointsEarned ??
                    data.points ??
                    0
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


        clearSavedAnswers();

        clearQuizSession();


        reviewData =
            Array.isArray(
                data.review
            )
                ? data.review
                : [];


        /*
         * Display the result directly instead of navigating
         * away before the result section has a chance to show.
         */

        displayQuizResult(
            data
        );


        quizSubmitting =
            false;

    }
    catch (error) {

        console.error(
            "submitQuiz error:",
            error
        );


        quizSubmitted =
            false;


        alert(
            "Unable to submit your quiz. Please try again."
        );

    }
    finally {

        quizSubmitting =
            false;


        if (submitBtn) {

            submitBtn.disabled =
                false;

            submitBtn.innerHTML = `
                <i class="fa-solid fa-check"></i>
                Submit Quiz
            `;
        }
    }
}


/* ============================================================
   DISPLAY QUIZ RESULT
============================================================ */

function displayQuizResult(data) {

    const scoreText =
        getElement(
            "scoreText"
        );


    const pointsText =
        getElement(
            "pointsText"
        );


    const totalPointsText =
        getElement(
            "totalPointsText"
        );


    const resultSection =
        getElement(
            "resultSection"
        );


    if (scoreText) {

        scoreText.textContent =
            data.score ?? "0/0";
    }


    if (pointsText) {

        pointsText.textContent =
            `Points earned: ${
                data.pointsEarned ??
                data.points ??
                0
            }`;
    }


    if (totalPointsText) {

        totalPointsText.textContent =
            `Total points: ${
                data.totalPoints ??
                data.total ??
                0
            }`;
    }


    hideElement(
        "quizSection"
    );


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
        "completedSection"
    );


    hideElement(
        "reviewSection"
    );


    if (resultSection) {

        resultSection.classList.remove(
            "hidden"
        );


        resultSection.scrollIntoView({
            behavior:
                "smooth",
            block:
                "start"
        });
    }


    const reviewBtn =
        getElement(
            "reviewBtn"
        );


    if (reviewBtn) {

        reviewBtn.style.display =
            reviewData.length
                ? "block"
                : "none";
    }
}


/* ============================================================
   SAVE QUIZ SESSION
============================================================ */

function saveQuizSession() {

    try {

        const session = {

            memberId:
                selectedMemberId,

            memberName:
                selectedMemberName,

            lessonNo:
                selectedLesson,

            reflectionSubmitted:
                reflectionSubmitted,

            quizSubmitted:
                quizSubmitted,

            quizCompleted:
                quizCompleted,

            savedAt:
                Date.now()
        };


        localStorage.setItem(
            SESSION_KEY,
            JSON.stringify(
                session
            )
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
   CLEAR QUIZ SESSION
============================================================ */

function clearQuizSession() {

    try {

        localStorage.removeItem(
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
   RESTORE QUIZ SESSION
============================================================ */

async function restoreQuizSession() {

    if (
        !quizLoaded
    ) {

        return;
    }


    try {

        const saved =
            localStorage.getItem(
                SESSION_KEY
            );


        if (!saved) {

            return;
        }


        const session =
            JSON.parse(
                saved
            );


        if (
            !session ||
            typeof session !== "object"
        ) {

            return;
        }


        /*
         * Only restore the session if it belongs to the
         * CURRENT lesson.
         */

        if (
            String(
                session.lessonNo || ""
            ) !==
            String(
                selectedLesson
            )
        ) {

            clearQuizSession();

            clearSavedAnswers();

            return;
        }


        selectedMemberId =
            String(
                session.memberId || ""
            ).trim();


        selectedMemberName =
            String(
                session.memberName || ""
            ).trim();


        reflectionSubmitted =
            session.reflectionSubmitted === true;


        quizSubmitted =
            session.quizSubmitted === true;


        quizCompleted =
            session.quizCompleted === true;


        if (
            !selectedMemberId
        ) {

            return;
        }


        /*
         * Always ask the backend for the current completion
         * status. The local session is only used to restore
         * the participant and UI state.
         */

        await checkCompletionStatusWithLoader(
            "Restoring your quiz session..."
        );

    }
    catch (error) {

        console.warn(
            "Unable to restore quiz session:",
            error
        );
    }
}


/* ============================================================
   REVIEW
============================================================ */

function showReview() {

    if (
        !Array.isArray(
            reviewData
        ) ||
        reviewData.length === 0
    ) {

        alert(
            "Your quiz review is not available."
        );

        return;
    }


    hideElement(
        "resultSection"
    );

    hideElement(
        "quizSection"
    );

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
        "completedSection"
    );


    showElement(
        "reviewSection"
    );


    renderReview();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* ============================================================
   RENDER REVIEW
============================================================ */

function renderReview() {

    const container =
        getElement(
            "reviewQuestions"
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    reviewData.forEach(
        function (
            item,
            index
        ) {

            const selected =
                item.selectedAnswer ||
                item.answer ||
                item.userAnswer ||
                "";


            const correct =
                item.correctAnswer ||
                "";


            /*
             * The backend's explicit boolean `correct`
             * is the preferred source of truth.
             *
             * If the backend does not provide it, compare
             * the participant answer with the correct answer.
             */

            const isCorrect =
                typeof item.correct === "boolean"
                    ? item.correct
                    : (
                        String(
                            selected
                        )
                            .trim()
                            .toUpperCase() ===
                        String(
                            correct
                        )
                            .trim()
                            .toUpperCase()
                    );


            const questionData =
                quizData[index] ||
                {};


            const selectedText =
                questionData[
                    `option${String(
                        selected
                    ).toUpperCase()}`
                ] ||
                selected ||
                "Not answered";


            const correctText =
                questionData[
                    `option${String(
                        correct
                    ).toUpperCase()}`
                ] ||
                correct ||
                "Unavailable";


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                isCorrect
                    ? "review-question correct"
                    : "review-question incorrect";


            card.innerHTML = `
                <div class="review-question-number">
                    Question ${index + 1}
                </div>

                <div class="review-question-text">
                    ${escapeHTML(
                        item.question ||
                        questionData.question ||
                        questionData.questionText ||
                        ""
                    )}
                </div>

                <div class="review-answer-row">
                    <strong>Your answer:</strong>
                    <span>
                        ${escapeHTML(
                            selectedText
                        )}
                    </span>
                </div>

                <div class="review-answer-row">
                    <strong>Correct answer:</strong>
                    <span>
                        ${escapeHTML(
                            correctText
                        )}
                    </span>
                </div>

                <div class="review-status">
                    ${
                        isCorrect
                            ? "✓ Correct"
                            : "✗ Incorrect"
                    }
                </div>
            `;


            container.appendChild(
                card
            );
        }
    );
}


/* ============================================================
   END OF PART 1
============================================================ */

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

        addingMember =
            false;

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

    await checkCompletionStatusWithLoader(
        "Preparing your reflection..."
    );

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

    await checkCompletionStatusWithLoader(
        "Preparing your reflection..."
    );

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

        return;

    }


    showElement(
        "completedSection"
    );


    const completedTitle =
        completedSection.querySelector(
            "h2"
        );


    if (completedTitle) {

        completedTitle.textContent =
            "You've already completed this quiz";

    }


    const completedMessage =
        completedSection.querySelector(
            "p"
        );


    if (completedMessage) {

        completedMessage.textContent =
            `You have already completed Lesson ${selectedLesson}. You cannot repeat the reflection or quiz for the same lesson.`;

    }


    const resultsLink =
        completedSection.querySelector(
            "a"
        );


    if (resultsLink) {

        resultsLink.href =
            `results.html?memberId=${encodeURIComponent(selectedMemberId)}&lessonNo=${encodeURIComponent(selectedLesson)}`;

    }

}


/* ============================================================
   CHECK COMPLETION STATUS WITH LOADER
============================================================ */

async function checkCompletionStatusWithLoader(
    message
) {

    showTransitionLoader(
        message ||
        "Please wait..."
    );


    try {

        await checkCompletionStatus();

    }
    finally {

        hideTransitionLoader();

    }

}


/* ============================================================
   SHOW TRANSITION LOADER
============================================================ */

function showTransitionLoader(
    message
) {

    const loader =
        getElement(
            "transitionLoader"
        );


    if (!loader) {

        return;

    }


    const loaderText =
        loader.querySelector(
            ".loader-text"
        );


    if (loaderText) {

        loaderText.textContent =
            message ||
            "Please wait...";

    }


    loader.classList.remove(
        "hidden"
    );


    loader.setAttribute(
        "aria-hidden",
        "false"
    );

}


/* ============================================================
   HIDE TRANSITION LOADER
============================================================ */

function hideTransitionLoader() {

    const loader =
        getElement(
            "transitionLoader"
        );


    if (!loader) {

        return;

    }


    loader.classList.add(
        "hidden"
    );


    loader.setAttribute(
        "aria-hidden",
        "true"
    );

}


/* ============================================================
   UNLOCK QUIZ
============================================================ */

function unlockQuiz() {

    if (
        quizCompleted
    ) {

        return;

    }


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
        "completedSection"
    );


    showElement(
        "quizSection"
    );


    /*
     * Render the quiz only once.
     */

    renderQuizQuestions();


    /*
     * Restore previously selected answers,
     * if the participant had already started
     * the quiz in this browser session.
     */

    restoreSavedAnswers();


    /*
     * Make sure the quiz timer is running.
     */

    startCountdown();


    /*
     * Save the participant/lesson session.
     */

    saveQuizSession();


    const quizSection =
        getElement(
            "quizSection"
        );


    if (quizSection) {

        quizSection.scrollIntoView({
            behavior:
                "smooth",

            block:
                "start"
        });

    }

}


/* ============================================================
   CLEAR REFLECTION FIELDS
============================================================ */

function clearReflectionFields() {

    const fields = [
        "reflection1",
        "reflection2",
        "reflection3",
        "reflection4",
        "reflection5",
        "reflectionText"
    ];


    fields.forEach(
        function (id) {

            const element =
                getElement(id);


            if (
                element &&
                (
                    element.tagName ===
                    "INPUT" ||
                    element.tagName ===
                    "TEXTAREA"
                )
            ) {

                element.value =
                    "";

            }

        }
    );


    /*
     * Clear radio/checkbox answers
     * used by the reflection section.
     */

    document
        .querySelectorAll(
            "#reflectionSection input[type='radio'], #reflectionSection input[type='checkbox']"
        )
        .forEach(
            function (input) {

                input.checked =
                    false;

            }
        );


    updateReflectionProgress();

}


/* ============================================================
   REFLECTION PROGRESS
============================================================ */

function updateReflectionProgress() {

    const section =
        getElement(
            "reflectionSection"
        );


    if (!section) {

        return;

    }


    const fields =
        section.querySelectorAll(
            "textarea, input[type='text']"
        );


    let completed =
        0;


    fields.forEach(
        function (field) {

            if (
                String(
                    field.value || ""
                ).trim()
            ) {

                completed++;

            }

        }
    );


    const total =
        fields.length;


    const progressText =
        getElement(
            "reflectionProgress"
        );


    if (progressText) {

        progressText.textContent =
            total
                ? `${completed}/${total} completed`
                : "";

    }


    const submitButton =
        getElement(
            "submitReflectionBtn"
        );


    if (submitButton) {

        /*
         * Do not force-enable the button if the
         * HTML already controls it differently.
         */

        submitButton.disabled =
            total > 0 &&
            completed < total;

    }

}


/* ============================================================
   REFLECTION EVENT LISTENERS
============================================================ */

function setupReflectionListeners() {

    const section =
        getElement(
            "reflectionSection"
        );


    if (!section) {

        return;

    }


    section
        .querySelectorAll(
            "textarea, input[type='text']"
        )
        .forEach(
            function (field) {

                field.addEventListener(
                    "input",
                    function () {

                        updateReflectionProgress();

                    }
                );

            }
        );


    const submitButton =
        getElement(
            "submitReflectionBtn"
        );


    if (
        submitButton &&
        !submitButton.dataset.listenerAttached
    ) {

        submitButton.dataset.listenerAttached =
            "true";


        submitButton.addEventListener(
            "click",
            submitReflection
        );

    }

}


/* ============================================================
   SUBMIT REFLECTION
============================================================ */

async function submitReflection() {

    if (
        !selectedMemberId ||
        !selectedLesson
    ) {

        alert(
            "Please select your name first."
        );

        return;

    }


    if (
        reflectionSubmitted ||
        quizCompleted
    ) {

        return;

    }


    const section =
        getElement(
            "reflectionSection"
        );


    if (!section) {

        return;

    }


    /*
     * Collect every reflection field.
     */

    const answers = {};


    section
        .querySelectorAll(
            "textarea, input[type='text'], input[type='radio']:checked, input[type='checkbox']:checked"
        )
        .forEach(
            function (field) {

                const key =
                    field.name ||
                    field.id;


                if (!key) {

                    return;

                }


                if (
                    field.type ===
                    "checkbox"
                ) {

                    if (
                        !Array.isArray(
                            answers[key]
                        )
                    ) {

                        answers[key] =
                            [];

                    }


                    answers[key].push(
                        field.value
                    );

                }
                else {

                    answers[key] =
                        field.value;

                }

            }
        );


    /*
     * Validate visible text fields.
     */

    const requiredFields =
        section.querySelectorAll(
            "textarea, input[type='text']"
        );


    for (
        let i = 0;
        i < requiredFields.length;
        i++
    ) {

        const field =
            requiredFields[i];


        if (
            !String(
                field.value || ""
            ).trim()
        ) {

            alert(
                "Please complete all reflection questions."
            );


            field.focus();

            return;

        }

    }


    const button =
        getElement(
            "submitReflectionBtn"
        );


    if (
        button &&
        button.disabled
    ) {

        return;

    }


    const oldHTML =
        button
            ? button.innerHTML
            : "";


    if (button) {

        button.disabled =
            true;

        button.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Saving Reflection...
        `;

    }


    showTransitionLoader(
        "Saving your reflection..."
    );


    try {

        const response =
            await fetch(
                API,
                {
                    method:
                        "POST",

                    body:
                        JSON.stringify({

                            action:
                                "submitReflection",

                            memberId:
                                selectedMemberId,

                            lessonNo:
                                selectedLesson,

                            reflection:
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
            "Reflection response:",
            data
        );


        if (
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to save reflection."
            );

        }


        reflectionSubmitted =
            true;


        saveQuizSession();


        /*
         * After a successful reflection,
         * go directly to the quiz.
         */

        unlockQuiz();


    }
    catch (error) {

        console.error(
            "submitReflection error:",
            error
        );


        alert(
            error.message ||
            "Unable to save your reflection. Please try again."
        );

    }
    finally {

        hideTransitionLoader();


        if (button) {

            button.disabled =
                false;

            button.innerHTML =
                oldHTML;

        }

    }

}


/* ============================================================
   QUIZ EVENT LISTENERS
============================================================ */

function setupQuizListeners() {

    const submitButton =
        getElement(
            "submitQuizBtn"
        );


    if (
        submitButton &&
        !submitButton.dataset.listenerAttached
    ) {

        submitButton.dataset.listenerAttached =
            "true";


        submitButton.addEventListener(
            "click",
            submitQuiz
        );

    }


    const reviewButton =
        getElement(
            "reviewBtn"
        );


    if (
        reviewButton &&
        !reviewButton.dataset.listenerAttached
    ) {

        reviewButton.dataset.listenerAttached =
            "true";


        reviewButton.addEventListener(
            "click",
            function () {

                showReviewSection();

            }
        );

    }


    const backButton =
        getElement(
            "backToQuizBtn"
        );


    if (
        backButton &&
        !backButton.dataset.listenerAttached
    ) {

        backButton.dataset.listenerAttached =
            "true";


        backButton.addEventListener(
            "click",
            function () {

                hideElement(
                    "reviewSection"
                );

                showElement(
                    "resultSection"
                );

            }
        );

    }

}


/* ============================================================
   RENDER QUIZ QUESTIONS
============================================================ */

function renderQuizQuestions() {

    const container =
        getElement(
            "questionsContainer"
        );


    if (!container) {

        console.warn(
            "questionsContainer not found."
        );

        return;

    }


    if (
        !Array.isArray(
            quizData
        ) ||
        quizData.length === 0
    ) {

        container.innerHTML = `
            <div class="quiz-empty">
                <i class="fa-solid fa-circle-exclamation"></i>
                <p>No quiz questions are available.</p>
            </div>
        `;

        return;

    }


    container.innerHTML =
        quizData
            .map(
                function (
                    question,
                    index
                ) {

                    const questionNumber =
                        index + 1;


                    const questionText =
                        question.question ||
                        question.Question ||
                        question.text ||
                        question.questionText ||
                        "";


                    const options = [
                        {
                            letter:
                                "A",

                            text:
                                question.optionA ||
                                question.OptionA ||
                                question.A ||
                                ""
                        },

                        {
                            letter:
                                "B",

                            text:
                                question.optionB ||
                                question.OptionB ||
                                question.B ||
                                ""
                        },

                        {
                            letter:
                                "C",

                            text:
                                question.optionC ||
                                question.OptionC ||
                                question.C ||
                                ""
                        },

                        {
                            letter:
                                "D",

                            text:
                                question.optionD ||
                                question.OptionD ||
                                question.D ||
                                ""
                        }
                    ];


                    return `
                        <article
                            class="question-card"
                            data-question-index="${index}"
                        >

                            <div class="question-number">
                                Question ${questionNumber}
                            </div>

                            <h3 class="question-text">
                                ${escapeHTML(questionText)}
                            </h3>

                            <div class="question-options">

                                ${options
                                    .map(
                                        function (
                                            option
                                        ) {

                                            return `
                                                <label class="option">

                                                    <input
                                                        type="radio"
                                                        name="q${index}"
                                                        value="${escapeHTML(option.letter)}"
                                                        data-question-index="${index}"
                                                        data-option-letter="${escapeHTML(option.letter)}"
                                                    >

                                                    <span class="option-letter">
                                                        ${escapeHTML(option.letter)}
                                                    </span>

                                                    <span class="option-text">
                                                        ${escapeHTML(option.text)}
                                                    </span>

                                                </label>
                                            `;

                                        }
                                    )
                                    .join("")}

                            </div>

                        </article>
                    `;

                }
            )
            .join("");


    /*
     * Attach selection listeners after rendering.
     */

    container
        .querySelectorAll(
            "input[type='radio']"
        )
        .forEach(
            function (radio) {

                radio.addEventListener(
                    "change",
                    function () {

                        saveCurrentAnswers();

                        markSelectedAnswer(
                            radio
                        );

                    }
                );

            }
        );


    /*
     * Update question counter if the HTML
     * provides one.
     */

    const count =
        getElement(
            "questionCount"
        );


    if (count) {

        count.textContent =
            `${quizData.length} questions`;

    }

}


/* ============================================================
   MARK SELECTED ANSWER
============================================================ */

function markSelectedAnswer(
    radio
) {

    if (!radio) {

        return;

    }


    const questionCard =
        radio.closest(
            ".question-card"
        );


    if (!questionCard) {

        return;

    }


    questionCard
        .querySelectorAll(
            ".option.selected-answer"
        )
        .forEach(
            function (option) {

                option.classList.remove(
                    "selected-answer"
                );

            }
        );


    const label =
        radio.closest(
            ".option"
        );


    if (label) {

        label.classList.add(
            "selected-answer"
        );

    }

}


/* ============================================================
   SAVE CURRENT ANSWERS
============================================================ */

function saveCurrentAnswers() {

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

                /*
                 * IMPORTANT:
                 *
                 * Answers are deliberately stored
                 * using question numbers starting at 1.
                 *
                 * This matches scoreQuiz() on the
                 * Apps Script backend.
                 */

                answers[index + 1] =
                    selected.value;

            }

        }
    );


    try {

        localStorage.setItem(
            ANSWERS_KEY,
            JSON.stringify(answers)
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

    let answers;


    try {

        const raw =
            localStorage.getItem(
                ANSWERS_KEY
            );


        if (!raw) {

            return;

        }


        answers =
            JSON.parse(raw);

    }
    catch (error) {

        console.warn(
            "Unable to restore saved answers:",
            error
        );

        return;

    }


    if (
        !answers ||
        typeof answers !==
        "object"
    ) {

        return;

    }


    Object.keys(
        answers
    ).forEach(
        function (
            questionNumber
        ) {

            const index =
                Number(
                    questionNumber
                ) - 1;


            if (
                index < 0 ||
                index >= quizData.length
            ) {

                return;

            }


            const answer =
                String(
                    answers[
                        questionNumber
                    ] || ""
                ).trim();


            if (!answer) {

                return;

            }


            const radio =
                document.querySelector(
                    `input[name="q${index}"][value="${CSS.escape(answer)}"]`
                );


            if (radio) {

                radio.checked =
                    true;


                markSelectedAnswer(
                    radio
                );

            }

        }
    );

}


/* ============================================================
   CLEAR SAVED ANSWERS
============================================================ */

function clearSavedAnswers() {

    try {

        localStorage.removeItem(
            ANSWERS_KEY
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
        quizSubmitting ||
        quizCompleted ||
        quizSubmitted
    ) {

        return;

    }


    if (
        !selectedMemberId ||
        !selectedLesson
    ) {

        alert(
            "Please select your name first."
        );

        return;

    }


    if (
        !Array.isArray(quizData) ||
        quizData.length === 0
    ) {

        alert(
            "No quiz questions are available."
        );

        return;

    }


    const answers = {};


    /*
     * IMPORTANT:
     *
     * The backend expects:
     *
     * {
     *     1: "A",
     *     2: "C",
     *     3: "B"
     * }
     *
     * NOT:
     *
     * [
     *     "A",
     *     "C",
     *     "B"
     * ]
     *
     * The previous zero-based array caused every
     * answer to be scored against the wrong question.
     */

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


        /*
         * ONE-BASED QUESTION NUMBER.
         */

        answers[i + 1] =
            selected.value;

    }


    /*
     * Double-submit protection.
     */

    if (quizSubmitting) {

        return;

    }


    quizSubmitting =
        true;


    const button =
        getElement(
            "submitQuizBtn"
        );


    const oldHTML =
        button
            ? button.innerHTML
            : "";


    if (button) {

        button.disabled =
            true;

        button.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Submitting Quiz...
        `;

    }


    showTransitionLoader(
        "Checking your answers..."
    );


    try {

        const response =
            await fetch(
                API,
                {
                    method:
                        "POST",

                    body:
                        JSON.stringify({

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


        if (
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to submit your quiz."
            );

        }


        quizCompleted =
            true;

        quizSubmitted =
            true;

        reflectionSubmitted =
            true;


        /*
         * Save the complete backend review.
         *
         * The backend is the source of truth for:
         *
         * - selected answer
         * - correct answer
         * - whether it is correct
         * - score
         * - points
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
                    data.score ??
                    0
                )
            );


            localStorage.setItem(
                LAST_POINTS_KEY,
                String(
                    data.pointsEarned ??
                    data.points ??
                    0
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


        clearSavedAnswers();

        clearQuizSession();


        reviewData =
            Array.isArray(
                data.review
            )
                ? data.review
                : [];


        /*
         * Display the result immediately on the
         * quiz page.
         */

        displayQuizResult(
            data
        );


        quizSubmitting =
            false;


    }
    catch (error) {

        console.error(
            "submitQuiz error:",
            error
        );


        alert(
            error.message ||
            "Unable to submit your quiz. Please try again."
        );


        quizSubmitting =
            false;

    }
    finally {

        hideTransitionLoader();


        if (button) {

            button.disabled =
                false;

            button.innerHTML =
                oldHTML;

        }

    }

}


/* ============================================================
   DISPLAY QUIZ RESULT
============================================================ */

function displayQuizResult(
    data
) {

    const scoreText =
        getElement(
            "scoreText"
        );


    const pointsText =
        getElement(
            "pointsText"
        );


    const totalPointsText =
        getElement(
            "totalPointsText"
        );


    const resultSection =
        getElement(
            "resultSection"
        );


    if (scoreText) {

        scoreText.textContent =
            data.score ??
            "0/0";

    }


    if (pointsText) {

        pointsText.textContent =
            `Points earned: ${data.pointsEarned ?? 0}`;

    }


    if (totalPointsText) {

        totalPointsText.textContent =
            `Total points: ${data.totalPoints ?? 0}`;

    }


    hideElement(
        "quizSection"
    );


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
        "completedSection"
    );


    hideElement(
        "reviewSection"
    );


    if (resultSection) {

        resultSection.classList.remove(
            "hidden"
        );


        resultSection.scrollIntoView({
            behavior:
                "smooth",

            block:
                "start"
        });

    }


    const reviewBtn =
        getElement(
            "reviewBtn"
        );


    if (reviewBtn) {

        reviewBtn.style.display =
            reviewData.length
                ? "block"
                : "none";

    }

}


/* ============================================================
   SHOW REVIEW SECTION
============================================================ */

function showReviewSection() {

    if (
        !Array.isArray(
            reviewData
        ) ||
        reviewData.length === 0
    ) {

        /*
         * Try restoring the last review if it
         * exists in localStorage.
         */

        restoreLastReview();

    }


    if (
        !Array.isArray(
            reviewData
        ) ||
        reviewData.length === 0
    ) {

        alert(
            "Review information is not available."
        );

        return;

    }


    hideElement(
        "resultSection"
    );


    hideElement(
        "quizSection"
    );


    const section =
        getElement(
            "reviewSection"
        );


    if (!section) {

        return;

    }


    showElement(
        "reviewSection"
    );


    renderReview();


    section.scrollIntoView({
        behavior:
            "smooth",

        block:
            "start"
    });

}


/* ============================================================
   RESTORE LAST REVIEW
============================================================ */

function restoreLastReview() {

    try {

        const raw =
            localStorage.getItem(
                LAST_REVIEW_KEY
            );


        if (raw) {

            const parsed =
                JSON.parse(raw);


            if (
                Array.isArray(
                    parsed
                )
            ) {

                reviewData =
                    parsed;

            }

        }


        const questionsRaw =
            localStorage.getItem(
                LAST_QUESTIONS_KEY
            );


        if (questionsRaw) {

            const parsedQuestions =
                JSON.parse(
                    questionsRaw
                );


            if (
                Array.isArray(
                    parsedQuestions
                )
            ) {

                reviewQuestions =
                    parsedQuestions;

            }

        }


    }
    catch (error) {

        console.warn(
            "Unable to restore last review:",
            error
        );

    }

}


/* ============================================================
   RENDER REVIEW
============================================================ */

function renderReview() {

    const container =
        getElement(
            "reviewContainer"
        );


    if (!container) {

        return;

    }


    const questions =
        reviewQuestions.length
            ? reviewQuestions
            : quizData;


    container.innerHTML =
        reviewData
            .map(
                function (
                    item,
                    index
                ) {

                    const selected =
                        item.selectedAnswer ||
                        item.answer ||
                        item.userAnswer ||
                        "";


                    const correct =
                        item.correctAnswer ||
                        "";


                    /*
                     * IMPORTANT:
                     *
                     * Prefer the backend's explicit
                     * correct boolean.
                     *
                     * Only fall back to comparing
                     * selected/correct when the backend
                     * does not provide that boolean.
                     */

                    const isCorrect =
                        typeof item.correct ===
                        "boolean"

                            ? item.correct

                            : (
                                String(
                                    selected
                                )
                                    .trim()
                                    .toUpperCase()
                                ===
                                String(
                                    correct
                                )
                                    .trim()
                                    .toUpperCase()
                            );


                    const questionData =
                        questions[index] ||
                        {};


                    const selectedLetter =
                        String(
                            selected
                        )
                            .trim()
                            .toUpperCase();


                    const correctLetter =
                        String(
                            correct
                        )
                            .trim()
                            .toUpperCase();


                    const selectedText =
                        questionData[
                            `option${selectedLetter}`
                        ] ||
                        selected ||
                        "Not answered";


                    const correctText =
                        questionData[
                            `option${correctLetter}`
                        ] ||
                        correct ||
                        "Unavailable";


                    const questionText =
                        questionData.question ||
                        questionData.Question ||
                        questionData.text ||
                        item.question ||
                        item.questionText ||
                        `Question ${index + 1}`;


                    return `
                        <article
                            class="review-question ${isCorrect ? "review-correct" : "review-wrong"}"
                        >

                            <div class="review-question-header">

                                <span class="review-question-number">
                                    Question ${index + 1}
                                </span>

                                <span class="review-status">
                                    ${
                                        isCorrect
                                            ? "Correct"
                                            : "Incorrect"
                                    }
                                </span>

                            </div>


                            <h3 class="review-question-text">
                                ${escapeHTML(questionText)}
                            </h3>


                            <div class="review-answer-row">

                                <strong>
                                    Your answer:
                                </strong>

                                <span>
                                    ${escapeHTML(selectedLetter || "Not answered")}
                                    —
                                    ${escapeHTML(selectedText)}
                                </span>

                            </div>


                            <div class="review-answer-row correct-answer-row">

                                <strong>
                                    Correct answer:
                                </strong>

                                <span>
                                    ${escapeHTML(correctLetter || "Unavailable")}
                                    —
                                    ${escapeHTML(correctText)}
                                </span>

                            </div>

                        </article>
                    `;

                }
            )
            .join("");

}


/* ============================================================
   SAVE / CLEAR QUIZ SESSION
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
   LAST RESULT HELPERS
============================================================ */

function getLastScore() {

    try {

        return (
            localStorage.getItem(
                LAST_SCORE_KEY
            ) ||
            "0"
        );

    }
    catch (error) {

        return "0";

    }

}


function getLastPoints() {

    try {

        return (
            localStorage.getItem(
                LAST_POINTS_KEY
            ) ||
            "0"
        );

    }
    catch (error) {

        return "0";

    }

}


function getLastTotalPoints() {

    try {

        return (
            localStorage.getItem(
                LAST_TOTAL_KEY
            ) ||
            "0"
        );

    }
    catch (error) {

        return "0";

    }

}


/* ============================================================
   END OF PART 3
============================================================ */


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


            await checkCompletionStatusWithLoader(
                "Preparing your quiz..."
            );


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

                await checkCompletionStatusWithLoader(
                    "Preparing your quiz..."
                );

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
                    function () {

                        saveCurrentAnswers();

                        markSelectedAnswer(radio);

                    }
                );

            }
        );

}


/* ============================================================
   MARK SELECTED ANSWER
============================================================ */

function markSelectedAnswer(radio) {

    if (!radio) {
        return;
    }


    /*
     * We deliberately do NOT reveal whether an answer is correct
     * before submission. The public getQuiz endpoint does not send
     * the answer key.
     *
     * What we can safely do here is mark the participant's chosen
     * option as selected. After submission, the backend review is
     * used to mark each answer CORRECT or WRONG.
     */

    const questionCard =
        radio.closest(
            ".question-card"
        );


    if (!questionCard) {
        return;
    }


    questionCard
        .querySelectorAll(
            ".option.selected-answer"
        )
        .forEach(
            function (option) {

                option.classList.remove(
                    "selected-answer"
                );

            }
        );


    const label =
        radio.closest(
            ".option"
        );


    if (label) {

        label.classList.add(
            "selected-answer"
        );

    }

}


/* ============================================================
   SAVE CURRENT ANSWERS
============================================================ */

function saveCurrentAnswers() {

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

                /*
                 * IMPORTANT:
                 *
                 * The backend expects question numbers
                 * beginning from 1.
                 */

                answers[index + 1] =
                    selected.value;

            }

        }
    );


    try {

        localStorage.setItem(
            ANSWERS_KEY,
            JSON.stringify(answers)
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

    let savedAnswers = {};


    try {

        const saved =
            localStorage.getItem(
                ANSWERS_KEY
            );


        if (!saved) {
            return;
        }


        savedAnswers =
            JSON.parse(saved) ||
            {};

    }
    catch (error) {

        console.warn(
            "Unable to restore saved answers:",
            error
        );

        return;

    }


    Object.keys(
        savedAnswers
    ).forEach(
        function (questionNumber) {

            const answer =
                String(
                    savedAnswers[
                        questionNumber
                    ] || ""
                )
                    .trim()
                    .toUpperCase();


            if (!answer) {
                return;
            }


            const index =
                Number(
                    questionNumber
                ) - 1;


            if (
                index < 0 ||
                index >= quizData.length
            ) {

                return;

            }


            let radio = null;


            if (
                typeof CSS !== "undefined" &&
                typeof CSS.escape === "function"
            ) {

                radio =
                    document.querySelector(
                        `input[name="q${index}"][value="${CSS.escape(answer)}"]`
                    );

            }
            else {

                radio =
                    Array.from(
                        document.querySelectorAll(
                            `input[name="q${index}"]`
                        )
                    ).find(
                        function (item) {

                            return (
                                String(
                                    item.value
                                )
                                    .trim()
                                    .toUpperCase() ===
                                answer
                            );

                        }
                    );

            }


            if (radio) {

                radio.checked =
                    true;

                markSelectedAnswer(
                    radio
                );

            }

        }
    );

}


/* ============================================================
   CLEAR SAVED ANSWERS
============================================================ */

function clearSavedAnswers() {

    try {

        localStorage.removeItem(
            ANSWERS_KEY
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
        quizSubmitting ||
        quizSubmitted ||
        quizCompleted
    ) {

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


    const answers = {};


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


            if (questionCards[i]) {

                questionCards[i].scrollIntoView({
                    behavior:
                        "smooth",

                    block:
                        "center"
                });

            }


            return;

        }


        /*
         * IMPORTANT:
         *
         * The backend scoreQuiz() expects
         * question numbers beginning at 1.
         */

        answers[i + 1] =
            selected.value;

    }


    if (quizSubmitting) {
        return;
    }


    quizSubmitting =
        true;


    const button =
        getElement(
            "submitQuizBtn"
        );


    const message =
        getElement(
            "quizMessage"
        );


    const oldButtonHTML =
        button
            ? button.innerHTML
            : "";


    if (button) {

        button.disabled =
            true;

        button.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Submitting Quiz...
        `;

    }


    if (message) {

        message.className =
            "quiz-message show";

        message.textContent =
            "Submitting your quiz...";

    }


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


        if (
            !data.success
        ) {

            if (message) {

                message.className =
                    "quiz-message show error";

                message.textContent =
                    data.message ||
                    "Unable to submit your quiz.";

            }


            if (button) {

                button.disabled =
                    false;

                button.innerHTML =
                    oldButtonHTML;

            }


            quizSubmitting =
                false;

            return;

        }


        quizCompleted =
            true;

        quizSubmitted =
            true;

        reflectionSubmitted =
            true;


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
                    data.score ??
                    0
                )
            );


            localStorage.setItem(
                LAST_POINTS_KEY,

                String(
                    data.pointsEarned ??
                    data.points ??
                    0
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


        clearSavedAnswers();

        clearQuizSession();


        reviewData =
            Array.isArray(
                data.review
            )
                ? data.review
                : [];


        displayQuizResult(
            data
        );


        quizSubmitting =
            false;

    }
    catch (error) {

        console.error(
            "submitQuiz error:",
            error
        );


        if (message) {

            message.className =
                "quiz-message show error";

            message.textContent =
                "Unable to submit your quiz. Please check your connection and try again.";

        }


        if (button) {

            button.disabled =
                false;

            button.innerHTML =
                oldButtonHTML;

        }


        quizSubmitting =
            false;

    }

}


/* ============================================================
   DISPLAY QUIZ RESULT
============================================================ */

function displayQuizResult(data) {

    const scoreText =
        getElement(
            "scoreText"
        );


    const pointsText =
        getElement(
            "pointsText"
        );


    const totalPointsText =
        getElement(
            "totalPointsText"
        );


    const resultSection =
        getElement(
            "resultSection"
        );


    if (scoreText) {

        scoreText.textContent =
            data.score ??
            "0/0";

    }


    if (pointsText) {

        pointsText.textContent =
            `Points earned: ${data.pointsEarned ?? 0}`;

    }


    if (totalPointsText) {

        totalPointsText.textContent =
            `Total points: ${data.totalPoints ?? 0}`;

    }


    hideElement(
        "quizSection"
    );


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
        "completedSection"
    );


    hideElement(
        "reviewSection"
    );


    if (resultSection) {

        resultSection.classList.remove(
            "hidden"
        );


        resultSection.scrollIntoView({

            behavior:
                "smooth",

            block:
                "start"

        });

    }


    const reviewBtn =
        getElement(
            "reviewBtn"
        );


    if (reviewBtn) {

        reviewBtn.style.display =
            reviewData.length
                ? "block"
                : "none";

    }

}


/* ============================================================
   SHOW REVIEW
============================================================ */

function showReview() {

    if (!reviewData.length) {

        alert(
            "There is no quiz review available."
        );

        return;

    }


    const resultSection =
        getElement(
            "resultSection"
        );


    const reviewSection =
        getElement(
            "reviewSection"
        );


    const reviewContainer =
        getElement(
            "reviewContainer"
        );


    if (!reviewSection ||
        !reviewContainer) {

        return;

    }


    renderReview();


    if (resultSection) {

        resultSection.classList.add(
            "hidden"
        );

    }


    reviewSection.classList.remove(
        "hidden"
    );


    reviewSection.scrollIntoView({

        behavior:
            "smooth",

        block:
            "start"

    });


    if (typeof AOS !== "undefined") {

        AOS.refresh();

    }

}


/* ============================================================
   RENDER REVIEW
============================================================ */

function renderReview() {

    const container =
        getElement(
            "reviewContainer"
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    if (!reviewData.length) {

        container.innerHTML = `
            <div class="review-empty">
                No review data is available.
            </div>
        `;

        return;

    }


    reviewData.forEach(
        function (
            item,
            index
        ) {

            const selected =
                item.selectedAnswer ||
                item.answer ||
                item.userAnswer ||
                "";


            const correct =
                item.correctAnswer ||
                "";


            /*
             * Prefer the backend's explicit boolean
             * correctness value when available.
             *
             * This prevents the frontend from
             * incorrectly judging answers when the
             * backend has already determined the result.
             */

            const isCorrect =
                typeof item.correct === "boolean"

                    ? item.correct

                    : (
                        String(
                            selected
                        )
                            .trim()
                            .toUpperCase() ===

                        String(
                            correct
                        )
                            .trim()
                            .toUpperCase()
                    );


            const questionData =
                quizData[index] ||
                {};


            const selectedText =
                questionData[
                    `option${String(selected).toUpperCase()}`
                ] ||
                selected ||
                "Not answered";


            const correctText =
                questionData[
                    `option${String(correct).toUpperCase()}`
                ] ||
                correct ||
                "Unavailable";


            const statusClass =
                isCorrect
                    ? "correct"
                    : "wrong";


            const statusText =
                isCorrect
                    ? "CORRECT"
                    : "WRONG";


            const icon =
                isCorrect
                    ? "fa-circle-check"
                    : "fa-circle-xmark";


            container.innerHTML += `
                <div class="review-card ${statusClass}">

                    <div class="review-card-header">

                        <span class="review-question-number">
                            Question ${index + 1}
                        </span>

                        <span class="review-status">

                            <i class="fa-solid ${icon}"></i>

                            ${statusText}

                        </span>

                    </div>


                    <div class="review-question">

                        ${escapeHTML(
                            questionData.question ||
                            item.question ||
                            `Question ${index + 1}`
                        )}

                    </div>


                    <div class="review-answer-row">

                        <span class="review-label">
                            Your answer
                        </span>

                        <span class="review-answer">

                            ${escapeHTML(
                                selected
                                    ? `${String(selected).toUpperCase()}. ${selectedText}`
                                    : "Not answered"
                            )}

                        </span>

                    </div>


                    <div class="review-answer-row correct-answer-row">

                        <span class="review-label">
                            Correct answer
                        </span>

                        <span class="review-answer">

                            ${escapeHTML(
                                correct
                                    ? `${String(correct).toUpperCase()}. ${correctText}`
                                    : "Unavailable"
                            )}

                        </span>

                    </div>

                </div>
            `;

        }
    );

}


/* ============================================================
   HIDE REVIEW
============================================================ */

function hideReview() {

    const reviewSection =
        getElement(
            "reviewSection"
        );


    const resultSection =
        getElement(
            "resultSection"
        );


    if (reviewSection) {

        reviewSection.classList.add(
            "hidden"
        );

    }


    if (resultSection) {

        resultSection.classList.remove(
            "hidden"
        );


        resultSection.scrollIntoView({

            behavior:
                "smooth",

            block:
                "start"

        });

    }

}


/* ============================================================
   RESTORE LAST RESULT
============================================================ */

function restoreLastResult() {

    try {

        const savedReview =
            localStorage.getItem(
                LAST_REVIEW_KEY
            );


        const savedQuestions =
            localStorage.getItem(
                LAST_QUESTIONS_KEY
            );


        const savedScore =
            localStorage.getItem(
                LAST_SCORE_KEY
            );


        const savedPoints =
            localStorage.getItem(
                LAST_POINTS_KEY
            );


        const savedTotal =
            localStorage.getItem(
                LAST_TOTAL_KEY
            );


        const savedLesson =
            localStorage.getItem(
                LAST_RESULT_LESSON_KEY
            );


        if (!savedReview) {

            return false;

        }


        const parsedReview =
            JSON.parse(
                savedReview
            );


        if (
            !Array.isArray(
                parsedReview
            ) ||
            !parsedReview.length
        ) {

            return false;

        }


        reviewData =
            parsedReview;


        if (savedQuestions) {

            const parsedQuestions =
                JSON.parse(
                    savedQuestions
                );


            if (
                Array.isArray(
                    parsedQuestions
                )
            ) {

                quizData =
                    parsedQuestions;

            }

        }


        const data = {

            success:
                true,

            score:
                savedScore ||
                "0/0",

            pointsEarned:
                savedPoints ||
                "0",

            totalPoints:
                savedTotal ||
                "0"

        };


        if (savedLesson) {

            selectedLesson =
                savedLesson;

        }


        quizCompleted =
            true;


        quizSubmitted =
            true;


        reflectionSubmitted =
            true;


        displayQuizResult(
            data
        );


        return true;

    }
    catch (error) {

        console.warn(
            "Unable to restore last result:",
            error
        );


        return false;

    }

}


/* ============================================================
   CLEAR LAST RESULT
============================================================ */

function clearLastResult() {

    try {

        localStorage.removeItem(
            LAST_REVIEW_KEY
        );


        localStorage.removeItem(
            LAST_QUESTIONS_KEY
        );


        localStorage.removeItem(
            LAST_SCORE_KEY
        );


        localStorage.removeItem(
            LAST_POINTS_KEY
        );


        localStorage.removeItem(
            LAST_TOTAL_KEY
        );


        localStorage.removeItem(
            LAST_RESULT_LESSON_KEY
        );

    }
    catch (error) {

        console.warn(
            "Unable to clear last result:",
            error
        );

    }

}


/* ============================================================
   SESSION STORAGE
============================================================ */

function saveQuizSession() {

    try {

        const session = {

            selectedMemberId:
                selectedMemberId,

            selectedMemberName:
                selectedMemberName,

            selectedLesson:
                selectedLesson,

            reflectionSubmitted:
                reflectionSubmitted,

            quizLoaded:
                quizLoaded,

            quizCompleted:
                quizCompleted,

            quizSubmitted:
                quizSubmitted,

            timestamp:
                Date.now()

        };


        sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify(
                session
            )
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

function restoreQuizSession() {

    try {

        const saved =
            sessionStorage.getItem(
                SESSION_KEY
            );


        if (!saved) {

            return false;

        }


        const session =
            JSON.parse(
                saved
            );


        if (!session) {

            return false;

        }


        /*
         * Sessions are intentionally short-lived.
         *
         * If the saved session is too old, discard it.
         */

        if (
            session.timestamp &&
            (
                Date.now() -
                Number(
                    session.timestamp
                )
            ) >
            SESSION_MAX_AGE
        ) {

            sessionStorage.removeItem(
                SESSION_KEY
            );

            return false;

        }


        selectedMemberId =
            String(
                session.selectedMemberId ||
                ""
            );


        selectedMemberName =
            String(
                session.selectedMemberName ||
                ""
            );


        selectedLesson =
            String(
                session.selectedLesson ||
                ""
            );


        reflectionSubmitted =
            Boolean(
                session.reflectionSubmitted
            );


        quizLoaded =
            Boolean(
                session.quizLoaded
            );


        quizCompleted =
            Boolean(
                session.quizCompleted
            );


        quizSubmitted =
            Boolean(
                session.quizSubmitted
            );


        return Boolean(
            selectedMemberId &&
            selectedLesson
        );

    }
    catch (error) {

        console.warn(
            "Unable to restore quiz session:",
            error
        );


        return false;

    }

}


/* ============================================================
   RESET QUIZ STATE
============================================================ */

function resetQuizState() {

    selectedMemberId =
        "";

    selectedMemberName =
        "";

    reflectionSubmitted =
        false;

    quizLoaded =
        false;

    quizSubmitted =
        false;

    quizSubmitting =
        false;

    quizCompleted =
        false;

    completionCheckInProgress =
        false;


    clearQuizSession();

    clearSavedAnswers();

}


/* ============================================================
   PAGE RESET
============================================================ */

function resetQuizPage() {

    resetQuizState();


    hideElement(
        "quizSection"
    );


    hideElement(
        "lockedParticipantSection"
    );


    hideElement(
        "reflectionSection"
    );


    hideElement(
        "completedSection"
    );


    hideElement(
        "resultSection"
    );


    hideElement(
        "reviewSection"
    );


    showElement(
        "participantSection"
    );


    const memberSelect =
        getElement(
            "memberSelect"
        );


    if (memberSelect) {

        memberSelect.value =
            "";

    }


    const newName =
        getElement(
            "newName"
        );


    if (newName) {

        newName.value =
            "";

    }


    clearReflectionFields();


    window.scrollTo({

        top:
            0,

        behavior:
            "smooth"

    });

}


/* ============================================================
   COUNTDOWN
============================================================ */

function startCountdown() {

    stopCountdown();


    const countdown =
        getElement(
            "countdown"
        );


    if (!countdown) {

        return;

    }


    function update() {

        if (!quizCloseTime) {

            countdown.textContent =
                "";

            return;

        }


        const remaining =
            quizCloseTime -
            Date.now();


        if (
            remaining <= 0
        ) {

            countdown.textContent =
                "Quiz closed";


            stopCountdown();


            disableQuizForClosing();


            return;

        }


        const totalSeconds =
            Math.floor(
                remaining /
                1000
            );


        const days =
            Math.floor(
                totalSeconds /
                86400
            );


        const hours =
            Math.floor(
                (
                    totalSeconds %
                    86400
                ) /
                3600
            );


        const minutes =
            Math.floor(
                (
                    totalSeconds %
                    3600
                ) /
                60
            );


        const seconds =
            totalSeconds %
            60;


        let text =
            "";


        if (days > 0) {

            text +=
                `${days}d `;

        }


        text +=
            `${String(hours).padStart(2, "0")}:`;

        text +=
            `${String(minutes).padStart(2, "0")}:`;

        text +=
            `${String(seconds).padStart(2, "0")}`;


        countdown.textContent =
            text;

    }


    update();


    countdownInterval =
        setInterval(
            update,
            1000
        );

}


/* ============================================================
   STOP COUNTDOWN
============================================================ */

function stopCountdown() {

    if (
        countdownInterval
    ) {

        clearInterval(
            countdownInterval
        );

        countdownInterval =
            null;

    }

}


/* ============================================================
   DISABLE QUIZ WHEN CLOSED
============================================================ */

function disableQuizForClosing() {

    const submitBtn =
        getElement(
            "submitQuizBtn"
        );


    if (submitBtn) {

        submitBtn.disabled =
            true;

        submitBtn.innerHTML = `
            <span>
                Quiz Closed
            </span>

            <i class="fa-solid fa-lock"></i>
        `;

    }


    document
        .querySelectorAll(
            '#questions input[type="radio"]'
        )
        .forEach(
            function (radio) {

                radio.disabled =
                    true;

            }
        );


    const message =
        getElement(
            "quizMessage"
        );


    if (message) {

        message.className =
            "quiz-message show error";

        message.textContent =
            "The quiz has closed.";

    }

}


/* ============================================================
   GENERIC ELEMENT HELPERS
============================================================ */

function getElement(id) {

    return document.getElementById(
        id
    );

}


function showElement(id) {

    const element =
        getElement(id);


    if (!element) {
        return;
    }


    element.classList.remove(
        "hidden"
    );

}


function hideElement(id) {

    const element =
        getElement(id);


    if (!element) {
        return;
    }


    element.classList.add(
        "hidden"
    );

}


/* ============================================================
   ESCAPE HTML
============================================================ */

function escapeHTML(value) {

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


/* ============================================================
   SAFE JSON PARSER
============================================================ */

function safeJSONParse(
    value,
    fallback
) {

    try {

        return JSON.parse(
            value
        );

    }
    catch (error) {

        console.warn(
            "JSON parse failed:",
            error
        );


        return fallback;

    }

}


/* ============================================================
   INITIALIZATION
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        console.log(
            "SLC Quiz initializing..."
        );


        /*
         * Set up all UI listeners first.
         */

        setupReflectionListeners();


        /*
         * Quiz submit button.
         */

        const submitQuizBtn =
            getElement(
                "submitQuizBtn"
            );


        if (submitQuizBtn) {

            submitQuizBtn.addEventListener(
                "click",
                submitQuiz
            );

        }


        /*
         * Add-name button.
         */

        const addNameBtn =
            getElement(
                "addNameBtn"
            );


        if (addNameBtn) {

            addNameBtn.addEventListener(
                "click",
                addNewMember
            );

        }


        /*
         * Participant continue button.
         */

        const continueToReflectionBtn =
            getElement(
                "continueToReflectionBtn"
            );


        if (
            continueToReflectionBtn
        ) {

            continueToReflectionBtn.addEventListener(
                "click",
                continueWithParticipant
            );

        }


        /*
         * Review button.
         */

        const reviewBtn =
            getElement(
                "reviewBtn"
            );


        if (reviewBtn) {

            reviewBtn.addEventListener(
                "click",
                showReview
            );

        }


        /*
         * Back-from-review button.
         */

        const backFromReviewBtn =
            getElement(
                "backFromReviewBtn"
            );


        if (
            backFromReviewBtn
        ) {

            backFromReviewBtn.addEventListener(
                "click",
                hideReview
            );

        }


        /*
         * Reset/start-over button.
         */

        const resetBtn =
            getElement(
                "resetQuizBtn"
            );


        if (resetBtn) {

            resetBtn.addEventListener(
                "click",
                resetQuizPage
            );

        }


        /*
         * Participant selection.
         */

        const memberSelect =
            getElement(
                "memberSelect"
            );


        if (memberSelect) {

            memberSelect.addEventListener(
                "change",
                handleMemberSelection
            );

        }


        /*
         * Load quiz data and members.
         */

        await Promise.all([
            loadQuiz(),
            loadMembers()
        ]);


        /*
         * Restore any valid previous session.
         */

        const restored =
            restoreQuizSession();


        if (restored) {

            console.log(
                "Previous quiz session restored."
            );


            /*
             * The server remains the final authority.
             * Re-check completion before showing
             * the participant's previous state.
             */

            await checkCompletionStatusWithLoader(
                "Restoring your quiz..."
            );

        }
        else {

            /*
             * If there is no active session,
             * show the participant section.
             */

            showElement(
                "participantSection"
            );

        }


        /*
         * Restore a previously submitted result
         * only when there is no active session.
         */

        if (
            !restored &&
            !quizCompleted
        ) {

            restoreLastResult();

        }


        /*
         * Start the countdown after quiz data
         * has been loaded.
         */

        if (
            quizOpenTime ||
            quizCloseTime
        ) {

            startCountdown();

        }


        /*
         * Refresh AOS after dynamic content
         * has been inserted.
         */

        if (
            typeof AOS !== "undefined"
        ) {

            AOS.refresh();

        }


        console.log(
            "SLC Quiz initialized."
        );

    }
);
