"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addDoc, collection, doc, getDoc } from "firebase/firestore";
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
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(1, { message: "Event name is required." }),
  estimatedCost: z.coerce.number().positive({ message: "Estimated cost must be a positive number." }),
  eventDate: z.date({ required_error: "Event date is required." }),
});

type EventFormValues = z.infer<typeof formSchema>;

interface EventFormProps {
    onEventCreated?: () => void;
}

export default function EventForm({ onEventCreated }: EventFormProps) {
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
      onEventCreated?.();
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

  return (
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
  );
}
