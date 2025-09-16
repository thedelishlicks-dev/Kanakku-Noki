"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addDoc, collection, doc, getDoc, query, where, onSnapshot, Timestamp, runTransaction, increment, orderBy } from "firebase/firestore";
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
  categoryId: z.string().min(1, { message: "Category is required." }),
  subcategory: z.string().optional(),
  date: z.date(),
  accountId: z.string().min(1, { message: "Account is required." }),
  goalId: z.string().optional(),
  eventId: z.string().optional(),
  eventCategoryId: z.string().optional(),
});


type TransactionFormValues = z.infer<typeof formSchema>;

interface Goal {
  id: string;
  goalName: string;
}

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  subcategories?: string[];
}

interface Event {
    id: string;
    name: string;
}

interface EventCategory {
    id: string;
    name: string;
}

export default function TransactionForm() {
  const [loading, setLoading] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventCategories, setEventCategories] = useState<EventCategory[]>([]);
  const { toast } = useToast();
  
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      description: "",
      type: "expense",
      categoryId: "",
      subcategory: "",
      date: new Date(),
      accountId: "",
      goalId: "none",
      eventId: "none",
      eventCategoryId: "none",
    },
  });

  const transactionType = form.watch("type");
  const selectedCategoryId = form.watch("categoryId");
  const selectedEventId = form.watch("eventId");
  
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const subcategories = selectedCategory?.subcategories || [];

  useEffect(() => {
    form.reset({
      ...form.getValues(),
      categoryId: "",
      subcategory: "",
    })
  }, [transactionType, form]);
  
  useEffect(() => {
    form.setValue('eventCategoryId', 'none');
    if (selectedEventId && selectedEventId !== "none") {
        const q = query(collection(db, "events", selectedEventId, "categories"), orderBy("name"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const eventCats = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as EventCategory));
            setEventCategories(eventCats);
        });
        return () => unsubscribe();
    } else {
        setEventCategories([]);
    }
  }, [selectedEventId, form]);


  useEffect(() => {
    const fetchFamilyAndData = async () => {
      if (auth.currentUser) {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().familyId) {
          const fetchedFamilyId = userDoc.data().familyId;
          setFamilyId(fetchedFamilyId);

          const goalsQuery = query(collection(db, "goals"), where("familyId", "==", fetchedFamilyId));
          const unsubscribeGoals = onSnapshot(goalsQuery, (snapshot) => {
            const goalsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal));
            setGoals(goalsData);
          });

          const accountsQuery = query(collection(db, "accounts"), where("familyId", "==", fetchedFamilyId));
          const unsubscribeAccounts = onSnapshot(accountsQuery, (snapshot) => {
            const accountsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
            setAccounts(accountsData);
          });

          const categoriesQuery = query(collection(db, "categories"), where("familyId", "==", fetchedFamilyId));
          const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
            const categoriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
            setCategories(categoriesData);
          });

          const eventsQuery = query(collection(db, "events"), where("familyId", "==", fetchedFamilyId));
          const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
              const eventsData = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Event));
              setEvents(eventsData);
          });

          return () => {
            unsubscribeGoals();
            unsubscribeAccounts();
            unsubscribeCategories();
            unsubscribeEvents();
          };
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
        fetchFamilyAndData();
      } else {
        setFamilyId(null);
        setGoals([]);
        setAccounts([]);
        setCategories([]);
        setEvents([]);
      }
    })
    return () => unsubscribe();
  }, [toast]);


  async function onSubmit(values: TransactionFormValues) {
    if (!auth.currentUser || !familyId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in and part of a family.",
      });
      return;
    }

    setLoading(true);
    try {
      const transactionAmount = values.type === 'expense' ? -Math.abs(values.amount) : Math.abs(values.amount);

      await runTransaction(db, async (transaction) => {
          const transactionRef = doc(collection(db, "transactions"));
          const accountRef = doc(db, "accounts", values.accountId);
          
          const categoryName = categories.find(c => c.id === values.categoryId)?.name || 'Unknown';
          const fullCategory = values.subcategory ? `${categoryName}: ${values.subcategory}` : categoryName;

          const transactionData: any = {
            ...values,
            category: fullCategory,
            amount: transactionAmount,
            uid: auth.currentUser.uid,
            familyId: familyId,
            createdAt: new Date(),
          };

          if (!values.goalId || values.goalId === "none") delete transactionData.goalId;
          if (!values.subcategory) delete transactionData.subcategory;
          if (!values.eventId || values.eventId === "none") delete transactionData.eventId;
          if (!values.eventCategoryId || values.eventCategoryId === "none") delete transactionData.eventCategoryId;
          
          transaction.set(transactionRef, transactionData);
          transaction.update(accountRef, { balance: increment(transactionAmount) });
      });

      toast({
        title: "Success!",
        description: "Transaction added successfully.",
      });
      form.reset({
        amount: 0,
        description: "",
        type: "expense",
        categoryId: "",
        subcategory: "",
        date: new Date(),
        accountId: "",
        goalId: "none",
        eventId: "none",
        eventCategoryId: "none",
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
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
                <Select onValueChange={(value) => {
                  field.onChange(value)
                  form.setValue('subcategory', '');
                }} value={field.value} disabled={!familyId || categories.length === 0}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.filter(c => c.type === transactionType).map(cat => (
                         <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {subcategories.length > 0 && (
           <FormField
            control={form.control}
            name="subcategory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subcategory</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!familyId}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a subcategory" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subcategories.map(sub => (
                           <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                        ))}
                      </SelectContent>
                  </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={!familyId || accounts.length === 0}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          name="eventId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link to Event (Optional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={!familyId || events.length === 0}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an event" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {events.map(event => (
                    <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {eventCategories.length > 0 && selectedEventId !== 'none' && (
             <FormField
                control={form.control}
                name="eventCategoryId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Event Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!familyId}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select event category" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                        {eventCategories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
             />
        )}
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

    