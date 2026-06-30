/**
 * dashboard-assignments.js — Ardify Dashboard Assignments
 * Fetches assignments from backend API
 */

(function() {
  'use strict';

  // ─── LOAD ASSIGNMENTS ─────────────────────────────────
  async function loadAssignments() {
    const container = document.getElementById('assignmentsContainer') || document.getElementById('assignmentsList');
    if (!container) {
      console.warn('⚠️ Assignments container not found');
      return;
    }

    try {
      container.innerHTML = `
        <div style="text-align:center; padding:20px; color:var(--Silver);">
          ⏳ Loading assignments...
        </div>
      `;

      // ✅ FETCH FROM BACKEND API
      const assignments = await window.ArdifyApi.get('/assignments/instructor');

      console.log('📝 Assignments loaded:', assignments);

      if (!assignments || assignments.length === 0) {
        container.innerHTML = `
          <div style="text-align:center; padding:40px;">
            <div style="font-size:48px; margin-bottom:16px;">📝</div>
            <h3 style="color: var(--White); margin-bottom:8px;">No Assignments</h3>
            <p style="color: var(--Silver); margin-bottom:20px;">Create your first assignment to get started.</p>
            <a href="./create-assignment.html" style="background:var(--Orange); color:white; padding:12px 24px; border-radius:10px; text-decoration:none; font-weight:600;">
              Create Assignment
            </a>
          </div>
        `;
        return;
      }

      renderAssignments(container, assignments);

    } catch (error) {
      console.error('❌ Error loading assignments:', error);
      
      // Fallback to localStorage
      try {
        const localAssignments = getLocalAssignments();
        if (localAssignments.length > 0) {
          console.log('📝 Using localStorage fallback');
          renderAssignments(container, localAssignments);
          return;
        }
      } catch (e) {}

      container.innerHTML = `
        <div style="text-align:center; padding:40px; color:var(--Silver);">
          <div style="font-size:32px; margin-bottom:16px;">⚠️</div>
          <p>${error.message || 'Failed to load assignments'}</p>
          <button onclick="loadAssignments()" style="background:var(--Orange); color:white; padding:10px 20px; border:none; border-radius:8px; cursor:pointer; margin-top:10px;">
            Retry
          </button>
        </div>
      `;
    }
  }

  // ─── RENDER ASSIGNMENTS ──────────────────────────────
  function renderAssignments(container, assignments) {
    container.innerHTML = assignments.map(assignment => `
      <div class="assign_item" data-assignment-id="${assignment._id || assignment.id}">
        <div class="assign_icon ${getStatusColor(assignment.status)}">
          <ion-icon name="${getIcon(assignment.type)}"></ion-icon>
        </div>
        <div class="assign_info">
          <div class="assign_title">${assignment.title}</div>
          <div class="assign_sub">
            ${assignment.course?.title || assignment.courseCategory || 'No Course'}
            • ${assignment.status || 'Draft'}
          </div>
        </div>
        <span class="assign_badge ${getBadgeClass(assignment.status)}">
          ${assignment.status || 'Draft'}
        </span>
      </div>
    `).join('');
  }

  function getStatusColor(status) {
    const map = {
      'graded': 'blue',
      'submitted': 'green',
      'pending': 'yellow',
      'due': 'orange',
      'draft': 'gray'
    };
    return map[status] || 'orange';
  }

  function getBadgeClass(status) {
    const map = {
      'graded': 'graded',
      'submitted': 'submitted',
      'pending': 'due',
      'due': 'due',
      'draft': 'draft'
    };
    return map[status] || 'due';
  }

  function getIcon(type) {
    const map = {
      'quiz': 'help-circle-outline',
      'assignment': 'document-text-outline',
      'project': 'folder-outline',
      'exam': 'clipboard-outline'
    };
    return map[type] || 'document-text-outline';
  }

  // ─── LOCALSTORAGE FALLBACK ──────────────────────────
  function getLocalAssignments() {
    try {
      const KEY = 'ardify_assignments_v1';
      const all = JSON.parse(localStorage.getItem(KEY) || '{}');
      const user = window.ArdifyAuth?.getUser();
      const userId = user?.userId || user?.id || user?.email || 'anon';
      return all[userId] || [];
    } catch (e) {
      return [];
    }
  }

  // ─── EXPOSE GLOBALLY ─────────────────────────────────
  window.loadAssignments = loadAssignments;

  // ─── INIT ────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('assignmentsContainer') || document.getElementById('assignmentsList');
    if (container) {
      loadAssignments();
    }
  });

})();