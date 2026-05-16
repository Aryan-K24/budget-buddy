// logout.js
import { logoutUser } from "./auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", async e => {
    e.preventDefault();
    await logoutUser();
  });
});