/**
 * ============================================================
 * AFC ISIU YOUTH PORTAL
 * FILE: hub-report-modals.js
 * PURPOSE: Generic bottom-sheet modal controller for hub cards
 * ============================================================
 *
 * Any hub card can open a bottom modal by carrying:
 *
 *     data-hub-modal="someModalId"
 *
 * ...where someModalId matches the id of a
 * .hub-report-modal element elsewhere on the page.
 *
 * Any element inside that modal (backdrop, close button)
 * can close it by carrying:
 *
 *     data-hub-modal-close
 *
 * This file is self-contained and does not depend on
 * academic-help-modal.js or any other modal controller.
 * ============================================================
 */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        setupHubReportModals();

    }
);


let activeHubModal = null;


function setupHubReportModals() {

    const triggers =
        document.querySelectorAll(
            "[data-hub-modal]"
        );


    triggers.forEach(
        function (trigger) {

            trigger.addEventListener(
                "click",
                function () {

                    const modalId =
                        trigger.dataset.hubModal;

                    if (!modalId) {
                        return;
                    }

                    openHubReportModal(
                        modalId
                    );

                }
            );

        }
    );


    document.addEventListener(
        "click",
        function (event) {

            const closeTrigger =
                event.target.closest(
                    "[data-hub-modal-close]"
                );

            if (!closeTrigger) {
                return;
            }

            closeHubReportModal();

        }
    );


    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key !== "Escape" &&
                event.key !== "Esc"
            ) {
                return;
            }

            closeHubReportModal();

        }
    );

}


function openHubReportModal(modalId) {

    const modal =
        document.getElementById(
            modalId
        );

    if (!modal) {
        return;
    }

    closeHubReportModal();

    modal.classList.add(
        "active"
    );

    modal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "hub-modal-open"
    );

    activeHubModal = modal;

    const closeButton =
        modal.querySelector(
            ".hub-report-modal-close"
        );

    if (closeButton) {

        window.setTimeout(
            function () {

                closeButton.focus();

            },
            120
        );

    }

}


function closeHubReportModal() {

    if (!activeHubModal) {
        return;
    }

    activeHubModal.classList.remove(
        "active"
    );

    activeHubModal.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "hub-modal-open"
    );

    activeHubModal = null;

}
