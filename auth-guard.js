// ============================================================
// ETLab Route Protection & Session Auth Guard
// ============================================================

(function() {
  function checkAuth() {
    try {
      const isSessionAuth = sessionStorage.getItem('etlab_auth_logged_in') === 'true';
      const isLocalAuth = localStorage.getItem('etlab_auth_logged_in') === 'true';
      return isSessionAuth || isLocalAuth;
    } catch (e) {
      return false;
    }
  }

  // Determine current page
  const currentPath = window.location.pathname.toLowerCase();
  const isLoginPage = currentPath.endsWith('login.html') || currentPath.endsWith('index.html') || currentPath.endsWith('/') || currentPath === '';

  if (!checkAuth()) {
    if (!isLoginPage) {
      // User is not authenticated and trying to access a protected page
      try {
        sessionStorage.setItem('etlab_redirect_url', window.location.href);
      } catch (e) {}
      // Immediately redirect to login page before rendering protected content
      window.location.replace('login.html');
    }
  }
})();

// Global logout helper accessible across all pages
window.etlabLogout = function(event) {
  if (event) {
    if (typeof event.preventDefault === 'function') event.preventDefault();
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
  }
  try {
    sessionStorage.removeItem('etlab_auth_logged_in');
    sessionStorage.removeItem('etlab_auth_user');
    sessionStorage.removeItem('etlab_auth_time');
    localStorage.removeItem('etlab_auth_logged_in');
    localStorage.removeItem('etlab_auth_user');
  } catch (e) {
    console.error('Error during logout:', e);
  }
  window.location.replace('login.html');
};

// Alias for convenience
window.logout = window.etlabLogout;
