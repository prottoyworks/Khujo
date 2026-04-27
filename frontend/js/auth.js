const Auth = (() => {
  function isLoggedIn() {
    return !!API.getToken();
  }

  function guard() {
    if (isLoggedIn()) return true;
    window.location.replace('login.html');
    return false;
  }

  function getSession() {
    return API.getCachedUser();
  }

  async function logout() {
    try {
      await API.logout();
    } catch {
    }
    window.location.replace('login.html');
  }

  return { isLoggedIn, guard, getSession, logout };
})();
