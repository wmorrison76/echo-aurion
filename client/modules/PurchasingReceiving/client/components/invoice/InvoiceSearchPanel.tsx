import React from "react";
/** * Invoice Search Panel * Searchable invoice interface with GL code categories, vendor filtering, and recent searches */ import {
  useState,
  useCallback,
  memo,
} from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Clock, X } from "lucide-react";
import type { Invoice, GLCodeCategory, Vendor } from "@shared/types/invoices";
interface InvoiceSearchPanelProps {
  invoices?: Invoice[];
  vendors?: Vendor[];
  glCategories?: GLCodeCategory[];
  isLoading?: boolean;
  isSearching?: boolean;
  recentSearches?: {
    category: string;
    searches: {
      vendorId?: string;
      glCategory?: GLCodeCategory;
      searchTerm?: string;
      timestamp: string;
    }[];
  }[];
  onSearch?: (query: string, filters: any) => Promise<void>;
  onInvoiceSelect?: (invoice: Invoice) => void;
}
const GL_CATEGORY_LABELS: Record<GLCodeCategory, string> = {
  FOOD: "🥘 Food",
  BEVERAGES: "🥤 Beverages",
  NON_FOOD: "📦 Non-Food",
  PAPER_SUPPLIES: "📋 Paper & Disposables",
  EQUIPMENT: "🔧 Equipment",
  MAINTENANCE: "🧹 Maintenance",
  UTILITIES: "⚡ Utilities",
  OTHER: "📌 Other",
};
function InvoiceSearchPanelComponent({
  invoices = [],
  vendors = [],
  glCategories = [],
  isLoading = false,
  isSearching = false,
  recentSearches = [],
  onSearch = async () => {},
  onInvoiceSelect = () => {},
}: InvoiceSearchPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<string>("all-vendors");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const handleSearch = useCallback(async () => {
    if (onSearch)
      await onSearch(searchTerm, {
        vendorId:
          selectedVendor && selectedVendor !== "all-vendors"
            ? selectedVendor
            : undefined,
        glCategory:
          selectedCategory && selectedCategory !== "all"
            ? (selectedCategory as any)
            : undefined,
      });
  }, [searchTerm, selectedVendor, selectedCategory, onSearch]);
  const handleRecentSearchClick = useCallback(
    async (
      vendorId?: string,
      glCategory?: GLCodeCategory,
      searchTerm?: string,
    ) => {
      setSearchTerm(searchTerm || "");
      setSelectedVendor(vendorId || "all-vendors");
      setSelectedCategory(glCategory || "all");
      if (onSearch) await onSearch(searchTerm || "", { vendorId, glCategory });
    },
    [onSearch],
  );
  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedVendor("all-vendors");
    setSelectedCategory("all");
  }, []);
  const hasActiveFilters =
    searchTerm ||
    (selectedVendor && selectedVendor !== "all-vendors") ||
    (selectedCategory && selectedCategory !== "all");
  return (
    <div className="space-y-4">
      {" "}
      {/* Search Bar */}{" "}
      <Card className="border border-slate-800/60 bg-card">
        {" "}
        <CardHeader className="pb-3">
          {" "}
          <CardTitle className="text-lg">Search Invoices</CardTitle>{" "}
          <CardDescription className="text-sm text-slate-300">
            {" "}
            Find invoices by vendor name, item description, or invoice
            number{" "}
          </CardDescription>{" "}
        </CardHeader>{" "}
        <CardContent className="space-y-3">
          {" "}
          <div className="flex gap-2">
            {" "}
            <div className="flex-1">
              {" "}
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="border border-border bg-surface"
              />{" "}
            </div>{" "}
            <Button
              onClick={handleSearch}
              disabled={isLoading}
              className="gap-2"
            >
              {" "}
              <Search className="h-4 w-4" /> Search{" "}
            </Button>{" "}
          </div>{" "}
          {/* Filters Toggle */}{" "}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2 text-xs"
          >
            {" "}
            <Filter className="h-3.5 w-3.5" /> Filters{" "}
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1">
                {" "}
                {[
                  selectedVendor !== "all-vendors" ? 1 : 0,
                  selectedCategory !== "all" ? 1 : 0,
                ].reduce((a, b) => a + b, 0)}{" "}
              </Badge>
            )}{" "}
          </Button>{" "}
          {/* Filter Section */}{" "}
          {showFilters && (
            <div className="space-y-3 rounded-lg border border-border bg-surface p-3">
              {" "}
              <div className="grid grid-cols-2 gap-3">
                {" "}
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  {" "}
                  <SelectTrigger className="text-xs">
                    {" "}
                    <SelectValue placeholder="All Categories" />{" "}
                  </SelectTrigger>{" "}
                  <SelectContent>
                    {" "}
                    <SelectItem value="all">All Categories</SelectItem>{" "}
                    {glCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {" "}
                        {GL_CATEGORY_LABELS[cat]}{" "}
                      </SelectItem>
                    ))}{" "}
                  </SelectContent>{" "}
                </Select>{" "}
                <Select
                  value={selectedVendor}
                  onValueChange={setSelectedVendor}
                >
                  {" "}
                  <SelectTrigger className="text-xs">
                    {" "}
                    <SelectValue placeholder="All Vendors" />{" "}
                  </SelectTrigger>{" "}
                  <SelectContent>
                    {" "}
                    <SelectItem value="all-vendors">
                      All Vendors
                    </SelectItem>{" "}
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {" "}
                        {vendor.name}{" "}
                      </SelectItem>
                    ))}{" "}
                  </SelectContent>{" "}
                </Select>{" "}
              </div>{" "}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="w-full gap-2 text-xs"
                >
                  {" "}
                  <X className="h-3.5 w-3.5" /> Clear Filters{" "}
                </Button>
              )}{" "}
            </div>
          )}{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Recent Searches */}{" "}
      {recentSearches.length > 0 && (
        <Card className="border border-slate-800/60 bg-card">
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <div className="flex items-center gap-2">
              {" "}
              <Clock className="h-4 w-4 text-slate-400" />{" "}
              <CardTitle className="text-sm">Recent Searches</CardTitle>{" "}
            </div>{" "}
          </CardHeader>{" "}
          <CardContent className="space-y-2">
            {" "}
            {recentSearches.map((group, idx) => (
              <div key={`${group.category}-${idx}`}>
                {" "}
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                  {" "}
                  {group.category}{" "}
                </p>{" "}
                <div className="flex flex-wrap gap-2">
                  {" "}
                  {group.searches.slice(0, 5).map((search, sidx) => (
                    <Button
                      key={`${group.category}-${sidx}`}
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleRecentSearchClick(
                          search.vendorId,
                          search.glCategory,
                          search.searchTerm,
                        )
                      }
                      className="text-xs h-8"
                    >
                      {" "}
                      {search.searchTerm ||
                        (search.glCategory
                          ? GL_CATEGORY_LABELS[search.glCategory]
                          : vendors.find((v) => v.id === search.vendorId)
                              ?.name)}{" "}
                    </Button>
                  ))}{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
      {/* Results */}{" "}
      <Card className="border border-slate-800/60 bg-card">
        {" "}
        <CardHeader className="pb-3">
          {" "}
          <CardTitle className="text-sm">
            {" "}
            {isLoading ? "Loading..." : `Results (${invoices.length})`}{" "}
          </CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface py-6 text-center">
              {" "}
              <Search className="mb-2 h-8 w-8 text-foreground" />{" "}
              <p className="text-sm text-slate-400">No invoices found</p>{" "}
              <p className="text-xs text-foreground">
                {" "}
                Try adjusting your search or filters{" "}
              </p>{" "}
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {" "}
              {invoices.map((invoice) => (
                <Button
                  key={invoice.id}
                  variant="ghost"
                  onClick={() => onInvoiceSelect?.(invoice)}
                  className="w-full justify-start h-auto flex-col items-start gap-1 rounded-lg border border-border bg-surface p-3 hover:bg-slate-800/60"
                >
                  {" "}
                  <div className="flex w-full items-center justify-between">
                    {" "}
                    <span className="font-semibold text-slate-100 text-sm">
                      {" "}
                      {invoice.invoice_number}{" "}
                    </span>{" "}
                    <Badge variant="outline" className="text-xs">
                      {" "}
                      {invoice.status}{" "}
                    </Badge>{" "}
                  </div>{" "}
                  <div className="w-full text-left">
                    {" "}
                    <p className="text-xs text-slate-400">
                      {" "}
                      {vendors.find((v) => v.id === invoice.vendor_id)?.name ||
                        "Unknown Vendor"}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div className="flex w-full items-center justify-between pt-1">
                    {" "}
                    <span className="text-xs text-foreground">
                      {" "}
                      {new Date(invoice.invoice_date).toLocaleDateString()}{" "}
                    </span>{" "}
                    <span className="font-semibold text-emerald-400 text-sm">
                      {" "}
                      {invoice.currency} {invoice.total.toFixed(2)}{" "}
                    </span>{" "}
                  </div>{" "}
                </Button>
              ))}{" "}
            </div>
          )}{" "}
        </CardContent>{" "}
      </Card>{" "}
    </div>
  );
}
export const InvoiceSearchPanel = memo(InvoiceSearchPanelComponent);
