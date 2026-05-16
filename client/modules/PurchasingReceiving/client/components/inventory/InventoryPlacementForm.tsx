import React, { useCallback, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Package, Warehouse } from "lucide-react";
export interface InventoryItem {
  id: string;
  productCode: string;
  productName: string;
  receivedQuantity: number;
  unitOfMeasure: string;
  unitCost: number;
  expirationDate?: string;
  lotNumber?: string;
  receivedAt: string;
  placed: number;
}
export interface StorageLocation {
  id: string;
  section: string;
  rack: string;
  bin: string;
  capacity: number;
  currentStock: number;
}
export interface InventoryPlacementFormProps {
  item: InventoryItem;
  outletId: string;
  outletName: string;
  storageLocations: StorageLocation[];
  onPlace: (
    item: InventoryItem,
    location: StorageLocation,
    quantity: number,
  ) => Promise<void>;
  onSkip: () => void;
  isLoading?: boolean;
}
export function InventoryPlacementForm({
  item,
  outletId,
  outletName,
  storageLocations,
  onPlace,
  onSkip,
  isLoading = false,
}: InventoryPlacementFormProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(
    item.receivedQuantity - item.placed,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const remainingQuantity = useMemo(() => {
    return item.receivedQuantity - item.placed;
  }, [item.receivedQuantity, item.placed]);
  const selectedLocationData = useMemo(() => {
    return storageLocations.find((l) => l.id === selectedLocation);
  }, [selectedLocation, storageLocations]);
  const availableLocations = useMemo(() => {
    return storageLocations
      .filter((loc) => loc.currentStock < loc.capacity)
      .sort(
        (a, b) => b.capacity - b.currentStock - (a.capacity - a.currentStock),
      );
  }, [storageLocations]);
  const isQuantityValid = quantity > 0 && quantity <= remainingQuantity;
  const handlePlace = useCallback(async () => {
    if (!selectedLocationData || !isQuantityValid) return;
    setIsSubmitting(true);
    try {
      await onPlace(item, selectedLocationData, quantity);
      setQuantity(item.receivedQuantity - item.placed - quantity);
      setSelectedLocation("");
    } finally {
      setIsSubmitting(false);
    }
  }, [item, selectedLocationData, isQuantityValid, quantity, onPlace]);
  const progressPercent = ((item.placed / item.receivedQuantity) * 100).toFixed(
    0,
  );
  return (
    <Card className="border-emerald-400/30 bg-card">
      {" "}
      <CardHeader>
        {" "}
        <CardTitle className="flex items-center gap-2">
          {" "}
          <Package className="h-5 w-5" /> Place Received Item in Inventory{" "}
        </CardTitle>{" "}
        <CardDescription className="text-emerald-200/70">
          {" "}
          Allocate items to storage locations across {outletName}{" "}
        </CardDescription>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-6">
        {" "}
        {/* Item Summary */}{" "}
        <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-4 space-y-3">
          {" "}
          <div className="grid gap-3 md:grid-cols-2">
            {" "}
            <div>
              {" "}
              <div className="text-xs text-emerald-200/60">Product</div>{" "}
              <div className="font-semibold text-emerald-100">
                {item.productName}
              </div>{" "}
              <div className="text-xs text-emerald-200/70">
                {item.productCode}
              </div>{" "}
            </div>{" "}
            <div>
              {" "}
              <div className="text-xs text-emerald-200/60">Unit Cost</div>{" "}
              <div className="font-semibold text-emerald-100">
                ${item.unitCost.toFixed(2)}
              </div>{" "}
              <div className="text-xs text-emerald-200/70">
                {item.unitOfMeasure}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          {item.expirationDate && (
            <div className="flex items-center justify-between rounded bg-surface px-3 py-2">
              {" "}
              <span className="text-xs text-emerald-200/70">
                Expiration Date
              </span>{" "}
              <Badge variant="outline">{item.expirationDate}</Badge>{" "}
            </div>
          )}{" "}
          {item.lotNumber && (
            <div className="flex items-center justify-between rounded bg-surface px-3 py-2">
              {" "}
              <span className="text-xs text-emerald-200/70">
                Lot Number
              </span>{" "}
              <code className="text-sm font-mono text-emerald-100">
                {item.lotNumber}
              </code>{" "}
            </div>
          )}{" "}
        </div>{" "}
        {/* Placement Progress */}{" "}
        <div className="space-y-2">
          {" "}
          <div className="flex items-center justify-between">
            {" "}
            <span className="text-sm text-emerald-200/70">
              Placement Progress
            </span>{" "}
            <span className="text-sm font-semibold text-emerald-100">
              {" "}
              {item.placed} / {item.receivedQuantity} placed ({progressPercent}
              %){" "}
            </span>{" "}
          </div>{" "}
          <div className="h-2 rounded-full bg-surface overflow-hidden">
            {" "}
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
              style={{ width: `${progressPercent}%` }}
            />{" "}
          </div>{" "}
        </div>{" "}
        {remainingQuantity === 0 && (
          <Alert className="border-emerald-400/50 bg-emerald-500/10">
            {" "}
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />{" "}
            <AlertDescription className="text-emerald-200">
              {" "}
              All items have been placed in inventory{" "}
            </AlertDescription>{" "}
          </Alert>
        )}{" "}
        {/* Placement Form */}{" "}
        {remainingQuantity > 0 && (
          <div className="space-y-4">
            {" "}
            <div className="space-y-2">
              {" "}
              <label className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                {" "}
                Quantity to Place ({remainingQuantity} remaining){" "}
              </label>{" "}
              <Input
                type="number"
                min="0"
                max={remainingQuantity}
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="border-emerald-400/20 bg-card text-emerald-100"
              />{" "}
              <div className="text-xs text-emerald-200/60">
                {" "}
                Received: {item.receivedQuantity} {item.unitOfMeasure}{" "}
              </div>{" "}
            </div>{" "}
            {availableLocations.length === 0 ? (
              <Alert className="border-red-400/40 bg-red-500/10">
                {" "}
                <AlertCircle className="h-4 w-4 text-red-400" />{" "}
                <AlertDescription className="text-red-200">
                  {" "}
                  No storage locations available. All locations are at
                  capacity.{" "}
                </AlertDescription>{" "}
              </Alert>
            ) : (
              <div className="space-y-2">
                {" "}
                <label className="text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                  {" "}
                  Select Storage Location ({availableLocations.length}{" "}
                  available){" "}
                </label>{" "}
                <Select
                  value={selectedLocation}
                  onValueChange={setSelectedLocation}
                >
                  {" "}
                  <SelectTrigger className="border-emerald-400/20 bg-card text-emerald-100">
                    {" "}
                    <SelectValue placeholder="Choose a storage location" />{" "}
                  </SelectTrigger>{" "}
                  <SelectContent>
                    {" "}
                    {availableLocations.map((loc) => {
                      const available = loc.capacity - loc.currentStock;
                      return (
                        <SelectItem key={loc.id} value={loc.id}>
                          {" "}
                          <div className="flex items-center gap-2">
                            {" "}
                            <span>
                              {" "}
                              {loc.section} / {loc.rack} / {loc.bin}{" "}
                            </span>{" "}
                            <Badge variant="outline" className="text-xs">
                              {" "}
                              {available} available{" "}
                            </Badge>{" "}
                          </div>{" "}
                        </SelectItem>
                      );
                    })}{" "}
                  </SelectContent>{" "}
                </Select>{" "}
              </div>
            )}{" "}
            {selectedLocationData && (
              <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3">
                {" "}
                <div className="space-y-2 text-sm">
                  {" "}
                  <div className="flex justify-between">
                    {" "}
                    <span className="text-emerald-200/70">Location</span>{" "}
                    <span className="font-semibold text-emerald-100">
                      {" "}
                      {selectedLocationData.section} /{" "}
                      {selectedLocationData.rack} /{" "}
                      {selectedLocationData.bin}{" "}
                    </span>{" "}
                  </div>{" "}
                  <div className="flex justify-between">
                    {" "}
                    <span className="text-emerald-200/70">
                      Current Stock
                    </span>{" "}
                    <span className="font-mono text-emerald-100">
                      {selectedLocationData.currentStock}
                    </span>{" "}
                  </div>{" "}
                  <div className="flex justify-between">
                    {" "}
                    <span className="text-emerald-200/70">Capacity</span>{" "}
                    <span className="font-mono text-emerald-100">
                      {selectedLocationData.capacity}
                    </span>{" "}
                  </div>{" "}
                  <div className="flex justify-between border-t border-emerald-400/20 pt-2">
                    {" "}
                    <span className="text-emerald-200/70">
                      Available After Placement
                    </span>{" "}
                    <span className="font-mono text-emerald-100">
                      {" "}
                      {selectedLocationData.capacity -
                        selectedLocationData.currentStock -
                        quantity}{" "}
                    </span>{" "}
                  </div>{" "}
                </div>{" "}
              </div>
            )}{" "}
            <div className="space-y-2">
              {" "}
              <div className="flex items-center justify-between rounded bg-surface px-3 py-2">
                {" "}
                <span className="text-sm text-emerald-200/70">
                  Inventory Value
                </span>{" "}
                <span className="font-semibold text-emerald-100">
                  {" "}
                  ${(quantity * item.unitCost).toFixed(2)}{" "}
                </span>{" "}
              </div>{" "}
            </div>{" "}
            <div className="flex gap-3">
              {" "}
              <Button
                onClick={handlePlace}
                disabled={!isQuantityValid || !selectedLocation || isSubmitting}
                size="lg"
                className="flex-1 gap-2"
              >
                {" "}
                <Warehouse className="h-4 w-4" />{" "}
                {isSubmitting ? "Placing..." : "Place in Inventory"}{" "}
              </Button>{" "}
              <Button
                onClick={onSkip}
                variant="outline"
                size="lg"
                className="flex-1"
                disabled={isSubmitting}
              >
                {" "}
                Skip Item{" "}
              </Button>{" "}
            </div>{" "}
          </div>
        )}{" "}
        {remainingQuantity === 0 && (
          <Button onClick={onSkip} size="lg" className="w-full">
            {" "}
            <CheckCircle2 className="mr-2 h-4 w-4" /> Item Complete{" "}
          </Button>
        )}{" "}
      </CardContent>{" "}
    </Card>
  );
}
