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
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";

interface Transaction {
  id: string;
  amount: number;
  category: string;
  type: "income" | "expense";
  date: Timestamp;
}

interface ChartData {
  name: string;
  value: number;
}

interface BarChartData {
  month: string;
  income: number;
  expenses: number;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#AF19FF",
  "#FF4274",
];

export default function FinancialReports() {
  const [expenseData, setExpenseData] = useState<ChartData[]>([]);
  const [incomeExpenseData, setIncomeExpenseData] = useState<BarChartData[]>([]);
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
          description: "Cannot fetch reports without a family ID.",
        });
        setLoading(false);
        return;
      }

      const familyId = userDoc.data().familyId;
      const q = query(
        collection(db, "transactions"),
        where("familyId", "==", familyId)
      );

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const transactions: Transaction[] = [];
          querySnapshot.forEach((doc) => {
            transactions.push({ id: doc.id, ...doc.data() } as Transaction);
          });

          // Process data for pie chart (current month expenses)
          const now = new Date();
          const currentMonthStart = startOfMonth(now);
          const currentMonthEnd = endOfMonth(now);

          const monthlyExpenses = transactions.filter(
            (t) =>
              t.type === "expense" &&
              t.date.toDate() >= currentMonthStart &&
              t.date.toDate() <= currentMonthEnd
          );

          const expenseByCategory = monthlyExpenses.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
            return acc;
          }, {} as { [key: string]: number });

          setExpenseData(
            Object.entries(expenseByCategory).map(([name, value]) => ({
              name,
              value,
            }))
          );

          // Process data for bar chart (last 6 months income vs expenses)
          const sixMonthsData: BarChartData[] = [];
          for (let i = 5; i >= 0; i--) {
            const date = subMonths(now, i);
            const monthStart = startOfMonth(date);
            const monthEnd = endOfMonth(date);
            
            const monthTransactions = transactions.filter(
              (t) =>
                t.date.toDate() >= monthStart && t.date.toDate() <= monthEnd
            );

            const income = monthTransactions
              .filter((t) => t.type === "income")
              .reduce((sum, t) => sum + t.amount, 0);
            
            const expenses = monthTransactions
              .filter((t) => t.type === "expense")
              .reduce((sum, t) => sum + Math.abs(t.amount), 0);

            sixMonthsData.push({
              month: format(date, "MMM yyyy"),
              income,
              expenses,
            });
          }
          setIncomeExpenseData(sixMonthsData);
          setLoading(false);
        },
        (error) => {
          console.error("Error fetching financial reports:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not fetch financial reports.",
          });
          setLoading(false);
        }
      );

      return () => unsubscribe();
    };

     const unsubscribeAuth = auth.onAuthStateChanged(user => {
      if (user) {
        fetchFamilyIdAndData();
      } else {
        setLoading(false);
        setExpenseData([]);
        setIncomeExpenseData([]);
      }
    });

    return () => unsubscribeAuth();
  }, [toast]);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
          <CardDescription>
            Current month's expenses by category.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expenseData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expenseData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={(props) => formatCurrency(props.value)}
                >
                  {expenseData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground h-[300px] flex items-center justify-center">No expense data for the current month.</p>
          )}
        </CardContent>
      </Card>
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Income vs. Expenses</CardTitle>
          <CardDescription>Last 6 months comparison.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={incomeExpenseData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatCurrency(value as number)} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="income" fill="#22c55e" name="Income" />
              <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
