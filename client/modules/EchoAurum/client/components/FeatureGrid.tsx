import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
interface FeatureItem {
  title: string;
  description?: string;
}
interface FeatureColumn {
  header: string;
  items: FeatureItem[];
}
const FEATURES: FeatureColumn[] = [
  {
    header: "EchoAurum Platform",
    items: [
      {
        title: "CFO Console",
        description: "Multi-pane glass dashboard with live cash ladder",
      },
      {
        title: "Invoice & Payments",
        description: "3-way matching with OCR + approval workflows",
      },
      {
        title: "Echo AI Console",
        description: "Natural language financial Q&A",
      },
      {
        title: "Forecast Studio",
        description: "Scenario analysis with occupancy & weather",
      },
      { title: "CPA Portal", description: "Audit-ready compliance dashboard" },
    ],
  },
  {
    header: "Compliance & Auditing",
    items: [
      { title: "SOC 2 Type II", description: "Built-in security compliance" },
      { title: "PCI DSS v4", description: "Payment processing security" },
      {
        title: "Argus Immutable Ledger",
        description: "Blockchain-grade audit trail",
      },
      {
        title: "Zelda Snapshots",
        description: "Point-in-time transaction recovery",
      },
      {
        title: "Phoenix Anomaly Detection",
        description: "Real-time fraud intelligence",
      },
    ],
  },
  {
    header: "Integrations & APIs",
    items: [
      {
        title: "NetSuite & Sage",
        description: "ERP sync with real-time updates",
      },
      {
        title: "OPERA & Toast",
        description: "PMS and POS revenue integration",
      },
      {
        title: "Vendor Exchange",
        description: "Multi-vendor invoice automation",
      },
      { title: "Echo API", description: "RESTful SDK for custom integrations" },
      {
        title: "Slack Notifications",
        description: "Real-time alerts for key events",
      },
    ],
  },
];
export function FeatureGrid() {
  return (
    <div className="w-full py-16 px-6 sm:px-10 bg-background">
      {" "}
      <div className="max-w-7xl mx-auto">
        {" "}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {" "}
          {FEATURES.map((column) => (
            <div key={column.header} className="space-y-4">
              {" "}
              <h3 className="text-xl font-semibold text-foreground">
                {" "}
                {column.header}{" "}
              </h3>{" "}
              <div className="space-y-3">
                {" "}
                {column.items.map((item) => (
                  <Card
                    key={item.title}
                    className="border-border/50 hover:border-aurum-500/50 transition-colors cursor-pointer"
                  >
                    {" "}
                    <CardHeader className="pb-2">
                      {" "}
                      <CardTitle className="text-base">
                        {item.title}
                      </CardTitle>{" "}
                    </CardHeader>{" "}
                    {item.description && (
                      <CardContent>
                        {" "}
                        <CardDescription className="text-xs">
                          {" "}
                          {item.description}{" "}
                        </CardDescription>{" "}
                      </CardContent>
                    )}{" "}
                  </Card>
                ))}{" "}
              </div>{" "}
            </div>
          ))}{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
