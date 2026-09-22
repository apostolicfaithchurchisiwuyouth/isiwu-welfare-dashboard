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

    const participationPercentage =
        document.getElementById(
            "participationPercentage"
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

    const currentLessonNumber =
        document.getElementById(
            "participationCurrentLesson"
        );

    const currentLessonStatus =
        document.getElementById(
            "participationLessonStatus"
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


        resetParticipationView();


        populateLessonSelect();


        /*
         * Direct lesson links:
         *
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

        } else {

            /*
             * Automatically load the latest recorded lesson.
             */
            loadLatestRecordedLesson();
        }


        /*
         * Lesson selection
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
         * Search
         */

        if (searchInput) {

            searchInput.addEventListener(
                "input",
                handleSearch
            );
        }
    }


    /* ============================================================
       LOAD LATEST RECORDED LESSON
       ============================================================ */

    async function loadLatestRecordedLesson() {

        showLoading();


        try {

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
                    "Unable to load recorded quiz lessons."
                );
            }


            const data =
                await response.json();


            console.log(
                "Quiz Participation Lessons:",
                data
            );


            if (!data.success) {

                throw new Error(
                    data.message ||
                    "Unable to load recorded quiz lessons."
                );
            }


            const lessons =
                extractLessonNumbers(
                    data
                );


            /*
             * If the backend gives us recorded lessons,
             * populate the dropdown from those lessons.
             */

            if (lessons.length) {

                populateLessonSelect(
                    lessons
                );


                const latestLesson =
                    lessons
                        .map(
                            function (lesson) {
                                return Number(lesson);
                            }
                        )
                        .filter(
                            function (lesson) {
                                return Number.isFinite(
                                    lesson
                                );
                            }
                        )
                        .sort(
                            function (a, b) {
                                return b - a;
                            }
                        )[0];


                if (
                    Number.isFinite(
                        latestLesson
                    )
                ) {

                    const lessonNo =
                        String(
                            latestLesson
                        );


                    lessonSelect.value =
                        lessonNo;


                    loadParticipation(
                        lessonNo
                    );


                    return;
                }
            }


            /*
             * Fallback.
             *
             * If the lessons endpoint returns no usable
             * list, we do not guess a lesson number.
             */

            showError(
                "No recorded quiz participation lesson was found."
            );

        } catch (error) {

            console.error(
                "Latest Quiz Participation Error:",
                error
            );


            showError(
                error.message ||
                "Something went wrong while loading quiz participation."
            );
        }
    }


    /* ============================================================
       EXTRACT LESSON NUMBERS
       ============================================================ */

    function extractLessonNumbers(
        data
    ) {

        const source =
            data.lessons ||
            data.data ||
            data.records ||
            [];


        if (!Array.isArray(source)) {

            return [];
        }


        const lessonNumbers =
            [];


        source.forEach(
            function (item) {

                let value = "";


                if (
                    typeof item ===
                    "object" &&
                    item !== null
                ) {

                    value =
                        item.lessonNo ||
                        item.lessonNumber ||
                        item.lesson ||
                        item.id ||
                        "";

                } else {

                    value =
                        item;
                }


                const lessonNo =
                    normalizeLessonNumber(
                        value
                    );


                if (
                    lessonNo &&
                    !lessonNumbers.includes(
                        lessonNo
                    )
                ) {

                    lessonNumbers.push(
                        lessonNo
                    );
                }
            }
        );


        return lessonNumbers;
    }


    /* ============================================================
       POPULATE LESSON SELECT
       ============================================================ */

    function populateLessonSelect(
        lessonNumbers
    ) {

        if (!lessonSelect) {
            return;
        }


        lessonSelect.innerHTML =
            '<option value="">Select lesson</option>';


        /*
         * Only use lessons actually returned by the backend.
         *
         * No hardcoded Lesson 1–89 list.
         */

        const lessons =
            Array.isArray(
                lessonNumbers
            )
                ? lessonNumbers
                : [];


        lessons
            .map(
                function (lesson) {
                    return normalizeLessonNumber(
                        lesson
                    );
                }
            )
            .filter(Boolean)
            .filter(
                function (
                    lesson,
                    index,
                    array
                ) {
                    return (
                        array.indexOf(
                            lesson
                        ) === index
                    );
                }
            )
            .sort(
                function (a, b) {
                    return Number(b) - Number(a);
                }
            )
            .forEach(
                function (lessonNo) {

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
         * Separate members according to backend status.
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
         * Counts
         */

        const total =
            Number(
                data.totalMembers
            );


        const taken =
            Number(
                data.completed
            );


        const notTaken =
            Number(
                data.notCompleted
            );


        const percentage =
            Number(
                data.completionPercentage
            );


        if (totalMembers) {

            totalMembers.textContent =
                Number.isFinite(total)
                    ? total
                    : members.length;
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


        if (participationPercentage) {

            participationPercentage.textContent =
                Number.isFinite(
                    percentage
                )
                    ? `${percentage}%`
                    : "0%";
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
         * Current lesson display
         */

        if (currentLessonNumber) {

            currentLessonNumber.textContent =
                `Lesson ${currentLessonNo}`;
        }


        if (currentLessonStatus) {

            /*
             * The participation endpoint represents
             * the selected lesson. We therefore show
             * it as the selected/recorded lesson.
             *
             * Actual quiz open/closed state can be
             * connected separately without affecting
             * participation data.
             */

            const status =
                String(
                    data.quizStatus ||
                    data.lessonStatus ||
                    data.statusText ||
                    ""
                )
                    .trim()
                    .toLowerCase();


            if (
                status.includes("closed") ||
                status.includes("close")
            ) {

                currentLessonStatus.textContent =
                    "Closed";

                currentLessonStatus.dataset.status =
                    "closed";

            } else {

                currentLessonStatus.textContent =
                    "Recorded";

                currentLessonStatus.dataset.status =
                    "recorded";
            }
        }


        /*
         * Render member lists.
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
         * Clear search when changing lesson.
         */

        if (searchInput) {

            searchInput.value = "";
        }
    }


    /* ============================================================
       CHECK MEMBER COMPLETION STATUS
       ============================================================ */

    function isCompletedMember(
        member
    ) {

        if (!member) {
            return false;
        }


        if (
            member.completed === true ||
            member.completed === "true" ||
            member.completed === "TRUE" ||
            member.completed === 1 ||
            member.completed === "1"
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
            member.hasParticipated === true ||
            member.hasParticipated === "true"
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

                const name =
                    String(
                        member.name ||
                        member.memberName ||
                        ""
                    ).trim();


                const memberId =
                    String(
                        member.memberId ||
                        member.id ||
                        ""
                    ).trim();


                if (!name) {
                    return;
                }


                const group =
                    String(
                        member.group ||
                        member.memberGroup ||
                        ""
                    ).trim();


                const role =
                    String(
                        member.groupRole ||
                        member.role ||
                        member.memberRole ||
                        ""
                    ).trim();


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
                 * Circular avatar
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


                /*
                 * Main identity
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
                 * Build the row.
                 *
                 * CSS will control the exact desktop
                 * and mobile alignment.
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

            content.classList.remove(
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
                <strong>Select a lesson to view participation</strong>
                <p>Choose a recorded lesson to see who participated.</p>
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
            ? String(
                Number(
                    match[1]
                )
            )
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
 
