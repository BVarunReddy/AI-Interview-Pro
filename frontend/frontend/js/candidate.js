// candidate.js
document.addEventListener("DOMContentLoaded", () => {
  if (!Auth.requireAuth()) return;
  initDarkMode();
  initDarkMode();
  initUI("addCandidate.html", "Search candidates...");
  initPageAccess();

  // File drag & drop
  const drop = document.getElementById("fileDrop");
  const fileInput = document.getElementById("resumeFile");

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    document.getElementById("fileName").textContent = file
      ? `📎 ${file.name}`
      : "";
  });

  drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    drop.classList.add("drag");
  });
  drop.addEventListener("dragleave", () => drop.classList.remove("drag"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("drag");
    fileInput.files = e.dataTransfer.files;
    const file = fileInput.files[0];
    document.getElementById("fileName").textContent = file
      ? `📎 ${file.name}`
      : "";
  });

  // Form submit
  document
    .getElementById("candidateForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("submitBtn");
      btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Adding...';
      btn.disabled = true;

      const fd = new FormData();
      fd.append("name", document.getElementById("name").value.trim());
      fd.append("email", document.getElementById("email").value.trim());
      fd.append("phone", document.getElementById("phone").value.trim());
      fd.append("position", document.getElementById("position").value.trim());
      fd.append("experience", document.getElementById("experience").value || 0);
      fd.append("skills", document.getElementById("skills").value.trim());
      fd.append("status", document.getElementById("status").value);
      if (fileInput.files[0]) fd.append("resume", fileInput.files[0]);

      const res = await API.addCandidate(fd);

      if (res && res.ok) {
        Toast.success("Candidate added successfully!");
        document.getElementById("candidateForm").reset();
        document.getElementById("fileName").textContent = "";
      } else if (res && res.status === 409) {
        showDuplicateModal(res?.data?.message);
      } else {
        Toast.error(res?.data?.message || "Failed to add candidate.");
      }

      btn.innerHTML = '<i class="fa fa-user-plus"></i> Add Candidate';
      btn.disabled = false;
    });
});

// ── Duplicate candidate modal (blocks submission, requires acknowledgement) ──
function showDuplicateModal(message) {
  let modal = document.getElementById("duplicateModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "duplicateModal";
    modal.style.cssText =
      "display:flex;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:999;align-items:center;justify-content:center";
    modal.innerHTML = `
      <div style="background:var(--surface);border-radius:16px;padding:28px;max-width:380px;box-shadow:var(--shadow-lg);text-align:center">
        <div style="font-size:32px;color:#ef4444;margin-bottom:10px"><i class="fa fa-triangle-exclamation"></i></div>
        <h3 style="margin-bottom:10px;font-family:'Syne',sans-serif">Duplicate Candidate</h3>
        <p id="duplicateModalMsg" style="font-size:14px;color:#64748b;margin-bottom:20px"></p>
        <button class="btn btn-primary" style="width:100%" onclick="document.getElementById('duplicateModal').style.display='none'">Got it</button>
      </div>`;
    document.body.appendChild(modal);
  }
  document.getElementById("duplicateModalMsg").textContent =
    message || "A candidate with this email already exists.";
  modal.style.display = "flex";
}
