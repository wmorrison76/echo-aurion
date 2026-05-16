import React, { useCallback, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, CheckCircle2, Thermometer, Package } from "lucide-react";
export interface HaccpCheckData {
  temperatureCheck: boolean;
  actualTemperature?: number;
  temperatureUom: "F" | "C";
  temperatureAcceptable: boolean;
  conditionCheck: boolean;
  containerCondition: "good" | "damaged" | "concern";
  productsIntact: boolean;
  expirationCheckPassed: boolean;
  documentsPresent: boolean;
  signedByName: string;
  signedAt: string;
  notes: string;
}
interface ReceivingHaccpChecksProps {
  onComplete: (data: HaccpCheckData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}
const TEMPERATURE_REQUIREMENTS: Record<string, { min: number; max: number }> = {
  frozen: { min: -18, max: 0 },
  refrigerated: { min: 2, max: 7 },
  ambient: { min: 15, max: 25 },
};
export function ReceivingHaccpChecks({
  onComplete,
  onCancel,
  isLoading = false,
}: ReceivingHaccpChecksProps) {
  const [data, setData] = useState<HaccpCheckData>({
    temperatureCheck: false,
    temperatureUom: "F",
    temperatureAcceptable: false,
    conditionCheck: false,
    containerCondition: "good",
    productsIntact: false,
    expirationCheckPassed: false,
    documentsPresent: false,
    signedByName: "",
    signedAt: new Date().toISOString().slice(0, 16),
    notes: "",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const validateChecks = useCallback(() => {
    const newErrors: string[] = [];
    if (!data.temperatureCheck) {
      newErrors.push("Temperature check is required");
    }
    if (data.temperatureCheck && data.temperatureAcceptable === undefined) {
      newErrors.push("Please confirm if temperature is acceptable");
    }
    if (!data.conditionCheck) {
      newErrors.push("Container condition check is required");
    }
    if (!data.productsIntact) {
      newErrors.push("Products integrity check is required");
    }
    if (!data.expirationCheckPassed) {
      newErrors.push("Expiration date verification is required");
    }
    if (!data.documentsPresent) {
      newErrors.push("Document verification is required");
    }
    if (!data.signedByName.trim()) {
      newErrors.push("Receiver name is required");
    }
    setErrors(newErrors);
    return newErrors.length === 0;
  }, [data]);
  const handleSubmit = useCallback(() => {
    if (validateChecks()) {
      onComplete(data);
    }
  }, [data, validateChecks, onComplete]);
  const isFormComplete =
    data.temperatureCheck &&
    data.temperatureAcceptable &&
    data.conditionCheck &&
    data.productsIntact &&
    data.expirationCheckPassed &&
    data.documentsPresent &&
    data.signedByName.trim();
  return (
    <Card className="border-emerald-400/30 bg-card text-emerald-100">
      {" "}
      <CardHeader>
        {" "}
        <CardTitle className="flex items-center gap-2">
          {" "}
          <Package className="h-5 w-5" /> Delivery Receiving Checklist
          (HACCP){" "}
        </CardTitle>{" "}
        <CardDescription className="text-emerald-200/70">
          {" "}
          Complete all required checks before accepting delivery{" "}
        </CardDescription>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-6">
        {" "}
        {errors.length > 0 && (
          <Alert className="border-red-400/40 bg-red-500/10">
            {" "}
            <AlertCircle className="h-4 w-4 text-red-400" />{" "}
            <AlertTitle>Incomplete Checklist</AlertTitle>{" "}
            <AlertDescription className="mt-2 space-y-1">
              {" "}
              {errors.map((error, idx) => (
                <div key={idx} className="text-sm text-red-200">
                  {" "}
                  • {error}{" "}
                </div>
              ))}{" "}
            </AlertDescription>{" "}
          </Alert>
        )}{" "}
        {/* Temperature Check Section */}{" "}
        <div className="space-y-3 rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-4">
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <Thermometer className="h-5 w-5 text-emerald-400" />{" "}
            <h3 className="font-semibold text-emerald-100">
              Temperature Verification
            </h3>{" "}
          </div>{" "}
          <div className="space-y-3 pl-7">
            {" "}
            <div className="flex items-center gap-3">
              {" "}
              <Checkbox
                id="temp-check"
                checked={data.temperatureCheck}
                onCheckedChange={(checked) =>
                  setData((prev) => ({
                    ...prev,
                    temperatureCheck: checked as boolean,
                  }))
                }
              />{" "}
              <label htmlFor="temp-check" className="text-sm cursor-pointer">
                {" "}
                Temperature checked with calibrated thermometer{" "}
              </label>{" "}
            </div>{" "}
            {data.temperatureCheck && (
              <div className="space-y-2">
                {" "}
                <label className="block text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                  {" "}
                  Actual Temperature{" "}
                </label>{" "}
                <div className="flex gap-2">
                  {" "}
                  <Input
                    type="number"
                    step="0.1"
                    value={data.actualTemperature ?? ""}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        actualTemperature: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      }))
                    }
                    placeholder="Temperature value"
                    className="border-emerald-400/20 bg-card"
                  />{" "}
                  <select
                    value={data.temperatureUom}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        temperatureUom: e.target.value as "F" | "C",
                      }))
                    }
                    className="rounded-md border border-emerald-400/20 bg-card px-2 text-sm"
                  >
                    {" "}
                    <option value="F">°F</option>{" "}
                    <option value="C">°C</option>{" "}
                  </select>{" "}
                </div>{" "}
                <div className="flex items-center gap-3">
                  {" "}
                  <Checkbox
                    id="temp-acceptable"
                    checked={data.temperatureAcceptable}
                    onCheckedChange={(checked) =>
                      setData((prev) => ({
                        ...prev,
                        temperatureAcceptable: checked as boolean,
                      }))
                    }
                  />{" "}
                  <label
                    htmlFor="temp-acceptable"
                    className="text-sm cursor-pointer"
                  >
                    {" "}
                    Temperature within acceptable range{" "}
                  </label>{" "}
                </div>{" "}
              </div>
            )}{" "}
          </div>{" "}
        </div>{" "}
        {/* Condition Check Section */}{" "}
        <div className="space-y-3 rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-4">
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <Package className="h-5 w-5 text-emerald-400" />{" "}
            <h3 className="font-semibold text-emerald-100">
              Delivery Condition
            </h3>{" "}
          </div>{" "}
          <div className="space-y-3 pl-7">
            {" "}
            <div className="flex items-center gap-3">
              {" "}
              <Checkbox
                id="condition-check"
                checked={data.conditionCheck}
                onCheckedChange={(checked) =>
                  setData((prev) => ({
                    ...prev,
                    conditionCheck: checked as boolean,
                  }))
                }
              />{" "}
              <label
                htmlFor="condition-check"
                className="text-sm cursor-pointer"
              >
                {" "}
                Delivery containers inspected{" "}
              </label>{" "}
            </div>{" "}
            {data.conditionCheck && (
              <div className="space-y-2">
                {" "}
                <label className="block text-xs uppercase tracking-[0.3em] text-emerald-200/70">
                  {" "}
                  Container Condition{" "}
                </label>{" "}
                <div className="flex gap-2">
                  {" "}
                  {(
                    [
                      { value: "good", label: "Good" },
                      { value: "damaged", label: "Damaged" },
                      { value: "concern", label: "Concern" },
                    ] as const
                  ).map((option) => (
                    <Button
                      key={option.value}
                      onClick={() =>
                        setData((prev) => ({
                          ...prev,
                          containerCondition: option.value,
                        }))
                      }
                      variant={
                        data.containerCondition === option.value
                          ? "default"
                          : "outline"
                      }
                      className="flex-1"
                    >
                      {" "}
                      {option.label}{" "}
                    </Button>
                  ))}{" "}
                </div>{" "}
                <div className="flex items-center gap-3">
                  {" "}
                  <Checkbox
                    id="products-intact"
                    checked={data.productsIntact}
                    onCheckedChange={(checked) =>
                      setData((prev) => ({
                        ...prev,
                        productsIntact: checked as boolean,
                      }))
                    }
                  />{" "}
                  <label
                    htmlFor="products-intact"
                    className="text-sm cursor-pointer"
                  >
                    {" "}
                    All products appear intact and undamaged{" "}
                  </label>{" "}
                </div>{" "}
              </div>
            )}{" "}
          </div>{" "}
        </div>{" "}
        {/* Documentation Check Section */}{" "}
        <div className="space-y-3 rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-4">
          {" "}
          <h3 className="font-semibold text-emerald-100">
            Documentation & Expiration
          </h3>{" "}
          <div className="space-y-3 pl-0">
            {" "}
            <div className="flex items-center gap-3">
              {" "}
              <Checkbox
                id="expiration-check"
                checked={data.expirationCheckPassed}
                onCheckedChange={(checked) =>
                  setData((prev) => ({
                    ...prev,
                    expirationCheckPassed: checked as boolean,
                  }))
                }
              />{" "}
              <label
                htmlFor="expiration-check"
                className="text-sm cursor-pointer"
              >
                {" "}
                All items have valid expiration dates{" "}
              </label>{" "}
            </div>{" "}
            <div className="flex items-center gap-3">
              {" "}
              <Checkbox
                id="documents-check"
                checked={data.documentsPresent}
                onCheckedChange={(checked) =>
                  setData((prev) => ({
                    ...prev,
                    documentsPresent: checked as boolean,
                  }))
                }
              />{" "}
              <label
                htmlFor="documents-check"
                className="text-sm cursor-pointer"
              >
                {" "}
                PO, invoice, and shipping documents verified{" "}
              </label>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        {/* Signature Section */}{" "}
        <div className="space-y-3">
          {" "}
          <label className="block text-xs uppercase tracking-[0.3em] text-emerald-200/70">
            {" "}
            Receiver Name (Required){" "}
          </label>{" "}
          <Input
            type="text"
            value={data.signedByName}
            onChange={(e) =>
              setData((prev) => ({ ...prev, signedByName: e.target.value }))
            }
            placeholder="Full name of receiver"
            className="border-emerald-400/20 bg-card"
          />{" "}
          <label className="block text-xs uppercase tracking-[0.3em] text-emerald-200/70">
            {" "}
            Time of Receipt{" "}
          </label>{" "}
          <Input
            type="datetime-local"
            value={data.signedAt}
            onChange={(e) =>
              setData((prev) => ({ ...prev, signedAt: e.target.value }))
            }
            className="border-emerald-400/20 bg-card"
          />{" "}
          <label className="block text-xs uppercase tracking-[0.3em] text-emerald-200/70">
            {" "}
            Notes{" "}
          </label>{" "}
          <textarea
            value={data.notes}
            onChange={(e) =>
              setData((prev) => ({ ...prev, notes: e.target.value }))
            }
            placeholder="Any issues or special notes..."
            rows={3}
            className="w-full rounded-xl border border-emerald-400/20 bg-card px-3 py-2 text-sm text-emerald-100 focus:border-emerald-300 focus:outline-none"
          />{" "}
        </div>{" "}
        {/* Action Buttons */}{" "}
        <div className="flex gap-3 pt-4">
          {" "}
          <Button onClick={onCancel} variant="outline" className="flex-1">
            {" "}
            Cancel{" "}
          </Button>{" "}
          <Button
            onClick={handleSubmit}
            disabled={!isFormComplete || isLoading}
            className="flex-1 gap-2"
          >
            {" "}
            {isFormComplete && <CheckCircle2 className="h-4 w-4" />}{" "}
            {isLoading ? "Saving..." : "Accept Delivery"}{" "}
          </Button>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
