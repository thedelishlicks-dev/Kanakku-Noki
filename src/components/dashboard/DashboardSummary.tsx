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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownCircle, ArrowUpCircle, MinusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  date: Timestamp;
}

export default function DashboardSummary() {
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [netBalance, setNetBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchFamilyIdAndData = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }
      
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists() || !userDoc.data().familyId) {
        toast({
            variant: "destructive",
            title: "Family ID not found",
            description: "Cannot fetch summary data without a family ID.",
        });
        setLoading(false);
        return;
      }
      
      const familyId = userDoc.data().familyId;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const q = query(
        collection(db, "transactions"),
        where("familyId", "==", familyId)
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        let income = 0;
        let expenses = 0;

        querySnapshot.forEach((doc) => {
          const transaction = doc.data() as Omit<Transaction, 'id'>;
          const transactionDate = transaction.date.toDate();

          if (transactionDate >= startOfMonth && transactionDate <= endOfMonth) {
            if (transaction.type === "income") {
              income += transaction.amount;
            } else {
              expenses += Math.abs(transaction.amount);
            }
          }
        });
        
        const adjustedExpenses = querySnapshot.docs.map(d => d.data() as Omit<Transaction, 'id'>)
          .filter(t => {
              const transactionDate = t.date.toDate();
              return transactionDate >= startOfMonth && transactionDate <= endOfMonth && t.type === 'expense';
          })
          .reduce((sum, t) => sum + t.amount, 0);

        const adjustedIncome = querySnapshot.docs.map(d => d.data() as Omit<Transaction, 'id'>)
          .filter(t => {
              const transactionDate = t.date.toDate();
              return transactionDate >= startOfMonth && transactionDate <= endOfMonth && t.type === 'income';
          })
          .reduce((sum, t) => sum + t.amount, 0);


        setTotalIncome(adjustedIncome);
        setTotalExpenses(Math.abs(adjustedExpenses));
        setNetBalance(adjustedIncome + adjustedExpenses);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching summary data:", error);
        setLoading(false);
      });

      return () => unsubscribe();
    };

    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      if (user) {
        fetchFamilyIdAndData();
      } else {
        setTotalIncome(0);
        setTotalExpenses(0);
        setNetBalance(0);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-[125px] w-full" />
        <Skeleton className="h-[125px] w-full" />
        <Skeleton className="h-[125px] w-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          <ArrowUpCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
          <p className="text-xs text-muted-foreground">
            For {currentMonth}
          </p>
        </CardContent>
      </Card>
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <ArrowDownCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
           <p className="text-xs text-muted-foreground">
            For {currentMonth}
          </p>
        </CardContent>
      </Card>
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
          <MinusCircle className={`h-4 w-4 ${netBalance >= 0 ? 'text-blue-500' : 'text-yellow-500'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-blue-600' : 'text-yellow-600'}`}>
            {formatCurrency(netBalance)}
          </div>
           <p className="text-xs text-muted-foreground">
            For {currentMonth}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
