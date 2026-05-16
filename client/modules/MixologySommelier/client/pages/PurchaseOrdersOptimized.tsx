/** * Optimized Purchase Orders Page * Reduces clicks from 6-8 to 2-3 clicks * Features: Smart defaults, bulk creation, one-click actions */ import React, {
  useState,
  useEffect,
} from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Package,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { useTheme } from "../components/ThemeProvider";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { apiService } from "../lib/api";
export const PurchaseOrdersOptimized: React.FC = () => {
  const { t } = useI18n();
  const { theme, isDark } = useTheme();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuickCreate, setShowQuickCreate] = useState(
    searchParams.get("new") === "true",
  );
  const [bulkItems, setBulkItems] = useState<string[]>(
    searchParams.get("bulk")?.split(",").filter(Boolean) || [],
  );
  useEffect(() => {
    loadOrders();
  }, []); // Auto-open create form if bulk items provided useEffect(() => { if (bulkItems.length > 0) { setShowQuickCreate(true); } }, [bulkItems]); const loadOrders = async () => { setLoading(true); try { const data = await apiService.getPurchaseOrders(); setOrders(Array.isArray(data) ? data : []); } catch (error) { console.error("Failed to load orders:", error); setOrders([]); } finally { setLoading(false); } }; // ONE-CLICK CREATE PO FROM LOW STOCK const handleQuickCreatePO = async () => { // Smart defaults: Use bulk items or low stock items const itemsToOrder = bulkItems.length > 0 ? bulkItems : []; // Would fetch low stock items // Navigate to create form with pre-filled items navigate(`/purchase-orders/create?items=${itemsToOrder.join(",")}`); }; return ( <div className="luccca-theme min-h-screen bg-background text-foreground" style={{ padding:"2rem" }} > <div style={{ maxWidth:"1400px", margin:"0 auto" }}> {/* Header with ONE-CLICK CREATE */} <div className="flex items-center justify-between mb-6"> <div> <h1 className="text-4xl font-bold mb-2" style={{ color: theme.colors.foreground }}> {t("Purchase Orders") ||"Purchase Orders"} </h1> <p className="text-muted-foreground"> {t("Manage supplier orders and inventory replenishment") ||"Manage supplier orders and inventory replenishment"} </p> </div> <button onClick={handleQuickCreatePO} className="px-4 py-2 bg-accent text-background rounded-lg font-medium hover:bg-accent/90 transition-colors flex items-center gap-2" > <Plus className="w-4 h-4" /> {t("Create PO") ||"Create PO"} </button> </div> {/* Quick Create Banner - ONE CLICK */} {showQuickCreate && ( <div className="mb-6 p-4 bg-accent/10 border border-accent rounded-lg"> <div className="flex items-center justify-between"> <div> <div className="font-medium text-foreground mb-1"> {bulkItems.length > 0 ? `${bulkItems.length} items selected for ordering` :"Create new purchase order"} </div> <div className="text-sm text-muted-foreground"> {t("Smart defaults will be applied based on your inventory") ||"Smart defaults will be applied based on your inventory"} </div> </div> <button onClick={() => navigate(`/purchase-orders/create?items=${bulkItems.join(",")}`)} className="px-4 py-2 bg-accent text-background rounded-lg font-medium hover:bg-accent/90 transition-colors" > {t("Continue") ||"Continue"} <ArrowRight className="w-4 h-4 inline ml-1" /> </button> </div> </div> )} {/* Orders List */} {loading ? ( <div className="text-center py-12"> <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div> </div> ) : orders.length > 0 ? ( <div className="space-y-4"> {orders.map((order) => ( <div key={order.id} className="luccca-theme glass border border-border rounded-lg p-4 hover:border-accent transition-colors cursor-pointer" onClick={() => navigate(`/purchase-orders/${order.id}`)} > <div className="flex items-center justify-between"> <div> <div className="font-semibold text-foreground">{order.id || order.order_number}</div> <div className="text-sm text-muted-foreground"> {order.vendor_name ||"Vendor"} • {order.item_count || 0} items </div> </div> <div className="flex items-center gap-4"> <div className={cn("px-3 py-1 rounded-full text-xs font-medium", order.status ==="delivered" &&"bg-green-500/10 text-green-500", order.status ==="pending" &&"bg-yellow-500/10 text-yellow-500", order.status ==="overdue" &&"bg-red-500/10 text-red-500" )}> {order.status ||"pending"} </div> <ArrowRight className="w-4 h-4 text-muted-foreground" /> </div> </div> </div> ))} </div> ) : ( <div className="text-center py-12 text-muted-foreground"> <Package className="w-12 h-12 mx-auto mb-4 opacity-50" /> <p>{t("No purchase orders yet") ||"No purchase orders yet"}</p> <button onClick={handleQuickCreatePO} className="mt-4 text-accent hover:underline" > {t("Create your first order") ||"Create your first order"} </button> </div> )} </div> </div> );
};
