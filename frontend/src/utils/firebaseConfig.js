import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, remove } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyA5fUzvv8bA8CLODsqTHTJYilgiSz8ATEY",
  authDomain: "finelprojectrtweb.firebaseapp.com",
  databaseURL: "https://finelprojectrtweb-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "finelprojectrtweb",
  storageBucket: "finelprojectrtweb.firebasestorage.app",
  messagingSenderId: "879662956136",
  appId: "1:879662956136:web:082344d2d5a3c814eb85dd",
  measurementId: "G-5B4D0JG2B2"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, set, onValue, remove };