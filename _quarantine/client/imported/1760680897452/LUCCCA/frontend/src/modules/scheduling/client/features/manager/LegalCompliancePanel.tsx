import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Clock, FileText } from "lucide-react";

interface ComplianceItem {
  id: string;
  title: string;
  description: string;
  jurisdiction: string;
  dueDate?: string;
  status: "compliant" | "warning" | "non-compliant";
  category: "wage" | "safety" | "hiring" | "documentation" | "leave" | "other";
  requirements?: string[];
}

const COMPLIANCE_ITEMS: ComplianceItem[] = [
  {
    id: "federal-min-wage",
    title: "Federal Minimum Wage Compliance",
    description: "All employees must be paid at least $7.25/hour",
    jurisdiction: "Federal (FLSA)",
    status: "compliant",
    category: "wage",
    requirements: ["Maintain payroll records for 3 years", "Post federal wage notices"],
  },
  {
    id: "overtime-compliance",
    title: "Overtime Pay Requirements",
    description: "Non-exempt employees must receive 1.5x pay for hours over 40/week",
    jurisdiction: "Federal (FLSA)",
    status: "compliant",
    category: "wage",
    requirements: ["Track hours worked daily", "Calculate OT weekly", "Maintain OT records"],
  },
  {
    id: "state-breaks",
    title: "Meal & Rest Break Laws",
    description: "Employees entitled to breaks based on hours worked",
    jurisdiction: "State/Local",
    status: "warning",
    category: "leave",
    requirements: ["Provide breaks per state law", "Do not deduct from pay"],
  },
  {
    id: "i9-verification",
    title: "Form I-9 Employment Verification",
    description: "Verify employment eligibility within 3 days of hire",
    jurisdiction: "Federal (USCIS)",
    status: "compliant",
    category: "hiring",
    requirements: ["Complete I-9 form", "Retain for 3 years", "Review photo ID"],
  },
  {
    id: "w4-collection",
    title: "W-4 Tax Form Collection",
    description: "Collect W-4 forms from all employees",
    jurisdiction: "Federal (IRS)",
    status: "compliant",
    category: "documentation",
  },
  {
    id: "safety-posters",
    title: "OSHA Safety Posters",
    description: "Post OSHA safety notices in workplace",
    jurisdiction: "Federal (OSHA)",
    status: "warning",
    category: "safety",
    requirements: ["Display Job Safety and Health poster", "Update as regulations change"],
  },
  {
    id: "eeoc-compliance",
    title: "EEO Compliance & Notices",
    description: "Post EEOC notices and maintain non-discrimination policy",
    jurisdiction: "Federal (EEOC)",
    status: "compliant",
    category: "hiring",
    requirements: ["Post EEOC notice", "Maintain hiring records for 1 year", "Anti-discrimination policy"],
  },
  {
    id: "fmla-compliance",
    title: "FMLA Leave Entitlements",
    description: "Provide up to 12 weeks unpaid leave for qualifying events",
    jurisdiction: "Federal (DOL)",
    status: "compliant",
    category: "leave",
    requirements: ["Notice employees of rights", "Track FMLA usage", "Maintain health insurance"],
  },
  {
    id: "wage-posting",
    title: "Wage Posting Requirements",
    description: "Post wage and hour notices in workplace",
    jurisdiction: "State/Local",
    status: "non-compliant",
    category: "wage",
    dueDate: "2025-01-15",
  },
  {
    id: "sick-leave",
    title: "Paid Sick Leave Requirements",
    description: "Provide paid sick leave to employees",
    jurisdiction: "State/Local",
    status: "compliant",
    category: "leave",
    requirements: ["Minimum 1 week per year", "Use for illness, medical, or safe leave"],
  },
];

export default function LegalCompliancePanel() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "compliant" | "warning" | "non-compliant">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return COMPLIANCE_ITEMS.filter((item) => {
      if (filter === "all") return true;
      return item.status === filter;
    });
  }, [filter]);

  const stats = useMemo(() => {
    return {
      compliant: COMPLIANCE_ITEMS.filter((i) => i.status === "compliant").length,
      warning: COMPLIANCE_ITEMS.filter((i) => i.status === "warning").length,
      nonCompliant: COMPLIANCE_ITEMS.filter((i) => i.status === "non-compliant").length,
    };
  }, []);

  const categoryLabels: Record<string, string> = {
    wage: "Wage & Hour",
    safety: "Safety",
    hiring: "Hiring & Onboarding",
    documentation: "Documentation",
    leave: "Leave & Time Off",
    other: "Other",
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "warning":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case "non-compliant":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Legal & Compliance
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[96vw] max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Legal & Compliance Management</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Status Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="border rounded-lg p-4 bg-green-50 border-green-200">
              <div className="text-sm font-medium text-green-700">Compliant</div>
              <div className="text-3xl font-bold text-green-600 mt-1">{stats.compliant}</div>
              <div className="text-xs text-green-600 mt-1">of {COMPLIANCE_ITEMS.length} items</div>
            </div>
            <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
              <div className="text-sm font-medium text-yellow-700">Needs Attention</div>
              <div className="text-3xl font-bold text-yellow-600 mt-1">{stats.warning}</div>
              <div className="text-xs text-yellow-600 mt-1">Review soon</div>
            </div>
            <div className="border rounded-lg p-4 bg-red-50 border-red-200">
              <div className="text-sm font-medium text-red-700">Non-Compliant</div>
              <div className="text-3xl font-bold text-red-600 mt-1">{stats.nonCompliant}</div>
              <div className="text-xs text-red-600 mt-1">Action required</div>
            </div>
          </div>

          {/* Alerts */}
          {stats.nonCompliant > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Action Required</AlertTitle>
              <AlertDescription>
                You have {stats.nonCompliant} non-compliant items. Please address these immediately to avoid penalties.
              </AlertDescription>
            </Alert>
          )}

          {stats.warning > 0 && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertTitle>Review Needed</AlertTitle>
              <AlertDescription>
                {stats.warning} items need attention. Review your compliance status and upcoming requirements.
              </AlertDescription>
            </Alert>
          )}

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            {(["all", "compliant", "warning", "non-compliant"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  filter === status
                    ? "bg-primary text-primary-foreground"
                    : "border border-input hover:bg-muted"
                }`}
              >
                {status === "all" && "All"}
                {status === "compliant" && "✓ Compliant"}
                {status === "warning" && "⚠ Needs Review"}
                {status === "non-compliant" && "✗ Non-Compliant"}
              </button>
            ))}
          </div>

          {/* Compliance Items */}
          <div className="space-y-2">
            {filtered.map((item) => (
              <div
                key={item.id}
                className={`border rounded-lg p-3 transition-all ${
                  item.status === "non-compliant"
                    ? "border-red-200 bg-red-50"
                    : item.status === "warning"
                      ? "border-yellow-200 bg-yellow-50"
                      : "border-green-200 bg-green-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  {statusIcon(item.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-sm">{item.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                      </div>
                      <button
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        className="text-xs font-medium px-2 py-1 rounded hover:bg-black/10"
                      >
                        {expandedId === item.id ? "Hide" : "Details"}
                      </button>
                    </div>

                    {/* Jurisdiction & Status */}
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <div className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        <span className="text-muted-foreground">{item.jurisdiction}</span>
                      </div>
                      <div
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          item.status === "compliant"
                            ? "bg-green-200 text-green-700"
                            : item.status === "warning"
                              ? "bg-yellow-200 text-yellow-700"
                              : "bg-red-200 text-red-700"
                        }`}
                      >
                        {item.status === "compliant"
                          ? "Compliant"
                          : item.status === "warning"
                            ? "Needs Review"
                            : "Non-Compliant"}
                      </div>
                      {item.dueDate && (
                        <div className="text-muted-foreground">
                          Due: {new Date(item.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {expandedId === item.id && (
                      <div className="mt-3 pt-3 border-t border-current/20 text-xs space-y-2">
                        {item.requirements && (
                          <div>
                            <div className="font-semibold mb-1">Requirements:</div>
                            <ul className="list-disc pl-4 space-y-1">
                              {item.requirements.map((req, i) => (
                                <li key={i} className="text-muted-foreground">
                                  {req}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline">
                            Mark as Reviewed
                          </Button>
                          {item.status !== "compliant" && (
                            <Button size="sm" variant="default">
                              Create Action Plan
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Compliance Calendar */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Upcoming Compliance Deadlines</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 border-b">
                <div>
                  <div className="font-medium text-sm">Wage Posting Update</div>
                  <div className="text-xs text-muted-foreground">Display new wage notices</div>
                </div>
                <div className="text-xs font-medium text-red-600">Jan 15, 2025</div>
              </div>
              <div className="flex items-center justify-between p-2 border-b">
                <div>
                  <div className="font-medium text-sm">Annual OSHA Inspection</div>
                  <div className="text-xs text-muted-foreground">Safety compliance review</div>
                </div>
                <div className="text-xs font-medium text-yellow-600">Feb 01, 2025</div>
              </div>
              <div className="flex items-center justify-between p-2">
                <div>
                  <div className="font-medium text-sm">Payroll Record Archival</div>
                  <div className="text-xs text-muted-foreground">Archive 3+ year old records</div>
                </div>
                <div className="text-xs font-medium">Mar 30, 2025</div>
              </div>
            </div>
          </div>

          {/* Document Management */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Key Documents</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                "Employee Handbook",
                "Anti-Discrimination Policy",
                "Wage & Hour Policy",
                "Safety Manual",
                "FMLA Notice",
                "I-9 Forms",
              ].map((doc) => (
                <Button key={doc} variant="outline" size="sm" className="justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  {doc}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
