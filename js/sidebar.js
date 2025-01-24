// Dynamically load the sidebar
document.addEventListener("DOMContentLoaded", () => {
    const sidebarContainer = document.getElementById("sidebar-container");
    fetch("sidebar.html")
      .then((response) => response.text())
      .then((html) => {
        sidebarContainer.innerHTML = html;
      })
      .catch((error) => {
        console.error("Error loading sidebar:", error);
      });
  });
  