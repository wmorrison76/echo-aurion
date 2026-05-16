/** * AI Order Edit Modal * * Modal for editing and approving AI-generated orders. * Allows chefs to adjust quantities, approve, or reject suggestions. */ import React, {
  useState,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import type { AIOrder } from "@/hooks/useBEODetail";
interface AIOrderEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: AIOrder | null;
  onSave: (updatedOrder: Partial<AIOrder>) => Promise<void>;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
  isLoading?: boolean;
}
function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return "bg-green-900 text-green-200";
  if (confidence >= 50) return "bg-yellow-900 text-yellow-200";
  return "bg-red-900 text-red-200";
}
function getConfidenceIcon(confidence: number) {
  if (confidence >= 80) return "✓";
  if (confidence >= 50) return "≈";
  return "!";
}
export function AIOrderEditModal({
  open,
  onOpenChange,
  order,
  onSave,
  onApprove,
  onReject,
  isLoading = false,
}: AIOrderEditModalProps) {
  const [quantity, setQuantity] = useState(order?.quantity.toString() || "0");
  const [unit, setUnit] = useState(order?.unit || "");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  if (!order) return null;
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ quantity: parseFloat(quantity), unit, feedback: notes });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };
  const handleApprove = async () => {
    setIsSaving(true);
    try {
      await onApprove();
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };
  const handleReject = async () => {
    setIsSaving(true);
    try {
      await onReject();
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {" "}
      <DialogContent className="max-w-2xl bg-slate-800 border-border">
        {" "}
        <DialogHeader>
          {" "}
          <DialogTitle className="text-white flex items-center gap-2">
            {" "}
            {order.itemName}{" "}
            <Badge
              className={`${getConfidenceColor(order.confidence)} text-xs`}
            >
              {" "}
              {getConfidenceIcon(order.confidence)} {order.confidence}%
              confident{" "}
            </Badge>{" "}
          </DialogTitle>{" "}
        </DialogHeader>{" "}
        <div className="space-y-5">
          {" "}
          {/* Confidence Context */}{" "}
          <div className="p-4 rounded-lg bg-surface border border-border">
            {" "}
            <div className="flex items-start gap-3">
              {" "}
              <AlertCircle className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />{" "}
              <div className="flex-1 text-xs text-slate-400">
                {" "}
                <p className="font-medium text-slate-300 mb-1">
                  {" "}
                  AI Confidence: {order.confidence}%{" "}
                </p>{" "}
                {order.confidence >= 80 && (
                  <p>
                    {" "}
                    High confidence. This suggestion is based on historical
                    patterns for similar events.{" "}
                  </p>
                )}{" "}
                {order.confidence >= 50 && order.confidence < 80 && (
                  <p>
                    {" "}
                    Medium confidence. Review this suggestion against your event
                    specifics.{" "}
                  </p>
                )}{" "}
                {order.confidence < 50 && (
                  <p>
                    {" "}
                    Low confidence. Use caution and verify this suggestion with
                    your team.{" "}
                  </p>
                )}{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          {/* Quantity & Unit */}{" "}
          <div className="grid grid-cols-2 gap-4">
            {" "}
            <div>
              {" "}
              <Label className="text-xs text-slate-300 mb-1.5 block">
                {" "}
                Quantity{" "}
              </Label>{" "}
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={isLoading || isSaving}
                className="bg-surface border-border text-white"
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <Label className="text-xs text-slate-300 mb-1.5 block">
                {" "}
                Unit{" "}
              </Label>{" "}
              <Select value={unit} onValueChange={setUnit}>
                {" "}
                <SelectTrigger className="bg-surface border-border text-white">
                  {" "}
                  <SelectValue />{" "}
                </SelectTrigger>{" "}
                <SelectContent className="bg-slate-800 border-border">
                  {" "}
                  <SelectItem value="pieces">Pieces</SelectItem>{" "}
                  <SelectItem value="lbs">Lbs</SelectItem>{" "}
                  <SelectItem value="kg">Kg</SelectItem>{" "}
                  <SelectItem value="oz">Oz</SelectItem>{" "}
                  <SelectItem value="gallons">Gallons</SelectItem>{" "}
                  <SelectItem value="liters">Liters</SelectItem>{" "}
                  <SelectItem value="cups">Cups</SelectItem>{" "}
                  <SelectItem value="tbsp">Tbsp</SelectItem>{" "}
                  <SelectItem value="tsp">Tsp</SelectItem>{" "}
                </SelectContent>{" "}
              </Select>{" "}
            </div>{" "}
          </div>{" "}
          {/* Chef Notes */}{" "}
          <div>
            {" "}
            <Label className="text-xs text-slate-300 mb-1.5 block">
              {" "}
              Chef Notes (feedback for AI){" "}
            </Label>{" "}
            <Textarea
              placeholder="Why are you approving, adjusting, or rejecting? Your feedback helps train the AI..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading || isSaving}
              className="bg-surface border-border text-white placeholder-slate-500 text-xs min-h-24"
            />{" "}
          </div>{" "}
          {/* Status Info */}{" "}
          <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
            {" "}
            <div className="p-3 rounded bg-surface border border-border">
              {" "}
              <p className="text-slate-300 font-medium mb-1">Current</p>{" "}
              <p>
                {order.quantity} {order.unit}
              </p>{" "}
            </div>{" "}
            <div className="p-3 rounded bg-surface border border-border">
              {" "}
              <p className="text-slate-300 font-medium mb-1">Status</p>{" "}
              <Badge variant={order.approved ? "secondary" : "outline"}>
                {" "}
                {order.approved ? "✓ Approved" : "Pending Review"}{" "}
              </Badge>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        <DialogFooter className="flex gap-2 flex-wrap justify-end">
          {" "}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
          >
            {" "}
            Cancel{" "}
          </Button>{" "}
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isSaving}
            className="text-xs"
          >
            {" "}
            ✗ Reject{" "}
          </Button>{" "}
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isSaving}
            className="text-xs"
          >
            {" "}
            Save Changes{" "}
          </Button>{" "}
          <Button
            onClick={handleApprove}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 text-white text-xs"
          >
            {" "}
            ✓ Approve & Confirm{" "}
          </Button>{" "}
        </DialogFooter>{" "}
      </DialogContent>{" "}
    </Dialog>
  );
}
