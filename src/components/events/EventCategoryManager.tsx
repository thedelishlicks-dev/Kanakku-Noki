"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
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
import { Loader2, PlusCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Skeleton } from "../ui/skeleton";
import { Progress } from "../ui/progress";

interface EventCategoryManagerProps {
  eventId: string;
  familyId: string | null;
}

const formSchema = z.object({
  name: z.string().min(1, { message: "Category name is required." }),
  estimatedBudget: z.coerce
    .number()
    .positive({ message: "Budget must be a positive number." }),
});

type CategoryFormValues = z.infer<typeof formSchema>;

interface EventCategory {
  id: string;
  name: string;
  estimatedBudget: number;
}

interface Transaction {
    id: string;
    amount: number;
    type: 'income' | 'expense';
    date: Timestamp;
    eventId?: string;
    eventCategoryId?: string;
}

interface EventCategoryWithSpending extends EventCategory {
    spent: number;
    progress: number;
}

export default function EventCategoryManager({ eventId, familyId }: EventCategoryManagerProps) {
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [categories, setCategories] = useState<EventCategoryWithSpending[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!eventId || !familyId) {
      setListLoading(false);
      return;
    }
    setListLoading(true);
    const catQuery = query(
      collection(db, "events", eventId, "categories"),
      orderBy("name", "asc")
    );
    const unsubscribeCats = onSnapshot(
      catQuery,
      (snapshot) => {
        const categoriesData: EventCategory[] = [];
        snapshot.forEach((doc) => {
          categoriesData.push({ id: doc.id, ...doc.data() } as EventCategory);
        });

        const transQuery = query(
            collection(db, "transactions"),
            where("familyId", "==", familyId),
            where("eventId", "==", eventId)
        );

        const unsubscribeTrans = onSnapshot(transQuery, (transSnapshot) => {
            const transactionsData: Transaction[] = [];
            transSnapshot.forEach(doc => {
                transactionsData.push({ id: doc.id, ...doc.data() } as Transaction);
            });

            const categoriesWithSpending = categoriesData.map(cat => {
                const spent = transactionsData
                    .filter(t => t.eventCategoryId === cat.id && t.type === 'expense')
                    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
                
                const progress = cat.estimatedBudget > 0 ? (spent / cat.estimatedBudget) * 100 : 0;

                return { ...cat, spent, progress };
            });

            setCategories(categoriesWithSpending);
            setListLoading(false);
        });
        
        return () => unsubscribeTrans();
      },
      (error) => {
        console.error("Error fetching event categories:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not fetch event categories.",
        });
        setListLoading(false);
      }
    );

    return () => unsubscribeCats();
  }, [eventId, familyId, toast]);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      estimatedBudget: 0,
    },
  });

  async function onSubmit(values: CategoryFormValues) {
    setLoading(true);
    try {
      const subCollectionRef = collection(db, "events", eventId, "categories");
      await addDoc(subCollectionRef, {
        ...values,
        createdAt: new Date(),
      });

      toast({
        title: "Success!",
        description: "Event category added successfully.",
      });
      form.reset();
    } catch (error: any) {
      console.error("Error adding event category:", error);
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
    <div className="p-4 bg-secondary/50 rounded-lg mt-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold mb-4">Add Category Budget</h4>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Catering"
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
                name="estimatedBudget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Budget</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="10000"
                        {...field}
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                size="sm"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <PlusCircle className="mr-2 h-4 w-4" /> Add Budget
              </Button>
            </form>
          </Form>
        </div>
        <div>
           <h4 className="font-semibold mb-4">Category Budgets</h4>
           {listLoading ? (
             <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
             </div>
           ) : categories.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-8">No categories budgeted yet.</p>
           ) : (
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Budget vs Spent</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {categories.map(cat => (
                        <TableRow key={cat.id}>
                            <TableCell className="font-medium">{cat.name}</TableCell>
                            <TableCell className="text-right">
                                <div className="flex flex-col items-end">
                                    <span>
                                        <span className={cat.spent > cat.estimatedBudget ? "text-destructive" : "text-green-600"}>{formatCurrency(cat.spent)}</span>
                                        <span className="text-muted-foreground"> / {formatCurrency(cat.estimatedBudget)}</span>
                                    </span>
                                    <Progress value={cat.progress} className="h-2 w-24 mt-1" />
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
             </Table>
           )}
        </div>
      </div>
    </div>
  );
}
