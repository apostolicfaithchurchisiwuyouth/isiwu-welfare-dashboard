/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   ACADEMIC HELP
   CLEAN / MOBILE-FIRST VERSION
   ============================================================ */

(function () {

    "use strict";


    /* ========================================================
       CONFIGURATION
    ======================================================== */

    const ACADEMIC_CONFIG = {

        VERSION: "2.0.0",

        API_URL:
            "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNpzsguBIaKR4q1dXVtgVHO2xZ1w/exec",

        FAQ_INITIAL_LIMIT: 5

    };


    /* ========================================================
       STATE
    ======================================================== */

    let activeFilter = "All";

    let searchTerm = "";

    let showAllFaqs = false;

    let formSubmitting = false;


    /* ========================================================
       FAQ DATA
    ======================================================== */

    const FAQ_DATA = [

        {
            category: "Secondary School",
            question: "How can I study when I have many subjects to cover?",
            answer:
                "Start by listing your subjects and identifying the ones that need the most attention. Create a simple timetable and study in focused sessions instead of trying to cover everything at once. Consistency is more important than studying for many hours on one day."
        },

        {
            category: "Secondary School",
            question: "What should I do if I keep forgetting what I study?",
            answer:
                "Do not rely only on rereading. After studying a topic, close your book and try to explain what you remember. Practice questions, short reviews, and teaching the idea to someone else can also strengthen your understanding."
        },

        {
            category: "Secondary School",
            question: "How can I prepare better for examinations?",
            answer:
                "Start early, understand the topics, practise past questions, and identify areas where you regularly make mistakes. In the final days before an examination, focus more on revision and practice than on trying to learn everything from the beginning."
        },

        {
            category: "JAMB & UTME",
            question: "How should I prepare for JAMB?",
            answer:
                "Begin by understanding the subjects and topics required for your chosen course. Use reliable study materials, practise questions regularly, and work on answering questions within the available time. Review your mistakes instead of simply counting your scores."
        },

        {
            category: "JAMB & UTME",
            question: "What if I don't know which course to choose?",
            answer:
                "Start with three things: the subjects you genuinely enjoy, the areas where your strengths are clear, and the kind of work you may want to do in the future. Also check the current admission requirements for the courses you are considering."
        },

        {
            category: "JAMB & UTME",
            question: "How can I improve my performance in practice tests?",
            answer:
                "Treat every practice test as feedback. After completing it, review the questions you missed and identify why you missed them. Work on those weak areas before taking another test."
        },

        {
            category: "University",
            question: "How can I adjust to university life?",
            answer:
                "University requires more personal responsibility. Learn your timetable, keep track of deadlines, attend classes, build healthy friendships, and ask questions when you do not understand something. Do not wait until examinations before taking your studies seriously."
        },

        {
            category: "University",
            question: "What should I do if I am struggling with a course?",
            answer:
                "Identify the exact part you do not understand. Review your notes, practise relevant questions, discuss the topic with classmates, and ask your lecturer or another trusted academic resource for clarification. Getting help early is usually much easier than waiting until the end of the semester."
        },

        {
            category: "University",
            question: "How can I manage school work and other responsibilities?",
            answer:
                "Plan your week before it becomes busy. Put important academic deadlines into a calendar and break large assignments into smaller tasks. Leave room for rest and other responsibilities instead of filling every hour with work."
        },

        {
            category: "Career",
            question: "How do I know which career direction may be right for me?",
            answer:
                "Explore rather than rushing to decide. Learn about different fields, speak with people who work in them, research the skills they require, and pay attention to the subjects and activities that consistently interest you."
        },

        {
            category: "Career",
            question: "Should I choose a course only because it has good job opportunities?",
            answer:
                "Career opportunities matter, but they should not be the only factor. Consider your strengths, interests, required skills, available opportunities, and whether you can see yourself developing in that field over time."
        },

        {
            category: "Scholarships",
            question: "Where should I start when looking for scholarships?",
            answer:
                "Start with official school, government, foundation, and organisation websites. Check the eligibility requirements, application deadline, required documents, and application instructions carefully. Avoid paying anyone simply because they claim they can guarantee a scholarship."
        },

        {
            category: "Study Skills",
            question: "Is studying for many hours always better?",
            answer:
                "Not necessarily. Focused study with active recall, practice, revision, and short breaks can be more useful than spending a long time passively reading. The quality and consistency of your study matter."
        },

        {
            category: "Study Skills",
            question: "How can I stop procrastinating on school work?",
            answer:
                "Make the first task very small. Instead of telling yourself to finish an entire assignment, decide to work on one section or one question first. Once you begin, continuing usually becomes easier."
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

        return String(value || "")
            .trim()
            .toLowerCase();

    }


    /* ========================================================
       SCROLL
    ======================================================== */

    function scrollToElement(id) {

        const element = $(id);

        if (!element) {

            return;

        }


        const top =
            element.getBoundingClientRect().top +
            window.scrollY -
            18;


        window.scrollTo({

            top: Math.max(top, 0),

            behavior: "smooth"

        });

    }


    /* ========================================================
       SCROLL BUTTONS
    ======================================================== */

    function initializeScrollButtons() {

        document
            .querySelectorAll("[data-scroll-to]")
            .forEach(function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const target =
                            button.getAttribute(
                                "data-scroll-to"
                            );

                        if (!target) {

                            return;

                        }

                        scrollToElement(target);

                    }
                );

            });

    }


    /* ========================================================
       FAQ FILTER
    ======================================================== */

    function getFilteredFAQs() {

        return FAQ_DATA.filter(
            function (item) {

                const categoryMatches =
                    activeFilter === "All" ||
                    item.category === activeFilter;


                if (!categoryMatches) {

                    return false;

                }


                if (!searchTerm) {

                    return true;

                }


                const haystack =
                    normalizeText(
                        item.question +
                        " " +
                        item.answer +
                        " " +
                        item.category
                    );


                return haystack.includes(
                    normalizeText(searchTerm)
                );

            }
        );

    }


    /* ========================================================
       RENDER FAQS
    ======================================================== */

    function renderFAQs() {

        const container =
            $("academicFaqList");

        const emptyState =
            $("academicEmptyState");


        if (!container) {

            return;

        }


        const filtered =
            getFilteredFAQs();


        let visible =
            filtered;


        if (
            !showAllFaqs &&
            !searchTerm &&
            activeFilter === "All"
        ) {

            visible =
                filtered.slice(
                    0,
                    ACADEMIC_CONFIG.FAQ_INITIAL_LIMIT
                );

        }


        if (visible.length === 0) {

            container.innerHTML = "";

            if (emptyState) {

                emptyState.hidden = false;

            }

            return;

        }


        if (emptyState) {

            emptyState.hidden = true;

        }


        container.innerHTML =
            visible.map(
                function (item, index) {

                    return `

                        <article
                            class="academic-faq-item"
                        >

                            <button
                                type="button"
                                class="academic-faq-question"
                                aria-expanded="false"
                            >

                                <span
                                    class="academic-faq-number"
                                >
                                    ${String(index + 1).padStart(2, "0")}
                                </span>


                                <span
                                    class="academic-faq-question-text"
                                >
                                    ${escapeHTML(item.question)}
                                </span>


                                <span
                                    class="academic-faq-chevron"
                                >
                                    <i
                                        class="fa-solid fa-chevron-down"
                                    ></i>
                                </span>

                            </button>


                            <div
                                class="academic-faq-answer"
                            >

                                <p>
                                    ${escapeHTML(item.answer)}
                                </p>

                            </div>

                        </article>

                    `;

                }
            )
            .join("");


        bindFAQButtons();

    }


    /* ========================================================
       FAQ BUTTONS
    ======================================================== */

    function bindFAQButtons() {

        document
            .querySelectorAll(
                ".academic-faq-question"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

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


                            document
                                .querySelectorAll(
                                    ".academic-faq-item.open"
                                )
                                .forEach(
                                    function (openItem) {

                                        if (
                                            openItem !== item
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
       FILTER BUTTONS
    ======================================================== */

    function initializeFilters() {

        document
            .querySelectorAll(
                ".academic-filter"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            activeFilter =
                                button.getAttribute(
                                    "data-filter"
                                ) ||
                                "All";


                            document
                                .querySelectorAll(
                                    ".academic-filter"
                                )
                                .forEach(
                                    function (filterButton) {

                                        filterButton.classList.toggle(
                                            "active",
                                            filterButton === button
                                        );

                                    }
                                );


                            showAllFaqs = true;


                            updateShowAllButton();

                            renderFAQs();

                        }
                    );

                }
            );

    }


    /* ========================================================
       CATEGORY CARDS
    ======================================================== */

    function initializeCategories() {

        document
            .querySelectorAll(
                ".academic-category-card"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            const category =
                                button.getAttribute(
                                    "data-category"
                                );


                            if (!category) {

                                return;

                            }


                            activeFilter =
                                category;

                            showAllFaqs =
                                true;


                            document
                                .querySelectorAll(
                                    ".academic-filter"
                                )
                                .forEach(
                                    function (filterButton) {

                                        filterButton.classList.toggle(
                                            "active",
                                            filterButton.getAttribute(
                                                "data-filter"
                                            ) === category
                                        );

                                    }
                                );


                            updateShowAllButton();

                            renderFAQs();

                            scrollToElement(
                                "academicFaqSection"
                            );

                        }
                    );

                }
            );

    }


    /* ========================================================
       SHOW ALL
    ======================================================== */

    function updateShowAllButton() {

        const button =
            $("showAllFaqs");


        if (!button) {

            return;

        }


        const span =
            button.querySelector("span");


        if (showAllFaqs) {

            button.classList.add(
                "expanded"
            );

            if (span) {

                span.textContent =
                    "Show less";

            }

        } else {

            button.classList.remove(
                "expanded"
            );

            if (span) {

                span.textContent =
                    "Show all";

            }

        }

    }


    function initializeShowAll() {

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

                renderFAQs();

            }
        );

    }


    /* ========================================================
       SEARCH
    ======================================================== */

    function initializeSearch() {

        const input =
            $("academicSearch");

        const clearButton =
            $("clearAcademicSearch");


        if (!input) {

            return;

        }


        input.addEventListener(
            "input",
            function () {

                searchTerm =
                    input.value.trim();


                if (clearButton) {

                    clearButton.hidden =
                        searchTerm.length === 0;

                }


                if (searchTerm) {

                    showAllFaqs = true;

                }


                updateShowAllButton();

                renderFAQs();

            }
        );


        if (clearButton) {

            clearButton.addEventListener(
                "click",
                function () {

                    input.value =
                        "";

                    searchTerm =
                        "";

                    clearButton.hidden =
                        true;

                    renderFAQs();

                    input.focus();

                }
            );

        }

    }


    /* ========================================================
       CHARACTER COUNTER
    ======================================================== */

    function initializeCharacterCounter() {

        const textarea =
            $("questionMessage");

        const counter =
            $("questionCharacterCount");


        if (!textarea || !counter) {

            return;

        }


        function updateCounter() {

            counter.textContent =
                String(textarea.value.length);

        }


        textarea.addEventListener(
            "input",
            updateCounter
        );


        updateCounter();

    }


    /* ========================================================
       FORM HELPERS
    ======================================================== */

    function clearFieldErrors() {

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


    function setFieldError(
        fieldId,
        errorId,
        message
    ) {

        const field =
            $(fieldId);

        const error =
            $(errorId);


        if (field) {

            const wrapper =
                field.closest(
                    ".form-field"
                );

            if (wrapper) {

                wrapper.classList.add(
                    "has-error"
                );

            }

        }


        if (error) {

            error.textContent =
                message;

        }

    }


    function setFormStatus(
        message,
        type
    ) {

        const status =
            $("academicFormStatus");


        if (!status) {

            return;

        }


        if (!message) {

            status.textContent =
                "";

            status.className =
                "form-status";

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


    /* ========================================================
       BUTTON LOADING
    ======================================================== */

    function setSubmitLoading(
        loading
    ) {

        const button =
            $("submitQuestionBtn");

        const label =
            $("submitButtonLabel");

        const loadingElement =
            $("submitButtonLoading");


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


            if (loadingElement) {

                loadingElement.hidden =
                    false;

            }

        } else {

            button.disabled =
                false;


            if (label) {

                label.hidden =
                    false;

            }


            if (loadingElement) {

                loadingElement.hidden =
                    true;

            }

        }

    }


    /* ========================================================
       VALIDATE FORM
    ======================================================== */

    function validateForm() {

        clearFieldErrors();

        setFormStatus("", "");


        const name =
            $("questionName");

        const phone =
            $("questionPhone");

        const category =
            $("questionCategory");

        const message =
            $("questionMessage");

        const consent =
            $("questionConsent");


        let valid =
            true;


        const nameValue =
            name
                ? name.value.trim()
                : "";


        const phoneValue =
            phone
                ? phone.value.trim()
                : "";


        const categoryValue =
            category
                ? category.value.trim()
                : "";


        const messageValue =
            message
                ? message.value.trim()
                : "";


        if (nameValue.length < 2) {

            setFieldError(
                "questionName",
                "questionNameError",
                "Please enter your name."
            );

            valid =
                false;

        }


        if (phoneValue.length < 7) {

            setFieldError(
                "questionPhone",
                "questionPhoneError",
                "Please enter a valid phone or WhatsApp number."
            );

            valid =
                false;

        }


        if (!categoryValue) {

            setFieldError(
                "questionCategory",
                "questionCategoryError",
                "Please select a category."
            );

            valid =
                false;

        }


        if (messageValue.length < 10) {

            setFieldError(
                "questionMessage",
                "questionMessageError",
                "Please tell us a little more about your question."
            );

            valid =
                false;

        }


        if (!consent || !consent.checked) {

            setFormStatus(
                "Please agree that the Academic Help team may contact you.",
                "error"
            );

            valid =
                false;

        }


        if (!valid) {

            const firstError =
                document.querySelector(
                    ".form-field.has-error"
                );


            if (firstError) {

                firstError.scrollIntoView({

                    behavior: "smooth",

                    block: "center"

                });

            }

        }


        return valid;

    }


    /* ========================================================
       API RESPONSE PARSER
    ======================================================== */

    function parseAPIResponse(data) {

        if (!data) {

            return {

                success: false,

                message:
                    "The server returned an empty response."

            };

        }


        if (
            typeof data === "object" &&
            data.success !== undefined
        ) {

            return data;

        }


        if (
            data.data &&
            typeof data.data === "object"
        ) {

            return data.data;

        }


        return data;

    }


    /* ========================================================
       POST REQUEST
    ======================================================== */

    async function postAPI(
        payload
    ) {

        const response =
            await fetch(
                ACADEMIC_CONFIG.API_URL,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "text/plain;charset=utf-8"

                    },

                    body:
                        JSON.stringify(
                            payload
                        )

                }
            );


        if (!response.ok) {

            throw new Error(
                "HTTP " +
                response.status
            );

        }


        const text =
            await response.text();


        let data;


        try {

            data =
                JSON.parse(
                    text
                );

        } catch (error) {

            throw new Error(
                "The server returned an invalid response."
            );

        }


        return parseAPIResponse(
            data
        );

    }


    /* ========================================================
       SUBMIT QUESTION
    ======================================================== */

    async function submitQuestion(
        event
    ) {

        event.preventDefault();


        /*
         * Never allow double submissions.
         */

        if (formSubmitting) {

            return;

        }


        if (!validateForm()) {

            return;

        }


        const name =
            $("questionName").value.trim();

        const phone =
            $("questionPhone").value.trim();

        const category =
            $("questionCategory").value.trim();

        const contactPreference =
            $("questionContact")
                ? $("questionContact").value
                : "WhatsApp";

        const question =
            $("questionMessage").value.trim();


        formSubmitting =
            true;


        /*
         * Loader starts ONLY HERE,
         * after the user has actually submitted.
         */

        setSubmitLoading(
            true
        );


        setFormStatus(
            "",
            ""
        );


        try {

            const result =
                await postAPI({

                    action:
                        "submitAcademicQuestion",

                    name:
                        name,

                    phone:
                        phone,

                    category:
                        category,

                    contactPreference:
                        contactPreference,

                    question:
                        question

                });


            console.log(
                "[Academic Help] Submit response:",
                result
            );


            if (
                result &&
                (
                    result.success === true ||
                    result.success === "true"
                )
            ) {

                const requestId =
                    result.requestId ||
                    result.requestID ||
                    result.id ||
                    "";


                if (requestId) {

                    setFormStatus(
                        "Your question has been sent successfully. Reference: " +
                        requestId,
                        "success"
                    );

                } else {

                    setFormStatus(
                        "Your question has been sent successfully. The Academic Help team will review it.",
                        "success"
                    );

                }


                const form =
                    $("academicQuestionForm");


                if (form) {

                    form.reset();

                }


                const counter =
                    $("questionCharacterCount");


                if (counter) {

                    counter.textContent =
                        "0";

                }


                clearFieldErrors();


                /*
                 * Refresh published answers after submission
                 * in case the backend returns new public data.
                 */

                loadPublishedAnswers();

            } else {

                throw new Error(
                    result &&
                    (
                        result.message ||
                        result.error
                    )
                        ? (
                            result.message ||
                            result.error
                        )
                        : "We could not submit your question."
                );

            }

        } catch (error) {

            console.error(
                "[Academic Help] Submit error:",
                error
            );


            setFormStatus(
                error &&
                error.message
                    ? error.message
                    : "Unable to send your question right now. Please try again.",
                "error"
            );

        } finally {

            formSubmitting =
                false;


            /*
             * Always return the button to
             * its normal state.
             */

            setSubmitLoading(
                false
            );

        }

    }


    /* ========================================================
       FORM INITIALIZATION
    ======================================================== */

    function initializeForm() {

        const form =
            $("academicQuestionForm");


        if (!form) {

            return;

        }


        /*
         * HARD RESET OF LOADING STATE.
         *
         * This is intentional.
         * It prevents a CSS/global-state issue from leaving
         * "Sending..." visible when the page first opens.
         */

        formSubmitting =
            false;


        setSubmitLoading(
            false
        );


        setFormStatus(
            "",
            ""
        );


        form.addEventListener(
            "submit",
            submitQuestion
        );

    }


    /* ========================================================
       PUBLISHED ANSWERS
    ======================================================== */

    function normalizePublishedAnswers(
        result
    ) {

        if (!result) {

            return [];

        }


        if (Array.isArray(result)) {

            return result;

        }


        if (
            Array.isArray(
                result.answers
            )
        ) {

            return result.answers;

        }


        if (
            Array.isArray(
                result.data
            )
        ) {

            return result.data;

        }


        if (
            result.data &&
            Array.isArray(
                result.data.answers
            )
        ) {

            return result.data.answers;

        }


        return [];

    }


    function getPublishedField(
        item,
        names
    ) {

        for (
            let i = 0;
            i < names.length;
            i++
        ) {

            const key =
                names[i];


            if (
                item &&
                item[key] !== undefined &&
                item[key] !== null &&
                String(item[key]).trim()
            ) {

                return String(
                    item[key]
                ).trim();

            }

        }


        return "";

    }


    function renderPublishedAnswers(
        answers
    ) {

        const container =
            $("publishedAnswerGrid");


        if (!container) {

            return;

        }


        if (!answers.length) {

            container.innerHTML = `

                <div class="published-answer-card">

                    <div class="published-answer-category">
                        Academic Help
                    </div>

                    <h3>
                        No published answers yet
                    </h3>

                    <p>
                        New answers from the Academic Help team
                        will appear here.
                    </p>

                </div>

            `;

            return;

        }


        container.innerHTML =
            answers
                .slice(0, 6)
                .map(
                    function (item) {

                        const category =
                            getPublishedField(
                                item,
                                [
                                    "category",
                                    "Category"
                                ]
                            ) ||
                            "Academic Help";


                        const question =
                            getPublishedField(
                                item,
                                [
                                    "question",
                                    "Question",
                                    "title",
                                    "Title"
                                ]
                            ) ||
                            "Academic question";


                        const answer =
                            getPublishedField(
                                item,
                                [
                                    "answer",
                                    "Answer",
                                    "response",
                                    "Response"
                                ]
                            ) ||
                            "An answer from the Academic Help team.";

                        
                        return `

                            <article
                                class="published-answer-card"
                            >

                                <span
                                    class="published-answer-category"
                                >
                                    ${escapeHTML(category)}
                                </span>


                                <h3>
                                    ${escapeHTML(question)}
                                </h3>


                                <p>
                                    ${escapeHTML(
                                        truncateText(
                                            answer,
                                            170
                                        )
                                    )}
                                </p>

                            </article>

                        `;

                    }
                )
                .join("");

    }


    function truncateText(
        value,
        maxLength
    ) {

        const text =
            String(value || "");


        if (
            text.length <= maxLength
        ) {

            return text;

        }


        return (
            text.substring(
                0,
                maxLength
            ).trim() +
            "..."
        );

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

            const response =
                await fetch(
                    ACADEMIC_CONFIG.API_URL +
                    "?action=getPublishedAcademicAnswers",
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


            const result =
                parseAPIResponse(
                    data
                );


            const answers =
                normalizePublishedAnswers(
                    result
                );


            renderPublishedAnswers(
                answers
            );

        } catch (error) {

            console.warn(
                "[Academic Help] Published answers unavailable:",
                error
            );


            /*
             * Do not show a giant error block.
             * The rest of the page remains usable.
             */

            container.innerHTML = `

                <div class="published-answer-card">

                    <div class="published-answer-category">
                        Academic Help
                    </div>

                    <h3>
                        Answers will appear here
                    </h3>

                    <p>
                        Published responses from our Academic Help
                        team will be displayed here.
                    </p>

                </div>

            `;

        }

    }


    /* ========================================================
       FONT CHECK
    ======================================================== */

    function checkFonts() {

        if (
            !document.fonts ||
            typeof document.fonts.check !== "function"
        ) {

            return;

        }


        document.fonts.ready.then(
            function () {

                const br =
                    document.fonts.check(
                        '700 16px "Bricolage Grotesque"'
                    );

                const dm =
                    document.fonts.check(
                        '400 16px "DM Sans"'
                    );


                console.log(
                    "[Academic Help] Fonts:",
                    {
                        "Bricolage Grotesque": br,
                        "DM Sans": dm
                    }
                );

            }
        );

    }


    /* ========================================================
       INITIALIZE PAGE
    ======================================================== */

    function initializeAcademicHelp() {

        initializeScrollButtons();

        initializeCategories();

        initializeFilters();

        initializeShowAll();

        initializeSearch();

        initializeCharacterCounter();

        initializeForm();

        renderFAQs();

        updateShowAllButton();

        checkFonts();

        loadPublishedAnswers();

    }


    /* ========================================================
       AOS / LAYOUT READY
    ======================================================== */

    function startPage() {

        initializeAcademicHelp();

    }


    if (
        window.AFC_LAYOUT_READY
    ) {

        startPage();

    } else {

        window.addEventListener(
            "afc:layout-ready",
            startPage,
            {
                once: true
            }
        );

    }


    /*
     * Safety fallback.
     *
     * If layout.js is unavailable or fails before dispatching,
     * the page-specific functionality still initializes.
     */

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            setTimeout(
                function () {

                    const faq =
                        $("academicFaqList");


                    if (
                        faq &&
                        !faq.dataset.initialized
                    ) {

                        faq.dataset.initialized =
                            "true";

                        startPage();

                    }

                },
                250
            );

        },
        {
            once: true
        }
    );


})();
