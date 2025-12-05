// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCNlStMttfkXHfpUYtoLipM61VSYWx7xQA",
  authDomain: "smart-irrigation-5450e.firebaseapp.com",
  databaseURL: "https://smart-irrigation-5450e-default-rtdb.firebaseio.com",
  projectId: "smart-irrigation-5450e",
  storageBucket: "smart-irrigation-5450e.firebasestorage.app",
  messagingSenderId: "631927372964",
  appId: "1:631927372964:web:ec817d7b376daed2297a31",
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const auth = getAuth(app);
