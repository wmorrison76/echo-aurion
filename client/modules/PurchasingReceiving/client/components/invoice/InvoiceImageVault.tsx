import React from "react";
/** * Invoice Image Vault * Outlet-scoped image gallery for invoices */ import {
  useState,
  useCallback,
} from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Upload, Trash2, Eye, X, FileImage, Loader } from "lucide-react";
import type { Invoice, InvoiceImage } from "@shared/types/invoices";
interface InvoiceImageVaultProps {
  selectedInvoice: Invoice | null;
  images: InvoiceImage[];
  isLoading: boolean;
  onUploadImage: (file: File) => Promise<void>;
  onDeleteImage: (imageId: string) => Promise<void>;
}
export function InvoiceImageVault({
  selectedInvoice,
  images,
  isLoading,
  onUploadImage,
  onDeleteImage,
}: InvoiceImageVaultProps) {
  const [previewImage, setPreviewImage] = useState<InvoiceImage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        await onUploadImage(file);
      } finally {
        setUploading(false);
      }
    },
    [onUploadImage],
  );
  if (!selectedInvoice) {
    return (
      <Card className="border border-slate-800/60 bg-card">
        {" "}
        <CardHeader className="pb-3">
          {" "}
          <CardTitle className="text-lg">Image Vault</CardTitle>{" "}
          <CardDescription className="text-sm text-slate-300">
            {" "}
            Select an invoice to view and manage images{" "}
          </CardDescription>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface py-12">
            {" "}
            <FileImage className="mb-3 h-10 w-10 text-foreground" />{" "}
            <p className="text-sm text-slate-400">No invoice selected</p>{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {" "}
      <Card className="border border-slate-800/60 bg-card">
        {" "}
        <CardHeader className="pb-2">
          {" "}
          <CardTitle className="text-sm">
            {" "}
            Invoice: {selectedInvoice.invoice_number}{" "}
          </CardTitle>{" "}
          <CardDescription className="text-xs">
            {" "}
            {new Date(selectedInvoice.invoice_date).toLocaleDateString()} •{""}{" "}
            {selectedInvoice.currency} {selectedInvoice.total.toFixed(2)}{" "}
          </CardDescription>{" "}
        </CardHeader>{" "}
      </Card>{" "}
      {/* Upload Section */}{" "}
      <Card className="border border-slate-800/60 bg-card">
        {" "}
        <CardHeader className="pb-3">
          {" "}
          <CardTitle className="text-sm">Upload Images</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <label className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface p-6 cursor-pointer hover:bg-surface transition-colors">
            {" "}
            <Upload className="h-6 w-6 text-slate-400" />{" "}
            <span className="text-sm font-medium text-slate-300">
              {" "}
              {uploading
                ? "Uploading..."
                : "Click to upload invoice image"}{" "}
            </span>{" "}
            <span className="text-xs text-foreground">
              {" "}
              JPG, PNG, or PDF • Max 10MB{" "}
            </span>{" "}
            <input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />{" "}
          </label>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Images Grid */}{" "}
      <Card className="border border-slate-800/60 bg-card">
        {" "}
        <CardHeader className="pb-3">
          {" "}
          <CardTitle className="text-sm">
            {" "}
            {isLoading ? "Loading..." : `Images (${images.length})`}{" "}
          </CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          {images.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface py-8 text-center">
              {" "}
              <FileImage className="mb-2 h-8 w-8 text-foreground" />{" "}
              <p className="text-sm text-slate-400">No images uploaded yet</p>{" "}
              <p className="text-xs text-foreground">
                {" "}
                Upload invoice images to get started{" "}
              </p>{" "}
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
              {" "}
              {images.map((image) => (
                <div
                  key={image.id}
                  className="group relative rounded-lg border border-border bg-surface overflow-hidden aspect-square"
                >
                  {" "}
                  <img
                    src={image.url}
                    alt={`Invoice page ${image.page_number}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />{" "}
                  {/* Overlay */}{" "}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {" "}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPreviewImage(image)}
                      className="gap-1"
                    >
                      {" "}
                      <Eye className="h-3.5 w-3.5" />{" "}
                    </Button>{" "}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteTarget(image.id)}
                      className="gap-1"
                    >
                      {" "}
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />{" "}
                    </Button>{" "}
                  </div>{" "}
                  {/* Page Badge */}{" "}
                  {image.page_number && (
                    <Badge
                      variant="secondary"
                      className="absolute top-2 left-2 text-xs"
                    >
                      {" "}
                      Page {image.page_number}{" "}
                    </Badge>
                  )}{" "}
                </div>
              ))}{" "}
            </div>
          )}{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Preview Modal */}{" "}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          {" "}
          <div className="relative max-h-[90vh] max-w-2xl rounded-lg overflow-auto bg-card">
            {" "}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPreviewImage(null)}
              aria-label="Close preview"
              className="absolute top-2 right-2 z-10"
            >
              {" "}
              <X className="h-4 w-4" />{" "}
            </Button>{" "}
            <img
              src={previewImage.url}
              alt="Preview"
              loading="lazy"
              className="w-full h-auto"
            />{" "}
            {previewImage.notes && (
              <div className="border-t border-border bg-surface p-3">
                {" "}
                <p className="text-sm text-slate-300">
                  {previewImage.notes}
                </p>{" "}
              </div>
            )}{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* Delete Confirmation */}{" "}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        {" "}
        <AlertDialogContent>
          {" "}
          <AlertDialogTitle>Delete Image?</AlertDialogTitle>{" "}
          <AlertDialogDescription>
            {" "}
            This action cannot be undone. The image will be permanently
            deleted.{" "}
          </AlertDialogDescription>{" "}
          <div className="flex gap-3 justify-end">
            {" "}
            <AlertDialogCancel>Cancel</AlertDialogCancel>{" "}
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  onDeleteImage(deleteTarget);
                  setDeleteTarget(null);
                }
              }}
            >
              {" "}
              Delete{" "}
            </AlertDialogAction>{" "}
          </div>{" "}
        </AlertDialogContent>{" "}
      </AlertDialog>{" "}
    </div>
  );
}
