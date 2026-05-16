import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Search, Loader2, Check, ArrowRight } from "lucide-react";
import FoodRecallNotificationOverlay from "@/components/FoodRecallNotificationOverlay";
import { TabletNav } from "@/components/TabletNav";

interface TransferEntry {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  fromDepartment: string;
  toDepartment: string;
  requestedBy: string;
  notes?: string;
  timestamp: number;
  status: "pending" | "completed" | "cancelled";
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  item_type: string;
  unit: string;
}

const DEPARTMENTS = [
  "Kitchen",
  "Prep",
  "Pastry",
  "Bakery",
  "Sous Vide",
  "Beverage",
  "Sauce Station",
  "Grill",
  "Fryer",
  "Pantry",
  "Storage",
  "Dining",
  "Banquet",
];

// Default outlet - this would be set during Onboarding Setup of the LUCCCA Ecosystem
const DEFAULT_OUTLET = "Kitchen";

export default function TabletInventoryTransfer() {
  const { toast } = useToast();
  const [transfers, setTransfers] = useState<TransferEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deviceId] = useState(
    () => localStorage.getItem("tablet:deviceToken") || "unknown-device",
  );

  // Form state
  const [itemSearch, setItemSearch] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("lb");
  const [fromDept, setFromDept] = useState(DEFAULT_OUTLET);
  const [toDept, setToDept] = useState("Prep");
  const [requestedBy, setRequestedBy] = useState("");
  const [notes, setNotes] = useState("");

  // Autocomplete state
  const [suggestedItems, setSuggestedItems] = useState<InventoryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Listen for online/offline changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch suggestions when searching
  const searchItems = useCallback(async (search: string) => {
    if (!search.trim()) {
      setSuggestedItems([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/inventory/items?q=${encodeURIComponent(search)}`,
      );
      if (response.ok) {
        const items = await response.json();
        setSuggestedItems(items.slice(0, 10));
      }
    } catch (error) {
      console.error("Failed to search items:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (itemSearch.trim()) {
        searchItems(itemSearch);
        setShowSuggestions(true);
      } else {
        setSuggestedItems([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [itemSearch, searchItems]);

  const handleSelectItem = (item: InventoryItem) => {
    setItemSearch(item.name);
    setUnit(item.unit);
    setSuggestedItems([]);
    setShowSuggestions(false);
  };

  const resetForm = () => {
    setItemSearch("");
    setQuantity("");
    setUnit("lb");
    setFromDept(DEFAULT_OUTLET);
    setToDept("Prep");
    setRequestedBy("");
    setNotes("");
  };

  const handleAddTransfer = useCallback(async () => {
    if (!itemSearch.trim() || !quantity || !toDept || !requestedBy) {
      toast({
        title: "Missing Information",
        description:
          "Please fill in item, quantity, destination, and your name",
        variant: "destructive",
      });
      return;
    }

    if (fromDept === toDept) {
      toast({
        title: "Invalid Transfer",
        description: "Source and destination cannot be the same",
        variant: "destructive",
      });
      return;
    }

    const newTransfer: TransferEntry = {
      id: `transfer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      itemName: itemSearch,
      quantity: parseFloat(quantity),
      unit,
      fromDepartment: fromDept,
      toDepartment: toDept,
      requestedBy,
      notes,
      timestamp: Date.now(),
      status: "pending",
    };

    // Save to local storage for offline support
    const savedTransfers = JSON.parse(
      localStorage.getItem("tablet:transfers") || "[]",
    );
    savedTransfers.push(newTransfer);
    localStorage.setItem("tablet:transfers", JSON.stringify(savedTransfers));

    // If online, try to sync immediately
    if (isOnline) {
      setSubmitting(true);
      try {
        const response = await fetch("/api/inventory/transfers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item_name: newTransfer.itemName,
            quantity: newTransfer.quantity,
            unit: newTransfer.unit,
            from_department: newTransfer.fromDepartment,
            to_department: newTransfer.toDepartment,
            requested_by: newTransfer.requestedBy,
            notes: newTransfer.notes,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save transfer");
        }

        toast({
          title: "Success",
          description: `Transfer to ${toDept} requested`,
        });
      } catch (error) {
        console.error("Failed to sync transfer:", error);
        toast({
          title: "Note",
          description: "Transfer saved locally. Will sync when online.",
        });
      } finally {
        setSubmitting(false);
      }
    } else {
      toast({
        title: "Offline Mode",
        description: "Transfer saved locally. Will sync when back online.",
      });
    }

    setTransfers((prev) => [newTransfer, ...prev]);
    resetForm();
    setShowForm(false);
  }, [
    itemSearch,
    quantity,
    unit,
    fromDept,
    toDept,
    requestedBy,
    notes,
    isOnline,
    toast,
  ]);

  const handleRemoveTransfer = (id: string) => {
    setTransfers((prev) => prev.filter((t) => t.id !== id));
    const savedTransfers = JSON.parse(
      localStorage.getItem("tablet:transfers") || "[]",
    );
    const updated = savedTransfers.filter((t: TransferEntry) => t.id !== id);
    localStorage.setItem("tablet:transfers", JSON.stringify(updated));
  };

  const pendingTransfers = useMemo(
    () => transfers.filter((t) => t.status === "pending"),
    [transfers],
  );
  const completedTransfers = useMemo(
    () => transfers.filter((t) => t.status === "completed"),
    [transfers],
  );

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 flex flex-row overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-64 flex-shrink-0 border-r border-slate-200/50">
        <TabletNav />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <FoodRecallNotificationOverlay deviceId={deviceId} />
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Inventory Transfer
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Inter-department transfers •{" "}
                {isOnline ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                    Online
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                    Offline Mode
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Pending
              </p>
              <p className="text-3xl font-bold text-emerald-600">
                {pendingTransfers.length}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Add Transfer Button */}
          {!showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-5 text-base font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="mr-2 h-5 w-5" />
              New Transfer Request
            </Button>
          )}

          {/* Transfer Form */}
          {showForm && (
            <Card className="bg-white shadow-lg border border-emerald-200">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-emerald-50/50 border-b border-emerald-200">
                <CardTitle className="text-emerald-900">
                  New Transfer Request
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Item Search with Autocomplete */}
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Item Name *
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <Input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search item (e.g., 'avocados', 'chicken stock')..."
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      onFocus={() =>
                        itemSearch.trim() && setShowSuggestions(true)
                      }
                      className="pl-10 bg-white"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-slate-400" />
                    )}
                  </div>

                  {/* Suggestions Dropdown */}
                  {showSuggestions && suggestedItems.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      {suggestedItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleSelectItem(item)}
                          className="w-full text-left px-4 py-2 hover:bg-slate-100 border-b last:border-b-0"
                        >
                          <div className="font-medium text-slate-900">
                            {item.name}
                          </div>
                          <div className="text-xs text-slate-600">
                            {item.category} • {item.unit}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quantity and Unit */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Quantity *
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      step="0.1"
                      className="bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Unit *
                    </label>
                    <Select value={unit} onValueChange={setUnit}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lb">lb</SelectItem>
                        <SelectItem value="oz">oz</SelectItem>
                        <SelectItem value="gallon">gallon</SelectItem>
                        <SelectItem value="quart">quart</SelectItem>
                        <SelectItem value="cup">cup</SelectItem>
                        <SelectItem value="pan">pan</SelectItem>
                        <SelectItem value="batch">batch</SelectItem>
                        <SelectItem value="piece">piece</SelectItem>
                        <SelectItem value="unit">unit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Departments */}
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-50/50 p-4 rounded-lg border border-emerald-200">
                  <label className="block text-sm font-medium text-slate-700 mb-4">
                    Transfer Route *
                  </label>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-emerald-700 mb-2 uppercase tracking-wide">
                        From (Source Outlet)
                      </label>
                      <Select value={fromDept} onValueChange={setFromDept}>
                        <SelectTrigger className="bg-white border-emerald-200 hover:border-emerald-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPARTMENTS.map((dept) => (
                            <SelectItem key={dept} value={dept}>
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-center py-1">
                      <ArrowRight className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-emerald-700 mb-2 uppercase tracking-wide">
                        To (Destination Department)
                      </label>
                      <Select value={toDept} onValueChange={setToDept}>
                        <SelectTrigger className="bg-white border-emerald-200 hover:border-emerald-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPARTMENTS.filter((d) => d !== fromDept).map(
                            (dept) => (
                              <SelectItem key={dept} value={dept}>
                                {dept}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Requested By */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Your Name/Employee ID *
                  </label>
                  <Input
                    type="text"
                    placeholder="Required"
                    value={requestedBy}
                    onChange={(e) => setRequestedBy(e.target.value)}
                    className="bg-white"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notes (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., 'Urgent for plating', 'For special event'..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-white"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-6 border-t border-slate-200">
                  <Button
                    onClick={handleAddTransfer}
                    disabled={submitting}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Requesting...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Submit Request
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    variant="outline"
                    className="flex-1 py-2.5 rounded-lg border-slate-300 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending Transfers */}
          {pendingTransfers.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <div className="w-1 h-6 bg-amber-500 rounded-full"></div>
                Pending Requests ({pendingTransfers.length})
              </h2>
              <div className="space-y-3">
                {pendingTransfers.map((transfer) => (
                  <Card
                    key={transfer.id}
                    className="bg-white shadow-sm hover:shadow-md border border-amber-200/50 transition-all"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900">
                            {transfer.itemName}
                          </h3>
                          <div className="text-sm text-slate-600 mt-3 space-y-1">
                            <p className="font-medium text-amber-700">
                              {transfer.quantity} {transfer.unit}
                            </p>
                            <p className="text-slate-500 text-xs flex items-center gap-2">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                              {transfer.fromDepartment} →{" "}
                              {transfer.toDepartment}
                            </p>
                            <p className="text-slate-500 text-xs">
                              Requested by{" "}
                              <span className="font-medium">
                                {transfer.requestedBy}
                              </span>
                              {transfer.notes && ` • ${transfer.notes}`}
                            </p>
                            <p className="text-slate-400 text-xs pt-1">
                              {new Date(
                                transfer.timestamp,
                              ).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveTransfer(transfer.id)}
                          className="ml-4 text-slate-400 hover:text-red-600 transition-colors"
                          title="Remove transfer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Completed Transfers */}
          {completedTransfers.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                Completed ({completedTransfers.slice(0, 5).length}/
                {completedTransfers.length})
              </h2>
              <div className="space-y-2">
                {completedTransfers.slice(0, 5).map((transfer) => (
                  <Card
                    key={transfer.id}
                    className="bg-green-50/40 border border-green-200/50 hover:shadow-sm transition-all"
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <p className="font-medium text-slate-900">
                            {transfer.itemName}
                          </p>
                          <p className="text-slate-600 text-xs">
                            {transfer.quantity} {transfer.unit}
                          </p>
                        </div>
                        <Check className="h-4 w-4 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {transfers.length === 0 && !showForm && (
            <div className="text-center py-12 text-slate-500">
              <div className="text-4xl mb-3 opacity-30">📦</div>
              <p className="font-medium">No transfer requests yet</p>
              <p className="text-sm text-slate-400 mt-1">
                Create a new transfer request to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
