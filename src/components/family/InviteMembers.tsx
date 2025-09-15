"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { sendSignInLinkToEmail } from "firebase/auth";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
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
import { Loader2, Users, Copy } from "lucide-react";
import { Separator } from "../ui/separator";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Skeleton } from "../ui/skeleton";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

type InviteFormValues = z.infer<typeof formSchema>;

interface Member {
  id: string;
  email: string | null;
}

interface Family {
  inviteCode?: string;
}

export default function InviteMembers() {
  const [loading, setLoading] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchFamilyInfo = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().familyId) {
          const currentFamilyId = userDoc.data().familyId;
          setFamilyId(currentFamilyId);
          
          const familyDocRef = doc(db, "families", currentFamilyId);
          const familyDoc = await getDoc(familyDocRef);
          if (familyDoc.exists()) {
            setFamily(familyDoc.data() as Family);
          }
        }
      }
    };
    
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
        if(user) {
            fetchFamilyInfo();
        } else {
            setFamilyId(null);
            setFamily(null);
            setMembers([]);
        }
    })

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!familyId) {
      setMembersLoading(false);
      return;
    }

    setMembersLoading(true);
    const membersQuery = query(collection(db, "users"), where("familyId", "==", familyId));
    const unsubscribe = onSnapshot(membersQuery, (snapshot) => {
      const membersData = snapshot.docs.map(doc => ({
        id: doc.id,
        email: doc.data().email || 'No Email',
      }));
      setMembers(membersData);
      setMembersLoading(false);
    }, (error) => {
      console.error("Error fetching family members:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch family members."
      });
      setMembersLoading(false);
    });

    return () => unsubscribe();
  }, [familyId]);

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
      url: `${window.location.origin}?familyId=${familyId}`,
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, values.email, actionCodeSettings);
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

  const copyInviteCode = () => {
    if (family?.inviteCode) {
      navigator.clipboard.writeText(family.inviteCode);
      toast({
        title: "Copied!",
        description: "Invite code copied to clipboard.",
      });
    }
  }

  const getInitials = (email: string | null) => {
    if (!email) return "?";
    const name = email.split('@')[0];
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div>
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
      </div>

       <div className="space-y-2">
            <Label>Or Share Invite Code</Label>
            <div className="flex items-center space-x-2">
                <Input value={family?.inviteCode || "..."} readOnly disabled={!family?.inviteCode} />
                <Button variant="outline" size="icon" onClick={copyInviteCode} disabled={!family?.inviteCode}>
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center gap-2"><Users className="h-5 w-5" /> Family Members</h3>
        {membersLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : members.length > 0 ? (
          <ul className="space-y-3">
            {members.map(member => (
              <li key={member.id} className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-secondary text-secondary-foreground">
                    {getInitials(member.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-muted-foreground truncate">{member.email}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center">Your family has no members yet.</p>
        )}
      </div>
    </div>
  );
}
