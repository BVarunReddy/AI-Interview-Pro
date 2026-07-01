// dashboard.js
document.addEventListener("DOMContentLoaded", () => {
  if (!Auth.requireAuth()) return;
  const user = Auth.getUser();
  initDarkMode();
  initUI("dashboard.html", "Search candidates, interviews...");
  document.getElementById("welcomeName").textContent = user?.name || "there";
  loadDashboard();
});

async function loadDashboard() {
  const [statsRes, actRes] = await Promise.all([
    API.getStats(),
    API.getActivity(),
  ]);

  if (!statsRes || !statsRes.ok) {
    Toast.error("Failed to load dashboard stats.");
    return;
  }

  const { candidates, interviews, feedback, trend } = statsRes.data;

  // ── Stat cards
  document.getElementById("statsGrid").innerHTML = `
    <div class="stat-card">
      <div class="stat-icon indigo"><i class="fa fa-users"></i></div>
      <div class="stat-value">${candidates.total || 0}</div>
      <div class="stat-label">Total Candidates</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon green"><i class="fa fa-check-circle"></i></div>
      <div class="stat-value">${candidates.selected || 0}</div>
      <div class="stat-label">Selected</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon amber"><i class="fa fa-calendar-alt"></i></div>
      <div class="stat-value">${interviews.upcoming || 0}</div>
      <div class="stat-label">Upcoming Interviews</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon blue"><i class="fa fa-comment-alt"></i></div>
      <div class="stat-value">${feedback.total || 0}</div>
      <div class="stat-label">Feedback Submitted</div>
    </div>`;

  // ── Pipeline summary
  const pipeline = [
    {
      label: "Pending",
      val: candidates.pending,
      icon: "fa-clock",
      color: "#f59e0b",
    },
    {
      label: "Screening",
      val: candidates.screening,
      icon: "fa-search",
      color: "#3b82f6",
    },
    {
      label: "Interview",
      val: candidates.interview,
      icon: "fa-microphone",
      color: "#8b5cf6",
    },
    {
      label: "Offer",
      val: candidates.offer,
      icon: "fa-file-signature",
      color: "#10b981",
    },
    {
      label: "Rejected",
      val: candidates.rejected,
      icon: "fa-times-circle",
      color: "#ef4444",
    },
  ];
  document.getElementById("pipelineSummary").innerHTML = pipeline
    .map(
      (p) => `
    <div class="insight-row">
      <span style="display:flex;align-items:center;gap:8px;font-size:13px;">
        <i class="fa ${p.icon}" style="color:${p.color};width:16px"></i>${p.label}
      </span>
      <strong>${p.val || 0}</strong>
    </div>`,
    )
    .join("");

  // ── Activity feed (uses activity_logs table now)
  const logs = actRes?.data?.logs || [];
  if (logs.length) {
    const ACTION_ICON = {
      "Added Candidate": { icon: "fa-user-plus", color: "#4f46e5" },
      "Status Changed": { icon: "fa-arrows-rotate", color: "#0ea5e9" },
      "Scheduled Interview": { icon: "fa-calendar-plus", color: "#10b981" },
      "Submitted Feedback": { icon: "fa-comment-dots", color: "#f59e0b" },
      "Logged In": { icon: "fa-right-to-bracket", color: "#94a3b8" },
    };
    document.getElementById("activityFeed").innerHTML = logs.slice(0, 20)
      .map((l) => {
        const { icon = "fa-circle-dot", color = "#64748b" } = ACTION_ICON[l.action] || {};
        const ago = (() => {
          const s = (Date.now() - new Date(l.created_at)) / 1000;
          if (s < 60) return "just now";
          if (s < 3600) return `${Math.floor(s / 60)}m ago`;
          if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
          return `${Math.floor(s / 86400)}d ago`;
        })();
        return `
      <div class="activity-item">
        <div class="activity-dot" style="background:${color}"><i class="fa ${icon}" style="font-size:10px;color:white"></i></div>
        <div>
          <div style="font-size:13px;font-weight:500">${l.details || l.action}</div>
          <div class="activity-time">${l.user_name} · ${ago}</div>
        </div>
      </div>`;
      }).join("");
  } else {
    document.getElementById("activityFeed").innerHTML =
      '<div class="empty-state"><div class="empty-icon"><i class="fa fa-stream"></i></div><div class="empty-title">No activity yet</div></div>';
  }

  // ── Trend chart
  const trendCtx = document.getElementById("trendChart").getContext("2d");
  new Chart(trendCtx, {
    type: "bar",
    data: {
      labels: trend.map((t) => t.month),
      datasets: [
        {
          label: "Candidates Added",
          data: trend.map((t) => t.count),
          backgroundColor: "rgba(79,70,229,0.15)",
          borderColor: "#4f46e5",
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
          grid: { color: "#f1f5f9" },
        },
        x: { grid: { display: false } },
      },
    },
  });

  // ── Status doughnut
  const statusCtx = document.getElementById("statusChart").getContext("2d");
  new Chart(statusCtx, {
    type: "doughnut",
    data: {
      labels: [
        "Pending",
        "Screening",
        "Interview",
        "Offer",
        "Selected",
        "Rejected",
      ],
      datasets: [
        {
          data: [
            candidates.pending || 0,
            candidates.screening || 0,
            candidates.interview || 0,
            candidates.offer || 0,
            candidates.selected || 0,
            candidates.rejected || 0,
          ],
          backgroundColor: [
            "#fef3c7",
            "#dbeafe",
            "#ede9fe",
            "#d1fae5",
            "#a7f3d0",
            "#fee2e2",
          ],
          borderColor: [
            "#f59e0b",
            "#3b82f6",
            "#8b5cf6",
            "#10b981",
            "#059669",
            "#ef4444",
          ],
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { font: { size: 11 }, boxWidth: 12 },
        },
      },
    },
  });

  // ── Round bar chart
  const roundCtx = document.getElementById("roundChart").getContext("2d");
  new Chart(roundCtx, {
    type: "bar",
    data: {
      labels: ["Screening", "Technical", "HR", "Managerial"],
      datasets: [
        {
          data: [
            interviews.screening || 0,
            interviews.technical || 0,
            interviews.hr || 0,
            interviews.managerial || 0,
          ],
          backgroundColor: ["#dbeafe", "#ede9fe", "#fce7f3", "#d1fae5"],
          borderColor: ["#3b82f6", "#8b5cf6", "#ec4899", "#10b981"],
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
          grid: { color: "#f1f5f9" },
        },
        x: { grid: { display: false } },
      },
    },
  });
}
