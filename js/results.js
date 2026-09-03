/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: results.js
   PURPOSE: SLC RESULTS + QUIZ HISTORY CONTROLLER
   ============================================================ */

"use strict";


/* ============================================================
   API
   ============================================================ */

const RESULTS_API =
    "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";


/* ============================================================
   SESSION KEYS
   ============================================================ */

const RESULTS_MEMBER_KEY =
    "afc_isiu_slc_member_v1";

const RESULTS_SLC_SESSION_KEY =
    "afc_isiu_slc_quiz_session_v1";


/* ============================================================
   STATE
   ============================================================ */

let memberId = "";

let memberName = "";

let historyData = [];

let currentReview = null;

let requestedLessonNo = "";


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
   ESCAPE HTML
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

    /*
    IMPORTANT:

    The URL is checked FIRST.

    This ensures that after quiz submission,
    the member ID supplied by slcquiz.js is used
    immediately.
    */

    const params =
        new URLSearchParams(
            window.location.search
        );

    const queryMember =
        String(
            params.get("memberId") || ""
        ).trim();

    requestedLessonNo =
        String(
            params.get("lessonNo") || ""
        ).trim();


    if (queryMember) {

        memberId =
            queryMember;

    }


    /*
    Next try the active SLC session.
    */

    if (!memberId) {

        try {

            const raw =
                sessionStorage.getItem(
                    RESULTS_SLC_SESSION_KEY
                );

            if (raw) {

                const session =
                    JSON.parse(raw);

                if (
                    session &&
                    session.memberId
                ) {

                    memberId =
                        String(
                            session.memberId
                        ).trim();

                    memberName =
                        String(
                            session.memberName ||
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
    Next try the dedicated results storage.
    */

    if (!memberId) {

        try {

            const saved =
                localStorage.getItem(
                    RESULTS_MEMBER_KEY
                );

            if (saved) {

                const parsed =
                    JSON.parse(saved);

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
   LOAD HISTORY
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
                String(
                    data.memberName
                ).trim();

            updateMemberDisplay();

            saveResultsMember();

        }


        historyData =
            Array.isArray(
                data.results
            )
                ? data.results
                : [];


        /*
        Sort newest first if timestamps are available.
        */

        historyData.sort(
            function (a, b) {

                const dateA =
                    new Date(
                        a.timestamp || 0
                    ).getTime();

                const dateB =
                    new Date(
                        b.timestamp || 0
                    ).getTime();

                return (
                    dateB -
                    dateA
                );

            }
        );


        hideResultsMessage();

        renderHistory();

        renderLatestResult();


        /*
        If the user has just submitted a quiz,
        automatically load the review for that lesson
        only after history has loaded.
        */

        if (
            requestedLessonNo
        ) {

            const matchingLesson =
                historyData.find(
                    function (item) {

                        return (
                            String(
                                item.lessonNo
                            ).trim()
                            ===
                            requestedLessonNo
                        );

                    }
                );

            if (matchingLesson) {

                /*
                We do not automatically open the
                review section because the user may
                simply want to see the result card.
                */

                console.log(
                    "Latest submitted lesson found:",
                    matchingLesson
                );

            }

        }

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

        count.textContent =
            `${historyData.length} ${
                historyData.length === 1
                    ? "quiz"
                    : "quizzes"
            }`;

    }


    if (!historyData.length) {

        list.innerHTML =
            "";

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
                    item,
                    index
                ) {

                    const score =
                        item.score ?? 0;

                    const points =
                        item.pointsEarned ?? 0;

                    const total =
                        item.totalPoints ?? 0;

                    const date =
                        formatDate(
                            item.timestamp
                        );

                    const percentage =
                        total > 0
                            ? Math.round(
                                (
                                    Number(points) /
                                    Number(total)
                                ) * 100
                            )
                            : 0;


                    return `
                        <article
                            class="history-item"
                        >

                            <div class="history-number">
                                ${index + 1}
                            </div>


                            <div class="history-main">

                                <div class="history-top">

                                    <strong>
                                        Lesson ${escapeResultHTML(
                                            item.lessonNo
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeResultHTML(
                                            date
                                        )}
                                    </span>

                                </div>


                                <div class="history-score">

                                    <div>

                                        <span>
                                            Score
                                        </span>

                                        <strong>
                                            ${escapeResultHTML(
                                                score
                                            )}
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            Points
                                        </span>

                                        <strong>
                                            ${escapeResultHTML(
                                                points
                                            )}
                                        </strong>

                                    </div>


                                    <div>

                                        <span>
                                            Performance
                                        </span>

                                        <strong>
                                            ${percentage}%
                                        </strong>

                                    </div>

                                </div>

                            </div>


                            <button
                                type="button"
                                class="review-history-btn"
                                data-lesson="${escapeResultHTML(
                                    item.lessonNo
                                )}"
                            >

                                <span>
                                    Review
                                </span>

                                <i class="fa-solid fa-arrow-right"></i>

                            </button>

                        </article>
                    `;

                }
            )
            .join("");


    list
        .querySelectorAll(
            ".review-history-btn"
        )
        .forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const lessonNo =
                            String(
                                button.dataset.lesson || ""
                            ).trim();

                        openReview(
                            lessonNo
                        );

                    }
                );

            }
        );

}


/* ============================================================
   LATEST RESULT
   ============================================================ */

function renderLatestResult() {

    if (!historyData.length) {

        hideResultElement(
            "latestResult"
        );

        return;

    }


    /*
    If results.html was opened immediately
    after completing a specific lesson, prefer
    that lesson as the latest displayed result.
    */

    let latest =
        historyData[0];


    if (
        requestedLessonNo
    ) {

        const requestedResult =
            historyData.find(
                function (item) {

                    return (
                        String(
                            item.lessonNo
                        ).trim()
                        ===
                        requestedLessonNo
                    );

                }
            );

        if (requestedResult) {

            latest =
                requestedResult;

        }

    }


    showResultElement(
        "latestResult"
    );


    const lesson =
        resultElement(
            "latestLesson"
        );

    const score =
        resultElement(
            "latestScore"
        );

    const title =
        resultElement(
            "latestTitle"
        );

    const date =
        resultElement(
            "latestDate"
        );

    const points =
        resultElement(
            "latestPoints"
        );

    const total =
        resultElement(
            "latestTotal"
        );


    if (lesson) {

        lesson.textContent =
            `Lesson ${latest.lessonNo}`;

    }


    if (score) {

        score.textContent =
            latest.score ?? 0;

    }


    if (title) {

        title.textContent =
            `Lesson ${latest.lessonNo} Quiz`;

    }


    if (date) {

        date.textContent =
            `Completed ${formatDate(
                latest.timestamp
            )}`;

    }


    if (points) {

        points.textContent =
            latest.pointsEarned ?? 0;

    }


    if (total) {

        total.textContent =
            latest.totalPoints ?? 0;

    }


    const latestReviewBtn =
        resultElement(
            "latestReviewBtn"
        );

    if (latestReviewBtn) {

        latestReviewBtn.onclick =
            function () {

                openReview(
                    latest.lessonNo
                );

            };

    }

}


/* ============================================================
   OPEN REVIEW
   ============================================================ */

async function openReview(lessonNo) {

    lessonNo =
        String(
            lessonNo || ""
        ).trim();


    if (
        !memberId ||
        !lessonNo
    ) {

        return;

    }


    const reviewSection =
        resultElement(
            "reviewSection"
        );

    const reviewContainer =
        resultElement(
            "reviewContainer"
        );

    const reviewTitle =
        resultElement(
            "reviewTitle"
        );

    const reviewSubtitle =
        resultElement(
            "reviewSubtitle"
        );


    if (
        !reviewSection ||
        !reviewContainer
    ) {

        return;

    }


    showResultElement(
        "reviewSection"
    );


    reviewContainer.innerHTML = `
        <div class="review-loading">

            <i class="fa-solid fa-spinner fa-spin"></i>

            <span>
                Loading your answers...
            </span>

        </div>
    `;


    if (reviewTitle) {

        reviewTitle.textContent =
            `Lesson ${lessonNo} — Answer Review`;

    }


    if (reviewSubtitle) {

        reviewSubtitle.textContent =
            "Loading your submitted answers...";

    }


    reviewSection.scrollIntoView({
        behavior:
            "smooth",

        block:
            "start"

    });


    try {

        const response =
            await fetch(
                `${RESULTS_API}?action=getQuizReview&memberId=${encodeURIComponent(memberId)}&lessonNo=${encodeURIComponent(lessonNo)}`
            );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();

        console.log(
            "Review response:",
            data
        );


        if (
            data &&
            data.success === false
        ) {

            throw new Error(
                data.message ||
                "Review is not available."
            );

        }


        /*
        SUPPORT MULTIPLE BACKEND RESPONSE SHAPES
        */


        let review =
            [];


        let questions =
            [];


        /*
        Review array.
        */

        if (
            Array.isArray(data)
        ) {

            review =
                data;

        }
        else if (
            Array.isArray(data.review)
        ) {

            review =
                data.review;

        }
        else if (
            Array.isArray(data.data?.review)
        ) {

            review =
                data.data.review;

        }
        else if (
            Array.isArray(data.results)
        ) {

            review =
                data.results;

        }


        /*
        Questions array.
        */

        if (
            Array.isArray(data.questions)
        ) {

            questions =
                data.questions;

        }
        else if (
            Array.isArray(
                data.data?.questions
            )
        ) {

            questions =
                data.data.questions;

        }
        else if (
            Array.isArray(
                data.quizQuestions
            )
        ) {

            questions =
                data.quizQuestions;

        }


        /*
        Some backends return one combined
        items array containing both question
        and answer information.
        */

        if (
            !questions.length &&
            Array.isArray(data.items)
        ) {

            questions =
                data.items;

        }


        if (
            !review.length &&
            Array.isArray(data.items)
        ) {

            review =
                data.items;

        }


        currentReview = {

            lessonNo:
                lessonNo,

            review:
                review,

            questions:
                questions

        };


        if (
            !review.length ||
            !questions.length
        ) {

            reviewContainer.innerHTML = `
                <div class="review-empty">

                    <i class="fa-solid fa-circle-info"></i>

                    <h3>
                        Review not available
                    </h3>

                    <p>
                        We found the quiz attempt,
                        but the answer review is not
                        available for this lesson.
                    </p>

                </div>
            `;

            return;

        }


        if (reviewSubtitle) {

            reviewSubtitle.textContent =
                `${Math.min(
                    review.length,
                    questions.length
                )} questions reviewed`;

        }


        renderReview(
            review,
            questions
        );

    }
    catch (error) {

        console.error(
            "openReview error:",
            error
        );


        reviewContainer.innerHTML = `
            <div class="review-empty">

                <i class="fa-solid fa-triangle-exclamation"></i>

                <h3>
                    Unable to load review
                </h3>

                <p>
                    ${
                        escapeResultHTML(
                            error.message
                        ) ||
                        "Please check your connection and try again."
                    }
                </p>

            </div>
        `;

    }

}


/* ============================================================
   RENDER REVIEW
   ============================================================ */

function renderReview(
    reviewData,
    reviewQuestions
) {

    const container =
        resultElement(
            "reviewContainer"
        );

    if (!container) {

        return;

    }


    let html =
        "";


    const length =
        Math.min(
            reviewData.length,
            reviewQuestions.length
        );


    for (
        let index = 0;
        index < length;
        index++
    ) {

        const item =
            reviewData[index] || {};

        const question =
            reviewQuestions[index] || {};


        const correctAnswer =
            String(
                item.correctAnswer ??
                item.correct ??
                question.correctAnswer ??
                ""
            )
                .trim()
                .toUpperCase();


        const userAnswer =
            String(
                item.userAnswer ??
                item.answer ??
                item.selectedAnswer ??
                ""
            )
                .trim()
                .toUpperCase();


        /*
        IMPORTANT:

        Do not treat item.correct === true as
        an answer letter.

        It is only used when it is a boolean.
        */

        const wasCorrect =
            item.correct === true ||
            (
                correctAnswer &&
                userAnswer &&
                correctAnswer === userAnswer
            );


        html += `
            <article
                class="review-question"
            >

                <div class="review-question-top">

                    <span>
                        QUESTION ${index + 1}
                    </span>

                    <strong class="${
                        wasCorrect
                            ? "review-correct"
                            : "review-wrong"
                    }">

                        ${
                            wasCorrect
                                ? "✓ Correct"
                                : "✕ Incorrect"
                        }

                    </strong>

                </div>


                <h3>
                    ${escapeResultHTML(
                        question.question ||
                        item.question ||
                        ""
                    )}
                </h3>


                <div class="review-options">
        `;


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
                    ] ??
                    item[
                        `option${letter}`
                    ];


                if (
                    text === undefined ||
                    text === null ||
                    String(text).trim() === ""
                ) {

                    return;

                }


                let classes =
                    "review-option";


                if (
                    letter ===
                    correctAnswer
                ) {

                    classes +=
                        " correct";

                }


                if (
                    letter ===
                    userAnswer &&
                    !wasCorrect
                ) {

                    classes +=
                        " wrong";

                }


                if (
                    letter ===
                    userAnswer &&
                    wasCorrect
                ) {

                    classes +=
                        " selected-correct";

                }


                html += `
                    <div
                        class="${classes}"
                    >

                        <span class="review-option-letter">
                            ${letter}
                        </span>


                        <span class="review-option-text">
                            ${escapeResultHTML(
                                text
                            )}
                        </span>


                        ${
                            letter === correctAnswer
                                ? `
                                    <span class="review-badge correct-badge">
                                        Correct answer
                                    </span>
                                `
                                : ""
                        }


                        ${
                            letter === userAnswer &&
                            !wasCorrect
                                ? `
                                    <span class="review-badge wrong-badge">
                                        Your answer
                                    </span>
                                `
                                : ""
                        }


                        ${
                            letter === userAnswer &&
                            wasCorrect
                                ? `
                                    <span class="review-badge correct-badge">
                                        Your answer
                                    </span>
                                `
                                : ""
                        }

                    </div>
                `;

            }
        );


        html += `
                </div>

            </article>
        `;

    }


    if (!html) {

        html = `
            <div class="review-empty">

                <i class="fa-solid fa-circle-info"></i>

                <h3>
                    Review not available
                </h3>

                <p>
                    No review questions could be displayed.
                </p>

            </div>
        `;

    }


    container.innerHTML =
        html;

}


/* ============================================================
   CLOSE REVIEW
   ============================================================ */

function closeReview() {

    hideResultElement(
        "reviewSection"
    );

    currentReview =
        null;

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* ============================================================
   LISTENERS
   ============================================================ */

function setupResultsListeners() {

    const closeButton =
        resultElement(
            "closeReviewBtn"
        );

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeReview
        );

    }

}


/* ============================================================
   RESULTS MESSAGE
   ============================================================ */

function showResultsMessage(message) {

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

    if (element) {

        element.classList.remove(
            "show"
        );

    }

}


/* ============================================================
   DATE FORMAT
   ============================================================ */

function formatDate(value) {

    if (!value) {

        return "Date unavailable";

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
