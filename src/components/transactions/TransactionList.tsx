"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  type: "income" | "expense";
  date: Timestamp;
}

export default function TransactionList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const familyId = "hardcoded-family-id"; // As requested

    const q = query(
      collection(db, "transactions"),
      where("familyId", "==", familyId)
      // orderBy("date", "desc") // Temporarily removed to prevent crash.
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const transactionsData: Transaction[] = [];
        querySnapshot.forEach((doc) => {
          transactionsData.push({ id: doc.id, ...doc.data() } as Transaction);
        });
        
        // Sort transactions by date client-side
        transactionsData.sort((a, b) => b.date.toMillis() - a.date.toMillis());

        setTransactions(transactionsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching transactions:", error);
        // The console will show a more detailed error, including a link to create the index.
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleDateString("en-US", {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return <p className="text-center text-muted-foreground">No transactions found.</p>;
  }

  return (
    <ScrollArea className="h-[300px] w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="text-muted-foreground">{formatDate(transaction.date)}</TableCell>
              <TableCell className="font-medium">{transaction.description}</TableCell>
              <TableCell>
                <Badge variant="outline">{transaction.category}</Badge>
              </TableCell>
              <TableCell
                className={`text-right font-semibold ${
                  transaction.type === "income"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(transaction.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
