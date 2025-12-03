import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, serverTimestamp, query, orderBy, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Safe parse of firebase config
let firebaseConfig = null;
try {
  firebaseConfig = (typeof __firebase_config !== 'undefined') ? JSON.parse(__firebase_config) : null;
} catch (err) {
  console.warn('Failed to parse __firebase_config', err);
  firebaseConfig = null;
}

let app = null;
let auth = null;
let db = null;
if (firebaseConfig) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  console.warn('Firebase not configured — running in offline/test mode. Firestore and Auth features will be disabled.');
}

const appId = (typeof __app_id !== 'undefined') ? __app_id : 'default-app-id';

export { app, auth, db, appId, serverTimestamp, signInAnonymously, signInWithCustomToken, onAuthStateChanged, collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy, where };
