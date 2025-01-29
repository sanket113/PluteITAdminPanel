import {
  ref,
  onValue,
  push,
  update,
  remove,
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";
import { database } from "../js/firebase-config.js";
import { checkAuthStatus, logout } from "../js/session.js";

// DOM Elements
const categoryTitle = document.getElementById("category-title");
const itemGrid = document.getElementById("item-grid");
const addItemBtn = document.getElementById("add-item-btn");
const addItemModal = document.getElementById("add-item-modal");
const closeModal = document.getElementById("close-modal");
const addItemForm = document.getElementById("add-item-form");
const categorySelectorsContainer =
  document.getElementById("category-selectors");
const logoutButton = document.getElementById("logout-button");

// Check session and display user details
checkAuthStatus((user) => {
  console.log(`User :${user.email}`);
});

// Logout button functionality
logoutButton.addEventListener("click", () => {
  logout();
});

// Extract the current categoryId from the URL
const urlParams = new URLSearchParams(window.location.search);
const categoryId = urlParams.get("categoryId");

// Fetch and display all categories (excluding current category)
const categoriesRef = ref(database, "categories");
let categories = {};
onValue(categoriesRef, (snapshot) => {
  categories = snapshot.val() || {};
  if (categories) {
    categorySelectorsContainer.innerHTML = ""; // Clear previous content
    Object.entries(categories).forEach(([catId, category]) => {
      if (catId !== categoryId) {
        // Create label and select element for each category
        const label = document.createElement("label");
        label.textContent = `${category.title}:`;

        const select = document.createElement("select");
        select.id = `select-${catId}`;
        select.classList.add("category-select");

        // Add a default option
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = `Select ${category.title}`;
        select.appendChild(defaultOption);

        // Populate the dropdown with items in the category
        if (category.items) {
          Object.entries(category.items).forEach(([itemId, item]) => {
            const option = document.createElement("option");
            option.value = itemId;
            option.textContent = item.name;
            select.appendChild(option);
          });
        }

        // Append to the modal form
        categorySelectorsContainer.appendChild(label);
        categorySelectorsContainer.appendChild(select);
      }
    });
  }
});

// Fetch and display items for the current category
const categoryRef = ref(database, `categories/${categoryId}`);
onValue(categoryRef, (snapshot) => {
  const category = snapshot.val();
  if (category) {
    categoryTitle.textContent = `Items in "${category.title}"`;
    itemGrid.innerHTML = ""; // Clear the grid before updating

    if (category.items && typeof category.items === "object") {
      Object.entries(category.items).forEach(([itemId, item]) => {
        const card = document.createElement("div");
        card.classList.add("card");

        const img = document.createElement("img");
        img.src = item.logo || "default.jpeg";
        img.alt = `${item.name} image`;

        const cardContent = document.createElement("div");
        cardContent.classList.add("card-content");

        const title = document.createElement("h3");
        title.classList.add("card-title");
        title.textContent = item.name;

        const description = document.createElement("p");
        description.classList.add("card-subtitle");
        description.textContent = item.info;

        // Buttons container
        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add("button-container");

        // View Button
        const viewButton = document.createElement("button");
        viewButton.textContent = "View";
        viewButton.classList.add("btn", "view-btn");
        viewButton.addEventListener(
          "click",
          () =>
            (window.location.href = `detail-view.html?categoryId=${categoryId}&itemId=${itemId}`)
        );

        // Delete Button
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.classList.add("btn", "delete-btn");
        deleteButton.addEventListener("click", () => deleteItem(itemId));

        buttonContainer.appendChild(viewButton);
        buttonContainer.appendChild(deleteButton);

        cardContent.appendChild(title);
        cardContent.appendChild(description);
        cardContent.appendChild(buttonContainer);

        card.appendChild(img);
        card.appendChild(cardContent);
        itemGrid.appendChild(card);
      });
    } else {
      itemGrid.innerHTML = "<p>No items available in this category.</p>";
    }
  } else {
    console.error("Category not found or no data available.");
  }
});

// Add item modal functionality
addItemBtn.addEventListener("click", () => {
  addItemModal.classList.remove("hidden");
});

closeModal.addEventListener("click", () => {
  addItemModal.classList.add("hidden");
});

// Handle new item submission
addItemForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = document.getElementById("item-title").value;
  const description = document.getElementById("item-description").value;
  const image = document.getElementById("item-image").value;
  const uses = document.getElementById("item-uses").value;
  const basicRoadmap = document.getElementById("item-basic-roadmap").value;
  const roadmaps = [];

  for (let i = 1; i <= 4; i++) {
    const roadmap = document.getElementById(`item-roadmap${i}`).value;
    if (roadmap) {
      roadmaps.push(roadmap);
    }
  }

  // Collect selected items from other categories
  const relatedItems = {};
  document.querySelectorAll(".category-select").forEach((select) => {
    if (select.value) {
      const selectedCategoryId = select.id.replace("select-", "");

      // Fetch category name from the categories object
      const categoryName = categories[selectedCategoryId]
        ? categories[selectedCategoryId].title
        : "";

      // Fetch selected item id
      const selectedItemId = select.value;

      // Fetch item name from the selected category
      const selectedItemName =
        categories[selectedCategoryId]?.items[selectedItemId]?.name || "";

      // Store category name, item id and item name
      if (categoryName && selectedItemName) {
        relatedItems[selectedCategoryId] = {
          itemId: selectedItemId,
          itemName: selectedItemName,
        };
      }
    }
  });

  const newItem = {
    name: title,
    info: description,
    logo: image,
    uses: uses,
    basicRoadmap: basicRoadmap,
    roadmaps: roadmaps,
    relatedItems: relatedItems, // Store selected related items with category names and item details
  };

  const itemsRef = ref(database, `categories/${categoryId}/items`);

  push(itemsRef, newItem)
    .then(() => {
      alert("Item added successfully!");
      addItemForm.reset();
      addItemModal.classList.add("hidden");
    })
    .catch((error) => {
      console.error("Error adding item:", error);
    });
});

// Function to delete an item
function deleteItem(itemId) {
  if (confirm("Are you sure you want to delete this item?")) {
    const itemRef = ref(database, `categories/${categoryId}/items/${itemId}`);
    remove(itemRef)
      .then(() => {
        alert("Item deleted successfully!");
      })
      .catch((error) => {
        console.error("Error deleting item:", error);
      });
  }
}
