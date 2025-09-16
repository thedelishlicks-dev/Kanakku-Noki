"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export default function AccountList() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAccounts = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().familyId) {
        const familyId = userDoc.data().familyId;
        const q = query(
          collection(db, "accounts"),
          where("familyId", "==", familyId)
        );

        const unsubscribe = onSnapshot(
          q,
          (querySnapshot) => {
            const accountsData: Account[] = [];
            querySnapshot.forEach((doc) => {
              accountsData.push({ id: doc.id, ...doc.data() } as Account);
            });
            setAccounts(accountsData);
            setLoading(false);
          },
          (error) => {
            console.error("Error fetching accounts:", error);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Could not fetch accounts.",
            });
            setLoading(false);
          }
        );

        return () => unsubscribe();
      } else {
        setLoading(false);
      }
    };

    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      if(user) {
        fetchAccounts();
      } else {
        setAccounts([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [toast]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle>Your Accounts</CardTitle>
        <CardDescription>A list of all your financial accounts.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : accounts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No accounts created yet.
          </p>
        ) : (
          <ScrollArea className="h-[350px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{account.type}</Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold ${
                        account.balance >= 0 ? "text-primary" : "text-destructive"
                      }`}
                    >
                      {formatCurrency(account.balance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
