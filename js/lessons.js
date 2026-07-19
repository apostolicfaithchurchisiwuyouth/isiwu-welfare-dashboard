/*
=====================================
WEEKLY LESSONS
=====================================
*/

const WEEKLY_LESSON_CSV =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=201183837&single=true&output=csv";

let lessons = [];

/*
=====================================
ELEMENTS
=====================================
*/

const topicEl =
    document.getElementById("topic");

const metaEl =
    document.getElementById("meta");

const bibleTextEl =
    document.getElementById("bibleText");

const memoryVerseEl =
    document.getElementById("memoryVerse");

const summaryEl =
    document.getElementById("summary");

const discussionEl =
    document.getElementById("discussion");

const audioContainer =
    document.getElementById("yorubaAudioContainer");

const audioPlayer =
    document.getElementById("yorubaAudioPlayer");

const audioSource =
    document.getElementById("yorubaAudioSource");

const tabs =
    document.querySelectorAll(".tab");

/*
=====================================
LOAD LESSONS
=====================================
*/

async function loadLessons() {

    try {

        showLoading();

        const response =
            await fetch(
                WEEKLY_LESSON_CSV,
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                "Unable to fetch lessons."
            );

        }

        const csv =
            await response.text();

        const result =
            Papa.parse(
                csv,
                {
                    header: true,
                    skipEmptyLines: true
                }
            );

        lessons =
            result.data;

        switchClass(
            "Senior"
        );

    }

    catch (error) {

        console.error(error);

        showError();

    }

}

/*
=====================================
SHOW LOADING
=====================================
*/

function showLoading() {

    topicEl.textContent =
        "Loading lessons...";

    metaEl.textContent =
        "";

    bibleTextEl.textContent =
        "";

    memoryVerseEl.textContent =
        "";

    summaryEl.textContent =
        "";

    discussionEl.textContent =
        "";

    audioContainer.style.display =
        "none";

}

/*
=====================================
SHOW ERROR
=====================================
*/

function showError() {

    topicEl.textContent =
        "Unable to load lesson";

    metaEl.textContent =
        "Please refresh the page.";

}

/*
=====================================
SWITCH CLASS
=====================================
*/

function switchClass(className) {

    const lesson =
        lessons.find(
            item =>
                item.Class &&
                item.Class.trim() === className
        );

    if (!lesson) {

        topicEl.textContent =
            "Lesson unavailable";

        metaEl.textContent =
            className;

        return;

    }

    /*
    ==========================
    TOP SECTION
    ==========================
    */

    topicEl.textContent =
        lesson.Topic || "";

    metaEl.textContent =
        `${className} Class`;

    /*
    ==========================
    LESSON CONTENT
    ==========================
    */

    bibleTextEl.textContent =
        lesson.BibleText || "";

    memoryVerseEl.textContent =
        lesson.MemoryVerse || "";

    summaryEl.innerHTML =
        lesson.Summary || "";

    discussionEl.textContent =
        lesson.Discussion || "";

    /*
    ==========================
    AUDIO
    ==========================
    */

    const audio =
        lesson.YorubaAudio;

    if (
        audio &&
        audio.trim() !== ""
    ) {

        audioSource.src =
            audio;

        audioPlayer.load();

        audioContainer.style.display =
            "block";

    }

    else {

        audioSource.src =
            "";

        audioPlayer.load();

        audioContainer.style.display =
            "none";

    }

    /*
    ==========================
    ACTIVE TAB
    ==========================
    */

    tabs.forEach(
        tab => {

            tab.classList.remove(
                "active"
            );

            if (

                tab.dataset.class === className

            ) {

                tab.classList.add(
                    "active"
                );

            }

        }
    );

}

/*
=====================================
TAB EVENTS
=====================================
*/

tabs.forEach(
    tab => {

        tab.addEventListener(
            "click",
            () => {

                switchClass(
                    tab.dataset.class
                );

            }
        );

    }
);

/*
=====================================
HEADER EFFECT
=====================================
*/

const header =
    document.querySelector(
        ".main-header"
    );

window.addEventListener(
    "scroll",
    () => {

        if (

            window.scrollY > 50

        ) {

            header.style.boxShadow =
                "0 12px 40px rgba(0,0,0,.08)";

        }

        else {

            header.style.boxShadow =
                "0 8px 30px rgba(0,0,0,.05)";

        }

    }
);

/*
=====================================
START
=====================================
*/

document.addEventListener(
    "DOMContentLoaded",
    loadLessons
);
