"use client";

import { useState } from "react";
import type { User } from "firebase/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { createFamily, joinFamily } from "@/lib/family";

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
import { Loader2 } from "lucide-react";
import { KanakkuLogo } from "../icons/logo";
import { Separator } from "../ui/separator";

const formSchema = z.object({
  inviteCode: z.string().min(1, { message: "Invite code is required." }),
});

type JoinFormValues = z.infer<typeof formSchema>;

interface OnboardingProps {
  user: User;
}

export default function Onboarding({ user }: OnboardingProps) {
  const [loading, setLoading] = useState<"create" | "join" | false>(false);
  const { toast } = useToast();

  const form = useForm<JoinFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      inviteCode: "",
    },
  });

  const handleCreateFamily = async () => {
    setLoading("create");
    try {
      await createFamily(user.uid);
      toast({
        title: "Family Created!",
        description: "You've successfully created a new family.",
      });
    } catch (error: any) {
      console.error("Error creating family:", error);
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: error.message || "Could not create a new family.",
      });
    } finally {
      setLoading(false);
    }
  };

  async function onJoinSubmit(values: JoinFormValues) {
    setLoading("join");
    try {
      await joinFamily(user.uid, values.inviteCode);
      toast({
        title: "Welcome!",
        description: "You've successfully joined the family.",
      });
    } catch (error: any) {
      console.error("Error joining family:", error);
      toast({
        variant: "destructive",
        title: "Join Failed",
        description: error.message || "Invalid invite code or an error occurred.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Card className="w-full animate-fade-in shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <KanakkuLogo />
          <div className="space-y-1">
            <CardTitle className="text-2xl font-headline">Welcome to Kanakku</CardTitle>
            <CardDescription>Let's get your household set up.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 text-center">
             <h3 className="font-semibold">Create a New Family</h3>
             <p className="text-sm text-muted-foreground">Start a new family group as the owner and invite others.</p>
            <Button
              className="w-full"
              onClick={handleCreateFamily}
              disabled={!!loading}
            >
              {loading === "create" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create New Family
            </Button>
          </div>

          <div className="flex items-center">
            <Separator className="flex-1" />
            <span className="mx-4 text-xs text-muted-foreground">OR</span>
            <Separator className="flex-1" />
          </div>

          <div className="space-y-4">
             <div className="text-center">
                <h3 className="font-semibold">Join an Existing Family</h3>
                <p className="text-sm text-muted-foreground">Enter an invite code to join a family someone else has created.</p>
             </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onJoinSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="inviteCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invite Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter code from invitation"
                          {...field}
                          disabled={!!loading}
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
                  disabled={!!loading}
                >
                  {loading === "join" && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Join Family
                </Button>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
