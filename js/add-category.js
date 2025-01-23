import {
  getDatabase,
  ref,
  push,
  onValue,
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";
import { checkAuthStatus, logout } from "../js/session.js";
import { database } from "../js/firebase-config.js";

// Check if user is authenticated
checkAuthStatus((user) => {
  console.log(`User logged in: ${user.email}`);
});

// DOM Elements
const categoryForm = document.getElementById("add-category-form");
const categoryGrid = document.getElementById("category-grid");
const logoutButton = document.getElementById("logout-button");

// Logout functionality
logoutButton.addEventListener("click", logout);

// Handle category form submission
categoryForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = document.getElementById("category-title").value;
  const subtitle = document.getElementById("category-subtitle").value;
  const image = document.getElementById("category-image").value;

  // Create a new category object
  const newCategory = {
    title,
    subtitle,
    image,
    items: [], // Initialize with an empty items array
  };

  // Reference to the "categories" node in the database
  const categoriesRef = ref(database, "categories");

  // Add the new category to the database
  push(categoriesRef, newCategory)
    .then(() => {
      alert("Category added successfully!");
      categoryForm.reset();
    })
    .catch((error) => {
      console.error("Error adding category:", error);
    });
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
