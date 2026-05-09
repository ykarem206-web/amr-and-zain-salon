import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA1A_MxTa6ZRa-Dp3Dt0Fw87w7fASO4PoU",
  authDomain: "amr-and-zain.firebaseapp.com",
  projectId: "amr-and-zain",
  storageBucket: "amr-and-zain.firebasestorage.app",
  messagingSenderId: "967997333804",
  appId: "1:967997333804:web:2b7c731f8c32c794cb8c89"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);