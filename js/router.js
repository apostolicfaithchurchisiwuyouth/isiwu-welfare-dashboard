/*====================================================
AFC ISIWU YOUTH PORTAL
router.js
====================================================*/

"use strict";

/*====================================================
ELEMENTS
====================================================*/

const content = document.getElementById("dynamicContent");

const loader = document.getElementById("pageLoader");

/*====================================================
ROUTES
====================================================*/

const routes = {

    dashboard: "pages/dashboard.html",

    "weekly-lessons": "pages/weekly-lessons.html",

    "lesson-archive": "pages/lesson-archive.html",

    quizzes: "pages/quizzes.html",

    leaderboard: "pages/leaderboard.html",

    reports: "pages/reports.html",

    members: "pages/members.html",

    gallery: "pages/gallery.html",

    welfare: "pages/welfare.html",

    settings: "pages/settings.html"

};

/*====================================================
SHOW LOADER
====================================================*/

function showLoader(){

    if(loader){

        loader.classList.add("active");

    }

}

/*====================================================
HIDE LOADER
====================================================*/

function hideLoader(){

    if(loader){

        loader.classList.remove("active");

    }

}

/*====================================================
LOAD PAGE
====================================================*/

async function loadPage(page){

    if(!content) return;

    const file = routes[page];

    if(!file){

        content.innerHTML = `

            <div class="content-card">

                <h2>

                    Page Not Found

                </h2>

            </div>

        `;

        return;

    }

    showLoader();

    try{

        const response = await fetch(file);

        if(!response.ok){

            throw new Error();

        }

        const html = await response.text();

        content.innerHTML = html;

    }

    catch(error){

        content.innerHTML = `

            <div class="content-card">

                <h2>

                    Unable to load page.

                </h2>

                <p>

                    Please try again.

                </p>

            </div>

        `;

    }

    hideLoader();

}

/*====================================================
ROUTER
====================================================*/

function navigate(){

    let page =

    location.hash.replace("#","");

    if(page===""){

        page="dashboard";

    }

    loadPage(page);

}

/*====================================================
HASH CHANGE
====================================================*/

window.addEventListener(

    "hashchange",

    navigate

);

/*====================================================
INITIAL LOAD
====================================================*/

window.addEventListener(

    "DOMContentLoaded",

    ()=>{

        navigate();

    }

);
