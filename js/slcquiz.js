const API =
"https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";

let quizData = [];
let selectedLesson = "";
let reviewData = [];
let quizCloseTime = null;
let countdownInterval = null;

document.addEventListener("DOMContentLoaded", () => {

    AOS.init({
        duration: 700,
        once: true
    });

    checkSavedReview();

    loadQuiz();

});

async function loadQuiz() {

    const statusCard =
        document.getElementById("statusCard");

    const quizBox =
        document.getElementById("quizBox");

    const questionsCard =
        document.getElementById("questionsCard");

    const countdown =
        document.getElementById("quizCountdown");

    try {

        statusCard.innerHTML = `

            <div class="loading">

                Loading quiz...

            </div>

        `;

        const response = await fetch(

            `${API}?action=getQuiz`

        );

        const data = await response.json();

        console.log(data);

        /*
        =====================
        QUIZ NOT AVAILABLE
        =====================
        */

        if (!data.success) {

            let message =
                data.message ||
                "No quiz available.";

            if (data.status === "not_open") {

                message =
                    "⏳ Quiz will open soon. Check back later.";

            }

            if (data.status === "closed") {

                message =
                    "🔒 This week's quiz has closed.";

            }

            statusCard.innerHTML = `

                <h2>

                    📚 Weekly Quiz

                </h2>

                <p>

                    ${message}

                </p>

            `;

            quizBox.classList.add("hidden");

            questionsCard.classList.add("hidden");

            countdown.style.display = "none";

            return;

        }

        /*
        =====================
        NO QUESTIONS
        =====================
        */

        if (!data.questions ||
            data.questions.length === 0) {

            statusCard.innerHTML = `

                <h2>

                    No Questions Found

                </h2>

                <p>

                    The quiz exists, but there are no questions.

                </p>

            `;

            quizBox.classList.add("hidden");

            questionsCard.classList.add("hidden");

            countdown.style.display = "none";

            return;

        }

        /*
        =====================
        SAVE QUIZ DATA
        =====================
        */

        quizData = data.questions;

        selectedLesson = data.lessonNo;

        quizCloseTime =
            new Date(data.closeTime);

        /*
        =====================
        SHOW STATUS
        =====================
        */

        statusCard.innerHTML = `

            <div style="

                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:10px;
                flex-wrap:wrap;

            ">

                <div>

                    <h2>

                        Lesson ${data.lessonNo}

                    </h2>

                    <p>

                        ${quizData.length}
                        Questions Available

                    </p>

                </div>

                <div style="

                    background:#ecfdf5;
                    color:#15803d;
                    padding:10px 14px;
                    border-radius:12px;
                    font-size:.75rem;

                ">

                    🏆 Quiz Open

                </div>

            </div>

        `;

        /*
        =====================
        SHOW QUIZ
        =====================
        */

        quizBox.classList.remove("hidden");

        questionsCard.classList.remove("hidden");

        countdown.style.display = "block";

        /*
        =====================
        LOAD DATA
        =====================
        */

        await loadMembers();

        renderQuestions();

        startCountdown();

    }

    catch (error) {

        console.error(

            "Quiz loading error:",

            error

        );

        statusCard.innerHTML = `

            <h2>

                Error loading quiz

            </h2>

            <p>

                Check your internet connection.

            </p>

        `;

    }

}

function startCountdown() {

    const countdown =

        document.getElementById(
            "quizCountdown"
        );

    if (!quizCloseTime) {

        countdown.style.display =
            "none";

        return;
    }

    countdown.style.display =
        "block";

    clearInterval(
        countdownInterval
    );

    countdownInterval =
        setInterval(() => {

            const diff =

                quizCloseTime -

                new Date();

            if (diff <= 0) {

                countdown.innerHTML =

                    "🔒 Quiz Closed";

                clearInterval(
                    countdownInterval
                );

                return;
            }

            const days = Math.floor(

                diff / 86400000

            );

            const hours = Math.floor(

                (diff % 86400000) /

                3600000

            );

            const mins = Math.floor(

                (diff % 3600000) /

                60000

            );

            const secs = Math.floor(

                (diff % 60000) /

                1000

            );

            countdown.innerHTML = `

                ⏳ Closes in:

                ${days}d

                ${hours}h

                ${mins}m

                ${secs}s

            `;

        }, 1000);

}

async function loadMembers() {

    try {

        const response = await fetch(
            `${API}?action=getMembers`
        );

        const data =
            await response.json();

        const select =
            document.getElementById(
                "memberSelect"
            );

        select.innerHTML = `
            <option value="">
                Select Your Name
            </option>
        `;

        if (!data.members) {

            console.log(
                "No members found."
            );

            return;
        }

        data.members.forEach(member => {

            select.innerHTML += `

                <option value="${member.memberId}">

                    ${member.name}

                </option>

            `;

        });

    }

    catch (error) {

        console.error(
            "Unable to load members:",
            error
        );

        alert(
            "Unable to load members."
        );

    }

}

function renderQuestions() {

    const container =
        document.getElementById(
            "questions"
        );

    container.innerHTML = "";

    if (!quizData.length) {

        container.innerHTML = `
            <p>
                No questions available.
            </p>
        `;

        return;
    }

    quizData.forEach((question, index) => {

        let options = "";

        ["A", "B", "C", "D"].forEach(letter => {

            const optionText =
                question[
                    `option${letter}`
                ];

            if (!optionText) {

                return;

            }

            options += `

                <label class="option">

                    <input
                        type="radio"
                        name="q${index}"
                        value="${letter}"
                    >

                    ${optionText}

                </label>

            `;

        });

        container.innerHTML += `

            <div class="question">

                <h3>

                    ${index + 1}.

                    ${question.question}

                </h3>

                ${options}

            </div>

        `;

    });

}

async function addNewMember() {

    const button =
        document.getElementById(
            "addNameBtn"
        );

    const input =
        document.getElementById(
            "newName"
        );

    const name =
        input.value.trim();

    if (!name) {

        alert(
            "Please enter your name."
        );

        return;
    }

    const originalText =
        button.innerHTML;

    button.innerHTML =

        `<i class="fa-solid fa-spinner fa-spin"></i>

        Adding...`;

    button.disabled = true;

    try {

        const response =
            await fetch(API, {

                method: "POST",

                body: JSON.stringify({

                    action: "addMember",

                    name: name

                })

            });

        const data =
            await response.json();

        if (data.success) {

            alert(
                "Name added successfully."
            );

            input.value = "";

            await loadMembers();

        } else {

            alert(
                data.message ||
                "Unable to add member."
            );

        }

    }

    catch (error) {

        console.error(error);

        alert(
            "Unable to add member."
        );

    }

    button.innerHTML =
        originalText;

    button.disabled = false;

}

async function submitQuiz() {

    const submitBtn =
        document.getElementById(
            "submitBtn"
        );

    const memberId =
        document.getElementById(
            "memberSelect"
        ).value;

    if (!memberId) {

        alert(
            "Please select your name."
        );

        return;

    }

    submitBtn.disabled = true;

    submitBtn.innerHTML =

        `<i class="fa-solid fa-spinner fa-spin"></i>

        Submitting...`;

    let answers = {};

    quizData.forEach((question, index) => {

        const checked =

            document.querySelector(

                `input[name="q${index}"]:checked`

            );

        if (checked) {

            answers[index + 1] =

                checked.value;

        }

    });

    try {

        const response =

            await fetch(API, {

                method: "POST",

                body: JSON.stringify({

                    action: "scoreQuiz",

                    memberId,

                    lessonNo:

                        selectedLesson,

                    answers

                })

            });

        const data =

            await response.json();

        if (!data.success) {

            alert(

                data.message ||

                "Unable to submit quiz."

            );

            submitBtn.disabled = false;

            submitBtn.innerHTML =

                "Submit Quiz";

            return;

        }

        reviewData =

            data.review || [];

        localStorage.setItem(

            "lastQuizReview",

            JSON.stringify(

                reviewData

            )

        );

        localStorage.setItem(

            "lastQuizQuestions",

            JSON.stringify(

                quizData

            )

        );

        localStorage.setItem(

            "lastQuizScore",

            data.score

        );

        localStorage.setItem(

            "lastQuizPoints",

            data.pointsEarned

        );

        localStorage.setItem(

            "lastQuizTotal",

            data.totalPoints

        );

        document.getElementById(

            "quizBox"

        ).style.display =

            "none";

        document.getElementById(

            "questionsCard"

        ).style.display =

            "none";

        document.getElementById(

            "statusCard"

        ).style.display =

            "none";

        document.getElementById(

            "resultBox"

        ).style.display =

            "block";

        document.getElementById(

            "score"

        ).innerHTML =

            data.score;

        document.getElementById(

            "points"

        ).innerHTML =

            `Points Earned: ${data.pointsEarned}`;

        document.getElementById(

            "total"

        ).innerHTML =

            `Total Points: ${data.totalPoints}`;

        document.getElementById(

            "reviewBtn"

        ).style.display =

            "block";

        checkSavedReview();

    }

    catch (error) {

        console.error(error);

        alert(

            "Unable to submit quiz."

        );

        submitBtn.disabled = false;

        submitBtn.innerHTML =

            "Submit Quiz";

    }

}

function showReview() {

    if (

        !reviewData ||

        reviewData.length === 0

    ) {

        reviewData =

            JSON.parse(

                localStorage.getItem(

                    "lastQuizReview"

                )

            ) || [];

    }

    const questions =

        JSON.parse(

            localStorage.getItem(

                "lastQuizQuestions"

            )

        ) || [];

    if (

        reviewData.length === 0

    ) {

        alert(

            "No review available."

        );

        return;

    }

    const container =

        document.getElementById(

            "reviewContainer"

        );

    let html =

        `<div style="margin-top:25px;">`;

    reviewData.forEach(

        (item, index) => {

            const q =

                questions[index];

            if (!q) return;

            html += `

                <div style="
                    background:#fff;
                    padding:20px;
                    border-radius:16px;
                    margin-bottom:18px;
                    border:1px solid #ececec;
                ">

                    <h3 style="
                        margin-bottom:16px;
                        font-size:.8rem;
                    ">

                        ${index + 1}.

                        ${q.question}

                    </h3>

            `;

            ["A", "B", "C", "D"].forEach(

                letter => {

                    const text =

                        q[`option${letter}`];

                    if (!text)

                        return;

                    let bg =

                        "#f8fafc";

                    let border =

                        "#e5e7eb";

                    let badge =

                        "";

                    if (

                        letter ===

                        item.correctAnswer

                    ) {

                        bg =

                            "#ecfdf5";

                        border =

                            "#22c55e";

                        badge =

                            "✅ Correct";

                    }

                    if (

                        letter ===

                        item.userAnswer &&

                        !item.correct

                    ) {

                        bg =

                            "#fef2f2";

                        border =

                            "#ef4444";

                        badge =

                            "❌ Your Answer";

                    }

                    html += `

                        <div style="
                            padding:14px;
                            border-radius:12px;
                            margin-bottom:10px;
                            background:${bg};
                            border:2px solid ${border};
                        ">

                            <strong>

                                ${letter}.

                            </strong>

                            ${text}

                            <div style="
                                margin-top:8px;
                                font-size:.68rem;
                            ">

                                ${badge}

                            </div>

                        </div>

                    `;

                }

            );

            html += `

                </div>

            `;

        }

    );

    html += `

        <button
            class="primary"
            onclick="hideReview()"
        >

            Back

        </button>

        </div>

    `;

    container.innerHTML =

        html;

    container.style.display =

        "block";

    document.getElementById(

        "resultBox"

    ).style.display =

        "none";

}

function checkSavedReview() {

    const review =

        localStorage.getItem(

            "lastQuizReview"

        );

    const score =

        localStorage.getItem(

            "lastQuizScore"

        );

    if (review || score) {

        document.getElementById(

            "savedCard"

        ).style.display =

            "block";

    }

    if (review) {

        document.getElementById(

            "openSavedReview"

        ).style.display =

            "flex";

    }

    if (score) {

        document.getElementById(

            "openSavedScore"

        ).style.display =

            "flex";

    }

}

function openSavedScore() {

    document.getElementById(

        "quizBox"

    ).style.display =

        "none";

    document.getElementById(

        "questionsCard"

    ).style.display =

        "none";

    document.getElementById(

        "statusCard"

    ).style.display =

        "none";

    document.getElementById(

        "resultBox"

    ).style.display =

        "block";

    document.getElementById(

        "score"

    ).innerHTML =

        localStorage.getItem(

            "lastQuizScore"

        );

    document.getElementById(

        "points"

    ).innerHTML =

        `Points Earned: ${localStorage.getItem("lastQuizPoints")}`;

    document.getElementById(

        "total"

    ).innerHTML =

        `Total Points: ${localStorage.getItem("lastQuizTotal")}`;

}

function openSavedReview() {

    reviewData =

        JSON.parse(

            localStorage.getItem(

                "lastQuizReview"

            )

        ) || [];

    showReview();

}

function hideReview() {

    location.reload();

}
