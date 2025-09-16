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
  Timestamp,
  orderBy
} from "firebase/firestore";
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
import { Input } from "@/components/ui/input";
import { Loader2, Calendar as CalendarIcon, PartyPopper } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Skeleton } from "../ui/skeleton";
import { ScrollArea } from "../ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import EventCategoryManager from "./EventCategoryManager";
import { Progress } from "../ui/progress";

const formSchema = z.object({
  name: z.string().min(1, { message: "Event name is required." }),
  estimatedCost: z.coerce.number().positive({ message: "Estimated cost must be a positive number." }),
  eventDate: z.date({ required_error: "Event date is required." }),
});

type EventFormValues = z.infer<typeof formSchema>;

interface Event {
  id: string;
  name: string;
  estimatedCost: number;
  eventDate: Timestamp;
}

interface Transaction {
    id: string;
    amount: number;
    type: 'income' | 'expense';
    date: Timestamp;
    eventId?: string;
}

interface EventWithCost extends Event {
    currentCost: number;
    progress: number;
}


export default function EventPlanner() {
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventWithCost[]>([]);
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
            description: "Please ensure you are part of a family to manage events.",
          });
        }
      }
    };
    
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      if (user) {
        fetchFamilyId();
      } else {
        setFamilyId(null);
      }
    });

    return () => unsubscribeAuth();
  }, [toast]);
  
   useEffect(() => {
    if (!familyId) {
      setEvents([]);
      setListLoading(false);
      return;
    }

    setListLoading(true);
    const q = query(
        collection(db, "events"), 
        where("familyId", "==", familyId)
    );
    const unsubscribeEvents = onSnapshot(q, (snapshot) => {
      const eventsData: Event[] = [];
      snapshot.forEach(doc => {
        eventsData.push({ id: doc.id, ...doc.data() } as Event);
      });
      // Sort events by date on the client side
      eventsData.sort((a, b) => a.eventDate.toMillis() - b.eventDate.toMillis());
      
      const transQuery = query(
        collection(db, "transactions"),
        where("familyId", "==", familyId)
      );

      const unsubscribeTrans = onSnapshot(transQuery, (transSnapshot) => {
        const transactionsData: Transaction[] = [];
        transSnapshot.forEach(doc => {
            transactionsData.push({ id: doc.id, ...doc.data() } as Transaction);
        });

        const eventsWithCost = eventsData.map(event => {
            const currentCost = transactionsData
                .filter(t => t.eventId === event.id && t.type === 'expense')
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            
            const progress = event.estimatedCost > 0 ? (currentCost / event.estimatedCost) * 100 : 0;

            return { ...event, currentCost, progress };
        });

        setEvents(eventsWithCost);
        setListLoading(false);
      });

      return () => unsubscribeTrans();

    }, (error) => {
      console.error("Error fetching events:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch events.",
      });
      setListLoading(false);
    });

    return () => unsubscribeEvents();
  }, [familyId, toast]);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      estimatedCost: 0,
      eventDate: undefined,
    },
  });

  async function onSubmit(values: EventFormValues) {
    if (!auth.currentUser || !familyId) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in and part of a family to add an event.",
      });
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "events"), {
        ...values,
        familyId: familyId,
        uid: auth.currentUser.uid,
        createdAt: new Date(),
      });

      toast({
        title: "Success!",
        description: "New event created successfully.",
      });
      form.reset();
    } catch (error: any) {
      console.error("Error adding event:", error);
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
  
  const formatDate = (timestamp: Timestamp) => {
    return format(timestamp.toDate(), "PPP");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Create New Event</CardTitle>
            <CardDescription>Add a new event to plan and budget for.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Summer Vacation"
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
                  name="estimatedCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Cost</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="50000"
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
                  name="eventDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Event Date</FormLabel>
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
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
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
                  Create Event
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      <div className="md:col-span-2">
         <Card className="shadow-xl">
            <CardHeader>
                <CardTitle>Event Details & Budgets</CardTitle>
                <CardDescription>Manage categories and budgets for your events.</CardDescription>
            </CardHeader>
            <CardContent>
                {listLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : events.length === 0 ? (
                     <div className="text-center py-10">
                        <PartyPopper className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-4 text-muted-foreground">
                            No upcoming events.
                        </p>
                        <p className="text-sm text-muted-foreground">Create one to start planning!</p>
                    </div>
                ) : (
                    <ScrollArea className="h-[calc(100vh-18rem)]">
                       <Accordion type="single" collapsible className="w-full">
                         {events.map((event) => (
                           <AccordionItem value={event.id} key={event.id}>
                            <AccordionTrigger>
                               <div className="flex justify-between items-center w-full pr-4">
                                  <div className="text-left">
                                    <p className="font-medium">{event.name}</p>
                                    <p className="text-sm text-muted-foreground font-normal">{formatDate(event.eventDate)}</p>
                                  </div>
                                   <div className="text-right">
                                    <p className={`font-semibold ${event.currentCost > event.estimatedCost ? 'text-destructive' : 'text-primary'}`}>
                                        {formatCurrency(event.currentCost)} / {formatCurrency(event.estimatedCost)}
                                    </p>
                                    <Progress value={event.progress} className="h-2 mt-1" />
                                   </div>
                               </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <EventCategoryManager eventId={event.id} familyId={familyId} />
                            </AccordionContent>
                           </AccordionItem>
                         ))}
                       </Accordion>
                    </ScrollArea>
                )}
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
