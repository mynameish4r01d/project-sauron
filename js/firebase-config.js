import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyADFxWzUKKeYQr3kGS2DDLrK2Sxq6v6R-g",
  authDomain: "project-sauron-hh.firebaseapp.com",
  projectId: "project-sauron-hh",
  storageBucket: "project-sauron-hh.firebasestorage.app",
  messagingSenderId: "567300989631",
  appId: "1:567300989631:web:772e00966344ede6579c0a",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
