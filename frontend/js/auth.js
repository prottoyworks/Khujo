/* ============================================================
   AUTH — Page guards, session helpers, sign-out
   Thin layer over API token + cached-user storage.
   ============================================================ */

const Auth = (() => {
  function isLoggedIn() {
    return !!API.getToken();
  }

  // Redirect to login.html if no session. Pages call:
  //   if (!Auth.guard()) throw new Error('redirect');
  // The thrown error halts the rest of the inline script after the
  // redirect call has been queued but before the page repaints.
  function guard() {
    if (isLoggedIn()) return true;
    window.location.replace('login.html');
    return false;
  }

  // Sync access to current user — pulled from the cache populated at
  // login. Returns null when logged out.
  function getSession() {
    return API.getCachedUser();
  }

  async function logout() {
    try {
      await API.logout();
    } catch {
      // already cleared locally — ignore network failure
    }
    window.location.replace('login.html');
  }

  return { isLoggedIn, guard, getSession, logout };
})();
