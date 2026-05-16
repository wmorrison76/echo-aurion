import React, { useState } from "react";
import { useOutletTransfers } from "../../hooks/useInventorySync";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { ArrowRight, Plus, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
interface TransfersPanelProps {
  organizationId: string;
  currentOutletId: string;
}
export function TransfersPanel({
  organizationId,
  currentOutletId,
}: TransfersPanelProps) {
  const {
    transfers,
    loading,
    error,
    createTransfer,
    completeTransfer,
    refetch,
  } = useOutletTransfers();
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    toOutletId: "",
    standardProductId: "",
    quantity: "",
    notes: "",
  });
  const [completing, setCompleting] = useState<string | null>(null);
  const handleCreateTransfer = async () => {
    if (
      !formData.toOutletId ||
      !formData.standardProductId ||
      !formData.quantity
    ) {
      return;
    }
    await createTransfer({
      fromOutletId: currentOutletId,
      toOutletId: formData.toOutletId,
      standardProductId: formData.standardProductId,
      quantity: parseFloat(formData.quantity),
      notes: formData.notes,
    });
    setFormData({
      toOutletId: "",
      standardProductId: "",
      quantity: "",
      notes: "",
    });
    setShowDialog(false);
  };
  const handleCompleteTransfer = async (transferId: string) => {
    setCompleting(transferId);
    await completeTransfer(transferId);
    setCompleting(null);
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_transit":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-surface text-gray-800";
    }
  };
  const outgoing = transfers.filter(
    (t) => t.from_outlet_id === currentOutletId,
  );
  const incoming = transfers.filter((t) => t.to_outlet_id === currentOutletId);
  const pending = transfers.filter((t) => t.status === "pending").length;
  if (loading) {
    return (
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Transfers</CardTitle>{" "}
          <CardDescription>Loading transfer data...</CardDescription>{" "}
        </CardHeader>{" "}
      </Card>
    );
  }
  return (
    <div className="space-y-6">
      {" "}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium">
              {" "}
              Outgoing Transfers{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">{outgoing.length}</div>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              From this outlet
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium">
              {" "}
              Incoming Transfers{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">{incoming.length}</div>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              To this outlet
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium">
              {" "}
              Pending Actions{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-orange-600">
              {pending}
            </div>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting action
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {error && (
        <Alert variant="destructive">
          {" "}
          <AlertCircle className="h-4 w-4" />{" "}
          <AlertDescription>{error}</AlertDescription>{" "}
        </Alert>
      )}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <div className="flex items-center justify-between">
            {" "}
            <div>
              {" "}
              <CardTitle>Transfer History</CardTitle>{" "}
              <CardDescription>
                Manage inter-outlet inventory transfers
              </CardDescription>{" "}
            </div>{" "}
            <div className="flex gap-2">
              {" "}
              <Button onClick={() => refetch()} variant="outline" size="sm">
                {" "}
                Refresh{" "}
              </Button>{" "}
              <Button
                onClick={() => setShowDialog(true)}
                size="sm"
                className="gap-2"
              >
                {" "}
                <Plus className="w-4 h-4" /> New Transfer{" "}
              </Button>{" "}
            </div>{" "}
          </div>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="space-y-6">
            {" "}
            {/* Outgoing Transfers */}{" "}
            <div>
              {" "}
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                {" "}
                <ArrowRight className="w-4 h-4" /> Outgoing Transfers{" "}
              </h3>{" "}
              <div className="overflow-x-auto">
                {" "}
                <Table>
                  {" "}
                  <TableHeader>
                    {" "}
                    <TableRow>
                      {" "}
                      <TableHead>Product</TableHead>{" "}
                      <TableHead>To Outlet</TableHead>{" "}
                      <TableHead className="text-right">Quantity</TableHead>{" "}
                      <TableHead className="text-right">Total Value</TableHead>{" "}
                      <TableHead>Status</TableHead>{" "}
                      <TableHead>Initiated</TableHead>{" "}
                      <TableHead>Actions</TableHead>{" "}
                    </TableRow>{" "}
                  </TableHeader>{" "}
                  <TableBody>
                    {" "}
                    {outgoing.length === 0 ? (
                      <TableRow>
                        {" "}
                        <TableCell
                          colSpan={7}
                          className="text-center py-4 text-muted-foreground"
                        >
                          {" "}
                          No outgoing transfers{" "}
                        </TableCell>{" "}
                      </TableRow>
                    ) : (
                      outgoing.map((transfer) => (
                        <TableRow key={transfer.id}>
                          {" "}
                          <TableCell className="font-medium">
                            {" "}
                            {transfer.standard_products?.name}{" "}
                          </TableCell>{" "}
                          <TableCell> {transfer.to_outlet?.name} </TableCell>{" "}
                          <TableCell className="text-right">
                            {" "}
                            {transfer.quantity.toFixed(2)}{" "}
                          </TableCell>{" "}
                          <TableCell className="text-right">
                            {" "}
                            ${transfer.total_cost?.toFixed(2) || "0.00"}{" "}
                          </TableCell>{" "}
                          <TableCell>
                            {" "}
                            <Badge className={getStatusColor(transfer.status)}>
                              {" "}
                              {transfer.status.replace(/_/g, "")}{" "}
                            </Badge>{" "}
                          </TableCell>{" "}
                          <TableCell className="text-sm text-muted-foreground">
                            {" "}
                            {new Date(
                              transfer.initiated_at,
                            ).toLocaleDateString()}{" "}
                          </TableCell>{" "}
                          <TableCell>
                            {" "}
                            {transfer.status === "in_transit" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600"
                                disabled
                              >
                                {" "}
                                <CheckCircle className="w-4 h-4" />{" "}
                              </Button>
                            )}{" "}
                          </TableCell>{" "}
                        </TableRow>
                      ))
                    )}{" "}
                  </TableBody>{" "}
                </Table>{" "}
              </div>{" "}
            </div>{" "}
            {/* Incoming Transfers */}{" "}
            <div>
              {" "}
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                {" "}
                <ArrowRight className="w-4 h-4 rotate-180" /> Incoming
                Transfers{" "}
              </h3>{" "}
              <div className="overflow-x-auto">
                {" "}
                <Table>
                  {" "}
                  <TableHeader>
                    {" "}
                    <TableRow>
                      {" "}
                      <TableHead>Product</TableHead>{" "}
                      <TableHead>From Outlet</TableHead>{" "}
                      <TableHead className="text-right">Quantity</TableHead>{" "}
                      <TableHead className="text-right">Total Value</TableHead>{" "}
                      <TableHead>Status</TableHead>{" "}
                      <TableHead>Initiated</TableHead>{" "}
                      <TableHead>Actions</TableHead>{" "}
                    </TableRow>{" "}
                  </TableHeader>{" "}
                  <TableBody>
                    {" "}
                    {incoming.length === 0 ? (
                      <TableRow>
                        {" "}
                        <TableCell
                          colSpan={7}
                          className="text-center py-4 text-muted-foreground"
                        >
                          {" "}
                          No incoming transfers{" "}
                        </TableCell>{" "}
                      </TableRow>
                    ) : (
                      incoming.map((transfer) => (
                        <TableRow key={transfer.id}>
                          {" "}
                          <TableCell className="font-medium">
                            {" "}
                            {transfer.standard_products?.name}{" "}
                          </TableCell>{" "}
                          <TableCell> {transfer.from_outlet?.name} </TableCell>{" "}
                          <TableCell className="text-right">
                            {" "}
                            {transfer.quantity.toFixed(2)}{" "}
                          </TableCell>{" "}
                          <TableCell className="text-right">
                            {" "}
                            ${transfer.total_cost?.toFixed(2) || "0.00"}{" "}
                          </TableCell>{" "}
                          <TableCell>
                            {" "}
                            <Badge className={getStatusColor(transfer.status)}>
                              {" "}
                              {transfer.status.replace(/_/g, "")}{" "}
                            </Badge>{" "}
                          </TableCell>{" "}
                          <TableCell className="text-sm text-muted-foreground">
                            {" "}
                            {new Date(
                              transfer.initiated_at,
                            ).toLocaleDateString()}{" "}
                          </TableCell>{" "}
                          <TableCell>
                            {" "}
                            {transfer.status === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleCompleteTransfer(transfer.id)
                                }
                                disabled={completing === transfer.id}
                              >
                                {" "}
                                {completing === transfer.id
                                  ? "..."
                                  : "Receive"}{" "}
                              </Button>
                            )}{" "}
                          </TableCell>{" "}
                        </TableRow>
                      ))
                    )}{" "}
                  </TableBody>{" "}
                </Table>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        {" "}
        <DialogContent>
          {" "}
          <DialogHeader>
            {" "}
            <DialogTitle>Create Transfer</DialogTitle>{" "}
          </DialogHeader>{" "}
          <div className="space-y-4">
            {" "}
            <div>
              {" "}
              <Label htmlFor="to-outlet">To Outlet</Label>{" "}
              <Input
                id="to-outlet"
                placeholder="Select destination outlet"
                value={formData.toOutletId}
                onChange={(e) =>
                  setFormData({ ...formData, toOutletId: e.target.value })
                }
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <Label htmlFor="product">Product</Label>{" "}
              <Input
                id="product"
                placeholder="Select product"
                value={formData.standardProductId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    standardProductId: e.target.value,
                  })
                }
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <Label htmlFor="qty">Quantity</Label>{" "}
              <Input
                id="qty"
                type="number"
                step="0.01"
                placeholder="Enter quantity"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
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
                placeholder="Add notes about this transfer"
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
              <Button onClick={handleCreateTransfer}>
                {" "}
                Create Transfer{" "}
              </Button>{" "}
            </div>{" "}
          </div>{" "}
        </DialogContent>{" "}
      </Dialog>{" "}
    </div>
  );
}
