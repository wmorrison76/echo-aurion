import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
interface Stage2ExistingSeatingProps {
  session: any;
  onComplete: () => void;
}
interface ExistingSeating {
  id: string;
  seating_type: string;
  quantity: number;
  size_category?: string;
  width_ft?: number;
  depth_ft?: number;
  seating_capacity?: number;
}
const SEATING_TYPES = [
  { value: "table_round", label: "Round Table" },
  { value: "table_rect", label: "Rectangular Table" },
  { value: "table_square", label: "Square Table" },
  { value: "banquette", label: "Banquette" },
  { value: "booth", label: "Booth" },
];
const SIZE_CATEGORIES = [
  { value: "2-top", label: "2-Top" },
  { value: "4-top", label: "4-Top" },
  { value: "6-top", label: "6-Top" },
  { value: "8-top", label: "8-Top" },
  { value: "10-top", label: "10-Top" },
  { value: "12-top", label: "12-Top" },
  { value: "custom", label: "Custom Size" },
];
const SIZE_DIMENSIONS: Record<
  string,
  { width: number; depth: number; seats: number }
> = {
  "2-top": { width: 2, depth: 2, seats: 2 },
  "4-top": { width: 2.5, depth: 2.5, seats: 4 },
  "6-top": { width: 5, depth: 5, seats: 6 },
  "8-top": { width: 5, depth: 5, seats: 8 },
  "10-top": { width: 6, depth: 6, seats: 10 },
  "12-top": { width: 8, depth: 8, seats: 12 },
};
export default function Stage2ExistingSeating({
  session,
  onComplete,
}: Stage2ExistingSeatingProps) {
  const { toast } = useToast();
  const [existingSeating, setExistingSeating] = useState<ExistingSeating[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newSeating, setNewSeating] = useState({
    seating_type: "table_round",
    quantity: 1,
    size_category: "6-top",
    width_ft: 5,
    depth_ft: 5,
    seating_capacity: 6,
  });
  useEffect(() => {
    loadExistingSeating();
  }, []);
  const loadExistingSeating = async () => {
    try {
      const { data, error } = await supabase
        .from("existing_seating")
        .select("*")
        .eq("layout_session_id", session.id)
        .order("created_at");
      if (error) throw error;
      setExistingSeating(data || []);
    } catch (error) {
      console.error("Failed to load existing seating:", error);
      toast({ title: "Failed to load seating data", variant: "destructive" });
    }
  };
  const addSeating = async () => {
    if (newSeating.quantity < 1) {
      toast({ title: "Quantity must be at least 1" });
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("existing_seating")
        .insert({
          layout_session_id: session.id,
          room_id: session.room_id,
          seating_type: newSeating.seating_type,
          quantity: newSeating.quantity,
          size_category:
            newSeating.size_category !== "custom"
              ? newSeating.size_category
              : null,
          width_ft: newSeating.width_ft,
          depth_ft: newSeating.depth_ft,
          seating_capacity: newSeating.seating_capacity,
        })
        .select()
        .single();
      if (error) throw error;
      setExistingSeating([...existingSeating, data]);
      setNewSeating({
        seating_type: "table_round",
        quantity: 1,
        size_category: "6-top",
        width_ft: 5,
        depth_ft: 5,
        seating_capacity: 6,
      });
      setShowForm(false);
      toast({ title: "Seating configuration added" });
    } catch (error) {
      console.error("Failed to add seating:", error);
      toast({ title: "Failed to add seating", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  const deleteSeating = async (id: string) => {
    try {
      const { error } = await supabase
        .from("existing_seating")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setExistingSeating(existingSeating.filter((s) => s.id !== id));
      toast({ title: "Seating configuration removed" });
    } catch (error) {
      console.error("Failed to delete seating:", error);
      toast({ title: "Failed to delete seating", variant: "destructive" });
    }
  };
  const handleSizeChange = (size: string) => {
    setNewSeating({ ...newSeating, size_category: size });
    if (size !== "custom" && SIZE_DIMENSIONS[size]) {
      const dims = SIZE_DIMENSIONS[size];
      setNewSeating((prev) => ({
        ...prev,
        width_ft: dims.width,
        depth_ft: dims.depth,
        seating_capacity: dims.seats,
      }));
    }
  };
  const getTotalSeatingCapacity = () => {
    return existingSeating.reduce(
      (total, item) => total + (item.seating_capacity || 0) * item.quantity,
      0,
    );
  };
  return (
    <div className="space-y-8">
      {" "}
      <div>
        {" "}
        <h2 className="text-2xl font-bold mb-2">
          Stage 2: Existing Seating
        </h2>{" "}
        <p className="text-muted-foreground">
          {" "}
          Document any tables, banquettes, or other seating already in the
          room.{" "}
        </p>{" "}
      </div>{" "}
      {/* Existing Seating List */}{" "}
      {existingSeating.length > 0 && (
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Current Seating Configuration</CardTitle>{" "}
            <CardDescription>
              {" "}
              Total capacity: {getTotalSeatingCapacity()} guests{" "}
            </CardDescription>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="space-y-3">
              {" "}
              {existingSeating.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border"
                >
                  {" "}
                  <div className="flex-1">
                    {" "}
                    <div className="font-semibold">
                      {" "}
                      {item.quantity}x{" "}
                      {
                        SEATING_TYPES.find((t) => t.value === item.seating_type)
                          ?.label
                      }{" "}
                    </div>{" "}
                    <div className="text-sm text-muted-foreground mt-1">
                      {" "}
                      {item.size_category && `${item.size_category} • `}{" "}
                      {item.width_ft?.toFixed(1)}' × {item.depth_ft?.toFixed(1)}
                      ' •{""} {item.seating_capacity} seats each{" "}
                    </div>{" "}
                  </div>{" "}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSeating(item.id)}
                  >
                    {" "}
                    <Trash2 className="h-4 w-4 text-red-500" />{" "}
                  </Button>{" "}
                </div>
              ))}{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
      {/* Add Seating Form */}{" "}
      {!showForm && (
        <Button
          onClick={() => setShowForm(true)}
          variant="outline"
          className="w-full"
        >
          {" "}
          + Add Seating Configuration{" "}
        </Button>
      )}{" "}
      {showForm && (
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Add Seating Configuration</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent className="space-y-4">
            {" "}
            <div className="grid grid-cols-2 gap-4">
              {" "}
              <div>
                {" "}
                <label className="text-sm font-medium mb-2 block">
                  Seating Type
                </label>{" "}
                <Select
                  value={newSeating.seating_type}
                  onValueChange={(value) =>
                    setNewSeating({ ...newSeating, seating_type: value })
                  }
                >
                  {" "}
                  <SelectTrigger>
                    {" "}
                    <SelectValue />{" "}
                  </SelectTrigger>{" "}
                  <SelectContent>
                    {" "}
                    {SEATING_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {" "}
                        {type.label}{" "}
                      </SelectItem>
                    ))}{" "}
                  </SelectContent>{" "}
                </Select>{" "}
              </div>{" "}
              <div>
                {" "}
                <label className="text-sm font-medium mb-2 block">
                  Quantity
                </label>{" "}
                <input
                  type="number"
                  min="1"
                  value={newSeating.quantity}
                  onChange={(e) =>
                    setNewSeating({
                      ...newSeating,
                      quantity: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />{" "}
              </div>{" "}
            </div>{" "}
            <div>
              {" "}
              <label className="text-sm font-medium mb-2 block">
                Size Category
              </label>{" "}
              <Select
                value={newSeating.size_category}
                onValueChange={handleSizeChange}
              >
                {" "}
                <SelectTrigger>
                  {" "}
                  <SelectValue />{" "}
                </SelectTrigger>{" "}
                <SelectContent>
                  {" "}
                  {SIZE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {" "}
                      {cat.label}{" "}
                    </SelectItem>
                  ))}{" "}
                </SelectContent>{" "}
              </Select>{" "}
            </div>{" "}
            {newSeating.size_category === "custom" && (
              <div className="grid grid-cols-3 gap-4">
                {" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium mb-2 block">
                    Width (ft)
                  </label>{" "}
                  <input
                    type="number"
                    step="0.5"
                    value={newSeating.width_ft}
                    onChange={(e) =>
                      setNewSeating({
                        ...newSeating,
                        width_ft: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium mb-2 block">
                    Depth (ft)
                  </label>{" "}
                  <input
                    type="number"
                    step="0.5"
                    value={newSeating.depth_ft}
                    onChange={(e) =>
                      setNewSeating({
                        ...newSeating,
                        depth_ft: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium mb-2 block">
                    Seats
                  </label>{" "}
                  <input
                    type="number"
                    value={newSeating.seating_capacity}
                    onChange={(e) =>
                      setNewSeating({
                        ...newSeating,
                        seating_capacity: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />{" "}
                </div>{" "}
              </div>
            )}{" "}
            <div className="flex gap-2">
              {" "}
              <Button
                onClick={addSeating}
                disabled={loading}
                className="flex-1"
              >
                {" "}
                Add Configuration{" "}
              </Button>{" "}
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="flex-1"
              >
                {" "}
                Cancel{" "}
              </Button>{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
      {/* Action Buttons */}{" "}
      <div className="flex gap-2 justify-end">
        {" "}
        <Button variant="outline">Skip for Now</Button>{" "}
        <Button onClick={onComplete}>Continue to Next Stage</Button>{" "}
      </div>{" "}
    </div>
  );
}
