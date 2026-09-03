/**
 * ============================================================
 * AFC ISIU YOUTH PORTAL V2
 * FILE: results.js
 * PURPOSE: SLC RESULTS + QUIZ HISTORY CONTROLLER
 * ============================================================
 *
 * IMPORTANT:
 *
 * This page is responsible for HISTORY.
 *
 * It does NOT decide whether the current SLC is completed.
 *
 * The quiz page/backend handle current completion.
 *
 * Results page simply displays all completed quizzes belonging
 * to the requested member ID.
 *
 * ============================================================
 */

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

let memberId =
    "";

let memberName =
    "";

let historyData =
    [];

let currentReview =
    null;


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

function resultElement(
    id
) {

    return document.getElementById(
        id
    );

}


function showResultElement(
    id
) {

    const element =
        resultElement(
            id
        );


    if (element) {

        element.classList.remove(
            "hidden"
        );

    }

}


function hideResultElement(
    id
) {

    const element =
        resultElement(
            id
        );


    if (element) {

        element.classList.add(
            "hidden"
        );

    }

}


/* ============================================================
   SAFE HTML
   ============================================================ */

function escapeResultHTML(
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
   IDENTIFY MEMBER
   ============================================================ */


/**
 * Priority:
 *
 * 1. URL memberId
 * 2. Active SLC session
 * 3. Saved results member
 *
 * The URL is intentionally FIRST because a quiz submission
 * explicitly passes the selected participant's member ID.
 */
async function identifyMember() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const queryMemberId =
        String(
            params.get(
                "memberId"
            ) ||
            ""
        ).trim();


    const queryLessonNo =
        String(
            params.get(
                "lessonNo"
            ) ||
            ""
        ).trim();


    /* ========================================================
       1. URL MEMBER ID
       ======================================================== */

    if (
        queryMemberId
    ) {

        memberId =
            queryMemberId;


        /*
         * Store the exact member that the results page
         * was opened for.
         */

        const sessionName =
            getSessionMemberName();


        if (
            sessionName
        ) {

            memberName =
                sessionName;

        }


        saveResultsMember();

    }


    /* ========================================================
       2. ACTIVE SLC SESSION
       ======================================================== */

    if (
        !memberId
    ) {

        try {

            const raw =
                sessionStorage.getItem(
                    RESULTS_SLC_SESSION_KEY
                );


            if (
                raw
            ) {

                const session =
                    JSON.parse(
                        raw
                    );


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


    /* ========================================================
       3. SAVED RESULTS MEMBER
       ======================================================== */

    if (
        !memberId
    ) {

        try {

            const saved =
                localStorage.getItem(
                    RESULTS_MEMBER_KEY
                );


            if (
                saved
            ) {

                const parsed =
                    JSON.parse(
                        saved
                    );


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
                "Unable to read saved results member.",
                error
            );

        }

    }


    /* ========================================================
       NO MEMBER
       ======================================================== */

    if (
        !memberId
    ) {

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


    saveResultsMember();


    await loadQuizHistory(
        queryLessonNo
    );

}


/* ============================================================
   GET MEMBER NAME FROM SLC SESSION
   ============================================================ */

function getSessionMemberName() {

    try {

        const raw =
            sessionStorage.getItem(
                RESULTS_SLC_SESSION_KEY
            );


        if (!raw) {

            return "";

        }


        const session =
            JSON.parse(
                raw
            );


        if (
            session &&
            session.memberName
        ) {

            return String(
                session.memberName
            ).trim();

        }

    }

    catch (error) {

        console.warn(
            "Unable to read session member name.",
            error
        );

    }


    return "";

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

async function loadQuizHistory(
    submittedLesson
) {

    showResultsMessage(
        "Loading your quiz results..."
    );


    try {

        const response =
            await fetch(

                `${RESULTS_API}` +
                `?action=getMemberQuizHistory` +
                `&memberId=${encodeURIComponent(
                    memberId
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


        /*
         * IMPORTANT:
         *
         * The backend returns the member name belonging
         * to the requested member ID.
         *
         * Never substitute another member's name.
         */

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
         * The backend also provides the actual number of
         * completed quizzes.
         */

        updateQuizCount(
            Number(
                data.quizCount
            ) || historyData.length
        );


        hideResultsMessage();


        renderHistory();


        /*
         * If this page was opened immediately after submitting
         * a quiz, try to display that exact submitted lesson
         * as the latest/current result.
         *
         * This is still based on THIS MEMBER'S history.
         */

        renderLatestResult(
            submittedLesson
        );

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
   UPDATE QUIZ COUNT
   ============================================================ */

function updateQuizCount(
    count
) {

    const element =
        resultElement(
            "historyCount"
        );


    if (!element) {

        return;

    }


    const safeCount =
        Number(
            count
        ) || 0;


    element.textContent =

        `${safeCount} ${
            safeCount === 1
                ? "quiz"
                : "quizzes"
        }`;

}


/* ============================================================
   SAVE RESULTS MEMBER
   ============================================================ */

function saveResultsMember() {

    if (
        !memberId
    ) {

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


    if (!list) {

        return;

    }


    updateQuizCount(
        historyData.length
    );


    if (
        !historyData.length
    ) {

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
                        Number(
                            total
                        ) > 0

                            ? Math.round(

                                (
                                    Number(
                                        points
                                    ) /
                                    Number(
                                        total
                                    )
                                ) *
                                100

                            )

                            : 0;


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

                                    <strong>
                                        Lesson
                                        ${escapeResultHTML(
                                            item.lessonNo
                                        )}
                                    </strong>


                                    <span>
                                        ${escapeResultHTML(
                                            date
                                        )}
                                    </span>

                                </div>


                                <div
                                    class="history-score"
                                >

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

                                <i
                                    class="fa-solid fa-arrow-right"
                                ></i>

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

            function (
                button
            ) {

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

function renderLatestResult(
    submittedLesson
) {

    let latest =
        null;


    /*
     * If we just came from quiz submission,
     * find that exact lesson in THIS MEMBER'S history.
     */

    if (
        submittedLesson
    ) {

        latest =
            historyData.find(

                function (
                    item
                ) {

                    return (
                        String(
                            item.lessonNo
                        ).trim() ===
                        String(
                            submittedLesson
                        ).trim()
                    );

                }

            );

    }


    /*
     * Otherwise use the newest result.
     */

    if (!latest) {

        latest =
            historyData[0];

    }


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


    if (
        lesson
    ) {

        lesson.textContent =
            `Lesson ${latest.lessonNo}`;

    }


    if (
        score
    ) {

        score.textContent =
            latest.score ??
            0;

    }


    if (
        title
    ) {

        title.textContent =
            `Lesson ${latest.lessonNo} Quiz`;

    }


    if (
        date
    ) {

        date.textContent =
            `Completed ${formatDate(
                latest.timestamp
            )}`;

    }


    if (
        points
    ) {

        points.textContent =
            latest.pointsEarned ??
            0;

    }


    if (
        total
    ) {

        total.textContent =
            latest.totalPoints ??
            0;

    }


    const latestReviewBtn =
        resultElement(
            "latestReviewBtn"
        );


    if (
        latestReviewBtn
    ) {

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

async function openReview(
    lessonNo
) {

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

            <i
                class="fa-solid fa-spinner fa-spin"
            ></i>

            <span>
                Loading your answers...
            </span>

        </div>

    `;


    if (
        reviewTitle
    ) {

        reviewTitle.textContent =
            `Lesson ${lessonNo} — Answer Review`;

    }


    if (
        reviewSubtitle
    ) {

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

                `${RESULTS_API}` +
                `?action=getQuizReview` +
                `&memberId=${encodeURIComponent(
                    memberId
                )}` +
                `&lessonNo=${encodeURIComponent(
                    lessonNo
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
            "Review response:",
            data
        );


        if (
            !data.success
        ) {

            reviewContainer.innerHTML = `

                <div class="review-empty">

                    <i
                        class="fa-solid fa-circle-info"
                    ></i>

                    <h3>
                        Review not available
                    </h3>

                    <p>
                        ${escapeResultHTML(
                            data.message ||
                            "The answer review could not be found."
                        )}
                    </p>

                </div>

            `;


            return;

        }


        const review =
            Array.isArray(
                data.review
            )
                ? data.review
                : [];


        const questions =
            Array.isArray(
                data.questions
            )
                ? data.questions
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

                    <i
                        class="fa-solid fa-circle-info"
                    ></i>

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


        if (
            reviewSubtitle
        ) {

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

                <i
                    class="fa-solid fa-triangle-exclamation"
                ></i>

                <h3>
                    Unable to load review
                </h3>

                <p>
                    Please check your connection
                    and try again.
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
                reviewQuestions[
                    index
                ];


            if (!question) {

                return;

            }


            const correctAnswer =
                String(
                    item.correctAnswer ||
                    ""
                )
                    .trim()
                    .toUpperCase();


            const userAnswer =
                String(
                    item.userAnswer ||
                    ""
                )
                    .trim()
                    .toUpperCase();


            const wasCorrect =
                item.correct === true ||
                (
                    correctAnswer &&
                    userAnswer &&
                    correctAnswer ===
                    userAnswer
                );


            html += `

                <article
                    class="review-question"
                >

                    <div
                        class="review-question-top"
                    >

                        <span>
                            QUESTION ${index + 1}
                        </span>


                        <strong
                            class="${
                                wasCorrect
                                    ? "review-correct"
                                    : "review-wrong"
                            }"
                        >

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


                    <div
                        class="review-options"
                    >

            `;


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

                            <span
                                class="review-option-letter"
                            >
                                ${letter}
                            </span>


                            <span
                                class="review-option-text"
                            >
                                ${escapeResultHTML(
                                    text
                                )}
                            </span>


                            ${
                                letter ===
                                correctAnswer

                                    ? `

                                        <span
                                            class="review-badge correct-badge"
                                        >
                                            Correct answer
                                        </span>

                                    `

                                    : ""
                            }


                            ${
                                letter ===
                                    userAnswer &&
                                !wasCorrect

                                    ? `

                                        <span
                                            class="review-badge wrong-badge"
                                        >
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

        top:
            0,

        behavior:
            "smooth"

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


    if (
        closeButton
    ) {

        closeButton.addEventListener(
            "click",
            closeReview
        );

    }

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


    if (
        element
    ) {

        element.classList.remove(
            "show"
        );

    }

}


/* ============================================================
   DATE FORMAT
   ============================================================ */

function formatDate(
    value
) {

    if (!value) {

        return "Date unavailable";

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

            day:
                "numeric",

            month:
                "short",

            year:
                "numeric"

        }

    );

}
