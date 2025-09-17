"use client";

import type { User } from "firebase/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogOut, Users, Settings, LayoutGrid } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import BottomNavigationBar from "./BottomNavigationBar";
import AccountManagement from "../accounts/AccountManagement";
import CategoryManagement from "../categories/CategoryManagement";
import FinancialReports from "../reports/FinancialReports";
import InviteMembers from "../family/InviteMembers";
import PlanningView from "./PlanningView";
import DashboardView from "./DashboardView";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardProps {
  user: User;
  onSignOut: () => void;
  initialView?: string;
}

interface UserProfile {
    role?: 'owner' | 'member';
}

export default function Dashboard({ user, onSignOut, initialView = "dashboard" }: DashboardProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState(initialView);
  const [showFamilyManagement, setShowFamilyManagement] = useState(false);
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                setUserProfile(userDoc.data() as UserProfile);
            }
        }
    }
    fetchUserProfile();
  }, [user])

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
    if (showCategoryManagement) {
      return <CategoryManagement />;
    }

    switch (activeView) {
      case "dashboard":
        return <DashboardView />;
      case "accounts":
        return <AccountManagement />;
      case "planning":
        return <PlanningView />;
      case "reports":
        return <FinancialReports />;
      default:
        return <DashboardView />;
    }
  };
  
  const handleViewChange = (view: string) => {
    setShowFamilyManagement(false);
    setShowCategoryManagement(false);
    setActiveView(view);
  }

  return (
    <div className="w-full max-w-7xl space-y-6 pb-24">
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
                        <DropdownMenuItem onSelect={() => {
                          setShowFamilyManagement(true);
                          setShowCategoryManagement(false);
                          setActiveView('');
                        }}>
                          <Users className="mr-2 h-4 w-4" />
                          <span>Family Management</span>
                        </DropdownMenuItem>
                     )}
                     <DropdownMenuItem onSelect={() => {
                        setShowFamilyManagement(false);
                        setShowCategoryManagement(true);
                        setActiveView('');
                     }}>
                        <LayoutGrid className="mr-2 h-4 w-4" />
                        <span>Categories</span>
                     </DropdownMenuItem>
                    <DropdownMenuItem onSelect={onSignOut}>
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
  );
}
