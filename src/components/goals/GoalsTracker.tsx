"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  addDoc,
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
import { Loader2, Target, CalendarIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  goalName: z.string().min(1, { message: "Goal name is required." }),
  targetAmount: z.coerce.number().positive({ message: "Target amount must be positive." }),
  targetDate: z.date({ required_error: "Target date is required." }),
});

type GoalFormValues = z.infer<typeof formSchema>;

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
  const [loading, setLoading] = useState(false);
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
        } else {
           toast({
            variant: "destructive",
            title: "Family ID not found.",
            description: "Please ensure you are part of a family to manage goals.",
          });
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

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      goalName: "",
      targetAmount: 0,
      targetDate: undefined,
    },
  });

  async function onSubmit(values: GoalFormValues) {
    if (!auth.currentUser || !familyId) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in and part of a family to add a goal.",
      });
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "goals"), {
        ...values,
        familyId: familyId,
        uid: auth.currentUser.uid,
        createdAt: new Date(),
      });

      toast({
        title: "Success!",
        description: "New goal set successfully.",
      });
      form.reset();
    } catch (error: any) {
      console.error("Error adding goal:", error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  }
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="w-full animate-fade-in shadow-xl">
        <CardHeader>
          <CardTitle>Create New Goal</CardTitle>
          <CardDescription>Define a new financial goal for your family.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="goalName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Vacation Fund" {...field} disabled={loading || !familyId} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Amount</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="25000" {...field} disabled={loading || !familyId} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Target Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                             disabled={loading || !familyId}
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
                            date < new Date()
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
                Add Goal
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card className="w-full animate-fade-in shadow-xl">
        <CardHeader>
          <CardTitle>Financial Goals</CardTitle>
          <CardDescription>Your family's progress towards financial goals.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {goalsLoading ? (
             <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
          ) : goals.length === 0 ? (
            <p className="text-center text-muted-foreground">No goals set yet. Create one to get started!</p>
          ) : (
            goals.map((goal) => (
              <div key={goal.id} className="space-y-2">
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
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
