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

        /* ========================================================
           ELEMENTS
           ======================================================== */

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


        /* ========================================================
           REQUIRED MODAL CHECK
           ======================================================== */

        if (!trigger || !modal) {
            return;
        }


        /* ========================================================
           CONFIGURATION
           ======================================================== */

        const ACADEMIC_HELP_CONFIG = {

            HOLIDAY_API:
                "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec",

            HOLIDAY_STATUS_ACTION:
                "getHolidayLearningStatus",

            FAIL_CLOSED:
                true

        };


        /* ========================================================
           HOLIDAY STATE
           ======================================================== */

        let holidaySkillsOpen = false;

        let holidayStatusResolved = false;


        /* ========================================================
           OPEN ACADEMIC HELP MODAL
           ======================================================== */

        function openAcademicHelpModal() {

            modal.classList.add("is-open");

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


        /* ========================================================
           CLOSE ACADEMIC HELP MODAL
           ======================================================== */

        function closeAcademicHelpModal() {

            modal.classList.remove("is-open");

            modal.setAttribute(
                "aria-hidden",
                "true"
            );

            document.body.classList.remove(
                "academic-help-modal-open"
            );

            trigger.focus();
        }


        /* ========================================================
           HOLIDAY STATUS REQUEST
           ======================================================== */

        async function getHolidayProgrammeStatus() {

            const url =
                ACADEMIC_HELP_CONFIG.HOLIDAY_API +
                "?action=" +
                encodeURIComponent(
                    ACADEMIC_HELP_CONFIG.HOLIDAY_STATUS_ACTION
                ) +
                "&_=" +
                Date.now();

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
                    "Holiday programme request failed."
                );
            }

            const data =
                await response.json();

            if (!data) {
                throw new Error(
                    "No holiday programme response received."
                );
            }

            if (data.success === false) {
                throw new Error(
                    data.message ||
                    "Holiday programme status could not be verified."
                );
            }

            return data;
        }


        /* ========================================================
           INITIAL / CHECKING STATE

           IMPORTANT:
           Do NOT visually show LOCKED while the API is checking.

           The user will initially see the existing:
           HOLIDAYS

           Once the backend responds:
           OPEN   = programme is available
           LOCKED = programme is closed
           ======================================================== */

        function setHolidayCheckingState() {

            if (!holidayOption) {
                return;
            }

            holidaySkillsOpen = false;

            holidayStatusResolved = false;

            /*
             * Keep the option visually neutral while checking.
             * This prevents the LOCKED → OPEN flicker.
             */

            holidayOption.classList.remove(
                "is-locked"
            );

            /*
             * It must still be inaccessible until the
             * backend confirms that the programme is open.
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
             * Keep the original neutral badge.
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
             * Do not show the closed message while checking.
             */

            if (holidayNote) {

                holidayNote.hidden = true;

            }
        }


        /* ========================================================
           HOLIDAY OPEN STATE
           ======================================================== */

        function setHolidayOpenState() {

            if (!holidayOption) {
                return;
            }

            holidaySkillsOpen = true;

            holidayStatusResolved = true;

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

                holidayNote.hidden = true;

            }


            holidayOption.setAttribute(
                "aria-label",
                "Holiday Learning Hub — Open"
            );
        }


        /* ========================================================
           HOLIDAY LOCKED STATE
           ======================================================== */

        function setHolidayLockedState(
            message
        ) {

            if (!holidayOption) {
                return;
            }

            holidaySkillsOpen = false;

            holidayStatusResolved = true;

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

                holidayNote.hidden = false;

                /*
                 * Keep the existing note text unless
                 * a specific message is supplied.
                 */

                if (message) {

                    const noteText =
                        holidayNote.querySelector(
                            "span"
                        );

                    if (noteText) {

                        noteText.textContent =
                            message;

                    }

                }

            }


            holidayOption.setAttribute(
                "aria-label",
                "Holiday Learning Hub — Currently locked"
            );
        }


        /* ========================================================
           CONFIGURE HOLIDAY LEARNING
           ======================================================== */

        async function configureHolidaySkills() {

            if (!holidayOption) {
                return;
            }

            /*
             * Start in a neutral checking state.
             * NEVER display LOCKED before the backend responds.
             */

            setHolidayCheckingState();


            try {

                const status =
                    await getHolidayProgrammeStatus();


                /*
                 * Backend is the final authority.
                 */

                if (
                    status.open === true
                ) {

                    setHolidayOpenState();

                    return;
                }


                /*
                 * Programme is officially closed.
                 */

                setHolidayLockedState(
                    status.message ||
                    "Holiday Learning Hub is currently closed and will open during the next school holiday."
                );

            } catch (error) {

                console.warn(
                    "Holiday Learning status check failed:",
                    error
                );


                /*
                 * Security rule:
                 * If the status cannot be verified,
                 * do not allow access.
                 */

                if (
                    ACADEMIC_HELP_CONFIG.FAIL_CLOSED
                ) {

                    setHolidayLockedState(
                        "Holiday Learning Hub availability could not be verified. Please try again later."
                    );

                } else {

                    /*
                     * This branch is intentionally available
                     * for future configuration, but the current
                     * configuration uses FAIL_CLOSED = true.
                     */

                    setHolidayLockedState();

                }

            }
        }


        /* ========================================================
           ACADEMIC HELP TRIGGER
           ======================================================== */

        trigger.addEventListener(
            "click",
            openAcademicHelpModal
        );


        /* ========================================================
           CLOSE BUTTON
           ======================================================== */

        if (closeButton) {

            closeButton.addEventListener(
                "click",
                closeAcademicHelpModal
            );

        }


        /* ========================================================
           BACKDROP CLOSE
           ======================================================== */

        if (backdrop) {

            backdrop.addEventListener(
                "click",
                closeAcademicHelpModal
            );

        }


        /* ========================================================
           ESCAPE KEY
           ======================================================== */

        document.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key === "Escape" &&
                    modal.classList.contains("is-open")
                ) {

                    closeAcademicHelpModal();

                }

            }
        );


        /* ========================================================
           HOLIDAY OPTION CLICK CONTROL
           ======================================================== */

        if (holidayOption) {

            holidayOption.addEventListener(
                "click",
                (event) => {

                    /*
                     * Never allow the link to open until the
                     * backend has explicitly confirmed OPEN.
                     */

                    if (
                        holidaySkillsOpen !== true
                    ) {

                        event.preventDefault();

                        event.stopPropagation();

                        return;
                    }

                    /*
                     * If OPEN, allow the normal href to work.
                     */

                }
            );

        }


        /* ========================================================
           INITIALISE HOLIDAY ACCESS CONTROL
           ======================================================== */

        configureHolidaySkills();

    }
);
 
