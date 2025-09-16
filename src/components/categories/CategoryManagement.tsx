"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addDoc, collection, doc, getDoc, query, where, onSnapshot, deleteDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, Tag } from "lucide-react";
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";

const formSchema = z.object({
  name: z.string().min(1, { message: "Category name is required." }),
  type: z.enum(["income", "expense"]),
});

type CategoryFormValues = z.infer<typeof formSchema>;

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  isDefault: boolean;
}

export default function CategoryManagement() {
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchFamilyIdAndCategories = async () => {
      if (auth.currentUser) {
        setListLoading(true);
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().familyId) {
          const currentFamilyId = userDoc.data().familyId;
          setFamilyId(currentFamilyId);
          
          const q = query(collection(db, "categories"), where("familyId", "==", currentFamilyId));
          const unsubscribe = onSnapshot(q, (snapshot) => {
            const categoriesData: Category[] = [];
            snapshot.forEach(doc => {
                categoriesData.push({ id: doc.id, ...doc.data() } as Category);
            });
            setCategories(categoriesData);
            setListLoading(false);
          }, (error) => {
            console.error("Error fetching categories:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not fetch categories."
            });
            setListLoading(false);
          });

          return () => unsubscribe();
        } else {
          setListLoading(false);
        }
      } else {
        setListLoading(false);
      }
    };

    const unsubscribeAuth = auth.onAuthStateChanged(user => {
        if(user) {
            fetchFamilyIdAndCategories();
        } else {
            setCategories([]);
            setListLoading(false);
        }
    });

    return () => unsubscribeAuth();
  }, [toast]);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "expense",
    },
  });

  async function onSubmit(values: CategoryFormValues) {
    if (!auth.currentUser || !familyId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in and part of a family to add a category.",
      });
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "categories"), {
        ...values,
        familyId: familyId,
        isDefault: false,
        createdAt: new Date(),
      });

      toast({
        title: "Success!",
        description: "New category created successfully.",
      });
      form.reset();
    } catch (error: any) {
      console.error("Error adding category:", error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (categoryId: string) => {
    try {
      await deleteDoc(doc(db, "categories", categoryId));
      toast({
        title: "Deleted",
        description: "Category removed successfully."
      });
    } catch (error: any) {
      console.error("Error deleting category:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete category."
      });
    }
  }

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Create New Category</CardTitle>
            <CardDescription>Add a custom category for transactions.</CardDescription>
          </CardHeader>
          <CardContent>
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
                          placeholder="e.g., Side Hustle"
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
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={loading || !familyId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="expense">Expense</SelectItem>
                          <SelectItem value="income">Income</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-accent hover:bg-accent/90"
                  disabled={loading || !familyId}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Category
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      <div className="md:col-span-2">
         <Card className="shadow-xl">
            <CardHeader>
                <CardTitle>Your Categories</CardTitle>
                <CardDescription>All available income and expense categories.</CardDescription>
            </CardHeader>
            <CardContent>
                {listLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : categories.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                        No categories found.
                    </p>
                ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <h3 className="font-semibold text-lg text-green-600">Income</h3>
                        <Separator />
                        <ScrollArea className="h-64">
                            <div className="space-y-2 pr-4">
                                {incomeCategories.map(cat => (
                                    <div key={cat.id} className="flex justify-between items-center bg-secondary/50 p-2 rounded-md">
                                        <div className="flex items-center gap-2">
                                            <Tag className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium text-sm">{cat.name}</span>
                                            {cat.isDefault && <Badge variant="outline" className="text-xs">Default</Badge>}
                                        </div>
                                        {!cat.isDefault && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(cat.id)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                     <div className="space-y-3">
                        <h3 className="font-semibold text-lg text-red-600">Expenses</h3>
                        <Separator />
                        <ScrollArea className="h-64">
                            <div className="space-y-2 pr-4">
                                {expenseCategories.map(cat => (
                                    <div key={cat.id} className="flex justify-between items-center bg-secondary/50 p-2 rounded-md">
                                        <div className="flex items-center gap-2">
                                            <Tag className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium text-sm">{cat.name}</span>
                                            {cat.isDefault && <Badge variant="outline" className="text-xs">Default</Badge>}
                                        </div>
                                        {!cat.isDefault && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(cat.id)}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
                )}
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
