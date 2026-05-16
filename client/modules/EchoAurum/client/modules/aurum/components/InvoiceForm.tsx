import React, { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Upload, X } from "lucide-react";
import type { APInvoice } from "../../../shared/aurum";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAPOperations } from "../hooks/useAPOperations";
export function InvoiceForm({
  entityId,
  onSuccess,
  onCancel,
}: {
  entityId: string;
  onSuccess?: (invoice: APInvoice) => void;
  onCancel?: () => void;
}) {
  const [formData, setFormData] = useState({
    vendorName: "",
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    amount: "",
    poNumber: "",
    currency: "USD",
  });
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { createInvoice, loading, error: apiError } = useAPOperations();
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          file: "File size must be less than 10MB",
        }));
      } else {
        setFile(selectedFile);
        if (errors.file) {
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors.file;
            return newErrors;
          });
        }
      }
    }
  };
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.vendorName.trim())
      newErrors.vendorName = "Vendor name is required";
    if (!formData.invoiceNumber.trim())
      newErrors.invoiceNumber = "Invoice number is required";
    if (!formData.invoiceDate)
      newErrors.invoiceDate = "Invoice date is required";
    if (!formData.amount || parseFloat(formData.amount) <= 0)
      newErrors.amount = "Amount must be greater than 0";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    const invoiceData: Omit<APInvoice, "id" | "createdAt" | "updatedAt"> = {
      entityId,
      vendorName: formData.vendorName,
      vendorId: `vendor_${Date.now()}`,
      invoiceNumber: formData.invoiceNumber,
      invoiceDate: formData.invoiceDate,
      dueDate: formData.dueDate || undefined,
      amount: parseFloat(formData.amount),
      poNumber: formData.poNumber || undefined,
      currency: formData.currency as "USD" | "EUR" | "GBP",
      status: "received",
      matchStatus: "unmatched",
      OCRConfidence: 1.0,
    };
    const result = await createInvoice(invoiceData);
    if (result) {
      setFormData({
        vendorName: "",
        invoiceNumber: "",
        invoiceDate: new Date().toISOString().split("T")[0],
        dueDate: "",
        amount: "",
        poNumber: "",
        currency: "USD",
      });
      setFile(null);
      onSuccess?.(result.invoice);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {" "}
      {/* File Upload */}{" "}
      <div className="rounded-lg border-2 border-dashed border-border/40 bg-surface/30 p-8 text-center">
        {" "}
        <input
          type="file"
          id="invoice-file"
          accept="image/*,.pdf"
          onChange={handleFileChange}
          className="hidden"
        />{" "}
        <label htmlFor="invoice-file" className="cursor-pointer">
          {" "}
          <div className="space-y-2">
            {" "}
            <div className="flex justify-center">
              {" "}
              {file ? (
                <CheckCircle2 className="h-12 w-12 text-emerald-300" />
              ) : (
                <Upload className="h-12 w-12 text-muted-foreground" />
              )}{" "}
            </div>{" "}
            <p className="text-sm font-semibold text-foreground">
              {" "}
              {file ? file.name : "Upload invoice document"}{" "}
            </p>{" "}
            <p className="text-xs text-muted-foreground">
              {" "}
              PDF, PNG, JPG (max 10MB){" "}
            </p>{" "}
          </div>{" "}
        </label>{" "}
        {file && (
          <button
            type="button"
            onClick={() => setFile(null)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-surface/60 px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            {" "}
            <X className="h-3 w-3" /> Remove file{" "}
          </button>
        )}{" "}
      </div>{" "}
      {/* Form Fields Grid */}{" "}
      <div className="grid gap-4 sm:grid-cols-2">
        {" "}
        <div>
          {" "}
          <label className="block text-sm font-semibold text-foreground mb-2">
            {" "}
            Vendor Name *{" "}
          </label>{" "}
          <Input
            name="vendorName"
            value={formData.vendorName}
            onChange={handleInputChange}
            placeholder="e.g., Sysco"
            className={errors.vendorName ? "border-red-500/60" : ""}
          />{" "}
          {errors.vendorName && (
            <p className="mt-1 text-xs text-red-300">{errors.vendorName}</p>
          )}{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="block text-sm font-semibold text-foreground mb-2">
            {" "}
            Invoice Number *{" "}
          </label>{" "}
          <Input
            name="invoiceNumber"
            value={formData.invoiceNumber}
            onChange={handleInputChange}
            placeholder="e.g., INV-2024-4521"
            className={errors.invoiceNumber ? "border-red-500/60" : ""}
          />{" "}
          {errors.invoiceNumber && (
            <p className="mt-1 text-xs text-red-300">{errors.invoiceNumber}</p>
          )}{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="block text-sm font-semibold text-foreground mb-2">
            {" "}
            Invoice Date *{" "}
          </label>{" "}
          <Input
            type="date"
            name="invoiceDate"
            value={formData.invoiceDate}
            onChange={handleInputChange}
            className={errors.invoiceDate ? "border-red-500/60" : ""}
          />{" "}
          {errors.invoiceDate && (
            <p className="mt-1 text-xs text-red-300">{errors.invoiceDate}</p>
          )}{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="block text-sm font-semibold text-foreground mb-2">
            {" "}
            Due Date{" "}
          </label>{" "}
          <Input
            type="date"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleInputChange}
          />{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="block text-sm font-semibold text-foreground mb-2">
            {" "}
            Amount *{" "}
          </label>{" "}
          <div className="flex gap-2">
            {" "}
            <Input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.01"
              className={cn("flex-1", errors.amount ? "border-red-500/60" : "")}
            />{" "}
            <select
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              className="rounded-lg border border-border/40 bg-surface/60 px-3 py-2 text-sm font-semibold text-foreground"
            >
              {" "}
              <option value="USD">USD</option> <option value="EUR">EUR</option>{" "}
              <option value="GBP">GBP</option>{" "}
            </select>{" "}
          </div>{" "}
          {errors.amount && (
            <p className="mt-1 text-xs text-red-300">{errors.amount}</p>
          )}{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="block text-sm font-semibold text-foreground mb-2">
            {" "}
            PO Number{" "}
          </label>{" "}
          <Input
            name="poNumber"
            value={formData.poNumber}
            onChange={handleInputChange}
            placeholder="e.g., PO-2024-1234"
          />{" "}
        </div>{" "}
      </div>{" "}
      {/* Error Messages */}{" "}
      {apiError && (
        <div className="flex gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          {" "}
          <AlertCircle className="h-5 w-5 text-red-300 flex-shrink-0 mt-0.5" />{" "}
          <div>
            {" "}
            <p className="font-semibold text-red-200">Error</p>{" "}
            <p className="text-sm text-red-300/80">{apiError.message}</p>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Form Actions */}{" "}
      <div className="flex gap-3 pt-4">
        {" "}
        <Button type="submit" disabled={loading} className="flex-1">
          {" "}
          {loading ? (
            <>
              {" "}
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating
              Invoice...{" "}
            </>
          ) : (
            "Create Invoice"
          )}{" "}
        </Button>{" "}
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            {" "}
            Cancel{" "}
          </Button>
        )}{" "}
      </div>{" "}
    </form>
  );
}
