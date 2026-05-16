/** * Optimized Inventory Page * Reduces clicks from 3-4 to 1-2 clicks * Features: Inline editing, bulk actions, quick filters */ import React, {
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  AlertTriangle,
  Plus,
  ArrowRightLeft,
  FileText,
  CheckSquare,
  Square,
} from "lucide-react";
import { useTheme } from "../components/ThemeProvider";
import { InlineEditor } from "../components/InlineEditor";
import {
  BulkActionToolbar,
  SelectAllCheckbox,
  useBulkActions,
} from "../components/BulkActionToolbar";
import {
  QuickActionMenu,
  useQuickActions,
} from "../components/QuickActionMenu";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
interface InventoryItem {
  id: string;
  wineName: string;
  producer: string;
  region: string;
  vintage: number;
  quantity: number;
  reorderLevel: number;
  costPerBottle: number;
  retailPrice: number;
  location: string;
  lastInventory: string;
}
const mockInventory: InventoryItem[] = [
  {
    id: "1",
    wineName: "Château Margaux",
    producer: "Château Margaux",
    region: "Bordeaux",
    vintage: 2015,
    quantity: 12,
    reorderLevel: 6,
    costPerBottle: 180,
    retailPrice: 350,
    location: "A-1-3",
    lastInventory: "2024-01-15",
  },
  {
    id: "2",
    wineName: "Chablis William Fèvre",
    producer: "William Fèvre",
    region: "Burgundy",
    vintage: 2022,
    quantity: 3,
    reorderLevel: 12,
    costPerBottle: 22,
    retailPrice: 48,
    location: "B-2-1",
    lastInventory: "2024-01-18",
  },
  {
    id: "3",
    wineName: "Barolo Luciano Sandrone",
    producer: "Luciano Sandrone",
    region: "Piedmont",
    vintage: 2018,
    quantity: 8,
    reorderLevel: 8,
    costPerBottle: 95,
    retailPrice: 185,
    location: "A-3-2",
    lastInventory: "2024-01-16",
  },
];
export const InventoryOptimized: React.FC = () => {
  const { t } = useI18n();
  const { theme, isDark } = useTheme();
  const navigate = useNavigate();
  const { inventoryActions } = useQuickActions();
  const { inventoryBulkActions } = useBulkActions();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [inventory, setInventory] = useState<InventoryItem[]>(mockInventory);
  const filteredInventory = inventory.filter(
    (item) =>
      item.wineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.producer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.region.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const lowStockItems = inventory.filter(
    (item) => item.quantity <= item.reorderLevel,
  );
  const handleSelectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const handleSelectAll = () => {
    setSelectedIds(new Set(filteredInventory.map((item) => item.id)));
  };
  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };
  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item,
      ),
    ); // API call would go here }; const bulkActions = inventoryBulkActions().map((action) => ({ ...action, onClick: (ids: string[]) => { action.onClick(Array.from(ids)); setSelectedIds(new Set()); }, })); return ( <div className="luccca-theme min-h-screen bg-background text-foreground" style={{ padding:"2rem" }} > <div style={{ maxWidth:"1400px", margin:"0 auto" }}> {/* Header with Quick Actions */} <div className="flex items-center justify-between mb-6"> <div> <h1 className="text-4xl font-bold mb-2" style={{ color: theme.colors.foreground }}> {t("Inventory") ||"Inventory"} </h1> <p className="text-muted-foreground"> {t("Manage stock levels and locations") ||"Manage stock levels and locations"} </p> </div> <div className="flex gap-3"> <button onClick={() => navigate("/purchase-orders?new=true")} className="px-4 py-2 bg-accent text-background rounded-lg font-medium hover:bg-accent/90 transition-colors flex items-center gap-2" > <FileText className="w-4 h-4" /> {t("Create PO") ||"Create PO"} </button> <button onClick={() => navigate("/transfers?new=true")} className="px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-colors flex items-center gap-2" > <ArrowRightLeft className="w-4 h-4" /> {t("Transfer") ||"Transfer"} </button> </div> </div> {/* Low Stock Alert - ONE CLICK TO CREATE PO */} {lowStockItems.length > 0 && ( <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center justify-between" > <div className="flex items-center gap-3"> <AlertTriangle className="w-5 h-5 text-yellow-500" /> <div> <div className="font-medium text-foreground"> {lowStockItems.length} {t("items below reorder level") ||"items below reorder level"} </div> <div className="text-sm text-muted-foreground"> {t("Click to create purchase order") ||"Click to create purchase order"} </div> </div> </div> <button onClick={() => navigate(`/purchase-orders?bulk=${lowStockItems.map(i => i.id).join(",")}`)} className="px-4 py-2 bg-accent text-background rounded-lg font-medium hover:bg-accent/90 transition-colors" > {t("Create PO") ||"Create PO"} </button> </div> )} {/* Search Bar */} <div className="mb-4"> <input type="text" placeholder={t("Search inventory...") ||"Search inventory..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent" /> </div> {/* Inventory Table with Inline Editing */} <div className="luccca-theme glass border border-border rounded-xl overflow-hidden"> <div className="overflow-x-auto"> <table className="w-full"> <thead className="bg-muted/50"> <tr> <th className="p-3 text-left"> <SelectAllCheckbox selectedCount={selectedIds.size} totalCount={filteredInventory.length} onSelectAll={handleSelectAll} onDeselectAll={handleDeselectAll} /> </th> <th className="p-3 text-left text-sm font-semibold">{t("Wine") ||"Wine"}</th> <th className="p-3 text-left text-sm font-semibold">{t("Producer") ||"Producer"}</th> <th className="p-3 text-left text-sm font-semibold">{t("Vintage") ||"Vintage"}</th> <th className="p-3 text-center text-sm font-semibold">{t("Quantity") ||"Quantity"}</th> <th className="p-3 text-center text-sm font-semibold">{t("Reorder") ||"Reorder"}</th> <th className="p-3 text-right text-sm font-semibold">{t("Cost") ||"Cost"}</th> <th className="p-3 text-center text-sm font-semibold">{t("Location") ||"Location"}</th> <th className="p-3 text-center text-sm font-semibold">{t("Actions") ||"Actions"}</th> </tr> </thead> <tbody> {filteredInventory.map((item) => ( <tr key={item.id} className={cn("border-t border-border hover:bg-muted/30 transition-colors", selectedIds.has(item.id) &&"bg-accent/5" )} > <td className="p-3"> <button onClick={() => handleSelectItem(item.id)} className="p-1 hover:bg-muted rounded" > {selectedIds.has(item.id) ? ( <CheckSquare className="w-5 h-5 text-accent" /> ) : ( <Square className="w-5 h-5 text-muted-foreground" /> )} </button> </td> <td className="p-3 font-medium">{item.wineName}</td> <td className="p-3 text-muted-foreground">{item.producer}</td> <td className="p-3 text-muted-foreground">{item.vintage}</td> <td className="p-3 text-center"> <InlineEditor value={item.quantity} onSave={(value) => handleUpdateQuantity(item.id, Number(value))} type="number" min={0} className="justify-center" /> </td> <td className="p-3 text-center text-muted-foreground"> {item.reorderLevel} </td> <td className="p-3 text-right text-muted-foreground"> ${item.costPerBottle} </td> <td className="p-3 text-center text-muted-foreground"> {item.location} </td> <td className="p-3"> <QuickActionMenu actions={inventoryActions(item.id, item.wineName)} trigger="click" > <button className="p-1.5 hover:bg-muted rounded"> <Package className="w-4 h-4 text-muted-foreground" /> </button> </QuickActionMenu> </td> </tr> ))} </tbody> </table> </div> </div> {/* Bulk Action Toolbar */} <BulkActionToolbar selectedIds={Array.from(selectedIds)} onClearSelection={handleDeselectAll} actions={bulkActions} totalItems={filteredInventory.length} /> </div> </div> );
  };
};
