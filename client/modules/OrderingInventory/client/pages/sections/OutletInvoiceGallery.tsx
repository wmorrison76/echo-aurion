import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InvoiceImageVault } from "@/modules/PurchasingReceiving/client/components/invoice/InvoiceImageVault";
import type {
  Invoice,
  InvoiceImage,
} from "@/modules/PurchasingReceiving/shared/types/invoices";
import { Store } from "@/modules/PurchasingReceiving/client/lib/store";

type InvoiceMap = Record<string, InvoiceImage[]>;

const IMAGE_KEY = "invoice.gallery.images";

const mockInvoices = (outlets: { id: string; name: string }[]): Invoice[] => {
  if (!outlets || outlets.length === 0) {
    return [];
  }
  const [first, second] = outlets;
  const defaultOutlet = { id: "outlet-1", name: "Main Kitchen" };
  const now = new Date().toISOString();
  return [
    {
      id: "inv-1001",
      organization_id: "org-1",
      outlet_id: first?.id ?? defaultOutlet.id,
      vendor_id: "vendor-1",
      invoice_number: "INV-24001",
      invoice_date: now,
      subtotal: 4200,
      tax: 0,
      total: 4200,
      currency: "USD",
      status: "received",
      created_at: now,
      updated_at: now,
    },
    {
      id: "inv-1002",
      organization_id: "org-1",
      outlet_id: second?.id ?? "outlet-2",
      vendor_id: "vendor-2",
      invoice_number: "INV-24002",
      invoice_date: now,
      subtotal: 2750,
      tax: 0,
      total: 2750,
      currency: "USD",
      status: "reviewed",
      created_at: now,
      updated_at: now,
    },
    {
      id: "inv-1003",
      organization_id: "org-1",
      outlet_id: first?.id ?? defaultOutlet.id,
      vendor_id: "vendor-3",
      invoice_number: "INV-24003",
      invoice_date: now,
      subtotal: 980,
      tax: 0,
      total: 980,
      currency: "USD",
      status: "approved",
      created_at: now,
      updated_at: now,
    },
  ];
};

export default function OutletInvoiceGallery() {
  const outlets = Store.listOutlets() || [];
  const invoices = useMemo(() => mockInvoices(outlets), [outlets]);
  const [selectedOutlet, setSelectedOutlet] = useState(
    invoices.length > 0 ? (invoices[0]?.outlet_id ?? "") : "",
  );
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(
    invoices.length > 0 ? (invoices[0]?.id ?? "") : "",
  );
  const [imageMap, setImageMap] = useState<InvoiceMap>(() => {
    try {
      const stored = localStorage.getItem(IMAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(IMAGE_KEY, JSON.stringify(imageMap));
    } catch (error) {
      console.error("Failed to save invoice images:", error);
    }
  }, [imageMap]);

  const outletInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.outlet_id === selectedOutlet),
    [invoices, selectedOutlet],
  );

  useEffect(() => {
    if (!outletInvoices || outletInvoices.length === 0) {
      setSelectedInvoiceId("");
      return;
    }
    if (!outletInvoices.some((invoice) => invoice.id === selectedInvoiceId)) {
      const firstId = outletInvoices[0]?.id;
      if (firstId) {
        setSelectedInvoiceId(firstId);
      }
    }
  }, [outletInvoices, selectedInvoiceId]);

  const selectedInvoice = outletInvoices.find(
    (invoice) => invoice.id === selectedInvoiceId,
  );
  const images = selectedInvoice ? (imageMap[selectedInvoice.id] ?? []) : [];

  const handleUploadImage = async (file: File) => {
    if (!selectedInvoice) return;
    if (file.size > 10 * 1024 * 1024) {
      console.error("File too large (max 10MB)");
      return;
    }
    setLoading(true);
    try {
      const reader = new FileReader();
      const filePromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === "string") {
            resolve(result);
          } else {
            reject(new Error("Failed to read image"));
          }
        };
        reader.onerror = () => reject(new Error("Failed to read image"));
      });
      reader.readAsDataURL(file);
      const url = await filePromise;
      const nextImage: InvoiceImage = {
        id: `img-${Date.now()}`,
        invoice_id: selectedInvoice.id,
        url,
        uploaded_at: new Date().toISOString(),
      };
      setImageMap((prev) => ({
        ...prev,
        [selectedInvoice.id]: [nextImage, ...(prev[selectedInvoice.id] ?? [])],
      }));
    } catch (error) {
      console.error("Failed to upload image:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!selectedInvoice) return;
    setImageMap((prev) => ({
      ...prev,
      [selectedInvoice.id]: (prev[selectedInvoice.id] ?? []).filter(
        (img) => img.id !== imageId,
      ),
    }));
  };

  return (
    <div className="space-y-4">
      <Card className="border border-border bg-surface">
        <CardHeader>
          <CardTitle>Invoice Gallery</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-3">
            <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select outlet" />
              </SelectTrigger>
              <SelectContent>
                {outlets.length > 0 ? (
                  outlets.map((outlet) => (
                    <SelectItem key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No outlets available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <Select
              value={selectedInvoiceId}
              onValueChange={setSelectedInvoiceId}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select invoice" />
              </SelectTrigger>
              <SelectContent>
                {outletInvoices.length > 0 ? (
                  outletInvoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="none" disabled>
                    No invoices for this outlet
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <InvoiceImageVault
        selectedInvoice={selectedInvoice ?? null}
        images={images}
        isLoading={loading}
        onUploadImage={handleUploadImage}
        onDeleteImage={handleDeleteImage}
      />
    </div>
  );
}
