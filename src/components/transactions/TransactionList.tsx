"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
  Timestamp,
  getDoc,
  runTransaction,
  increment,
} from "firebase/firestore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { db, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
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
import { Button } from "@/components/ui/button";
import { Edit, Trash2, CalendarIcon, Loader2, Flag, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  categoryId: string;
  subcategory?: string;
  type: "income" | "expense";
  date: Timestamp;
  accountId: string;
  goalId?: string;
  needsReview?: boolean;
  reviewedBy?: string;
  eventId?: string;
  eventCategoryId?: string;
}

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

export default function TransactionList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventCategories, setEventCategories] = useState<EventCategory[]>([]);
  const [showNeedsReviewOnly, setShowNeedsReviewOnly] = useState(false);
  const { toast } = useToast();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(formSchema),
  });
  
  const transactionType = form.watch("type");
  const selectedCategoryId = form.watch("categoryId");
  const selectedEventId = form.watch("eventId");
  
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const subcategories = selectedCategory?.subcategories || [];

   useEffect(() => {
    if (showNeedsReviewOnly) {
      setFilteredTransactions(transactions.filter(t => t.needsReview));
    } else {
      setFilteredTransactions(transactions);
    }
  }, [showNeedsReviewOnly, transactions]);

  useEffect(() => {
    if (editingTransaction) {
      form.reset({
        ...editingTransaction,
        amount: Math.abs(editingTransaction.amount),
        date: editingTransaction.date.toDate(),
        categoryId: editingTransaction.categoryId,
        subcategory: editingTransaction.subcategory || "",
        goalId: editingTransaction.goalId || "none",
        eventId: editingTransaction.eventId || "none",
        eventCategoryId: editingTransaction.eventCategoryId || "none",
      });
    }
  }, [editingTransaction, form]);
  
  useEffect(() => {
    if (!isDialogOpen) {
      setEditingTransaction(null);
    }
  },[isDialogOpen])
  
   useEffect(() => {
    form.setValue('subcategory', '');
  }, [selectedCategoryId, form]);

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


  const handleDelete = async (transaction: Transaction) => {
    try {
       await runTransaction(db, async (t) => {
        const transactionRef = doc(db, "transactions", transaction.id);
        const accountRef = doc(db, "accounts", transaction.accountId);
        
        t.delete(transactionRef);
        // Reverse the transaction amount to update the balance correctly
        t.update(accountRef, { balance: increment(-transaction.amount) });
      });
      toast({
        title: "Success",
        description: "Transaction deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete transaction.",
      });
    }
  };
  
  const handleFlagForReview = async (id: string) => {
    const transactionRef = doc(db, "transactions", id);
    try {
      await updateDoc(transactionRef, { needsReview: true });
      toast({
        title: "Flagged",
        description: "Transaction has been flagged for review.",
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error",
        description: "Could not flag transaction for review.",
      });
    }
  }

  const handleMarkAsReviewed = async (id: string) => {
    if (!auth.currentUser) return;
    const transactionRef = doc(db, "transactions", id);
    try {
      await updateDoc(transactionRef, { 
        needsReview: false,
        reviewedBy: auth.currentUser.email 
      });
      toast({
        title: "Reviewed",
        description: "Transaction marked as reviewed.",
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error",
        description: "Could not mark transaction as reviewed.",
      });
    }
  }

  async function onUpdate(values: TransactionFormValues) {
    if (!editingTransaction) return;
    setIsUpdating(true);
    try {
       await runTransaction(db, async (t) => {
        const transactionRef = doc(db, "transactions", editingTransaction.id);

        const newAmount = values.type === 'expense' ? -Math.abs(values.amount) : Math.abs(values.amount);
        const oldAmount = editingTransaction.amount;
        const amountDifference = newAmount - oldAmount;
        
        const categoryName = categories.find(c => c.id === values.categoryId)?.name || 'Unknown';
        const fullCategory = values.subcategory ? `${categoryName}: ${values.subcategory}` : categoryName;

        const updatedData: any = {
          ...values,
          amount: newAmount,
          category: fullCategory,
        };

        if (!values.goalId || values.goalId === "none") updatedData.goalId = null;
        if (!values.subcategory) updatedData.subcategory = null;
        if (!values.eventId || values.eventId === "none") updatedData.eventId = null;
        if (!values.eventCategoryId || values.eventCategoryId === "none") updatedData.eventCategoryId = null;

        t.update(transactionRef, updatedData);

        // If account is changed, revert old account balance and update new one
        if (editingTransaction.accountId !== values.accountId) {
          const oldAccountRef = doc(db, "accounts", editingTransaction.accountId);
          t.update(oldAccountRef, { balance: increment(-oldAmount) });

          const newAccountRef = doc(db, "accounts", values.accountId);
          t.update(newAccountRef, { balance: increment(newAmount) });
        } else {
           // If account is not changed, just update with the difference
          const accountRef = doc(db, "accounts", values.accountId);
          t.update(accountRef, { balance: increment(amountDifference) });
        }
      });
      toast({
        title: "Success!",
        description: "Transaction updated successfully.",
      });
      setIsDialogOpen(false);
      setEditingTransaction(null);
    } catch (error: any) {
      console.error("Error updating transaction:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsUpdating(false);
    }
  }

  useEffect(() => {
    const fetchFamilyIdAndData = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists() || !userDoc.data().familyId) {
        setLoading(false);
        return;
      }
      
      const familyId = userDoc.data().familyId;

      const transQuery = query(
        collection(db, "transactions"),
        where("familyId", "==", familyId)
      );
      const unsubscribeTransactions = onSnapshot(transQuery, (snapshot) => {
          const transactionsData: Transaction[] = [];
          snapshot.forEach((doc) => {
            transactionsData.push({ id: doc.id, ...doc.data() } as Transaction);
          });
          transactionsData.sort((a, b) => b.date.toMillis() - a.date.toMillis());
          setTransactions(transactionsData);
          setLoading(false);
        },
        (error) => {
          console.error("Error fetching transactions:", error);
          setLoading(false);
        }
      );

      const goalsQuery = query(collection(db, "goals"), where("familyId", "==", familyId));
      const unsubscribeGoals = onSnapshot(goalsQuery, (snapshot) => {
        const goalsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal));
        setGoals(goalsData);
      });

      const accountsQuery = query(collection(db, "accounts"), where("familyId", "==", familyId));
      const unsubscribeAccounts = onSnapshot(accountsQuery, (snapshot) => {
          const accountsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
          setAccounts(accountsData);
      });
      
      const categoriesQuery = query(collection(db, "categories"), where("familyId", "==", familyId));
      const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
        const categoriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        setCategories(categoriesData);
      });

       const eventsQuery = query(collection(db, "events"), where("familyId", "==", familyId));
        const unsubscribeEvents = onSnapshot(eventsQuery, (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Event));
            setEvents(eventsData);
        });


      return () => {
        unsubscribeTransactions();
        unsubscribeGoals();
        unsubscribeAccounts();
        unsubscribeCategories();
        unsubscribeEvents();
      };
    };
    
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      if (user) {
        fetchFamilyIdAndData();
      } else {
        setTransactions([]);
        setGoals([]);
        setAccounts([]);
        setCategories([]);
        setEvents([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleDateString("en-US", {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
  }

  if (loading && transactions.length === 0) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  
  return (
    <>
      <div className="flex items-center space-x-2 mb-4">
        <Switch
          id="review-filter"
          checked={showNeedsReviewOnly}
          onCheckedChange={setShowNeedsReviewOnly}
        />
        <Label htmlFor="review-filter">Show "Needs Review" only</Label>
      </div>
       {filteredTransactions.length === 0 ? (
         <p className="text-center text-muted-foreground pt-4">
            {showNeedsReviewOnly ? "No transactions need review." : "No transactions found."}
         </p>
       ) : (
      <ScrollArea className="h-[300px] w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((transaction) => (
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
                <TableCell className="text-center">
                    {transaction.needsReview ? (
                         <Badge variant="destructive">Needs Review</Badge>
                    ) : transaction.reviewedBy ? (
                        <Badge variant="secondary">Reviewed</Badge>
                    ) : (
                         <Badge variant="outline">OK</Badge>
                    )}
                </TableCell>
                <TableCell className="text-right">
                  {transaction.needsReview ? (
                    <Button variant="outline" size="sm" className="h-8 mr-1" onClick={() => handleMarkAsReviewed(transaction.id)}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Mark Reviewed
                    </Button>
                  ) : (
                     <Button variant="outline" size="sm" className="h-8 mr-1" onClick={() => handleFlagForReview(transaction.id)}>
                        <Flag className="h-4 w-4 mr-1" /> Flag
                     </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingTransaction(transaction); setIsDialogOpen(true); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(transaction)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      )}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onUpdate)} className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} disabled={isUpdating} />
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
                      <Input {...field} disabled={isUpdating} />
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
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('categoryId', '');
                      form.setValue('subcategory', '');
                    }} value={field.value} disabled={isUpdating}>
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
                        field.onChange(value);
                        form.setValue('subcategory', '');
                     }} value={field.value} disabled={isUpdating || categories.length === 0}>
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
                        <Select onValueChange={field.onChange} value={field.value} disabled={isUpdating}>
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
                    <Select onValueChange={field.onChange} value={field.value} disabled={isUpdating || accounts.length === 0}>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isUpdating || goals.length === 0}>
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
                    <Select onValueChange={field.onChange} value={field.value} disabled={isUpdating || events.length === 0}>
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
                            <Select onValueChange={field.onChange} value={field.value} disabled={isUpdating}>
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
                            disabled={isUpdating}
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
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
