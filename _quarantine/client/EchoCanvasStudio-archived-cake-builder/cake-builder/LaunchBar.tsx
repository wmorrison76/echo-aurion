import React from "react";
import { cn } from "@/lib/utils";

const items = [
  { id: "order", label: "New Order" },
  { id: "gallery", label: "Gallery" },
  { id: "recipes", label: "Recipes" },
  { id: "library", label: "Library" },
];

export default function LaunchBar({ className }: { className?: string }) {
  const onNav = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div className={cn("sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-black/40 border-b", className)}>
      <div className="container flex items-center gap-2 py-2">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => onNav(it.id)}
            className="px-3 py-1.5 text-sm rounded-md border bg-background hover:bg-accent hover:text-accent-foreground shadow-sm"
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
