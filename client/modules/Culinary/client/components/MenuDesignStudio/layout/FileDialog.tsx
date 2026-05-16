import { useState, useEffect } from "react";
import { Trash2, File, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DesignerState } from "../hooks";

const STORAGE_KEY = "menu-studio-designs";
const STORAGE_INDEX_KEY = "menu-studio-designs-index";

export type SavedDesign = {
  id: string;
  name: string;
  data: DesignerState;
  createdAt: number;
  updatedAt: number;
};

function getSavedDesigns(): SavedDesign[] {
  try {
    const index = localStorage.getItem(STORAGE_INDEX_KEY);
    if (!index) return [];

    const ids: string[] = JSON.parse(index);
    const designs: SavedDesign[] = [];

    for (const id of ids) {
      const data = localStorage.getItem(`${STORAGE_KEY}-${id}`);
      if (data) {
        designs.push(JSON.parse(data));
      }
    }

    return designs.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error("Failed to load designs:", error);
    return [];
  }
}

function saveDesign(design: SavedDesign): void {
  try {
    const id = design.id;
    localStorage.setItem(`${STORAGE_KEY}-${id}`, JSON.stringify(design));

    // Update index
    const index = localStorage.getItem(STORAGE_INDEX_KEY);
    let ids: string[] = index ? JSON.parse(index) : [];
    if (!ids.includes(id)) {
      ids.push(id);
    }
    localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(ids));
  } catch (error) {
    console.error("Failed to save design:", error);
  }
}

function deleteDesign(id: string): void {
  try {
    localStorage.removeItem(`${STORAGE_KEY}-${id}`);

    // Update index
    const index = localStorage.getItem(STORAGE_INDEX_KEY);
    if (index) {
      const ids: string[] = JSON.parse(index).filter((i: string) => i !== id);
      localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(ids));
    }
  } catch (error) {
    console.error("Failed to delete design:", error);
  }
}

interface FileDialogProps {
  mode: "open" | "save";
  currentDesign?: DesignerState;
  onSelect: (design: DesignerState) => void;
  onSave?: (name: string) => void;
  children?: React.ReactNode;
}

export function FileDialog({ mode, currentDesign, onSelect, onSave, children }: FileDialogProps) {
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [saveName, setSaveName] = useState(currentDesign?.documentName || "");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setDesigns(getSavedDesigns());
  }, []);

  const handleSave = () => {
    if (!saveName.trim() || !currentDesign) return;

    const designId = `design-${Date.now()}`;
    const designToSave: SavedDesign = {
      id: designId,
      name: saveName.trim(),
      data: currentDesign,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    saveDesign(designToSave);
    setDesigns(getSavedDesigns());
    onSave?.(saveName.trim());
    setIsOpen(false);
  };

  const handleOpen = (design: SavedDesign) => {
    onSelect(design.data);
    setIsOpen(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this design?")) {
      deleteDesign(id);
      setDesigns(getSavedDesigns());
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || <Button variant="outline" size="sm">{mode === "open" ? "Open" : "Save As"}</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "open" ? "Open Design" : "Save Design As"}</DialogTitle>
          <DialogDescription>
            {mode === "open"
              ? "Choose a previously saved design to open."
              : "Save your current design with a new name."}
          </DialogDescription>
        </DialogHeader>

        {mode === "save" ? (
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="design-name" className="text-sm font-medium">
                Design Name
              </Label>
              <Input
                id="design-name"
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="My Menu Design"
                className="mt-1.5"
              />
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!saveName.trim()}
                className="bg-[#c8a97e] hover:bg-[#b8976c]"
              >
                Save Design
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {designs.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No saved designs yet</p>
              </div>
            ) : (
              <ScrollArea className="h-96 w-full border rounded-md">
                <div className="p-4 space-y-2">
                  {designs.map((design) => (
                    <div
                      key={design.id}
                      onClick={() => handleOpen(design)}
                      className="p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{design.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <Clock className="h-3 w-3" />
                            <span>Updated: {formatDate(design.updatedAt)}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDelete(design.id, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
