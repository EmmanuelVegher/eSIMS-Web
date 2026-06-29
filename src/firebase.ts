import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAU4cpGgg5Y1_vutKSBJXuDtxuMrSCvrf4",
  appId: "1:612856433910:web:f34eef1fe8b34f5eee30d7",
  messagingSenderId: "612856433910",
  projectId: "ccosag-d41e5",
  authDomain: "ccosag-d41e5.firebaseapp.com",
  storageBucket: "ccosag-d41e5.appspot.com",
  measurementId: "G-CBE744MSZ1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
