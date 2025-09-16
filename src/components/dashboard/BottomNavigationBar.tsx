"use client";

import { useState } from "react";
import { Home, Wallet, BarChart2, Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AddNewItemModal from "./AddNewItemModal";

interface BottomNavigationBarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

export default function BottomNavigationBar({ activeView, setActiveView }: BottomNavigationBarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navItems = [
    { name: "dashboard", icon: Home, label: "Dashboard" },
    { name: "accounts", icon: Wallet, label: "Accounts" },
    { name: "add", icon: Plus, label: "Add" },
    { name: "planning", icon: Calendar, label: "Planning" },
    { name: "reports", icon: BarChart2, label: "Reports" },
  ];

  return (
    <>
      <div className="fixed bottom-0 left-0 z-40 w-full h-16 bg-background border-t border-border">
        <div className="grid h-full grid-cols-5 font-medium">
          {navItems.map((item) => (
            <Button
              key={item.name}
              variant="ghost"
              className={cn(
                "inline-flex flex-col items-center justify-center px-5 rounded-none h-full",
                "hover:bg-accent hover:text-accent-foreground",
                activeView === item.name ? "text-primary" : "text-muted-foreground",
                item.name === "add" ? "relative" : ""
              )}
              onClick={() => {
                if (item.name === "add") {
                  setIsModalOpen(true);
                } else {
                  setActiveView(item.name);
                }
              }}
            >
              {item.name === "add" ? (
                 <div className="absolute -top-6 flex items-center justify-center h-14 w-14 bg-primary rounded-full text-primary-foreground shadow-lg hover:bg-primary/90">
                    <item.icon className="w-8 h-8" />
                 </div>
              ) : (
                <item.icon className="w-5 h-5 mb-1" />
              )}
              <span className={cn(
                  "text-xs",
                  item.name === "add" ? "mt-8" : ""
              )}>{item.label}</span>
            </Button>
          ))}
        </div>
      </div>
      <AddNewItemModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
