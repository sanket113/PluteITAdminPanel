import {
  ref,
  get,
  onValue,
  push,
  update,
  remove,
  set,
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";
import { database } from "../js/firebase-config.js";
import { checkAuthStatus, logout } from "../js/session.js";
import { testDomainUrl } from "../js/constant.js";
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
const categoriesRef = ref(database, testDomainUrl);
let categories = {};

onValue(categoriesRef, (categorySnapshot) => {
  const categories = categorySnapshot.val() || {};
  categorySelectorsContainer.innerHTML = ""; // Clear category selectors only once

  onValue(
    itemsRef,
    (itemsSnapshot) => {
      const items = itemsSnapshot.val() || {};

      categorySelectorsContainer.innerHTML = ""; // Clear existing categories before re-rendering

      Object.entries(categories).forEach(([catId, category]) => {
        if (catId !== categoryId) {
          // Exclude current category
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

          // Filter items that belong to this category
          Object.entries(items).forEach(([itemId, item]) => {
            if (item.categoryUid === catId) {
              const checkboxWrapper = document.createElement("div");
              checkboxWrapper.classList.add("checkbox-wrapper");

              const checkbox = document.createElement("input");
              checkbox.type = "checkbox";
              checkbox.value = itemId;
              checkbox.id = `checkbox-${itemId}`;
              checkbox.classList.add("category-checkbox");
              checkbox.setAttribute("data-item-name", item.name);

              const label = document.createElement("label");
              label.htmlFor = `checkbox-${itemId}`;
              label.textContent = item.name;

              checkboxWrapper.appendChild(checkbox);
              checkboxWrapper.appendChild(label);
              checkboxGroup.appendChild(checkboxWrapper);
            }
          });

          categoryContainer.appendChild(checkboxGroup);
          categorySelectorsContainer.appendChild(categoryContainer);
        }
      });
    },
    { onlyOnce: true }
  ); // Ensure items listener runs only once inside category loop
});

// Reference to all items in the database
const itemsRef = ref(database, "items");

onValue(itemsRef, (snapshot) => {
  itemGrid.innerHTML = ""; // Clear existing items

  if (snapshot.exists()) {
    const allItems = snapshot.val();
    const categoryItems = Object.entries(allItems).filter(
      ([_, item]) => item.categoryUid === categoryId
    );

    if (categoryItems.length > 0) {
      onValue(categoriesRef, (categorySnapshot) => {
        const categories = categorySnapshot.val() || {};
        if (categories[categoryId]) {
          categoryTitle.textContent = `Items in ${categories[categoryId].title}`;
        }
      });
      
      categoryItems.forEach(([itemId, item]) => {
        // Create item card
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
        viewButton.addEventListener("click", () => {
          window.location.href = `detail-view.html?categoryId=${categoryId}&itemId=${itemId}`;
        });

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
    console.error("No items found.");
    itemGrid.innerHTML = "<p>No items available.</p>";
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
addItemForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("item-title").value;
  const description = document.getElementById("item-description").value;
  const image = document.getElementById("item-image").value;
  const basicRoadmap = document.getElementById("item-basic-roadmap").value;
  const shortDescription = document.getElementById("short-description").value;
  const roadmaps = [];
  const all_about_img = document.getElementById("all=about-img").value;
  for (let i = 1; i <= 4; i++) {
    const roadmap = document.getElementById(`item-roadmap${i}`).value;
    if (roadmap) {
      roadmaps.push(roadmap);
    }
  }

  // Collect uses data (modified to store title and description separately)
  const uses = [];
  document.querySelectorAll(".use-entry").forEach((useDiv) => {
    const useName = useDiv.querySelector(".use-name").value;
    const useDescription = useDiv.querySelector(".use-description").value;
    if (useName && useDescription) {
      uses.push({
        title: useName, // Store name as title
        description: useDescription, // Store description as description
      });
    }
  });

  // Collect selected related items
  const relatedItemsByCategory = {};
  const relatedItemsToUpdate = [];

  document.querySelectorAll(".category-container").forEach((categoryDiv) => {
    const selectedCategoryId = categoryDiv.dataset.categoryId; // Use category UID instead of title

    const selectedItems = Array.from(
      categoryDiv.querySelectorAll(".category-checkbox:checked")
    );

    selectedItems.forEach((checkbox) => {
      const selectedItemId = checkbox.value;
      const itemName = checkbox.dataset.itemName;
      // || checkbox.getAttribute("data-item-name")

      if (!relatedItemsByCategory[selectedCategoryId]) {
        relatedItemsByCategory[selectedCategoryId] = {};
      }

      relatedItemsByCategory[selectedCategoryId][selectedItemId] = itemName; // Store as true
      relatedItemsToUpdate.push({
        selectedCategoryId,
        selectedItemId,
        itemName,
      });
    });
  });

  try {
    const newItemRef = push(ref(database, "items")); // Create a new item node
    const newItemId = newItemRef.key;

    const newItemData = {
      name: title,
      info: description,
      shortDescription: shortDescription,
      logo: image,
      uses: uses, // Now stores uses as objects with title and description
      basicRoadmap: basicRoadmap,
      roadmaps: roadmaps,
      allAbout: all_about_img,
      relatedItemsByCategory: relatedItemsByCategory,
      uid: "" + newItemRef.key,
      categoryUid: categoryId,
    };
    await set(newItemRef, newItemData); // Store new item in "items" collection

    // Append new item ID to the category’s "itemIds" list
    /*
    const categoryItemIdsRef = ref(database, `${testDomainUrl}/${categoryId}/itemIds`);
    const categorySnapshot = await get(categoryItemIdsRef);
    const currentItemIds = categorySnapshot.exists() ? categorySnapshot.val() : [];
*/
    //  await set(categoryItemIdsRef, [...currentItemIds, newItemId]); // Update category itemIds
    // Add reverse relations in related items
    for (const { selectedCategoryId, selectedItemId } of relatedItemsToUpdate) {
      const relatedItemRef = ref(
        database,
        `items/${selectedItemId}/relatedItemsByCategory/${categoryId}`
      );

      // Fetch existing relations to avoid overwriting
      const snapshot = await get(relatedItemRef);
      const existingRelations = snapshot.exists() ? snapshot.val() : {};

      // Fetch the new item's name
      const newItemSnapshot = await get(
        ref(database, `items/${newItemId}/name`)
      );
      const newItemName = newItemSnapshot.exists()
        ? newItemSnapshot.val()
        : "Unknown";

      existingRelations[newItemId] = newItemName; // Store UID as name instead of true
      await set(relatedItemRef, existingRelations);
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
    const itemRef = ref(database, `items/${itemId}`);
    const itemSnapshot = await get(itemRef);

    if (!itemSnapshot.exists()) {
      alert("Item not found!");
      return;
    }

    const itemData = itemSnapshot.val();

    // Step 1: Remove references from related items
    if (itemData.relatedItemsByCategory) {
      for (const [relatedCategoryId, relatedItems] of Object.entries(
        itemData.relatedItemsByCategory
      )) {
        for (const relatedItemId of Object.keys(relatedItems)) {
          // Reference to the related item's category
          const relatedItemRef = ref(
            database,
            `items/${relatedItemId}/relatedItemsByCategory/${categoryId}`
          );

          // Fetch the related item reference
          const relatedItemSnapshot = await get(relatedItemRef);
          if (relatedItemSnapshot.exists()) {
            let relatedItemData = relatedItemSnapshot.val();

            // Remove the deleted item's reference
            delete relatedItemData[itemId];

            // If no more related items exist, remove the node entirely
            if (Object.keys(relatedItemData).length === 0) {
              await remove(relatedItemRef);
            } else {
              await set(relatedItemRef, relatedItemData);
            }
          }
        }
      }
    }

    // Step 2: Remove the item itself
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
