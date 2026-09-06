/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: academichelp.js

   PURPOSE:
   - Academic Help FAQ
   - Search
   - Category filtering
   - Question submission
   - Published answers
   - Mobile-friendly interaction

   IMPORTANT:
   - Public page
   - No login required
   - Loader only appears AFTER submit is clicked
   ============================================================ */

"use strict";


/* ============================================================
   CONFIG
============================================================ */

const ACADEMIC_HELP_CONFIG = {

    API:
        "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNpzsguBIaKR4q1dXVtgVHO2xZ1w/exec",

    SUBMIT_ACTION:
        "submitAcademicQuestion",

    PUBLISHED_ACTION:
        "getPublishedAcademicAnswers",

    FAQ_ACTION:
        "getAcademicHelpFaqs"

};


/* ============================================================
   STATE
============================================================ */

let academicFaqs = [];

let publishedAnswers = [];

let activeAcademicFilter = "All";

let academicSearchTerm = "";

let showingAllFaqs = false;

let academicSubmissionInProgress = false;


/* ============================================================
   DOM HELPER
============================================================ */

function academicElement(id) {

    return document.getElementById(id);

}


/* ============================================================
   SAFE HTML
============================================================ */

function escapeAcademicHTML(value) {

    return String(value ?? "")

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}


/* ============================================================
   API GET
============================================================ */

async function academicApiGet(action) {

    const url =
        `${ACADEMIC_HELP_CONFIG.API}?action=${encodeURIComponent(action)}`;

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
            `Request failed with HTTP ${response.status}.`
        );

    }


    return await response.json();

}


/* ============================================================
   API POST
============================================================ */

async function academicApiPost(action, payload) {

    const response =
        await fetch(
            ACADEMIC_HELP_CONFIG.API,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "text/plain;charset=utf-8"
                },

                body:
                    JSON.stringify({
                        action:
                            action,

                        ...payload
                    })
            }
        );


    if (!response.ok) {

        throw new Error(
            `Request failed with HTTP ${response.status}.`
        );

    }


    return await response.json();

}


/* ============================================================
   RESPONSE DATA HELPER
============================================================ */

function getAcademicResponseData(response) {

    if (
        response &&
        Array.isArray(response.data)
    ) {

        return response.data;

    }


    if (
        response &&
        Array.isArray(response.items)
    ) {

        return response.items;

    }


    if (
        response &&
        Array.isArray(response.faqs)
    ) {

        return response.faqs;

    }


    if (
        response &&
        Array.isArray(response.answers)
    ) {

        return response.answers;

    }


    if (Array.isArray(response)) {

        return response;

    }


    return [];

}


/* ============================================================
   INITIALISE
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeAcademicHelp();

    }
);


/* ============================================================
   INITIALIZE
============================================================ */

async function initializeAcademicHelp() {

    setupAcademicScrollButtons();

    setupAcademicSearch();

    setupAcademicFilters();

    setupAcademicCategories();

    setupAcademicFaqControls();

    setupAcademicQuestionForm();

    setupCharacterCounter();

    /*
     * CRITICAL:
     *
     * Always make sure the submit button starts in its
     * normal state.
     *
     * This prevents "Sending..." from appearing when
     * the page first loads.
     */

    resetAcademicSubmitButton();


    /*
     * Load FAQ data.
     */

    await loadAcademicFaqs();


    /*
     * Load published answers.
     */

    await loadPublishedAcademicAnswers();

}


/* ============================================================
   SCROLL BUTTONS
============================================================ */

function setupAcademicScrollButtons() {

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


            target.scrollIntoView(
                {
                    behavior:
                        "smooth",

                    block:
                        "start"
                }
            );

        }
    );

}


/* ============================================================
   SEARCH
============================================================ */

function setupAcademicSearch() {

    const searchInput =
        academicElement(
            "academicSearch"
        );


    const clearButton =
        academicElement(
            "clearAcademicSearch"
        );


    if (!searchInput) {

        return;

    }


    searchInput.addEventListener(
        "input",
        function () {

            academicSearchTerm =
                searchInput.value
                    .trim()
                    .toLowerCase();


            if (clearButton) {

                clearButton.hidden =
                    academicSearchTerm === "";

            }


            renderAcademicFaqs();

        }
    );


    if (clearButton) {

        clearButton.addEventListener(
            "click",
            function () {

                searchInput.value =
                    "";

                academicSearchTerm =
                    "";

                clearButton.hidden =
                    true;

                renderAcademicFaqs();

                searchInput.focus();

            }
        );

    }

}


/* ============================================================
   CATEGORY FILTERS
============================================================ */

function setupAcademicFilters() {

    const filterRow =
        academicElement(
            "academicFilterRow"
        );


    if (!filterRow) {

        return;

    }


    filterRow.addEventListener(
        "click",
        function (event) {

            const button =
                event.target.closest(
                    ".academic-filter"
                );


            if (!button) {

                return;

            }


            const filter =
                button.dataset.filter ||
                "All";


            activeAcademicFilter =
                filter;


            filterRow
                .querySelectorAll(
                    ".academic-filter"
                )
                .forEach(
                    function (item) {

                        item.classList.toggle(
                            "active",
                            item === button
                        );

                    }
                );


            showingAllFaqs =
                false;


            renderAcademicFaqs();

        }
    );

}


/* ============================================================
   CATEGORY CARDS
============================================================ */

function setupAcademicCategories() {

    document.addEventListener(
        "click",
        function (event) {

            const card =
                event.target.closest(
                    ".academic-category-card"
                );


            if (!card) {

                return;

            }


            const category =
                card.dataset.category;


            if (!category) {

                return;

            }


            activeAcademicFilter =
                category;


            const filterButtons =
                document.querySelectorAll(
                    ".academic-filter"
                );


            filterButtons.forEach(
                function (button) {

                    button.classList.toggle(
                        "active",
                        button.dataset.filter ===
                            category
                    );

                }
            );


            const faqSection =
                academicElement(
                    "faqSection"
                );


            if (faqSection) {

                faqSection.scrollIntoView(
                    {
                        behavior:
                            "smooth",

                        block:
                            "start"
                    }
                );

            }


            renderAcademicFaqs();

        }
    );

}


/* ============================================================
   FAQ CONTROLS
============================================================ */

function setupAcademicFaqControls() {

    const showAllButton =
        academicElement(
            "showAllFaqs"
        );


    if (!showAllButton) {

        return;

    }


    showAllButton.addEventListener(
        "click",
        function () {

            showingAllFaqs =
                !showingAllFaqs;


            renderAcademicFaqs();

            showAllButton
                .querySelector(
                    "span"
                )
                .textContent =
                    showingAllFaqs
                        ? "Show less"
                        : "Show all";

        }
    );


    const faqList =
        academicElement(
            "academicFaqList"
        );


    if (!faqList) {

        return;

    }


    faqList.addEventListener(
        "click",
        function (event) {

            const button =
                event.target.closest(
                    ".academic-faq-question"
                );


            if (!button) {

                return;

            }


            const item =
                button.closest(
                    ".academic-faq-item"
                );


            if (!item) {

                return;

            }


            const isOpen =
                item.classList.contains(
                    "open"
                );


            faqList
                .querySelectorAll(
                    ".academic-faq-item.open"
                )
                .forEach(
                    function (openItem) {

                        openItem.classList.remove(
                            "open"
                        );

                    }
                );


            if (!isOpen) {

                item.classList.add(
                    "open"
                );

            }

        }
    );

}


/* ============================================================
   LOAD FAQS
============================================================ */

async function loadAcademicFaqs() {

    const list =
        academicElement(
            "academicFaqList"
        );


    if (!list) {

        return;

    }


    try {

        const response =
            await academicApiGet(
                ACADEMIC_HELP_CONFIG.FAQ_ACTION
            );


        academicFaqs =
            getAcademicResponseData(
                response
            );


        /*
         * If the backend does not yet have the FAQ action,
         * keep the page usable with the built-in questions.
         */

        if (!academicFaqs.length) {

            academicFaqs =
                getDefaultAcademicFaqs();

        }


        renderAcademicFaqs();

    }

    catch (error) {

        console.warn(
            "Academic FAQ request failed:",
            error
        );


        academicFaqs =
            getDefaultAcademicFaqs();


        renderAcademicFaqs();

    }

}


/* ============================================================
   DEFAULT FAQS
============================================================ */

function getDefaultAcademicFaqs() {

    return [

        {
            category:
                "Secondary School",

            question:
                "How can I study better for my examinations?",

            answer:
                "Create a realistic study timetable, study in focused sessions, practise past questions and review difficult topics regularly. Avoid waiting until the last few days before an examination."
        },


        {
            category:
                "JAMB & UTME",

            question:
                "How should I prepare for JAMB?",

            answer:
                "Start early, understand the current examination requirements, study the recommended subjects consistently and practise with past questions under timed conditions."
        },


        {
            category:
                "University",

            question:
                "How can I adjust to university life?",

            answer:
                "Learn how your department works, attend classes, keep track of deadlines and build healthy relationships with classmates and lecturers. Good organisation makes university life much easier."
        },


        {
            category:
                "Scholarships",

            question:
                "Where can I find scholarship opportunities?",

            answer:
                "Watch for opportunities from universities, foundations, government organisations and reputable educational institutions. Always check the official application requirements and deadlines before applying."
        },


        {
            category:
                "Study Skills",

            question:
                "What should I do when I don't understand a topic?",

            answer:
                "Break the topic into smaller parts, review the basic concepts, use another explanation or resource and ask a teacher, lecturer or trusted person for clarification."
        },


        {
            category:
                "Career",

            question:
                "How do I know which career path to choose?",

            answer:
                "Consider your interests, strengths, values and the type of work you enjoy. Research possible careers and speak with people who have experience in those fields before making major decisions."
        }

    ];

}


/* ============================================================
   RENDER FAQS
============================================================ */

function renderAcademicFaqs() {

    const list =
        academicElement(
            "academicFaqList"
        );


    const emptyState =
        academicElement(
            "academicEmptyState"
        );


    if (!list) {

        return;

    }


    let filtered =
        academicFaqs.filter(
            function (item) {

                const category =
                    String(
                        item.category ||
                        ""
                    ).trim();


                const question =
                    String(
                        item.question ||
                        item.Question ||
                        ""
                    ).trim();


                const answer =
                    String(
                        item.answer ||
                        item.Answer ||
                        ""
                    ).trim();


                const matchesCategory =
                    activeAcademicFilter ===
                        "All" ||

                    category.toLowerCase() ===
                        activeAcademicFilter.toLowerCase();


                const searchText =
                    (
                        question +
                        " " +
                        answer +
                        " " +
                        category
                    )
                    .toLowerCase();


                const matchesSearch =
                    !academicSearchTerm ||
                    searchText.includes(
                        academicSearchTerm
                    );


                return (
                    matchesCategory &&
                    matchesSearch
                );

            }
        );


    /*
     * Keep the initial page compact.
     *
     * Show only the first 5 unless the user asks
     * to see everything.
     */

    if (
        !showingAllFaqs &&
        !academicSearchTerm &&
        filtered.length > 5
    ) {

        filtered =
            filtered.slice(
                0,
                5
            );

    }


    if (!filtered.length) {

        list.innerHTML =
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


    list.innerHTML =
        filtered
            .map(
                function (
                    item,
                    index
                ) {

                    const category =
                        escapeAcademicHTML(
                            item.category ||
                            "Academic Help"
                        );


                    const question =
                        escapeAcademicHTML(
                            item.question ||
                            item.Question ||
                            "Question"
                        );


                    const answer =
                        escapeAcademicHTML(
                            item.answer ||
                            item.Answer ||
                            ""
                        );


                    return `

                        <article
                            class="academic-faq-item"
                            data-category="${category}"
                        >

                            <button
                                type="button"
                                class="academic-faq-question"
                                aria-expanded="false"
                            >

                                <span
                                    class="academic-faq-number"
                                >
                                    ${index + 1}
                                </span>


                                <span
                                    class="academic-faq-question-text"
                                >
                                    ${question}
                                </span>


                                <span
                                    class="academic-faq-chevron"
                                >

                                    <i class="fa-solid fa-chevron-down"></i>

                                </span>

                            </button>


                            <div class="academic-faq-answer">

                                <p>
                                    ${answer}
                                </p>

                            </div>

                        </article>

                    `;

                }
            )
            .join("");

}


/* ============================================================
   LOAD PUBLISHED ANSWERS
============================================================ */

async function loadPublishedAcademicAnswers() {

    const container =
        academicElement(
            "publishedAnswerGrid"
        );


    if (!container) {

        return;

    }


    try {

        const response =
            await academicApiGet(
                ACADEMIC_HELP_CONFIG.PUBLISHED_ACTION
            );


        publishedAnswers =
            getAcademicResponseData(
                response
            );


        renderPublishedAcademicAnswers();

    }

    catch (error) {

        console.warn(
            "Published academic answers could not be loaded:",
            error
        );


        publishedAnswers =
            [];


        renderPublishedAcademicAnswers();

    }

}


/* ============================================================
   RENDER PUBLISHED ANSWERS
============================================================ */

function renderPublishedAcademicAnswers() {

    const container =
        academicElement(
            "publishedAnswerGrid"
        );


    if (!container) {

        return;

    }


    if (!publishedAnswers.length) {

        container.innerHTML =
            `
                <div class="published-loading">

                    <span>
                        New helpful answers will appear here.
                    </span>

                </div>
            `;

        return;

    }


    container.innerHTML =
        publishedAnswers
            .slice(0, 6)
            .map(
                function (item) {

                    const category =
                        escapeAcademicHTML(
                            item.category ||
                            "Academic Help"
                        );


                    const question =
                        escapeAcademicHTML(
                            item.question ||
                            item.Question ||
                            "Academic Question"
                        );


                    const answer =
                        escapeAcademicHTML(
                            item.answer ||
                            item.Answer ||
                            ""
                        );


                    return `

                        <article
                            class="published-answer-card"
                        >

                            <span
                                class="published-answer-category"
                            >
                                ${category}
                            </span>


                            <h3>
                                ${question}
                            </h3>


                            <p>
                                ${answer}
                            </p>

                        </article>

                    `;

                }
            )
            .join("");

}


/* ============================================================
   CHARACTER COUNTER
============================================================ */

function setupCharacterCounter() {

    const textarea =
        academicElement(
            "questionMessage"
        );


    const counter =
        academicElement(
            "questionCharacterCount"
        );


    if (!textarea || !counter) {

        return;

    }


    function updateCounter() {

        counter.textContent =
            textarea.value.length;

    }


    textarea.addEventListener(
        "input",
        updateCounter
    );


    updateCounter();

}


/* ============================================================
   FORM
============================================================ */

function setupAcademicQuestionForm() {

    const form =
        academicElement(
            "academicQuestionForm"
        );


    if (!form) {

        return;

    }


    form.addEventListener(
        "submit",
        handleAcademicQuestionSubmit
    );

}


/* ============================================================
   VALIDATION
============================================================ */

function validateAcademicQuestionForm() {

    let valid =
        true;


    const name =
        academicElement(
            "questionName"
        );


    const phone =
        academicElement(
            "questionPhone"
        );


    const category =
        academicElement(
            "questionCategory"
        );


    const question =
        academicElement(
            "questionMessage"
        );


    const consent =
        academicElement(
            "questionConsent"
        );


    clearAcademicErrors();


    if (
        !name ||
        !name.value.trim()
    ) {

        showAcademicFieldError(
            "questionName",
            "questionNameError",
            "Please enter your name."
        );

        valid =
            false;

    }


    if (
        !phone ||
        !phone.value.trim()
    ) {

        showAcademicFieldError(
            "questionPhone",
            "questionPhoneError",
            "Please enter your WhatsApp number or phone number."
        );

        valid =
            false;

    }


    if (
        !category ||
        !category.value
    ) {

        showAcademicFieldError(
            "questionCategory",
            "questionCategoryError",
            "Please select a category."
        );

        valid =
            false;

    }


    if (
        !question ||
        !question.value.trim()
    ) {

        showAcademicFieldError(
            "questionMessage",
            "questionMessageError",
            "Please tell us what you need help with."
        );

        valid =
            false;

    }


    if (
        question &&
        question.value.trim().length < 10
    ) {

        showAcademicFieldError(
            "questionMessage",
            "questionMessageError",
            "Please give us a little more detail."
        );

        valid =
            false;

    }


    if (
        !consent ||
        !consent.checked
    ) {

        showAcademicFormStatus(
            "Please agree that the Academic Help team may contact you.",
            "error"
        );

        valid =
            false;

    }


    return valid;

}


/* ============================================================
   CLEAR ERRORS
============================================================ */

function clearAcademicErrors() {

    document
        .querySelectorAll(
            ".academic-page .form-field.has-error"
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
            ".academic-page .field-error"
        )
        .forEach(
            function (error) {

                error.textContent =
                    "";

            }
        );


    clearAcademicFormStatus();

}


/* ============================================================
   SHOW FIELD ERROR
============================================================ */

function showAcademicFieldError(
    inputId,
    errorId,
    message
) {

    const input =
        academicElement(
            inputId
        );


    const error =
        academicElement(
            errorId
        );


    if (input) {

        const field =
            input.closest(
                ".form-field"
            );


        if (field) {

            field.classList.add(
                "has-error"
            );

        }

    }


    if (error) {

        error.textContent =
            message;

    }

}


/* ============================================================
   FORM STATUS
============================================================ */

function showAcademicFormStatus(
    message,
    type
) {

    const status =
        academicElement(
            "academicFormStatus"
        );


    if (!status) {

        return;

    }


    status.textContent =
        message;


    status.className =
        "form-status show " +
        (
            type === "success"
                ? "success"
                : "error"
        );

}


function clearAcademicFormStatus() {

    const status =
        academicElement(
            "academicFormStatus"
        );


    if (!status) {

        return;

    }


    status.textContent =
        "";

    status.className =
        "form-status";

}


/* ============================================================
   SUBMIT BUTTON LOADING
============================================================ */

function setAcademicSubmitLoading(
    loading
) {

    const button =
        academicElement(
            "submitQuestionBtn"
        );


    const label =
        academicElement(
            "submitButtonLabel"
        );


    const loader =
        academicElement(
            "submitButtonLoading"
        );


    if (!button) {

        return;

    }


    if (loading) {

        button.disabled =
            true;


        if (label) {

            label.hidden =
                true;

        }


        if (loader) {

            loader.hidden =
                false;

        }

    }

    else {

        button.disabled =
            false;


        if (label) {

            label.hidden =
                false;

        }


        if (loader) {

            loader.hidden =
                true;

        }

    }

}


/* ============================================================
   RESET SUBMIT BUTTON
============================================================ */

function resetAcademicSubmitButton() {

    academicSubmissionInProgress =
        false;


    setAcademicSubmitLoading(
        false
    );

}


/* ============================================================
   SUBMIT QUESTION
============================================================ */

async function handleAcademicQuestionSubmit(
    event
) {

    event.preventDefault();


    /*
     * Prevent double submission.
     */

    if (
        academicSubmissionInProgress
    ) {

        return;

    }


    /*
     * Validate first.
     *
     * IMPORTANT:
     * The loading state is NOT turned on until
     * validation has completely passed.
     */

    if (
        !validateAcademicQuestionForm()
    ) {

        return;

    }


    const name =
        academicElement(
            "questionName"
        ).value.trim();


    const phone =
        academicElement(
            "questionPhone"
        ).value.trim();


    const category =
        academicElement(
            "questionCategory"
        ).value;


    const contactPreference =
        academicElement(
            "questionContact"
        ).value;


    const question =
        academicElement(
            "questionMessage"
        ).value.trim();


    const consent =
        academicElement(
            "questionConsent"
        ).checked;


    /*
     * NOW — and only now — show Sending...
     */

    academicSubmissionInProgress =
        true;


    setAcademicSubmitLoading(
        true
    );


    clearAcademicFormStatus();


    try {

        const response =
            await academicApiPost(
                ACADEMIC_HELP_CONFIG.SUBMIT_ACTION,
                {

                    name:
                        name,

                    phone:
                        phone,

                    category:
                        category,

                    question:
                        question,

                    contactPreference:
                        contactPreference,

                    consent:
                        consent,

                    page:
                        "Academic Help"

                }
            );


        console.log(
            "Academic Help submission response:",
            response
        );


        if (
            response &&
            response.success === false
        ) {

            throw new Error(
                response.message ||
                "Unable to submit your question."
            );

        }


        showAcademicFormStatus(
            response &&
            response.message
                ? response.message
                : "Your question has been sent successfully. The Academic Help team will review it.",
            "success"
        );


        /*
         * Clear the form after successful submission.
         */

        const form =
            academicElement(
                "academicQuestionForm"
            );


        if (form) {

            form.reset();

        }


        const counter =
            academicElement(
                "questionCharacterCount"
            );


        if (counter) {

            counter.textContent =
                "0";

        }


        clearAcademicErrors();


        /*
         * Keep the success message visible.
         */

        showAcademicFormStatus(
            response &&
            response.message
                ? response.message
                : "Your question has been sent successfully. The Academic Help team will review it.",
            "success"
        );

    }

    catch (error) {

        console.error(
            "Academic Help submission error:",
            error
        );


        showAcademicFormStatus(
            error &&
            error.message
                ? error.message
                : "We couldn't send your question right now. Please try again.",
            "error"
        );

    }

    finally {

        academicSubmissionInProgress =
            false;


        /*
         * IMPORTANT:
         *
         * This guarantees that the button returns to
         * "Send My Question" whether the request succeeds
         * or fails.
         */

        setAcademicSubmitLoading(
            false
        );

    }

}


/* ============================================================
   EXPOSE OPTIONAL DEBUG OBJECT
============================================================ */

window.AFCAcademicHelp = {

    reloadFaqs:
        loadAcademicFaqs,

    reloadAnswers:
        loadPublishedAcademicAnswers,

    renderFaqs:
        renderAcademicFaqs

};
