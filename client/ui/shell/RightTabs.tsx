import React from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type RightTabItem = {
  id: string;
  label: string;
  content: React.ReactNode;
  badge?: string;
};

type RightTabsProps = {
  main: React.ReactNode;
  tabs: RightTabItem[];
  defaultTabId?: string;
  className?: string;
  rightClassName?: string;
  rightWidthClassName?: string;
};

export function RightTabs({
  main,
  tabs,
  defaultTabId,
  className,
  rightClassName,
  rightWidthClassName = "w-[360px]",
}: RightTabsProps) {
  const initialTab = defaultTabId ?? tabs[0]?.id;

  return (
    <div className={cn("flex h-full gap-6", className)}>
      <div className="min-w-0 flex-1">{main}</div>
      <div className={cn("shrink-0", rightWidthClassName, rightClassName)}>
        <Tabs defaultValue={initialTab} className="h-full">
          <TabsList className="grid w-full grid-cols-2 bg-background">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="text-xs uppercase">
                {tab.label}
                {tab.badge && (
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px]">
                    {tab.badge}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="pt-4">
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
