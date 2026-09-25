/**
 * ============================================================
 * AFC ISIU YOUTH PORTAL V2
 * FILE: slcreport-dashboard.js
 *
 * PURPOSE:
 * Quiz Coordinator / SLC Admin Dashboard
 *
 * MODULES:
 * - Dashboard authentication
 * - Session restoration
 * - Dashboard overview
 * - Quiz Questions
 * - Quiz Attempts
 * - Quiz Settings
 * - SLC Reports
 * - Report details
 *
 * ROLES:
 * - Admin
 * - Super Admin
 * - Quiz Coordinator
 * ============================================================
 */


/* ============================================================
   CONFIGURATION
   ============================================================ */

const API_URL =
    "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";

const SESSION_KEY =
    "afc_isiu_slc_leader_session";


/* ============================================================
   DASHBOARD STATE
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

let activeDashboardSection = "overview";


/* ============================================================
   DOM READY
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {
    setupDashboard();
    restoreDashboardSession();
});


/* ============================================================
   INITIAL DASHBOARD SETUP
   ============================================================ */

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

    const lessonInput =
        document.getElementById("dashboardLessonNo");

    if (lessonInput) {
        lessonInput.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                loadDashboardOverview();
            }
        });
    }
}


/* ============================================================
   SESSION RESTORATION
   ============================================================ */

function restoreDashboardSession() {

    let storedSession = null;

    try {
        const raw =
            localStorage.getItem(SESSION_KEY);

        if (raw) {
            storedSession = JSON.parse(raw);
        }
    } catch (error) {
        console.warn(
            "Dashboard session could not be restored:",
            error
        );

        localStorage.removeItem(SESSION_KEY);
    }

    if (
        !storedSession ||
        !storedSession.token
    ) {
        showDashboardLoginRequired();
        return;
    }

    dashboardSession = storedSession;

    verifyDashboardAccess();
}


/* ============================================================
   VERIFY DASHBOARD ACCESS
   ============================================================ */

async function verifyDashboardAccess() {

    showDashboardStatus(
        "Checking dashboard access...",
        "loading"
    );

    try {

        const result =
            await dashboardGet({
                action: "getSLCAdminOverview",
                token: dashboardSession.token
            });

        if (!result || result.success === false) {

            throw new Error(
                result && result.message
                    ? result.message
                    : "Your dashboard session is no longer valid."
            );
        }

        renderDashboardOverview(result);

        hideDashboardStatus();

        await loadDashboardQuestions();

    } catch (error) {

        console.error(
            "Dashboard access error:",
            error
        );

        dashboardSession = null;

        try {
            localStorage.removeItem(SESSION_KEY);
        } catch (storageError) {
            console.warn(storageError);
        }

        showDashboardLoginRequired(
            error.message ||
            "Your dashboard session has expired."
        );
    }
}


/* ============================================================
   LOGIN REQUIRED STATE
   ============================================================ */

function showDashboardLoginRequired(message) {

    const status =
        document.getElementById("dashboardStatus");

    if (!status) return;

    status.className =
        "slc-dashboard-status";

    status.innerHTML = `
        <div class="dashboard-status-icon">
            <i class="fa-solid fa-lock"></i>
        </div>
        <div>
            <strong>Dashboard access required</strong>
            <p>
                ${escapeHtml(
                    message ||
                    "Please log in again to access the dashboard."
                )}
            </p>
        </div>
    `;
}


/* ============================================================
   DASHBOARD STATUS
   ============================================================ */

function showDashboardStatus(
    message,
    type
) {

    const status =
        document.getElementById("dashboardStatus");

    if (!status) return;

    status.className =
        "slc-dashboard-status";

    if (type) {
        status.classList.add(
            "status-" + type
        );
    }

    status.innerHTML = `
        <div class="dashboard-status-icon">
            <i class="fa-solid ${
                type === "error"
                    ? "fa-circle-exclamation"
                    : type === "success"
                        ? "fa-circle-check"
                        : "fa-spinner fa-spin"
            }"></i>
        </div>
        <div>
            <p>${escapeHtml(message)}</p>
        </div>
    `;
}


function hideDashboardStatus() {

    const status =
        document.getElementById("dashboardStatus");

    if (!status) return;

    status.classList.add("hidden");
}


/* ============================================================
   OVERVIEW
   ============================================================ */

async function loadDashboardOverview() {

    if (!dashboardSession || !dashboardSession.token) {
        showDashboardLoginRequired();
        return;
    }

    const lessonInput =
        document.getElementById("dashboardLessonNo");

    const lessonNo =
        lessonInput
            ? String(lessonInput.value || "").trim()
            : "";

    showDashboardStatus(
        "Loading dashboard overview...",
        "loading"
    );

    try {

        const params = {
            action: "getSLCAdminOverview",
            token: dashboardSession.token
        };

        if (lessonNo) {
            params.lessonNo = lessonNo;
        }

        const result =
            await dashboardGet(params);

        if (!result || result.success === false) {
            throw new Error(
                result && result.message
                    ? result.message
                    : "Unable to load dashboard overview."
            );
        }

        renderDashboardOverview(result);

        hideDashboardStatus();

    } catch (error) {

        console.error(
            "Dashboard overview error:",
            error
        );

        showDashboardStatus(
            error.message ||
            "Unable to load dashboard overview.",
            "error"
        );
    }
}


/* ============================================================
   RENDER OVERVIEW
   ============================================================ */

function renderDashboardOverview(data) {

    const overview =
        data.overview ||
        data.data ||
        data;

    const totalMembers =
        numberValue(
            overview.totalMembers ??
            data.totalMembers
        );

    const participated =
        numberValue(
            overview.participated ??
            data.participated
        );

    const notParticipated =
        numberValue(
            overview.notParticipated ??
            data.notParticipated
        );

    let participationRate =
        overview.participationRate ??
        data.participationRate;

    if (
        participationRate === undefined ||
        participationRate === null ||
        participationRate === ""
    ) {
        participationRate =
            totalMembers > 0
                ? (participated / totalMembers) * 100
                : 0;
    }

    participationRate =
        Number(participationRate) || 0;

    if (participationRate > 100) {
        participationRate = 100;
    }

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
        formatPercentage(participationRate)
    );

    setText(
        "progressPercentage",
        formatPercentage(participationRate)
    );

    const progress =
        document.getElementById(
            "participationProgress"
        );

    if (progress) {
        progress.style.width =
            participationRate + "%";
    }

    setText(
        "progressDescription",
        participated +
        " of " +
        totalMembers +
        " members participated."
    );

    setText(
        "groupNameDisplay",
        overview.groupName ||
        data.groupName ||
        "—"
    );

    setText(
        "groupLeaderDisplay",
        overview.groupLeaderName ||
        data.groupLeaderName ||
        "—"
    );

    setText(
        "reportVersionDisplay",
        overview.version ??
        data.version ??
        "—"
    );

    setText(
        "reportDateDisplay",
        formatDisplayDate(
            overview.reportDate ||
            data.reportDate
        )
    );

    const nonParticipants =
        normalizeArray(
            overview.nonParticipants ||
            data.nonParticipants
        );

    setText(
        "nonParticipantCount",
        nonParticipants.length
    );

    renderNonParticipants(
        nonParticipants
    );

    const observations =
        overview.observations ||
        data.observations ||
        "";

    const observationsCard =
        document.getElementById(
            "observationsCard"
        );

    const observationsDisplay =
        document.getElementById(
            "observationsDisplay"
        );

    if (observationsCard) {

        if (String(observations).trim()) {

            observationsCard.classList.remove(
                "hidden"
            );

            if (observationsDisplay) {
                observationsDisplay.textContent =
                    observations;
            }

        } else {

            observationsCard.classList.add(
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

    const hasData =
        totalMembers > 0 ||
        participated > 0 ||
        notParticipated > 0 ||
        nonParticipants.length > 0;

    if (summary) {
        summary.classList.toggle(
            "hidden",
            !hasData
        );
    }

    if (empty) {
        empty.classList.toggle(
            "hidden",
            hasData
        );
    }
}


/* ============================================================
   NON-PARTICIPANTS
   ============================================================ */

function renderNonParticipants(
    people
) {

    const container =
        document.getElementById(
            "nonParticipantsDisplay"
        );

    if (!container) return;

    if (!people.length) {

        container.innerHTML = `
            <div class="dashboard-empty-inline">
                <i class="fa-solid fa-circle-check"></i>
                <span>Everyone participated.</span>
            </div>
        `;

        return;
    }

    container.innerHTML =
        people.map(function (person) {

            if (
                typeof person === "string"
            ) {
                return `
                    <span class="dashboard-person-chip">
                        ${escapeHtml(person)}
                    </span>
                `;
            }

            const name =
                person.name ||
                person.memberName ||
                person.fullName ||
                person.username ||
                "Unknown member";

            return `
                <span class="dashboard-person-chip">
                    ${escapeHtml(name)}
                </span>
            `;

        }).join("");
}


/* ============================================================
   DASHBOARD NAVIGATION
   ============================================================ */

function setupDashboardNavigation() {

    const buttons =
        document.querySelectorAll(
            ".quiz-coordinator-nav button[data-section]"
        );

    buttons.forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                const sectionName =
                    button.dataset.section;

                if (!sectionName) return;

                activateDashboardSection(
                    sectionName
                );
            }
        );
    });
}


function activateDashboardSection(
    sectionName
) {

    activeDashboardSection =
        sectionName;

    const buttons =
        document.querySelectorAll(
            ".quiz-coordinator-nav button[data-section]"
        );

    buttons.forEach(function (button) {

        button.classList.toggle(
            "active",
            button.dataset.section === sectionName
        );
    });

    const sections =
        document.querySelectorAll(
            ".quiz-dashboard-section"
        );

    sections.forEach(function (section) {

        const matches =
            section.dataset.dashboardSection ===
            sectionName ||
            section.id ===
            "dashboardSection" +
            capitalizeFirstLetter(sectionName);

        section.classList.toggle(
            "active",
            matches
        );
    });

    if (!dashboardSession) {
        return;
    }

    if (sectionName === "questions") {
        loadDashboardQuestions();
    }

    if (sectionName === "attempts") {
        loadDashboardAttempts();
    }

    if (sectionName === "settings") {
        loadQuizSettings();
    }

    if (sectionName === "reports") {
        loadDashboardReports();
    }
}


/* ============================================================
   QUESTIONS — CONTROLS
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
                loadDashboardQuestions();
            }
        );
    }

    const filter =
        document.getElementById(
            "questionsLessonFilter"
        );

    if (filter) {

        filter.addEventListener(
            "input",
            function () {
                renderDashboardQuestions();
            }
        );

        filter.addEventListener(
            "change",
            function () {
                renderDashboardQuestions();
            }
        );
    }
}


/* ============================================================
   QUESTIONS — LOAD
   ============================================================ */

async function loadDashboardQuestions() {

    if (
        !dashboardSession ||
        !dashboardSession.token
    ) {
        return;
    }

    const status =
        document.getElementById(
            "questionsStatus"
        );

    if (status) {
        status.textContent =
            "Loading quiz questions...";
        status.className =
            "questions-status is-loading";
    }

    try {

        const result =
            await dashboardGet({
                action:
                    "getSLCAdminQuizQuestions",
                token:
                    dashboardSession.token
            });

        if (!result || result.success === false) {
            throw new Error(
                result && result.message
                    ? result.message
                    : "Unable to load quiz questions."
            );
        }

        dashboardQuestions =
            normalizeArray(
                result.questions ||
                result.data
            );

        renderDashboardQuestions();

        if (status) {
            status.textContent =
                dashboardQuestions.length +
                " question" +
                (
                    dashboardQuestions.length === 1
                        ? ""
                        : "s"
                ) +
                " loaded.";

            status.className =
                "questions-status is-success";
        }

    } catch (error) {

        console.error(
            "Questions load error:",
            error
        );

        if (status) {
            status.textContent =
                error.message ||
                "Unable to load questions.";

            status.className =
                "questions-status is-error";
        }
    }
}


/* ============================================================
   QUESTIONS — RENDER
   ============================================================ */

function renderDashboardQuestions() {

    const body =
        document.getElementById(
            "questionsTableBody"
        );

    const count =
        document.getElementById(
            "questionsCount"
        );

    if (!body) return;

    const filter =
        document.getElementById(
            "questionsLessonFilter"
        );

    const lessonFilter =
        filter
            ? String(filter.value || "").trim()
            : "";

    let questions =
        dashboardQuestions.slice();

    if (lessonFilter) {

        questions =
            questions.filter(function (question) {

                return String(
                    question.lessonNo ??
                    question.lesson ??
                    ""
                ).trim() === lessonFilter;
            });
    }

    questions.sort(function (a, b) {

        const lessonA =
            Number(
                a.lessonNo ??
                a.lesson ??
                0
            );

        const lessonB =
            Number(
                b.lessonNo ??
                b.lesson ??
                0
            );

        if (lessonA !== lessonB) {
            return lessonA - lessonB;
        }

        const rowA =
            Number(
                a.rowNumber ??
                a.row ??
                0
            );

        const rowB =
            Number(
                b.rowNumber ??
                b.row ??
                0
            );

        return rowA - rowB;
    });

    if (count) {
        count.textContent =
            questions.length;
    }

    if (!questions.length) {

        body.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="dashboard-table-empty"
                >
                    <div>
                        <i class="fa-solid fa-circle-question"></i>
                        <strong>No quiz questions found</strong>
                        <span>
                            Add a question or change the lesson filter.
                        </span>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    body.innerHTML =
        questions.map(function (question, index) {

            const lessonNo =
                question.lessonNo ??
                question.lesson ??
                "";

            const questionText =
                question.question ||
                "";

            const optionA =
                question.optionA ||
                question.A ||
                "";

            const optionB =
                question.optionB ||
                question.B ||
                "";

            const optionC =
                question.optionC ||
                question.C ||
                "";

            const optionD =
                question.optionD ||
                question.D ||
                "";

            const correctOption =
                question.correctOption ||
                question.correct ||
                "";

            const points =
                question.points ??
                0;

            const rowNumber =
                question.rowNumber ??
                question.row ??
                index + 1;

            return `
                <tr>
                    <td>
                        ${escapeHtml(lessonNo)}
                    </td>

                    <td class="question-text-cell">
                        ${escapeHtml(questionText)}
                    </td>

                    <td>
                        ${escapeHtml(optionA)}
                    </td>

                    <td>
                        ${escapeHtml(optionB)}
                    </td>

                    <td>
                        ${escapeHtml(optionC)}
                    </td>

                    <td>
                        ${escapeHtml(optionD)}
                    </td>

                    <td>
                        <strong>
                            ${escapeHtml(correctOption)}
                        </strong>
                    </td>

                    <td>
                        ${escapeHtml(points)}
                    </td>

                    <td>
                        <div class="question-row-actions">
                            <button
                                type="button"
                                class="question-action-button"
                                data-action="edit-question"
                                data-index="${index}"
                                title="Edit question"
                                aria-label="Edit question"
                            >
                                <i class="fa-solid fa-pen"></i>
                            </button>

                            <button
                                type="button"
                                class="question-action-button danger"
                                data-action="delete-question"
                                data-index="${index}"
                                title="Delete question"
                                aria-label="Delete question"
                            >
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;

        }).join("");

    body
        .querySelectorAll(
            "[data-action='edit-question']"
        )
        .forEach(function (button) {

            button.addEventListener(
                "click",
                function () {

                    const index =
                        Number(
                            button.dataset.index
                        );

                    const question =
                        questions[index];

                    if (question) {
                        openQuestionEditor(
                            question
                        );
                    }
                }
            );
        });

    body
        .querySelectorAll(
            "[data-action='delete-question']"
        )
        .forEach(function (button) {

            button.addEventListener(
                "click",
                function () {

                    const index =
                        Number(
                            button.dataset.index
                        );

                    const question =
                        questions[index];

                    if (question) {
                        openQuestionDeleteModal(
                            question
                        );
                    }
                }
            );
        });
}


/* ============================================================
   QUESTION EDITOR
   ============================================================ */

function setupQuestionEditor() {

    const modal =
        document.getElementById(
            "questionEditorModal"
        );

    const overlay =
        document.getElementById(
            "questionEditorOverlay"
        );

    const closeButton =
        document.getElementById(
            "questionEditorClose"
        );

    const form =
        document.getElementById(
            "questionEditorForm"
        );

    if (overlay) {
        overlay.addEventListener(
            "click",
            closeQuestionEditor
        );
    }

    if (closeButton) {
        closeButton.addEventListener(
            "click",
            closeQuestionEditor
        );
    }

    if (form) {
        form.addEventListener(
            "submit",
            function (event) {
                event.preventDefault();
                saveQuestion();
            }
        );
    }

    if (modal) {

        modal.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Escape") {
                    closeQuestionEditor();
                }
            }
        );
    }
}


function openQuestionEditor(
    question
) {

    questionBeingEdited =
        question || null;

    const modal =
        document.getElementById(
            "questionEditorModal"
        );

    if (!modal) return;

    const isEditing =
        !!question;

    setText(
        "questionEditorEyebrow",
        isEditing
            ? "EDIT QUESTION"
            : "NEW QUESTION"
    );

    setText(
        "questionEditorTitle",
        isEditing
            ? "Edit Quiz Question"
            : "Add Quiz Question"
    );

    setText(
        "questionEditorDescription",
        isEditing
            ? "Update the question and its answer options."
            : "Create a new question for the weekly SLC quiz."
    );

    setInputValue(
        "questionEditorRowNumber",
        question
            ? question.rowNumber ??
                question.row ??
                ""
            : ""
    );

    setInputValue(
        "questionEditorLessonNo",
        question
            ? question.lessonNo ??
                question.lesson ??
                ""
            : ""
    );

    setInputValue(
        "questionEditorPoints",
        question
            ? question.points ??
                ""
            : "200"
    );

    setInputValue(
        "questionEditorQuestion",
        question
            ? question.question ||
                ""
            : ""
    );

    setInputValue(
        "questionEditorOptionA",
        question
            ? question.optionA ||
                question.A ||
                ""
            : ""
    );

    setInputValue(
        "questionEditorOptionB",
        question
            ? question.optionB ||
                question.B ||
                ""
            : ""
    );

    setInputValue(
        "questionEditorOptionC",
        question
            ? question.optionC ||
                question.C ||
                ""
            : ""
    );

    setInputValue(
        "questionEditorOptionD",
        question
            ? question.optionD ||
                question.D ||
                ""
            : ""
    );

    setInputValue(
        "questionEditorCorrectOption",
        question
            ? question.correctOption ||
                question.correct ||
                ""
            : ""
    );

    setText(
        "questionEditorStatus",
        ""
    );

    const saveButton =
        document.getElementById(
            "saveQuestionButton"
        );

    if (saveButton) {
        saveButton.disabled = false;
        saveButton.innerHTML = `
            <i class="fa-solid fa-floppy-disk"></i>
            <span>Save Question</span>
        `;
    }

    modal.classList.add("active");
    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "modal-open"
    );

    setTimeout(function () {

        const input =
            document.getElementById(
                "questionEditorQuestion"
            );

        if (input) {
            input.focus();
        }

    }, 50);
}


function closeQuestionEditor() {

    const modal =
        document.getElementById(
            "questionEditorModal"
        );

    if (!modal) return;

    modal.classList.remove(
        "active"
    );

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "modal-open"
    );

    questionBeingEdited = null;
}


/* ============================================================
   SAVE QUESTION
   ============================================================ */

async function saveQuestion() {

    if (questionSaveInProgress) {
        return;
    }

    if (
        !dashboardSession ||
        !dashboardSession.token
    ) {
        showDashboardLoginRequired();
        return;
    }

    const lessonNo =
        getInputValue(
            "questionEditorLessonNo"
        );

    const points =
        getInputValue(
            "questionEditorPoints"
        );

    const questionText =
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
        );

    const status =
        document.getElementById(
            "questionEditorStatus"
        );

    if (!lessonNo) {
        setEditorStatus(
            "Lesson number is required.",
            "error"
        );
        return;
    }

    if (!questionText) {
        setEditorStatus(
            "Question text is required.",
            "error"
        );
        return;
    }

    if (
        !optionA ||
        !optionB ||
        !optionC ||
        !optionD
    ) {
        setEditorStatus(
            "All four answer options are required.",
            "error"
        );
        return;
    }

    if (
        !["A", "B", "C", "D"]
            .includes(
                correctOption.toUpperCase()
            )
    ) {
        setEditorStatus(
            "Correct option must be A, B, C or D.",
            "error"
        );
        return;
    }

    if (!points || Number(points) <= 0) {
        setEditorStatus(
            "Points must be greater than zero.",
            "error"
        );
        return;
    }

    questionSaveInProgress = true;

    const saveButton =
        document.getElementById(
            "saveQuestionButton"
        );

    if (saveButton) {

        saveButton.disabled = true;

        saveButton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Saving...</span>
        `;
    }

    setEditorStatus(
        "Saving question...",
        "loading"
    );

    try {

        const isEditing =
            !!questionBeingEdited;

        const payload = {
            action:
                isEditing
                    ? "updateSLCAdminQuizQuestion"
                    : "addSLCAdminQuizQuestion",

            token:
                dashboardSession.token,

            lessonNo:
                lessonNo,

            points:
                Number(points),

            question:
                questionText,

            optionA:
                optionA,

            optionB:
                optionB,

            optionC:
                optionC,

            optionD:
                optionD,

            correctOption:
                correctOption.toUpperCase()
        };

        if (isEditing) {

            payload.rowNumber =
                questionBeingEdited.rowNumber ??
                questionBeingEdited.row ??
                getInputValue(
                    "questionEditorRowNumber"
                );
        }

        const result =
            await dashboardPost(
                payload
            );

        if (
            !result ||
            result.success === false
        ) {
            throw new Error(
                result && result.message
                    ? result.message
                    : "Unable to save question."
            );
        }

        setEditorStatus(
            isEditing
                ? "Question updated successfully."
                : "Question added successfully.",
            "success"
        );

        await loadDashboardQuestions();

        setTimeout(function () {
            closeQuestionEditor();
        }, 500);

    } catch (error) {

        console.error(
            "Question save error:",
            error
        );

        setEditorStatus(
            error.message ||
            "Unable to save question.",
            "error"
        );

    } finally {

        questionSaveInProgress = false;

        if (saveButton) {

            saveButton.disabled = false;

            saveButton.innerHTML = `
                <i class="fa-solid fa-floppy-disk"></i>
                <span>Save Question</span>
            `;
        }
    }
}


function setEditorStatus(
    message,
    type
) {

    const status =
        document.getElementById(
            "questionEditorStatus"
        );

    if (!status) return;

    status.textContent =
        message || "";

    status.className =
        "question-editor-status";

    if (type) {
        status.classList.add(
            "is-" + type
        );
    }
}


/* ============================================================
   QUESTION DELETE MODAL
   ============================================================ */

function setupQuestionDeleteModal() {

    const overlay =
        document.getElementById(
            "questionDeleteOverlay"
        );

    const closeButton =
        document.getElementById(
            "questionDeleteClose"
        );

    const cancelButton =
        document.getElementById(
            "cancelDeleteQuestionButton"
        );

    const confirmButton =
        document.getElementById(
            "confirmDeleteQuestionButton"
        );

    if (overlay) {
        overlay.addEventListener(
            "click",
            closeQuestionDeleteModal
        );
    }

    if (closeButton) {
        closeButton.addEventListener(
            "click",
            closeQuestionDeleteModal
        );
    }

    if (cancelButton) {
        cancelButton.addEventListener(
            "click",
            closeQuestionDeleteModal
        );
    }

    if (confirmButton) {
        confirmButton.addEventListener(
            "click",
            deleteQuestion
        );
    }
}


function openQuestionDeleteModal(
    question
) {

    questionBeingDeleted =
        question;

    const modal =
        document.getElementById(
            "questionDeleteModal"
        );

    if (!modal) return;

    const questionText =
        question.question ||
        "this question";

    const message =
        document.getElementById(
            "questionDeleteMessage"
        );

    if (message) {

        message.innerHTML = `
            Are you sure you want to delete
            <strong>
                “${escapeHtml(questionText)}”
            </strong>?
            <br>
            This action cannot be undone.
        `;
    }

    setText(
        "questionDeleteStatus",
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
        "modal-open"
    );
}


function closeQuestionDeleteModal() {

    const modal =
        document.getElementById(
            "questionDeleteModal"
        );

    if (!modal) return;

    modal.classList.remove(
        "active"
    );

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "modal-open"
    );

    questionBeingDeleted = null;
}


/* ============================================================
   DELETE QUESTION
   ============================================================ */

async function deleteQuestion() {

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
        showDashboardLoginRequired();
        return;
    }

    questionDeleteInProgress = true;

    const confirmButton =
        document.getElementById(
            "confirmDeleteQuestionButton"
        );

    const status =
        document.getElementById(
            "questionDeleteStatus"
        );

    if (confirmButton) {

        confirmButton.disabled = true;

        confirmButton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Deleting...</span>
        `;
    }

    if (status) {
        status.textContent =
            "Deleting question...";
        status.className =
            "question-delete-status is-loading";
    }

    try {

        const rowNumber =
            questionBeingDeleted.rowNumber ??
            questionBeingDeleted.row;

        if (!rowNumber) {
            throw new Error(
                "Question row number is missing."
            );
        }

        const result =
            await dashboardPost({
                action:
                    "deleteSLCAdminQuizQuestion",

                token:
                    dashboardSession.token,

                rowNumber:
                    rowNumber
            });

        if (
            !result ||
            result.success === false
        ) {
            throw new Error(
                result && result.message
                    ? result.message
                    : "Unable to delete question."
            );
        }

        if (status) {
            status.textContent =
                "Question deleted successfully.";
            status.className =
                "question-delete-status is-success";
        }

        await loadDashboardQuestions();

        setTimeout(function () {
            closeQuestionDeleteModal();
        }, 400);

    } catch (error) {

        console.error(
            "Question delete error:",
            error
        );

        if (status) {
            status.textContent =
                error.message ||
                "Unable to delete question.";

            status.className =
                "question-delete-status is-error";
        }

    } finally {

        questionDeleteInProgress = false;

        if (confirmButton) {

            confirmButton.disabled = false;

            confirmButton.innerHTML = `
                <i class="fa-solid fa-trash"></i>
                <span>Delete Question</span>
            `;
        }
    }
}


/* ============================================================
   ATTEMPTS — CONTROLS
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
                loadDashboardAttempts();
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
            renderDashboardAttempts
        );

        lessonFilter.addEventListener(
            "change",
            renderDashboardAttempts
        );
    }

    const searchInput =
        document.getElementById(
            "attemptsSearchInput"
        );

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            renderDashboardAttempts
        );
    }
}


/* ============================================================
   ATTEMPTS — LOAD
   ============================================================ */

async function loadDashboardAttempts() {

    if (
        !dashboardSession ||
        !dashboardSession.token
    ) {
        return;
    }

    const status =
        document.getElementById(
            "attemptsStatus"
        );

    if (status) {

        status.textContent =
            "Loading quiz attempts...";

        status.className =
            "attempts-status is-loading";
    }

    try {

        const result =
            await dashboardGet({
                action:
                    "getSLCAdminQuizAttempts",

                token:
                    dashboardSession.token
            });

        if (
            !result ||
            result.success === false
        ) {
            throw new Error(
                result && result.message
                    ? result.message
                    : "Unable to load quiz attempts."
            );
        }

        dashboardAttempts =
            normalizeArray(
                result.attempts ||
                result.data
            );

        renderDashboardAttempts();

        if (status) {

            status.textContent =
                dashboardAttempts.length +
                " attempt" +
                (
                    dashboardAttempts.length === 1
                        ? ""
                        : "s"
                ) +
                " loaded.";

            status.className =
                "attempts-status is-success";
        }

    } catch (error) {

        console.error(
            "Attempts load error:",
            error
        );

        if (status) {

            status.textContent =
                error.message ||
                "Unable to load quiz attempts.";

            status.className =
                "attempts-status is-error";
        }
    }
}


/* ============================================================
   ATTEMPTS — RENDER
   ============================================================ */

function renderDashboardAttempts() {

    const body =
        document.getElementById(
            "attemptsTableBody"
        );

    const count =
        document.getElementById(
            "attemptsCount"
        );

    if (!body) return;

    const lessonFilter =
        getInputValue(
            "attemptsLessonFilter"
        );

    const searchInput =
        getInputValue(
            "attemptsSearchInput"
        ).toLowerCase();

    let attempts =
        dashboardAttempts.slice();

    if (lessonFilter) {

        attempts =
            attempts.filter(function (attempt) {

                return String(
                    attempt.lessonNo ??
                    attempt.lesson ??
                    ""
                ).trim() ===
                lessonFilter;
            });
    }

    if (searchInput) {

        attempts =
            attempts.filter(function (attempt) {

                const text = [
                    attempt.memberName,
                    attempt.name,
                    attempt.memberId,
                    attempt.username,
                    attempt.lessonNo,
                    attempt.score,
                    attempt.totalPoints
                ]
                    .filter(function (value) {
                        return value !== undefined &&
                            value !== null;
                    })
                    .join(" ")
                    .toLowerCase();

                return text.includes(
                    searchInput
                );
            });
    }

    if (count) {
        count.textContent =
            attempts.length;
    }

    if (!attempts.length) {

        body.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="dashboard-table-empty"
                >
                    <div>
                        <i class="fa-solid fa-clipboard-list"></i>
                        <strong>No quiz attempts found</strong>
                        <span>
                            Try changing your filters or refresh the data.
                        </span>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    body.innerHTML =
        attempts.map(function (attempt) {

            const memberName =
                attempt.memberName ||
                attempt.name ||
                attempt.fullName ||
                "—";

            const memberId =
                attempt.memberId ||
                "—";

            const lessonNo =
                attempt.lessonNo ??
                attempt.lesson ??
                "—";

            const score =
                attempt.score ??
                attempt.points ??
                0;

            const totalPoints =
                attempt.totalPoints ??
                attempt.maxPoints ??
                "—";

            const percentage =
                attempt.percentage !== undefined
                    ? attempt.percentage
                    : (
                        Number(totalPoints) > 0
                            ? (
                                Number(score) /
                                Number(totalPoints)
                            ) * 100
                            : 0
                    );

            const submittedAt =
                attempt.submittedAt ||
                attempt.timestamp ||
                attempt.createdAt ||
                "";

            return `
                <tr>
                    <td>
                        ${escapeHtml(lessonNo)}
                    </td>

                    <td>
                        <strong>
                            ${escapeHtml(memberName)}
                        </strong>
                    </td>

                    <td>
                        ${escapeHtml(memberId)}
                    </td>

                    <td>
                        ${escapeHtml(score)}
                    </td>

                    <td>
                        ${escapeHtml(totalPoints)}
                    </td>

                    <td>
                        ${escapeHtml(
                            formatPercentage(
                                percentage
                            )
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            formatDisplayDate(
                                submittedAt
                            )
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            attempt.status ||
                            "Completed"
                        )}
                    </td>
                </tr>
            `;

        }).join("");
}


/* ============================================================
   QUIZ SETTINGS — CONTROLS
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


/* ============================================================
   QUIZ SETTINGS — LOAD
   ============================================================ */

async function loadQuizSettings() {

    if (quizSettingsLoading) {
        return;
    }

    if (
        !dashboardSession ||
        !dashboardSession.token
    ) {
        return;
    }

    quizSettingsLoading = true;

    setQuizSettingsStatus(
        "Loading quiz settings...",
        "loading"
    );

    try {

        const result =
            await dashboardGet({
                action:
                    "getSLCAdminQuizSettings",

                token:
                    dashboardSession.token
            });

        if (
            !result ||
            result.success === false
        ) {
            throw new Error(
                result && result.message
                    ? result.message
                    : "Unable to load quiz settings."
            );
        }

        const settings =
            result.settings ||
            result.data ||
            result;

        setInputValue(
            "quizSettingsLesson",
            settings.lesson ??
            settings.lessonNo ??
            ""
        );

        setInputValue(
            "quizSettingsOpen",
            convertApiDateToLocalInput(
                settings.open
            )
        );

        setInputValue(
            "quizSettingsClose",
            convertApiDateToLocalInput(
                settings.close
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

        quizSettingsLoading = false;
    }
}


/* ============================================================
   QUIZ SETTINGS — SAVE
   ============================================================ */

async function saveQuizSettings() {

    if (quizSettingsSaving) {
        return;
    }

    if (
        !dashboardSession ||
        !dashboardSession.token
    ) {
        showDashboardLoginRequired();
        return;
    }

    const lesson =
        getInputValue(
            "quizSettingsLesson"
        );

    const open =
        getInputValue(
            "quizSettingsOpen"
        );

    const close =
        getInputValue(
            "quizSettingsClose"
        );

    if (!lesson) {

        setQuizSettingsStatus(
            "Lesson number is required.",
            "error"
        );

        return;
    }

    if (!open) {

        setQuizSettingsStatus(
            "Quiz opening time is required.",
            "error"
        );

        return;
    }

    if (!close) {

        setQuizSettingsStatus(
            "Quiz closing time is required.",
            "error"
        );

        return;
    }

    const openDate =
        new Date(open);

    const closeDate =
        new Date(close);

    if (
        isNaN(openDate.getTime()) ||
        isNaN(closeDate.getTime())
    ) {

        setQuizSettingsStatus(
            "Please enter valid opening and closing dates.",
            "error"
        );

        return;
    }

    if (
        closeDate.getTime() <=
        openDate.getTime()
    ) {

        setQuizSettingsStatus(
            "Closing time must be after opening time.",
            "error"
        );

        return;
    }

    quizSettingsSaving = true;

    const saveButton =
        document.getElementById(
            "saveQuizSettingsButton"
        );

    if (saveButton) {

        saveButton.disabled = true;

        saveButton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Saving...</span>
        `;
    }

    setQuizSettingsStatus(
        "Saving quiz settings...",
        "loading"
    );

    try {

        const result =
            await dashboardPost({

                action:
                    "updateSLCAdminQuizSettings",

                token:
                    dashboardSession.token,

                lesson:
                    lesson,

                open:
                    open,

                close:
                    close
            });

        if (
            !result ||
            result.success === false
        ) {
            throw new Error(
                result && result.message
                    ? result.message
                    : "Unable to save quiz settings."
            );
        }

        const settings =
            result.settings ||
            result.data ||
            result;

        if (settings.lesson !== undefined) {
            setInputValue(
                "quizSettingsLesson",
                settings.lesson
            );
        }

        if (settings.open) {
            setInputValue(
                "quizSettingsOpen",
                convertApiDateToLocalInput(
                    settings.open
                )
            );
        }

        if (settings.close) {
            setInputValue(
                "quizSettingsClose",
                convertApiDateToLocalInput(
                    settings.close
                )
            );
        }

        setQuizSettingsStatus(
            "Quiz settings updated successfully.",
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

        quizSettingsSaving = false;

        if (saveButton) {

            saveButton.disabled = false;

            saveButton.innerHTML = `
                <i class="fa-solid fa-floppy-disk"></i>
                <span>Save Settings</span>
            `;
        }
    }
}


function setQuizSettingsStatus(
    message,
    type
) {

    const status =
        document.getElementById(
            "quizSettingsStatus"
        );

    if (!status) return;

    status.textContent =
        message || "";

    status.className =
        "quiz-settings-status";

    if (type) {
        status.classList.add(
            "is-" + type
        );
    }
}


/* ============================================================
   SLC REPORTS — CONTROLS
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
                loadDashboardReports();
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
                renderDashboardReports();
            }
        );

        lessonFilter.addEventListener(
            "change",
            function () {
                renderDashboardReports();
            }
        );

        lessonFilter.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Enter") {
                    event.preventDefault();
                    loadDashboardReports();
                }
            }
        );
    }
}


/* ============================================================
   SLC REPORTS — LOAD
   ============================================================ */

async function loadDashboardReports() {

    if (reportsLoading) {
        return;
    }

    if (
        !dashboardSession ||
        !dashboardSession.token
    ) {
        showDashboardLoginRequired();
        return;
    }

    reportsLoading = true;

    const status =
        document.getElementById(
            "reportsStatus"
        );

    const refreshButton =
        document.getElementById(
            "refreshReportsButton"
        );

    const lessonFilter =
        getInputValue(
            "reportsLessonFilter"
        );

    if (status) {

        status.textContent =
            "Loading SLC reports...";

        status.className =
            "questions-status is-loading";
    }

    if (refreshButton) {
        refreshButton.disabled = true;
    }

    try {

        const params = {
            action:
                "getSLCReports",

            token:
                dashboardSession.token
        };

        if (lessonFilter) {
            params.lessonNo =
                lessonFilter;
        }

        const result =
            await dashboardGet(
                params
            );

        if (
            !result ||
            result.success === false
        ) {
            throw new Error(
                result && result.message
                    ? result.message
                    : "Unable to load SLC reports."
            );
        }

        dashboardReports =
            normalizeArray(
                result.reports ||
                result.data
            );

        renderDashboardReports();

        if (status) {

            status.textContent =
                dashboardReports.length +
                " report" +
                (
                    dashboardReports.length === 1
                        ? ""
                        : "s"
                ) +
                " loaded.";

            status.className =
                "questions-status is-success";
        }

    } catch (error) {

        console.error(
            "SLC reports load error:",
            error
        );

        if (status) {

            status.textContent =
                error.message ||
                "Unable to load SLC reports.";

            status.className =
                "questions-status is-error";
        }

    } finally {

        reportsLoading = false;

        if (refreshButton) {
            refreshButton.disabled = false;
        }
    }
}


/* ============================================================
   SLC REPORTS — RENDER
   ============================================================ */

function renderDashboardReports() {

    const body =
        document.getElementById(
            "reportsTableBody"
        );

    const count =
        document.getElementById(
            "reportsCount"
        );

    if (!body) return;

    const lessonFilter =
        getInputValue(
            "reportsLessonFilter"
        );

    let reports =
        dashboardReports.slice();

    if (lessonFilter) {

        reports =
            reports.filter(function (report) {

                return String(
                    report.lessonNo ??
                    ""
                ).trim() ===
                lessonFilter;
            });
    }

    reports.sort(function (a, b) {

        const lessonA =
            Number(
                a.lessonNo || 0
            );

        const lessonB =
            Number(
                b.lessonNo || 0
            );

        if (lessonA !== lessonB) {
            return lessonB - lessonA;
        }

        const dateA =
            getDateTimestamp(
                a.reportDate ||
                a.submittedAt
            );

        const dateB =
            getDateTimestamp(
                b.reportDate ||
                b.submittedAt
            );

        return dateB - dateA;
    });

    if (count) {
        count.textContent =
            reports.length;
    }

    if (!reports.length) {

        body.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    class="dashboard-table-empty"
                >
                    <div>
                        <i class="fa-solid fa-file-lines"></i>
                        <strong>No SLC reports found</strong>
                        <span>
                            No current report matches the selected lesson.
                        </span>
                    </div>
                </td>
            </tr>
        `;

        return;
    }

    body.innerHTML =
        reports.map(function (report, index) {

            return `
                <tr>
                    <td>
                        <strong>
                            ${escapeHtml(
                                report.lessonNo ??
                                "—"
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHtml(
                            report.groupName ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            report.groupLeaderName ||
                            "—"
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            report.totalMembers ??
                            0
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            report.participated ??
                            0
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            report.notParticipated ??
                            0
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            formatDisplayDate(
                                report.reportDate
                            )
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            report.submittedBy ||
                            "—"
                        )}
                    </td>

                    <td>
                        <button
                            type="button"
                            class="report-view-button"
                            data-report-index="${index}"
                        >
                            <i class="fa-solid fa-eye"></i>
                            <span>View</span>
                        </button>
                    </td>
                </tr>
            `;

        }).join("");

    body
        .querySelectorAll(
            ".report-view-button"
        )
        .forEach(function (button) {

            button.addEventListener(
                "click",
                function () {

                    const index =
                        Number(
                            button.dataset.reportIndex
                        );

                    const report =
                        reports[index];

                    if (report) {
                        openReportDetails(
                            report
                        );
                    }
                }
            );
        });
}


/* ============================================================
   REPORT DETAILS MODAL
   ============================================================ */

function setupReportDetailsModal() {

    const overlay =
        document.getElementById(
            "reportDetailsOverlay"
        );

    const closeButton =
        document.getElementById(
            "reportDetailsClose"
        );

    if (overlay) {

        overlay.addEventListener(
            "click",
            closeReportDetails
        );
    }

    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeReportDetails
        );
    }

    const modal =
        document.getElementById(
            "reportDetailsModal"
        );

    if (modal) {

        modal.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Escape") {
                    closeReportDetails();
                }
            }
        );
    }
}


function openReportDetails(
    report
) {

    const modal =
        document.getElementById(
            "reportDetailsModal"
        );

    const content =
        document.getElementById(
            "reportDetailsContent"
        );

    if (!modal || !content) {
        return;
    }

    setText(
        "reportDetailsEyebrow",
        "SLC REPORT • LESSON " +
        (
            report.lessonNo ??
            "—"
        )
    );

    setText(
        "reportDetailsTitle",
        report.groupName ||
        "Report Details"
    );

    setText(
        "reportDetailsDescription",
        report.groupLeaderName
            ? "Submitted by " +
              report.groupLeaderName
            : "Full weekly SLC group report."
    );

    content.innerHTML = buildReportDetailsHtml(
        report
    );

    modal.classList.add(
        "active"
    );

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "modal-open"
    );
}


function closeReportDetails() {

    const modal =
        document.getElementById(
            "reportDetailsModal"
        );

    if (!modal) return;

    modal.classList.remove(
        "active"
    );

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "modal-open"
    );
}


/* ============================================================
   REPORT DETAILS HTML
   ============================================================ */

function buildReportDetailsHtml(
    report
) {

    const nonParticipants =
        normalizeArray(
            report.nonParticipants
        );

    const contacted =
        normalizeArray(
            report.contactedTable
        );

    const support =
        normalizeArray(
            report.supportGiven
        );

    return `
        <div class="report-detail-summary">

            ${buildReportDetailItem(
                "Lesson",
                report.lessonNo
            )}

            ${buildReportDetailItem(
                "Group",
                report.groupName
            )}

            ${buildReportDetailItem(
                "Group Leader",
                report.groupLeaderName
            )}

            ${buildReportDetailItem(
                "Report Date",
                formatDisplayDate(
                    report.reportDate
                )
            )}

            ${buildReportDetailItem(
                "Total Members",
                report.totalMembers
            )}

            ${buildReportDetailItem(
                "Participated",
                report.participated
            )}

            ${buildReportDetailItem(
                "Not Participated",
                report.notParticipated
            )}

            ${buildReportDetailItem(
                "Report Version",
                report.version
            )}

            ${buildReportDetailItem(
                "Submitted By",
                report.submittedBy
            )}

            ${buildReportDetailItem(
                "Submitted At",
                formatDisplayDateTime(
                    report.submittedAt
                )
            )}

            ${buildReportDetailItem(
                "Coordinator",
                report.coordinatorName
            )}

            ${buildReportDetailItem(
                "Coordinator Date",
                formatDisplayDate(
                    report.coordinatorDate
                )
            )}

        </div>

        <div class="report-detail-section">
            <div class="report-detail-section-heading">
                <span>NON-PARTICIPANTS</span>
                <strong>
                    ${nonParticipants.length}
                </strong>
            </div>

            <div class="report-detail-list">
                ${
                    renderReportPeople(
                        nonParticipants,
                        "No non-participants were recorded."
                    )
                }
            </div>
        </div>

        <div class="report-detail-section">
            <div class="report-detail-section-heading">
                <span>CONTACTED MEMBERS</span>
                <strong>
                    ${contacted.length}
                </strong>
            </div>

            <div class="report-detail-list">
                ${
                    renderReportObjects(
                        contacted,
                        "No contact records were recorded."
                    )
                }
            </div>
        </div>

        <div class="report-detail-section">
            <div class="report-detail-section-heading">
                <span>SUPPORT GIVEN</span>
                <strong>
                    ${support.length}
                </strong>
            </div>

            <div class="report-detail-list">
                ${
                    renderReportObjects(
                        support,
                        "No support records were recorded."
                    )
                }
            </div>
        </div>

        ${
            String(
                report.otherSupport ||
                ""
            ).trim()
                ? `
                    <div class="report-detail-section">
                        <div class="report-detail-section-heading">
                            <span>OTHER SUPPORT</span>
                        </div>

                        <div class="report-detail-text">
                            ${escapeHtml(
                                report.otherSupport
                            )}
                        </div>
                    </div>
                `
                : ""
        }

        ${
            String(
                report.observations ||
                ""
            ).trim()
                ? `
                    <div class="report-detail-section">
                        <div class="report-detail-section-heading">
                            <span>OBSERVATIONS</span>
                        </div>

                        <div class="report-detail-text">
                            ${escapeHtml(
                                report.observations
                            )}
                        </div>
                    </div>
                `
                : ""
        }

        ${
            String(
                report.note ||
                ""
            ).trim()
                ? `
                    <div class="report-detail-section">
                        <div class="report-detail-section-heading">
                            <span>NOTE</span>
                        </div>

                        <div class="report-detail-text">
                            ${escapeHtml(
                                report.note
                            )}
                        </div>
                    </div>
                `
                : ""
        }
    `;
}


function buildReportDetailItem(
    label,
    value
) {

    return `
        <div class="report-detail-item">
            <span>
                ${escapeHtml(label)}
            </span>

            <strong>
                ${escapeHtml(
                    value === undefined ||
                    value === null ||
                    value === ""
                        ? "—"
                        : value
                )}
            </strong>
        </div>
    `;
}


/* ============================================================
   REPORT PEOPLE
   ============================================================ */

function renderReportPeople(
    people,
    emptyMessage
) {

    if (!people.length) {

        return `
            <div class="report-detail-empty">
                ${escapeHtml(emptyMessage)}
            </div>
        `;
    }

    return people.map(
        function (person) {

            if (
                typeof person === "string" ||
                typeof person === "number"
            ) {

                return `
                    <div class="report-detail-list-item">
                        ${escapeHtml(person)}
                    </div>
                `;
            }

            const name =
                person.name ||
                person.memberName ||
                person.fullName ||
                person.username ||
                person.memberId ||
                "Unnamed member";

            return `
                <div class="report-detail-list-item">
                    <strong>
                        ${escapeHtml(name)}
                    </strong>
                    ${
                        person.note
                            ? `
                                <span>
                                    ${escapeHtml(
                                        person.note
                                    )}
                                </span>
                            `
                            : ""
                    }
                </div>
            `;
        }
    ).join("");
}


/* ============================================================
   REPORT OBJECTS
   ============================================================ */

function renderReportObjects(
    items,
    emptyMessage
) {

    if (!items.length) {

        return `
            <div class="report-detail-empty">
                ${escapeHtml(emptyMessage)}
            </div>
        `;
    }

    return items.map(
        function (item) {

            if (
                typeof item === "string" ||
                typeof item === "number"
            ) {

                return `
                    <div class="report-detail-list-item">
                        ${escapeHtml(item)}
                    </div>
                `;
            }

            const entries =
                Object.keys(item || {})
                    .filter(function (key) {
                        return (
                            item[key] !== undefined &&
                            item[key] !== null &&
                            String(item[key]).trim() !== ""
                        );
                    });

            if (!entries.length) {

                return `
                    <div class="report-detail-list-item">
                        —
                    </div>
                `;
            }

            return `
                <div class="report-detail-object">
                    ${
                        entries.map(
                            function (key) {

                                return `
                                    <div>
                                        <span>
                                            ${escapeHtml(
                                                humanizeKey(key)
                                            )}
                                        </span>

                                        <strong>
                                            ${escapeHtml(
                                                item[key]
                                            )}
                                        </strong>
                                    </div>
                                `;
                            }
                        ).join("")
                    }
                </div>
            `;
        }
    ).join("");
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
    ).forEach(function (key) {

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
    });

    const requestUrl =
        API_URL +
        "?" +
        query.toString();

    const response =
        await fetch(
            requestUrl,
            {
                method: "GET",
                cache: "no-store"
            }
        );

    const rawText =
        await response.text();

    if (!response.ok) {

        throw new Error(
            "Server returned HTTP " +
            response.status +
            "."
        );
    }

    if (!rawText) {

        throw new Error(
            "The server returned an empty response."
        );
    }

    let data;

    try {

        data =
            JSON.parse(rawText);

    } catch (error) {

        console.error(
            "Invalid API JSON response:",
            rawText
        );

        if (
            rawText.includes(
                "AFC Isiu Youth Portal API Running"
            )
        ) {

            throw new Error(
                "The Apps Script endpoint did not process the requested action. Please make sure the latest Apps Script deployment is active."
            );
        }

        throw new Error(
            "The server returned an invalid response instead of JSON."
        );
    }

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

    const rawText =
        await response.text();

    if (!response.ok) {

        throw new Error(
            "Server returned HTTP " +
            response.status +
            "."
        );
    }

    if (!rawText) {

        throw new Error(
            "The server returned an empty response."
        );
    }

    let result;

    try {

        result =
            JSON.parse(rawText);

    } catch (error) {

        console.error(
            "Invalid POST API response:",
            rawText
        );

        if (
            rawText.includes(
                "AFC Isiu Youth Portal API Running"
            )
        ) {

            throw new Error(
                "The Apps Script endpoint did not process the requested action. Please make sure the latest Apps Script deployment is active."
            );
        }

        throw new Error(
            "The server returned an invalid response instead of JSON."
        );
    }

    if (!result) {

        throw new Error(
            "No response was received from the server."
        );
    }

    return result;
}


/* ============================================================
   INPUT HELPERS
   ============================================================ */

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


function setInputValue(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (!element) return;

    element.value =
        value === undefined ||
        value === null
            ? ""
            : value;
}


function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);

    if (!element) return;

    element.textContent =
        value === undefined ||
        value === null
            ? ""
            : value;
}


/* ============================================================
   DATE HELPERS
   ============================================================ */

function convertApiDateToLocalInput(
    value
) {

    if (!value) {
        return "";
    }

    let date;

    if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)
    ) {

        date =
            new Date(value);

    } else {

        date =
            new Date(value);
    }

    if (isNaN(date.getTime())) {
        return "";
    }

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    const hours =
        String(
            date.getHours()
        ).padStart(2, "0");

    const minutes =
        String(
            date.getMinutes()
        ).padStart(2, "0");

    return (
        year +
        "-" +
        month +
        "-" +
        day +
        "T" +
        hours +
        ":" +
        minutes
    );
}


function formatDisplayDate(
    value
) {

    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (isNaN(date.getTime())) {

        return String(
            value
        );
    }

    return date.toLocaleDateString(
        "en-NG",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


function formatDisplayDateTime(
    value
) {

    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (isNaN(date.getTime())) {

        return String(
            value
        );
    }

    return date.toLocaleString(
        "en-NG",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


function getDateTimestamp(
    value
) {

    if (!value) {
        return 0;
    }

    const date =
        new Date(value);

    if (isNaN(date.getTime())) {
        return 0;
    }

    return date.getTime();
}


/* ============================================================
   VALUE HELPERS
   ============================================================ */

function numberValue(
    value
) {

    const number =
        Number(value);

    return isNaN(number)
        ? 0
        : number;
}


function formatPercentage(
    value
) {

    const number =
        Number(value);

    if (isNaN(number)) {
        return "0%";
    }

    return (
        Math.round(
            number * 10
        ) / 10
    ) + "%";
}


function normalizeArray(
    value
) {

    if (Array.isArray(value)) {
        return value;
    }

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return [];
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

        } catch (error) {

            return [];
        }
    }

    return [];
}


/* ============================================================
   TEXT HELPERS
   ============================================================ */

function escapeHtml(
    value
) {

    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    return String(value)
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


function humanizeKey(
    key
) {

    return String(key || "")
        .replace(
            /([a-z])([A-Z])/g,
            "$1 $2"
        )
        .replace(
            /[_-]+/g,
            " "
        )
        .replace(
            /\b\w/g,
            function (letter) {
                return letter.toUpperCase();
            }
        );
}


function capitalizeFirstLetter(
    value
) {

    const text =
        String(value || "");

    if (!text) {
        return "";
    }

    return (
        text.charAt(0).toUpperCase() +
        text.slice(1)
    );
}
