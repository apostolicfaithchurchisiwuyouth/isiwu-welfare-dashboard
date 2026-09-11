 js
/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: academic-help-modal.js
   PURPOSE:
   ACADEMIC HELP OPTIONS + HOLIDAY LEARNING ACCESS CONTROL
   ============================================================ */

"use strict";


document.addEventListener(
    "DOMContentLoaded",
    () => {


        /* ====================================================
           ELEMENTS
           ==================================================== */

        const trigger =
            document.getElementById(
                "academicHelpTrigger"
            );


        const modal =
            document.getElementById(
                "academicHelpModal"
            );


        const backdrop =
            document.getElementById(
                "academicHelpModalBackdrop"
            );


        const closeButton =
            document.getElementById(
                "academicHelpModalClose"
            );


        const holidayOption =
            document.getElementById(
                "holidaySkillsOption"
            );


        const holidayBadge =
            document.getElementById(
                "holidaySkillsBadge"
            );


        const holidayDescription =
            document.getElementById(
                "holidaySkillsDescription"
            );


        const holidayNote =
            document.getElementById(
                "holidaySkillsNote"
            );


        if (
            !trigger ||
            !modal
        ) {
            return;
        }


        /* ====================================================
           CONFIGURATION
           ==================================================== */

        const ACADEMIC_HELP_CONFIG = {

            HOLIDAY_API:
                "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec",

            HOLIDAY_STATUS_ACTION:
                "getHolidayLearningStatus",

            FAIL_CLOSED:
                true

        };


        /* ====================================================
           MODAL
           
           DO NOT CHANGE
           ==================================================== */

        function openAcademicHelpModal() {

            modal.classList.add(
                "is-open"
            );


            modal.setAttribute(
                "aria-hidden",
                "false"
            );


            document.body.classList.add(
                "academic-help-modal-open"
            );


            window.setTimeout(
                () => {

                    if (closeButton) {

                        closeButton.focus();

                    }

                },
                100
            );

        }


        function closeAcademicHelpModal() {

            modal.classList.remove(
                "is-open"
            );


            modal.setAttribute(
                "aria-hidden",
                "true"
            );


            document.body.classList.remove(
                "academic-help-modal-open"
            );


            trigger.focus();

        }


        /* ====================================================
           HOLIDAY API
           ==================================================== */

        async function getHolidayProgrammeStatus() {

            const url =
                new URL(
                    ACADEMIC_HELP_CONFIG.HOLIDAY_API
                );


            url.searchParams.set(
                "action",
                ACADEMIC_HELP_CONFIG
                    .HOLIDAY_STATUS_ACTION
            );


            const response =
                await fetch(
                    url.toString(),
                    {
                        method: "GET",
                        cache: "no-store",
                        headers: {
                            "Accept":
                                "application/json"
                        }
                    }
                );


            if (!response.ok) {

                throw new Error(
                    "Holiday Learning API returned HTTP " +
                    response.status
                );

            }


            const data =
                await response.json();


            return data;

        }


        /* ====================================================
           HOLIDAY CHECKING STATE
           
           IMPORTANT:
           We do NOT show LOCKED while the API is checking.

           The existing HOLIDAYS badge remains visible until
           the backend confirms OPEN or CLOSED.
           ==================================================== */

        function setHolidayCheckingState() {

            if (!holidayOption) {
                return;
            }


            /*
             * Keep the option visually neutral while checking.
             */

            holidayOption.classList.remove(
                "is-locked"
            );


            /*
             * It must still be inaccessible until the
             * backend confirms that it is open.
             */

            holidayOption.setAttribute(
                "aria-disabled",
                "true"
            );


            holidayOption.setAttribute(
                "tabindex",
                "-1"
            );


            holidayOption.dataset.holidayOpen =
                "false";


            /*
             * Keep the original badge from index.html:
             *
             * HOLIDAYS
             *
             * Do NOT change it to LOCKED while checking.
             */

            if (holidayBadge) {

                holidayBadge.textContent =
                    "HOLIDAYS";

            }


            if (holidayDescription) {

                holidayDescription.textContent =
                    "Use your school holiday to learn useful skills and discover new opportunities.";

            }


            /*
             * Do not show the closed note while checking.
             */

            if (holidayNote) {

                holidayNote.hidden =
                    true;

            }

        }


        /* ====================================================
           HOLIDAY ACCESS
           
           IMPORTANT:
           The Google Apps Script backend is the authority.

           We do NOT use a manual true/false switch here.
           ==================================================== */

        async function configureHolidaySkills() {

            if (!holidayOption) {
                return;
            }


            /*
             * Start with a neutral state.
             *
             * This prevents:
             *
             * LOCKED → OPEN
             *
             * flickering on page load.
             */

            setHolidayCheckingState();


            try {

                const response =
                    await getHolidayProgrammeStatus();


                if (
                    !response ||
                    response.success === false
                ) {

                    throw new Error(
                        response?.message ||
                        "Holiday programme status is unavailable."
                    );

                }


                const isOpen =
                    response.open === true;


                const programmeName =
                    String(
                        response.programmeName ||
                        "Holiday Learning"
                    ).trim();


                const programmeMessage =
                    String(
                        response.message ||
                        ""
                    ).trim();


                /* ==========================================
                   HOLIDAY PERIOD OPEN
                   ========================================== */

                if (isOpen) {

                    setHolidayOpenState(
                        programmeName
                    );

                    return;

                }


                /* ==========================================
                   HOLIDAY PERIOD CLOSED
                   ========================================== */

                setHolidayLockedState(
                    programmeMessage ||
                    "Holiday Learning is currently unavailable."
                );


            } catch (error) {

                console.warn(
                    "Holiday Learning access status could not be loaded:",
                    error
                );


                /*
                 * Fail closed.
                 *
                 * If the backend cannot be reached, users
                 * must not gain access simply because the
                 * browser cannot verify the holiday period.
                 */

                if (
                    ACADEMIC_HELP_CONFIG
                        .FAIL_CLOSED
                ) {

                    setHolidayLockedState(
                        "Holiday Learning availability could not be verified. Please try again."
                    );

                    return;

                }


                setHolidayLockedState(
                    "Holiday Learning is currently unavailable."
                );

            }

        }


        /* ====================================================
           HOLIDAY OPEN STATE
           ==================================================== */

        function setHolidayOpenState(
            programmeName
        ) {

            holidayOption.classList.remove(
                "is-locked"
            );


            holidayOption.removeAttribute(
                "aria-disabled"
            );


            holidayOption.removeAttribute(
                "tabindex"
            );


            holidayOption.dataset.holidayOpen =
                "true";


            if (holidayBadge) {

                holidayBadge.textContent =
                    "OPEN";

            }


            if (holidayDescription) {

                holidayDescription.textContent =
                    "Use your school holiday to learn useful skills and discover new opportunities.";

            }


            if (holidayNote) {

                holidayNote.hidden =
                    true;

            }


            holidayOption.setAttribute(
                "aria-label",
                programmeName +
                " — Holiday Learning is open"
            );

        }


        /* ====================================================
           HOLIDAY LOCKED STATE
           ==================================================== */

        function setHolidayLockedState(
            message
        ) {

            holidayOption.classList.add(
                "is-locked"
            );


            holidayOption.setAttribute(
                "aria-disabled",
                "true"
            );


            holidayOption.setAttribute(
                "tabindex",
                "-1"
            );


            holidayOption.dataset.holidayOpen =
                "false";


            if (holidayBadge) {

                holidayBadge.textContent =
                    "LOCKED";

            }


            if (holidayDescription) {

                holidayDescription.textContent =
                    "Use your school holiday to learn useful skills and discover new opportunities.";

            }


            if (holidayNote) {

                holidayNote.hidden =
                    false;

            }


            holidayOption.setAttribute(
                "aria-label",
                message ||
                "Holiday Learning is currently unavailable"
            );

        }


        /* ====================================================
           HOLIDAY OPTION CLICK PROTECTION
           ==================================================== */

        holidayOption &&
            holidayOption.addEventListener(
                "click",
                (event) => {

                    const isOpen =
                        holidayOption.dataset
                            .holidayOpen ===
                        "true";


                    /*
                     * Backend has not confirmed access yet,
                     * or the programme is closed.
                     */

                    if (!isOpen) {

                        event.preventDefault();
                        event.stopPropagation();

                        return;

                    }

                }
            );


        /* ====================================================
           EVENTS
           
           DO NOT CHANGE
           ==================================================== */

        trigger.addEventListener(
            "click",
            openAcademicHelpModal
        );


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                closeAcademicHelpModal
            );

        }


        if (backdrop) {

            backdrop.addEventListener(
                "click",
                closeAcademicHelpModal
            );

        }


        document.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key === "Escape" &&
                    modal.classList.contains(
                        "is-open"
                    )
                ) {

                    closeAcademicHelpModal();

                }

            }
        );


        /* ====================================================
           INITIALISE
           ==================================================== */

        configureHolidaySkills();

    }
);
 
