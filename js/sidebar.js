import {
  ref,
  onValue,
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";
import { database } from "../js/firebase-config.js";
import { checkAuthStatus, logout } from "../js/session.js";
import { testDomainUrl } from "../js/constant.js";

const showSidebar = (toggleId, sidebarId, headerId) => {
  const toggle = document.getElementById(toggleId),
    sidebar = document.getElementById(sidebarId),
    header = document.getElementById(headerId);

  if (toggle && sidebar && header) {
    toggle.addEventListener("click", () => {
      /* Show sidebar */
      sidebar.classList.toggle("show-sidebar");
      /* Add padding header */
      header.classList.toggle("left-pd");
    });
  } else {
    console.error("One or more elements not found");
  }
};

/*=============== LINK ACTIVE ===============*/
function setupActiveLinks() {
  const sidebarLinks = document.querySelectorAll(".sidebar__list a");

  // Remove active class from all links first
  sidebarLinks.forEach((l) => l.classList.remove("active-link"));

  // Retrieve the active link from localStorage
  const activeLink = localStorage.getItem("activeLink");

  if (activeLink) {
    let found = false;
    sidebarLinks.forEach((l) => {
      if (!found && l.href.includes(activeLink)) {
        l.classList.add("active-link");
        found = true; // Ensure only one element gets activated
      }
    });
  }

  // Add event listener to update active link on click
  sidebarLinks.forEach((l) => {
    l.addEventListener("click", (event) => {
      localStorage.setItem("activeLink", event.currentTarget.href);
    });
  });
}

function getCurrentCategoryFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("categoryId"); // Returns the category ID from the URL
}

function loadCategories() {
  const dbRef = ref(database, testDomainUrl);
  const menu = document.getElementById("sidebar__list");

  onValue(dbRef, (snapshot) => {
    // Clear existing dynamically added category items
    document
      .querySelectorAll(".category-item")
      .forEach((item) => item.remove());

    const currentCategoryId = getCurrentCategoryFromUrl();

    snapshot.forEach((childSnapshot) => {
      const categoryId = childSnapshot.key;
      const categoryData = childSnapshot.val();
      const title = categoryData.title;
      const imageUrl = categoryData.image || "default.jepg";

      if (title) {
        // Create the list item
        const li = document.createElement("li");
        li.classList.add("category-item");

        // Create the anchor tag
        const a = document.createElement("a");
        a.href = `view-items.html?categoryId=${categoryId}`;
        a.classList.add("sidebar__link");

        // Create the icon element
        // const icon = document.createElement("i");
        // icon.classList.add("ri-folder-fill"); // Use an appropriate icon

        //Create the image element
        const img = document.createElement("img");
        img.src = imageUrl;
        img.alt = "ri-folder-fill";
        img.classList.add("category-icon");

        // Create the span for the title
        const span = document.createElement("span");
        span.textContent = title;

        // Append the icon and span to the anchor tag
        a.appendChild(img);
        a.appendChild(span);

        // Append the anchor tag to the list item
        li.appendChild(a);

        // Append the list item to the menu
        menu.appendChild(li);
        if (categoryId === currentCategoryId) {
          loadCategoryTitle(title);
        }
      }
    });

    setTimeout(setupActiveLinks, 200);
  });
}

// Initialize sidebar
document.addEventListener("DOMContentLoaded", () => {
  fetch("sidebar.html")
    .then((response) => response.text())
    .then((html) => {
      document.getElementById("sidebar-container").innerHTML = html;
      loadCategories();

      showSidebar("header-toggle", "sidebar", "header");
      setupActiveLinks();

      const adminName = document.getElementById("admin-name");
      const logoutButton = document.getElementById("logout-button");

      checkAuthStatus((user) => {
        // Display the user's email or name in the admin panel
        adminName.textContent = user.email || "Admin";
      });

      // Logout button functionality
      logoutButton.addEventListener("click", () => {
        logout();
      });
    })
    .catch((error) => console.error("Error loading sidebar:", error));
});

function loadCategoryTitle(categoryName) {
  const categoryTitle = document.getElementById("category-title");
  if (categoryTitle) {
    categoryTitle.textContent = `Items in ${categoryName}`;
  }
}

export const title = "Existing Categories";
