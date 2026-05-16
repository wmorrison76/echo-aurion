import React, { useState } from "react";
import { FileText, Plus, Search, Filter, AlertCircle, CheckCircle2 } from "lucide-react";

interface Invoice {
  id: string;
  vendor: string;
  amount: number;
  date: string;
  dueDate: string;
  status: "pending" | "approved" | "paid";
  lineItems: number;
}

export interface InvoiceHandlingPanelProps {
  panelId?: string;
}

export function InvoiceHandlingPanel({ panelId = "INV-1" }: InvoiceHandlingPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "paid">("pending");

  // Mock invoice data
  const invoices: Invoice[] = [
    {
      id: "INV-001",
      vendor: "Fresh Produce Co",
      amount: 2450.00,
      date: "2024-01-15",
      dueDate: "2024-02-15",
      status: "pending",
      lineItems: 12,
    },
    {
      id: "INV-002",
      vendor: "Premium Meats Inc",
      amount: 3200.00,
      date: "2024-01-14",
      dueDate: "2024-02-14",
      status: "approved",
      lineItems: 8,
    },
    {
      id: "INV-003",
      vendor: "Dairy Direct",
      amount: 1850.00,
      date: "2024-01-10",
      dueDate: "2024-02-10",
      status: "paid",
      lineItems: 15,
    },
  ];

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === "all" || inv.status === filter;
    return matchesSearch && matchesFilter;
  });

  const statusColor = {
    pending: "bg-amber-500/20 text-amber-600",
    approved: "bg-blue-500/20 text-blue-600",
    paid: "bg-emerald-500/20 text-emerald-600",
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-6 w-6 text-blue-400" />
          <h1 className="text-2xl font-bold">Invoice Processing</h1>
        </div>
        <p className="text-slate-400">Manage vendor invoices and payment processing</p>
      </div>

      {/* Toolbar */}
      <div className="p-4 border-b border-slate-700 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by vendor or invoice number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 rounded-lg border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Upload Invoice
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(["all", "pending", "approved", "paid"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === status
                  ? "bg-blue-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-slate-800 border-b border-slate-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Invoice</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Vendor</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Due Date</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-400 uppercase">Status</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-slate-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {filteredInvoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-slate-700/50 transition-colors">
                <td className="px-6 py-4 font-mono text-sm">{invoice.id}</td>
                <td className="px-6 py-4">{invoice.vendor}</td>
                <td className="px-6 py-4 text-right font-semibold">${invoice.amount.toFixed(2)}</td>
                <td className="px-6 py-4 text-sm text-slate-400">{invoice.dueDate}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor[invoice.status]}`}>
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                    Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-slate-700 rounded-lg">
            <p className="text-slate-400 text-xs font-medium mb-1">PENDING</p>
            <p className="text-xl font-bold text-amber-400">$2,450</p>
          </div>
          <div className="p-3 bg-slate-700 rounded-lg">
            <p className="text-slate-400 text-xs font-medium mb-1">APPROVED</p>
            <p className="text-xl font-bold text-blue-400">$3,200</p>
          </div>
          <div className="p-3 bg-slate-700 rounded-lg">
            <p className="text-slate-400 text-xs font-medium mb-1">TOTAL PROCESSED</p>
            <p className="text-xl font-bold text-emerald-400">$7,500</p>
          </div>
        </div>
      </div>
    </div>
  );
}
