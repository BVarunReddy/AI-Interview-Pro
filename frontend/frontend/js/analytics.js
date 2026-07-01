// analytics.js
document.addEventListener("DOMContentLoaded", async () => {
  if (!Auth.requireAuth()) return;
  initDarkMode();
  initDarkMode();
  initUI("analytics.html", "Search analytics...");
  initPageAccess();

  const [statsRes, fbRes] = await Promise.all([
    API.getStats(),
    API.getFeedback(),
  ]);

  if (!statsRes || !statsRes.ok) {
    Toast.error(
      "Failed to load analytics: " +
        (statsRes?.data?.message || "Server error"),
    );
    return;
  }

  const { candidates, interviews, feedback, trend } = statsRes.data;
  const fbs = fbRes?.ok ? fbRes.data.feedbacks : [];

  // ── KPIs
  const hireRate =
    candidates.total > 0
      ? Math.round(((candidates.selected || 0) / candidates.total) * 100) + "%"
      : "0%";

  document.getElementById("kTotalCand").textContent = candidates.total || 0;
  document.getElementById("kHireRate").textContent = hireRate;
  document.getElementById("kAvgScore").textContent =
    candidates.avg_ai_score || "—";
  document.getElementById("kAvgFeedback").textContent =
    feedback.avg_score || "—";

  // ── Funnel chart
  const funnelCtx = document.getElementById("funnelChart");
  if (funnelCtx) {
    new Chart(funnelCtx.getContext("2d"), {
      type: "bar",
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
            label: "Candidates",
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
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { stepSize: 1, precision: 0 },
            grid: { color: "#f1f5f9" },
          },
          y: { grid: { display: false } },
        },
      },
    });
  }

  // ── Trend chart
  const trendCtx = document.getElementById("trendChart");
  if (trendCtx) {
    const trendLabels =
      trend && trend.length ? trend.map((t) => t.month) : ["No Data"];
    const trendData = trend && trend.length ? trend.map((t) => t.count) : [0];
    new Chart(trendCtx.getContext("2d"), {
      type: "line",
      data: {
        labels: trendLabels,
        datasets: [
          {
            label: "Candidates",
            data: trendData,
            borderColor: "#4f46e5",
            backgroundColor: "rgba(79,70,229,0.08)",
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: "#4f46e5",
            tension: 0.4,
            fill: true,
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
            ticks: { stepSize: 1, precision: 0 },
            grid: { color: "#f1f5f9" },
          },
          x: { grid: { display: false } },
        },
      },
    });
  }

  // ── Round doughnut
  const roundCtx = document.getElementById("roundChart");
  if (roundCtx) {
    new Chart(roundCtx.getContext("2d"), {
      type: "doughnut",
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
  }

  // ── Recommendation doughnut
  const recoCtx = document.getElementById("recoChart");
  if (recoCtx) {
    const recoCounts = { "Strong Hire": 0, Hire: 0, Maybe: 0, "No Hire": 0 };
    fbs.forEach((f) => {
      if (recoCounts[f.recommendation] !== undefined)
        recoCounts[f.recommendation]++;
    });
    new Chart(recoCtx.getContext("2d"), {
      type: "doughnut",
      data: {
        labels: Object.keys(recoCounts),
        datasets: [
          {
            data: Object.values(recoCounts),
            backgroundColor: ["#d1fae5", "#dbeafe", "#fef3c7", "#fee2e2"],
            borderColor: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"],
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
  }

  // ── Top candidates table
  const sorted = [...fbs]
    .sort((a, b) => {
      const aScore =
        parseFloat(a.overall_score) ||
        (a.technical_score + a.communication_score + a.problem_solving_score) /
          3;
      const bScore =
        parseFloat(b.overall_score) ||
        (b.technical_score + b.communication_score + b.problem_solving_score) /
          3;
      return bScore - aScore;
    })
    .slice(0, 10);

  document.getElementById("topTable").innerHTML = sorted.length
    ? sorted
        .map((f) => {
          const overall =
            parseFloat(f.overall_score) ||
            (f.technical_score +
              f.communication_score +
              f.problem_solving_score) /
              3;
          return `
          <tr>
            <td>
              <div class="cand-cell">
                <div class="cand-avatar">${initials(f.candidate_name)}</div>
                <div class="cand-name">${f.candidate_name}</div>
              </div>
            </td>
            <td><strong>${f.technical_score}</strong>/10</td>
            <td><strong>${f.communication_score}</strong>/10</td>
            <td><strong>${f.problem_solving_score}</strong>/10</td>
            <td><strong style="color:#4f46e5;font-size:15px">${overall.toFixed(1)}</strong>/10</td>
            <td>${statusBadge(f.recommendation)}</td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="6">
        <div class="empty-state">
          <div class="empty-icon"><i class="fa fa-comment-alt"></i></div>
          <div class="empty-title">No feedback submitted yet</div>
          <div class="empty-desc">Submit feedback to see top candidates here</div>
        </div>
       </td></tr>`;
});
