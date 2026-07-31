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

function navigate(){

    const page =

    location.hash.replace("#","") ||

    "dashboard";

    loadPage(page);

}

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

    const file = `pages/${page}.html`;

    showLoader();

    try{

        const response = await fetch(file);

        if(!response.ok){

            throw new Error("Page not found");

        }

        const html = await response.text();

        content.innerHTML = html;

    }

    catch(error){

        content.innerHTML = `

        <div class="content-card">

            <h2>404</h2>

            <p>The page "${page}" could not be found.</p>

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
