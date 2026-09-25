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
 * - Quiz Settings
 * - SLC Reports
 *
 * IMPORTANT:
 * - Uses the existing dashboard session.
 * - Does not change participant quiz logic.
 * - Does not change scoreQuiz().
 * ============================================================
 */

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
let dashboardReports = [];

let questionBeingEdited = null;
let questionBeingDeleted = null;

let questionSaveInProgress = false;
let questionDeleteInProgress = false;

let quizSettingsLoading = false;
let quizSettingsSaving = false;

let reportsLoading = false;
let reportBeingViewed = null;


/* ============================================================
   INITIALIZATION
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {
    setupDashboard();
    restoreDashboardSession();
});


function setupDashboard() {
    setupDashboardControls();
    setupQuestionsControls();
    setupQuestionEditor();
    setupQuestionDeleteModal();
    setupAttemptsControls();
    setupQuizSettingsControls();
    setupReportsControls();
    setupReportDetailsModal();
    setupDashboardNavigation();
}


/* ============================================================
   DASHBOARD NAVIGATION
   ============================================================ */

function setupDashboardNavigation() {
    const buttons =
        document.querySelectorAll("[data-dashboard-section]");

    buttons.forEach(function (button) {
        button.addEventListener("click", function () {
            const section =
                button.dataset.dashboardSection;

            if (!section) {
                return;
            }

            activateDashboardSection(section);
        });
    });
}


function activateDashboardSection(sectionName) {
    const buttons =
        document.querySelectorAll("[data-dashboard-section]");

    buttons.forEach(function (button) {
        button.classList.toggle(
            "active",
            button.dataset.dashboardSection === sectionName
        );
    });

    const sections =
        document.querySelectorAll(".quiz-dashboard-section");

    sections.forEach(function (section) {
        section.classList.toggle(
            "active",
            section.dataset.dashboardSection === sectionName
        );
    });

    if (!dashboardSession) {
        return;
    }

    if (sectionName === "overview") {
        loadDashboardOverview();
    }

    if (sectionName === "questions") {
        loadQuizQuestions();
    }

    if (sectionName === "attempts") {
        loadQuizAttempts();
    }

    if (sectionName === "settings") {
        loadQuizSettings();
    }

    if (sectionName === "reports") {
        loadSLCReports();
    }
}


/* ============================================================
   DASHBOARD CONTROLS
   ============================================================ */

function setupDashboardControls() {
    const loadButton =
        document.getElementById("loadDashboardButton");

    if (loadButton) {
        loadButton.addEventListener("click", function () {
            loadDashboardOverview();
        });
    }
}


/* ============================================================
   SESSION
   ============================================================ */

function restoreDashboardSession() {
    const storedSession =
        localStorage.getItem(SESSION_KEY);

    if (!storedSession) {
        showDashboardEmpty(
            "Please log in as a Quiz Coordinator to access this dashboard."
        );
        return;
    }

    try {
        dashboardSession =
            JSON.parse(storedSession);
    } catch (error) {
        console.error(
            "Invalid dashboard session:",
            error
        );

        localStorage.removeItem(SESSION_KEY);
        dashboardSession = null;

        showDashboardEmpty(
            "Your dashboard session is invalid. Please log in again."
        );

        return;
    }

    if (
        !dashboardSession ||
        !dashboardSession.token
    ) {
        localStorage.removeItem(SESSION_KEY);
        dashboardSession = null;

        showDashboardEmpty(
            "Your dashboard session is invalid. Please log in again."
        );

        return;
    }

    verifyDashboardAccess();
}


async function verifyDashboardAccess() {
    setDashboardStatus(
        "Checking dashboard access...",
        "loading"
    );

    try {
        const response =
            await dashboardGet({
                action: "getSLCAdminOverview",
                token: dashboardSession.token
            });

        if (!response || !response.success) {
            throw new Error(
                response && response.message
                    ? response.message
                    : "Dashboard access could not be verified."
            );
        }

        renderDashboardOverview(response);

        setDashboardStatus(
            "Dashboard ready.",
            "success"
        );

        await loadQuizQuestions();

    } catch (error) {
        console.error(
            "Dashboard verification failed:",
            error
        );

        setDashboardStatus(
            error.message ||
                "Unable to access the dashboard.",
            "error"
        );
    }
}


/* ============================================================
   DASHBOARD OVERVIEW
   ============================================================ */

async function loadDashboardOverview() {
    if (!dashboardSession) {
        return;
    }

    setDashboardStatus(
        "Loading dashboard...",
        "loading"
    );

    try {
        const response =
            await dashboardGet({
                action: "getSLCAdminOverview",
                token: dashboardSession.token
            });

        if (!response || !response.success) {
            throw new Error(
                response && response.message
                    ? response.message
                    : "Unable to load dashboard."
            );
        }

        renderDashboardOverview(response);

        setDashboardStatus(
            "Dashboard updated.",
            "success"
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
    }
}


function renderDashboardOverview(data) {
    const summary =
        data.summary ||
        data.overview ||
        data;

    const totalMembers =
        Number(
            summary.totalMembers ??
            summary.members ??
            0
        );

    const participated =
        Number(
            summary.participated ??
            summary.participating ??
            0
        );

    const notParticipated =
        Number(
            summary.notParticipated ??
            summary.notParticipating ??
            Math.max(
                0,
                totalMembers - participated
            )
        );

    let participationRate =
        Number(
            summary.participationRate ??
            0
        );

    if (
        !participationRate &&
        totalMembers > 0
    ) {
        participationRate =
            (participated / totalMembers) * 100;
    }

    const percentage =
        Math.max(
            0,
            Math.min(
                100,
                Math.round(participationRate)
            )
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
        percentage + "%"
    );

    setText(
        "progressPercentage",
        percentage + "%"
    );

    const progress =
        document.getElementById(
            "participationProgress"
        );

    if (progress) {
        progress.style.width =
            percentage + "%";
    }

    setText(
        "progressDescription",
        getParticipationDescription(
            percentage
        )
    );

    setText(
        "groupNameDisplay",
        summary.groupName ||
            summary.group ||
            "—"
    );

    setText(
        "groupLeaderDisplay",
        summary.groupLeader ||
            summary.leaderName ||
            "—"
    );

    setText(
        "reportVersionDisplay",
        summary.version ??
            "—"
    );

    setText(
        "reportDateDisplay",
        formatDashboardDate(
            summary.reportDate ||
            summary.date ||
            summary.updatedAt
        )
    );

    renderNonParticipants(
        summary.nonParticipants ||
        data.nonParticipants ||
        []
    );

    const observations =
        summary.observations ||
        data.observations ||
        "";

    setText(
        "observationsDisplay",
        observations || "No observations recorded."
    );

    setText(
        "nonParticipantCount",
        notParticipated
    );

    const summaryElement =
        document.getElementById(
            "dashboardSummary"
        );

    if (summaryElement) {
        summaryElement.hidden = false;
    }
}


function renderNonParticipants(items) {
    const container =
        document.getElementById(
            "nonParticipantsDisplay"
        );

    if (!container) {
        return;
    }

    if (!Array.isArray(items) || !items.length) {
        container.innerHTML =
            '<div class="empty-state-small">Everyone has participated.</div>';
        return;
    }

    container.innerHTML =
        items
            .map(function (item) {
                const name =
                    typeof item === "string"
                        ? item
                        : (
                            item.name ||
                            item.fullName ||
                            item.memberName ||
                            "Unnamed member"
                        );

                return (
                    '<div class="non-participant-item">' +
                        escapeHtml(name) +
                    "</div>"
                );
            })
            .join("");
}


/* ============================================================
   QUESTIONS
   ============================================================ */

function setupQuestionsControls() {
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

        lessonFilter.addEventListener(
            "change",
            function () {
                filterQuizQuestions();
            }
        );
    }
}


async function loadQuizQuestions() {
    if (!dashboardSession) {
        return;
    }

    setQuestionsStatus(
        "Loading questions...",
        "loading"
    );

    try {
        const response =
            await dashboardGet({
                action:
                    "getSLCAdminQuizQuestions",
                token:
                    dashboardSession.token
            });

        if (!response || !response.success) {
            throw new Error(
                response && response.message
                    ? response.message
                    : "Unable to load quiz questions."
            );
        }

        dashboardQuestions =
            Array.isArray(response.questions)
                ? response.questions
                : [];

        renderQuizQuestions();

        setQuestionsStatus(
            dashboardQuestions.length +
                " question" +
                (
                    dashboardQuestions.length === 1
                        ? ""
                        : "s"
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
                "Unable to load questions.",
            "error"
        );
    }
}


function renderQuizQuestions() {
    const tbody =
        document.getElementById(
            "questionsTableBody"
        );

    if (!tbody) {
        return;
    }

    const questions =
        getFilteredQuestions();

    updateQuestionsCount(
        questions.length
    );

    if (!questions.length) {
        tbody.innerHTML =
            '<tr><td colspan="8" class="table-empty">No quiz questions found.</td></tr>';
        return;
    }

    tbody.innerHTML =
        questions
            .map(function (question, index) {
                const rowNumber =
                    question.rowNumber ??
                    question.row ??
                    question.id ??
                    "";

                const lessonNo =
                    question.lessonNo ??
                    question.lesson ??
                    "";

                const questionText =
                    question.question ??
                    question.questionText ??
                    "";

                const optionA =
                    question.optionA ?? "";

                const optionB =
                    question.optionB ?? "";

                const optionC =
                    question.optionC ?? "";

                const optionD =
                    question.optionD ?? "";

                const correctOption =
                    question.correctOption ??
                    question.correctAnswer ??
                    "";

                const points =
                    question.points ??
                    200;

                return (
                    "<tr>" +

                    "<td>" +
                        escapeHtml(
                            String(
                                index + 1
                            )
                        ) +
                    "</td>" +

                    "<td>" +
                        escapeHtml(
                            String(
                                lessonNo
                            )
                        ) +
                    "</td>" +

                    "<td class=\"question-cell\">" +
                        escapeHtml(
                            String(
                                questionText
                            )
                        ) +
                    "</td>" +

                    "<td>" +
                        escapeHtml(
                            String(optionA)
                        ) +
                    "</td>" +

                    "<td>" +
                        escapeHtml(
                            String(optionB)
                        ) +
                    "</td>" +

                    "<td>" +
                        escapeHtml(
                            String(optionC)
                        ) +
                    "</td>" +

                    "<td>" +
                        escapeHtml(
                            String(optionD)
                        ) +
                    "</td>" +

                    "<td>" +
                        escapeHtml(
                            String(correctOption)
                        ) +
                    "</td>" +

                    "<td>" +
                        escapeHtml(
                            String(points)
                        ) +
                    "</td>" +

                    "<td>" +
                        '<div class="table-actions">' +

                            '<button type="button" class="table-action-button" data-question-edit="' +
                                escapeHtml(
                                    String(
                                        rowNumber
                                    )
                                ) +
                            '">' +
                                "Edit" +
                            "</button>" +

                            '<button type="button" class="table-action-button danger" data-question-delete="' +
                                escapeHtml(
                                    String(
                                        rowNumber
                                    )
                                ) +
                            '">' +
                                "Delete" +
                            "</button>" +

                        "</div>" +
                    "</td>" +

                    "</tr>"
                );
            })
            .join("");

    tbody.querySelectorAll(
        "[data-question-edit]"
    ).forEach(function (button) {
        button.addEventListener(
            "click",
            function () {
                const rowNumber =
                    button.dataset.questionEdit;

                const question =
                    dashboardQuestions.find(
                        function (item) {
                            return String(
                                item.rowNumber ??
                                item.row ??
                                item.id ??
                                ""
                            ) ===
                            String(rowNumber);
                        }
                    );

                if (question) {
                    openQuestionEditor(
                        question
                    );
                }
            }
        );
    });

    tbody.querySelectorAll(
        "[data-question-delete]"
    ).forEach(function (button) {
        button.addEventListener(
            "click",
            function () {
                const rowNumber =
                    button.dataset.questionDelete;

                const question =
                    dashboardQuestions.find(
                        function (item) {
                            return String(
                                item.rowNumber ??
                                item.row ??
                                item.id ??
                                ""
                            ) ===
                            String(rowNumber);
                        }
                    );

                if (question) {
                    openQuestionDeleteModal(
                        question
                    );
                }
            }
        );
    });
}


function filterQuizQuestions() {
    renderQuizQuestions();
}


function getFilteredQuestions() {
    const input =
        document.getElementById(
            "questionsLessonFilter"
        );

    const filter =
        input
            ? String(input.value || "")
                .trim()
                .toLowerCase()
            : "";

    if (!filter) {
        return dashboardQuestions;
    }

    return dashboardQuestions.filter(
        function (question) {
            const lessonNo =
                question.lessonNo ??
                question.lesson ??
                "";

            return String(
                lessonNo
            )
                .toLowerCase()
                .includes(filter);
        }
    );
}


function updateQuestionsCount(count) {
    setText(
        "questionsCount",
        count
    );
}


/* ============================================================
   QUESTION EDITOR
   ============================================================ */

function setupQuestionEditor() {
    const form =
        document.getElementById(
            "questionEditorForm"
        );

    if (form) {
        form.addEventListener(
            "submit",
            function (event) {
                event.preventDefault();
                submitQuestionEditor();
            }
        );
    }

    document.querySelectorAll(
        "[data-close-question-editor]"
    ).forEach(function (button) {
        button.addEventListener(
            "click",
            function (event) {
                event.preventDefault();
                closeQuestionEditor();
            }
        );
    });
}


function openQuestionEditor(question) {
    questionBeingEdited =
        question || null;

    const modal =
        document.getElementById(
            "questionEditorModal"
        );

    if (!modal) {
        return;
    }

    if (question) {
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
            "Update the question and save your changes."
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

    modal.classList.add("active");

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "question-modal-open"
    );
}


function closeQuestionEditor() {
    const modal =
        document.getElementById(
            "questionEditorModal"
        );

    if (!modal) {
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

    questionSaveInProgress =
        false;
}


function fillQuestionEditor(question) {
    setInputValue(
        "questionEditorRowNumber",
        question.rowNumber ??
        question.row ??
        question.id ??
        ""
    );

    setInputValue(
        "questionEditorLessonNo",
        question.lessonNo ??
        question.lesson ??
        ""
    );

    setInputValue(
        "questionEditorPoints",
        question.points ??
        200
    );

    setInputValue(
        "questionEditorQuestion",
        question.question ??
        question.questionText ??
        ""
    );

    setInputValue(
        "questionEditorOptionA",
        question.optionA ??
        ""
    );

    setInputValue(
        "questionEditorOptionB",
        question.optionB ??
        ""
    );

    setInputValue(
        "questionEditorOptionC",
        question.optionC ??
        ""
    );

    setInputValue(
        "questionEditorOptionD",
        question.optionD ??
        ""
    );

    setInputValue(
        "questionEditorCorrectOption",
        question.correctOption ??
        question.correctAnswer ??
        ""
    );
}


function clearQuestionEditor() {
    setInputValue(
        "questionEditorRowNumber",
        ""
    );

    setInputValue(
        "questionEditorLessonNo",
        ""
    );

    setInputValue(
        "questionEditorPoints",
        "200"
    );

    setInputValue(
        "questionEditorQuestion",
        ""
    );

    setInputValue(
        "questionEditorOptionA",
        ""
    );

    setInputValue(
        "questionEditorOptionB",
        ""
    );

    setInputValue(
        "questionEditorOptionC",
        ""
    );

    setInputValue(
        "questionEditorOptionD",
        ""
    );

    setInputValue(
        "questionEditorCorrectOption",
        ""
    );
}


function validateQuestionEditor() {
    const lessonNo =
        getInputValue(
            "questionEditorLessonNo"
        );

    const points =
        getInputValue(
            "questionEditorPoints"
        );

    const question =
        getInputValue(
            "questionEditorQuestion"
        );

    const optionA =
        getInputValue(
            "questionEditorOptionA"
        );

    const optionB =
        getInputValue(
            "questionEditorOptionB"
        );

    const optionC =
        getInputValue(
            "questionEditorOptionC"
        );

    const optionD =
        getInputValue(
            "questionEditorOptionD"
        );

    const correctOption =
        getInputValue(
            "questionEditorCorrectOption"
        ).toUpperCase();

    if (!lessonNo) {
        return "Please enter the lesson number.";
    }

    if (!points) {
        return "Please enter the question points.";
    }

    if (!question) {
        return "Please enter the question.";
    }

    if (
        !optionA ||
        !optionB ||
        !optionC ||
        !optionD
    ) {
        return "Please enter all four answer options.";
    }

    if (
        !["A", "B", "C", "D"].includes(
            correctOption
        )
    ) {
        return "Correct option must be A, B, C, or D.";
    }

    return "";
}


async function submitQuestionEditor() {
    if (questionSaveInProgress) {
        return;
    }

    const validation =
        validateQuestionEditor();

    if (validation) {
        setQuestionEditorStatus(
            validation,
            "error"
        );

        return;
    }

    questionSaveInProgress =
        true;

    const isEditing =
        Boolean(
            questionBeingEdited
        );

    setQuestionEditorStatus(
        isEditing
            ? "Updating question..."
            : "Adding question...",
        "loading"
    );

    const data = {
        token:
            dashboardSession.token,

        lessonNo:
            getInputValue(
                "questionEditorLessonNo"
            ),

        points:
            getInputValue(
                "questionEditorPoints"
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
            ).toUpperCase()
    };

    try {
        let response;

        if (isEditing) {
            data.action =
                "updateSLCAdminQuizQuestion";

            data.rowNumber =
                getInputValue(
                    "questionEditorRowNumber"
                );

            response =
                await dashboardPost(
                    data
                );

        } else {
            data.action =
                "addSLCAdminQuizQuestion";

            response =
                await dashboardPost(
                    data
                );
        }

        if (!response || !response.success) {
            throw new Error(
                response && response.message
                    ? response.message
                    : (
                        isEditing
                            ? "Unable to update question."
                            : "Unable to add question."
                    )
            );
        }

        setQuestionEditorStatus(
            isEditing
                ? "Question updated successfully."
                : "Question added successfully.",
            "success"
        );

        await loadQuizQuestions();

        window.setTimeout(
            function () {
                closeQuestionEditor();
            },
            500
        );

    } catch (error) {
        console.error(
            "Question save error:",
            error
        );

        setQuestionEditorStatus(
            error.message ||
                "Unable to save question.",
            "error"
        );

    } finally {
        questionSaveInProgress =
            false;
    }
}


/* ============================================================
   QUESTION DELETE
   ============================================================ */

function setupQuestionDeleteModal() {
    document.querySelectorAll(
        "[data-close-question-delete]"
    ).forEach(function (button) {
        button.addEventListener(
            "click",
            function (event) {
                event.preventDefault();
                closeQuestionDeleteModal();
            }
        );
    });

    const confirmButton =
        document.getElementById(
            "confirmDeleteQuestionButton"
        );

    if (confirmButton) {
        confirmButton.addEventListener(
            "click",
            function () {
                deleteQuestion();
            }
        );
    }
}


function openQuestionDeleteModal(question) {
    questionBeingDeleted =
        question || null;

    const modal =
        document.getElementById(
            "questionDeleteModal"
        );

    if (!modal) {
        return;
    }

    const questionText =
        question.question ??
        question.questionText ??
        "this question";

    setText(
        "questionDeleteMessage",
        "Are you sure you want to delete this question?\n\n" +
        questionText
    );

    setQuestionDeleteStatus(
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
}


function closeQuestionDeleteModal() {
    const modal =
        document.getElementById(
            "questionDeleteModal"
        );

    if (!modal) {
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

    questionDeleteInProgress =
        false;
}


async function deleteQuestion() {
    if (
        questionDeleteInProgress ||
        !questionBeingDeleted
    ) {
        return;
    }

    questionDeleteInProgress =
        true;

    setQuestionDeleteStatus(
        "Deleting question...",
        "loading"
    );

    try {
        const rowNumber =
            questionBeingDeleted.rowNumber ??
            questionBeingDeleted.row ??
            questionBeingDeleted.id ??
            "";

        const response =
            await dashboardPost({
                action:
                    "deleteSLCAdminQuizQuestion",

                token:
                    dashboardSession.token,

                rowNumber:
                    rowNumber
            });

        if (!response || !response.success) {
            throw new Error(
                response && response.message
                    ? response.message
                    : "Unable to delete question."
            );
        }

        setQuestionDeleteStatus(
            "Question deleted successfully.",
            "success"
        );

        await loadQuizQuestions();

        window.setTimeout(
            function () {
                closeQuestionDeleteModal();
            },
            500
        );

    } catch (error) {
        console.error(
            "Question delete error:",
            error
        );

        setQuestionDeleteStatus(
            error.message ||
                "Unable to delete question.",
            "error"
        );

    } finally {
        questionDeleteInProgress =
            false;
    }
}


/* ============================================================
   QUIZ ATTEMPTS
   ============================================================ */

function setupAttemptsControls() {
    const refreshButton =
        document.getElementById(
            "refreshAttemptsButton"
        );

    if (refreshButton) {
        refreshButton.addEventListener(
            "click",
            function () {
                loadQuizAttempts();
            }
        );
    }

    const searchInput =
        document.getElementById(
            "attemptsSearchInput"
        );

    if (searchInput) {
        searchInput.addEventListener(
            "input",
            function () {
                filterQuizAttempts();
            }
        );
    }

    const lessonFilter =
        document.getElementById(
            "attemptsLessonFilter"
        );

    if (lessonFilter) {
        lessonFilter.addEventListener(
            "input",
            function () {
                filterQuizAttempts();
            }
        );

        lessonFilter.addEventListener(
            "change",
            function () {
                filterQuizAttempts();
            }
        );
    }
}


async function loadQuizAttempts() {
    if (!dashboardSession) {
        return;
    }

    setAttemptsStatus(
        "Loading quiz attempts...",
        "loading"
    );

    try {
        const response =
            await dashboardGet({
                action:
                    "getSLCAdminQuizAttempts",

                token:
                    dashboardSession.token
            });

        if (!response || !response.success) {
            throw new Error(
                response && response.message
                    ? response.message
                    : "Unable to load quiz attempts."
            );
        }

        dashboardAttempts =
            Array.isArray(response.attempts)
                ? response.attempts
                : [];

        renderQuizAttempts();

        setAttemptsStatus(
            dashboardAttempts.length +
                " attempt" +
                (
                    dashboardAttempts.length === 1
                        ? ""
                        : "s"
                ) +
                " loaded.",
            "success"
        );

    } catch (error) {
        console.error(
            "Quiz attempts error:",
            error
        );

        setAttemptsStatus(
            error.message ||
                "Unable to load quiz attempts.",
            "error"
        );
    }
}


function filterQuizAttempts() {
    renderQuizAttempts();
}


function renderQuizAttempts() {
    const tbody =
        document.getElementById(
            "attemptsTableBody"
        );

    if (!tbody) {
        return;
    }

    const searchInput =
        document.getElementById(
            "attemptsSearchInput"
        );

    const lessonInput =
        document.getElementById(
            "attemptsLessonFilter"
        );

    const search =
        searchInput
            ? String(
                searchInput.value || ""
              )
                .trim()
                .toLowerCase()
            : "";

    const lesson =
        lessonInput
            ? String(
                lessonInput.value || ""
              )
                .trim()
                .toLowerCase()
            : "";

    const filtered =
        dashboardAttempts.filter(
            function (attempt) {
                const memberName =
                    String(
                        attempt.memberName ||
                        attempt.name ||
                        attempt.fullName ||
                        ""
                    ).toLowerCase();

                const lessonNo =
                    String(
                        attempt.lessonNo ||
                        attempt.lesson ||
                        ""
                    ).toLowerCase();

                const memberId =
                    String(
                        attempt.memberId ||
                        ""
                    ).toLowerCase();

                const matchesSearch =
                    !search ||
                    memberName.includes(search) ||
                    memberId.includes(search);

                const matchesLesson =
                    !lesson ||
                    lessonNo.includes(lesson);

                return (
                    matchesSearch &&
                    matchesLesson
                );
            }
        );

    updateAttemptsCount(
        filtered.length
    );

    if (!filtered.length) {
        tbody.innerHTML =
            '<tr><td colspan="8" class="table-empty">No quiz attempts found.</td></tr>';

        return;
    }

    tbody.innerHTML =
        filtered
            .map(function (attempt) {
                return (
                    "<tr>" +

                    "<td>" +
                        escapeHtml(
                            String(
                                attempt.lessonNo ??
                                attempt.lesson ??
                                "—"
                            )
                        ) +
                    "</td>" +

                    "<td>" +
                        escapeHtml(
                            String(
                                attempt.memberName ??
                                attempt.name ??
                                attempt.fullName ??
                                "—"
                            )
                        ) +
                    "</td>" +

                    "<td>" +
                        escapeHtml(
                            String(
                                attempt.memberId ??
                                "—"
                            )
                        ) +
                    "</td>" +

                    "<td>" +
                        escapeHtml(
                            String(
                                attempt.score ??
                                attempt.totalScore ??
                                "—"
                            )
                        ) +
                    "</td>" +

                    "<td>" +
                        escapeHtml(
                            String(
                                attempt.totalPoints ??
                                attempt.maxScore ??
                                "—"
                            )
                        ) +
                    "</td>" +

                    "<td>" +
                        escapeHtml(
                            String(
                                attempt.percentage ??
                                "—"
                            )
                        ) +
                    "</td>" +

                    "<td>" +
                        escapeHtml(
                            String(
                                attempt.status ??
                                "Completed"
                            )
                        ) +
                    "</td>" +

                    "<td>" +
                        escapeHtml(
                            formatDashboardDateTime(
                                attempt.submittedAt ||
                                attempt.timestamp ||
                                attempt.date
                            )
                        ) +
                    "</td>" +

                    "</tr>"
                );
            })
            .join("");
}


function updateAttemptsCount(count) {
    setText(
        "attemptsCount",
        count
    );
}


/* ============================================================
   QUIZ SETTINGS
   ============================================================ */

function setupQuizSettingsControls() {
    const form =
        document.getElementById(
            "quizSettingsForm"
        );

    if (form) {
        form.addEventListener(
            "submit",
            function (event) {
                event.preventDefault();
                saveQuizSettings();
            }
        );
    }
}


async function loadQuizSettings() {
    if (
        !dashboardSession ||
        quizSettingsLoading
    ) {
        return;
    }

    quizSettingsLoading =
        true;

    setQuizSettingsStatus(
        "Loading quiz settings...",
        "loading"
    );

    try {
        const response =
            await dashboardGet({
                action:
                    "getSLCAdminQuizSettings",

                token:
                    dashboardSession.token
            });

        if (!response || !response.success) {
            throw new Error(
                response && response.message
                    ? response.message
                    : "Unable to load quiz settings."
            );
        }

        const settings =
            response.settings ||
            response.data ||
            response;

        setInputValue(
            "quizSettingsLesson",
            settings.lessonNo ??
            settings.lesson ??
            ""
        );

        setInputValue(
            "quizSettingsOpen",
            convertApiDateToLocalInput(
                settings.openDate ||
                settings.openAt ||
                settings.openTime
            )
        );

        setInputValue(
            "quizSettingsClose",
            convertApiDateToLocalInput(
                settings.closeDate ||
                settings.closeAt ||
                settings.closeTime
            )
        );

        setQuizSettingsStatus(
            "Quiz settings loaded.",
            "success"
        );

    } catch (error) {
        console.error(
            "Quiz settings load error:",
            error
        );

        setQuizSettingsStatus(
            error.message ||
                "Unable to load quiz settings.",
            "error"
        );

    } finally {
        quizSettingsLoading =
            false;
    }
}


async function saveQuizSettings() {
    if (
        quizSettingsSaving ||
        !dashboardSession
    ) {
        return;
    }

    quizSettingsSaving =
        true;

    setQuizSettingsStatus(
        "Saving quiz settings...",
        "loading"
    );

    try {
        const response =
            await dashboardPost({
                action:
                    "updateSLCAdminQuizSettings",

                token:
                    dashboardSession.token,

                lessonNo:
                    getInputValue(
                        "quizSettingsLesson"
                    ),

                openDate:
                    getInputValue(
                        "quizSettingsOpen"
                    ),

                closeDate:
                    getInputValue(
                        "quizSettingsClose"
                    )
            });

        if (!response || !response.success) {
            throw new Error(
                response && response.message
                    ? response.message
                    : "Unable to save quiz settings."
            );
        }

        setQuizSettingsStatus(
            "Quiz settings saved successfully.",
            "success"
        );

    } catch (error) {
        console.error(
            "Quiz settings save error:",
            error
        );

        setQuizSettingsStatus(
            error.message ||
                "Unable to save quiz settings.",
            "error"
        );

    } finally {
        quizSettingsSaving =
            false;
    }
}


function convertApiDateToLocalInput(value) {
    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    const pad =
        function (number) {
            return String(number)
                .padStart(2, "0");
        };

    return (
        date.getFullYear() +
        "-" +
        pad(date.getMonth() + 1) +
        "-" +
        pad(date.getDate()) +
        "T" +
        pad(date.getHours()) +
        ":" +
        pad(date.getMinutes())
    );
}


/* ============================================================
   SLC REPORTS
   ============================================================ */

function setupReportsControls() {
    const refreshButton =
        document.getElementById(
            "refreshReportsButton"
        );

    if (refreshButton) {
        refreshButton.addEventListener(
            "click",
            function () {
                loadSLCReports();
            }
        );
    }

    const lessonFilter =
        document.getElementById(
            "reportsLessonFilter"
        );

    if (lessonFilter) {
        lessonFilter.addEventListener(
            "input",
            function () {
                renderSLCReports();
            }
        );

        lessonFilter.addEventListener(
            "change",
            function () {
                renderSLCReports();
            }
        );
    }

    setupReportTableActionDelegation();
}


async function loadSLCReports() {
    if (
        !dashboardSession ||
        reportsLoading
    ) {
        return;
    }

    reportsLoading =
        true;

    setReportsStatus(
        "Loading SLC reports...",
        "loading"
    );

    try {
        const lessonFilter =
            document.getElementById(
                "reportsLessonFilter"
            );

        const lessonNo =
            lessonFilter
                ? String(
                    lessonFilter.value || ""
                  ).trim()
                : "";

        const params = {
            action:
                "getSLCReports",

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

        if (!response || !response.success) {
            throw new Error(
                response && response.message
                    ? response.message
                    : "Unable to load SLC reports."
            );
        }

        dashboardReports =
            Array.isArray(
                response.reports
            )
                ? response.reports
                : [];

        renderSLCReports();

        setReportsStatus(
            dashboardReports.length +
                " report" +
                (
                    dashboardReports.length === 1
                        ? ""
                        : "s"
                ) +
                " loaded.",
            "success"
        );

    } catch (error) {
        console.error(
            "SLC reports error:",
            error
        );

        dashboardReports =
            [];

        renderSLCReports();

        setReportsStatus(
            error.message ||
                "Unable to load SLC reports.",
            "error"
        );

    } finally {
        reportsLoading =
            false;
    }
}


function getFilteredSLCReports() {
    const input =
        document.getElementById(
            "reportsLessonFilter"
        );

    const filter =
        input
            ? String(
                input.value || ""
              )
                .trim()
                .toLowerCase()
            : "";

    if (!filter) {
        return dashboardReports;
    }

    return dashboardReports.filter(
        function (report) {
            return String(
                report.lessonNo ??
                report.lesson ??
                ""
            )
                .toLowerCase()
                .includes(filter);
        }
    );
}


function renderSLCReports() {
    const tbody =
        document.getElementById(
            "reportsTableBody"
        );

    const emptyState =
        document.getElementById(
            "reportsEmpty"
        );

    if (!tbody) {
        return;
    }

    const reports =
        getFilteredSLCReports();

    updateReportsCount(
        reports.length
    );

    if (!reports.length) {
        tbody.innerHTML = "";

        if (emptyState) {
            emptyState.hidden = false;
        }

        return;
    }

    if (emptyState) {
        emptyState.hidden = true;
    }

    tbody.innerHTML =
        reports
            .map(function (report, index) {
                const totalMembers =
                    report.totalMembers ??
                    report.members ??
                    0;

                const participated =
                    report.participated ??
                    0;

                const notParticipated =
                    report.notParticipated ??
                    Math.max(
                        0,
                        Number(totalMembers) -
                        Number(participated)
                    );

                return (
                    "<tr>" +

                    "<td>" +
                        escapeHtml(
                            String(
                                report.lessonNo ??
                                report.lesson ??
                                "—"
                            )
                        ) +
                    "</td>" +

                    "<td>" +
                        escapeHtml(
                            String(
                                report.groupName ??
                                report.group ??
                                "—"
                            )
                        ) +
                    "</td>" +

                    "<td>" +
                        escapeHtml(
                            String(
                                totalMembers
                            )
                        ) +
                    "</td>" +

                    "<td>" +
                        escapeHtml(
                            String(
                                participated
                            )
                        ) +
                    "</td>" +

                    "<td>" +
                        escapeHtml(
                            String(
                                notParticipated
                            )
                        ) +
                    "</td>" +

                    "<td>" +
                        escapeHtml(
                            formatDashboardDateTime(
                                report.reportDate ||
                                report.submittedAt ||
                                report.createdAt ||
                                report.date
                            )
                        ) +
                    "</td>" +

                    "<td>" +
                        escapeHtml(
                            String(
                                report.submittedBy ||
                                report.submittedByName ||
                                report.createdBy ||
                                "—"
                            )
                        ) +
                    "</td>" +

                    "<td>" +
                        escapeHtml(
                            String(
                                report.version ??
                                "—"
                            )
                        ) +
                    "</td>" +

                    "<td>" +

                        '<button type="button" class="table-action-button" data-report-action="view" data-report-index="' +
                            index +
                            '"' +
                            (
                                report.id
                                    ? ' data-report-id="' +
                                      escapeHtml(
                                          String(
                                              report.id
                                          )
                                      ) +
                                      '"'
                                    : ""
                            ) +
                        ">" +
                            "View" +
                        "</button>" +

                    "</td>" +

                    "</tr>"
                );
            })
            .join("");
}


function setupReportTableActionDelegation() {
    const tbody =
        document.getElementById(
            "reportsTableBody"
        );

    if (!tbody) {
        return;
    }

    if (
        tbody.dataset.reportActionsBound ===
        "true"
    ) {
        return;
    }

    tbody.dataset.reportActionsBound =
        "true";

    tbody.addEventListener(
        "click",
        function (event) {
            const button =
                event.target.closest(
                    "[data-report-action='view']"
                );

            if (!button) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            const index =
                Number(
                    button.dataset.reportIndex
                );

            const reports =
                getFilteredSLCReports();

            const report =
                reports[index];

            if (!report) {
                return;
            }

            openSlcReportModal(
                report
            );
        }
    );
}


function updateReportsCount(count) {
    setText(
        "reportsCount",
        count
    );
}


/* ============================================================
   SLC REPORT DETAILS MODAL
   ============================================================ */

function setupReportDetailsModal() {
    const modal =
        document.getElementById(
            "slcReportModal"
        );

    if (!modal) {
        return;
    }

    /*
     * Bind every close element inside the modal.
     * This includes the close icon/button and
     * any overlay element carrying
     * data-close-report-modal.
     */
    const closeButtons =
        modal.querySelectorAll(
            "[data-close-report-modal]"
        );

    closeButtons.forEach(
        function (button) {
            button.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();
                    event.stopPropagation();

                    closeSlcReportModal();
                }
            );
        }
    );

    /*
     * Explicitly bind the known close button.
     * The dataset flag prevents accidental
     * duplicate listeners.
     */
    const closeButton =
        document.getElementById(
            "closeSlcReportModalButton"
        );

    if (
        closeButton &&
        !closeButton.dataset.reportCloseBound
    ) {
        closeButton.dataset.reportCloseBound =
            "true";

        closeButton.addEventListener(
            "click",
            function (event) {
                event.preventDefault();
                event.stopPropagation();

                closeSlcReportModal();
            }
        );
    }

    /*
     * Modal overlay click.
     *
     * Clicking the dark overlay closes the modal,
     * but clicking inside the modal content does not.
     */
    modal.addEventListener(
        "click",
        function (event) {
            if (
                event.target === modal ||
                event.target.closest(
                    "[data-close-report-modal]"
                )
            ) {
                event.preventDefault();
                event.stopPropagation();

                closeSlcReportModal();
            }
        }
    );

    /*
     * Escape key support.
     */
    if (
        !document.body.dataset
            .slcReportEscapeBound
    ) {
        document.body.dataset
            .slcReportEscapeBound =
            "true";

        document.addEventListener(
            "keydown",
            function (event) {
                if (
                    event.key !== "Escape" &&
                    event.key !== "Esc"
                ) {
                    return;
                }

                const reportModal =
                    document.getElementById(
                        "slcReportModal"
                    );

                if (
                    reportModal &&
                    (
                        reportModal.classList.contains(
                            "active"
                        ) ||
                        reportModal.getAttribute(
                            "aria-hidden"
                        ) === "false"
                    )
                ) {
                    closeSlcReportModal();
                }
            }
        );
    }
}


function openSlcReportModal(report) {
    const modal =
        document.getElementById(
            "slcReportModal"
        );

    const details =
        document.getElementById(
            "slcReportDetails"
        );

    if (!modal || !details) {
        return;
    }

    reportBeingViewed =
        report;

    setText(
        "slcReportModalTitle",
        report.groupName
            ? report.groupName +
              " — SLC Report"
            : "SLC Report"
    );

    setText(
        "slcReportModalSubtitle",
        "Lesson " +
        String(
            report.lessonNo ||
            "—"
        ) +
        " · Report version " +
        String(
            report.version ??
            "—"
        )
    );

    details.innerHTML =
        buildSlcReportDetailsHtml(
            report
        );

    /*
     * Reset any explicit hidden/display
     * state that may have been applied when
     * the previous report was closed.
     */
    modal.hidden =
        false;

    modal.style.display =
        "";

    modal.style.visibility =
        "visible";

    modal.style.pointerEvents =
        "auto";

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

    window.setTimeout(
        function () {
            const closeButton =
                document.getElementById(
                    "closeSlcReportModalButton"
                );

            if (closeButton) {
                closeButton.focus();
            }
        },
        100
    );
}


function closeSlcReportModal() {
    const modal =
        document.getElementById(
            "slcReportModal"
        );

    if (!modal) {
        return;
    }

    /*
     * Remove the active state used by
     * the dashboard CSS.
     */
    modal.classList.remove(
        "active"
    );

    /*
     * Explicitly hide the modal so that
     * no invisible overlay can remain on top
     * of the dashboard and block clicks.
     */
    modal.hidden =
        true;

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    modal.style.display =
        "none";

    modal.style.visibility =
        "hidden";

    modal.style.pointerEvents =
        "none";

    document.body.classList.remove(
        "question-modal-open"
    );

    reportBeingViewed =
        null;
}


/* ============================================================
   REPORT DETAILS HTML
   ============================================================ */

function buildSlcReportDetailsHtml(report) {
    const nonParticipants =
        normalizeReportArray(
            report.nonParticipants
        );

    const contactedTable =
        normalizeReportArray(
            report.contactedTable ||
            report.contacted ||
            report.followUp
        );

    const supportGiven =
        normalizeReportArray(
            report.supportGiven ||
            report.support ||
            report.supportNotes
        );

    const notes =
        report.observations ||
        report.notes ||
        report.additionalNotes ||
        "";

    const totalMembers =
        report.totalMembers ??
        report.members ??
        0;

    const participated =
        report.participated ??
        0;

    const notParticipated =
        report.notParticipated ??
        Math.max(
            0,
            Number(totalMembers) -
            Number(participated)
        );

    const participationRate =
        totalMembers > 0
            ? Math.round(
                (
                    Number(participated) /
                    Number(totalMembers)
                ) *
                100
            )
            : 0;

    return (
        '<div class="slc-report-detail-grid">' +

            '<div class="slc-report-detail-card">' +
                "<span>Total Members</span>" +
                "<strong>" +
                    escapeHtml(
                        String(
                            totalMembers
                        )
                    ) +
                "</strong>" +
            "</div>" +

            '<div class="slc-report-detail-card">' +
                "<span>Participated</span>" +
                "<strong>" +
                    escapeHtml(
                        String(
                            participated
                        )
                    ) +
                "</strong>" +
            "</div>" +

            '<div class="slc-report-detail-card">' +
                "<span>Not Participated</span>" +
                "<strong>" +
                    escapeHtml(
                        String(
                            notParticipated
                        )
                    ) +
                "</strong>" +
            "</div>" +

            '<div class="slc-report-detail-card">' +
                "<span>Participation Rate</span>" +
                "<strong>" +
                    escapeHtml(
                        String(
                            participationRate
                        )
                    ) +
                    "%" +
                "</strong>" +
            "</div>" +

        "</div>" +

        '<div class="slc-report-detail-section">' +
            "<h4>Submission</h4>" +

            '<div class="slc-report-detail-list">' +

                "<div>" +
                    "<span>Lesson</span>" +
                    "<strong>" +
                        escapeHtml(
                            String(
                                report.lessonNo ??
                                report.lesson ??
                                "—"
                            )
                        ) +
                    "</strong>" +
                "</div>" +

                "<div>" +
                    "<span>Group</span>" +
                    "<strong>" +
                        escapeHtml(
                            String(
                                report.groupName ??
                                report.group ??
                                "—"
                            )
                        ) +
                    "</strong>" +
                "</div>" +

                "<div>" +
                    "<span>Submitted By</span>" +
                    "<strong>" +
                        escapeHtml(
                            String(
                                report.submittedBy ||
                                report.submittedByName ||
                                report.createdBy ||
                                "—"
                            )
                        ) +
                    "</strong>" +
                "</div>" +

                "<div>" +
                    "<span>Report Date</span>" +
                    "<strong>" +
                        escapeHtml(
                            formatDashboardDateTime(
                                report.reportDate ||
                                report.submittedAt ||
                                report.createdAt ||
                                report.date
                            )
                        ) +
                    "</strong>" +
                "</div>" +

                "<div>" +
                    "<span>Version</span>" +
                    "<strong>" +
                        escapeHtml(
                            String(
                                report.version ??
                                "—"
                            )
                        ) +
                    "</strong>" +
                "</div>" +

            "</div>" +

        "</div>" +

        '<div class="slc-report-detail-section">' +
            "<h4>Participation Follow-up</h4>" +

            buildReportArrayList(
                contactedTable,
                "No follow-up records were submitted."
            ) +

        "</div>" +

        '<div class="slc-report-detail-section">' +
            "<h4>Non-Participants</h4>" +

            buildReportArrayList(
                nonParticipants,
                "No non-participants were recorded."
            ) +

        "</div>" +

        '<div class="slc-report-detail-section">' +
            "<h4>Support Given</h4>" +

            buildReportArrayList(
                supportGiven,
                "No support records were submitted."
            ) +

        "</div>" +

        '<div class="slc-report-detail-section">' +
            "<h4>Notes & Observations</h4>" +

            '<div class="slc-report-notes">' +
                escapeHtml(
                    notes ||
                    "No additional notes were recorded."
                ) +
            "</div>" +

        "</div>"
    );
}


function normalizeReportArray(value) {
    if (Array.isArray(value)) {
        return value;
    }

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return [];
    }

    if (typeof value === "string") {
        const trimmed =
            value.trim();

        if (!trimmed) {
            return [];
        }

        try {
            const parsed =
                JSON.parse(trimmed);

            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch (error) {
            /* Not JSON. Treat as plain text. */
        }

        return trimmed
            .split(/\r?\n/)
            .map(function (item) {
                return item.trim();
            })
            .filter(Boolean);
    }

    return [value];
}


function buildReportArrayList(
    items,
    emptyMessage
) {
    if (
        !Array.isArray(items) ||
        !items.length
    ) {
        return (
            '<div class="slc-report-empty-list">' +
                escapeHtml(
                    emptyMessage
                ) +
            "</div>"
        );
    }

    return (
        '<ul class="slc-report-detail-items">' +

            items
                .map(function (item) {
                    let text = "";

                    if (
                        typeof item === "string" ||
                        typeof item === "number"
                    ) {
                        text =
                            String(item);

                    } else if (
                        item &&
                        typeof item === "object"
                    ) {
                        text =
                            item.name ||
                            item.memberName ||
                            item.text ||
                            item.note ||
                            item.description ||
                            item.reason ||
                            JSON.stringify(item);
                    } else {
                        text =
                            String(item);
                    }

                    return (
                        "<li>" +
                            escapeHtml(
                                text
                            ) +
                        "</li>"
                    );
                })
                .join("") +

        "</ul>"
    );
}


function formatDashboardDateTime(value) {
    if (!value) {
        return "—";
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

    return date.toLocaleString(
        "en-NG",
        {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        }
    );
}


/* ============================================================
   API HELPERS
   ============================================================ */

async function dashboardGet(params) {
    const query =
        new URLSearchParams();

    Object.keys(params || {})
        .forEach(function (key) {
            const value =
                params[key];

            if (
                value !== undefined &&
                value !== null
            ) {
                query.set(
                    key,
                    String(value)
                );
            }
        });

    const url =
        API_URL +
        "?" +
        query.toString();

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
            "Network error: " +
            response.status
        );
    }

    return response.json();
}


async function dashboardPost(data) {
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
            "Network error: " +
            response.status
        );
    }

    return response.json();
}


/* ============================================================
   STATUS HELPERS
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
        message || "";

    element.className =
        "dashboard-status";

    if (type) {
        element.classList.add(
            type
        );
    }
}


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
        message || "";

    element.className =
        "dashboard-status";

    if (type) {
        element.classList.add(
            type
        );
    }
}


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
        message || "";

    element.className =
        "dashboard-status";

    if (type) {
        element.classList.add(
            type
        );
    }
}


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
        message || "";

    element.className =
        "dashboard-status";

    if (type) {
        element.classList.add(
            type
        );
    }
}


function setAttemptsStatus(
    message,
    type
) {
    const element =
        document.getElementById(
            "attemptsStatus"
        );

    if (!element) {
        return;
    }

    element.textContent =
        message || "";

    element.className =
        "dashboard-status";

    if (type) {
        element.classList.add(
            type
        );
    }
}


function setQuizSettingsStatus(
    message,
    type
) {
    const element =
        document.getElementById(
            "quizSettingsStatus"
        );

    if (!element) {
        return;
    }

    element.textContent =
        message || "";

    element.className =
        "dashboard-status";

    if (type) {
        element.classList.add(
            type
        );
    }
}


function setReportsStatus(
    message,
    type
) {
    const element =
        document.getElementById(
            "reportsStatus"
        );

    if (!element) {
        return;
    }

    element.textContent =
        message || "";

    element.className =
        "dashboard-status";

    if (type) {
        element.classList.add(
            type
        );
    }
}


/* ============================================================
   GENERAL HELPERS
   ============================================================ */

function showDashboardEmpty(
    message
) {
    const element =
        document.getElementById(
            "dashboardEmpty"
        );

    if (!element) {
        return;
    }

    element.hidden =
        false;

    element.textContent =
        message || "";
}


function getParticipationDescription(
    percentage
) {
    if (percentage >= 90) {
        return "Excellent participation this week.";
    }

    if (percentage >= 75) {
        return "Strong participation this week.";
    }

    if (percentage >= 50) {
        return "Participation is progressing well.";
    }

    if (percentage > 0) {
        return "Participation still needs attention.";
    }

    return "No participation has been recorded yet.";
}


function formatDashboardDate(
    value
) {
    if (!value) {
        return "—";
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
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );
}


function setText(
    id,
    value
) {
    const element =
        document.getElementById(id);

    if (!element) {
        return;
    }

    element.textContent =
        value === undefined ||
        value === null
            ? ""
            : String(value);
}


function setInputValue(
    id,
    value
) {
    const element =
        document.getElementById(id);

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
        document.getElementById(id);

    if (!element) {
        return "";
    }

    return String(
        element.value || ""
    ).trim();
}


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
