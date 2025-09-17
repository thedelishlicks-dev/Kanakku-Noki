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
import { Loader2 } from "lucide-react";
import BottomNavigationBar from "./BottomNavigationBar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Settings, Users, LayoutGrid, LogOut } from "lucide-react";
import InviteMembers from "../family/InviteMembers";
import CategoryManagement from "../categories/CategoryManagement";
import { usePathname } from "next/navigation";


interface UserProfile {
  email: string | null;
  familyId?: string | null;
  role?: 'owner' | 'member';
}

export default function BaseLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"login" | "signup">("login");
  const { toast } = useToast();
  const [showFamilyManagement, setShowFamilyManagement] = useState(false);

  const pathname = usePathname();

  useEffect(() => {
    // If navigating away from a special view, reset it
    setShowFamilyManagement(false);
  }, [pathname]);

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

  const getInitials = (email: string | null) => {
    if (!email) return "U";
    const name = email.split('@')[0];
    return name.substring(0, 2).toUpperCase();
  };

  const renderContent = () => {
     if (showFamilyManagement) {
      return (
         <Card className="w-full animate-fade-in shadow-xl max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Family Management</CardTitle>
              <CardDescription>Invite new members to your family.</CardDescription>
            </CardHeader>
            <CardContent>
              <InviteMembers />
            </CardContent>
        </Card>
      )
    }
    return children;
  }

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
            <div className="w-full max-w-7xl mx-auto space-y-6 pb-24">
               <Card className="w-full animate-fade-in shadow-xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 text-lg">
                        <AvatarImage src={user.photoURL || undefined} alt="User avatar" />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-xl font-headline">Welcome Back!</CardTitle>
                        <CardDescription className="truncate">{user.email}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Settings className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {userProfile?.role === 'owner' && (
                                <DropdownMenuItem onSelect={() => setShowFamilyManagement(true)}>
                                  <Users className="mr-2 h-4 w-4" />
                                  <span>Family Management</span>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onSelect={handleSignOut}>
                              <LogOut className="mr-2 h-4 w-4" />
                              <span>Sign Out</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
              </Card>
              
              <div className="mt-6">
                {renderContent()}
              </div>

              <BottomNavigationBar />
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
