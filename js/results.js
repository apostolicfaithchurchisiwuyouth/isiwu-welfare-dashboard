/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: results.js
   PURPOSE:
   SLC RESULTS + QUIZ HISTORY CONTROLLER

   RESULTS FLOW:

   1. Identify participant.
   2. Load every completed quiz for that participant.
   3. Display summary statistics.
   4. Highlight the latest or requested lesson result.
   5. Display complete quiz history.
   6. Allow answer review for every completed quiz.

   MEMBER IDENTIFICATION PRIORITY:

   1. URL memberId
   2. Active quiz session
   3. Saved local member
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


/* ============================================================
   DOM READY
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

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

    const element =
        resultElement(id);


    if (element) {

        element.classList.remove(
            "hidden"
        );

    }

}


function hideResultElement(id) {

    const element =
        resultElement(id);


    if (element) {

        element.classList.add(
            "hidden"
        );

    }

}


/* ============================================================
   SAFE HTML
============================================================ */

function escapeResultHTML(value) {

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
   NUMBER HELPERS
============================================================ */

function getNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return 0;

    }


    const cleaned =
        String(value)
            .replace(
                /,/g,
                ""
            )
            .replace(
                /[^0-9.-]/g,
                ""
            );


    const number =
        Number(cleaned);


    return Number.isFinite(number)
        ? number
        : 0;

}


function formatNumber(value) {

    const number =
        getNumber(value);


    return number.toLocaleString(
        "en-NG"
    );

}


/* ============================================================
   RESULT HELPERS
============================================================ */

function getLessonNumber(result) {

    return String(
        result.lessonNo ??
        result.lesson ??
        result.lessonNumber ??
        ""
    ).trim();

}


function getResultScore(result) {

    return result.score ??
        result.correctAnswers ??
        result.correct ??
        0;

}


function getResultPoints(result) {

    return result.pointsEarned ??
        result.points ??
        result.totalPointsEarned ??
        0;

}


function getResultTotal(result) {

    return result.totalQuestions ??
        result.total ??
        result.questionCount ??
        result.maxScore ??
        "";

}


function getResultDate(result) {

    return result.timestamp ??
        result.date ??
        result.createdAt ??
        result.submittedAt ??
        "";

}


/* ============================================================
   IDENTIFY MEMBER
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


    /*
     * ========================================================
     * PRIORITY 1
     * URL MEMBER ID
     * ========================================================
     */

    memberId =
        String(
            params.get("memberId") || ""
        ).trim();


    /*
     * ========================================================
     * PRIORITY 2
     * ACTIVE QUIZ SESSION
     * ========================================================
     */

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
                            parsed.memberName ||
                            parsed.name ||
                            ""
                        ).trim();

                }

            }

        }
        catch (error) {

            console.warn(
                "Unable to read SLC session.",
                error
            );

        }

    }


    /*
     * ========================================================
     * PRIORITY 3
     * SAVED MEMBER
     * ========================================================
     */

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
                            parsed.memberName ||
                            parsed.name ||
                            ""
                        ).trim();

                }

            }

        }
        catch (error) {

            console.warn(
                "Unable to read saved member.",
                error
            );

        }

    }


    /*
     * ========================================================
     * NO MEMBER FOUND
     * ========================================================
     */

    if (!memberId) {

        handleNoMember();

        return;

    }


    updateMemberDisplay();

    await loadQuizHistory();

}


/* ============================================================
   HANDLE NO MEMBER
============================================================ */

function handleNoMember() {

    hideResultsMessage();

    hideResultElement(
        "resultsSummary"
    );

    hideResultElement(
        "latestResult"
    );

    hideResultElement(
        "historySection"
    );

    hideResultElement(
        "reviewSection"
    );

    hideResultElement(
        "emptyResults"
    );

    showResultElement(
        "noMemberResults"
    );


    const memberNameElement =
        resultElement(
            "resultsMemberName"
        );


    if (memberNameElement) {

        memberNameElement.textContent =
            "Participant not selected";

    }

}


/* ============================================================
   MEMBER DISPLAY
============================================================ */

function updateMemberDisplay() {

    const memberNameElement =
        resultElement(
            "resultsMemberName"
        );


    if (!memberNameElement) {

        return;

    }


    memberNameElement.textContent =
        memberName ||
        "My Results";

}


/* ============================================================
   LOAD QUIZ HISTORY
============================================================ */

async function loadQuizHistory() {

    showResultsMessage(
        "Loading your quiz history..."
    );


    hideResultElement(
        "noMemberResults"
    );


    try {

        const response =
            await fetch(
                `${RESULTS_API}?action=getMemberQuizHistory&memberId=${encodeURIComponent(memberId)}`
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Quiz history response:",
            data
        );


        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to load your results."
            );

        }


        /*
         * Update member name returned
         * from the backend.
         */

        if (data.memberName) {

            memberName =
                String(
                    data.memberName
                ).trim();


            updateMemberDisplay();

            saveResultsMember();

        }


        /*
         * Get results safely.
         */

        historyData =
            Array.isArray(
                data.results
            )
                ? data.results
                : [];


        /*
         * Sort results.
         *
         * Newest first where a valid date exists.
         * If dates cannot be compared, original
         * backend order is maintained.
         */

        historyData =
            sortHistory(
                historyData
            );


        hideResultsMessage();


        renderSummary();

        renderHistory();

        renderLatestResult();

    }
    catch (error) {

        console.error(
            "loadQuizHistory error:",
            error
        );


        hideResultElement(
            "resultsSummary"
        );

        hideResultElement(
            "latestResult"
        );


        showResultsMessage(
            "Unable to load your results. Please check your connection and try again."
        );

    }

}


/* ============================================================
   SORT HISTORY
============================================================ */

function sortHistory(results) {

    if (!Array.isArray(results)) {

        return [];

    }


    return [
        ...results
    ].sort(
        function (
            first,
            second
        ) {

            const firstDate =
                new Date(
                    getResultDate(first)
                );


            const secondDate =
                new Date(
                    getResultDate(second)
                );


            const firstTime =
                Number.isNaN(
                    firstDate.getTime()
                )
                    ? 0
                    : firstDate.getTime();


            const secondTime =
                Number.isNaN(
                    secondDate.getTime()
                )
                    ? 0
                    : secondDate.getTime();


            return (
                secondTime -
                firstTime
            );

        }
    );

}


/* ============================================================
   SAVE MEMBER
============================================================ */

function saveResultsMember() {

    if (!memberId) {

        return;

    }


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

    }
    catch (error) {

        console.warn(
            "Unable to save results member.",
            error
        );

    }

}


/* ============================================================
   RENDER SUMMARY
============================================================ */

function renderSummary() {

    if (!historyData.length) {

        hideResultElement(
            "resultsSummary"
        );

        return;

    }


    showResultElement(
        "resultsSummary"
    );


    const quizCount =
        historyData.length;


    const totalPoints =
        historyData.reduce(
            function (
                total,
                result
            ) {

                return (
                    total +
                    getNumber(
                        getResultPoints(result)
                    )
                );

            },
            0
        );


    const bestScore =
        historyData.reduce(
            function (
                highest,
                result
            ) {

                const score =
                    getNumber(
                        getResultScore(result)
                    );


                return Math.max(
                    highest,
                    score
                );

            },
            0
        );


    const quizCountElement =
        resultElement(
            "summaryQuizCount"
        );


    const pointsElement =
        resultElement(
            "summaryPoints"
        );


    const bestScoreElement =
        resultElement(
            "summaryBestScore"
        );


    if (quizCountElement) {

        quizCountElement.textContent =
            quizCount;

    }


    if (pointsElement) {

        pointsElement.textContent =
            formatNumber(
                totalPoints
            );

    }


    if (bestScoreElement) {

        bestScoreElement.textContent =
            bestScore;

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


    if (!list) {

        return;

    }


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


    /*
     * ========================================================
     * EMPTY HISTORY
     * ========================================================
     */

    if (!historyData.length) {

        list.innerHTML = "";

        hideResultElement(
            "resultsSummary"
        );

        hideResultElement(
            "latestResult"
        );

        showResultElement(
            "emptyResults"
        );

        return;

    }


    hideResultElement(
        "emptyResults"
    );


    /*
     * ========================================================
     * RENDER EVERY QUIZ
     * ========================================================
     */

    list.innerHTML =
        historyData
            .map(
                function (
                    result,
                    index
                ) {

                    const lesson =
                        getLessonNumber(
                            result
                        );


                    const score =
                        getResultScore(
                            result
                        );


                    const points =
                        getResultPoints(
                            result
                        );


                    const total =
                        getResultTotal(
                            result
                        );


                    const date =
                        formatDate(
                            getResultDate(
                                result
                            )
                        );


                    const scoreText =
                        total
                            ? `${score} / ${total}`
                            : score;


                    return `

                        <article
                            class="history-item"
                        >

                            <div
                                class="history-number"
                            >
                                ${index + 1}
                            </div>


                            <div
                                class="history-main"
                            >

                                <div
                                    class="history-top"
                                >

                                    <strong
                                        class="history-title"
                                    >
                                        ${
                                            lesson
                                                ? `Lesson ${escapeResultHTML(lesson)}`
                                                : "Sunday Lesson Challenge"
                                        }
                                    </strong>


                                    <span
                                        class="history-date"
                                    >
                                        ${escapeResultHTML(date)}
                                    </span>

                                </div>


                                <div
                                    class="history-score"
                                >

                                    <span
                                        class="history-score-item"
                                    >

                                        Score:

                                        <strong>
                                            ${escapeResultHTML(scoreText)}
                                        </strong>

                                    </span>


                                    <span
                                        class="history-score-item"
                                    >

                                        Points:

                                        <strong>
                                            +${escapeResultHTML(formatNumber(points))}
                                        </strong>

                                    </span>

                                </div>

                            </div>


                            <button
                                type="button"
                                class="history-review-btn"
                                data-review-lesson="${escapeResultHTML(lesson)}"
                            >

                                <span>
                                    Review
                                </span>

                                <i
                                    class="fa-solid fa-arrow-right"
                                ></i>

                            </button>

                        </article>

                    `;

                }
            )
            .join("");

}


/* ============================================================
   FIND RESULT FOR LESSON
============================================================ */

function findResultByLesson(lessonNo) {

    const lesson =
        String(
            lessonNo || ""
        ).trim();


    if (!lesson) {

        return null;

    }


    return (
        historyData.find(
            function (item) {

                return (
                    getLessonNumber(item) ===
                    lesson
                );

            }
        )
        || null
    );

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


    if (!latest) {

        return;

    }


    if (!historyData.length) {

        hideResultElement(
            "latestResult"
        );

        return;

    }


    /*
     * First priority:
     *
     * The lesson supplied after submission
     * or from the URL.
     */

    const requestedLesson =
        String(
            submittedLesson ||
            queryLessonNo ||
            ""
        ).trim();


    let result =
        requestedLesson
            ? findResultByLesson(
                requestedLesson
            )
            : null;


    /*
     * Otherwise use the newest result.
     */

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
        getLessonNumber(
            result
        );


    const score =
        getResultScore(
            result
        );


    const points =
        getResultPoints(
            result
        );


    const total =
        getResultTotal(
            result
        );


    const date =
        formatDate(
            getResultDate(
                result
            )
        );


    const performance =
        getPerformanceText(
            score,
            total
        );


    const note =
        getPerformanceNote(
            score,
            total
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


    const performanceElement =
        resultElement(
            "latestPerformance"
        );


    const dateElement =
        resultElement(
            "latestDate"
        );


    const noteElement =
        resultElement(
            "latestNote"
        );


    const reviewButton =
        resultElement(
            "latestReviewBtn"
        );


    if (title) {

        title.textContent =
            lesson
                ? `Lesson ${lesson} Result`
                : "Your Latest Result";

    }


    if (lessonElement) {

        lessonElement.textContent =
            lesson
                ? `Lesson ${lesson}`
                : "Latest Quiz";

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
            `+${formatNumber(points)}`;

    }


    if (performanceElement) {

        performanceElement.textContent =
            performance;

    }


    if (dateElement) {

        dateElement.textContent =
            date
                ? `Completed on ${date}`
                : "Quiz completed";

    }


    if (noteElement) {

        noteElement.textContent =
            note;

    }


    if (reviewButton) {

        reviewButton.dataset.lesson =
            lesson;

    }

}


/* ============================================================
   PERFORMANCE TEXT
============================================================ */

function getPerformancePercentage(
    score,
    total
) {

    const scoreNumber =
        getNumber(score);


    const totalNumber =
        getNumber(total);


    if (
        totalNumber <= 0
    ) {

        return null;

    }


    return Math.round(
        (
            scoreNumber /
            totalNumber
        ) * 100
    );

}


function getPerformanceText(
    score,
    total
) {

    const percentage =
        getPerformancePercentage(
            score,
            total
        );


    if (
        percentage === null
    ) {

        return "Completed";

    }


    return `${percentage}%`;

}


function getPerformanceNote(
    score,
    total
) {

    const percentage =
        getPerformancePercentage(
            score,
            total
        );


    if (
        percentage === null
    ) {

        return (
            "Well done for completing this Sunday Lesson Challenge."
        );

    }


    if (
        percentage >= 90
    ) {

        return (
            "Excellent work! You showed a very strong understanding of the lesson."
        );

    }


    if (
        percentage >= 70
    ) {

        return (
            "Well done! You demonstrated a good understanding of the lesson."
        );

    }


    if (
        percentage >= 50
    ) {

        return (
            "Good effort. Reviewing the lesson again can help you grow even more."
        );

    }


    return (
        "Keep learning. Review the lesson and use the answer review to strengthen your understanding."
    );

}


/* ============================================================
   OPEN REVIEW
============================================================ */

async function openReview(lessonNo) {

    const lesson =
        String(
            lessonNo || ""
        ).trim();


    if (!memberId) {

        return;

    }


    if (!lesson) {

        showResultsMessage(
            "This quiz does not have a lesson number available for review."
        );

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

                <i
                    class="fa-solid fa-spinner fa-spin"
                ></i>

                <span>
                    Loading answer review...
                </span>

            </div>

        `;

    }


    try {

        const response =
            await fetch(
                `${RESULTS_API}?action=getQuizReview&memberId=${encodeURIComponent(memberId)}&lessonNo=${encodeURIComponent(lesson)}`
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Quiz review response:",
            data
        );


        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to load answer review."
            );

        }


        if (subtitle) {

            subtitle.textContent =
                "See what you selected and compare it with the correct answer.";

        }


        renderReview(
            data
        );


        setTimeout(
            function () {

                const review =
                    resultElement(
                        "reviewSection"
                    );


                if (review) {

                    review.scrollIntoView({

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
    catch (error) {

        console.error(
            "openReview error:",
            error
        );


        if (subtitle) {

            subtitle.textContent =
                "We could not load this answer review.";

        }


        if (container) {

            container.innerHTML = `

                <div class="review-empty">

                    <i
                        class="fa-solid fa-circle-exclamation"
                    ></i>

                    <span>
                        Unable to load your answer review.
                        Please check your connection and try again.
                    </span>

                </div>

            `;

        }

    }

}


/* ============================================================
   NORMALIZE ARRAY DATA
============================================================ */

function parseResultArray(value) {

    if (
        Array.isArray(value)
    ) {

        return value;

    }


    if (
        typeof value === "string"
    ) {

        try {

            const parsed =
                JSON.parse(value);


            return Array.isArray(parsed)
                ? parsed
                : [];

        }
        catch (error) {

            return [];

        }

    }


    return [];

}


/* ============================================================
   GET OPTION TEXT
============================================================ */

function getOptionText(
    source,
    letter
) {

    if (!source) {

        return "";

    }


    return (

        source[
            `option${letter}`
        ]

        ||

        source[
            `Option${letter}`
        ]

        ||

        source[
            letter
        ]

        ||

        ""

    );

}


/* ============================================================
   NORMALIZE ANSWER
============================================================ */

function normalizeAnswer(value) {

    return String(
        value ?? ""
    )
        .trim()
        .toUpperCase();

}


/* ============================================================
   RENDER REVIEW
============================================================ */

function renderReview(data) {

    const container =
        resultElement(
            "reviewContainer"
        );


    if (!container) {

        return;

    }


    const reviews =
        parseResultArray(
            data.review
        );


    const questions =
        parseResultArray(
            data.questions
        );


    if (!reviews.length) {

        container.innerHTML = `

            <div class="review-empty">

                <i
                    class="fa-solid fa-clipboard-question"
                ></i>

                <span>
                    No answer review is available for this quiz.
                </span>

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
                        review.questionText ||
                        question.question ||
                        question.questionText ||
                        `Question ${index + 1}`;


                    const selectedAnswer =
                        normalizeAnswer(

                            review.selectedAnswer ||

                            review.answer ||

                            review.selected ||

                            ""

                        );


                    const correctAnswer =
                        normalizeAnswer(

                            review.correctAnswer ||

                            review.correct ||

                            question.correctAnswer ||

                            question.correct ||

                            ""

                        );


                    /*
                     * Backend may explicitly return
                     * isCorrect.
                     */

                    let isCorrect;


                    if (
                        typeof review.isCorrect ===
                        "boolean"
                    ) {

                        isCorrect =
                            review.isCorrect;

                    }
                    else {

                        isCorrect =
                            selectedAnswer &&
                            correctAnswer &&
                            selectedAnswer ===
                            correctAnswer;

                    }


                    const options =
                        [
                            "A",
                            "B",
                            "C",
                            "D"
                        ]
                            .map(
                                function (
                                    letter
                                ) {

                                    const optionText =
                                        getOptionText(
                                            question,
                                            letter
                                        )

                                        ||

                                        getOptionText(
                                            review,
                                            letter
                                        );


                                    if (
                                        !optionText
                                    ) {

                                        return "";

                                    }


                                    const selected =
                                        selectedAnswer ===
                                        letter;


                                    const correct =
                                        correctAnswer ===
                                        letter;


                                    let className =
                                        "review-option";


                                    let badge =
                                        "";


                                    /*
                                     * Correct answer.
                                     */

                                    if (correct) {

                                        className +=
                                            " correct";


                                        badge = `

                                            <span
                                                class="review-option-badge correct-badge"
                                            >
                                                Correct
                                            </span>

                                        `;

                                    }


                                    /*
                                     * Wrong answer selected.
                                     */

                                    if (
                                        selected &&
                                        !correct
                                    ) {

                                        className +=
                                            " wrong";


                                        badge = `

                                            <span
                                                class="review-option-badge wrong-badge"
                                            >
                                                Your answer
                                            </span>

                                        `;

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


                                            ${badge}

                                        </div>

                                    `;

                                }
                            )
                            .join("");


                    const statusClass =
                        isCorrect
                            ? "correct"
                            : "wrong";


                    const statusText =
                        isCorrect
                            ? "Correct"
                            : "Incorrect";


                    const statusIcon =
                        isCorrect
                            ? "fa-circle-check"
                            : "fa-circle-xmark";


                    return `

                        <article
                            class="review-question"
                        >

                            <div
                                class="review-question-top"
                            >

                                <span
                                    class="review-question-number"
                                >
                                    Question ${index + 1}
                                </span>


                                <span
                                    class="review-status ${statusClass}"
                                >

                                    <i
                                        class="fa-solid ${statusIcon}"
                                    ></i>

                                    ${statusText}

                                </span>

                            </div>


                            <div
                                class="review-question-text"
                            >

                                ${escapeResultHTML(
                                    questionText
                                )}

                            </div>


                            <div
                                class="review-options"
                            >

                                ${options}

                            </div>

                        </article>

                    `;

                }
            )
            .join("");

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


    if (closeReviewBtn) {

        closeReviewBtn.addEventListener(
            "click",
            closeReview
        );

    }


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


    /*
     * ========================================================
     * HISTORY REVIEW BUTTONS
     *
     * Event delegation is used because
     * history is created dynamically.
     * ========================================================
     */

    document.addEventListener(
        "click",
        function (event) {

            const button =
                event.target.closest(
                    "[data-review-lesson]"
                );


            if (!button) {

                return;

            }


            const lesson =
                button.dataset.reviewLesson;


            openReview(
                lesson
            );

        }
    );

}


/* ============================================================
   RESULTS MESSAGE
============================================================ */

function showResultsMessage(
    message
) {

    const element =
        resultElement(
            "resultsMessage"
        );


    if (!element) {

        return;

    }


    element.textContent =
        message;


    element.classList.add(
        "show"
    );

}


function hideResultsMessage() {

    const element =
        resultElement(
            "resultsMessage"
        );


    if (!element) {

        return;

    }


    element.classList.remove(
        "show"
    );

}


/* ============================================================
   FORMAT DATE
============================================================ */

function formatDate(value) {

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

            day:
                "numeric",

            month:
                "short",

            year:
                "numeric"

        }
    );

}
