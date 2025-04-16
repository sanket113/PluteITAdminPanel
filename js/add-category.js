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
import { title } from "../js/sidebar.js";


import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-functions.js";
import { getApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";






const app = getApp(); // ✅ From modular import
const functions = getFunctions(app, 'us-central1'); // ✅ Region specified
const generateUploadUrl = httpsCallable(functions, 'generateUploadUrl');


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
categoryForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const loadingOverlay = document.getElementById("loading-overlay");
  loadingOverlay.classList.remove("hidden"); // Show overlay
  

  const title = document.getElementById("categories-title").value.trim();
  const subtitle = document.getElementById("category-subtitle").value;
  const fileInput = document.getElementById("category-image-file");
  const Ui_type = document.getElementById("category-type").value;


  if (!fileInput.files.length) {
    alert("Please select an image.");
    return;
  }


  const file = fileInput.files[0];
  const fileName = file.name;


  const categoriesRef = ref(database, "categories/");
  const categoryRef = push(categoriesRef);
  const categoryUID = categoryRef.key;


  try {
    // 🔹 Generate the S3 upload URL
    const response = await fetch("https://us-central1-pluteit-205c0.cloudfunctions.net/generateUploadUrl", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        uid: categoryUID,
        fileType: "category",
        fileName: file.name
      })
    });


    const data = await response.json();
console.log("📥 Full Response JSON:", data);


if (!data.uploadURL || !data.fileKey) {
  throw new Error("uploadUrl or fileKey is missing in response");
}


console.log("📥 Upload URL:", data.uploadURL);


// Upload the file to the signed URL first
await fetch(data.uploadURL, {
  method: "PUT",
  headers: {
    "Content-Type": file.type
  },
  body: file
});


// Then make the file public
const makePublicResponse = await fetch("https://us-central1-pluteit-205c0.cloudfunctions.net/makeFilePublic", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ fileKey: data.fileKey })
});


const publicData = await makePublicResponse.json();
if (!publicData.fileURL) {
  throw new Error("Failed to make file public.");
}


const imageUrl = publicData.fileURL;


// Now save to Firebase
await update(ref(database, `categories/${categoryUID}`), {
  imageUrl,
  title,
  subtitle,
  Ui_type,
  items: []
});


alert("Category added successfully!");
categoryForm.reset();
modal.classList.add("hidden");
   
  } catch (error) {
    console.error("🚨 Error:", error);
    alert("Failed to add category. Try again.");
  }
  finally {
    loadingOverlay.classList.add("hidden"); // Hide overlay (in finally block)
  }
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
    card.classList.add("category-card");


    const img = document.createElement("img");
    img.src = category.imageUrl;
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
    // const viewButton = document.createElement("button");
    // viewButton.textContent = "View";
    // viewButton.classList.add("view-btn");
    // viewButton.addEventListener("click", () => {
    //   // Show languages and information for the selected category
    //   window.location.href = `view-items.html?categoryId=${categoryId}`;
    // });


    card.style.cursor = "pointer";
    card.addEventListener("click", () => {
      window.location.href = `view-items.html?categoryId=${categoryId}`;
    });


    // Edit button
    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    ``;
    editButton.classList.add("edit-btn");
    editButton.addEventListener("click", (event) => {
      event.stopPropagation();
      currentCategoryId = categoryId; // Store the category ID being edited
    
      // Populate form fields with existing values
      document.getElementById("edit-category-title").value = category.title;
      document.getElementById("edit-category-subtitle").value = category.subtitle;
      document.getElementById("edit-category-type").value = category.Ui_type;
    
      // Display existing category image
      const currentImageElement = document.getElementById("current-category-image");
      currentImageElement.src = category.imageUrl;
      currentImageElement.style.display = "block"; // Show the image
    
      // Reset file input (DO NOT set value directly)
      document.getElementById("edit-category-image").value = "";
    
      // Show edit modal
      editCategoryModal.classList.remove("hidden");
    });
    


    // Delete button
    // Delete button
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.classList.add("delete-btn");
   
    deleteButton.addEventListener("click", async (event) => {
      event.stopPropagation();
      const loadingOverlay = document.getElementById("loading-overlay");
      loadingOverlay.classList.remove("hidden"); // Show overlay
      const confirmDelete = confirm(
        `Are you sure you want to delete the category "${category.title}" and all its related items?`
      );
    
      if (!confirmDelete) return;
    
      const categoryRef = ref(database, `categories/${categoryId}`);
      const itemsRef = ref(database, `items`);
      const functions = getFunctions(app);
      const deleteImage = httpsCallable(functions, "deleteImageFromS3");
    
      try {
        // 🧹 Step 1: Delete category image from S3
        if (category.imageUrl) {
          const parts = category.imageUrl.split(".com/");
          if (parts.length > 1) {
            const s3Key = parts[1];
            await deleteImage({ key: s3Key });
            console.log(`✅ Deleted category image: ${s3Key}`);
          }
        }
    
        // ✅ Step 2: Delete the category from Realtime DB
        await remove(categoryRef);
    
        // 🔁 Step 3: Loop through all items and delete those with matching categoryUid
        onValue(
          itemsRef,
          async (snapshot) => {
            if (!snapshot.exists()) return;
    
            const deletions = [];
    
            snapshot.forEach((childSnapshot) => {
              const itemId = childSnapshot.key;
              const itemData = childSnapshot.val();
    
              if (itemData.categoryUid === categoryId) {
                deletions.push(deleteItemById(itemId, itemData, categoryId, deleteImage));
              } else if (itemData.relatedItemsByCategory?.[categoryId]) {
                // Clean up relatedItemsByCategory even if item is from another category
                deletions.push(remove(ref(database, `items/${itemId}/relatedItemsByCategory/${categoryId}`)));
              }
            });
    
            await Promise.all(deletions);
            alert(`Category "${category.title}" and all related items/images have been deleted successfully.`);
          },
          { onlyOnce: true }
        );
      } catch (error) {
        console.error("❌ Error deleting category and items:", error);
        alert("Something went wrong while deleting the category.");
      }
      finally {
        loadingOverlay.classList.add("hidden"); // Hide overlay (in finally block)
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


async function deleteItemById(itemId, itemData, categoryId, deleteImage) {
  const imageUrls = [];

  if (itemData.logo) imageUrls.push(itemData.logo);
  if (itemData.basicRoadmap) imageUrls.push(itemData.basicRoadmap);
  if (itemData.allAbout) imageUrls.push(itemData.allAbout);
  if (Array.isArray(itemData.roadmaps)) {
    imageUrls.push(...itemData.roadmaps);
  }

  for (const url of imageUrls) {
    try {
      const urlObj = new URL(url);
      const fileKey = decodeURIComponent(urlObj.pathname.slice(1));
      await deleteImage({ key: fileKey });
      console.log(`✅ Deleted item image: ${fileKey}`);
    } catch (err) {
      console.warn(`⚠️ Failed to delete ${url}: ${err.message}`);
    }
  }

  // Clean up relatedItemsByCategory (if exists)
  if (itemData.relatedItemsByCategory?.[categoryId]) {
    await remove(ref(database, `items/${itemId}/relatedItemsByCategory/${categoryId}`));
  }

  // Delete the item from DB
  await remove(ref(database, `items/${itemId}`));
  console.log(`🗑️ Deleted item ${itemId}`);
}

// Handle editing a category
// Handle editing a category
editCategoryForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentCategoryId) {
    alert("No category selected for editing.");
    return;
  }

  const categoryRef = ref(database, `${testDomainUrl}/${currentCategoryId}`);

  onValue(categoryRef, async (snapshot) => {
    const existingCategory = snapshot.val();

    const updatedTitle = document.getElementById("edit-category-title").value;
    const updatedSubtitle = document.getElementById("edit-category-subtitle").value;
    const fileInput = document.getElementById("edit-category-image");
    const updatedType = document.getElementById("edit-category-type").value;

    let updates = {};
    let updateMessages = [];
    let newImageUrl = existingCategory.imageUrl;

    // 🔹 1. If a new image is uploaded, delete the old one from S3
    if (fileInput.files.length > 0) {
      const newFile = fileInput.files[0];

      try {
        // Extract S3 key from old image URL
        if (existingCategory.imageUrl) {
          const parts = existingCategory.imageUrl.split(".com/");
          if (parts.length > 1) {
            const oldS3Key = parts[1];

            // Call Cloud Function to delete old image
            const deleteImage = httpsCallable(functions, "deleteImageFromS3");
            const response = await deleteImage({ key: oldS3Key });

            if (!response.data.success) {
              throw new Error("Failed to delete old image from S3.");
            }
          }
        }

        // 🔹 2. Upload new image to S3
        const uploadResponse = await fetch("https://us-central1-pluteit-205c0.cloudfunctions.net/generateUploadUrl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: currentCategoryId,
            fileType: "category",
            fileName: newFile.name,
          }),
        });

        const data = await uploadResponse.json();
        if (!data.uploadURL || !data.fileKey) throw new Error("Upload URL not received.");

        // Upload new file to signed URL
        await fetch(data.uploadURL, {
          method: "PUT",
          headers: { "Content-Type": newFile.type },
          body: newFile,
        });

        // Make new image public
        const makePublicResponse = await fetch("https://us-central1-pluteit-205c0.cloudfunctions.net/makeFilePublic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileKey: data.fileKey }),
        });

        const publicData = await makePublicResponse.json();
        if (!publicData.fileURL) throw new Error("Failed to make new file public.");

        newImageUrl = publicData.fileURL;
        updateMessages.push("Image updated successfully.");
      } catch (error) {
        console.error("🚨 Error updating image:", error);
        alert("Failed to update image.");
        return;
      }
    }

    // 🔹 3. Update category fields in Firebase
    if (updatedTitle !== existingCategory.title) {
      updates.title = updatedTitle;
      updateMessages.push("Title updated successfully.");
    }
    if (updatedSubtitle !== existingCategory.subtitle) {
      updates.subtitle = updatedSubtitle;
      updateMessages.push("Subtitle updated successfully.");
    }
    if (newImageUrl !== existingCategory.imageUrl) {
      updates.imageUrl = newImageUrl;
    }
    if (updatedType !== existingCategory.Ui_type) {
      updates.Ui_type = updatedType;
      updateMessages.push("UI Type updated successfully.");
    }

    if (Object.keys(updates).length === 0) {
      alert("No changes were made.");
      return;
    }

    try {
      await update(categoryRef, updates);
      alert(updateMessages.join("\n"));
      editCategoryModal.classList.add("hidden");
      currentCategoryId = null;
    } catch (error) {
      console.error("Error updating category:", error);
      alert("Failed to update category. Please try again.");
    }
  }, { onlyOnce: true });
});


