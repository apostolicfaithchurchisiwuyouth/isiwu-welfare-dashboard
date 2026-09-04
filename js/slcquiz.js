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
   Reflection
        ↓
   Quiz
        ↓
   Submit
        ↓
   Quiz Completed Screen

   IMPORTANT:

   - Results are NOT opened automatically.
   - Previous quiz attempts do NOT block the current lesson.
   - Completion is checked using memberId + current lesson.
   - Reflection is required before the quiz.
   - Reflection requires all 3 answers.
   - Minimum meaningful reflection characters = 100.
   - Participant is locked once selected.
   - Backend remains the final authority.
   - Another participant can use the same device after completion.
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
                `${API}?action=getQuiz`
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
            hideElement("completedSection");

            quizLoaded = false;

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
            hideElement("completedSection");

            if (data.openTime) {

                quizOpenTime =
                    new Date(
                        data.openTime
                    );

                startCountdown("open");

            }

            quizLoaded = false;

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

            quizLoaded = false;

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


        /*
         * Reset frontend state.
         *
         * The backend determines actual completion.
         */

        quizCompleted = false;

        reflectionSubmitted = false;

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


        if (quizCloseTime) {

            startCountdown("close");

        }


        /*
         * Start with participant selection.
         *
         * restoreQuizSession() may subsequently restore
         * an active participant session for this lesson.
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


    countdown.style.display = "";


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


                    if (
                        mode === "close"
                    ) {

                        countdown.textContent =
                            "Quiz closed.";

                    }
                    else {

                        countdown.textContent =
                            "Quiz is now open.";

                    }


                    return;

                }


                const totalSeconds =
                    Math.floor(
                        diff / 1000
                    );


                const days =
                    Math.floor(
                        totalSeconds / 86400
                    );


                const hours =
                    Math.floor(
                        (totalSeconds % 86400) / 3600
                    );


                const minutes =
                    Math.floor(
                        (totalSeconds % 3600) / 60
                    );


                const seconds =
                    totalSeconds % 60;


                if (days > 0) {

                    countdown.textContent =
                        `${days}d ${hours}h ${minutes}m ${seconds}s`;

                }
                else {

                    countdown.textContent =
                        `${hours}h ${minutes}m ${seconds}s`;

                }

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


    try {

        select.innerHTML = `
            <option value="">
                Select your name
            </option>
        `;


        const response =
            await fetch(
                `${API}?action=getMembers`
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Members response:",
            data
        );


        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to load members."
            );

        }


        const members =
            Array.isArray(data.members)
                ? data.members
                : [];


        members.forEach(
            function (member) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    String(
                        member.memberId || ""
                    ).trim();


                option.textContent =
                    String(
                        member.name || ""
                    ).trim();


                option.dataset.name =
                    String(
                        member.name || ""
                    ).trim();


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


        select.innerHTML = `
            <option value="">
                Unable to load names
            </option>
        `;

    }

}


/* ============================================================
   PARTICIPANT LISTENERS
============================================================ */

function setupParticipantListeners() {

    const memberSelect =
        getElement(
            "memberSelect"
        );


    const continueBtn =
        getElement(
            "continueToReflectionBtn"
        );


    const addNameBtn =
        getElement(
            "addNameBtn"
        );


    if (memberSelect) {

        memberSelect.addEventListener(
            "change",
            function () {

                const option =
                    memberSelect.options[
                        memberSelect.selectedIndex
                    ];


                if (
                    memberSelect.value
                ) {

                    selectedMemberId =
                        String(
                            memberSelect.value
                        ).trim();


                    selectedMemberName =
                        String(
                            option?.dataset?.name ||
                            option?.textContent ||
                            ""
                        ).trim();

                }
                else {

                    selectedMemberId = "";

                    selectedMemberName = "";

                }


                if (continueBtn) {

                    continueBtn.disabled =
                        !selectedMemberId;

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


    if (addNameBtn) {

        addNameBtn.addEventListener(
            "click",
            addNewMember
        );

    }

}


/* ============================================================
   ADD NEW MEMBER
============================================================ */

async function addNewMember() {

    const nameInput =
        getElement(
            "newName"
        );


    const addButton =
        getElement(
            "addNameBtn"
        );


    if (!nameInput) {
        return;
    }


    const name =
        String(
            nameInput.value || ""
        ).trim();


    if (!name) {

        alert(
            "Please enter your name."
        );

        nameInput.focus();

        return;

    }


    if (addButton) {

        addButton.disabled = true;

        addButton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Adding...
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


        console.log(
            "Add member response:",
            data
        );


        if (!data.success) {

            alert(
                data.message ||
                "Unable to add your name."
            );

            return;

        }


        await loadMembers();


        const memberSelect =
            getElement(
                "memberSelect"
            );


        if (memberSelect) {

            memberSelect.value =
                String(
                    data.memberId || ""
                ).trim();


            const option =
                memberSelect.options[
                    memberSelect.selectedIndex
                ];


            selectedMemberId =
                String(
                    data.memberId || ""
                ).trim();


            selectedMemberName =
                String(
                    data.memberName ||
                    option?.textContent ||
                    name
                ).trim();

        }


        const continueBtn =
            getElement(
                "continueToReflectionBtn"
            );


        if (continueBtn) {

            continueBtn.disabled = false;

        }


        nameInput.value = "";


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

        if (addButton) {

            addButton.disabled = false;

            addButton.innerHTML =
                "Add My Name";

        }

    }

}


/* ============================================================
   LOCK PARTICIPANT
============================================================ */

async function lockSelectedParticipant() {

    if (!selectedMemberId) {

        alert(
            "Please select your name first."
        );

        return;

    }


    if (!selectedLesson) {

        alert(
            "The current lesson could not be identified."
        );

        return;

    }


    const select =
        getElement(
            "memberSelect"
        );


    if (select) {

        const option =
            select.options[
                select.selectedIndex
            ];


        if (!selectedMemberName) {

            selectedMemberName =
                String(
                    option?.dataset?.name ||
                    option?.textContent ||
                    ""
                ).trim();

        }


        select.disabled = true;

    }


    const continueBtn =
        getElement(
            "continueToReflectionBtn"
        );


    if (continueBtn) {

        continueBtn.disabled = true;

    }


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


    await checkCompletionStatus();

}


/* ============================================================
   SAVE SESSION
============================================================ */

function saveQuizSession() {

    if (!selectedMemberId) {
        return;
    }


    try {

        sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify({

                memberId:
                    selectedMemberId,

                memberName:
                    selectedMemberName,

                lessonNo:
                    selectedLesson,

                savedAt:
                    Date.now()

            })
        );

    }
    catch (error) {

        console.warn(
            "Unable to save quiz session.",
            error
        );

    }

}


/* ============================================================
   RESTORE SESSION
============================================================ */

async function restoreQuizSession() {

    try {

        const raw =
            sessionStorage.getItem(
                SESSION_KEY
            );


        if (!raw) {
            return;
        }


        const saved =
            JSON.parse(raw);


        if (!saved) {
            return;
        }


        const savedLesson =
            String(
                saved.lessonNo || ""
            ).trim();


        if (
            savedLesson !==
            String(selectedLesson).trim()
        ) {

            sessionStorage.removeItem(
                SESSION_KEY
            );

            return;

        }


        const savedMemberId =
            String(
                saved.memberId || ""
            ).trim();


        if (!savedMemberId) {
            return;
        }


        selectedMemberId =
            savedMemberId;


        selectedMemberName =
            String(
                saved.memberName || ""
            ).trim();


        const select =
            getElement(
                "memberSelect"
            );


        if (select) {

            select.value =
                selectedMemberId;

            select.disabled = true;

        }


        const lockedName =
            getElement(
                "lockedMemberName"
            );


        if (lockedName) {

            lockedName.textContent =
                selectedMemberName;

        }


        const continueBtn =
            getElement(
                "continueToReflectionBtn"
            );


        if (continueBtn) {

            continueBtn.disabled = true;

        }


        showElement(
            "lockedParticipantSection"
        );


        hideElement(
            "participantSection"
        );


        await checkCompletionStatus();

    }
    catch (error) {

        console.warn(
            "Unable to restore quiz session.",
            error
        );

    }

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


    try {

        const response =
            await fetch(
                `${API}?action=getSLCCompletionStatus&memberId=${encodeURIComponent(selectedMemberId)}&lessonNo=${encodeURIComponent(selectedLesson)}`
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
            data
        );


        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to check completion."
            );

        }


        quizCompleted =
            data.quizCompleted === true;


        reflectionSubmitted =
            data.reflectionCompleted === true;


        /* ====================================================
           CURRENT LESSON ALREADY COMPLETED
        ==================================================== */

        if (quizCompleted) {

            showCompletedState(
                data
            );

            return;

        }


        /* ====================================================
           REFLECTION COMPLETED
        ==================================================== */

        if (reflectionSubmitted) {

            unlockQuiz();

            return;

        }


        /* ====================================================
           REFLECTION NOT COMPLETED
        ==================================================== */

        showElement(
            "lockedParticipantSection"
        );

        hideElement(
            "quizSection"
        );

        hideElement(
            "completedSection"
        );

        showElement(
            "reflectionSection"
        );

        updateReflectionProgress();

    }
    catch (error) {

        console.error(
            "checkCompletionStatus error:",
            error
        );


        alert(
            "Unable to check your SLC status. Please try again."
        );

    }

}


/* ============================================================
   COMPLETED STATE
============================================================ */

function showCompletedState(data) {

    quizCompleted = true;


    reflectionSubmitted =
        data?.reflectionCompleted === true;


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


    showElement(
        "completedSection"
    );


    const completedLesson =
        getElement(
            "completedLesson"
        );


    if (completedLesson) {

        completedLesson.textContent =
            `Lesson ${selectedLesson}`;

    }


    const completedSection =
        getElement(
            "completedSection"
        );


    if (!completedSection) {
        return;
    }


    /*
     * --------------------------------------------------------
     * RESULTS BUTTON
     * --------------------------------------------------------
     */

    if (
        !completedSection.querySelector(
            ".completed-results-link"
        )
    ) {

        const link =
            document.createElement(
                "a"
            );


        link.href =
            `results.html?memberId=${encodeURIComponent(selectedMemberId)}&lessonNo=${encodeURIComponent(selectedLesson)}`;


        link.className =
            "purple-btn completed-results-link";


        link.innerHTML = `
            <i class="fa-solid fa-chart-column"></i>
            View My Results
        `;


        completedSection.appendChild(
            link
        );

    }


    /*
     * --------------------------------------------------------
     * SWITCH PARTICIPANT BUTTON
     * --------------------------------------------------------
     */

    if (
        !completedSection.querySelector(
            ".switch-participant-btn"
        )
    ) {

        const switchButton =
            document.createElement(
                "button"
            );


        switchButton.type =
            "button";


        switchButton.className =
            "purple-btn switch-participant-btn";


        switchButton.innerHTML = `
            <i class="fa-solid fa-users"></i>
            Take Quiz as Another Participant
        `;


        switchButton.addEventListener(
            "click",
            switchParticipant
        );


        completedSection.appendChild(
            switchButton
        );

    }

}


/* ============================================================
   SWITCH PARTICIPANT
============================================================ */

function switchParticipant() {

    /*
     * This does NOT erase the person's backend result.
     *
     * It only removes the current device session so
     * another participant can select their own name.
     */

    clearQuizSession();


    selectedMemberId = "";

    selectedMemberName = "";

    reflectionSubmitted = false;

    quizCompleted = false;


    const select =
        getElement(
            "memberSelect"
        );


    if (select) {

        select.disabled = false;

        select.value = "";

    }


    const continueBtn =
        getElement(
            "continueToReflectionBtn"
        );


    if (continueBtn) {

        continueBtn.disabled = true;

    }


    /*
     * Clear reflection fields.
     */

    [
        "reflection1",
        "reflection2",
        "reflection3"
    ].forEach(
        function (id) {

            const field =
                getElement(id);

            if (field) {

                field.value = "";

            }

        }
    );


    /*
     * Clear quiz answers.
     */

    const checkedAnswers =
        document.querySelectorAll(
            '#questions input[type="radio"]:checked'
        );


    checkedAnswers.forEach(
        function (input) {

            input.checked = false;

        }
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


    showElement(
        "participantSection"
    );


    updateReflectionProgress();


    const participantSection =
        getElement(
            "participantSection"
        );


    if (participantSection) {

        participantSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

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
            "Unable to clear quiz session.",
            error
        );

    }

}


/* ============================================================
   REFLECTION LISTENERS
============================================================ */

function setupReflectionListeners() {

    const fields = [
        "reflection1",
        "reflection2",
        "reflection3"
    ];


    fields.forEach(
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


    const submitBtn =
        getElement(
            "submitReflectionBtn"
        );


    if (submitBtn) {

        submitBtn.addEventListener(
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
        text ?? ""
    )
        .replace(/\s+/g, " ")
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


    let total = 0;


    fields.forEach(
        function (id) {

            const field =
                getElement(id);


            if (!field) {
                return;
            }


            total +=
                cleanReflectionText(
                    field.value
                ).length;

        }
    );


    return total;

}


/* ============================================================
   REFLECTION REQUIREMENTS
============================================================ */

function reflectionRequirementsMet() {

    const reflection1 =
        getElement(
            "reflection1"
        );


    const reflection2 =
        getElement(
            "reflection2"
        );


    const reflection3 =
        getElement(
            "reflection3"
        );


    if (
        !reflection1 ||
        !reflection2 ||
        !reflection3
    ) {

        return false;

    }


    const answer1 =
        cleanReflectionText(
            reflection1.value
        );


    const answer2 =
        cleanReflectionText(
            reflection2.value
        );


    const answer3 =
        cleanReflectionText(
            reflection3.value
        );


    return (
        answer1.length > 0 &&
        answer2.length > 0 &&
        answer3.length > 0 &&
        (
            answer1.length +
            answer2.length +
            answer3.length
        ) >= REFLECTION_MIN_CHARACTERS
    );

}


/* ============================================================
   UPDATE REFLECTION PROGRESS
============================================================ */

function updateReflectionProgress() {

    const count =
        getReflectionCharacterCount();


    const requirementText =
        getElement(
            "reflectionRequirementText"
        );


    const countDisplay =
        getElement(
            "reflectionCharacterCount"
        );


    const progressBar =
        getElement(
            "reflectionProgressBar"
        );


    const submitBtn =
        getElement(
            "submitReflectionBtn"
        );


    if (countDisplay) {

        countDisplay.textContent =
            `${count} / ${REFLECTION_MIN_CHARACTERS}`;

    }


    if (progressBar) {

        const percentage =
            Math.min(
                100,
                Math.round(
                    (
                        count /
                        REFLECTION_MIN_CHARACTERS
                    ) * 100
                )
            );


        progressBar.style.width =
            `${percentage}%`;

    }


    const requirementsMet =
        reflectionRequirementsMet();


    if (requirementText) {

        if (requirementsMet) {

            requirementText.textContent =
                "Your reflection is ready to submit.";

        }
        else {

            requirementText.textContent =
                `Answer all 3 questions and write at least ${REFLECTION_MIN_CHARACTERS} meaningful characters.`;

        }

    }


    if (submitBtn) {

        submitBtn.disabled =
            !requirementsMet;

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
        !selectedMemberId ||
        !selectedLesson
    ) {

        alert(
            "Your participant or lesson could not be identified."
        );

        return;

    }


    if (
        !reflectionRequirementsMet()
    ) {

        alert(
            `Please answer all 3 questions and provide at least ${REFLECTION_MIN_CHARACTERS} meaningful characters.`
        );

        return;

    }


    const reflection1 =
        getElement(
            "reflection1"
        );


    const reflection2 =
        getElement(
            "reflection2"
        );


    const reflection3 =
        getElement(
            "reflection3"
        );


    const submitBtn =
        getElement(
            "submitReflectionBtn"
        );


    const reflectionData = {

        action:
            "submitReflection",

        memberId:
            selectedMemberId,

        lessonNo:
            selectedLesson,

        question1:
            cleanReflectionText(
                reflection1.value
            ),

        question2:
            cleanReflectionText(
                reflection2.value
            ),

        question3:
            cleanReflectionText(
                reflection3.value
            )

    };


    if (submitBtn) {

        submitBtn.disabled = true;

        submitBtn.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Submitting Reflection...
        `;

    }


    try {

        const response =
            await fetch(
                API,
                {
                    method: "POST",

                    body:
                        JSON.stringify(
                            reflectionData
                        )

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
            data.status ===
            "already_completed"
        ) {

            reflectionSubmitted = true;

            await checkCompletionStatus();

            return;

        }


        if (
            data.status ===
            "quiz_completed"
        ) {

            quizCompleted = true;

            showCompletedState(
                data
            );

            return;

        }


        if (!data.success) {

            alert(
                data.message ||
                "Unable to submit reflection."
            );

            return;

        }


        reflectionSubmitted = true;


        saveQuizSession();


        unlockQuiz();

    }
    catch (error) {

        console.error(
            "submitReflection error:",
            error
        );


        alert(
            "Unable to submit reflection. Please check your connection and try again."
        );

    }
    finally {

        if (
            !quizCompleted &&
            !reflectionSubmitted
        ) {

            restoreReflectionButton();

        }

    }

}


/* ============================================================
   RESTORE REFLECTION BUTTON
============================================================ */

function restoreReflectionButton() {

    const submitBtn =
        getElement(
            "submitReflectionBtn"
        );


    if (!submitBtn) {
        return;
    }


    submitBtn.disabled =
        !reflectionRequirementsMet();


    submitBtn.innerHTML = `
        <i class="fa-solid fa-arrow-right"></i>
        Continue to Quiz
    `;

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


    reflectionSubmitted = true;


    hideElement(
        "participantSection"
    );


    showElement(
        "lockedParticipantSection"
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


    const quiz =
        getElement(
            "quizSection"
        );


    if (quiz) {

        setTimeout(
            function () {

                quiz.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            },
            100
        );

    }

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


    container.innerHTML = "";


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

            let options = "";


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


    submitBtn.addEventListener(
        "click",
        submitQuiz
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


    if (!selectedMemberId) {

        alert(
            "Your participant has not been selected."
        );

        return;

    }


    if (!reflectionSubmitted) {

        alert(
            "Please complete the reflection before taking the quiz."
        );

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

        submitBtn.disabled = true;

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

            quizCompleted = true;

            reflectionSubmitted = true;


            try {

                localStorage.setItem(
                    "afc_isiu_slc_member_v1",
                    JSON.stringify({

                        memberId:
                            selectedMemberId,

                        memberName:
                            selectedMemberName

                    })
                );

            }
            catch (storageError) {

                console.warn(
                    "Unable to save results member:",
                    storageError
                );

            }


            clearQuizSession();


            /*
             * IMPORTANT:
             *
             * Do NOT redirect to results.
             */

            showCompletedState({
                reflectionCompleted: true
            });


            return;

        }


        /* ====================================================
           REFLECTION REQUIRED
        ==================================================== */

        if (
            data.status ===
            "reflection_required"
        ) {

            reflectionSubmitted = false;


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
                "This quiz is no longer the active lesson."
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

        quizCompleted = true;

        reflectionSubmitted = true;


        try {

            localStorage.setItem(
                "afc_isiu_slc_member_v1",
                JSON.stringify({

                    memberId:
                        selectedMemberId,

                    memberName:
                        selectedMemberName

                })
            );

        }
        catch (storageError) {

            console.warn(
                "Unable to save results member:",
                storageError
            );

        }


        /*
         * Remove the active quiz session.
         *
         * This is important because it allows another
         * participant to use the same device.
         */

        clearQuizSession();


        /*
         * IMPORTANT:
         *
         * DO NOT REDIRECT TO RESULTS.
         *
         * Stay on the quiz page and show completion.
         */

        showCompletedState(
            data
        );

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


    submitBtn.disabled = false;


    submitBtn.innerHTML = `

        <i class="fa-solid fa-paper-plane"></i>

        Submit Quiz

    `;

}
