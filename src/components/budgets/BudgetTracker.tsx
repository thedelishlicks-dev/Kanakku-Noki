"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "../ui/scroll-area";

interface Budget {
  id: string;
  category: string;
  amount: number;
  month: string;
}

interface Transaction {
  id: string;
  amount: number;
  category: string;
  type: "income" | "expense";
  date: Timestamp;
}

interface BudgetWithSpending extends Budget {
  spent: number;
  remaining: number;
  progress: number;
}

export default function BudgetTracker() {
  const [budgetsWithSpending, setBudgetsWithSpending] = useState<BudgetWithSpending[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchFamilyIdAndBudgets = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists() || !userDoc.data().familyId) {
        setLoading(false);
        return;
      }

      const familyId = userDoc.data().familyId;

      const budgetQuery = query(
        collection(db, "budgets"),
        where("familyId", "==", familyId)
      );

      const unsubscribeBudgets = onSnapshot(budgetQuery, (budgetSnapshot) => {
        const budgetsData: Budget[] = [];
        budgetSnapshot.forEach((doc) => {
          budgetsData.push({ id: doc.id, ...doc.data() } as Budget);
        });

        const transactionQuery = query(
          collection(db, "transactions"),
          where("familyId", "==", familyId),
          where("type", "==", "expense")
        );

        const unsubscribeTransactions = onSnapshot(transactionQuery, (transactionSnapshot) => {
          const transactionsData: Transaction[] = [];
          transactionSnapshot.forEach((doc) => {
            transactionsData.push({ id: doc.id, ...doc.data() } as Transaction);
          });

          const updatedBudgets = budgetsData.map((budget) => {
            const budgetMonth = budget.month.toLowerCase();
            
            const spent = transactionsData
              .filter((t) => {
                const transactionMonth = t.date.toDate().toLocaleString('default', { month: 'long', year: 'numeric' }).toLowerCase();
                const mainCategory = t.category.split(':')[0];
                return mainCategory.toLowerCase() === budget.category.toLowerCase() && transactionMonth === budgetMonth;
              })
              .reduce((sum, t) => sum + Math.abs(t.amount), 0);

            const remaining = budget.amount - spent;
            const progress = (spent / budget.amount) * 100;

            return { ...budget, spent, remaining, progress };
          });

          setBudgetsWithSpending(updatedBudgets);
          setLoading(false);
        });

        return () => unsubscribeTransactions();
      }, (error) => {
        console.error("Error fetching budgets:", error);
        setLoading(false);
      });

      return () => unsubscribeBudgets();
    };
    
    const unsubscribe = auth.onAuthStateChanged(user => {
        if (user) {
            fetchFamilyIdAndBudgets();
        } else {
            setBudgetsWithSpending([]);
            setLoading(false);
        }
    });

    return () => unsubscribe();
  }, [toast]);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  return (
    <Card className="w-full animate-fade-in shadow-xl">
      <CardHeader>
        <CardTitle>Budget Tracker</CardTitle>
        <CardDescription>Your budget performance for the current period.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
            <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            </div>
        ) : budgetsWithSpending.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No budgets set yet.</p>
        ) : (
            <ScrollArea className="h-[250px] space-y-6">
                {budgetsWithSpending.map((budget) => (
                <div key={budget.id} className="space-y-2 pr-4">
                    <div className="flex justify-between items-baseline">
                        <p className="font-semibold">{budget.category} <span className="text-sm text-muted-foreground font-normal">({budget.month})</span></p>
                        <p className="text-sm text-muted-foreground">
                            <span className={`${budget.remaining < 0 ? 'text-red-600' : 'text-green-600'} font-medium`}>{formatCurrency(budget.spent)}</span> / {formatCurrency(budget.amount)}
                        </p>
                    </div>
                    <Progress value={budget.progress} className="h-3" />
                    <p className="text-xs text-right text-muted-foreground">
                        {budget.remaining >= 0 ? `${formatCurrency(budget.remaining)} remaining` : `${formatCurrency(Math.abs(budget.remaining))} over budget`}
                    </p>
                </div>
                ))}
            </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
