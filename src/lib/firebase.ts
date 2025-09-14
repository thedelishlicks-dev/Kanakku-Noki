// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC_UHYdr94bhW7nNLT3rFNzyuZFG1Pyofg",
  authDomain: "family-finance-97bcf.firebaseapp.com",
  projectId: "family-finance-97bcf",
  storageBucket: "family-finance-97bcf.firebasestorage.app",
  messagingSenderId: "596902443557",
  appId: "1:596902443557:web:7f6fb0f556e50409e25dcc"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the services
const db = getFirestore(app);
const auth = getAuth(app);

// Export the services for use in other parts of your app
export { db, auth };
