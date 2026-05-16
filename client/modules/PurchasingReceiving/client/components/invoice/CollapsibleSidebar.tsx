import React, { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
interface CollapsibleSidebarProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  width?: string;
}
export function CollapsibleSidebar({
  children,
  defaultOpen = false,
  width = "w-96",
}: CollapsibleSidebarProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="relative">
      {" "}
      {/* Sidebar */}{" "}
      <div
        className={cn(
          "fixed right-0 top-0 h-screen bg-card border-l border-slate-800/60 shadow-lg transition-all duration-300 ease-in-out overflow-y-auto",
          width,
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
        style={{ zIndex: 40 }}
      >
        {" "}
        <div className="p-4 space-y-4"> {children} </div>{" "}
      </div>{" "}
      {/* Drawer Handle */}{" "}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed right-0 top-1/2 -translate-y-1/2 transition-all duration-300 ease-in-out",
          "bg-cyan-600 hover:bg-cyan-500 text-white",
          "rounded-l-lg rounded-r-none pl-2 pr-1",
          "h-16 w-10 flex items-center justify-center",
          isOpen ? "-translate-x-96" : "translate-x-0",
        )}
        style={{ zIndex: 50 }}
        title={isOpen ? "Close sidebar" : "Open sidebar"}
      >
        {" "}
        <ChevronLeft
          className={cn(
            "h-5 w-5 transition-transform duration-300",
            isOpen ? "rotate-180" : "",
          )}
        />{" "}
      </Button>{" "}
      {/* Overlay when open */}{" "}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          style={{ zIndex: 30 }}
        />
      )}{" "}
    </div>
  );
}
