// aiScore.js
let candidates = [];
let scoredHistory = [];

document.addEventListener("DOMContentLoaded", async () => {
  if (!Auth.requireAuth()) return;
  initDarkMode();
  initDarkMode();
  initUI("aiScore.html", "Search candidates...");
  initPageAccess();

  // Load candidates into dropdown
  const res = await API.getCandidates({ limit: 200 });
  if (res && res.ok) {
    candidates = res.data.candidates;
    const sel = document.getElementById("candidateSelect");
    candidates.forEach((c) => {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = `${c.name} — ${c.position}`;
      sel.appendChild(o);
    });
  }

  // Show candidate preview on select
  document
    .getElementById("candidateSelect")
    .addEventListener("change", function () {
      const c = candidates.find((x) => x.id == this.value);
      const preview = document.getElementById("candidatePreview");
      if (c) {
        document.getElementById("prevPosition").textContent = c.position || "—";
        document.getElementById("prevExp").textContent =
          `${c.experience || 0} year${c.experience !== 1 ? "s" : ""}`;
        document.getElementById("prevSkills").textContent =
          c.skills || "Not specified";
        preview.style.display = "block";
      } else {
        preview.style.display = "none";
      }
    });
});

async function runAIScore() {
  const candidateId = document.getElementById("candidateSelect").value;
  const jobDesc = document.getElementById("jobDesc").value.trim();

  if (!candidateId) {
    Toast.warning("Please select a candidate.");
    return;
  }
  if (!jobDesc || jobDesc.length < 30) {
    Toast.warning("Please paste a full job description.");
    return;
  }

  // Show thinking state
  const btn = document.getElementById("scoreBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Analyzing...';

  document.getElementById("emptyResult").style.display = "none";
  document.getElementById("scoreResult").classList.remove("show");
  document.getElementById("thinkingPanel").classList.add("show");

  const res = await API.scoreResume({
    candidate_id: parseInt(candidateId),
    job_description: jobDesc,
  });

  document.getElementById("thinkingPanel").classList.remove("show");
  btn.disabled = false;
  btn.innerHTML = '<i class="fa fa-robot"></i> Run AI Score';

  if (!res || !res.ok) {
    Toast.error(res?.data?.message || "Scoring failed.");
    document.getElementById("emptyResult").style.display = "block";
    return;
  }

  const d = res.data;
  showResult(d);

  // Add to history
  const cand = candidates.find((x) => x.id == candidateId);
  scoredHistory.unshift({
    name: cand?.name || "Candidate",
    score: d.score,
    recommendation: d.recommendation,
    time: new Date(),
  });
  renderHistory();

  Toast.success(`Score saved! ${cand?.name} scored ${d.score}/100`);
}

function showResult(d) {
  document.getElementById("scoreResult").classList.add("show");

  // Animate ring
  const score = d.score;
  const circumference = 402;
  const offset = circumference - (score / 100) * circumference;
  const ring = document.getElementById("ringFill");

  // Color by score
  const color =
    score >= 80
      ? "#10b981"
      : score >= 65
        ? "#4f46e5"
        : score >= 45
          ? "#f59e0b"
          : "#ef4444";
  ring.style.stroke = color;

  setTimeout(() => {
    ring.style.strokeDashoffset = offset;
  }, 100);

  // Animate number
  let current = 0;
  const step = Math.ceil(score / 40);
  const counter = setInterval(() => {
    current = Math.min(current + step, score);
    document.getElementById("ringScore").textContent = current;
    if (current >= score) clearInterval(counter);
  }, 30);

  // Verdict
  const verdicts = {
    "Strong Hire": { text: "⭐ Strong Hire", cls: "strong" },
    Hire: { text: "✅ Good Match", cls: "good" },
    Maybe: { text: "🤔 Partial Match", cls: "avg" },
    "No Hire": { text: "❌ Weak Match", cls: "weak" },
  };
  const v = verdicts[d.recommendation] || {
    text: d.recommendation,
    cls: "good",
  };
  const vEl = document.getElementById("verdict");
  vEl.textContent = v.text;
  vEl.className = `verdict ${v.cls}`;

  // Summary
  document.getElementById("aiSummary").textContent = d.summary;
  document.getElementById("resultCandName").textContent =
    d.candidate_name || "—";

  // Strengths
  document.getElementById("strengthsList").innerHTML =
    (d.strengths || [])
      .map(
        (s) =>
          `<span class="tag-green"><i class="fa fa-check"></i> ${s}</span>`,
      )
      .join("") ||
    '<span style="font-size:13px;color:var(--text-muted)">None detected</span>';

  // Gaps
  document.getElementById("gapsList").innerHTML =
    (d.gaps || [])
      .map(
        (g) => `<span class="tag-red"><i class="fa fa-times"></i> ${g}</span>`,
      )
      .join("") ||
    '<span style="font-size:13px;color:var(--text-muted)">No major gaps</span>';

  // Breakdown bars
  document.getElementById("scoreBreakdown").innerHTML = (d.breakdown || [])
    .map(
      (b) => `
    <div class="sub-score">
      <div class="sub-score-header">
        <span>${b.label}</span>
        <span style="font-weight:700">${b.score}<span style="color:var(--text-muted);font-weight:400">/${b.max}</span></span>
      </div>
      <div class="sub-score-bar">
        <div class="sub-score-fill" style="width:${Math.round((b.score / b.max) * 100)}%;background:${b.color}"></div>
      </div>
    </div>`,
    )
    .join("");
}

function renderHistory() {
  if (!scoredHistory.length) return;
  document.getElementById("scoredHistory").innerHTML = scoredHistory
    .slice(0, 6)
    .map(
      (h) => `
    <div class="history-row">
      <div>
        <div style="font-weight:600;font-size:13px">${h.name}</div>
        <div style="font-size:11px;color:var(--text-muted)">${h.time.toLocaleTimeString()}</div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        ${statusBadge(h.recommendation)}
        <span style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:${h.score >= 80 ? "#10b981" : h.score >= 65 ? "#4f46e5" : h.score >= 45 ? "#f59e0b" : "#ef4444"}">${h.score}</span>
      </div>
    </div>`,
    )
    .join("");
}
