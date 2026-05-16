import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, FileText, Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  downloadOrderAsCSV,
  downloadOrderAsJSON,
  copyOrderToClipboard,
  type PurchaseOrder,
} from "@/lib/order-export";
import { useToast } from "@/hooks/use-toast";

interface OrderExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: PurchaseOrder;
}

export function OrderExportDialog({
  open,
  onOpenChange,
  order,
}: OrderExportDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleDownloadCSV = () => {
    try {
      downloadOrderAsCSV(order);
      toast({
        title: "Downloaded",
        description: "Purchase order exported as CSV",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download CSV file",
        variant: "destructive",
      });
    }
  };

  const handleDownloadJSON = () => {
    try {
      downloadOrderAsJSON(order);
      toast({
        title: "Downloaded",
        description: "Purchase order exported as JSON",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download JSON file",
        variant: "destructive",
      });
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await copyOrderToClipboard(order);
      setCopied(true);
      toast({
        title: "Copied",
        description: "Order details copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Purchase Order
          </DialogTitle>
          <DialogDescription>
            PO #{order.poNumber || order.id} • {order.vendorName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Summary */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Vendor</p>
                <p className="font-semibold">{order.vendorName}</p>
              </div>
              <Badge variant="outline">{order.lineItems.length} items</Badge>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm font-medium">
                  {new Date(order.date).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-sm font-semibold text-[#c8a97e] dark:text-[#c8a97e]">
                  {order.currency} {order.total.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">EXPORT FORMAT</p>

            <motion.div layout className="space-y-2">
              <Button
                onClick={handleDownloadCSV}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <FileText className="h-4 w-4" />
                <div className="text-left">
                  <p className="text-sm font-medium">Download as CSV</p>
                  <p className="text-xs text-muted-foreground">
                    Excel or spreadsheet compatible
                  </p>
                </div>
              </Button>

              <Button
                onClick={handleDownloadJSON}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <FileText className="h-4 w-4" />
                <div className="text-left">
                  <p className="text-sm font-medium">Download as JSON</p>
                  <p className="text-xs text-muted-foreground">
                    Structured data format
                  </p>
                </div>
              </Button>

              <Button
                onClick={handleCopyToClipboard}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </motion.div>
                  ) : (
                    <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <Copy className="h-4 w-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="text-left">
                  <p className="text-sm font-medium">
                    {copied ? "Copied!" : "Copy to Clipboard"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Plain text format
                  </p>
                </div>
              </Button>
            </motion.div>
          </div>

          {/* Info */}
          <div className="rounded-lg bg-amber-50 dark:bg-neutral-950/30 p-3 space-y-2">
            <p className="text-xs font-semibold text-[#c8a97e]/30 dark:text-[#c8a97e]/80">
              💡 Tip
            </p>
            <p className="text-xs text-[#c8a97e]/40 dark:text-[#c8a97e]">
              Export this order to integrate with your purchasing system or share with
              suppliers via email.
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
