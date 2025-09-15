"use client";

import {
  addDoc,
  collection,
  doc,
  runTransaction,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Generates a random 10-character alphanumeric string.
 * @returns {string} The generated invite code.
 */
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 12).toUpperCase();
}

/**
 * Creates a new family document and sets the creating user as the owner.
 * @param userId The ID of the user creating the family.
 */
export async function createFamily(userId: string): Promise<void> {
  const inviteCode = generateInviteCode();
  const familyRef = await addDoc(collection(db, "families"), {
    ownerId: userId,
    createdAt: new Date(),
    inviteCode: inviteCode,
  });

  const userRef = doc(db, "users", userId);
  await runTransaction(db, async (transaction) => {
    transaction.update(userRef, {
      familyId: familyRef.id,
      role: "owner",
    });
  });
}

/**
 * Allows a user to join an existing family using a friendly invite code.
 * @param userId The ID of the user joining.
 * @param inviteCode The 10-character family invite code.
 */
export async function joinFamily(userId: string, inviteCode: string): Promise<void> {
  const familiesRef = collection(db, "families");
  const q = query(familiesRef, where("inviteCode", "==", inviteCode.toUpperCase()), limit(1));

  const userRef = doc(db, "users", userId);

  await runTransaction(db, async (transaction) => {
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("Invalid invite code. Family does not exist.");
    }
    
    const familyDoc = querySnapshot.docs[0];

    transaction.update(userRef, {
      familyId: familyDoc.id,
      role: "member",
    });
  });
}
