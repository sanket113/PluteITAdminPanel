import {
  getDatabase,
  ref,
  push,
  onValue,
  remove,
  update,
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";
import { checkAuthStatus, logout } from "../js/session.js";
import { database } from "../js/firebase-config.js";
import { testDomainUrl } from "../js/constant.js";

// Check if user is authenticated
checkAuthStatus((user) => {
  console.log(`User logged in: ${user.email}`);
});

// DOM Elements
const categoryForm = document.getElementById("add-category-form");
const categoryGrid = document.getElementById("category-grid");
const logoutButton = document.getElementById("logout-button");
const addCategoryBtn = document.getElementById("add-category-btn");
const modal = document.getElementById("add-category-modal");
const closeModal = document.getElementById("close-modal");
const editCategoryModal = document.getElementById("edit-category-modal"); // Edit modal
const closeEditModal = document.getElementById("close-edit-modal");
const editCategoryForm = document.getElementById("edit-category-form"); // Edit form

let currentCategoryId = null; // Store the ID of the category being edited

// Logout functionality
logoutButton.addEventListener("click", logout);

// Open add modal
addCategoryBtn.addEventListener("click", () => {
  modal.classList.remove("hidden");
});

// Close add modal
closeModal.addEventListener("click", () => {
  modal.classList.add("hidden");
});

// Close edit modal
closeEditModal.addEventListener("click", () => {
  editCategoryModal.classList.add("hidden");
  currentCategoryId = null; // Reset the ID
});

// Handle category form submission
categoryForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = document.getElementById("category-title").value;
  const subtitle = document.getElementById("category-subtitle").value;
  const image = document.getElementById("category-image").value;
  const Ui_type = document.getElementById("category-type").value;

  // Create a new category object
  const newCategory = {
    title,
    subtitle,
    image,
    Ui_type,
    items: [], // Initialize with an empty items array
  };

  console.log(newCategory);

  // Reference to the "categories" node in the database
  const categoriesRef = ref(database, testDomainUrl);

  // Add the new category to the database
  push(categoriesRef, newCategory)
    .then(() => {
      alert("Category added successfully!");
      categoryForm.reset();
      modal.classList.add("hidden");
    })
    .catch((error) => {
      console.error("Error adding category:", error);
    });
});

// Display existing categories in real-time
const categoriesRef = ref(database, testDomainUrl);
onValue(categoriesRef, (snapshot) => {
  categoryGrid.innerHTML = ""; // Clear the grid before updating

  snapshot.forEach((childSnapshot) => {
    const categoryId = childSnapshot.key; // Get the unique ID of the category
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

    // Buttons container
    const buttonContainer = document.createElement("div");
    buttonContainer.classList.add("button-container");

    //View button
    const viewButton = document.createElement("button");
    viewButton.textContent = "View";
    viewButton.classList.add("view-btn");
    viewButton.addEventListener("click", () => {
      // Show languages and information for the selected category
      window.location.href = `view-items.html?categoryId=${categoryId}`;
    });

    // card.addEventListener("click", () => {
    //   window.location.href = `view-items.html?categoryId=${categoryId}`;
    // });

    // Edit button
    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.classList.add("edit-btn");
    editButton.addEventListener("click", () => {
      // Open the edit modal and populate the form
      currentCategoryId = categoryId; // Store the category ID being edited
      document.getElementById("edit-category-title").value = category.title;
      document.getElementById("edit-category-subtitle").value =
        category.subtitle;
      document.getElementById("edit-category-image").value = category.image;
      document.getElementById("edit-category-type").value = category.Ui_type;

      editCategoryModal.classList.remove("hidden"); // Show the edit modal
    });

    // Delete button
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.classList.add("delete-btn");
    deleteButton.addEventListener("click", async () => {
      const confirmDelete = confirm(
        `Are you sure you want to delete the category "${category.title}" and all its related items?`
      );
    
      if (confirmDelete) {
        const categoryRef = ref(database, `categories/${categoryId}`);
        const itemsRef = ref(database, `items`);
    
        try {
          // Delete the category itself
          await remove(categoryRef);
    
          // Fetch all items to find the ones related to this category
          onValue(
            itemsRef,
            async (snapshot) => {
              if (snapshot.exists()) {
                const updates = {};
    
                snapshot.forEach((childSnapshot) => {
                  const itemId = childSnapshot.key;
                  const itemData = childSnapshot.val();
    
                  // If the item belongs to the category, mark it for deletion
                  if (itemData.categoryUid === categoryId) {
                    updates[`items/${itemId}`] = null; // Mark item for deletion
                  }
    
                  // Remove category references from relatedItemsByCategory
                  if (itemData.relatedItemsByCategory?.[categoryId]) {
                    updates[`items/${itemId}/relatedItemsByCategory/${categoryId}`] =
                      null;
                  }
                });
    
                // Perform all deletions at once
                if (Object.keys(updates).length > 0) {
                  await update(ref(database), updates);
                }
              }
            },
            { onlyOnce: true }
          );
    
          alert(`Category "${category.title}" and all related items deleted successfully.`);
        } catch (error) {
          console.error("Error deleting category:", error);
        }
      }
    });
    

    // Append buttons to button container
    // buttonContainer.appendChild(viewButton);
    buttonContainer.appendChild(editButton);
    buttonContainer.appendChild(deleteButton);

    // Append elements to the card
    cardContent.appendChild(title);
    cardContent.appendChild(subtitle);
    card.appendChild(img);
    card.appendChild(cardContent);
    card.appendChild(buttonContainer);

    // Add the card to the grid
    categoryGrid.appendChild(card);
  });
});

// Handle editing a category
// Handle editing a category
editCategoryForm.addEventListener("submit", (e) => {
  e.preventDefault();

  if (!currentCategoryId) {
    alert("No category selected for editing.");
    return;
  }

  // Get existing category data from Firebase
  const categoryRef = ref(database, `${testDomainUrl}/${currentCategoryId}`);

  onValue(
    categoryRef,
    (snapshot) => {
      const existingCategory = snapshot.val();

      const updatedTitle = document.getElementById("edit-category-title").value;
      const updatedSubtitle = document.getElementById(
        "edit-category-subtitle"
      ).value;
      const updatedImage = document.getElementById("edit-category-image").value;
      const updatedType = document.getElementById("edit-category-type").value;

      let updates = {};
      let updateMessages = [];

      // Compare values and only update changed fields
      if (updatedTitle !== existingCategory.title) {
        updates.title = updatedTitle;
        updateMessages.push("Title updated successfully.");
      }
      if (updatedSubtitle !== existingCategory.subtitle) {
        updates.subtitle = updatedSubtitle;
        updateMessages.push("Subtitle updated successfully.");
      }
      if (updatedImage !== existingCategory.image) {
        updates.image = updatedImage;
        updateMessages.push("Image updated successfully.");
      }
      if (updatedType !== existingCategory.Ui_type) {
        updates.Ui_type = updatedType;
        updateMessages.push("UI Type updated successfully.");
      }

      if (Object.keys(updates).length === 0) {
        alert("No changes were made.");
        return;
      }

      // Update the category in Firebase
      update(categoryRef, updates)
        .then(() => {
          alert(updateMessages.join("\n")); // Show only updated fields
          editCategoryModal.classList.add("hidden"); // Close the modal
          currentCategoryId = null; // Reset the ID
        })
        .catch((error) => {
          console.error("Error updating category:", error);
          alert("Failed to update category. Please try again.");
        });
    },
    { onlyOnce: true }
  );
});
