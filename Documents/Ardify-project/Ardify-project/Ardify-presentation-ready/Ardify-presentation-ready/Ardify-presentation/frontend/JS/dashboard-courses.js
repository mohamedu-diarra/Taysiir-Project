/**
 * dashboard-courses.js — Ardify Dashboard Courses
 * Fetches courses from backend API and displays them
 */

(function() {
  'use strict';

  // ─── LOAD MY COURSES ──────────────────────────────────
  async function loadMyCourses() {
    const container = document.getElementById('myCoursesContainer') || document.getElementById('coursesGrid');
    if (!container) {
      console.warn('⚠️ Courses container not found');
      return;
    }

    try {
      container.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:40px;">
          <div style="font-size:24px; margin-bottom:12px;">⏳</div>
          <p style="color: var(--Silver);">Loading your courses...</p>
        </div>
      `;

      // ✅ FETCH FROM BACKEND API
      const courses = await window.ArdifyApi.get('/courses/instructor');

      console.log('📚 Courses loaded:', courses);

      if (!courses || courses.length === 0) {
        container.innerHTML = `
          <div style="grid-column:1/-1; text-align:center; padding:40px;">
            <div style="font-size:48px; margin-bottom:16px;">📚</div>
            <h3 style="color: var(--White); margin-bottom:8px;">No Courses Yet</h3>
            <p style="color: var(--Silver); margin-bottom:20px;">You haven't created any courses. Start teaching today!</p>
            <a href="./create-course.html" style="background:var(--Orange); color:white; padding:12px 24px; border-radius:10px; text-decoration:none; font-weight:600; display:inline-block;">
              Create Your First Course
            </a>
          </div>
        `;
        return;
      }

      renderCourses(container, courses);

    } catch (error) {
      console.error('❌ Error loading courses:', error);
      
      // Fallback to localStorage
      try {
        const localCourses = getLocalCourses();
        if (localCourses.length > 0) {
          console.log('📚 Using localStorage fallback');
          renderCourses(container, localCourses);
          return;
        }
      } catch (e) {}

      container.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:40px;">
          <div style="font-size:32px; margin-bottom:16px;">⚠️</div>
          <p style="color: var(--Silver); margin-bottom:8px;">${error.message || 'Failed to load courses'}</p>
          <button onclick="loadMyCourses()" style="background:var(--Orange); color:white; padding:10px 20px; border:none; border-radius:8px; cursor:pointer; margin-top:10px;">
            Retry
          </button>
        </div>
      `;
    }
  }

  // ─── RENDER COURSES ──────────────────────────────────
  function renderCourses(container, courses) {
    container.innerHTML = courses.map(course => `
      <div class="course_card" data-course-id="${course._id || course.id}" onclick="openCourse('${course._id || course.id}')">
        <div class="course_thumb" style="background:linear-gradient(135deg,#1a2234,#0d1320);">
          <span style="font-size:42px;">${getEmoji(course.category)}</span>
          <div class="course_progress_bar">
            <div class="fill" style="width:${course.progress || 0}%; background: var(--Orange);"></div>
          </div>
          <span style="position:absolute; top:8px; right:8px; background:${course.isPublished ? 'var(--LightGreen)' : 'var(--Silver)'}; color:${course.isPublished ? 'var(--Black)' : 'var(--White)'}; font-size:10px; font-weight:700; padding:3px 10px; border-radius:20px;">
            ${course.isPublished ? 'Live' : 'Draft'}
          </span>
        </div>
        <div class="course_body">
          <div class="course_category_tag">${course.category || 'General'}</div>
          <div class="course_title">${course.title}</div>
          <div class="course_foot">
            <span class="course_prog_text">
              <span>👨‍🎓 ${course.enrollmentCount || 0} students</span>
              <span>⭐ ${course.rating || 0}/5</span>
            </span>
            <button class="continue_btn">
              ${course.isPublished ? 'View' : 'Edit'}
              <ion-icon name="arrow-forward-outline"></ion-icon>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  // ─── OPEN COURSE ──────────────────────────────────────
  window.openCourse = function(courseId) {
    if (courseId) {
      window.location.href = `./course-detail.html?id=${courseId}`;
    }
  };

  // ─── GET EMOJI ────────────────────────────────────────
  function getEmoji(category) {
    const map = {
      'Web Development': '💻',
      'UI/UX Design': '🎨',
      'Cyber Security': '🛡️',
      'Data Science': '📊',
      'AI & Machine Learning': '🤖',
      'Networking': '🌐',
      'Mobile Development': '📱',
      'Cloud Computing': '☁️',
      'Digital Marketing': '📣'
    };
    return map[category] || '📘';
  }

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

  // ─── EXPOSE GLOBALLY ─────────────────────────────────
  window.loadMyCourses = loadMyCourses;
  window.renderCourses = renderCourses;

  // ─── INIT ON DOM READY ──────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('myCoursesContainer') || document.getElementById('coursesGrid');
    if (container) {
      loadMyCourses();
    }
  });

})();