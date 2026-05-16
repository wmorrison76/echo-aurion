import { useEffect, useState } from "react";
import { cn } from "@/lib/glass";
import { Button } from "@/components/ui/button";

interface MinimizedPanel {
  id: string;
  title: string;
  icon: string;
}

export default function MinimizedPanelDock() {
  // Docking is now handled in Toolbar.tsx
  return null;
}
