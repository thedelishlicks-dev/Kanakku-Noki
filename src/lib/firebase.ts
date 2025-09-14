import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDA3vmqGBPIOR9SeSXb9HMy8j2ZEaLNjpQ",
  authDomain: "studio-2264868096-7e706.firebaseapp.com",
  projectId: "studio-2264868096-7e706",
  storageBucket: "studio-2264868096-7e706.firebasestorage.app",
  messagingSenderId: "240096414245",
  appId: "1:240096414245:web:b694dcf20755b8eed00dcc"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
