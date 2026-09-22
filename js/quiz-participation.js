/* ============================================================
   AFC ISIU YOUTH PORTAL
   QUIZ PARTICIPATION PAGE
   ============================================================ */

(function () {
    "use strict";

    /* ============================================================
       API
       ============================================================ */

    const API_URL =
        "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";


    /* ============================================================
       STATE
       ============================================================ */

    let currentLessonNo = "";
    let participationData = null;


    /* ============================================================
       DOM ELEMENTS
       ============================================================ */

    const lessonSelect =
        document.getElementById(
            "participationLessonSelect"
        );

    const loadingState =
        document.getElementById(
            "participationLoadingState"
        );

    const errorState =
        document.getElementById(
            "participationErrorState"
        );

    const errorMessage =
        document.getElementById(
            "participationErrorMessage"
        );

    const content =
        document.getElementById(
            "participationContent"
        );

    const totalMembers =
        document.getElementById(
            "participationTotalMembers"
        );

    const takenCount =
        document.getElementById(
            "participationTakenCount"
        );

    const notTakenCount =
        document.getElementById(
            "participationNotTakenCount"
        );

    const searchInput =
        document.getElementById(
            "participationSearchInput"
        );

    const takenList =
        document.getElementById(
            "participationTakenList"
        );

    const takenEmpty =
        document.getElementById(
            "participationTakenEmpty"
        );

    const takenBadge =
        document.getElementById(
            "participationTakenBadge"
        );

    const notTakenList =
        document.getElementById(
            "participationNotTakenList"
        );

    const notTakenEmpty =
        document.getElementById(
            "participationNotTakenEmpty"
        );

    const notTakenBadge =
        document.getElementById(
            "participationNotTakenBadge"
        );


    /* ============================================================
       INITIALIZE
       ============================================================ */

    document.addEventListener(
        "DOMContentLoaded",
        initialize
    );


    function initialize() {

        if (!lessonSelect) {

            console.error(
                "Quiz Participation: lesson select not found."
            );

            return;
        }


        /*
         * Start with a clean page.
         *
         * We do NOT load participation automatically.
         */
        resetParticipationView();


        /*
         * Build the lesson selector.
         *
         * We already know the available lesson numbers
         * are stored in the Quiz Questions sheet.
         *
         * For now we populate the selector directly with
         * Lesson 1 through the latest lesson.
         *
         * This avoids depending on another API endpoint.
         */
        populateLessonSelect();


        /*
         * Check whether a lesson number was supplied
         * in the URL.
         *
         * Example:
         * quiz-participation.html?lessonNo=89
         */
        const params =
            new URLSearchParams(
                window.location.search
            );

        const urlLessonNo =
            normalizeLessonNumber(
                params.get("lessonNo")
            );


        if (urlLessonNo) {

            lessonSelect.value =
                urlLessonNo;

            loadParticipation(
                urlLessonNo
            );
        }


        /*
         * Lesson selection.
         */
        lessonSelect.addEventListener(
            "change",
            function (event) {

                const lessonNo =
                    normalizeLessonNumber(
                        event.target.value
                    );

                if (!lessonNo) {

                    currentLessonNo = "";
                    participationData = null;

                    resetParticipationView();

                    return;
                }

                loadParticipation(
                    lessonNo
                );
            }
        );


        /*
         * Search.
         */
        if (searchInput) {

            searchInput.addEventListener(
                "input",
                handleSearch
            );
        }
    }


    /* ============================================================
       POPULATE LESSON SELECT
       ============================================================ */

    function populateLessonSelect() {

        lessonSelect.innerHTML =
            '<option value="">Select lesson number</option>';


        /*
         * Your current quiz system is already at Lesson 89.
         *
         * We therefore create the selector from Lesson 1
         * through Lesson 89.
         *
         * This is only the selector.
         * Actual participation still comes directly
         * from the backend.
         */
        for (
            let lessonNo = 1;
            lessonNo <= 89;
            lessonNo++
        ) {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                String(lessonNo);

            option.textContent =
                `Lesson ${lessonNo}`;

            lessonSelect.appendChild(
                option
            );
        }
    }


    /* ============================================================
       LOAD PARTICIPATION
       ============================================================ */

    async function loadParticipation(
        lessonNo
    ) {

        currentLessonNo =
            normalizeLessonNumber(
                lessonNo
            );


        if (!currentLessonNo) {

            resetParticipationView();

            return;
        }


        showLoading();


        try {

            /*
             * THIS is the endpoint we have already tested
             * successfully in Apps Script.
             */
            const url =
                API_URL +
                "?action=getQuizParticipation" +
                "&lessonNo=" +
                encodeURIComponent(
                    currentLessonNo
                );


            console.log(
                "Quiz Participation API:",
                url
            );


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
                    "Unable to connect to the quiz participation service."
                );
            }


            const data =
                await response.json();


            console.log(
                "Quiz Participation Data:",
                data
            );


            if (!data.success) {

                throw new Error(
                    data.message ||
                    "Unable to load quiz participation."
                );
            }


            /*
             * Store the REAL backend response.
             */
            participationData =
                data;


            /*
             * Render the REAL backend data.
             */
            renderParticipation(
                data
            );

        } catch (error) {

            console.error(
                "Quiz Participation Error:",
                error
            );


            showError(
                error.message ||
                "Something went wrong while loading quiz participation."
            );
        }
    }


    /* ============================================================
       RENDER PARTICIPATION
       ============================================================ */

    function renderParticipation(
        data
    ) {

        hideAllStates();


        if (content) {

            content.classList.remove(
                "hidden"
            );
        }


        /*
         * IMPORTANT:
         * These are the EXACT arrays returned by
         * getQuizParticipation().
         */
        const participated =
            Array.isArray(
                data.participated
            )
                ? data.participated
                : [];


        const notParticipated =
            Array.isArray(
                data.notParticipated
            )
                ? data.notParticipated
                : [];


        console.log(
            "People who participated:",
            participated
        );


        console.log(
            "People who have not participated:",
            notParticipated
        );


        /*
         * Use backend counts directly.
         */
        const total =
            Number(
                data.totalMembers
            );


        const taken =
            Number(
                data.participatedCount
            );


        const notTaken =
            Number(
                data.notParticipatedCount
            );


        if (totalMembers) {

            totalMembers.textContent =
                Number.isFinite(total)
                    ? total
                    : participated.length +
                      notParticipated.length;
        }


        if (takenCount) {

            takenCount.textContent =
                Number.isFinite(taken)
                    ? taken
                    : participated.length;
        }


        if (notTakenCount) {

            notTakenCount.textContent =
                Number.isFinite(notTaken)
                    ? notTaken
                    : notParticipated.length;
        }


        if (takenBadge) {

            takenBadge.textContent =
                Number.isFinite(taken)
                    ? taken
                    : participated.length;
        }


        if (notTakenBadge) {

            notTakenBadge.textContent =
                Number.isFinite(notTaken)
                    ? notTaken
                    : notParticipated.length;
        }


        /*
         * Render the actual people.
         */
        renderMemberList(
            participated,
            takenList,
            takenEmpty
        );


        renderMemberList(
            notParticipated,
            notTakenList,
            notTakenEmpty
        );


        if (searchInput) {

            searchInput.value = "";
        }
    }


    /* ============================================================
       RENDER MEMBER LIST
       ============================================================ */

    function renderMemberList(
        members,
        listElement,
        emptyElement
    ) {

        if (!listElement) {

            console.error(
                "Participation list element is missing."
            );

            return;
        }


        listElement.innerHTML = "";


        /*
         * No members.
         */
        if (
            !Array.isArray(members) ||
            members.length === 0
        ) {

            if (emptyElement) {

                emptyElement.classList.remove(
                    "hidden"
                );
            }

            return;
        }


        if (emptyElement) {

            emptyElement.classList.add(
                "hidden"
            );
        }


        members.forEach(
            function (member) {

                /*
                 * Backend returns:
                 *
                 * {
                 *   memberId: "...",
                 *   name: "..."
                 * }
                 */
                const name =
                    String(
                        member.name ||
                        ""
                    ).trim();


                const memberId =
                    String(
                        member.memberId ||
                        ""
                    ).trim();


                if (!name) {

                    return;
                }


                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "participation-member";


                item.dataset.name =
                    name.toLowerCase();


                item.innerHTML = `
                    <div class="participation-member-avatar">
                        ${getInitials(name)}
                    </div>

                    <div class="participation-member-info">

                        <div class="participation-member-name">
                            ${escapeHtml(name)}
                        </div>

                        ${
                            memberId
                                ? `
                                    <div class="participation-member-id">
                                        ${escapeHtml(memberId)}
                                    </div>
                                  `
                                : ""
                        }

                    </div>
                `;


                listElement.appendChild(
                    item
                );
            }
        );
    }


    /* ============================================================
       SEARCH
       ============================================================ */

    function handleSearch(
        event
    ) {

        const searchTerm =
            String(
                event.target.value ||
                ""
            )
                .trim()
                .toLowerCase();


        const items =
            document.querySelectorAll(
                ".participation-member"
            );


        items.forEach(
            function (item) {

                const name =
                    item.dataset.name ||
                    "";


                item.style.display =
                    !searchTerm ||
                    name.includes(searchTerm)
                        ? ""
                        : "none";
            }
        );
    }


    /* ============================================================
       RESET PAGE
       ============================================================ */

    function resetParticipationView() {

        hideAllStates();


        if (content) {

            content.classList.remove(
                "hidden"
            );
        }


        /*
         * Do not show false zero values.
         */
        if (totalMembers) {

            totalMembers.textContent =
                "—";
        }


        if (takenCount) {

            takenCount.textContent =
                "—";
        }


        if (notTakenCount) {

            notTakenCount.textContent =
                "—";
        }


        if (takenBadge) {

            takenBadge.textContent =
                "—";
        }


        if (notTakenBadge) {

            notTakenBadge.textContent =
                "—";
        }


        if (takenList) {

            takenList.innerHTML = "";
        }


        if (notTakenList) {

            notTakenList.innerHTML = "";
        }


        if (takenEmpty) {

            takenEmpty.classList.add(
                "hidden"
            );
        }


        if (notTakenEmpty) {

            notTakenEmpty.classList.add(
                "hidden"
            );
        }


        showSelectionMessage();
    }


    /* ============================================================
       SELECTION MESSAGE
       ============================================================ */

    function showSelectionMessage() {

        let message =
            document.getElementById(
                "participationSelectionMessage"
            );


        if (!message) {

            message =
                document.createElement(
                    "div"
                );


            message.id =
                "participationSelectionMessage";


            message.className =
                "participation-selection-message";


            if (content) {

                content.prepend(
                    message
                );
            }
        }


        message.innerHTML = `
            <div>
                <strong>
                    Select a lesson number
                </strong>

                <p>
                    Choose a lesson number to see quiz participation.
                </p>
            </div>
        `;


        message.classList.remove(
            "hidden"
        );
    }


    /* ============================================================
       LOADING
       ============================================================ */

    function showLoading() {

        hideAllStates();


        if (loadingState) {

            loadingState.classList.remove(
                "hidden"
            );
        }
    }


    /* ============================================================
       ERROR
       ============================================================ */

    function showError(
        message
    ) {

        hideAllStates();


        if (errorState) {

            errorState.classList.remove(
                "hidden"
            );
        }


        if (errorMessage) {

            errorMessage.textContent =
                message;
        }
    }


    /* ============================================================
       HIDE STATES
       ============================================================ */

    function hideAllStates() {

        if (loadingState) {

            loadingState.classList.add(
                "hidden"
            );
        }


        if (errorState) {

            errorState.classList.add(
                "hidden"
            );
        }


        if (content) {

            content.classList.add(
                "hidden"
            );
        }


        const selectionMessage =
            document.getElementById(
                "participationSelectionMessage"
            );


        if (selectionMessage) {

            selectionMessage.classList.add(
                "hidden"
            );
        }
    }


    /* ============================================================
       NORMALIZE LESSON NUMBER
       ============================================================ */

    function normalizeLessonNumber(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";
        }


        const text =
            String(value)
                .trim();


        if (!text) {

            return "";
        }


        const match =
            text.match(
                /(\d+)/
            );


        return match
            ? match[1]
            : "";
    }


    /* ============================================================
       INITIALS
       ============================================================ */

    function getInitials(
        name
    ) {

        const words =
            String(name)
                .trim()
                .split(/\s+/)
                .filter(Boolean);


        if (!words.length) {

            return "?";
        }


        if (words.length === 1) {

            return words[0]
                .substring(0, 2)
                .toUpperCase();
        }


        return (
            words[0].charAt(0) +
            words[
                words.length - 1
            ].charAt(0)
        ).toUpperCase();
    }


    /* ============================================================
       ESCAPE HTML
       ============================================================ */

    function escapeHtml(
        value
    ) {

        return String(value)
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }

})();
 
