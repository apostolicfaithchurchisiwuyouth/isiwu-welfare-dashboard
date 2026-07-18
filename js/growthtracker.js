const API =
  "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";

async function load() {

  const leaderboard =
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

    console.log(data);

    const totalWeeks =

      data.totalWeeks ||

      data.totalweeks ||

      data.seasonWeeks ||

      13;

    const rows =

      data.leaderboard || [];

    leaderboard.classList.remove(
      "loading"
    );

    if (

      rows.length === 0

    ) {

      leaderboard.innerHTML =

        "<p>No participants found.</p>";

      return;

    }

    leaderboard.innerHTML =

      rows.map(

        member => `

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

      `

      ).join("");

  }

  catch (error) {

    console.error(error);

    leaderboard.innerHTML =

      "<p>Unable to load leaderboard.</p>";

  }

}

document.addEventListener(

  "DOMContentLoaded",

  load

);
