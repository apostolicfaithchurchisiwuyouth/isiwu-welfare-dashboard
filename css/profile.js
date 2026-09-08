/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   FILE: profile.js
   PURPOSE: PROFILE PAGE — NO LOGIN, IDENTITY COMES FROM THE
            SAME SELECTED-NAME SESSION USED BY THE SLC QUIZ
            AND RESULTS PAGES.
============================================================ */

"use strict";


/* ============================================================
   API
   Same shared Apps Script deployment as the quiz, results,
   and prayer request pages.
============================================================ */

const PROFILE_API =
    "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";


/* ============================================================
   STORAGE KEYS
   Deliberately identical to the keys used in results.js so a
   name selected on the quiz page is picked up here too.
============================================================ */

const PROFILE_MEMBER_KEY =
    "afc_isiu_slc_member_v1";

const PROFILE_SESSION_KEY =
    "afc_isiu_slc_quiz_session_v1";


/* ============================================================
   AVATAR OPTIONS
   Generated cartoon-style avatars via DiceBear — no image
   hosting or uploads needed. Each "seed" always produces the
   exact same picture, so we only ever store the seed string.
============================================================ */

const AVATAR_STYLE =
    "adventurer";

const AVATAR_SEEDS = [
    "Buddy", "Luna", "Max", "Zoe",
    "Milo", "Nina", "Kai", "Ivy",
    "Theo", "Ruby", "Sam", "Grace"
];


/* ============================================================
   STATE
============================================================ */

let profileMemberId = "";

let profileMemberName = "";

let currentAvatarSeed = "";

let isSavingAvatar = false;


/* ============================================================
   PAGE START
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        setupAvatarModalListeners();

        await identifyProfileMember();

    }
);


/* ============================================================
   DOM HELPERS
============================================================ */

function profileElement(id) {

    return document.getElementById(id);

}


function showProfileEl(id) {

    const element = profileElement(id);

    if (element) element.classList.remove("hidden");

}


function hideProfileEl(id) {

    const element = profileElement(id);

    if (element) element.classList.add("hidden");

}


/* ============================================================
   HTML ESCAPE
============================================================ */

function escapeProfileHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* ============================================================
   AVATAR URL BUILDER
============================================================ */

function buildAvatarUrl(seed) {

    const safeSeed =
        String(seed || "Guest")
            .trim() || "Guest";


    return (
        `https://api.dicebear.com/7.x/${AVATAR_STYLE}/svg?seed=` +
        encodeURIComponent(safeSeed)
    );

}


/* ============================================================
   IDENTIFY MEMBER
   Mirrors results.js: URL param, then quiz session, then
   the saved member, in that order.
============================================================ */

async function identifyProfileMember() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    profileMemberId =
        String(
            params.get("memberId") || ""
        ).trim();


    if (!profileMemberId) {

        try {

            const raw =
                sessionStorage.getItem(
                    PROFILE_SESSION_KEY
                );


            if (raw) {

                const parsed =
                    JSON.parse(raw);


                if (parsed && parsed.memberId) {

                    profileMemberId =
                        String(parsed.memberId).trim();


                    profileMemberName =
                        String(
                            parsed.memberName || ""
                        ).trim();

                }

            }

        } catch (error) {

            console.warn(
                "Unable to read quiz session.",
                error
            );

        }

    }


    if (!profileMemberId) {

        try {

            const raw =
                localStorage.getItem(
                    PROFILE_MEMBER_KEY
                );


            if (raw) {

                const parsed =
                    JSON.parse(raw);


                if (parsed && parsed.memberId) {

                    profileMemberId =
                        String(parsed.memberId).trim();


                    profileMemberName =
                        String(
                            parsed.memberName || ""
                        ).trim();

                }

            }

        } catch (error) {

            console.warn(
                "Unable to read saved member.",
                error
            );

        }

    }


    /* --------------------------------------------------------
       NO PARTICIPANT SELECTED YET
    -------------------------------------------------------- */

    if (!profileMemberId) {

        hideProfileEl("profileLoadingState");

        showProfileEl("profileEmptyState");

        return;

    }


    await loadProfileAndStats();

}


/* ============================================================
   LOAD PROFILE + QUIZ STATS
============================================================ */

async function loadProfileAndStats() {

    hideProfileEl("profileErrorState");

    hideProfileEl("profileEmptyState");

    hideProfileEl("profileCardSection");

    showProfileEl("profileLoadingState");


    try {

        const [
            profileResponse,
            historyResponse
        ] = await Promise.all([

            fetch(
                `${PROFILE_API}?action=getMemberProfile&memberId=${encodeURIComponent(profileMemberId)}`,
                { cache: "no-store" }
            ),

            fetch(
                `${PROFILE_API}?action=getMemberQuizHistory&memberId=${encodeURIComponent(profileMemberId)}`,
                { cache: "no-store" }
            )

        ]);


        if (!profileResponse.ok) {

            throw new Error(
                `HTTP ${profileResponse.status}`
            );

        }


        const profileData =
            await profileResponse.json();


        console.log(
            "Member profile:",
            profileData
        );


        if (!profileData.success) {

            throw new Error(
                profileData.message ||
                "Unable to load your profile."
            );

        }


        /* ----------------------------------------------------
           QUIZ STATS (NON-FATAL IF THIS FAILS)
        ---------------------------------------------------- */

        let quizzesCompleted = 0;

        let totalPoints = 0;


        try {

            if (historyResponse.ok) {

                const historyData =
                    await historyResponse.json();


                if (
                    historyData.success &&
                    Array.isArray(historyData.results)
                ) {

                    quizzesCompleted =
                        historyData.results.length;


                    totalPoints =
                        historyData.results.reduce(
                            function (total, result) {

                                const points =
                                    Number(
                                        result.pointsEarned ??
                                        result.points ??
                                        0
                                    );


                                return (
                                    total +
                                    (
                                        Number.isFinite(points)
                                            ? points
                                            : 0
                                    )
                                );

                            },
                            0
                        );

                }

            }

        } catch (error) {

            console.warn(
                "Unable to load quiz stats.",
                error
            );

        }


        renderProfile(
            profileData,
            quizzesCompleted,
            totalPoints
        );


        hideProfileEl("profileLoadingState");

        showProfileEl("profileCardSection");


    } catch (error) {

        console.error(
            "loadProfileAndStats error:",
            error
        );


        const errorMessage =
            profileElement(
                "profileErrorMessage"
            );


        if (errorMessage) {

            errorMessage.textContent =
                "Unable to load your profile right now. Please check your connection and try again.";

        }


        hideProfileEl("profileLoadingState");

        showProfileEl("profileErrorState");

    }

}


/* ============================================================
   RENDER PROFILE
============================================================ */

function renderProfile(
    data,
    quizzesCompleted,
    totalPoints
) {

    profileMemberName =
        String(data.name || profileMemberName || "").trim();


    currentAvatarSeed =
        String(data.avatarSeed || "").trim() ||
        profileMemberId ||
        profileMemberName ||
        "Guest";


    /* --------------------------------------------------------
       AVATAR + NAME
    -------------------------------------------------------- */

    const avatarImage =
        profileElement("profileAvatarImage");


    if (avatarImage) {

        avatarImage.src =
            buildAvatarUrl(
                currentAvatarSeed
            );

    }


    const nameElement =
        profileElement("profileName");


    if (nameElement) {

        nameElement.textContent =
            profileMemberName || "Portal Member";

    }


    /* --------------------------------------------------------
       ACTIVE BADGE
    -------------------------------------------------------- */

    const activeValue =
        String(data.active ?? "")
            .trim()
            .toLowerCase();


    const isActive =
        [
            "yes",
            "true",
            "active"
        ].includes(activeValue);


    if (isActive) {

        showProfileEl("profileActiveBadge");

    } else {

        hideProfileEl("profileActiveBadge");

    }


    /* --------------------------------------------------------
       BIRTHDAY (MONTH + DAY ONLY, NOT THE YEAR)
    -------------------------------------------------------- */

    const birthdayElement =
        profileElement("profileBirthday");


    if (birthdayElement) {

        birthdayElement.textContent =
            formatBirthday(
                data.birthday
            );

    }


    /* --------------------------------------------------------
       MEMBER SINCE
    -------------------------------------------------------- */

    const memberSinceElement =
        profileElement("profileMemberSince");


    if (memberSinceElement) {

        memberSinceElement.textContent =
            formatMemberSince(
                data.createdAt
            );

    }


    /* --------------------------------------------------------
       STATS
    -------------------------------------------------------- */

    const quizzesElement =
        profileElement("profileQuizzesCompleted");


    if (quizzesElement) {

        quizzesElement.textContent =
            String(quizzesCompleted);

    }


    const pointsElement =
        profileElement("profileTotalPoints");


    if (pointsElement) {

        pointsElement.textContent =
            String(totalPoints);

    }

}


/* ============================================================
   FORMAT BIRTHDAY (NO YEAR SHOWN)
============================================================ */

function formatBirthday(value) {

    if (!value) return "—";


    const date =
        new Date(value);


    if (Number.isNaN(date.getTime())) {

        return String(value);

    }


    return date.toLocaleDateString(
        "en-NG",
        {
            day: "numeric",
            month: "long"
        }
    );

}


/* ============================================================
   FORMAT MEMBER SINCE
============================================================ */

function formatMemberSince(value) {

    if (!value) return "—";


    const date =
        new Date(value);


    if (Number.isNaN(date.getTime())) {

        return String(value);

    }


    return date.toLocaleDateString(
        "en-NG",
        {
            month: "long",
            year: "numeric"
        }
    );

}


/* ============================================================
   AVATAR MODAL
============================================================ */

function setupAvatarModalListeners() {

    const editBtn =
        profileElement("editAvatarBtn");


    const closeBtn =
        profileElement("closeAvatarModalBtn");


    const overlay =
        profileElement("avatarModalOverlay");


    if (editBtn) {

        editBtn.addEventListener(
            "click",
            openAvatarModal
        );

    }


    if (closeBtn) {

        closeBtn.addEventListener(
            "click",
            closeAvatarModal
        );

    }


    if (overlay) {

        overlay.addEventListener(
            "click",
            closeAvatarModal
        );

    }

}


function openAvatarModal() {

    if (!profileMemberId) return;


    renderAvatarGrid();


    const modal =
        profileElement("avatarModal");


    if (modal) {

        modal.classList.remove("hidden");

    }


    document.body.style.overflow =
        "hidden";

}


function closeAvatarModal() {

    if (isSavingAvatar) return;


    const modal =
        profileElement("avatarModal");


    if (modal) {

        modal.classList.add("hidden");

    }


    document.body.style.overflow =
        "";

}


/* ============================================================
   RENDER AVATAR GRID
============================================================ */

function renderAvatarGrid() {

    const grid =
        profileElement("avatarGrid");


    if (!grid) return;


    grid.innerHTML =
        AVATAR_SEEDS
            .map(
                function (seed) {

                    const isSelected =
                        seed === currentAvatarSeed;


                    return `

                        <button
                            type="button"
                            class="profile-avatar-option${
                                isSelected ? " selected" : ""
                            }"
                            data-seed="${escapeProfileHTML(seed)}"
                            aria-label="Choose ${escapeProfileHTML(seed)} avatar"
                        >

                            <img
                                src="${buildAvatarUrl(seed)}"
                                alt=""
                                loading="lazy"
                            >

                        </button>

                    `;

                }
            )
            .join("");


    grid.querySelectorAll(
        "[data-seed]"
    ).forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    saveSelectedAvatar(
                        button.dataset.seed
                    );

                }
            );

        }
    );

}


/* ============================================================
   SAVE SELECTED AVATAR
============================================================ */

async function saveSelectedAvatar(seed) {

    if (
        isSavingAvatar ||
        !profileMemberId ||
        !seed
    ) {

        return;

    }


    isSavingAvatar = true;


    const grid =
        profileElement("avatarGrid");


    const savingNote =
        profileElement("avatarSavingNote");


    if (grid) {

        grid.querySelectorAll(
            "button"
        ).forEach(
            function (button) {

                button.disabled = true;

            }
        );

    }


    if (savingNote) {

        savingNote.classList.remove("hidden");

    }


    try {

        const response =
            await fetch(
                PROFILE_API,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "text/plain;charset=utf-8"
                    },

                    body:
                        JSON.stringify({

                            action:
                                "updateProfileAvatar",

                            memberId:
                                profileMemberId,

                            avatarSeed:
                                seed

                        })

                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Update avatar response:",
            data
        );


        if (!data.success) {

            throw new Error(
                data.message ||
                "Unable to save your avatar."
            );

        }


        currentAvatarSeed =
            seed;


        const avatarImage =
            profileElement("profileAvatarImage");


        if (avatarImage) {

            avatarImage.src =
                buildAvatarUrl(seed);

        }


        closeAvatarModal();


    } catch (error) {

        console.error(
            "saveSelectedAvatar error:",
            error
        );


        alert(
            "Unable to save your avatar right now. Please check your connection and try again."
        );


    } finally {

        isSavingAvatar = false;


        if (grid) {

            grid.querySelectorAll(
                "button"
            ).forEach(
                function (button) {

                    button.disabled = false;

                }
            );

        }


        if (savingNote) {

            savingNote.classList.add("hidden");

        }

    }

}
