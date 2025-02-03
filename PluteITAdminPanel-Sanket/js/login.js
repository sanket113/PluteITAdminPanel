import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { firebaseConfig } from '../js/firebase-config.js';

// Initialize Firebase app
initializeApp(firebaseConfig);
const auth = getAuth();

const loginForm = document.getElementById('login-form');
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = '../html/dashboard.html'; // Redirect on successful login
  } catch (error) {
    alert("Login failed: " + error.message); // Error message if login fails
  }
});
