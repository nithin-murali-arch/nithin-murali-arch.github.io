import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyApAgsox7rvSNjbqWqMlVMf69e6_ApqcJw",
    authDomain: "meal-plan-sync.firebaseapp.com",
    databaseURL: "https://meal-plan-sync-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "meal-plan-sync",
    storageBucket: "meal-plan-sync.firebasestorage.app",
    messagingSenderId: "156023355933",
    appId: "1:156023355933:web:8ed2ac6278a8387f9224f4",
    measurementId: "G-R18SLY36WV"
  };
  
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the initialized services
export const auth = getAuth(app);
export const db = getDatabase(app);