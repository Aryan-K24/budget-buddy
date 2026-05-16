  export function initNavbar() {
    const toggle = document.getElementById("menuToggle");
    const nav = document.getElementById("mainNav");

    if (!toggle || !nav) return;

    toggle.onclick = (e) => {
      e.stopPropagation();
      nav.classList.toggle("active");
    };

    nav.querySelectorAll("a").forEach(link => {
      if (link.id === "logoutBtn") return;
      link.addEventListener("click", () => nav.classList.remove("active"));
    });

    document.addEventListener("click", (e) => {
      if (!nav.contains(e.target) && !toggle.contains(e.target)) {
        nav.classList.remove("active");
      }
    });
  }