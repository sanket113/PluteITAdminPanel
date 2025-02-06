import {
  ref,
  onValue,
  update,
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";
import { database } from "../js/firebase-config.js";
import { checkAuthStatus, logout } from "../js/session.js";
import { testDomainUrl } from "../js/constant.js";
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
const itemRef = ref(database, `${testDomainUrl}/${categoryId}/items/${itemId}`);
onValue(itemRef, (snapshot) => {
  const item = snapshot.val();

  if (item) {
    // Populate UI
    itemDetailsContainer.innerHTML = `
      <div class="detail-card">
        <h2>Item Details</h2>
        ${generateFieldView("Name", "name", item.name)}
        ${generateFieldView("Logo URL", "logo", item.logo)}
        ${generateFieldView("Short Description", "shortDesc", item.shortDescription || "")}
        ${generateFieldView("Long Description", "info", item.info)}

        ${generateUsesFieldView(item.uses || [])}
        ${generateFieldView("Basic Roadmap URL", "basicRoadmap", item.basicRoadmap)}
        ${generateFieldView("Roadmap URL 1", "roadmap1", item.roadmaps?.[0] || "")}
        ${generateFieldView("Roadmap URL 2", "roadmap2", item.roadmaps?.[1] || "")}
        ${generateFieldView("Roadmap URL 3", "roadmap3", item.roadmaps?.[2] || "")}
        ${generateFieldView("Roadmap URL 4", "roadmap4", item.roadmaps?.[3] || "")}
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

    // Add functionality to manage "Uses" items
    document.getElementById("add-uses-btn").addEventListener("click", addUsesItem);
    document.querySelectorAll(".remove-uses-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const index = button.dataset.index;
        removeUsesItem(index);
      });
    });

    // Attach save button event after rendering the UI
    saveButton.onclick = saveItemDetails;
  }
});

// Helper function to generate "Uses" array fields
function generateUsesFieldView(uses) {
  let usesFields = `<h3>Uses</h3><div id="uses-container">`; // Add an ID for targeting

  uses.forEach((use, index) => {
    usesFields += `
      <div class="field-group" data-index="${index}">
        <label for="input-uses-title-${index}">Title</label>
        <input type="text" id="input-uses-title-${index}" value="${use.title}" disabled />
        <label for="input-uses-desc-${index}">Description</label>
        <input type="text" id="input-uses-desc-${index}" value="${use.description}" disabled />
        <button class="edit-btn" data-field="uses-title-${index}">Edit Title</button>
        <button class="edit-btn" data-field="uses-desc-${index}">Edit Description</button>
        <button class="remove-uses-btn" data-index="${index}">Remove</button>
      </div>
    `;
  });

  usesFields += `</div><button id="add-uses-btn">Add Use</button>`; // Ensure new items are inside this container
  return usesFields;
}



// Function to add a new "Use" item
function addUsesItem() {
  const usesContainer = document.getElementById("uses-container"); // Ensure this container exists
  if (!usesContainer) {
    console.error("Uses container not found!");
    return;
  }

  const existingUses = usesContainer.querySelectorAll(".field-group[data-index]");
  const newUseIndex = existingUses.length; // Get current count to assign the next index

  // Create a new field-group div
  const newFieldGroup = document.createElement("div");
  newFieldGroup.classList.add("field-group");
  newFieldGroup.dataset.index = newUseIndex; // Properly set the index

  newFieldGroup.innerHTML = `
    <label for="input-uses-title-${newUseIndex}">Title</label>
    <input type="text" id="input-uses-title-${newUseIndex}" value="" />
    <label for="input-uses-desc-${newUseIndex}">Description</label>
    <input type="text" id="input-uses-desc-${newUseIndex}" value="" />
    <button class="remove-uses-btn" data-index="${newUseIndex}">Remove</button>
  `;

  usesContainer.appendChild(newFieldGroup);

  // Attach event listener for the newly created remove button
  newFieldGroup.querySelector(`.remove-uses-btn`).addEventListener("click", function () {
    removeUsesItem(newUseIndex);
  });
}


// Function to remove a "Use" item
function removeUsesItem(index) {
  const targetElement = document.querySelector(`.field-group[data-index="${index}"]`);
  if (targetElement) {
    targetElement.remove();

    // Re-index remaining "Uses" items to prevent missing index issues
    document.querySelectorAll(".field-group[data-index]").forEach((el, newIndex) => {
      el.dataset.index = newIndex;
      el.querySelector(".remove-uses-btn").dataset.index = newIndex;
    });
  } else {
    console.error(`Element with index ${index} not found.`);
  }
}

// Fetch categories and display related item checkboxes
function fetchCategoriesForRelationship(currentRelatedItems) {
  const categoriesRef = ref(database, testDomainUrl);

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
  const nameInput = document.getElementById("input-name");
  const logoInput = document.getElementById("input-logo");
  const usesInput = document.getElementById("input-uses");
  const basicRoadmapInput = document.getElementById("input-basicRoadmap");
  const roadmapInputs = [
    document.getElementById("input-roadmap1"),
    document.getElementById("input-roadmap2"),
    document.getElementById("input-roadmap3"),
    document.getElementById("input-roadmap4")
  ];
  const infoInput = document.getElementById("input-info");

  if (!nameInput || !logoInput || !basicRoadmapInput || !infoInput) {
    console.error("One or more required input fields are missing.");
    return;
  }

  const name = nameInput.value;
  const logo = logoInput.value;
  const uses = [];
  document.querySelectorAll(".field-group").forEach((group) => {
    const titleInput = group.querySelector('[id^="input-uses-title"]');
    const descInput = group.querySelector('[id^="input-uses-desc"]');
  
    if (titleInput && descInput) {
      uses.push({
        title: titleInput.value,
        description: descInput.value,
      });
    }
  });
    const basicRoadmap = basicRoadmapInput.value;
  const roadmaps = roadmapInputs.map(input => input.value);
  const info = infoInput.value;
  const shortDescInput = document.getElementById("input-shortDesc");
  const shortDescription = shortDescInput ? shortDescInput.value : "";
  
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
              `${testDomainUrl}/${categoryId}/items/${itemId}/relatedItemsByCategory/${categoryName}/${selectedItemId}`
            ] = selectedItemName;
            relatedUpdates[
              `${testDomainUrl}/${selectedCategoryId}/items/${selectedItemId}/relatedItemsByCategory/${window.categoriesData[categoryId].title}/${itemId}`
            ] = name;
          }
        });
    
        // Remove unchecked relationships
        const previouslySelected =
          window.categoriesData[selectedCategoryId]?.items || {};
        Object.keys(previouslySelected).forEach((relatedItemId) => {
          if (!selectedItems.some((checkbox) => checkbox.value === relatedItemId)) {
            relatedUpdates[
              `${testDomainUrl}/${categoryId}/items/${itemId}/relatedItemsByCategory/${categoryName}/${relatedItemId}`
            ] = null;
            relatedUpdates[
              `${testDomainUrl}/${selectedCategoryId}/items/${relatedItemId}/relatedItemsByCategory/${window.categoriesData[categoryId].title}/${itemId}`
            ] = null;
          }
        });
      });

  // Prepare the updated data object
  const updatedData = {
    name,
    logo,
    shortDescription,
    uses: uses.length > 0 ? uses : [], // Ensure it remains an array
    basicRoadmap,
    roadmaps,
    info,
    relatedItemsByCategory,
  };
  
  // Update the item in Firebase
  update(itemRef, updatedData).then(() => {
    update(ref(database), relatedUpdates); // Update relationships in all affected categories
    alert("Item details saved successfully!");
    window.location.reload();
  }).catch((error) => {
    console.error("Error saving item details:", error);
  });
}

// Helper function to generate field views
function generateFieldView(label, field, value) {
  return `
    <div class="field-group">
      <label for="input-${field}">${label}</label>
      <input type="text" id="input-${field}" value="${value || ""}" disabled />
      <button class="edit-btn" data-field="${field}">Edit</button>
    </div>
  `;
}
