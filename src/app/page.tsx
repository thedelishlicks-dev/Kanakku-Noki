"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // If user is logged in, redirect to the dashboard
        router.replace('/dashboard');
      } else {
        // If user is not logged in, redirect to the login page (or show it)
        // For now, let's assume we want them at the dashboard path where login will be handled
        router.replace('/dashboard');
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
    </div>
  );
}
