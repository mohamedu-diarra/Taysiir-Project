/* Ardify Dashboard Connector
 * Shared chrome logic for student dashboard sub-pages
 * (student-courses.html, student-messages.html, etc).
 * Requires api.js (and ideally auth.js) to be loaded first.
 */
(function(){
  function getUser(){
    if (window.ArdifyAuth && window.ArdifyAuth.getUser) {
      return window.ArdifyAuth.getUser();
    }
    return null;
  }

  function getUserFirstName(user){
    if (!user) return 'User';
    var fullName = user.fullName || (user.firstName ? (user.firstName + ' ' + user.lastName) : 'User');
    return fullName.trim().split(/\s+/)[0] || 'User';
  }

  function initialsFromName(name){
    var parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0,2);
    return (name || 'U').slice(0,2).toUpperCase();
  }

  function fillUser(){
    var user = getUser();
    if (!user) return;

    var firstName = getUserFirstName(user);
    var fullName = user.fullName || (user.firstName ? (user.firstName + ' ' + user.lastName) : 'User');
    var initials = initialsFromName(fullName);

    document.querySelectorAll('.user_name, .username, .profile-name, .user-name, [data-user-name]').forEach(function(el){
      el.textContent = firstName;
    });

    document.querySelectorAll('.user_avatar, .profile-avatar, .avatar-initials').forEach(function(el){
      el.textContent = initials;
    });

    document.querySelectorAll('h1, h2, h3, h4, p, span, .topbar_greeting h2').forEach(function(el){
      if (/\bwelcome\b/i.test(el.textContent)) {
        el.textContent = 'Welcome, ' + firstName;
      } else if (/\bgood\s+(morning|afternoon|evening)\b/i.test(el.textContent)) {
        el.textContent = el.textContent.replace(/good\s+(morning|afternoon|evening)(?:\s*,\s*[\w\s]+|\s+[\w\s]+)?/i, 'Good $1, ' + firstName + ' 👋');
      }
    });

    document.querySelectorAll('[data-greeting]').forEach(function(el){
      el.textContent = 'Welcome, ' + firstName;
    });
  }

  function logout(){
    var logoutBtns = document.querySelectorAll('.logout_btn, #logout, .logout');
    logoutBtns.forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.preventDefault();
        if (window.ArdifyAuthFlow && window.ArdifyAuthFlow.logout) {
          window.ArdifyAuthFlow.logout();
        } else {
          if (window.ArdifyAuth) window.ArdifyAuth.clearSession();
          window.location.href = './login.html';
        }
      });
    });
  }

  function navigation(){
    var path = (window.location.pathname || '').replace(/\\/g,'/');

    document.querySelectorAll('a[href]').forEach(function(a){
      var href = a.getAttribute('href') || '';
      if (!href || href === '#') return;

      var resolved;
      try {
        resolved = new URL(href, window.location.href).pathname.replace(/\\/g,'/');
      } catch(e){
        resolved = href;
      }

      if (resolved === path) {
        a.classList.add('active');
      }
    });

    var sidebar = document.querySelector('.sidebar');
    var sidebarAnchors = sidebar ? sidebar.querySelectorAll('a[href]') : [];

    sidebarAnchors.forEach(function(a){
      a.addEventListener('click', function(e){
        var href = (this.getAttribute('href') || '').trim();
        if (!href || href === '#') {
          e.preventDefault();
        }
        sidebarAnchors.forEach(function(x){ x.classList.remove('active'); });
        this.classList.add('active');
      });
    });
  }

  function authGuard(){
    if (window.ArdifyAuthFlow && window.ArdifyAuthFlow.requireRole) {
      return window.ArdifyAuthFlow.requireRole(['student']);
    }
    // Fallback if auth.js failed to load for some reason
    if (!window.ArdifyAuth || !window.ArdifyAuth.isLoggedIn()) {
      window.location.href = './login.html';
      return false;
    }
    return true;
  }

  function init() {
    if (!authGuard()) return;
    fillUser();
    logout();
    navigation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  setTimeout(fillUser, 50);
  setTimeout(fillUser, 300);
})();
