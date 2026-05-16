import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, Edit2 } from "lucide-react";
import type { Database } from "../types/database";
type Equipment = Database["public"]["Tables"]["equipment"]["Row"];
const CATEGORIES = [
  "Table",
  "Chair",
  "Linens",
  "Decor",
  "Bar Equipment",
  "Serving",
  "Other",
];
interface EquipmentManagerProps {
  onEquipmentSelect?: (equipment: Equipment) => void;
}
export function EquipmentManager({ onEquipmentSelect }: EquipmentManagerProps) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: CATEGORIES[0],
    description: "",
    width_ft: "",
    depth_ft: "",
    height_ft: "",
    weight_lbs: "",
    quantity_available: "1",
    unit_price: "",
  });
  const { toast } = useToast();
  useEffect(() => {
    loadEquipment();
  }, []);
  const loadEquipment = async () => {
    try {
      const { data, error } = await supabase.from("equipment").select("*");
      if (error) throw error;
      setEquipment(data || []);
    } catch (e) {
      toast({ title: "Failed to load equipment", variant: "destructive" });
    }
  };
  const saveEquipment = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Equipment name required", variant: "destructive" });
      return;
    }
    try {
      setIsLoading(true);
      const payload = {
        name: formData.name,
        category: formData.category,
        description: formData.description || null,
        width_ft: formData.width_ft ? Number(formData.width_ft) : null,
        depth_ft: formData.depth_ft ? Number(formData.depth_ft) : null,
        height_ft: formData.height_ft ? Number(formData.height_ft) : null,
        weight_lbs: formData.weight_lbs ? Number(formData.weight_lbs) : null,
        quantity_available: Number(formData.quantity_available) || 0,
        unit_price: formData.unit_price ? Number(formData.unit_price) : null,
      };
      if (editingId) {
        const { data, error } = await supabase
          .from("equipment")
          .update(payload)
          .eq("id", editingId)
          .select()
          .single();
        if (error) throw error;
        setEquipment((e) => e.map((eq) => (eq.id === editingId ? data : eq)));
        toast({ title: "Equipment updated" });
      } else {
        const { data, error } = await supabase
          .from("equipment")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setEquipment((e) => [...e, data]);
        toast({ title: "Equipment added" });
      }
      resetForm();
      setIsOpen(false);
    } catch (e) {
      toast({ title: "Failed to save equipment", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  const deleteEquipment = async (id: string) => {
    try {
      const { error } = await supabase.from("equipment").delete().eq("id", id);
      if (error) throw error;
      setEquipment((e) => e.filter((eq) => eq.id !== id));
      toast({ title: "Equipment deleted" });
    } catch (e) {
      toast({ title: "Failed to delete equipment", variant: "destructive" });
    }
  };
  const resetForm = () => {
    setFormData({
      name: "",
      category: CATEGORIES[0],
      description: "",
      width_ft: "",
      depth_ft: "",
      height_ft: "",
      weight_lbs: "",
      quantity_available: "1",
      unit_price: "",
    });
    setEditingId(null);
  };
  const startEdit = (eq: Equipment) => {
    setEditingId(eq.id);
    setFormData({
      name: eq.name,
      category: eq.category || CATEGORIES[0],
      description: eq.description || "",
      width_ft: eq.width_ft?.toString() || "",
      depth_ft: eq.depth_ft?.toString() || "",
      height_ft: eq.height_ft?.toString() || "",
      weight_lbs: eq.weight_lbs?.toString() || "",
      quantity_available: (eq.quantity_available || 1).toString(),
      unit_price: eq.unit_price?.toString() || "",
    });
    setIsOpen(true);
  };
  return (
    <div className="space-y-4">
      {" "}
      <div className="flex justify-between items-center">
        {" "}
        <h3 className="text-sm font-semibold">Equipment Library</h3>{" "}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          {" "}
          <DialogTrigger asChild>
            {" "}
            <Button size="sm" onClick={() => resetForm()}>
              {" "}
              <Plus className="h-4 w-4 mr-1" /> Add Equipment{" "}
            </Button>{" "}
          </DialogTrigger>{" "}
          <DialogContent>
            {" "}
            <DialogHeader>
              {" "}
              <DialogTitle>
                {" "}
                {editingId ? "Edit Equipment" : "Add Equipment"}{" "}
              </DialogTitle>{" "}
            </DialogHeader>{" "}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {" "}
              <div>
                {" "}
                <label className="text-xs text-muted-foreground">
                  Name*
                </label>{" "}
                <Input
                  placeholder="Equipment name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="h-8"
                />{" "}
              </div>{" "}
              <div>
                {" "}
                <label className="text-xs text-muted-foreground">
                  Category
                </label>{" "}
                <Select
                  value={formData.category}
                  onValueChange={(v) =>
                    setFormData({ ...formData, category: v })
                  }
                >
                  {" "}
                  <SelectTrigger className="h-8">
                    {" "}
                    <SelectValue />{" "}
                  </SelectTrigger>{" "}
                  <SelectContent>
                    {" "}
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {" "}
                        {cat}{" "}
                      </SelectItem>
                    ))}{" "}
                  </SelectContent>{" "}
                </Select>{" "}
              </div>{" "}
              <div>
                {" "}
                <label className="text-xs text-muted-foreground">
                  {" "}
                  Description{" "}
                </label>{" "}
                <Input
                  placeholder="Optional description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="h-8"
                />{" "}
              </div>{" "}
              <div className="grid grid-cols-3 gap-2">
                {" "}
                <div>
                  {" "}
                  <label className="text-xs text-muted-foreground">
                    {" "}
                    Width (ft){" "}
                  </label>{" "}
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={formData.width_ft}
                    onChange={(e) =>
                      setFormData({ ...formData, width_ft: e.target.value })
                    }
                    className="h-8"
                  />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-xs text-muted-foreground">
                    {" "}
                    Depth (ft){" "}
                  </label>{" "}
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={formData.depth_ft}
                    onChange={(e) =>
                      setFormData({ ...formData, depth_ft: e.target.value })
                    }
                    className="h-8"
                  />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-xs text-muted-foreground">
                    {" "}
                    Height (ft){" "}
                  </label>{" "}
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={formData.height_ft}
                    onChange={(e) =>
                      setFormData({ ...formData, height_ft: e.target.value })
                    }
                    className="h-8"
                  />{" "}
                </div>{" "}
              </div>{" "}
              <div className="grid grid-cols-2 gap-2">
                {" "}
                <div>
                  {" "}
                  <label className="text-xs text-muted-foreground">
                    {" "}
                    Weight (lbs){" "}
                  </label>{" "}
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.weight_lbs}
                    onChange={(e) =>
                      setFormData({ ...formData, weight_lbs: e.target.value })
                    }
                    className="h-8"
                  />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-xs text-muted-foreground">
                    {" "}
                    Unit Price{" "}
                  </label>{" "}
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.unit_price}
                    onChange={(e) =>
                      setFormData({ ...formData, unit_price: e.target.value })
                    }
                    className="h-8"
                  />{" "}
                </div>{" "}
              </div>{" "}
              <div>
                {" "}
                <label className="text-xs text-muted-foreground">
                  {" "}
                  Quantity Available{" "}
                </label>{" "}
                <Input
                  type="number"
                  placeholder="1"
                  value={formData.quantity_available}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity_available: e.target.value,
                    })
                  }
                  className="h-8"
                />{" "}
              </div>{" "}
              <Button
                onClick={saveEquipment}
                disabled={isLoading}
                className="w-full"
              >
                {" "}
                {isLoading ? "Saving..." : "Save Equipment"}{" "}
              </Button>{" "}
            </div>{" "}
          </DialogContent>{" "}
        </Dialog>{" "}
      </div>{" "}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {" "}
        {equipment.map((eq) => (
          <div
            key={eq.id}
            className="flex items-center justify-between p-2 rounded border bg-muted/50 hover:bg-muted text-xs"
          >
            {" "}
            <div
              className="flex-1 cursor-pointer"
              onClick={() => onEquipmentSelect?.(eq)}
            >
              {" "}
              <div className="font-medium">{eq.name}</div>{" "}
              <div className="text-muted-foreground">
                {" "}
                {eq.category} {eq.unit_price && ` • $${eq.unit_price}`}{" "}
              </div>{" "}
            </div>{" "}
            <div className="flex gap-1">
              {" "}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => startEdit(eq)}
              >
                {" "}
                <Edit2 className="h-3 w-3" />{" "}
              </Button>{" "}
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => deleteEquipment(eq.id)}
              >
                {" "}
                <Trash2 className="h-3 w-3" />{" "}
              </Button>{" "}
            </div>{" "}
          </div>
        ))}{" "}
      </div>{" "}
      {equipment.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          {" "}
          No equipment yet. Add some to get started.{" "}
        </div>
      )}{" "}
    </div>
  );
}
