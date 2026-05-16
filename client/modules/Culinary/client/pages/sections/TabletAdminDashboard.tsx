import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3,
  Plus,
  Edit2,
  Trash2,
  Download,
  Filter,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { TabletNav } from "@/components/TabletNav";
import {
  RecipeAccessManagement,
  type RecipeAccess,
} from "@/components/RecipeAccessManagement";

interface TabletDevice {
  id: string;
  device_id: string;
  device_name: string;
  credential_mode: "none" | "camera" | "employee_id" | "disabled";
  include_chef_name: boolean;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface QRCodeData {
  device_id: string;
  device_name: string;
  device_token: string;
  pairing_url: string;
  qr_code_url: string;
  setup_instructions: string;
}

interface PrintRecord {
  id: string;
  device_id: string;
  device_name: string;
  recipe_id: string;
  recipe_name: string;
  born_on: string;
  expires_on: string;
  total_portions: string;
  allergens: string[];
  employee_id: string;
  chef_name: string;
  printed_at: string;
  print_date: string;
}

export default function TabletAdminDashboard() {
  const { toast } = useToast();

  const [devices, setDevices] = useState<TabletDevice[]>([]);
  const [printHistory, setPrintHistory] = useState<PrintRecord[]>([]);
  const [recipes, setRecipes] = useState<RecipeAccess[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewDevice, setShowNewDevice] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isCreatingDevice, setIsCreatingDevice] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<QRCodeData | null>(null);
  const [filters, setFilters] = useState({
    deviceId: "",
    startDate: "",
    endDate: "",
  });
  const [newDevice, setNewDevice] = useState({
    deviceName: "",
    credentialMode: "none" as const,
    includeChefName: false,
  });

  useEffect(() => {
    loadDevices();
    loadPrintHistory();
  }, []);

  const loadDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/tablet/device/list");
      if (!response.ok) throw new Error("Failed to load devices");

      const data = await response.json();
      setDevices(data.devices || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load devices",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const loadPrintHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filters.deviceId) params.append("deviceId", filters.deviceId);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const response = await fetch(`/api/tablet/compliance-report?${params}`);
      if (!response.ok) throw new Error("Failed to load print history");

      const data = await response.json();
      setPrintHistory(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load print history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, toast]);

  const handleCreateDevice = async () => {
    if (!newDevice.deviceName.trim()) {
      toast({
        title: "Validation",
        description: "Please enter a device name",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreatingDevice(true);
      const response = await fetch("/api/tablet/device/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceName: newDevice.deviceName,
          credentialMode: newDevice.credentialMode,
          includeChefName: newDevice.includeChefName,
        }),
      });

      if (!response.ok) throw new Error("Failed to create device");

      const data = await response.json();
      setQrCodeData(data.pairing);

      toast({
        title: "Success",
        description: `Device created: ${data.device.device_name}`,
      });

      await loadDevices();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create device",
        variant: "destructive",
      });
    } finally {
      setIsCreatingDevice(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    });
  };

  const downloadQRCode = async (qrUrl: string, deviceName: string) => {
    try {
      const response = await fetch(qrUrl);
      if (!response.ok) throw new Error("Failed to fetch QR code");

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `tablet-setup-${deviceName}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(blobUrl);

      toast({
        title: "Downloaded",
        description: `QR code downloaded for ${deviceName}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download QR code",
        variant: "destructive",
      });
    }
  };

  const downloadReport = () => {
    const csv = [
      "Device,Recipe,Portions,Employee,Date",
      ...printHistory.map(
        (r) =>
          `"${r.device_name}","${r.recipe_name}","${r.total_portions}","${r.employee_id}","${r.printed_at}"`,
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tablet-compliance-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const confirmRecipeAccuracy = async (recipeId: string) => {
    try {
      const response = await fetch(`/api/tablet/recipes/${recipeId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmed_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error("Failed to confirm recipe");

      toast({
        title: "Success",
        description: "Recipe confirmed as accurate",
      });

      setRecipes((prev) =>
        prev.map((r) =>
          r.recipe_id === recipeId
            ? { ...r, confirmed_at: new Date().toISOString() }
            : r,
        ),
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to confirm recipe",
        variant: "destructive",
      });
    }
  };

  const toggleRecipeAccess = async (recipeId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/tablet/recipes/${recipeId}/access`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_active: !isActive,
        }),
      });

      if (!response.ok) throw new Error("Failed to update recipe access");

      toast({
        title: "Success",
        description: `Recipe access ${!isActive ? "enabled" : "disabled"}`,
      });

      setRecipes((prev) =>
        prev.map((r) =>
          r.recipe_id === recipeId ? { ...r, is_active: !isActive } : r,
        ),
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update recipe access",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full h-screen bg-slate-50 dark:bg-slate-950 flex flex-row">
      <div className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800">
        <TabletNav />
      </div>

      <div className="flex-1 flex flex-col overflow-auto">
        <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div className="px-8 py-6 flex justify-between items-start gap-8">
            <div className="flex-1">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-50 dark:via-slate-100 dark:to-slate-50 bg-clip-text text-transparent">
                Tablet Admin
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Manage kitchen tablet devices and compliance settings
              </p>
            </div>
            <Button
              onClick={() => setShowNewDevice(true)}
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Device
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-8 py-8 space-y-8">
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                Connected Devices
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                {devices.length > 0
                  ? `${devices.length} tablet device${devices.length !== 1 ? "s" : ""} configured`
                  : "No devices yet. Create one to get started."}
              </p>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400" />
              </div>
            ) : devices.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full mb-6">
                  <AlertCircle className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  No devices configured yet
                </p>
                <p className="text-slate-600 dark:text-slate-400 mt-2 mb-6">
                  Create your first tablet device to enable kitchen tablet access
                </p>
                <Button
                  onClick={() => setShowNewDevice(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Device
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {devices.map((device) => (
                  <div
                    key={device.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 hover:shadow-lg dark:hover:shadow-slate-900/50 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50">
                          {device.device_name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                          {device.device_id}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {device.enabled ? (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                        ) : (
                          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
                      <div className="text-sm">
                        <span className="text-slate-600 dark:text-slate-400">
                          Credential Mode:{" "}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-50 capitalize">
                          {device.credential_mode === "none"
                            ? "Open Access"
                            : device.credential_mode.replace("_", " ")}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-slate-600 dark:text-slate-400">
                          Chef Name:{" "}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-50">
                          {device.include_chef_name ? "Included" : "Not Included"}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-slate-600 dark:text-slate-400">
                          Created:{" "}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-50">
                          {format(new Date(device.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                Recipe Access Management
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                Control which recipes are available on tablets
              </p>
            </div>
            <RecipeAccessManagement
              recipes={recipes}
              onConfirm={async (recipeId) => {
                await confirmRecipeAccuracy(recipeId);
              }}
              onToggleAccess={async (recipeId, isActive) => {
                await toggleRecipeAccess(recipeId, isActive);
              }}
            />
          </section>

          <section>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                  Compliance Report
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">
                  Track all label prints and kitchen tablet activity
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadReport}
                  disabled={printHistory.length === 0}
                  className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {showFilters && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="Device ID"
                  value={filters.deviceId}
                  onChange={(e) =>
                    setFilters({ ...filters, deviceId: e.target.value })
                  }
                  className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50"
                />
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters({ ...filters, startDate: e.target.value })
                  }
                  className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50"
                />
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    setFilters({ ...filters, endDate: e.target.value })
                  }
                  className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50"
                />
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400" />
              </div>
            ) : printHistory.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
                <BarChart3 className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">
                  No print history available
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Device
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Recipe
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Portions
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Employee
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Allergens
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {printHistory.map((record) => (
                      <tr
                        key={record.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-50">
                          {record.device_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-50">
                          {record.recipe_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {record.total_portions}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {record.employee_id || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                          {format(new Date(record.printed_at), "MMM d, HH:mm")}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {record.allergens && record.allergens.length > 0 ? (
                            <span className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-2 py-1 rounded text-xs font-medium">
                              {record.allergens.join(", ")}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <Dialog open={showNewDevice} onOpenChange={setShowNewDevice}>
          <DialogContent className="sm:max-w-2xl dark:bg-slate-900 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-slate-50">
                {qrCodeData
                  ? "Device Created - Setup QR Code"
                  : "Create New Tablet Device"}
              </DialogTitle>
              <DialogDescription className="dark:text-slate-400">
                {qrCodeData
                  ? "Scan this QR code on the new tablet to automatically configure it"
                  : "Set up a new kitchen tablet for recipe access and label printing"}
              </DialogDescription>
            </DialogHeader>

            {qrCodeData ? (
              <div className="space-y-6 py-4">
                <div className="flex flex-col items-center space-y-4">
                  <img
                    src={qrCodeData.qr_code_url}
                    alt="Device Setup QR Code"
                    className="w-64 h-64 border-4 border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                  <p className="text-center text-sm text-slate-600 dark:text-slate-400 max-w-sm">
                    {qrCodeData.setup_instructions}
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-3">
                  <div className="text-sm">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Device Name
                    </label>
                    <p className="text-slate-900 dark:text-slate-50 font-mono text-sm p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                      {qrCodeData.device_name}
                    </p>
                  </div>

                  <div className="text-sm">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Pairing URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={qrCodeData.pairing_url}
                        readOnly
                        className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 rounded text-xs font-mono text-slate-600 dark:text-slate-400"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(qrCodeData.pairing_url, "URL")
                        }
                        className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() =>
                      downloadQRCode(
                        qrCodeData.qr_code_url,
                        qrCodeData.device_name,
                      )
                    }
                    className="flex-1 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download QR Code
                  </Button>
                  <Button
                    onClick={() => {
                      setShowNewDevice(false);
                      setQrCodeData(null);
                      setNewDevice({
                        deviceName: "",
                        credentialMode: "none",
                        includeChefName: false,
                      });
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white"
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Device Name
                  </label>
                  <Input
                    placeholder="e.g., Kitchen-Station-1"
                    value={newDevice.deviceName}
                    onChange={(e) =>
                      setNewDevice({ ...newDevice, deviceName: e.target.value })
                    }
                    className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Credential Mode
                  </label>
                  <Select
                    value={newDevice.credentialMode}
                    onValueChange={(value: any) =>
                      setNewDevice({ ...newDevice, credentialMode: value })
                    }
                  >
                    <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                      <SelectItem value="none">No Credentials</SelectItem>
                      <SelectItem value="camera">Camera/Photo</SelectItem>
                      <SelectItem value="employee_id">Employee ID</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newDevice.includeChefName}
                    onChange={(e) =>
                      setNewDevice({
                        ...newDevice,
                        includeChefName: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Include chef name in QR code
                  </span>
                </label>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowNewDevice(false)}
                    className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateDevice}
                    disabled={isCreatingDevice}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white"
                  >
                    {isCreatingDevice ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Device"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
