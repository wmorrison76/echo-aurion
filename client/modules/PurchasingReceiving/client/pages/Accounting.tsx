import React from "react";
/** * EchoArurum Accounting Dashboard * Accounts Payable, P&L, and Financial Metrics */ import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useMultiOutlet } from "@/context/MultiOutletContext";
import { useAccounting } from "@/hooks/useAccounting";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TurtleLoader } from "@/components/TurtleLoader";
import { AlertCircle, TrendingUp, DollarSign, Clock } from "lucide-react";

export default function Accounting() {
  return (
    <AppLayout>
      <div>Accounting</div>
    </AppLayout>
  );
}
