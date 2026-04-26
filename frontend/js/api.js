/* ============================================================
   API — All backend fetch() calls for Khujo
   Replaces localStorage (Store) with real HTTP requests.
   ============================================================ */

const API = (() => {
  const BASE = "/api";

  // ── Token Management ──────────────────────────────────────
  function getToken() {
    return localStorage.getItem("khujo_token");
  }

  function setToken(token) {
    localStorage.setItem("khujo_token", token);
  }

  function clearToken() {
    localStorage.removeItem("khujo_token");
  }

  // ── Generic fetch wrapper ─────────────────────────────────
  async function request(method, path, body) {
    const options = {
      method,
      headers: { "Content-Type": "application/json" },
    };

    const token = getToken();
    if (token) {
      options.headers["Authorization"] = token;
    }

    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(BASE + path, options);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(err.error || "Request failed");
    }

    return res.json();
  }

  // ── Auth ───────────────────────────────────────���──────────
  async function login(username, password) {
    const data = await request("POST", "/auth/login", { username, password });
    setToken(data.token);
    // Cache user info for quick access
    localStorage.setItem("khujo_user", JSON.stringify(data.user));
    return data;
  }

  async function register(username, password, extras = {}) {
    const data = await request("POST", "/auth/register", {
      username,
      password,
      ...extras,
    });
    setToken(data.token);
    localStorage.setItem("khujo_user", JSON.stringify(data.user));
    return data;
  }

  async function logout() {
    try {
      await request("POST", "/auth/logout");
    } catch {
      // Ignore errors on logout
    }
    clearToken();
    localStorage.removeItem("khujo_user");
  }

  async function getMe() {
    return request("GET", "/auth/me");
  }

  // Quick cached user (no network call)
  function getCachedUser() {
    try {
      return JSON.parse(localStorage.getItem("khujo_user"));
    } catch {
      return null;
    }
  }

  // ── Profile ───────────────────────────────────────────────
  async function getProfile() {
    return request("GET", "/profile");
  }

  async function updateProfile(data) {
    return request("PUT", "/profile", data);
  }

  // ── Family Members ────────────────────────────────────────
  async function getFamilyMembers() {
    return request("GET", "/family");
  }

  async function addFamilyMember(data) {
    return request("POST", "/family", data);
  }

  async function updateFamilyMember(id, data) {
    return request("PUT", "/family/" + id, data);
  }

  async function deleteFamilyMember(id) {
    return request("DELETE", "/family/" + id);
  }

  // ── Lost Reports ──────────────────────────────────────────
  async function getLostReports() {
    return request("GET", "/lost-reports");
  }

  async function getLostReportById(id) {
    return request("GET", "/lost-reports/" + id);
  }

  async function addLostReport(data) {
    return request("POST", "/lost-reports", data);
  }

  async function updateLostReport(id, data) {
    return request("PUT", "/lost-reports/" + id, data);
  }

  // ── Found Reports (Sightings) ───────────────��────────────
  async function getFoundReports(lostReportId) {
    const query = lostReportId ? "?lostReportId=" + lostReportId : "";
    return request("GET", "/found-reports" + query);
  }

  async function addFoundReport(data) {
    return request("POST", "/found-reports", data);
  }

  async function verifyFoundReport(id) {
    return request("PATCH", "/found-reports/" + id + "/verify");
  }

  // ── Alerts ────────────────────────────────────────────────
  async function getAlerts() {
    return request("GET", "/alerts");
  }

  async function markAlertRead(id) {
    return request("PATCH", "/alerts/" + id + "/read");
  }

  async function markAllAlertsRead() {
    return request("PATCH", "/alerts/read-all");
  }

  return {
    getToken,
    setToken,
    clearToken,
    login,
    register,
    logout,
    getMe,
    getCachedUser,
    getProfile,
    updateProfile,
    getFamilyMembers,
    addFamilyMember,
    updateFamilyMember,
    deleteFamilyMember,
    getLostReports,
    getLostReportById,
    addLostReport,
    updateLostReport,
    getFoundReports,
    addFoundReport,
    verifyFoundReport,
    getAlerts,
    markAlertRead,
    markAllAlertsRead,
  };
})();
