import { database } from "../js/firebase-config.js";
import {
  ref,
  get,
  child,
  push,
  set,
  remove,
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";
import { checkAuthStatus, logout } from "../js/session.js";

// DOM Elements
const existingLanguagesContainer = document.getElementById("existing-languages");
const addLanguageForm = document.getElementById("add-language-form");
const logoutButton = document.getElementById("logout-button");
const modal = document.getElementById("edit-language-modal");
const closeModalBtn = document.getElementById("close-modal");
const editLanguageForm = document.getElementById("edit-language-form");
const categorySelect = document.getElementById("category-select"); // Category dropdown

// Check if the user is authenticated
checkAuthStatus((user) => {
  console.log(`User logged in: ${user.email}`);
});

logoutButton.addEventListener("click", logout);

// Firebase reference for categories
const categoriesRef = ref(database, "categories");

// Function to populate category dropdown
async function populateCategoryDropdown() {
  try {
    const snapshot = await get(categoriesRef);
    if (snapshot.exists()) {
      const categories = snapshot.val();
      categorySelect.innerHTML = "<option value=''>Select a category</option>"; // Clear existing options

      // Add categories to dropdown
      for (let categoryId in categories) {
        const category = categories[categoryId];
        const option = document.createElement("option");
        option.value = category.title; // Use category title as the value
        option.textContent = category.title; // Display category title
        categorySelect.appendChild(option);
      }
    } else {
      console.log("No categories found.");
    }
  } catch (error) {
    console.error("Error fetching categories:", error);
  }
}

// Function to get the category UID based on selected category
async function getSelectedCategoryUid() {
  const selectedCategory = categorySelect.value;
  if (!selectedCategory) {
    alert("Please select a category.");
    return null;
  }

  try {
    const snapshot = await get(categoriesRef);
    if (snapshot.exists()) {
      const categories = snapshot.val();
      for (let categoryId in categories) {
        if (categories[categoryId].title === selectedCategory) {
          return categoryId;
        }
      }
    } else {
      throw new Error("No categories found.");
    }
  } catch (error) {
    console.error("Error fetching categories:", error);
  }
}

// Function to fetch and display existing languages under the selected category
async function fetchExistingLanguages() {
  const categoryUid = await getSelectedCategoryUid();
  if (!categoryUid) return;

  try {
    const categoryRef = ref(database, `categories/${categoryUid}`);
    const snapshot = await get(categoryRef);
    if (snapshot.exists()) {
      const categoryData = snapshot.val();
      const languageCategory = categoryData.items;

      existingLanguagesContainer.innerHTML = "";
      for (let languageUid in languageCategory) {
        const language = languageCategory[languageUid];

        const languageCard = document.createElement("div");
        languageCard.classList.add("card");
        languageCard.dataset.uid = languageUid;
        languageCard.innerHTML = `
          <img src="${language.logo}" alt="${language.name}" />
          <div class="card-content">
            <h3 class="card-title">${language.name}</h3>
            <p class="card-subtitle">${language.uses}</p>
            <button class="edit-btn">Edit</button>
            <button class="delete-btn">Delete</button>
          </div>
        `;
        existingLanguagesContainer.appendChild(languageCard);

        // Attach event listeners for edit and delete buttons
        languageCard
          .querySelector(".edit-btn")
          .addEventListener("click", () => editLanguage(languageUid, language));
        languageCard
          .querySelector(".delete-btn")
          .addEventListener("click", () => deleteLanguage(languageUid));
      }
    } else {
      existingLanguagesContainer.innerHTML = "<p>No languages found in the selected category.</p>";
    }
  } catch (error) {
    console.error("Error fetching languages:", error);
  }
}

// Function to add a new language
async function addLanguage(event) {
  event.preventDefault();
  const name = document.getElementById("language-name").value;
  const uses = document.getElementById("language-uses").value;
  const info = document.getElementById("language-info").value;
  const logoUrl = document.getElementById("language-logo").value;
  const roadmapLinks = document
    .getElementById("language-roadmaps")
    .value.split(",");

  if (!name || !uses || !info || !logoUrl) {
    alert("Please fill all the required fields.");
    return;
  }

  const selectedCategoryUid = await getSelectedCategoryUid();
  if (!selectedCategoryUid) {
    alert("Please select a category first.");
    return;
  }

  try {
    const itemsRef = child(ref(database), `categories/${selectedCategoryUid}/items`);
    const newLanguageRef = push(itemsRef);
    const newLanguage = {
      name,
      uses,
      info,
      uid: "" + newLanguageRef.key,
      logo: logoUrl,
      roadmaps: roadmapLinks,
      basicRoadmap: roadmapLinks[0] || "",
      technologies: [],
      frameworks: [],
    };

    await set(newLanguageRef, newLanguage);

    alert("Language added successfully!");
    addLanguageForm.reset();
    fetchExistingLanguages();
  } catch (error) {
    console.error("Error adding language:", error);
    alert("Failed to add language. Please try again.");
  }
}

// Function to edit a language
async function editLanguage(languageUid, languageData) {
  document.getElementById("edit-language-name").value = languageData.name;
  document.getElementById("edit-language-uses").value = languageData.uses;
  document.getElementById("edit-language-info").value = languageData.info;
  document.getElementById("edit-language-logo").value = languageData.logo;
  document.getElementById("edit-language-roadmaps").value =
    languageData.roadmaps.join(",");

  modal.style.display = "flex";

  editLanguageForm.onsubmit = async (event) => {
    event.preventDefault();
    const updatedLanguage = {
      name: document.getElementById("edit-language-name").value,
      uses: document.getElementById("edit-language-uses").value,
      info: document.getElementById("edit-language-info").value,
      logo: document.getElementById("edit-language-logo").value,
      roadmaps: document
        .getElementById("edit-language-roadmaps")
        .value.split(","),
      basicRoadmap:
        document.getElementById("edit-language-roadmaps").value.split(",")[0] ||
        "",
    };

    try {
      const categoryUid = await getSelectedCategoryUid();
      const languageRef = ref(
        database,
        `categories/${categoryUid}/items/${languageUid}`
      );
      await set(languageRef, updatedLanguage);

      alert("Language updated successfully!");
      modal.style.display = "none";
      fetchExistingLanguages();
    } catch (error) {
      console.error("Error editing language:", error);
      alert("Failed to update language. Please try again.");
    }
  };
}

// Function to delete a language
async function deleteLanguage(languageUid) {
  if (confirm("Are you sure you want to delete this language?")) {
    try {
      const categoryUid = await getSelectedCategoryUid();
      const languageRef = ref(
        database,
        `categories/${categoryUid}/items/${languageUid}`
      );
      await remove(languageRef);

      alert("Language deleted successfully!");
      fetchExistingLanguages();
    } catch (error) {
      console.error("Error deleting language:", error);
      alert("Failed to delete language. Please try again.");
    }
  }
}

// Close Modal on clicking close button
closeModalBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

// Fetch existing languages on page load
populateCategoryDropdown();
categorySelect.addEventListener("change", fetchExistingLanguages);

// Add event listener for form submission
addLanguageForm.addEventListener("submit", addLanguage);
//new