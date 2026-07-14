
AOS.init({
    duration: 900,
    easing: "ease-out-cubic",
    once: true,
    offset: 120
});

/*
==============================
HERO TYPING EFFECT
==============================
*/

document.addEventListener("DOMContentLoaded", () => {

    const texts = [
        "Growing in Grace and the Knowledge of Christ",
        "Helping Young Believers Stand Firm in the Faith",
        "Studying God's Word, Living God's Truth",
        "Preparing Youth for Service and Eternity",
        "Walking Together on the Path of Holiness"
    ];

    const heroTitle = document.getElementById("heroTitle");

    if (!heroTitle) return;

    let textIndex = 0;
    let charIndex = 0;
    let deleting = false;

    function typeEffect() {

        const currentText = texts[textIndex];

        heroTitle.innerHTML = currentText
            .substring(0, charIndex)
            .replace(/\n/g, "<br>");

        if (!deleting) {

            charIndex++;

            if (charIndex > currentText.length) {

                deleting = true;

                setTimeout(typeEffect, 2000);

                return;
            }

        } else {

            charIndex--;

            if (charIndex < 0) {

                deleting = false;

                textIndex = (textIndex + 1) % texts.length;

                charIndex = 0;
            }
        }

        setTimeout(typeEffect, deleting ? 35 : 70);
    }

    typeEffect();

});
/*
==============================
MOBILE MENU (REPLACE EVERYTHING)
==============================
*/

document.addEventListener("DOMContentLoaded", () => {

    const hamburger = document.getElementById("hamburger");
    const menu = document.getElementById("menu");

    hamburger.addEventListener("click", function (e) {

        e.preventDefault();
        e.stopPropagation();

        menu.classList.toggle("active");

        console.log(menu.classList.contains("active"));

    });

    document.addEventListener("click", function (e) {

        if (
            !menu.contains(e.target) &&
            !hamburger.contains(e.target)
        ) {

            menu.classList.remove("active");

        }

    });

});
    
 /*
==============================
CSV LINKS (UNCHANGED)
==============================
*/

const weeklyLessonCSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=201183837&single=true&output=csv";

/*
==============================
WEEKLY LESSONS (FULL FIXED + SAFE)
==============================
*/

let lessonsData = [];

async function fetchWeeklyLesson() {
  try {
    const response = await fetch(weeklyLessonCSV);
    const csvText = await response.text();

    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true
    });

    // normalize data
    lessonsData = result.data.map(row => ({
      className: row.Class?.trim(),
      topic: row.Topic?.trim(),
      bibleText: row.BibleText?.trim(),
      memoryVerse: row.MemoryVerse?.trim(),
      summary: row.Summary?.trim(),
      discussion: row.Discussion?.trim(),
      image: row.Image?.trim()
    }));

    switchLesson('Senior');

  } catch (error) {
    console.log("Weekly lesson error:", error);
  }
}
  
function switchLesson(className) {
  const lesson = lessonsData.find(item => item.className === className);
  if (!lesson) return;

  document.getElementById('lessonTopic').innerText = lesson.topic || "";

  document.getElementById('lessonBibleText').innerText = lesson.bibleText || "";

  // ❌ REMOVE trimming for memory verse
  document.getElementById('lessonMemoryVerse').innerText = lesson.memoryVerse || "";


document.querySelectorAll('.lesson-tab').forEach(tab => {
  tab.classList.remove('active');

  if (tab.textContent.trim() === className) {
    tab.classList.add('active');
  }
});

  localStorage.setItem('selectedLessonClass', className);
}
  console.log("Parsed Lessons:", lessonsData);
/*
==============================
INIT
==============================
*/

function initHome() {

    fetchSecretariatReports();

    fetchWeeklyLesson();

    setInterval(fetchSecretariatReports, 30000);

}
