/**
 * ============================================================
 * AFC ISIU YOUTH PORTAL V2
 * FILE: slcquiz.js
 * PURPOSE: WEEKLY SLC QUIZ CONTROLLER
 * ============================================================
 *
 * CURRENT SLC FLOW
 *
 * Open Quiz
 *      ↓
 * Select Participant
 *      ↓
 * Lock Participant
 *      ↓
 * Check CURRENT Lesson
 *      ↓
 * Reflection
 *      ↓
 * Quiz
 *      ↓
 * Submit
 *      ↓
 * Results
 *
 * IMPORTANT:
 *
 * Previous quiz history NEVER determines whether the
 * current quiz is completed.
 *
 * Only:
 *
 *     data.quizCompleted === true
 *
 * can indicate that the CURRENT lesson is complete.
 *
 * ============================================================
 */

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


/* ============================================================
   STATE
   ============================================================ */

let quizData = [];

let selectedLesson = "";

let quizOpenTime = null;

let quizCloseTime = null;

let countdownInterval = null;

let selectedMemberId = "";

let selectedMemberName = "";

let reflectionSubmitted = false;

let quizLoaded = false;

let quizCompleted = false;


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

                duration:
                    650,

                once:
                    true

            });

        }


        setupParticipantListeners();

        setupReflectionListeners();

        await loadQuiz();


        if (
            !quizLoaded
        ) {

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

    return document.getElementById(
        id
    );

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

function escapeHTML(
    value
) {

    return String(
        value === null ||
        value === undefined
            ? ""
            : value
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
                `${API}?action=getQuiz`
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
            "Quiz response:",
            data
        );


        /* ====================================================
           CLOSED
           ==================================================== */

        if (
            data.status ===
            "closed"
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
            data.status ===
            "not_open"
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
                "completedSection"
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


            quizLoaded =
                false;


            return;

        }


        /* ====================================================
           API ERROR
           ==================================================== */

        if (
            !data.success
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
                data.lessonNo ||
                ""
            ).trim();


        quizOpenTime =
            data.openTime
                ? new Date(
                    data.openTime
                )
                : null;


        quizCloseTime =
            data.closeTime
                ? new Date(
                    data.closeTime
                )
                : null;


        /*
         * IMPORTANT:
         *
         * Every time a new active quiz is loaded,
         * completion state starts false.
         *
         * The backend must confirm the participant's
         * CURRENT lesson status.
         */

        quizCompleted =
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


        if (
            questionBadge
        ) {

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
         * ALWAYS begin at participant selection.
         *
         * Never redirect to results simply because
         * the quiz is active.
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

function startCountdown(
    mode
) {

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
                `${API}?action=getMembers`
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


        if (
            !data.success ||
            !Array.isArray(
                data.members
            )
        ) {

            return;

        }


        data.members.forEach(
            function (
                member
            ) {

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


    if (
        select
    ) {

        select.addEventListener(
            "change",
            function () {

                if (
                    selectedMemberId ||
                    quizCompleted
                ) {

                    return;

                }


                if (
                    continueBtn
                ) {

                    continueBtn.disabled =
                        !select.value;

                }

            }
        );

    }


    if (
        continueBtn
    ) {

        continueBtn.addEventListener(
            "click",
            lockSelectedParticipant
        );

    }


    if (
        addButton
    ) {

        addButton.addEventListener(
            "click",
            addNewMember
        );

    }

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

                    method:
                        "POST",

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


        if (
            continueBtn
        ) {

            continueBtn.disabled =
                false;

        }


        alert(
            data.existing
                ? "Your name is already on the participant list."
                : "Your name has been added successfully."
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
            select.value ||
            ""
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


    /*
     * Lock participant.
     */

    selectedMemberId =
        memberId;


    selectedMemberName =
        memberName;


    select.disabled =
        true;


    const input =
        getElement(
            "newName"
        );


    if (
        input
    ) {

        input.disabled =
            true;

    }


    const addButton =
        getElement(
            "addNameBtn"
        );


    if (
        addButton
    ) {

        addButton.disabled =
            true;

    }


    const continueBtn =
        getElement(
            "continueToReflectionBtn"
        );


    if (
        continueBtn
    ) {

        continueBtn.disabled =
            true;

    }


    const lockedName =
        getElement(
            "lockedMemberName"
        );


    if (
        lockedName
    ) {

        lockedName.textContent =
            selectedMemberName;

    }


    showElement(
        "lockedParticipantSection"
    );


    hideElement(
        "participantSection"
    );


    saveQuizSession();


    /*
     * The backend now checks:
     *
     * selectedMemberId + selectedLesson
     *
     * and nothing else.
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
     * CRITICAL:
     *
     * Never restore an old lesson's participant session.
     */

    if (
        !saved ||
        String(
            saved.lessonNo
        ).trim() !==
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
            function (
                item
            ) {

                return (
                    String(
                        item.value
                    ) ===
                    String(
                        saved.memberId
                    )
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
        ).trim();


    selectedMemberName =
        String(
            saved.memberName ||
            option.textContent ||
            ""
        ).trim();


    select.value =
        selectedMemberId;


    select.disabled =
        true;


    const input =
        getElement(
            "newName"
        );


    if (
        input
    ) {

        input.disabled =
            true;

    }


    const addButton =
        getElement(
            "addNameBtn"
        );


    if (
        addButton
    ) {

        addButton.disabled =
            true;

    }


    const continueBtn =
        getElement(
            "continueToReflectionBtn"
        );


    if (
        continueBtn
    ) {

        continueBtn.disabled =
            true;

    }


    const lockedName =
        getElement(
            "lockedMemberName"
        );


    if (
        lockedName
    ) {

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
     * NEVER assume the saved session means the quiz
     * was completed.
     *
     * Ask the backend.
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


    const reflectionMessage =
        getElement(
            "reflectionMessage"
        );


    if (
        reflectionMessage
    ) {

        reflectionMessage.className =
            "reflection-message show";


        reflectionMessage.textContent =
            "Checking your quiz status...";

    }


    try {

        const response =
            await fetch(

                `${API}?action=getSLCCompletionStatus` +
                `&memberId=${encodeURIComponent(
                    selectedMemberId
                )}` +
                `&lessonNo=${encodeURIComponent(
                    selectedLesson
                )}`

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

            if (
                reflectionMessage
            ) {

                reflectionMessage.className =
                    "reflection-message show error";


                reflectionMessage.textContent =
                    data.message ||
                    "Unable to check your quiz status.";

            }


            return;

        }


        /*
         * ====================================================
         * CRITICAL RULE
         * ====================================================
         *
         * DO NOT use:
         *
         *     data.completed
         *
         * to decide whether this participant has completed
         * the current quiz.
         *
         * ONLY:
         *
         *     data.quizCompleted === true
         *
         * ====================================================
         */

        const currentQuizCompleted =
            data.quizCompleted === true;


        const currentReflectionCompleted =
            data.reflectionCompleted === true;


        /* ====================================================
           CURRENT LESSON QUIZ COMPLETED
           ==================================================== */

        if (
            currentQuizCompleted
        ) {

            quizCompleted =
                true;


            reflectionSubmitted =
                true;


            clearQuizSession();


            showCompletedState(
                data
            );


            return;

        }


        /* ====================================================
           CURRENT LESSON REFLECTION COMPLETED
           ==================================================== */

        if (
            currentReflectionCompleted
        ) {

            quizCompleted =
                false;


            reflectionSubmitted =
                true;


            saveQuizSession();


            unlockQuiz();


            return;

        }


        /* ====================================================
           CURRENT LESSON NOT STARTED
           ==================================================== */

        quizCompleted =
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


        if (
            reflectionMessage
        ) {

            reflectionMessage.className =
                "reflection-message";


            reflectionMessage.textContent =
                "";

        }


        updateReflectionProgress();

    }

    catch (error) {

        console.error(
            "checkCompletionStatus error:",
            error
        );


        if (
            reflectionMessage
        ) {

            reflectionMessage.className =
                "reflection-message show error";


            reflectionMessage.textContent =
                "We could not check your quiz status. Please check your connection and try again.";

        }

    }

}


/* ============================================================
   SHOW COMPLETED STATE
   ============================================================ */

function showCompletedState(
    data
) {

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
                ${escapeHTML(
                    selectedLesson
                )}.
                You cannot repeat the reflection
                or quiz for the same lesson.
            </p>

            <a
                href="results.html?memberId=${encodeURIComponent(
                    selectedMemberId
                )}"
                class="purple-btn"
            >
                <span>
                    View My Results
                </span>

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


    if (
        completedLesson
    ) {

        completedLesson.textContent =
            selectedLesson;

    }


    showElement(
        "completedSection"
    );


    window.scrollTo({

        top:
            0,

        behavior:
            "smooth"

    });

}


/* ============================================================
   CLEAR SESSION
   ============================================================ */

function clearQuizSession() {

    try {

        sessionStorage.removeItem(
            SESSION_KEY
        );

    }

    catch (error) {

        console.warn(
            "Unable to clear session:",
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
        function (
            id
        ) {

            const field =
                getElement(
                    id
                );


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


    if (
        button
    ) {

        button.addEventListener(
            "click",
            submitReflection
        );

    }

}


/* ============================================================
   CLEAN REFLECTION TEXT
   ============================================================ */

function cleanReflectionText(
    text
) {

    return String(
        text ||
        ""
    )
        .replace(
            /\s+/g,
            " "
        )
        .trim();

}


/* ============================================================
   REFLECTION CHARACTER COUNT
   ============================================================ */

function getReflectionCharacterCount() {

    const fields = [

        "reflection1",

        "reflection2",

        "reflection3"

    ];


    return fields.reduce(

        function (
            total,
            id
        ) {

            const field =
                getElement(
                    id
                );


            const text =
                cleanReflectionText(
                    field
                        ? field.value
                        : ""
                );


            return (
                total +
                text
                    .replace(
                        /\s/g,
                        ""
                    )
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

        getReflectionCharacterCount() >=
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


    if (
        countDisplay
    ) {

        countDisplay.textContent =
            `${count} / ${REFLECTION_MIN_CHARACTERS} characters`;

    }


    if (
        progressBar
    ) {

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


    if (
        button
    ) {

        button.disabled =
            !ready;

    }


    if (
        requirementText
    ) {

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
   SUBMIT REFLECTION
   ============================================================ */

async function submitReflection() {

    if (
        reflectionSubmitted ||
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


    const button =
        getElement(
            "submitReflectionBtn"
        );


    const message =
        getElement(
            "reflectionMessage"
        );


    if (
        button
    ) {

        button.disabled =
            true;


        button.innerHTML = `

            <i class="fa-solid fa-spinner fa-spin"></i>
            Saving Reflection...

        `;

    }


    if (
        message
    ) {

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

                            question1:
                                answer1,

                            question2:
                                answer2,

                            question3:
                                answer3

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
            "Submit reflection response:",
            data
        );


        /* ====================================================
           SUCCESS
           ==================================================== */

        if (
            data.success
        ) {

            reflectionSubmitted =
                true;


            quizCompleted =
                false;


            saveQuizSession();


            if (
                message
            ) {

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


            return;

        }


        /* ====================================================
           QUIZ ALREADY COMPLETED
           ==================================================== */

        if (
            data.status ===
            "quiz_completed"
        ) {

            quizCompleted =
                true;


            reflectionSubmitted =
                true;


            clearQuizSession();


            showCompletedState(
                data
            );


            return;

        }


        /* ====================================================
           OTHER ERROR
           ==================================================== */

        if (
            message
        ) {

            message.className =
                "reflection-message show error";


            message.textContent =
                data.message ||
                "Unable to save your reflection.";

        }


        restoreReflectionButton();

    }

    catch (error) {

        console.error(
            "submitReflection error:",
            error
        );


        if (
            message
        ) {

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


    saveQuizSession();


    const lockedName =
        getElement(
            "lockedMemberName"
        );


    if (
        lockedName
    ) {

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


    showElement(
        "quizSection"
    );


    setTimeout(
        function () {

            const quiz =
                getElement(
                    "quizSection"
                );


            if (
                quiz
            ) {

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
                function (
                    letter
                ) {

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
                                value="${escapeHTML(
                                    letter
                                )}"
                            >

                            <span>

                                <strong>
                                    ${escapeHTML(
                                        letter
                                    )}.
                                </strong>

                                ${escapeHTML(
                                    text
                                )}

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

    if (
        quizCompleted
    ) {

        return;

    }


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


    if (
        submitBtn
    ) {

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
           ALREADY COMPLETED
           ==================================================== */

        if (
            data.status ===
            "already_attempted"
        ) {

            /*
             * This is safe because the backend only returns
             * this after checking EXACT member + current lesson.
             */

            quizCompleted =
                true;


            clearQuizSession();


            window.location.href =
                `results.html?memberId=${encodeURIComponent(
                    selectedMemberId
                )}&lessonNo=${encodeURIComponent(
                    selectedLesson
                )}`;


            return;

        }


        /* ====================================================
           REFLECTION REQUIRED
           ==================================================== */

        if (
            data.status ===
            "reflection_required"
        ) {

            reflectionSubmitted =
                false;


            showElement(
                "reflectionSection"
            );


            hideElement(
                "quizSection"
            );


            await checkCompletionStatus();


            alert(
                data.message ||
                "Please complete your reflection before taking the quiz."
            );


            restoreQuizSubmitButton();


            return;

        }


        /* ====================================================
           LESSON MISMATCH
           ==================================================== */

        if (
            data.status ===
            "lesson_mismatch"
        ) {

            alert(
                data.message ||
                "This quiz is no longer active."
            );


            window.location.reload();


            return;

        }


        /* ====================================================
           OTHER ERROR
           ==================================================== */

        if (
            !data.success
        ) {

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


        reflectionSubmitted =
            true;


        clearQuizSession();


        /*
         * IMPORTANT:
         *
         * Pass the exact selected member ID.
         *
         * Results page will use this member ID to load
         * that participant's history.
         */

        window.location.href =

            `results.html` +
            `?memberId=${encodeURIComponent(
                selectedMemberId
            )}` +
            `&lessonNo=${encodeURIComponent(
                selectedLesson
            )}` +
            `&completed=1`;

    }

    catch (error) {

        console.error(
            "submitQuiz error:",
            error
        );


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
