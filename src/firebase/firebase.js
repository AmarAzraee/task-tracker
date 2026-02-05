// Firebase core
import { initializeApp } from "firebase/app";

// Firebase Auth
import { getAuth } from "firebase/auth";

// Firebase Firestore
import { getFirestore } from "firebase/firestore";

// Firebase Storage
import { getStorage } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDLaRJ9-h8l54KRGackhEVjBOYQ0yNLMM0",
  authDomain: "task-tracker-auth-amar.firebaseapp.com",
  projectId: "task-tracker-auth-amar",
  // Use the appspot.com bucket host; the .firebasestorage.app host can cause CORS preflight failures
  // If you still see CORS errors, run 'gsutil cors set cors.json gs://task-tracker-auth-amar.appspot.com' or configure CORS in Firebase Console
  storageBucket: "task-tracker-auth-amar.appspot.com",
  messagingSenderId: "333942358450",
  appId: "1:333942358450:web:c8610017b6d338d322a4ab",
};

// Initialize Firebase app (SATU KALI SAHAJA)
const app = initializeApp(firebaseConfig);

// Export yang digunakan seluruh app
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
