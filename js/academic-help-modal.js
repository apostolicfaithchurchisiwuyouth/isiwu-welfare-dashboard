/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: academic-help-modal.js
   PURPOSE:
   ACADEMIC HELP OPTIONS + HOLIDAY SKILLS ACCESS CONTROL
   ============================================================ */


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
           HOLIDAY SKILLS CONFIGURATION

           Change holidaySkillsEnabled to true when the
           Holiday Learning Hub should be open.
           ==================================================== */

        const ACADEMIC_HELP_CONFIG = {

            holidaySkillsEnabled: false

        };


        /* ====================================================
           MODAL
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
           HOLIDAY ACCESS
           ==================================================== */

        function configureHolidaySkills() {

            if (!holidayOption) {
                return;
            }


            const isOpen =
                ACADEMIC_HELP_CONFIG
                    .holidaySkillsEnabled === true;


            /* ================================================
               HOLIDAY PERIOD OPEN
               ================================================ */

            if (isOpen) {

                holidayOption.classList.remove(
                    "is-locked"
                );


                holidayOption.removeAttribute(
                    "aria-disabled"
                );


                holidayOption.removeAttribute(
                    "tabindex"
                );


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


                return;

            }


            /* ================================================
               SCHOOL PERIOD — LOCKED
               ================================================ */

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


            if (holidayBadge) {

                holidayBadge.textContent =
                    "LOCKED";

            }


            if (holidayDescription) {

                holidayDescription.textContent =
                    "This learning space opens during school holidays.";

            }


            if (holidayNote) {

                holidayNote.hidden = false;

            }


            holidayOption.addEventListener(
                "click",
                (event) => {

                    event.preventDefault();

                }
            );

        }


        /* ====================================================
           EVENTS
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
