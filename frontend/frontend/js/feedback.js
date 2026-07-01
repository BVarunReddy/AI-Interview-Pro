// feedback.js

document.addEventListener("DOMContentLoaded", async () => {
  if (!Auth.requireAuth()) return;
  initDarkMode();
  initDarkMode();
  initUI("feedback.html", "");
  initPageAccess();

  // Load candidates into both dropdowns
  const cRes = await API.getCandidates({ limit: 200 });
  if (cRes && cRes.ok) {
    const sel1 = document.getElementById("candidate_id");
    const sel2 = document.getElementById("reportCandidateId");
    cRes.data.candidates.forEach((c) => {
      const o1 = document.createElement("option");
      o1.value = c.id;
      o1.textContent = `${c.name} — ${c.position}`;
      if (sel1) sel1.appendChild(o1);
      if (sel2) {
        const o2 = o1.cloneNode(true);
        sel2.appendChild(o2);
      }
    });
  }

  // Live overall score
  ["technical", "communication", "problem_solving"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updateOverall);
  });

  loadFeedbackInsights();

  const form = document.getElementById("feedbackForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("submitBtn");
      btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Submitting...';
      btn.disabled = true;

      const res = await API.submitFeedback({
        candidate_id: parseInt(document.getElementById("candidate_id").value),
        technical_score: parseInt(document.getElementById("technical").value),
        communication_score: parseInt(
          document.getElementById("communication").value,
        ),
        problem_solving_score: parseInt(
          document.getElementById("problem_solving").value,
        ),
        recommendation: document.getElementById("recommendation").value,
        remarks: document.getElementById("remarks").value.trim(),
      });

      if (res && res.ok) {
        Toast.success("Feedback submitted successfully!");
        form.reset();
        document.getElementById("techVal").textContent = 5;
        document.getElementById("commVal").textContent = 5;
        document.getElementById("probVal").textContent = 5;
        document.getElementById("overallScore").textContent = "5.0";
        loadFeedbackInsights();
      } else {
        Toast.error(res?.data?.message || "Submission failed.");
      }

      btn.innerHTML = '<i class="fa fa-paper-plane"></i> Submit Feedback';
      btn.disabled = false;
    });
  }
});

function updateOverall() {
  const t = parseInt(document.getElementById("technical").value);
  const c = parseInt(document.getElementById("communication").value);
  const p = parseInt(document.getElementById("problem_solving").value);
  document.getElementById("overallScore").textContent = (
    (t + c + p) /
    3
  ).toFixed(1);
}

async function loadFeedbackInsights() {
  const res = await API.getFeedback();
  if (!res || !res.ok) return;
  const fb = res.data.feedbacks;

  if (fb.length) {
    const avg = (key) =>
      (
        fb.reduce((s, f) => s + (parseFloat(f[key]) || 0), 0) / fb.length
      ).toFixed(1);
    document.getElementById("avgTech").textContent = avg("technical_score");
    document.getElementById("avgComm").textContent = avg("communication_score");
    document.getElementById("avgProb").textContent = avg(
      "problem_solving_score",
    );
    document.getElementById("avgOverall").textContent = avg("overall_score");

    document.getElementById("recentFeedback").innerHTML = fb
      .slice(0, 5)
      .map(
        (f) => `
      <div class="activity-item">
        <div class="activity-dot"></div>
        <div>
          <div style="font-size:13px;font-weight:500">${f.candidate_name}</div>
          <div style="display:flex;gap:8px;margin-top:4px;align-items:center">
            ${statusBadge(f.recommendation)}
            <span style="font-size:11px;color:#94a3b8">Score: ${parseFloat(f.overall_score || 0).toFixed(1)}/10</span>
          </div>
        </div>
      </div>`,
      )
      .join("");
  } else {
    document.getElementById("recentFeedback").innerHTML =
      '<div class="empty-state" style="padding:20px"><div class="empty-desc">No feedback yet</div></div>';
  }
}

// ── GenAI Report Generator ────────────────────────────────
async function generateReport() {
  const sel = document.getElementById("reportCandidateId");
  if (!sel) {
    Toast.warning("Report section not available.");
    return;
  }
  const candidateId = sel.value;
  if (!candidateId) {
    Toast.warning("Please select a candidate.");
    return;
  }

  const btn = document.getElementById("generateBtn");
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Generating...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/ai/generate-report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Auth.getToken()}`,
      },
      body: JSON.stringify({ candidate_id: parseInt(candidateId) }),
    });
    const data = await res.json();

    if (data.success) {
      document.getElementById("reportText").textContent = data.report;
      document.getElementById("reportBox").classList.add("show");
      Toast.success(`Report generated for ${data.candidate_name}`);
    } else {
      Toast.error(data.message || "Report generation failed.");
    }
  } catch (err) {
    Toast.error("Server error: " + err.message);
  }

  btn.innerHTML =
    '<i class="fa fa-file-alt"></i> Generate AI Evaluation Report';
  btn.disabled = false;
}

function copyReport() {
  const text = document.getElementById("reportText").textContent;
  navigator.clipboard
    .writeText(text)
    .then(() => Toast.success("Report copied to clipboard!"));
}
