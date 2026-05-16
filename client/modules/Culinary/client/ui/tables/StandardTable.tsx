import React from "react";

export interface ColumnDef<T = any> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface StandardTableProps<T = any> {
  columns: ColumnDef<T>[];
  rows: T[];
  emptyState?: string;
  className?: string;
  onRowClick?: (row: T) => void;
}

export function StandardTable<T extends Record<string, any>>({
  columns,
  rows,
  emptyState = "No data",
  className = "",
  onRowClick,
}: StandardTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        {emptyState}
      </div>
    );
  }

  return (
    <div className={`overflow-auto ${className}`}>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-left px-2 py-1.5 font-semibold uppercase tracking-wider text-muted-foreground ${col.className ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id ?? i}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-border/30 hover:bg-muted/30 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-2 py-1.5 ${col.className ?? ""}`}
                >
                  {col.render ? col.render(row) : String(row[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
