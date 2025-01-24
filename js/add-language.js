import { database } from "../js/firebase-config.js";
import { ref, get, child, push, set, remove } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";
import { checkAuthStatus, logout } from "../js/session.js";

// DOM Elements
const existingLanguagesContainer = document.getElementById("existing-languages");
const addLanguageForm = document.getElementById("add-language-form");
const logoutButton = document.getElementById("logout-button");

// UID for Language Category
const languageCategoryUid = "-OHLmm-dOUlSTa4O8wzX";  // Use your actual UID here

checkAuthStatus((user) => {
  console.log(`User logged in: ${user.email}`);
});

logoutButton.addEventListener("click", logout);

// Firebase reference for categories
const categoryRef = ref(database, "categories");

// Function to fetch and display existing languages using their UID
async function fetchExistingLanguages() {
  try {
    // Retrieve category data from Firebase
    const snapshot = await get(categoryRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const languageCategory = data[languageCategoryUid];  // Access the language category directly by UID

      if (languageCategory && languageCategory.items) {
        // Clear existing content in the container
        existingLanguagesContainer.innerHTML = "";

        // Fetch languages by their UID
        for (let languageUid in languageCategory.items) {
          const language = languageCategory.items[languageUid];

          const languageCard = document.createElement("div");
          languageCard.classList.add("card");
          languageCard.dataset.uid = languageUid;  // Store the UID in the card for reference
          languageCard.innerHTML = `
            <img src="${language.logo}" alt="${language.name}" />
            <div class="card-content">
              <h3 class="card-title">${language.name}</h3>
              <p class="card-subtitle">${language.uses}</p>
              <p>${language.info}</p>
              <button class="edit-btn">Edit</button>
              <button class="delete-btn">Delete</button>
            </div>
          `;
          existingLanguagesContainer.appendChild(languageCard);

          // Attach event listeners for edit and delete buttons
          languageCard.querySelector(".edit-btn").addEventListener("click", () => editLanguage(languageUid, language));
          languageCard.querySelector(".delete-btn").addEventListener("click", () => deleteLanguage(languageUid));
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
  event.preventDefault(); // Prevent form submission

  // Get form data
  const name = document.getElementById("language-name").value;
  const uses = document.getElementById("language-uses").value;
  const info = document.getElementById("language-info").value;
  const logoUrl = document.getElementById("language-logo").value;  // Get URL for the logo
  const roadmapLinks = document.getElementById("language-roadmaps").value.split(','); // Get URLs for roadmaps

  // Validate input
  if (!name || !uses || !info || !logoUrl) {
    alert("Please fill all the required fields.");
    return;
  }

  try {
    // Create new language object
    const newLanguage = {
      name,
      uses,
      info,
      logo: logoUrl,
      roadmaps: roadmapLinks,
      basicRoadmap: roadmapLinks[0] || "",
      technologies: [],
      frameworks: [],
    };

    // Push the new language under the correct category using the languageCategoryUid
    const itemsRef = child(ref(database), `categories/${languageCategoryUid}/items`);
    const newLanguageRef = push(itemsRef); // Create a unique ID for the new language
    await set(newLanguageRef, newLanguage);

    alert("Language added successfully!");
    addLanguageForm.reset();
    fetchExistingLanguages(); // Refresh existing languages
  } catch (error) {
    console.error("Error adding language:", error);
    alert("Failed to add language. Please try again.");
  }
}

// Function to edit a language
async function editLanguage(languageUid, languageData) {
  const name = prompt("Edit Language Name", languageData.name);
  const uses = prompt("Edit Language Uses", languageData.uses);
  const info = prompt("Edit Language Info", languageData.info);
  const logoUrl = prompt("Edit Logo URL", languageData.logo);
  const roadmapLinks = prompt("Edit Roadmaps (comma separated)", languageData.roadmaps.join(","));

  if (!name || !uses || !info || !logoUrl) {
    alert("Please fill all the required fields.");
    return;
  }

  const updatedLanguage = {
    name,
    uses,
    info,
    logo: logoUrl,
    roadmaps: roadmapLinks.split(","),
    basicRoadmap: roadmapLinks.split(",")[0] || "",
    technologies: languageData.technologies || [], // Ensure it's an empty array if undefined
    frameworks: languageData.frameworks || [], // Ensure it's an empty array if undefined
  };

  try {
    // Update the language in the Firebase database
    const languageRef = ref(database, `categories/${languageCategoryUid}/items/${languageUid}`);
    await set(languageRef, updatedLanguage);

    alert("Language updated successfully!");
    fetchExistingLanguages(); // Refresh existing languages
  } catch (error) {
    console.error("Error editing language:", error);
    alert("Failed to edit language. Please try again.");
  }
}


// Function to delete a language
async function deleteLanguage(languageUid) {
  const confirmDelete = confirm("Are you sure you want to delete this language?");
  if (confirmDelete) {
    try {
      // Remove the language from the Firebase database
      const languageRef = ref(database, `categories/${languageCategoryUid}/items/${languageUid}`);
      await remove(languageRef);

      alert("Language deleted successfully!");
      fetchExistingLanguages(); // Refresh existing languages
    } catch (error) {
      console.error("Error deleting language:", error);
      alert("Failed to delete language. Please try again.");
    }
  }
}

// Event Listeners
addLanguageForm.addEventListener("submit", addLanguage);

// Initial Fetch
fetchExistingLanguages();
