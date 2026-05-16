import React, { useEffect, useMemo, useState } from "react";
import { ScannedInvoice } from "@shared/api";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InvoiceReviewDialog } from "@/components/invoice/InvoiceReviewDialog";
interface Props {
  scans: ScannedInvoice[];
  outletNameByScan: Record<string, string>;
  outlets: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
  onApprove: (scan: ScannedInvoice, resolvedOutletName: string) => void;
  onHold: (scan: ScannedInvoice) => void;
  onReject: (scan: ScannedInvoice) => void;
  setOutletName: (scanId: string, name: string) => void;
  onChangeScan: (scan: ScannedInvoice) => void;
}
export function InvoiceReviewList({
  scans,
  outletNameByScan,
  outlets,
  vendors,
  onApprove,
  onHold,
  onReject,
  setOutletName,
  onChangeScan,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const list = useMemo(
    () => scans.filter((s) => s.status !== "approved"),
    [scans],
  );
  const activeIndex = activeId ? list.findIndex((s) => s.id === activeId) : -1;
  const active = activeIndex >= 0 ? list[activeIndex] : null;
  useEffect(() => {
    if (activeId && activeIndex === -1) {
      setActiveId(null);
    }
  }, [activeId, activeIndex]);
  return (
    <div className="rounded-lg border">
      {" "}
      <Table className="text-sm">
        {" "}
        <TableHeader>
          {" "}
          <TableRow>
            {" "}
            <TableHead className="w-[2ch]"></TableHead>{" "}
            <TableHead>Date</TableHead> <TableHead>Vendor</TableHead>{" "}
            <TableHead>Lines</TableHead> <TableHead>Outlet</TableHead>{" "}
            <TableHead>Status</TableHead> <TableHead>SLA</TableHead>{" "}
            <TableHead></TableHead>{" "}
          </TableRow>{" "}
        </TableHeader>{" "}
        <TableBody>
          {" "}
          {list.map((s) => {
            const outletName =
              outlets.find((o) => o.id === s.outletId)?.name ||
              outletNameByScan[s.id] ||
              "";
            const isNewVendor = !vendors.find(
              (v) => v.name.toLowerCase() === s.vendorName.toLowerCase(),
            );
            const overdue =
              Date.now() - new Date(s.createdAt).getTime() >
                24 * 60 * 60 * 1000 && s.status !== "approved";
            const isExpanded = expandedId === s.id;
            const isActive = activeId === s.id;
            const statusLabel = s.status.replace("_", "");
            const statusVariant =
              s.status === "approved"
                ? "default"
                : s.status === "rejected"
                  ? "destructive"
                  : s.status === "hold"
                    ? "outline"
                    : "secondary";
            return (
              <Fragment key={s.id}>
                {" "}
                <TableRow
                  key={s.id}
                  data-id={s.id}
                  onClick={(e) => {
                    const t = e.target as HTMLElement;
                    const tag = t.closest("button, input, a, select, textarea");
                    if (!tag) setActiveId(s.id);
                  }}
                  className={cn(
                    "cursor-pointer transition-colors",
                    isActive ? "bg-muted" : "hover:bg-muted/50",
                  )}
                >
                  {" "}
                  <TableCell className="p-0 text-center align-middle">
                    {" "}
                    <button
                      aria-label={isExpanded ? "Collapse" : "Expand"}
                      className="mx-2 inline-flex h-7 w-7 items-center justify-center rounded border"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId((id) => (id === s.id ? null : s.id));
                      }}
                    >
                      {" "}
                      <svg width="16" height="16" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d={isExpanded ? "M7 15l5-5l5 5z" : "M7 10l5 5l5-5z"}
                        />
                      </svg>{" "}
                    </button>{" "}
                  </TableCell>{" "}
                  <TableCell className="whitespace-nowrap">
                    {new Date(s.createdAt).toLocaleString()}
                  </TableCell>{" "}
                  <TableCell>
                    {" "}
                    <div className="flex items-center gap-2">
                      {" "}
                      <span>{s.vendorName}</span>{" "}
                      {isNewVendor && (
                        <Badge variant="outline">New Vendor</Badge>
                      )}{" "}
                    </div>{" "}
                  </TableCell>{" "}
                  <TableCell>{s.result.standardized.length}</TableCell>{" "}
                  <TableCell>
                    {" "}
                    <Input
                      placeholder="Outlet name"
                      value={outletName}
                      onChange={(e) => setOutletName(s.id, e.target.value)}
                      className="h-9 text-sm"
                    />{" "}
                  </TableCell>{" "}
                  <TableCell>
                    {" "}
                    <Badge variant={statusVariant} className="capitalize">
                      {statusLabel}
                    </Badge>{" "}
                  </TableCell>{" "}
                  <TableCell>
                    {" "}
                    {overdue ? (
                      <span className="inline-flex items-center">
                        <span className="mr-2">
                          <svg width="10" height="10">
                            <circle
                              cx="5"
                              cy="5"
                              r="5"
                              fill="currentColor"
                              className="text-yellow-500"
                            />
                          </svg>
                        </span>
                        Overdue
                      </span>
                    ) : (
                      <span className="text-[0.7rem] text-muted-foreground">
                        Same-day
                      </span>
                    )}{" "}
                  </TableCell>{" "}
                  <TableCell className="space-x-1.5 text-right">
                    {" "}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onHold(s);
                      }}
                    >
                      Hold
                    </Button>{" "}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReject(s);
                      }}
                    >
                      Reject
                    </Button>{" "}
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onApprove(s, outletName);
                      }}
                    >
                      Approve
                    </Button>{" "}
                  </TableCell>{" "}
                </TableRow>{" "}
              </Fragment>
            );
          })}{" "}
          {!list.length && (
            <TableRow>
              {" "}
              <TableCell
                colSpan={8}
                className="text-center text-sm text-muted-foreground"
              >
                No scans yet. Upload invoices to begin.
              </TableCell>{" "}
            </TableRow>
          )}{" "}
        </TableBody>{" "}
      </Table>{" "}
      <InvoiceReviewDialog
        open={!!active}
        onOpenChange={(o) => {
          if (!o) setActiveId(null);
        }}
        scans={list}
        activeIndex={activeIndex}
        onNavigate={(direction) => {
          if (activeIndex < 0) return;
          const next = direction === "prev" ? activeIndex - 1 : activeIndex + 1;
          if (next >= 0 && next < list.length) setActiveId(list[next].id);
        }}
        scan={active}
        outletName={
          active
            ? outlets.find((o) => o.id === active.outletId)?.name ||
              outletNameByScan[active.id] ||
              ""
            : ""
        }
        setOutletName={(name) => {
          if (active) setOutletName(active.id, name);
        }}
        onChangeScan={onChangeScan}
        onHold={onHold}
        onReject={onReject}
        onApprove={(scan, outletName) => onApprove(scan, outletName)}
      />{" "}
    </div>
  );
}
