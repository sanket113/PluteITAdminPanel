import {
  ref,
  onValue,
  update,
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";
import { database } from "../js/firebase-config.js";
import { checkAuthStatus, logout } from "../js/session.js";

// Extract categoryId and itemId from the URL
const urlParams = new URLSearchParams(window.location.search);
const categoryId = urlParams.get("categoryId");
const itemId = urlParams.get("itemId");

// DOM Elements
const itemDetailsContainer = document.getElementById("item-details-container");
const logoutButton = document.getElementById("logout-button");
const categorySelectorsContainer =
  document.getElementById("category-selectors");
const saveButton = document.getElementById("save-button");

// Check authentication
checkAuthStatus((user) => {
  console.log(`Admin logged in: ${user.email}`);
});

// Logout functionality
logoutButton.addEventListener("click", logout);

// Fetch item details
const itemRef = ref(database, `categories/${categoryId}/items/${itemId}`);
onValue(itemRef, (snapshot) => {
  const item = snapshot.val();

  if (item) {
    // Populate UI
    itemDetailsContainer.innerHTML = `
      <div class="detail-card">
        <h2>Item Details</h2>
        ${generateFieldView("Name", "name", item.name)}
        ${generateFieldView("Logo URL", "logo", item.logo)}
        ${generateFieldView("Uses", "uses", item.uses)}
        ${generateFieldView(
          "Basic Roadmap URL",
          "basicRoadmap",
          item.basicRoadmap
        )}
        ${generateFieldView(
          "Roadmap URL 1",
          "roadmap1",
          item.roadmaps?.[0] || ""
        )}
        ${generateFieldView(
          "Roadmap URL 2",
          "roadmap2",
          item.roadmaps?.[1] || ""
        )}
        ${generateFieldView(
          "Roadmap URL 3",
          "roadmap3",
          item.roadmaps?.[2] || ""
        )}
        ${generateFieldView(
          "Roadmap URL 4",
          "roadmap4",
          item.roadmaps?.[3] || ""
        )}
        ${generateFieldView("Information", "info", item.info)}
      </div>
    `;

    // Fetch and display related items selection
    fetchCategoriesForRelationship(item.relatedItemsByCategory || {});

    // Enable field editing
    document.querySelectorAll(".edit-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const field = button.dataset.field;
        const input = document.getElementById(`input-${field}`);
        input.removeAttribute("disabled");
        input.focus();
      });
    });

    // Save button event
    saveButton.onclick = saveItemDetails;
  }
});

// Fetch categories and display related item checkboxes
function fetchCategoriesForRelationship(currentRelatedItems) {
  const categoriesRef = ref(database, "categories");

  onValue(categoriesRef, (snapshot) => {
    const categories = snapshot.val() || {};
    categorySelectorsContainer.innerHTML = ""; // Clear previous content

    Object.entries(categories).forEach(([catId, category]) => {
      if (catId !== categoryId) {
        const categoryContainer = document.createElement("div");
        categoryContainer.classList.add("category-container");
        categoryContainer.dataset.categoryId = catId;

        const categoryTitle = document.createElement("h4");
        categoryTitle.textContent = category.title;
        categoryContainer.appendChild(categoryTitle);

        const checkboxGroup = document.createElement("div");
        checkboxGroup.classList.add("checkbox-group");

        if (category.items) {
          Object.entries(category.items).forEach(
            ([relatedItemId, relatedItem]) => {
              const checkboxWrapper = document.createElement("div");
              checkboxWrapper.classList.add("checkbox-wrapper");

              const checkbox = document.createElement("input");
              checkbox.type = "checkbox";
              checkbox.value = relatedItemId;
              checkbox.id = `checkbox-${relatedItemId}`;
              checkbox.classList.add("category-checkbox");

              if (
                currentRelatedItems[category.title] &&
                currentRelatedItems[category.title][relatedItemId]
              ) {
                checkbox.checked = true;
              }

              const label = document.createElement("label");
              label.htmlFor = `checkbox-${relatedItemId}`;
              label.textContent = relatedItem.name;

              checkboxWrapper.appendChild(checkbox);
              checkboxWrapper.appendChild(label);
              checkboxGroup.appendChild(checkboxWrapper);
            }
          );
        }

        categoryContainer.appendChild(checkboxGroup);
        categorySelectorsContainer.appendChild(categoryContainer);
      }
    });

    // Store categories globally to fix 'categories is not defined' error
    window.categoriesData = categories;
  });
}

// Save item details, including related items
function saveItemDetails() {
  const name = document.getElementById("input-name").value;
  const logo = document.getElementById("input-logo").value;
  const uses = document.getElementById("input-uses").value;
  const basicRoadmap = document.getElementById("input-basicRoadmap").value;
  const roadmaps = [
    document.getElementById("input-roadmap1").value,
    document.getElementById("input-roadmap2").value,
    document.getElementById("input-roadmap3").value,
    document.getElementById("input-roadmap4").value,
  ];
  const info = document.getElementById("input-info").value;

  const relatedItemsByCategory = {};
  const relatedUpdates = {}; // Separate updates for relationships

  document.querySelectorAll(".category-container").forEach((categoryDiv) => {
    const selectedCategoryId = categoryDiv.dataset.categoryId;
    const categoryName = window.categoriesData[selectedCategoryId]?.title || "";

    const selectedItems = Array.from(
      categoryDiv.querySelectorAll(".category-checkbox:checked")
    );

    selectedItems.forEach((checkbox) => {
      const selectedItemId = checkbox.value;
      const selectedItemName =
        window.categoriesData[selectedCategoryId]?.items[selectedItemId]
          ?.name || "";

      if (categoryName && selectedItemName) {
        if (!relatedItemsByCategory[categoryName]) {
          relatedItemsByCategory[categoryName] = {};
        }
        relatedItemsByCategory[categoryName][selectedItemId] = selectedItemName;

        // Add relationship updates separately
        relatedUpdates[
          `categories/${categoryId}/items/${itemId}/relatedItemsByCategory/${categoryName}/${selectedItemId}`
        ] = selectedItemName;
        relatedUpdates[
          `categories/${selectedCategoryId}/items/${selectedItemId}/relatedItemsByCategory/${window.categoriesData[categoryId].title}/${itemId}`
        ] = name;
      }
    });

    // Remove unchecked relationships
    const previouslySelected =
      window.categoriesData[selectedCategoryId]?.items || {};
    Object.keys(previouslySelected).forEach((relatedItemId) => {
      if (!selectedItems.some((checkbox) => checkbox.value === relatedItemId)) {
        relatedUpdates[
          `categories/${categoryId}/items/${itemId}/relatedItemsByCategory/${categoryName}/${relatedItemId}`
        ] = null;
        relatedUpdates[
          `categories/${selectedCategoryId}/items/${relatedItemId}/relatedItemsByCategory/${window.categoriesData[categoryId].title}/${itemId}`
        ] = null;
      }
    });
  });

  const updatedItem = {
    name,
    logo,
    uses,
    basicRoadmap,
    roadmaps,
    info,
  };

  // STEP 1: Update item details first
  update(ref(database, `categories/${categoryId}/items/${itemId}`), updatedItem)
    .then(() => {
      console.log("Item details updated successfully!");

      // STEP 2: Now update related items separately
      return update(ref(database), relatedUpdates);
    })
    .then(() => {
      alert("Item relationships updated successfully!");
    })
    .catch((error) => {
      console.error("Error updating item:", error);
    });
}

// Helper function for editable fields
function generateFieldView(label, field, value) {
  return `
    <div class="field-group">
      <label for="input-${field}">${label}</label>
      <input type="text" id="input-${field}" value="${value}" disabled />
      <button class="edit-btn" data-field="${field}">Edit</button>
    </div>
  `;
}
