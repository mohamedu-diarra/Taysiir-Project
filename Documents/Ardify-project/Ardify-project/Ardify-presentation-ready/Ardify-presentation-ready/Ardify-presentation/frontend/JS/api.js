/**
 * api.js — Ardify API Client
 * Handles all HTTP requests to the backend with automatic token refresh.
 * Set window.ARDIFY_API_BASE before loading this script to change the backend URL.
 */
(function () {
  // Change this URL to your deployed backend or keep localhost for local dev
  const API_BASE = window.ARDIFY_API_BASE || "http://localhost:5000/api";

  const TOKEN_KEYS = {
    ACCESS: "ardify_access_token",
    REFRESH: "ardify_refresh_token",
    USER: "ardify_user",
  };

  const Auth = {
    getAccessToken() { return localStorage.getItem(TOKEN_KEYS.ACCESS); },
    getRefreshToken() { return localStorage.getItem(TOKEN_KEYS.REFRESH); },
    getUser() {
      try { return JSON.parse(localStorage.getItem(TOKEN_KEYS.USER) || "null"); }
      catch { return null; }
    },
    setSession({ accessToken, refreshToken, user }) {
      if (accessToken) localStorage.setItem(TOKEN_KEYS.ACCESS, accessToken);
      if (refreshToken) localStorage.setItem(TOKEN_KEYS.REFRESH, refreshToken);
      if (user) localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(user));
    },
    clearSession() {
      localStorage.removeItem(TOKEN_KEYS.ACCESS);
      localStorage.removeItem(TOKEN_KEYS.REFRESH);
      localStorage.removeItem(TOKEN_KEYS.USER);
    },
    isLoggedIn() { return !!this.getAccessToken() && !!this.getUser(); },
  };

  let refreshPromise = null;

  async function refreshAccessToken() {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      const refreshToken = Auth.getRefreshToken();
      if (!refreshToken) throw new Error("No refresh token");
      const res = await fetch(`${API_BASE}/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) throw new Error(body.message || "Session expired");
      Auth.setSession({ accessToken: body.data.accessToken, refreshToken: body.data.refreshToken });
      return body.data.accessToken;
    })();
    try { return await refreshPromise; } finally { refreshPromise = null; }
  }

  async function request(path, { method = "GET", body, auth = true, retry = true } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth) {
      const token = Auth.getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    let res;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      const err = new Error("Cannot connect to server. Make sure the backend is running on port 5000.");
      err.isNetworkError = true;
      throw err;
    }

    if (res.status === 401 && auth && retry && Auth.getRefreshToken()) {
      try {
        await refreshAccessToken();
        return request(path, { method, body, auth, retry: false });
      } catch {
        Auth.clearSession();
        const err = new Error("Session expired. Please log in again.");
        err.status = 401;
        err.sessionExpired = true;
        throw err;
      }
    }

    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload.success === false) {
      const message = payload.message || payload.error ||
        (Array.isArray(payload.errors) && payload.errors[0]?.msg) ||
        `Request failed (${res.status})`;
      const err = new Error(message);
      err.status = res.status;
      throw err;
    }
    return payload.data !== undefined ? payload.data : payload;
  }

  const Api = {
    get: (path, opts) => request(path, { ...opts, method: "GET" }),
    post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
    put: (path, body, opts) => request(path, { ...opts, method: "PUT", body }),
    delete: (path, opts) => request(path, { ...opts, method: "DELETE" }),
  };

  window.ArdifyAuth = Auth;
  window.ArdifyApi = Api;
  window.ARDIFY_API_BASE = API_BASE;
})();
