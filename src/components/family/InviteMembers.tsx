"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { sendSignInLinkToEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
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
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

type InviteFormValues = z.infer<typeof formSchema>;

export default function InviteMembers() {
  const [loading, setLoading] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchFamilyId = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().familyId) {
          setFamilyId(userDoc.data().familyId);
        } else {
          // This case is handled by the main dashboard logic, but we can keep a local check.
          console.warn("User does not have a familyId.");
        }
      }
    };
    
    const unsubscribe = auth.onAuthStateChanged(user => {
        if(user) {
            fetchFamilyId();
        } else {
            setFamilyId(null);
        }
    })

    return () => unsubscribe();
  }, []);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: InviteFormValues) {
    if (!familyId) {
      toast({
        variant: "destructive",
        title: "Cannot Send Invitation",
        description: "You must be part of a family to invite members.",
      });
      return;
    }

    setLoading(true);

    const actionCodeSettings = {
      // URL you want to redirect back to. The domain (www.example.com) must be authorized
      // in the Firebase Console.
      url: `${window.location.origin}?familyId=${familyId}`,
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, values.email, actionCodeSettings);
      // The link was successfully sent. Inform the user.
      // Save the email locally so you don't need to ask the user for it again
      // if they open the link on the same device.
      window.localStorage.setItem('emailForSignIn', values.email);
      
      toast({
        title: "Invitation Sent!",
        description: `A sign-in link has been sent to ${values.email}.`,
      });
      form.reset();

    } catch (error: any) {
      console.error("Error sending sign-in link:", error);
      toast({
        variant: "destructive",
        title: "Invitation Failed",
        description: error.message || "An unexpected error occurred while sending the invitation.",
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input
                  placeholder="member@example.com"
                  {...field}
                  disabled={loading || !familyId}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={loading || !familyId}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send Invitation
        </Button>
      </form>
    </Form>
  );
}