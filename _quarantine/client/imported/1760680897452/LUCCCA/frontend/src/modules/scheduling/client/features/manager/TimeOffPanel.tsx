import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmployeeRow } from "@/lib/schedule";
import { Calendar, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

interface TimeOffRequest {
  id: string;
  empId: string;
  empName: string;
  type: "pto" | "sick" | "personal" | "bereavement" | "unpaid";
  startDate: string;
  endDate: string;
  days: number;
  status: "pending" | "approved" | "rejected";
  reason: string;
  requestedDate: string;
  approverNotes?: string;
}

export default function TimeOffPanel({ employees }: { employees: EmployeeRow[] }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"requests" | "accrual" | "calendar">("requests");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const [requests, setRequests] = useState<TimeOffRequest[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("shiftflow:timeoff-requests") || "[]");
    } catch {
      return [];
    }
  });

  const [ptoBalance, setPtoBalance] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem("shiftflow:pto-balance") || "{}");
    } catch {
      return {};
    }
  });

  const timeOffTypes = [
    { id: "pto", label: "Paid Time Off", color: "blue" },
    { id: "sick", label: "Sick Leave", color: "yellow" },
    { id: "personal", label: "Personal", color: "purple" },
    { id: "bereavement", label: "Bereavement", color: "gray" },
    { id: "unpaid", label: "Unpaid Leave", color: "red" },
  ];

  const filteredRequests = useMemo(() => {
    return requests.filter(
      (req) => filterStatus === "all" || req.status === filterStatus
    );
  }, [requests, filterStatus]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const stats = useMemo(() => {
    return {
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
      totalDays: requests
        .filter((r) => r.status === "approved")
        .reduce((s, r) => s + r.days, 0),
    };
  }, [requests]);

  const handleApprove = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r))
    );
  };

  const handleReject = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r))
    );
  };

  const saveData = () => {
    try {
      localStorage.setItem("shiftflow:timeoff-requests", JSON.stringify(requests));
      localStorage.setItem("shiftflow:pto-balance", JSON.stringify(ptoBalance));
      alert("Time-off data saved");
    } catch {
      alert("Failed to save");
    }
  };

  const RequestCard = ({ req }: { req: TimeOffRequest }) => {
    const statusColor = {
      pending: "bg-yellow-50 border-yellow-200",
      approved: "bg-green-50 border-green-200",
      rejected: "bg-red-50 border-red-200",
    }[req.status];

    const statusIcon = {
      pending: <Clock className="w-5 h-5 text-yellow-600" />,
      approved: <CheckCircle2 className="w-5 h-5 text-green-600" />,
      rejected: <AlertCircle className="w-5 h-5 text-red-600" />,
    }[req.status];

    return (
      <div className={`border rounded-lg p-4 ${statusColor}`}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold">{req.empName}</h3>
            <div className="text-sm text-muted-foreground">
              {req.startDate} to {req.endDate} ({req.days} days)
            </div>
          </div>
          {statusIcon}
        </div>

        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="inline-block px-2 py-1 bg-background/50 rounded text-xs font-medium">
              {timeOffTypes.find((t) => t.id === req.type)?.label || req.type}
            </span>
            {req.reason && (
              <div className="text-xs text-muted-foreground mt-1">{req.reason}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Requested</div>
            <div className="text-xs">{new Date(req.requestedDate).toLocaleDateString()}</div>
          </div>
        </div>

        {req.status === "pending" && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => handleApprove(req.id)}>
              Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleReject(req.id)}>
              Reject
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Time-off / PTO
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[96vw] max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Time-off & PTO Management</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Status Summary */}
          <div className="grid grid-cols-4 gap-3">
            <div className="border rounded p-3 bg-yellow-50 border-yellow-200">
              <div className="text-xs font-medium text-yellow-700">Pending</div>
              <div className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</div>
            </div>
            <div className="border rounded p-3 bg-green-50 border-green-200">
              <div className="text-xs font-medium text-green-700">Approved</div>
              <div className="text-2xl font-bold text-green-600 mt-1">{stats.approved}</div>
            </div>
            <div className="border rounded p-3 bg-red-50 border-red-200">
              <div className="text-xs font-medium text-red-700">Rejected</div>
              <div className="text-2xl font-bold text-red-600 mt-1">{stats.rejected}</div>
            </div>
            <div className="border rounded p-3 bg-blue-50 border-blue-200">
              <div className="text-xs font-medium text-blue-700">Days Approved</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">{stats.totalDays}</div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 border-b">
            {(["requests", "accrual", "calendar"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "requests" && "Requests"}
                {tab === "accrual" && "PTO Accrual"}
                {tab === "calendar" && "Calendar"}
              </button>
            ))}
          </div>

          {/* Requests Tab */}
          {activeTab === "requests" && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {(["all", "pending", "approved", "rejected"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      filterStatus === status
                        ? "bg-primary text-primary-foreground"
                        : "border border-input hover:bg-muted"
                    }`}
                  >
                    {status === "all" && "All"}
                    {status === "pending" && "Pending"}
                    {status === "approved" && "Approved"}
                    {status === "rejected" && "Rejected"}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {filteredRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No {filterStatus === "all" ? "" : filterStatus} requests
                  </div>
                ) : (
                  filteredRequests.map((req) => <RequestCard key={req.id} req={req} />)
                )}
              </div>
            </div>
          )}

          {/* Accrual Tab */}
          {activeTab === "accrual" && (
            <div className="space-y-4">
              <div className="border rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Employee</th>
                      <th className="text-right p-2">PTO Days</th>
                      <th className="text-right p-2">Used</th>
                      <th className="text-right p-2">Remaining</th>
                      <th className="text-right p-2">Accrual Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => {
                      const balance = ptoBalance[emp.id] || 20;
                      const used = requests
                        .filter(
                          (r) =>
                            r.empId === emp.id &&
                            r.type === "pto" &&
                            r.status === "approved"
                        )
                        .reduce((s, r) => s + r.days, 0);
                      const remaining = balance - used;

                      return (
                        <tr key={emp.id} className="border-t hover:bg-muted/30">
                          <td className="p-2">{emp.name}</td>
                          <td className="text-right p-2">{balance}</td>
                          <td className="text-right p-2">{used}</td>
                          <td className="text-right p-2 font-medium">{remaining}</td>
                          <td className="text-right p-2">1.67/month</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="border rounded p-4">
                <h3 className="font-semibold mb-3">Update PTO Balance</h3>
                <div className="grid grid-cols-2 gap-2">
                  {employees.map((emp) => (
                    <div key={emp.id} className="flex items-center gap-2">
                      <label className="text-sm flex-1">{emp.name}</label>
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-20"
                        value={ptoBalance[emp.id] || 20}
                        onChange={(e) =>
                          setPtoBalance({
                            ...ptoBalance,
                            [emp.id]: Number(e.target.value),
                          })
                        }
                      />
                      <span className="text-xs text-muted-foreground">days</span>
                    </div>
                  ))}
                </div>
                <Button onClick={saveData} className="w-full mt-3">
                  Save Balances
                </Button>
              </div>
            </div>
          )}

          {/* Calendar Tab */}
          {activeTab === "calendar" && (
            <div className="space-y-4">
              <div className="border rounded p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Time-off Calendar
                </h3>
                <div className="text-sm text-muted-foreground text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  Calendar view coming soon
                </div>
              </div>

              <div className="border rounded p-4 bg-muted/30">
                <h3 className="font-semibold mb-3">Upcoming Time Off</h3>
                <div className="space-y-2">
                  {requests
                    .filter((r) => r.status === "approved")
                    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                    .slice(0, 5)
                    .map((req) => (
                      <div key={req.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="font-medium text-sm">{req.empName}</div>
                          <div className="text-xs text-muted-foreground">
                            {req.startDate} to {req.endDate}
                          </div>
                        </div>
                        <span className="text-xs font-medium">{req.days}d</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
