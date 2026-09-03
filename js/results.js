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
    First try the active SLC session.
    */

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


    /*
    Next try the dedicated results
    member storage.
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


    /*
    Finally check the query string.

    This is useful when the user has just
    submitted a quiz.
    */

    if (!memberId) {

        const params =
            new URLSearchParams(
                window.location.search
            );


        const queryMember =
            params.get(
                "memberId"
            );


        if (queryMember) {

            memberId =
                queryMember.trim();

        }

    }


    /*
    The current SLC session is normally
    cleared after submission.

    Therefore, if there is no member ID,
    show a helpful state rather than pretending
    results exist.
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
                        item.score ??
                        0;


                    const points =
                        item.pointsEarned ??
                        0;


                    const total =
                        item.totalPoints ??
                        0;


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
                                ) *
                                100
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
                                data-index="${index}"
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
                            button.dataset.lesson;


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

    const latest =
        historyData[0];


    if (!latest) {

        hideResultElement(
            "latestResult"
        );


        return;

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

    if (!memberId || !lessonNo) {

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


        /*
        Different versions of the backend may
        return the review object directly or
        inside a data/review property.
        */

        const review =
            Array.isArray(data)
                ? data
                : Array.isArray(data.review)
                    ? data.review
                    : [];


        const questions =
            Array.isArray(data.questions)
                ? data.questions
                : Array.isArray(data.data?.questions)
                    ? data.data.questions
                    : [];


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
                `${review.length} questions reviewed`;

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
                    Please check your connection and
                    try again.
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


    reviewData.forEach(
        function (
            item,
            index
        ) {

            const question =
                reviewQuestions[index];


            if (!question) {

                return;

            }


            const correctAnswer =
                String(
                    item.correctAnswer || ""
                )
                    .trim()
                    .toUpperCase();


            const userAnswer =
                String(
                    item.userAnswer || ""
                )
                    .trim()
                    .toUpperCase();


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
                            question.question
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
                        ];


                    if (!text) {

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

                        </div>

                    `;

                }
            );


            html += `

                    </div>

                </article>

            `;

        }
    );


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
