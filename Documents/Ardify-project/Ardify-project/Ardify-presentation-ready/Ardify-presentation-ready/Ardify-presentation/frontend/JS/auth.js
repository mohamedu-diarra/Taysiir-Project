/**
 * auth.js — Ardify Authentication
 * Handles signup/login form submission against the real backend API,
 * role-based dashboard redirects, logout, and protected-route guards.
 * Load order: api.js, then app.js, then auth.js.
 */

(function () {
  const DASHBOARD_BY_ROLE = {
    student: "./student-dashboard.html",
    instructor: "./instructor-dashboard.html",
    admin: "./admin-dashboard.html",
  };

  function dashboardUrlForRole(role) {
    return DASHBOARD_BY_ROLE[role] || "./student-dashboard.html";
  }

  // ── Role check helpers ──
  function isAdmin() {
    const user = window.ArdifyAuth.getUser();
    return user && user.role === "admin";
  }

  function isInstructor() {
    const user = window.ArdifyAuth.getUser();
    return user && user.role === "instructor";
  }

  function isStudent() {
    const user = window.ArdifyAuth.getUser();
    return user && user.role === "student";
  }

  function setMessage(el, text, isError) {
    if (!el) return;
    el.textContent = text || "";
    el.classList.toggle("auth-note--error", !!isError);
    el.style.color = isError ? "#d92d20" : "";
  }

  function setSubmitting(button, isSubmitting, idleLabel) {
    if (!button) return;
    button.disabled = isSubmitting;
    button.textContent = isSubmitting ? "Please wait..." : idleLabel;
  }

  // ── Route guards (real auth, used in place of app.js's localStorage stubs) ──
  function requireAuth(redirectTo = "./login.html") {
    if (!window.ArdifyAuth.isLoggedIn()) {
      window.location.href = redirectTo;
      return false;
    }
    return true;
  }

  function requireRole(allowedRoles, redirectTo = "./login.html") {
    if (!requireAuth(redirectTo)) return false;
    const user = window.ArdifyAuth.getUser();
    if (!user || !allowedRoles.includes(user.role)) {
      window.location.href = dashboardUrlForRole(user && user.role);
      return false;
    }
    return true;
  }

  // ── Role-specific guards ──
  function requireAdmin(redirectTo = "./login.html") {
    return requireRole(["admin"], redirectTo);
  }

  function requireInstructor(redirectTo = "./login.html") {
    return requireRole(["instructor", "admin"], redirectTo);
  }

  function requireStudent(redirectTo = "./login.html") {
    return requireRole(["student"], redirectTo);
  }

  function redirectIfLoggedIn() {
    if (window.ArdifyAuth.isLoggedIn()) {
      const user = window.ArdifyAuth.getUser();
      window.location.href = dashboardUrlForRole(user.role);
      return true;
    }
    return false;
  }

  async function logout() {
    try {
      await window.ArdifyApi.post("/auth/logout", {});
    } catch {
      // Ignore network/auth errors on logout — we clear the local
      // session regardless so the user is never stuck logged in.
    }
    window.ArdifyAuth.clearSession();
    window.location.href = "./login.html";
  }

  // ── Signup form ───────────────────────────────────────────
  function wireSignupForm() {
    const form = document.getElementById("signupForm");
    if (!form) return;

    const messageEl = document.getElementById("signupMessage");
    const submitBtn = form.querySelector(".btn-submit");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      setMessage(messageEl, "");

      const fullName = form.fullName.value.trim();
      const email = form.email.value.trim();
      const password = form.password.value;
      const confirmPassword = form.confirmPassword.value;
      const roleInput = form.querySelector('input[name="role"]:checked');
      const role = roleInput ? roleInput.value : "student";

      if (password !== confirmPassword) {
        setMessage(messageEl, "Passwords do not match.", true);
        return;
      }

      const [firstName, ...rest] = fullName.split(/\s+/);
      const lastName = rest.join(" ") || firstName;

      setSubmitting(submitBtn, true, "Create account");
      try {
        const data = await window.ArdifyApi.post(
          "/auth/signup",
          { firstName, lastName, email, password, role },
          { auth: false },
        );
        window.ArdifyAuth.setSession(data);
        setMessage(messageEl, "Account created! Redirecting...", false);
        window.location.href = dashboardUrlForRole(data.user.role);
      } catch (err) {
        setMessage(messageEl, err.message, true);
      } finally {
        setSubmitting(submitBtn, false, "Create account");
      }
    });
  }

  // ── Login form ────────────────────────────────────────────
  function wireLoginForm() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    const messageEl = document.getElementById("loginMessage");
    const submitBtn = form.querySelector(".btn-submit");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      setMessage(messageEl, "");

      const email = form.email.value.trim();
      const password = form.password.value;

      setSubmitting(submitBtn, true, "Login");
      try {
        const data = await window.ArdifyApi.post(
          "/auth/login",
          { email, password },
          { auth: false },
        );
        window.ArdifyAuth.setSession(data);
        setMessage(messageEl, "Welcome back! Redirecting...", false);
        window.location.href = dashboardUrlForRole(data.user.role);
      } catch (err) {
        setMessage(messageEl, err.message, true);
      } finally {
        setSubmitting(submitBtn, false, "Login");
      }
    });
  }

  // ── Nav bar: swap Login/Sign-up for avatar + logout when authed ──
  function wireNav() {
    const btnAction = document.querySelector(".btn_action");
    if (!btnAction || !window.ArdifyAuth.isLoggedIn()) return;

    const user = window.ArdifyAuth.getUser();
    const name = user.fullName || `${user.firstName} ${user.lastName}`;
    const initials = name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    // Add role badge for admin
    const roleBadge = user.role === "admin" ? '<span class="role-badge admin">Admin</span>' : 
                      user.role === "instructor" ? '<span class="role-badge instructor">Instructor</span>' : '';

    btnAction.innerHTML = `
      <a class="sign_in nav-dash-link" href="${dashboardUrlForRole(user.role)}">
        <span class="nav-avatar">${initials}</span>
        <span class="nav-user-name">${name.split(" ")[0]}</span>
        ${roleBadge}
      </a>
      <button class="Get nav-logout-btn" type="button">Logout</button>
    `;
    btnAction
      .querySelector(".nav-logout-btn")
      .addEventListener("click", logout);
  }

  document.addEventListener("DOMContentLoaded", () => {
    wireSignupForm();
    wireLoginForm();
    wireNav();
  });

  window.ArdifyAuthFlow = {
    requireAuth,
    requireRole,
    requireAdmin,
    requireInstructor,
    requireStudent,
    redirectIfLoggedIn,
    logout,
    dashboardUrlForRole,
    isAdmin,
    isInstructor,
    isStudent,
  };
})();