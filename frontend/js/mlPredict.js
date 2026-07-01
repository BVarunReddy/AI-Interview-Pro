// mlPredict.js
let candidates = [];
let predHistory = [];

document.addEventListener("DOMContentLoaded", async () => {
  if (!Auth.requireAuth()) return;
  initDarkMode();
  initDarkMode();
  initUI("mlPredict.html", "");

  const res = await API.getCandidates({ limit: 200 });
  if (res && res.ok) {
    candidates = res.data.candidates;
    const sel = document.getElementById("candidateSelect");
    if (sel) {
      candidates.forEach((c) => {
        const o = document.createElement("option");
        o.value = c.id;
        o.textContent = `${c.name} — ${c.position} (${c.experience || 0} yrs)`;
        sel.appendChild(o);
      });
    }
  }

  const selEl = document.getElementById("candidateSelect");
  if (selEl) {
    selEl.addEventListener("change", function () {
      const c = candidates.find((x) => x.id == this.value);
      const preview = document.getElementById("candPreview");
      if (!c || !preview) return;
      const fExp = document.getElementById("fExp");
      const fPos = document.getElementById("fPos");
      const fSkills = document.getElementById("fSkills");
      const fTech = document.getElementById("fTech");
      const fComm = document.getElementById("fComm");
      const fProb = document.getElementById("fProb");
      if (fExp) fExp.textContent = `${c.experience || 0} years`;
      if (fPos) fPos.textContent = c.position || "—";
      if (fSkills)
        fSkills.textContent =
          (c.skills || "").split(",").filter(Boolean).length || "—";
      if (fTech) fTech.textContent = "From latest feedback";
      if (fComm) fComm.textContent = "From latest feedback";
      if (fProb) fProb.textContent = "From latest feedback";
      preview.style.display = "block";
    });
  }

  loadHistory();
});

async function runPrediction() {
  const sel = document.getElementById("candidateSelect");
  if (!sel) return;
  const candidateId = sel.value;
  if (!candidateId) {
    Toast.warning("Please select a candidate.");
    return;
  }

  const btn = document.getElementById("predictBtn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Predicting...';
  }

  const emptyResult = document.getElementById("emptyResult");
  const predCard = document.getElementById("predCard");
  const thinkingPanel = document.getElementById("thinkingPanel");

  if (emptyResult) emptyResult.style.display = "none";
  if (predCard) predCard.className = "pred-card";
  if (thinkingPanel) thinkingPanel.style.display = "block";

  try {
    const res = await fetch(`${API_BASE}/ml/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Auth.getToken()}`,
      },
      body: JSON.stringify({ candidate_id: parseInt(candidateId) }),
    });
    const data = await res.json();

    if (thinkingPanel) thinkingPanel.style.display = "none";
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa fa-magic"></i> Run ML Prediction';
    }

    if (!data.success) {
      Toast.error(data.message || "Prediction failed.");
      if (emptyResult) emptyResult.style.display = "block";
      return;
    }

    showResult(data);

    const c = candidates.find((x) => x.id == candidateId);
    predHistory.unshift({
      name: c?.name || "Candidate",
      ...data,
      time: new Date(),
    });
    renderHistory();
    Toast.success(`Prediction complete: ${data.label}`);
  } catch (err) {
    if (thinkingPanel) thinkingPanel.style.display = "none";
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa fa-magic"></i> Run ML Prediction';
    }
    Toast.error("Server error: " + err.message);
    if (emptyResult) emptyResult.style.display = "block";
  }
}

function showResult(d) {
  const card = document.getElementById("predCard");
  if (!card) return;
  card.className = `pred-card ${d.category} show`;

  const emojis = { high: "🟢", medium: "🟡", low: "🔴" };
  const emoji = document.getElementById("predEmoji");
  const prob = document.getElementById("predProb");
  const label = document.getElementById("predLabel");
  const name = document.getElementById("predName");
  const bar = document.getElementById("probBarFill");

  if (emoji) emoji.textContent = emojis[d.category] || "🎯";
  if (prob) prob.textContent = `${d.probability}%`;
  if (label) label.textContent = d.label;
  if (name) name.textContent = d.candidate_name || "—";

  setTimeout(() => {
    if (bar) bar.style.width = `${d.probability}%`;
  }, 100);
}

async function loadHistory() {
  try {
    const res = await fetch(`${API_BASE}/ml/predictions`, {
      headers: { Authorization: `Bearer ${Auth.getToken()}` },
    });
    const data = await res.json();
    if (data.success && data.predictions.length) {
      predHistory = data.predictions.map((p) => ({
        name: p.name,
        label: p.ml_prediction,
        probability: p.ml_probability,
        category:
          p.ml_probability >= 70
            ? "high"
            : p.ml_probability >= 40
              ? "medium"
              : "low",
      }));
      renderHistory();
    }
  } catch (e) {}
}

function renderHistory() {
  const el = document.getElementById("predHistory");
  if (!el || !predHistory.length) return;
  el.innerHTML = predHistory
    .slice(0, 8)
    .map(
      (p) => `
    <div class="pred-history-row">
      <div>
        <div style="font-weight:600">${p.name}</div>
        <div style="font-size:11px;color:var(--text-muted)">${p.label || "—"}</div>
      </div>
      <span class="prob-pill ${p.category || "medium"}">${p.probability || 0}%</span>
    </div>`,
    )
    .join("");
}
