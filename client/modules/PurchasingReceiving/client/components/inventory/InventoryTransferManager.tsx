import React, { useState, useEffect, useCallback } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Alert, AlertDescription } from "../ui/alert";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Truck,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";
export interface TransferItem {
  itemId: string;
  itemName?: string;
  quantity: number;
  unit: string;
}
export interface Transfer {
  id: string;
  fromOutlet: string;
  toOutlet: string;
  items: TransferItem[];
  status: "pending" | "in_transit" | "received";
  createdAt: string;
  approvedAt?: string;
  receivedAt?: string;
}
export interface InventoryTransferManagerProps {
  organizationId: string;
  outlets: Array<{ id: string; name: string }>;
  onTransferCreated?: (transfer: Transfer) => void;
  onError?: (error: string) => void;
}
export function InventoryTransferManager({
  organizationId,
  outlets,
  onTransferCreated,
  onError,
}: InventoryTransferManagerProps) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fromOutletId: outlets[0]?.id || "",
    toOutletId: outlets[1]?.id || "",
    items: [{ itemId: "", itemName: "", quantity: 1, unit: "ea" }],
    notes: "",
  });
  const [selectedTab, setSelectedTab] = useState<"create" | "view">("create");
  useEffect(() => {
    if (selectedTab === "view") {
      fetchTransfers();
    }
  }, [selectedTab, organizationId]);
  const fetchTransfers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/mobile-inventory/transfers/${organizationId}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch transfers");
      }
      const data = await response.json();
      setTransfers(data);
    } catch (error) {
      onError?.(
        error instanceof Error ? error.message : "Failed to fetch transfers",
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId, onError]);
  const handleAddItem = useCallback(() => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { itemId: "", itemName: "", quantity: 1, unit: "ea" },
      ],
    });
  }, [formData]);
  const handleRemoveItem = useCallback(
    (index: number) => {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== index),
      });
    },
    [formData],
  );
  const handleCreateTransfer = useCallback(async () => {
    if (
      !formData.fromOutletId ||
      !formData.toOutletId ||
      formData.items.length === 0
    ) {
      onError?.("Please fill in all required fields");
      return;
    }
    try {
      setLoading(true);
      const response = await fetch("/api/mobile-inventory/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          fromOutletId: formData.fromOutletId,
          toOutletId: formData.toOutletId,
          items: formData.items.map((item) => ({
            itemId: item.itemId,
            quantity: item.quantity,
            unit: item.unit,
          })),
          notes: formData.notes,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to create transfer");
      }
      const transfer = await response.json();
      onTransferCreated?.(transfer);
      setFormData({
        fromOutletId: outlets[0]?.id || "",
        toOutletId: outlets[1]?.id || "",
        items: [{ itemId: "", itemName: "", quantity: 1, unit: "ea" }],
        notes: "",
      });
      setSelectedTab("view");
      fetchTransfers();
    } catch (error) {
      onError?.(
        error instanceof Error ? error.message : "Failed to create transfer",
      );
    } finally {
      setLoading(false);
    }
  }, [
    formData,
    organizationId,
    outlets,
    onTransferCreated,
    onError,
    fetchTransfers,
  ]);
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "in_transit":
        return <Truck className="w-4 h-4 text-blue-500" />;
      case "received":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      default:
        return null;
    }
  };
  return (
    <div className="space-y-4">
      {" "}
      <div className="flex gap-2 border-b">
        {" "}
        <Button
          variant={selectedTab === "create" ? "default" : "ghost"}
          onClick={() => setSelectedTab("create")}
          className="rounded-none"
        >
          {" "}
          Create Transfer{" "}
        </Button>{" "}
        <Button
          variant={selectedTab === "view" ? "default" : "ghost"}
          onClick={() => setSelectedTab("view")}
          className="rounded-none"
        >
          {" "}
          View Transfers{" "}
        </Button>{" "}
      </div>{" "}
      {selectedTab === "create" && (
        <Card className="p-4 space-y-4">
          {" "}
          <div className="grid grid-cols-2 gap-4">
            {" "}
            <div>
              {" "}
              <label className="block text-sm font-medium mb-1">
                {" "}
                From Outlet *{" "}
              </label>{" "}
              <select
                value={formData.fromOutletId}
                onChange={(e) =>
                  setFormData({ ...formData, fromOutletId: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md"
                disabled={loading}
              >
                {" "}
                <option value="">Select outlet</option>{" "}
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {" "}
                    {outlet.name}{" "}
                  </option>
                ))}{" "}
              </select>{" "}
            </div>{" "}
            <div>
              {" "}
              <label className="block text-sm font-medium mb-1">
                {" "}
                To Outlet *{" "}
              </label>{" "}
              <select
                value={formData.toOutletId}
                onChange={(e) =>
                  setFormData({ ...formData, toOutletId: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md"
                disabled={loading}
              >
                {" "}
                <option value="">Select outlet</option>{" "}
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {" "}
                    {outlet.name}{" "}
                  </option>
                ))}{" "}
              </select>{" "}
            </div>{" "}
          </div>{" "}
          <div>
            {" "}
            <label className="block text-sm font-medium mb-2">Items</label>{" "}
            <div className="space-y-2">
              {" "}
              {formData.items.map((item, index) => (
                <div key={index} className="flex gap-2">
                  {" "}
                  <Input
                    value={item.itemName}
                    onChange={(e) => {
                      const items = [...formData.items];
                      items[index].itemName = e.target.value;
                      setFormData({ ...formData, items });
                    }}
                    placeholder="Item name"
                    disabled={loading}
                  />{" "}
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const items = [...formData.items];
                      items[index].quantity = parseFloat(e.target.value);
                      setFormData({ ...formData, items });
                    }}
                    placeholder="Qty"
                    className="w-20"
                    disabled={loading}
                    step="0.01"
                  />{" "}
                  <select
                    value={item.unit}
                    onChange={(e) => {
                      const items = [...formData.items];
                      items[index].unit = e.target.value;
                      setFormData({ ...formData, items });
                    }}
                    className="w-20 px-2 py-2 border rounded-md"
                    disabled={loading}
                  >
                    {" "}
                    <option value="ea">EA</option>{" "}
                    <option value="case">Case</option>{" "}
                    <option value="lb">LB</option>{" "}
                  </select>{" "}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveItem(index)}
                    disabled={loading || formData.items.length === 1}
                  >
                    {" "}
                    <Trash2 className="w-4 h-4" />{" "}
                  </Button>{" "}
                </div>
              ))}{" "}
            </div>{" "}
            <Button
              variant="outline"
              onClick={handleAddItem}
              disabled={loading}
              className="mt-2"
            >
              {" "}
              <Plus className="w-4 h-4 mr-2" /> Add Item{" "}
            </Button>{" "}
          </div>{" "}
          <div>
            {" "}
            <label className="block text-sm font-medium mb-1">Notes</label>{" "}
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Any special instructions..."
              disabled={loading}
              className="w-full px-3 py-2 border rounded-md"
              rows={2}
            />{" "}
          </div>{" "}
          <Button
            onClick={handleCreateTransfer}
            disabled={loading}
            className="w-full"
          >
            {" "}
            Create Transfer{" "}
          </Button>{" "}
        </Card>
      )}{" "}
      {selectedTab === "view" && (
        <div className="space-y-4">
          {" "}
          {loading && <p className="text-center">Loading transfers...</p>}{" "}
          {!loading && transfers.length === 0 && (
            <Alert>
              {" "}
              <AlertCircle className="h-4 w-4" />{" "}
              <AlertDescription>No transfers found</AlertDescription>{" "}
            </Alert>
          )}{" "}
          {transfers.map((transfer) => (
            <Card key={transfer.id} className="p-4">
              {" "}
              <div className="flex items-center justify-between mb-3">
                {" "}
                <div className="flex items-center gap-2">
                  {" "}
                  {getStatusIcon(transfer.status)}{" "}
                  <div>
                    {" "}
                    <p className="font-semibold capitalize">
                      {transfer.status}
                    </p>{" "}
                    <p className="text-sm text-muted-foreground">
                      {" "}
                      {new Date(transfer.createdAt).toLocaleDateString()}{" "}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
              <div className="flex items-center gap-2 mb-3">
                {" "}
                <span className="text-sm font-medium">
                  {" "}
                  {outlets.find((o) => o.id === transfer.fromOutlet)?.name ||
                    transfer.fromOutlet}{" "}
                </span>{" "}
                <ArrowRight className="w-4 h-4 text-gray-400" />{" "}
                <span className="text-sm font-medium">
                  {" "}
                  {outlets.find((o) => o.id === transfer.toOutlet)?.name ||
                    transfer.toOutlet}{" "}
                </span>{" "}
              </div>{" "}
              <div className="bg-surface p-2 rounded text-sm space-y-1">
                {" "}
                {transfer.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    {" "}
                    <span>{item.itemName || item.itemId}</span>{" "}
                    <span className="font-medium">
                      {" "}
                      {item.quantity} {item.unit}{" "}
                    </span>{" "}
                  </div>
                ))}{" "}
              </div>{" "}
            </Card>
          ))}{" "}
        </div>
      )}{" "}
    </div>
  );
}
