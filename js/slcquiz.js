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
   Reflection
        ↓
   Submit Reflection
        ↓
   Quiz Unlocks
        ↓
   Answer Questions
        ↓
   Submit Quiz
        ↓
   Individual Result
        ↓
   Review Answers

   IMPORTANT:

   - Participant cannot be changed after selection.
   - Reflection requires all 3 questions.
   - Minimum 100 meaningful characters.
   - Backend also verifies reflection before scoring.
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


        await loadQuiz();


        if (!quizLoaded) {

            checkSavedQuiz();

            return;

        }


        await loadMembers();


        await restoreQuizSession();


        checkSavedQuiz();

    }
);


/* ============================================================
   DOM HELPERS
============================================================ */

function getElement(id) {

    return document.getElementById(id);

}


function showElement(id) {

    const element = getElement(id);

    if (element) {

        element.classList.remove("hidden");

    }

}


function hideElement(id) {

    const element = getElement(id);

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
                `${API}?action=getQuiz`
            );


        const data =
            await response.json();


        console.log(
            "Quiz response:",
            data
        );


        /* =========================================
           CLOSED
        ========================================== */

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

            quizLoaded = false;

            return;

        }


        /* =========================================
           NOT OPEN
        ========================================== */

        if (
            data.status === "not_open"
        ) {

            status.textContent =
                "⏳ The weekly SLC quiz opens soon.";

            hideElement(
                "participantSection"
            );

            hideElement(
                "reflectionSection"
            );

            hideElement(
                "quizSection"
            );

            if (
                data.openTime
            ) {

                quizOpenTime =
                    new Date(
                        data.openTime
                    );

                startCountdown(
                    "open"
                );

            }

            quizLoaded = false;

            return;

        }


        /* =========================================
           API ERROR
        ========================================== */

        if (
            !data.success
        ) {

            status.textContent =
                data.message ||
                "Unable to load the quiz.";

            hideElement(
                "participantSection"
            );

            quizLoaded = false;

            return;

        }


        /* =========================================
           QUIZ OPEN
        ========================================== */

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


        quizLoaded = true;


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


        if (
            quizCloseTime
        ) {

            startCountdown(
                "close"
            );

        }


        /*
        Do NOT immediately show the quiz.

        The participant must first be selected
        and reflection completed.
        */

        showElement(
            "participantSection"
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


                    location.reload();

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

                    ${mode === "open"
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
                `${API}?action=getMembers`
            );


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
                    member.memberId;


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


    if (select) {

        select.addEventListener(
            "change",
            function () {

                if (
                    reflectionSubmitted ||
                    selectedMemberId
                ) {

                    return;

                }


                const memberId =
                    select.value;


                if (!memberId) {

                    if (continueBtn) {

                        continueBtn.disabled =
                            true;

                    }

                    return;

                }


                if (continueBtn) {

                    continueBtn.disabled =
                        false;

                }

            }
        );

    }


    if (continueBtn) {

        continueBtn.addEventListener(
            "click",
            function () {

                lockSelectedParticipant();

            }
        );

    }

}


/* ============================================================
   ADD NEW MEMBER
============================================================ */

async function addNewMember() {

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


        /*
        Reload members so the newly created
        member appears in the select.
        */

        await loadMembers();


        /*
        Automatically select the new/existing
        member returned by the backend.
        */

        select.value =
            data.memberId;


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

function lockSelectedParticipant() {

    if (
        selectedMemberId
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
        select.value;


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


    /*
    Lock the participant immediately.
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


    /*
    Save current session.
    */

    saveQuizSession();


    /*
    Show locked participant.
    */

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


    /*
    Now check whether this participant
    has already completed reflection.
    */

    checkReflectionStatus();

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

        reflectionSubmitted:
            reflectionSubmitted,

        savedAt:
            new Date().toISOString()

    };


    try {

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

async function restoreQuizSession() {

    if (
        !quizLoaded ||
        !selectedLesson
    ) {

        return;

    }


    let saved = null;


    try {

        const raw =
            sessionStorage.getItem(
                SESSION_KEY
            );


        if (!raw) {

            return;

        }


        saved =
            JSON.parse(
                raw
            );

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
    Never restore a session belonging
    to another week's quiz.
    */

    if (
        !saved ||
        String(
            saved.lessonNo
        ).trim()
        !==
        String(
            selectedLesson
        ).trim()
    ) {

        sessionStorage.removeItem(
            SESSION_KEY
        );

        return;

    }


    if (
        !saved.memberId
    ) {

        return;

    }


    /*
    Make sure the saved member still exists.
    */

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
                    item.value ===
                    saved.memberId
                );

            }
        );


    if (!option) {

        /*
        Do not restore an invalid member.
        */

        sessionStorage.removeItem(
            SESSION_KEY
        );

        return;

    }


    selectedMemberId =
        saved.memberId;


    selectedMemberName =
        saved.memberName ||
        option.textContent.trim();


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


    /*
    Always verify the reflection from the
    backend instead of trusting sessionStorage.
    */

    await checkReflectionStatus();

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
   CLEAN REFLECTION TEXT
============================================================ */

function cleanReflectionText(text) {

    return String(
        text || ""
    )
        .replace(/\s+/g, " ")
        .trim();

}


/* ============================================================
   MEANINGFUL CHARACTER COUNT
============================================================ */

function getReflectionCharacterCount() {

    const one =
        cleanReflectionText(
            getElement(
                "reflection1"
            )?.value
        );


    const two =
        cleanReflectionText(
            getElement(
                "reflection2"
            )?.value
        );


    const three =
        cleanReflectionText(
            getElement(
                "reflection3"
            )?.value
        );


    /*
    Count actual characters without
    whitespace.
    */

    return (

        one.replace(/\s/g, "").length +

        two.replace(/\s/g, "").length +

        three.replace(/\s/g, "").length

    );

}


/* ============================================================
   CHECK REFLECTION REQUIREMENTS
============================================================ */

function reflectionRequirementsMet() {

    const answer1 =
        cleanReflectionText(
            getElement(
                "reflection1"
            )?.value
        );


    const answer2 =
        cleanReflectionText(
            getElement(
                "reflection2"
            )?.value
        );


    const answer3 =
        cleanReflectionText(
            getElement(
                "reflection3"
            )?.value
        );


    const allAnswered =
        Boolean(
            answer1 &&
            answer2 &&
            answer3
        );


    const characterCount =
        getReflectionCharacterCount();


    return (

        allAnswered &&

        characterCount >=
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


    const answer1 =
        cleanReflectionText(
            getElement(
                "reflection1"
            )?.value
        );


    const answer2 =
        cleanReflectionText(
            getElement(
                "reflection2"
            )?.value
        );


    const answer3 =
        cleanReflectionText(
            getElement(
                "reflection3"
            )?.value
        );


    const answeredCount = [

        answer1,
        answer2,
        answer3

    ].filter(Boolean).length;


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

        if (
            ready
        ) {

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
   CHECK REFLECTION STATUS
============================================================ */

async function checkReflectionStatus() {

    if (
        !selectedMemberId ||
        !selectedLesson
    ) {

        return;

    }


    /*
    Show reflection while checking.
    */

    showElement(
        "reflectionSection"
    );


    const message =
        getElement(
            "reflectionMessage"
        );


    if (message) {

        message.className =
            "reflection-message show";


        message.textContent =
            "Checking your reflection status...";

    }


    try {

        const response =
            await fetch(
                `${API}?action=getReflectionStatus&memberId=${encodeURIComponent(selectedMemberId)}&lessonNo=${encodeURIComponent(selectedLesson)}`
            );


        const data =
            await response.json();


        console.log(
            "Reflection status:",
            data
        );


        if (
            data.success &&
            (
                data.completed === true ||
                data.status === "completed"
            )
        ) {

            reflectionSubmitted =
                true;


            saveQuizSession();


            unlockQuiz();


            return;

        }


        /*
        Reflection has not been completed.
        */

        reflectionSubmitted =
            false;


        saveQuizSession();


        showElement(
            "reflectionSection"
        );


        hideElement(
            "quizSection"
        );


        if (message) {

            message.className =
                "reflection-message";


            message.textContent =
                "";

        }


        updateReflectionProgress();


    }
    catch (error) {

        console.error(
            "checkReflectionStatus error:",
            error
        );


        showElement(
            "reflectionSection"
        );


        const message =
            getElement(
                "reflectionMessage"
            );


        if (message) {

            message.className =
                "reflection-message show error";


            message.textContent =
                "We could not check your reflection status. Please check your connection and try again.";

        }

    }

}


/* ============================================================
   SUBMIT REFLECTION
============================================================ */

async function submitReflection() {

    if (
        reflectionSubmitted
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
            "The current quiz lesson could not be identified."
        );

        return;

    }


    if (
        !reflectionRequirementsMet()
    ) {

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


        const data =
            await response.json();


        console.log(
            "Submit reflection response:",
            data
        );


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


            if (button) {

                button.disabled =
                    false;

                button.innerHTML = `

                    <span>
                        Submit Reflection
                    </span>

                    <i class="fa-solid fa-arrow-right"></i>

                `;

            }


            return;

        }


        /*
        Reflection successfully saved.
        */

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
        Small delay so the success message
        can be seen before moving forward.
        */

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


        if (button) {

            button.disabled =
                false;

            button.innerHTML = `

                <span>
                    Submit Reflection
                </span>

                <i class="fa-solid fa-arrow-right"></i>

            `;

        }

    }

}


/* ============================================================
   UNLOCK QUIZ
============================================================ */

function unlockQuiz() {

    if (
        !selectedMemberId ||
        !selectedLesson
    ) {

        return;

    }


    reflectionSubmitted =
        true;


    saveQuizSession();


    /*
    Make sure participant remains locked.
    */

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


    /*
    Hide reflection after successful
    completion.
    */

    hideElement(
        "reflectionSection"
    );


    /*
    Render quiz.
    */

    renderQuestions();


    showElement(
        "quizSection"
    );


    /*
    Scroll gently to quiz.
    */

    setTimeout(
        function () {

            const quiz =
                getElement(
                    "quizSection"
                );


            if (quiz) {

                quiz.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
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


                    if (
                        !text
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

}


/* ============================================================
   SUBMIT QUIZ
============================================================ */

async function submitQuiz() {

    /*
    Frontend guard.
    */

    if (
        !selectedMemberId
    ) {

        alert(
            "Your participant has not been selected."
        );

        return;

    }


    if (
        !reflectionSubmitted
    ) {

        alert(
            "Please complete the reflection before taking the quiz."
        );

        return;

    }


    if (
        !selectedLesson
    ) {

        alert(
            "The current quiz lesson could not be identified."
        );

        return;

    }


    const answers =
        [];


    /*
    Collect every answer.
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
                    behavior: "smooth",
                    block: "center"
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


        const data =
            await response.json();


        console.log(
            "Score response:",
            data
        );


        if (
            !data.success
        ) {

            /*
            If the backend says reflection is
            required, send the user back to it.
            */

            if (
                data.status ===
                "reflection_required"
            ) {

                reflectionSubmitted =
                    false;


                saveQuizSession();


                showElement(
                    "reflectionSection"
                );


                hideElement(
                    "quizSection"
                );


                alert(
                    data.message ||
                    "Please complete your reflection before taking the quiz."
                );


                await checkReflectionStatus();


            }
            else {

                alert(
                    data.message ||
                    "Unable to submit quiz."
                );

            }


            if (submitBtn) {

                submitBtn.disabled =
                    false;

                submitBtn.innerHTML = `

                    <i class="fa-solid fa-paper-plane"></i>

                    Submit Quiz

                `;

            }


            return;

        }


        /*
        Store result data.
        */

        reviewData =
            Array.isArray(
                data.review
            )
                ? data.review
                : [];


        reviewQuestions =
            Array.isArray(
                data.questions
            )
                ? data.questions
                : [];


        localStorage.setItem(
            LAST_REVIEW_KEY,
            JSON.stringify(
                reviewData
            )
        );


        localStorage.setItem(
            LAST_QUESTIONS_KEY,
            JSON.stringify(
                reviewQuestions
            )
        );


        localStorage.setItem(
            LAST_SCORE_KEY,
            data.score
        );


        localStorage.setItem(
            LAST_POINTS_KEY,
            data.pointsEarned
        );


        localStorage.setItem(
            LAST_TOTAL_KEY,
            data.totalPoints
        );


        /*
        Clear the current week's active
        quiz session.

        This prevents the participant from
        reopening the quiz and changing
        anything after submission.
        */

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


        /*
        Hide quiz and show individual result.
        */

        hideElement(
            "quizSection"
        );


        hideElement(
            "reflectionSection"
        );


        hideElement(
            "lockedParticipantSection"
        );


        showElement(
            "resultSection"
        );


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


        if (scoreText) {

            scoreText.textContent =
                data.score;

        }


        if (pointsText) {

            pointsText.textContent =
                `Points earned: ${data.pointsEarned}`;

        }


        if (totalPointsText) {

            totalPointsText.textContent =
                `Total points: ${data.totalPoints}`;

        }


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });


        checkSavedQuiz();

    }
    catch (error) {

        console.error(
            "submitQuiz error:",
            error
        );


        alert(
            "Unable to submit quiz. Please check your connection and try again."
        );


        if (submitBtn) {

            submitBtn.disabled =
                false;

            submitBtn.innerHTML = `

                <i class="fa-solid fa-paper-plane"></i>

                Submit Quiz

            `;

        }

    }

}


/* ============================================================
   SHOW REVIEW
============================================================ */

function showReview() {

    if (
        !reviewData ||
        reviewData.length === 0
    ) {

        try {

            reviewData =
                JSON.parse(
                    localStorage.getItem(
                        LAST_REVIEW_KEY
                    )
                ) || [];

        }
        catch (error) {

            reviewData =
                [];

        }

    }


    if (
        !reviewQuestions ||
        reviewQuestions.length === 0
    ) {

        try {

            reviewQuestions =
                JSON.parse(
                    localStorage.getItem(
                        LAST_QUESTIONS_KEY
                    )
                ) || [];

        }
        catch (error) {

            reviewQuestions =
                [];

        }

    }


    if (
        reviewData.length === 0 ||
        reviewQuestions.length === 0
    ) {

        alert(
            "No review is available."
        );

        return;

    }


    const container =
        getElement(
            "reviewContainer"
        );


    if (!container) {

        return;

    }


    let html =
        "";


    reviewData.forEach(
        function (
            item,
            index
        ) {

            const q =
                reviewQuestions[
                    index
                ];


            if (!q) {

                return;

            }


            html += `

                <div class="question-card">

                    <div class="question-number">

                        QUESTION ${index + 1}

                    </div>


                    <h3>

                        ${escapeHTML(
                            q.question
                        )}

                    </h3>

            `;


            [
                "A",
                "B",
                "C",
                "D"

            ].forEach(
                function (letter) {

                    const text =
                        q[
                            `option${letter}`
                        ];


                    if (!text) {

                        return;

                    }


                    let background =
                        "#ffffff";


                    let border =
                        "#ececec";


                    let badge =
                        "";


                    if (
                        letter ===
                        String(
                            item.correctAnswer
                        ).trim().toUpperCase()
                    ) {

                        background =
                            "#ecfdf5";

                        border =
                            "#22c55e";

                        badge =
                            "✓ Correct Answer";

                    }


                    if (
                        letter ===
                        String(
                            item.userAnswer
                        ).trim().toUpperCase()
                        &&
                        !item.correct
                    ) {

                        background =
                            "#fef2f2";

                        border =
                            "#ef4444";

                        badge =
                            "✕ Your Answer";

                    }


                    html += `

                        <div
                            style="
                                padding:14px;
                                border-radius:13px;
                                margin-bottom:9px;
                                background:${background};
                                border:2px solid ${border};
                                font-size:.68rem;
                                line-height:1.45;
                            "
                        >

                            <strong>

                                ${escapeHTML(letter)}.

                            </strong>

                            ${escapeHTML(text)}


                            ${
                                badge
                                    ? `
                                        <div
                                            style="
                                                margin-top:7px;
                                                font-size:.58rem;
                                                font-weight:700;
                                            "
                                        >
                                            ${badge}
                                        </div>
                                    `
                                    : ""
                            }

                        </div>

                    `;

                }
            );


            html += `

                </div>

            `;

        }
    );


    container.innerHTML =
        html;


    hideElement(
        "resultSection"
    );


    showElement(
        "reviewSection"
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


    showElement(
        "resultSection"
    );


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* ============================================================
   OPEN SAVED SCORE
============================================================ */

function openSavedScore() {

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


    if (!score) {

        alert(
            "No saved score found."
        );

        return;

    }


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


    if (scoreText) {

        scoreText.textContent =
            score;

    }


    if (pointsText) {

        pointsText.textContent =
            `Points earned: ${points}`;

    }


    if (totalPointsText) {

        totalPointsText.textContent =
            `Total points: ${total}`;

    }


    hideElement(
        "quizSection"
    );


    hideElement(
        "reflectionSection"
    );


    hideElement(
        "reviewSection"
    );


    showElement(
        "resultSection"
    );


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* ============================================================
   OPEN SAVED REVIEW
============================================================ */

function openSavedReview() {

    try {

        reviewData =
            JSON.parse(
                localStorage.getItem(
                    LAST_REVIEW_KEY
                )
            ) || [];


        reviewQuestions =
            JSON.parse(
                localStorage.getItem(
                    LAST_QUESTIONS_KEY
                )
            ) || [];

    }
    catch (error) {

        reviewData =
            [];

        reviewQuestions =
            [];

    }


    if (
        reviewData.length === 0 ||
        reviewQuestions.length === 0
    ) {

        alert(
            "No review available."
        );

        return;

    }


    showReview();

}


/* ============================================================
   BACK TO QUIZ
============================================================ */

function backToQuiz() {

    /*
    This button only returns to the quiz
    while the quiz is still in the current
    in-memory session.

    If the quiz was already submitted,
    backend duplicate-attempt protection
    prevents another submission.
    */

    hideElement(
        "resultSection"
    );


    hideElement(
        "reviewSection"
    );


    if (
        quizData.length &&
        selectedMemberId &&
        reflectionSubmitted
    ) {

        showElement(
            "lockedParticipantSection"
        );


        showElement(
            "quizSection"
        );

    }
    else {

        showElement(
            "resultSection"
        );

    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* ============================================================
   CHECK SAVED QUIZ
============================================================ */

function checkSavedQuiz() {

    const score =
        localStorage.getItem(
            LAST_SCORE_KEY
        );


    const review =
        localStorage.getItem(
            LAST_REVIEW_KEY
        );


    const savedSection =
        getElement(
            "savedSection"
        );


    if (
        !savedSection
    ) {

        return;

    }


    if (
        score ||
        review
    ) {

        savedSection.classList.remove(
            "hidden"
        );

    }
    else {

        savedSection.classList.add(
            "hidden"
        );

    }

}
