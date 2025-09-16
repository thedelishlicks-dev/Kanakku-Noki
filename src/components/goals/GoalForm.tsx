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
import { Loader2, CalendarIcon } from "lucide-react";
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

interface GoalFormProps {
    onGoalCreated?: () => void;
}

export default function GoalForm({ onGoalCreated }: GoalFormProps) {
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
  }, [toast]);

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
      onGoalCreated?.();
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

  return (
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
                <PopoverContent className="w-auto p-0" align="start" style={{ zIndex: 9999 }}>
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
  );
}
