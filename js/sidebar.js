/*====================================================
AFC ISIWU YOUTH PORTAL
sidebar.js
====================================================*/

"use strict";

/*====================================================
ELEMENTS
====================================================*/

const overlay = document.getElementById("overlay");

const sidebarLeft = document.getElementById("sidebarLeft");

const leftDrawer = document.getElementById("leftDrawer");

const rightDrawer = document.getElementById("rightDrawer");

const openLeftDrawer = document.getElementById("openLeftDrawer");

const closeLeftDrawer = document.getElementById("closeLeftDrawer");

const openRightDrawer = document.getElementById("openRightDrawer");

const closeRightDrawer = document.getElementById("closeRightDrawer");

const sidebarLinks = document.querySelectorAll(".sidebar-menu a");

const mobileNavLinks = document.querySelectorAll(".mobile-bottom-nav a");



/*====================================================
OPEN LEFT DRAWER
====================================================*/

function showLeftDrawer(){

    if(!leftDrawer) return;

    leftDrawer.classList.add("active");

    overlay.classList.add("active");

}



/*====================================================
CLOSE LEFT DRAWER
====================================================*/

function hideLeftDrawer(){

    if(!leftDrawer) return;

    leftDrawer.classList.remove("active");

}



/*====================================================
OPEN RIGHT DRAWER
====================================================*/

function showRightDrawer(){

    if(!rightDrawer) return;

    rightDrawer.classList.add("active");

    overlay.classList.add("active");

}



/*====================================================
CLOSE RIGHT DRAWER
====================================================*/

function hideRightDrawer(){

    if(!rightDrawer) return;

    rightDrawer.classList.remove("active");

}



/*====================================================
CLOSE EVERYTHING
====================================================*/

function closeAllDrawers(){

    hideLeftDrawer();

    hideRightDrawer();

    overlay.classList.remove("active");

}



/*====================================================
EVENTS
====================================================*/

if(openLeftDrawer){

    openLeftDrawer.addEventListener(

        "click",

        showLeftDrawer

    );

}



if(closeLeftDrawer){

    closeLeftDrawer.addEventListener(

        "click",

        hideLeftDrawer

    );

}



if(openRightDrawer){

    openRightDrawer.addEventListener(

        "click",

        showRightDrawer

    );

}



if(closeRightDrawer){

    closeRightDrawer.addEventListener(

        "click",

        hideRightDrawer

    );

}



if(overlay){

    overlay.addEventListener(

        "click",

        closeAllDrawers

    );

}

/*====================================================
ACTIVE SIDEBAR
====================================================*/

function setActiveMenu(target){

    sidebarLinks.forEach(link=>{

        link.classList.remove("active");

    });

    mobileNavLinks.forEach(link=>{

        link.classList.remove("active");

    });

    sidebarLinks.forEach(link=>{

        if(link.getAttribute("href")===target){

            link.classList.add("active");

        }

    });

    mobileNavLinks.forEach(link=>{

        if(link.getAttribute("href")===target){

            link.classList.add("active");

        }

    });

}



/*====================================================
SIDEBAR CLICK
====================================================*/

sidebarLinks.forEach(link=>{

    link.addEventListener("click",()=>{

        setActiveMenu(

            link.getAttribute("href")

        );

    });

});



mobileNavLinks.forEach(link=>{

    link.addEventListener("click",()=>{

        setActiveMenu(

            link.getAttribute("href")

        );

        closeAllDrawers();

    });

});



/*====================================================
ESC CLOSE
====================================================*/

document.addEventListener(

    "keydown",

    e=>{

        if(e.key==="Escape"){

            closeAllDrawers();

        }

    }

);



/*====================================================
WINDOW RESIZE
====================================================*/

window.addEventListener(

    "resize",

    ()=>{

        if(window.innerWidth>992){

            closeAllDrawers();

        }

    }

);



/*====================================================
INITIAL STATE
====================================================*/

closeAllDrawers();
