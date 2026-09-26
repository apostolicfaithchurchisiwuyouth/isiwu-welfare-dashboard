/**
 * ============================================================
 * AFC ISIU YOUTH PORTAL V2
 * FILE: welfare.js
 * PURPOSE: WELFARE DASHBOARD
 * ============================================================
 */

document.addEventListener("DOMContentLoaded", function () {

    /* =========================================================
       CONFIGURATION
       ========================================================= */

    const LOGIN_API =
        "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";

    const SUMMARY_CSV =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=439044630&single=true&output=csv";

    const CONTRIBUTIONS_CSV =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=1555365618&single=true&output=csv";

    const EXPENSES_CSV =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=1621695140&single=true&output=csv";


    /* =========================================================
       STORAGE
       ========================================================= */

    const LOGIN_STORAGE_KEY = "welfareLoggedIn";
    const USER_STORAGE_KEY = "username";


    /* =========================================================
       STATE
       ========================================================= */

    let transactions = [];
    let currentPage = 0;
    const itemsPerPage = 10;

    let financeChart = null;

    let failedLoginAttempts = 0;

    let refreshTimer = null;

    let loginControlsInitialized = false;


    /* =========================================================
       TOPBAR LOGIN
       =========================================================
       
       layout.js builds the shared topbar. Because it can replace
       the contents of #app-topbar, we watch for that and mount
       the Welfare login controls after the shared layout exists.
       ========================================================= */

    function createLoginMarkup() {

        const wrapper = document.createElement("div");

        wrapper.id = "welfareTopbarLogin";
        wrapper.className = "welfare-topbar-login";

        wrapper.innerHTML = `
            <div id="loginOverlay" class="welfare-login-container">

                <form class="welfare-login-form" autocomplete="on">

                    <div class="welfare-login-brand" title="Welfare">
                        <i class="fa-solid fa-shield-heart"></i>
                    </div>

                    <div class="welfare-login-field">
                        <i class="fa-solid fa-user"></i>

                        <input
                            type="text"
                            id="username"
                            name="username"
                            placeholder="Username"
                            autocomplete="username"
                            required
                        >
                    </div>

                    <div class="welfare-login-field password-field">
                        <i class="fa-solid fa-lock"></i>

                        <input
                            type="password"
                            id="password"
                            name="password"
                            placeholder="Password"
                            autocomplete="current-password"
                            required
                        >

                        <button
                            type="button"
                            class="welfare-password-toggle"
                            aria-label="Show password"
                        >
                            <i class="fa-solid fa-eye"></i>
                        </button>
                    </div>

                    <button
                        type="submit"
                        id="loginBtn"
                        class="welfare-login-btn"
                    >
                        <i class="fa-solid fa-right-to-bracket"></i>
                        <span>Login</span>
                    </button>

                </form>

                <div
                    id="loginError"
                    class="welfare-login-error hidden"
                ></div>

            </div>
        `;

        return wrapper;
    }


    function createLoggedInMarkup(username) {

        const wrapper = document.createElement("div");

        wrapper.id = "welfareLoggedInState";
        wrapper.className = "welfare-logged-in-state";

        wrapper.innerHTML = `
            <div class="welfare-user-badge">
                <i class="fa-solid fa-user-circle"></i>
                <span>${escapeHtml(username || "User")}</span>
            </div>

            <button
                type="button"
                id="topbarWelfareLogout"
                class="welfare-topbar-logout"
            >
                <i class="fa-solid fa-right-from-bracket"></i>
                <span>Logout</span>
            </button>
        `;

        return wrapper;
    }


    function mountWelfareLogin() {

        const topbar = document.getElementById("app-topbar");

        if (!topbar) {
            return;
        }

        const loggedIn =
            localStorage.getItem(LOGIN_STORAGE_KEY) === "true";

        const username =
            localStorage.getItem(USER_STORAGE_KEY) || "";


        /* -----------------------------------------------------
           If already mounted, update state only
           ----------------------------------------------------- */

        let existing =
            document.getElementById("welfareTopbarLogin");

        if (existing) {

            if (loggedIn) {
                showLoggedInTopbar(existing, username);
            } else {
                showLoginTopbar(existing);
            }

            return;
        }


        /* -----------------------------------------------------
           Create the Welfare topbar controls
           ----------------------------------------------------- */

        existing = createLoginMarkup();

        topbar.appendChild(existing);


        if (loggedIn) {
            showLoggedInTopbar(existing, username);
        } else {
            showLoginTopbar(existing);
        }

        bindLoginControls(existing);
    }


    function showLoginTopbar(wrapper) {

        const loginOverlay =
            wrapper.querySelector("#loginOverlay");

        if (loginOverlay) {
            loginOverlay.classList.remove("hidden");
        }

        const loggedInState =
            wrapper.querySelector("#welfareLoggedInState");

        if (loggedInState) {
            loggedInState.remove();
        }
    }


    function showLoggedInTopbar(wrapper, username) {

        const loginOverlay =
            wrapper.querySelector("#loginOverlay");

        if (loginOverlay) {
            loginOverlay.classList.add("hidden");
        }

        let loggedInState =
            wrapper.querySelector("#welfareLoggedInState");

        if (!loggedInState) {

            loggedInState =
                createLoggedInMarkup(username);

            wrapper.appendChild(loggedInState);

            const logoutButton =
                loggedInState.querySelector("#topbarWelfareLogout");

            if (logoutButton) {
                logoutButton.addEventListener(
                    "click",
                    logout
                );
            }

        } else {

            const nameElement =
                loggedInState.querySelector(
                    ".welfare-user-badge span"
                );

            if (nameElement) {
                nameElement.textContent =
                    username || "User";
            }
        }
    }


    function bindLoginControls(wrapper) {

        if (loginControlsInitialized) {
            return;
        }

        const form =
            wrapper.querySelector(".welfare-login-form");

        const loginButton =
            wrapper.querySelector("#loginBtn");

        const passwordInput =
            wrapper.querySelector("#password");

        const togglePassword =
            wrapper.querySelector(
                ".welfare-password-toggle"
            );

        if (!form || !loginButton || !passwordInput) {
            return;
        }

        loginControlsInitialized = true;


        form.addEventListener("submit", function (event) {

            event.preventDefault();

            login();

        });


        if (togglePassword) {

            togglePassword.addEventListener(
                "click",
                function () {

                    const icon =
                        togglePassword.querySelector("i");

                    if (passwordInput.type === "password") {

                        passwordInput.type = "text";

                        if (icon) {
                            icon.className =
                                "fa-solid fa-eye-slash";
                        }

                        togglePassword.setAttribute(
                            "aria-label",
                            "Hide password"
                        );

                    } else {

                        passwordInput.type = "password";

                        if (icon) {
                            icon.className =
                                "fa-solid fa-eye";
                        }

                        togglePassword.setAttribute(
                            "aria-label",
                            "Show password"
                        );
                    }
                }
            );
        }
    }


    /* =========================================================
       TOPBAR OBSERVER
       ========================================================= */

    function startTopbarObserver() {

        const observer = new MutationObserver(
            function () {

                window.requestAnimationFrame(
                    function () {
                        mountWelfareLogin();
                    }
                );

            }
        );

        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );

        mountWelfareLogin();
    }


    /* =========================================================
       LOGIN
       ========================================================= */

    async function login() {

        const usernameInput =
            document.getElementById("username");

        const passwordInput =
            document.getElementById("password");

        const loginButton =
            document.getElementById("loginBtn");

        const loginError =
            document.getElementById("loginError");


        if (!usernameInput || !passwordInput || !loginButton) {
            return;
        }


        const username =
            usernameInput.value.trim();

        const password =
            passwordInput.value;


        if (!username || !password) {

            showLoginError(
                "Please enter your username and password."
            );

            return;
        }


        loginButton.disabled = true;

        loginButton.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Logging in...</span>
        `;


        hideLoginError();


        try {

            const response =
                await fetch(LOGIN_API, {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/x-www-form-urlencoded"
                    },
                    body: new URLSearchParams({
                        action: "login",
                        username: username,
                        password: password
                    })
                });


            if (!response.ok) {
                throw new Error(
                    "Unable to connect to the login service."
                );
            }


            const result =
                await response.json();


            if (
                result &&
                (
                    result.success === true ||
                    result.status === "success"
                )
            ) {

                failedLoginAttempts = 0;


                /*
                 * IMPORTANT:
                 * localStorage is intentional.
                 * Refreshing the page must NOT log the user out.
                 */
                localStorage.setItem(
                    LOGIN_STORAGE_KEY,
                    "true"
                );

                localStorage.setItem(
                    USER_STORAGE_KEY,
                    result.user || username
                );


                const wrapper =
                    document.getElementById(
                        "welfareTopbarLogin"
                    );

                if (wrapper) {
                    showLoggedInTopbar(
                        wrapper,
                        result.user || username
                    );
                }


                showDashboard();

                await loadDashboardData();

                startAutoRefresh();

            } else {

                failedLoginAttempts++;

                const message =
                    result && result.message
                        ? result.message
                        : "Invalid username or password.";

                showLoginError(message);


                if (failedLoginAttempts >= 3) {

                    showLoginError(
                        "Too many failed login attempts. Redirecting..."
                    );

                    setTimeout(function () {
                        window.location.href =
                            "../index.html";
                    }, 3000);
                }
            }

        } catch (error) {

            console.error(
                "Welfare login error:",
                error
            );

            showLoginError(
                "Unable to connect. Please try again."
            );

        } finally {

            loginButton.disabled = false;

            loginButton.innerHTML = `
                <i class="fa-solid fa-right-to-bracket"></i>
                <span>Login</span>
            `;
        }
    }


    /* =========================================================
       LOGIN ERROR
       ========================================================= */

    function showLoginError(message) {

        const errorElement =
            document.getElementById("loginError");

        if (!errorElement) {
            return;
        }

        errorElement.textContent = message;

        errorElement.classList.remove("hidden");
    }


    function hideLoginError() {

        const errorElement =
            document.getElementById("loginError");

        if (!errorElement) {
            return;
        }

        errorElement.textContent = "";

        errorElement.classList.add("hidden");
    }


    /* =========================================================
       DASHBOARD STATE
       ========================================================= */

    function showDashboard() {

        const dashboard =
            document.getElementById(
                "dashboardContent"
            );

        if (dashboard) {
            dashboard.classList.remove("hidden");
        }
    }


    function hideDashboard() {

        const dashboard =
            document.getElementById(
                "dashboardContent"
            );

        if (dashboard) {
            dashboard.classList.add("hidden");
        }
    }


    /* =========================================================
       LOGOUT
       ========================================================= */

    function logout() {

        localStorage.removeItem(
            LOGIN_STORAGE_KEY
        );

        localStorage.removeItem(
            USER_STORAGE_KEY
        );


        stopAutoRefresh();


        transactions = [];

        currentPage = 0;


        if (financeChart) {

            financeChart.destroy();

            financeChart = null;
        }


        hideDashboard();


        const wrapper =
            document.getElementById(
                "welfareTopbarLogin"
            );

        if (wrapper) {

            showLoginTopbar(wrapper);

            loginControlsInitialized = false;

            bindLoginControls(wrapper);
        }


        const usernameInput =
            document.getElementById("username");

        const passwordInput =
            document.getElementById("password");


        if (usernameInput) {
            usernameInput.value = "";
        }

        if (passwordInput) {
            passwordInput.value = "";
        }


        hideLoginError();
    }


    /* =========================================================
       DASHBOARD DATA
       ========================================================= */

    async function loadDashboardData() {

        try {

            await Promise.all([
                loadSummary(),
                loadTransactions()
            ]);

        } catch (error) {

            console.error(
                "Welfare dashboard loading error:",
                error
            );
        }
    }


    /* =========================================================
       SUMMARY
       ========================================================= */

    async function loadSummary() {

        const response =
            await fetch(
                SUMMARY_CSV + "&t=" + Date.now()
            );


        if (!response.ok) {
            throw new Error(
                "Unable to load welfare summary."
            );
        }


        const text =
            await response.text();


        const rows =
            parseCSV(text);


        if (!rows || rows.length < 3) {
            return;
        }


        const totalContributions =
            rows[0] && rows[0][1]
                ? rows[0][1]
                : 0;

        const totalExpenses =
            rows[1] && rows[1][1]
                ? rows[1][1]
                : 0;

        const currentBalance =
            rows[2] && rows[2][1]
                ? rows[2][1]
                : 0;


        setElementText(
            "totalContributions",
            formatCurrency(totalContributions)
        );

        setElementText(
            "totalExpenses",
            formatCurrency(totalExpenses)
        );

        setElementText(
            "currentBalance",
            formatCurrency(currentBalance)
        );


        renderFinanceChart(
            totalContributions,
            totalExpenses,
            currentBalance
        );
    }


    /* =========================================================
       TRANSACTIONS
       ========================================================= */

    async function loadTransactions() {

        const [
            contributionsResponse,
            expensesResponse
        ] = await Promise.all([

            fetch(
                CONTRIBUTIONS_CSV +
                "&t=" +
                Date.now()
            ),

            fetch(
                EXPENSES_CSV +
                "&t=" +
                Date.now()
            )

        ]);


        if (
            !contributionsResponse.ok ||
            !expensesResponse.ok
        ) {
            throw new Error(
                "Unable to load welfare transactions."
            );
        }


        const contributionsText =
            await contributionsResponse.text();

        const expensesText =
            await expensesResponse.text();


        const contributionRows =
            parseCSV(contributionsText);

        const expenseRows =
            parseCSV(expensesText);


        transactions = [];


        /*
         * Contributions:
         * amount = row[3]
         * title  = row[5]
         * date   = row[1]
         */

        for (
            let i = 1;
            i < contributionRows.length;
            i++
        ) {

            const row =
                contributionRows[i];

            if (!row || row.length < 6) {
                continue;
            }


            const amount =
                parseAmount(row[3]);

            const title =
                row[5] ||
                "Welfare Contribution";

            const date =
                row[1] || "";


            if (!isNaN(amount)) {

                transactions.push({
                    date: date,
                    title: title,
                    amount: amount,
                    type: "credit"
                });
            }
        }


        /*
         * Expenses:
         * amount = row[2]
         * title  = row[3]
         * date   = row[1]
         */

        for (
            let i = 1;
            i < expenseRows.length;
            i++
        ) {

            const row =
                expenseRows[i];

            if (!row || row.length < 4) {
                continue;
            }


            const amount =
                parseAmount(row[2]);

            const title =
                row[3] ||
                "Welfare Expense";

            const date =
                row[1] || "";


            if (!isNaN(amount)) {

                transactions.push({
                    date: date,
                    title: title,
                    amount: amount,
                    type: "debit"
                });
            }
        }


        transactions.sort(
            function (a, b) {

                const dateA =
                    parseDateValue(a.date);

                const dateB =
                    parseDateValue(b.date);

                return dateB - dateA;
            }
        );


        currentPage = 0;

        renderTransactions();
    }


    /* =========================================================
       TRANSACTION RENDERING
       ========================================================= */

    function renderTransactions() {

        const table =
            document.getElementById(
                "activityTable"
            );

        const pageNumber =
            document.getElementById(
                "pageNumber"
            );

        const prevButton =
            document.getElementById(
                "prevPageBtn"
            );

        const nextButton =
            document.getElementById(
                "nextPageBtn"
            );


        if (!table) {
            return;
        }


        if (!transactions.length) {

            table.innerHTML = `
                <tr>
                    <td
                        colspan="4"
                        class="table-empty"
                    >
                        No transactions found.
                    </td>
                </tr>
            `;


            if (pageNumber) {
                pageNumber.textContent =
                    "Page 1";
            }


            if (prevButton) {
                prevButton.disabled = true;
            }

            if (nextButton) {
                nextButton.disabled = true;
            }

            return;
        }


        const start =
            currentPage * itemsPerPage;

        const end =
            start + itemsPerPage;


        const pageTransactions =
            transactions.slice(start, end);


        table.innerHTML =
            pageTransactions.map(
                function (transaction) {

                    const isCredit =
                        transaction.type === "credit";


                    const typeClass =
                        isCredit
                            ? "credit"
                            : "debit";


                    const typeIcon =
                        isCredit
                            ? "fa-arrow-down"
                            : "fa-arrow-up";


                    const typeLabel =
                        isCredit
                            ? "Contribution"
                            : "Expense";


                    const sign =
                        isCredit
                            ? "+"
                            : "-";


                    return `
                        <tr>

                            <td>
                                ${escapeHtml(
                                    formatDate(
                                        transaction.date
                                    )
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    transaction.title
                                )}
                            </td>

                            <td>
                                <span
                                    class="transaction-type ${typeClass}"
                                >
                                    <i class="fa-solid ${typeIcon}"></i>
                                    ${typeLabel}
                                </span>
                            </td>

                            <td>
                                <span
                                    class="transaction-amount ${typeClass}"
                                >
                                    ${sign}${formatCurrency(
                                        transaction.amount
                                    )}
                                </span>
                            </td>

                        </tr>
                    `;
                }
            ).join("");


        const totalPages =
            Math.ceil(
                transactions.length /
                itemsPerPage
            );


        if (pageNumber) {

            pageNumber.textContent =
                "Page " +
                (currentPage + 1) +
                " of " +
                totalPages;
        }


        if (prevButton) {
            prevButton.disabled =
                currentPage === 0;
        }


        if (nextButton) {
            nextButton.disabled =
                currentPage >= totalPages - 1;
        }
    }


    /* =========================================================
       PAGINATION
       ========================================================= */

    function previousPage() {

        if (currentPage <= 0) {
            return;
        }

        currentPage--;

        renderTransactions();
    }


    function nextPage() {

        const totalPages =
            Math.ceil(
                transactions.length /
                itemsPerPage
            );


        if (currentPage >= totalPages - 1) {
            return;
        }


        currentPage++;

        renderTransactions();
    }


    /* =========================================================
       CHART
       ========================================================= */

    function renderFinanceChart(
        contributions,
        expenses,
        balance
    ) {

        const canvas =
            document.getElementById(
                "financeChart"
            );


        if (!canvas) {
            return;
        }


        if (typeof Chart === "undefined") {
            return;
        }


        const contributionValue =
            parseAmount(contributions);

        const expenseValue =
            parseAmount(expenses);

        const balanceValue =
            parseAmount(balance);


        if (financeChart) {

            financeChart.destroy();

            financeChart = null;
        }


        financeChart =
            new Chart(
                canvas.getContext("2d"),
                {
                    type: "bar",

                    data: {

                        labels: [
                            "Contributions",
                            "Expenses",
                            "Balance"
                        ],

                        datasets: [
                            {
                                data: [
                                    contributionValue,
                                    expenseValue,
                                    balanceValue
                                ],

                                backgroundColor: [
                                    "#4A0754",
                                    "#EA580C",
                                    "#0891B2"
                                ],

                                borderRadius: 8,

                                borderSkipped: false,

                                barThickness: 42,

                                maxBarThickness: 48
                            }
                        ]
                    },

                    options: {

                        responsive: true,

                        maintainAspectRatio: false,

                        plugins: {

                            legend: {
                                display: false
                            },

                            tooltip: {

                                callbacks: {

                                    label:
                                        function (
                                            context
                                        ) {

                                            return (
                                                " " +
                                                formatCurrency(
                                                    context.raw
                                                )
                                            );
                                        }
                                }
                            }
                        },

                        scales: {

                            x: {

                                grid: {
                                    display: false
                                },

                                ticks: {
                                    font: {
                                        family:
                                            "DM Sans",
                                        size: 10
                                    }
                                }
                            },

                            y: {

                                beginAtZero: true,

                                grid: {
                                    color:
                                        "#eeeeef"
                                },

                                ticks: {

                                    font: {
                                        family:
                                            "DM Sans",
                                        size: 9
                                    },

                                    callback:
                                        function (
                                            value
                                        ) {
                                            return formatCompactCurrency(
                                                value
                                            );
                                        }
                                }
                            }
                        }
                    }
                }
            );
    }


    /* =========================================================
       AUTO REFRESH
       ========================================================= */

    function startAutoRefresh() {

        stopAutoRefresh();


        refreshTimer =
            setInterval(
                async function () {

                    if (
                        localStorage.getItem(
                            LOGIN_STORAGE_KEY
                        ) !== "true"
                    ) {
                        return;
                    }


                    try {

                        await loadDashboardData();

                    } catch (error) {

                        console.error(
                            "Welfare auto-refresh error:",
                            error
                        );
                    }

                },
                30000
            );
    }


    function stopAutoRefresh() {

        if (refreshTimer) {

            clearInterval(
                refreshTimer
            );

            refreshTimer = null;
        }
    }


    /* =========================================================
       CSV PARSER
       ========================================================= */

    function parseCSV(text) {

        const rows = [];

        let row = [];

        let value = "";

        let insideQuotes = false;


        for (
            let i = 0;
            i < text.length;
            i++
        ) {

            const character =
                text[i];

            const nextCharacter =
                text[i + 1];


            if (character === '"') {

                if (
                    insideQuotes &&
                    nextCharacter === '"'
                ) {

                    value += '"';

                    i++;

                } else {

                    insideQuotes =
                        !insideQuotes;
                }

                continue;
            }


            if (
                character === "," &&
                !insideQuotes
            ) {

                row.push(value);

                value = "";

                continue;
            }


            if (
                (
                    character === "\n" ||
                    character === "\r"
                ) &&
                !insideQuotes
            ) {

                if (
                    character === "\r" &&
                    nextCharacter === "\n"
                ) {
                    i++;
                }


                row.push(value);

                rows.push(row);

                row = [];

                value = "";

                continue;
            }


            value += character;
        }


        if (value.length > 0 || row.length > 0) {

            row.push(value);

            rows.push(row);
        }


        return rows;
    }


    /* =========================================================
       HELPERS
       ========================================================= */

    function parseAmount(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return 0;
        }


        const cleaned =
            String(value)
                .replace(/[₦,\s]/g, "")
                .replace(/[^\d.-]/g, "");


        const number =
            parseFloat(cleaned);


        return isNaN(number)
            ? 0
            : number;
    }


    function formatCurrency(value) {

        const amount =
            parseAmount(value);


        return "₦" +
            amount.toLocaleString(
                "en-NG",
                {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                }
            );
    }


    function formatCompactCurrency(value) {

        const amount =
            parseAmount(value);


        if (amount >= 1000000) {

            return (
                "₦" +
                (amount / 1000000)
                    .toFixed(1) +
                "M"
            );
        }


        if (amount >= 1000) {

            return (
                "₦" +
                (amount / 1000)
                    .toFixed(1) +
                "K"
            );
        }


        return "₦" +
            amount.toLocaleString(
                "en-NG"
            );
    }


    function parseDateValue(value) {

        if (!value) {
            return 0;
        }


        const date =
            new Date(value);


        if (!isNaN(date.getTime())) {
            return date.getTime();
        }


        /*
         * Handles common DD/MM/YYYY style
         * dates if the browser does not parse them.
         */

        const match =
            String(value).match(
                /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/
            );


        if (match) {

            const day =
                parseInt(match[1], 10);

            const month =
                parseInt(match[2], 10) - 1;

            const year =
                parseInt(match[3], 10);


            return new Date(
                year,
                month,
                day
            ).getTime();
        }


        return 0;
    }


    function formatDate(value) {

        if (!value) {
            return "—";
        }


        const timestamp =
            parseDateValue(value);


        if (!timestamp) {
            return value;
        }


        return new Date(timestamp)
            .toLocaleDateString(
                "en-NG",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                }
            );
    }


    function setElementText(
        id,
        value
    ) {

        const element =
            document.getElementById(id);


        if (element) {
            element.textContent = value;
        }
    }


    function escapeHtml(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* =========================================================
       BUTTON EVENTS
       ========================================================= */

    const prevPageButton =
        document.getElementById(
            "prevPageBtn"
        );

    const nextPageButton =
        document.getElementById(
            "nextPageBtn"
        );

    const logoutButton =
        document.getElementById(
            "logoutBtn"
        );


    if (prevPageButton) {

        prevPageButton.addEventListener(
            "click",
            previousPage
        );
    }


    if (nextPageButton) {

        nextPageButton.addEventListener(
            "click",
            nextPage
        );
    }


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            logout
        );
    }


    /* =========================================================
       INITIAL SESSION CHECK
       ========================================================= */

    const alreadyLoggedIn =
        localStorage.getItem(
            LOGIN_STORAGE_KEY
        ) === "true";


    if (alreadyLoggedIn) {

        showDashboard();

        loadDashboardData();

        startAutoRefresh();

    } else {

        hideDashboard();
    }


    /* =========================================================
       START TOPBAR HANDLING
       ========================================================= */

    startTopbarObserver();

});
