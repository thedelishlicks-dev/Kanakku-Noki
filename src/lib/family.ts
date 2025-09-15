"use client";

import {
  addDoc,
  collection,
  doc,
  runTransaction,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Creates a new family document and sets the creating user as the owner.
 * @param userId The ID of the user creating the family.
 */
export async function createFamily(userId: string): Promise<void> {
  const familyRef = await addDoc(collection(db, "families"), {
    ownerId: userId,
    createdAt: new Date(),
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
 * Allows a user to join an existing family using an invite code (familyId).
 * @param userId The ID of the user joining.
 * @param inviteCode The family document ID.
 */
export async function joinFamily(userId: string, inviteCode: string): Promise<void> {
  const familyRef = doc(db, "families", inviteCode);
  const userRef = doc(db, "users", userId);

  await runTransaction(db, async (transaction) => {
    const familyDoc = await transaction.get(familyRef);
    if (!familyDoc.exists()) {
      throw new Error("Invalid invite code. Family does not exist.");
    }

    transaction.update(userRef, {
      familyId: familyDoc.id,
      role: "member",
    });
  });
}
