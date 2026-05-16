import React, { useState } from "react";
import { AlertCircle, CheckCircle2, ThermometerSun } from "lucide-react";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { logger } from "@/lib/logger";
interface HACCPCheckFormProps {
  shipmentId: string;
  organizationId: string;
  currentUserId: string;
  onCheckComplete?: (passed: boolean) => void;
}
export function HACCPCheckForm({
  shipmentId,
  organizationId,
  currentUserId,
  onCheckComplete,
}: HACCPCheckFormProps) {
  const [check, setCheck] = useState({
    frozen_product_temp: -18,
    frozen_acceptable: true,
    chilled_product_temp: 4,
    chilled_acceptable: true,
    ambient_temp: 21,
    ambient_acceptable: true,
    exterior_cleanliness: 8,
    interior_cleanliness: 8,
    cleanliness_acceptable: true,
    delivery_documentation_present: true,
    origin_cert_present: true,
    allergen_info_present: true,
    haccp_status: "pass",
    corrective_action_required: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const validateCheck = () => {
    const errors: string[] = [];
    if (!check.frozen_acceptable) {
      errors.push("Frozen products temperature is outside acceptable range");
    }
    if (!check.chilled_acceptable) {
      errors.push("Chilled products temperature is outside acceptable range");
    }
    if (!check.ambient_acceptable) {
      errors.push("Ambient temperature is outside acceptable range");
    }
    if (!check.cleanliness_acceptable) {
      errors.push("Truck cleanliness is not acceptable");
    }
    if (!check.delivery_documentation_present) {
      errors.push("Delivery documentation is missing");
    }
    return errors;
  };
  const handleCheckTemperatures = () => {
    setCheck((prev) => ({
      ...prev,
      frozen_acceptable: prev.frozen_product_temp <= -18,
      chilled_acceptable: prev.chilled_product_temp <= 4,
      ambient_acceptable: prev.ambient_temp <= 25,
    }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateCheck();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setCheck((prev) => ({ ...prev, haccp_status: "fail" }));
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch("/api/receiving/haccp-checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipment_id: shipmentId,
          organization_id: organizationId,
          checked_by_user_id: currentUserId,
          ...check,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit HACCP check");
      logger.info("HACCP check submitted successfully");
      const passed = check.haccp_status === "pass";
      onCheckComplete?.(passed);
    } catch (error) {
      logger.error("Failed to submit HACCP check:", error);
      alert("Failed to submit HACCP check");
    } finally {
      setSubmitting(false);
    }
  };
  const allChecksPassed =
    check.frozen_acceptable &&
    check.chilled_acceptable &&
    check.ambient_acceptable &&
    check.cleanliness_acceptable &&
    check.delivery_documentation_present;
  return (
    <Card>
      {" "}
      <CardHeader>
        {" "}
        <CardTitle className="flex items-center gap-2">
          {" "}
          <ThermometerSun className="h-5 w-5" /> HACCP Protocol Checks{" "}
        </CardTitle>{" "}
        <CardDescription>
          {" "}
          Verify food safety standards before accepting delivery{" "}
        </CardDescription>{" "}
      </CardHeader>{" "}
      <CardContent>
        {" "}
        <form onSubmit={handleSubmit} className="space-y-6">
          {" "}
          {/* Temperature Section */}{" "}
          <div className="space-y-4 border rounded-lg p-4 bg-blue-50">
            {" "}
            <div className="flex justify-between items-center">
              {" "}
              <h3 className="font-semibold">Temperature Monitoring</h3>{" "}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCheckTemperatures}
              >
                {" "}
                Verify Temps{" "}
              </Button>{" "}
            </div>{" "}
            <div className="grid grid-cols-2 gap-4">
              {" "}
              <div>
                {" "}
                <label className="text-sm font-medium">
                  {" "}
                  Frozen Products (°C){" "}
                </label>{" "}
                <Input
                  type="number"
                  step="0.5"
                  value={check.frozen_product_temp}
                  onChange={(e) =>
                    setCheck({
                      ...check,
                      frozen_product_temp: parseFloat(e.target.value),
                    })
                  }
                />{" "}
                <p className="text-xs text-muted-foreground mt-1">
                  Target: ≤ -18°C
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <label className="text-sm font-medium">
                  {" "}
                  Chilled Products (°C){" "}
                </label>{" "}
                <Input
                  type="number"
                  step="0.5"
                  value={check.chilled_product_temp}
                  onChange={(e) =>
                    setCheck({
                      ...check,
                      chilled_product_temp: parseFloat(e.target.value),
                    })
                  }
                />{" "}
                <p className="text-xs text-muted-foreground mt-1">
                  Target: ≤ 4°C
                </p>{" "}
              </div>{" "}
            </div>{" "}
            <div>
              {" "}
              <label className="text-sm font-medium">
                {" "}
                Ambient/Interior (°C){" "}
              </label>{" "}
              <Input
                type="number"
                step="0.5"
                value={check.ambient_temp}
                onChange={(e) =>
                  setCheck({
                    ...check,
                    ambient_temp: parseFloat(e.target.value),
                  })
                }
              />{" "}
              <p className="text-xs text-muted-foreground mt-1">
                Target: ≤ 25°C
              </p>{" "}
            </div>{" "}
            <div className="space-y-2">
              {" "}
              <Label className="flex items-center gap-2">
                {" "}
                <Checkbox
                  checked={check.frozen_acceptable}
                  onCheckedChange={(checked: any) =>
                    setCheck({ ...check, frozen_acceptable: checked })
                  }
                />{" "}
                <span>Frozen products within acceptable range</span>{" "}
              </Label>{" "}
              <Label className="flex items-center gap-2">
                {" "}
                <Checkbox
                  checked={check.chilled_acceptable}
                  onCheckedChange={(checked: any) =>
                    setCheck({ ...check, chilled_acceptable: checked })
                  }
                />{" "}
                <span>Chilled products within acceptable range</span>{" "}
              </Label>{" "}
              <Label className="flex items-center gap-2">
                {" "}
                <Checkbox
                  checked={check.ambient_acceptable}
                  onCheckedChange={(checked: any) =>
                    setCheck({ ...check, ambient_acceptable: checked })
                  }
                />{" "}
                <span>Ambient temperature within acceptable range</span>{" "}
              </Label>{" "}
            </div>{" "}
          </div>{" "}
          {/* Cleanliness Section */}{" "}
          <div className="space-y-4 border rounded-lg p-4 bg-green-50">
            {" "}
            <h3 className="font-semibold">Cleanliness Assessment</h3>{" "}
            <div className="grid grid-cols-2 gap-4">
              {" "}
              <div>
                {" "}
                <label className="text-sm font-medium">
                  {" "}
                  Exterior Cleanliness (1-10){" "}
                </label>{" "}
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={check.exterior_cleanliness}
                  onChange={(e) =>
                    setCheck({
                      ...check,
                      exterior_cleanliness: parseInt(e.target.value),
                    })
                  }
                />{" "}
              </div>{" "}
              <div>
                {" "}
                <label className="text-sm font-medium">
                  {" "}
                  Interior Cleanliness (1-10){" "}
                </label>{" "}
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={check.interior_cleanliness}
                  onChange={(e) =>
                    setCheck({
                      ...check,
                      interior_cleanliness: parseInt(e.target.value),
                    })
                  }
                />{" "}
              </div>{" "}
            </div>{" "}
            <Label className="flex items-center gap-2">
              {" "}
              <Checkbox
                checked={check.cleanliness_acceptable}
                onCheckedChange={(checked: any) =>
                  setCheck({ ...check, cleanliness_acceptable: checked })
                }
              />{" "}
              <span>Truck is clean and acceptable for food transport</span>{" "}
            </Label>{" "}
          </div>{" "}
          {/* Documentation Section */}{" "}
          <div className="space-y-3 border rounded-lg p-4 bg-purple-50">
            {" "}
            <h3 className="font-semibold">Documentation</h3>{" "}
            <Label className="flex items-center gap-2">
              {" "}
              <Checkbox
                checked={check.delivery_documentation_present}
                onCheckedChange={(checked: any) =>
                  setCheck({
                    ...check,
                    delivery_documentation_present: checked,
                  })
                }
              />{" "}
              <span>Delivery documentation present</span>{" "}
            </Label>{" "}
            <Label className="flex items-center gap-2">
              {" "}
              <Checkbox
                checked={check.origin_cert_present}
                onCheckedChange={(checked: any) =>
                  setCheck({ ...check, origin_cert_present: checked })
                }
              />{" "}
              <span>Origin certificates/health certificates present</span>{" "}
            </Label>{" "}
            <Label className="flex items-center gap-2">
              {" "}
              <Checkbox
                checked={check.allergen_info_present}
                onCheckedChange={(checked: any) =>
                  setCheck({ ...check, allergen_info_present: checked })
                }
              />{" "}
              <span>Allergen information available</span>{" "}
            </Label>{" "}
          </div>{" "}
          {/* Validation Errors */}{" "}
          {validationErrors.length > 0 && (
            <Alert className="bg-red-50 border-red-200">
              {" "}
              <AlertCircle className="h-4 w-4 text-red-600" />{" "}
              <AlertDescription className="text-red-800">
                {" "}
                <p className="font-medium mb-2">
                  Cannot pass HACCP check:
                </p>{" "}
                <ul className="space-y-1 text-sm">
                  {" "}
                  {validationErrors.map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}{" "}
                </ul>{" "}
              </AlertDescription>{" "}
            </Alert>
          )}{" "}
          {/* Summary */}{" "}
          {allChecksPassed ? (
            <Alert className="bg-green-50 border-green-200">
              {" "}
              <CheckCircle2 className="h-4 w-4 text-green-600" />{" "}
              <AlertDescription className="text-green-800">
                {" "}
                All HACCP checks passed. Ready to proceed with unloading.{" "}
              </AlertDescription>{" "}
            </Alert>
          ) : (
            <Alert className="bg-amber-50 border-amber-200">
              {" "}
              <AlertCircle className="h-4 w-4 text-amber-600" />{" "}
              <AlertDescription className="text-amber-800">
                {" "}
                Review temperatures and documentation before approving.{" "}
              </AlertDescription>{" "}
            </Alert>
          )}{" "}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full"
            size="lg"
            variant={allChecksPassed ? "default" : "destructive"}
          >
            {" "}
            {submitting
              ? "Submitting..."
              : allChecksPassed
                ? "Approve Delivery"
                : "Mark Failed"}{" "}
          </Button>{" "}
        </form>{" "}
      </CardContent>{" "}
    </Card>
  );
}
