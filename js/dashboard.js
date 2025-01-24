import { database } from "../js/firebase-config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";
import { checkAuthStatus, logout } from "../js/session.js";

// DOM Elements
const categoryGrid = document.getElementById("category-grid");
const adminName = document.getElementById("admin-name");
const logoutButton = document.getElementById("logout-button");

// Check if the user is authenticated
checkAuthStatus((user) => {
  // Display the user's email or name in the admin panel
  adminName.textContent = user.email || "Admin";
});

// Logout button functionality
logoutButton.addEventListener("click", () => {
  logout();
});

// Display existing categories in real-time
const categoriesRef = ref(database, "categories");
onValue(categoriesRef, (snapshot) => {
  categoryGrid.innerHTML = ""; // Clear the grid before updating

  snapshot.forEach((childSnapshot) => {
    const category = childSnapshot.val();

    // Create a card for each category
    const card = document.createElement("div");
    card.classList.add("card");

    const img = document.createElement("img");
    img.src = category.image;
    img.alt = `${category.title} image`;

    const cardContent = document.createElement("div");
    cardContent.classList.add("card-content");

    const title = document.createElement("h3");
    title.classList.add("card-title");
    title.textContent = category.title;

    const subtitle = document.createElement("p");
    subtitle.classList.add("card-subtitle");
    subtitle.textContent = category.subtitle;

    // Append elements to the card
    cardContent.appendChild(title);
    cardContent.appendChild(subtitle);
    card.appendChild(img);
    card.appendChild(cardContent);

    // Add the card to the grid
    categoryGrid.appendChild(card);
  });
});
