"use client";

import { useState, useEffect } from "react";
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  onSnapshot,
  Timestamp
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Target } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ScrollArea } from "../ui/scroll-area";

interface Goal {
  id: string;
  goalName: string;
  targetAmount: number;
  targetDate: Timestamp;
}

interface GoalWithProgress extends Goal {
  currentAmount: number;
  progress: number;
}

interface Transaction {
    id: string;
    amount: number;
    category: string;
    type: "income" | "expense";
    goalId?: string;
}

export default function GoalsTracker() {
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchFamilyId = async () => {
      if (auth.currentUser) {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().familyId) {
          setFamilyId(userDoc.data().familyId);
        }
      }
    };
    
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      if(user) {
        fetchFamilyId();
      } else {
        setFamilyId(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!familyId) {
      setGoals([]);
      setGoalsLoading(false);
      return;
    };

    setGoalsLoading(true);
    const goalsQuery = query(collection(db, "goals"), where("familyId", "==", familyId));
    const unsubscribeGoals = onSnapshot(goalsQuery, (goalSnapshot) => {
      const goalsData = goalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal));

      const transactionsQuery = query(
        collection(db, "transactions"),
        where("familyId", "==", familyId)
      );

      const unsubscribeTransactions = onSnapshot(transactionsQuery, (transactionSnapshot) => {
        const transactionsData = transactionSnapshot.docs.map(doc => doc.data() as Transaction);
        
        const goalsWithProgress = goalsData.map(goal => {
            const contributions = transactionsData
                .filter(t => t.goalId === goal.id)
                .reduce((sum, t) => sum + t.amount, 0);
            
            const progress = (contributions / goal.targetAmount) * 100;
            return { ...goal, currentAmount: contributions, progress };
        });

        setGoals(goalsWithProgress);
        setGoalsLoading(false);
      });

      return () => unsubscribeTransactions();
    }, (error) => {
      console.error("Error fetching goals: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch goals." });
      setGoalsLoading(false);
    });

    return () => unsubscribeGoals();
  }, [familyId, toast]);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  return (
      <Card className="w-full animate-fade-in shadow-xl">
        <CardHeader>
          <CardTitle>Financial Goals</CardTitle>
          <CardDescription>Your family's progress towards financial goals.</CardDescription>
        </CardHeader>
        <CardContent>
          {goalsLoading ? (
             <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
          ) : goals.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No goals set yet.</p>
          ) : (
            <ScrollArea className="h-[250px] space-y-6">
              {goals.map((goal) => (
                <div key={goal.id} className="space-y-2 pr-4">
                  <div className="flex justify-between items-baseline">
                      <p className="font-semibold flex items-center gap-2">
                          <Target className="h-4 w-4 text-primary" />
                          {goal.goalName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                          <span className="text-green-600 font-medium">{formatCurrency(goal.currentAmount)}</span> / {formatCurrency(goal.targetAmount)}
                      </p>
                  </div>
                  <Progress value={goal.progress} className="h-3" />
                  <p className="text-xs text-right text-muted-foreground">
                      Target: {format(goal.targetDate.toDate(), "MMM yyyy")}
                  </p>
                </div>
              ))}
            </ScrollArea>
          )}
        </CardContent>
      </Card>
  );
}
