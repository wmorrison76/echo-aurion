import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import Sidebar from "./Sidebar";
import Toolbar from "./Toolbar";

interface BoardLayoutProps {
  children: ReactNode;
  className?: string;
}

export default function BoardLayout({ children, className }: BoardLayoutProps) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden md:ml-56">
        {/* Toolbar */}
        <Toolbar className="sticky top-0" />

        {/* Page Content */}
        <main className="flex-1 overflow-auto pt-16 md:pt-0">
          <div className={cn("w-full h-full", className)}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
