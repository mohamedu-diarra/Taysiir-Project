/**
 * ui.js — Ardify Shared UI Utilities
 * Replaces: course-detail.js, course-detail-cyber.js, course-detail-uiux.js, main.js (FAQ)
 * Depends on: storage.js, app.js
 */

// ── CURRICULUM ACCORDION ──────────────────────────────────────
window.toggleSection = function (btn) {
  const section = btn.closest('.curriculum_section');
  if (!section) return;
  const lessons = section.querySelector('.section_lessons');
  const arrow   = btn.querySelector('.section_arrow');
  const isOpen  = section.classList.contains('open');

  if (isOpen) {
    lessons.style.display = 'none';
    section.classList.remove('open');
    arrow && arrow.setAttribute('name', 'chevron-down-outline');
  } else {
    lessons.style.display = 'block';
    section.classList.add('open');
    arrow && arrow.setAttribute('name', 'chevron-up-outline');
  }
};

document.addEventListener('DOMContentLoaded', () => {

  // ── EXPAND / COLLAPSE ALL ────────────────────────────────
  const expandAllBtn = document.getElementById('expandAll');
  if (expandAllBtn) {
    let allExpanded = false;
    expandAllBtn.addEventListener('click', () => {
      const sections = document.querySelectorAll('.curriculum_section');
      allExpanded = !allExpanded;
      sections.forEach(section => {
        const lessons = section.querySelector('.section_lessons');
        const arrow   = section.querySelector('.section_arrow');
        if (allExpanded) {
          lessons.style.display = 'block';
          section.classList.add('open');
          arrow && arrow.setAttribute('name', 'chevron-up-outline');
        } else {
          lessons.style.display = 'none';
          section.classList.remove('open');
          arrow && arrow.setAttribute('name', 'chevron-down-outline');
        }
      });
      expandAllBtn.textContent = allExpanded ? 'Collapse all' : 'Expand all';
    });

    // Open first section by default
    const first = document.querySelector('.curriculum_section.open');
    if (first) {
      const lessons = first.querySelector('.section_lessons');
      if (lessons) lessons.style.display = 'block';
    }
  }

  // ── FAQ ACCORDION ─────────────────────────────────────────
  const faqItems = document.querySelectorAll('.faq_item');
  faqItems.forEach(item => {
    const btn = item.querySelector('.faq_question');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach(i => {
        i.classList.remove('active');
        const q = i.querySelector('.faq_question');
        q && q.setAttribute('aria-expanded', 'false');
      });
      if (!isActive) {
        item.classList.add('active');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ── COURSE DETAIL — ENROLL BUTTON ─────────────────────────
  // Reads meta tag: <meta name="ardify-course-id" content="...">
  const metaEl   = document.querySelector('meta[name="ardify-course-id"]');
  const courseId = metaEl ? metaEl.getAttribute('content') : null;

  if (courseId) {
    const enrollBtns = document.querySelectorAll('[data-enroll-btn], .enroll_btn, .hero_enroll_btn');
    enrollBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const course = ArdifyApp.getCourseById(courseId);
        if (course) ArdifyStorage.setCart(course);
        window.location.href = course ? course.checkoutPage : './checkout.html';
      });
    });

    // Also wire any "Enroll Now" links that point to checkout
    document.querySelectorAll('a[href*="checkout"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const course = ArdifyApp.getCourseById(courseId);
        if (course) ArdifyStorage.setCart(course);
        // Let default href navigate
      });
    });
  }

  // ── COURSES PAGE — WIRE COURSE CARD BUTTONS ───────────────
  document.querySelectorAll('.course-card__btn, [data-course-id]').forEach(el => {
    const cid = el.getAttribute('data-course-id');
    if (!cid) return;
    el.addEventListener('click', (e) => {
      const course = ArdifyApp.getCourseById(cid);
      if (course) ArdifyStorage.setCart(course);
    });
  });

  // ── MOBILE NAV TOGGLE ─────────────────────────────────────
  const menuToggle = document.getElementById('menuToggle');
  const navLinks   = document.querySelector('.links');
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }

});
