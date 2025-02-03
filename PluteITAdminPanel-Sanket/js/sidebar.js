import {
  ref,
  onValue,
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";
import { database } from "../js/firebase-config.js";

// Function to load categories dynamically
function loadCategories() {
  const dbRef = ref(database, "categories");
  const menu = document.getElementById("sidebar-menu");

  onValue(dbRef, (snapshot) => {
    document
      .querySelectorAll(".category-item")
      .forEach((item) => item.remove());

    snapshot.forEach((childSnapshot) => {
      const categoryId = childSnapshot.key;
      const categoryData = childSnapshot.val();
      const title = categoryData.title;

      if (title) {
        const li = document.createElement("li");
        li.classList.add("category-item");

        const a = document.createElement("a");
        a.href = `view-items.html?categoryId=${categoryId}`;
        a.textContent = title;

        li.appendChild(a);
        menu.appendChild(li);
      }
    });
  });
}

// Initialize sidebar
document.addEventListener("DOMContentLoaded", () => {
  fetch("sidebar.html")
    .then((response) => response.text())
    .then((html) => {
      document.getElementById("sidebar-container").innerHTML = html;
      loadCategories();
    })
    .catch((error) => console.error("Error loading sidebar:", error));
});
