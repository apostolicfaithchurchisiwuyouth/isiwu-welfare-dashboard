/**
 * ============================================================
 * AFC ISIU YOUTH PORTAL V2
 * FILE: welfare.js
 * PURPOSE: WELFARE DASHBOARD
 * ============================================================
 */

(function () {
    "use strict";


    /* =========================================================
       CONFIGURATION
       ========================================================= */

    const APPS_SCRIPT_URL =
        "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";

    const SUMMARY_CSV_URL =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=439044630&single=true&output=csv";

    const CONTRIBUTIONS_CSV_URL =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=1555365618&single=true&output=csv";

    const EXPENSES_CSV_URL =
        "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=1621695140&single=true&output=csv";


    /* =========================================================
       STORAGE
       ========================================================= */

    const LOGIN_KEY = "welfareLoggedIn";
    const USERNAME_KEY = "username";


    /* =========================================================
       STATE
       ========================================================= */

    let transactions = [];
    let currentPage = 0;
    const itemsPerPage = 10;

    let financeChart = null;
    let refreshTimer = null;


    /* =========================================================
       DOM HELPERS
       ========================================================= */

    function $(id) {
        return document.getElementById(id);
    }


    /* =========================================================
       INITIALIZATION
       ========================================================= */

    document.addEventListener("DOMContentLoaded", function () {

        setupPasswordToggle();
        setupLoginForm();
        setupLogout();

        restoreLoginSession();

    });


    /* =========================================================
       LOGIN SESSION
       ========================================================= */

    function restoreLoginSession() {

        const loggedIn =
            localStorage.getItem(LOGIN_KEY) === "true";

        if (loggedIn) {

            showLoggedInState();

            loadWelfareData();

        } else {

            showLoggedOutState();

        }

    }


    function showLoggedInState() {

        const loginOverlay = $("loginOverlay");
        const loggedInState = $("welfareLoggedInState");
        const dashboard = $("dashboardContent");

        if (loginOverlay) {
            loginOverlay.classList.add("hidden");
        }

        if (loggedInState) {
            loggedInState.classList.remove("hidden");
        }

        if (dashboard) {
            dashboard.classList.remove("hidden");
        }

    }


    function showLoggedOutState() {

        const loginOverlay = $("loginOverlay");
        const loggedInState = $("welfareLoggedInState");
        const dashboard = $("dashboardContent");

        if (loginOverlay) {
            loginOverlay.classList.remove("hidden");
        }

        if (loggedInState) {
            loggedInState.classList.add("hidden");
        }

        if (dashboard) {
            dashboard.classList.add("hidden");
        }

    }


    /* =========================================================
       PASSWORD TOGGLE
       ========================================================= */

    function setupPasswordToggle() {

        const toggle = $("togglePassword");
        const password = $("password");

        if (!toggle || !password) {
            return;
        }

        toggle.addEventListener("click", function () {

            const isPassword =
                password.getAttribute("type") === "password";

            password.setAttribute(
                "type",
                isPassword ? "text" : "password"
            );

            const icon = toggle.querySelector("i");

            if (icon) {

                icon.className = isPassword
                    ? "ri-eye-off-line"
                    : "ri-eye-line";

            }

            toggle.setAttribute(
                "aria-label",
                isPassword
                    ? "Hide password"
                    : "Show password"
            );

        });

    }


    /* =========================================================
       LOGIN FORM
       ========================================================= */

    function setupLoginForm() {

        const form = $("loginForm");

        if (!form) {
            return;
        }

        form.addEventListener("submit", function (event) {

            event.preventDefault();

            handleLogin();

        });

    }


    async function handleLogin() {

        const usernameInput = $("username");
        const passwordInput = $("password");
        const loginButton = $("loginBtn");
        const loginError = $("loginError");

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


        clearLoginError();

        loginButton.disabled = true;
        loginButton.classList.add("loading");


        try {

            const response = await fetch(APPS_SCRIPT_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "text/plain;charset=utf-8"
                },
                body: JSON.stringify({
                    action: "login",
                    username: username,
                    password: password
                })
            });


            if (!response.ok) {
                throw new Error(
                    "Login request failed."
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

                /*
                 * Persist the login.
                 *
                 * localStorage is intentional here.
                 * Refreshing the page must NOT log the user out.
                 */

                localStorage.setItem(
                    LOGIN_KEY,
                    "true"
                );

                localStorage.setItem(
                    USERNAME_KEY,
                    result.user || username
                );


                showLoggedInState();

                await loadWelfareData();


            } else {

                showLoginError(
                    result && result.message
                        ? result.message
                        : "Invalid username or password."
                );

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
            loginButton.classList.remove("loading");

        }

    }


    /* =========================================================
       LOGIN ERROR
       ========================================================= */

    function showLoginError(message) {

        const errorElement = $("loginError");

        if (!errorElement) {
            return;
        }

        errorElement.textContent = message;

    }


    function clearLoginError() {

        const errorElement = $("loginError");

        if (!errorElement) {
            return;
        }

        errorElement.textContent = "";

    }


    /* =========================================================
       LOGOUT
       ========================================================= */

    function setupLogout() {

        const logoutButton = $("logoutBtn");

        if (!logoutButton) {
            return;
        }

        logoutButton.addEventListener("click", function () {

            localStorage.removeItem(LOGIN_KEY);
            localStorage.removeItem(USERNAME_KEY);

            transactions = [];
            currentPage = 0;

            if (refreshTimer) {
                clearInterval(refreshTimer);
                refreshTimer = null;
            }

            if (financeChart) {
                financeChart.destroy();
                financeChart = null;
            }

            const usernameInput = $("username");
            const passwordInput = $("password");

            if (usernameInput) {
                usernameInput.value = "";
            }

            if (passwordInput) {
                passwordInput.value = "";
            }

            clearLoginError();

            showLoggedOutState();

        });

    }


    /* =========================================================
       LOAD ALL WELFARE DATA
       ========================================================= */

    async function loadWelfareData() {

        try {

            await Promise.all([
                loadSummary(),
                loadTransactions()
            ]);

            renderActivities();
            renderChart();

            startAutoRefresh();

        } catch (error) {

            console.error(
                "Unable to load welfare data:",
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
                SUMMARY_CSV_URL + "&_=" + Date.now()
            );

        if (!response.ok) {
            throw new Error(
                "Unable to load welfare summary."
            );
        }

        const csvText =
            await response.text();

        const rows =
            parseCSV(csvText);


        if (!rows.length) {
            return;
        }


        const totalContributions =
            parseAmount(
                rows?.[0]?.[1]
            );

        const totalExpenses =
            parseAmount(
                rows?.[1]?.[1]
            );

        const currentBalance =
            parseAmount(
                rows?.[2]?.[1]
            );


        updateElement(
            "totalContributions",
            formatCurrency(totalContributions)
        );

        updateElement(
            "totalExpenses",
            formatCurrency(totalExpenses)
        );

        updateElement(
            "currentBalance",
            formatCurrency(currentBalance)
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
                CONTRIBUTIONS_CSV_URL +
                "&_=" +
                Date.now()
            ),

            fetch(
                EXPENSES_CSV_URL +
                "&_=" +
                Date.now()
            )

        ]);


        if (
            !contributionsResponse.ok ||
            !expensesResponse.ok
        ) {

            throw new Error(
                "Unable to load transaction records."
            );

        }


        const contributionsCSV =
            await contributionsResponse.text();

        const expensesCSV =
            await expensesResponse.text();


        const contributionRows =
            parseCSV(contributionsCSV);

        const expenseRows =
            parseCSV(expensesCSV);


        const contributionTransactions =
            parseContributionRows(
                contributionRows
            );

        const expenseTransactions =
            parseExpenseRows(
                expenseRows
            );


        transactions = [
            ...contributionTransactions,
            ...expenseTransactions
        ];


        transactions.sort(function (a, b) {

            return (
                getDateValue(b.date) -
                getDateValue(a.date)
            );

        });


        currentPage = 0;

    }


    /* =========================================================
       CONTRIBUTION ROWS
       ========================================================= */

    function parseContributionRows(rows) {

        const results = [];

        if (!Array.isArray(rows)) {
            return results;
        }


        rows.forEach(function (row, index) {

            if (!row || row.length < 6) {
                return;
            }

            /*
             * Existing welfare sheet structure:
             *
             * row[1] = date
             * row[3] = amount
             * row[5] = title/description
             */

            const date = row[1];
            const amount = parseAmount(row[3]);
            const title = cleanText(row[5]);


            /*
             * Ignore empty/header rows.
             */

            if (
                index === 0 &&
                isLikelyHeaderRow(row)
            ) {
                return;
            }

            if (!date && !title && !amount) {
                return;
            }


            results.push({
                date: date || "",
                description:
                    title || "Contribution",
                type: "credit",
                amount: amount
            });

        });


        return results;

    }


    /* =========================================================
       EXPENSE ROWS
       ========================================================= */

    function parseExpenseRows(rows) {

        const results = [];

        if (!Array.isArray(rows)) {
            return results;
        }


        rows.forEach(function (row, index) {

            if (!row || row.length < 4) {
                return;
            }

            /*
             * Existing welfare sheet structure:
             *
             * row[1] = date
             * row[2] = amount
             * row[3] = title/description
             */

            const date = row[1];
            const amount = parseAmount(row[2]);
            const title = cleanText(row[3]);


            if (
                index === 0 &&
                isLikelyHeaderRow(row)
            ) {
                return;
            }

            if (!date && !title && !amount) {
                return;
            }


            results.push({
                date: date || "",
                description:
                    title || "Expense",
                type: "debit",
                amount: amount
            });

        });


        return results;

    }


    /* =========================================================
       RENDER ACTIVITIES
       ========================================================= */

    function renderActivities() {

        const table =
            $("activityTable");

        const emptyState =
            $("activityEmptyState");

        if (!table) {
            return;
        }


        table.innerHTML = "";


        if (!transactions.length) {

            if (emptyState) {
                emptyState.classList.remove("hidden");
            }

            updatePagination(
                0,
                0
            );

            return;

        }


        if (emptyState) {
            emptyState.classList.add("hidden");
        }


        const start =
            currentPage * itemsPerPage;

        const end =
            start + itemsPerPage;

        const pageItems =
            transactions.slice(
                start,
                end
            );


        pageItems.forEach(function (transaction) {

            const row =
                document.createElement("tr");


            const dateCell =
                document.createElement("td");

            dateCell.textContent =
                formatDate(transaction.date);


            const descriptionCell =
                document.createElement("td");

            descriptionCell.textContent =
                transaction.description;


            const typeCell =
                document.createElement("td");

            const typeBadge =
                document.createElement("span");

            typeBadge.className =
                transaction.type === "credit"
                    ? "transaction-type transaction-credit"
                    : "transaction-type transaction-debit";

            typeBadge.textContent =
                transaction.type === "credit"
                    ? "Credit"
                    : "Debit";

            typeCell.appendChild(typeBadge);


            const amountCell =
                document.createElement("td");

            amountCell.className =
                transaction.type === "credit"
                    ? "transaction-credit-amount"
                    : "transaction-debit-amount";

            amountCell.textContent =
                (
                    transaction.type === "credit"
                        ? "+"
                        : "-"
                ) +
                formatCurrency(
                    transaction.amount
                );


            row.appendChild(dateCell);
            row.appendChild(descriptionCell);
            row.appendChild(typeCell);
            row.appendChild(amountCell);


            table.appendChild(row);

        });


        const totalPages =
            Math.ceil(
                transactions.length /
                itemsPerPage
            );


        updatePagination(
            currentPage + 1,
            totalPages
        );

    }


    /* =========================================================
       PAGINATION
       ========================================================= */

    function updatePagination(
        page,
        totalPages
    ) {

        const pageNumber =
            $("pageNumber");

        if (pageNumber) {

            pageNumber.textContent =
                totalPages > 0
                    ? `Page ${page} of ${totalPages}`
                    : "Page 1";

        }


        const buttons =
            document.querySelectorAll(
                ".pagination-btn"
            );


        if (buttons.length >= 2) {

            const previousButton =
                buttons[0];

            const nextButton =
                buttons[1];


            previousButton.disabled =
                currentPage <= 0;


            nextButton.disabled =
                totalPages === 0 ||
                currentPage >= totalPages - 1;

        }

    }


    function nextPage() {

        const totalPages =
            Math.ceil(
                transactions.length /
                itemsPerPage
            );


        if (
            currentPage <
            totalPages - 1
        ) {

            currentPage++;

            renderActivities();

        }

    }


    function prevPage() {

        if (currentPage > 0) {

            currentPage--;

            renderActivities();

        }

    }


    window.nextPage = nextPage;
    window.prevPage = prevPage;


    /* =========================================================
       CHART
       ========================================================= */

    function renderChart() {

        const canvas =
            $("financeChart");

        if (!canvas) {
            return;
        }


        if (
            typeof Chart === "undefined"
        ) {

            console.error(
                "Chart.js is not available."
            );

            return;

        }


        const contributionTotal =
            transactions
                .filter(
                    item =>
                        item.type === "credit"
                )
                .reduce(
                    (total, item) =>
                        total + item.amount,
                    0
                );


        const expenseTotal =
            transactions
                .filter(
                    item =>
                        item.type === "debit"
                )
                .reduce(
                    (total, item) =>
                        total + item.amount,
                    0
                );


        const balance =
            contributionTotal -
            expenseTotal;


        if (financeChart) {
            financeChart.destroy();
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
                                    contributionTotal,
                                    expenseTotal,
                                    Math.max(
                                        balance,
                                        0
                                    )
                                ],

                                backgroundColor: [
                                    "#4A0754",
                                    "#EA580C",
                                    "#0891B2"
                                ],

                                borderRadius: 7,

                                borderSkipped: false,

                                barThickness: 38,

                                maxBarThickness: 48
                            }
                        ]

                    },

                    options: {

                        responsive: true,

                        maintainAspectRatio: false,

                        animation: {
                            duration: 350
                        },

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

                                border: {
                                    display: false
                                },

                                ticks: {

                                    color: "#716d76",

                                    font: {
                                        family:
                                            "DM Sans",
                                        size: 10,
                                        weight: "600"
                                    }

                                }

                            },

                            y: {

                                beginAtZero: true,

                                grid: {
                                    color:
                                        "rgba(15, 23, 42, 0.06)"
                                },

                                border: {
                                    display: false
                                },

                                ticks: {

                                    color: "#85808a",

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

        if (refreshTimer) {
            clearInterval(refreshTimer);
        }


        refreshTimer =
            setInterval(
                async function () {

                    if (
                        localStorage.getItem(
                            LOGIN_KEY
                        ) !== "true"
                    ) {

                        return;

                    }


                    try {

                        await loadSummary();
                        await loadTransactions();

                        renderActivities();
                        renderChart();

                    } catch (error) {

                        console.error(
                            "Welfare auto-refresh failed:",
                            error
                        );

                    }

                },
                30000
            );

    }


    /* =========================================================
       CSV PARSER
       ========================================================= */

    function parseCSV(text) {

        if (
            typeof text !== "string" ||
            !text.trim()
        ) {
            return [];
        }


        const rows = [];

        let row = [];
        let cell = "";
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


            if (
                character === '"' &&
                insideQuotes &&
                nextCharacter === '"'
            ) {

                cell += '"';

                i++;

                continue;

            }


            if (character === '"') {

                insideQuotes =
                    !insideQuotes;

                continue;

            }


            if (
                character === "," &&
                !insideQuotes
            ) {

                row.push(cell.trim());
                cell = "";

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


                row.push(cell.trim());
                cell = "";


                if (
                    row.some(
                        value =>
                            value !== ""
                    )
                ) {

                    rows.push(row);

                }


                row = [];

                continue;

            }


            cell += character;

        }


        if (
            cell !== "" ||
            row.length
        ) {

            row.push(cell.trim());

            if (
                row.some(
                    value =>
                        value !== ""
                )
            ) {

                rows.push(row);

            }

        }


        return rows;

    }


    /* =========================================================
       HELPERS
       ========================================================= */

    function updateElement(
        id,
        value
    ) {

        const element =
            $(id);

        if (element) {
            element.textContent =
                value;
        }

    }


    function cleanText(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value).trim();

    }


    function parseAmount(value) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return 0;
        }


        if (typeof value === "number") {
            return isFinite(value)
                ? value
                : 0;
        }


        let cleaned =
            String(value)
                .replace(/[₦,\s]/g, "")
                .replace(/[^\d.-]/g, "");


        const amount =
            Number(cleaned);


        return isFinite(amount)
            ? amount
            : 0;

    }


    function formatCurrency(value) {

        const amount =
            Number(value) || 0;


        return "₦" +
            new Intl.NumberFormat(
                "en-NG",
                {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }
            ).format(amount);

    }


    function formatCompactCurrency(value) {

        const amount =
            Number(value) || 0;


        if (Math.abs(amount) >= 1000000) {

            return (
                "₦" +
                (amount / 1000000)
                    .toFixed(
                        amount >= 10000000
                            ? 0
                            : 1
                    ) +
                "M"
            );

        }


        if (Math.abs(amount) >= 1000) {

            return (
                "₦" +
                (amount / 1000)
                    .toFixed(
                        amount >= 100000
                            ? 0
                            : 1
                    ) +
                "K"
            );

        }


        return "₦" + amount;

    }


    function formatDate(value) {

        if (!value) {
            return "—";
        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return cleanText(value);

        }


        return new Intl.DateTimeFormat(
            "en-NG",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        ).format(date);

    }


    function getDateValue(value) {

        if (!value) {
            return 0;
        }


        const date =
            new Date(value);


        const timestamp =
            date.getTime();


        return Number.isNaN(timestamp)
            ? 0
            : timestamp;

    }


    function isLikelyHeaderRow(row) {

        const text =
            row
                .join(" ")
                .toLowerCase();


        return (
            text.includes("date") &&
            (
                text.includes("amount") ||
                text.includes("description") ||
                text.includes("title")
            )
        );

    }

})();
