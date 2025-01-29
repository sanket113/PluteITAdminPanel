import {
  ref,
  onValue,
  update,
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";
import { database } from "../js/firebase-config.js";
import { checkAuthStatus, logout } from "../js/session.js";

// Extract the categoryId and itemId from the URL
const urlParams = new URLSearchParams(window.location.search);
const categoryId = urlParams.get("categoryId");
const itemId = urlParams.get("itemId");

// DOM Elements
const itemDetailsContainer = document.getElementById("item-details-container");
const logoutButton = document.getElementById("logout-button");

// Check authentication status
checkAuthStatus((user) => {
  console.log(`Admin logged in: ${user.email}`);
});

// Logout button functionality
logoutButton.addEventListener("click", () => {
  logout();
});

// Fetch and display item details
const itemRef = ref(database, `categories/${categoryId}/items/${itemId}`);
onValue(itemRef, (snapshot) => {
  const item = snapshot.val();

  if (item) {
    // Populate the UI with fields and edit buttons
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

        <button id="save-button" class="save-btn">Save Changes</button>
      </div>
    `;

    // Handle field editing
    const editButtons = document.querySelectorAll(".edit-btn");
    editButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const field = button.dataset.field;
        const input = document.querySelector(`#input-${field}`);
        input.disabled = !input.disabled;

        if (input.disabled) {
          button.textContent = "Edit";
        } else {
          button.textContent = "Done";
        }
      });
    });

    // Save updated details
    document.getElementById("save-button").addEventListener("click", () => {
      const updatedItem = {
        name: document.querySelector("#input-name").value,
        logo: document.querySelector("#input-logo").value,
        uses: document.querySelector("#input-uses").value,
        basicRoadmap: document.querySelector("#input-basicRoadmap").value,
        roadmaps: [
          document.querySelector("#input-roadmap1").value,
          document.querySelector("#input-roadmap2").value,
          document.querySelector("#input-roadmap3").value,
          document.querySelector("#input-roadmap4").value,
        ],
        info: document.querySelector("#input-info").value,
      };

      update(itemRef, updatedItem)
        .then(() => alert("Item updated successfully!"))
        .catch((err) => {
          console.error("Update error:", err);
          alert("Failed to update item. Please try again.");
        });
    });
  } else {
    itemDetailsContainer.innerHTML = `<p class="error-message">Item not found or no data available.</p>`;
  }
});

// Helper function to generate field view with edit functionality
function generateFieldView(label, field, value) {
  return `
    <div class="field-group">
      <label>${label}</label>
      <div class="field-control">
        <input type="text" id="input-${field}" value="${value}" disabled />
        <button class="edit-btn" data-field="${field}">Edit</button>
      </div>
    </div>
  `;
}
