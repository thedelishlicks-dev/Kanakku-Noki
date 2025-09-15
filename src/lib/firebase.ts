// src/lib/firebase.ts
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
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
 * This function is designed to be idempotent.
 * - If the user is new, it creates a document without a familyId.
 * - If a familyId is provided (from an invitation), it adds the user to that family.
 * - If an existing user has no familyId, it creates one for them.
 * @param user The Firebase user object.
 * @param familyId Optional familyId to associate with the user (typically from an invitation link).
 */
export const upsertUserDocument = async (user: User, familyId: string | null = null) => {
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    // New user signing up for the first time
    const userData: {email: string | null; uid: string; createdAt: Date; familyId?: string, role?: string} = {
      email: user.email,
      uid: user.uid,
      createdAt: new Date(),
    };
    // If they are joining via an invite link, set their familyId and role immediately
    if (familyId) {
      userData.familyId = familyId;
      userData.role = 'member';
    }
    await setDoc(userRef, userData);
  } else {
    // Existing user
    const userData = userDoc.data();
    if (familyId && userData.familyId !== familyId) {
      // User is accepting an invitation to a new family
      await updateDoc(userRef, { familyId: familyId, role: 'member' });
    } else if (!userData.familyId && !familyId) {
      // Existing user who has no family (e.g., signed up before onboarding)
      // This case is now handled by the Onboarding component, but as a fallback,
      // we can leave the user to go through the onboarding flow.
    }
  }
};


// Export the services for use in other parts of your app
export { db, auth };
