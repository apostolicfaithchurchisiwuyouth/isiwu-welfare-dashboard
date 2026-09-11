/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: holiday-lesson.js
   PURPOSE: HOLIDAY LEARNING LESSON READER

   FEATURES:
   - Loads lesson from Holiday Learning backend
   - Supports current single Lesson URL
   - Supports multiple resources when backend provides them
   - YouTube modal player
   - YouTube video completion detection
   - Reading progress tracking
   - Dynamic "In this lesson" navigation
   - Lesson completion
   - Session fallback
   - Preserves existing IDs / classes / UI
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

let youtubePlayer = null;
let youtubeApiPromise = null;

let activeVideoResource = null;

let completedVideoResources = new Set();

let readingProgress = 0;


/* ============================================================
   DOM HELPERS
   ============================================================ */

function getElement(id) {
    return document.getElementById(id);
}


/* ============================================================
   SAFE URL
   ============================================================ */

function getSafeLessonResourceUrl(value) {

    const url = String(value || "").trim();

    if (!url) {
        return "";
    }

    try {

        const parsed = new URL(url, window.location.origin);

        if (
            parsed.protocol !== "http:" &&
            parsed.protocol !== "https:"
        ) {
            return "";
        }

        return parsed.href;

    } catch (error) {

        return "";
    }
}


/* ============================================================
   YOUTUBE URL CHECK
   ============================================================ */

function isYouTubeUrl(value) {

    const url = String(value || "").trim();

    if (!url) {
        return false;
    }

    try {

        const parsed = new URL(url);

        const hostname =
            parsed.hostname
                .toLowerCase()
                .replace(/^www\./, "");

        return (
            hostname === "youtube.com" ||
            hostname === "youtu.be" ||
            hostname.endsWith(".youtube.com")
        );

    } catch (error) {

        return false;
    }
}


/* ============================================================
   GET YOUTUBE VIDEO ID
   ============================================================ */

function getYouTubeVideoId(value) {

    const url = String(value || "").trim();

    if (!url) {
        return "";
    }

    try {

        const parsed = new URL(url);

        const hostname =
            parsed.hostname
                .toLowerCase()
                .replace(/^www\./, "");

        /* youtu.be/VIDEO_ID */
        if (hostname === "youtu.be") {

            return parsed.pathname
                .replace(/^\/+/, "")
                .split("/")[0]
                .trim();

        }


        /* youtube.com/watch?v=VIDEO_ID */

        if (
            hostname === "youtube.com" ||
            hostname.endsWith(".youtube.com")
        ) {

            const watchId =
                parsed.searchParams.get("v");

            if (watchId) {
                return watchId.trim();
            }


            /* youtube.com/shorts/VIDEO_ID */

            const shortsMatch =
                parsed.pathname.match(
                    /^\/shorts\/([^/?#]+)/
                );

            if (shortsMatch) {
                return shortsMatch[1];
            }


            /* youtube.com/embed/VIDEO_ID */

            const embedMatch =
                parsed.pathname.match(
                    /^\/embed\/([^/?#]+)/
                );

            if (embedMatch) {
                return embedMatch[1];
            }
        }

    } catch (error) {

        return "";
    }

    return "";
}


/* ============================================================
   LOAD YOUTUBE IFRAME API
   ============================================================ */

function loadYouTubeIframeAPI() {

    if (
        window.YT &&
        window.YT.Player
    ) {

        return Promise.resolve();
    }


    if (youtubeApiPromise) {

        return youtubeApiPromise;
    }


    youtubeApiPromise = new Promise((resolve, reject) => {

        const previousReady =
            window.onYouTubeIframeAPIReady;


        window.onYouTubeIframeAPIReady =
            function () {

                if (
                    typeof previousReady === "function"
                ) {

                    try {
                        previousReady();
                    } catch (error) {
                        console.warn(
                            "Previous YouTube callback failed:",
                            error
                        );
                    }
                }

                resolve();
            };


        const existingScript =
            document.querySelector(
                'script[src="https://www.youtube.com/iframe_api"]'
            );


        if (existingScript) {

            return;
        }


        const script =
            document.createElement("script");

        script.src =
            "https://www.youtube.com/iframe_api";

        script.async = true;

        script.onerror = function () {

            youtubeApiPromise = null;

            reject(
                new Error(
                    "Unable to load YouTube player."
                )
            );
        };


        document.head.appendChild(script);

    });


    return youtubeApiPromise;
}


/* ============================================================
   RESPONSE DATA HELPER
   ============================================================ */

function getLessonResponseData(response) {

    if (!response) {
        return null;
    }


    if (
        response.data &&
        typeof response.data === "object"
    ) {

        return response.data;
    }


    return response;
}


/* ============================================================
   GET REQUESTED LESSON ID
   ============================================================ */

function getRequestedLessonId() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const fromUrl =
        params.get("lessonId") ||
        params.get("id");


    if (fromUrl) {

        return String(fromUrl).trim();
    }


    const sessionKeys = [
        "afc_holiday_selected_lesson",
        "afc_holiday_selected_lesson_v1"
    ];


    for (const key of sessionKeys) {

        try {

            const raw =
                sessionStorage.getItem(key);

            if (!raw) {
                continue;
            }


            const parsed =
                JSON.parse(raw);


            if (
                parsed &&
                typeof parsed === "object"
            ) {

                const savedId =
                    parsed.id ||
                    parsed.lessonId ||
                    parsed.lesson_id;


                if (savedId) {

                    return String(savedId).trim();
                }
            }

        } catch (error) {

            console.warn(
                "Unable to read saved holiday lesson:",
                error
            );
        }
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


    const payload =
        JSON.stringify(lesson);


    const keys = [
        "afc_holiday_selected_lesson",
        "afc_holiday_selected_lesson_v1"
    ];


    keys.forEach((key) => {

        try {

            sessionStorage.setItem(
                key,
                payload
            );

        } catch (error) {

            console.warn(
                "Unable to save lesson:",
                error
            );
        }
    });
}


/* ============================================================
   FETCH HOLIDAY LESSONS
   ============================================================ */

async function fetchHolidayLessons() {

    const url =
        HOLIDAY_LESSON_API +
        "?action=getHolidayLessons";


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
            "Unable to load Holiday Learning lessons."
        );
    }


    const data =
        await response.json();


    return getLessonResponseData(data);
}


/* ============================================================
   FIND LESSON
   ============================================================ */

function findLessonInResponse(data, requestedId) {

    if (!data) {
        return null;
    }


    let lessons = [];


    if (Array.isArray(data)) {

        lessons = data;

    } else if (
        Array.isArray(data.lessons)
    ) {

        lessons = data.lessons;

    } else if (
        data.data &&
        Array.isArray(data.data.lessons)
    ) {

        lessons = data.data.lessons;
    }


    const wanted =
        String(requestedId || "")
            .trim()
            .toLowerCase();


    return (
        lessons.find((lesson) => {

            const id =
                String(
                    lesson.id ||
                    lesson.lessonId ||
                    lesson.lesson_id ||
                    ""
                )
                .trim()
                .toLowerCase();


            return id === wanted;

        }) || null
    );
}


/* ============================================================
   GET LESSON CONTENT
   ============================================================ */

function getLessonContent(lesson) {

    if (!lesson) {
        return "";
    }


    return String(
        lesson.content ||
        lesson.lesson_content ||
        lesson.lessonContent ||
        lesson.body ||
        lesson.text ||
        lesson.description_long ||
        lesson.description ||
        ""
    ).trim();
}


/* ============================================================
   ESCAPE HTML
   ============================================================ */

function escapeHTML(value) {

    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ============================================================
   SANITIZE LESSON HTML
   ============================================================ */

function sanitizeLessonHTML(html) {

    const container =
        document.createElement("div");

    container.innerHTML = html;


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


    container
        .querySelectorAll("*")
        .forEach((element) => {

            if (!allowedTags.has(element.tagName)) {

                const parent =
                    element.parentNode;

                if (!parent) {
                    return;
                }


                while (element.firstChild) {

                    parent.insertBefore(
                        element.firstChild,
                        element
                    );
                }


                parent.removeChild(element);

                return;
            }


            Array.from(
                element.attributes
            ).forEach((attribute) => {

                element.removeAttribute(
                    attribute.name
                );
            });
        });


    return container.innerHTML;
}


/* ============================================================
   FORMAT LESSON CONTENT
   ============================================================ */

function formatLessonContent(content) {

    if (!content) {

        return `
            <div class="lesson-content-empty">
                <i class="fa-solid fa-book-open"></i>
                <p>
                    Lesson content is not available yet.
                </p>
            </div>
        `;
    }


    /*
       If backend content already contains HTML
       headings/paragraphs/lists, preserve the structure.
    */

    if (/<[a-z][\s\S]*>/i.test(content)) {

        return sanitizeLessonHTML(content);
    }


    /*
       Plain text fallback.
    */

    const lines =
        content
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);


    if (!lines.length) {

        return `
            <div class="lesson-content-empty">
                <i class="fa-solid fa-book-open"></i>
                <p>
                    Lesson content is not available yet.
                </p>
            </div>
        `;
    }


    return lines
        .map((line) => {

            return `
                <p>
                    ${escapeHTML(line)}
                </p>
            `;

        })
        .join("");
}


/* ============================================================
   NORMALISE LESSON RESOURCES
   ============================================================ */

function getLessonResources(lesson) {

    if (!lesson) {
        return [];
    }


    let resources =
        lesson.resources ||
        lesson.lessonResources ||
        lesson.lesson_resources ||
        lesson.resourceList ||
        lesson.resource_list;


    /*
       Backend may return resources as JSON text.
    */

    if (typeof resources === "string") {

        const trimmed =
            resources.trim();


        if (trimmed) {

            try {

                const parsed =
                    JSON.parse(trimmed);


                if (Array.isArray(parsed)) {

                    resources = parsed;
                }

            } catch (error) {

                /*
                   Ignore invalid JSON.
                   We will fall back to lessonUrl.
                */
            }
        }
    }


    /*
       Multiple resource array.
    */

    if (Array.isArray(resources)) {

        return resources
            .map((resource, index) => {

                if (
                    typeof resource === "string"
                ) {

                    return {
                        id:
                            "resource-" +
                            (index + 1),

                        title:
                            "Learning resource " +
                            (index + 1),

                        description:
                            "Open this learning resource.",

                        url:
                            resource.trim(),

                        type:
                            isYouTubeUrl(resource)
                                ? "video"
                                : "link"
                    };
                }


                const url =
                    resource.url ||
                    resource.lessonUrl ||
                    resource.lesson_url ||
                    resource.resourceUrl ||
                    resource.resource_url ||
                    "";


                return {

                    id:
                        resource.id ||
                        resource.resourceId ||
                        resource.resource_id ||
                        "resource-" +
                        (index + 1),

                    title:
                        resource.title ||
                        resource.name ||
                        "Learning resource " +
                        (index + 1),

                    description:
                        resource.description ||
                        resource.details ||
                        "Open this learning resource.",

                    url:
                        String(url).trim(),

                    type:
                        resource.type ||
                        (
                            isYouTubeUrl(url)
                                ? "video"
                                : "link"
                        )
                };

            })
            .filter((resource) => resource.url);
    }


    /*
       Backward compatibility:
       Existing Lesson URL column.
    */

    const singleUrl =
        String(
            lesson.lessonUrl ||
            lesson.lesson_url ||
            ""
        ).trim();


    if (singleUrl) {

        return [
            {
                id: "resource-1",

                title:
                    isYouTubeUrl(singleUrl)
                        ? "Watch the lesson"
                        : "Open learning resource",

                description:
                    isYouTubeUrl(singleUrl)
                        ? "Watch the lesson video, then return here to continue."
                        : "Open this external learning resource.",

                url: singleUrl,

                type:
                    isYouTubeUrl(singleUrl)
                        ? "video"
                        : "link"
            }
        ];
    }


    return [];
}


/* ============================================================
   RENDER LESSON RESOURCES
   ============================================================ */

function renderLessonResource(lesson) {

    const resourceSection =
        getElement("lessonResource");

    const resourceList =
        getElement("lessonResourceList");


    /*
       Preserve the current HTML fallback
       if lessonResourceList does not exist yet.
    */

    if (!resourceSection) {
        return;
    }


    const resources =
        getLessonResources(lesson);


    if (!resources.length) {

        resourceSection.hidden = true;

        if (resourceList) {
            resourceList.innerHTML = "";
        }

        return;
    }


    resourceSection.hidden = false;


    /*
       New multi-resource layout.
    */

    if (resourceList) {

        resourceList.innerHTML =
            resources
                .map((resource, index) => {

                    const safeUrl =
                        getSafeLessonResourceUrl(
                            resource.url
                        );


                    if (!safeUrl) {
                        return "";
                    }


                    const isVideo =
                        isYouTubeUrl(
                            safeUrl
                        );


                    const icon =
                        isVideo
                            ? "fa-solid fa-play"
                            : "fa-solid fa-arrow-up-right-from-square";


                    const buttonText =
                        isVideo
                            ? "Watch Video"
                            : "Open Resource";


                    const resourceId =
                        escapeHTML(
                            String(
                                resource.id ||
                                "resource-" +
                                (index + 1)
                            )
                        );


                    const title =
                        escapeHTML(
                            resource.title ||
                            (
                                isVideo
                                    ? "Watch the lesson"
                                    : "Learning resource"
                            )
                        );


                    const description =
                        escapeHTML(
                            resource.description ||
                            (
                                isVideo
                                    ? "Watch this lesson video, then return here to continue."
                                    : "Open this external learning resource."
                            )
                        );


                    const completed =
                        completedVideoResources.has(
                            resourceId
                        );


                    return `
                        <article
                            class="lesson-resource-item"
                            data-resource-id="${resourceId}"
                        >

                            <div class="lesson-resource-icon">
                                <i class="${icon}"></i>
                            </div>


                            <div class="lesson-resource-copy">

                                <span>
                                    ${isVideo ? "VIDEO LESSON" : "LEARNING RESOURCE"}
                                </span>

                                <h2>
                                    ${title}
                                </h2>

                                <p>
                                    ${description}
                                </p>


                                ${
                                    isVideo && completed
                                        ? `
                                            <small class="lesson-resource-complete">
                                                <i class="fa-solid fa-circle-check"></i>
                                                Video completed
                                            </small>
                                        `
                                        : ""
                                }

                            </div>


                            ${
                                isVideo
                                    ? `
                                        <button
                                            type="button"
                                            class="lesson-resource-button"
                                            data-video-url="${escapeHTML(safeUrl)}"
                                            data-resource-id="${resourceId}"
                                            data-resource-title="${title}"
                                        >
                                            <span>
                                                ${buttonText}
                                            </span>

                                            <i class="fa-solid fa-play"></i>
                                        </button>
                                    `
                                    : `
                                        <a
                                            href="${escapeHTML(safeUrl)}"
                                            class="lesson-resource-button"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <span>
                                                ${buttonText}
                                            </span>

                                            <i class="fa-solid fa-arrow-up-right-from-square"></i>
                                        </a>
                                    `
                            }

                        </article>
                    `;

                })
                .join("");


        bindResourceButtons();

        return;
    }


    /*
       Backward-compatible fallback for the original
       single-resource HTML.
    */

    const resourceIcon =
        getElement("lessonResourceIcon");

    const resourceTitle =
        getElement("lessonResourceTitle");

    const resourceDescription =
        getElement("lessonResourceDescription");

    const resourceLink =
        getElement("lessonResourceLink");

    const resourceButtonText =
        getElement("lessonResourceButtonText");


    const resource =
        resources[0];


    const safeUrl =
        getSafeLessonResourceUrl(
            resource.url
        );


    if (!safeUrl) {

        resourceSection.hidden = true;

        return;
    }


    const isVideo =
        isYouTubeUrl(safeUrl);


    if (resourceIcon) {

        resourceIcon.className =
            isVideo
                ? "fa-solid fa-play"
                : "fa-solid fa-arrow-up-right-from-square";
    }


    if (resourceTitle) {

        resourceTitle.textContent =
            resource.title ||
            (
                isVideo
                    ? "Watch the lesson"
                    : "Open learning resource"
            );
    }


    if (resourceDescription) {

        resourceDescription.textContent =
            resource.description ||
            (
                isVideo
                    ? "Watch the lesson video, then return here to continue."
                    : "Open this external learning resource."
            );
    }


    if (resourceButtonText) {

        resourceButtonText.textContent =
            isVideo
                ? "Watch Video"
                : "Open Resource";
    }


    if (resourceLink) {

        if (isVideo) {

            resourceLink.removeAttribute("href");

            resourceLink.setAttribute(
                "role",
                "button"
            );

            resourceLink.onclick =
                function (event) {

                    event.preventDefault();

                    openLessonVideoModal(
                        safeUrl,
                        resource.title ||
                        currentLesson?.title ||
                        "Lesson video",
                        resource.id ||
                        "resource-1"
                    );
                };

        } else {

            resourceLink.href =
                safeUrl;

            resourceLink.target =
                "_blank";

            resourceLink.rel =
                "noopener noreferrer";

            resourceLink.removeAttribute(
                "role"
            );

            resourceLink.onclick = null;
        }
    }
}


/* ============================================================
   BIND RESOURCE BUTTONS
   ============================================================ */

function bindResourceButtons() {

    document
        .querySelectorAll(
            ".lesson-resource-button[data-video-url]"
        )
        .forEach((button) => {

            button.addEventListener(
                "click",
                function () {

                    const url =
                        this.dataset.videoUrl;

                    const resourceId =
                        this.dataset.resourceId ||
                        "resource-1";

                    const title =
                        this.dataset.resourceTitle ||
                        currentLesson?.title ||
                        "Lesson video";


                    openLessonVideoModal(
                        url,
                        title,
                        resourceId
                    );
                }
            );

        });
}


/* ============================================================
   OPEN VIDEO MODAL
   ============================================================ */

async function openLessonVideoModal(
    videoUrl,
    resourceTitle,
    resourceId
) {

    const modal =
        getElement("lessonVideoModal");

    const playerContainer =
        getElement("lessonVideoPlayerContainer");


    if (!modal || !playerContainer) {
        return;
    }


    const videoId =
        getYouTubeVideoId(videoUrl);


    if (!videoId) {

        window.open(
            videoUrl,
            "_blank",
            "noopener,noreferrer"
        );

        return;
    }


    activeVideoResource = {
        id:
            String(
                resourceId ||
                "resource-1"
            ),

        title:
            String(
                resourceTitle ||
                "Lesson video"
            ),

        videoId
    };


    const modalTitle =
        getElement(
            "lessonVideoModalTitle"
        );

    const modalLessonTitle =
        getElement(
            "lessonVideoModalLessonTitle"
        );


    if (modalTitle) {

        modalTitle.textContent =
            resourceTitle ||
            "Watch the lesson";
    }


    if (modalLessonTitle) {

        modalLessonTitle.textContent =
            resourceTitle ||
            "Lesson video";
    }


    /*
       Destroy any previous player.
    */

    destroyYouTubePlayer();


    playerContainer.innerHTML =
        `
            <div
                id="lessonVideoPlayer"
                class="lesson-video-player"
            ></div>
        `;


    modal.hidden = false;

    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    modal.classList.add(
        "is-open"
    );


    document.body.classList.add(
        "lesson-video-modal-open"
    );


    lessonVideoModalOpen = true;


    try {

        await loadYouTubeIframeAPI();


        /*
           User may have closed the modal
           while the API was loading.
        */

        if (!lessonVideoModalOpen) {
            return;
        }


        youtubePlayer =
            new YT.Player(
                "lessonVideoPlayer",
                {

                    videoId,

                    playerVars: {

                        playsinline: 1,

                        rel: 0
                    },


                    events: {

                        onReady:
                            function (event) {

                                /*
                                   Do not autoplay.
                                   The learner starts the video
                                   using YouTube's controls.
                                */

                                try {

                                    event.target
                                        .setVolume(100);

                                } catch (error) {

                                    console.warn(
                                        "Unable to set player volume:",
                                        error
                                    );
                                }
                            },


                        onStateChange:
                            handleYouTubePlayerStateChange,


                        onError:
                            function (event) {

                                console.warn(
                                    "YouTube player error:",
                                    event.data
                                );
                            }
                    }
                }
            );

    } catch (error) {

        console.error(
            "YouTube player failed to load:",
            error
        );


        playerContainer.innerHTML =
            `
                <div class="lesson-video-player-error">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    <p>
                        The video could not be loaded here.
                    </p>
                </div>
            `;
    }
}


/* ============================================================
   YOUTUBE STATE CHANGE
   ============================================================ */

function handleYouTubePlayerStateChange(event) {

    if (
        !window.YT ||
        !YT.PlayerState
    ) {
        return;
    }


    if (
        event.data ===
        YT.PlayerState.ENDED
    ) {

        markActiveVideoCompleted();
    }
}


/* ============================================================
   MARK ACTIVE VIDEO COMPLETED
   ============================================================ */

function markActiveVideoCompleted() {

    if (!activeVideoResource) {
        return;
    }


    const resourceId =
        String(
            activeVideoResource.id
        );


    completedVideoResources.add(
        resourceId
    );


    updateResourceCompletedUI(
        resourceId
    );


    /*
       Store locally so a refresh does not
       immediately lose the visual state.
    */

    try {

        const storageKey =
            "afc_holiday_video_progress_" +
            String(
                currentLesson?.id ||
                lessonId ||
                "lesson"
            );


        const saved =
            JSON.parse(
                localStorage.getItem(
                    storageKey
                ) || "[]"
            );


        const values =
            new Set(
                Array.isArray(saved)
                    ? saved
                    : []
            );


        values.add(
            resourceId
        );


        localStorage.setItem(
            storageKey,
            JSON.stringify(
                Array.from(values)
            )
        );

    } catch (error) {

        console.warn(
            "Unable to save video progress:",
            error
        );
    }
}


/* ============================================================
   LOAD LOCAL VIDEO PROGRESS
   ============================================================ */

function loadLocalVideoProgress() {

    completedVideoResources =
        new Set();


    try {

        const storageKey =
            "afc_holiday_video_progress_" +
            String(
                currentLesson?.id ||
                lessonId ||
                "lesson"
            );


        const saved =
            JSON.parse(
                localStorage.getItem(
                    storageKey
                ) || "[]"
            );


        if (Array.isArray(saved)) {

            saved.forEach((id) => {

                completedVideoResources.add(
                    String(id)
                );

            });
        }

    } catch (error) {

        console.warn(
            "Unable to load video progress:",
            error
        );
    }
}


/* ============================================================
   UPDATE RESOURCE COMPLETED UI
   ============================================================ */

function updateResourceCompletedUI(
    resourceId
) {

    const item =
        document.querySelector(
            `.lesson-resource-item[data-resource-id="${CSS.escape(resourceId)}"]`
        );


    if (!item) {
        return;
    }


    const copy =
        item.querySelector(
            ".lesson-resource-copy"
        );


    if (!copy) {
        return;
    }


    if (
        copy.querySelector(
            ".lesson-resource-complete"
        )
    ) {

        return;
    }


    const completed =
        document.createElement("small");


    completed.className =
        "lesson-resource-complete";


    completed.innerHTML =
        `
            <i class="fa-solid fa-circle-check"></i>
            Video completed
        `;


    copy.appendChild(
        completed
    );
}


/* ============================================================
   DESTROY YOUTUBE PLAYER
   ============================================================ */

function destroyYouTubePlayer() {

    if (
        youtubePlayer &&
        typeof youtubePlayer.destroy === "function"
    ) {

        try {

            youtubePlayer.destroy();

        } catch (error) {

            console.warn(
                "Unable to destroy YouTube player:",
                error
            );
        }
    }


    youtubePlayer = null;
}


/* ============================================================
   CLOSE VIDEO MODAL
   ============================================================ */

function closeLessonVideoModal() {

    const modal =
        getElement("lessonVideoModal");

    const playerContainer =
        getElement("lessonVideoPlayerContainer");


    lessonVideoModalOpen = false;


    destroyYouTubePlayer();


    if (playerContainer) {

        playerContainer.innerHTML = "";
    }


    if (modal) {

        modal.hidden = true;

        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        modal.classList.remove(
            "is-open"
        );
    }


    document.body.classList.remove(
        "lesson-video-modal-open"
    );


    activeVideoResource = null;
}


/* ============================================================
   INITIALISE VIDEO MODAL
   ============================================================ */

function initialiseLessonVideoModal() {

    const closeButton =
        getElement(
            "lessonVideoModalClose"
        );

    const backdrop =
        getElement(
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

function renderLesson(lesson) {

    currentLesson =
        lesson;


    saveSelectedLesson(
        lesson
    );


    loadLocalVideoProgress();


    const lessonReader =
        getElement(
            "lessonReader"
        );


    const lessonIcon =
        getElement(
            "lessonIcon"
        );

    const lessonCategory =
        getElement(
            "lessonCategory"
        );

    const lessonLevel =
        getElement(
            "lessonLevel"
        );

    const lessonTitle =
        getElement(
            "lessonTitle"
        );

    const lessonDescription =
        getElement(
            "lessonDescription"
        );

    const lessonDuration =
        getElement(
            "lessonDuration"
        );

    const lessonMetaLevel =
        getElement(
            "lessonMetaLevel"
        );

    const lessonPrice =
        getElement(
            "lessonPrice"
        );

    const lessonContent =
        getElement(
            "lessonContent"
        );


    if (lessonIcon) {

        lessonIcon.className =
            lesson.icon ||
            "fa-solid fa-book-open";
    }


    if (lessonCategory) {

        lessonCategory.textContent =
            lesson.category ||
            "Holiday Learning";
    }


    if (lessonLevel) {

        lessonLevel.textContent =
            lesson.level ||
            "Beginner";
    }


    if (lessonTitle) {

        lessonTitle.textContent =
            lesson.title ||
            "Holiday Learning Lesson";
    }


    if (lessonDescription) {

        lessonDescription.textContent =
            lesson.description ||
            "";
    }


    if (lessonDuration) {

        lessonDuration.textContent =
            lesson.duration ||
            "";
    }


    if (lessonMetaLevel) {

        lessonMetaLevel.textContent =
            lesson.level ||
            "Beginner";
    }


    if (lessonPrice) {

        lessonPrice.textContent =
            lesson.price ||
            "Free";
    }


    if (lessonContent) {

        lessonContent.innerHTML =
            formatLessonContent(
                getLessonContent(
                    lesson
                )
            );
    }


    renderLessonResource(
        lesson
    );


    buildSectionNavigation();


    setupReadingProgress();


    if (lessonReader) {

        lessonReader.hidden =
            false;
    }
}


/* ============================================================
   BUILD "IN THIS LESSON"
   ============================================================ */

function buildSectionNavigation() {

    const content =
        getElement(
            "lessonContent"
        );

    const sectionList =
        getElement(
            "lessonSectionList"
        );


    if (!content || !sectionList) {
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


    /*
       If there are actual H2 headings,
       use them.
    */

    if (headings.length) {

        sectionList.innerHTML =
            headings
                .map((heading, index) => {

                    const id =
                        "lesson-section-" +
                        (index + 1);


                    heading.id =
                        id;


                    return `
                        <a
                            href="#${id}"
                            class="lesson-section-link"
                        >

                            <span class="lesson-section-number">
                                ${index + 1}
                            </span>

                            <strong>
                                ${escapeHTML(
                                    heading.textContent.trim()
                                )}
                            </strong>

                        </a>
                    `;

                })
                .join("");


        sectionList
            .querySelectorAll(
                "a.lesson-section-link"
            )
            .forEach((link) => {

                link.addEventListener(
                    "click",
                    function (event) {

                        event.preventDefault();


                        const targetId =
                            this.getAttribute(
                                "href"
                            );


                        const target =
                            document.querySelector(
                                targetId
                            );


                        if (!target) {
                            return;
                        }


                        const offset =
                            90;


                        const targetTop =
                            target.getBoundingClientRect().top +
                            window.scrollY -
                            offset;


                        window.scrollTo({
                            top:
                                Math.max(
                                    0,
                                    targetTop
                                ),
                            behavior:
                                "smooth"
                        });
                    }
                );
            });


        return;
    }


    /*
       No H2 headings.
       Do NOT pretend that "Section 2" exists.
       Show one useful fallback item.
    */

    sectionList.innerHTML =
        `
            <div class="lesson-section-link">
                <span class="lesson-section-number">
                    •
                </span>

                <strong>
                    Lesson reading
                </strong>
            </div>
        `;
}


/* ============================================================
   READING PROGRESS
   ============================================================ */

function setupReadingProgress() {

    const content =
        getElement(
            "lessonContent"
        );

    const progressText =
        getElement(
            "readingProgressText"
        );

    const progressFill =
        getElement(
            "readingProgressFill"
        );


    if (
        !content ||
        !progressText ||
        !progressFill
    ) {

        return;
    }


    let ticking = false;


    function updateProgress() {

        ticking = false;


        const rect =
            content.getBoundingClientRect();


        const contentTop =
            rect.top +
            window.scrollY;


        const contentHeight =
            Math.max(
                content.scrollHeight,
                content.offsetHeight
            );


        const contentBottom =
            contentTop +
            contentHeight;


        /*
           We measure using a point around 65%
           down the viewport.

           This gives a natural reading-progress
           feeling:
           - before the lesson starts = 0%
           - middle of lesson = around 50%
           - near the bottom = 100%
        */

        const readingPoint =
            window.scrollY +
            (
                window.innerHeight *
                0.65
            );


        const total =
            Math.max(
                1,
                contentBottom -
                contentTop
            );


        let progress =
            (
                readingPoint -
                contentTop
            ) /
            total;


        /*
           Before reaching the lesson:
           0%

           After reaching the bottom:
           100%
        */

        progress =
            Math.max(
                0,
                Math.min(
                    1,
                    progress
                )
            );


        readingProgress =
            Math.round(
                progress * 100
            );


        progressText.textContent =
            readingProgress +
            "%";


        progressFill.style.width =
            readingProgress +
            "%";
    }


    function requestUpdate() {

        if (ticking) {
            return;
        }


        ticking = true;


        window.requestAnimationFrame(
            updateProgress
        );
    }


    window.addEventListener(
        "scroll",
        requestUpdate,
        {
            passive: true
        }
    );


    window.addEventListener(
        "resize",
        requestUpdate
    );


    /*
       First calculation.
    */

    requestUpdate();


    /*
       Recalculate after fonts/images/layout
       have had time to settle.
    */

    setTimeout(
        requestUpdate,
        300
    );


    setTimeout(
        requestUpdate,
        1000
    );
}


/* ============================================================
   SAVE HOLIDAY PROGRESS
   ============================================================ */

async function saveHolidayProgress(
    status
) {

    const id =
        String(
            currentLesson?.id ||
            currentLesson?.lessonId ||
            currentLesson?.lesson_id ||
            lessonId ||
            ""
        ).trim();


    if (!id) {
        return false;
    }


    const payload = {
        action:
            "saveHolidayProgress",

        lessonId:
            id,

        status:
            status
    };


    try {

        const response =
            await fetch(
                HOLIDAY_LESSON_API,
                {
                    method: "POST",

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


        const data =
            await response.json();


        if (
            data &&
            data.success === false
        ) {

            throw new Error(
                data.message ||
                "Unable to save lesson progress."
            );
        }


        return true;

    } catch (error) {

        console.warn(
            "Unable to save Holiday Learning progress:",
            error
        );


        /*
           Keep local fallback.
        */

        try {

            localStorage.setItem(
                "afc_holiday_progress_" +
                id,

                JSON.stringify({
                    status:
                        status,

                    updatedAt:
                        new Date().toISOString()
                })
            );

        } catch (storageError) {

            console.warn(
                "Unable to save local progress:",
                storageError
            );
        }


        return false;
    }
}


/* ============================================================
   SHOW COMPLETED STATE
   ============================================================ */

function showLessonCompleted() {

    const lessonReader =
        getElement(
            "lessonReader"
        );

    const lessonCompleted =
        getElement(
            "lessonCompleted"
        );

    const lessonCompletedMessage =
        getElement(
            "lessonCompletedMessage"
        );


    if (lessonReader) {

        lessonReader.hidden =
            true;
    }


    if (lessonCompleted) {

        lessonCompleted.hidden =
            false;
    }


    if (lessonCompletedMessage) {

        lessonCompletedMessage.textContent =
            "You have completed this Holiday Learning lesson.";
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* ============================================================
   COMPLETE LESSON
   ============================================================ */

async function completeLesson() {

    if (isCompleting) {
        return;
    }


    if (!currentLesson) {
        return;
    }


    isCompleting = true;


    const completeButton =
        getElement(
            "completeLessonButton"
        );

    const finishButton =
        getElement(
            "lessonFinishButton"
        );


    const originalCompleteText =
        completeButton
            ? completeButton.innerHTML
            : "";


    const originalFinishText =
        finishButton
            ? finishButton.innerHTML
            : "";


    if (completeButton) {

        completeButton.disabled =
            true;

        completeButton.innerHTML =
            `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Saving...
            `;
    }


    if (finishButton) {

        finishButton.disabled =
            true;

        finishButton.innerHTML =
            `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Saving...
            `;
    }


    try {

        await saveHolidayProgress(
            "completed"
        );


        showLessonCompleted();

    } finally {

        isCompleting = false;


        if (completeButton) {

            completeButton.disabled =
                false;

            completeButton.innerHTML =
                originalCompleteText;
        }


        if (finishButton) {

            finishButton.disabled =
                false;

            finishButton.innerHTML =
                originalFinishText;
        }
    }
}


/* ============================================================
   READ AGAIN
   ============================================================ */

function readLessonAgain() {

    const lessonCompleted =
        getElement(
            "lessonCompleted"
        );

    const lessonReader =
        getElement(
            "lessonReader"
        );


    if (lessonCompleted) {

        lessonCompleted.hidden =
            true;
    }


    if (lessonReader) {

        lessonReader.hidden =
            false;
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* ============================================================
   LESSON LISTENERS
   ============================================================ */

function setupLessonListeners() {

    const completeButton =
        getElement(
            "completeLessonButton"
        );

    const finishButton =
        getElement(
            "lessonFinishButton"
        );

    const readAgainButton =
        getElement(
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
            readLessonAgain
        );
    }
}


/* ============================================================
   SHOW ERROR
   ============================================================ */

function showLessonError(
    message
) {

    const loading =
        getElement(
            "lessonLoading"
        );

    const errorBox =
        getElement(
            "lessonError"
        );

    const errorMessage =
        getElement(
            "lessonErrorMessage"
        );


    if (loading) {

        loading.hidden =
            true;
    }


    if (errorMessage) {

        errorMessage.textContent =
            message ||
            "Unable to load this lesson.";
    }


    if (errorBox) {

        errorBox.hidden =
            false;
    }
}


/* ============================================================
   LOAD LESSON
   ============================================================ */

async function loadLesson() {

    const loading =
        getElement(
            "lessonLoading"
        );


    lessonId =
        getRequestedLessonId();


    if (!lessonId) {

        showLessonError(
            "No lesson was selected. Please return to Holiday Learning and choose a lesson."
        );

        return;
    }


    try {

        const response =
            await fetchHolidayLessons();


        const lesson =
            findLessonInResponse(
                response,
                lessonId
            );


        if (!lesson) {

            /*
               Session fallback:
               If the backend cannot find the lesson,
               try the lesson already saved by the hub.
            */

            let fallbackLesson =
                null;


            try {

                const saved =
                    sessionStorage.getItem(
                        "afc_holiday_selected_lesson_v1"
                    );


                if (saved) {

                    const parsed =
                        JSON.parse(
                            saved
                        );


                    if (
                        parsed &&
                        String(
                            parsed.id ||
                            parsed.lessonId ||
                            parsed.lesson_id ||
                            ""
                        ).trim().toLowerCase() ===
                        String(
                            lessonId
                        ).trim().toLowerCase()
                    ) {

                        fallbackLesson =
                            parsed;
                    }
                }

            } catch (error) {

                console.warn(
                    "Unable to read saved lesson fallback:",
                    error
                );
            }


            if (!fallbackLesson) {

                throw new Error(
                    "The selected lesson could not be found."
                );
            }


            renderLesson(
                fallbackLesson
            );

        } else {

            renderLesson(
                lesson
            );
        }


        if (loading) {

            loading.hidden =
                true;
        }

    } catch (error) {

        console.error(
            "Holiday lesson loading failed:",
            error
        );


        if (loading) {

            loading.hidden =
                true;
        }


        showLessonError(
            error.message ||
            "Unable to load this lesson right now. Please try again."
        );
    }
}


/* ============================================================
   CLEAN UP ON PAGE EXIT
   ============================================================ */

window.addEventListener(
    "beforeunload",
    function () {

        destroyYouTubePlayer();

    }
);


/* ============================================================
   INITIALISE
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initialiseLessonVideoModal();

        setupLessonListeners();

        loadLesson();

    }
);
