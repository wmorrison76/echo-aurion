import React, { useState } from "react";
import { useGLAllocations } from "../../hooks/useInvoiceGLIntegration";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { AlertCircle, Plus, DollarSign } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
interface GLAllocationPanelProps {
  organizationId: string;
  invoiceId?: string;
}
export function GLAllocationPanel({
  organizationId,
  invoiceId,
}: GLAllocationPanelProps) {
  const { allocations, loading, error, createAllocation, refetch } =
    useGLAllocations(50);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    outletId: "",
    glCodeId: "",
    allocatedAmount: "",
    allocationType: "invoice_line" as const,
    notes: "",
  });
  const handleCreate = async () => {
    if (!formData.outletId || !formData.glCodeId || !formData.allocatedAmount) {
      return;
    }
    await createAllocation({
      invoiceId: invoiceId || "",
      outletId: formData.outletId,
      glCodeId: formData.glCodeId,
      allocatedAmount: parseFloat(formData.allocatedAmount),
      allocationType: formData.allocationType,
      notes: formData.notes,
    });
    setShowDialog(false);
    setFormData({
      outletId: "",
      glCodeId: "",
      allocatedAmount: "",
      allocationType: "invoice_line",
      notes: "",
    });
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "posted":
        return "bg-green-100 text-green-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-surface text-gray-800";
    }
  };
  const filteredAllocations = invoiceId
    ? allocations.filter((a) => a.invoice_id === invoiceId)
    : allocations;
  const totalAllocated = filteredAllocations.reduce(
    (sum, a) => sum + (a.allocated_amount || 0),
    0,
  );
  const posted = filteredAllocations.filter(
    (a) => a.posting_status === "posted",
  ).length;
  if (loading) {
    return (
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>GL Allocations</CardTitle>{" "}
          <CardDescription>Loading allocations...</CardDescription>{" "}
        </CardHeader>{" "}
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {" "}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {" "}
              <DollarSign className="w-4 h-4" /> Total Allocated{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              ${totalAllocated.toFixed(2)}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium">
              {" "}
              Allocations{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {filteredAllocations.length}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium">Posted</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-green-600">
              {posted}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <div className="flex items-center justify-between">
            {" "}
            <div>
              {" "}
              <CardTitle>GL Allocations</CardTitle>{" "}
              <CardDescription>
                Invoice line to GL account mappings
              </CardDescription>{" "}
            </div>{" "}
            <div className="flex gap-2">
              {" "}
              <Button onClick={() => refetch()} variant="outline" size="sm">
                {" "}
                Refresh{" "}
              </Button>{" "}
              {invoiceId && (
                <Button
                  onClick={() => setShowDialog(true)}
                  size="sm"
                  className="gap-2"
                >
                  {" "}
                  <Plus className="w-4 h-4" /> New Allocation{" "}
                </Button>
              )}{" "}
            </div>{" "}
          </div>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          {error && (
            <Alert variant="destructive" className="mb-4">
              {" "}
              <AlertCircle className="h-4 w-4" />{" "}
              <AlertDescription>{error}</AlertDescription>{" "}
            </Alert>
          )}{" "}
          <div className="overflow-x-auto">
            {" "}
            <Table>
              {" "}
              <TableHeader>
                {" "}
                <TableRow>
                  {" "}
                  <TableHead>Invoice</TableHead> <TableHead>Outlet</TableHead>{" "}
                  <TableHead>GL Code</TableHead>{" "}
                  <TableHead className="text-right">Amount</TableHead>{" "}
                  <TableHead>Type</TableHead> <TableHead>Status</TableHead>{" "}
                  <TableHead>Created</TableHead>{" "}
                </TableRow>{" "}
              </TableHeader>{" "}
              <TableBody>
                {" "}
                {filteredAllocations.length === 0 ? (
                  <TableRow>
                    {" "}
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {" "}
                      No allocations. Create one to get started.{" "}
                    </TableCell>{" "}
                  </TableRow>
                ) : (
                  filteredAllocations.map((allocation) => (
                    <TableRow key={allocation.id}>
                      {" "}
                      <TableCell className="font-medium">
                        {" "}
                        {allocation.invoice?.number || "N/A"}{" "}
                      </TableCell>{" "}
                      <TableCell>{allocation.outlet?.name}</TableCell>{" "}
                      <TableCell>
                        {" "}
                        <div>
                          {" "}
                          <p className="font-medium">
                            {allocation.gl_code}
                          </p>{" "}
                          <p className="text-xs text-muted-foreground">
                            {" "}
                            {allocation.gl_codes?.description}{" "}
                          </p>{" "}
                        </div>{" "}
                      </TableCell>{" "}
                      <TableCell className="text-right font-semibold">
                        {" "}
                        ${allocation.allocated_amount.toFixed(2)}{" "}
                      </TableCell>{" "}
                      <TableCell>
                        {" "}
                        <span className="text-xs">
                          {" "}
                          {allocation.allocation_type.replace(/_/g, "")}{" "}
                        </span>{" "}
                      </TableCell>{" "}
                      <TableCell>
                        {" "}
                        <Badge
                          className={getStatusColor(allocation.posting_status)}
                        >
                          {" "}
                          {allocation.posting_status}{" "}
                        </Badge>{" "}
                      </TableCell>{" "}
                      <TableCell className="text-sm text-muted-foreground">
                        {" "}
                        {new Date(
                          allocation.created_at,
                        ).toLocaleDateString()}{" "}
                      </TableCell>{" "}
                    </TableRow>
                  ))
                )}{" "}
              </TableBody>{" "}
            </Table>{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        {" "}
        <DialogContent>
          {" "}
          <DialogHeader>
            {" "}
            <DialogTitle>Create GL Allocation</DialogTitle>{" "}
          </DialogHeader>{" "}
          <div className="space-y-4">
            {" "}
            <div>
              {" "}
              <Label htmlFor="outlet">Outlet</Label>{" "}
              <Input
                id="outlet"
                placeholder="Select outlet"
                value={formData.outletId}
                onChange={(e) =>
                  setFormData({ ...formData, outletId: e.target.value })
                }
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <Label htmlFor="gl-code">GL Code</Label>{" "}
              <Input
                id="gl-code"
                placeholder="Select GL account"
                value={formData.glCodeId}
                onChange={(e) =>
                  setFormData({ ...formData, glCodeId: e.target.value })
                }
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <Label htmlFor="amount">Allocated Amount</Label>{" "}
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="Enter amount"
                value={formData.allocatedAmount}
                onChange={(e) =>
                  setFormData({ ...formData, allocatedAmount: e.target.value })
                }
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <Label htmlFor="notes">Notes (Optional)</Label>{" "}
              <textarea
                id="notes"
                className="w-full px-3 py-2 border rounded-md text-sm"
                rows={2}
                placeholder="Add notes about this allocation"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />{" "}
            </div>{" "}
            <div className="flex gap-2 justify-end">
              {" "}
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                {" "}
                Cancel{" "}
              </Button>{" "}
              <Button onClick={handleCreate}>Create Allocation</Button>{" "}
            </div>{" "}
          </div>{" "}
        </DialogContent>{" "}
      </Dialog>{" "}
    </div>
  );
}
