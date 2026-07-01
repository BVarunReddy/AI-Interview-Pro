// viewInterviews.js
let allInterviews = [];

document.addEventListener("DOMContentLoaded", () => {
  if (!Auth.requireAuth()) return;
  initDarkMode();
  initDarkMode();
  initUI("viewInterviews.html", "Search interviews...");
  initPageAccess();
  loadInterviews();

  let t;
  document.getElementById("searchInput").addEventListener("input", (e) => {
    clearTimeout(t);
    t = setTimeout(() => renderTable(), 300);
  });
  document
    .getElementById("roundFilter")
    .addEventListener("change", renderTable);
  document
    .getElementById("statusFilter")
    .addEventListener("change", renderTable);
});

async function loadInterviews() {
  const res = await API.getInterviews();
  if (!res || !res.ok) {
    Toast.error("Failed to load interviews.");
    return;
  }
  allInterviews = res.data.interviews;
  renderTable();
}

function formatInterviewDate(dateVal) {
  if (!dateVal) return "—";
  try {
    // Handle MySQL date which may come as "2024-01-15T00:00:00.000Z" or "2024-01-15"
    const str = String(dateVal).split("T")[0];
    const [year, month, day] = str.split("-");
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch (e) {
    return "—";
  }
}

function formatInterviewTime(timeVal) {
  if (!timeVal) return "—";
  try {
    // Handle time like "10:30:00" or "T10:30:00.000Z"
    const str = String(timeVal).includes("T")
      ? String(timeVal).split("T")[1].substring(0, 5)
      : String(timeVal).substring(0, 5);
    const [hour, min] = str.split(":");
    const h = parseInt(hour);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${min} ${ampm}`;
  } catch (e) {
    return "—";
  }
}

function renderTable() {
  const search = document
    .getElementById("searchInput")
    .value.trim()
    .toLowerCase();
  const round = document.getElementById("roundFilter").value;
  const status = document.getElementById("statusFilter").value;

  let data = allInterviews;
  if (round !== "All") data = data.filter((i) => i.round_name === round);
  if (status !== "All") data = data.filter((i) => i.status === status);
  if (search)
    data = data.filter(
      (i) =>
        i.candidate_name.toLowerCase().includes(search) ||
        i.interviewer.toLowerCase().includes(search),
    );

  const tbody = document.getElementById("interviewTable");
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="6">
      <div class="empty-state">
        <div class="empty-icon"><i class="fa fa-calendar"></i></div>
        <div class="empty-title">No interviews found</div>
        <div class="empty-desc"><a href="scheduleInterview.html" style="color:#4f46e5">Schedule one now</a></div>
      </div></td></tr>`;
    return;
  }

  tbody.innerHTML = data
    .map(
      (i) => `
    <tr>
      <td>
        <div class="cand-cell">
          <div class="cand-avatar">${initials(i.candidate_name)}</div>
          <div>
            <div class="cand-name">${i.candidate_name}</div>
            <div class="cand-email">${i.position || ""}</div>
          </div>
        </div>
      </td>
      <td>${statusBadge(i.round_name)}</td>
      <td style="font-size:13px">${i.interviewer}</td>
      <td>
        <div style="font-size:13px;font-weight:500">${formatInterviewDate(i.interview_date)}</div>
        <div style="font-size:12px;color:#64748b">${formatInterviewTime(i.interview_time)}</div>
      </td>
      <td>
        ${statusBadge(i.status)}
        ${
          i.status === "Reschedule Requested" && i.reschedule_reason
            ? `<div style="font-size:11px;color:#9a3412;margin-top:4px;max-width:160px"><i class="fa fa-circle-info"></i> ${i.reschedule_reason}</div>`
            : ""
        }
      </td>
      <td>
        <div style="display:flex;gap:6px">
          ${
            i.status === "Scheduled"
              ? `
            <button class="btn btn-sm btn-success" onclick="updateStatus(${i.id},'Completed')" data-roles="admin,hr">
              <i class="fa fa-check"></i> Done
            </button>
            <button class="btn btn-sm btn-outline" onclick="updateStatus(${i.id},'Cancelled')" data-roles="admin,hr">
              Cancel
            </button>`
              : ""
          }
          ${
            i.status === "Reschedule Requested"
              ? `
            <button class="btn btn-sm btn-primary" onclick="updateStatus(${i.id},'Scheduled')" title="Mark as resolved — set a new time manually, then click this" data-roles="admin,hr">
              <i class="fa fa-rotate"></i> Mark Rescheduled
            </button>`
              : ""
          }
          <button class="btn btn-icon btn-sm" onclick="deleteInterview(${i.id})" style="color:#ef4444" title="Delete" data-roles="admin,hr">
            <i class="fa fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>`,
    )
    .join("");
  if (typeof initPageAccess === "function") initPageAccess();
}

async function updateStatus(id, status) {
  const res = await API.updateInterviewStatus(id, status);
  if (res && res.ok) {
    Toast.success(`Interview marked as ${status}.`);
    loadInterviews();
  } else Toast.error("Update failed.");
}

async function deleteInterview(id) {
  if (!confirm("Delete this interview? This cannot be undone.")) return;
  const res = await API.deleteInterview(id);
  if (res && res.ok) {
    Toast.success("Interview deleted.");
    loadInterviews();
  } else Toast.error("Delete failed.");
}
