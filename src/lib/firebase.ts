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
 * If a familyId is provided (e.g., from an invitation), it will be added to the user's document.
 * If no familyId is provided and the user is new, a new familyId is created using the user's UID.
 * This function is designed to be idempotent.
 * @param user The Firebase user object.
 * @param familyId Optional familyId to associate with the user.
 */
export const upsertUserDocument = async (user: User, familyId: string | null = null) => {
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    // For a new user, if no familyId is passed (i.e., not from an invite),
    // create a new family for them using their own UID as the familyId.
    const newFamilyId = familyId || user.uid;
    const userData = {
      email: user.email,
      uid: user.uid,
      createdAt: new Date(),
      familyId: newFamilyId,
    };
    await setDoc(userRef, userData);
  } else if (familyId && !userDoc.data().familyId) {
    // If an existing user who doesn't have a familyId signs in via an invite link,
    // add them to the family.
    await setDoc(userRef, { familyId }, { merge: true });
  }
};


// Export the services for use in other parts of your app
export { db, auth };
