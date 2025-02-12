// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";


const firebaseConfig = {
  apiKey: "AIzaSyAjfIZy1SiNt0cfdvf2gxdMZIsxYfiy_zc",
  authDomain: "pluteit-205c0.firebaseapp.com",
  databaseURL: "https://pluteit-205c0-default-rtdb.firebaseio.com",
  projectId: "pluteit-205c0",
  storageBucket: "pluteit-205c0.firebasestorage.app",
  messagingSenderId: "889756982925",
  appId: "1:889756982925:web:1beca65e3799c94a428cc4",
  measurementId: "G-2B4WYN70LT"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app); // Initialize Firebase Auth

export { firebaseConfig,database,auth };
