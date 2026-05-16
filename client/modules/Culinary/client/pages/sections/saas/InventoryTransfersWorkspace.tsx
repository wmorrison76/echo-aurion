import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Plus,
  Filter,
  Download,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "./shared";

interface Transfer {
  id: string;
  item_name: string;
  quantity: number;
  unit: string;
  from_department: string;
  to_department: string;
  requested_by: string;
  transferred_by?: string;
  transfer_date: string;
  received_date?: string;
  status: "pending" | "completed" | "cancelled";
  notes?: string;
}

type TransferFilter = {
  department?: string;
  status?: string;
  dateRange?: "week" | "month" | "all";
};

const DEPARTMENTS = [
  "Kitchen",
  "Prep",
  "Pastry",
  "Bakery",
  "Sous Vide",
  "Beverage",
  "Sauce Station",
  "Grill",
  "Fryer",
  "Pantry",
  "Storage",
  "Dining",
  "Banquet",
];

const COLORS = {
  pending: "#f97316",
  completed: "#22c55e",
  cancelled: "#ef4444",
};

export default function InventoryTransfersWorkspace() {
  const { toast } = useToast();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TransferFilter>({
    dateRange: "month",
  });
  const [isAddingTransfer, setIsAddingTransfer] = useState(false);
  const [newTransfer, setNewTransfer] = useState({
    itemName: "",
    quantity: 0,
    unit: "lb",
    fromDepartment: "Kitchen",
    toDepartment: "Prep",
    requestedBy: "",
    notes: "",
  });

  // Fetch transfers
  useEffect(() => {
    const fetchTransfers = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.department) {
          params.append("to_department", filters.department);
        }
        if (filters.status) {
          params.append("status", filters.status);
        }

        const response = await fetch(
          `/api/inventory/transfers?${params.toString()}`,
        );
        if (response.ok) {
          const data = await response.json();
          setTransfers(data);
        }
      } catch (error) {
        console.error("Failed to fetch transfers:", error);
        toast({
          title: "Error",
          description: "Failed to load transfer data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTransfers();
  }, [filters, toast]);

  const handleAddTransfer = async () => {
    if (
      !newTransfer.itemName ||
      !newTransfer.quantity ||
      !newTransfer.requestedBy
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/inventory/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_name: newTransfer.itemName,
          quantity: newTransfer.quantity,
          unit: newTransfer.unit,
          from_department: newTransfer.fromDepartment,
          to_department: newTransfer.toDepartment,
          requested_by: newTransfer.requestedBy,
          notes: newTransfer.notes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create transfer");
      }

      const transfer = await response.json();
      setTransfers((prev) => [transfer, ...prev]);
      setIsAddingTransfer(false);
      setNewTransfer({
        itemName: "",
        quantity: 0,
        unit: "lb",
        fromDepartment: "Kitchen",
        toDepartment: "Prep",
        requestedBy: "",
        notes: "",
      });

      toast({
        title: "Success",
        description: "Transfer request created",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Analytics
  const analytics = useMemo(() => {
    const pending = transfers.filter((t) => t.status === "pending").length;
    const completed = transfers.filter((t) => t.status === "completed").length;
    const cancelled = transfers.filter((t) => t.status === "cancelled").length;

    const byDepartment = DEPARTMENTS.map((dept) => ({
      name: dept,
      received: transfers.filter(
        (t) => t.to_department === dept && t.status === "completed",
      ).length,
      pending: transfers.filter(
        (t) => t.to_department === dept && t.status === "pending",
      ).length,
    }));

    const statusDistribution = [
      { name: "Pending", value: pending, fill: COLORS.pending },
      { name: "Completed", value: completed, fill: COLORS.completed },
      { name: "Cancelled", value: cancelled, fill: COLORS.cancelled },
    ];

    return {
      pending,
      completed,
      cancelled,
      byDepartment,
      statusDistribution,
    };
  }, [transfers]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Inventory Transfers
          </h1>
          <p className="text-slate-600 mt-2">
            Track inter-department transfers and manage inventory movements
          </p>
        </div>
        <Dialog open={isAddingTransfer} onOpenChange={setIsAddingTransfer}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              New Transfer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Transfer Request</DialogTitle>
              <DialogDescription>
                Record a new inventory transfer between departments
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Item Name *</label>
                <Input
                  placeholder="e.g., Avocados, Chicken Stock"
                  value={newTransfer.itemName}
                  onChange={(e) =>
                    setNewTransfer({ ...newTransfer, itemName: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Quantity *</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newTransfer.quantity || ""}
                    onChange={(e) =>
                      setNewTransfer({
                        ...newTransfer,
                        quantity: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Unit</label>
                  <Select
                    value={newTransfer.unit}
                    onValueChange={(value) =>
                      setNewTransfer({ ...newTransfer, unit: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lb">lb</SelectItem>
                      <SelectItem value="gallon">gallon</SelectItem>
                      <SelectItem value="unit">unit</SelectItem>
                      <SelectItem value="pan">pan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">From</label>
                  <Select
                    value={newTransfer.fromDepartment}
                    onValueChange={(value) =>
                      setNewTransfer({ ...newTransfer, fromDepartment: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">To *</label>
                  <Select
                    value={newTransfer.toDepartment}
                    onValueChange={(value) =>
                      setNewTransfer({ ...newTransfer, toDepartment: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.filter(
                        (d) => d !== newTransfer.fromDepartment,
                      ).map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Requested By *</label>
                <Input
                  placeholder="Your name"
                  value={newTransfer.requestedBy}
                  onChange={(e) =>
                    setNewTransfer({
                      ...newTransfer,
                      requestedBy: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">Notes</label>
                <Input
                  placeholder="Optional notes"
                  value={newTransfer.notes}
                  onChange={(e) =>
                    setNewTransfer({ ...newTransfer, notes: e.target.value })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddingTransfer(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddTransfer}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create Transfer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Pending Transfers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {analytics.pending}
            </div>
            <p className="text-xs text-slate-600 mt-1">Awaiting completion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {analytics.completed}
            </div>
            <p className="text-xs text-slate-600 mt-1">This period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Transfers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {transfers.length}
            </div>
            <p className="text-xs text-slate-600 mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Transfer Status</CardTitle>
            <CardDescription>Distribution of all transfers</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.statusDistribution.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.statusDistribution.filter(
                      (d) => d.value > 0,
                    )}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500">
                No transfer data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfers by Department */}
        <Card>
          <CardHeader>
            <CardTitle>Transfers by Department</CardTitle>
            <CardDescription>Received transfers per department</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.byDepartment.some(
              (d) => d.received > 0 || d.pending > 0,
            ) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={analytics.byDepartment}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={95} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="received" fill="#22c55e" name="Received" />
                  <Bar dataKey="pending" fill="#f97316" name="Pending" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500">
                No department transfer data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Transfers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Select
                value={filters.department || "all"}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    department: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Select
                value={filters.status || "all"}
                onValueChange={(value) =>
                  setFilters({
                    ...filters,
                    status: value === "all" ? undefined : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transfers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transfers</CardTitle>
          <CardDescription>
            All inventory transfers - search recent items easily
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <p className="text-slate-500">No transfers found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    transfers.map((transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell className="font-medium">
                          {transfer.item_name}
                        </TableCell>
                        <TableCell>
                          {transfer.quantity} {transfer.unit}
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="text-slate-600">
                            {transfer.from_department}
                          </span>
                          <span className="text-slate-400 mx-1">→</span>
                          <span className="text-slate-600">
                            {transfer.to_department}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {transfer.requested_by}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {new Date(
                            transfer.transfer_date,
                          ).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              transfer.status === "pending"
                                ? "secondary"
                                : transfer.status === "completed"
                                  ? "default"
                                  : "destructive"
                            }
                          >
                            {transfer.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
