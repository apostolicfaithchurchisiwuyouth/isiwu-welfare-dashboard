/* ============================================================
   AFC ISIU YOUTH PORTAL V2
   SLC REPORT
   FILE: slcreport.js
   ============================================================ */

(function () {
  "use strict";

  /* ==========================================================
     CONFIGURATION
  ========================================================== */

  const API_URL =
    window.AFC_API_URL ||
    "https://script.google.com/macros/s/AKfycbw1mVwpgAcIOSNbpgzy52TFyozEGMtWWwVWUDFaofGNzpsguBIaKR4q1dXVtgVHO2xZ1w/exec";

  const SESSION_KEY = "afc_isiu_slc_leader_session";

  /*
   * IMPORTANT:
   * localStorage is intentionally used here.
   *
   * sessionStorage is NOT used because it is cleared when the
   * browsing session/page session ends.
   *
   * With localStorage:
   * - Refresh = user remains logged in
   * - Closing/reopening browser = session remains
   * - Only Logout removes the saved session
   */

  const COORDINATOR_NAME = "Monayo Olajimbiti";
  const COORDINATOR_DISPLAY_NAME = "OLA JIMBITI MONAYO";

  /* ==========================================================
     DOM
  ========================================================== */

  const $ = (id) => document.getElementById(id);

  const loginSection = $("loginSection");
  const reportApplication = $("reportApplication");
  const loginForm = $("loginForm");
  const loginBtn = $("loginBtn");

  const loginUsername = $("loginUsername");
  const loginPassword = $("loginPassword");

  const togglePassword = $("togglePassword");

  const logoutBtn = $("logoutBtn");
  const topbarLogoutBtn = $("topbarLogoutBtn");

  const slcReportForm = $("slcReportForm");
  const submitReportBtn = $("submitReportBtn");

  const reportStatus = $("reportStatus");

  const existingReportSection = $("existingReportSection");
  const deadlineSection = $("deadlineSection");

  const reportWeekBadge = $("reportWeekBadge");
  const reportWeekText = $("reportWeekText");
  const currentReportWeek = $("currentReportWeek");

  const coordinatorName = $("coordinatorName");
  const reportCurrentStatus = $("reportCurrentStatus");

  const totalMembers = $("totalMembers");
  const participatedMembers = $("participatedMembers");
  const notParticipatedMembers = $("notParticipatedMembers");
  const participationPercentage = $("participationPercentage");

  const mobileMenuBtn = $("mobileMenuBtn");
  const sidebar = $("sidebar");

  /* ==========================================================
     STATE
  ========================================================== */

  let currentSession = null;
  let currentReport = null;
  let isSubmitting = false;

  /* ==========================================================
     INITIALIZATION
  ========================================================== */

  document.addEventListener("DOMContentLoaded", init);

  async function init() {

    initIcons();
    initPasswordToggle();
    initMobileMenu();
    initLogoutButtons();

    coordinatorName.textContent = COORDINATOR_NAME;

    setCurrentWeekDisplay();

    /*
     * RESTORE SESSION BEFORE SHOWING LOGIN.
     *
     * This is the major refresh-login fix.
     */
    const savedSession = loadSession();

    if (savedSession) {

      currentSession = savedSession;

      showReportApplication();

      await loadReportData();

      return;
    }

    showLogin();

  }

  /* ==========================================================
     ICONS
  ========================================================== */

  function initIcons() {

    if (window.lucide) {
      window.lucide.createIcons();
    }

  }

  /* ==========================================================
     SESSION MANAGEMENT
  ========================================================== */

  function saveSession(session) {

    try {

      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify(session)
      );

    } catch (error) {

      console.error(
        "Unable to save SLC session:",
        error
      );

    }

  }

  function loadSession() {

    try {

      const rawSession =
        localStorage.getItem(SESSION_KEY);

      if (!rawSession) {
        return null;
      }

      const session =
        JSON.parse(rawSession);

      if (!session || typeof session !== "object") {

        localStorage.removeItem(SESSION_KEY);

        return null;
      }

      return session;

    } catch (error) {

      console.error(
        "Unable to restore SLC session:",
        error
      );

      localStorage.removeItem(SESSION_KEY);

      return null;
    }

  }

  function clearSession() {

    /*
     * ONLY the explicit Logout action calls this.
     */
    localStorage.removeItem(SESSION_KEY);

    currentSession = null;

  }

  /* ==========================================================
     LOGIN
  ========================================================== */

  loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    if (!loginUsername.value.trim()) {

      showStatus(
        "Please enter your username.",
        "error"
      );

      loginUsername.focus();

      return;
    }

    if (!loginPassword.value) {

      showStatus(
        "Please enter your password.",
        "error"
      );

      loginPassword.focus();

      return;
    }

    setButtonLoading(
      loginBtn,
      true,
      "Signing in..."
    );

    hideStatus();

    try {

      const response = await apiRequest(
        "POST",
        {
          action: "login",
          username: loginUsername.value.trim(),
          password: loginPassword.value
        }
      );

      if (!response || response.success !== true) {

        throw new Error(
          response?.message ||
          "Invalid username or password."
        );

      }

      /*
       * Save the complete successful session.
       *
       * This is what makes refresh persistence work.
       */
      currentSession = {
        ...response,
        username:
          response.username ||
          loginUsername.value.trim(),

        loggedInAt:
          response.loggedInAt ||
          new Date().toISOString()
      };

      saveSession(currentSession);

      loginForm.reset();

      showReportApplication();

      await loadReportData();

      showStatus(
        "Login successful.",
        "success"
      );

    } catch (error) {

      console.error("SLC login error:", error);

      showStatus(
        error.message ||
        "Unable to log in. Please try again.",
        "error"
      );

    } finally {

      setButtonLoading(
        loginBtn,
        false,
        "Login"
      );

    }

  });

  /* ==========================================================
     LOGOUT
  ========================================================== */

  function handleLogout() {

    /*
     * Do NOT log the user out on page refresh.
     *
     * This function is only called when the user explicitly
     * presses a Logout button.
     */

    clearSession();

    showLogin();

    loginUsername.value = "";
    loginPassword.value = "";

    hideStatus();

    hideElement(existingReportSection);
    hideElement(deadlineSection);

    if (slcReportForm) {
      slcReportForm.reset();
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  }

  function initLogoutButtons() {

    if (logoutBtn) {
      logoutBtn.addEventListener(
        "click",
        handleLogout
      );
    }

    if (topbarLogoutBtn) {
      topbarLogoutBtn.addEventListener(
        "click",
        handleLogout
      );
    }

  }

  /* ==========================================================
     UI STATE
  ========================================================== */

  function showLogin() {

    showElement(loginSection);
    hideElement(reportApplication);

  }

  function showReportApplication() {

    hideElement(loginSection);
    showElement(reportApplication);

  }

  /* ==========================================================
     REPORT DATA
  ========================================================== */

  async function loadReportData() {

    if (!currentSession) {
      showLogin();
      return;
    }

    try {

      reportCurrentStatus.textContent = "Loading...";

      const response = await apiRequest(
        "GET",
        {
          action: "getMySLCReport",
          username:
            currentSession.username ||
            currentSession.user?.username ||
            ""
        }
      );

      if (!response || response.success === false) {

        /*
         * If the server says the saved session is no longer
         * valid, then and only then do we clear it.
         */
        if (
          response?.code === "AUTH_REQUIRED" ||
          response?.code === "SESSION_EXPIRED"
        ) {

          clearSession();
          showLogin();

          showStatus(
            "Your login session has expired. Please log in again.",
            "error"
          );

          return;
        }

        throw new Error(
          response?.message ||
          "Unable to load the SLC report."
        );

      }

      currentReport = response;

      populateReport(response);

    } catch (error) {

      console.error(
        "Unable to load SLC report:",
        error
      );

      reportCurrentStatus.textContent =
        "Unable to load";

      showStatus(
        error.message ||
        "Unable to load the report. Please refresh and try again.",
        "error"
      );

    }

  }

  /* ==========================================================
     POPULATE REPORT
  ========================================================== */

  function populateReport(data) {

    const report =
      data.report ||
      data.data ||
      data;

    /*
     * Coordinator remains fixed/read-only.
     */
    coordinatorName.textContent =
      COORDINATOR_NAME;

    /*
     * Week
     */
    const week =
      report.week ||
      report.weekNumber ||
      report.lessonNo ||
      data.week ||
      "";

    if (week) {

      const weekText =
        String(week).toLowerCase().includes("week")
          ? String(week)
          : `Week ${week}`;

      reportWeekText.textContent = weekText;
      currentReportWeek.textContent = weekText;

    }

    /*
     * Participation
     */
    const participation =
      data.participation ||
      report.participation ||
      {};

    const total =
      toNumber(
        participation.totalMembers ??
        participation.total ??
        report.totalMembers
      );

    const participated =
      toNumber(
        participation.participatedMembers ??
        participation.participated ??
        report.participatedMembers
      );

    const yetToParticipate =
      Math.max(
        total - participated,
        0
      );

    const percentage =
      total > 0
        ? Math.round(
            (participated / total) * 100
          )
        : 0;

    totalMembers.textContent =
      total;

    participatedMembers.textContent =
      participated;

    notParticipatedMembers.textContent =
      yetToParticipate;

    participationPercentage.textContent =
      `${percentage}%`;

    /*
     * Existing report
     */
    const existing =
      Boolean(
        data.existingReport ??
        report.existingReport ??
        data.submitted ??
        report.submitted
      );

    const deadlinePassed =
      Boolean(
        data.deadlinePassed ??
        report.deadlinePassed ??
        data.closed ??
        report.closed
      );

    if (existing) {

      showElement(existingReportSection);

      hideElement(deadlineSection);

      reportCurrentStatus.textContent =
        "Submitted";

      disableReportForm();

      const existingMessage =
        $("existingReportMessage");

      if (existingMessage) {

        existingMessage.textContent =
          data.existingReportMessage ||
          report.existingReportMessage ||
          "Your SLC report for this week is already on record.";

      }

      return;
    }

    if (deadlinePassed) {

      hideElement(existingReportSection);

      showElement(deadlineSection);

      reportCurrentStatus.textContent =
        "Closed";

      disableReportForm();

      return;
    }

    hideElement(existingReportSection);
    hideElement(deadlineSection);

    reportCurrentStatus.textContent =
      "Ready";

    enableReportForm();

    /*
     * Prefill returned report values where available.
     */
    fillIfPresent(
      "activities",
      report.activities
    );

    fillIfPresent(
      "achievements",
      report.achievements
    );

    fillIfPresent(
      "challenges",
      report.challenges
    );

    fillIfPresent(
      "supportNeeded",
      report.supportNeeded
    );

    fillIfPresent(
      "observations",
      report.observations
    );

    fillIfPresent(
      "contactName",
      report.contactName
    );

    fillIfPresent(
      "contactPhone",
      report.contactPhone
    );

  }

  /* ==========================================================
     SUBMIT REPORT
  ========================================================== */

  slcReportForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();

      if (isSubmitting) {
        return;
      }

      if (!currentSession) {

        showStatus(
          "Please log in before submitting the report.",
          "error"
        );

        showLogin();

        return;
      }

      if (!validateReportForm()) {
        return;
      }

      isSubmitting = true;

      setButtonLoading(
        submitReportBtn,
        true,
        "Submitting..."
      );

      hideStatus();

      try {

        const formData = {

          action: "submitSLCReport",

          username:
            currentSession.username ||
            currentSession.user?.username ||
            "",

          coordinator:
            COORDINATOR_DISPLAY_NAME,

          coordinatorName:
            COORDINATOR_NAME,

          activities:
            getValue("activities"),

          achievements:
            getValue("achievements"),

          challenges:
            getValue("challenges"),

          supportNeeded:
            getValue("supportNeeded"),

          observations:
            getValue("observations"),

          contactName:
            getValue("contactName"),

          contactPhone:
            getValue("contactPhone")

        };

        const response =
          await apiRequest(
            "POST",
            formData
          );

        if (
          !response ||
          response.success !== true
        ) {

          throw new Error(
            response?.message ||
            "Unable to submit the report."
          );

        }

        showStatus(
          response.message ||
          "SLC report submitted successfully.",
          "success"
        );

        reportCurrentStatus.textContent =
          "Submitted";

        disableReportForm();

        showElement(
          existingReportSection
        );

        const existingMessage =
          $("existingReportMessage");

        if (existingMessage) {

          existingMessage.textContent =
            "Your SLC report for this week has been submitted successfully.";

        }

        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });

      } catch (error) {

        console.error(
          "SLC report submission error:",
          error
        );

        showStatus(
          error.message ||
          "Unable to submit the report. Please try again.",
          "error"
        );

      } finally {

        isSubmitting = false;

        setButtonLoading(
          submitReportBtn,
          false,
          "Submit SLC Report"
        );

      }

    }
  );

  /* ==========================================================
     FORM VALIDATION
  ========================================================== */

  function validateReportForm() {

    const activities =
      getValue("activities");

    const achievements =
      getValue("achievements");

    if (!activities) {

      showStatus(
        "Please enter the activities held.",
        "error"
      );

      $("activities").focus();

      return false;
    }

    if (!achievements) {

      showStatus(
        "Please enter the major achievements.",
        "error"
      );

      $("achievements").focus();

      return false;
    }

    return true;

  }

  /* ==========================================================
     DISABLE / ENABLE FORM
  ========================================================== */

  function disableReportForm() {

    if (!slcReportForm) {
      return;
    }

    const controls =
      slcReportForm.querySelectorAll(
        "input, textarea, select, button"
      );

    controls.forEach(
      (control) => {
        control.disabled = true;
      }
    );

  }

  function enableReportForm() {

    if (!slcReportForm) {
      return;
    }

    const controls =
      slcReportForm.querySelectorAll(
        "input, textarea, select, button"
      );

    controls.forEach(
      (control) => {
        control.disabled = false;
      }
    );

  }

  /* ==========================================================
     API
  ========================================================== */

  async function apiRequest(
    method,
    payload
  ) {

    let url = API_URL;

    if (
      !url ||
      url === "YOUR_APPS_SCRIPT_WEB_APP_URL"
    ) {

      throw new Error(
        "Apps Script API URL has not been configured."
      );

    }

    let response;

    if (method === "GET") {

      const params =
        new URLSearchParams();

      Object.entries(
        payload || {}
      ).forEach(
        ([key, value]) => {

          if (
            value !== undefined &&
            value !== null
          ) {

            params.set(
              key,
              String(value)
            );

          }

        }
      );

      url +=
        (url.includes("?") ? "&" : "?") +
        params.toString();

      response =
        await fetch(url, {
          method: "GET",
          cache: "no-store"
        });

    } else {

      response =
        await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },
          body: JSON.stringify(
            payload || {}
          )
        });

    }

    if (!response.ok) {

      throw new Error(
        `Server error (${response.status}).`
      );

    }

    const text =
      await response.text();

    try {

      return JSON.parse(text);

    } catch (error) {

      console.error(
        "Invalid API response:",
        text
      );

      throw new Error(
        "The server returned an invalid response."
      );

    }

  }

  /* ==========================================================
     WEEK DISPLAY
  ========================================================== */

  function setCurrentWeekDisplay() {

    const now = new Date();

    const start =
      getWeekStart(now);

    const end =
      new Date(start);

    end.setDate(
      end.getDate() + 6
    );

    const formatter =
      new Intl.DateTimeFormat(
        "en-NG",
        {
          day: "numeric",
          month: "short"
        }
      );

    const text =
      `${formatter.format(start)} – ${formatter.format(end)}`;

    reportWeekText.textContent = text;
    currentReportWeek.textContent = text;

  }

  function getWeekStart(date) {

    const result =
      new Date(date);

    const day =
      result.getDay();

    /*
     * Monday = start of week.
     */
    const difference =
      day === 0
        ? -6
        : 1 - day;

    result.setDate(
      result.getDate() + difference
    );

    result.setHours(
      0,
      0,
      0,
      0
    );

    return result;

  }

  /* ==========================================================
     PASSWORD TOGGLE
  ========================================================== */

  function initPasswordToggle() {

    if (!togglePassword) {
      return;
    }

    togglePassword.addEventListener(
      "click",
      function () {

        const isPassword =
          loginPassword.type === "password";

        loginPassword.type =
          isPassword
            ? "text"
            : "password";

        togglePassword.innerHTML =
          isPassword
            ? '<i data-lucide="eye-off"></i>'
            : '<i data-lucide="eye"></i>';

        togglePassword.setAttribute(
          "aria-label",
          isPassword
            ? "Hide password"
            : "Show password"
        );

        initIcons();

      }
    );

  }

  /* ==========================================================
     MOBILE MENU
  ========================================================== */

  function initMobileMenu() {

    if (!mobileMenuBtn || !sidebar) {
      return;
    }

    mobileMenuBtn.addEventListener(
      "click",
      function () {

        sidebar.classList.toggle(
          "sidebar-open"
        );

      }
    );

  }

  /* ==========================================================
     STATUS
  ========================================================== */

  function showStatus(
    message,
    type = "info"
  ) {

    if (!reportStatus) {
      return;
    }

    reportStatus.textContent =
      message;

    reportStatus.className =
      `report-status ${type}`;

    reportStatus.hidden = false;

  }

  function hideStatus() {

    if (!reportStatus) {
      return;
    }

    reportStatus.hidden = true;
    reportStatus.textContent = "";
    reportStatus.className =
      "report-status";

  }

  /* ==========================================================
     HELPERS
  ========================================================== */

  function showElement(element) {

    if (element) {
      element.hidden = false;
    }

  }

  function hideElement(element) {

    if (element) {
      element.hidden = true;
    }

  }

  function getValue(id) {

    const element = $(id);

    return element
      ? element.value.trim()
      : "";

  }

  function fillIfPresent(
    id,
    value
  ) {

    const element = $(id);

    if (
      element &&
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {

      element.value =
        String(value);

    }

  }

  function toNumber(value) {

    const number =
      Number(value);

    return Number.isFinite(number)
      ? number
      : 0;

  }

  function setButtonLoading(
    button,
    loading,
    loadingText
  ) {

    if (!button) {
      return;
    }

    if (loading) {

      button.disabled = true;

      button.dataset.originalText =
        button.textContent.trim();

      button.innerHTML =
        `<span>${loadingText}</span>`;

    } else {

      button.disabled = false;

      const originalText =
        button.dataset.originalText ||
        loadingText;

      button.innerHTML =
        `<span>${originalText}</span>`;

    }

  }

})();
 
