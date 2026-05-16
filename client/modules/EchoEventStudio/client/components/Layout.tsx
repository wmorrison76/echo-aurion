import type { ReactNode } from "react";
import SidebarNavigation from "./SidebarNavigation";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <SidebarNavigation />
      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
