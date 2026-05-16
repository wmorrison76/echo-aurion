import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
export interface ShortageAlertRow {
  id: string;
  productName: string;
  outletName: string;
  vendor: string;
  poNumber: string;
  expectedQty: number;
  receivedQty: number;
  createdAt: string;
}
interface ShortagesWidgetProps {
  rows: ShortageAlertRow[];
}
const severityVariant = (
  expected: number,
  received: number,
): { variant: "default" | "secondary" | "destructive"; label: string } => {
  const delta = expected - received;
  if (delta <= 0) return { variant: "secondary", label: "Resolved" };
  const ratio = delta / expected;
  if (ratio >= 0.5) return { variant: "destructive", label: "Critical" };
  if (ratio >= 0.2) return { variant: "default", label: "High" };
  return { variant: "secondary", label: "Low" };
};
export function ShortagesWidget({ rows }: ShortagesWidgetProps) {
  if (!rows.length) {
    return (
      <p className="text-sm text-emerald-300">
        All recent receipts reconciled with no shortages.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {" "}
      <Table>
        {" "}
        <TableHeader className="bg-slate-700/40">
          {" "}
          <TableRow>
            {" "}
            <TableHead>Product</TableHead> <TableHead>Outlet</TableHead>{" "}
            <TableHead>Vendor</TableHead> <TableHead>Expected</TableHead>{" "}
            <TableHead>Received</TableHead> <TableHead>Severity</TableHead>{" "}
            <TableHead className="text-right">Flagged</TableHead>{" "}
          </TableRow>{" "}
        </TableHeader>{" "}
        <TableBody>
          {" "}
          {rows.map((row) => {
            const severity = severityVariant(row.expectedQty, row.receivedQty);
            const shortageQty = row.expectedQty - row.receivedQty;
            return (
              <TableRow key={row.id} className="border-b border-slate-800/40">
                {" "}
                <TableCell>
                  {" "}
                  <div className="flex flex-col">
                    {" "}
                    <span className="text-sm font-semibold text-slate-100">
                      {row.productName}
                    </span>{" "}
                    <span className="text-xs text-muted-foreground">
                      PO {row.poNumber}
                    </span>{" "}
                  </div>{" "}
                </TableCell>{" "}
                <TableCell className="text-sm text-slate-300">
                  {row.outletName}
                </TableCell>{" "}
                <TableCell className="text-sm text-slate-300">
                  {row.vendor}
                </TableCell>{" "}
                <TableCell className="text-sm text-slate-200">
                  {row.expectedQty.toLocaleString()}
                </TableCell>{" "}
                <TableCell className="text-sm text-slate-200">
                  {row.receivedQty.toLocaleString()}
                </TableCell>{" "}
                <TableCell>
                  {" "}
                  <Badge
                    variant={severity.variant}
                    className="rounded-full px-3 py-1 text-xs uppercase tracking-wide"
                  >
                    {" "}
                    {severity.label} · {shortageQty.toLocaleString()} short{" "}
                  </Badge>{" "}
                </TableCell>{" "}
                <TableCell className="text-right text-xs text-slate-400">
                  {" "}
                  {formatDistanceToNow(new Date(row.createdAt), {
                    addSuffix: true,
                  })}{" "}
                </TableCell>{" "}
              </TableRow>
            );
          })}{" "}
        </TableBody>{" "}
      </Table>{" "}
    </div>
  );
}
