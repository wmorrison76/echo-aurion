import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AutocompleteInput } from "@/components/AutocompleteInput";
import { Upload, X } from "lucide-react";

export interface DishEditorData {
  dishName: string;
  description?: string;
  menuDescription?: string;
  serverNotes?: string;
  serviceware?: string;
  imageSrc?: string;
}

export interface ServerNotesDishEditorProps {
  initialData?: DishEditorData;
  onSave: (data: DishEditorData) => void;
  onCancel: () => void;
}

export const ServerNotesDishEditor: React.FC<ServerNotesDishEditorProps> = ({
  initialData,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<DishEditorData>(
    initialData || {
      dishName: "",
      description: "",
      menuDescription: "",
      serverNotes: "",
      serviceware: "",
      imageSrc: "",
    }
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setFormData({ ...formData, imageSrc: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dishName.trim()) {
      alert("Dish name is required");
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      {/* Image Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dish Image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.imageSrc ? (
            <div className="relative w-full">
              <img
                src={formData.imageSrc}
                alt="Dish preview"
                className="w-full h-64 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, imageSrc: "" })}
                className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-muted-foreground/50 transition-colors">
              <div className="flex flex-col items-center justify-center">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground mt-2">Click to upload or drag image</span>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          )}
        </CardContent>
      </Card>

      {/* Dish Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dish Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Dish Name *</label>
            <AutocompleteInput
              suggestionType="recipes"
              placeholder="e.g., Chocolate Pistachio Tart"
              value={formData.dishName}
              onChange={(e) => setFormData({ ...formData, dishName: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Brief Description</label>
            <textarea
              placeholder="Short description visible to kitchen staff"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded border border-input px-3 py-2 text-sm resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Menu Description</label>
            <textarea
              placeholder="Description to display on menu for guests"
              value={formData.menuDescription || ""}
              onChange={(e) => setFormData({ ...formData, menuDescription: e.target.value })}
              className="w-full rounded border border-input px-3 py-2 text-sm resize-none"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Server Notes</label>
            <textarea
              placeholder="Service instructions, presentation details, special handling notes"
              value={formData.serverNotes || ""}
              onChange={(e) => setFormData({ ...formData, serverNotes: e.target.value })}
              className="w-full rounded border border-input px-3 py-2 text-sm resize-none font-mono text-xs"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Serviceware</label>
            <input
              type="text"
              placeholder="e.g., Gold-rimmed plate, chilled dessert fork"
              value={formData.serviceware || ""}
              onChange={(e) => setFormData({ ...formData, serviceware: e.target.value })}
              className="w-full rounded border border-input px-3 py-2 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Dish</Button>
      </div>
    </form>
  );
};

export default ServerNotesDishEditor;
