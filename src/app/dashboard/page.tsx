"use client";

import { useState, useEffect } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signOut, isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db, upsertUserDocument } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import Login from "@/components/auth/Login";
import SignUp from "@/components/auth/SignUp";
import Onboarding from "@/components/auth/Onboarding";
import Dashboard from "@/components/dashboard/Dashboard";
import { Loader2 } from "lucide-react";

interface UserProfile {
  email: string | null;
  familyId?: string | null;
  role?: 'owner' | 'member';
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"login" | "signup">("login");
  const { toast } = useToast();

  useEffect(() => {
    const handleEmailLinkSignIn = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
          email = window.prompt('Please provide your email for confirmation');
        }
        if (email) {
          try {
            setLoading(true);
            const result = await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            
            const url = new URL(window.location.href);
            const familyId = url.searchParams.get('familyId');

            if (result.user) {
              await upsertUserDocument(result.user, familyId);
               if (familyId) {
                 toast({
                   title: "Welcome to the family!",
                   description: "You've been successfully added to the family group.",
                 });
               }
            }
          } catch (error: any) {
            console.error("Error signing in with email link:", error);
            toast({
              variant: "destructive",
              title: "Sign In Failed",
              description: "The sign-in link is invalid or has expired.",
            });
          } finally {
            // Clean up the URL
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('familyId');
            newUrl.searchParams.delete('apiKey');
            newUrl.searchParams.delete('oobCode');
            newUrl.searchParams.delete('mode');
            window.history.replaceState({}, document.title, newUrl.pathname);
            setLoading(false);
          }
        }
      }
    };
    
    handleEmailLinkSignIn().then(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
          setUser(currentUser);
          if (!currentUser) {
            setUserProfile(null);
            setLoading(false);
          }
        });
        return () => unsubscribe();
    })
  }, [toast]);

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, "users", user.uid);
      const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          const profileData = doc.data() as UserProfile;
          setUserProfile(profileData);
        } else {
           // This handles the case for users created before the onboarding flow was implemented.
           // It ensures their document is created. They will then see the onboarding screen.
           upsertUserDocument(user);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching user profile:", error);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

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
          userProfile?.familyId ? (
            <div className="flex justify-center">
              <Dashboard user={user} onSignOut={handleSignOut} />
            </div>
          ) : (
            <Onboarding user={user} />
          )
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
