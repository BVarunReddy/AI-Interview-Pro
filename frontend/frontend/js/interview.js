// interview.js
document.addEventListener("DOMContentLoaded", async () => {
  if (!Auth.requireAuth()) return;
  initUI("scheduleInterview.html", "");

  // Load candidates into dropdown
  const res = await API.getCandidates({ limit: 200 });
  if (res && res.ok) {
    const select = document.getElementById("candidate_id");
    res.data.candidates.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = `${c.name} — ${c.position}`;
      select.appendChild(opt);
    });
  }

  // Set min date to today
  document.getElementById("interview_date").min = new Date().toISOString().split("T")[0];

  document.getElementById("interviewForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("scheduleBtn");
    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Scheduling...';
    btn.disabled = true;

    const res = await API.scheduleInterview({
      candidate_id:    document.getElementById("candidate_id").value,
      round_name:      document.getElementById("round_name").value,
      interviewer:     document.getElementById("interviewer").value.trim(),
      interview_date:  document.getElementById("interview_date").value,
      interview_time:  document.getElementById("interview_time").value,
      notes:           document.getElementById("notes").value.trim(),
    });

    if (res && res.ok) {
      Toast.success("Interview scheduled successfully!");
      document.getElementById("interviewForm").reset();
    } else {
      Toast.error(res?.data?.message || "Scheduling failed.");
    }

    btn.innerHTML = '<i class="fa fa-calendar-check"></i> Schedule Interview';
    btn.disabled = false;
  });
});
