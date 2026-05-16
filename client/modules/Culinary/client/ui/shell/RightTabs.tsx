import React, { useState } from "react";

interface TabDef {
  id: string;
  label: string;
  content: React.ReactNode;
  badge?: string;
}

interface RightTabsProps {
  main: React.ReactNode;
  tabs: TabDef[];
  defaultTab?: string;
}

export function RightTabs({ main, tabs, defaultTab }: RightTabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id ?? "");
  const activeTab = tabs.find((t) => t.id === active);

  return (
    <div className="flex gap-4 h-full">
      <div className="flex-1 min-w-0 overflow-auto">{main}</div>
      {tabs.length > 0 && (
        <div className="w-72 flex-shrink-0 border-l border-border/50 flex flex-col overflow-hidden">
          <div className="flex border-b border-border/50 px-2 pt-1 gap-1 flex-shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
                  active === tab.id
                    ? "bg-background text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {tab.badge && (
                  <span className="ml-1.5 text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-auto p-3">{activeTab?.content}</div>
        </div>
      )}
    </div>
  );
}
