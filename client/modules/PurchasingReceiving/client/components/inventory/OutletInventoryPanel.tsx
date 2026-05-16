import React, { useState } from "react";
import { useOutletInventory } from "../../hooks/useInventorySync";
import { useAuth } from "../../context/AuthContext";
import { useMultiOutlet } from "../../context/MultiOutletContext";
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
import { AlertCircle, Package, TrendingDown } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
interface OutletInventoryPanelProps {
  outletId: string;
}
export function OutletInventoryPanel({ outletId }: OutletInventoryPanelProps) {
  const { user } = useAuth();
  const { organization } = useMultiOutlet();
  const { inventory, loading, error, refetch } = useOutletInventory(
    outletId,
    50,
  );
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [adjustmentQty, setAdjustmentQty] = useState("");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const handleAdjustment = async () => {
    if (!selectedItem || !adjustmentQty || !user || !organization) return;
    try {
      const response = await fetch("/api/inventory-sync/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": user.id },
        body: JSON.stringify({
          organizationId: organization.id,
          outletId,
          standardProductId: selectedItem.standard_product_id,
          transactionType: "adjustment",
          quantityChange: parseFloat(adjustmentQty),
          notes: adjustmentNotes,
        }),
      });
      if (response.ok) {
        setShowAdjustmentDialog(false);
        setAdjustmentQty("");
        setAdjustmentNotes("");
        refetch();
      }
    } catch (err) {
      console.error("Failed to create adjustment:", err);
    }
  };
  if (loading) {
    return (
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Outlet Inventory</CardTitle>{" "}
          <CardDescription>Loading inventory data...</CardDescription>{" "}
        </CardHeader>{" "}
      </Card>
    );
  }
  const totalValue = inventory.reduce(
    (sum, item) => sum + (item.total_value || 0),
    0,
  );
  const lowStockItems = inventory.filter(
    (item) => item.quantity_on_hand === 0,
  ).length;
  return (
    <div className="space-y-6">
      {" "}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {" "}
              <Package className="w-4 h-4" /> Total Items{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">{inventory.length}</div>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              Unique SKUs
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {" "}
              <TrendingDown className="w-4 h-4" /> Inventory Value{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              ${totalValue.toFixed(2)}
            </div>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              Total value
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {" "}
              <AlertCircle className="w-4 h-4 text-red-500" /> Out of Stock{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-red-600">
              {lowStockItems}
            </div>{" "}
            <p className="text-xs text-muted-foreground mt-1">Items</p>{" "}
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
              <CardTitle>Inventory Ledger</CardTitle>{" "}
              <CardDescription>
                Real-time inventory tracking
              </CardDescription>{" "}
            </div>{" "}
            <Button onClick={() => refetch()} variant="outline" size="sm">
              {" "}
              Refresh{" "}
            </Button>{" "}
          </div>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="overflow-x-auto">
            {" "}
            <Table>
              {" "}
              <TableHeader>
                {" "}
                <TableRow>
                  {" "}
                  <TableHead>Product</TableHead>{" "}
                  <TableHead className="text-right">On Hand</TableHead>{" "}
                  <TableHead className="text-right">Reserved</TableHead>{" "}
                  <TableHead className="text-right">Available</TableHead>{" "}
                  <TableHead className="text-right">Unit Cost</TableHead>{" "}
                  <TableHead className="text-right">Total Value</TableHead>{" "}
                  <TableHead>Status</TableHead>{" "}
                  <TableHead>Actions</TableHead>{" "}
                </TableRow>{" "}
              </TableHeader>{" "}
              <TableBody>
                {" "}
                {inventory.map((item) => (
                  <TableRow key={item.id}>
                    {" "}
                    <TableCell className="font-medium">
                      {" "}
                      <div>
                        {" "}
                        <p>{item.standard_products?.name || "Unknown"}</p>{" "}
                        <p className="text-xs text-muted-foreground">
                          {" "}
                          {item.standard_products?.base_unit}{" "}
                        </p>{" "}
                      </div>{" "}
                    </TableCell>{" "}
                    <TableCell className="text-right">
                      {" "}
                      {item.quantity_on_hand.toFixed(2)}{" "}
                    </TableCell>{" "}
                    <TableCell className="text-right">
                      {" "}
                      {item.quantity_reserved.toFixed(2)}{" "}
                    </TableCell>{" "}
                    <TableCell className="text-right">
                      {" "}
                      <span
                        className={`font-medium ${item.available_quantity === 0 ? "text-red-600" : ""}`}
                      >
                        {" "}
                        {item.available_quantity.toFixed(2)}{" "}
                      </span>{" "}
                    </TableCell>{" "}
                    <TableCell className="text-right">
                      {" "}
                      ${item.unit_cost?.toFixed(2) || "N/A"}{" "}
                    </TableCell>{" "}
                    <TableCell className="text-right font-semibold">
                      {" "}
                      ${item.total_value?.toFixed(2) || "0.00"}{" "}
                    </TableCell>{" "}
                    <TableCell>
                      {" "}
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${item.status === "active" ? "bg-green-100 text-green-800" : "bg-surface text-gray-800"}`}
                      >
                        {" "}
                        {item.status}{" "}
                      </span>{" "}
                    </TableCell>{" "}
                    <TableCell>
                      {" "}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedItem(item);
                          setShowAdjustmentDialog(true);
                        }}
                      >
                        {" "}
                        Adjust{" "}
                      </Button>{" "}
                    </TableCell>{" "}
                  </TableRow>
                ))}{" "}
              </TableBody>{" "}
            </Table>{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
      <Dialog
        open={showAdjustmentDialog}
        onOpenChange={setShowAdjustmentDialog}
      >
        {" "}
        <DialogContent>
          {" "}
          <DialogHeader>
            {" "}
            <DialogTitle>Adjust Inventory</DialogTitle>{" "}
          </DialogHeader>{" "}
          <div className="space-y-4">
            {" "}
            <div>
              {" "}
              <p className="text-sm font-medium">
                {" "}
                {selectedItem?.standard_products?.name}{" "}
              </p>{" "}
              <p className="text-xs text-muted-foreground">
                {" "}
                Current: {selectedItem?.quantity_on_hand.toFixed(2)}
                {""} {selectedItem?.standard_products?.base_unit}{" "}
              </p>{" "}
            </div>{" "}
            <div>
              {" "}
              <Label htmlFor="qty">Quantity Change</Label>{" "}
              <Input
                id="qty"
                type="number"
                step="0.01"
                value={adjustmentQty}
                onChange={(e) => setAdjustmentQty(e.target.value)}
                placeholder="Enter quantity change (positive or negative)"
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <Label htmlFor="notes">Notes</Label>{" "}
              <textarea
                id="notes"
                className="w-full px-3 py-2 border rounded-md text-sm"
                rows={3}
                value={adjustmentNotes}
                onChange={(e) => setAdjustmentNotes(e.target.value)}
                placeholder="Reason for adjustment..."
              />{" "}
            </div>{" "}
            <div className="flex gap-2 justify-end">
              {" "}
              <Button
                variant="outline"
                onClick={() => setShowAdjustmentDialog(false)}
              >
                {" "}
                Cancel{" "}
              </Button>{" "}
              <Button onClick={handleAdjustment}>Save Adjustment</Button>{" "}
            </div>{" "}
          </div>{" "}
        </DialogContent>{" "}
      </Dialog>{" "}
    </div>
  );
}
