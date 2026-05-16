import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DollarSign, Settings, Save } from "lucide-react";

export interface AdminSettings {
  basePrice: number;
  pricePerServing: number;
  depositPercent: number;
  deliveryFee: number;
  rushFee: number;
  customShapeSurcharge: number;
  enableBEOTracking: boolean;
  enableDeposit: boolean;
  defaultPaymentTerms: string;
  currencySymbol: string;
  resortBillingEnabled: boolean;
  notes: string;
}

const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  basePrice: 150,
  pricePerServing: 3.5,
  depositPercent: 50,
  deliveryFee: 50,
  rushFee: 100,
  customShapeSurcharge: 75,
  enableBEOTracking: true,
  enableDeposit: true,
  defaultPaymentTerms: "50% deposit, balance due 7 days before event",
  currencySymbol: "$",
  resortBillingEnabled: false,
  notes: "",
};

const ADMIN_STORAGE_KEY = "cake_studio_admin_settings";

interface AdminPanelProps {
  onSettingsChange?: (settings: AdminSettings) => void;
  eventData?: {
    beoNumber?: string;
    reoNumber?: string;
    billedToRoom?: boolean;
    roomNumber?: string;
  };
}

export default function AdminPanel({
  onSettingsChange,
  eventData,
}: AdminPanelProps) {
  const [settings, setSettings] = useState<AdminSettings>(
    DEFAULT_ADMIN_SETTINGS,
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [eventDetails, setEventDetails] = useState(eventData || {});
  const [saved, setSaved] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AdminSettings;
        setSettings(parsed);
      } catch {
        // Use defaults
      }
    }
  }, []);

  const handleSettingChange = <K extends keyof AdminSettings>(
    key: K,
    value: any,
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleEventDetailChange = <K extends keyof typeof eventDetails>(
    key: K,
    value: any,
  ) => {
    setEventDetails((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(settings));
    onSettingsChange?.(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const calculateDeposit = (totalPrice: number) => {
    return Math.round((totalPrice * settings.depositPercent) / 100);
  };

  const calculateSample = (guestCount: number) => {
    const perServingCost = guestCount * settings.pricePerServing;
    const total = settings.basePrice + perServingCost;
    const deposit = calculateDeposit(total);
    const balance = total - deposit;
    return { total, deposit, balance };
  };

  const sample50 = calculateSample(50);
  const sample100 = calculateSample(100);
  const sample150 = calculateSample(150);

  return (
    <div className="space-y-4">
      <Card className="border-gray-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              <CardTitle className="text-xl">⚙️ Admin Settings</CardTitle>
            </div>
            <Button
              onClick={handleSave}
              size="sm"
              className="bg-white text-purple-600 hover:bg-gray-100"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {saved && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
              ✓ Settings saved successfully
            </div>
          )}

          {/* Pricing Section */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Pricing Structure
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Base Price {settings.currencySymbol}
                </label>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  value={settings.basePrice}
                  onChange={(e) =>
                    handleSettingChange("basePrice", Number(e.target.value))
                  }
                  className="border-gray-300"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum charge for any cake
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Price Per Serving {settings.currencySymbol}
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.25"
                  value={settings.pricePerServing}
                  onChange={(e) =>
                    handleSettingChange(
                      "pricePerServing",
                      Number(e.target.value),
                    )
                  }
                  className="border-gray-300"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Additional cost per guest
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Delivery Fee {settings.currencySymbol}
                </label>
                <Input
                  type="number"
                  min="0"
                  step="5"
                  value={settings.deliveryFee}
                  onChange={(e) =>
                    handleSettingChange("deliveryFee", Number(e.target.value))
                  }
                  className="border-gray-300"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Rush Order Fee {settings.currencySymbol}
                </label>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  value={settings.rushFee}
                  onChange={(e) =>
                    handleSettingChange("rushFee", Number(e.target.value))
                  }
                  className="border-gray-300"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Custom Shape Surcharge {settings.currencySymbol}
                </label>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  value={settings.customShapeSurcharge}
                  onChange={(e) =>
                    handleSettingChange(
                      "customShapeSurcharge",
                      Number(e.target.value),
                    )
                  }
                  className="border-gray-300"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Deposit Percentage %
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="5"
                  value={settings.depositPercent}
                  onChange={(e) =>
                    handleSettingChange(
                      "depositPercent",
                      Number(e.target.value),
                    )
                  }
                  className="border-gray-300"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Required upfront deposit
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Examples */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-gray-900 mb-3">
              Pricing Examples
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {[
                { guests: 50, sample: sample50 },
                { guests: 100, sample: sample100 },
                { guests: 150, sample: sample150 },
              ].map((item) => (
                <div
                  key={item.guests}
                  className="bg-white p-3 rounded border border-blue-200"
                >
                  <p className="font-semibold text-gray-900 mb-2">
                    {item.guests} Guests
                  </p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-semibold text-gray-900">
                        {settings.currencySymbol}
                        {item.sample.total.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Deposit ({settings.depositPercent}%):
                      </span>
                      <span className="font-semibold text-cyan-600">
                        {settings.currencySymbol}
                        {item.sample.deposit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Balance:</span>
                      <span className="font-semibold text-gray-900">
                        {settings.currencySymbol}
                        {item.sample.balance}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment & Event Management */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">
              Payment & Event Management
            </h4>

            <div className="flex items-center gap-3">
              <Checkbox
                checked={settings.enableDeposit}
                onCheckedChange={(checked) =>
                  handleSettingChange("enableDeposit", checked)
                }
                id="enableDeposit"
              />
              <label
                htmlFor="enableDeposit"
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                Require Deposit
              </label>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Default Payment Terms
              </label>
              <Input
                value={settings.defaultPaymentTerms}
                onChange={(e) =>
                  handleSettingChange("defaultPaymentTerms", e.target.value)
                }
                placeholder="e.g., 50% deposit, balance due 7 days before event"
                className="border-gray-300"
              />
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                checked={settings.enableBEOTracking}
                onCheckedChange={(checked) =>
                  handleSettingChange("enableBEOTracking", checked)
                }
                id="enableBEO"
              />
              <label
                htmlFor="enableBEO"
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                Enable BEO/REO Number Tracking (for events)
              </label>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                checked={settings.resortBillingEnabled}
                onCheckedChange={(checked) =>
                  handleSettingChange("resortBillingEnabled", checked)
                }
                id="resortBilling"
              />
              <label
                htmlFor="resortBilling"
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                Enable Resort/Hotel Billing (bill to room)
              </label>
            </div>
          </div>

          {/* Event Details Section */}
          {(settings.enableBEOTracking || settings.resortBillingEnabled) && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-semibold text-gray-900">📋 Event Details</h4>

              {settings.enableBEOTracking && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      BEO Number
                    </label>
                    <Input
                      value={eventDetails.beoNumber || ""}
                      onChange={(e) =>
                        handleEventDetailChange("beoNumber", e.target.value)
                      }
                      placeholder="e.g., BEO-2024-001"
                      className="border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      REO Number
                    </label>
                    <Input
                      value={eventDetails.reoNumber || ""}
                      onChange={(e) =>
                        handleEventDetailChange("reoNumber", e.target.value)
                      }
                      placeholder="e.g., REO-001"
                      className="border-gray-300"
                    />
                  </div>
                </div>
              )}

              {settings.resortBillingEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={eventDetails.billedToRoom || false}
                      onCheckedChange={(checked) =>
                        handleEventDetailChange("billedToRoom", checked)
                      }
                      id="billedToRoom"
                    />
                    <label
                      htmlFor="billedToRoom"
                      className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      Bill to Guest Room
                    </label>
                  </div>

                  {eventDetails.billedToRoom && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">
                        Room Number
                      </label>
                      <Input
                        value={eventDetails.roomNumber || ""}
                        onChange={(e) =>
                          handleEventDetailChange("roomNumber", e.target.value)
                        }
                        placeholder="Room #"
                        className="border-gray-300"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Additional Notes */}
          <div className="space-y-2 border-t pt-4">
            <label className="text-sm font-medium text-gray-700 block">
              Internal Notes
            </label>
            <textarea
              value={settings.notes}
              onChange={(e) => handleSettingChange("notes", e.target.value)}
              placeholder="Add any additional notes for staff..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm"
            />
          </div>

          {/* Advanced Settings */}
          <div className="border-t pt-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              {showAdvanced ? "▼" : "▶"} Advanced Settings
            </button>

            {showAdvanced && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Currency Symbol
                  </label>
                  <select
                    value={settings.currencySymbol}
                    onChange={(e) =>
                      handleSettingChange("currencySymbol", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg p-2.5"
                  >
                    <option value="$">USD ($)</option>
                    <option value="€">EUR (€)</option>
                    <option value="£">GBP (£)</option>
                    <option value="¥">JPY (¥)</option>
                    <option value="C$">CAD (C$)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function loadAdminSettings(): AdminSettings {
  const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as AdminSettings;
    } catch {
      return DEFAULT_ADMIN_SETTINGS;
    }
  }
  return DEFAULT_ADMIN_SETTINGS;
}
