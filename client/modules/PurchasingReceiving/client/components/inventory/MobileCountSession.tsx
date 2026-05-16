import React, { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Plus, Trash2, Send, Mic } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VoiceCaptureButton } from "./VoiceCaptureButton";
import { parseVoiceInput } from "../../lib/voice-nlp";
import type { InventoryItem } from "@shared/inventory";

export interface CountRecord {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  location?: string;
  bin?: string;
  barcodeScanned: boolean;
  timestamp: string;
}

export interface MobileCountSessionProps {
  sessionId: string;
  organizationId: string;
  outletId: string;
  /**
   * D2: optional list of items the chef can match against during voice
   * capture. Pass the outlet's inventory_items (or a recent search
   * result). Passing nothing still works — the parser just falls back
   * to using the spoken text as itemName at low confidence.
   */
  availableItems?: InventoryItem[];
  /**
   * D2: outlet's storage locations. Voice phrases like "in the walk-in
   * cooler" map onto these via the alias table in voice-nlp.
   */
  availableLocations?: Array<{ name: string; bin?: string | null; outletId: string }>;
  onSessionComplete?: (records: CountRecord[]) => void;
  onError?: (error: string) => void;
}

export function MobileCountSession({
  sessionId,
  organizationId,
  outletId,
  availableItems = [],
  availableLocations = [],
  onSessionComplete,
  onError,
}: MobileCountSessionProps) {
  const [records, setRecords] = useState<CountRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  // D2: input mode toggle — "voice" shows the mic; "manual" shows the form.
  const [inputMode, setInputMode] = useState<"voice" | "manual">("voice");
  // D2: when voice transcript is below high-confidence threshold the
  // parsed result lands here as a pending confirmation card the chef
  // can accept, edit, or discard before it joins the running list.
  const [pendingVoice, setPendingVoice] = useState<{
    itemName: string;
    quantity: number;
    unit: string;
    location?: string;
    confidence: number;
    rawInput: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    itemName: "",
    quantity: "",
    unit: "ea",
    location: "",
    bin: "",
  });
  const [syncStatus, setSyncStatus] = useState<{
    synced: number;
    conflicts: number;
  } | null>(null);

  const handleAddRecord = useCallback(() => {
    if (!formData.itemName || !formData.quantity) {
      onError?.("Please fill in required fields");
      return;
    }
    const newRecord: CountRecord = {
      id: `${Date.now()}-${Math.random()}`,
      itemId: `item-${Date.now()}`,
      itemName: formData.itemName,
      quantity: parseFloat(formData.quantity),
      unit: formData.unit,
      location: formData.location || undefined,
      bin: formData.bin || undefined,
      barcodeScanned: false,
      timestamp: new Date().toISOString(),
    };
    setRecords((prev) => [...prev, newRecord]);
    setFormData({
      itemName: "",
      quantity: "",
      unit: "ea",
      location: "",
      bin: "",
    });
  }, [formData, onError]);

  const handleRemoveRecord = useCallback((recordId: string) => {
    setRecords((prev) => prev.filter((record) => record.id !== recordId));
  }, []);

  // D2 — voice capture flow.
  const HIGH_CONFIDENCE = 0.7;
  const handleVoiceTranscript = useCallback(
    (transcript: string) => {
      const parsed = parseVoiceInput(transcript, availableItems, availableLocations);
      if (!parsed) {
        onError?.("Could not parse voice input — please try again or use manual entry");
        return;
      }
      // High confidence → straight to the running list.
      if (parsed.confidence >= HIGH_CONFIDENCE && parsed.itemId) {
        const newRecord: CountRecord = {
          id: `${Date.now()}-${Math.random()}`,
          itemId: parsed.itemId,
          itemName: parsed.itemName,
          quantity: parsed.quantity,
          unit: parsed.unit,
          location: parsed.location?.name,
          bin: parsed.location?.bin ?? undefined,
          barcodeScanned: false,
          timestamp: new Date().toISOString(),
        };
        setRecords((prev) => [...prev, newRecord]);
        setPendingVoice(null);
        return;
      }
      // Low confidence → confirmation card so the chef can edit / approve.
      setPendingVoice({
        itemName: parsed.itemName,
        quantity: parsed.quantity,
        unit: parsed.unit,
        location: parsed.location?.name,
        confidence: parsed.confidence,
        rawInput: parsed.rawInput,
      });
    },
    [availableItems, availableLocations, onError],
  );

  const handleAcceptPending = useCallback(() => {
    if (!pendingVoice) return;
    const newRecord: CountRecord = {
      id: `${Date.now()}-${Math.random()}`,
      itemId: `voice-${Date.now()}`,
      itemName: pendingVoice.itemName,
      quantity: pendingVoice.quantity,
      unit: pendingVoice.unit,
      location: pendingVoice.location,
      barcodeScanned: false,
      timestamp: new Date().toISOString(),
    };
    setRecords((prev) => [...prev, newRecord]);
    setPendingVoice(null);
  }, [pendingVoice]);

  const handleEditPending = useCallback(() => {
    if (!pendingVoice) return;
    setFormData({
      itemName: pendingVoice.itemName,
      quantity: String(pendingVoice.quantity),
      unit: pendingVoice.unit,
      location: pendingVoice.location ?? "",
      bin: "",
    });
    setInputMode("manual");
    setPendingVoice(null);
  }, [pendingVoice]);

  const handleDiscardPending = useCallback(() => setPendingVoice(null), []);

  const handleSync = useCallback(async () => {
    try {
      setSyncing(true);
      setLoading(true);
      for (const record of records) {
        await fetch("/api/mobile-inventory/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            itemId: record.itemId,
            quantity: record.quantity,
            unit: record.unit,
            location: record.location,
            bin: record.bin,
            barcodeScanned: record.barcodeScanned,
          }),
        });
      }
      const response = await fetch(`/api/mobile-inventory/sync/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error("Sync failed");
      }
      const result = await response.json();
      setSyncStatus({
        synced: result.synced,
        conflicts: result.conflicts.length,
      });
      if (result.conflicts.length === 0) {
        onSessionComplete?.(records);
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, [records, sessionId, onSessionComplete, onError]);

  return (
    <div className="space-y-6">
      {/* D2 — input-mode toggle (voice / manual). Voice is default. */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={inputMode === "voice" ? "default" : "outline"}
          size="sm"
          onClick={() => setInputMode("voice")}
          className="flex-1"
        >
          <Mic className="w-4 h-4 mr-2" /> Voice
        </Button>
        <Button
          type="button"
          variant={inputMode === "manual" ? "default" : "outline"}
          size="sm"
          onClick={() => setInputMode("manual")}
          className="flex-1"
        >
          Manual
        </Button>
      </div>

      {/* D2 — voice card */}
      {inputMode === "voice" && (
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Speak the count</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Tap the mic and say something like{" "}
            <span className="font-medium">
              “six cases of cherrystone clams in the walk-in cooler”
            </span>
            . The list grows as you walk; another bag of carrots on the rack just
            adds to it.
          </p>
          <VoiceCaptureButton mode="toggle" onTranscript={handleVoiceTranscript} onError={onError} />

          {pendingVoice && (
            <div className="mt-4 rounded-lg border-2 border-amber-300 bg-amber-50 p-3">
              <div className="text-xs uppercase tracking-wider text-amber-700 font-semibold mb-1">
                Confirm — confidence {(pendingVoice.confidence * 100).toFixed(0)}%
              </div>
              <div className="text-base text-gray-900">
                <span className="font-semibold">{pendingVoice.quantity}</span>{" "}
                <span className="font-medium">{pendingVoice.unit}</span> ×{" "}
                <span className="font-semibold">{pendingVoice.itemName}</span>
                {pendingVoice.location && (
                  <span className="text-gray-700"> in {pendingVoice.location}</span>
                )}
              </div>
              <div className="text-xs text-gray-500 italic mt-1">
                heard: “{pendingVoice.rawInput}”
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={handleAcceptPending} className="flex-1">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Accept
                </Button>
                <Button size="sm" variant="outline" onClick={handleEditPending} className="flex-1">
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDiscardPending}>
                  Discard
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {inputMode === "manual" && (
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Record Count</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Item Name *
              </label>
              <Input
                value={formData.itemName}
                onChange={(e) =>
                  setFormData({ ...formData, itemName: e.target.value })
                }
                placeholder="Enter item name"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Quantity *
              </label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                placeholder="0"
                disabled={loading}
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md"
                disabled={loading}
              >
                <option value="ea">Each</option>
                <option value="case">Case</option>
                <option value="lb">Pound</option>
                <option value="oz">Ounce</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <Input
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="e.g., Freezer"
                disabled={loading}
              />
            </div>
          </div>
          <Button
            onClick={handleAddRecord}
            disabled={loading}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Count Record
          </Button>
        </div>
      </Card>
      )}

      {records.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">
            Recorded Items ({records.length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {records.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 bg-surface rounded-md"
              >
                <div className="flex-1">
                  <p className="font-medium">{record.itemName}</p>
                  <p className="text-sm text-muted-foreground">
                    {record.quantity} {record.unit}
                    {record.location && ` - ${record.location}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveRecord(record.id)}
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {syncStatus && (
        <Alert
          className={
            syncStatus.conflicts === 0 ? "bg-green-50" : "bg-yellow-50"
          }
        >
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            {syncStatus.synced} items synced
            {syncStatus.conflicts > 0 && `, ${syncStatus.conflicts} conflicts`}
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleSync}
        disabled={loading || records.length === 0 || syncing}
        className="w-full"
        size="lg"
      >
        <Send className="w-4 h-4 mr-2" />
        {syncing ? "Syncing..." : "Sync Count Session"}
      </Button>
    </div>
  );
}
