/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   ACADEMIC HELP PAGE CONTROLLER
   FILE: academichelp.js
   ============================================================ */

(function () {

    "use strict";


    /* ============================================================
       CONFIG
       ============================================================ */

    const ACADEMIC_CONFIG = {

        VERSION: "1.0.0",

        APPS_SCRIPT_URL:
            "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNpzsguBIaKR4q1dXVtgVHO2xZ1w/exec",

        MAX_QUESTION_LENGTH: 2000

    };


    /* ============================================================
       FAQ DATA
       ============================================================ */

    const FAQ_DATA = [

        {
            id: 1,
            category: "Secondary School",
            question: "How can I prepare better for my school examinations?",
            answer:
                "Start early instead of waiting until the examination is close. Break your subjects into smaller topics, create a realistic study timetable, revise regularly, practise past questions where available, and make time to rest. If there is a topic you do not understand, ask a teacher, trusted senior, or someone who can guide you rather than leaving the topic unattended."
        },

        {
            id: 2,
            category: "Secondary School",
            question: "What should I do if I am struggling with a particular subject?",
            answer:
                "First identify exactly what you do not understand. Review your class notes, try simpler explanations, practise related questions, and ask your teacher or another trusted person for help. Do not conclude that you are simply bad at the subject. Sometimes the problem is the learning method rather than your ability."
        },

        {
            id: 3,
            category: "JAMB & UTME",
            question: "How should I prepare for JAMB?",
            answer:
                "Begin preparation early. Understand the subjects required for your intended course, study the official syllabus, practise questions regularly, review your mistakes, and use reliable study materials. Avoid depending only on repeated questions or examination rumours. Your preparation should help you understand the subjects, not simply memorise answers."
        },

        {
            id: 4,
            category: "JAMB & UTME",
            question: "How do I choose the right course to study?",
            answer:
                "Consider your interests, strengths, academic performance, career direction, and the actual requirements of the course. Research the subjects involved and the kind of work graduates commonly do. Also check the requirements of institutions you are considering. It is wise to speak with teachers, counsellors, graduates, and trusted adults before making an important decision."
        },

        {
            id: 5,
            category: "University",
            question: "How can I adjust to university life?",
            answer:
                "University requires more personal responsibility. Learn how your institution works, attend classes, keep track of deadlines, organise your notes, build healthy friendships, and ask for help when you need it. Do not wait until you are already overwhelmed before seeking academic support."
        },

        {
            id: 6,
            category: "University",
            question: "How can I manage my time as a university student?",
            answer:
                "Start by listing your important commitments and deadlines. Create a weekly plan that includes lectures, personal study, assignments, rest, and other responsibilities. Avoid filling every hour with activities. A simple plan that you actually follow is more useful than a complicated timetable that you abandon."
        },

        {
            id: 7,
            category: "Scholarships",
            question: "Where can I find scholarship opportunities?",
            answer:
                "Look for opportunities through your school, university, government agencies, reputable organisations, foundations, and official scholarship websites. Always verify the source and eligibility requirements. Be careful with opportunities that demand unusual payments or ask for sensitive information before providing verifiable details."
        },

        {
            id: 8,
            category: "Scholarships",
            question: "What can make a scholarship application stronger?",
            answer:
                "Read the requirements carefully and answer exactly what the application asks. Keep your information truthful, present your achievements clearly, explain your goals thoughtfully, and proofread your application before submitting it. Where references or supporting documents are required, make sure they are accurate and submitted in the requested format."
        },

        {
            id: 9,
            category: "Study Skills",
            question: "How can I remember what I study?",
            answer:
                "Do more than read the same page repeatedly. After studying a topic, close your book and try to explain what you remember. Use practice questions, flashcards, summaries, and spaced revision. Connecting a new idea to something you already understand can also make it easier to remember."
        },

        {
            id: 10,
            category: "Study Skills",
            question: "How do I create a study timetable that I can actually follow?",
            answer:
                "Start with the time you genuinely have available. Give difficult subjects focused periods and include short breaks. Set specific goals for each study session rather than simply writing 'study'. Leave some flexibility for unexpected responsibilities. A realistic timetable is better than one that expects you to study for many hours every day without rest."
        },

        {
            id: 11,
            category: "Career",
            question: "How do I know which career is right for me?",
            answer:
                "Career decisions usually become clearer through exploration. Consider your interests, strengths, values, subjects you enjoy, and the kinds of problems you like solving. Research different careers and speak with people who work in those areas. You do not have to have every part of your future figured out immediately."
        },

        {
            id: 12,
            category: "Career",
            question: "What should I do to prepare for life after graduation?",
            answer:
                "Build both academic knowledge and practical skills. Learn how to communicate well, work with others, solve problems, use relevant digital tools, and present yourself professionally. Look for legitimate opportunities to gain experience, volunteer, learn, or work on meaningful projects while continuing your education."
        }

    ];


    /* ============================================================
       STATE
       ============================================================ */

    let currentFilter = "All";
    let searchTerm = "";
    let showAll = false;


    /* ============================================================
       DOM HELPERS
       ============================================================ */

    function $(id) {
        return document.getElementById(id);
    }


    function escapeHTML(value) {

        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    /* ============================================================
       SCROLL HELPERS
       ============================================================ */

    function initializeScrollButtons() {

        document.querySelectorAll("[data-scroll-to]").forEach(button => {

            button.addEventListener("click", function () {

                const targetId = this.dataset.scrollTo;
                const target = $(targetId);

                if (!target) return;

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            });

        });

    }


    /* ============================================================
       FAQ RENDERING
       ============================================================ */

    function getFilteredFAQs() {

        let results = FAQ_DATA.filter(item => {

            const categoryMatch =
                currentFilter === "All" ||
                item.category === currentFilter;

            const searchableText =
                `${item.question} ${item.answer} ${item.category}`
                    .toLowerCase();

            const searchMatch =
                !searchTerm ||
                searchableText.includes(searchTerm);

            return categoryMatch && searchMatch;

        });


        if (!showAll) {

            results = results.slice(0, 6);

        }

        return results;

    }


    function renderFAQs() {

        const list = $("academicFaqList");
        const emptyState = $("academicEmptyState");

        if (!list) return;

        const results = getFilteredFAQs();

        list.innerHTML = "";


        if (!results.length) {

            if (emptyState) {
                emptyState.hidden = false;
            }

            return;

        }


        if (emptyState) {
            emptyState.hidden = true;
        }


        results.forEach(item => {

            const article = document.createElement("article");

            article.className = "academic-faq-item";

            article.innerHTML = `

                <button
                    type="button"
                    class="academic-faq-question"
                    aria-expanded="false"
                >

                    <span class="faq-question-icon">
                        <i class="fa-solid fa-circle-question"></i>
                    </span>

                    <span class="faq-question-text">
                        ${escapeHTML(item.question)}
                    </span>

                    <i class="fa-solid fa-chevron-down faq-chevron"></i>

                </button>


                <div class="academic-faq-answer">

                    <div class="academic-faq-answer-inner">

                        <div class="academic-faq-answer-content">

                            <span class="faq-category-label">
                                ${escapeHTML(item.category)}
                            </span>

                            <p>
                                ${escapeHTML(item.answer)}
                            </p>

                        </div>

                    </div>

                </div>

            `;


            const questionButton =
                article.querySelector(".academic-faq-question");


            questionButton.addEventListener("click", function () {

                const isOpen =
                    article.classList.contains("open");


                document
                    .querySelectorAll(".academic-faq-item.open")
                    .forEach(openItem => {

                        if (openItem !== article) {

                            openItem.classList.remove("open");

                            const button =
                                openItem.querySelector(
                                    ".academic-faq-question"
                                );

                            if (button) {
                                button.setAttribute(
                                    "aria-expanded",
                                    "false"
                                );
                            }

                        }

                    });


                article.classList.toggle("open", !isOpen);

                this.setAttribute(
                    "aria-expanded",
                    String(!isOpen)
                );

            });


            list.appendChild(article);

        });

    }


    /* ============================================================
       FILTERS
       ============================================================ */

    function initializeFilters() {

        document
            .querySelectorAll(".academic-filter")
            .forEach(button => {

                button.addEventListener("click", function () {

                    currentFilter =
                        this.dataset.filter || "All";

                    showAll = false;

                    document
                        .querySelectorAll(".academic-filter")
                        .forEach(item => {

                            item.classList.toggle(
                                "active",
                                item === this
                            );

                        });

                    renderFAQs();

                });

            });

    }


    /* ============================================================
       CATEGORY CARDS
       ============================================================ */

    function initializeCategoryCards() {

        document
            .querySelectorAll(".academic-category-card")
            .forEach(card => {

                card.addEventListener("click", function () {

                    const category =
                        this.dataset.category || "All";


                    currentFilter = category;

                    showAll = true;


                    document
                        .querySelectorAll(".academic-filter")
                        .forEach(filter => {

                            filter.classList.toggle(
                                "active",
                                filter.dataset.filter === category
                            );

                        });


                    renderFAQs();


                    const faqSection =
                        $("faqSection");

                    if (faqSection) {

                        faqSection.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });

                    }

                });

            });

    }


    /* ============================================================
       SHOW ALL
       ============================================================ */

    function initializeShowAll() {

        const button = $("showAllFaqs");

        if (!button) return;


        button.addEventListener("click", function () {

            showAll = !showAll;

            this.querySelector("span").textContent =
                showAll ? "Show less" : "Show all";


            renderFAQs();

        });

    }


    /* ============================================================
       SEARCH
       ============================================================ */

    function initializeSearch() {

        const input = $("academicSearch");
        const clearButton = $("clearAcademicSearch");

        if (!input) return;


        input.addEventListener("input", function () {

            searchTerm =
                this.value.trim().toLowerCase();


            if (clearButton) {

                clearButton.hidden =
                    !this.value.trim();

            }


            showAll = true;

            renderFAQs();

        });


        if (clearButton) {

            clearButton.addEventListener("click", function () {

                input.value = "";

                searchTerm = "";

                this.hidden = true;

                showAll = false;

                renderFAQs();

                input.focus();

            });

        }

    }


    /* ============================================================
       CHARACTER COUNT
       ============================================================ */

    function initializeCharacterCount() {

        const textarea = $("questionMessage");
        const counter = $("questionCharacterCount");

        if (!textarea || !counter) return;


        textarea.addEventListener("input", function () {

            counter.textContent =
                this.value.length;

        });

    }


    /* ============================================================
       FORM ERROR HELPERS
       ============================================================ */

    function clearFormErrors() {

        [
            "questionNameError",
            "questionPhoneError",
            "questionCategoryError",
            "questionMessageError"
        ].forEach(id => {

            const element = $(id);

            if (element) {
                element.textContent = "";
            }

        });

    }


    function setFieldError(id, message) {

        const element = $(id);

        if (element) {
            element.textContent = message;
        }

    }


    function validateForm() {

        clearFormErrors();

        let valid = true;


        const name =
            $("questionName")?.value.trim() || "";

        const phone =
            $("questionPhone")?.value.trim() || "";

        const category =
            $("questionCategory")?.value || "";

        const question =
            $("questionMessage")?.value.trim() || "";

        const consent =
            $("questionConsent")?.checked || false;


        if (name.length < 2) {

            setFieldError(
                "questionNameError",
                "Please enter your name."
            );

            valid = false;

        }


        if (phone.length < 7) {

            setFieldError(
                "questionPhoneError",
                "Please enter a valid phone or WhatsApp number."
            );

            valid = false;

        }


        if (!category) {

            setFieldError(
                "questionCategoryError",
                "Please select a category."
            );

            valid = false;

        }


        if (question.length < 10) {

            setFieldError(
                "questionMessageError",
                "Please provide a little more detail about your question."
            );

            valid = false;

        }


        if (question.length > ACADEMIC_CONFIG.MAX_QUESTION_LENGTH) {

            setFieldError(
                "questionMessageError",
                "Your question is too long."
            );

            valid = false;

        }


        if (!consent) {

            showFormStatus(
                "Please agree that the Academic Help team may contact you.",
                "error"
            );

            valid = false;

        }


        return valid;

    }


    /* ============================================================
       FORM STATUS
       ============================================================ */

    function showFormStatus(message, type) {

        const status = $("academicFormStatus");

        if (!status) return;

        status.textContent = message;

        status.className =
            `form-status ${type}`;

    }


    /* ============================================================
       BUTTON STATE
       ============================================================ */

    function setSubmitLoading(loading) {

        const button = $("submitQuestionBtn");

        if (!button) return;


        button.disabled = loading;


        const label =
            button.querySelector(".btn-label");

        const loadingElement =
            button.querySelector(".btn-loading");


        if (label) {
            label.hidden = loading;
        }

        if (loadingElement) {
            loadingElement.hidden = !loading;
        }

    }


    /* ============================================================
       SUBMIT QUESTION
       ============================================================ */

    async function submitQuestion(event) {

        event.preventDefault();


        if (!validateForm()) {
            return;
        }


        const payload = {

            action: "submitAcademicQuestion",

            name:
                $("questionName").value.trim(),

            phone:
                $("questionPhone").value.trim(),

            category:
                $("questionCategory").value,

            contactPreference:
                $("questionContact").value,

            question:
                $("questionMessage").value.trim(),

            consent: true

        };


        setSubmitLoading(true);

        showFormStatus("", "");


        try {

            const response = await fetch(
                ACADEMIC_CONFIG.APPS_SCRIPT_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "text/plain;charset=utf-8"
                    },

                    body: JSON.stringify(payload),

                    redirect: "follow"
                }
            );


            const rawText =
                await response.text();


            let result;


            try {

                result =
                    JSON.parse(rawText);

            } catch (parseError) {

                throw new Error(
                    "The server returned an unexpected response."
                );

            }


            if (!result.success) {

                throw new Error(
                    result.message ||
                    "Unable to submit your question."
                );

            }


            const reference =
                result.referenceId ||
                result.requestId ||
                "submitted successfully";


            showFormStatus(
                `Your question has been submitted successfully. Your reference is ${reference}. The Academic Help team will review it.`,
                "success"
            );


            $("academicQuestionForm").reset();


            const counter =
                $("questionCharacterCount");

            if (counter) {
                counter.textContent = "0";
            }


            window.scrollTo({
                top:
                    document
                        .querySelector(".ask-question-section")
                        ?.getBoundingClientRect().top +
                    window.scrollY -
                    80,
                behavior: "smooth"
            });


        } catch (error) {

            console.error(
                "[Academic Help] Submission error:",
                error
            );


            showFormStatus(
                error.message ||
                "Something went wrong while sending your question. Please try again.",
                "error"
            );

        } finally {

            setSubmitLoading(false);

        }

    }


    /* ============================================================
       FORM INITIALIZATION
       ============================================================ */

    function initializeForm() {

        const form =
            $("academicQuestionForm");

        if (!form) return;

        form.addEventListener(
            "submit",
            submitQuestion
        );

    }


    /* ============================================================
       PUBLISHED ANSWERS
       ============================================================ */

    async function loadPublishedAnswers() {

        const container =
            $("publishedAnswerGrid");

        if (!container) return;


        try {

            const url =
                `${ACADEMIC_CONFIG.APPS_SCRIPT_URL}?action=getPublishedAcademicAnswers`;


            const response =
                await fetch(url, {
                    method: "GET",
                    redirect: "follow"
                });


            const rawText =
                await response.text();


            let result;


            try {

                result =
                    JSON.parse(rawText);

            } catch (error) {

                throw new Error(
                    "Invalid server response."
                );

            }


            if (!result.success) {
                throw new Error(
                    result.message ||
                    "Unable to load answers."
                );
            }


            renderPublishedAnswers(
                result.data || []
            );


        } catch (error) {

            console.warn(
                "[Academic Help] Could not load published answers:",
                error
            );


            container.innerHTML = `

                <div class="published-loading">

                    <i class="fa-solid fa-circle-info"></i>

                    <span>
                        Published answers will appear here when available.
                    </span>

                </div>

            `;

        }

    }


    function renderPublishedAnswers(items) {

        const container =
            $("publishedAnswerGrid");

        if (!container) return;


        if (!items.length) {

            container.innerHTML = `

                <div class="published-loading">

                    <i class="fa-solid fa-book-open"></i>

                    <span>
                        Helpful answers from the Academic Help team
                        will appear here.
                    </span>

                </div>

            `;

            return;

        }


        container.innerHTML =
            items.slice(0, 6).map(item => `

                <article class="published-answer-card">

                    <div class="published-answer-category">

                        <i class="fa-solid fa-tag"></i>

                        ${escapeHTML(
                            item.category || "Academic Help"
                        )}

                    </div>

                    <h3>
                        ${escapeHTML(
                            item.question || "Academic Question"
                        )}
                    </h3>

                    <p>
                        ${escapeHTML(
                            item.answer || ""
                        )}
                    </p>

                    <div class="published-answer-footer">

                        <span>
                            <i class="fa-solid fa-circle-check"></i>
                            Answered
                        </span>

                        <span>
                            Academic Help Team
                        </span>

                    </div>

                </article>

            `).join("");

    }


    /* ============================================================
       INITIALIZATION
       ============================================================ */

    function initializeAcademicHelp() {

        renderFAQs();

        initializeScrollButtons();

        initializeFilters();

        initializeCategoryCards();

        initializeShowAll();

        initializeSearch();

        initializeCharacterCount();

        initializeForm();

        loadPublishedAnswers();

        console.log(
            `[AFC Academic Help] Initialized v${ACADEMIC_CONFIG.VERSION}`
        );

    }


    /* ============================================================
       DOM READY / LAYOUT READY
       ============================================================ */

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            initializeAcademicHelp
        );

    } else {

        initializeAcademicHelp();

    }


})();
