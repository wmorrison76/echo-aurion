import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Eye, Zap, CheckSquare } from "lucide-react";
interface Guardian {
  icon: React.ReactNode;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
}
const GUARDIANS: Guardian[] = [
  {
    icon: <Shield className="h-6 w-6 text-emerald-400" />,
    name: "Argus",
    role: "Data Compliance",
    description: "Validates GL posting rules and data integrity",
    capabilities: [
      "GL validation",
      "Cost center checks",
      "Debit/credit balance",
      "Fiscal period verification",
    ],
  },
  {
    icon: <Eye className="h-6 w-6 text-blue-400" />,
    name: "Zelda",
    role: "Duplicate Detection",
    description: "Detects duplicate invoices and auto-heals data",
    capabilities: [
      "Exact duplicate detection",
      "Transposed amounts",
      "Rounding correction",
      "Auto-healing",
    ],
  },
  {
    icon: <Zap className="h-6 w-6 text-amber-400" />,
    name: "Phoenix",
    role: "Anomaly Detection",
    description: "Identifies unusual patterns and fraud indicators",
    capabilities: [
      "Amount outliers",
      "Frequency analysis",
      "Timing anomalies",
      "Fraud scoring",
    ],
  },
  {
    icon: <CheckSquare className="h-6 w-6 text-purple-400" />,
    name: "Odin",
    role: "Immutable Audit",
    description: "Creates cryptographic audit trail and point-in-time recovery",
    capabilities: [
      "SHA-256 hash chain",
      "Signatures",
      "Point-in-time recovery",
      "Integrity verification",
    ],
  },
];
export function GuardianShowcase() {
  return (
    <div className="w-full py-16 px-6 sm:px-10 bg-background border-t border-border/40">
      {" "}
      <div className="max-w-7xl mx-auto space-y-12">
        {" "}
        {/* Header */}{" "}
        <div className="space-y-3">
          {" "}
          <h2 className="text-4xl font-bold text-foreground">
            {" "}
            Guardian Oversight System{" "}
          </h2>{" "}
          <p className="text-muted-foreground max-w-2xl">
            {" "}
            Four AI-driven guardians work in parallel to ensure financial
            integrity, compliance, and fraud prevention at every
            transaction.{" "}
          </p>{" "}
        </div>{" "}
        {/* Guardian Cards */}{" "}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {" "}
          {GUARDIANS.map((guardian) => (
            <Card
              key={guardian.name}
              className="border-border/50 hover:border-aurum-500/50 transition-colors"
            >
              {" "}
              <CardHeader className="pb-3">
                {" "}
                <div className="flex items-start gap-3">
                  {" "}
                  <div className="h-10 w-10 rounded-lg bg-surface-variant flex items-center justify-center">
                    {" "}
                    {guardian.icon}{" "}
                  </div>{" "}
                  <div className="min-w-0">
                    {" "}
                    <CardTitle className="text-lg">
                      {guardian.name}
                    </CardTitle>{" "}
                    <CardDescription className="text-xs font-medium text-aurum-300">
                      {" "}
                      {guardian.role}{" "}
                    </CardDescription>{" "}
                  </div>{" "}
                </div>{" "}
              </CardHeader>{" "}
              <CardContent className="space-y-3">
                {" "}
                <p className="text-sm text-muted-foreground">
                  {" "}
                  {guardian.description}{" "}
                </p>{" "}
                <div className="space-y-2">
                  {" "}
                  <p className="text-xs font-semibold text-foreground/70">
                    {" "}
                    Capabilities:{" "}
                  </p>{" "}
                  <div className="flex flex-wrap gap-1">
                    {" "}
                    {guardian.capabilities.map((cap) => (
                      <Badge key={cap} variant="secondary" className="text-xs">
                        {" "}
                        {cap}{" "}
                      </Badge>
                    ))}{" "}
                  </div>{" "}
                </div>{" "}
              </CardContent>{" "}
            </Card>
          ))}{" "}
        </div>{" "}
        {/* Specs Footer */}{" "}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-8 border-t border-border/40">
          {" "}
          <div>
            {" "}
            <div className="text-sm font-semibold text-foreground mb-2">
              {" "}
              Built for SOC 2 Type II{" "}
            </div>{" "}
            <p className="text-sm text-muted-foreground">
              {" "}
              Precision ledgers with 0.000005 accuracy and cryptographic
              signatures on every transaction.{" "}
            </p>{" "}
          </div>{" "}
          <div>
            {" "}
            <div className="text-sm font-semibold text-foreground mb-2">
              {" "}
              Latency SLO: 200ms{" "}
            </div>{" "}
            <p className="text-sm text-muted-foreground">
              {" "}
              Real-time processing with Zelda Cold Snapshots for point-in-time
              recovery.{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
