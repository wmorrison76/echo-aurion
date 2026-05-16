import * as React from "react";

import { AlertCircle, CheckCircle2, Filter, Plus } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type TransferStatus = "pending" | "completed" | "cancelled";

type InventoryTransfer = {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  fromDepartment: string;
  toDepartment: string;
  requestedBy: string;
  transferDate: string;
  status: TransferStatus;
  notes?: string;
};

const DEPARTMENTS = [
  "Kitchen",
  "Prep",
  "Pastry",
  "Bakery",
  "Banquet",
  "Storage",
];

const STATUS_META: Record<TransferStatus, { label: string; badge: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", badge: "secondary" },
  completed: { label: "Completed", badge: "default" },
  cancelled: { label: "Cancelled", badge: "destructive" },
};

function newId(prefix: string) {
  const rand = Math.random().toString(36).slice(2);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function safeNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function InventoryTransfersWorkspace() {
  const { toast } = useToast();

  const [department, setDepartment] = React.useState<string>("all");
  const [status, setStatus] = React.useState<TransferStatus | "all">("all");
  const [loading, setLoading] = React.useState(false);

  const [transfers, setTransfers] = React.useState<InventoryTransfer[]>(() => [
    {
      id: "transfer-001",
      itemName: "Butter",
      quantity: 5,
      unit: "lb",
      fromDepartment: "Storage",
      toDepartment: "Pastry",
      requestedBy: "William",
      transferDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      status: "completed",
      notes: "For laminated dough production",
    },
    {
      id: "transfer-002",
      itemName: "Berries (mixed)",
      quantity: 12,
      unit: "pt",
      fromDepartment: "Kitchen",
      toDepartment: "Banquet",
      requestedBy: "Events",
      transferDate: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      status: "pending",
    },
  ]);

  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Omit<InventoryTransfer, "id" | "transferDate" | "status"> & { status: TransferStatus }>(() => ({
    itemName: "",
    quantity: 0,
    unit: "lb",
    fromDepartment: "Storage",
    toDepartment: "Pastry",
    requestedBy: "",
    notes: "",
    status: "pending",
  }));

  const filteredTransfers = React.useMemo(() => {
    return transfers
      .filter((t) => (department === "all" ? true : t.toDepartment === department || t.fromDepartment === department))
      .filter((t) => (status === "all" ? true : t.status === status))
      .sort((a, b) => new Date(b.transferDate).getTime() - new Date(a.transferDate).getTime());
  }, [department, status, transfers]);

  const counts = React.useMemo(() => {
    const total = transfers.length;
    const pending = transfers.filter((t) => t.status === "pending").length;
    const completed = transfers.filter((t) => t.status === "completed").length;
    const cancelled = transfers.filter((t) => t.status === "cancelled").length;
    return { total, pending, completed, cancelled };
  }, [transfers]);

  const refreshFromApi = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (department !== "all") params.set("department", department);
      if (status !== "all") params.set("status", status);

      const res = await fetch(`/api/inventory/transfers?${params.toString()}`);
      if (!res.ok) {
        toast({
          title: "Using sample data",
          description: `Inventory transfers API returned ${res.status}.`,
        });
        return;
      }

      const data = (await res.json()) as unknown;
      if (!Array.isArray(data)) {
        toast({
          title: "Unexpected response",
          description: "Inventory transfers API did not return a list.",
          variant: "destructive",
        });
        return;
      }

      const normalized: InventoryTransfer[] = data
        .map((row: any) => ({
          id: String(row.id ?? newId("transfer")),
          itemName: String(row.item_name ?? row.itemName ?? "(unknown item)"),
          quantity: Number(row.quantity ?? 0),
          unit: String(row.unit ?? "unit"),
          fromDepartment: String(row.from_department ?? row.fromDepartment ?? ""),
          toDepartment: String(row.to_department ?? row.toDepartment ?? ""),
          requestedBy: String(row.requested_by ?? row.requestedBy ?? ""),
          transferDate: String(row.transfer_date ?? row.transferDate ?? new Date().toISOString()),
          status: (row.status as TransferStatus) ?? "pending",
          notes: row.notes ? String(row.notes) : undefined,
        }))
        .filter((t) => Boolean(t.id));

      setTransfers(normalized);
    } catch (err) {
      toast({
        title: "Could not refresh",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [department, status, toast]);

  const submitDraft = React.useCallback(() => {
    if (!draft.itemName.trim()) {
      toast({ title: "Missing item", description: "Enter an item name.", variant: "destructive" });
      return;
    }
    if (!draft.requestedBy.trim()) {
      toast({ title: "Missing requester", description: "Enter who requested this transfer.", variant: "destructive" });
      return;
    }
    if (!draft.quantity || draft.quantity <= 0) {
      toast({ title: "Invalid quantity", description: "Quantity must be greater than 0.", variant: "destructive" });
      return;
    }

    const now = new Date().toISOString();
    setTransfers((prev) => [
      {
        id: newId("transfer"),
        itemName: draft.itemName.trim(),
        quantity: draft.quantity,
        unit: draft.unit,
        fromDepartment: draft.fromDepartment,
        toDepartment: draft.toDepartment,
        requestedBy: draft.requestedBy.trim(),
        transferDate: now,
        status: draft.status,
        notes: draft.notes?.trim() || undefined,
      },
      ...prev,
    ]);

    setOpen(false);
    toast({ title: "Transfer logged", description: "A new inventory transfer was added." });
  }, [draft, toast]);

  return (
    <div className="space-y-4">
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Inventory transfers</CardTitle>
            <CardDescription>
              Track movement of ingredients and supplies between departments.
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={refreshFromApi} disabled={loading}>
              <Filter className="mr-2 h-4 w-4" />
              Refresh
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  New transfer
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                  <DialogTitle>New transfer</DialogTitle>
                  <DialogDescription>
                    Record a transfer request or completion. (This screen is client-only; API sync is optional.)
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    <span className="text-muted-foreground">Item</span>
                    <Input
                      value={draft.itemName}
                      onChange={(e) => setDraft((p) => ({ ...p, itemName: e.target.value }))}
                      placeholder="e.g., Eggs"
                    />
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="text-muted-foreground">Requested by</span>
                    <Input
                      value={draft.requestedBy}
                      onChange={(e) => setDraft((p) => ({ ...p, requestedBy: e.target.value }))}
                      placeholder="Name"
                    />
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="text-muted-foreground">Quantity</span>
                    <Input
                      inputMode="decimal"
                      value={draft.quantity ? String(draft.quantity) : ""}
                      onChange={(e) => setDraft((p) => ({ ...p, quantity: safeNumber(e.target.value) }))}
                      placeholder="0"
                    />
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="text-muted-foreground">Unit</span>
                    <Input
                      value={draft.unit}
                      onChange={(e) => setDraft((p) => ({ ...p, unit: e.target.value }))}
                      placeholder="lb"
                    />
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="text-muted-foreground">From</span>
                    <Select
                      value={draft.fromDepartment}
                      onValueChange={(value) => setDraft((p) => ({ ...p, fromDepartment: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="text-muted-foreground">To</span>
                    <Select
                      value={draft.toDepartment}
                      onValueChange={(value) => setDraft((p) => ({ ...p, toDepartment: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>

                  <label className="grid gap-1 text-sm sm:col-span-2">
                    <span className="text-muted-foreground">Status</span>
                    <Select
                      value={draft.status}
                      onValueChange={(value) =>
                        setDraft((p) => ({ ...p, status: value as TransferStatus }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_META).map(([key, meta]) => (
                          <SelectItem key={key} value={key}>
                            {meta.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>

                  <label className="grid gap-1 text-sm sm:col-span-2">
                    <span className="text-muted-foreground">Notes</span>
                    <Textarea
                      value={draft.notes}
                      onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Optional notes"
                      rows={3}
                    />
                  </label>
                </div>

                <DialogFooter>
                  <Button variant="secondary" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={submitDraft}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-xl font-semibold">{counts.total}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Pending</div>
              <div className="text-xl font-semibold">{counts.pending}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Completed</div>
              <div className="text-xl font-semibold">{counts.completed}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Cancelled</div>
              <div className="text-xl font-semibold">{counts.cancelled}</div>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Department</span>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Status</span>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {Object.entries(STATUS_META).map(([key, meta]) => (
                    <SelectItem key={key} value={key}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <div className="flex-1" />

            <div className="text-xs text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filteredTransfers.length}</span> transfers
            </div>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Requested by</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        No transfers match the selected filters.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransfers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="font-medium">{t.itemName}</div>
                        {t.notes ? (
                          <div className="text-xs text-muted-foreground line-clamp-1">{t.notes}</div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {t.quantity} {t.unit}
                      </TableCell>
                      <TableCell>{t.fromDepartment}</TableCell>
                      <TableCell>{t.toDepartment}</TableCell>
                      <TableCell>{t.requestedBy}</TableCell>
                      <TableCell>{formatDate(t.transferDate)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_META[t.status].badge} className="gap-1">
                          {t.status === "completed" ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : null}
                          {STATUS_META[t.status].label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
