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
    let loading = false;


    /* ============================================================
       DOM ELEMENTS
       ============================================================ */

    const loadingState =
        document.getElementById("participationLoadingState");

    const errorState =
        document.getElementById("participationErrorState");

    const errorMessage =
        document.getElementById("participationErrorMessage");

    const retryButton =
        document.getElementById("participationRetryButton");

    const content =
        document.getElementById("participationContent");

    const currentLessonNumber =
        document.getElementById("participationCurrentLesson");

    const currentLessonStatus =
        document.getElementById("participationLessonStatus");

    const currentLessonTitle =
        document.getElementById("participationCurrentTitle");

    const totalMembers =
        document.getElementById("participationTotalMembers");

    const takenCount =
        document.getElementById("participationTakenCount");

    const notTakenCount =
        document.getElementById("participationNotTakenCount");

    const participationPercentage =
        document.getElementById("participationPercentage");

    const progressBar =
        document.getElementById("participationProgressBar");

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

    document.addEventListener(
        "DOMContentLoaded",
        initialize
    );


    async function initialize() {

        bindEvents();

        resetView();

        await loadCurrentQuiz();
    }


    /* ============================================================
       EVENTS
       ============================================================ */

    function bindEvents() {

        if (searchInput) {

            searchInput.addEventListener(
                "input",
                handleSearch
            );
        }


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

        if (loading) {
            return;
        }

        loading = true;

        showLoading();


        try {

            const response =
                await fetch(
                    API_URL + "?action=getQuiz",
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
                "Current Quiz:",
                data
            );


            if (data.success === false) {

                throw new Error(
                    data.message ||
                    "Unable to load the current quiz."
                );
            }


            currentQuizData = data;


            const lessonNo =
                getLessonNumber(data);


            if (!lessonNo) {

                throw new Error(
                    "The current quiz does not contain a valid lesson number."
                );
            }


            currentLessonNo =
                lessonNo;


            updateQuizHeader(data);


            await loadParticipation(
                currentLessonNo
            );


        } catch (error) {

            console.error(
                "Quiz Participation:",
                error
            );


            showError(
                error.message ||
                "Something went wrong while loading quiz participation."
            );

        } finally {

            loading = false;
        }
    }


    /* ============================================================
       GET LESSON NUMBER
       ============================================================ */

    function getLessonNumber(data) {

        if (!data) {
            return "";
        }


        const objects = [
            data,
            data.quiz,
            data.currentQuiz,
            data.data,
            data.result
        ];


        for (
            let i = 0;
            i < objects.length;
            i++
        ) {

            const object =
                objects[i];


            if (
                !object ||
                typeof object !== "object"
            ) {
                continue;
            }


            const values = [
                object.lessonNo,
                object.lessonNumber,
                object.lesson,
                object.currentLessonNo,
                object.currentLessonNumber,
                object.lesson_id,
                object.lessonId
            ];


            for (
                let j = 0;
                j < values.length;
                j++
            ) {

                const lessonNo =
                    normalizeLessonNumber(
                        values[j]
                    );


                if (lessonNo) {

                    return lessonNo;
                }
            }
        }


        return "";
    }


    /* ============================================================
       GET LESSON TITLE
       ============================================================ */

    function getLessonTitle(data) {

        if (!data) {
            return "";
        }


        const objects = [
            data,
            data.quiz,
            data.currentQuiz,
            data.data,
            data.result
        ];


        for (
            let i = 0;
            i < objects.length;
            i++
        ) {

            const object =
                objects[i];


            if (
                !object ||
                typeof object !== "object"
            ) {
                continue;
            }


            const values = [
                object.lessonTitle,
                object.title,
                object.lessonName,
                object.topic,
                object.name
            ];


            for (
                let j = 0;
                j < values.length;
                j++
            ) {

                const value =
                    String(
                        values[j] || ""
                    ).trim();


                if (value) {

                    return value;
                }
            }
        }


        return "";
    }


    /* ============================================================
       UPDATE QUIZ HEADER
       ============================================================ */

    function updateQuizHeader(data) {

        if (currentLessonNumber) {

            currentLessonNumber.textContent =
                "Lesson " + currentLessonNo;
        }


        const title =
            getLessonTitle(data);


        if (currentLessonTitle) {

            currentLessonTitle.textContent =
                title || "Weekly SLC Quiz";
        }


        if (!currentLessonStatus) {
            return;
        }


        const status =
            getQuizStatus(data);


        currentLessonStatus.classList.remove(
            "is-open",
            "is-closed",
            "is-current"
        );


        if (status === "open") {

            currentLessonStatus.textContent =
                "Open";

            currentLessonStatus.dataset.status =
                "open";

            currentLessonStatus.classList.add(
                "is-open"
            );

            return;
        }


        if (status === "closed") {

            currentLessonStatus.textContent =
                "Closed";

            currentLessonStatus.dataset.status =
                "closed";

            currentLessonStatus.classList.add(
                "is-closed"
            );

            return;
        }


        currentLessonStatus.textContent =
            "Current";

        currentLessonStatus.dataset.status =
            "current";

        currentLessonStatus.classList.add(
            "is-current"
        );
    }


    /* ============================================================
       GET QUIZ STATUS
       ============================================================ */

    function getQuizStatus(data) {

        if (!data) {
            return "";
        }


        const objects = [
            data,
            data.quiz,
            data.currentQuiz,
            data.data,
            data.result
        ];


        for (
            let i = 0;
            i < objects.length;
            i++
        ) {

            const object =
                objects[i];


            if (
                !object ||
                typeof object !== "object"
            ) {
                continue;
            }


            const booleanValues = [
                object.isOpen,
                object.quizOpen,
                object.open,
                object.isActive
            ];


            for (
                let j = 0;
                j < booleanValues.length;
                j++
            ) {

                const value =
                    booleanValues[j];


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


            const statusValues = [
                object.status,
                object.quizStatus,
                object.lessonStatus,
                object.openStatus,
                object.quizState
            ];


            for (
                let j = 0;
                j < statusValues.length;
                j++
            ) {

                const status =
                    String(
                        statusValues[j] || ""
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
                "A valid lesson number is required."
            );
        }


        try {

            const url =
                API_URL +
                "?action=getQuizParticipation" +
                "&lessonNo=" +
                encodeURIComponent(
                    normalizedLesson
                );


            console.log(
                "Participation API:",
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
                "Participation Data:",
                data
            );


            if (data.success === false) {

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
                "Participation Error:",
                error
            );


            showError(
                error.message ||
                "Unable to load quiz participation."
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


        const members =
            Array.isArray(data.members)
                ? data.members
                : [];


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


        const total =
            getNumber(
                data.totalMembers,
                members.length
            );


        const taken =
            getNumber(
                data.completed,
                participated.length
            );


        const notTaken =
            getNumber(
                data.notCompleted,
                notParticipated.length
            );


        let percentage =
            getNumber(
                data.completionPercentage,
                calculatePercentage(
                    taken,
                    total
                )
            );


        percentage =
            Math.max(
                0,
                Math.min(
                    100,
                    percentage
                )
            );


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
                formatPercentage(
                    percentage
                ) + "%";
        }


        if (takenBadge) {

            takenBadge.textContent =
                taken;
        }


        if (notTakenBadge) {

            notTakenBadge.textContent =
                notTaken;
        }


        if (progressBar) {

            progressBar.style.width =
                percentage + "%";

            progressBar.setAttribute(
                "aria-valuenow",
                String(percentage)
            );
        }


        if (currentLessonNumber) {

            currentLessonNumber.textContent =
                "Lesson " + currentLessonNo;
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
       CHECK COMPLETION
       ============================================================ */

    function isCompletedMember(member) {

        if (!member) {
            return false;
        }


        const completed =
            member.completed;


        if (
            completed === true ||
            completed === "true" ||
            completed === "TRUE" ||
            completed === 1 ||
            completed === "1"
        ) {

            return true;
        }


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

                if (!member) {
                    return;
                }


                const name =
                    getMemberName(
                        member
                    );


                if (!name) {
                    return;
                }


                const memberId =
                    getMemberId(
                        member
                    );


                const group =
                    getMemberGroup(
                        member
                    );


                const role =
                    getMemberRole(
                        member
                    );


                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "participation-member";


                item.dataset.name =
                    name.toLowerCase();


                item.dataset.memberId =
                    memberId.toLowerCase();


                item.dataset.group =
                    group.toLowerCase();


                item.dataset.role =
                    role.toLowerCase();


                /*
                 * Identity column
                 */

                const identity =
                    document.createElement(
                        "div"
                    );


                identity.className =
                    "participation-member-identity";


                /*
                 * Avatar
                 */

                const avatar =
                    document.createElement(
                        "div"
                    );


                avatar.className =
                    "participation-member-avatar";


                avatar.textContent =
                    getInitials(
                        name
                    );


                avatar.setAttribute(
                    "aria-hidden",
                    "true"
                );


                /*
                 * Member information
                 */

                const info =
                    document.createElement(
                        "div"
                    );


                info.className =
                    "participation-member-info";


                const nameElement =
                    document.createElement(
                        "div"
                    );


                nameElement.className =
                    "participation-member-name";


                nameElement.textContent =
                    name;


                info.appendChild(
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


                    info.appendChild(
                        idElement
                    );
                }


                identity.appendChild(
                    avatar
                );


                identity.appendChild(
                    info
                );


                /*
                 * Group
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
                 * Role
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
                 * Complete row
                 */

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


        if (
            listElement.children.length === 0 &&
            emptyElement
        ) {

            emptyElement.classList.remove(
                "hidden"
            );
        }
    }


    /* ============================================================
       MEMBER NAME
       ============================================================ */

    function getMemberName(member) {

        return String(
            member.name ||
            member.memberName ||
            member.fullName ||
            member.displayName ||
            ""
        ).trim();
    }


    /* ============================================================
       MEMBER ID
       ============================================================ */

    function getMemberId(member) {

        return String(
            member.memberId ||
            member.memberID ||
            member.id ||
            member.memberCode ||
            ""
        ).trim();
    }


    /* ============================================================
       MEMBER GROUP
       ============================================================ */

    function getMemberGroup(member) {

        return String(
            member.group ||
            member.memberGroup ||
            member.groupName ||
            member.department ||
            ""
        ).trim();
    }


    /* ============================================================
       MEMBER ROLE
       ============================================================ */

    function getMemberRole(member) {

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

    function handleSearch(event) {

        const searchTerm =
            String(
                event.target.value || ""
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
                    item.dataset.name || "";


                const memberId =
                    item.dataset.memberId || "";


                const group =
                    item.dataset.group || "";


                const role =
                    item.dataset.role || "";


                const matches =
                    !searchTerm ||
                    name.includes(searchTerm) ||
                    memberId.includes(searchTerm) ||
                    group.includes(searchTerm) ||
                    role.includes(searchTerm);


                item.style.display =
                    matches
                        ? ""
                        : "none";
            }
        );
    }


    /* ============================================================
       RESET VIEW
       ============================================================ */

    function resetView() {

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


        if (currentLessonTitle) {

            currentLessonTitle.textContent =
                "Weekly SLC Quiz";
        }


        if (currentLessonStatus) {

            currentLessonStatus.textContent =
                "—";

            currentLessonStatus.dataset.status =
                "";

            currentLessonStatus.classList.remove(
                "is-open",
                "is-closed",
                "is-current"
            );
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
       LOADING STATE
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
       ERROR STATE
       ============================================================ */

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


    /* ============================================================
       HIDE ALL STATES
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

    function normalizeLessonNumber(value) {

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
       NUMBER HELPER
       ============================================================ */

    function getNumber(
        value,
        fallback
    ) {

        if (
            value === null ||
            value === undefined ||
            String(value).trim() === ""
        ) {

            return fallback;
        }


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
        value
    ) {

        const number =
            Number(
                value
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
       INITIALS
       ============================================================ */

    function getInitials(name) {

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
