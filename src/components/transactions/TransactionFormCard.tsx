"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import TransactionForm from "./TransactionForm";

export default function TransactionFormCard() {
  return (
    <Card className="w-full animate-fade-in shadow-xl">
      <CardHeader>
        <CardTitle>Add Transaction</CardTitle>
        <CardDescription>Log a new income or expense entry.</CardDescription>
      </CardHeader>
      <CardContent>
        <TransactionForm />
      </CardContent>
    </Card>
  );
}
