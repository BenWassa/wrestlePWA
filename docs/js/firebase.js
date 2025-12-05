import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  where
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

// Fallback to explicit config if none provided via __firebase_config
if (!firebaseConfig) {
  // IMPORTANT: Ensure this is safe for your repository. The API key is public for web apps and safe to use here for demos.
  firebaseConfig = {
    apiKey: "AIzaSyBuOcdO4Fi8snukoYEl84T_1WDOc1oxjhE",
    authDomain: "wrestling-b62c6.firebaseapp.com",
    projectId: "wrestling-b62c6",
    storageBucket: "wrestling-b62c6.firebasestorage.app",
    messagingSenderId: "1050929109502",
    appId: "1:1050929109502:web:0c3669514a2d6e744b48af"
  };
}

if (firebaseConfig) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} else {
  console.warn('Firebase not configured — running in offline/test mode. Firestore and Auth features will be disabled.');
}

const appId = (typeof __app_id !== 'undefined') ? __app_id : 'default-app-id';

export { app, auth, db, appId, serverTimestamp, signInAnonymously, signInWithCustomToken, onAuthStateChanged, collection, addDoc, onSnapshot, deleteDoc, doc, query, orderBy, where };

