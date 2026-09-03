/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: results.js
   PURPOSE: SLC RESULTS + QUIZ HISTORY CONTROLLER
   ============================================================

   IMPORTANT:

   - URL memberId has highest priority.
   - Current session memberId is second.
   - Saved memberId is third.
   - Results are ALWAYS filtered by the exact member ID.
   - Quiz history contains ALL completed lessons for that member.
   - A result from an old lesson must never be treated as the
     current lesson's completion.
   - Answer review is loaded using memberId + lessonNo.
   ============================================================ */

"use strict";


/* ============================================================
   API
============================================================ */

const RESULTS_API =
    "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNpzsguBIaKR4q1dXVtgVHO2xZ1w/exec";


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

    const element =
        resultElement(id);

    if (element) {

        element.classList.remove("hidden");

    }

}


function hideResultElement(id) {

    const element =
        resultElement(id);

    if (element) {

        element.classList.add("hidden");

    }

}


/* ============================================================
   SAFE HTML
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
   IDENTIFY MEMBER
============================================================ */

async function identifyMember() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    /*
     * Query lesson is only used to identify which
     * result should be highlighted.
     */

    queryLessonNo =
        String(
            params.get("lessonNo") || ""
        ).trim();


    /*
     * ========================================================
     * PRIORITY 1 — URL MEMBER ID
     * ========================================================
     */

    memberId =
        String(
            params.get("memberId") || ""
        ).trim();


    /*
     * ========================================================
     * PRIORITY 2 — ACTIVE SLC SESSION
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

                const savedLesson =
                    String(
                        parsed?.lessonNo || ""
                    ).trim();

                /*
                 * Only restore a session that actually
                 * contains a member ID.
                 */

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
     * PRIORITY 3 — SAVED LOCAL MEMBER
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
     * NO MEMBER
     * ========================================================
     */

    if (!memberId) {

        showResultsMessage(
            "Please complete an SLC quiz or select your participant first."
        );

        hideResultElement(
            "latestResult"
        );

        hideResultElement(
            "reviewSection"
        );

        showResultElement(
            "emptyResults"
        );

        return;

    }


    updateMemberDisplay();

    await loadQuizHistory();

}


/* ============================================================
   MEMBER DISPLAY
============================================================ */

function updateMemberDisplay() {

    const element =
        resultElement(
            "resultsMember"
        );

    if (!element) {
        return;
    }

    element.innerHTML = `

        <i class="fa-solid fa-user"></i>

        <span>
            ${escapeResultHTML(
                memberName ||
                "My Results"
            )}
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
            "Quiz history:",
            data
        );


        if (
            !data.success
        ) {

            showResultsMessage(
                data.message ||
                "Unable to load your results."
            );

            return;

        }


        if (
            data.memberName
        ) {

            memberName =
                data.memberName;

            updateMemberDisplay();

            saveResultsMember();

        }


        historyData =
            Array.isArray(
                data.results
            )
                ? data.results
                : [];


        hideResultsMessage();

        renderHistory();

        renderLatestResult();

    }
    catch (error) {

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
   SAVE RESULTS MEMBER
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


    if (count) {

        const quizCount =
            historyData.length;

        count.textContent =
            `${quizCount} ${
                quizCount === 1
                    ? "quiz"
                    : "quizzes"
            }`;

    }


    if (
        !historyData.length
    ) {

        list.innerHTML = "";

        showResultElement(
            "emptyResults"
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
                        escapeResultHTML(
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

    if (!latest) {
        return;
    }


    if (
        !historyData.length
    ) {

        hideResultElement(
            "latestResult"
        );

        return;

    }


    let result = null;


    /*
     * If the quiz just redirected here with a lessonNo,
     * ALWAYS prefer that exact lesson.
     */

    const exactLesson =
        String(
            submittedLesson ||
            queryLessonNo ||
            ""
        ).trim();


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


    /*
     * If no exact lesson was requested,
     * use the newest result returned by the backend.
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
            `+${points} points`;

    }


    if (dateElement) {

        dateElement.textContent =
            date;

    }


    if (reviewButton) {

        reviewButton.dataset.lesson =
            lesson;

    }

}


/* ============================================================
   OPEN REVIEW
============================================================ */

async function openReview(lessonNo) {

    const lesson =
        String(
            lessonNo || ""
        ).trim();


    if (
        !memberId ||
        !lesson
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
            "Loading your answers...";

    }


    if (container) {

        container.innerHTML = `

            <div class="review-loading">

                <i class="fa-solid fa-spinner fa-spin"></i>

                Loading review...

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
            "Quiz review:",
            data
        );


        if (
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to load review."
            );

        }


        if (subtitle) {

            subtitle.textContent =
                "Your submitted answers";

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

    }
    catch (error) {

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
                    Please try again.

                </div>

            `;

        }

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

    if (!container) {
        return;
    }


    let reviews =
        Array.isArray(data.review)
            ? data.review
            : [];


    let questions =
        Array.isArray(data.questions)
            ? data.questions
            : [];


    /*
     * Some backend responses may return JSON strings.
     */

    if (
        typeof data.review === "string"
    ) {

        try {

            reviews =
                JSON.parse(
                    data.review
                );

        }
        catch (error) {

            reviews = [];

        }

    }


    if (
        typeof data.questions === "string"
    ) {

        try {

            questions =
                JSON.parse(
                    data.questions
                );

        }
        catch (error) {

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
                        review.selectedAnswer ||
                        review.answer ||
                        review.selected ||
                        "";


                    const correctAnswer =
                        review.correctAnswer ||
                        review.correct ||
                        question.correctAnswer ||
                        question.correct ||
                        "";


                    const isCorrect =
                        review.isCorrect === true ||
                        String(
                            selectedAnswer
                        ).trim().toUpperCase() ===
                        String(
                            correctAnswer
                        ).trim().toUpperCase();


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
                                        question[
                                            `option${letter}`
                                        ] ||
                                        review[
                                            `option${letter}`
                                        ] ||
                                        "";

                                    if (!optionText) {
                                        return "";
                                    }

                                    const selected =
                                        String(
                                            selectedAnswer
                                        ).trim().toUpperCase() ===
                                        letter;

                                    const correct =
                                        String(
                                            correctAnswer
                                        ).trim().toUpperCase() ===
                                        letter;

                                    let className =
                                        "review-option";

                                    if (correct) {

                                        className +=
                                            " review-correct";

                                    }
                                    else if (selected && !correct) {

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


                    return `

                        <div class="review-question">

                            <div class="review-question-top">

                                <span>
                                    Question ${index + 1}
                                </span>

                                <strong>
                                    ${
                                        isCorrect
                                            ? "Correct"
                                            : "Incorrect"
                                    }
                                </strong>

                            </div>

                            <div class="review-question-text">

                                ${escapeResultHTML(
                                    questionText
                                )}

                            </div>

                            <div class="review-options">

                                ${options}

                            </div>

                        </div>

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

    selectedReviewLesson = "";

}


/* ============================================================
   RESULTS LISTENERS
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
     * Event delegation for history review buttons.
     *
     * This also works when history is rendered
     * dynamically after the API response.
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

    element.classList.remove(
        "hidden"
    );

    element.classList.add(
        "show"
    );

}


/* ============================================================
   HIDE RESULTS MESSAGE
============================================================ */

function hideResultsMessage() {

    const element =
        resultElement(
            "resultsMessage"
        );

    if (!element) {
        return;
    }

    element.classList.add(
        "hidden"
    );

    element.classList.remove(
        "show"
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
