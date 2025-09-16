"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  category: z.string().min(1, { message: "Category is required." }),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
  month: z.string().min(1, { message: "Month is required." }),
});

type BudgetFormValues = z.infer<typeof formSchema>;

interface BudgetFormProps {
    onBudgetCreated?: () => void;
}

export default function BudgetForm({ onBudgetCreated }: BudgetFormProps) {
  const [loading, setLoading] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchFamilyId = async () => {
      if (auth.currentUser) {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().familyId) {
          setFamilyId(userDoc.data().familyId);
        } else {
           toast({
            variant: "destructive",
            title: "Family ID not found.",
            description: "Please ensure you are part of a family.",
          });
        }
      }
    };
    fetchFamilyId();
  }, [toast]);


  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "",
      amount: 0,
      month: "",
    },
  });

  async function onSubmit(values: BudgetFormValues) {
    if (!auth.currentUser) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to add a budget.",
      });
      return;
    }
    
    if (!familyId) {
      toast({
        variant: "destructive",
        title: "Family ID Error",
        description: "Could not find a family ID for the current user.",
      });
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "budgets"), {
        ...values,
        familyId: familyId,
        uid: auth.currentUser.uid,
        createdAt: new Date(),
      });

      toast({
        title: "Success!",
        description: "Budget set successfully.",
      });
      form.reset();
      onBudgetCreated?.();
    } catch (error: any) {
      console.error("Error adding budget:", error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Groceries"
                  {...field}
                  disabled={loading || !familyId}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="500"
                  {...field}
                  disabled={loading || !familyId}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="month"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Month</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., October 2025"
                  {...field}
                  disabled={loading || !familyId}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={loading || !familyId}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Set Budget
        </Button>
      </form>
    </Form>
  );
}
