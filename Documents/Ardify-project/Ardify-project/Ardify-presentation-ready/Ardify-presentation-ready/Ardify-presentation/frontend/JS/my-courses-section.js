/**
 * my-courses-section.js — Ardify My Courses Section
 * Fetches from API with localStorage fallback
 */

(function() {
  'use strict';

  // ─── INIT ─────────────────────────────────────────────
  async function initMyCoursesSection() {
    const section = document.getElementById('myCoursesSection') || document.getElementById('coursesGrid');
    if (!section) return;

    try {
      section.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:20px; color:var(--Silver);">
          ⏳ Loading your courses...
        </div>
      `;

      // ✅ FETCH FROM BACKEND
      const courses = await window.ArdifyApi.get('/courses/instructor');

      console.log('📚 My Courses:', courses);

      if (!courses || courses.length === 0) {
        section.innerHTML = `
          <div style="grid-column:1/-1; text-align:center; padding:40px;">
            <div style="font-size:48px; margin-bottom:16px;">📚</div>
            <h3 style="color: var(--White);">No Courses Yet</h3>
            <p style="color: var(--Silver); margin-bottom:20px;">Start creating your first course!</p>
            <a href="./create-course.html" style="background:var(--Orange); color:white; padding:12px 24px; border-radius:10px; text-decoration:none; font-weight:600;">
              Create Course
            </a>
          </div>
        `;
        return;
      }

      renderMyCourses(section, courses);

    } catch (error) {
      console.error('❌ Error loading my courses:', error);
      
      // Fallback to localStorage
      const localCourses = getLocalCourses();
      if (localCourses.length > 0) {
        renderMyCourses(section, localCourses);
        return;
      }

      section.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--Silver);">
          <div style="font-size:32px; margin-bottom:16px;">⚠️</div>
          <p>${error.message || 'Could not load your courses'}</p>
          <button onclick="initMyCoursesSection()" style="background:var(--Orange); color:white; padding:10px 20px; border:none; border-radius:8px; cursor:pointer; margin-top:10px;">
            Retry
          </button>
        </div>
      `;
    }
  }

  // ─── RENDER ────────────────────────────────────────────
  function renderMyCourses(container, courses) {
    container.innerHTML = `
      <div class="courses-header" style="grid-column:1/-1; display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h2 style="color:var(--White); font-size:20px;">My Courses (${courses.length})</h2>
        <a href="./create-course.html" style="background:var(--Orange); color:white; padding:8px 16px; border-radius:8px; text-decoration:none; font-size:14px; font-weight:600;">
          <ion-icon name="add-circle-outline"></ion-icon> New Course
        </a>
      </div>
      ${courses.map(course => `
        <div class="course-card" data-id="${course._id || course.id}">
          <div class="course-card-header" style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="color:var(--White);">${course.title}</h3>
            <span style="background:${course.isPublished ? 'var(--LightGreen)' : 'var(--Silver)'}; color:${course.isPublished ? 'var(--Black)' : 'var(--White)'}; padding:2px 12px; border-radius:20px; font-size:11px; font-weight:600;">
              ${course.isPublished ? 'Published' : 'Draft'}
            </span>
          </div>
          <div class="course-card-body">
            <p style="color:var(--Silver); font-size:14px;">${course.description || course.summary || 'No description'}</p>
            <div style="display:flex; gap:8px; margin:8px 0;">
              <span style="background:rgba(255,255,255,0.04); padding:4px 12px; border-radius:20px; font-size:12px; color:var(--Silver);">${course.category || 'General'}</span>
              <span style="background:rgba(255,255,255,0.04); padding:4px 12px; border-radius:20px; font-size:12px; color:var(--Silver);">${course.level || 'Beginner'}</span>
            </div>
            <div style="display:flex; gap:16px; color:var(--Silver); font-size:13px;">
              <span>👨‍🎓 ${course.enrollmentCount || 0} students</span>
              <span>⭐ ${course.rating || 0}/5</span>
              <span>💲 $${course.price || 0}</span>
            </div>
          </div>
          <div class="course-card-footer" style="display:flex; gap:8px; margin-top:12px; padding-top:12px; border-top:1px solid var(--border);">
            <a href="./course-detail.html?id=${course._id || course.id}" style="color:var(--Orange); text-decoration:none; font-size:13px;">View</a>
            <a href="./edit-course.html?id=${course._id || course.id}" style="color:var(--Silver); text-decoration:none; font-size:13px;">Edit</a>
            <button onclick="deleteCourse('${course._id || course.id}')" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:13px; font-family:inherit;">Delete</button>
          </div>
        </div>
      `).join('')}
    `;
  }

  // ─── DELETE COURSE ─────────────────────────────────────
  window.deleteCourse = async function(courseId) {
    if (!confirm('Delete this course? This cannot be undone.')) return;

    try {
      await window.ArdifyApi.delete(`/courses/${courseId}`);
      showToast('Course deleted successfully', 'success');
      initMyCoursesSection();
    } catch (error) {
      showToast(error.message || 'Failed to delete course', 'error');
    }
  };

  // ─── LOCALSTORAGE FALLBACK ──────────────────────────
  function getLocalCourses() {
    try {
      const KEY = 'ardify_enrolled_courses_v1';
      const all = JSON.parse(localStorage.getItem(KEY) || '{}');
      const user = window.ArdifyAuth?.getUser();
      const userId = user?.userId || user?.id || user?.email || 'anon';
      return all[userId] || [];
    } catch (e) {
      return [];
    }
  }

  // ─── TOAST ────────────────────────────────────────────
  function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ─── EXPOSE ────────────────────────────────────────────
  window.initMyCoursesSection = initMyCoursesSection;

  // ─── INIT ──────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('myCoursesSection') || document.getElementById('coursesGrid')) {
      initMyCoursesSection();
    }
  });

})();