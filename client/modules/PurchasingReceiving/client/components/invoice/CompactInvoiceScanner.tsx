import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InvoiceUploader } from "./InvoiceUploader";
import { Upload, Camera, AlertCircle, RotateCw } from "lucide-react";
import type { InvoiceExtractionResult } from "@shared/api";
interface CompactInvoiceScannerProps {
  onExtracted?: (result: InvoiceExtractionResult) => void;
  onEachExtracted?: (
    result: InvoiceExtractionResult,
    attachmentUrl?: string,
    dataUrl?: string,
  ) => void;
  propertyType?: "resort" | "restaurant" | "hotel";
}
export function CompactInvoiceScanner({
  onExtracted,
  onEachExtracted,
  propertyType = "resort",
}: CompactInvoiceScannerProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  if (isMinimized) {
    return (
      <Card className="border border-slate-800/60 bg-card">
        {" "}
        <CardContent className="p-3">
          {" "}
          <Button
            onClick={() => setIsMinimized(false)}
            variant="outline"
            className="w-full gap-2"
          >
            {" "}
            <Upload className="h-4 w-4" /> Show Scanner{" "}
          </Button>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  return (
    <Card className="border border-slate-800/60 bg-card">
      {" "}
      <CardHeader className="pb-2 sm:pb-3">
        {" "}
        <div className="flex items-start justify-between gap-2">
          {" "}
          <div className="flex-1">
            {" "}
            <CardTitle className="text-base sm:text-lg">
              Quick Scan
            </CardTitle>{" "}
            <CardDescription className="text-xs sm:text-sm">
              {" "}
              Drop files or use camera to scan invoices. Supports 100+ files at
              once.{" "}
            </CardDescription>{" "}
          </div>{" "}
          <Button
            onClick={() => setIsMinimized(true)}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Minimize scanner"
          >
            {" "}
            ×{" "}
          </Button>{" "}
        </div>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-2 p-3 sm:p-4">
        {" "}
        <InvoiceUploader
          onExtracted={onExtracted}
          onEachExtracted={onEachExtracted}
          propertyType={propertyType}
        />{" "}
      </CardContent>{" "}
    </Card>
  );
}
