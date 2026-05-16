import { ReactNode } from "react";
import { cn } from "@/lib/glass";

interface ModulePageLayoutProps {
  children: ReactNode;
}

export function ModulePageLayout({ children }: ModulePageLayoutProps) {
  return (
    <main className="min-h-screen pt-20 pb-8 px-4 lg:pl-[250px] bg-background">
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </main>
  );
}

export default ModulePageLayout;
