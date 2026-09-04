/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: results.js
   PURPOSE: SLC QUIZ RESULTS + HISTORY + ANSWER REVIEW
============================================================ */

"use strict";


/* ============================================================
   API
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

let isLoadingHistory = false;

let isLoadingReview = false;


/* ============================================================
   PAGE START
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


        setupResultsListeners();

        await identifyMember();

    }
);


/* ============================================================
   DOM HELPERS
============================================================ */

function resultElement(id) {

    return document.getElementById(id);

}


function showResultElement(id) {

    const element = resultElement(id);

    if (!element) return;

    element.classList.remove("hidden");

}


function hideResultElement(id) {

    const element = resultElement(id);

    if (!element) return;

    element.classList.add("hidden");

}


/* ============================================================
   HTML ESCAPE
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
   IDENTIFY PARTICIPANT
============================================================ */

async function identifyMember() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    queryLessonNo =
        String(
            params.get("lessonNo") || ""
        ).trim();


    /* --------------------------------------------------------
       1. URL MEMBER ID
    -------------------------------------------------------- */

    memberId =
        String(
            params.get("memberId") || ""
        ).trim();


    /* --------------------------------------------------------
       2. SLC SESSION
    -------------------------------------------------------- */

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
                        String(
                            parsed.memberId
                        ).trim();


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


    /* --------------------------------------------------------
       3. SAVED MEMBER
    -------------------------------------------------------- */

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
                        String(
                            parsed.memberId
                        ).trim();


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


    /* --------------------------------------------------------
       NO PARTICIPANT
    -------------------------------------------------------- */

    if (!memberId) {

        updateMemberDisplay(
            "No participant selected"
        );


        showResultsMessage(
            "Please return to the SLC Quiz page and select your name first."
        );


        hideResultElement(
            "latestResult"
        );


        hideResultElement(
            "reviewSection"
        );


        showEmptyResults(
            "No participant session",
            "Select your name on the SLC Quiz page to view your results."
        );


        return;

    }


    updateMemberDisplay();

    await loadQuizHistory();

}


/* ============================================================
   MEMBER DISPLAY
============================================================ */

function updateMemberDisplay(
    customText
) {

    const element =
        resultElement(
            "resultsMember"
        );


    if (!element) return;


    const displayName =
        customText ||
        memberName ||
        "My Results";


    element.innerHTML = `

        <i class="fa-solid fa-lock"></i>

        <span>
            ${escapeResultHTML(displayName)}
        </span>

    `;

}


/* ============================================================
   LOAD QUIZ HISTORY
============================================================ */

async function loadQuizHistory() {

    if (
        isLoadingHistory ||
        !memberId
    ) {

        return;

    }


    isLoadingHistory = true;


    showResultsMessage(
        "Loading your quiz results..."
    );


    try {

        const url =
            `${RESULTS_API}` +
            `?action=getMemberQuizHistory` +
            `&memberId=${encodeURIComponent(memberId)}`;


        const response =
            await fetch(
                url,
                {
                    method: "GET",
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
            "Quiz history:",
            data
        );


        /* ----------------------------------------------------
           BACKEND ERROR
        ---------------------------------------------------- */

        if (!data.success) {

            const message =
                String(
                    data.message ||
                    "Unable to load your results."
                );


            console.error(
                "Quiz history backend error:",
                message
            );


            if (
                message
                    .toLowerCase()
                    .includes(
                        "participant could not be found"
                    )
            ) {

                updateMemberDisplay(
                    "Participant session needs updating"
                );


                showResultsMessage(
                    "Your saved participant session is no longer valid. Please return to the SLC Quiz page and select your name again."
                );


                showEmptyResults(
                    "Participant not found",
                    "Your saved participant information could not be matched with the current participant list."
                );


                hideResultElement(
                    "latestResult"
                );


                hideResultElement(
                    "reviewSection"
                );


                return;

            }


            showResultsMessage(
                message
            );


            return;

        }


        /* ----------------------------------------------------
           UPDATE MEMBER NAME
        ---------------------------------------------------- */

        if (data.memberName) {

            memberName =
                String(
                    data.memberName
                ).trim();


            updateMemberDisplay();

            saveResultsMember();

        }


        /* ----------------------------------------------------
           RESULTS
        ---------------------------------------------------- */

        historyData =
            Array.isArray(data.results)
                ? data.results
                : [];


        hideResultsMessage();


        renderHistory();

        renderLatestResult();


    } catch (error) {

        console.error(
            "loadQuizHistory error:",
            error
        );


        showResultsMessage(
            "Unable to load your results right now. Please check your connection and try again."
        );


    } finally {

        isLoadingHistory = false;

    }

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

                memberId:
                    memberId,

                memberName:
                    memberName

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
   RENDER HISTORY
============================================================ */

function renderHistory() {

    const list =
        resultElement(
            "historyList"
        );


    const count =
        resultElement(
            "historyCount"
        );


    if (!list) return;


    const quizCount =
        historyData.length;


    if (count) {

        count.textContent =
            `${quizCount} ${
                quizCount === 1
                    ? "quiz"
                    : "quizzes"
            }`;

    }


    if (!historyData.length) {

        list.innerHTML = "";

        showEmptyResults(
            "NO RESULTS YET",
            "Complete your first SLC quiz and your result will appear here."
        );


        hideResultElement(
            "latestResult"
        );


        return;

    }


    hideResultElement(
        "emptyResults"
    );


    list.innerHTML =
        historyData
            .map(
                function (
                    result,
                    index
                ) {

                    const lesson =
                        String(
                            result.lessonNo ??
                            result.lesson ??
                            ""
                        ).trim();


                    const score =
                        formatScoreForHistory(
                            result.score ??
                            "-"
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
                                        Score: ${score}
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

                                Review

                            </button>

                        </div>

                    `;

                }
            )
            .join("");

}


/* ============================================================
   RENDER LATEST RESULT
============================================================ */

function renderLatestResult(
    submittedLesson
) {

    const latest =
        resultElement(
            "latestResult"
        );


    if (!latest) return;


    if (!historyData.length) {

        hideResultElement(
            "latestResult"
        );

        return;

    }


    let result = null;


    const exactLesson =
        String(
            submittedLesson ||
            queryLessonNo ||
            ""
        ).trim();


    /* --------------------------------------------------------
       Prefer requested lesson
    -------------------------------------------------------- */

    if (exactLesson) {

        result =
            historyData.find(
                function (item) {

                    return (
                        String(
                            item.lessonNo ??
                            item.lesson ??
                            ""
                        ).trim() ===
                        exactLesson
                    );

                }
            ) || null;

    }


    /* --------------------------------------------------------
       Otherwise newest result
    -------------------------------------------------------- */

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
        String(
            result.lessonNo ??
            result.lesson ??
            ""
        ).trim();


    const score =
        result.score ??
        "-";


    const points =
        result.pointsEarned ??
        result.points ??
        "0";


    const date =
        formatDate(
            result.timestamp ??
            result.date ??
            result.createdAt
        );


    const title =
        resultElement(
            "latestTitle"
        );


    const lessonElement =
        resultElement(
            "latestLesson"
        );


    const scoreElement =
        resultElement(
            "latestScore"
        );


    const totalElement =
        resultElement(
            "latestTotal"
        );


    const pointsElement =
        resultElement(
            "latestPoints"
        );


    const dateElement =
        resultElement(
            "latestDate"
        );


    const reviewButton =
        resultElement(
            "latestReviewBtn"
        );


    if (title) {

        title.textContent =
            `Lesson ${lesson} Result`;

    }


    if (lessonElement) {

        lessonElement.textContent =
            `Lesson ${lesson}`;

    }


    /* --------------------------------------------------------
       SCORE
    -------------------------------------------------------- */

    const parsedScore =
        parseScore(
            score
        );


    if (scoreElement) {

        scoreElement.textContent =
            parsedScore.value;

    }


    if (totalElement) {

        totalElement.textContent =
            parsedScore.total
                ? `/ ${parsedScore.total}`
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
   SCORE PARSER
============================================================ */

function parseScore(
    value
) {

    const raw =
        String(
            value ?? ""
        ).trim();


    const match =
        raw.match(
            /^(\d+)\s*\/\s*(\d+)$/
        );


    if (match) {

        return {

            value: match[1],

            total: match[2]

        };

    }


    return {

        value:
            raw || "—",

        total:
            ""

    };

}


/* ============================================================
   HISTORY SCORE
============================================================ */

function formatScoreForHistory(
    value
) {

    const parsed =
        parseScore(
            value
        );


    if (
        parsed.total
    ) {

        return `${parsed.value}/${parsed.total}`;

    }


    return escapeResultHTML(
        parsed.value
    );

}


/* ============================================================
   OPEN ANSWER REVIEW
============================================================ */

async function openReview(
    lessonNo
) {

    const lesson =
        String(
            lessonNo || ""
        ).trim();


    if (
        !memberId ||
        !lesson ||
        isLoadingReview
    ) {

        return;

    }


    selectedReviewLesson =
        lesson;


    showResultElement(
        "reviewSection"
    );


    const title =
        resultElement(
            "reviewTitle"
        );


    const subtitle =
        resultElement(
            "reviewSubtitle"
        );


    const container =
        resultElement(
            "reviewContainer"
        );


    if (title) {

        title.textContent =
            `Lesson ${lesson} Answer Review`;

    }


    if (subtitle) {

        subtitle.textContent =
            "Loading your submitted answers...";

    }


    if (container) {

        container.innerHTML = `

            <div class="review-loading">

                <i class="fa-solid fa-spinner fa-spin"></i>

                Loading your answer review...

            </div>

        `;

    }


    isLoadingReview = true;


    try {

        const url =
            `${RESULTS_API}` +
            `?action=getQuizReview` +
            `&memberId=${encodeURIComponent(memberId)}` +
            `&lessonNo=${encodeURIComponent(lesson)}`;


        const response =
            await fetch(
                url,
                {
                    method: "GET",
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
            "Quiz review:",
            data
        );


        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to load review."
            );

        }


        if (subtitle) {

            subtitle.textContent =
                "Your submitted answers for this quiz.";

        }


        renderReview(
            data
        );


        const review =
            resultElement(
                "reviewSection"
            );


        if (review) {

            setTimeout(
                function () {

                    review.scrollIntoView({

                        behavior: "smooth",

                        block: "start"

                    });

                },
                100
            );

        }


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

                    <i class="fa-solid fa-circle-exclamation"></i>

                    <br><br>

                    Unable to load your answer review.

                    <br>

                    Please try again.

                </div>

            `;

        }


    } finally {

        isLoadingReview = false;

    }

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
        Array.isArray(
            data.review
        )
            ? data.review
            : [];


    let questions =
        Array.isArray(
            data.questions
        )
            ? data.questions
            : [];


    /* --------------------------------------------------------
       BACKEND MAY RETURN JSON STRINGS
    -------------------------------------------------------- */

    if (
        typeof data.review ===
        "string"
    ) {

        try {

            reviews =
                JSON.parse(
                    data.review
                );

        } catch (error) {

            reviews = [];

        }

    }


    if (
        typeof data.questions ===
        "string"
    ) {

        try {

            questions =
                JSON.parse(
                    data.questions
                );

        } catch (error) {

            questions = [];

        }

    }


    if (
        !Array.isArray(reviews) ||
        !reviews.length
    ) {

        container.innerHTML = `

            <div class="review-empty">

                No answer review is available for this quiz.

            </div>

        `;


        return;

    }


    container.innerHTML =
        reviews
            .map(
                function (
                    review,
                    index
                ) {

                    const question =
                        questions[index] ||
                        {};


                    const questionText =
                        review.question ||
                        question.question ||
                        `Question ${index + 1}`;


                    const selectedAnswer =
                        review.userAnswer ??
                        review.selectedAnswer ??
                        review.answer ??
                        review.selected ??
                        "";


                    const correctAnswer =
                        review.correctAnswer ??
                        review.correct ??
                        question.correctAnswer ??
                        question.correct ??
                        "";


                    const options =
                        buildReviewOptions(
                            question,
                            selectedAnswer,
                            correctAnswer
                        );


                    const calculatedCorrect =
                        isAnswerCorrect(
                            review,
                            selectedAnswer,
                            correctAnswer,
                            question
                        );


                    const statusClass =
                        calculatedCorrect
                            ? "review-result-correct"
                            : "review-result-wrong";


                    const statusIcon =
                        calculatedCorrect
                            ? "fa-circle-check"
                            : "fa-circle-xmark";


                    const statusText =
                        calculatedCorrect
                            ? "Correct"
                            : "Incorrect";


                    const selectedLetter =
                        findAnswerLetter(
                            selectedAnswer,
                            question
                        );


                    const correctLetter =
                        findAnswerLetter(
                            correctAnswer,
                            question
                        );


                    return `

                        <article class="review-question">

                            <div class="review-question-top">

                                <span class="review-question-number">

                                    QUESTION ${String(
                                        index + 1
                                    ).padStart(
                                        2,
                                        "0"
                                    )}

                                </span>


                                <span
                                    class="review-result-badge ${statusClass}"
                                >

                                    <i
                                        class="fa-solid ${statusIcon}"
                                    ></i>

                                    ${statusText}

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


                            <div class="review-answer-summary">

                                <span
                                    class="
                                        review-answer-chip
                                        ${
                                            calculatedCorrect
                                                ? "review-your-answer correct-answer"
                                                : "review-your-answer"
                                        }
                                    "
                                >

                                    <i class="fa-solid fa-user"></i>

                                    Your answer:

                                    ${
                                        escapeResultHTML(
                                            selectedLetter ||
                                            selectedAnswer ||
                                            "Not answered"
                                        )
                                    }

                                </span>


                                <span
                                    class="
                                        review-answer-chip
                                        review-correct-answer
                                    "
                                >

                                    <i class="fa-solid fa-check"></i>

                                    Correct answer:

                                    ${
                                        escapeResultHTML(
                                            correctLetter ||
                                            correctAnswer ||
                                            "Not available"
                                        )
                                    }

                                </span>

                            </div>

                        </article>

                    `;

                }
            )
            .join("");

}


/* ============================================================
   BUILD REVIEW OPTIONS
============================================================ */

function buildReviewOptions(
    question,
    selectedAnswer,
    correctAnswer
) {

    const letters =
        [
            "A",
            "B",
            "C",
            "D"
        ];


    return letters
        .map(
            function (letter) {

                const optionText =
                    question[
                        `option${letter}`
                    ];


                if (
                    optionText ===
                    undefined ||
                    optionText ===
                    null ||
                    String(optionText).trim() === ""
                ) {

                    return "";

                }


                const selected =
                    answerMatches(
                        selectedAnswer,
                        letter,
                        optionText
                    );


                const correct =
                    answerMatches(
                        correctAnswer,
                        letter,
                        optionText
                    );


                let className =
                    "review-option";


                if (correct) {

                    className +=
                        " review-correct";

                } else if (selected) {

                    className +=
                        " review-wrong";

                }


                return `

                    <div
                        class="${className}"
                    >

                        <span
                            class="review-option-letter"
                        >

                            ${letter}

                        </span>


                        <span
                            class="review-option-text"
                        >

                            ${escapeResultHTML(
                                optionText
                            )}

                        </span>

                    </div>

                `;

            }
        )
        .join("");

}


/* ============================================================
   ANSWER MATCHING
============================================================ */

function answerMatches(
    answer,
    letter,
    optionText
) {

    const normalizedAnswer =
        normalizeAnswer(
            answer
        );


    const normalizedLetter =
        normalizeAnswer(
            letter
        );


    const normalizedOption =
        normalizeAnswer(
            optionText
        );


    if (!normalizedAnswer) {

        return false;

    }


    if (
        normalizedAnswer ===
        normalizedLetter
    ) {

        return true;

    }


    if (
        normalizedAnswer ===
        normalizedOption
    ) {

        return true;

    }


    return false;

}


/* ============================================================
   NORMALIZE ANSWER
============================================================ */

function normalizeAnswer(
    value
) {

    return String(
        value ?? ""
    )
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();

}


/* ============================================================
   FIND ANSWER LETTER
============================================================ */

function findAnswerLetter(
    answer,
    question
) {

    const normalized =
        normalizeAnswer(
            answer
        );


    if (!normalized) {

        return "";

    }


    if (
        [
            "A",
            "B",
            "C",
            "D"
        ].includes(
            normalized
        )
    ) {

        return normalized;

    }


    const letters =
        [
            "A",
            "B",
            "C",
            "D"
        ];


    for (
        const letter of letters
    ) {

        const optionText =
            question[
                `option${letter}`
            ];


        if (
            optionText &&
            normalizeAnswer(
                optionText
            ) === normalized
        ) {

            return letter;

        }

    }


    return "";

}


/* ============================================================
   DETERMINE CORRECTNESS
============================================================ */

function isAnswerCorrect(
    review,
    selectedAnswer,
    correctAnswer,
    question
) {

    if (
        review &&
        (
            review.correct === true ||
            String(
                review.correct
            ).toLowerCase() ===
            "true"
        )
    ) {

        return true;

    }


    const selectedLetter =
        findAnswerLetter(
            selectedAnswer,
            question
        );


    const correctLetter =
        findAnswerLetter(
            correctAnswer,
            question
        );


    if (
        selectedLetter &&
        correctLetter
    ) {

        return (
            selectedLetter ===
            correctLetter
        );

    }


    return (
        normalizeAnswer(
            selectedAnswer
        ) ===
        normalizeAnswer(
            correctAnswer
        )
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


    const review =
        resultElement(
            "reviewSection"
        );


    if (review) {

        review.scrollIntoView({

            behavior: "smooth",

            block: "start"

        });

    }

}


/* ============================================================
   RESULTS EVENT LISTENERS
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


    /* --------------------------------------------------------
       CLOSE REVIEW
    -------------------------------------------------------- */

    if (closeReviewBtn) {

        closeReviewBtn.addEventListener(
            "click",
            closeReview
        );

    }


    /* --------------------------------------------------------
       LATEST REVIEW
    -------------------------------------------------------- */

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


    /* --------------------------------------------------------
       HISTORY REVIEW
       ONE DELEGATED LISTENER ONLY
    -------------------------------------------------------- */

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


            if (!lesson) return;


            openReview(
                lesson
            );

        }
    );

}


/* ============================================================
   EMPTY RESULTS STATE
============================================================ */

function showEmptyResults(
    title,
    description
) {

    const empty =
        resultElement(
            "emptyResults"
        );


    if (!empty) return;


    const titleElement =
        empty.querySelector(
            "h2"
        );


    const descriptionElement =
        empty.querySelector(
            "p"
        );


    const eyebrow =
        empty.querySelector(
            ":scope > span"
        );


    if (eyebrow) {

        eyebrow.textContent =
            title ||
            "NO RESULTS YET";

    }


    if (titleElement) {

        titleElement.textContent =
            title === "NO RESULTS YET"
                ? "Your quiz journey starts here."
                : title;

    }


    if (descriptionElement) {

        descriptionElement.textContent =
            description ||
            "Complete your first SLC quiz and your result will appear here.";

    }


    showResultElement(
        "emptyResults"
    );

}


/* ============================================================
   SHOW MESSAGE
============================================================ */

function showResultsMessage(
    message
) {

    const element =
        resultElement(
            "resultsMessage"
        );


    if (!element) return;


    element.innerHTML = `

        <i class="fa-solid fa-circle-info"></i>

        <span>
            ${escapeResultHTML(message)}
        </span>

    `;


    element.classList.remove(
        "hidden"
    );

}


/* ============================================================
   HIDE MESSAGE
============================================================ */

function hideResultsMessage() {

    const element =
        resultElement(
            "resultsMessage"
        );


    if (!element) return;


    element.classList.add(
        "hidden"
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
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(
            value
        );

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
