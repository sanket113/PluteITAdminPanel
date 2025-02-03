import {
  ref,
  get,
  onValue,
  push,
  update,
  set,
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
const usesContainer = document.getElementById("uses-container"); // Container for uses
const addUseButton = document.getElementById("add-use-btn"); // Button for adding uses

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

        const shortDescription = document.createElement("p"); // Add short description
        shortDescription.classList.add("card-short-description");
        shortDescription.textContent = item.shortDescription || "No short description available.";

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
        cardContent.appendChild(shortDescription); // Append short description
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
  // Remove all use entries when modal is closed
  const useEntries = document.querySelectorAll(".use-entry");
  useEntries.forEach((useEntry) => useEntry.remove());

  // Hide the modal
  addItemModal.classList.add("hidden");
});


// Handle new item submission
// Handle new item submission
addItemForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("item-title").value;
  const description = document.getElementById("item-description").value;
  const shortDescription = document.getElementById("item-short-description").value; // Capture short description
  const image = document.getElementById("item-image").value;
  const basicRoadmap = document.getElementById("item-basic-roadmap").value;
  const roadmaps = [];

  for (let i = 1; i <= 4; i++) {
    const roadmap = document.getElementById(`item-roadmap${i}`).value;
    if (roadmap) {
      roadmaps.push(roadmap);
    }
  }

  // Collect uses data
  const uses = [];
  document.querySelectorAll(".use-entry").forEach((useDiv) => {
    const useName = useDiv.querySelector(".use-name").value;
    const useDescription = useDiv.querySelector(".use-description").value;
    if (useName && useDescription) {
      uses.push({
        title: useName,
        description: useDescription,
      });
    }
  });

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

  

  const itemsRef = ref(database, `categories/${categoryId}/items`);
  const newItemRef = push(itemsRef);

  try {
    const newItem = {
      name: title,
      info: description,
      shortDescription: shortDescription,  // Add short description to item data
      logo: image,
      uses: uses,
      uid:""+newItemRef.key,
      basicRoadmap: basicRoadmap,
      roadmaps: roadmaps,
      relatedItemsByCategory: relatedItemsByCategory,
    };
    //const newItemId = newItemRef.key;
    await set(newItemRef,newItem);
    // Add reverse relations for related items
    for (const { selectedCategoryId, selectedItemId, selectedItemName } of relatedItemsToUpdate) {
      const relatedItemRef = ref(
        database,
        `categories/${selectedCategoryId}/items/${selectedItemId}/relatedItemsByCategory/${categories[categoryId]?.title}`
      );

      const snapshot = await get(relatedItemRef);

      if (!snapshot.exists() || !snapshot.val()[newItemId]) {
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
// Function to delete an item and its references
async function deleteItem(itemId) {
  if (!confirm("Are you sure you want to delete this item?")) return;

  try {
    const itemRef = ref(database, `categories/${categoryId}/items/${itemId}`);
    const itemSnapshot = await get(itemRef);

    if (!itemSnapshot.exists()) {
      alert("Item not found!");
      return;
    }

    const itemData = itemSnapshot.val();

    // Step 1: Remove references from related items
    if (itemData.relatedItemsByCategory) {
      for (const [relatedCategoryName, relatedItems] of Object.entries(
        itemData.relatedItemsByCategory
      )) {
        for (const [relatedItemId] of Object.entries(relatedItems)) {
          // Find the related category ID
          const relatedCategoryId = Object.keys(categories).find(
            (key) => categories[key].title === relatedCategoryName
          );

          if (relatedCategoryId) {
            const relatedItemRef = ref(
              database,
              `categories/${relatedCategoryId}/items/${relatedItemId}/relatedItemsByCategory/${categories[categoryId]?.title}`
            );

            // Fetch the related item's category reference
            const relatedItemSnapshot = await get(relatedItemRef);
            if (relatedItemSnapshot.exists()) {
              let relatedItemData = relatedItemSnapshot.val();

              console.log("Before Deletion");
              console.log(relatedItemData);

              // Collect keys to be deleted
              const itemsToDelete = [];

              for (const relatedItem in relatedItemData) {
                console.log(`Checking related item: ${relatedItem}`);
                if (relatedItem === itemId) {
                  console.log(`Marking for deletion: ${relatedItem}`);
                  itemsToDelete.push(relatedItem);
                }
              }

              console.log(itemsToDelete);

              // Delete marked items
              itemsToDelete.forEach((item) => {
                relatedItemData[item] = null;
              });

              if (Object.keys(relatedItemData).length === 0) {
                await remove(relatedItemRef);
              } else {
                await update(relatedItemRef, relatedItemData);
              }

              console.log("After Deletion");
              console.log(relatedItemData);
            }

            // Step 2: Check if the subcategory (e.g., "Languages") is empty and remove it
            const categoryRef = ref(
              database,
              `categories/${relatedCategoryId}/items/${relatedItemId}/relatedItemsByCategory`
            );
            const categorySnapshot = await get(categoryRef);

            if (categorySnapshot.exists()) {
              let relatedCategories = categorySnapshot.val();

              // Check if "Languages" (subcategory) is empty
              if (relatedCategories[relatedCategoryName]) {
                if (
                  Object.keys(relatedCategories[relatedCategoryName]).length ===
                  0
                ) {
                  delete relatedCategories[relatedCategoryName];

                  // If `relatedItemsByCategory` itself is empty, remove it entirely
                  if (Object.keys(relatedCategories).length === 0) {
                    await remove(categoryRef);
                  } else {
                    await update(categoryRef, relatedCategories);
                  }
                }
              }
            }
          }
        }
      }
    }

    // Step 3: Remove the item itself
    await remove(itemRef);
    alert("Item and its references deleted successfully!");
  } catch (error) {
    console.error("Error deleting item:", error);
  }
}



// Add new use case input fields
addUseButton.addEventListener("click", () => {
  const useEntry = document.createElement("div");
  useEntry.classList.add("use-entry");

  const useNameInput = document.createElement("input");
  useNameInput.type = "text";
  useNameInput.classList.add("use-name");
  useNameInput.placeholder = "Use Name";
  useEntry.appendChild(useNameInput);

  const useDescriptionInput = document.createElement("input");
  useDescriptionInput.type = "text";
  useDescriptionInput.classList.add("use-description");
  useDescriptionInput.placeholder = "Use Description";
  useEntry.appendChild(useDescriptionInput);

  usesContainer.appendChild(useEntry);
});
