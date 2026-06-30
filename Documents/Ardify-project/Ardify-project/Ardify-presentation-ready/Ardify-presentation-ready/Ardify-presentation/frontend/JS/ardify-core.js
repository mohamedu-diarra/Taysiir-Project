/**
 * ardify-core.js — Presentation-Ready Core
 * Handles: Auth, Enrollment, Search, Contact, Upload, Certificates,
 *          Dashboard stats, Demo popups for Stripe/PayPal/AI/Chat
 * Load AFTER api.js
 */
(function () {
  "use strict";

  const API = window.ArdifyApi;
  const AUTH = window.ArdifyAuth;

  // ─── Toast Notifications ─────────────────────────────────
  function toast(message, type = "success", duration = 4000) {
    let container = document.getElementById("ardify-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "ardify-toast-container";
      container.style.cssText =
        "position:fixed;top:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:10px;";
      document.body.appendChild(container);
    }

    const icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };
    const colors = {
      success: "#12b76a",
      error: "#f04438",
      info: "#0ea5e9",
      warning: "#f79009",
    };

    const el = document.createElement("div");
    el.style.cssText = `
      background:#0d1320;border:1px solid ${colors[type]};color:#fff;
      padding:14px 18px;border-radius:10px;font-family:'Space Grotesk',sans-serif;
      font-size:14px;max-width:360px;display:flex;align-items:center;gap:10px;
      box-shadow:0 8px 32px rgba(0,0,0,0.4);animation:slideInRight 0.3s ease;
    `;
    el.innerHTML = `<span style="font-size:18px">${icons[type]}</span><span>${message}</span>`;

    if (!document.getElementById("ardify-toast-style")) {
      const s = document.createElement("style");
      s.id = "ardify-toast-style";
      s.textContent = `
        @keyframes slideInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:none}}
        @keyframes slideOutRight{from{opacity:1;transform:none}to{opacity:0;transform:translateX(40px)}}
      `;
      document.head.appendChild(s);
    }

    container.appendChild(el);
    setTimeout(() => {
      el.style.animation = "slideOutRight 0.3s ease forwards";
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  // ─── Demo Modal ──────────────────────────────────────────
  function showDemoModal(title, content, actionLabel, onAction) {
    const existing = document.getElementById("ardify-demo-modal");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "ardify-demo-modal";
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99998;
      display:flex;align-items:center;justify-content:center;padding:20px;
    `;
    overlay.innerHTML = `
      <div style="background:#0d1320;border:1px solid #ff6000;border-radius:16px;
        padding:36px;max-width:480px;width:100%;font-family:'Space Grotesk',sans-serif;
        box-shadow:0 24px 64px rgba(255,96,0,0.15);animation:slideInRight 0.3s ease">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <h2 style="color:#ff6000;font-size:20px;margin:0">${title}</h2>
          <button id="demo-modal-close" style="background:none;border:none;color:#aaa;font-size:22px;cursor:pointer">✕</button>
        </div>
        <div style="color:#ccc;font-size:15px;line-height:1.7;margin-bottom:28px">${content}</div>
        ${actionLabel ? `<button id="demo-modal-action" style="background:#ff6000;color:#fff;border:none;
          padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;width:100%">
          ${actionLabel}</button>` : ""}
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById("demo-modal-close").onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    if (actionLabel && onAction) {
      document.getElementById("demo-modal-action").onclick = () => { onAction(); overlay.remove(); };
    }
  }

  // ─── Loading Button ──────────────────────────────────────
  function setLoading(btn, loading, label) {
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? "Please wait..." : label;
  }

  // ─── Course Enrollment ───────────────────────────────────
  async function handleEnrollment(courseId, btn, successCallback) {
    if (!AUTH.isLoggedIn()) {
      toast("Please log in to enroll in courses.", "warning");
      setTimeout(() => (window.location.href = "./login.html"), 1500);
      return;
    }
    const label = btn ? btn.textContent : "Enroll Now";
    setLoading(btn, true, label);
    try {
      const data = await API.post("/enrollments/enroll", { courseId });
      toast(data.message || "🎉 Enrolled successfully!", "success");
      if (btn) {
        btn.textContent = "✓ Enrolled";
        btn.style.background = "#12b76a";
        btn.disabled = true;
      }
      if (successCallback) successCallback(data.enrollment);
    } catch (err) {
      if (err.message.includes("already enrolled")) {
        toast("You are already enrolled in this course.", "info");
        if (btn) { btn.textContent = "✓ Enrolled"; btn.style.background = "#12b76a"; }
      } else {
        toast(err.message || "Enrollment failed. Please try again.", "error");
        setLoading(btn, false, label);
      }
    }
  }

  // Wire all enroll buttons on page
  function wireEnrollButtons() {
    document.querySelectorAll("[data-enroll-course-id], .enroll-btn, #enrollBtn").forEach((btn) => {
      const courseId =
        btn.dataset.enrollCourseId ||
        btn.dataset.courseId ||
        new URLSearchParams(window.location.search).get("id");
      if (!courseId) return;

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        handleEnrollment(courseId, btn);
      });
    });
  }

  // ─── Course Search ───────────────────────────────────────
  function wireCourseSearch() {
    const searchInputs = document.querySelectorAll(
      '#searchInput, input[name="search"], .search-input, #courseSearch'
    );
    if (!searchInputs.length) return;

    let debounceTimer;
    searchInputs.forEach((input) => {
      input.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => performSearch(input.value), 400);
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") performSearch(input.value);
      });
    });

    // Category filter buttons
    document.querySelectorAll("[data-category]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("[data-category]").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const query = searchInputs[0] ? searchInputs[0].value : "";
        performSearch(query, btn.dataset.category);
      });
    });
  }

  async function performSearch(query, category = "") {
    const grid = document.querySelector(".courses-grid, #coursesGrid, .courses_grid");
    if (!grid) return;

    try {
      const params = new URLSearchParams();
      if (query) params.set("search", query);
      if (category && category !== "all") params.set("category", category);

      const data = await API.get(`/courses?${params.toString()}`, { auth: false });
      const courses = data.courses || [];

      if (!courses.length) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#aaa">
          <div style="font-size:48px;margin-bottom:12px">🔍</div>
          <p style="font-size:18px">No courses found for "<strong style="color:#ff6000">${query}</strong>"</p>
          <p>Try a different keyword or browse all categories.</p>
        </div>`;
        return;
      }

      grid.innerHTML = courses.map((c) => `
        <div class="course-card" style="cursor:pointer" onclick="window.location.href='./course-detail.html?id=${c._id}'">
          <div class="course-card__thumb" style="background:#1a2235;height:180px;border-radius:8px 8px 0 0;overflow:hidden">
            <img src="${c.thumbnail || "Images/ch-1.png"}" alt="${c.title}"
              style="width:100%;height:100%;object-fit:cover"
              onerror="this.src='Images/ch-1.png'">
          </div>
          <div style="padding:16px">
            <span style="background:#ff600020;color:#ff6000;padding:3px 10px;border-radius:20px;font-size:12px">${c.category}</span>
            <h3 style="color:#fff;font-size:16px;margin:10px 0 6px;line-height:1.4">${c.title}</h3>
            <p style="color:#aaa;font-size:13px;margin:0 0 12px">${c.description?.substring(0, 80)}...</p>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="color:#ff6000;font-weight:700">$${c.price}</span>
              <span style="color:#aaa;font-size:12px">⭐ ${c.rating || 4.5} · ${c.enrollmentCount || 0} students</span>
            </div>
          </div>
        </div>
      `).join("");
    } catch (err) {
      console.error("Search error:", err);
    }
  }

  // ─── Contact Form ────────────────────────────────────────
  function wireContactForm() {
    const form = document.querySelector("#contactForm, form.contact-form, .contact_form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"], .submit-btn, .btn-submit');
      const label = btn?.textContent || "Send";
      setLoading(btn, true, label);

      const data = {
        name: (form.querySelector('[name="name"], #name')?.value || "").trim(),
        email: (form.querySelector('[name="email"], #email')?.value || "").trim(),
        subject: (form.querySelector('[name="subject"], #subject')?.value || "General Inquiry").trim(),
        message: (form.querySelector('[name="message"], textarea')?.value || "").trim(),
      };

      if (!data.name || !data.email || !data.message) {
        toast("Please fill in all required fields.", "warning");
        setLoading(btn, false, label);
        return;
      }

      try {
        const res = await fetch(`${window.ARDIFY_API_BASE || "http://localhost:5000/api"}/contact`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (result.success) {
          toast("✅ Message sent! We'll reply within 24 hours.", "success", 5000);
          form.reset();
        } else {
          throw new Error(result.message);
        }
      } catch (err) {
        toast(err.message || "Failed to send message. Please try again.", "error");
      } finally {
        setLoading(btn, false, label);
      }
    });
  }

  // ─── File Upload ─────────────────────────────────────────
  function wireFileUploads() {
    document.querySelectorAll('[data-upload="file"], input[type="file"].ardify-upload').forEach((input) => {
      input.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!AUTH.isLoggedIn()) {
          toast("Please log in to upload files.", "warning");
          return;
        }

        const maxSize = 20 * 1024 * 1024;
        if (file.size > maxSize) {
          toast("File is too large. Maximum size is 20MB.", "error");
          return;
        }

        const formData = new FormData();
        formData.append("file", file);

        const progressEl = document.getElementById(input.dataset.progressId || "uploadProgress");
        if (progressEl) progressEl.style.display = "block";

        try {
          const token = AUTH.getAccessToken();
          const res = await fetch(`${window.ARDIFY_API_BASE || "http://localhost:5000/api"}/upload/file`, {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
          });
          const result = await res.json();
          if (result.success) {
            toast(`✅ "${file.name}" uploaded successfully!`, "success");
            const event = new CustomEvent("ardify:fileUploaded", { detail: result.data });
            input.dispatchEvent(event);
            document.dispatchEvent(event);
          } else {
            throw new Error(result.message);
          }
        } catch (err) {
          toast(err.message || "Upload failed.", "error");
        } finally {
          if (progressEl) progressEl.style.display = "none";
        }
      });
    });
  }

  // ─── Certificate Generation ──────────────────────────────
  function wireCertificateButtons() {
    document.querySelectorAll("[data-certificate-enrollment]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const enrollmentId = btn.dataset.certificateEnrollment;
        if (!enrollmentId) return;

        const label = btn.textContent;
        setLoading(btn, true, label);
        try {
          const token = AUTH.getAccessToken();
          const url = `${window.ARDIFY_API_BASE || "http://localhost:5000/api"}/certificates/generate/${enrollmentId}`;
          const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message);
          }
          const blob = await res.blob();
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `Ardify-Certificate.pdf`;
          a.click();
          URL.revokeObjectURL(a.href);
          toast("🎓 Certificate downloaded!", "success");
        } catch (err) {
          toast(err.message || "Failed to generate certificate.", "error");
        } finally {
          setLoading(btn, false, label);
        }
      });
    });
  }

  // ─── Dashboard Stats ─────────────────────────────────────
  async function loadDashboardStats() {
    const statsSection = document.querySelector(".stats, .stats-grid, [data-stats]");
    if (!statsSection || !AUTH.isLoggedIn()) return;

    try {
      const data = await API.get("/enrollments/stats");
      const { totalEnrolled, completed, inProgress, averageProgress, certificatesEarned } = data;

      const map = {
        "[data-stat='enrolled']": totalEnrolled,
        "[data-stat='completed']": completed,
        "[data-stat='inprogress']": inProgress,
        "[data-stat='progress']": `${averageProgress}%`,
        "[data-stat='certificates']": certificatesEarned,
      };

      Object.entries(map).forEach(([sel, val]) => {
        document.querySelectorAll(sel).forEach((el) => (el.textContent = val));
      });

      // Animate number counters
      document.querySelectorAll(".stat-number, .stats_number, [data-counter]").forEach((el) => {
        const target = parseInt(el.textContent) || 0;
        if (!target) return;
        let current = 0;
        const step = Math.ceil(target / 40);
        const timer = setInterval(() => {
          current = Math.min(current + step, target);
          el.textContent = current;
          if (current >= target) clearInterval(timer);
        }, 30);
      });
    } catch (err) {
      console.log("Stats load skipped:", err.message);
    }
  }

  // ─── Demo Payment Popups ─────────────────────────────────
  function wireDemoPayments() {
    // Stripe buttons
    document.querySelectorAll('[data-demo="stripe"], .stripe-btn, #stripeBtn').forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const amount = btn.dataset.amount || "99";
        const course = btn.dataset.course || "this course";

        setLoading(btn, true, btn.textContent);
        try {
          const res = await API.post("/demo/payment/stripe", { amount, courseTitle: course });
          showDemoModal(
            "💳 Stripe Payment — Demo",
            `<div style="background:#0a1628;border-radius:8px;padding:16px;margin-bottom:16px">
              <div style="color:#aaa;margin-bottom:8px">Transaction ID</div>
              <div style="color:#ff6000;font-family:monospace">${res.transactionId}</div>
            </div>
            <div style="background:#12b76a20;border:1px solid #12b76a;border-radius:8px;padding:12px;color:#12b76a">
              ✅ Payment of <strong>$${amount}</strong> processed successfully for <em>${course}</em>
            </div>
            <p style="color:#888;margin-top:16px;font-size:13px">
              🔒 In production this uses real Stripe API with full PCI compliance.
            </p>`,
            "Close"
          );
        } catch (err) {
          toast("Demo payment error: " + err.message, "error");
        } finally {
          setLoading(btn, false, btn.textContent);
        }
      });
    });

    // PayPal buttons
    document.querySelectorAll('[data-demo="paypal"], .paypal-btn, #paypalBtn').forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const amount = btn.dataset.amount || "99";
        const course = btn.dataset.course || "this course";

        setLoading(btn, true, btn.textContent);
        try {
          const res = await API.post("/demo/payment/paypal", { amount, courseTitle: course });
          showDemoModal(
            "🅿️ PayPal Payment — Demo",
            `<div style="background:#0a1628;border-radius:8px;padding:16px;margin-bottom:16px">
              <div style="color:#aaa;margin-bottom:8px">Order ID</div>
              <div style="color:#0ea5e9;font-family:monospace">${res.orderId}</div>
            </div>
            <div style="background:#12b76a20;border:1px solid #12b76a;border-radius:8px;padding:12px;color:#12b76a">
              ✅ PayPal payment of <strong>$${amount}</strong> completed.
            </div>
            <p style="color:#888;margin-top:16px;font-size:13px">
              🔒 In production this connects to PayPal REST API in sandbox/live mode.
            </p>`,
            "Close"
          );
        } catch (err) {
          toast("Demo payment error: " + err.message, "error");
        } finally {
          setLoading(btn, false, btn.textContent);
        }
      });
    });
  }

  // ─── Demo AI Tutor ───────────────────────────────────────
  function wireDemoAI() {
    document.querySelectorAll('[data-demo="ai-tutor"], #aiTutorBtn, .ai-tutor-btn').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        showDemoModal(
          "🤖 AI Tutor — Demo",
          `<div style="background:#0a1628;border-radius:8px;padding:16px;margin-bottom:12px">
            <input id="ai-question-input" placeholder="Ask your AI tutor anything..."
              style="width:100%;background:none;border:none;color:#fff;font-size:14px;outline:none;font-family:inherit">
          </div>
          <div id="ai-response" style="min-height:60px;color:#aaa;font-size:14px;line-height:1.6"></div>`,
          "Ask Question",
          async () => {
            const q = document.getElementById("ai-question-input")?.value;
            const el = document.getElementById("ai-response");
            if (!q || !el) return;
            el.textContent = "Thinking...";
            try {
              const res = await API.post("/demo/ai-tutor", { question: q, courseContext: "your course" });
              el.textContent = res.response;
            } catch (e) {
              el.textContent = "AI Tutor is available in the full version.";
            }
          }
        );
      });
    });

    // Real-time chat demo
    document.querySelectorAll('[data-demo="chat"], .chat-demo-btn').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        showDemoModal(
          "💬 Live Chat — Demo",
          `<div style="background:#0a1628;border-radius:8px;padding:16px;margin-bottom:12px;max-height:200px;overflow-y:auto">
            <div style="margin-bottom:12px">
              <div style="color:#aaa;font-size:12px;margin-bottom:4px">Support Agent</div>
              <div style="background:#1a2235;padding:10px;border-radius:8px;color:#fff;font-size:14px">
                👋 Hi! Welcome to Ardify support. How can I help you today?
              </div>
            </div>
          </div>
          <p style="color:#888;font-size:13px">
            🔧 In production, this connects to real-time Socket.io messaging with online instructors and support staff.
          </p>`,
          "Got it"
        );
      });
    });
  }

  // ─── Advanced Analytics Demo ─────────────────────────────
  function wireDemoAnalytics() {
    document.querySelectorAll('[data-demo="analytics"], .analytics-demo-btn').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        showDemoModal(
          "📊 Advanced Analytics — Demo",
          `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
            <div style="background:#0a1628;padding:14px;border-radius:8px;text-align:center">
              <div style="font-size:28px;font-weight:700;color:#ff6000">94%</div>
              <div style="color:#aaa;font-size:12px">Completion Rate</div>
            </div>
            <div style="background:#0a1628;padding:14px;border-radius:8px;text-align:center">
              <div style="font-size:28px;font-weight:700;color:#12b76a">42m</div>
              <div style="color:#aaa;font-size:12px">Avg. Session</div>
            </div>
            <div style="background:#0a1628;padding:14px;border-radius:8px;text-align:center">
              <div style="font-size:28px;font-weight:700;color:#0ea5e9">7</div>
              <div style="color:#aaa;font-size:12px">Day Streak 🔥</div>
            </div>
            <div style="background:#0a1628;padding:14px;border-radius:8px;text-align:center">
              <div style="font-size:28px;font-weight:700;color:#a855f7">4.8★</div>
              <div style="color:#aaa;font-size:12px">Avg. Rating</div>
            </div>
          </div>
          <p style="color:#888;font-size:13px">
            📈 Full analytics with charts powered by Chart.js available in production.
          </p>`,
          "Close"
        );
      });
    });
  }

  // ─── My Courses Page ─────────────────────────────────────
  async function loadMyCourses() {
    const container = document.querySelector("#myCoursesList, .my-courses-container, [data-my-courses]");
    if (!container || !AUTH.isLoggedIn()) return;

    try {
      container.innerHTML = `<div style="text-align:center;padding:40px;color:#aaa">Loading your courses...</div>`;
      const data = await API.get("/enrollments/my-courses");
      const enrollments = data.enrollments || [];

      if (!enrollments.length) {
        container.innerHTML = `
          <div style="text-align:center;padding:60px 20px;color:#aaa">
            <div style="font-size:48px;margin-bottom:12px">📚</div>
            <p style="font-size:18px;color:#fff">You haven't enrolled in any courses yet.</p>
            <a href="./courses.html" style="color:#ff6000;font-weight:600">Browse Courses →</a>
          </div>`;
        return;
      }

      container.innerHTML = enrollments.map((e) => {
        const c = e.course || {};
        const progress = e.progress?.progressPercentage || 0;
        return `
          <div class="course-card enrolled-card" style="background:#0d1320;border:1px solid #1e2d45;border-radius:12px;overflow:hidden;margin-bottom:16px">
            <div style="display:flex;gap:16px;padding:16px">
              <img src="${c.thumbnail || "Images/ch-1.png"}" alt="${c.title}"
                style="width:100px;height:70px;object-fit:cover;border-radius:8px;flex-shrink:0"
                onerror="this.src='Images/ch-1.png'">
              <div style="flex:1;min-width:0">
                <h3 style="color:#fff;font-size:15px;margin:0 0 6px;line-height:1.4">${c.title || "Course"}</h3>
                <span style="background:#ff600020;color:#ff6000;padding:2px 8px;border-radius:12px;font-size:11px">${c.category || "General"}</span>
                <div style="margin-top:10px">
                  <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span style="color:#aaa;font-size:12px">Progress</span>
                    <span style="color:#ff6000;font-size:12px;font-weight:600">${progress}%</span>
                  </div>
                  <div style="background:#1a2235;border-radius:20px;height:6px">
                    <div style="background:#ff6000;width:${progress}%;height:6px;border-radius:20px;transition:width 0.5s"></div>
                  </div>
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
                <a href="./course-detail.html?id=${c._id}" style="background:#ff6000;color:#fff;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600">
                  ${progress > 0 ? "Continue" : "Start"}
                </a>
                <button data-certificate-enrollment="${e._id}"
                  style="background:${progress >= 80 ? "#12b76a" : "#1a2235"};color:#fff;padding:6px 14px;border-radius:6px;border:none;font-size:13px;cursor:pointer;font-family:inherit">
                  🎓 Certificate
                </button>
              </div>
            </div>
          </div>`;
      }).join("");

      // Wire certificate buttons for newly rendered cards
      wireCertificateButtons();
    } catch (err) {
      container.innerHTML = `<div style="text-align:center;padding:40px;color:#f04438">${err.message}</div>`;
    }
  }

  // ─── Dead Buttons → Demo Popups ──────────────────────────
  function wireDeadButtons() {
    const demoMap = [
      { selector: '[href="#"], button:not([type]):not([data-skip])', label: null },
    ];

    // Social share buttons
    document.querySelectorAll(".social-share, [data-share]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent("Check out Ardify — Somalia's #1 e-learning platform!");
        showDemoModal("📤 Share Ardify", `
          <p>Share with your network:</p>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <a href="https://wa.me/?text=${text}%20${url}" target="_blank"
              style="background:#25D366;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">
              WhatsApp
            </a>
            <a href="https://t.me/share/url?url=${url}&text=${text}" target="_blank"
              style="background:#2CA5E0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">
              Telegram
            </a>
          </div>`, null);
      });
    });
  }

  // ─── Init ────────────────────────────────────────────────
  function init() {
    wireEnrollButtons();
    wireCourseSearch();
    wireContactForm();
    wireFileUploads();
    wireCertificateButtons();
    loadDashboardStats();
    wireDemoPayments();
    wireDemoAI();
    wireDemoAnalytics();
    loadMyCourses();
    wireDeadButtons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose for manual use
  window.ArdifyCore = {
    toast,
    showDemoModal,
    handleEnrollment,
    loadDashboardStats,
    loadMyCourses,
    performSearch,
  };
})();

// ─── Checkout Page ────────────────────────────────────────
(function wireCheckout() {
  document.addEventListener("DOMContentLoaded", function () {
    const payBtn = document.getElementById("payBtn");
    if (!payBtn) return;

    payBtn.addEventListener("click", async function (e) {
      e.preventDefault();

      if (!window.ArdifyAuth || !window.ArdifyAuth.isLoggedIn()) {
        window.ArdifyCore.toast("Please log in to complete your purchase.", "warning");
        setTimeout(() => (window.location.href = "./login.html"), 1500);
        return;
      }

      const selectedPayment = document.querySelector('input[name="payment"]:checked');
      const paymentMethod = selectedPayment ? selectedPayment.value : "evc";
      const priceEl = document.getElementById("payBtnText");
      const amountText = priceEl ? priceEl.textContent.replace(/[^0-9.]/g, "") : "99";

      // Get course info from URL or page
      const params = new URLSearchParams(window.location.search);
      const courseId = params.get("id") || params.get("courseId");
      const courseTitle = document.querySelector(".course_title, .order_title, h2")?.textContent || "Course";

      const originalText = payBtn.innerHTML;
      payBtn.disabled = true;
      payBtn.innerHTML = '<span>Processing...</span>';

      // Simulate mobile money payment processing
      setTimeout(async () => {
        payBtn.innerHTML = originalText;
        payBtn.disabled = false;

        // If courseId exists, try real enrollment
        if (courseId && window.ArdifyApi) {
          try {
            const data = await window.ArdifyApi.post("/enrollments/enroll", { courseId });
            window.ArdifyCore.showDemoModal(
              "✅ Payment Successful!",
              `<div style="text-align:center;padding:20px 0">
                <div style="font-size:60px;margin-bottom:16px">🎉</div>
                <p style="font-size:18px;color:#fff;font-weight:600">You're enrolled!</p>
                <p style="color:#aaa;margin:8px 0">Payment via <strong style="color:#ff6000">${paymentMethod.toUpperCase()}</strong></p>
                <p style="color:#12b76a;font-weight:600">${data.message || "Enrollment successful!"}</p>
                <p style="color:#aaa;font-size:13px;margin-top:12px">Amount: $${amountText}</p>
              </div>`,
              "Go to My Courses",
              () => window.location.href = "./student-dashboard.html"
            );
          } catch (err) {
            // Already enrolled or other error
            window.ArdifyCore.showDemoModal(
              "ℹ️ Payment Info",
              `<p style="color:#aaa">${err.message || "See your dashboard for enrollment status."}</p>`,
              "Go to Dashboard",
              () => window.location.href = "./student-dashboard.html"
            );
          }
        } else {
          // Demo payment modal
          window.ArdifyCore.showDemoModal(
            "✅ Payment Successful!",
            `<div style="text-align:center;padding:20px 0">
              <div style="font-size:60px;margin-bottom:16px">🎉</div>
              <p style="font-size:18px;color:#fff;font-weight:600">Payment Confirmed!</p>
              <p style="color:#aaa">via <strong style="color:#ff6000">${paymentMethod.toUpperCase()}</strong></p>
              <p style="color:#aaa;font-size:13px;margin-top:12px">Amount: $${amountText} · Ref: ARD-${Date.now().toString(36).toUpperCase()}</p>
              <p style="color:#12b76a;margin-top:16px;font-weight:600">Course access granted ✓</p>
            </div>`,
            "Go to Dashboard",
            () => window.location.href = "./student-dashboard.html"
          );
        }
      }, 1800);
    });
  });
})();
