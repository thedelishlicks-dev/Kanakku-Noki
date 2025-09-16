// src/lib/firebase.ts
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { getAuth, type User } from 'firebase/auth';
import { createFamily } from './family';

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
 * This function is designed to be idempotent and handle various sign-up/sign-in scenarios.
 * @param user The Firebase user object.
 * @param familyId Optional familyId from an invitation link.
 */
export const upsertUserDocument = async (user: User, familyId: string | null = null) => {
  const userRef = doc(db, 'users', user.uid);
  
  try {
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // Case 1: A brand new user is signing up.
      const userData: {
        email: string | null;
        uid: string;
        createdAt: any;
        familyId?: string;
        role?: 'owner' | 'member';
      } = {
        email: user.email,
        uid: user.uid,
        createdAt: serverTimestamp(),
      };
      
      if (familyId) {
        // Subcase 1a: New user is joining via an invite link.
        userData.familyId = familyId;
        userData.role = 'member';
      }
      
      await setDoc(userRef, userData);

    } else {
      // Case 2: An existing user is signing in.
      const userData = userDoc.data();
      const updates: { familyId?: string; role?: 'owner' | 'member' } = {};

      if (familyId && userData.familyId !== familyId) {
        // Subcase 2a: Existing user (who might not have a family) is accepting an invitation.
        updates.familyId = familyId;
        updates.role = 'member';
      }
      
      if (Object.keys(updates).length > 0) {
        await updateDoc(userRef, updates);
      }
    }
  } catch (error) {
    console.error("Error in upsertUserDocument: ", error);
    // Optionally re-throw or handle the error as needed
  }
};


// Export the services for use in other parts of your app
export { db, auth };
