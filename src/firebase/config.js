// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCTYINIDykTbeH3n8Jg9p287Zi-JL1hpO8",
  authDomain: "maatha-7193c.firebaseapp.com",
  projectId: "maatha-7193c",
  storageBucket: "maatha-7193c.firebasestorage.app",
  messagingSenderId: "1052612162492",
  appId: "1:1052612162492:web:eace899d377c870d32b1b9",
  measurementId: "G-F0TFPTNR2N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
