import { auth } from '../js/firebase-config.js'; // Import auth object from firebase-config
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

function checkAuthStatus(callback) {
  // Listen for authentication state changes
  onAuthStateChanged(auth, (user) => {
    if (user) {
      callback(user); // If user is logged in, execute the callback
    } else {
      window.location.href = './login.html'; // Redirect to login page if not logged in
    }
  });
}

function logout() {
  auth.signOut().then(() => {
    window.location.href = './login.html'; // Redirect to login after logout
  }).catch((error) => {
    console.error("Error signing out: ", error); // Log error if logout fails
  });
}

export { checkAuthStatus, logout };
