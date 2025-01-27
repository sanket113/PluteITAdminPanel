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
const existingLanguagesContainer =
  document.getElementById("existing-languages");
const addLanguageForm = document.getElementById("add-language-form");
const logoutButton = document.getElementById("logout-button");
const modal = document.getElementById("edit-language-modal");
const closeModalBtn = document.getElementById("close-modal");
const editLanguageForm = document.getElementById("edit-language-form");

// UID for Language Category
const languageCategoryUid = "-OHLmm-dOUlSTa4O8wzX"; // Use your actual UID here

checkAuthStatus((user) => {
  console.log(`User logged in: ${user.email}`);
});

logoutButton.addEventListener("click", logout);

// Firebase reference for categories
const categoryRef = ref(database, "categories");

// Function to fetch and display existing languages
async function fetchExistingLanguages() {
  try {
    const snapshot = await get(categoryRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const languageCategory = data[languageCategoryUid];

      if (languageCategory && languageCategory.items) {
        existingLanguagesContainer.innerHTML = "";

        for (let languageUid in languageCategory.items) {
          const language = languageCategory.items[languageUid];

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
            .addEventListener("click", () =>
              editLanguage(languageUid, language)
            );
          languageCard
            .querySelector(".delete-btn")
            .addEventListener("click", () => deleteLanguage(languageUid));
        }
      } else {
        existingLanguagesContainer.innerHTML = "<p>No languages found.</p>";
      }
    } else {
      existingLanguagesContainer.innerHTML = "<p>No categories found.</p>";
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

  try {
    const itemsRef = child(
      ref(database),
      `categories/${languageCategoryUid}/items`
    );
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
      const languageRef = ref(
        database,
        `categories/${languageCategoryUid}/items/${languageUid}`
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
      const languageRef = ref(
        database,
        `categories/${languageCategoryUid}/items/${languageUid}`
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
fetchExistingLanguages();

// Add event listener for form submission
addLanguageForm.addEventListener("submit", addLanguage);
