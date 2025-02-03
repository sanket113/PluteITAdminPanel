// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";


const firebaseConfig = {
  apiKey: "AIzaSyDua-qUZVe8uMBxOFOFGdQGJHgfOuqUYdc",
  authDomain: "pluteit-c9187.firebaseapp.com",
  databaseURL: "https://pluteit-c9187-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pluteit-c9187",
  storageBucket: "pluteit-c9187.firebasestorage.app",
  messagingSenderId: "417757616870",
  appId: "1:417757616870:web:f3019ee26767a74a89f927",
  measurementId: "G-V8FPD7LP9Y"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app); // Initialize Firebase Auth

export { firebaseConfig,database,auth };
