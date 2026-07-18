const API =
    "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";

async function loadLeaderboard() {

    const container =
        document.getElementById(
            "leaderboard"
        );

    try {

        const response =
            await fetch(

                API +
                "?action=getLeaderboard",

                {
                    cache: "no-store"
                }

            );

        const data =
            await response.json();

        const totalWeeks =
            data.totalWeeks || 13;

        const leaderboard =
            data.leaderboard || [];

        container.innerHTML = "";

        leaderboard.forEach(member => {

            container.innerHTML += `

                <div class="row">

                    <div>

                        <div class="name">

                            ${member.name}

                        </div>

                        <div class="id">

                            ${member.memberId}

                        </div>

                    </div>

                    <div class="weeks">

                        <span class="badge">

                            ${member.weeks}/${totalWeeks}

                        </span>

                    </div>

                    <div class="points">

                        ${Number(
                            member.points
                        ).toLocaleString()}

                    </div>

                </div>

            `;

        });

    }

    catch (error) {

        console.error(error);

        container.innerHTML = `

            <div class="loading">

                Unable to load leaderboard.

            </div>

        `;
    }
}

document.addEventListener(

    "DOMContentLoaded",

    () => {

        AOS.init({

            once: true

        });

        loadLeaderboard();
    }

);
