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

  const closeForm = () => setIsOpen(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
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
            <TransactionForm onTransactionCreated={closeForm} />
          </TabsContent>
          <TabsContent value="budget">
            <BudgetForm onBudgetCreated={closeForm} />
          </TabsContent>
          <TabsContent value="goal">
            <GoalForm onGoalCreated={closeForm} />
          </TabsContent>
          <TabsContent value="event">
            <EventForm onEventCreated={closeForm} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
