// profile.js
document.addEventListener("DOMContentLoaded", async () => {
  if (!Auth.requireAuth()) return;
  initDarkMode();
  initDarkMode();
  initUI("profile.html", "Search...");
  loadProfile();
  loadStats();

  document
    .getElementById("profileForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = document.getElementById("saveBtn");
      btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving...';
      btn.disabled = true;

      const res = await API.updateProfile({
        name: document.getElementById("name").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        department: document.getElementById("department").value.trim(),
      });

      if (res && res.ok) {
        Toast.success("Profile updated successfully!");
        // Update stored user
        const user = Auth.getUser();
        user.name = document.getElementById("name").value.trim();
        localStorage.setItem("ats_user", JSON.stringify(user));
        loadProfile();
      } else {
        Toast.error(res?.data?.message || "Update failed.");
      }

      btn.innerHTML = '<i class="fa fa-save"></i> Save Changes';
      btn.disabled = false;
    });
});

async function loadProfile() {
  const res = await API.getProfile();
  if (!res || !res.ok) {
    Toast.error("Failed to load profile.");
    return;
  }
  const u = res.data.user;

  document.getElementById("profileInitials").textContent = initials(u.name);
  document.getElementById("profileName").textContent = u.name;
  document.getElementById("profileRole").textContent =
    u.role?.toUpperCase() || "USER";
  document.getElementById("profileEmail").textContent = u.email;
  document.getElementById("roleDisplay").textContent =
    u.role?.toUpperCase() || "USER";
  document.getElementById("memberSince").textContent = formatDate(u.created_at);

  document.getElementById("name").value = u.name || "";
  document.getElementById("email").value = u.email || "";
  document.getElementById("phone").value = u.phone || "";
  document.getElementById("department").value = u.department || "";
}

async function loadStats() {
  const [cRes, iRes, fRes] = await Promise.all([
    API.getCandidates({ limit: 1 }),
    API.getInterviews(),
    API.getFeedback(),
  ]);
  if (cRes?.ok)
    document.getElementById("statCandidates").textContent =
      cRes.data.total || 0;
  if (iRes?.ok)
    document.getElementById("statInterviews").textContent =
      iRes.data.interviews.length;
  if (fRes?.ok)
    document.getElementById("statFeedback").textContent =
      fRes.data.feedbacks.length;
}
