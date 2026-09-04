/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: results.js
   PURPOSE: SLC RESULTS PAGE CONTROLLER
   ============================================================

   FEATURES
   ------------------------------------------------------------
   - Identifies participant from SLC session
   - Loads all quiz history for that participant
   - Displays latest quiz result
   - Displays complete quiz history
   - Opens answer review for any completed quiz
   - Correctly handles backend review structure
   - Prevents name-based identity guessing
   - Handles stale participant sessions gracefully
   ============================================================ */

"use strict";


/* ============================================================
   API CONFIG
   ============================================================ */

const RESULTS_API =
    "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";


/* ============================================================
   STORAGE KEYS
   ============================================================ */

const RESULTS_MEMBER_KEY =
    "afc_isiu_slc_member_v1";

const RESULTS_SESSION_KEY =
    "afc_isiu_slc_quiz_session_v1";


/* ============================================================
   STATE
   ============================================================ */

let memberId = "";
let memberName = "";

let historyData = [];

let selectedReviewLesson = "";
let queryLessonNo = "";

let currentReviewData = null;


/* ============================================================
   PAGE INITIALIZATION
   ============================================================ */

document.addEventListener("DOMContentLoaded", async function () {

    if (typeof AOS !== "undefined") {

        AOS.init({
            duration: 650,
            once: true
        });

    }

    setupResultsListeners();

    await identifyMember();

});


/* ============================================================
   DOM HELPERS
   ============================================================ */

function resultElement(id) {

    return document.getElementById(id);

}


function showResultElement(id) {

    const element = resultElement(id);

    if (element) {
        element.classList.remove("hidden");
    }

}


function hideResultElement(id) {

    const element = resultElement(id);

    if (element) {
        element.classList.add("hidden");
    }

}


/* ============================================================
   HTML ESCAPING
   ============================================================ */

function escapeResultHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* ============================================================
   NORMALIZE MEMBER ID
   ============================================================ */

function normalizeMemberId(value) {

    return String(value ?? "")
        .trim()
        .replace(/\s+/g, "");

}


/* ============================================================
   NORMALIZE LESSON NUMBER
   ============================================================ */

function normalizeLessonNo(value) {

    return String(value ?? "")
        .trim()
        .replace(/^lesson\s*/i, "");

}


/* ============================================================
   IDENTIFY PARTICIPANT
   ============================================================ */

async function identifyMember() {

    const params =
        new URLSearchParams(window.location.search);

    queryLessonNo =
        normalizeLessonNo(
            params.get("lessonNo") || ""
        );


    /* ========================================================
       PRIORITY 1 — URL MEMBER ID
    ======================================================== */

    memberId =
        normalizeMemberId(
            params.get("memberId") || ""
        );


    /* ========================================================
       PRIORITY 2 — SLC SESSION
    ======================================================== */

    if (!memberId) {

        try {

            const raw =
                sessionStorage.getItem(
                    RESULTS_SESSION_KEY
                );

            if (raw) {

                const parsed =
                    JSON.parse(raw);

                if (
                    parsed &&
                    parsed.memberId
                ) {

                    memberId =
                        normalizeMemberId(
                            parsed.memberId
                        );

                    memberName =
                        String(
                            parsed.memberName || ""
                        ).trim();

                }

            }

        } catch (error) {

            console.warn(
                "Unable to read SLC session.",
                error
            );

        }

    }


    /* ========================================================
       PRIORITY 3 — SAVED MEMBER
    ======================================================== */

    if (!memberId) {

        try {

            const raw =
                localStorage.getItem(
                    RESULTS_MEMBER_KEY
                );

            if (raw) {

                const parsed =
                    JSON.parse(raw);

                if (
                    parsed &&
                    parsed.memberId
                ) {

                    memberId =
                        normalizeMemberId(
                            parsed.memberId
                        );

                    memberName =
                        String(
                            parsed.memberName || ""
                        ).trim();

                }

            }

        } catch (error) {

            console.warn(
                "Unable to read saved member.",
                error
            );

        }

    }


    /* ========================================================
       NO MEMBER FOUND
    ======================================================== */

    if (!memberId) {

        updateMemberDisplay(
            "Participant not selected"
        );

        showResultsMessage(
            "Please return to the SLC Quiz page and select your participant before viewing your results."
        );

        hideResultElement("latestResult");
        hideResultElement("reviewSection");

        showResultElement("emptyResults");

        return;

    }


    /* ========================================================
       DISPLAY PARTICIPANT
    ======================================================== */

    updateMemberDisplay();


    /* ========================================================
       LOAD HISTORY
    ======================================================== */

    await loadQuizHistory();

}


/* ============================================================
   MEMBER DISPLAY
   ============================================================ */

function updateMemberDisplay(customName) {

    const element =
        resultElement("resultsMember");

    if (!element) return;


    const displayName =
        customName ||
        memberName ||
        "My Results";


    element.innerHTML = `
        <span class="member-status-icon">
            <i class="fa-solid fa-lock"></i>
        </span>

        <span class="member-status-text">
            ${escapeResultHTML(displayName)}
        </span>
    `;

}


/* ============================================================
   LOAD QUIZ HISTORY
   ============================================================ */

async function loadQuizHistory() {

    showResultsMessage(
        "Loading your quiz results..."
    );


    try {

        const url =
            `${RESULTS_API}?action=getMemberQuizHistory&memberId=${encodeURIComponent(memberId)}`;


        const response =
            await fetch(url, {
                method: "GET",
                cache: "no-store"
            });


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Quiz history:",
            data
        );


        /* ====================================================
           BACKEND ERROR
        ==================================================== */

        if (!data.success) {

            const backendMessage =
                String(
                    data.message || ""
                ).trim();


            /*
             * This is particularly useful when an old
             * sessionStorage member ID no longer exists
             * in the Members sheet.
             */

            if (
                backendMessage
                    .toLowerCase()
                    .includes("participant could not be found")
            ) {

                handleInvalidParticipant();

                return;

            }


            showResultsMessage(
                backendMessage ||
                "Unable to load your results."
            );

            return;

        }


        /* ====================================================
           MEMBER NAME FROM BACKEND
        ==================================================== */

        if (data.memberName) {

            memberName =
                String(
                    data.memberName
                ).trim();

            updateMemberDisplay();

            saveResultsMember();

        }


        /* ====================================================
           HISTORY DATA
        ==================================================== */

        historyData =
            Array.isArray(data.results)
                ? data.results
                : [];


        /*
         * Backend normally returns newest first.
         * We still safely sort here so the UI remains
         * correct if backend order changes later.
         */

        historyData.sort(
            sortHistoryNewestFirst
        );


        hideResultsMessage();


        renderHistory();

        renderLatestResult();


    } catch (error) {

        console.error(
            "loadQuizHistory error:",
            error
        );


        showResultsMessage(
            "Unable to load your results. Please check your connection and try again."
        );

    }

}


/* ============================================================
   INVALID PARTICIPANT SESSION
   ============================================================ */

function handleInvalidParticipant() {

    /*
     * Clear only the browser's stale identity.
     * Nothing is deleted from Google Sheets.
     */

    try {

        sessionStorage.removeItem(
            RESULTS_SESSION_KEY
        );

        localStorage.removeItem(
            RESULTS_MEMBER_KEY
        );

    } catch (error) {

        console.warn(
            "Unable to clear stale participant session.",
            error
        );

    }


    memberId = "";
    memberName = "";
    historyData = [];


    updateMemberDisplay(
        "Participant session expired"
    );


    showResultsMessage(
        "Your participant session is no longer valid. Please return to the SLC Quiz page and select your name again."
    );


    hideResultElement("latestResult");
    hideResultElement("reviewSection");


    const list =
        resultElement("historyList");

    if (list) {
        list.innerHTML = "";
    }


    const count =
        resultElement("historyCount");

    if (count) {
        count.textContent = "0 quizzes";
    }


    showResultElement("emptyResults");

}


/* ============================================================
   SAVE MEMBER LOCALLY
   ============================================================ */

function saveResultsMember() {

    if (!memberId) return;


    try {

        localStorage.setItem(
            RESULTS_MEMBER_KEY,
            JSON.stringify({
                memberId: memberId,
                memberName: memberName
            })
        );

    } catch (error) {

        console.warn(
            "Unable to save results member.",
            error
        );

    }

}


/* ============================================================
   HISTORY SORT
   ============================================================ */

function sortHistoryNewestFirst(a, b) {

    const dateA =
        getResultDateValue(
            a.timestamp ??
            a.date ??
            a.createdAt
        );

    const dateB =
        getResultDateValue(
            b.timestamp ??
            b.date ??
            b.createdAt
        );


    return dateB - dateA;

}


function getResultDateValue(value) {

    if (!value) {
        return 0;
    }


    const date =
        new Date(value);


    const time =
        date.getTime();


    return Number.isNaN(time)
        ? 0
        : time;

}


/* ============================================================
   RENDER HISTORY
   ============================================================ */

function renderHistory() {

    const list =
        resultElement("historyList");

    const count =
        resultElement("historyCount");


    if (!list) return;


    const quizCount =
        historyData.length;


    if (count) {

        count.textContent =
            `${quizCount} ${quizCount === 1 ? "quiz" : "quizzes"}`;

    }


    /* ========================================================
       EMPTY
    ======================================================== */

    if (!historyData.length) {

        list.innerHTML = "";

        showResultElement(
            "emptyResults"
        );

        return;

    }


    hideResultElement(
        "emptyResults"
    );


    /* ========================================================
       HISTORY ITEMS
    ======================================================== */

    list.innerHTML =
        historyData.map(
            function (result, index) {

                const lesson =
                    normalizeLessonNo(
                        result.lessonNo ??
                        result.lesson ??
                        ""
                    );


                const score =
                    escapeResultHTML(
                        result.score ?? "-"
                    );


                const points =
                    escapeResultHTML(
                        result.pointsEarned ??
                        result.points ??
                        "0"
                    );


                const date =
                    formatDate(
                        result.timestamp ??
                        result.date ??
                        result.createdAt
                    );


                const total =
                    result.totalPoints ??
                    result.total ??
                    "";


                const scoreDisplay =
                    total
                        ? `${score} / ${escapeResultHTML(total)}`
                        : score;


                return `
                    <div
                        class="history-item"
                        data-lesson="${escapeResultHTML(lesson)}"
                    >

                        <div class="history-number">
                            ${index + 1}
                        </div>


                        <div class="history-main">

                            <div class="history-top">

                                <strong>
                                    Lesson ${escapeResultHTML(lesson)}
                                </strong>

                                <span>
                                    ${escapeResultHTML(date)}
                                </span>

                            </div>


                            <div class="history-score">

                                <span>
                                    Score: ${scoreDisplay}
                                </span>

                                <span>
                                    +${points} points
                                </span>

                            </div>

                        </div>


                        <button
                            type="button"
                            class="history-review-btn"
                            data-review-lesson="${escapeResultHTML(lesson)}"
                        >
                            <i class="ri-search-eye-line"></i>
                            Review
                        </button>

                    </div>
                `;

            }
        ).join("");

}


/* ============================================================
   RENDER LATEST RESULT
   ============================================================ */

function renderLatestResult(
    submittedLesson
) {

    const latest =
        resultElement("latestResult");


    if (!latest) return;


    if (!historyData.length) {

        hideResultElement(
            "latestResult"
        );

        return;

    }


    let result = null;


    const exactLesson =
        normalizeLessonNo(
            submittedLesson ||
            queryLessonNo ||
            ""
        );


    /* ========================================================
       PREFER SPECIFIC LESSON
    ======================================================== */

    if (exactLesson) {

        result =
            historyData.find(
                function (item) {

                    const lesson =
                        normalizeLessonNo(
                            item.lessonNo ??
                            item.lesson ??
                            ""
                        );

                    return lesson === exactLesson;

                }
            ) || null;

    }


    /* ========================================================
       OTHERWISE FIRST / NEWEST
    ======================================================== */

    if (!result) {

        result =
            historyData[0];

    }


    if (!result) {

        hideResultElement(
            "latestResult"
        );

        return;

    }


    showResultElement(
        "latestResult"
    );


    const lesson =
        normalizeLessonNo(
            result.lessonNo ??
            result.lesson ??
            ""
        );


    const score =
        result.score ?? "-";


    const points =
        result.pointsEarned ??
        result.points ??
        "0";


    const total =
        result.totalPoints ??
        result.total ??
        "";


    const date =
        formatDate(
            result.timestamp ??
            result.date ??
            result.createdAt
        );


    const title =
        resultElement("latestTitle");

    const lessonElement =
        resultElement("latestLesson");

    const scoreElement =
        resultElement("latestScore");

    const totalElement =
        resultElement("latestTotal");

    const pointsElement =
        resultElement("latestPoints");

    const dateElement =
        resultElement("latestDate");

    const reviewButton =
        resultElement("latestReviewBtn");


    if (title) {

        title.textContent =
            `Lesson ${lesson} Result`;

    }


    if (lessonElement) {

        lessonElement.textContent =
            `Lesson ${lesson}`;

    }


    if (scoreElement) {

        scoreElement.textContent =
            score;

    }


    if (totalElement) {

        totalElement.textContent =
            total
                ? `/ ${total}`
                : "";

    }


    if (pointsElement) {

        pointsElement.textContent =
            `+${points}`;

    }


    if (dateElement) {

        dateElement.textContent =
            date || "—";

    }


    if (reviewButton) {

        reviewButton.dataset.lesson =
            lesson;

    }

}


/* ============================================================
   OPEN REVIEW
   ============================================================ */

async function openReview(
    lessonNo
) {

    const lesson =
        normalizeLessonNo(
            lessonNo
        );


    if (
        !memberId ||
        !lesson
    ) {

        return;

    }


    selectedReviewLesson =
        lesson;


    currentReviewData =
        null;


    showResultElement(
        "reviewSection"
    );


    const title =
        resultElement("reviewTitle");

    const subtitle =
        resultElement("reviewSubtitle");

    const container =
        resultElement("reviewContainer");

    const summary =
        resultElement("reviewSummary");


    if (title) {

        title.textContent =
            `Lesson ${lesson} Answer Review`;

    }


    if (subtitle) {

        subtitle.textContent =
            "Loading your submitted answers...";

    }


    if (summary) {

        summary.innerHTML = "";

        summary.classList.remove(
            "show"
        );

    }


    if (container) {

        container.innerHTML = `
            <div class="review-loading">

                <i class="fa-solid fa-spinner fa-spin"></i>

                Loading review...

            </div>
        `;

    }


    /* ========================================================
       SCROLL TO REVIEW
    ======================================================== */

    const review =
        resultElement("reviewSection");


    if (review) {

        setTimeout(
            function () {

                review.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            },
            80
        );

    }


    try {

        const url =
            `${RESULTS_API}?action=getQuizReview&memberId=${encodeURIComponent(memberId)}&lessonNo=${encodeURIComponent(lesson)}`;


        const response =
            await fetch(url, {
                method: "GET",
                cache: "no-store"
            });


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Quiz review:",
            data
        );


        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to load review."
            );

        }


        currentReviewData =
            data;


        if (subtitle) {

            subtitle.textContent =
                "Here is how you answered each question.";

        }


        renderReview(data);


    } catch (error) {

        console.error(
            "openReview error:",
            error
        );


        if (subtitle) {

            subtitle.textContent =
                "Unable to load your answer review.";

        }


        if (container) {

            container.innerHTML = `
                <div class="review-empty">

                    Unable to load your answer review.

                    <br>

                    Please try again.

                </div>
            `;

        }

    }

}


/* ============================================================
   PARSE POSSIBLE JSON
   ============================================================ */

function parsePossibleJSON(
    value,
    fallback
) {

    if (Array.isArray(value)) {

        return value;

    }


    if (
        typeof value === "string" &&
        value.trim()
    ) {

        try {

            const parsed =
                JSON.parse(value);

            return parsed;

        } catch (error) {

            console.warn(
                "Unable to parse review JSON.",
                error
            );

        }

    }


    return fallback;

}


/* ============================================================
   GET REVIEW QUESTION
   ============================================================ */

function getReviewQuestion(
    review,
    question,
    index
) {

    return (
        review.question ||
        question.question ||
        `Question ${index + 1}`
    );

}


/* ============================================================
   GET USER ANSWER
   ============================================================ */

function getUserAnswer(
    review
) {

    /*
     * scoreQuiz() saves:
     *
     * {
     *   questionNo,
     *   userAnswer,
     *   correctAnswer,
     *   correct
     * }
     *
     * So userAnswer is the primary field.
     */

    return (
        review.userAnswer ??
        review.selectedAnswer ??
        review.answer ??
        review.selected ??
        ""
    );

}


/* ============================================================
   GET CORRECT ANSWER
   ============================================================ */

function getCorrectAnswer(
    review,
    question
) {

    return (
        review.correctAnswer ??
        review.correct ??
        question.correctAnswer ??
        question.correct ??
        ""
    );

}


/* ============================================================
   DETERMINE CORRECTNESS
   ============================================================ */

function isReviewCorrect(
    review,
    selectedAnswer,
    correctAnswer
) {

    /*
     * Backend's authoritative boolean.
     */

    if (
        typeof review.correct === "boolean"
    ) {

        return review.correct;

    }


    if (
        typeof review.isCorrect === "boolean"
    ) {

        return review.isCorrect;

    }


    /*
     * Fallback comparison.
     */

    return (
        String(selectedAnswer)
            .trim()
            .toUpperCase() ===
        String(correctAnswer)
            .trim()
            .toUpperCase()
    );

}


/* ============================================================
   GET OPTION TEXT
   ============================================================ */

function getOptionText(
    question,
    review,
    letter
) {

    const key =
        `option${letter}`;


    return (
        question[key] ??
        review[key] ??
        ""
    );

}


/* ============================================================
   RENDER REVIEW
   ============================================================ */

function renderReview(
    data
) {

    const container =
        resultElement(
            "reviewContainer"
        );


    if (!container) return;


    let reviews =
        parsePossibleJSON(
            data.review,
            []
        );


    let questions =
        parsePossibleJSON(
            data.questions,
            []
        );


    if (
        !Array.isArray(reviews)
    ) {

        reviews = [];

    }


    if (
        !Array.isArray(questions)
    ) {

        questions = [];

    }


    if (!reviews.length) {

        container.innerHTML = `
            <div class="review-empty">

                No answer review is available
                for this quiz.

            </div>
        `;

        renderReviewSummary(
            data,
            []
        );

        return;

    }


    /* ========================================================
       RENDER SUMMARY
    ======================================================== */

    renderReviewSummary(
        data,
        reviews
    );


    /* ========================================================
       RENDER QUESTIONS
    ======================================================== */

    container.innerHTML =
        reviews.map(
            function (review, index) {

                const question =
                    questions[index] ||
                    {};


                const questionText =
                    getReviewQuestion(
                        review,
                        question,
                        index
                    );


                const selectedAnswer =
                    getUserAnswer(
                        review
                    );


                const correctAnswer =
                    getCorrectAnswer(
                        review,
                        question
                    );


                const correct =
                    isReviewCorrect(
                        review,
                        selectedAnswer,
                        correctAnswer
                    );


                const options =
                    renderReviewOptions(
                        review,
                        question,
                        selectedAnswer,
                        correctAnswer
                    );


                const selectedDisplay =
                    formatAnswerForDisplay(
                        selectedAnswer,
                        question,
                        review
                    );


                const correctDisplay =
                    formatAnswerForDisplay(
                        correctAnswer,
                        question,
                        review
                    );


                return `
                    <article class="review-question">

                        <div class="review-question-top">

                            <span class="review-question-number">
                                Question ${index + 1}
                            </span>

                            <span
                                class="review-status ${correct ? "correct" : "incorrect"}"
                            >

                                <i class="fa-solid ${
                                    correct
                                        ? "fa-circle-check"
                                        : "fa-circle-xmark"
                                }"></i>

                                ${correct ? "Correct" : "Incorrect"}

                            </span>

                        </div>


                        <div class="review-question-text">

                            ${escapeResultHTML(
                                questionText
                            )}

                        </div>


                        <div class="review-options">

                            ${options}

                        </div>


                        <div class="review-answer-info">

                            <div class="review-answer-box selected-answer">

                                <small>
                                    Your answer
                                </small>

                                <strong>
                                    ${escapeResultHTML(
                                        selectedDisplay || "Not answered"
                                    )}
                                </strong>

                            </div>


                            <div class="review-answer-box correct-answer">

                                <small>
                                    Correct answer
                                </small>

                                <strong>
                                    ${escapeResultHTML(
                                        correctDisplay || "Not available"
                                    )}
                                </strong>

                            </div>

                        </div>

                    </article>
                `;

            }
        ).join("");

}


/* ============================================================
   RENDER REVIEW OPTIONS
   ============================================================ */

function renderReviewOptions(
    review,
    question,
    selectedAnswer,
    correctAnswer
) {

    const letters =
        ["A", "B", "C", "D"];


    return letters.map(
        function (letter) {

            const optionText =
                getOptionText(
                    question,
                    review,
                    letter
                );


            if (!String(optionText).trim()) {

                return "";

            }


            const normalizedSelected =
                String(selectedAnswer)
                    .trim()
                    .toUpperCase();


            const normalizedCorrect =
                String(correctAnswer)
                    .trim()
                    .toUpperCase();


            const isSelected =
                normalizedSelected ===
                letter;


            const isCorrect =
                normalizedCorrect ===
                letter;


            let className =
                "review-option";


            if (isCorrect) {

                className +=
                    " review-correct";

            } else if (
                isSelected &&
                !isCorrect
            ) {

                className +=
                    " review-wrong";

            }


            return `
                <div class="${className}">

                    <span class="review-option-letter">
                        ${letter}
                    </span>

                    <span class="review-option-text">
                        ${escapeResultHTML(
                            optionText
                        )}
                    </span>

                </div>
            `;

        }
    ).join("");

}


/* ============================================================
   FORMAT ANSWER FOR DISPLAY
   ============================================================ */

function formatAnswerForDisplay(
    answer,
    question,
    review
) {

    const value =
        String(answer ?? "")
            .trim();


    if (!value) {

        return "";

    }


    /*
     * If backend stores A/B/C/D,
     * show both letter and actual option text.
     */

    const normalized =
        value.toUpperCase();


    if (
        ["A", "B", "C", "D"].includes(
            normalized
        )
    ) {

        const optionText =
            getOptionText(
                question,
                review,
                normalized
            );


        if (optionText) {

            return `${normalized}. ${optionText}`;

        }


        return normalized;

    }


    return value;

}


/* ============================================================
   REVIEW SUMMARY
   ============================================================ */

function renderReviewSummary(
    data,
    reviews
) {

    const summary =
        resultElement(
            "reviewSummary"
        );


    if (!summary) return;


    const total =
        reviews.length;


    let correctCount = 0;


    reviews.forEach(
        function (review) {

            const selected =
                getUserAnswer(
                    review
                );


            const correct =
                getCorrectAnswer(
                    review,
                    {}
                );


            if (
                isReviewCorrect(
                    review,
                    selected,
                    correct
                )
            ) {

                correctCount++;

            }

        }
    );


    const score =
        data.score ??
        correctCount;


    const points =
        data.pointsEarned ??
        data.points ??
        "0";


    summary.innerHTML = `
        <div class="review-summary-item">

            <small>
                Score
            </small>

            <strong>
                ${escapeResultHTML(score)}
            </strong>

        </div>


        <div class="review-summary-item">

            <small>
                Correct
            </small>

            <strong>
                ${correctCount} / ${total}
            </strong>

        </div>


        <div class="review-summary-item">

            <small>
                Points earned
            </small>

            <strong>
                +${escapeResultHTML(points)}
            </strong>

        </div>
    `;


    summary.classList.add(
        "show"
    );

}


/* ============================================================
   CLOSE REVIEW
   ============================================================ */

function closeReview() {

    hideResultElement(
        "reviewSection"
    );


    selectedReviewLesson =
        "";


    currentReviewData =
        null;


    const summary =
        resultElement(
            "reviewSummary"
        );


    if (summary) {

        summary.innerHTML = "";

        summary.classList.remove(
            "show"
        );

    }

}


/* ============================================================
   EVENT LISTENERS
   ============================================================ */

function setupResultsListeners() {

    const closeReviewBtn =
        resultElement(
            "closeReviewBtn"
        );


    const latestReviewBtn =
        resultElement(
            "latestReviewBtn"
        );


    /* ========================================================
       CLOSE REVIEW
    ======================================================== */

    if (closeReviewBtn) {

        closeReviewBtn.addEventListener(
            "click",
            closeReview
        );

    }


    /* ========================================================
       LATEST REVIEW
    ======================================================== */

    if (latestReviewBtn) {

        latestReviewBtn.addEventListener(
            "click",
            function () {

                const lesson =
                    latestReviewBtn.dataset.lesson ||
                    queryLessonNo;


                openReview(
                    lesson
                );

            }
        );

    }


    /* ========================================================
       HISTORY REVIEW BUTTONS
    ======================================================== */

    document.addEventListener(
        "click",
        function (event) {

            const button =
                event.target.closest(
                    "[data-review-lesson]"
                );


            if (!button) return;


            const lesson =
                button.dataset.reviewLesson;


            openReview(
                lesson
            );

        }
    );

}


/* ============================================================
   RESULT MESSAGE
   ============================================================ */

function showResultsMessage(
    message
) {

    const element =
        resultElement(
            "resultsMessage"
        );


    if (!element) return;


    element.textContent =
        message;


    element.classList.remove(
        "hidden"
    );


    element.classList.add(
        "show"
    );

}


function hideResultsMessage() {

    const element =
        resultElement(
            "resultsMessage"
        );


    if (!element) return;


    element.classList.add(
        "hidden"
    );


    element.classList.remove(
        "show"
    );

}


/* ============================================================
   DATE FORMATTER
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
            month: "short",
            year: "numeric"
        }
    );

}
