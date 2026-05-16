import React, { useCallback, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, Clock, Package } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface TransferLineItem {
  id: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitOfMeasure: string;
  unitCost: number;
  sourceAvailability: number;
}

export interface CommissaryTransfer {
  id: string;
  requestedAt: string;
  fromOutlet: string;
  toOutlet: string;
  status:
    | "draft"
    | "submitted"
    | "approved"
    | "rejected"
    | "in_transit"
    | "delivered";
  lines: TransferLineItem[];
  reason: string;
  priority: "normal" | "urgent";
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  expectedDeliveryDate?: string;
  poName?: string;
  notes?: string;
}

interface CommissaryTransferFormProps {
  outlets: Array<{ id: string; name: string }>;
  currentOutletId: string;
  availableInventory: TransferLineItem[];
  onSubmit: (transfer: CommissaryTransfer) => Promise<void>;
  isLoading?: boolean;
}

export function CommissaryTransferForm({
  outlets,
  currentOutletId,
  availableInventory,
  onSubmit,
  isLoading = false,
}: CommissaryTransferFormProps) {
  const [transfer, setTransfer] = useState<CommissaryTransfer>({
    id: "",
    requestedAt: new Date().toISOString(),
    fromOutlet: currentOutletId,
    toOutlet: "",
    status: "draft",
    lines: [],
    reason: "",
    priority: "normal",
    poName: "",
    notes: "",
  });
  const [selectedProductCode, setSelectedProductCode] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const otherOutlets = useMemo(
    () => outlets.filter((o) => o.id !== currentOutletId),
    [outlets, currentOutletId],
  );

  const selectedProduct = useMemo(
    () => availableInventory.find((p) => p.productCode === selectedProductCode),
    [selectedProductCode, availableInventory],
  );

  const transferTotal = useMemo(
    () =>
      transfer.lines.reduce(
        (sum, line) => sum + line.quantity * line.unitCost,
        0,
      ),
    [transfer.lines],
  );

  const handleAddLine = useCallback(() => {
    if (!selectedProduct || selectedQuantity <= 0) {
      return;
    }
    const newLine: TransferLineItem = {
      ...selectedProduct,
      quantity: selectedQuantity,
      id: `${Date.now()}-${Math.random()}`,
    };
    setTransfer((prev) => ({ ...prev, lines: [...prev.lines, newLine] }));
    setSelectedProductCode("");
    setSelectedQuantity(0);
  }, [selectedProduct, selectedQuantity]);

  const handleRemoveLine = useCallback((lineId: string) => {
    setTransfer((prev) => ({
      ...prev,
      lines: prev.lines.filter((l) => l.id !== lineId),
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (transfer.lines.length === 0) {
      alert("Add at least one item to the transfer");
      return;
    }
    if (!transfer.toOutlet) {
      alert("Select destination outlet");
      return;
    }
    if (!transfer.reason.trim()) {
      alert("Provide a reason for the transfer");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...transfer,
        id: `TR-${Date.now()}`,
        status: "submitted",
      });
      setTransfer((prev) => ({ ...prev, lines: [] }));
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit, transfer]);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create Transfer</TabsTrigger>
          <TabsTrigger value="history">Transfer History</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <Card className="border-emerald-400/30 bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" /> Commissary Transfer Request
              </CardTitle>
              <CardDescription className="text-emerald-200/70">
                Request items from central storeroom or another outlet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                      From Outlet (Storeroom)
                    </label>
                    <Input
                      value={
                        outlets.find((o) => o.id === transfer.fromOutlet)
                          ?.name || ""
                      }
                      disabled
                      className="mt-1 border-emerald-400/20 bg-card"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                      To Outlet (Destination)
                    </label>
                    <Select
                      value={transfer.toOutlet}
                      onValueChange={(value) =>
                        setTransfer((prev) => ({ ...prev, toOutlet: value }))
                      }
                    >
                      <SelectTrigger className="mt-1 border-emerald-400/20 bg-card">
                        <SelectValue placeholder="Select outlet" />
                      </SelectTrigger>
                      <SelectContent>
                        {otherOutlets.map((outlet) => (
                          <SelectItem key={outlet.id} value={outlet.id}>
                            {outlet.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                      Priority
                    </label>
                    <Select
                      value={transfer.priority}
                      onValueChange={(value: any) =>
                        setTransfer((prev) => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger className="mt-1 border-emerald-400/20 bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                      Expected Delivery Date
                    </label>
                    <Input
                      type="date"
                      value={transfer.expectedDeliveryDate || ""}
                      onChange={(e) =>
                        setTransfer((prev) => ({
                          ...prev,
                          expectedDeliveryDate: e.target.value,
                        }))
                      }
                      className="mt-1 border-emerald-400/20 bg-card"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                    PO Name (optional)
                  </label>
                  <Input
                    value={transfer.poName || ""}
                    onChange={(e) =>
                      setTransfer((prev) => ({
                        ...prev,
                        poName: e.target.value,
                      }))
                    }
                    placeholder="e.g., Banquets Week 42"
                    className="mt-1 border-emerald-400/20 bg-card"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                    Reason for Transfer
                  </label>
                  <textarea
                    value={transfer.reason}
                    onChange={(e) =>
                      setTransfer((prev) => ({
                        ...prev,
                        reason: e.target.value,
                      }))
                    }
                    placeholder="e.g., Low stock, special event, inventory rebalancing"
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-emerald-400/20 bg-card px-3 py-2 text-sm text-emerald-100 focus:border-emerald-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-4 space-y-3">
                <h3 className="font-semibold text-emerald-100">
                  Add Items to Transfer
                </h3>
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                      Product
                    </label>
                    <Select
                      value={selectedProductCode}
                      onValueChange={setSelectedProductCode}
                    >
                      <SelectTrigger className="mt-1 border-emerald-400/20 bg-card">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableInventory.map((item) => (
                          <SelectItem
                            key={item.productCode}
                            value={item.productCode}
                          >
                            {item.productName} ({item.sourceAvailability}{" "}
                            available)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                      Quantity{" "}
                      {selectedProduct &&
                        `(Max: ${selectedProduct.sourceAvailability})`}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={selectedQuantity || ""}
                      onChange={(e) =>
                        setSelectedQuantity(parseInt(e.target.value) || 0)
                      }
                      className="mt-1 border-emerald-400/20 bg-card"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleAddLine}
                      disabled={!selectedProduct || selectedQuantity <= 0}
                      className="w-full"
                    >
                      Add Item
                    </Button>
                  </div>
                </div>
              </div>

              {transfer.lines.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-emerald-400/20">
                        <TableHead className="text-emerald-200/70">
                          Product
                        </TableHead>
                        <TableHead className="text-right text-emerald-200/70">
                          Quantity
                        </TableHead>
                        <TableHead className="text-right text-emerald-200/70">
                          Unit Cost
                        </TableHead>
                        <TableHead className="text-right text-emerald-200/70">
                          Total
                        </TableHead>
                        <TableHead className="text-emerald-200/70">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfer.lines.map((line) => (
                        <TableRow
                          key={line.id}
                          className="border-emerald-400/10"
                        >
                          <TableCell className="text-emerald-100">
                            <div className="font-semibold">
                              {line.productName}
                            </div>
                            <div className="text-xs text-emerald-200/60">
                              {line.productCode}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-emerald-100">
                            {line.quantity} {line.unitOfMeasure}
                          </TableCell>
                          <TableCell className="text-right font-mono text-emerald-100">
                            ${line.unitCost.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-emerald-100">
                            ${(line.quantity * line.unitCost).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              onClick={() => handleRemoveLine(line.id)}
                              variant="ghost"
                              size="sm"
                              className="text-red-300 hover:text-red-400"
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4">
                    <div className="flex justify-between text-lg font-semibold text-emerald-100">
                      <span>Transfer Total</span>
                      <span>${transferTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <Alert className="border-yellow-400/40 bg-yellow-500/10 text-yellow-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Add items to create a transfer request
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                  Additional Notes
                </label>
                <textarea
                  value={transfer.notes || ""}
                  onChange={(e) =>
                    setTransfer((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Any special handling instructions or comments..."
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-emerald-400/20 bg-card px-3 py-2 text-sm text-emerald-100 focus:border-emerald-300 focus:outline-none"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={
                  transfer.lines.length === 0 ||
                  !transfer.toOutlet ||
                  isSubmitting ||
                  isLoading
                }
                size="lg"
                className="w-full gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isSubmitting ? "Submitting..." : "Submit Transfer Request"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="border-emerald-400/30 bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" /> Transfer History
              </CardTitle>
              <CardDescription className="text-emerald-200/70">
                Recent transfer requests and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="rounded-lg border border-emerald-400/20 bg-card p-4">
                  <p className="text-sm text-emerald-200/70">
                    No transfer history available yet
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
