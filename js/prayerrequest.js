/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: prayerrequest.js
   PURPOSE: PRAYER REQUEST FORM
============================================================ */

"use strict";


/* ============================================================
   API
   This now points to the SAME Apps Script deployment used by
   the SLC Quiz and Results pages, since PrayerRequestModule.gs
   lives inside that same project (see PrayerRequestModule.gs
   for how the shared doPost routes to it).
============================================================ */

const PRAYER_API =
    "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";


/* ============================================================
   STATE
============================================================ */

let isSubmittingPrayer = false;


/* ============================================================
   PAGE START
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        setupPrayerForm();

        setupPrayerScrollButtons();

    }
);


/* ============================================================
   DOM HELPERS
============================================================ */

function prayerElement(id) {

    return document.getElementById(id);

}


/* ============================================================
   SCROLL-TO BUTTONS
============================================================ */

function setupPrayerScrollButtons() {

    const buttons =
        document.querySelectorAll(
            "[data-scroll-to]"
        );


    buttons.forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    const targetId =
                        button.dataset.scrollTo;


                    const target =
                        prayerElement(
                            targetId
                        );


                    if (!target) return;


                    target.scrollIntoView({

                        behavior: "smooth",

                        block: "start"

                    });

                }
            );

        }
    );

}


/* ============================================================
   FORM SETUP
============================================================ */

function setupPrayerForm() {

    const form =
        prayerElement(
            "prayerRequestForm"
        );


    const anonymousToggle =
        prayerElement(
            "prayerAnonymous"
        );


    const messageField =
        prayerElement(
            "prayerMessage"
        );


    const characterCount =
        prayerElement(
            "prayerCharacterCount"
        );


    if (!form) return;


    /* --------------------------------------------------------
       ANONYMOUS TOGGLE
    -------------------------------------------------------- */

    if (anonymousToggle) {

        anonymousToggle.addEventListener(
            "change",
            function () {

                applyAnonymousState(
                    anonymousToggle.checked
                );

            }
        );

    }


    /* --------------------------------------------------------
       CHARACTER COUNT
    -------------------------------------------------------- */

    if (messageField && characterCount) {

        messageField.addEventListener(
            "input",
            function () {

                characterCount.textContent =
                    String(
                        messageField.value.length
                    );

            }
        );

    }


    /* --------------------------------------------------------
       SUBMIT
    -------------------------------------------------------- */

    form.addEventListener(
        "submit",
        handlePrayerSubmit
    );

}


/* ============================================================
   ANONYMOUS STATE
============================================================ */

function applyAnonymousState(
    isAnonymous
) {

    const nameField =
        prayerElement(
            "prayerName"
        );


    const nameLabel =
        prayerElement(
            "prayerNameLabel"
        );


    if (!nameField) return;


    if (isAnonymous) {

        nameField.value = "";

        nameField.disabled = true;

        nameField.required = false;

        nameField.placeholder =
            "Submitting anonymously";


        clearFieldError(
            "prayerName"
        );


        if (nameLabel) {

            nameLabel.innerHTML =
                "Your Name <span class=\"optional-tag\">(hidden — anonymous)</span>";

        }

    } else {

        nameField.disabled = false;

        nameField.required = true;

        nameField.placeholder =
            "Enter your name";


        if (nameLabel) {

            nameLabel.innerHTML =
                "Your Name <span>*</span>";

        }

    }

}


/* ============================================================
   FIELD ERROR HELPERS
============================================================ */

function setFieldError(
    fieldId,
    message
) {

    const errorElement =
        prayerElement(
            `${fieldId}Error`
        );


    if (errorElement) {

        errorElement.textContent =
            message || "";

    }

}


function clearFieldError(
    fieldId
) {

    setFieldError(
        fieldId,
        ""
    );

}


function clearAllFieldErrors() {

    [
        "prayerName",
        "prayerPhone",
        "prayerCategory",
        "prayerMessage"
    ].forEach(
        clearFieldError
    );

}


/* ============================================================
   VALIDATION
============================================================ */

function validatePrayerForm(
    isAnonymous
) {

    let isValid = true;


    clearAllFieldErrors();


    const nameField =
        prayerElement(
            "prayerName"
        );

    const phoneField =
        prayerElement(
            "prayerPhone"
        );

    const categoryField =
        prayerElement(
            "prayerCategory"
        );

    const messageField =
        prayerElement(
            "prayerMessage"
        );


    /* --------------------------------------------------------
       NAME
    -------------------------------------------------------- */

    if (
        !isAnonymous &&
        !nameField.value.trim()
    ) {

        setFieldError(
            "prayerName",
            "Please enter your name, or mark this as anonymous."
        );

        isValid = false;

    }


    /* --------------------------------------------------------
       PHONE (OPTIONAL, BUT VALIDATE IF FILLED)
    -------------------------------------------------------- */

    const phoneValue =
        phoneField.value.trim();


    if (
        phoneValue &&
        phoneValue.replace(/\D/g, "").length < 7
    ) {

        setFieldError(
            "prayerPhone",
            "Please enter a valid phone number."
        );

        isValid = false;

    }


    /* --------------------------------------------------------
       CATEGORY
    -------------------------------------------------------- */

    if (!categoryField.value) {

        setFieldError(
            "prayerCategory",
            "Please select a category."
        );

        isValid = false;

    }


    /* --------------------------------------------------------
       MESSAGE
    -------------------------------------------------------- */

    const messageValue =
        messageField.value.trim();


    if (!messageValue) {

        setFieldError(
            "prayerMessage",
            "Please share your prayer request."
        );

        isValid = false;

    } else if (messageValue.length < 5) {

        setFieldError(
            "prayerMessage",
            "Please share a little more detail."
        );

        isValid = false;

    }


    return isValid;

}


/* ============================================================
   BUTTON LOADING STATE
============================================================ */

function setPrayerButtonLoading(
    isLoading
) {

    const button =
        prayerElement(
            "submitPrayerBtn"
        );

    const label =
        prayerElement(
            "submitPrayerLabel"
        );

    const loading =
        prayerElement(
            "submitPrayerLoading"
        );


    if (!button) return;


    button.disabled =
        isLoading;


    if (label) {

        label.hidden =
            isLoading;

    }


    if (loading) {

        loading.hidden =
            !isLoading;

    }

}


/* ============================================================
   FORM STATUS MESSAGE
============================================================ */

function showPrayerFormStatus(
    message,
    type
) {

    const status =
        prayerElement(
            "prayerFormStatus"
        );


    if (!status) return;


    status.textContent =
        message || "";


    status.classList.remove(
        "success",
        "error"
    );


    if (type) {

        status.classList.add(
            type
        );

    }

}


/* ============================================================
   SUBMIT HANDLER
============================================================ */

async function handlePrayerSubmit(
    event
) {

    event.preventDefault();


    if (isSubmittingPrayer) {

        return;

    }


    const anonymousToggle =
        prayerElement(
            "prayerAnonymous"
        );

    const isAnonymous =
        !!(
            anonymousToggle &&
            anonymousToggle.checked
        );


    if (
        !validatePrayerForm(
            isAnonymous
        )
    ) {

        showPrayerFormStatus(
            "Please fix the highlighted fields and try again.",
            "error"
        );

        return;

    }


    if (
        !PRAYER_API ||
        PRAYER_API.includes(
            "PASTE_YOUR_APPS_SCRIPT"
        )
    ) {

        showPrayerFormStatus(
            "The prayer request backend isn't connected yet. Please contact the site admin.",
            "error"
        );

        return;

    }


    const payload = {

        action:
            "submitPrayerRequest",

        name:
            isAnonymous
                ? ""
                : prayerElement(
                    "prayerName"
                ).value.trim(),

        phone:
            prayerElement(
                "prayerPhone"
            ).value.trim(),

        category:
            prayerElement(
                "prayerCategory"
            ).value,

        message:
            prayerElement(
                "prayerMessage"
            ).value.trim(),

        anonymous:
            isAnonymous

    };


    isSubmittingPrayer = true;


    setPrayerButtonLoading(
        true
    );


    showPrayerFormStatus(
        "",
        ""
    );


    try {

        const response =
            await fetch(
                PRAYER_API,
                {

                    method: "POST",

                    /* ------------------------------------------
                       "text/plain" avoids a CORS preflight
                       request, which Apps Script web apps do
                       not handle. The backend still parses
                       this as JSON.
                    ------------------------------------------ */

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
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to submit your prayer request."
            );

        }


        showPrayerFormStatus(
            "Your prayer request has been received. Our prayer team will be standing with you.",
            "success"
        );


        resetPrayerForm();


    } catch (error) {

        console.error(
            "Prayer request submit error:",
            error
        );


        showPrayerFormStatus(
            "Something went wrong sending your request. Please check your connection and try again.",
            "error"
        );


    } finally {

        isSubmittingPrayer = false;


        setPrayerButtonLoading(
            false
        );

    }

}


/* ============================================================
   RESET FORM
============================================================ */

function resetPrayerForm() {

    const form =
        prayerElement(
            "prayerRequestForm"
        );


    const characterCount =
        prayerElement(
            "prayerCharacterCount"
        );


    const anonymousToggle =
        prayerElement(
            "prayerAnonymous"
        );


    if (form) {

        form.reset();

    }


    if (characterCount) {

        characterCount.textContent =
            "0";

    }


    if (anonymousToggle) {

        applyAnonymousState(
            anonymousToggle.checked
        );

    }


    clearAllFieldErrors();

}
