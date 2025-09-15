// src/lib/firebase.ts
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, type User } from 'firebase/auth';

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

/**
 * Creates or updates a user document in Firestore.
 * This function is designed to be idempotent and ensures every user has a familyId.
 * - If the user is new, it creates a document with a new familyId (or the one from an invite).
 * - If the user exists but lacks a familyId, it adds one.
 * - If the user exists and has a familyId, it does nothing unless a new familyId is provided via invite.
 * @param user The Firebase user object.
 * @param familyId Optional familyId to associate with the user (typically from an invitation link).
 */
export const upsertUserDocument = async (user: User, familyId: string | null = null) => {
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    // Case 1: New user.
    // Create a new family for them, using their own UID as the familyId, unless one is provided.
    const newFamilyId = familyId || user.uid;
    const userData = {
      email: user.email,
      uid: user.uid,
      createdAt: new Date(),
      familyId: newFamilyId,
    };
    await setDoc(userRef, userData);
  } else {
    const userData = userDoc.data();
     if (familyId && userData.familyId !== familyId) {
      // Case 2: Existing user joins a new family via an invite link.
      // This might happen if they were already in a different family.
      await setDoc(userRef, { familyId: familyId }, { merge: true });
    } else if (!userData.familyId) {
        // Case 3: Existing user without a family signs in normally.
        // Create a new family for them, making them the "owner".
        await setDoc(userRef, { familyId: user.uid }, { merge: true });
    }
  }
};


// Export the services for use in other parts of your app
export { db, auth };
