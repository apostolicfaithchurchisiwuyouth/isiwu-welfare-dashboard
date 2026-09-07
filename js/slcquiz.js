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
   Check CURRENT LESSON Completion
        ↓
   ┌─────────────────────────────────────┐
   │                                     │
   │ Already completed CURRENT lesson    │
   │        ↓                            │
   │ Show completed state                │
   │                                     │
   │ Not completed CURRENT lesson        │
   │        ↓                            │
   │ Reflection                          │
   │        ↓                            │
   │ Quiz                                │
   │        ↓                            │
   │ Submit                              │
   │        ↓                            │
   │ Results                             │
   └─────────────────────────────────────┘

   IMPORTANT:

   - Quiz Settings lesson number identifies ONLY the
     currently active lesson.
   - Previous lessons do NOT block the current lesson.
   - Participant cannot be changed after selection.
   - Reflection requires all 3 questions.
   - Minimum 100 meaningful characters.
   - Backend remains the final authority.
   - A participant is considered completed ONLY when
     Quiz Attempts contains an attempt for THIS lesson.
   - Completed lessons cannot be repeated.
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

const REFLECTION_MIN_CHARACTERS =
    100;

const SESSION_KEY =
    "afc_isiu_slc_quiz_session_v1";

const ANSWERS_KEY =
    "afc_isiu_slc_quiz_answers_v1";

const LAST_REVIEW_KEY =
    "afc_isiu_slc_last_review_v1";

const LAST_QUESTIONS_KEY =
    "afc_isiu_slc_last_questions_v1";

const LAST_SCORE_KEY =
    "afc_isiu_slc_last_score_v1";

const LAST_POINTS_KEY =
    "afc_isiu_slc_last_points_v1";

const LAST_TOTAL_KEY =
    "afc_isiu_slc_last_total_v1";


/* ============================================================
   STATE
============================================================ */

let quizData = [];

let selectedLesson = "";

let quizCloseTime = null;

let quizOpenTime = null;

let countdownInterval = null;

let selectedMemberId = "";

let selectedMemberName = "";

let reflectionSubmitted = false;

let quizLoaded = false;

let quizSubmitted = false;

let addMemberSubmitting = false;

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

    const loader =
        document.createElement("div");

    loader.id =
        "slcTransitionLoader";

    loader.setAttribute(
        "aria-live",
        "polite"
    );

    loader.setAttribute(
        "aria-busy",
        "true"
    );

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
                box-shadow: 0 20px 60px rgba(0,0,0,0.25);
            "
        >

            <div
                style="
                    width: 52px;
                    height: 52px;
                    margin: 0 auto 18px;
                    border: 4px solid #eee7f5;
                    border-top-color: #4a0754;
                    border-radius: 50%;
                    animation: slcLoaderSpin 0.8s linear infinite;
                "
            ></div>

            <div
                style="
                    font-size: 1rem;
                    font-weight: 700;
                    color: #2d1735;
                    margin-bottom: 6px;
                "
            >
                Please wait
            </div>

            <div
                id="slcTransitionLoaderText"
                style="
                    font-size: 0.88rem;
                    color: #75677b;
                "
            >
                Loading...
            </div>

        </div>
    `;

    if (
        !document.getElementById(
            "slcTransitionLoaderStyle"
        )
    ) {

        const style =
            document.createElement("style");

        style.id =
            "slcTransitionLoaderStyle";

        style.textContent = `
            @keyframes slcLoaderSpin {
                to {
                    transform: rotate(360deg);
                }
            }
        `;

        document.head.appendChild(style);

    }

    document.body.appendChild(loader);

    slcTransitionLoader =
        loader;

    return loader;
}


function showTransitionLoader(
    message
) {

    const loader =
        createTransitionLoader();

    const text =
        document.getElementById(
            "slcTransitionLoaderText"
        );

    if (text) {

        text.textContent =
            message ||
            "Loading...";

    }

    loader.style.display =
        "flex";
}


function hideTransitionLoader() {

    if (
        !slcTransitionLoader
    ) {

        return;

    }

    slcTransitionLoader.style.display =
        "none";
}


/* ============================================================
   DOM READY
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        if (
            typeof AOS !==
            "undefined"
        ) {

            AOS.init({
                duration: 650,
                once: true
            });

        }


        setupParticipantListeners();

        setupReflectionListeners();

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
   FORMAT DATE
============================================================ */

function formatDate(
    value
) {

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
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );

}


/* ============================================================
   API REQUEST
============================================================ */

async function apiRequest(
    payload
) {

    const response =
        await fetch(
            API,
            {
                method: "POST",

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );


    if (!response.ok) {

        throw new Error(
            `HTTP ${response.status}`
        );

    }


    return await response.json();

}


/* ============================================================
   LOAD QUIZ
============================================================ */

async function loadQuiz() {

    const status =
        getElement(
            "quizStatus"
        );

    const questionsContainer =
        getElement(
            "questionsContainer"
        );


    try {

        if (status) {

            status.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Loading quiz...
            `;

        }


        const data =
            await apiRequest({

                action:
                    "getQuiz"

            });


        console.log(
            "Quiz response:",
            data
        );


        if (
            !data ||
            !data.success
        ) {

            quizLoaded =
                false;


            if (status) {

                status.textContent =
                    data?.message ||
                    "No active quiz is available.";

            }

            return;

        }


        quizData =
            Array.isArray(
                data.questions
            )
                ? data.questions
                : [];


        selectedLesson =
            String(
                data.lessonNo ??
                data.lesson ??
                ""
            );


        quizOpenTime =
            data.openTime ||
            null;

        quizCloseTime =
            data.closeTime ||
            null;


        quizLoaded =
            true;


        renderQuiz();

        startCountdown();


    }
    catch (error) {

        console.error(
            "loadQuiz error:",
            error
        );


        quizLoaded =
            false;


        if (status) {

            status.textContent =
                "Unable to load the quiz. Please refresh and try again.";

        }

    }

}


/* ============================================================
   RENDER QUIZ
============================================================ */

function renderQuiz() {

    const container =
        getElement(
            "questionsContainer"
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
            <p>
                No questions available.
            </p>
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

                    const optionText =
                        question[
                            `option${letter}`
                        ];


                    if (
                        !optionText
                    ) {

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
                                ${escapeHTML(optionText)}
                            </span>

                        </label>
                    `;

                }
            );


            container.innerHTML += `
                <div class="question-card">

                    <div class="question-number">
                        Question ${index + 1}
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


    restoreSavedAnswers();

}


/* ============================================================
   COUNTDOWN
============================================================ */

function startCountdown() {

    if (
        countdownInterval
    ) {

        clearInterval(
            countdownInterval
        );

    }


    updateCountdown();


    countdownInterval =
        setInterval(
            updateCountdown,
            1000
        );

}


function updateCountdown() {

    const countdown =
        getElement(
            "countdown"
        );


    if (
        !countdown
    ) {

        return;

    }


    if (
        !quizCloseTime
    ) {

        countdown.textContent =
            "";

        return;

    }


    const close =
        new Date(
            quizCloseTime
        ).getTime();


    const now =
        Date.now();


    const difference =
        close - now;


    if (
        difference <= 0
    ) {

        countdown.textContent =
            "Quiz closed";

        if (
            countdownInterval
        ) {

            clearInterval(
                countdownInterval
            );

        }

        return;

    }


    const totalSeconds =
        Math.floor(
            difference / 1000
        );


    const days =
        Math.floor(
            totalSeconds / 86400
        );

    const hours =
        Math.floor(
            (totalSeconds % 86400) /
            3600
        );

    const minutes =
        Math.floor(
            (totalSeconds % 3600) /
            60
        );

    const seconds =
        totalSeconds % 60;


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
     * IMPORTANT:
     *
     * The HTML already contains
     * onclick="addNewMember()".
     *
     * We intentionally DO NOT add
     * another click listener here.
     *
     * The addMemberSubmitting lock
     * inside addNewMember() also protects
     * against accidental duplicate calls.
     */

}


/* ============================================================
   ADD NEW MEMBER
============================================================ */

async function addNewMember() {

    /*
     * DUPLICATE-SUBMISSION PROTECTION
     *
     * This is especially important because
     * the HTML button may call addNewMember()
     * directly.
     */

    if (
        addMemberSubmitting ||
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


    /*
     * LOCK IMMEDIATELY BEFORE THE REQUEST.
     *
     * A second click while fetch() is waiting
     * will now be ignored.
     */

    addMemberSubmitting =
        true;


    /*
     * EXISTING LOADER PRESERVED
     */

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

                    body:
                        JSON.stringify({

                            action:
                                "addMember",

                            name:
                                name

                        })

                }
            );


        if (
            !response.ok
        ) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Add member response:",
            data
        );


        if (
            !data.success
        ) {

            alert(
                data.message ||
                "Unable to add your name."
            );

            return;

        }


        /*
         * Reload the member list so the new
         * participant appears immediately.
         */

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


        /*
         * SUCCESS MESSAGE IS NOW SHOWN
         * ONLY ONCE.
         */

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

        /*
         * ALWAYS RELEASE THE LOCK.
         */

        addMemberSubmitting =
            false;


        /*
         * RESTORE THE ORIGINAL BUTTON.
         */

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


    const continueBtn =
        getElement(
            "continueToReflectionBtn"
        );


    if (
        !select ||
        !select.value
    ) {

        alert(
            "Please select your name."
        );

        return;

    }


    selectedMemberId =
        String(
            select.value
        );


    const selectedOption =
        select.options[
            select.selectedIndex
        ];


    selectedMemberName =
        selectedOption
            ? selectedOption.textContent.trim()
            : "";


    if (continueBtn) {

        continueBtn.disabled =
            true;

        continueBtn.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Loading...
        `;

    }


    saveQuizSession();


    showTransitionLoader(
        "Checking your quiz status..."
    );


    try {

        await checkCompletionStatus();

    }
    catch (error) {

        console.error(
            "lockSelectedParticipant error:",
            error
        );

    }
    finally {

        hideTransitionLoader();

        if (continueBtn) {

            continueBtn.disabled =
                false;

            continueBtn.innerHTML = `
                Continue
                <i class="fa-solid fa-arrow-right"></i>
            `;

        }

    }

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


    try {

        const data =
            await apiRequest({

                action:
                    "getMembers"

            });


        console.log(
            "Members response:",
            data
        );


        if (
            !data ||
            !data.success
        ) {

            return;

        }


        const members =
            Array.isArray(
                data.members
            )
                ? data.members
                : [];


        select.innerHTML = `
            <option value="">
                Select your name
            </option>
        `;


        members.forEach(
            function (member) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    String(
                        member.memberId ??
                        member.id ??
                        ""
                    );


                option.textContent =
                    String(
                        member.name ??
                        member.memberName ??
                        ""
                    );


                select.appendChild(
                    option
                );

            }
        );


        if (
            selectedMemberId
        ) {

            select.value =
                selectedMemberId;

        }

    }
    catch (error) {

        console.error(
            "loadMembers error:",
            error
        );

    }

}


/* ============================================================
   COMPLETION STATUS
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

        const data =
            await apiRequest({

                action:
                    "checkCompletion",

                memberId:
                    selectedMemberId,

                lessonNo:
                    selectedLesson

            });


        console.log(
            "Completion response:",
            data
        );


        if (
            data.completed ||
            data.status ===
                "already_completed" ||
            data.status ===
                "already_attempted"
        ) {

            quizCompleted =
                true;

            quizSubmitted =
                true;


            reflectionSubmitted =
                true;


            clearSavedAnswers();

            clearQuizSession();


            showCompletedState();

            return;

        }


        if (
            data.reflectionSubmitted ||
            data.reflectionCompleted ||
            data.status ===
                "reflection_exists"
        ) {

            reflectionSubmitted =
                true;

            saveQuizSession();

            unlockQuiz();

            return;

        }


        reflectionSubmitted =
            false;


        saveQuizSession();

        showReflection();


    }
    catch (error) {

        console.error(
            "checkCompletionStatus error:",
            error
        );

    }
    finally {

        completionCheckInProgress =
            false;

    }

}


/* ============================================================
   SHOW REFLECTION
============================================================ */

function showReflection() {

    hideElement(
        "participantCard"
    );


    showElement(
        "reflectionCard"
    );


    hideElement(
        "quizBox"
    );


    const reflectionMessage =
        getElement(
            "reflectionMessage"
        );


    if (reflectionMessage) {

        reflectionMessage.className =
            "reflection-message";

        reflectionMessage.textContent =
            "";

    }


    restoreReflectionButton();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* ============================================================
   UNLOCK QUIZ
============================================================ */

function unlockQuiz() {

    hideElement(
        "participantCard"
    );


    hideElement(
        "reflectionCard"
    );


    showElement(
        "quizBox"
    );


    quizSubmitted =
        false;


    showTransitionLoader(
        "Preparing your quiz..."
    );


    setTimeout(
        function () {

            hideTransitionLoader();

            restoreQuizSubmitButton();

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        },
        500
    );

}


/* ============================================================
   COMPLETED STATE
============================================================ */

function showCompletedState() {

    hideElement(
        "participantCard"
    );


    hideElement(
        "reflectionCard"
    );


    hideElement(
        "quizBox"
    );


    const completedCard =
        getElement(
            "completedCard"
        );


    if (completedCard) {

        completedCard.classList.remove(
            "hidden"
        );

        completedCard.style.display =
            "";

    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* ============================================================
   REFLECTION LISTENERS
============================================================ */

function setupReflectionListeners() {

    const form =
        getElement(
            "reflectionForm"
        );


    const submitBtn =
        getElement(
            "submitReflectionBtn"
        );


    if (form) {

        form.addEventListener(
            "input",
            function () {

                restoreReflectionButton();

            }
        );

    }


    if (submitBtn) {

        submitBtn.addEventListener(
            "click",
            submitReflection
        );

    }

}


/* ============================================================
   REFLECTION REQUIREMENTS
============================================================ */

function reflectionRequirementsMet() {

    const question1 =
        getElement(
            "reflection1"
        );


    const question2 =
        getElement(
            "reflection2"
        );


    const question3 =
        getElement(
            "reflection3"
        );


    if (
        !question1 ||
        !question2 ||
        !question3
    ) {

        return false;

    }


    const values = [
        question1.value,
        question2.value,
        question3.value
    ];


    const allAnswered =
        values.every(
            function (value) {

                return (
                    String(value || "")
                        .trim()
                        .length > 0
                );

            }
        );


    if (!allAnswered) {

        return false;

    }


    const totalCharacters =
        values
            .join(" ")
            .trim()
            .length;


    return (
        totalCharacters >=
        REFLECTION_MIN_CHARACTERS
    );

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
   SUBMIT REFLECTION
============================================================ */

async function submitReflection() {

    if (
        reflectionSubmitted ||
        quizCompleted
    ) {

        return;

    }


    const question1 =
        getElement(
            "reflection1"
        );


    const question2 =
        getElement(
            "reflection2"
        );


    const question3 =
        getElement(
            "reflection3"
        );


    const button =
        getElement(
            "submitReflectionBtn"
        );


    const message =
        getElement(
            "reflectionMessage"
        );


    if (
        !question1 ||
        !question2 ||
        !question3 ||
        !button
    ) {

        return;

    }


    const answers = [
        question1.value.trim(),
        question2.value.trim(),
        question3.value.trim()
    ];


    if (
        answers.some(
            function (value) {

                return !value;

            }
        )
    ) {

        alert(
            "Please answer all three reflection questions."
        );

        return;

    }


    const totalCharacters =
        answers
            .join(" ")
            .trim()
            .length;


    if (
        totalCharacters <
        REFLECTION_MIN_CHARACTERS
    ) {

        alert(
            `Your reflection must contain at least ${REFLECTION_MIN_CHARACTERS} meaningful characters.`
        );

        return;

    }


    const oldHTML =
        button.innerHTML;


    /*
     * EXISTING REFLECTION LOADER
     * PRESERVED
     */

    button.disabled =
        true;


    button.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Saving Reflection...
    `;


    try {

        const data =
            await apiRequest({

                action:
                    "submitReflection",

                memberId:
                    selectedMemberId,

                lessonNo:
                    selectedLesson,

                reflection1:
                    answers[0],

                reflection2:
                    answers[1],

                reflection3:
                    answers[2]

            });


        console.log(
            "Submit reflection response:",
            data
        );


        /*
         * Another tab/device may have completed
         * the reflection already.
         *
         * That does NOT mean the quiz was completed.
         *
         * Therefore check the lesson again.
         */

        if (
            data.status ===
                "already_completed" ||
            data.status ===
                "already_submitted" ||
            data.status ===
                "reflection_exists"
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


        setTimeout(
            function () {

                unlockQuiz();

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
   SAVED QUIZ ANSWERS
============================================================ */

function getAnswersStorageKey() {

    if (
        !selectedLesson ||
        !selectedMemberId
    ) {

        return "";

    }


    return (
        `${ANSWERS_KEY}_${selectedLesson}_${selectedMemberId}`
    );

}


/* ============================================================
   SAVE CURRENT ANSWERS
============================================================ */

function saveCurrentAnswers() {

    const key =
        getAnswersStorageKey();


    if (
        !key ||
        quizCompleted
    ) {

        return;

    }


    const answers =
        {};


    for (
        let i = 0;
        i < quizData.length;
        i++
    ) {

        const selected =
            document.querySelector(
                `input[name="q${i}"]:checked`
            );


        if (selected) {

            answers[i] =
                selected.value;

        }

    }


    try {

        localStorage.setItem(

            key,

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

    const key =
        getAnswersStorageKey();


    if (!key) {

        return;

    }


    try {

        const raw =
            localStorage.getItem(
                key
            );


        if (!raw) {

            return;

        }


        const saved =
            JSON.parse(
                raw
            );


        if (
            !saved ||
            String(
                saved.lessonNo
            ) !==
                String(
                    selectedLesson
                ) ||
            String(
                saved.memberId
            ) !==
                String(
                    selectedMemberId
                ) ||
            !saved.answers
        ) {

            return;

        }


        const answers =
            saved.answers;


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

    const key =
        getAnswersStorageKey();


    if (!key) {

        return;

    }


    try {

        localStorage.removeItem(
            key
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
     * The HTML already contains
     * onclick="submitQuiz()".
     *
     * We use the existing HTML action
     * and do not attach another listener.
     *
     * quizSubmitted below provides a second
     * layer of protection.
     */

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
        <span>
            Submit Quiz
        </span>

        <i class="fa-solid fa-arrow-right"></i>
    `;

}


/* ============================================================
   SUBMIT QUIZ
============================================================ */

async function submitQuiz() {

    /*
     * DUPLICATE-SUBMISSION PROTECTION
     *
     * This protects against:
     *
     * - double clicks
     * - inline onclick + JavaScript calls
     * - accidental repeated calls
     */

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

    if (
        !reflectionSubmitted
    ) {

        /*
         * Before telling the participant to
         * complete reflection, check the backend.
         *
         * It may already have been completed
         * from another tab/device.
         */

        await checkCompletionStatus();


        if (
            !reflectionSubmitted
        ) {

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


    /*
     * NUMBERED ANSWERS OBJECT
     *
     * Backend expects:
     *
     * {
     *   1: "A",
     *   2: "C",
     *   3: "B"
     * }
     */

    const answers =
        {};


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


        answers[
            i + 1
        ] =
            String(
                selected.value ||
                ""
            )
                .trim()
                .toUpperCase();

    }


    saveCurrentAnswers();


    const submitBtn =
        getElement(
            "submitBtn"
        );


    /*
     * EXISTING QUIZ LOADER
     * PRESERVED
     */

    if (submitBtn) {

        submitBtn.disabled =
            true;

        submitBtn.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Submitting...
        `;

    }


    /*
     * LOCK BEFORE FETCH
     */

    quizSubmitted =
        true;


    try {

        const response =
            await fetch(
                API,
                {
                    method: "POST",

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


        if (
            !response.ok
        ) {

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

        }
        catch (storageError) {

            console.warn(
                "Unable to save quiz result:",
                storageError
            );

        }


        clearSavedAnswers();

        clearQuizSession();


        /*
         * Move to results page.
         */

        window.location.href =
            `results.html?memberId=${encodeURIComponent(selectedMemberId)}&lessonNo=${encodeURIComponent(selectedLesson)}`;

    }
    catch (error) {

        console.error(
            "submitQuiz error:",
            error
        );


        quizSubmitted =
            false;


        alert(
            "Unable to submit quiz. Please check your connection and try again."
        );


        restoreQuizSubmitButton();

    }

}


/* ============================================================
   SAVE QUIZ SESSION
============================================================ */

function saveQuizSession() {

    try {

        localStorage.setItem(

            SESSION_KEY,

            JSON.stringify({

                lessonNo:
                    selectedLesson,

                memberId:
                    selectedMemberId,

                memberName:
                    selectedMemberName,

                reflectionSubmitted:
                    reflectionSubmitted,

                quizCompleted:
                    quizCompleted,

                savedAt:
                    new Date().toISOString()

            })

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

    try {

        const raw =
            localStorage.getItem(
                SESSION_KEY
            );


        if (!raw) {

            return;

        }


        const session =
            JSON.parse(
                raw
            );


        if (
            !session
        ) {

            return;

        }


        if (
            String(
                session.lessonNo
            ) !==
                String(
                    selectedLesson
                )
        ) {

            return;

        }


        selectedMemberId =
            String(
                session.memberId ||
                ""
            );


        selectedMemberName =
            String(
                session.memberName ||
                ""
            );


        reflectionSubmitted =
            Boolean(
                session.reflectionSubmitted
            );


        quizCompleted =
            Boolean(
                session.quizCompleted
            );


        if (
            selectedMemberId
        ) {

            const select =
                getElement(
                    "memberSelect"
                );


            if (select) {

                select.value =
                    selectedMemberId;

            }


            await checkCompletionStatus();

        }

    }
    catch (error) {

        console.warn(
            "Unable to restore quiz session:",
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
   GLOBAL QUIZ ANSWER AUTOSAVE
============================================================ */

document.addEventListener(
    "change",
    function (event) {

        if (
            event.target &&
            event.target.matches(
                'input[type="radio"]'
            )
        ) {

            saveCurrentAnswers();

        }

    }
);


/* ============================================================
   GLOBAL EXPORTED FUNCTIONS
============================================================ */

window.addNewMember =
    addNewMember;

window.submitQuiz =
    submitQuiz;

window.submitReflection =
    submitReflection;

window.lockSelectedParticipant =
    lockSelectedParticipant;

window.loadQuiz =
    loadQuiz;


/* ============================================================
   INITIAL TRANSITION LOADER
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        createTransitionLoader();

    }
);
