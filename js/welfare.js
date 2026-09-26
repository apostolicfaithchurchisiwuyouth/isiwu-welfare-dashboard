/**
 * ============================================================
 * AFC ISIU YOUTH PORTAL V2
 * FILE: welfare.js
 * PURPOSE: WELFARE DASHBOARD
 * ============================================================
 *
 * FEATURES
 * - Welfare login
 * - Persistent login using localStorage
 * - Welfare financial summary
 * - Contributions
 * - Expenses
 * - Current balance
 * - Transaction history
 * - Pagination
 * - Chart.js financial chart
 * - Logout
 * - Automatic data refresh
 *
 * IMPORTANT
 * - Login is inside welfare.html dashboard content.
 * - Shared topbar is controlled by layout.js.
 * ============================================================
 */


/* ============================================================
   CONFIGURATION
   ============================================================ */

const WELFARE_API_URL =
    "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";

const SUMMARY_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=439044630&single=true&output=csv";

const CONTRIBUTIONS_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=1555365618&single=true&output=csv";

const EXPENSES_CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHlE5IpmFYaQyW5u-rentH2fGC5VZJ2w9Ql1WI-X8bE76qlN5_ttDIitwlXX1CM4sqdEW8RroDUNSU/pub?gid=1621695140&single=true&output=csv";


/* ============================================================
   STORAGE KEYS
   ============================================================ */

const WELFARE_LOGIN_KEY = "welfareLoggedIn";
const WELFARE_USERNAME_KEY = "username";


/* ============================================================
   STATE
   ============================================================ */

let transactions = [];

let currentPage = 0;

const itemsPerPage = 10;

let financeChart = null;

let failedLoginAttempts = 0;

let refreshTimer = null;


/* ============================================================
   DOM READY
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    initializeWelfare();

});


/* ============================================================
   INITIALIZE
   ============================================================ */

function initializeWelfare() {

    const loginForm =
        document.getElementById("welfareLoginForm");

    const loginBtn =
        document.getElementById("loginBtn");

    const logoutBtn =
        document.getElementById("logoutBtn");

    const togglePassword =
        document.getElementById("togglePassword");

    const prevPageBtn =
        document.getElementById("prevPageBtn");

    const nextPageBtn =
        document.getElementById("nextPageBtn");


    /* --------------------------------------------
       LOGIN FORM
       -------------------------------------------- */

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            handleLogin
        );

    }


    /* --------------------------------------------
       LOGIN BUTTON FALLBACK
       -------------------------------------------- */

    if (loginBtn) {

        loginBtn.addEventListener("click", (event) => {

            if (
                loginForm &&
                event.target !== loginForm
            ) {
                // Submit is handled by the form.
            }

        });

    }


    /* --------------------------------------------
       LOGOUT
       -------------------------------------------- */

    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            handleLogout
        );

    }


    /* --------------------------------------------
       PASSWORD VISIBILITY
       -------------------------------------------- */

    if (togglePassword) {

        togglePassword.addEventListener(
            "click",
            togglePasswordVisibility
        );

    }


    /* --------------------------------------------
       PAGINATION
       -------------------------------------------- */

    if (prevPageBtn) {

        prevPageBtn.addEventListener(
            "click",
            previousPage
        );

    }

    if (nextPageBtn) {

        nextPageBtn.addEventListener(
            "click",
            nextPage
        );

    }


    /* --------------------------------------------
       RESTORE SESSION
       -------------------------------------------- */

    restoreWelfareSession();

}


/* ============================================================
   RESTORE SESSION
   ============================================================ */

function restoreWelfareSession() {

    const loggedIn =
        localStorage.getItem(WELFARE_LOGIN_KEY);

    if (loggedIn === "true") {

        showDashboard();

        loadWelfareData();

        startAutoRefresh();

    } else {

        showLogin();

    }

}


/* ============================================================
   LOGIN
   ============================================================ */

async function handleLogin(event) {

    event.preventDefault();

    const usernameInput =
        document.getElementById("username");

    const passwordInput =
        document.getElementById("password");

    const loginBtn =
        document.getElementById("loginBtn");

    const loginError =
        document.getElementById("loginError");


    const username =
        usernameInput
            ? usernameInput.value.trim()
            : "";

    const password =
        passwordInput
            ? passwordInput.value
            : "";


    /* --------------------------------------------
       VALIDATION
       -------------------------------------------- */

    if (!username || !password) {

        showLoginError(
            "Please enter your username and password."
        );

        return;

    }


    /* --------------------------------------------
       BUTTON STATE
       -------------------------------------------- */

    setLoginButtonLoading(true);

    clearLoginError();


    try {

        /*
         * The Apps Script endpoint accepts the login
         * request as JSON.
         */
        const response = await fetch(
            WELFARE_API_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type": "text/plain;charset=utf-8"
                },

                body: JSON.stringify({
                    action: "login",
                    username: username,
                    password: password
                })
            }
        );


        if (!response.ok) {

            throw new Error(
                `Login request failed (${response.status}).`
            );

        }


        const rawText =
            await response.text();

        let result;


        try {

            result =
                JSON.parse(rawText);

        } catch (parseError) {

            throw new Error(
                "The login server returned an invalid response."
            );

        }


        /*
         * Support the normal success response and
         * a few compatible response structures.
         */
        const loginSuccessful =
            result?.success === true ||
            result?.status === "success" ||
            result?.authenticated === true ||
            result?.ok === true ||
            result?.result?.success === true;


        if (!loginSuccessful) {

            failedLoginAttempts++;

            const message =
                result?.message ||
                result?.error ||
                result?.result?.message ||
                "Invalid username or password.";

            showLoginError(message);

            setLoginButtonLoading(false);


            /*
             * Original welfare behaviour:
             * after 3 failed attempts, return to portal home.
             */
            if (failedLoginAttempts >= 3) {

                showLoginError(
                    "Too many failed login attempts. Returning to the portal..."
                );

                setTimeout(() => {

                    window.location.href =
                        "../index.html";

                }, 3000);

            }

            return;

        }


        /* --------------------------------------------
           LOGIN SUCCESS
           -------------------------------------------- */

        failedLoginAttempts = 0;


        const returnedUsername =
            result?.user ||
            result?.username ||
            result?.result?.user ||
            username;


        /*
         * IMPORTANT:
         * localStorage is deliberately used so a browser
         * refresh does NOT log the user out.
         *
         * Only the Logout button removes these values.
         */
        localStorage.setItem(
            WELFARE_LOGIN_KEY,
            "true"
        );

        localStorage.setItem(
            WELFARE_USERNAME_KEY,
            String(returnedUsername)
        );


        if (usernameInput) {
            usernameInput.value = "";
        }

        if (passwordInput) {
            passwordInput.value = "";
        }


        clearLoginError();

        setLoginButtonLoading(false);

        showDashboard();

        await loadWelfareData();

        startAutoRefresh();


    } catch (error) {

        console.error(
            "Welfare login error:",
            error
        );

        failedLoginAttempts++;

        showLoginError(
            error?.message ||
            "Unable to sign in. Please try again."
        );

        setLoginButtonLoading(false);


        if (failedLoginAttempts >= 3) {

            showLoginError(
                "Too many failed login attempts. Returning to the portal..."
            );

            setTimeout(() => {

                window.location.href =
                    "../index.html";

            }, 3000);

        }

    }

}


/* ============================================================
   LOGIN BUTTON LOADING
   ============================================================ */

function setLoginButtonLoading(isLoading) {

    const loginBtn =
        document.getElementById("loginBtn");

    if (!loginBtn) {
        return;
    }


    if (isLoading) {

        loginBtn.disabled = true;

        loginBtn.innerHTML = `
            <span class="login-btn-content">
                <i class="ri-loader-4-line ri-spin"></i>
                <span>Signing In...</span>
            </span>
        `;

    } else {

        loginBtn.disabled = false;

        loginBtn.innerHTML = `
            <span class="login-btn-content">
                <i class="ri-login-box-line"></i>
                <span>Sign In</span>
            </span>
        `;

    }

}


/* ============================================================
   LOGIN ERROR
   ============================================================ */

function showLoginError(message) {

    const loginError =
        document.getElementById("loginError");

    if (!loginError) {
        return;
    }

    loginError.textContent =
        message || "";

}


/* ============================================================
   CLEAR LOGIN ERROR
   ============================================================ */

function clearLoginError() {

    const loginError =
        document.getElementById("loginError");

    if (!loginError) {
        return;
    }

    loginError.textContent = "";

}


/* ============================================================
   PASSWORD VISIBILITY
   ============================================================ */

function togglePasswordVisibility() {

    const passwordInput =
        document.getElementById("password");

    const toggleButton =
        document.getElementById("togglePassword");

    if (!passwordInput || !toggleButton) {
        return;
    }


    const icon =
        toggleButton.querySelector("i");


    if (passwordInput.type === "password") {

        passwordInput.type = "text";

        toggleButton.setAttribute(
            "aria-label",
            "Hide password"
        );

        toggleButton.setAttribute(
            "title",
            "Hide password"
        );

        if (icon) {
            icon.className = "ri-eye-off-line";
        }

    } else {

        passwordInput.type = "password";

        toggleButton.setAttribute(
            "aria-label",
            "Show password"
        );

        toggleButton.setAttribute(
            "title",
            "Show password"
        );

        if (icon) {
            icon.className = "ri-eye-line";
        }

    }

}


/* ============================================================
   SHOW LOGIN
   ============================================================ */

function showLogin() {

    const loginOverlay =
        document.getElementById("loginOverlay");

    const dashboardContent =
        document.getElementById("dashboardContent");


    if (loginOverlay) {

        loginOverlay.classList.remove("hidden");

    }


    if (dashboardContent) {

        dashboardContent.classList.add("hidden");

    }

}


/* ============================================================
   SHOW DASHBOARD
   ============================================================ */

function showDashboard() {

    const loginOverlay =
        document.getElementById("loginOverlay");

    const dashboardContent =
        document.getElementById("dashboardContent");


    if (loginOverlay) {

        loginOverlay.classList.add("hidden");

    }


    if (dashboardContent) {

        dashboardContent.classList.remove("hidden");

    }

}


/* ============================================================
   LOGOUT
   ============================================================ */

function handleLogout() {

    /*
     * Only the explicit Logout button removes
     * the persistent welfare session.
     */
    localStorage.removeItem(
        WELFARE_LOGIN_KEY
    );

    localStorage.removeItem(
        WELFARE_USERNAME_KEY
    );


    stopAutoRefresh();


    transactions = [];

    currentPage = 0;


    if (financeChart) {

        financeChart.destroy();

        financeChart = null;

    }


    const activityTable =
        document.getElementById("activityTable");

    if (activityTable) {

        activityTable.innerHTML = `
            <tr>
                <td
                    colspan="4"
                    class="welfare-table-loading"
                >
                    Loading activity...
                </td>
            </tr>
        `;

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


    clearLoginError();

    showLogin();

}


/* ============================================================
   LOAD ALL WELFARE DATA
   ============================================================ */

async function loadWelfareData() {

    try {

        const [
            summaryRows,
            contributionRows,
            expenseRows
        ] = await Promise.all([

            fetchCSV(SUMMARY_CSV_URL),

            fetchCSV(CONTRIBUTIONS_CSV_URL),

            fetchCSV(EXPENSES_CSV_URL)

        ]);


        updateSummary(summaryRows);

        buildTransactions(
            contributionRows,
            expenseRows
        );

        renderTransactions();

        renderFinanceChart(summaryRows);


    } catch (error) {

        console.error(
            "Welfare data loading error:",
            error
        );

        const activityTable =
            document.getElementById("activityTable");

        if (activityTable) {

            activityTable.innerHTML = `
                <tr>
                    <td
                        colspan="4"
                        class="welfare-table-empty"
                    >
                        Unable to load welfare data.
                    </td>
                </tr>
            `;

        }

    }

}


/* ============================================================
   FETCH CSV
   ============================================================ */

async function fetchCSV(url) {

    const response =
        await fetch(
            `${url}&_=${Date.now()}`,
            {
                cache: "no-store"
            }
        );


    if (!response.ok) {

        throw new Error(
            `Unable to load CSV (${response.status}).`
        );

    }


    const text =
        await response.text();


    return parseCSV(text);

}


/* ============================================================
   CSV PARSER
   ============================================================ */

function parseCSV(text) {

    const rows = [];

    let row = [];

    let cell = "";

    let insideQuotes = false;


    for (let i = 0; i < text.length; i++) {

        const character =
            text[i];

        const nextCharacter =
            text[i + 1];


        if (character === '"' && insideQuotes && nextCharacter === '"') {

            cell += '"';

            i++;

            continue;

        }


        if (character === '"') {

            insideQuotes =
                !insideQuotes;

            continue;

        }


        if (character === "," && !insideQuotes) {

            row.push(cell);

            cell = "";

            continue;

        }


        if (
            (character === "\n" || character === "\r") &&
            !insideQuotes
        ) {

            if (
                character === "\r" &&
                nextCharacter === "\n"
            ) {
                i++;
            }


            row.push(cell);

            rows.push(row);

            row = [];

            cell = "";

            continue;

        }


        cell += character;

    }


    if (cell !== "" || row.length > 0) {

        row.push(cell);

        rows.push(row);

    }


    return rows.map((currentRow) =>
        currentRow.map((value) =>
            String(value ?? "").trim()
        )
    );

}


/* ============================================================
   UPDATE SUMMARY
   ============================================================ */

function updateSummary(rows) {

    if (!Array.isArray(rows) || !rows.length) {
        return;
    }


    const contributions =
        rows[0]?.[1] || "0";

    const expenses =
        rows[1]?.[1] || "0";

    const balance =
        rows[2]?.[1] || "0";


    setText(
        "totalContributions",
        formatCurrency(contributions)
    );

    setText(
        "totalExpenses",
        formatCurrency(expenses)
    );

    setText(
        "currentBalance",
        formatCurrency(balance)
    );

}


/* ============================================================
   BUILD TRANSACTIONS
   ============================================================ */

function buildTransactions(
    contributionRows,
    expenseRows
) {

    const contributionTransactions = [];

    const expenseTransactions = [];


    /*
     * CONTRIBUTIONS
     *
     * Existing sheet mapping:
     * amount = row[3]
     * title  = row[5]
     * date   = row[1]
     */
    if (Array.isArray(contributionRows)) {

        contributionRows.forEach((row, index) => {

            if (index === 0) {
                return;
            }

            if (!row || row.length < 6) {
                return;
            }


            const amount =
                parseAmount(row[3]);

            const title =
                row[5] ||
                "Contribution";

            const date =
                row[1] ||
                "";


            if (!amount && !title && !date) {
                return;
            }


            contributionTransactions.push({

                date: date,

                title: title,

                amount: amount,

                type: "credit"

            });

        });

    }


    /*
     * EXPENSES
     *
     * Existing sheet mapping:
     * date   = row[1]
     * amount = row[2]
     * title  = row[3]
     */
    if (Array.isArray(expenseRows)) {

        expenseRows.forEach((row, index) => {

            if (index === 0) {
                return;
            }

            if (!row || row.length < 4) {
                return;
            }


            const date =
                row[1] ||
                "";

            const amount =
                parseAmount(row[2]);

            const title =
                row[3] ||
                "Expense";


            if (!amount && !title && !date) {
                return;
            }


            expenseTransactions.push({

                date: date,

                title: title,

                amount: amount,

                type: "debit"

            });

        });

    }


    transactions = [
        ...contributionTransactions,
        ...expenseTransactions
    ];


    transactions.sort(
        (a, b) => {

            const dateA =
                parseDateValue(a.date);

            const dateB =
                parseDateValue(b.date);

            return dateB - dateA;

        }
    );


    currentPage = 0;

}


/* ============================================================
   RENDER TRANSACTIONS
   ============================================================ */

function renderTransactions() {

    const activityTable =
        document.getElementById("activityTable");

    const pageNumber =
        document.getElementById("pageNumber");

    const prevPageBtn =
        document.getElementById("prevPageBtn");

    const nextPageBtn =
        document.getElementById("nextPageBtn");


    if (!activityTable) {
        return;
    }


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                transactions.length /
                itemsPerPage
            )
        );


    if (currentPage >= totalPages) {

        currentPage =
            totalPages - 1;

    }


    if (currentPage < 0) {

        currentPage = 0;

    }


    const startIndex =
        currentPage * itemsPerPage;

    const endIndex =
        startIndex + itemsPerPage;


    const pageTransactions =
        transactions.slice(
            startIndex,
            endIndex
        );


    if (!pageTransactions.length) {

        activityTable.innerHTML = `
            <tr>
                <td
                    colspan="4"
                    class="welfare-table-empty"
                >
                    No welfare activity found.
                </td>
            </tr>
        `;

    } else {

        activityTable.innerHTML =
            pageTransactions
                .map(renderTransactionRow)
                .join("");

    }


    if (pageNumber) {

        pageNumber.textContent =
            `Page ${currentPage + 1} of ${totalPages}`;

    }


    if (prevPageBtn) {

        prevPageBtn.disabled =
            currentPage === 0;

    }


    if (nextPageBtn) {

        nextPageBtn.disabled =
            currentPage >= totalPages - 1;

    }

}


/* ============================================================
   RENDER TRANSACTION ROW
   ============================================================ */

function renderTransactionRow(transaction) {

    const isCredit =
        transaction.type === "credit";


    const typeLabel =
        isCredit
            ? "Contribution"
            : "Expense";


    const amountPrefix =
        isCredit
            ? "+"
            : "-";


    const amountClass =
        isCredit
            ? "transaction-credit"
            : "transaction-debit";


    const typeClass =
        isCredit
            ? "credit"
            : "debit";


    return `
        <tr>

            <td>
                ${escapeHTML(
                    formatDate(transaction.date)
                )}
            </td>

            <td>
                ${escapeHTML(
                    transaction.title
                )}
            </td>

            <td>
                <span
                    class="transaction-type ${typeClass}"
                >
                    ${typeLabel}
                </span>
            </td>

            <td
                class="${amountClass}"
            >
                ${amountPrefix}${formatCurrency(
                    transaction.amount
                )}
            </td>

        </tr>
    `;

}


/* ============================================================
   PREVIOUS PAGE
   ============================================================ */

function previousPage() {

    if (currentPage > 0) {

        currentPage--;

        renderTransactions();

    }

}


/* ============================================================
   NEXT PAGE
   ============================================================ */

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

        renderTransactions();

    }

}


/*
 * Keep these globally available in case another
 * existing part of the page calls them.
 */
window.prevPage = previousPage;
window.nextPage = nextPage;


/* ============================================================
   FINANCE CHART
   ============================================================ */

function renderFinanceChart(summaryRows) {

    const canvas =
        document.getElementById("financeChart");

    if (!canvas) {
        return;
    }


    if (
        typeof Chart === "undefined"
    ) {

        console.warn(
            "Chart.js is not available."
        );

        return;

    }


    const contributions =
        parseAmount(
            summaryRows?.[0]?.[1]
        );

    const expenses =
        parseAmount(
            summaryRows?.[1]?.[1]
        );

    const balance =
        parseAmount(
            summaryRows?.[2]?.[1]
        );


    if (financeChart) {

        financeChart.destroy();

        financeChart = null;

    }


    financeChart =
        new Chart(
            canvas,
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
                                contributions,
                                expenses,
                                balance
                            ],

                            borderWidth: 0,

                            borderRadius: 7,

                            maxBarThickness: 55
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

                                label: function(context) {

                                    return (
                                        " ₦" +
                                        Number(
                                            context.raw || 0
                                        ).toLocaleString(
                                            "en-NG"
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
                                    size: 11
                                }
                            }

                        },

                        y: {

                            beginAtZero: true,

                            grid: {
                                color:
                                    "rgba(10, 0, 22, 0.06)"
                            },

                            ticks: {

                                font: {
                                    family:
                                        "DM Sans",
                                    size: 10
                                },

                                callback: function(value) {

                                    return (
                                        "₦" +
                                        Number(
                                            value
                                        ).toLocaleString(
                                            "en-NG"
                                        )
                                    );

                                }

                            }

                        }

                    }

                }

            }
        );

}


/* ============================================================
   AUTO REFRESH
   ============================================================ */

function startAutoRefresh() {

    stopAutoRefresh();


    refreshTimer =
        setInterval(
            () => {

                const loggedIn =
                    localStorage.getItem(
                        WELFARE_LOGIN_KEY
                    );


                if (loggedIn === "true") {

                    loadWelfareData();

                } else {

                    stopAutoRefresh();

                }

            },
            30000
        );

}


/* ============================================================
   STOP AUTO REFRESH
   ============================================================ */

function stopAutoRefresh() {

    if (refreshTimer) {

        clearInterval(
            refreshTimer
        );

        refreshTimer = null;

    }

}


/* ============================================================
   PARSE AMOUNT
   ============================================================ */

function parseAmount(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return 0;

    }


    if (typeof value === "number") {

        return Number.isFinite(value)
            ? value
            : 0;

    }


    const cleaned =
        String(value)
            .replace(/[₦,\s]/g, "")
            .replace(/[^\d.-]/g, "");


    const number =
        parseFloat(cleaned);


    return Number.isFinite(number)
        ? number
        : 0;

}


/* ============================================================
   FORMAT CURRENCY
   ============================================================ */

function formatCurrency(value) {

    const amount =
        parseAmount(value);


    return (
        "₦" +
        amount.toLocaleString(
            "en-NG",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        )
    );

}


/* ============================================================
   FORMAT DATE
   ============================================================ */

function formatDate(value) {

    if (!value) {
        return "—";
    }


    const date =
        parseDateValue(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);

    }


    return date.toLocaleDateString(
        "en-NG",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


/* ============================================================
   PARSE DATE
   ============================================================ */

function parseDateValue(value) {

    if (!value) {

        return new Date(0);

    }


    const date =
        new Date(value);


    if (!Number.isNaN(date.getTime())) {

        return date;

    }


    /*
     * Fallback for common DD/MM/YYYY
     * or DD-MM-YYYY values.
     */
    const match =
        String(value).match(
            /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/
        );


    if (match) {

        let year =
            parseInt(
                match[3],
                10
            );

        if (year < 100) {
            year += 2000;
        }


        return new Date(
            year,
            parseInt(match[2], 10) - 1,
            parseInt(match[1], 10)
        );

    }


    return new Date(0);

}


/* ============================================================
   SET TEXT
   ============================================================ */

function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {

        element.textContent =
            value;

    }

}


/* ============================================================
   ESCAPE HTML
   ============================================================ */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* ============================================================
   CLEANUP
   ============================================================ */

window.addEventListener(
    "beforeunload",
    () => {

        stopAutoRefresh();

    }
);
