"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import TransactionList from "../transactions/TransactionList";
import BudgetTracker from "../budgets/BudgetTracker";
import DashboardSummary from "./DashboardSummary";

export default function DashboardView() {
  return (
    <div className="space-y-6">
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
  );
}
