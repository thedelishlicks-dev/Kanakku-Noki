"use client";

import type { User } from "firebase/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import TransactionForm from "../transactions/TransactionForm";
import TransactionList from "../transactions/TransactionList";

interface DashboardProps {
  user: User;
  onSignOut: () => void;
}

export default function Dashboard({ user, onSignOut }: DashboardProps) {
  const getInitials = (email: string | null) => {
    if (!email) return "U";
    const name = email.split('@')[0];
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="w-full space-y-6">
      <Card className="w-full animate-fade-in shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 text-lg">
              <AvatarImage src={user.photoURL || undefined} alt="User avatar" />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <CardTitle className="text-2xl font-headline">Welcome!</CardTitle>
              <CardDescription className="truncate">{user.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You have successfully logged in. This is your personal dashboard where you can manage your account and explore features.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={onSignOut} variant="outline" className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardFooter>
      </Card>
      <Card className="w-full animate-fade-in shadow-xl">
        <CardHeader>
          <CardTitle>Add New Transaction</CardTitle>
          <CardDescription>Enter the details of your transaction below.</CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionForm />
        </CardContent>
      </Card>
      <Card className="w-full animate-fade-in shadow-xl">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>A list of your most recent transactions.</CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionList />
        </CardContent>
      </Card>
    </div>
  );
}
