
"use client";

import { useState } from "react";
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Home, Wallet, BarChart2, Plus, Calendar, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AddNewItemModal from "./AddNewItemModal";

export default function BottomNavigationBar() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { name: "dashboard", href: "/dashboard", icon: Home, label: "Dashboard" },
    { name: "accounts", href: "/accounts", icon: Wallet, label: "Accounts" },
    { name: "add", href: "#", icon: Plus, label: "Add" },
    { name: "planning", href: "/planning", icon: Calendar, label: "Planning" },
    { name: "categories", href: "/categories", icon: LayoutGrid, label: "Categories" },
  ];

  const getActiveView = () => {
    const currentPath = pathname.split('/')[1];
    return currentPath || 'dashboard';
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 z-40 w-full h-16 bg-background border-t border-border">
        <div className="grid h-full grid-cols-5 font-medium">
          {navItems.map((item) => {
            const isActive = getActiveView() === item.name;
            const linkContent = (
              <>
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
              </>
            );

            return (
              <Button
                key={item.name}
                variant="ghost"
                asChild={item.name !== 'add'}
                className={cn(
                  "inline-flex flex-col items-center justify-center px-5 rounded-none h-full",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive ? "text-primary" : "text-muted-foreground",
                  item.name === "add" ? "relative" : ""
                )}
                onClick={() => {
                  if (item.name === "add") {
                    setIsModalOpen(true);
                  }
                }}
              >
                {item.name !== 'add' ? (
                  <Link href={item.href}>
                    {linkContent}
                  </Link>
                ) : (
                  linkContent
                )}
              </Button>
            )
          })}
        </div>
      </div>
      <AddNewItemModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
