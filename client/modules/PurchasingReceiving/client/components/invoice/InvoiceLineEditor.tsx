import React, { useCallback, useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit2, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  glCode?: string;
  glDescription?: string;
  category?: string;
  confidence?: number;
  flags?: string[];
}
export interface InvoiceLineEditorProps {
  items: InvoiceLineItem[];
  onItemsChange: (items: InvoiceLineItem[]) => void;
  glCodes: Array<{ id: string; code: string; description: string }>;
  categories: string[];
  isLoading?: boolean;
}
export function InvoiceLineEditor({
  items,
  onItemsChange,
  glCodes,
  categories,
  isLoading = false,
}: InvoiceLineEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<InvoiceLineItem>>({});
  const handleStartEdit = useCallback((item: InvoiceLineItem) => {
    setEditingId(item.id);
    setEditValues(item);
  }, []);
  const handleSaveEdit = useCallback(() => {
    if (!editingId) return;
    const updatedItems = items.map((item) => {
      if (item.id === editingId) {
        return {
          ...item,
          ...editValues,
          totalPrice:
            (editValues.quantity || item.quantity) *
            (editValues.unitPrice || item.unitPrice),
        };
      }
      return item;
    });
    onItemsChange(updatedItems);
    setEditingId(null);
    setEditValues({});
  }, [editingId, editValues, items, onItemsChange]);
  const handleRemoveLine = useCallback(
    (id: string) => {
      onItemsChange(items.filter((item) => item.id !== id));
    },
    [items, onItemsChange],
  );
  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditValues({});
  }, []);
  const lowConfidenceItems = items.filter(
    (item) => (item.confidence || 100) < 75,
  );
  return (
    <Card className="border-cyan-400/30 bg-card">
      {" "}
      <CardHeader>
        {" "}
        <CardTitle className="flex items-center gap-2">
          {" "}
          <Edit2 className="h-5 w-5" /> Invoice Line Items{" "}
        </CardTitle>{" "}
        <CardDescription className="text-cyan-200/70">
          {" "}
          Review OCR results, correct errors, and assign GL codes{" "}
        </CardDescription>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-4">
        {" "}
        {lowConfidenceItems.length > 0 && (
          <Alert className="border-yellow-400/40 bg-yellow-500/10 text-yellow-200">
            {" "}
            <AlertCircle className="h-4 w-4" />{" "}
            <AlertDescription>
              {" "}
              {lowConfidenceItems.length} items have low OCR confidence. Please
              review and correct.{" "}
            </AlertDescription>{" "}
          </Alert>
        )}{" "}
        <div className="space-y-3">
          {" "}
          {items.map((item) => {
            const isEditing = editingId === item.id;
            const confidence = item.confidence || 100;
            const hasFlags = (item.flags || []).length > 0;
            return (
              <div
                key={item.id}
                className={`rounded-lg border p-4 ${isEditing ? "border-cyan-400/50 bg-cyan-500/10" : confidence < 75 ? "border-yellow-400/40 bg-yellow-500/5" : "border-cyan-400/20 bg-card"}`}
              >
                {" "}
                {isEditing ? (
                  <div className="space-y-4">
                    {" "}
                    <div className="grid gap-3 md:grid-cols-2">
                      {" "}
                      <div>
                        {" "}
                        <label className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                          {" "}
                          Description{" "}
                        </label>{" "}
                        <Input
                          value={editValues.description || ""}
                          onChange={(e) =>
                            setEditValues((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                          className="mt-1 border-cyan-400/20 bg-card text-cyan-100"
                        />{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <label className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                          {" "}
                          Category{" "}
                        </label>{" "}
                        <Select
                          value={editValues.category || ""}
                          onValueChange={(value) =>
                            setEditValues((prev) => ({
                              ...prev,
                              category: value || undefined,
                            }))
                          }
                        >
                          {" "}
                          <SelectTrigger className="mt-1 border-cyan-400/20 bg-card">
                            {" "}
                            <SelectValue placeholder="Select category" />{" "}
                          </SelectTrigger>{" "}
                          <SelectContent>
                            {" "}
                            {categories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {" "}
                                {cat}{" "}
                              </SelectItem>
                            ))}{" "}
                          </SelectContent>{" "}
                        </Select>{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="grid gap-3 md:grid-cols-3">
                      {" "}
                      <div>
                        {" "}
                        <label className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                          {" "}
                          Quantity{" "}
                        </label>{" "}
                        <Input
                          type="number"
                          step="0.01"
                          value={editValues.quantity || ""}
                          onChange={(e) =>
                            setEditValues((prev) => ({
                              ...prev,
                              quantity: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="mt-1 border-cyan-400/20 bg-card text-cyan-100"
                        />{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <label className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                          {" "}
                          Unit Price{" "}
                        </label>{" "}
                        <Input
                          type="number"
                          step="0.01"
                          value={editValues.unitPrice || ""}
                          onChange={(e) =>
                            setEditValues((prev) => ({
                              ...prev,
                              unitPrice: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="mt-1 border-cyan-400/20 bg-card text-cyan-100"
                        />{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <label className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                          {" "}
                          Total Price{" "}
                        </label>{" "}
                        <div className="mt-1 rounded border border-cyan-400/20 bg-card px-3 py-2 text-sm text-cyan-100">
                          {" "}
                          ${" "}
                          {(
                            (editValues.quantity || item.quantity) *
                            (editValues.unitPrice || item.unitPrice)
                          ).toFixed(2)}{" "}
                        </div>{" "}
                      </div>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <label className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                        {" "}
                        GL Code{" "}
                      </label>{" "}
                      <Select
                        value={editValues.glCode || ""}
                        onValueChange={(value) => {
                          const selected = glCodes.find((g) => g.id === value);
                          setEditValues((prev) => ({
                            ...prev,
                            glCode: selected?.code,
                            glDescription: selected?.description,
                          }));
                        }}
                      >
                        {" "}
                        <SelectTrigger className="mt-1 border-cyan-400/20 bg-card">
                          {" "}
                          <SelectValue placeholder="Select GL code" />{" "}
                        </SelectTrigger>{" "}
                        <SelectContent>
                          {" "}
                          {glCodes.map((code) => (
                            <SelectItem key={code.id} value={code.id}>
                              {" "}
                              {code.code} - {code.description}{" "}
                            </SelectItem>
                          ))}{" "}
                        </SelectContent>{" "}
                      </Select>{" "}
                    </div>{" "}
                    <div className="flex gap-2">
                      {" "}
                      <Button
                        onClick={handleSaveEdit}
                        size="sm"
                        className="flex-1"
                        disabled={isLoading}
                      >
                        {" "}
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Save
                        Changes{" "}
                      </Button>{" "}
                      <Button
                        onClick={handleCancelEdit}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        {" "}
                        Cancel{" "}
                      </Button>{" "}
                    </div>{" "}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {" "}
                    <div className="flex items-start justify-between gap-3">
                      {" "}
                      <div className="flex-1">
                        {" "}
                        <div className="font-semibold text-cyan-100">
                          {item.description}
                        </div>{" "}
                        {item.category && (
                          <Badge variant="outline" className="mt-1">
                            {" "}
                            {item.category}{" "}
                          </Badge>
                        )}{" "}
                        {hasFlags && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {" "}
                            {item.flags?.map((flag, idx) => (
                              <Badge
                                key={idx}
                                variant="destructive"
                                className="text-xs"
                              >
                                {" "}
                                {flag}{" "}
                              </Badge>
                            ))}{" "}
                          </div>
                        )}{" "}
                      </div>{" "}
                      <div className="text-right">
                        {" "}
                        <div className="text-sm font-mono text-cyan-100">
                          {" "}
                          ${item.totalPrice.toFixed(2)}{" "}
                        </div>{" "}
                        <div className="text-xs text-cyan-200/60">
                          {" "}
                          {item.quantity} × ${item.unitPrice.toFixed(2)}{" "}
                        </div>{" "}
                      </div>{" "}
                    </div>{" "}
                    {item.glCode && (
                      <div className="rounded bg-surface px-2 py-1 text-xs text-cyan-200/80">
                        {" "}
                        <strong>GL:</strong> {item.glCode}{" "}
                        {item.glDescription && `- ${item.glDescription}`}{" "}
                      </div>
                    )}{" "}
                    {confidence < 100 && (
                      <div className="text-xs text-yellow-200/70">
                        {" "}
                        OCR Confidence: {confidence.toFixed(0)}%{" "}
                      </div>
                    )}{" "}
                    <div className="flex gap-2 pt-2">
                      {" "}
                      <Button
                        onClick={() => handleStartEdit(item)}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        {" "}
                        <Edit2 className="mr-1 h-4 w-4" /> Edit{" "}
                      </Button>{" "}
                      <Button
                        onClick={() => handleRemoveLine(item.id)}
                        size="sm"
                        variant="outline"
                        className="flex-1 text-red-300 hover:text-red-400"
                      >
                        {" "}
                        <Trash2 className="mr-1 h-4 w-4" /> Remove{" "}
                      </Button>{" "}
                    </div>{" "}
                  </div>
                )}{" "}
              </div>
            );
          })}{" "}
        </div>{" "}
        {items.length === 0 && (
          <div className="rounded-lg border border-cyan-400/20 bg-card py-8 text-center text-sm text-cyan-200/60">
            {" "}
            No line items to display{" "}
          </div>
        )}{" "}
      </CardContent>{" "}
    </Card>
  );
}
