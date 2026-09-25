/**
 * ============================================================
 * AFC ISIU YOUTH PORTAL V2
 * FILE: slcreport-dashboard.js
 * PURPOSE: QUIZ COORDINATOR DASHBOARD
 * ============================================================
 *
 * Handles:
 * - Dashboard authentication
 * - Dashboard overview
 * - Quiz Questions
 * - Add Question
 * - Edit Question
 * - Delete Question
 * - Quiz Attempts
 *
 * IMPORTANT:
 * - Uses the existing dashboard session.
 * - Does not change participant quiz logic.
 * - Does not change scoreQuiz().
 * ============================================================
 */


/* ============================================================
   CONFIG
============================================================ */

const API_URL =
    "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";

const SESSION_KEY =
    "afc_isiu_slc_leader_session";


/* ============================================================
   STATE
============================================================ */

let dashboardSession = null;

let dashboardQuestions = [];

let dashboardAttempts = [];

let questionBeingEdited = null;

let questionBeingDeleted = null;

let questionSaveInProgress = false;

let questionDeleteInProgress = false;


/* ============================================================
   DOM READY
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        setupDashboard();

        restoreDashboardSession();

    }
);


/* ============================================================
   DASHBOARD SETUP
============================================================ */

function setupDashboard() {

    setupDashboardControls();

    setupQuestionsControls();

    setupQuestionEditor();

    setupQuestionDeleteModal();

    setupAttemptsControls();

    setupDashboardNavigation();

}


/* ============================================================
   DASHBOARD CONTROLS
============================================================ */

function setupDashboardControls() {

    const loadButton =
        document.getElementById(
            "loadDashboardButton"
        );


    if (loadButton) {

        loadButton.addEventListener(
            "click",
            function () {

                loadDashboardOverview();

            }
        );

    }

}


/* ============================================================
   DASHBOARD NAVIGATION
============================================================ */

function setupDashboardNavigation() {

    const buttons =
        document.querySelectorAll(
            "[data-dashboard-section]"
        );


    buttons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    const section =
                        button.dataset.dashboardSection;

                    if (!section) {
                        return;
                    }

                    activateDashboardSection(
                        section
                    );

                }
            );

        }
    );

}


/**
 * Activate a dashboard section.
 */
function activateDashboardSection(
    sectionName
) {

    const buttons =
        document.querySelectorAll(
            ".quiz-nav-button"
        );

    const sections =
        document.querySelectorAll(
            ".quiz-dashboard-section"
        );


    buttons.forEach(
        function (button) {

            button.classList.toggle(
                "active",
                button.dataset.dashboardSection ===
                    sectionName
            );

        }
    );


    sections.forEach(
        function (section) {

            const expectedId =
                "dashboardSection" +
                sectionName
                    .charAt(0)
                    .toUpperCase() +
                sectionName.slice(1);


            section.classList.toggle(
                "active",
                section.id === expectedId
            );

        }
    );


    /*
     * Load Questions when opened.
     */
    if (
        sectionName === "questions" &&
        dashboardSession
    ) {

        loadQuizQuestions();

    }


    /*
     * Load Attempts when opened.
     */
    if (
        sectionName === "attempts" &&
        dashboardSession
    ) {

        loadQuizAttempts();

    }

}


/* ============================================================
   RESTORE DASHBOARD SESSION
============================================================ */

function restoreDashboardSession() {

    const rawSession =
        localStorage.getItem(
            SESSION_KEY
        );


    if (!rawSession) {

        showDashboardEmpty(
            "Please log in to access the Quiz Coordinator Dashboard."
        );

        return;

    }


    try {

        dashboardSession =
            JSON.parse(
                rawSession
            );

    } catch (error) {

        console.error(
            "Invalid dashboard session:",
            error
        );


        localStorage.removeItem(
            SESSION_KEY
        );


        showDashboardEmpty(
            "Your dashboard session is invalid. Please log in again."
        );

        return;

    }


    if (
        !dashboardSession ||
        !dashboardSession.token
    ) {

        localStorage.removeItem(
            SESSION_KEY
        );


        showDashboardEmpty(
            "Your dashboard session is invalid. Please log in again."
        );

        return;

    }


    verifyDashboardAccess();

}


/* ============================================================
   VERIFY DASHBOARD ACCESS
============================================================ */

async function verifyDashboardAccess() {

    setDashboardStatus(
        "Checking dashboard access...",
        "loading"
    );


    try {

        const response =
            await dashboardGet({

                action:
                    "getSLCAdminOverview",

                token:
                    dashboardSession.token

            });


        if (
            !response ||
            response.success === false
        ) {

            throw new Error(
                response &&
                response.message
                    ? response.message
                    : "Unable to verify dashboard access."
            );

        }


        renderDashboardOverview(
            response
        );


        /*
         * Load questions after access is verified.
         */
        if (
            document.getElementById(
                "questionsTableBody"
            )
        ) {

            loadQuizQuestions();

        }


    } catch (error) {

        console.error(
            "Dashboard access error:",
            error
        );


        setDashboardStatus(
            error.message ||
                "Unable to load dashboard.",
            "error"
        );

    }

}


/* ============================================================
   LOAD OVERVIEW
============================================================ */

async function loadDashboardOverview() {

    if (
        !dashboardSession ||
        !dashboardSession.token
    ) {

        setDashboardStatus(
            "Please log in again.",
            "error"
        );

        return;

    }


    const button =
        document.getElementById(
            "loadDashboardButton"
        );


    if (button) {

        button.disabled = true;

        const originalText =
            button.innerHTML;

        button.dataset.originalText =
            originalText;

        button.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i><span>Loading...</span>';

    }


    setDashboardStatus(
        "Loading dashboard...",
        "loading"
    );


    try {

        const lessonInput =
            document.getElementById(
                "dashboardLessonNo"
            );


        const lessonNo =
            lessonInput
                ? String(
                    lessonInput.value || ""
                  ).trim()
                : "";


        const params = {

            action:
                "getSLCAdminOverview",

            token:
                dashboardSession.token

        };


        if (lessonNo) {

            params.lessonNo =
                lessonNo;

        }


        const response =
            await dashboardGet(
                params
            );


        if (
            !response ||
            response.success === false
        ) {

            throw new Error(
                response &&
                response.message
                    ? response.message
                    : "Unable to load dashboard."
            );

        }


        renderDashboardOverview(
            response
        );


    } catch (error) {

        console.error(
            "Dashboard overview error:",
            error
        );


        setDashboardStatus(
            error.message ||
                "Unable to load dashboard.",
            "error"
        );


    } finally {

        if (button) {

            button.disabled = false;

            button.innerHTML =
                button.dataset.originalText ||
                '<i class="fa-solid fa-rotate"></i><span>Load Report</span>';

        }

    }

}


/* ============================================================
   RENDER OVERVIEW
============================================================ */

function renderDashboardOverview(
    data
) {

    const overview =
        data.overview ||
        data;


    const totalMembers =
        Number(
            overview.totalMembers || 0
        );


    const participated =
        Number(
            overview.participated || 0
        );


    const notParticipated =
        Number(
            overview.notParticipated || 0
        );


    let participationRate =
        Number(
            overview.participationRate || 0
        );


    if (
        !Number.isFinite(
            participationRate
        )
    ) {

        participationRate = 0;

    }


    participationRate =
        Math.max(
            0,
            Math.min(
                100,
                participationRate
            )
        );


    const progressPercentage =
        Number(
            overview.progressPercentage ||
            participationRate ||
            0
        );


    setText(
        "statTotalMembers",
        totalMembers
    );


    setText(
        "statParticipated",
        participated
    );


    setText(
        "statNotParticipated",
        notParticipated
    );


    setText(
        "statParticipationRate",
        Math.round(
            participationRate
        ) + "%"
    );


    setText(
        "progressPercentage",
        Math.round(
            progressPercentage
        ) + "%"
    );


    const progressFill =
        document.getElementById(
            "participationProgress"
        );


    if (progressFill) {

        progressFill.style.width =
            Math.max(
                0,
                Math.min(
                    100,
                    progressPercentage
                )
            ) + "%";

    }


    setText(
        "progressDescription",
        overview.progressDescription ||
            getParticipationDescription(
                participationRate
            )
    );


    setText(
        "dashboardLessonTitle",
        overview.lessonTitle ||
            overview.currentQuizTitle ||
            "Weekly SLC Quiz"
    );


    setText(
        "dashboardReportDate",
        formatDashboardDate(
            overview.reportDate ||
            overview.quizDate ||
            ""
        )
    );


    setText(
        "groupNameDisplay",
        overview.groupName ||
            "—"
    );


    setText(
        "groupLeaderDisplay",
        overview.groupLeaderName ||
            "—"
    );


    setText(
        "reportVersionDisplay",
        overview.reportVersion ||
            "—"
    );


    setText(
        "reportDateDisplay",
        formatDashboardDate(
            overview.reportDate ||
            ""
        )
    );


    renderNonParticipants(
        overview.nonParticipants ||
            []
    );


    const observations =
        String(
            overview.observations || ""
        ).trim();


    const observationCard =
        document.getElementById(
            "observationsCard"
        );


    const observationDisplay =
        document.getElementById(
            "observationsDisplay"
        );


    if (
        observationCard &&
        observationDisplay
    ) {

        if (observations) {

            observationDisplay.textContent =
                observations;

            observationCard.classList.remove(
                "hidden"
            );

        } else {

            observationCard.classList.add(
                "hidden"
            );

        }

    }


    const summary =
        document.getElementById(
            "dashboardSummary"
        );


    const empty =
        document.getElementById(
            "dashboardEmpty"
        );


    if (summary) {

        summary.classList.remove(
            "hidden"
        );

    }


    if (empty) {

        empty.classList.add(
            "hidden"
        );

    }


    setDashboardStatus(
        "Dashboard loaded successfully.",
        "success"
    );

}


/* ============================================================
   NON-PARTICIPANTS
============================================================ */

function renderNonParticipants(
    members
) {

    const list =
        document.getElementById(
            "nonParticipantsDisplay"
        );


    const count =
        document.getElementById(
            "nonParticipantCount"
        );


    if (!Array.isArray(members)) {

        members = [];

    }


    if (count) {

        count.textContent =
            members.length;

    }


    if (!list) {
        return;
    }


    if (!members.length) {

        list.innerHTML =
            '<div class="slc-empty-state">Everyone has participated.</div>';

        return;

    }


    list.innerHTML =
        members
            .map(
                function (
                    member,
                    index
                ) {

                    const name =
                        typeof member === "string"
                            ? member
                            : (
                                member.name ||
                                member.fullName ||
                                "Unnamed member"
                            );


                    return `
                        <div class="slc-member-item">

                            <span class="slc-member-number">
                                ${index + 1}
                            </span>

                            <span>
                                ${escapeHtml(name)}
                            </span>

                        </div>
                    `;

                }
            )
            .join("");

}


/* ============================================================
   QUESTIONS CONTROLS
============================================================ */

function setupQuestionsControls() {

    const refreshButton =
        document.getElementById(
            "refreshQuestionsButton"
        );


    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            function () {

                loadQuizQuestions();

            }
        );

    }


    const lessonFilter =
        document.getElementById(
            "questionsLessonFilter"
        );


    if (lessonFilter) {

        lessonFilter.addEventListener(
            "input",
            function () {

                filterQuizQuestions();

            }
        );

    }


    const addButton =
        document.getElementById(
            "addQuestionButton"
        );


    if (addButton) {

        addButton.addEventListener(
            "click",
            function () {

                openQuestionEditor();

            }
        );

    }


    const tableBody =
        document.getElementById(
            "questionsTableBody"
        );


    if (tableBody) {

        tableBody.addEventListener(
            "click",
            function (event) {

                const actionButton =
                    event.target.closest(
                        "[data-question-action]"
                    );


                if (!actionButton) {
                    return;
                }


                const action =
                    actionButton.dataset.questionAction;


                const rowNumber =
                    Number(
                        actionButton.dataset.rowNumber
                    );


                if (
                    !Number.isInteger(
                        rowNumber
                    )
                ) {

                    return;

                }


                if (action === "edit") {

                    openQuestionEditor(
                        rowNumber
                    );

                }


                if (action === "delete") {

                    openQuestionDeleteModal(
                        rowNumber
                    );

                }

            }
        );

    }

}


/* ============================================================
   LOAD QUESTIONS
============================================================ */

async function loadQuizQuestions() {

    if (
        !dashboardSession ||
        !dashboardSession.token
    ) {

        setQuestionsStatus(
            "Please log in again.",
            "error"
        );

        return;

    }


    setQuestionsStatus(
        "Loading quiz questions...",
        "loading"
    );


    const refreshButton =
        document.getElementById(
            "refreshQuestionsButton"
        );


    if (refreshButton) {

        refreshButton.disabled = true;

        refreshButton.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i><span>Loading...</span>';

    }


    try {

        const response =
            await dashboardGet({

                action:
                    "getSLCAdminQuizQuestions",

                token:
                    dashboardSession.token

            });


        if (
            !response ||
            response.success === false
        ) {

            throw new Error(
                response &&
                response.message
                    ? response.message
                    : "Unable to load quiz questions."
            );

        }


        dashboardQuestions =
            Array.isArray(
                response.questions
            )
                ? response.questions
                : [];


        renderQuizQuestions();


        setQuestionsStatus(
            dashboardQuestions.length +
                (
                    dashboardQuestions.length === 1
                        ? " question"
                        : " questions"
                ) +
                " loaded.",
            "success"
        );


    } catch (error) {

        console.error(
            "Quiz questions error:",
            error
        );


        setQuestionsStatus(
            error.message ||
                "Unable to load quiz questions.",
            "error"
        );


    } finally {

        if (refreshButton) {

            refreshButton.disabled = false;

            refreshButton.innerHTML =
                '<i class="fa-solid fa-rotate"></i><span>Refresh</span>';

        }

    }

}


/* ============================================================
   RENDER QUESTIONS
============================================================ */

function renderQuizQuestions() {

    const tableBody =
        document.getElementById(
            "questionsTableBody"
        );


    if (!tableBody) {
        return;
    }


    const questions =
        getFilteredQuestions();


    updateQuestionsCount(
        questions.length
    );


    if (!questions.length) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="questions-empty-cell"
                >
                    No quiz questions found.
                </td>
            </tr>
        `;

        return;

    }


    tableBody.innerHTML =
        questions
            .map(
                function (item) {

                    return `
                        <tr>

                            <td>
                                <span class="question-lesson-badge">
                                    ${escapeHtml(
                                        item.lessonNo
                                    )}
                                </span>
                            </td>


                            <td>
                                <div class="admin-question-text">
                                    ${escapeHtml(
                                        item.question
                                    )}
                                </div>
                            </td>


                            <td>

                                <div class="question-options">

                                    <div>
                                        <strong>A.</strong>
                                        ${escapeHtml(
                                            item.optionA
                                        )}
                                    </div>

                                    <div>
                                        <strong>B.</strong>
                                        ${escapeHtml(
                                            item.optionB
                                        )}
                                    </div>

                                    <div>
                                        <strong>C.</strong>
                                        ${escapeHtml(
                                            item.optionC
                                        )}
                                    </div>

                                    <div>
                                        <strong>D.</strong>
                                        ${escapeHtml(
                                            item.optionD
                                        )}
                                    </div>

                                </div>

                            </td>


                            <td>

                                <span
                                    class="correct-answer-badge"
                                    title="Correct answer"
                                >
                                    ${escapeHtml(
                                        item.correctOption
                                    )}
                                </span>

                            </td>


                            <td>
                                ${escapeHtml(
                                    item.points
                                )}
                            </td>


                            <td>

                                <div class="question-action-group">

                                    <button
                                        type="button"
                                        class="question-action-button edit"
                                        data-question-action="edit"
                                        data-row-number="${escapeHtml(
                                            item.rowNumber
                                        )}"
                                    >

                                        <i class="fa-solid fa-pen"></i>

                                        <span>
                                            Edit
                                        </span>

                                    </button>


                                    <button
                                        type="button"
                                        class="question-action-button delete"
                                        data-question-action="delete"
                                        data-row-number="${escapeHtml(
                                            item.rowNumber
                                        )}"
                                    >

                                        <i class="fa-solid fa-trash"></i>

                                        <span>
                                            Delete
                                        </span>

                                    </button>

                                </div>

                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}


/* ============================================================
   FILTER QUESTIONS
============================================================ */

function filterQuizQuestions() {

    renderQuizQuestions();

}


/* ============================================================
   GET FILTERED QUESTIONS
============================================================ */

function getFilteredQuestions() {

    const filterInput =
        document.getElementById(
            "questionsLessonFilter"
        );


    const filter =
        filterInput
            ? String(
                filterInput.value || ""
              )
                .trim()
                .toLowerCase()
            : "";


    if (!filter) {

        return dashboardQuestions;

    }


    return dashboardQuestions.filter(
        function (item) {

            return String(
                item.lessonNo || ""
            )
                .toLowerCase()
                .includes(filter);

        }
    );

}


/* ============================================================
   QUESTION COUNT
============================================================ */

function updateQuestionsCount(
    count
) {

    const element =
        document.getElementById(
            "questionsCount"
        );


    if (!element) {
        return;
    }


    element.textContent =
        count +
        (
            count === 1
                ? " question"
                : " questions"
        );

}


/* ============================================================
   QUESTION EDITOR SETUP
============================================================ */

function setupQuestionEditor() {

    const form =
        document.getElementById(
            "questionEditorForm"
        );


    if (form) {

        form.addEventListener(
            "submit",
            handleQuestionFormSubmit
        );

    }


    document.addEventListener(
        "click",
        function (event) {

            const closeButton =
                event.target.closest(
                    "[data-question-modal-close]"
                );


            if (!closeButton) {
                return;
            }


            closeQuestionEditor();

        }
    );


    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key !== "Escape"
            ) {

                return;

            }


            closeQuestionEditor();

            closeQuestionDeleteModal();

        }
    );

}


/* ============================================================
   OPEN QUESTION EDITOR
============================================================ */

function openQuestionEditor(
    rowNumber
) {

    const modal =
        document.getElementById(
            "questionEditorModal"
        );


    if (!modal) {
        return;
    }


    questionBeingEdited =
        null;


    const numericRow =
        Number(rowNumber);


    const isEditing =
        Number.isInteger(
            numericRow
        ) &&
        numericRow >= 2;


    if (isEditing) {

        const question =
            dashboardQuestions.find(
                function (item) {

                    return Number(
                        item.rowNumber
                    ) === numericRow;

                }
            );


        if (!question) {

            setQuestionsStatus(
                "That question could not be found. Please refresh the list.",
                "error"
            );

            return;

        }


        questionBeingEdited =
            question;


        setText(
            "questionEditorEyebrow",
            "Edit Question"
        );


        setText(
            "questionEditorTitle",
            "Edit Quiz Question"
        );


        setText(
            "questionEditorDescription",
            "Update this question and save your changes."
        );


        fillQuestionEditor(
            question
        );


    } else {

        setText(
            "questionEditorEyebrow",
            "New Question"
        );


        setText(
            "questionEditorTitle",
            "Add Quiz Question"
        );


        setText(
            "questionEditorDescription",
            "Create a new question for the SLC quiz."
        );


        clearQuestionEditor();

    }


    setQuestionEditorStatus(
        "",
        ""
    );


    modal.classList.add(
        "active"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "question-modal-open"
    );


    const firstInput =
        document.getElementById(
            "questionEditorLessonNo"
        );


    if (firstInput) {

        window.setTimeout(
            function () {

                firstInput.focus();

            },
            100
        );

    }

}


/* ============================================================
   CLOSE QUESTION EDITOR
============================================================ */

function closeQuestionEditor() {

    const modal =
        document.getElementById(
            "questionEditorModal"
        );


    if (!modal) {
        return;
    }


    if (questionSaveInProgress) {
        return;
    }


    modal.classList.remove(
        "active"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.classList.remove(
        "question-modal-open"
    );


    questionBeingEdited =
        null;

}


/* ============================================================
   FILL EDITOR
============================================================ */

function fillQuestionEditor(
    question
) {

    setInputValue(
        "questionEditorRowNumber",
        question.rowNumber
    );


    setInputValue(
        "questionEditorLessonNo",
        question.lessonNo
    );


    setInputValue(
        "questionEditorQuestion",
        question.question
    );


    setInputValue(
        "questionEditorOptionA",
        question.optionA
    );


    setInputValue(
        "questionEditorOptionB",
        question.optionB
    );


    setInputValue(
        "questionEditorOptionC",
        question.optionC
    );


    setInputValue(
        "questionEditorOptionD",
        question.optionD
    );


    setInputValue(
        "questionEditorCorrectOption",
        question.correctOption
    );


    setInputValue(
        "questionEditorPoints",
        question.points
    );

}


/* ============================================================
   CLEAR EDITOR
============================================================ */

function clearQuestionEditor() {

    const form =
        document.getElementById(
            "questionEditorForm"
        );


    if (form) {

        form.reset();

    }


    setInputValue(
        "questionEditorRowNumber",
        ""
    );


    setInputValue(
        "questionEditorCorrectOption",
        ""
    );


    setInputValue(
        "questionEditorPoints",
        "200"
    );

}


/* ============================================================
   QUESTION FORM SUBMIT
============================================================ */

async function handleQuestionFormSubmit(
    event
) {

    event.preventDefault();


    if (questionSaveInProgress) {
        return;
    }


    if (
        !dashboardSession ||
        !dashboardSession.token
    ) {

        setQuestionEditorStatus(
            "Your session has expired. Please log in again.",
            "error"
        );

        return;

    }


    const data =
        collectQuestionFormData();


    const validationError =
        validateQuestionFormData(
            data
        );


    if (validationError) {

        setQuestionEditorStatus(
            validationError,
            "error"
        );

        return;

    }


    questionSaveInProgress =
        true;


    const saveButton =
        document.getElementById(
            "saveQuestionButton"
        );


    if (saveButton) {

        saveButton.disabled = true;

        saveButton.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i><span>Saving...</span>';

    }


    setQuestionEditorStatus(
        questionBeingEdited
            ? "Saving your changes..."
            : "Adding the question...",
        "loading"
    );


    try {

        const action =
            questionBeingEdited
                ? "updateSLCAdminQuizQuestion"
                : "addSLCAdminQuizQuestion";


        if (
            questionBeingEdited
        ) {

            data.rowNumber =
                Number(
                    questionBeingEdited.rowNumber
                );

        }


        const response =
            await dashboardPost({

                action:
                    action,

                token:
                    dashboardSession.token,

                ...data

            });


        if (
            !response ||
            response.success === false
        ) {

            throw new Error(
                response &&
                response.message
                    ? response.message
                    : "Unable to save quiz question."
            );

        }


        setQuestionEditorStatus(
            response.message ||
                "Question saved successfully.",
            "success"
        );


        await loadQuizQuestions();


        window.setTimeout(
            function () {

                closeQuestionEditor();

            },
            450
        );


    } catch (error) {

        console.error(
            "Save question error:",
            error
        );


        setQuestionEditorStatus(
            error.message ||
                "Unable to save quiz question.",
            "error"
        );


    } finally {

        questionSaveInProgress =
            false;


        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.innerHTML =
                '<i class="fa-solid fa-floppy-disk"></i><span>Save Question</span>';

        }

    }

}


/* ============================================================
   COLLECT FORM DATA
============================================================ */

function collectQuestionFormData() {

    return {

        lessonNo:
            getInputValue(
                "questionEditorLessonNo"
            ),

        question:
            getInputValue(
                "questionEditorQuestion"
            ),

        optionA:
            getInputValue(
                "questionEditorOptionA"
            ),

        optionB:
            getInputValue(
                "questionEditorOptionB"
            ),

        optionC:
            getInputValue(
                "questionEditorOptionC"
            ),

        optionD:
            getInputValue(
                "questionEditorOptionD"
            ),

        correctOption:
            getInputValue(
                "questionEditorCorrectOption"
            )
                .toUpperCase(),

        points:
            Number(
                getInputValue(
                    "questionEditorPoints"
                )
            )

    };

}


/* ============================================================
   VALIDATE FORM
============================================================ */

function validateQuestionFormData(
    data
) {

    if (!data.lessonNo) {

        return "Lesson number is required.";

    }


    if (!data.question) {

        return "Question is required.";

    }


    if (
        !data.optionA ||
        !data.optionB ||
        !data.optionC ||
        !data.optionD
    ) {

        return "Please provide all four answer options.";

    }


    if (
        ["A", "B", "C", "D"].indexOf(
            data.correctOption
        ) === -1
    ) {

        return "Please select the correct answer.";

    }


    if (
        !Number.isFinite(
            data.points
        ) ||
        data.points <= 0
    ) {

        return "Points must be greater than zero.";

    }


    return "";

}


/* ============================================================
   QUESTION DELETE MODAL
============================================================ */

function setupQuestionDeleteModal() {

    document.addEventListener(
        "click",
        function (event) {

            const closeButton =
                event.target.closest(
                    "[data-delete-modal-close]"
                );


            if (!closeButton) {
                return;
            }


            closeQuestionDeleteModal();

        }
    );


    const confirmButton =
        document.getElementById(
            "confirmDeleteQuestionButton"
        );


    if (confirmButton) {

        confirmButton.addEventListener(
            "click",
            handleQuestionDelete
        );

    }

}


/* ============================================================
   OPEN DELETE MODAL
============================================================ */

function openQuestionDeleteModal(
    rowNumber
) {

    const question =
        dashboardQuestions.find(
            function (item) {

                return Number(
                    item.rowNumber
                ) === Number(
                    rowNumber
                );

            }
        );


    if (!question) {

        setQuestionsStatus(
            "That question could not be found. Please refresh the list.",
            "error"
        );

        return;

    }


    questionBeingDeleted =
        question;


    const message =
        document.getElementById(
            "questionDeleteMessage"
        );


    if (message) {

        message.textContent =
            "You are about to permanently delete this question: “" +
            question.question +
            "”";

    }


    setQuestionDeleteStatus(
        "",
        ""
    );


    const modal =
        document.getElementById(
            "questionDeleteModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.add(
        "active"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "question-modal-open"
    );

}


/* ============================================================
   CLOSE DELETE MODAL
============================================================ */

function closeQuestionDeleteModal() {

    const modal =
        document.getElementById(
            "questionDeleteModal"
        );


    if (!modal) {
        return;
    }


    if (questionDeleteInProgress) {
        return;
    }


    modal.classList.remove(
        "active"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.classList.remove(
        "question-modal-open"
    );


    questionBeingDeleted =
        null;

}


/* ============================================================
   DELETE QUESTION
============================================================ */

async function handleQuestionDelete() {

    if (
        questionDeleteInProgress ||
        !questionBeingDeleted
    ) {

        return;

    }


    if (
        !dashboardSession ||
        !dashboardSession.token
    ) {

        setQuestionDeleteStatus(
            "Your session has expired. Please log in again.",
            "error"
        );

        return;

    }


    questionDeleteInProgress =
        true;


    const button =
        document.getElementById(
            "confirmDeleteQuestionButton"
        );


    if (button) {

        button.disabled = true;

        button.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i><span>Deleting...</span>';

    }


    setQuestionDeleteStatus(
        "Deleting question...",
        "loading"
    );


    try {

        const response =
            await dashboardPost({

                action:
                    "deleteSLCAdminQuizQuestion",

                token:
                    dashboardSession.token,

                rowNumber:
                    Number(
                        questionBeingDeleted.rowNumber
                    )

            });


        if (
            !response ||
            response.success === false
        ) {

            throw new Error(
                response &&
                response.message
                    ? response.message
                    : "Unable to delete quiz question."
            );

        }


        setQuestionDeleteStatus(
            response.message ||
                "Question deleted successfully.",
            "success"
        );


        await loadQuizQuestions();


        window.setTimeout(
            function () {

                closeQuestionDeleteModal();

            },
            400
        );


    } catch (error) {

        console.error(
            "Delete question error:",
            error
        );


        setQuestionDeleteStatus(
            error.message ||
                "Unable to delete quiz question.",
            "error"
        );


    } finally {

        questionDeleteInProgress =
            false;


        if (button) {

            button.disabled =
                false;

            button.innerHTML =
                '<i class="fa-solid fa-trash"></i><span>Delete Question</span>';

        }

    }

}


/* ============================================================
   QUIZ ATTEMPTS — CONTROLS
============================================================ */

function setupAttemptsControls() {

    const refreshButton =
        document.getElementById(
            "refreshAttemptsButton"
        );


    const lessonFilter =
        document.getElementById(
            "attemptsLessonFilter"
        );


    const searchInput =
        document.getElementById(
            "attemptsSearchInput"
        );


    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            function () {

                if (
                    !dashboardSession ||
                    !dashboardSession.token
                ) {

                    return;

                }


                loadQuizAttempts();

            }
        );

    }


    if (lessonFilter) {

        lessonFilter.addEventListener(
            "input",
            filterQuizAttempts
        );

    }


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            filterQuizAttempts
        );

    }

}


/* ============================================================
   LOAD QUIZ ATTEMPTS
============================================================ */

async function loadQuizAttempts() {

    if (
        !dashboardSession ||
        !dashboardSession.token
    ) {

        return;

    }


    setAttemptsStatus(
        "Loading quiz attempts..."
    );


    const tableBody =
        document.getElementById(
            "attemptsTableBody"
        );


    const refreshButton =
        document.getElementById(
            "refreshAttemptsButton"
        );


    if (refreshButton) {

        refreshButton.disabled = true;

        refreshButton.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i><span>Loading...</span>';

    }


    if (tableBody) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="attempts-empty-cell"
                >
                    Loading quiz attempts...
                </td>
            </tr>
        `;

    }


    try {

        const response =
            await dashboardGet({

                action:
                    "getSLCAdminQuizAttempts",

                token:
                    dashboardSession.token

            });


        if (
            !response
        ) {

            throw new Error(
                "No response was received from the server."
            );

        }


        if (
            response.success === false
        ) {

            throw new Error(
                response.message ||
                response.error ||
                "Unable to load quiz attempts."
            );

        }


        dashboardAttempts =
            Array.isArray(
                response.attempts
            )
                ? response.attempts
                : [];


        renderQuizAttempts(
            dashboardAttempts
        );


        setAttemptsStatus(
            dashboardAttempts.length +
            " attempt" +
            (
                dashboardAttempts.length === 1
                    ? ""
                    : "s"
            ) +
            " found."
        );


    } catch (error) {

        console.error(
            "Load quiz attempts error:",
            error
        );


        dashboardAttempts =
            [];


        if (tableBody) {

            tableBody.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        class="attempts-empty-cell"
                    >
                        Unable to load quiz attempts.
                    </td>
                </tr>
            `;

        }


        updateAttemptsCount(
            0
        );


        setAttemptsStatus(
            error.message ||
            "Unable to load quiz attempts."
        );


    } finally {

        if (refreshButton) {

            refreshButton.disabled = false;

            refreshButton.innerHTML =
                '<i class="fa-solid fa-rotate"></i><span>Refresh</span>';

        }

    }

}


/* ============================================================
   FILTER QUIZ ATTEMPTS
============================================================ */

function filterQuizAttempts() {

    const lessonInput =
        document.getElementById(
            "attemptsLessonFilter"
        );


    const searchInput =
        document.getElementById(
            "attemptsSearchInput"
        );


    const lessonValue =
        lessonInput
            ? String(
                lessonInput.value || ""
              )
                .trim()
                .toLowerCase()
            : "";


    const searchValue =
        searchInput
            ? String(
                searchInput.value || ""
              )
                .trim()
                .toLowerCase()
            : "";


    const filtered =
        dashboardAttempts.filter(
            function (attempt) {

                const lesson =
                    String(
                        attempt.lessonNo || ""
                    )
                        .toLowerCase();


                const name =
                    String(
                        attempt.name || ""
                    )
                        .toLowerCase();


                const memberId =
                    String(
                        attempt.memberId || ""
                    )
                        .toLowerCase();


                const matchesLesson =
                    !lessonValue ||
                    lesson === lessonValue;


                const matchesSearch =
                    !searchValue ||
                    name.includes(
                        searchValue
                    ) ||
                    memberId.includes(
                        searchValue
                    );


                return (
                    matchesLesson &&
                    matchesSearch
                );

            }
        );


    renderQuizAttempts(
        filtered
    );


    setAttemptsStatus(
        filtered.length +
        " matching attempt" +
        (
            filtered.length === 1
                ? ""
                : "s"
        ) +
        "."
    );

}


/* ============================================================
   RENDER QUIZ ATTEMPTS
============================================================ */

function renderQuizAttempts(
    attempts
) {

    const tableBody =
        document.getElementById(
            "attemptsTableBody"
        );


    if (!tableBody) {
        return;
    }


    const safeAttempts =
        Array.isArray(
            attempts
        )
            ? attempts
            : [];


    updateAttemptsCount(
        safeAttempts.length
    );


    if (!safeAttempts.length) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="attempts-empty-cell"
                >
                    No quiz attempts found.
                </td>
            </tr>
        `;

        return;

    }


    tableBody.innerHTML =
        safeAttempts
            .map(
                function (attempt) {

                    return `
                        <tr>

                            <td>

                                <div class="attempt-participant">

                                    <strong>
                                        ${escapeHtml(
                                            attempt.name ||
                                            "Unknown"
                                        )}
                                    </strong>

                                    ${
                                        attempt.memberId
                                            ? `
                                                <small>
                                                    ${escapeHtml(
                                                        attempt.memberId
                                                    )}
                                                </small>
                                            `
                                            : ""
                                    }

                                </div>

                            </td>


                            <td>
                                ${escapeHtml(
                                    attempt.lessonNo ??
                                    ""
                                )}
                            </td>


                            <td>
                                ${escapeHtml(
                                    attempt.score ??
                                    0
                                )}
                            </td>


                            <td>
                                ${escapeHtml(
                                    attempt.pointsEarned ??
                                    0
                                )}
                            </td>


                            <td>
                                ${escapeHtml(
                                    attempt.date ||
                                    ""
                                )}
                            </td>

                        </tr>
                    `;

                }
            )
            .join("");

}


/* ============================================================
   ATTEMPTS COUNT
============================================================ */

function updateAttemptsCount(
    count
) {

    const element =
        document.getElementById(
            "attemptsCount"
        );


    if (!element) {
        return;
    }


    element.textContent =
        count +
        (
            count === 1
                ? " attempt"
                : " attempts"
        );

}


/* ============================================================
   ATTEMPTS STATUS
============================================================ */

function setAttemptsStatus(
    message
) {

    const status =
        document.getElementById(
            "attemptsStatus"
        );


    if (!status) {
        return;
    }


    status.textContent =
        message ||
        "";

}


/* ============================================================
   API GET
============================================================ */

async function dashboardGet(
    params
) {

    const query =
        new URLSearchParams();


    Object.keys(
        params || {}
    ).forEach(
        function (key) {

            const value =
                params[key];


            if (
                value !== undefined &&
                value !== null &&
                value !== ""
            ) {

                query.set(
                    key,
                    String(value)
                );

            }

        }
    );


    const response =
        await fetch(
            API_URL +
            "?" +
            query.toString(),
            {
                method: "GET",
                cache: "no-store"
            }
        );


    if (!response.ok) {

        throw new Error(
            "Server returned HTTP " +
            response.status +
            "."
        );

    }


    const data =
        await response.json();


    if (!data) {

        throw new Error(
            "No response was received from the server."
        );

    }


    return data;

}


/* ============================================================
   API POST
============================================================ */

async function dashboardPost(
    data
) {

    const response =
        await fetch(
            API_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "text/plain;charset=utf-8"
                },

                body:
                    JSON.stringify(
                        data
                    )
            }
        );


    if (!response.ok) {

        throw new Error(
            "Server returned HTTP " +
            response.status +
            "."
        );

    }


    const result =
        await response.json();


    if (!result) {

        throw new Error(
            "No response was received from the server."
        );

    }


    return result;

}


/* ============================================================
   DASHBOARD STATUS
============================================================ */

function setDashboardStatus(
    message,
    type
) {

    const element =
        document.getElementById(
            "dashboardStatus"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message ||
        "";


    element.className =
        "slc-dashboard-status";


    if (type) {

        element.classList.add(
            type
        );

    }

}


/* ============================================================
   QUESTIONS STATUS
============================================================ */

function setQuestionsStatus(
    message,
    type
) {

    const element =
        document.getElementById(
            "questionsStatus"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message ||
        "";


    element.className =
        "questions-status";


    if (type) {

        element.classList.add(
            type
        );

    }

}


/* ============================================================
   EDITOR STATUS
============================================================ */

function setQuestionEditorStatus(
    message,
    type
) {

    const element =
        document.getElementById(
            "questionEditorStatus"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message ||
        "";


    element.className =
        "question-editor-status";


    if (
        message &&
        type
    ) {

        element.classList.add(
            "show",
            type
        );

    }

}


/* ============================================================
   DELETE STATUS
============================================================ */

function setQuestionDeleteStatus(
    message,
    type
) {

    const element =
        document.getElementById(
            "questionDeleteStatus"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message ||
        "";


    element.className =
        "question-editor-status";


    if (
        message &&
        type
    ) {

        element.classList.add(
            "show",
            type
        );

    }

}


/* ============================================================
   EMPTY DASHBOARD
============================================================ */

function showDashboardEmpty(
    message
) {

    const summary =
        document.getElementById(
            "dashboardSummary"
        );


    const empty =
        document.getElementById(
            "dashboardEmpty"
        );


    if (summary) {

        summary.classList.add(
            "hidden"
        );

    }


    if (empty) {

        empty.classList.remove(
            "hidden"
        );

    }


    setDashboardStatus(
        message,
        "error"
    );

}


/* ============================================================
   PARTICIPATION DESCRIPTION
============================================================ */

function getParticipationDescription(
    rate
) {

    if (rate >= 100) {

        return "Everyone has participated in this week's quiz.";

    }


    if (rate >= 75) {

        return "Most members have participated in this week's quiz.";

    }


    if (rate >= 50) {

        return "Participation is above half of the group.";

    }


    if (rate > 0) {

        return "There are still members who need to participate.";

    }


    return "No quiz participation has been recorded yet.";

}


/* ============================================================
   DATE FORMAT
============================================================ */

function formatDashboardDate(
    value
) {

    if (!value) {

        return "—";

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


/* ============================================================
   GENERIC HELPERS
============================================================ */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    element.textContent =
        value === undefined ||
        value === null ||
        value === ""
            ? "—"
            : String(value);

}


function setInputValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    element.value =
        value === undefined ||
        value === null
            ? ""
            : String(value);

}


function getInputValue(
    id
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {

        return "";

    }


    return String(
        element.value || ""
    ).trim();

}


/**
 * Escape HTML before inserting server data
 * into generated table markup.
 */
function escapeHtml(
    value
) {

    return String(
        value === undefined ||
        value === null
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
