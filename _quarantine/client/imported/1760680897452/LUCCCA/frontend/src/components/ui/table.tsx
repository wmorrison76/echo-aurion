import * as React from "react";

export const Table = (p: React.TableHTMLAttributes<HTMLTableElement>) => <table {...p} />;
export const TableHeader = (p: React.HTMLAttributes<HTMLTableSectionElement>) => <thead {...p} />;
export const TableBody = (p: React.HTMLAttributes<HTMLTableSectionElement>) => <tbody {...p} />;
export const TableFooter = (p: React.HTMLAttributes<HTMLTableSectionElement>) => <tfoot {...p} />;
export const TableRow = (p: React.HTMLAttributes<HTMLTableRowElement>) => <tr {...p} />;
export const TableHead = (p: React.ThHTMLAttributes<HTMLTableHeaderCellElement>) => <th {...p} />;
export const TableCell = (p: React.TdHTMLAttributes<HTMLTableCellElement>) => <td {...p} />;
export const TableCaption = (p: React.HTMLAttributes<HTMLTableCaptionElement>) => <caption {...p} />;
