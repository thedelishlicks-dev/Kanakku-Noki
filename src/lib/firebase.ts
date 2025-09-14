import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC_UHYdr94bhW7nNLT3rFNzyuZFG1Pyofg",
  authDomain: "family-finance-97bcf.firebaseapp.com",
  projectId: "family-finance-97bcf",
  storageBucket: "family-finance-97bcf.firebasestorage.app",
  messagingSenderId: "596902443557",
  appId: "1:596902443557:web:7f6fb0f556e50409e25dcc"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
