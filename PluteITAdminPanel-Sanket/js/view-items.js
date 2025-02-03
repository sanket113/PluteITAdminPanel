import {
  ref,
  get,
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
const categorySelectorsContainer = document.getElementById("category-selectors");
const logoutButton = document.getElementById("logout-button");

// Check session and display user details
checkAuthStatus((user) => {
  console.log(`User: ${user.email}`);
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
  categorySelectorsContainer.innerHTML = ""; // Clear previous content

  Object.entries(categories).forEach(([catId, category]) => {
    if (catId !== categoryId) {
      // Create category container
      const categoryContainer = document.createElement("div");
      categoryContainer.classList.add("category-container");
      categoryContainer.dataset.categoryId = catId;

      // Category title
      const categoryTitle = document.createElement("h4");
      categoryTitle.textContent = `${category.title}`;
      categoryContainer.appendChild(categoryTitle);

      // Checkbox group
      const checkboxGroup = document.createElement("div");
      checkboxGroup.classList.add("checkbox-group");

      // Populate checkboxes with items
      if (category.items) {
        Object.entries(category.items).forEach(([itemId, item]) => {
          const checkboxWrapper = document.createElement("div");
          checkboxWrapper.classList.add("checkbox-wrapper");

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.value = itemId;
          checkbox.id = `checkbox-${itemId}`;
          checkbox.classList.add("category-checkbox");

          const label = document.createElement("label");
          label.htmlFor = `checkbox-${itemId}`;
          label.textContent = item.name;

          checkboxWrapper.appendChild(checkbox);
          checkboxWrapper.appendChild(label);
          checkboxGroup.appendChild(checkboxWrapper);
        });
      }

      categoryContainer.appendChild(checkboxGroup);
      categorySelectorsContainer.appendChild(categoryContainer);
    }
  });
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
addItemForm.addEventListener("submit", async (e) => {
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

  // Collect selected related items
  const relatedItemsByCategory = {};
  const relatedItemsToUpdate = [];

  document.querySelectorAll(".category-container").forEach((categoryDiv) => {
    const selectedCategoryId = categoryDiv.dataset.categoryId;
    const categoryName = categories[selectedCategoryId]?.title || "";

    const selectedItems = Array.from(
      categoryDiv.querySelectorAll(".category-checkbox:checked")
    );

    selectedItems.forEach((checkbox) => {
      const selectedItemId = checkbox.value;
      const selectedItemName =
        categories[selectedCategoryId]?.items[selectedItemId]?.name || "";

      if (categoryName && selectedItemName) {
        if (!relatedItemsByCategory[categoryName]) {
          relatedItemsByCategory[categoryName] = {};
        }
        relatedItemsByCategory[categoryName][selectedItemId] = selectedItemName;

        // Store related item details for updating the reverse relation
        relatedItemsToUpdate.push({ selectedCategoryId, selectedItemId, selectedItemName });
      }
    });
  });

  const newItem = {
    name: title,
    info: description,
    logo: image,
    uses: uses,
    basicRoadmap: basicRoadmap,
    roadmaps: roadmaps,
    relatedItemsByCategory: relatedItemsByCategory,
  };

  const itemsRef = ref(database, `categories/${categoryId}/items`);

  try {
    const newItemRef = push(itemsRef, newItem);
    const newItemId = newItemRef.key; // Get UID of the newly added item

    // Add reverse relations in related items
    for (const { selectedCategoryId, selectedItemId, selectedItemName } of relatedItemsToUpdate) {
      const relatedItemRef = ref(
        database,
        `categories/${selectedCategoryId}/items/${selectedItemId}/relatedItemsByCategory/${categories[categoryId]?.title}`
      );

      // Fetch existing relations to avoid duplicates
      const snapshot = await get(relatedItemRef);

      if (!snapshot.exists() || !snapshot.val()[newItemId]) {
        // Add the reverse relation only if it's not already there
        await update(relatedItemRef, { [newItemId]: title });
      }
    }

    alert("Item added successfully!");
    addItemForm.reset();
    addItemModal.classList.add("hidden");
  } catch (error) {
    console.error("Error adding item:", error);
  }
});

// Function to delete an item
async function deleteItem(itemId) {
  if (!confirm("Are you sure you want to delete this item?")) return;

  const itemRef = ref(database, `categories/${categoryId}/items/${itemId}`);

  try {
    const snapshot = await get(itemRef);
    const itemData = snapshot.val();

    if (!itemData) {
      console.error("Item not found in the database.");
      return;
    }
    
    console.log("Item Data:", itemData); // Log the item data for debugging

    // Loop through the relatedItemsByCategory and delete reverse relationships from other categories
    if (itemData && itemData.relatedItemsByCategory) {
      for (const [relatedCategory, relatedItems] of Object.entries(itemData.relatedItemsByCategory)) {
        // Loop through all the related items
        for (const [relatedItemId, relatedItemName] of Object.entries(relatedItems)) {
          // Construct the reference to the reverse relationship for this category
          const reverseRef = ref(
            database,
            `categories/${relatedCategory}/items/${relatedItemId}/relatedItemsByCategory/${categories[categoryId]?.title}/${itemId}`
          );

          console.log(`Deleting reverse relation for ${relatedCategory}: ${reverseRef.toString()}`);
          await remove(reverseRef); // Remove the reverse relationship in the related category
        }
      }
    }

    // Now remove the item itself from the current category
    await remove(itemRef);
    console.log("Item deleted from category");

    alert("Item and its relationships deleted successfully!");
  } catch (error) {
    console.error("Error deleting item:", error);
  }
}
