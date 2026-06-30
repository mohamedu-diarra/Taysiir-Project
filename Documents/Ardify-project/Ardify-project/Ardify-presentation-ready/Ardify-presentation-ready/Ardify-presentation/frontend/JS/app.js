/**
 * app.js — Ardify Central Application State & Shared Logic
 * Must be loaded AFTER storage.js on every page.
 */

(function () {

  // ── COURSE CATALOG (single source of truth) ──────────────
  const COURSES = [
    {
      id: 'fullstack',
      title: 'Full-Stack Web Development Bootcamp',
      category: 'Web Development',
      level: 'Advanced',
      duration: '6 months',
      rating: 4.9,
      students: 1240,
      image: './Images/ChatGPT Image Jun 2, 2026, 05_13_15 PM.png',
      detailPage: './course-detail.html',
      checkoutPage: './checkout.html',
      price6m: 24,
      price1y: 36,
      totalLessons: 42,
      instructor: 'Ahmed Hassan',
      description: 'Master modern full-stack development with React, Node.js, and databases.',
      tags: ['React', 'Node.js', 'MongoDB', 'Express'],
    },
    {
      id: 'cybersecurity',
      title: 'Ethical Hacking & Cybersecurity',
      category: 'Cybersecurity',
      level: 'Intermediate',
      duration: '4 months',
      rating: 4.8,
      students: 890,
      image: './Images/Networking.png',
      detailPage: './course-detail-cyber.html',
      checkoutPage: './checkout-cyber.html',
      price6m: 33,
      price1y: 44,
      totalLessons: 35,
      instructor: 'Fatima Ali',
      description: 'Learn ethical hacking, penetration testing, and cybersecurity fundamentals.',
      tags: ['Hacking', 'Networking', 'Security', 'Kali Linux'],
    },
    {
      id: 'uiux',
      title: 'UI/UX Design Masterclass',
      category: 'Design',
      level: 'Beginner',
      duration: '3 months',
      rating: 4.7,
      students: 2100,
      image: './Images/uiux.png',
      detailPage: './course-detail-uiux.html',
      checkoutPage: './checkout-uiux.html',
      price6m: 15,
      price1y: 20,
      totalLessons: 28,
      instructor: 'Sara Omar',
      description: 'Design beautiful, user-centered interfaces with Figma and modern UX principles.',
      tags: ['Figma', 'UX Research', 'Prototyping', 'Design Systems'],
    },
    {
      id: 'digitalmarketing',
      title: 'Digital Marketing',
      category: 'Marketing',
      level: 'Beginner',
      duration: '2 months',
      rating: 4.6,
      students: 3200,
      image: './Images/digital.png',
      detailPage: './course-detail.html',
      checkoutPage: './checkout.html',
      price6m: 18,
      price1y: 28,
      totalLessons: 24,
      instructor: 'Muse Abdi',
      description: 'Master SEO, social media marketing, and growth strategies.',
      tags: ['SEO', 'Social Media', 'Analytics', 'Content'],
    },
    {
      id: 'excel',
      title: 'Microsoft Excel Mastery',
      category: 'Productivity',
      level: 'Beginner',
      duration: '1 month',
      rating: 4.8,
      students: 5400,
      image: './Images/excel.png',
      detailPage: './course-detail.html',
      checkoutPage: './checkout.html',
      price6m: 12,
      price1y: 18,
      totalLessons: 18,
      instructor: 'Hibo Mohamed',
      description: 'From basics to advanced Excel — pivot tables, macros, and data analysis.',
      tags: ['Excel', 'Data', 'Macros', 'Pivot Tables'],
    },
  ];

  // ── APP STATE ─────────────────────────────────────────────
  const AppState = {
    currentCourse: null,

    init() {
      this._highlightActiveNavLink();
    },

    // Delegates to the real authenticated session (see api.js / auth.js).
    // Kept for backward compatibility with pages still calling ArdifyApp.*.
    getSession()    { return window.ArdifyAuth ? window.ArdifyAuth.getUser() : null; },
    isLoggedIn()    { return !!(window.ArdifyAuth && window.ArdifyAuth.isLoggedIn()); },
    getUser()       { return this.getSession(); },

    getCourses()    { return COURSES; },

    getCourseById(id) {
      return COURSES.find(c => c.id === id) || null;
    },

    setCart(course) {
      window.ArdifyStorage.setCart(course);
      this.currentCourse = course;
    },

    getCart() {
      return window.ArdifyStorage.getCart();
    },

    // ── ACTIVE NAV LINK ───────────────────────────────────
    _highlightActiveNavLink() {
      document.addEventListener('DOMContentLoaded', () => {
        const path = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('section.navsec nav ul.links li a').forEach(a => {
          const href = a.getAttribute('href') || '';
          if (href && (href.includes(path) || (path === 'index.html' && href.includes('index.html')))) {
            a.classList.add('active');
            a.style.color = 'var(--Orange)';
          }
        });
      });
    },
  };

  // ── SHARED UTILITIES ──────────────────────────────────────
  function _initials(name) {
    const parts = (name || '').trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : (name || 'U').slice(0, 2).toUpperCase();
  }

  // Expose globally
  window.ArdifyApp     = AppState;
  window.ArdifyInitials = _initials;

  // Auto-init
  AppState.init();

})();
