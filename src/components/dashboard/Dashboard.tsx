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
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import TransactionList from "../transactions/TransactionList";
import BudgetTracker from "../budgets/BudgetTracker";
import DashboardSummary from "./DashboardSummary";
import GoalsTracker from "../goals/GoalsTracker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FinancialReports from "../reports/FinancialReports";
import InviteMembers from "../family/InviteMembers";
import AccountManagement from "../accounts/AccountManagement";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import CategoryManagement from "../categories/CategoryManagement";
import EventPlanner from "../events/EventPlanner";
import EventsDashboard from "../events/EventsDashboard";
import TransactionFormCard from "../transactions/TransactionFormCard";

interface DashboardProps {
  user: User;
  onSignOut: () => void;
}

interface UserProfile {
    role?: 'owner' | 'member';
}


export default function Dashboard({ user, onSignOut }: DashboardProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

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

  return (
    <div className="w-full max-w-7xl space-y-6">
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
                <Button onClick={onSignOut} variant="outline" size="sm">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <DashboardSummary />
                    <Card className="w-full animate-fade-in shadow-xl">
                        <CardHeader>
                            <CardTitle>Recent Transactions</CardTitle>
                            <CardDescription>A list of your most recent transactions.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TransactionList />
                        </CardContent>
                    </Card>
                    <BudgetTracker />
                </div>
                <div className="space-y-6">
                    <TransactionFormCard />
                </div>
            </div>
        </TabsContent>
        <TabsContent value="accounts" className="mt-6">
            <AccountManagement />
        </TabsContent>
         <TabsContent value="categories" className="mt-6">
            <CategoryManagement />
        </TabsContent>
        <TabsContent value="planning" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <GoalsTracker />
             <EventsDashboard />
           </div>
           <div className="mt-6">
            <EventPlanner />
           </div>
        </TabsContent>
        <TabsContent value="reports" className="mt-6">
          <FinancialReports />
        </TabsContent>
        <TabsContent value="family" className="mt-6">
             {userProfile?.role === 'owner' && (
                <Card className="w-full animate-fade-in shadow-xl max-w-md mx-auto">
                    <CardHeader>
                    <CardTitle>Family Management</CardTitle>
                    <CardDescription>Invite new members to your family.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <InviteMembers />
                    </CardContent>
                </Card>
             )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
