/**
 * storage.js — Ardify LocalStorage abstraction layer
 * All LocalStorage access in the app goes through this module.
 */

const KEYS = {
  SESSION:     'ardify_session_v1',
  USERS:       'ardify_users_v1',
  ENROLLMENTS: 'ardify_enrollments_v1',
  PROGRESS:    'ardify_progress_v1',
  CART:        'ardify_cart_v1',
  NOTIFICATIONS: 'ardify_notifications_v1',
};

function _get(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function _set(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch { return false; }
}
function _del(key) {
  try { localStorage.removeItem(key); return true; } catch { return false; }
}

// ── SESSION ──────────────────────────────────────────────────
const Storage = {

  getSession()   { return _get(KEYS.SESSION); },
  setSession(s)  { return _set(KEYS.SESSION, s); },
  clearSession() { return _del(KEYS.SESSION); },

  // ── USERS ─────────────────────────────────────────────────
  getUsers()     { return _get(KEYS.USERS) || []; },
  setUsers(u)    { return _set(KEYS.USERS, u); },

  getUserByEmail(email) {
    return this.getUsers().find(u => u.email === email.toLowerCase()) || null;
  },

  addUser(user) {
    const users = this.getUsers();
    users.push(user);
    return this.setUsers(users);
  },

  // ── ENROLLMENTS ───────────────────────────────────────────
  getEnrollments(email) {
    const all = _get(KEYS.ENROLLMENTS) || {};
    return all[email] || [];
  },

  addEnrollment(email, course) {
    const all = _get(KEYS.ENROLLMENTS) || {};
    if (!all[email]) all[email] = [];
    const exists = all[email].some(c => c.id === course.id);
    if (!exists) {
      all[email].push({
        ...course,
        enrolledAt: Date.now(),
        progress: 0,
        completedLessons: [],
      });
    }
    return _set(KEYS.ENROLLMENTS, all);
  },

  updateProgress(email, courseId, lessonId) {
    const all = _get(KEYS.ENROLLMENTS) || {};
    if (!all[email]) return false;
    const course = all[email].find(c => c.id === courseId);
    if (!course) return false;
    if (!course.completedLessons.includes(lessonId)) {
      course.completedLessons.push(lessonId);
    }
    const totalLessons = course.totalLessons || 1;
    course.progress = Math.round((course.completedLessons.length / totalLessons) * 100);
    return _set(KEYS.ENROLLMENTS, all);
  },

  // ── CART (selected course before checkout) ───────────────
  getCart()      { return _get(KEYS.CART); },
  setCart(c)     { return _set(KEYS.CART, c); },
  clearCart()    { return _del(KEYS.CART); },

  // ── NOTIFICATIONS ─────────────────────────────────────────
  getNotifications(email) {
    const all = _get(KEYS.NOTIFICATIONS) || {};
    return all[email] || _defaultNotifications();
  },

  addNotification(email, notif) {
    const all = _get(KEYS.NOTIFICATIONS) || {};
    if (!all[email]) all[email] = _defaultNotifications();
    all[email].unshift({ ...notif, id: Date.now(), read: false, time: 'Just now' });
    return _set(KEYS.NOTIFICATIONS, all);
  },

  markNotifRead(email, id) {
    const all = _get(KEYS.NOTIFICATIONS) || {};
    if (!all[email]) return false;
    const n = all[email].find(n => n.id === id);
    if (n) n.read = true;
    return _set(KEYS.NOTIFICATIONS, all);
  },

};

function _defaultNotifications() {
  return [
    { id: 1, icon: '🎉', text: 'Welcome to Ardify! Start exploring courses.', time: '1m ago', read: false },
    { id: 2, icon: '📚', text: 'New courses are available in the catalog.', time: '1h ago', read: false },
  ];
}

// Expose globally
window.ArdifyStorage = Storage;
window.ARDIFY_KEYS   = KEYS;
