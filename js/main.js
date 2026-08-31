/* =========================================================
   AFC ISIU YOUTH PORTAL
   MAIN JAVASCRIPT
========================================================= */

"use strict";


/* =========================================================
   AOS
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    if (typeof AOS !== "undefined") {

        AOS.init({
            duration: 900,
            easing: "ease-out-cubic",
            once: true,
            offset: 120
        });

    }

});


/* =========================================================
   OFFLINE STATUS BANNER
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const offlineBanner =
        document.createElement("div");

    offlineBanner.id =
        "offlineBanner";


    offlineBanner.innerHTML = `
        <div class="offline-banner-content">

            <i class="fa-solid fa-wifi"></i>

            <div>

                <strong>
                    You're offline
                </strong>

                <span>
                    Some features are unavailable until
                    you reconnect.
                </span>

            </div>

        </div>
    `;


    document.body.prepend(
        offlineBanner
    );


    function updateOnlineStatus() {

        if (navigator.onLine) {

            offlineBanner.classList.remove(
                "show"
            );

        } else {

            offlineBanner.classList.add(
                "show"
            );

        }

    }


    window.addEventListener(
        "online",
        updateOnlineStatus
    );


    window.addEventListener(
        "offline",
        updateOnlineStatus
    );


    updateOnlineStatus();

});


/* =========================================================
   ONLINE-ONLY FEATURES
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const onlineOnlyLinks =
        document.querySelectorAll(
            "[data-online-only]"
        );


    onlineOnlyLinks.forEach(link => {

        link.addEventListener(
            "click",
            event => {

                if (navigator.onLine) {

                    return;

                }


                event.preventDefault();


                showOfflineMessage(
                    link.dataset.feature ||
                    "This feature"
                );

            }
        );

    });

});


/* =========================================================
   OFFLINE MESSAGE
========================================================= */

function showOfflineMessage(featureName) {

    const existing =
        document.getElementById(
            "offlineMessage"
        );


    if (existing) {

        existing.remove();

    }


    const message =
        document.createElement("div");


    message.id =
        "offlineMessage";


    message.innerHTML = `

        <div class="offline-message-card">

            <div class="offline-message-icon">

                <i class="fa-solid fa-cloud-arrow-up"></i>

            </div>


            <h3>
                Internet Connection Required
            </h3>


            <p>
                ${featureName} requires an internet
                connection. Please turn on your data
                or connect to Wi-Fi and try again.
            </p>


            <button
                type="button"
                id="closeOfflineMessage"
            >
                Okay
            </button>

        </div>

    `;


    document.body.appendChild(
        message
    );


    const closeButton =
        document.getElementById(
            "closeOfflineMessage"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            () => {

                message.remove();

            }
        );

    }


    message.addEventListener(
        "click",
        event => {

            if (event.target === message) {

                message.remove();

            }

        }
    );

}


/* =========================================================
   HERO TYPING EFFECT
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const texts = [

        "Growing in Grace and the Knowledge of Christ",

        "Helping Young Believers Stand Firm in the Faith",

        "Studying God's Word, Living God's Truth",

        "Preparing Youth for Service and Eternity",

        "Walking Together on the Path of Holiness"

    ];


    const heroTitle =
        document.getElementById(
            "heroTitle"
        );


    if (!heroTitle) {

        return;

    }


    let textIndex = 0;

    let charIndex = 0;

    let deleting = false;


    function typeEffect() {

        const currentText =
            texts[textIndex];


        heroTitle.innerHTML =
            currentText
                .substring(
                    0,
                    charIndex
                )
                .replace(
                    /\n/g,
                    "<br>"
                );


        if (!deleting) {

            charIndex++;


            if (
                charIndex >
                currentText.length
            ) {

                deleting = true;


                setTimeout(
                    typeEffect,
                    2000
                );


                return;

            }

        } else {

            charIndex--;


            if (charIndex < 0) {

                deleting = false;

                textIndex =
                    (
                        textIndex + 1
                    )
                    %
                    texts.length;


                charIndex = 0;

            }

        }


        setTimeout(

            typeEffect,

            deleting
                ? 35
                : 70

        );

    }


    typeEffect();

});


/* =========================================================
   CSV LINKS
========================================================= */

const weeklyLessonCSV =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=201183837&single=true&output=csv";


const secretariatCSV =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTE5Ds6_y0OYFL9_pYfRekpMx1Jq-kijbtdXsL-LCyg5KsC8LVootmeHOew2xiqV2sAXEVUKm_3vz17/pub?gid=1085033955&single=true&output=csv";


/* =========================================================
   CSV PARSER
========================================================= */

function parseCSV(text) {

    const rows = [];

    let row = [];

    let value = "";

    let insideQuotes = false;


    for (
        let i = 0;
        i < text.length;
        i++
    ) {

        const char =
            text[i];


        const next =
            text[i + 1];


        if (char === '"') {

            if (
                insideQuotes &&
                next === '"'
            ) {

                value += '"';

                i++;

            } else {

                insideQuotes =
                    !insideQuotes;

            }

        }


        else if (

            char === "," &&
            !insideQuotes

        ) {

            row.push(
                value.trim()
            );

            value = "";

        }


        else if (

            (
                char === "\n" ||
                char === "\r"
            )
            &&
            !insideQuotes

        ) {

            if (
                value ||
                row.length
            ) {

                row.push(
                    value.trim()
                );

                rows.push(
                    row
                );

                row = [];

                value = "";

            }

        }


        else {

            value += char;

        }

    }


    if (
        value ||
        row.length
    ) {

        row.push(
            value.trim()
        );

        rows.push(
            row
        );

    }


    return rows.filter(
        item =>
            item.length > 1
    );

}


/* =========================================================
   SECRETARIAT REPORTS
========================================================= */

async function fetchSecretariatReports() {

    const reportsFeed =
        document.getElementById(
            "reportsFeed"
        );


    /* Page does not use reports */

    if (!reportsFeed) {

        return;

    }


    try {

        const response =
            await fetch(
                secretariatCSV
            );


        const data =
            await response.text();


        const rows =
            parseCSV(data);


        if (!rows.length) {

            return;

        }


        reportsFeed.innerHTML =
            "";


        const headers =
            rows[0].map(
                header =>
                    header
                        .toLowerCase()
                        .trim()
            );


        const iDate =
            headers.indexOf(
                "date"
            );


        const iTitle =
            headers.indexOf(
                "program title"
            );


        const iType =
            headers.indexOf(
                "program type"
            );


        const iSummary =
            headers.indexOf(
                "what went well"
            );


        const iReporter =
            headers.indexOf(
                "reporter"
            );


        const reports =
            rows
                .slice(1)
                .reverse()
                .slice(0, 6);


        reports.forEach(
            report => {

                const date =
                    iDate >= 0
                        ? report[iDate] || ""
                        : "";


                const title =
                    iTitle >= 0
                        ? report[iTitle] || ""
                        : "";


                const type =
                    iType >= 0
                        ? report[iType] || ""
                        : "";


                const summary =
                    iSummary >= 0
                        ? report[iSummary] || ""
                        : "";


                const reporter =
                    iReporter >= 0
                        ? report[iReporter] || ""
                        : "";


                if (
                    title.trim() === ""
                ) {

                    return;

                }


                reportsFeed.insertAdjacentHTML(
                    "beforeend",

                    `
                    <div class="report-card">

                        <div class="report-badge">
                            ${type}
                        </div>

                        <h3>
                            ${title}
                        </h3>

                        <p class="report-summary">
                            ${summary}
                        </p>

                        <div class="report-meta">

                            <div class="reporter">
                                ${reporter}
                            </div>

                            <div class="report-date">
                                ${date}
                            </div>

                        </div>

                    </div>
                    `
                );

            }
        );


    } catch (error) {

        console.log(
            "Secretariat Error:",
            error
        );

    }

}


/* =========================================================
   WEEKLY LESSONS
========================================================= */

let lessonsData = [];


async function fetchWeeklyLesson() {

    const lessonTopic =
        document.getElementById(
            "lessonTopic"
        );


    /* Page does not use lessons */

    if (!lessonTopic) {

        return;

    }


    try {

        const response =
            await fetch(
                weeklyLessonCSV
            );


        const csvText =
            await response.text();


        if (
            typeof Papa ===
            "undefined"
        ) {

            console.log(
                "PapaParse is not available."
            );

            return;

        }


        const result =
            Papa.parse(
                csvText,
                {
                    header: true,
                    skipEmptyLines: true
                }
            );


        lessonsData =
            result.data.map(
                row => ({

                    lesson:
                        row.Lesson
                            ?.trim() || "",

                    className:
                        row.Class
                            ?.trim() || "",

                    topic:
                        row.Topic
                            ?.trim() || "",

                    bibleText:
                        row.BibleText
                            ?.trim() || "",

                    memoryVerse:
                        row.MemoryVerse
                            ?.trim() || "",

                    summary:
                        row.Summary
                            ?.trim() || "",

                    discussion:
                        row.Discussion
                            ?.trim() || "",

                    yorubaAudio:
                        row.YorubaAudio
                            ?.trim() || ""

                })
            );


        console.log(
            "Parsed Lessons:",
            lessonsData
        );


        const savedClass =
            localStorage.getItem(
                "selectedLessonClass"
            );


        switchLesson(
            savedClass ||
            "Senior"
        );


    } catch (error) {

        console.log(
            "Weekly lesson error:",
            error
        );

    }

}


/* =========================================================
   SWITCH LESSON
========================================================= */

function switchLesson(className) {

    const lesson =
        lessonsData.find(
            item =>
                item.className ===
                className
        );


    if (!lesson) {

        return;

    }


    const lessonTopic =
        document.getElementById(
            "lessonTopic"
        );


    const lessonBibleText =
        document.getElementById(
            "lessonBibleText"
        );


    const lessonMemoryVerse =
        document.getElementById(
            "lessonMemoryVerse"
        );


    if (lessonTopic) {

        lessonTopic.innerText =
            lesson.topic;

    }


    if (lessonBibleText) {

        lessonBibleText.innerText =
            lesson.bibleText;

    }


    if (lessonMemoryVerse) {

        lessonMemoryVerse.innerText =
            lesson.memoryVerse;

    }


    document
        .querySelectorAll(
            ".lesson-tab"
        )
        .forEach(
            tab => {

                tab.classList.remove(
                    "active"
                );


                if (
                    tab.textContent
                        .trim() ===
                    className
                ) {

                    tab.classList.add(
                        "active"
                    );

                }

            }
        );


    localStorage.setItem(
        "selectedLessonClass",
        className
    );

}


/* =========================================================
   SIDEBAR NAVIGATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {


        const sidebar =
            document.getElementById(
                "sidebar"
            );


        const hubButton =
            document.getElementById(
                "hubButton"
            );


        const menuBtn =
            document.getElementById(
                "mobileMenuBtn"
            );


        const overlay =
            document.getElementById(
                "sidebarOverlay"
            );


        if (
            !sidebar ||
            !overlay
        ) {

            return;

        }


        function openSidebar() {

            sidebar.classList.add(
                "show"
            );


            overlay.classList.add(
                "show"
            );


            document.body.style.overflow =
                "hidden";


            if (menuBtn) {

                menuBtn.setAttribute(
                    "aria-expanded",
                    "true"
                );

            }


            if (hubButton) {

                hubButton.setAttribute(
                    "aria-expanded",
                    "true"
                );

            }

        }


        function closeSidebar() {

            sidebar.classList.remove(
                "show"
            );


            overlay.classList.remove(
                "show"
            );


            document.body.style.overflow =
                "";


            if (menuBtn) {

                menuBtn.setAttribute(
                    "aria-expanded",
                    "false"
                );

            }


            if (hubButton) {

                hubButton.setAttribute(
                    "aria-expanded",
                    "false"
                );

            }

        }


        if (menuBtn) {

            menuBtn.addEventListener(
                "click",
                openSidebar
            );

        }


        if (hubButton) {

            hubButton.addEventListener(
                "click",
                openSidebar
            );

        }


        overlay.addEventListener(
            "click",
            closeSidebar
        );


        /* CLOSE WHEN A SIDEBAR LINK IS CLICKED */

        sidebar
            .querySelectorAll("a")
            .forEach(
                link => {

                    link.addEventListener(
                        "click",
                        () => {

                            if (
                                window.innerWidth <=
                                768
                            ) {

                                closeSidebar();

                            }

                        }
                    );

                }
            );


        /* CLOSE WITH ESCAPE KEY */

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape"
                ) {

                    closeSidebar();

                }

            }
        );


        /* RESET AFTER RETURNING TO DESKTOP */

        window.addEventListener(
            "resize",
            () => {

                if (
                    window.innerWidth >
                    768
                ) {

                    closeSidebar();

                }

            }
        );

    }
);


/* =========================================================
   DASHBOARD GREETING
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {


        const greetingText =
            document.getElementById(
                "greetingText"
            );


        const currentDate =
            document.getElementById(
                "currentDate"
            );


        if (
            !greetingText ||
            !currentDate
        ) {

            return;

        }


        const now =
            new Date();


        const hour =
            now.getHours();


        let greeting =
            "Good Evening, Dear User.";


        if (
            hour >= 5 &&
            hour < 12
        ) {

            greeting =
                "Good Morning, Dear User.";

        }


        else if (
            hour >= 12 &&
            hour < 17
        ) {

            greeting =
                "Good Afternoon, Dear User.";

        }


        else if (
            hour >= 17 &&
            hour < 21
        ) {

            greeting =
                "Good Evening, Dear User.";

        }


        else {

            greeting =
                "Good Night, Dear User.";

        }


        greetingText.textContent =
            greeting;


        currentDate.textContent =
            now.toLocaleDateString(
                "en-GB",
                {

                    weekday:
                        "long",

                    day:
                        "numeric",

                    month:
                        "long",

                    year:
                        "numeric"

                }
            );

    }
);


/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        fetchSecretariatReports();

        fetchWeeklyLesson();

    }
);


/* =========================================================
   AUTO REFRESH REPORTS
========================================================= */

setInterval(
    fetchSecretariatReports,
    30000
);
