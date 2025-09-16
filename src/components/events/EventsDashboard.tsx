"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PartyPopper } from "lucide-react";
import { format } from "date-fns";

interface Event {
  id: string;
  name: string;
  estimatedCost: number;
  eventDate: Timestamp;
}

interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  eventId?: string;
}

interface EventWithCost extends Event {
  currentCost: number;
  progress: number;
}

export default function EventsDashboard() {
  const [events, setEvents] = useState<EventWithCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchFamilyId = async () => {
      if (auth.currentUser) {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().familyId) {
          setFamilyId(userDoc.data().familyId);
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
  }, []);

  useEffect(() => {
    if (!familyId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
        collection(db, "events"), 
        where("familyId", "==", familyId)
    );
    const unsubscribeEvents = onSnapshot(q, (snapshot) => {
      const eventsData: Event[] = [];
      snapshot.forEach(doc => {
        eventsData.push({ id: doc.id, ...doc.data() } as Event);
      });
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
        setLoading(false);
      });

      return () => unsubscribeTrans();

    }, (error) => {
      console.error("Error fetching events:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch events.",
      });
      setLoading(false);
    });

    return () => unsubscribeEvents();
  }, [familyId, toast]);

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
    <Card className="w-full animate-fade-in shadow-xl">
      <CardHeader>
        <CardTitle>Upcoming Events</CardTitle>
        <CardDescription>A summary of your family's planned events and budgets.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-10">
            <PartyPopper className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">
                No upcoming events.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {events.map((event) => (
              <div key={event.id}>
                <div className="flex justify-between items-center mb-2">
                    <div>
                        <p className="font-semibold">{event.name}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(event.eventDate)}</p>
                    </div>
                    <div className="text-right">
                        <p className={`text-sm font-semibold ${event.currentCost > event.estimatedCost ? 'text-destructive' : 'text-primary'}`}>
                            {formatCurrency(event.currentCost)} / <span className="text-muted-foreground">{formatCurrency(event.estimatedCost)}</span>
                        </p>
                    </div>
                </div>
                <Progress value={event.progress} className="h-2" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}