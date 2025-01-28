import {
  ref,
  onValue,
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";
import { database } from "../js/firebase-config.js";
import { checkAuthStatus, logout } from "../js/session.js";

// Extract the categoryId and itemId from the URL
const urlParams = new URLSearchParams(window.location.search);
const categoryId = urlParams.get("categoryId");
const itemId = urlParams.get("itemId");

// DOM Elements
const itemDetailsContainer = document.getElementById("item-details-container");
const logoutButton = document.getElementById("logout-button");
const adminName = document.getElementById("admin-name");

// Check session and display user details
checkAuthStatus((user) => {
  // Show the admin's email or name
  adminName.textContent = user.email || "Admin";
});

// Logout button functionality
logoutButton.addEventListener("click", () => {
  logout();
});

// Fetch and display item details
const itemRef = ref(database, `categories/${categoryId}/items/${itemId}`);
onValue(itemRef, (snapshot) => {
  const item = snapshot.val();
  if (item) {
    itemDetailsContainer.innerHTML = `
      <div class="detail-card">
        <img src="${item.logo}" alt="${item.name} image" />
        <h2>${item.name}</h2>
        <p>${item.info}</p>
      </div>
    `;
  } else {
    itemDetailsContainer.innerHTML =
      "<p>Item not found or no data available.</p>";
  }
});
