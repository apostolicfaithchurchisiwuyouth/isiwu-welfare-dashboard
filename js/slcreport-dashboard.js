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


    /*
     * Load Quiz Settings when opened.
     */
    if (
        sectionName === "settings" &&
        dashboardSession
    ) {

        loadQuizSettings();

    }


    /*
     * Load SLC Reports when opened.
     */
    if (
        sectionName === "reports" &&
        dashboardSession
    ) {

        loadSLCReports();

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
                    "[data-close-question-editor]"
                );


            if (!closeButton) {
                return;
            }


            closeQuestionEditor();

        }
    );


    /*
     * The X icon button in the editor header carries
     * no data-close-question-editor attribute in the
     * markup, so it needs an explicit bind.
     */
    const closeIconButton =
        document.getElementById(
            "closeQuestionEditorButton"
        );


    if (closeIconButton) {

        closeIconButton.addEventListener(
            "click",
            function () {

                closeQuestionEditor();

            }
        );

    }


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

            closeSlcReportModal();

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
                    "[data-close-question-delete]"
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
                    colspan="6"
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
                        colspan="6"
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
                    colspan="6"
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

                    const score =
                        Number(
                            attempt.score ?? 0
                        );

                    const total =
                        attempt.totalPoints ??
                        attempt.maxScore ??
                        attempt.pointsEarned ??
                        null;

                    const percentage =
                        attempt.percentage !== undefined &&
                        attempt.percentage !== null
                            ? attempt.percentage
                            : (
                                total !== null &&
                                Number(total) > 0
                                    ? Math.round(
                                        (
                                            score /
                                            Number(total)
                                        ) * 100
                                    ) + "%"
                                    : "—"
                            );

                    return `
                        <tr>

                            <td>
                                ${escapeHtml(
                                    attempt.lessonNo ??
                                    ""
                                )}
                            </td>


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
                                    score
                                )}
                            </td>


                            <td>
                                ${escapeHtml(
                                    total ?? "—"
                                )}
                            </td>


                            <td>
                                ${escapeHtml(
                                    percentage
                                )}
                            </td>


                            <td>
                                ${escapeHtml(
                                    formatDashboardDateTime(
                                        attempt.date ||
                                        attempt.submittedAt ||
                                        attempt.timestamp
                                    )
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

    reportsLoading = true;

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
            params.lessonNo = lessonNo;
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
                (
                    dashboardReports.length === 1
                        ? " report"
                        : " reports"
                ) +
                " loaded.",
            "success"
        );

    } catch (error) {

        console.error(
            "SLC reports error:",
            error
        );

        dashboardReports = [];

        renderSLCReports();

        setReportsStatus(
            error.message ||
                "Unable to load SLC reports.",
            "error"
        );

    } finally {

        reportsLoading = false;

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

                const groupLeader =
                    report.groupLeaderName ||
                    report.groupLeader ||
                    "";

                return (
                    "<tr>" +

                    "<td>" +
                        '<span class="slc-report-lesson">' +
                            escapeHtml(
                                String(
                                    report.lessonNo ??
                                    report.lesson ??
                                    "—"
                                )
                            ) +
                        "</span>" +
                    "</td>" +

                    "<td>" +
                        '<div class="slc-report-group">' +
                            "<strong>" +
                                escapeHtml(
                                    String(
                                        report.groupName ??
                                        report.group ??
                                        "—"
                                    )
                                ) +
                            "</strong>" +
                            (
                                groupLeader
                                    ? "<small>" +
                                        escapeHtml(
                                            String(
                                                groupLeader
                                            )
                                        ) +
                                      "</small>"
                                    : ""
                            ) +
                        "</div>" +
                    "</td>" +

                    "<td>" +
                        '<span class="slc-report-number">' +
                            escapeHtml(
                                String(
                                    totalMembers
                                )
                            ) +
                        "</span>" +
                    "</td>" +

                    "<td>" +
                        '<span class="slc-report-number participated">' +
                            escapeHtml(
                                String(
                                    participated
                                )
                            ) +
                        "</span>" +
                    "</td>" +

                    "<td>" +
                        '<span class="slc-report-number not-participated">' +
                            escapeHtml(
                                String(
                                    notParticipated
                                )
                            ) +
                        "</span>" +
                    "</td>" +

                    "<td>" +
                        '<span class="slc-report-date">' +
                            escapeHtml(
                                formatDashboardDateTime(
                                    report.reportDate ||
                                    report.submittedAt ||
                                    report.createdAt ||
                                    report.date
                                )
                            ) +
                        "</span>" +
                    "</td>" +

                    "<td>" +
                        '<span class="slc-report-submitter">' +
                            escapeHtml(
                                String(
                                    report.submittedBy ||
                                    report.submittedByName ||
                                    report.createdBy ||
                                    "—"
                                )
                            ) +
                        "</span>" +
                    "</td>" +

                    "<td>" +
                        '<span class="slc-report-version">' +
                            escapeHtml(
                                String(
                                    report.version ??
                                    "—"
                                )
                            ) +
                        "</span>" +
                    "</td>" +

                    "<td>" +

                        '<button type="button" class="slc-report-view-button" data-report-action="view" data-report-index="' +
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
                            '<i class="ri-eye-line"></i>' +
                            "<span>View</span>" +
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
        tbody.dataset.reportActionsBound === "true"
    ) {
        return;
    }

    tbody.dataset.reportActionsBound = "true";

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

    const element =
        document.getElementById(
            "reportsCount"
        );

    if (!element) {
        return;
    }

    element.textContent =
        count +
        (
            count === 1
                ? " report"
                : " reports"
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

    document.addEventListener(
        "click",
        function (event) {

            const closeButton =
                event.target.closest(
                    "[data-close-report-modal]"
                );

            if (!closeButton) {
                return;
            }

            closeSlcReportModal();

        }
    );


    /*
     * The X icon button in the report modal header
     * carries no data-close-report-modal attribute in
     * the markup, so it needs an explicit bind.
     */
    const closeIconButton =
        document.getElementById(
            "closeSlcReportModalButton"
        );


    if (closeIconButton) {

        closeIconButton.addEventListener(
            "click",
            function () {

                closeSlcReportModal();

            }
        );

    }


    modal.addEventListener(
        "click",
        function (event) {

            if (event.target === modal) {

                closeSlcReportModal();

            }

        }
    );

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
                reportModal.classList.contains(
                    "active"
                )
            ) {

                closeSlcReportModal();

            }

        }
    );

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

    reportBeingViewed = report;

    setText(
        "slcReportModalTitle",
        report.groupName
            ? report.groupName + " — SLC Report"
            : "SLC Report"
    );

    setText(
        "slcReportModalSubtitle",
        "Lesson " +
        String(
            report.lessonNo || "—"
        ) +
        " · Report version " +
        String(
            report.version ?? "—"
        )
    );

    details.innerHTML =
        buildSlcReportDetailsHtml(
            report
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


function closeSlcReportModal() {

    const modal =
        document.getElementById(
            "slcReportModal"
        );

    if (!modal) {
        return;
    }

    modal.classList.remove("active");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "question-modal-open"
    );

    reportBeingViewed = null;

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
        report.participated ?? 0;

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
                ) * 100
            )
            : 0;

    return (

        /*
         * Top summary strip — the CSS defines
         * .slc-report-summary-grid /
         * .slc-report-summary-item for this,
         * matching the stat-card look used
         * elsewhere in the dashboard.
         */
        '<div class="slc-report-summary-grid">' +

            '<div class="slc-report-summary-item">' +
                "<span>Total Members</span>" +
                "<strong>" +
                    escapeHtml(String(totalMembers)) +
                "</strong>" +
            "</div>" +

            '<div class="slc-report-summary-item">' +
                "<span>Participated</span>" +
                "<strong>" +
                    escapeHtml(String(participated)) +
                "</strong>" +
            "</div>" +

            '<div class="slc-report-summary-item">' +
                "<span>Not Participated</span>" +
                "<strong>" +
                    escapeHtml(String(notParticipated)) +
                "</strong>" +
            "</div>" +

            '<div class="slc-report-summary-item">' +
                "<span>Participation Rate</span>" +
                "<strong>" +
                    escapeHtml(String(participationRate)) +
                    "%" +
                "</strong>" +
            "</div>" +

        "</div>" +

        /*
         * Submission metadata — laid out as a
         * label/value grid (.slc-report-meta-grid /
         * .slc-report-meta-item) so it reads like
         * the header block of a printed report.
         */
        '<div class="slc-report-detail-section">' +
            "<h3>Submission</h3>" +

            '<div class="slc-report-meta-grid">' +

                '<div class="slc-report-meta-item">' +
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

                '<div class="slc-report-meta-item">' +
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

                '<div class="slc-report-meta-item">' +
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

                '<div class="slc-report-meta-item">' +
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

                '<div class="slc-report-meta-item">' +
                    "<span>Version</span>" +
                    "<strong>" +
                        escapeHtml(
                            String(
                                report.version ?? "—"
                            )
                        ) +
                    "</strong>" +
                "</div>" +

            "</div>" +

        "</div>" +

        '<div class="slc-report-detail-section">' +
            "<h3>Participation Follow-up</h3>" +

            buildReportArrayList(
                contactedTable,
                "No follow-up records were submitted."
            ) +

        "</div>" +

        '<div class="slc-report-detail-section">' +
            "<h3>Non-Participants</h3>" +

            buildReportArrayList(
                nonParticipants,
                "No non-participants were recorded."
            ) +

        "</div>" +

        '<div class="slc-report-detail-section">' +
            "<h3>Support Given</h3>" +

            buildReportArrayList(
                supportGiven,
                "No support records were submitted."
            ) +

        "</div>" +

        '<div class="slc-report-detail-section">' +
            "<h3>Notes &amp; Observations</h3>" +

            "<p>" +
                escapeHtml(
                    notes ||
                    "No additional notes were recorded."
                ) +
            "</p>" +

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

        const trimmed = value.trim();

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


function buildReportArrayList(items, emptyMessage) {

    if (
        !Array.isArray(items) ||
        !items.length
    ) {

        return (
            "<p>" +
                escapeHtml(emptyMessage) +
            "</p>"
        );

    }

    return (
        '<ul class="slc-report-detail-list">' +

            items
                .map(function (item) {

                    let text = "";

                    if (
                        typeof item === "string" ||
                        typeof item === "number"
                    ) {

                        text = String(item);

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

                        text = String(item);

                    }

                    return (
                        "<li>" +
                            escapeHtml(text) +
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

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
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
   REPORTS STATUS
============================================================ */

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
        "questions-status";

    if (type) {

        element.classList.add(
            type
        );

    }

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
   QUIZ SETTINGS
============================================================ */

function setupQuizSettingsControls() {

    const form =
        document.getElementById(
            "quizSettingsForm"
        );


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            saveQuizSettings();

        }
    );

}


/* ============================================================
   LOAD QUIZ SETTINGS
============================================================ */

async function loadQuizSettings() {

    if (quizSettingsLoading) {
        return;
    }


    const lessonInput =
        document.getElementById(
            "quizSettingsLesson"
        );

    const openInput =
        document.getElementById(
            "quizSettingsOpen"
        );

    const closeInput =
        document.getElementById(
            "quizSettingsClose"
        );


    if (
        !lessonInput ||
        !openInput ||
        !closeInput
    ) {
        return;
    }


    quizSettingsLoading = true;


    setQuizSettingsStatus(
        "Loading quiz settings..."
    );


    try {

        if (
            !dashboardSession ||
            !dashboardSession.token
        ) {

            throw new Error(
                "Your dashboard session has expired. Please log in again."
            );

        }


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
                result &&
                result.message
                    ? result.message
                    : "Unable to load quiz settings."
            );

        }


        const settings =
            result.settings || {};


        lessonInput.value =
            settings.lesson || "";


        openInput.value =
            convertApiDateToLocalInput(
                settings.open
            );


        closeInput.value =
            convertApiDateToLocalInput(
                settings.close
            );


        setQuizSettingsStatus(
            "Quiz settings loaded."
        );

    }

    catch (error) {

        console.error(
            "Quiz settings load error:",
            error
        );


        setQuizSettingsStatus(
            error.message ||
            "Unable to load quiz settings.",
            true
        );

    }

    finally {

        quizSettingsLoading = false;

    }

}


/* ============================================================
   SAVE QUIZ SETTINGS
============================================================ */

async function saveQuizSettings() {

    if (quizSettingsSaving) {
        return;
    }


    const lessonInput =
        document.getElementById(
            "quizSettingsLesson"
        );

    const openInput =
        document.getElementById(
            "quizSettingsOpen"
        );

    const closeInput =
        document.getElementById(
            "quizSettingsClose"
        );


    const saveButton =
        document.getElementById(
            "saveQuizSettingsButton"
        );


    if (
        !lessonInput ||
        !openInput ||
        !closeInput
    ) {
        return;
    }


    const lesson =
        String(
            lessonInput.value || ""
        ).trim();


    const open =
        String(
            openInput.value || ""
        ).trim();


    const close =
        String(
            closeInput.value || ""
        ).trim();


    /* ========================================================
       VALIDATION
    ======================================================== */

    if (!lesson) {

        setQuizSettingsStatus(
            "Please enter the current lesson.",
            true
        );

        lessonInput.focus();

        return;

    }


    if (
        !/^\d+$/.test(
            lesson
        )
    ) {

        setQuizSettingsStatus(
            "Current lesson must be a valid lesson number.",
            true
        );

        lessonInput.focus();

        return;

    }


    if (!open) {

        setQuizSettingsStatus(
            "Please select when the quiz should open.",
            true
        );

        openInput.focus();

        return;

    }


    if (!close) {

        setQuizSettingsStatus(
            "Please select when the quiz should close.",
            true
        );

        closeInput.focus();

        return;

    }


    const openDate =
        new Date(
            open
        );


    const closeDate =
        new Date(
            close
        );


    if (
        isNaN(
            openDate.getTime()
        )
    ) {

        setQuizSettingsStatus(
            "The opening date and time is invalid.",
            true
        );

        openInput.focus();

        return;

    }


    if (
        isNaN(
            closeDate.getTime()
        )
    ) {

        setQuizSettingsStatus(
            "The closing date and time is invalid.",
            true
        );

        closeInput.focus();

        return;

    }


    if (
        closeDate <= openDate
    ) {

        setQuizSettingsStatus(
            "The closing time must be later than the opening time.",
            true
        );

        closeInput.focus();

        return;

    }


    quizSettingsSaving = true;


    if (saveButton) {

        saveButton.disabled = true;

        saveButton.classList.add(
            "is-loading"
        );

        saveButton.innerHTML =
            `
                <i class="ri-loader-4-line ri-spin"></i>
                <span>Saving...</span>
            `;

    }


    setQuizSettingsStatus(
        "Saving quiz settings..."
    );


    try {

        if (
            !dashboardSession ||
            !dashboardSession.token
        ) {

            throw new Error(
                "Your dashboard session has expired. Please log in again."
            );

        }


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
                result &&
                result.message
                    ? result.message
                    : "Unable to save quiz settings."
            );

        }


        setQuizSettingsStatus(
            "Quiz settings saved successfully."
        );


        /* ====================================================
           Refresh values from the server
        ==================================================== */

        if (
            result.settings
        ) {

            lessonInput.value =
                result.settings.lesson || "";


            openInput.value =
                convertApiDateToLocalInput(
                    result.settings.open
                );


            closeInput.value =
                convertApiDateToLocalInput(
                    result.settings.close
                );

        }


    }

    catch (error) {

        console.error(
            "Quiz settings save error:",
            error
        );


        setQuizSettingsStatus(
            error.message ||
            "Unable to save quiz settings.",
            true
        );

    }

    finally {

        quizSettingsSaving = false;


        if (saveButton) {

            saveButton.disabled = false;

            saveButton.classList.remove(
                "is-loading"
            );

            saveButton.innerHTML =
                `
                    <i class="ri-save-3-line"></i>
                    <span>Save Quiz Settings</span>
                `;

        }

    }

}


/* ============================================================
   CONVERT API DATE TO DATETIME-LOCAL
============================================================ */

function convertApiDateToLocalInput(
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
        isNaN(
            date.getTime()
        )
    ) {
        return "";
    }


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    const hours =
        String(
            date.getHours()
        ).padStart(
            2,
            "0"
        );


    const minutes =
        String(
            date.getMinutes()
        ).padStart(
            2,
            "0"
        );


    return (
        `${year}-${month}-${day}` +
        `T${hours}:${minutes}`
    );

}


/* ============================================================
   QUIZ SETTINGS STATUS
============================================================ */

function setQuizSettingsStatus(
    message,
    isError = false
) {

    const status =
        document.getElementById(
            "quizSettingsStatus"
        );


    if (!status) {
        return;
    }


    status.textContent =
        message || "";


    status.classList.toggle(
        "is-error",
        Boolean(
            isError
        )
    );


    status.classList.toggle(
        "is-success",
        Boolean(
            message &&
            !isError
        )
    );

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
