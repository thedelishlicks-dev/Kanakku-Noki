"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addDoc, collection, doc, getDoc, query, where, onSnapshot, deleteDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
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
import { Loader2, Trash2, Tag, PlusCircle } from "lucide-react";
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";

const categoryFormSchema = z.object({
  name: z.string().min(1, { message: "Category name is required." }),
  type: z.enum(["income", "expense"]),
});

const subcategoryFormSchema = z.object({
  name: z.string().min(1, { message: "Subcategory name is required." }),
  parentCategoryId: z.string().min(1, { message: "Parent category is required." }),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;
type SubcategoryFormValues = z.infer<typeof subcategoryFormSchema>;

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  isDefault: boolean;
  subcategories?: string[];
}

export default function CategoryManagement() {
  const [loading, setLoading] = useState(false);
  const [submittingSubcategory, setSubmittingSubcategory] = useState(false);
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

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      type: "expense",
    },
  });
  
  const subcategoryForm = useForm<SubcategoryFormValues>({
    resolver: zodResolver(subcategoryFormSchema),
    defaultValues: {
      name: "",
      parentCategoryId: "",
    },
  });

  async function onCategorySubmit(values: CategoryFormValues) {
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
        subcategories: [],
      });

      toast({
        title: "Success!",
        description: "New category created successfully.",
      });
      categoryForm.reset();
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

  async function onSubcategorySubmit(values: SubcategoryFormValues) {
    if (!auth.currentUser || !familyId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in and part of a family to add a subcategory.",
      });
      return;
    }

    setSubmittingSubcategory(true);
    try {
      const categoryRef = doc(db, "categories", values.parentCategoryId);
      await updateDoc(categoryRef, {
        subcategories: arrayUnion(values.name)
      });
      
      toast({
        title: "Success!",
        description: "Subcategory added successfully.",
      });
      subcategoryForm.reset();
    } catch (error: any) {
      console.error("Error adding subcategory:", error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setSubmittingSubcategory(false);
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
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

  const handleDeleteSubcategory = async (categoryId: string, subcategoryName: string) => {
    try {
      const categoryRef = doc(db, "categories", categoryId);
      await updateDoc(categoryRef, {
        subcategories: arrayRemove(subcategoryName)
      });
      toast({
        title: "Deleted",
        description: "Subcategory removed successfully."
      });
    } catch (error: any) {
      console.error("Error deleting subcategory:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete subcategory."
      });
    }
  }

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 space-y-6">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Create New Category</CardTitle>
            <CardDescription>Add a custom category for transactions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...categoryForm}>
              <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4">
                <FormField
                  control={categoryForm.control}
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
                  control={categoryForm.control}
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
                  <PlusCircle className="mr-2 h-4 w-4" /> Create Category
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Add Subcategory</CardTitle>
            <CardDescription>Organize your main categories further.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...subcategoryForm}>
              <form onSubmit={subcategoryForm.handleSubmit(onSubcategorySubmit)} className="space-y-4">
                <FormField
                  control={subcategoryForm.control}
                  name="parentCategoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={submittingSubcategory || !familyId || categories.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a parent category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={subcategoryForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subcategory Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Groceries"
                          {...field}
                          disabled={submittingSubcategory || !familyId}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  variant="secondary"
                  disabled={submittingSubcategory || !familyId}
                >
                  {submittingSubcategory && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Subcategory
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
                        <ScrollArea className="h-[calc(100vh-25rem)]">
                            <div className="space-y-2 pr-4">
                                {incomeCategories.map(cat => (
                                    <div key={cat.id}>
                                      <div className="flex justify-between items-center bg-secondary/50 p-2 rounded-md">
                                          <div className="flex items-center gap-2">
                                              <Tag className="h-4 w-4 text-muted-foreground" />
                                              <span className="font-medium text-sm">{cat.name}</span>
                                              {cat.isDefault && <Badge variant="outline" className="text-xs">Default</Badge>}
                                          </div>
                                          {!cat.isDefault && (
                                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteCategory(cat.id)}>
                                                  <Trash2 className="h-4 w-4 text-red-500" />
                                              </Button>
                                          )}
                                      </div>
                                      {cat.subcategories && cat.subcategories.length > 0 && (
                                        <div className="pl-6 mt-1 space-y-1">
                                          {cat.subcategories.map(sub => (
                                            <div key={sub} className="flex justify-between items-center bg-secondary/20 p-1.5 rounded-md">
                                              <span className="text-xs text-muted-foreground ml-2">{sub}</span>
                                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteSubcategory(cat.id, sub)}>
                                                  <Trash2 className="h-3 w-3 text-red-400" />
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                     <div className="space-y-3">
                        <h3 className="font-semibold text-lg text-red-600">Expenses</h3>
                        <Separator />
                        <ScrollArea className="h-[calc(100vh-25rem)]">
                            <div className="space-y-2 pr-4">
                                {expenseCategories.map(cat => (
                                     <div key={cat.id}>
                                      <div className="flex justify-between items-center bg-secondary/50 p-2 rounded-md">
                                          <div className="flex items-center gap-2">
                                              <Tag className="h-4 w-4 text-muted-foreground" />
                                              <span className="font-medium text-sm">{cat.name}</span>
                                              {cat.isDefault && <Badge variant="outline" className="text-xs">Default</Badge>}
                                          </div>
                                          {!cat.isDefault && (
                                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteCategory(cat.id)}>
                                                  <Trash2 className="h-4 w-4 text-red-500" />
                                              </Button>
                                          )}
                                      </div>
                                       {cat.subcategories && cat.subcategories.length > 0 && (
                                        <div className="pl-6 mt-1 space-y-1">
                                          {cat.subcategories.map(sub => (
                                            <div key={sub} className="flex justify-between items-center bg-secondary/20 p-1.5 rounded-md">
                                              <span className="text-xs text-muted-foreground ml-2">{sub}</span>
                                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteSubcategory(cat.id, sub)}>
                                                  <Trash2 className="h-3 w-3 text-red-400" />
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
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
