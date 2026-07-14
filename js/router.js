async function loadPage(page) {
    try {
        const response = await fetch(`pages/${page}.html`);

        if (!response.ok) {
            throw new Error(`Page "${page}" not found.`);
        }

        const html = await response.text();

        document.getElementById("app").innerHTML = html;

        // Initialize page-specific JavaScript
        switch (page) {

            case "home":
                if (typeof initHome === "function") {
                    initHome();
                }
                break;

            case "welfare":
                if (typeof initWelfare === "function") {
                    initWelfare();
                }
                break;

            case "reports":
                if (typeof initReports === "function") {
                    initReports();
                }
                break;

            case "lessons":
                if (typeof initLesson === "function") {
                    initLesson();
                }
                break;

            case "slcquiz":
                if (typeof initQuiz === "function") {
                    initQuiz();
                }
                break;
        }

    } catch (error) {
        console.error(error);

        document.getElementById("app").innerHTML = `
            <div style="padding:40px;text-align:center">
                <h2>Page Not Found</h2>
                <p>The page "${page}" could not be loaded.</p>
            </div>
        `;
    }
}

// Load the home page when the website opens
document.addEventListener("DOMContentLoaded", () => {
    loadPage("home");
});
