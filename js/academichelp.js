/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: academichelp.js
   PURPOSE: ACADEMIC HELP PAGE CONTROLLER
   ============================================================ */

(function () {

    "use strict";


    /* ========================================================
       CONFIGURATION
    ======================================================== */

    const ACADEMIC_CONFIG = {

        VERSION: "2.0.0",

        API:
            "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNpzsguBIaKR4q1dXVtgVHO2xZ1w/exec",

        MAX_QUESTION_LENGTH:
            2000,

        FAQ_INITIAL_LIMIT:
            6

    };


    /* ========================================================
       STATE
    ======================================================== */

    let activeCategory = "All";

    let searchTerm = "";

    let showAllFaqs = false;

    let faqData = [];

    let publishedAnswers = [];

    let initialized = false;


    /* ========================================================
       DEFAULT FAQ DATA
       ======================================================== */

    const DEFAULT_FAQS = [

        {
            id: "faq-001",

            category: "Secondary School",

            question:
                "How can I study effectively when I have many subjects to prepare for?",

            answer:
                "Start by listing your subjects and identifying what needs the most attention. Break your study time into focused sessions instead of trying to study everything at once. Use active recall, practise questions and regular revision, and give difficult subjects more attention while still maintaining the others.",

            featured: true
        },


        {
            id: "faq-002",

            category: "Secondary School",

            question:
                "What should I do if I keep studying but still forget what I read?",

            answer:
                "Reading repeatedly is not always the same as learning. After studying a topic, close your book and explain what you remember. Test yourself with questions, write short summaries and return to the material after some time. Active recall and spaced revision can make your study sessions more effective.",

            featured: true
        },


        {
            id: "faq-003",

            category: "JAMB & UTME",

            question:
                "How should I prepare for JAMB without becoming overwhelmed?",

            answer:
                "Start early and create a realistic study routine. Know the subjects and topics you need to cover, practise with past questions and track the areas where you repeatedly make mistakes. Do not measure your progress by how many hours you sit with a book; measure it by what you can actually remember and answer correctly.",

            featured: true
        },


        {
            id: "faq-004",

            category: "University",

            question:
                "How do I choose a university course that is right for me?",

            answer:
                "Consider your interests, strengths, academic requirements, career opportunities and the type of work you may want to do in the future. Do not choose a course simply because friends are choosing it or because it sounds popular. Research the course carefully and seek guidance from people with relevant experience.",

            featured: true
        },


        {
            id: "faq-005",

            category: "Scholarships",

            question:
                "Where should I begin when looking for scholarship opportunities?",

            answer:
                "Start by identifying scholarships that match your level of study, course, location and eligibility requirements. Read the official requirements carefully, prepare important documents early and keep track of application deadlines. Never pay someone simply because they claim they can guarantee a scholarship.",

            featured: true
        },


        {
            id: "faq-006",

            category: "Study Skills",

            question:
                "How can I create a study timetable that I can actually follow?",

            answer:
                "Keep your timetable realistic. Assign specific subjects to specific periods, include breaks and leave room for unexpected activities. It is better to create a simple schedule you can consistently follow than an impressive timetable that becomes impossible to maintain after a few days.",

            featured: true
        },


        {
            id: "faq-007",

            category: "Career",

            question:
                "When should I start thinking about my career?",

            answer:
                "You do not need to have your entire career figured out immediately. Start by learning about different fields, noticing your interests and strengths, developing useful skills and speaking with people who work in areas that interest you. Career direction can become clearer as you learn and gain experience.",

            featured: false
        },


        {
            id: "faq-008",

            category: "University",

            question:
                "What can I do if I am struggling academically at university?",

            answer:
                "Identify the specific areas causing difficulty instead of simply concluding that you are not good enough. Speak with lecturers, classmates, academic advisers or other trusted people. Review your study habits, attend classes where possible and seek help early rather than waiting until examinations are close.",

            featured: false
        },


        {
            id: "faq-009",

            category: "Study Skills",

            question:
                "Is studying for many hours always better?",

            answer:
                "Not necessarily. Concentration, understanding and retention matter more than simply counting hours. Focused study sessions with clear goals, active practice and appropriate breaks can be more useful than long sessions where your attention has already dropped.",

            featured: false
        },


        {
            id: "faq-010",

            category: "Career",

            question:
                "How can I start developing career skills while still in school?",

            answer:
                "Begin with skills that are useful across many fields: communication, problem solving, digital literacy, teamwork, writing and time management. You can also practise through school projects, volunteering, personal projects and structured learning opportunities.",

            featured: false
        }

    ];


    /* ========================================================
       DOM HELPER
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
       NORMALIZE TEXT
    ======================================================== */

    function normalizeText(value) {

        return String(value ?? "")

            .trim()

            .toLowerCase();

    }


    /* ========================================================
       DOM READY
    ======================================================== */

    function initializeAcademicHelp() {

        if (initialized) {

            return;
        }

        initialized = true;


        console.log(
            "[AFC Academic Help] Initializing version",
            ACADEMIC_CONFIG.VERSION
        );


        faqData =
            DEFAULT_FAQS.slice();


        setupScrollButtons();

        setupCategoryButtons();

        setupSearch();

        setupFilters();

        setupFaqToggle();

        setupQuestionForm();

        renderFaqs();

        loadPublishedAnswers();

        initializeFontCheck();

    }


    /* ========================================================
       LAYOUT READY
       ======================================================== */

    function waitForPageReady() {

        if (
            document.readyState ===
            "loading"
        ) {

            document.addEventListener(
                "DOMContentLoaded",
                initializeAcademicHelp,
                {
                    once: true
                }
            );

            return;
        }


        initializeAcademicHelp();

    }


    /*
     * The shared layout.js dispatches
     * afc:layout-ready after injecting
     * sidebar/topbar/bottom navigation.
     *
     * Academic Help itself does not depend
     * on the layout, but listening here keeps
     * the page compatible with the portal shell.
     */

    window.addEventListener(
        "afc:layout-ready",
        function () {

            initializeAcademicHelp();

        }
    );


    waitForPageReady();


    /* ========================================================
       SCROLL BUTTONS
    ======================================================== */

    function setupScrollButtons() {

        document.addEventListener(
            "click",
            function (event) {

                const button =
                    event.target.closest(
                        "[data-scroll-to]"
                    );


                if (!button) {

                    return;
                }


                const targetId =
                    button.getAttribute(
                        "data-scroll-to"
                    );


                if (!targetId) {

                    return;
                }


                const target =
                    document.getElementById(
                        targetId
                    );


                if (!target) {

                    return;
                }


                event.preventDefault();


                target.scrollIntoView({

                    behavior: "smooth",

                    block: "start"

                });

            }
        );

    }


    /* ========================================================
       CATEGORY BUTTONS
    ======================================================== */

    function setupCategoryButtons() {

        const buttons =
            document.querySelectorAll(
                ".academic-category-card"
            );


        buttons.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const category =
                            button.dataset.category ||
                            "All";


                        activeCategory =
                            category;

                        showAllFaqs =
                            false;


                        document
                            .querySelectorAll(
                                ".academic-filter"
                            )
                            .forEach(
                                function (filter) {

                                    filter.classList.toggle(
                                        "active",
                                        filter.dataset.filter ===
                                            category
                                    );

                                }
                            );


                        renderFaqs();


                        const faqSection =
                            $("faqSection");


                        if (faqSection) {

                            setTimeout(
                                function () {

                                    faqSection.scrollIntoView({

                                        behavior: "smooth",

                                        block: "start"

                                    });

                                },
                                80
                            );

                        }

                    }
                );

            }
        );

    }


    /* ========================================================
       SEARCH
    ======================================================== */

    function setupSearch() {

        const searchInput =
            $("academicSearch");


        const clearButton =
            $("clearAcademicSearch");


        if (!searchInput) {

            return;
        }


        searchInput.addEventListener(
            "input",
            function () {

                searchTerm =
                    normalizeText(
                        searchInput.value
                    );


                showAllFaqs =
                    true;


                if (clearButton) {

                    clearButton.hidden =
                        !searchTerm;

                }


                renderFaqs();

            }
        );


        if (clearButton) {

            clearButton.addEventListener(
                "click",
                function () {

                    searchInput.value =
                        "";

                    searchTerm =
                        "";

                    clearButton.hidden =
                        true;

                    renderFaqs();

                    searchInput.focus();

                }
            );

        }

    }


    /* ========================================================
       FILTERS
    ======================================================== */

    function setupFilters() {

        const filters =
            document.querySelectorAll(
                ".academic-filter"
            );


        filters.forEach(
            function (filter) {

                filter.addEventListener(
                    "click",
                    function () {

                        activeCategory =
                            filter.dataset.filter ||
                            "All";


                        showAllFaqs =
                            activeCategory !==
                            "All";


                        filters.forEach(
                            function (item) {

                                item.classList.toggle(
                                    "active",
                                    item === filter
                                );

                            }
                        );


                        renderFaqs();

                    }
                );

            }
        );

    }


    /* ========================================================
       SHOW ALL
    ======================================================== */

    function setupFaqToggle() {

        const button =
            $("showAllFaqs");


        if (!button) {

            return;
        }


        button.addEventListener(
            "click",
            function () {

                showAllFaqs =
                    !showAllFaqs;


                updateShowAllButton();

                renderFaqs();

            }
        );

    }


    function updateShowAllButton() {

        const button =
            $("showAllFaqs");


        if (!button) {

            return;
        }


        const text =
            button.querySelector(
                "span"
            );


        const icon =
            button.querySelector(
                "i"
            );


        if (showAllFaqs) {

            if (text) {

                text.textContent =
                    "Show less";

            }

            if (icon) {

                icon.className =
                    "fa-solid fa-arrow-up";

            }

        } else {

            if (text) {

                text.textContent =
                    "Show all";

            }

            if (icon) {

                icon.className =
                    "fa-solid fa-arrow-right";

            }

        }

    }


    /* ========================================================
       FILTER FAQ DATA
    ======================================================== */

    function getFilteredFaqs() {

        return faqData.filter(
            function (faq) {

                const categoryMatches =
                    activeCategory ===
                    "All" ||
                    normalizeText(
                        faq.category
                    ) ===
                    normalizeText(
                        activeCategory
                    );


                if (!categoryMatches) {

                    return false;
                }


                if (!searchTerm) {

                    return true;
                }


                const searchable =
                    [

                        faq.question,

                        faq.answer,

                        faq.category

                    ]
                    .join(" ");


                return normalizeText(
                    searchable
                ).includes(
                    searchTerm
                );

            }
        );

    }


    /* ========================================================
       RENDER FAQS
    ======================================================== */

    function renderFaqs() {

        const container =
            $("academicFaqList");


        const emptyState =
            $("academicEmptyState");


        if (!container) {

            return;
        }


        const filtered =
            getFilteredFaqs();


        let visible =
            filtered;


        if (
            !showAllFaqs &&
            !searchTerm &&
            activeCategory === "All"
        ) {

            visible =
                filtered.slice(
                    0,
                    ACADEMIC_CONFIG.FAQ_INITIAL_LIMIT
                );

        }


        if (
            !showAllFaqs &&
            !searchTerm &&
            activeCategory !== "All"
        ) {

            visible =
                filtered.slice(
                    0,
                    ACADEMIC_CONFIG.FAQ_INITIAL_LIMIT
                );

        }


        if (
            filtered.length === 0
        ) {

            container.innerHTML =
                "";


            if (emptyState) {

                emptyState.hidden =
                    false;

            }


            return;

        }


        if (emptyState) {

            emptyState.hidden =
                true;

        }


        container.innerHTML =
            visible
                .map(
                    renderFaqItem
                )
                .join("");


        bindRenderedFaqItems();

        updateShowAllButton();

    }


    /* ========================================================
       RENDER FAQ ITEM
    ======================================================== */

    function renderFaqItem(
        faq,
        index
    ) {

        const number =
            String(
                index + 1
            ).padStart(
                2,
                "0"
            );


        return `

            <article
                class="academic-faq-item"
                data-faq-id="${escapeHTML(faq.id)}"
            >

                <button
                    type="button"
                    class="academic-faq-question"
                    aria-expanded="false"
                >

                    <span class="academic-faq-number">
                        ${number}
                    </span>

                    <span class="academic-faq-question-text">
                        ${escapeHTML(faq.question)}
                    </span>

                    <span class="academic-faq-chevron">
                        <i class="fa-solid fa-chevron-down"></i>
                    </span>

                </button>


                <div class="academic-faq-answer">

                    <div class="academic-faq-answer-inner">

                        <div class="academic-faq-answer-content">

                            <p>
                                ${escapeHTML(faq.answer)}
                            </p>

                            <div class="academic-faq-meta">

                                <i class="fa-solid fa-circle-check"></i>

                                <span>
                                    Academic Help resource
                                </span>

                            </div>

                        </div>

                    </div>

                </div>

            </article>

        `;

    }


    /* ========================================================
       FAQ ACCORDION
    ======================================================== */

    function bindRenderedFaqItems() {

        const items =
            document.querySelectorAll(
                ".academic-faq-item"
            );


        items.forEach(
            function (item) {

                const button =
                    item.querySelector(
                        ".academic-faq-question"
                    );


                if (!button) {

                    return;
                }


                button.addEventListener(
                    "click",
                    function () {

                        const isOpen =
                            item.classList.contains(
                                "open"
                            );


                        document
                            .querySelectorAll(
                                ".academic-faq-item.open"
                            )
                            .forEach(
                                function (openItem) {

                                    if (
                                        openItem !==
                                        item
                                    ) {

                                        openItem.classList.remove(
                                            "open"
                                        );


                                        const openButton =
                                            openItem.querySelector(
                                                ".academic-faq-question"
                                            );


                                        if (openButton) {

                                            openButton.setAttribute(
                                                "aria-expanded",
                                                "false"
                                            );

                                        }

                                    }

                                }
                            );


                        item.classList.toggle(
                            "open",
                            !isOpen
                        );


                        button.setAttribute(
                            "aria-expanded",
                            String(!isOpen)
                        );

                    }
                );

            }
        );

    }


    /* ========================================================
       QUESTION FORM
    ======================================================== */

    function setupQuestionForm() {

        const form =
            $("academicQuestionForm");


        if (!form) {

            return;
        }


        const message =
            $("questionMessage");


        const characterCount =
            $("questionCharacterCount");


        if (message && characterCount) {

            message.addEventListener(
                "input",
                function () {

                    characterCount.textContent =
                        String(
                            message.value.length
                        );

                }
            );

        }


        form.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();


                clearFormErrors();


                const values =
                    collectFormValues();


                const validation =
                    validateForm(
                        values
                    );


                if (!validation.valid) {

                    showFormStatus(
                        validation.message,
                        "error"
                    );

                    return;
                }


                await submitAcademicQuestion(
                    values
                );

            }
        );

    }


    /* ========================================================
       COLLECT FORM
    ======================================================== */

    function collectFormValues() {

        return {

            name:
                String(
                    $("questionName")?.value ||
                    ""
                ).trim(),

            phone:
                String(
                    $("questionPhone")?.value ||
                    ""
                ).trim(),

            category:
                String(
                    $("questionCategory")?.value ||
                    ""
                ).trim(),

            contactPreference:
                String(
                    $("questionContact")?.value ||
                    "WhatsApp"
                ).trim(),

            question:
                String(
                    $("questionMessage")?.value ||
                    ""
                ).trim(),

            consent:
                Boolean(
                    $("questionConsent")?.checked
                )

        };

    }


    /* ========================================================
       VALIDATE FORM
    ======================================================== */

    function validateForm(
        values
    ) {

        let valid =
            true;


        if (!values.name) {

            setFieldError(
                "questionName",
                "Please enter your name."
            );

            valid =
                false;

        } else if (
            values.name.length < 2
        ) {

            setFieldError(
                "questionName",
                "Please enter your full name."
            );

            valid =
                false;
        }


        if (!values.phone) {

            setFieldError(
                "questionPhone",
                "Please provide a WhatsApp number or phone number."
            );

            valid =
                false;
        }


        if (!values.category) {

            setFieldError(
                "questionCategory",
                "Please select a category."
            );

            valid =
                false;
        }


        if (!values.question) {

            setFieldError(
                "questionMessage",
                "Please tell us what you need help with."
            );

            valid =
                false;

        } else if (
            values.question.length < 10
        ) {

            setFieldError(
                "questionMessage",
                "Please provide a little more detail."
            );

            valid =
                false;

        } else if (
            values.question.length >
            ACADEMIC_CONFIG.MAX_QUESTION_LENGTH
        ) {

            setFieldError(
                "questionMessage",
                "Your question is too long."
            );

            valid =
                false;
        }


        if (!values.consent) {

            showFormStatus(
                "Please agree that the Academic Help team may contact you regarding your question.",
                "error"
            );

            valid =
                false;
        }


        return {

            valid: valid,

            message:
                valid
                    ? ""
                    : "Please check the highlighted fields."

        };

    }


    /* ========================================================
       SET FIELD ERROR
    ======================================================== */

    function setFieldError(
        fieldId,
        message
    ) {

        const field =
            $(fieldId);


        if (!field) {

            return;
        }


        const wrapper =
            field.closest(
                ".form-field"
            );


        if (wrapper) {

            wrapper.classList.add(
                "has-error"
            );

        }


        const error =
            $(
                fieldId +
                "Error"
            );


        if (error) {

            error.textContent =
                message;

        }

    }


    /* ========================================================
       CLEAR ERRORS
    ======================================================== */

    function clearFormErrors() {

        document
            .querySelectorAll(
                ".form-field.has-error"
            )
            .forEach(
                function (field) {

                    field.classList.remove(
                        "has-error"
                    );

                }
            );


        document
            .querySelectorAll(
                ".field-error"
            )
            .forEach(
                function (error) {

                    error.textContent =
                        "";

                }
            );

    }


    /* ========================================================
       SUBMIT QUESTION
    ======================================================== */

    async function submitAcademicQuestion(
        values
    ) {

        const submitButton =
            $("submitQuestionBtn");


        const label =
            submitButton
                ? submitButton.querySelector(
                    ".btn-label"
                )
                : null;


        const loading =
            submitButton
                ? submitButton.querySelector(
                    ".btn-loading"
                )
                : null;


        setSubmitLoading(
            submitButton,
            label,
            loading,
            true
        );


        showFormStatus(
            "Sending your question...",
            "info"
        );


        try {

            const response =
                await fetch(
                    ACADEMIC_CONFIG.API,
                    {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "text/plain;charset=utf-8"

                        },

                        body:
                            JSON.stringify({

                                action:
                                    "submitAcademicQuestion",

                                name:
                                    values.name,

                                phone:
                                    values.phone,

                                category:
                                    values.category,

                                contactPreference:
                                    values.contactPreference,

                                question:
                                    values.question,

                                consent:
                                    values.consent

                            })

                    }
                );


            if (!response.ok) {

                throw new Error(
                    "HTTP " +
                    response.status
                );

            }


            const data =
                await response.json();


            console.log(
                "[AFC Academic Help] Submit response:",
                data
            );


            if (
                data &&
                (
                    data.success === true ||
                    data.status === "success"
                )
            ) {

                handleSuccessfulSubmission(
                    data
                );

            } else {

                throw new Error(
                    data?.message ||
                    "The Academic Help team could not receive your question."
                );

            }

        }
        catch (error) {

            console.error(
                "[AFC Academic Help] Submission error:",
                error
            );


            showFormStatus(
                error?.message ||
                "Unable to send your question right now. Please check your connection and try again.",
                "error"
            );

        }
        finally {

            setSubmitLoading(
                submitButton,
                label,
                loading,
                false
            );

        }

    }


    /* ========================================================
       SUBMIT LOADING
    ======================================================== */

    function setSubmitLoading(
        button,
        label,
        loading,
        state
    ) {

        if (button) {

            button.disabled =
                state;

        }


        if (label) {

            label.hidden =
                state;

        }


        if (loading) {

            loading.hidden =
                !state;

        }

    }


    /* ========================================================
       SUCCESS
    ======================================================== */

    function handleSuccessfulSubmission(
        data
    ) {

        const requestId =
            String(
                data.requestId ||
                data.id ||
                data.reference ||
                ""
            ).trim();


        const form =
            $("academicQuestionForm");


        if (form) {

            form.reset();

        }


        const count =
            $("questionCharacterCount");


        if (count) {

            count.textContent =
                "0";

        }


        clearFormErrors();


        let message =
            "Your question has been received successfully. The Academic Help team will review it.";

        if (requestId) {

            message +=
                " Your request ID is " +
                requestId +
                ".";

        }


        showFormStatus(
            message,
            "success"
        );


        const status =
            $("academicFormStatus");


        if (status) {

            status.scrollIntoView({

                behavior: "smooth",

                block: "nearest"

            });

        }

    }


    /* ========================================================
       FORM STATUS
    ======================================================== */

    function showFormStatus(
        message,
        type
    ) {

        const status =
            $("academicFormStatus");


        if (!status) {

            return;
        }


        status.className =
            "form-status show " +
            (
                type ||
                "info"
            );


        status.textContent =
            message;

    }


    /* ========================================================
       LOAD PUBLISHED ANSWERS
    ======================================================== */

    async function loadPublishedAnswers() {

        const container =
            $("publishedAnswerGrid");


        if (!container) {

            return;
        }


        try {

            const url =
                ACADEMIC_CONFIG.API +
                "?action=getPublishedAcademicAnswers";


            const response =
                await fetch(
                    url,
                    {

                        method:
                            "GET",

                        cache:
                            "no-store"

                    }
                );


            if (!response.ok) {

                throw new Error(
                    "HTTP " +
                    response.status
                );

            }


            const data =
                await response.json();


            console.log(
                "[AFC Academic Help] Published answers:",
                data
            );


            if (
                data &&
                Array.isArray(
                    data.answers
                )
            ) {

                publishedAnswers =
                    data.answers;

            } else if (
                data &&
                Array.isArray(
                    data.data
                )
            ) {

                publishedAnswers =
                    data.data;

            } else {

                publishedAnswers =
                    [];

            }


            renderPublishedAnswers();

        }
        catch (error) {

            console.warn(
                "[AFC Academic Help] Could not load published answers:",
                error
            );


            /*
             * Do not make the whole page look broken
             * just because published answers are unavailable.
             */

            container.innerHTML = `

                <div class="published-answer-card">

                    <div class="published-answer-top">

                        <span class="published-answer-category">
                            Academic Help
                        </span>

                    </div>

                    <h3 class="published-answer-title">
                        Helpful answers will appear here.
                    </h3>

                    <p class="published-answer-copy">
                        Once the Academic Help team publishes approved
                        responses, they can be displayed here as resources
                        for other young people.
                    </p>

                </div>

            `;

        }

    }


    /* ========================================================
       RENDER PUBLISHED ANSWERS
    ======================================================== */

    function renderPublishedAnswers() {

        const container =
            $("publishedAnswerGrid");


        if (!container) {

            return;
        }


        if (
            !publishedAnswers ||
            publishedAnswers.length === 0
        ) {

            container.innerHTML = `

                <div class="published-answer-card">

                    <div class="published-answer-top">

                        <span class="published-answer-category">
                            Coming Soon
                        </span>

                    </div>

                    <h3 class="published-answer-title">
                        Questions we've answered will appear here.
                    </h3>

                    <p class="published-answer-copy">
                        Approved responses from the Academic Help team
                        can become useful resources for everyone.
                    </p>

                    <div class="published-answer-footer">

                        <i class="fa-solid fa-circle-info"></i>

                        <span>
                            Check back for new answers.
                        </span>

                    </div>

                </div>

            `;

            return;
        }


        container.innerHTML =
            publishedAnswers
                .slice(0, 8)
                .map(
                    renderPublishedAnswer
                )
                .join("");

    }


    /* ========================================================
       RENDER PUBLISHED ANSWER
    ======================================================== */

    function renderPublishedAnswer(
        answer
    ) {

        const category =
            answer.category ||
            "Academic Help";


        const question =
            answer.question ||
            answer.title ||
            "Academic Question";


        const response =
            answer.answer ||
            answer.response ||
            answer.message ||
            "A helpful response from the Academic Help team.";


        const date =
            formatPublishedDate(
                answer.date ||
                answer.publishedAt ||
                answer.updatedAt
            );


        return `

            <article class="published-answer-card">

                <div class="published-answer-top">

                    <span class="published-answer-category">
                        ${escapeHTML(category)}
                    </span>

                    ${
                        date
                            ? `
                                <span class="published-answer-date">
                                    ${escapeHTML(date)}
                                </span>
                            `
                            : ""
                    }

                </div>


                <h3 class="published-answer-title">
                    ${escapeHTML(question)}
                </h3>


                <p class="published-answer-copy">
                    ${escapeHTML(response)}
                </p>


                <div class="published-answer-footer">

                    <i class="fa-solid fa-circle-check"></i>

                    <span>
                        Answered by the Academic Help team
                    </span>

                </div>

            </article>

        `;

    }


    /* ========================================================
       DATE FORMAT
    ======================================================== */

    function formatPublishedDate(
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
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "";
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


    /* ========================================================
       FONT CHECK
    ======================================================== */

    function initializeFontCheck() {

        /*
         * This does not replace the font loading.
         * It simply gives the browser a chance to finish
         * loading the Google fonts before rendering the page.
         */

        if (
            document.fonts &&
            typeof document.fonts.load ===
                "function"
        ) {

            Promise.all([

                document.fonts.load(
                    '800 2rem "Bricolage Grotesque"'
                ),

                document.fonts.load(
                    '400 1rem "DM Sans"'
                )

            ])
            .then(
                function () {

                    document.documentElement
                        .classList.add(
                            "academic-fonts-ready"
                        );

                }
            )
            .catch(
                function (error) {

                    console.warn(
                        "[AFC Academic Help] Font loading check failed:",
                        error
                    );

                }
            );

        }

    }


})();
