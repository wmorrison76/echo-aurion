import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface StudioTabsProps {
  children: React.ReactNode;
}

const TAB_SECTIONS = [
  { id: "design", label: "Design", icon: "🎨" },
  { id: "tiers", label: "Tiers", icon: "🍰" },
  { id: "frosting", label: "Frosting", icon: "🧁" },
  { id: "decorations", label: "Decorations", icon: "✨" },
  { id: "pricing", label: "Pricing", icon: "💰" },
  { id: "order", label: "Order Info", icon: "📋" },
];

export default function StudioTabs({ children }: StudioTabsProps) {
  return (
    <Tabs defaultValue="design" className="w-full">
      <TabsList className="grid w-full grid-cols-6">
        {TAB_SECTIONS.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            <span className="mr-1">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="design" className="space-y-4">
        {/* Design panel content will be injected here */}
      </TabsContent>
      <TabsContent value="tiers" className="space-y-4">
        {/* Tiers panel content */}
      </TabsContent>
      <TabsContent value="frosting" className="space-y-4">
        {/* Frosting panel content */}
      </TabsContent>
      <TabsContent value="decorations" className="space-y-4">
        {/* Decorations panel content */}
      </TabsContent>
      <TabsContent value="pricing" className="space-y-4">
        {/* Pricing panel content */}
      </TabsContent>
      <TabsContent value="order" className="space-y-4">
        {/* Order info panel content */}
      </TabsContent>
      {children}
    </Tabs>
  );
}
