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
    "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";


/* ============================================================
   CONFIG
============================================================ */

const REFLECTION_MIN_CHARACTERS = 100;

const SESSION_KEY =
    "afc_isiu_slc_quiz_session_v1";


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

let quizCompleted = false;


/* ============================================================
   SINGLE-ACTION LOCKS
============================================================ */

/*
   These locks are extremely important.

   They prevent:

   - Add Name being sent twice
   - Participant locking twice
   - Reflection being submitted twice
   - Quiz being submitted twice
   - Completion status being checked twice simultaneously

   This is in addition to making the button handlers
   themselves idempotent.
*/

let addingMember = false;

let participantLocking = false;

let reflectionSubmitting = false;

let quizSubmitting = false;

let completionCheckInProgress = false;


/* ============================================================
   TRANSITION LOADER STATE
============================================================ */

let slcTransitionLoader = null;


/*
   Prevent the main initialization routine from being
   started more than once.
*/

let slcDomReadyStarted = false;


/* ============================================================
   DOM READY
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        /*
        Prevent duplicate initialization.
        */

        if (
            slcDomReadyStarted
        ) {

            return;

        }


        slcDomReadyStarted =
            true;


        /*
        Create the transition loader immediately.

        This means the page never sits blank while the
        quiz state is being determined.
        */

        createTransitionLoader();

        showTransitionLoader(
            "Loading your SLC quiz..."
        );


        if (
            typeof AOS !== "undefined"
        ) {

            AOS.init({

                duration:
                    650,

                once:
                    true

            });

        }


        /*
        IMPORTANT:

        These functions use onclick/onchange/oninput
        properties rather than repeatedly stacking
        addEventListener handlers.

        If initialization ever happens again,
        the old handler is replaced instead of
        creating another one.
        */

        setupParticipantListeners();

        setupReflectionListeners();

        setupQuizListeners();


        await loadQuiz();


        if (
            !quizLoaded
        ) {

            hideTransitionLoader();

            return;

        }


        await loadMembers();

        await restoreQuizSession();


        /*
        If there is no saved participant/session,
        the normal participant-selection page is ready.
        */

        if (
            !selectedMemberId
        ) {

            hideTransitionLoader();

        }

    }

);


/* ============================================================
   TRANSITION LOADER
============================================================ */

/*
   The loader is created entirely from JavaScript.

   No modification to slcquiz.html or slcquiz.css is required.

   It is used during:

   - Initial quiz loading
   - Restoring participant session
   - Preparing reflection
   - Preparing quiz
   - Submitting quiz
   - Loading results
============================================================ */

function createTransitionLoader() {

    if (
        slcTransitionLoader
    ) {

        return slcTransitionLoader;

    }


    /*
    Reuse an existing loader if one already exists.
    */

    let loader =
        document.getElementById(
            "slcTransitionLoader"
        );


    if (
        loader
    ) {

        slcTransitionLoader =
            loader;

        return loader;

    }


    loader =
        document.createElement(
            "div"
        );


    loader.id =
        "slcTransitionLoader";


    loader.setAttribute(
        "role",
        "status"
    );


    loader.setAttribute(
        "aria-live",
        "polite"
    );


    loader.innerHTML = `

        <div class="slc-transition-loader-box">

            <div
                class="slc-transition-spinner"
                aria-hidden="true"
            ></div>

            <div class="slc-transition-loader-title">
                Please wait
            </div>

            <div class="slc-transition-loader-message">
            </div>

        </div>

    `;


    /*
    Add loader styles only once.
    */

    if (
        !document.getElementById(
            "slcTransitionLoaderStyles"
        )
    ) {

        const style =
            document.createElement(
                "style"
            );


        style.id =
            "slcTransitionLoaderStyles";


        style.textContent = `

            #slcTransitionLoader {

                position: fixed;

                inset: 0;

                z-index: 999999;

                display: none;

                align-items: center;

                justify-content: center;

                padding: 24px;

                background:#fff;

                box-sizing: border-box;

            }


            #slcTransitionLoader.is-visible {

                display: flex;

            }


            .slc-transition-loader-box {

                width:
                    min(360px, 100%);

                text-align:
                    center;

                color:
                    #333;

            }


            .slc-transition-spinner {

                width:
                    46px;

                height:
                    46px;

                margin:
                    0 auto 20px;

                border:
                    4px solid
                    rgba(255,255,255,0.22);

                border-top-color:
                    #ffffff;

                border-radius:
                    50%;

                animation:
                    slcTransitionSpin
                    0.8s linear infinite;

            }


            .slc-transition-loader-title {

                font-size:
                    .9rem;

                font-weight:
                    700;

                margin-bottom:
                    8px;

            }


            .slc-transition-loader-message {

                font-size:
                    0.78rem;

                line-height:
                    1.5;

                opacity:
                    0.78;

            }


            @keyframes slcTransitionSpin {

                to {

                    transform:
                        rotate(360deg);

                }

            }

        `;


        document.head.appendChild(
            style
        );

    }


    document.body.appendChild(
        loader
    );


    slcTransitionLoader =
        loader;


    return loader;

}


/* ============================================================
   SHOW TRANSITION LOADER
============================================================ */

function showTransitionLoader(
    message
) {

    const loader =
        createTransitionLoader();


    if (
        !loader
    ) {

        return;

    }


    const messageElement =
        loader.querySelector(
            ".slc-transition-loader-message"
        );


    if (
        messageElement
    ) {

        messageElement.textContent =
            message ||
            "Loading...";

    }


    loader.classList.add(
        "is-visible"
    );


    /*
    Prevent the user from interacting with
    the page underneath the loader.
    */

    document.body.style.overflow =
        "hidden";

}


/* ============================================================
   HIDE TRANSITION LOADER
============================================================ */

function hideTransitionLoader() {

    if (
        !slcTransitionLoader
    ) {

        return;

    }


    slcTransitionLoader.classList.remove(
        "is-visible"
    );


    document.body.style.overflow =
        "";

}


/* ============================================================
   GET SAVED QUIZ STAGE
============================================================ */

function getSavedQuizStage() {

    try {

        const raw =
            sessionStorage.getItem(
                SESSION_KEY
            );


        if (
            !raw
        ) {

            return "";

        }


        const saved =
            JSON.parse(
                raw
            );


        return String(
            saved?.stage || ""
        )
            .trim()
            .toLowerCase();

    }
    catch (
        error
    ) {

        return "";

    }

}


/* ============================================================
   STAGE LOADER MESSAGE
============================================================ */

function getStageLoaderMessage(
    stage
) {

    switch (
        String(
            stage || ""
        )
            .trim()
            .toLowerCase()
    ) {

        case "reflection":

            return (
                "Loading the next stage of the quiz..."
            );


        case "quiz":

            return (
                "Loading your quiz..."
            );


        case "completed":

            return (
                "Loading your completed quiz..."
            );


        default:

            return (
                "Checking your SLC progress..."
            );

    }

}


/* ============================================================
   DOM HELPERS
============================================================ */

function getElement(
    id
) {

    return document.getElementById(
        id
    );

}


function showElement(
    id
) {

    const element =
        getElement(
            id
        );


    if (
        element
    ) {

        element.classList.remove(
            "hidden"
        );

    }

}


function hideElement(
    id
) {

    const element =
        getElement(
            id
        );


    if (
        element
    ) {

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
   LOAD QUIZ
============================================================ */

async function loadQuiz() {

    showTransitionLoader(
        "Loading this week's SLC quiz..."
    );


    const status =
        getElement(
            "quizStatus"
        );


    const countdown =
        getElement(
            "quizCountdown"
        );


    if (
        !status
    ) {

        hideTransitionLoader();

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


            if (
                countdown
            ) {

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


            hideTransitionLoader();


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


            hideTransitionLoader();


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


            hideTransitionLoader();


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


        quizCloseTime =
            data.closeTime
                ? new Date(
                    data.closeTime
                )
                : null;


        /*
        Every time the active lesson is loaded,
        reset frontend completion state.

        Completion will ONLY be determined after
        the selected participant is checked against
        this specific lesson.
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
        Always begin with participant selection.

        The loader remains visible until
        restoreQuizSession() determines whether
        we need reflection, quiz, or completed state.
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
    catch (
        error
    ) {

        console.error(
            "loadQuiz error:",
            error
        );


        status.textContent =
            "Unable to connect to the quiz service.";


        hideElement(
            "participantSection"
        );


        hideTransitionLoader();

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


    if (
        !countdown
    ) {

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


                if (
                    !target
                ) {

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


    if (
        !select
    ) {

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
    catch (
        error
    ) {

        console.error(
            "loadMembers error:",
            error
        );

    }

}


/* ============================================================
   PARTICIPANT LISTENERS
============================================================ */

/*
   IMPORTANT:

   These use .onchange/.onclick instead of
   addEventListener().

   That means if setupParticipantListeners()
   is ever called again, it REPLACES the old
   handler instead of adding another handler.
*/

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

        select.onchange =
            function () {

                if (
                    selectedMemberId ||
                    quizCompleted ||
                    participantLocking
                ) {

                    return;

                }


                if (
                    continueBtn
                ) {

                    continueBtn.disabled =
                        !select.value;

                }

            };

    }


    if (
        continueBtn
    ) {

        continueBtn.onclick =
            lockSelectedParticipant;

    }


    if (
        addButton
    ) {

        addButton.onclick =
            addNewMember;

    }

}


/* ============================================================
   ADD NEW MEMBER
============================================================ */

async function addNewMember() {

    /*
    SINGLE REQUEST LOCK.

    If the user taps twice before the first
    request finishes, the second request exits.
    */

    if (
        selectedMemberId ||
        quizCompleted ||
        addingMember
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


    if (
        !name
    ) {

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
    LOCK BEFORE FETCH.
    */

    addingMember =
        true;


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
        Reload the member list exactly once.
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


        if (
            continueBtn
        ) {

            continueBtn.disabled =
                false;

        }


        /*
        SINGLE SUCCESS MESSAGE.

        Because addingMember is locked,
        another click cannot reach this point
        simultaneously.
        */

        alert(
            "Your name has been added successfully."
        );

    }
    catch (
        error
    ) {

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
        Release the lock only after the request
        has completely finished.
        */

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

    /*
    SINGLE PARTICIPANT LOCK.
    */

    if (
        selectedMemberId ||
        quizCompleted ||
        participantLocking
    ) {

        return;

    }


    const select =
        getElement(
            "memberSelect"
        );


    if (
        !select
    ) {

        return;

    }


    const memberId =
        String(
            select.value ||
            ""
        ).trim();


    if (
        !memberId
    ) {

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


    if (
        !memberName
    ) {

        alert(
            "Unable to identify the selected participant."
        );


        return;

    }


    /*
    LOCK THE OPERATION BEFORE CHANGING
    THE PAGE OR STARTING THE BACKEND CHECK.
    */

    participantLocking =
        true;


    showTransitionLoader(
        "Preparing your SLC experience..."
    );


    selectedMemberId =
        memberId;


    selectedMemberName =
        memberName;


    /* ========================================================
       LOCK PARTICIPANT CONTROLS
    ======================================================== */

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
    Save the stage BEFORE checking the backend.

    If the user leaves now, the next page load
    knows that this participant had reached the
    restoration/checking stage.
    */

    saveQuizSession(
        "checking"
    );


    /*
    IMPORTANT:

    The backend now checks THIS participant
    against THIS lesson.
    */

    await checkCompletionStatus();

}


/* ============================================================
   SAVE QUIZ SESSION
============================================================ */

function saveQuizSession(
    stage
) {

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

        stage:
            String(
                stage ||
                "checking"
            ).trim(),

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
    catch (
        error
    ) {

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


        if (
            !raw
        ) {

            return;

        }


        saved =
            JSON.parse(
                raw
            );

    }
    catch (
        error
    ) {

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
    CRITICAL:

    Only restore a session belonging to
    the CURRENT active lesson.
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


    const select =
        getElement(
            "memberSelect"
        );


    if (
        !select
    ) {

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


    if (
        !option
    ) {

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


    /*
    Show the correct loader based on where
    the participant was last recorded.

    Backend will still verify the real state.
    */

    showTransitionLoader(
        getStageLoaderMessage(
            saved.stage ||
            "checking"
        )
    );


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


    showElement(
        "lockedParticipantSection"
    );


    hideElement(
        "participantSection"
    );


    /*
    NEVER assume the saved session means the
    quiz was completed.

    Ask the backend again.
    */

    await checkCompletionStatus();

}


/* ============================================================
   CHECK CURRENT LESSON COMPLETION
============================================================ */

async function checkCompletionStatus() {

    /*
    Prevent simultaneous status checks.

    This is especially important when restoring
    a session or when a user acts quickly.
    */

    if (
        !selectedMemberId ||
        !selectedLesson ||
        completionCheckInProgress
    ) {

        return;

    }


    completionCheckInProgress =
        true;


    /*
    Keep the loader visible while the backend
    determines the user's exact stage.
    */

    showTransitionLoader(
        getStageLoaderMessage(
            getSavedQuizStage()
        )
    );


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
                `${API}?action=getSLCCompletionStatus&memberId=${encodeURIComponent(selectedMemberId)}&lessonNo=${encodeURIComponent(selectedLesson)}`
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
            "SLC completion status for current lesson:",
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


            completionCheckInProgress =
                false;


            participantLocking =
                false;


            hideTransitionLoader();


            return;

        }


        /*
        ========================================================
        CRITICAL RULE
        ========================================================

        ONLY these current-lesson values decide
        what happens.

        Previous lessons do not block this lesson.
        */


        const currentLessonQuizCompleted =
            data.quizCompleted === true;


        const currentLessonReflectionCompleted =
            data.reflectionCompleted === true;


        /* ====================================================
           CURRENT LESSON ALREADY COMPLETED
        ==================================================== */

        if (
            currentLessonQuizCompleted
        ) {

            quizCompleted =
                true;


            reflectionSubmitted =
                true;


            clearQuizSession();


            showTransitionLoader(
                "Loading your completed quiz..."
            );


            showCompletedState(
                data
            );


            completionCheckInProgress =
                false;


            participantLocking =
                false;


            hideTransitionLoader();


            return;

        }


        /* ====================================================
           CURRENT LESSON REFLECTION ALREADY COMPLETED
        ==================================================== */

        if (
            currentLessonReflectionCompleted
        ) {

            quizCompleted =
                false;


            reflectionSubmitted =
                true;


            saveQuizSession(
                "quiz"
            );


            showTransitionLoader(
                "Loading your quiz..."
            );


            unlockQuiz();


            completionCheckInProgress =
                false;


            participantLocking =
                false;


            return;

        }


        /* ====================================================
           CURRENT LESSON NOT STARTED
        ==================================================== */

        quizCompleted =
            false;


        reflectionSubmitted =
            false;


        saveQuizSession(
            "reflection"
        );


        showTransitionLoader(
            "Loading the next stage of the quiz..."
        );


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


        completionCheckInProgress =
            false;


        participantLocking =
            false;


        hideTransitionLoader();

    }
    catch (
        error
    ) {

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


        completionCheckInProgress =
            false;


        participantLocking =
            false;


        hideTransitionLoader();

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


    let completedSection =
        getElement(
            "completedSection"
        );


    /*
    If HTML does not already contain the
    completed section, create it once.

    IMPORTANT:

    Before creating it, we check for the element
    again. This prevents duplicate completed
    cards from ever being created.
    */

    if (
        !completedSection
    ) {

        const container =
            document.querySelector(
                ".slcquiz-container"
            );


        if (
            !container
        ) {

            return;

        }


        completedSection =
            document.createElement(
                "section"
            );


        completedSection.id =
            "completedSection";


        completedSection.className =
            "quiz-card completed-card";


        completedSection.innerHTML = `

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
                href="results.html"
                class="purple-btn"
            >

                <span>

                    View My Results

                </span>


                <i class="fa-solid fa-arrow-right"></i>

            </a>

        `;


        container.appendChild(
            completedSection
        );

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
    catch (
        error
    ) {

        console.warn(
            "Unable to clear session:",
            error
        );

    }

}


/* ============================================================
   REFLECTION LISTENERS
============================================================ */

/*
   These use .oninput/.onclick so they can never
   stack another handler on top of an existing one.
*/

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


            if (
                !field
            ) {

                return;

            }


            field.oninput =
                updateReflectionProgress;

        }
    );


    const button =
        getElement(
            "submitReflectionBtn"
        );


    if (
        button
    ) {

        button.onclick =
            submitReflection;

    }

}


/* ============================================================
   CLEAN REFLECTION TEXT
============================================================ */

function cleanReflectionText(
    text
) {

    return String(
        text || ""
    )
        .replace(
            /\s+/g,
            " "
        )
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

    /*
    SINGLE REFLECTION SUBMISSION LOCK.

    This is separate from the button's disabled
    state because a second click can happen before
    the browser visually updates the button.
    */

    if (
        reflectionSubmitted ||
        quizCompleted ||
        reflectionSubmitting
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


    /*
    LOCK BEFORE FETCH.
    */

    reflectionSubmitting =
        true;


    showTransitionLoader(
        "Saving your answers..."
    );


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


        /*
        If another request/tab already saved
        the reflection, we do NOT submit another
        reflection.

        We simply continue to the quiz.
        */

        if (
            data.status ===
            "already_completed"
        ) {

            reflectionSubmitted =
                true;


            saveQuizSession(
                "quiz"
            );


            showTransitionLoader(
                "Loading your quiz..."
            );


            unlockQuiz();


            reflectionSubmitting =
                false;


            return;

        }


        if (
            !data.success
        ) {

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


            reflectionSubmitting =
                false;


            hideTransitionLoader();


            return;

        }


        /*
        Reflection has now been successfully
        recorded ONCE.
        */

        reflectionSubmitted =
            true;


        saveQuizSession(
            "quiz"
        );


        showTransitionLoader(
            "Loading your quiz..."
        );


        if (
            message
        ) {

            message.className =
                "reflection-message show success";


            message.textContent =
                "Reflection saved successfully. Your quiz is now unlocked.";

        }


        /*
        Keep the existing small transition delay.
        */

        setTimeout(
            function () {

                unlockQuiz();

                reflectionSubmitting =
                    false;

            },
            500
        );

    }
    catch (
        error
    ) {

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


        reflectionSubmitting =
            false;


        hideTransitionLoader();

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


    if (
        !button
    ) {

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


    /*
    Remember that the participant is now
    at the quiz stage.

    If the page is left, the next visit
    can display the correct loader.
    */

    saveQuizSession(
        "quiz"
    );


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


    /*
    Quiz is now actually visible,
    so the transition loader can disappear.
    */

    hideTransitionLoader();


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


    if (
        !container
    ) {

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
   QUIZ LISTENERS
============================================================ */

/*
   Use onclick instead of repeatedly attaching
   click listeners.

   This makes the submit handler single.
*/

function setupQuizListeners() {

    const submitBtn =
        getElement(
            "submitBtn"
        );


    if (
        !submitBtn
    ) {

        console.warn(
            "submitBtn was not found on the page."
        );


        return;

    }


    submitBtn.onclick =
        submitQuiz;

}


/* ============================================================
   SUBMIT QUIZ
============================================================ */

async function submitQuiz() {

    /*
    ============================================================
    SINGLE QUIZ SUBMISSION LOCK
    ============================================================

    This is the main protection against:

    - double clicking Submit Quiz
    - mobile double tapping
    - repeated event execution
    - duplicate score records
    - duplicate result processing
    */

    if (
        quizCompleted ||
        quizSubmitting
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


    /*
    ============================================================
    ANSWERS
    ============================================================

    The backend expects the actual question number.

    Question 1 → answers[1]
    Question 2 → answers[2]
    Question 3 → answers[3]

    Therefore we deliberately use i + 1.
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


        if (
            !selected
        ) {

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
        ONE-BASED QUESTION NUMBER.
        */

        answers[
            i + 1
        ] =
            selected.value;

    }


    /*
    LOCK THE QUIZ BEFORE STARTING THE REQUEST.
    */

    quizSubmitting =
        true;


    showTransitionLoader(
        "Submitting your quiz..."
    );


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

                            /*
                            Send the corrected one-based
                            question-number object.
                            */

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


            clearQuizSession();


            showTransitionLoader(
                "Loading your results..."
            );


            alert(
                data.message ||
                "You have already completed this quiz."
            );


            window.location.href =
                `results.html?memberId=${encodeURIComponent(selectedMemberId)}`;


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


            /*
            Reset the quiz submission lock because
            this request did not submit the quiz.
            */

            quizSubmitting =
                false;


            await checkCompletionStatus();


            alert(
                data.message ||
                "Please complete your reflection before taking the quiz."
            );


            restoreQuizSubmitButton();


            hideTransitionLoader();


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


            quizSubmitting =
                false;


            hideTransitionLoader();


            return;

        }


        /* ====================================================
           SUCCESS
        ==================================================== */

        /*
        Mark completed BEFORE redirecting.

        This means another click cannot trigger
        another submission during the transition.
        */

        quizCompleted =
            true;


        reflectionSubmitted =
            true;


        clearQuizSession();


        showTransitionLoader(
            "Quiz submitted successfully. Loading your results..."
        );


        /*
        Results page handles the actual score,
        history and answer review.
        */

        window.location.href =
            `results.html?memberId=${encodeURIComponent(selectedMemberId)}&lessonNo=${encodeURIComponent(selectedLesson)}&completed=1`;

    }
    catch (
        error
    ) {

        console.error(
            "submitQuiz error:",
            error
        );


        alert(
            "Unable to submit quiz. Please check your connection and try again."
        );


        restoreQuizSubmitButton();


        quizSubmitting =
            false;


        hideTransitionLoader();

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


    if (
        !submitBtn
    ) {

        return;

    }


    submitBtn.disabled =
        false;


    submitBtn.innerHTML = `

        <i class="fa-solid fa-paper-plane"></i>

        Submit Quiz

    `;

}
