// src/lib/firebase.ts
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDA3vmqGBPIOR9SeSXb9HMy8j2ZEaLNjpQ",
  authDomain: "studio-2264868096-7e706.firebaseapp.com",
  projectId: "studio-2264868096-7e706",
  storageBucket: "studio-2264868096-7e706.firebasestorage.app",
  messagingSenderId: "240096414245",
  appId: "1:240096414245:web:1794c36acd48c9a3d00dcc"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Get a reference to the services
const db = getFirestore(app);
const auth = getAuth(app);

// Export the services for use in other parts of your app
export { db, auth };
