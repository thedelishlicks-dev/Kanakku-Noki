"use client";

import { useState, useEffect } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import Login from "@/components/auth/Login";
import SignUp from "@/components/auth/SignUp";
import Dashboard from "@/components/dashboard/Dashboard";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"login" | "signup">("login");
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast({
        variant: "destructive",
        title: "Sign Out Failed",
        description: error.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4 md:p-8">
      <div className="w-full">
        {user ? (
          <div className="flex justify-center">
            <Dashboard user={user} onSignOut={handleSignOut} />
          </div>
        ) : (
          <div className="mx-auto w-full max-w-md">
            {view === "login" ? (
              <Login onSwitchToSignUp={() => setView("signup")} />
            ) : (
              <SignUp onSwitchToLogin={() => setView("login")} />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
