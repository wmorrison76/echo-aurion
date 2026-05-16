import React from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right";
};

type StandardTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  emptyState?: string;
  className?: string;
};

export function StandardTable<T>({
  columns,
  rows,
  emptyState = "No records found.",
  className,
}: StandardTableProps<T>) {
  return (
    <div className={cn("rounded-xl border border-border/70 bg-background", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn("text-xs uppercase tracking-[0.2em]", col.align === "right" && "text-right")}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-8 text-center text-sm text-muted-foreground">
                {emptyState}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, rowIdx) => (
              <TableRow key={rowIdx}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={cn(col.align === "right" && "text-right")}>
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
