"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addDoc, collection, doc, getDoc, query, where, onSnapshot, Timestamp } from "firebase/firestore";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
  description: z.string().min(1, { message: "Description is required." }),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1, { message: "Category is required." }),
  date: z.date(),
  goalId: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof formSchema>;

interface Goal {
  id: string;
  goalName: string;
  targetAmount: number;
  targetDate: Timestamp;
}

export default function TransactionForm() {
  const [loading, setLoading] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchFamilyAndGoals = async () => {
      if (auth.currentUser) {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().familyId) {
          const fetchedFamilyId = userDoc.data().familyId;
          setFamilyId(fetchedFamilyId);

          const goalsQuery = query(collection(db, "goals"), where("familyId", "==", fetchedFamilyId));
          const unsubscribe = onSnapshot(goalsQuery, (snapshot) => {
            const goalsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal));
            setGoals(goalsData);
          });
          return () => unsubscribe();
        } else {
           toast({
            variant: "destructive",
            title: "Family ID not found.",
            description: "Please ensure you are part of a family.",
          });
        }
      }
    };
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        fetchFamilyAndGoals();
      } else {
        setFamilyId(null);
        setGoals([]);
      }
    })
    return () => unsubscribe();
  }, [toast]);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      description: "",
      type: "expense",
      category: "",
      date: new Date(),
      goalId: undefined,
    },
  });

  async function onSubmit(values: TransactionFormValues) {
    if (!auth.currentUser) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to add a transaction.",
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
      const transactionData: any = {
        ...values,
        amount: values.type === 'expense' ? -Math.abs(values.amount) : Math.abs(values.amount),
        uid: auth.currentUser.uid,
        familyId: familyId,
        createdAt: new Date(),
      };

      if (!values.goalId) {
        delete transactionData.goalId;
      }

      await addDoc(collection(db, "transactions"), transactionData);

      toast({
        title: "Success!",
        description: "Transaction added successfully.",
      });
      form.reset({
        amount: 0,
        description: "",
        type: "expense",
        category: "",
        date: new Date(),
        goalId: undefined,
      });
    } catch (error: any) {
      console.error("Error adding transaction:", error);
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
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0.00"
                  {...field}
                  disabled={!familyId}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Groceries, Salary"
                  {...field}
                  disabled={!familyId}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={!familyId}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Food, Transport"
                  {...field}
                  disabled={!familyId}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="goalId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contribute to Goal (Optional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={!familyId || goals.length === 0}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a goal" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {goals.map(goal => (
                    <SelectItem key={goal.id} value={goal.id}>{goal.goalName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={!familyId}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={loading || !familyId}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Transaction
        </Button>
      </form>
    </Form>
  );
}
