"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import TransactionForm from "../transactions/TransactionForm";

interface AddNewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddNewItemModal({ isOpen, onClose }: AddNewItemModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center">
      <Card className="w-full max-w-lg m-4 relative animate-fade-in">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
        <CardHeader>
          <CardTitle>Add New Transaction</CardTitle>
          <CardDescription>
            Log a new income or expense to your records.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="max-h-[70vh] overflow-y-auto pr-2">
             <TransactionForm onTransactionCreated={onClose} />
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
