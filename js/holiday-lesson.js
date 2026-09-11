/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: holiday-lesson.js
   PURPOSE: HOLIDAY LEARNING LESSON READER
   ============================================================ */

"use strict";


/* ============================================================
   API
============================================================ */

const HOLIDAY_LESSON_API =
    "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";


/* ============================================================
   STATE
============================================================ */

let currentLesson = null;

let currentSections = [];

let lessonId = "";

let isCompleting = false;

let lessonVideoModalOpen = false;


/* ============================================================
   DOM HELPER
============================================================ */

function lessonElement(id) {

    return document.getElementById(id);

}


/* ============================================================
   ESCAPE HTML
============================================================ */

function escapeLessonHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* ============================================================
   SAFE LESSON RESOURCE URL
============================================================ */

function getSafeLessonResourceUrl(value) {

    const raw =
        String(value || "")
            .trim();


    if (!raw) {
        return "";
    }


    try {

        const url =
            new URL(
                raw,
                window.location.origin
            );


        /*
           Only allow normal HTTP/HTTPS
           learning resources.
        */

        if (
            url.protocol !== "https:" &&
            url.protocol !== "http:"
        ) {

            return "";

        }


        return url.href;

    }
    catch (error) {

        console.warn(
            "Invalid Holiday Learning resource URL:",
            error
        );

        return "";

    }

}


/* ============================================================
   YOUTUBE URL DETECTION
============================================================ */

function isYouTubeUrl(value) {

    const raw =
        String(value || "")
            .trim();


    if (!raw) {
        return false;
    }


    try {

        const url =
            new URL(raw);


        const hostname =
            url.hostname
                .toLowerCase()
                .replace(/^www\./, "");


        return (
            hostname === "youtube.com" ||
            hostname === "youtu.be" ||
            hostname.endsWith(".youtube.com")
        );

    }
    catch (error) {

        console.warn(
            "Unable to check YouTube URL:",
            error
        );

        return false;

    }

}


/* ============================================================
   GET YOUTUBE VIDEO ID
============================================================ */

function getYouTubeVideoId(value) {

    const raw =
        String(value || "")
            .trim();


    if (!raw) {
        return "";
    }


    try {

        const url =
            new URL(raw);


        const hostname =
            url.hostname
                .toLowerCase()
                .replace(/^www\./, "");


        /*
           SHORT YOUTUBE URL

           https://youtu.be/VIDEO_ID
        */

        if (
            hostname === "youtu.be"
        ) {

            const id =
                url.pathname
                    .replace(/^\/+/, "")
                    .split("/")[0]
                    .trim();


            return id;

        }


        /*
           NORMAL YOUTUBE URL

           https://www.youtube.com/watch?v=VIDEO_ID
        */

        if (
            hostname === "youtube.com" ||
            hostname.endsWith(".youtube.com")
        ) {

            const watchId =
                url.searchParams.get("v");


            if (watchId) {

                return watchId.trim();

            }


            /*
               YOUTUBE SHORTS

               https://youtube.com/shorts/VIDEO_ID
            */

            const shortsMatch =
                url.pathname.match(
                    /^\/shorts\/([^/?#]+)/
                );


            if (shortsMatch) {

                return shortsMatch[1];

            }


            /*
               YOUTUBE EMBED

               https://youtube.com/embed/VIDEO_ID
            */

            const embedMatch =
                url.pathname.match(
                    /^\/embed\/([^/?#]+)/
                );


            if (embedMatch) {

                return embedMatch[1];

            }

        }

    }
    catch (error) {

        console.warn(
            "Unable to extract YouTube video ID:",
            error
        );

    }


    return "";

}


/* ============================================================
   GET RESPONSE DATA
============================================================ */

function getLessonResponseData(data) {

    if (!data) {
        return null;
    }


    if (data.data) {
        return data.data;
    }


    if (data.result) {
        return data.result;
    }


    return data;

}


/* ============================================================
   GET LESSON ID
============================================================ */

function getRequestedLessonId() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const fromUrl =
        String(
            params.get("lessonId") ||
            params.get("id") ||
            ""
        ).trim();


    if (fromUrl) {
        return fromUrl;
    }


    try {

        /*
           Support both the current reader key
           and the newer hub key.
        */

        const storageKeys = [
            "afc_holiday_selected_lesson",
            "afc_holiday_selected_lesson_v1"
        ];


        for (
            let i = 0;
            i < storageKeys.length;
            i++
        ) {

            const raw =
                sessionStorage.getItem(
                    storageKeys[i]
                );


            if (!raw) {
                continue;
            }


            const saved =
                JSON.parse(raw);


            const savedId =
                String(
                    saved.lessonId ||
                    saved.lesson_id ||
                    saved.id ||
                    ""
                ).trim();


            if (savedId) {
                return savedId;
            }

        }

    }
    catch (error) {

        console.warn(
            "Unable to read saved Holiday Learning lesson.",
            error
        );

    }


    return "";

}


/* ============================================================
   SAVE SELECTED LESSON
============================================================ */

function saveSelectedLesson(lesson) {

    if (!lesson) {
        return;
    }


    try {

        const lessonData = {

            lessonId:
                lesson.lessonId ||
                lesson.lesson_id ||
                lesson.id ||
                "",

            title:
                lesson.title ||
                "",

            category:
                lesson.category ||
                "",

            lessonUrl:
                lesson.lessonUrl ||
                lesson.lesson_url ||
                "",

            savedAt:
                Date.now()

        };


        /*
           Save using the original reader key.
        */

        sessionStorage.setItem(
            "afc_holiday_selected_lesson",
            JSON.stringify(
                lessonData
            )
        );


        /*
           Also keep the hub key synchronized.
        */

        sessionStorage.setItem(
            "afc_holiday_selected_lesson_v1",
            JSON.stringify(
                lessonData
            )
        );

    }
    catch (error) {

        console.warn(
            "Unable to save Holiday Learning lesson.",
            error
        );

    }

}


/* ============================================================
   SHOW / HIDE
============================================================ */

function showReader() {

    const loading =
        lessonElement(
            "lessonLoading"
        );

    const error =
        lessonElement(
            "lessonError"
        );

    const reader =
        lessonElement(
            "lessonReader"
        );

    if (loading) {
        loading.hidden = true;
    }

    if (error) {
        error.hidden = true;
    }

    if (reader) {
        reader.hidden = false;
    }

}


function showLoading() {

    const loading =
        lessonElement(
            "lessonLoading"
        );

    const error =
        lessonElement(
            "lessonError"
        );

    const reader =
        lessonElement(
            "lessonReader"
        );

    const completed =
        lessonElement(
            "lessonCompleted"
        );

    if (loading) {
        loading.hidden = false;
    }

    if (error) {
        error.hidden = true;
    }

    if (reader) {
        reader.hidden = true;
    }

    if (completed) {
        completed.hidden = true;
    }

}


function showError(message) {

    const loading =
        lessonElement(
            "lessonLoading"
        );

    const error =
        lessonElement(
            "lessonError"
        );

    const reader =
        lessonElement(
            "lessonReader"
        );

    if (loading) {
        loading.hidden = true;
    }

    if (reader) {
        reader.hidden = true;
    }

    if (error) {

        error.hidden = false;

        const messageElement =
            lessonElement(
                "lessonErrorMessage"
            );

        if (messageElement) {

            messageElement.textContent =
                message ||
                "Please return to Holiday Learning and try again.";

        }

    }

}


/* ============================================================
   LOAD ALL HOLIDAY LESSONS
============================================================ */

async function fetchHolidayLessons() {

    const response =
        await fetch(
            `${HOLIDAY_LESSON_API}?action=getHolidayLessons`,
            {
                method: "GET",
                cache: "no-store"
            }
        );


    if (!response.ok) {

        throw new Error(
            `Unable to contact the learning service. HTTP ${response.status}`
        );

    }


    const data =
        await response.json();


    if (
        data &&
        data.success === false
    ) {

        throw new Error(
            data.message ||
            "The Holiday Learning lessons could not be loaded."
        );

    }


    return getLessonResponseData(data);

}


/* ============================================================
   FIND LESSON
============================================================ */

function findLessonInResponse(
    responseData,
    requestedId
) {

    if (!responseData) {
        return null;
    }


    let lessons = [];


    if (
        Array.isArray(
            responseData
        )
    ) {

        lessons =
            responseData;

    }
    else if (
        Array.isArray(
            responseData.lessons
        )
    ) {

        lessons =
            responseData.lessons;

    }
    else if (
        Array.isArray(
            responseData.data
        )
    ) {

        lessons =
            responseData.data;

    }


    const wanted =
        String(
            requestedId
        ).trim();


    if (!wanted) {
        return null;
    }


    const found =
        lessons.find(
            function (lesson) {

                const id =
                    String(
                        lesson.lessonId ||
                        lesson.lesson_id ||
                        lesson.id ||
                        ""
                    ).trim();


                return id === wanted;

            }
        );


    return found || null;

}


/* ============================================================
   LOAD LESSON
============================================================ */

async function loadLesson() {

    showLoading();


    lessonId =
        getRequestedLessonId();


    if (!lessonId) {

        showError(
            "This lesson could not be identified. Please return to Holiday Learning and select a lesson again."
        );

        return;

    }


    try {

        const responseData =
            await fetchHolidayLessons();


        const lesson =
            findLessonInResponse(
                responseData,
                lessonId
            );


        if (!lesson) {

            throw new Error(
                "The selected lesson could not be found."
            );

        }


        currentLesson =
            lesson;


        saveSelectedLesson(
            lesson
        );


        renderLesson(
            lesson
        );


        showReader();


        setupReadingProgress();


        window.scrollTo({
            top: 0,
            behavior: "instant"
        });

    }
    catch (error) {

        console.error(
            "Holiday lesson loading error:",
            error
        );


        showError(
            error.message ||
            "Unable to load this lesson right now."
        );

    }

}


/* ============================================================
   GET CONTENT
============================================================ */

function getLessonContent(
    lesson
) {

    if (!lesson) {
        return "";
    }


    const candidates = [

        lesson.content,

        lesson.lesson_content,

        lesson.lessonContent,

        lesson.body,

        lesson.text,

        lesson.description_long,

        lesson.description

    ];


    for (
        let i = 0;
        i < candidates.length;
        i++
    ) {

        if (
            typeof candidates[i] ===
                "string" &&
            candidates[i].trim()
        ) {

            return candidates[i].trim();

        }

    }


    return "";

}


/* ============================================================
   FORMAT CONTENT
============================================================ */

function formatLessonContent(
    content
) {

    if (!content) {

        return `
            <div class="lesson-content-empty">
                <h2>Lesson content coming soon</h2>

                <p>
                    This lesson has been added to the Holiday
                    Learning library, but its learning material
                    has not yet been published.
                </p>
            </div>
        `;

    }


    if (
        /<(h2|h3|p|ul|ol|li|strong|blockquote|br)\b/i.test(
            content
        )
    ) {

        return sanitizeLessonHTML(
            content
        );

    }


    const escaped =
        escapeLessonHTML(
            content
        );


    return escaped
        .split(
            /\n\s*\n/
        )
        .map(
            function (paragraph) {

                const text =
                    paragraph
                        .trim()
                        .replace(
                            /\n/g,
                            "<br>"
                        );


                if (!text) {
                    return "";
                }


                return `
                    <p>
                        ${text}
                    </p>
                `;

            }
        )
        .join("");

}


/* ============================================================
   SIMPLE HTML SANITIZER
============================================================ */

function sanitizeLessonHTML(
    html
) {

    const template =
        document.createElement(
            "template"
        );


    template.innerHTML =
        String(html);


    const allowedTags = new Set([
        "P",
        "H2",
        "H3",
        "UL",
        "OL",
        "LI",
        "STRONG",
        "B",
        "EM",
        "I",
        "BLOCKQUOTE",
        "BR"
    ]);


    const walker =
        document.createTreeWalker(
            template.content,
            NodeFilter.SHOW_ELEMENT
        );


    const elements = [];


    while (
        walker.nextNode()
    ) {

        elements.push(
            walker.currentNode
        );

    }


    elements.forEach(
        function (element) {

            if (
                !allowedTags.has(
                    element.tagName
                )
            ) {

                const fragment =
                    document.createDocumentFragment();


                while (
                    element.firstChild
                ) {

                    fragment.appendChild(
                        element.firstChild
                    );

                }


                element.replaceWith(
                    fragment
                );


                return;

            }


            Array.from(
                element.attributes
            ).forEach(
                function (attribute) {

                    element.removeAttribute(
                        attribute.name
                    );

                }
            );

        }
    );


    return template.innerHTML;

}


/* ============================================================
   RENDER LESSON RESOURCE
============================================================ */

function renderLessonResource(lesson) {

    const resource =
        document.getElementById(
            "lessonResource"
        );

    const resourceIcon =
        document.getElementById(
            "lessonResourceIcon"
        );

    const resourceTitle =
        document.getElementById(
            "lessonResourceTitle"
        );

    const resourceDescription =
        document.getElementById(
            "lessonResourceDescription"
        );

    const resourceButton =
        document.getElementById(
            "lessonResourceLink"
        );

    const resourceButtonText =
        document.getElementById(
            "lessonResourceButtonText"
        );


    if (!resource) {

        console.warn(
            "lessonResource element was not found in holiday-lesson.html."
        );

        return;

    }


    const lessonUrl =
        getSafeLessonResourceUrl(
            lesson &&
            (
                lesson.lessonUrl ||
                lesson.lesson_url ||
                ""
            )
        );


    if (!lessonUrl) {

        resource.hidden = true;

        return;

    }


    const isYouTube =
        isYouTubeUrl(
            lessonUrl
        );


    resource.hidden = false;


    /* --------------------------------------------------------
       YOUTUBE RESOURCE
    -------------------------------------------------------- */

    if (isYouTube) {

        if (resourceIcon) {

            resourceIcon.className =
                "fa-brands fa-youtube";

        }


        if (resourceTitle) {

            resourceTitle.textContent =
                "Watch the lesson video";

        }


        if (resourceDescription) {

            resourceDescription.textContent =
                "Watch the video here without leaving the AFC Youth Portal.";

        }


        if (resourceButtonText) {

            resourceButtonText.textContent =
                "Watch Video";

        }


        if (resourceButton) {

            /*
               It is a button even if the HTML
               element was originally an <a>.
            */

            resourceButton.removeAttribute(
                "href"
            );

            resourceButton.removeAttribute(
                "target"
            );

            resourceButton.removeAttribute(
                "rel"
            );

            resourceButton.setAttribute(
                "type",
                "button"
            );


            resourceButton.onclick =
                function (event) {

                    event.preventDefault();

                    openLessonVideoModal(
                        lessonUrl,
                        lesson &&
                        lesson.title
                            ? lesson.title
                            : "Lesson video"
                    );

                };

        }


        return;

    }


    /* --------------------------------------------------------
       NORMAL EXTERNAL RESOURCE
    -------------------------------------------------------- */

    if (resourceIcon) {

        resourceIcon.className =
            "fa-solid fa-arrow-up-right-from-square";

    }


    if (resourceTitle) {

        resourceTitle.textContent =
            "Open learning resource";

    }


    if (resourceDescription) {

        resourceDescription.textContent =
            "This lesson includes an additional learning resource.";

    }


    if (resourceButtonText) {

        resourceButtonText.textContent =
            "Open Resource";

    }


    if (resourceButton) {

        resourceButton.href =
            lessonUrl;

        resourceButton.target =
            "_blank";

        resourceButton.rel =
            "noopener noreferrer";

        resourceButton.onclick =
            null;

    }

}


/* ============================================================
   OPEN YOUTUBE VIDEO MODAL
============================================================ */

function openLessonVideoModal(
    videoUrl,
    lessonTitle
) {

    const modal =
        document.getElementById(
            "lessonVideoModal"
        );

    const playerContainer =
        document.getElementById(
            "lessonVideoPlayerContainer"
        );

    const modalTitle =
        document.getElementById(
            "lessonVideoModalTitle"
        );

    const modalLessonTitle =
        document.getElementById(
            "lessonVideoModalLessonTitle"
        );


    if (
        !modal ||
        !playerContainer
    ) {

        console.error(
            "Holiday Learning video modal is missing from holiday-lesson.html."
        );

        return;

    }


    const videoId =
        getYouTubeVideoId(
            videoUrl
        );


    if (!videoId) {

        console.error(
            "Invalid YouTube video URL:",
            videoUrl
        );

        return;

    }


    /*
       Remove any previous iframe.
    */

    playerContainer.innerHTML =
        "";


    /*
       Create YouTube iframe.
    */

    const iframe =
        document.createElement(
            "iframe"
        );


    iframe.src =
        "https://www.youtube.com/embed/" +
        encodeURIComponent(
            videoId
        ) +
        "?playsinline=1&rel=0";


    iframe.title =
        lessonTitle ||
        "Lesson video";


    iframe.setAttribute(
        "allow",
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    );


    iframe.setAttribute(
        "allowfullscreen",
        ""
    );


    iframe.setAttribute(
        "loading",
        "eager"
    );


    iframe.setAttribute(
        "referrerpolicy",
        "strict-origin-when-cross-origin"
    );


    playerContainer.appendChild(
        iframe
    );


    /*
       Update modal title.
    */

    const safeTitle =
        String(
            lessonTitle ||
            "Watch the lesson"
        ).trim();


    if (modalTitle) {

        modalTitle.textContent =
            "Watch the lesson";

    }


    if (modalLessonTitle) {

        modalLessonTitle.textContent =
            safeTitle ||
            "Lesson video";

    }


    /*
       Show modal.
    */

    modal.hidden =
        false;


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "lesson-video-modal-open"
    );


    lessonVideoModalOpen =
        true;


    /*
       Prevent background page
       from moving.
    */

    document.body.style.overflow =
        "hidden";


    /*
       Focus close button.
    */

    const closeButton =
        document.getElementById(
            "lessonVideoModalClose"
        );


    if (closeButton) {

        setTimeout(
            function () {

                closeButton.focus();

            },
            50
        );

    }

}


/* ============================================================
   CLOSE YOUTUBE VIDEO MODAL
============================================================ */

function closeLessonVideoModal() {

    const modal =
        document.getElementById(
            "lessonVideoModal"
        );

    const playerContainer =
        document.getElementById(
            "lessonVideoPlayerContainer"
        );


    if (!modal) {
        return;
    }


    /*
       Removing the iframe completely
       stops the YouTube player.
    */

    if (playerContainer) {

        playerContainer.innerHTML =
            "";

    }


    modal.hidden =
        true;


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.classList.remove(
        "lesson-video-modal-open"
    );


    document.body.style.overflow =
        "";


    lessonVideoModalOpen =
        false;

}


/* ============================================================
   VIDEO MODAL EVENTS
============================================================ */

function initialiseLessonVideoModal() {

    const closeButton =
        document.getElementById(
            "lessonVideoModalClose"
        );


    const backdrop =
        document.getElementById(
            "lessonVideoModalBackdrop"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeLessonVideoModal
        );

    }


    if (backdrop) {

        backdrop.addEventListener(
            "click",
            closeLessonVideoModal
        );

    }


    /*
       Escape closes the modal.
    */

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape" &&
                lessonVideoModalOpen
            ) {

                closeLessonVideoModal();

            }

        }
    );

}


/* ============================================================
   RENDER LESSON
============================================================ */

function renderLesson(
    lesson
) {

    const title =
        String(
            lesson.title ||
            "Untitled Lesson"
        ).trim();


    const description =
        String(
            lesson.description ||
            lesson.summary ||
            ""
        ).trim();


    const category =
        String(
            lesson.category ||
            lesson.category_name ||
            "Holiday Learning"
        ).trim();


    const level =
        String(
            lesson.level ||
            lesson.difficulty ||
            "Beginner"
        ).trim();


    const duration =
        String(
            lesson.duration ||
            lesson.duration_minutes ||
            "Self-paced"
        ).trim();


    const price =
        String(
            lesson.price ||
            lesson.cost ||
            ""
        ).trim();


    const titleElement =
        lessonElement(
            "lessonTitle"
        );


    const descriptionElement =
        lessonElement(
            "lessonDescription"
        );


    const categoryElement =
        lessonElement(
            "lessonCategory"
        );


    const levelElement =
        lessonElement(
            "lessonLevel"
        );


    const metaLevelElement =
        lessonElement(
            "lessonMetaLevel"
        );


    const durationElement =
        lessonElement(
            "lessonDuration"
        );


    const priceElement =
        lessonElement(
            "lessonPrice"
        );


    if (titleElement) {

        titleElement.textContent =
            title;

    }


    if (descriptionElement) {

        if (description) {

            descriptionElement.textContent =
                description;

            descriptionElement.style.display =
                "";

        }
        else {

            descriptionElement.style.display =
                "none";

        }

    }


    if (categoryElement) {

        categoryElement.textContent =
            category;

    }


    if (levelElement) {

        levelElement.textContent =
            level;

    }


    if (metaLevelElement) {

        metaLevelElement.textContent =
            level;

    }


    if (durationElement) {

        durationElement.textContent =
            duration;

    }


    if (priceElement) {

        priceElement.textContent =
            price
                ? price
                : "Free";

    }


    const content =
        getLessonContent(
            lesson
        );


    const contentElement =
        lessonElement(
            "lessonContent"
        );


    if (contentElement) {

        contentElement.innerHTML =
            formatLessonContent(
                content
            );

    }


    /*
       Render optional learning resource.
    */

    renderLessonResource(
        lesson
    );


    /*
       Build section navigation.
    */

    buildSectionNavigation();


    /*
       Update page title.
    */

    document.title =
        `${title} | AFC Isiu Youth Portal`;

}


/* ============================================================
   BUILD SECTION NAVIGATION
============================================================ */

function buildSectionNavigation() {

    const content =
        lessonElement(
            "lessonContent"
        );


    const navigation =
        lessonElement(
            "lessonSectionList"
        );


    if (
        !content ||
        !navigation
    ) {

        return;

    }


    const headings =
        Array.from(
            content.querySelectorAll(
                "h2"
            )
        );


    currentSections =
        headings;


    if (!headings.length) {

        navigation.innerHTML = `
            <div class="lesson-section-link">
                <span class="lesson-section-number">
                    •
                </span>

                <strong>
                    Lesson reading
                </strong>
            </div>
        `;

        return;

    }


    navigation.innerHTML =
        headings
            .map(
                function (
                    heading,
                    index
                ) {

                    const id =
                        `lesson-section-${index + 1}`;


                    heading.id =
                        id;


                    return `
                        <a
                            href="#${id}"
                            class="lesson-section-link"
                        >

                            <span
                                class="lesson-section-number"
                            >
                                ${index + 1}
                            </span>

                            <strong>
                                ${escapeLessonHTML(
                                    heading.textContent
                                )}
                            </strong>

                        </a>
                    `;

                }
            )
            .join("");


    navigation
        .querySelectorAll(
            "a"
        )
        .forEach(
            function (link) {

                link.addEventListener(
                    "click",
                    function () {

                        const target =
                            document.querySelector(
                                link.getAttribute(
                                    "href"
                                )
                            );


                        if (target) {

                            target.scrollIntoView({
                                behavior:
                                    "smooth",

                                block:
                                    "start"
                            });

                        }

                    }
                );

            }
        );

}


/* ============================================================
   READING PROGRESS
============================================================ */

function setupReadingProgress() {

    const fill =
        lessonElement(
            "readingProgressFill"
        );


    const text =
        lessonElement(
            "readingProgressText"
        );


    const content =
        lessonElement(
            "lessonContent"
        );


    if (
        !fill ||
        !text ||
        !content
    ) {

        return;

    }


    function updateProgress() {

        const rect =
            content.getBoundingClientRect();


        const contentTop =
            window.scrollY +
            rect.top;


        const contentHeight =
            content.offsetHeight;


        const viewportHeight =
            window.innerHeight;


        const maximum =
            contentHeight -
            viewportHeight;


        let progress =
            0;


        if (maximum > 0) {

            progress =
                (
                    window.scrollY -
                    contentTop
                ) /
                maximum;

        }


        progress =
            Math.max(
                0,
                Math.min(
                    1,
                    progress
                )
            );


        const percentage =
            Math.round(
                progress * 100
            );


        fill.style.width =
            `${percentage}%`;


        text.textContent =
            `${percentage}%`;

    }


    window.addEventListener(
        "scroll",
        updateProgress,
        {
            passive: true
        }
    );


    window.addEventListener(
        "resize",
        updateProgress
    );


    updateProgress();

}


/* ============================================================
   SAVE PROGRESS
============================================================ */

async function saveHolidayProgress(
    status
) {

    try {

        const payload = {

            lessonId:
                currentLesson?.lessonId ||
                currentLesson?.lesson_id ||
                currentLesson?.id ||
                lessonId,

            lesson_id:
                currentLesson?.lessonId ||
                currentLesson?.lesson_id ||
                currentLesson?.id ||
                lessonId,

            status:
                status || "completed"

        };


        const response =
            await fetch(
                HOLIDAY_LESSON_API,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            action:
                                "saveHolidayProgress",

                            data:
                                payload
                        })
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        if (
            data &&
            data.success === false
        ) {

            throw new Error(
                data.message ||
                "Progress could not be saved."
            );

        }


        return true;

    }
    catch (error) {

        console.warn(
            "Holiday progress save warning:",
            error
        );


        try {

            localStorage.setItem(
                `afc_holiday_progress_${lessonId}`,
                JSON.stringify({

                    lessonId:
                        lessonId,

                    status:
                        status ||
                        "completed",

                    completedAt:
                        new Date().toISOString()

                })
            );

        }
        catch (storageError) {

            console.warn(
                "Unable to save local lesson progress.",
                storageError
            );

        }


        return false;

    }

}


/* ============================================================
   COMPLETE LESSON
============================================================ */

async function completeLesson() {

    if (
        isCompleting ||
        !currentLesson
    ) {

        return;

    }


    isCompleting =
        true;


    const button =
        lessonElement(
            "completeLessonButton"
        );


    const finishButton =
        lessonElement(
            "lessonFinishButton"
        );


    if (button) {

        button.disabled =
            true;

        button.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Saving...
        `;

    }


    if (finishButton) {

        finishButton.disabled =
            true;

    }


    await saveHolidayProgress(
        "completed"
    );


    const reader =
        lessonElement(
            "lessonReader"
        );


    const completed =
        lessonElement(
            "lessonCompleted"
        );


    const completedMessage =
        lessonElement(
            "lessonCompletedMessage"
        );


    const title =
        currentLesson.title ||
        "This lesson";


    if (completedMessage) {

        completedMessage.textContent =
            `${title} has been marked as completed.`;

    }


    if (reader) {
        reader.hidden = true;
    }


    if (completed) {
        completed.hidden = false;
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    isCompleting =
        false;

}


/* ============================================================
   BUTTONS
============================================================ */

function setupLessonListeners() {

    const completeButton =
        lessonElement(
            "completeLessonButton"
        );


    const finishButton =
        lessonElement(
            "lessonFinishButton"
        );


    const readAgainButton =
        lessonElement(
            "readAgainButton"
        );


    if (completeButton) {

        completeButton.addEventListener(
            "click",
            completeLesson
        );

    }


    if (finishButton) {

        finishButton.addEventListener(
            "click",
            completeLesson
        );

    }


    if (readAgainButton) {

        readAgainButton.addEventListener(
            "click",
            function () {

                const completed =
                    lessonElement(
                        "lessonCompleted"
                    );


                const reader =
                    lessonElement(
                        "lessonReader"
                    );


                if (completed) {
                    completed.hidden = true;
                }


                if (reader) {
                    reader.hidden = false;
                }


                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

            }
        );

    }

}


/* ============================================================
   INITIALIZE
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        /*
           IMPORTANT:
           The previous version defined the modal
           initializer but never called it.
        */

        initialiseLessonVideoModal();


        setupLessonListeners();


        loadLesson();

    }
);
 
