// ============================================================
// api.js — Centralized API Client with JWT Auth
// ============================================================

const API_BASE = "http://localhost:3000/api";

// ── Token helpers ─────────────────────────────────────────
const Auth = {
  getToken: () => localStorage.getItem("ats_token"),
  getUser: () => JSON.parse(localStorage.getItem("ats_user") || "null"),
  setSession: (token, user) => {
    localStorage.setItem("ats_token", token);
    localStorage.setItem("ats_user", JSON.stringify(user));
  },
  clearSession: () => {
    localStorage.removeItem("ats_token");
    localStorage.removeItem("ats_user");
  },
  isLoggedIn: () => !!localStorage.getItem("ats_token"),
  requireAuth: () => {
    if (!localStorage.getItem("ats_token")) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  },
  // Check if current user has one of the given roles
  hasRole: (...roles) => {
    const user = JSON.parse(localStorage.getItem("ats_user") || "null");
    return user ? roles.includes(user.role) : false;
  },
  getRole: () => {
    const user = JSON.parse(localStorage.getItem("ats_user") || "null");
    return user ? user.role : "viewer";
  },
};

// ── Core fetch wrapper ────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const token = Auth.getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Don't set Content-Type for FormData (file uploads)
  if (options.body instanceof FormData) delete headers["Content-Type"];

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await res.json();

    // Token expired — redirect to login
    if (res.status === 403) {
      Auth.clearSession();
      window.location.href = "login.html";
      return null;
    }

    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error("API error:", err);
    return {
      ok: false,
      data: { message: "Network error. Is the server running?" },
    };
  }
}

// ── API methods ───────────────────────────────────────────
const API = {
  // Auth
  login: (body) =>
    apiFetch("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  register: (body) =>
    apiFetch("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  getProfile: () => apiFetch("/auth/profile"),
  updateProfile: (body) =>
    apiFetch("/auth/profile", { method: "PUT", body: JSON.stringify(body) }),

  // Dashboard
  getStats: () => apiFetch("/dashboard/stats"),
  getActivity: () => apiFetch("/dashboard/activity"),

  // Candidates
  getCandidates: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/candidates${qs ? "?" + qs : ""}`);
  },
  getCandidate: (id) => apiFetch(`/candidates/${id}`),
  addCandidate: (fd) => apiFetch("/candidates", { method: "POST", body: fd }),
  updateStatus: (id, status) =>
    apiFetch(`/candidates/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
  deleteCandidate: (id) => apiFetch(`/candidates/${id}`, { method: "DELETE" }),

  // Interviews
  getInterviews: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/interviews${qs ? "?" + qs : ""}`);
  },
  scheduleInterview: (body) =>
    apiFetch("/interviews", { method: "POST", body: JSON.stringify(body) }),
  updateInterviewStatus: (id, status) =>
    apiFetch(`/interviews/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
  deleteInterview: (id) => apiFetch(`/interviews/${id}`, { method: "DELETE" }),

  // Feedback
  getFeedback: () => apiFetch("/feedback"),
  submitFeedback: (body) =>
    apiFetch("/feedback", { method: "POST", body: JSON.stringify(body) }),

  // AI
  scoreResume: (body) =>
    apiFetch("/ai/score-resume", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  generateJD: (body) =>
    apiFetch("/ai/generate-jd", { method: "POST", body: JSON.stringify(body) }),
  generateQuestions: (body) =>
    apiFetch("/ai/generate-questions", { method: "POST", body: JSON.stringify(body) }),

  getRanking: (position) =>
    apiFetch(`/candidates/ranking${position ? "?position=" + encodeURIComponent(position) : ""}`),

  // User management (admin only)
  getUsers: () => apiFetch("/auth/users"),
  updateUserRole: (id, role) =>
    apiFetch(`/auth/users/${id}/role`, { method: "PUT", body: JSON.stringify({ role }) }),
  deleteUser: (id) => apiFetch(`/auth/users/${id}`, { method: "DELETE" }),

  // Offer Letters
  saveOffer: (body) =>
    apiFetch("/offers", { method: "POST", body: JSON.stringify(body) }),
  getCandidateOffers: (candidateId) =>
    apiFetch(`/offers/candidate/${candidateId}`),

  // Generic helpers for new routes
  post: (endpoint, body) =>
    apiFetch(endpoint, { method: "POST", body: JSON.stringify(body) }),
  get: (endpoint) => apiFetch(endpoint),
  globalSearch: (q) => apiFetch(`/dashboard/search?q=${encodeURIComponent(q)}`),
};
