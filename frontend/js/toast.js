// ============================================================
// toast.js — Toast Notifications + Shared UI Helpers
// ============================================================

const BACKEND_URL = "https://ai-interview-pro-mjc7.onrender.com";

const Toast = (() => {
  let container;
  function getContainer() {
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    return container;
  }
  const icons = {
    success: "fa-check-circle",
    error: "fa-times-circle",
    warning: "fa-exclamation-triangle",
    info: "fa-info-circle",
  };
  const titles = {
    success: "Success",
    error: "Error",
    warning: "Warning",
    info: "Info",
  };
  function show(type, message, duration = 4000) {
    const c = getContainer();
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="fa ${icons[type]} toast-icon"></i>
      <div class="toast-body"><div class="toast-title">${titles[type]}</div><div class="toast-msg">${message}</div></div>
      <button class="toast-close" onclick="this.parentElement.remove()"><i class="fa fa-times"></i></button>`;
    c.appendChild(toast);
    if (duration > 0) {
      setTimeout(() => {
        toast.style.animation = "slideOut .25s ease forwards";
        setTimeout(() => toast.remove(), 250);
      }, duration);
    }
  }
  return {
    success: (msg, d) => show("success", msg, d),
    error: (msg, d) => show("error", msg, d),
    warning: (msg, d) => show("warning", msg, d),
    info: (msg, d) => show("info", msg, d),
  };
})();

// ── Sidebar ───────────────────────────────────────────────
function buildSidebar(activePage) {
  const links = [
    { href: "dashboard.html",         icon: "fa-chart-line",      label: "Dashboard" },
    { href: "addCandidate.html",       icon: "fa-user-plus",       label: "Add Candidate",         roles: ["admin","hr"] },
    { href: "bulkImport.html",         icon: "fa-file-excel",      label: "Bulk Import",           roles: ["admin","hr"] },
    { href: "viewCandidates.html",     icon: "fa-users",           label: "Candidates" },
    { href: "candidateRanking.html",   icon: "fa-ranking-star",    label: "Auto-Ranking",          roles: ["admin","hr"] },
    { href: "scheduleInterview.html",  icon: "fa-calendar-alt",    label: "Schedule Interview",    roles: ["admin","hr"] },
    { href: "viewInterviews.html",     icon: "fa-clock",           label: "View Interviews" },
    { href: "feedback.html",           icon: "fa-comment-alt",     label: "Feedback",              roles: ["admin","hr","interviewer"] },
    { href: "analytics.html",          icon: "fa-chart-bar",       label: "Analytics" },
    { href: "userManagement.html",     icon: "fa-users-gear",      label: "User Management",       roles: ["admin"] },
    { href: "aiScore.html",            icon: "fa-robot",           label: "AI Scoring",            roles: ["admin","hr"] },
    { href: "jdGenerator.html",        icon: "fa-file-pen",        label: "JD Generator",          roles: ["admin","hr"] },
    { href: "interviewQuestions.html", icon: "fa-circle-question", label: "Interview Questions",   roles: ["admin","hr"] },
    { href: "offerLetter.html",        icon: "fa-file-signature",  label: "Offer Letter",          roles: ["admin","hr"] },
  ];
  const user = Auth.getUser() || {};
  const role = user.role || "viewer";
  const nav = links
    .filter((l) => !l.roles || l.roles.includes(role))
    .map(
      (l) => `
    <a href="${l.href}" class="${activePage === l.href ? "active" : ""}" onclick="closeMobileSidebar()">
      <i class="fa ${l.icon}"></i>${l.label}
    </a>`,
    )
    .join("");
  return `
    <div class="logo"><span class="logo-dot"></span>InterviewPro</div>
    <nav>${nav}</nav>
    <div class="sidebar-footer">
      <a href="profile.html" class="${activePage === "profile.html" ? "active" : ""}"><i class="fa fa-user"></i>Profile</a>
      <a href="#" class="logout" onclick="logout()"><i class="fa fa-sign-out-alt"></i>Logout</a>
    </div>`;
}

// ── Navbar ────────────────────────────────────────────────
function buildNavbar(searchPlaceholder = "Search...") {
  const user = Auth.getUser() || {};
  const ini = (user.name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return `
    <button class="hamburger" id="hamburgerBtn" onclick="toggleMobileSidebar()" aria-label="Toggle menu">
      <i class="fa fa-bars"></i>
    </button>
    ${searchPlaceholder ? `
      <div class="search-wrap" style="position:relative">
        <i class="fa fa-search"></i>
        <input type="text" id="globalSearch" placeholder="Search candidates, interviews..." autocomplete="off"/>
        <div id="searchDropdown" style="display:none;position:absolute;top:calc(100% + 8px);left:0;right:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);z-index:500;max-height:420px;overflow-y:auto;min-width:360px"></div>
      </div>` : `<div></div>`}
    <div class="nav-right">
      <button class="dark-toggle" id="darkToggle" onclick="toggleDark()" title="Toggle dark mode"><i class="fa fa-moon"></i></button>
      <a href="calender.html" class="dark-toggle" title="Calendar" style="text-decoration:none;display:flex;align-items:center;justify-content:center"><i class="fa fa-calendar"></i></a>
      <a href="activityLog.html" class="dark-toggle" title="Activity Log" style="text-decoration:none;display:flex;align-items:center;justify-content:center"><i class="fa fa-clock-rotate-left"></i></a>
      <div class="relative">
        <button class="notif-btn" id="notifBtn"><i class="fa fa-bell"></i><span class="notif-badge" id="notifBadge"></span></button>
        <div class="notif-dropdown" id="notifDropdown">
          <div class="notif-header"><span>Notifications</span><button onclick="clearAllNotifs()">Clear all</button></div>
          <div id="notifList"><div class="notif-item">Loading...</div></div>
        </div>
      </div>
      <div class="relative">
        <button class="profile-btn" id="profileBtn">
          <div class="profile-avatar">${ini}</div>
          <div><div class="profile-name">${user.name || "User"}</div><div class="profile-role-label">${user.role || "HR"}</div></div>
        </button>
        <div class="profile-dropdown" id="profileDropdown">
          <div class="pd-header"><strong>${user.name || "User"}</strong><span>${user.email || ""}</span></div>
          <a href="profile.html" class="pd-link"><i class="fa fa-user"></i>View Profile</a>
          <button class="pd-link danger" onclick="logout()"><i class="fa fa-sign-out-alt"></i>Logout</button>
        </div>
      </div>
    </div>`;
}

// ── Init UI ───────────────────────────────────────────────
function initUI(activePage, searchPlaceholder) {
  const sb = document.getElementById("sidebar");
  if (sb) sb.innerHTML = buildSidebar(activePage);

  // Restore sidebar nav scroll position saved from previous page
  const nav = sb ? sb.querySelector("nav") : null;
  if (nav) {
    const saved = sessionStorage.getItem("sidebarScroll");
    if (saved) nav.scrollTop = parseInt(saved, 10);

    // Save scroll position whenever the user scrolls the nav
    nav.addEventListener("scroll", function() {
      sessionStorage.setItem("sidebarScroll", nav.scrollTop);
    });

    // Also save immediately when a nav link is clicked
    nav.querySelectorAll("a").forEach(function(a) {
      a.addEventListener("click", function() {
        sessionStorage.setItem("sidebarScroll", nav.scrollTop);
      });
    });
  }

  const nb = document.getElementById("navbar");
  if (nb) nb.innerHTML = buildNavbar(searchPlaceholder);

  // Add mobile overlay if not already present
  if (!document.getElementById("sidebarOverlay")) {
    const overlay = document.createElement("div");
    overlay.id = "sidebarOverlay";
    overlay.className = "sidebar-overlay";
    overlay.onclick = closeMobileSidebar;
    document.body.appendChild(overlay);
  }

  document.addEventListener("click", (e) => {
    const notifBtn = document.getElementById("notifBtn");
    const notifDrop = document.getElementById("notifDropdown");
    const profBtn = document.getElementById("profileBtn");
    const profDrop = document.getElementById("profileDropdown");
    if (notifBtn && notifBtn.contains(e.target)) {
      notifDrop.classList.toggle("open");
      profDrop && profDrop.classList.remove("open");
      if (notifDrop.classList.contains("open")) loadNotifications();
    } else if (notifDrop && !notifDrop.contains(e.target))
      notifDrop.classList.remove("open");
    if (profBtn && profBtn.contains(e.target)) {
      profDrop.classList.toggle("open");
      notifDrop && notifDrop.classList.remove("open");
    } else if (profDrop && !profDrop.contains(e.target))
      profDrop.classList.remove("open");
  });

  fetchNotifCount();
  initDarkMode();

  // ── Global Search ──────────────────────────────────────
  const searchInput = document.getElementById("globalSearch");
  const searchDrop  = document.getElementById("searchDropdown");
  if (searchInput && searchDrop) {
    let searchTimer;

    searchInput.addEventListener("input", () => {
      const q = searchInput.value.trim();
      clearTimeout(searchTimer);
      if (q.length < 2) { searchDrop.style.display = "none"; return; }
      searchTimer = setTimeout(() => runGlobalSearch(q), 300);
    });

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { searchDrop.style.display = "none"; searchInput.value = ""; }
    });

    document.addEventListener("click", (e) => {
      if (!searchInput.contains(e.target) && !searchDrop.contains(e.target))
        searchDrop.style.display = "none";
    });
  }

}

// ── Dark Mode ─────────────────────────────────────────────
function toggleDark() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const newTheme = isDark ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("ats_theme", newTheme);
  const btn = document.getElementById("darkToggle");
  if (btn)
    btn.innerHTML =
      newTheme === "dark"
        ? '<i class="fa fa-sun"></i>'
        : '<i class="fa fa-moon"></i>';
}

function initDarkMode() {
  const saved = localStorage.getItem("ats_theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  const btn = document.getElementById("darkToggle");
  if (btn)
    btn.innerHTML =
      saved === "dark"
        ? '<i class="fa fa-sun"></i>'
        : '<i class="fa fa-moon"></i>';
}

// ── Notifications ─────────────────────────────────────────
async function fetchNotifCount() {
  try {
    const res = await fetch(
      (BACKEND_URL + "/api/notifications"),
      {
        headers: { Authorization: `Bearer ${Auth.getToken()}` },
      },
    );
    const data = await res.json();
    if (data.success) {
      const badge = document.getElementById("notifBadge");
      if (badge) {
        if (data.unread > 0) badge.classList.add("show");
        else badge.classList.remove("show");
      }
    }
  } catch (e) {}
}

async function loadNotifications() {
  try {
    const res = await fetch(
      (BACKEND_URL + "/api/notifications"),
      {
        headers: { Authorization: `Bearer ${Auth.getToken()}` },
      },
    );
    const data = await res.json();
    const list = document.getElementById("notifList");
    if (!list) return;
    if (!data.success || !data.notifications.length) {
      list.innerHTML = '<div class="notif-item">No notifications yet</div>';
      return;
    }
    const typeIcons = {
      success: "fa-check-circle",
      error: "fa-times-circle",
      warning: "fa-exclamation-triangle",
      info: "fa-info-circle",
    };
    const typeColors = {
      success: "#10b981",
      error: "#ef4444",
      warning: "#f59e0b",
      info: "#3b82f6",
    };
    list.innerHTML = data.notifications
      .map(
        (n) => `
      <div class="notif-item ${n.is_read ? "" : "unread"}" onclick="markRead(${n.id},this)">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <i class="fa ${typeIcons[n.type] || "fa-bell"}" style="color:${typeColors[n.type] || "#3b82f6"};margin-top:2px;font-size:13px;flex-shrink:0"></i>
          <div>
            <div style="font-weight:600;font-size:13px">${n.title}</div>
            <div style="font-size:12px;color:#475569;margin-top:2px">${n.message}</div>
            <div class="notif-time">${timeAgo(new Date(n.created_at))}</div>
          </div>
        </div>
      </div>`,
      )
      .join("");
    const badge = document.getElementById("notifBadge");
    if (badge) {
      if (data.unread > 0) badge.classList.add("show");
      else badge.classList.remove("show");
    }
  } catch (e) {
    const list = document.getElementById("notifList");
    if (list) list.innerHTML = '<div class="notif-item">Could not load</div>';
  }
}

async function markRead(id, el) {
  try {
    await fetch(
      (BACKEND_URL + `/api/notifications/${id}/read`),
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${Auth.getToken()}` },
      },
    );
    el.classList.remove("unread");
    fetchNotifCount();
  } catch (e) {}
}

async function clearAllNotifs() {
  try {
    await fetch(
      (BACKEND_URL + "/api/notifications/clear"),
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${Auth.getToken()}` },
      },
    );
    const list = document.getElementById("notifList");
    if (list)
      list.innerHTML = '<div class="notif-item">No notifications yet</div>';
    const badge = document.getElementById("notifBadge");
    if (badge) badge.classList.remove("show");
  } catch (e) {}
}

function timeAgo(date) {
  const s = Math.floor((new Date() - date) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function logout() {
  Auth.clearSession();
  window.location.href = "login.html";
}

// ── Helpers ───────────────────────────────────────────────
function statusBadge(status) {
  const map = {
    Pending: "badge-pending",
    Screening: "badge-screening",
    Interview: "badge-interview",
    Offer: "badge-offer",
    Selected: "badge-selected",
    Rejected: "badge-rejected",
    Scheduled: "badge-scheduled",
    Confirmed: "badge-selected",
    "Reschedule Requested": "badge-reschedule",
    Completed: "badge-completed",
    Cancelled: "badge-cancelled",
    Technical: "badge-technical",
    HR: "badge-hr",
    Managerial: "badge-managerial",
    Final: "badge-final",
    "Strong Hire": "badge-selected",
    Hire: "badge-offer",
    Maybe: "badge-screening",
    "No Hire": "badge-rejected",
  };
  return `<span class="badge ${map[status] || "badge-pending"}">${status}</span>`;
}
function aiScorePill(score) {
  if (score === null || score === undefined)
    return `<span class="ai-score none">—</span>`;
  const cls = score >= 75 ? "high" : score >= 50 ? "mid" : "low";
  return `<span class="ai-score ${cls}"><i class="fa fa-robot"></i>${score}%</span>`;
}
function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function initials(name) {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
function skeletonRows(cols = 5, rows = 5) {
  return Array(rows)
    .fill("")
    .map(
      () =>
        `<tr>${Array(cols)
          .fill("")
          .map(() => `<td><div class="skeleton skeleton-text"></div></td>`)
          .join("")}</tr>`,
    )
    .join("");
}

// ── Page-level role access ────────────────────────────────
// Call initPageAccess() after initUI() on any page that has
// action buttons that should be hidden for certain roles.
// Hides elements with data-roles="admin,hr" etc. if the current
// user's role isn't in the list.
function initPageAccess() {
  const role = Auth.getRole();

  // Hide elements that require specific roles
  document.querySelectorAll("[data-roles]").forEach((el) => {
    const allowed = el.getAttribute("data-roles").split(",").map((r) => r.trim());
    if (!allowed.includes(role)) {
      el.style.display = "none";
    }
  });

  // Show a read-only banner for Viewer role
  if (role === "viewer") {
    const existing = document.getElementById("viewerBanner");
    if (!existing) {
      const banner = document.createElement("div");
      banner.id = "viewerBanner";
      banner.style.cssText =
        "background:#fef3c7;color:#92400e;padding:8px 16px;font-size:13px;text-align:center;border-bottom:1px solid #fcd34d;position:sticky;top:0;z-index:50";
      banner.innerHTML = '<i class="fa fa-eye"></i> You are in <strong>Viewer</strong> mode — read only access';
      const content = document.querySelector(".page-content");
      if (content) content.insertBefore(banner, content.firstChild);
    }
  }

  // Show a badge for Interviewer role
  if (role === "interviewer") {
    const existing = document.getElementById("interviewerBanner");
    if (!existing) {
      const banner = document.createElement("div");
      banner.id = "interviewerBanner";
      banner.style.cssText =
        "background:#dbeafe;color:#1e40af;padding:8px 16px;font-size:13px;text-align:center;border-bottom:1px solid #bfdbfe;position:sticky;top:0;z-index:50";
      banner.innerHTML = '<i class="fa fa-user-tie"></i> You are logged in as <strong>Interviewer</strong> — you can view candidates and submit feedback';
      const content = document.querySelector(".page-content");
      if (content) content.insertBefore(banner, content.firstChild);
    }
  }
}

// ── Mobile Sidebar ────────────────────────────────────────
function toggleMobileSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  if (!sidebar) return;
  const isOpen = sidebar.classList.contains("mobile-open");
  if (isOpen) { closeMobileSidebar(); } else {
    sidebar.classList.add("mobile-open");
    if (overlay) overlay.classList.add("active");
  }
}
function closeMobileSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  if (sidebar) sidebar.classList.remove("mobile-open");
  if (overlay) overlay.classList.remove("active");
}

// ── Global Search ─────────────────────────────────────────
async function runGlobalSearch(q) {
  const drop = document.getElementById("searchDropdown");
  if (!drop) return;
  drop.style.display = "block";
  drop.innerHTML = `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px"><i class="fa fa-spinner fa-spin"></i> Searching...</div>`;

  try {
    const res = await API.globalSearch(q);
    if (!res || !res.ok) {
      drop.innerHTML = `<div style="padding:16px;font-size:13px;color:#ef4444">Search failed.</div>`;
      return;
    }
    renderSearchResults(drop, res.data.results, res.data.total, q);
  } catch (e) {
    drop.innerHTML = `<div style="padding:16px;font-size:13px;color:#ef4444">Search error.</div>`;
  }
}

function renderSearchResults(drop, results, total, q) {
  if (total === 0) {
    drop.innerHTML = `<div style="padding:20px;text-align:center;font-size:13px;color:var(--text-muted)"><i class="fa fa-search" style="font-size:20px;display:block;margin-bottom:8px;opacity:.3"></i>No results for "<strong>${q}</strong>"</div>`;
    return;
  }

  const hl = (text) => {
    if (!text) return "";
    return String(text).replace(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`, "gi"),
      `<mark style="background:#fef08a;color:#713f12;border-radius:2px;padding:0 2px">$1</mark>`);
  };

  const section = (icon, color, label, items) => {
    if (!items.length) return "";
    return `
      <div style="padding:8px 12px 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text-muted);background:var(--surface-2)">
        <i class="fa ${icon}" style="color:${color}"></i> ${label}
      </div>
      ${items.map(item => {
        if (item._type === "candidate") return `
          <a href="viewCandidates.html" onclick="document.getElementById('searchDropdown').style.display='none'"
             style="display:flex;align-items:center;gap:12px;padding:10px 14px;text-decoration:none;color:inherit;border-bottom:1px solid var(--border);cursor:pointer"
             onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background=''">
            <div style="width:32px;height:32px;border-radius:50%;background:#ede9fe;color:#5b21b6;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">
              ${(item.name||"?")[0].toUpperCase()}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600">${hl(item.name)}</div>
              <div style="font-size:12px;color:var(--text-muted)">${hl(item.position)} · ${item.email}</div>
            </div>
            ${statusBadge(item.status)}
          </a>`;
        if (item._type === "interview") return `
          <a href="viewInterviews.html" onclick="document.getElementById('searchDropdown').style.display='none'"
             style="display:flex;align-items:center;gap:12px;padding:10px 14px;text-decoration:none;color:inherit;border-bottom:1px solid var(--border);cursor:pointer"
             onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background=''">
            <div style="width:32px;height:32px;border-radius:50%;background:#d1fae5;color:#047857;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0">
              <i class="fa fa-calendar"></i>
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600">${hl(item.candidate_name)}</div>
              <div style="font-size:12px;color:var(--text-muted)">${hl(item.round_name)} · ${item.interview_date ? new Date(item.interview_date).toLocaleDateString("en-US",{day:"numeric",month:"short"}) : ""}</div>
            </div>
            ${statusBadge(item.status)}
          </a>`;
        if (item._type === "feedback") return `
          <a href="feedback.html" onclick="document.getElementById('searchDropdown').style.display='none'"
             style="display:flex;align-items:center;gap:12px;padding:10px 14px;text-decoration:none;color:inherit;border-bottom:1px solid var(--border);cursor:pointer"
             onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background=''">
            <div style="width:32px;height:32px;border-radius:50%;background:#fef3c7;color:#b45309;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0">
              <i class="fa fa-comment"></i>
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600">${hl(item.candidate_name)}</div>
              <div style="font-size:12px;color:var(--text-muted)">${hl(item.recommendation)} · Score: ${item.overall_score}/10</div>
            </div>
          </a>`;
        return "";
      }).join("")}`;
  };

  drop.innerHTML =
    section("fa-users", "#4f46e5", "Candidates", results.candidates) +
    section("fa-calendar", "#10b981", "Interviews", results.interviews) +
    section("fa-comment-dots", "#f59e0b", "Feedback", results.feedback) +
    `<div style="padding:10px 14px;font-size:12px;color:var(--text-muted);text-align:center;border-top:1px solid var(--border)">
      ${total} result${total !== 1 ? "s" : ""} for "<strong>${q}</strong>"
    </div>`;
}
