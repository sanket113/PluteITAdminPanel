import {
  ref,
  onValue,
  push,
  update,
  remove,
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";
import { database } from "../js/firebase-config.js";

// Extract the categoryId from the URL
const urlParams = new URLSearchParams(window.location.search);
const categoryId = urlParams.get("categoryId");
console.log("Category ID:", categoryId);

// DOM Elements
const categoryTitle = document.getElementById("category-title");
const itemGrid = document.getElementById("item-grid");
const addItemBtn = document.getElementById("add-item-btn");
const addItemModal = document.getElementById("add-item-modal");
const closeModal = document.getElementById("close-modal");
const addItemForm = document.getElementById("add-item-form");

// Fetch and display items for the category
const categoryRef = ref(database, `categories/${categoryId}`);
onValue(categoryRef, (snapshot) => {
  const category = snapshot.val();
  if (category) {
    categoryTitle.textContent = `Items in "${category.title}"`;
    itemGrid.innerHTML = ""; // Clear the grid before updating

    if (category.items && typeof category.items === "object") {
      const items = Object.entries(category.items); // Get key-value pairs

      items.forEach(([itemId, item]) => {
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
        viewButton.addEventListener("click", () =>
          openEditDialog(itemId, item)
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
addItemForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = document.getElementById("item-title").value;
  const description = document.getElementById("item-description").value;
  const image = document.getElementById("item-image").value;

  const newItem = {
    name: title,
    info: description,
    logo: image,
  };
  const itemsRef = ref(database, `categories/${categoryId}/items`);

  push(itemsRef, newItem)
    .then(() => {
      alert("Item added successfully!");
      addItemForm.reset();
      addItemModal.classList.add("hidden");
    })
    .catch((error) => {
      console.error("Error adding item:", error);
    });
});

// Function to delete an item
function deleteItem(itemId) {
  if (confirm("Are you sure you want to delete this item?")) {
    const itemRef = ref(database, `categories/${categoryId}/items/${itemId}`);
    remove(itemRef)
      .then(() => {
        alert("Item deleted successfully!");
      })
      .catch((error) => {
        console.error("Error deleting item:", error);
      });
  }
}

// Function to open edit dialog
function openEditDialog(itemId, item) {
  const modal = document.createElement("div");
  modal.classList.add("modal");

  const modalContent = document.createElement("div");
  modalContent.classList.add("modal-content");

  const closeModalBtn = document.createElement("span");
  closeModalBtn.classList.add("close-btn");
  closeModalBtn.textContent = "×";
  closeModalBtn.addEventListener("click", () => modal.remove());

  const title = document.createElement("h2");
  title.textContent = "Edit Item";

  const form = document.createElement("form");

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = item.name;
  nameInput.required = true;

  const descInput = document.createElement("textarea");
  descInput.value = item.info;
  descInput.required = true;

  const imageInput = document.createElement("input");
  imageInput.type = "url";
  imageInput.value = item.logo;
  imageInput.required = true;

  const saveButton = document.createElement("button");
  saveButton.type = "submit";
  saveButton.textContent = "Save";

  form.appendChild(nameInput);
  form.appendChild(descInput);
  form.appendChild(imageInput);
  form.appendChild(saveButton);

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const updatedItem = {
      name: nameInput.value,
      info: descInput.value,
      logo: imageInput.value,
    };

    const itemRef = ref(database, `categories/${categoryId}/items/${itemId}`);
    update(itemRef, updatedItem)
      .then(() => {
        alert("Item updated successfully!");
        modal.remove();
      })
      .catch((error) => {
        console.error("Error updating item:", error);
      });
  });

  modalContent.appendChild(closeModalBtn);
  modalContent.appendChild(title);
  modalContent.appendChild(form);
  modal.appendChild(modalContent);

  document.body.appendChild(modal);
}
