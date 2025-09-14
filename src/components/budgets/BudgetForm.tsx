"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addDoc, collection } from "firebase/firestore";
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

export default function BudgetForm() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

    setLoading(true);
    try {
      const familyId = "hardcoded-family-id"; // As requested
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
                  disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Set Budget
        </Button>
      </form>
    </Form>
  );
}
