"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle } from "lucide-react";
import TransactionForm from "../transactions/TransactionForm";
import BudgetForm from "../budgets/BudgetForm";
import GoalForm from "../goals/GoalForm";
import EventForm from "../events/EventForm";

export default function NewItemModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add a New Item</DialogTitle>
          <DialogDescription>
            Select what you would like to create.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="transaction" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="transaction">Transaction</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="goal">Goal</TabsTrigger>
            <TabsTrigger value="event">Event</TabsTrigger>
          </TabsList>
          <TabsContent value="transaction">
            <TransactionForm />
          </TabsContent>
          <TabsContent value="budget">
            <BudgetForm />
          </TabsContent>
          <TabsContent value="goal">
            <GoalForm onGoalCreated={() => setIsOpen(false)} />
          </TabsContent>
          <TabsContent value="event">
            <EventForm onEventCreated={() => setIsOpen(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
