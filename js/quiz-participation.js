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
       DOM
       ============================================================ */

    const lessonSelect =
        document.getElementById("participationLessonSelect");

    const loadingState =
        document.getElementById("participationLoadingState");

    const errorState =
        document.getElementById("participationErrorState");

    const errorMessage =
        document.getElementById("participationErrorMessage");

    const content =
        document.getElementById("participationContent");

    const totalMembers =
        document.getElementById("participationTotalMembers");

    const takenCount =
        document.getElementById("participationTakenCount");

    const notTakenCount =
        document.getElementById("participationNotTakenCount");

    const searchInput =
        document.getElementById("participationSearchInput");

    const takenList =
        document.getElementById("participationTakenList");

    const takenEmpty =
        document.getElementById("participationTakenEmpty");

    const takenBadge =
        document.getElementById("participationTakenBadge");

    const notTakenList =
        document.getElementById("participationNotTakenList");

    const notTakenEmpty =
        document.getElementById("participationNotTakenEmpty");

    const notTakenBadge =
        document.getElementById("participationNotTakenBadge");


    /* ============================================================
       INITIALIZE
       ============================================================ */

    document.addEventListener("DOMContentLoaded", initialize);


    async function initialize() {

        if (!lessonSelect) {
            console.error(
                "Quiz Participation: lesson select not found."
            );
            return;
        }

        /*
         * IMPORTANT:
         * The page must NOT automatically show
         * "0 people participated".
         *
         * The user must first select a lesson.
         */

        resetParticipationView();

        /*
         * If the URL contains ?lessonNo=89,
         * select that lesson automatically.
         */
        const urlParams =
            new URLSearchParams(window.location.search);

        const urlLessonNo =
            normalizeLessonNumber(
                urlParams.get("lessonNo")
            );

        /*
         * For now, load the lesson numbers from the
         * Quiz Questions sheet through the backend.
         */
        try {

            await loadLessonNumbers();

            if (urlLessonNo) {

                const optionExists =
                    Array.from(
                        lessonSelect.options
                    ).some(
                        option =>
                            option.value === urlLessonNo
                    );

                if (optionExists) {

                    lessonSelect.value =
                        urlLessonNo;

                    await loadParticipation(
                        urlLessonNo
                    );
                }
            }

        } catch (error) {

            console.error(
                "Quiz Participation initialization error:",
                error
            );

            showError(
                error.message ||
                "Unable to load lesson numbers."
            );
        }

        /*
         * Listen for lesson selection.
         */
        lessonSelect.addEventListener(
            "change",
            handleLessonChange
        );

        /*
         * Search participants.
         */
        if (searchInput) {

            searchInput.addEventListener(
                "input",
                handleSearch
            );
        }
    }


    /* ============================================================
       LOAD LESSON NUMBERS
       ============================================================ */

    async function loadLessonNumbers() {

        /*
         * We use Quiz Questions because every quiz question
         * has a lesson number in column A.
         */
        const url =
            API_URL +
            "?action=getQuizParticipationLessons";

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
                "Unable to load lesson numbers."
            );
        }

        const data =
            await response.json();

        console.log(
            "Quiz participation lessons:",
            data
        );

        if (!data.success) {
            throw new Error(
                data.message ||
                "Unable to load lesson numbers."
            );
        }

        populateLessonSelect(
            data.lessons || []
        );
    }


    /* ============================================================
       POPULATE LESSON SELECT
       ============================================================ */

    function populateLessonSelect(lessons) {

        /*
         * Keep the first placeholder option.
         */
        lessonSelect.innerHTML =
            '<option value="">Select lesson number</option>';

        lessons
            .map(normalizeLessonNumber)
            .filter(Boolean)
            .sort(
                (a, b) =>
                    Number(a) - Number(b)
            )
            .forEach(
                lessonNo => {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        lessonNo;

                    option.textContent =
                        `Lesson ${lessonNo}`;

                    lessonSelect.appendChild(
                        option
                    );
                }
            );
    }


    /* ============================================================
       LESSON CHANGE
       ============================================================ */

    async function handleLessonChange(event) {

        const lessonNo =
            normalizeLessonNumber(
                event.target.value
            );

        /*
         * Nothing selected.
         */
        if (!lessonNo) {

            currentLessonNo = "";
            participationData = null;

            resetParticipationView();

            return;
        }

        await loadParticipation(
            lessonNo
        );
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

            const url =
                API_URL +
                "?action=getQuizParticipation" +
                "&lessonNo=" +
                encodeURIComponent(
                    currentLessonNo
                );

            console.log(
                "Loading participation:",
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
                    "Unable to connect to the participation service."
                );
            }

            const data =
                await response.json();

            console.log(
                "Quiz participation response:",
                data
            );

            if (!data.success) {

                throw new Error(
                    data.message ||
                    "Unable to load quiz participation."
                );
            }

            participationData =
                data;

            renderParticipation(
                data
            );

        } catch (error) {

            console.error(
                "Quiz participation error:",
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

    function renderParticipation(data) {

        hideAllStates();

        if (content) {
            content.classList.remove(
                "hidden"
            );
        }

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

        const total =
            Number(
                data.totalMembers
            ) ||
            (
                participated.length +
                notParticipated.length
            );

        const taken =
            Number(
                data.participatedCount
            ) ||
            participated.length;

        const notTaken =
            Number(
                data.notParticipatedCount
            ) ||
            notParticipated.length;

        if (totalMembers) {
            totalMembers.textContent =
                total;
        }

        if (takenCount) {
            takenCount.textContent =
                taken;
        }

        if (notTakenCount) {
            notTakenCount.textContent =
                notTaken;
        }

        if (takenBadge) {
            takenBadge.textContent =
                taken;
        }

        if (notTakenBadge) {
            notTakenBadge.textContent =
                notTaken;
        }

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
            return;
        }

        listElement.innerHTML = "";

        if (!members.length) {

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
            member => {

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

    function handleSearch(event) {

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
            item => {

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
       INITIAL / EMPTY STATE
       ============================================================ */

    function resetParticipationView() {

        hideAllStates();

        if (content) {

            content.classList.remove(
                "hidden"
            );
        }

        /*
         * We intentionally do NOT show zero
         * participation before a lesson is selected.
         */

        if (totalMembers) {
            totalMembers.textContent = "—";
        }

        if (takenCount) {
            takenCount.textContent = "—";
        }

        if (notTakenCount) {
            notTakenCount.textContent = "—";
        }

        if (takenBadge) {
            takenBadge.textContent = "—";
        }

        if (notTakenBadge) {
            notTakenBadge.textContent = "—";
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

        /*
         * Show a simple instruction.
         */
        showSelectionMessage();
    }


    /* ============================================================
       SELECTION MESSAGE
       ============================================================ */

    function showSelectionMessage() {

        /*
         * If the page already contains a suitable
         * selection message, use it.
         *
         * Otherwise create one.
         */

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
            <div class="participation-selection-icon">
                ✓
            </div>

            <div>
                <strong>
                    Select a lesson number
                </strong>

                <p>
                    Choose a lesson number above to see who participated in the quiz.
                </p>
            </div>
        `;

        message.classList.remove(
            "hidden"
        );
    }


    /* ============================================================
       STATE HELPERS
       ============================================================ */

    function showLoading() {

        hideAllStates();

        if (loadingState) {
            loadingState.classList.remove(
                "hidden"
            );
        }
    }


    function showError(message) {

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

    function normalizeLessonNumber(value) {

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

        /*
         * Handles values such as:
         * 89
         * "89"
         * "Lesson 89"
         */
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

    function getInitials(name) {

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

    function escapeHtml(value) {

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
