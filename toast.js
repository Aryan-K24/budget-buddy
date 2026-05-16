export function showToast(message, type = "info", position = "bottom") {
  const toast = document.createElement("div");
  toast.className = "toast";

  if (type === "success") toast.style.background = "#16a34a";
  if (type === "error")   toast.style.background = "#dc2626";
  if (type === "warning") toast.style.background = "#d97706";
  if (type === "info")    toast.style.background = "#7c3aed";

  // Position
  if (position === "top") {
    toast.style.bottom = "auto";
    toast.style.top = "24px";
    toast.style.transform = "translateX(-50%) translateY(-20px)";
  }

  toast.innerText = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    if (position === "top") {
      toast.style.transform = "translateX(-50%) translateY(0)";
      toast.style.opacity = "1";
    }
    toast.classList.add("show");
  }, 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}