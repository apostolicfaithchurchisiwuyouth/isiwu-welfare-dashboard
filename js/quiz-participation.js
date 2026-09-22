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
    let currentQuizData = null;
    let participationData = null;
    let isLoading = false;


    /* ============================================================
       DOM ELEMENTS
       ============================================================ */

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

    const retryButton =
        document.getElementById(
            "participationRetryButton"
        );

    const content =
        document.getElementById(
            "participationContent"
        );

    const currentLessonNumber =
        document.getElementById(
            "participationCurrentLesson"
        );

    const currentLessonStatus =
        document.getElementById(
            "participationLessonStatus"
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

    const participationPercentage =
        document.getElementById(
            "participationPercentage"
        );

    const progressBar =
        document.getElementById(
            "participationProgressBar"
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


    async function initialize() {

        bindEvents();

        resetParticipationView();

        await loadCurrentQuiz();
    }


    /* ============================================================
       EVENT BINDINGS
       ============================================================ */

    function bindEvents() {

        /*
         * Search
         */

        if (searchInput) {

            searchInput.addEventListener(
                "input",
                handleSearch
            );
        }


        /*
         * Retry
         */

        if (retryButton) {

            retryButton.addEventListener(
                "click",
                function () {

                    loadCurrentQuiz();
                }
            );
        }
    }


    /* ============================================================
       LOAD CURRENT QUIZ
       ============================================================ */

    async function loadCurrentQuiz() {

        if (isLoading) {
            return;
        }

        isLoading = true;

        showLoading();


        try {

            const url =
                API_URL +
                "?action=getQuiz";


            console.log(
                "Current Quiz API:",
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
                    "Unable to connect to the quiz service."
                );
            }


            const data =
                await response.json();


            console.log(
                "Current Quiz Data:",
                data
            );


            if (!data.success) {

                throw new Error(
                    data.message ||
                    "Unable to load the current quiz."
                );
            }


            currentQuizData =
                data;


            const lessonNo =
                extractLessonNumber(
                    data
                );


            if (!lessonNo) {

                throw new Error(
                    "The current quiz does not have a valid lesson number."
                );
            }


            currentLessonNo =
                lessonNo;


            updateCurrentQuizHeader(
                data
            );


            /*
             * Now load participation for the
             * automatically detected current lesson.
             */

            await loadParticipation(
                lessonNo
            );


        } catch (error) {

            console.error(
                "Current Quiz Error:",
                error
            );


            showError(
                error.message ||
                "Something went wrong while loading the current quiz."
            );

        } finally {

            isLoading = false;
        }
    }


    /* ============================================================
       EXTRACT CURRENT LESSON NUMBER
       ============================================================ */

    function extractLessonNumber(
        data
    ) {

        if (!data) {
            return "";
        }


        /*
         * Direct fields
         */

        const directValues = [
            data.lessonNo,
            data.lessonNumber,
            data.lesson,
            data.currentLessonNo,
            data.currentLessonNumber
        ];


        for (
            let i = 0;
            i < directValues.length;
            i++
        ) {

            const lessonNo =
                normalizeLessonNumber(
                    directValues[i]
                );


            if (lessonNo) {
                return lessonNo;
            }
        }


        /*
         * Some API responses place quiz information
         * inside another object.
         */

        const nestedObjects = [
            data.quiz,
            data.currentQuiz,
            data.data,
            data.result
        ];


        for (
            let i = 0;
            i < nestedObjects.length;
            i++
        ) {

            const object =
                nestedObjects[i];


            if (
                !object ||
                typeof object !== "object"
            ) {
                continue;
            }


            const nestedValues = [
                object.lessonNo,
                object.lessonNumber,
                object.lesson,
                object.currentLessonNo,
                object.currentLessonNumber
            ];


            for (
                let j = 0;
                j < nestedValues.length;
                j++
            ) {

                const lessonNo =
                    normalizeLessonNumber(
                        nestedValues[j]
                    );


                if (lessonNo) {
                    return lessonNo;
                }
            }
        }


        return "";
    }


    /* ============================================================
       UPDATE CURRENT QUIZ HEADER
       ============================================================ */

    function updateCurrentQuizHeader(
        data
    ) {

        if (currentLessonNumber) {

            currentLessonNumber.textContent =
                `Lesson ${currentLessonNo}`;
        }


        if (!currentLessonStatus) {
            return;
        }


        const status =
            getQuizStatus(
                data
            );


        if (status === "closed") {

            currentLessonStatus.textContent =
                "Closed";

            currentLessonStatus.dataset.status =
                "closed";

            return;
        }


        if (status === "open") {

            currentLessonStatus.textContent =
                "Open";

            currentLessonStatus.dataset.status =
                "open";

            return;
        }


        /*
         * If the backend doesn't provide a clear
         * open/closed value, use a neutral status.
         */

        currentLessonStatus.textContent =
            "Current";

        currentLessonStatus.dataset.status =
            "current";
    }


    /* ============================================================
       GET QUIZ STATUS
       ============================================================ */

    function getQuizStatus(
        data
    ) {

        if (!data) {
            return "";
        }


        /*
         * Explicit boolean values first.
         */

        const booleanValues = [
            data.isOpen,
            data.open,
            data.quizOpen,
            data.isActive
        ];


        for (
            let i = 0;
            i < booleanValues.length;
            i++
        ) {

            const value =
                booleanValues[i];


            if (
                value === true ||
                value === "true" ||
                value === "TRUE" ||
                value === 1 ||
                value === "1"
            ) {

                return "open";
            }


            if (
                value === false ||
                value === "false" ||
                value === "FALSE" ||
                value === 0 ||
                value === "0"
            ) {

                return "closed";
            }
        }


        /*
         * Text status fields.
         */

        const statusValues = [
            data.status,
            data.quizStatus,
            data.lessonStatus,
            data.openStatus,
            data.quizState
        ];


        for (
            let i = 0;
            i < statusValues.length;
            i++
        ) {

            const status =
                String(
                    statusValues[i] ||
                    ""
                )
                    .trim()
                    .toLowerCase();


            if (!status) {
                continue;
            }


            if (
                status.includes("closed") ||
                status === "close" ||
                status === "ended" ||
                status === "inactive"
            ) {

                return "closed";
            }


            if (
                status.includes("open") ||
                status === "active" ||
                status === "running"
            ) {

                return "open";
            }
        }


        return "";
    }


    /* ============================================================
       LOAD PARTICIPATION
       ============================================================ */

    async function loadParticipation(
        lessonNo
    ) {

        const normalizedLesson =
            normalizeLessonNumber(
                lessonNo
            );


        if (!normalizedLesson) {

            throw new Error(
                "A valid lesson number is required to load participation."
            );
        }


        currentLessonNo =
            normalizedLesson;


        try {

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


            participationData =
                data;


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


        const members =
            Array.isArray(
                data.members
            )
                ? data.members
                : [];


        /*
         * Separate members.
         */

        const participated =
            members.filter(
                function (member) {

                    return isCompletedMember(
                        member
                    );
                }
            );


        const notParticipated =
            members.filter(
                function (member) {

                    return !isCompletedMember(
                        member
                    );
                }
            );


        /*
         * Backend counts remain the primary source.
         * Local member counts are the fallback.
         */

        const total =
            getNumericValue(
                data.totalMembers,
                members.length
            );


        const taken =
            getNumericValue(
                data.completed,
                participated.length
            );


        const notTaken =
            getNumericValue(
                data.notCompleted,
                notParticipated.length
            );


        let percentage =
            getNumericValue(
                data.completionPercentage,
                calculatePercentage(
                    taken,
                    total
                )
            );


        /*
         * Keep percentage within 0–100.
         */

        percentage =
            Math.max(
                0,
                Math.min(
                    100,
                    percentage
                )
            );


        /*
         * Summary.
         */

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


        if (participationPercentage) {

            participationPercentage.textContent =
                `${formatPercentage(
                    percentage
                )}%`;
        }


        /*
         * Progress bar.
         */

        if (progressBar) {

            progressBar.style.width =
                `${percentage}%`;

            progressBar.setAttribute(
                "aria-valuenow",
                String(
                    percentage
                );
            );
        }


        /*
         * Badges.
         */

        if (takenBadge) {

            takenBadge.textContent =
                taken;
        }


        if (notTakenBadge) {

            notTakenBadge.textContent =
                notTaken;
        }


        /*
         * Current lesson.
         */

        if (currentLessonNumber) {

            currentLessonNumber.textContent =
                `Lesson ${currentLessonNo}`;
        }


        /*
         * If participation endpoint gives a status,
         * update the header only when the current quiz
         * status was not already determined.
         */

        if (
            currentLessonStatus &&
            getQuizStatus(
                currentQuizData
            ) === ""
        ) {

            const participationStatus =
                String(
                    data.quizStatus ||
                    data.lessonStatus ||
                    data.statusText ||
                    ""
                )
                    .trim()
                    .toLowerCase();


            if (
                participationStatus.includes(
                    "closed"
                )
            ) {

                currentLessonStatus.textContent =
                    "Closed";

                currentLessonStatus.dataset.status =
                    "closed";

            } else {

                currentLessonStatus.textContent =
                    "Current";

                currentLessonStatus.dataset.status =
                    "current";
            }
        }


        /*
         * Member lists.
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


        /*
         * Reset search when fresh data loads.
         */

        if (searchInput) {

            searchInput.value = "";
        }
    }


    /* ============================================================
       NUMERIC VALUE
       ============================================================ */

    function getNumericValue(
        value,
        fallback
    ) {

        const number =
            Number(
                value
            );


        return Number.isFinite(
            number
        )
            ? number
            : fallback;
    }


    /* ============================================================
       CALCULATE PERCENTAGE
       ============================================================ */

    function calculatePercentage(
        completed,
        total
    ) {

        const completedNumber =
            Number(
                completed
            );


        const totalNumber =
            Number(
                total
            );


        if (
            !Number.isFinite(
                completedNumber
            ) ||
            !Number.isFinite(
                totalNumber
            ) ||
            totalNumber <= 0
        ) {

            return 0;
        }


        return (
            completedNumber /
            totalNumber
        ) * 100;
    }


    /* ============================================================
       FORMAT PERCENTAGE
       ============================================================ */

    function formatPercentage(
        percentage
    ) {

        const number =
            Number(
                percentage
            );


        if (
            !Number.isFinite(
                number
            )
        ) {

            return "0";
        }


        if (
            Number.isInteger(
                number
            )
        ) {

            return String(
                number
            );
        }


        return number
            .toFixed(1)
            .replace(
                /\.0$/,
                ""
            );
    }


    /* ============================================================
       CHECK MEMBER COMPLETION
       ============================================================ */

    function isCompletedMember(
        member
    ) {

        if (!member) {
            return false;
        }


        /*
         * Explicit completion values.
         */

        if (
            member.completed === true ||
            member.completed === "true" ||
            member.completed === "TRUE" ||
            member.completed === 1 ||
            member.completed === "1"
        ) {

            return true;
        }


        /*
         * Status values.
         */

        const status =
            String(
                member.status ||
                member.completionStatus ||
                member.participationStatus ||
                ""
            )
                .trim()
                .toLowerCase();


        if (
            status === "completed" ||
            status === "complete" ||
            status === "participated" ||
            status === "taken" ||
            status === "yes"
        ) {

            return true;
        }


        /*
         * Alternative backend fields.
         */

        if (
            member.hasCompleted === true ||
            member.hasCompleted === "true" ||
            member.hasCompleted === "TRUE" ||
            member.hasCompleted === 1 ||
            member.hasCompleted === "1"
        ) {

            return true;
        }


        if (
            member.hasParticipated === true ||
            member.hasParticipated === "true" ||
            member.hasParticipated === "TRUE" ||
            member.hasParticipated === 1 ||
            member.hasParticipated === "1"
        ) {

            return true;
        }


        return false;
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


        if (
            !Array.isArray(
                members
            ) ||
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

                if (!member) {
                    return;
                }


                const name =
                    getMemberName(
                        member
                    );


                const memberId =
                    getMemberId(
                        member
                    );


                if (!name) {
                    return;
                }


                const group =
                    getMemberGroup(
                        member
                    );


                const role =
                    getMemberRole(
                        member
                    );


                /*
                 * Main row.
                 */

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "participation-member";


                /*
                 * Search data.
                 */

                item.dataset.name =
                    name.toLowerCase();


                item.dataset.memberId =
                    memberId.toLowerCase();


                item.dataset.group =
                    group.toLowerCase();


                item.dataset.role =
                    role.toLowerCase();


                /*
                 * Avatar.
                 */

                const avatar =
                    document.createElement(
                        "div"
                    );


                avatar.className =
                    "participation-member-avatar";


                avatar.setAttribute(
                    "aria-hidden",
                    "true"
                );


                avatar.textContent =
                    getInitials(
                        name
                    );


                /*
                 * Identity.
                 */

                const identity =
                    document.createElement(
                        "div"
                    );


                identity.className =
                    "participation-member-identity";


                const nameElement =
                    document.createElement(
                        "div"
                    );


                nameElement.className =
                    "participation-member-name";


                nameElement.textContent =
                    name;


                identity.appendChild(
                    nameElement
                );


                if (memberId) {

                    const idElement =
                        document.createElement(
                            "div"
                        );


                    idElement.className =
                        "participation-member-id";


                    idElement.textContent =
                        memberId;


                    identity.appendChild(
                        idElement
                    );
                }


                /*
                 * Group.
                 */

                const groupElement =
                    document.createElement(
                        "div"
                    );


                groupElement.className =
                    "participation-member-group";


                groupElement.textContent =
                    group || "—";


                /*
                 * Role.
                 */

                const roleElement =
                    document.createElement(
                        "div"
                    );


                roleElement.className =
                    "participation-member-role";


                roleElement.textContent =
                    role || "—";


                /*
                 * Build row.
                 */

                item.appendChild(
                    avatar
                );


                item.appendChild(
                    identity
                );


                item.appendChild(
                    groupElement
                );


                item.appendChild(
                    roleElement
                );


                listElement.appendChild(
                    item
                );
            }
        );


        /*
         * If all supplied records were invalid,
         * show the empty state.
         */

        if (
            listElement.children.length === 0
        ) {

            if (emptyElement) {

                emptyElement.classList.remove(
                    "hidden"
                );
            }
        }
    }


    /* ============================================================
       GET MEMBER NAME
       ============================================================ */

    function getMemberName(
        member
    ) {

        return String(
            member.name ||
            member.memberName ||
            member.fullName ||
            member.displayName ||
            ""
        ).trim();
    }


    /* ============================================================
       GET MEMBER ID
       ============================================================ */

    function getMemberId(
        member
    ) {

        return String(
            member.memberId ||
            member.memberID ||
            member.id ||
            member.memberCode ||
            ""
        ).trim();
    }


    /* ============================================================
       GET MEMBER GROUP
       ============================================================ */

    function getMemberGroup(
        member
    ) {

        return String(
            member.group ||
            member.memberGroup ||
            member.groupName ||
            member.department ||
            ""
        ).trim();
    }


    /* ============================================================
       GET MEMBER ROLE
       ============================================================ */

    function getMemberRole(
        member
    ) {

        return String(
            member.groupRole ||
            member.memberRole ||
            member.role ||
            member.roleName ||
            ""
        ).trim();
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


                const memberId =
                    item.dataset.memberId ||
                    "";


                const group =
                    item.dataset.group ||
                    "";


                const role =
                    item.dataset.role ||
                    "";


                const matches =
                    !searchTerm ||
                    name.includes(
                        searchTerm
                    ) ||
                    memberId.includes(
                        searchTerm
                    ) ||
                    group.includes(
                        searchTerm
                    ) ||
                    role.includes(
                        searchTerm
                    );


                item.style.display =
                    matches
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

            content.classList.add(
                "hidden"
            );
        }


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


        if (participationPercentage) {

            participationPercentage.textContent =
                "—";
        }


        if (progressBar) {

            progressBar.style.width =
                "0%";

            progressBar.setAttribute(
                "aria-valuenow",
                "0"
            );
        }


        if (takenBadge) {

            takenBadge.textContent =
                "—";
        }


        if (notTakenBadge) {

            notTakenBadge.textContent =
                "—";
        }


        if (currentLessonNumber) {

            currentLessonNumber.textContent =
                "—";
        }


        if (currentLessonStatus) {

            currentLessonStatus.textContent =
                "—";

            currentLessonStatus.dataset.status =
                "";
        }


        if (takenList) {

            takenList.innerHTML =
                "";
        }


        if (notTakenList) {

            notTakenList.innerHTML =
                "";
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


        if (searchInput) {

            searchInput.value =
                "";
        }
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
            String(
                value
            ).trim();


        if (!text) {

            return "";
        }


        const match =
            text.match(
                /(\d+)/
            );


        if (!match) {

            return "";
        }


        const number =
            Number(
                match[1]
            );


        if (
            !Number.isFinite(
                number
            )
        ) {

            return "";
        }


        return String(
            number
        );
    }


    /* ============================================================
       GET INITIALS
       ============================================================ */

    function getInitials(
        name
    ) {

        const words =
            String(
                name
            )
                .trim()
                .split(
                    /\s+/
                )
                .filter(
                    Boolean
                );


        if (!words.length) {

            return "?";
        }


        if (
            words.length === 1
        ) {

            return words[0]
                .substring(
                    0,
                    2
                )
                .toUpperCase();
        }


        return (
            words[0].charAt(0) +
            words[
                words.length - 1
            ].charAt(0)
        ).toUpperCase();
    }

})();
