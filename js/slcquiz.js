const API =
"https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";

let quizData = [];

let selectedLesson = "";

let reviewData = [];

let reviewQuestions = [];

let quizCloseTime = null;

let quizOpenTime = null;

let countdownInterval = null;



document.addEventListener(

    "DOMContentLoaded",

    async () => {

        if (typeof AOS !== "undefined") {

            AOS.init({

                duration: 700,

                once: true

            });

        }

        await loadQuiz();

        await loadMembers();

        await loadReviewMembers();

    }

);




/*
====================================
LOAD QUIZ
====================================
*/

async function loadQuiz() {

    const status =

        document.getElementById(

            "quizStatus"

        );

    const quizSection =

        document.getElementById(

            "quizSection"

        );

    const countdown =

        document.getElementById(

            "quizCountdown"

        );

    try {

        status.innerHTML =

            "Loading quiz...";

        const response =

            await fetch(

                `${API}?action=getQuiz`
            );

        const data =

            await response.json();

        console.log(

            data

        );



        /*
        ====================
        QUIZ CLOSED
        ====================
        */

        if (

            data.status ===

            "closed"

        ) {

            status.innerHTML =

                "🔒 Quiz Closed";

            countdown.style.display =

                "none";

            quizSection.classList.add(

                "hidden"

            );

            return;

        }



        /*
        ====================
        QUIZ NOT OPEN
        ====================
        */

        if (

            data.status ===

            "not_open"

        ) {

            status.innerHTML =

                "⏳ Opens Soon";

            quizSection.classList.add(

                "hidden"

            );

            quizOpenTime =

                new Date(

                    data.openTime

                );

            startCountdown(

                "open"

            );

            return;

        }



        /*
        ====================
        API ERROR
        ====================
        */

        if (

            !data.success

        ) {

            status.innerHTML =

                data.message ||

                "Unable to load quiz.";

            quizSection.classList.add(

                "hidden"

            );

            return;

        }



        /*
        ====================
        QUIZ OPEN
        ====================
        */

        quizData =

            data.questions;

        selectedLesson =

            data.lessonNo;

        quizCloseTime =

            new Date(

                data.closeTime

            );

        status.innerHTML = `

            🟢 Lesson

            ${data.lessonNo}

            Quiz Open

        `;

        renderQuestions();

        document
            .getElementById(
                "questionsCard"
            )
            .classList.remove(
                "hidden"
            );

        startCountdown(

            "close"

        );

    }

    catch (

        error

    ) {

        console.error(

            error

        );

        status.innerHTML =

            "Unable to load quiz.";

    }

}




/*
====================================
COUNTDOWN
====================================
*/

function startCountdown(

    mode

) {

    clearInterval(

        countdownInterval

    );

    const countdown =

        document.getElementById(

            "quizCountdown"

        );

    countdownInterval =

        setInterval(

            () => {

                const target =

                    mode ===

                    "open"

                    ?

                    quizOpenTime

                    :

                    quizCloseTime;

                const diff =

                    target -

                    new Date();

                if (

                    diff <= 0

                ) {

                    clearInterval(

                        countdownInterval

                    );

                    location.reload();

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

                        )

                        /

                        3600000

                    );

                const mins =

                    Math.floor(

                        (

                            diff %

                            3600000

                        )

                        /

                        60000

                    );

                const secs =

                    Math.floor(

                        (

                            diff %

                            60000

                        )

                        /

                        1000

                    );

                countdown.innerHTML = `

                    ${

                        mode ===

                        "open"

                        ?

                        "⏳ Opens in"

                        :

                        "⏳ Closes in"

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

/*
====================================
LOAD MEMBERS
====================================
*/

async function loadMembers() {

    const select =

        document.getElementById(

            "memberSelect"

        );

    select.innerHTML = `

        <option value="">

            Select your name

        </option>

    `;

    try {

        const response =

            await fetch(

                `${API}?action=getMembers`

            );

        const data =

            await response.json();

        if (

            !data.success

        ) {

            return;

        }

        data.members.forEach(

            member => {

                select.innerHTML += `

                    <option value="${member.memberId}">

                        ${member.name}

                    </option>

                `;

            }

        );

    }

    catch (

        error

    ) {

        console.error(

            error

        );

    }

}



/*
====================================
LOAD REVIEW MEMBERS
====================================
*/

async function loadReviewMembers() {

    const select =

        document.getElementById(

            "reviewMemberSelect"

        );

    select.innerHTML = `

        <option value="">

            Select your name

        </option>

    `;

    try {

        const response =

            await fetch(

                `${API}?action=getMembers`

            );

        const data =

            await response.json();

        if (

            !data.success

        ) {

            return;

        }

        data.members.forEach(

            member => {

                select.innerHTML += `

                    <option value="${member.memberId}">

                        ${member.name}

                    </option>

                `;

            }

        );

    }

    catch (

        error

    ) {

        console.error(

            error

        );

    }

}



/*
====================================
ADD NEW MEMBER
====================================
*/

async function addNewMember() {

    const input =

        document.getElementById(

            "newName"

        );

    const button =

        document.getElementById(

            "addNameBtn"

        );

    const name =

        input.value.trim();

    if (

        !name

    ) {

        alert(

            "Please enter your name."

        );

        return;

    }

    const oldText =

        button.innerHTML;

    button.disabled = true;

    button.innerHTML =

        "Adding...";

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

                            name

                        })

                }

            );

        const data =

            await response.json();

        if (

            !data.success

        ) {

            alert(

                data.message ||

                "Unable to add member."

            );

            button.disabled = false;

            button.innerHTML = oldText;

            return;

        }

        input.value = "";

        await loadMembers();

        await loadReviewMembers();

        document.getElementById(

            "memberSelect"

        ).value =

            data.memberId;

        alert(

            "Name added successfully."

        );

    }

    catch (

        error

    ) {

        console.error(

            error

        );

        alert(

            "Unable to add member."

        );

    }

    button.disabled = false;

    button.innerHTML =

        oldText;

}

/*
====================================
RENDER QUESTIONS
====================================
*/

function renderQuestions() {

    const container =

        document.getElementById(

            "questions"

        );

    container.innerHTML = "";

    quizData.forEach(

        (

            question,

            index

        ) => {

            let options = "";

            [

                "A",

                "B",

                "C",

                "D"

            ].forEach(

                letter => {

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

                                value="${letter}"

                            >

                            <span>

                                <strong>

                                    ${letter}.

                                </strong>

                                ${text}

                            </span>

                        </label>

                    `;

                }

            );

            container.innerHTML += `

                <div class="question-card">

                    <div class="question-number">

                        Question

                        ${index + 1}

                    </div>

                    <h3>

                        ${question.question}

                    </h3>

                    <div class="options">

                        ${options}

                    </div>

                </div>

            `;

        }

    );

}



/*
====================================
SUBMIT QUIZ
====================================
*/

async function submitQuiz() {

    const memberId =

        document.getElementById(

            "memberSelect"

        ).value;

    if (

        !memberId

    ) {

        alert(

            "Please select your name."

        );

        return;

    }

    const submitBtn =

        document.getElementById(

            "submitBtn"

        );

    submitBtn.disabled = true;

    submitBtn.innerHTML =

        "Submitting...";

    const answers = {};

    quizData.forEach(

        (

            question,

            index

        ) => {

            const checked =

                document.querySelector(

                    `input[name="q${index}"]:checked`

                );

            answers[

                index + 1

            ] =

                checked

                ?

                checked.value

                :

                "";

        }

    );

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

                            memberId,

                            lessonNo:

                                selectedLesson,

                            answers

                        })

                }

            );

        const data =

            await response.json();

        if (

            !data.success

        ) {

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

            data.review;

        reviewQuestions =

            data.questions;

        localStorage.setItem(

            "lastQuizReview",

            JSON.stringify(

                data.review

            )

        );

        localStorage.setItem(

            "lastQuizQuestions",

            JSON.stringify(

                data.questions

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

            "quizSection"

        ).classList.add(

            "hidden"

        );

        document.getElementById(

            "resultSection"

        ).classList.remove(

            "hidden"

        );

        document.getElementById(

            "scoreText"

        ).textContent =

            data.score;

        document.getElementById(

            "pointsText"

        ).textContent =

            `Points earned: ${data.pointsEarned}`;

        document.getElementById(

            "totalPointsText"

        ).textContent =

            `Total points: ${data.totalPoints}`;

    }

    catch (

        error

    ) {

        console.error(

            error

        );

        alert(

            "Unable to submit quiz."

        );

        submitBtn.disabled = false;

        submitBtn.innerHTML =

            "Submit Quiz";

    }

}

/*
====================================
SHOW REVIEW
====================================
*/

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

    if (

        !reviewQuestions ||

        reviewQuestions.length === 0

    ) {

        reviewQuestions =

            JSON.parse(

                localStorage.getItem(

                    "lastQuizQuestions"

                )

            ) || [];

    }

    if (

        reviewData.length === 0 ||

        reviewQuestions.length === 0

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

    let html = "";

    reviewData.forEach(

        (

            item,

            index

        ) => {

            const q =

                reviewQuestions[

                    index

                ];

            if (!q) {

                return;

            }

            html += `

                <div class="question-card">

                    <div class="question-number">

                        Question

                        ${index + 1}

                    </div>

                    <h3>

                        ${q.question}

                    </h3>

            `;

            [

                "A",

                "B",

                "C",

                "D"

            ].forEach(

                letter => {

                    const text =

                        q[

                            `option${letter}`

                        ];

                    if (

                        !text

                    ) {

                        return;

                    }

                    let bg =

                        "#ffffff";

                    let border =

                        "#ececec";

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

                            "✅ Correct Answer";

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
                            padding:16px;
                            border-radius:14px;
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
                                font-size:.75rem;
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

        <div
            style="
                display:flex;
                justify-content:center;
                margin-top:20px;
            "
        >

            <button
                onclick="hideReview()"
            >

                Back

            </button>

        </div>

    `;

    container.innerHTML =

        html;

    document.getElementById(

        "resultSection"

    ).classList.add(

        "hidden"

    );

    document.getElementById(

        "reviewSection"

    ).classList.remove(

        "hidden"

    );

}



/*
====================================
HIDE REVIEW
====================================
*/

function hideReview() {

    document.getElementById(

        "reviewSection"

    ).classList.add(

        "hidden"

    );

    document.getElementById(

        "resultSection"

    ).classList.remove(

        "hidden"

    );

}

/*
====================================
OPEN SAVED SCORE
====================================
*/

function openSavedScore() {

    const score =

        localStorage.getItem(

            "lastQuizScore"

        );

    const points =

        localStorage.getItem(

            "lastQuizPoints"

        );

    const total =

        localStorage.getItem(

            "lastQuizTotal"

        );

    if (

        !score

    ) {

        alert(

            "No saved score found."

        );

        return;

    }

    document.getElementById(

        "scoreText"

    ).textContent =

        score;

    document.getElementById(

        "pointsText"

    ).textContent =

        `Points earned: ${points}`;

    document.getElementById(

        "totalPointsText"

    ).textContent =

        `Total points: ${total}`;

    document.getElementById(

        "quizSection"

    ).classList.add(

        "hidden"

    );

    document.getElementById(

        "reviewSection"

    ).classList.add(

        "hidden"

    );

    document.getElementById(

        "resultSection"

    ).classList.remove(

        "hidden"

    );

}



/*
====================================
OPEN SAVED REVIEW
====================================
*/

function openSavedReview() {

    reviewData =

        JSON.parse(

            localStorage.getItem(

                "lastQuizReview"

            )

        ) || [];

    reviewQuestions =

        JSON.parse(

            localStorage.getItem(

                "lastQuizQuestions"

            )

        ) || [];

    if (

        reviewData.length === 0 ||

        reviewQuestions.length === 0

    ) {

        alert(

            "No review available."

        );

        return;

    }

    showReview();

}



/*
====================================
BACK TO QUIZ
====================================
*/

function backToQuiz() {

    document.getElementById(

        "resultSection"

    ).classList.add(

        "hidden"

    );

    document.getElementById(

        "reviewSection"

    ).classList.add(

        "hidden"

    );

    document.getElementById(

        "quizSection"

    ).classList.remove(

        "hidden"

    );

}



/*
====================================
CHECK SAVED QUIZ
====================================
*/

function checkSavedQuiz() {

    const score =

        localStorage.getItem(

            "lastQuizScore"

        );

    const review =

        localStorage.getItem(

            "lastQuizReview"

        );

    const savedSection =

        document.getElementById(

            "savedSection"

        );

    if (

        score ||

        review

    ) {

        savedSection.classList.remove(

            "hidden"

        );

    }

}



/*
====================================
INITIALIZE SAVED DATA
====================================
*/

document.addEventListener(

    "DOMContentLoaded",

    () => {

        checkSavedQuiz();

    }

);
