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
      // Open the edit modal and populate the form
      event.stopPropagation();
      currentCategoryId = categoryId; // Store the category ID being edited
      document.getElementById("edit-category-title").value = category.title;
      document.getElementById("edit-category-subtitle").value =
        category.subtitle;
      document.getElementById("edit-category-image").value = category.image;
      ``;
      document.getElementById("edit-category-type").value = category.Ui_type;


      editCategoryModal.classList.remove("hidden"); // Show the edit modal
    });


    // Delete button
    // Delete button
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.classList.add("delete-btn");
   
    deleteButton.addEventListener("click", async (event) => {
      event.stopPropagation();
   
      const confirmDelete = confirm(
        `Are you sure you want to delete the category "${category.title}" and all its related items?`
      );
   
      if (!confirmDelete) return;
   
      const categoryRef = ref(database, `categories/${categoryId}`);
      const itemsRef = ref(database, `items`);
   
      try {
        // 🧠 1. Extract S3 key from image URL
        const imageUrl = category.imageUrl; // stored in Firebase
        let s3Key = null;
   
        if (imageUrl) {
          const parts = imageUrl.split(".com/");
          if (parts.length > 1) {
            s3Key = parts[1]; // e.g., "category/uid/filename.jpg"
            console.log("S3 Key to delete:", s3Key);


          }
        }
   
        // 🧠 2. Call Cloud Function (v2 HTTPS onCall) to delete from S3
        if (s3Key) {
          const functions = getFunctions(app);
          const deleteImage = httpsCallable(functions, "deleteImageFromS3");
          const response = await deleteImage({ key: s3Key });
          console.log("Cloud Function Response:", response);


          if (!response.data.success) {
            throw new Error("Cloud Function failed to delete the image.");
          }
   
          console.log("Image deleted from S3:", s3Key);
        }
   
        // ✅ 3. Delete the category from Realtime Database
        await remove(categoryRef);
   
        // ✅ 4. Delete all related items under that category
        onValue(
          itemsRef,
          async (snapshot) => {
            if (snapshot.exists()) {
              const updates = {};
   
              snapshot.forEach((childSnapshot) => {
                const itemId = childSnapshot.key;
                const itemData = childSnapshot.val();
   
                if (itemData.categoryUid === categoryId) {
                  updates[`items/${itemId}`] = null;
                }
   
                if (itemData.relatedItemsByCategory?.[categoryId]) {
                  updates[`items/${itemId}/relatedItemsByCategory/${categoryId}`] = null;
                }
              });
   
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
        alert("Failed to delete category. Please try again.");
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
editCategoryForm.addEventListener("submit", async (e) => {
  e.preventDefault();


  if (!currentCategoryId) {
    alert("No category selected for editing.");
    return;
  }


  const categoryRef = ref(database, `${testDomainUrl}/${currentCategoryId}`);


  onValue(
    categoryRef,
    async (snapshot) => {
      const existingCategory = snapshot.val();


      const updatedTitle = document.getElementById("edit-category-title").value;
      const updatedSubtitle = document.getElementById("edit-category-subtitle").value;
      const updatedType = document.getElementById("edit-category-type").value;
      const imageInput = document.getElementById("edit-category-image");
      const newImageFile = imageInput.files[0]; // Get the file object


      let updates = {};
      let updateMessages = [];


      // Check for title change
      if (updatedTitle !== existingCategory.title) {
        updates.title = updatedTitle;
        updateMessages.push("Title updated successfully.");
      }


      if (updatedSubtitle !== existingCategory.subtitle) {
        updates.subtitle = updatedSubtitle;
        updateMessages.push("Subtitle updated successfully.");
      }


      if (updatedType !== existingCategory.Ui_type) {
        updates.Ui_type = updatedType;
        updateMessages.push("UI Type updated successfully.");
      }


      // Handle image replacement if new image uploaded
      if (newImageFile) {
        try {
          const oldImageUrl = existingCategory.image;


          // Delete old image from S3
          if (oldImageUrl) {
            const parts = oldImageUrl.split(".com/");
            if (parts.length > 1) {
              const oldKey = parts[1]; // like category/uid/filename.jpg
              const deleteImage = firebase.functions().httpsCallable("deleteImageFromS3");
              await deleteImage({ key: oldKey });
              console.log("Old image deleted from S3.");
            }
          }

          
          // Upload new image to S3
          const categoryPath = `category/${currentCategoryId}/`;
          const newKey = categoryPath + newImageFile.name;


          const uploadImage = firebase.functions().httpsCallable("uploadImageToS3");
          const response = await uploadImage({
            key: newKey,
            contentType: newImageFile.type,
            base64String: await fileToBase64(newImageFile),
          });


          const newImageUrl = response.data.url;
          updates.image = newImageUrl;
          updateMessages.push("Image updated successfully.");
        } catch (err) {
          console.error("Image update failed:", err);
          alert("Failed to update image.");
          return;
        }
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
    },
    { onlyOnce: true }
  );
});


