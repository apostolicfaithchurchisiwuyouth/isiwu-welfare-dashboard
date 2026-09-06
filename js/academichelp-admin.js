/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   ACADEMIC HELP ADMIN CONTROLLER
   ============================================================ */

"use strict";

(function () {

    const API_URL =
        "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNpzsguBIaKR4q1dXVtgVHO2xZ1w/exec";


    const state = {

        questions: [],

        selected: null,

        filter: "Pending",

        search: ""

    };


    /* ========================================================
       DOM
    ======================================================== */

    function $(id) {

        return document.getElementById(id);

    }


    /* ========================================================
       ESCAPE HTML
    ======================================================== */

    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    /* ========================================================
       AUTH
    ======================================================== */

    function getUser() {

        try {

            if (
                window.AUTH &&
                typeof window.AUTH.getUser === "function"
            ) {

                return window.AUTH.getUser();

            }

        } catch (error) {

            console.warn(
                "Academic Admin: AUTH user unavailable.",
                error
            );

        }


        try {

            if (
                window.AFC &&
                window.AFC.state
            ) {

                return window.AFC.state.user || null;

            }

        } catch (error) {

            console.warn(
                "Academic Admin: AFC user unavailable.",
                error
            );

        }


        return null;

    }


    function getToken() {

        try {

            if (
                window.AUTH &&
                typeof window.AUTH.getToken === "function"
            ) {

                const token =
                    window.AUTH.getToken();

                if (token) {

                    return String(token).trim();

                }

            }

        } catch (error) {

            console.warn(
                "Academic Admin: unable to read AUTH token.",
                error
            );

        }


        try {

            if (
                window.AFC &&
                window.AFC.state &&
                window.AFC.state.token
            ) {

                return String(
                    window.AFC.state.token
                ).trim();

            }

        } catch (error) {

            console.warn(
                "Academic Admin: unable to read AFC token.",
                error
            );

        }


        return "";

    }


    function isAuthenticated() {

        try {

            if (
                window.AUTH &&
                typeof window.AUTH.isAuthenticated ===
                "function"
            ) {

                return Boolean(
                    window.AUTH.isAuthenticated()
                );

            }

        } catch (error) {

            console.warn(
                "Academic Admin: auth check failed.",
                error
            );

        }


        return Boolean(
            getToken()
        );

    }


    function isAdmin() {

        const user =
            getUser();

        const role =
            String(
                user?.role ||
                user?.user_role ||
                ""
            )
                .trim()
                .toLowerCase();


        return (
            role === "admin" ||
            role === "super_admin"
        );

    }


    function getAnswererName() {

        const user =
            getUser();

        if (!user) {

            return "AFC Isiu Youth Team";

        }


        return String(
            user.display_name ||
            user.displayName ||
            user.full_name ||
            user.name ||
            [
                user.first_name,
                user.last_name
            ]
                .filter(Boolean)
                .join(" ") ||
            "AFC Isiu Youth Team"
        ).trim();

    }


    /* ========================================================
       API GET
    ======================================================== */

    async function apiGet(
        action,
        params = {}
    ) {

        const url =
            new URL(API_URL);


        url.searchParams.set(
            "action",
            action
        );


        Object.keys(params).forEach(
            key => {

                const value =
                    params[key];

                if (
                    value !== undefined &&
                    value !== null &&
                    value !== ""
                ) {

                    url.searchParams.set(
                        key,
                        value
                    );

                }

            }
        );


        const token =
            getToken();


        if (token) {

            url.searchParams.set(
                "token",
                token
            );

        }


        const response =
            await fetch(
                url.toString(),
                {
                    method: "GET",
                    credentials: "omit",
                    cache: "no-store"
                }
            );


        const result =
            await response.json();


        if (
            !response.ok ||
            result.success === false
        ) {

            throw new Error(
                result.message ||
                "Unable to complete the request."
            );

        }


        return result;

    }


    /* ========================================================
       API POST
    ======================================================== */

    async function apiPost(
        action,
        body = {}
    ) {

        const payload = {

            ...(body || {}),

            action: action

        };


        const token =
            getToken();


        if (token) {

            payload.token =
                token;

        }


        const response =
            await fetch(
                API_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "text/plain;charset=utf-8",

                        "Accept":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            payload
                        ),

                    credentials: "omit",

                    cache: "no-store"
                }
            );


        const result =
            await response.json();


        if (
            !response.ok ||
            result.success === false
        ) {

            throw new Error(
                result.message ||
                "Unable to complete the request."
            );

        }


        return result;

    }


    /* ========================================================
       RESPONSE DATA
    ======================================================== */

    function responseData(
        response
    ) {

        if (
            response &&
            response.data !== undefined
        ) {

            return response.data;

        }

        return response;

    }


    /* ========================================================
       DATE
    ======================================================== */

    function formatDate(
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
                day: "numeric",
                month: "short",
                year: "numeric"
            }
        );

    }


    /* ========================================================
       STATUS CLASS
    ======================================================== */

    function statusClass(
        status
    ) {

        return String(
            status || ""
        )
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-");

    }


    /* ========================================================
       STATS
    ======================================================== */

    function updateStats() {

        const pending =
            state.questions.filter(
                item =>
                    String(
                        item.status || ""
                    ).toLowerCase() ===
                    "pending"
            ).length;


        const answered =
            state.questions.filter(
                item =>
                    String(
                        item.status || ""
                    ).toLowerCase() ===
                    "answered"
            ).length;


        const published =
            state.questions.filter(
                item =>
                    String(
                        item.status || ""
                    ).toLowerCase() ===
                    "published"
            ).length;


        $("pendingCount").textContent =
            pending;


        $("answeredCount").textContent =
            answered;


        $("publishedCount").textContent =
            published;


        $("totalCount").textContent =
            state.questions.length;

    }


    /* ========================================================
       FILTER
    ======================================================== */

    function visibleQuestions() {

        return state.questions.filter(
            item => {

                const status =
                    String(
                        item.status || ""
                    )
                        .trim()
                        .toLowerCase();


                if (
                    state.filter !== "All" &&
                    status !==
                    state.filter.toLowerCase()
                ) {

                    return false;

                }


                if (!state.search) {

                    return true;

                }


                const searchable =
                    [
                        item.requestId,
                        item.name,
                        item.category,
                        item.question
                    ]
                        .join(" ")
                        .toLowerCase();


                return searchable.includes(
                    state.search
                );

            }
        );

    }


    /* ========================================================
       RENDER LIST
    ======================================================== */

    function renderList() {

        const container =
            $("academicRequestList");


        if (!container) {

            return;

        }


        const items =
            visibleQuestions();


        if (!items.length) {

            container.innerHTML = `

                <div class="admin-no-results">

                    <div>

                        <i class="fa-regular fa-folder-open"></i>

                        <p>
                            No questions found.
                        </p>

                    </div>

                </div>

            `;

            return;

        }


        container.innerHTML =
            items
                .map(
                    item => {

                        const active =
                            state.selected &&
                            state.selected.requestId ===
                            item.requestId
                                ? " active"
                                : "";


                        const status =
                            item.status ||
                            "Pending";


                        return `

                            <button
                                type="button"
                                class="academic-question-item${active}"
                                data-request-id="${escapeHTML(
                                    item.requestId
                                )}"
                            >

                                <div
                                    class="question-item-top"
                                >

                                    <span
                                        class="question-item-id"
                                    >
                                        ${escapeHTML(
                                            item.requestId
                                        )}
                                    </span>

                                    <span
                                        class="question-item-date"
                                    >
                                        ${escapeHTML(
                                            formatDate(
                                                item.date ||
                                                item.createdAt
                                            )
                                        )}
                                    </span>

                                </div>


                                <div
                                    class="question-item-text"
                                >
                                    ${escapeHTML(
                                        item.question
                                    )}
                                </div>


                                <div
                                    class="question-item-bottom"
                                >

                                    <span
                                        class="question-item-category"
                                    >
                                        ${escapeHTML(
                                            item.category
                                        )}
                                    </span>

                                    <span
                                        class="question-item-status status-${escapeHTML(
                                            statusClass(
                                                status
                                            )
                                        )}"
                                    >
                                        ${escapeHTML(
                                            status
                                        )}
                                    </span>

                                </div>

                            </button>

                        `;

                    }
                )
                .join("");

    }


    /* ========================================================
       EDITOR
    ======================================================== */

    function renderEditor(
        data
    ) {

        const empty =
            $("adminEditorEmpty");


        const editor =
            $("academicEditorContent");


        if (!data) {

            empty.hidden =
                false;

            editor.hidden =
                true;

            return;

        }


        empty.hidden =
            true;

        editor.hidden =
            false;


        $("editorRequestId")
            .textContent =
            data.requestId || "—";


        $("editorName")
            .textContent =
            data.name || "—";


        $("editorCategory")
            .textContent =
            data.category || "—";


        $("editorContact")
            .textContent =
            data.contactPreference || "—";


        $("editorDate")
            .textContent =
            formatDate(
                data.date ||
                data.createdAt
            );


        $("editorPhone")
            .textContent =
            data.phone || "—";


        $("editorQuestion")
            .textContent =
            data.question || "";


        $("academicAnswer")
            .value =
            data.answer || "";


        $("academicGroupMessage")
            .value =
            data.groupMessage || "";


        updateAnswerCount();


        $("answeredByLabel")
            .textContent =
            `Answering as ${getAnswererName()}`;


        const status =
            data.status ||
            "Pending";


        const badge =
            $("editorStatusBadge");


        badge.textContent =
            status;


        badge.className =
            `admin-status status-${statusClass(
                status
            )}`;


        $("publishAnswerBtn")
            .disabled =
            !String(
                data.answer || ""
            ).trim();


        $("unpublishAnswerBtn")
            .hidden =
            String(status)
                .toLowerCase() !==
            "published";


        $("groupSharedBadge")
            .hidden =
            String(
                data.groupShared || ""
            ).toLowerCase() !==
            "yes";


        $("editorHistory")
            .innerHTML = `

                ${
                    data.answeredBy
                        ? `<div><strong>Answered by:</strong> ${escapeHTML(
                            data.answeredBy
                        )}</div>`
                        : ""
                }

                ${
                    data.answeredAt
                        ? `<div><strong>Answered at:</strong> ${escapeHTML(
                            data.answeredAt
                        )}</div>`
                        : ""
                }

                ${
                    data.updatedAt
                        ? `<div><strong>Last updated:</strong> ${escapeHTML(
                            data.updatedAt
                        )}</div>`
                        : ""
                }

            `;


        clearMessages();

    }


    /* ========================================================
       ANSWER COUNT
    ======================================================== */

    function updateAnswerCount() {

        const answer =
            $("academicAnswer");


        if (!answer) {

            return;

        }


        $("answerCharacterCount")
            .textContent =
            `${answer.value.length} / 5000`;

    }


    /* ========================================================
       MESSAGES
    ======================================================== */

    function clearMessages() {

        $("editorMessage")
            .textContent = "";

        $("editorMessage")
            .className =
            "admin-message";


        $("groupMessageStatus")
            .textContent = "";

        $("groupMessageStatus")
            .className =
            "admin-message";

    }


    function showEditorMessage(
        message,
        type
    ) {

        const element =
            $("editorMessage");


        element.textContent =
            message;


        element.className =
            `admin-message message-${type}`;

    }


    function showGroupMessage(
        message,
        type
    ) {

        const element =
            $("groupMessageStatus");


        element.textContent =
            message;


        element.className =
            `admin-message message-${type}`;

    }


    /* ========================================================
       BUTTON LOADING
    ======================================================== */

    function buttonLoading(
        button,
        loading,
        text
    ) {

        if (!button) {

            return;

        }


        if (!button.dataset.original) {

            button.dataset.original =
                button.innerHTML;

        }


        button.disabled =
            loading;


        if (loading) {

            button.innerHTML = `

                <i class="fa-solid fa-spinner fa-spin"></i>

                <span>
                    ${escapeHTML(
                        text || "Saving..."
                    )}
                </span>

            `;

        } else {

            button.innerHTML =
                button.dataset.original;

        }

    }


    /* ========================================================
       LOAD QUESTIONS
    ======================================================== */

    async function loadQuestions() {

        const list =
            $("academicRequestList");


        list.innerHTML = `

            <div class="admin-loading">

                <div>

                    <i class="fa-solid fa-spinner fa-spin"></i>

                    <p>
                        Loading questions...
                    </p>

                </div>

            </div>

        `;


        try {

            const response =
                await apiGet(
                    "getAcademicQuestionsForAdmin",
                    {
                        status: "All",
                        limit: 100
                    }
                );


            const data =
                responseData(
                    response
                );


            state.questions =
                Array.isArray(data)
                    ? data
                    : [];


            updateStats();

            renderList();


        } catch (error) {

            console.error(
                "Academic Admin:",
                error
            );


            list.innerHTML = `

                <div class="admin-no-results">

                    <div>

                        <i class="fa-solid fa-triangle-exclamation"></i>

                        <p>
                            ${escapeHTML(
                                error.message ||
                                "Unable to load questions."
                            )}
                        </p>

                    </div>

                </div>

            `;

        }

    }


    /* ========================================================
       OPEN QUESTION
    ======================================================== */

    async function openQuestion(
        requestId
    ) {

        try {

            const response =
                await apiGet(
                    "getAcademicQuestionForAdmin",
                    {
                        requestId:
                            requestId
                    }
                );


            const data =
                responseData(
                    response
                );


            if (!data) {

                throw new Error(
                    "The question could not be loaded."
                );

            }


            state.selected =
                data;


            renderEditor(
                data
            );


            renderList();


            if (
                window.innerWidth <= 850
            ) {

                document
                    .querySelector(
                        ".academic-admin-editor"
                    )
                    ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

            }


        } catch (error) {

            console.error(
                "Academic Admin:",
                error
            );


            showEditorMessage(
                error.message ||
                "Unable to open this question.",
                "error"
            );

        }

    }


    /* ========================================================
       SAVE ANSWER
    ======================================================== */

    async function saveAnswer() {

        if (!state.selected) {

            return;

        }


        const answer =
            String(
                $("academicAnswer")
                    .value || ""
            ).trim();


        if (answer.length < 2) {

            showEditorMessage(
                "Please write an answer first.",
                "error"
            );

            return;

        }


        const button =
            $("saveAnswerBtn");


        buttonLoading(
            button,
            true,
            "Saving..."
        );


        try {

            await apiPost(
                "answerAcademicQuestion",
                {
                    requestId:
                        state.selected.requestId,

                    answer:
                        answer,

                    answeredBy:
                        getAnswererName()
                }
            );


            showEditorMessage(
                "Answer saved successfully.",
                "success"
            );


            const requestId =
                state.selected.requestId;


            await loadQuestions();

            await openQuestion(
                requestId
            );


        } catch (error) {

            console.error(
                "Academic Admin:",
                error
            );


            showEditorMessage(
                error.message ||
                "Unable to save the answer.",
                "error"
            );

        } finally {

            buttonLoading(
                button,
                false
            );

        }

    }


    /* ========================================================
       PUBLISH
    ======================================================== */

    async function publishAnswer() {

        if (!state.selected) {

            return;

        }


        const answer =
            String(
                $("academicAnswer")
                    .value || ""
            ).trim();


        if (!answer) {

            showEditorMessage(
                "Save an answer before publishing.",
                "error"
            );

            return;

        }


        const button =
            $("publishAnswerBtn");


        buttonLoading(
            button,
            true,
            "Publishing..."
        );


        try {

            if (
                !state.selected.answer ||
                state.selected.answer.trim() !==
                answer
            ) {

                await saveAnswer();

            }


            const requestId =
                state.selected.requestId;


            await apiPost(
                "publishAcademicAnswer",
                {
                    requestId:
                        requestId
                }
            );


            showEditorMessage(
                "Answer published successfully.",
                "success"
            );


            await loadQuestions();

            await openQuestion(
                requestId
            );


        } catch (error) {

            console.error(
                "Academic Admin:",
                error
            );


            showEditorMessage(
                error.message ||
                "Unable to publish the answer.",
                "error"
            );

        } finally {

            buttonLoading(
                button,
                false
            );

        }

    }


    /* ========================================================
       UNPUBLISH
    ======================================================== */

    async function unpublishAnswer() {

        if (!state.selected) {

            return;

        }


        const button =
            $("unpublishAnswerBtn");


        buttonLoading(
            button,
            true,
            "Unpublishing..."
        );


        try {

            const requestId =
                state.selected.requestId;


            await apiPost(
                "unpublishAcademicAnswer",
                {
                    requestId:
                        requestId
                }
            );


            await loadQuestions();

            await openQuestion(
                requestId
            );


            showEditorMessage(
                "Answer has been unpublished.",
                "success"
            );


        } catch (error) {

            showEditorMessage(
                error.message ||
                "Unable to unpublish the answer.",
                "error"
            );

        } finally {

            buttonLoading(
                button,
                false
            );

        }

    }


    /* ========================================================
       CLOSE
    ======================================================== */

    async function closeQuestion() {

        if (!state.selected) {

            return;

        }


        if (
            !window.confirm(
                "Close this Academic Help question?"
            )
        ) {

            return;

        }


        const button =
            $("closeQuestionBtn");


        buttonLoading(
            button,
            true,
            "Closing..."
        );


        try {

            await apiPost(
                "updateAcademicQuestionStatus",
                {
                    requestId:
                        state.selected.requestId,

                    status:
                        "Closed"
                }
            );


            state.selected =
                null;


            renderEditor(
                null
            );


            await loadQuestions();


        } catch (error) {

            showEditorMessage(
                error.message ||
                "Unable to close the question.",
                "error"
            );

        } finally {

            buttonLoading(
                button,
                false
            );

        }

    }


    /* ========================================================
       GROUP MESSAGE
    ======================================================== */

    async function saveGroupMessage() {

        if (!state.selected) {

            return;

        }


        const message =
            String(
                $("academicGroupMessage")
                    .value || ""
            ).trim();


        if (!message) {

            showGroupMessage(
                "Write the group message first.",
                "error"
            );

            return;

        }


        const button =
            $("saveGroupMessageBtn");


        buttonLoading(
            button,
            true,
            "Saving..."
        );


        try {

            await apiPost(
                "saveAcademicGroupMessage",
                {
                    requestId:
                        state.selected.requestId,

                    message:
                        message
                }
            );


            state.selected.groupMessage =
                message;


            showGroupMessage(
                "Group message saved successfully.",
                "success"
            );


        } catch (error) {

            showGroupMessage(
                error.message ||
                "Unable to save the group message.",
                "error"
            );

        } finally {

            buttonLoading(
                button,
                false
            );

        }

    }


    /* ========================================================
       MARK GROUP SHARED
    ======================================================== */

    async function markGroupShared() {

        if (!state.selected) {

            return;

        }


        const message =
            String(
                $("academicGroupMessage")
                    .value || ""
            ).trim();


        if (!message) {

            showGroupMessage(
                "Save the group message first.",
                "error"
            );

            return;

        }


        const button =
            $("markGroupSharedBtn");


        buttonLoading(
            button,
            true,
            "Updating..."
        );


        try {

            if (
                state.selected.groupMessage !==
                message
            ) {

                await saveGroupMessage();

            }


            await apiPost(
                "markAcademicGroupShared",
                {
                    requestId:
                        state.selected.requestId
                }
            );


            state.selected.groupShared =
                "Yes";


            $("groupSharedBadge")
                .hidden =
                false;


            showGroupMessage(
                "This message is now marked as shared.",
                "success"
            );


        } catch (error) {

            showGroupMessage(
                error.message ||
                "Unable to update sharing status.",
                "error"
            );

        } finally {

            buttonLoading(
                button,
                false
            );

        }

    }


    /* ========================================================
       ACCESS DENIED
    ======================================================== */

    function showAccessDenied(
        message
    ) {

        const page =
            document.querySelector(
                ".academic-admin-page"
            );


        if (!page) {

            return;

        }


        page.innerHTML = `

            <section
                class="academic-admin-header"
                style="margin-bottom:30px;"
            >

                <div>

                    <span class="admin-eyebrow">

                        <i class="fa-solid fa-lock"></i>

                        Restricted Area

                    </span>


                    <h1>
                        Admin access required
                    </h1>


                    <p>
                        ${escapeHTML(
                            message
                        )}
                    </p>

                </div>


                <button
                    type="button"
                    class="admin-refresh-btn"
                    onclick="window.location.href='/'"
                >

                    <i class="fa-solid fa-arrow-left"></i>

                    Back to Portal

                </button>

            </section>

        `;

    }


    /* ========================================================
       LISTENERS
    ======================================================== */

    function setupListeners() {

        $("refreshAcademicBtn")
            ?.addEventListener(
                "click",
                async function () {

                    await loadQuestions();

                    if (
                        state.selected
                    ) {

                        await openQuestion(
                            state.selected.requestId
                        );

                    }

                }
            );


        $("academicStatusFilter")
            ?.addEventListener(
                "change",
                function () {

                    state.filter =
                        this.value;

                    renderList();

                }
            );


        $("academicAdminSearch")
            ?.addEventListener(
                "input",
                function () {

                    state.search =
                        String(
                            this.value || ""
                        )
                            .trim()
                            .toLowerCase();

                    renderList();

                }
            );


        $("academicAnswer")
            ?.addEventListener(
                "input",
                updateAnswerCount
            );


        $("academicRequestList")
            ?.addEventListener(
                "click",
                function (event) {

                    const button =
                        event.target.closest(
                            "[data-request-id]"
                        );


                    if (!button) {

                        return;

                    }


                    openQuestion(
                        button.dataset.requestId
                    );

                }
            );


        $("saveAnswerBtn")
            ?.addEventListener(
                "click",
                saveAnswer
            );


        $("publishAnswerBtn")
            ?.addEventListener(
                "click",
                publishAnswer
            );


        $("unpublishAnswerBtn")
            ?.addEventListener(
                "click",
                unpublishAnswer
            );


        $("closeQuestionBtn")
            ?.addEventListener(
                "click",
                closeQuestion
            );


        $("saveGroupMessageBtn")
            ?.addEventListener(
                "click",
                saveGroupMessage
            );


        $("markGroupSharedBtn")
            ?.addEventListener(
                "click",
                markGroupShared
            );

    }


    /* ========================================================
       INITIALIZE
    ======================================================== */

    async function initialize() {

        setupListeners();


        /*
         * Give the existing authentication layer
         * a moment to restore the saved session.
         */

        if (!isAuthenticated()) {

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        700
                    )
            );

        }


        if (!isAuthenticated()) {

            showAccessDenied(
                "Please log in with an authorized AFC Isiu Youth Portal account."
            );

            return;

        }


        if (!isAdmin()) {

            showAccessDenied(
                "Your account does not have Admin or Super Admin access."
            );

            return;

        }


        await loadQuestions();

    }


    /* ========================================================
       AUTH EVENTS
    ======================================================== */

    window.addEventListener(
        "afc:authenticated",
        function () {

            initialize();

        }
    );


    /* ========================================================
       START
    ======================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    } else {

        initialize();

    }


})();
