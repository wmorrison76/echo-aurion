import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";
import { Search, Download, Star, TrendingUp, Grid, List } from "lucide-react";
interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  category: "template" | "shape" | "collection";
  author: string;
  rating: number;
  downloads: number;
  tags: string[];
  preview: string;
  isOwned?: boolean;
}
interface MarketplaceProps {
  onItemSelected?: (item: MarketplaceItem) => void;
  currentUser?: string;
}
const FEATURED_ITEMS: MarketplaceItem[] = [
  {
    id: "template-kanban",
    name: "Kanban Board",
    description: "Organize tasks with the classic kanban methodology",
    category: "template",
    author: "LUCCCA",
    rating: 4.8,
    downloads: 1250,
    tags: ["productivity", "task-management"],
    preview: "📊",
  },
  {
    id: "template-wireframe",
    name: "UX Wireframe Kit",
    description: "Complete wireframe templates for app design",
    category: "template",
    author: "Design Community",
    rating: 4.9,
    downloads: 2100,
    tags: ["design", "ui-ux"],
    preview: "🎨",
  },
  {
    id: "shape-flowchart",
    name: "Flowchart Shapes",
    description: "Standard flowchart shapes and connectors",
    category: "shape",
    author: "LUCCCA",
    rating: 4.7,
    downloads: 890,
    tags: ["diagramming", "flowchart"],
    preview: "📈",
  },
  {
    id: "template-journey",
    name: "Customer Journey Map",
    description: "Map customer touchpoints and emotions",
    category: "template",
    author: "CX Expert",
    rating: 4.6,
    downloads: 650,
    tags: ["customer-experience", "mapping"],
    preview: "🗺️",
  },
  {
    id: "shape-connector-pack",
    name: "Advanced Connectors",
    description: "Curved, labeled, and annotated connector shapes",
    category: "shape",
    author: "LUCCCA",
    rating: 4.8,
    downloads: 1100,
    tags: ["connectors", "advanced"],
    preview: "🔗",
  },
  {
    id: "template-brainstorm",
    name: "Brainstorm Session",
    description: "Structured template for group ideation",
    category: "template",
    author: "Innovation Lab",
    rating: 4.5,
    downloads: 520,
    tags: ["ideation", "collaboration"],
    preview: "💡",
  },
];
export const Marketplace: React.FC<MarketplaceProps> = ({
  onItemSelected,
  currentUser,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"trending" | "newest" | "rating">(
    "trending",
  );
  const filteredItems = FEATURED_ITEMS.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    const matchesCategory =
      !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === "trending") return b.downloads - a.downloads;
    if (sortBy === "rating") return b.rating - a.rating;
    return 0;
  });
  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {" "}
      {/* Header */}{" "}
      <div className="border-b border-slate-200 dark:border-border p-6">
        {" "}
        <div className="flex items-center gap-3 mb-6">
          {" "}
          <TrendingUp className="w-8 h-8 text-primary dark:text-blue-400" />{" "}
          <h1 className="text-3xl font-bold text-foreground dark:text-white">
            {" "}
            Marketplace{" "}
          </h1>{" "}
        </div>{" "}
        {/* Search */}{" "}
        <div className="relative mb-4">
          {" "}
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />{" "}
          <input
            type="text"
            placeholder="Search templates, shapes, collections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cn(
              "w-full pl-10 pr-4 py-2 rounded-lg border",
              "bg-background dark:bg-slate-800",
              "border-slate-200 dark:border-border",
              "text-foreground dark:text-white",
              "placeholder-slate-400",
              "focus:outline-none focus:ring-2 focus:ring-blue-500",
            )}
          />{" "}
        </div>{" "}
        {/* Filters & Controls */}{" "}
        <div className="flex flex-wrap gap-3">
          {" "}
          {/* Category Filter */}{" "}
          <div className="flex gap-2">
            {" "}
            {["template", "shape", "collection"].map((cat) => (
              <Button
                key={cat}
                onClick={() =>
                  setSelectedCategory(selectedCategory === cat ? null : cat)
                }
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                className="capitalize"
              >
                {" "}
                {cat === "template" && "📄"} {cat === "shape" && "⬜"}{" "}
                {cat === "collection" && "📦"} {"" + cat}{" "}
              </Button>
            ))}{" "}
          </div>{" "}
          {/* Sort */}{" "}
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "trending" | "newest" | "rating")
            }
            className={cn(
              "px-3 py-1 rounded-lg border",
              "bg-background dark:bg-slate-800",
              "border-slate-200 dark:border-border",
              "text-foreground dark:text-white",
              "text-sm",
            )}
          >
            {" "}
            <option value="trending">Trending</option>{" "}
            <option value="rating">Highest Rated</option>{" "}
            <option value="newest">Newest</option>{" "}
          </select>{" "}
          {/* View Mode */}{" "}
          <div className="ml-auto flex gap-1">
            {" "}
            <Button
              onClick={() => setViewMode("grid")}
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
            >
              {" "}
              <Grid size={16} />{" "}
            </Button>{" "}
            <Button
              onClick={() => setViewMode("list")}
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
            >
              {" "}
              <List size={16} />{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Items Grid/List */}{" "}
      <div className="flex-1 overflow-y-auto p-6">
        {" "}
        {sortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            {" "}
            <Search className="w-12 h-12 text-slate-400 mb-4" />{" "}
            <p className="text-muted-foreground">
              {" "}
              No items found matching your search{" "}
            </p>{" "}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {" "}
            {sortedItems.map((item) => (
              <ItemCard key={item.id} item={item} onSelected={onItemSelected} />
            ))}{" "}
          </div>
        ) : (
          <div className="space-y-2">
            {" "}
            {sortedItems.map((item) => (
              <ItemRow key={item.id} item={item} onSelected={onItemSelected} />
            ))}{" "}
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
};
interface ItemCardProps {
  item: MarketplaceItem;
  onSelected?: (item: MarketplaceItem) => void;
}
function ItemCard({ item, onSelected }: ItemCardProps) {
  return (
    <div
      className={cn(
        "bg-background dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-border",
        "overflow-hidden hover:shadow-lg hover:border-primary dark:hover:border-primary transition-all",
      )}
    >
      {" "}
      {/* Preview */}{" "}
      <div className="h-32 bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-5xl">
        {" "}
        {item.preview}{" "}
      </div>{" "}
      {/* Content */}{" "}
      <div className="p-4">
        {" "}
        <h3 className="font-semibold text-foreground dark:text-white mb-1">
          {" "}
          {item.name}{" "}
        </h3>{" "}
        <p className="text-xs text-muted-foreground mb-3">
          {" "}
          {item.description}{" "}
        </p>{" "}
        {/* Meta */}{" "}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          {" "}
          <div className="flex items-center gap-1">
            {" "}
            <Star
              size={12}
              className="text-yellow-500"
              fill="currentColor"
            />{" "}
            <span>{item.rating}</span>{" "}
            <span>({item.downloads.toLocaleString()} downloads)</span>{" "}
          </div>{" "}
        </div>{" "}
        {/* Tags */}{" "}
        <div className="flex flex-wrap gap-1 mb-3">
          {" "}
          {item.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-primary rounded"
            >
              {" "}
              {tag}{" "}
            </span>
          ))}{" "}
        </div>{" "}
        {/* Button */}{" "}
        <Button
          onClick={() => onSelected?.(item)}
          className="w-full gap-2 bg-primary hover:opacity-90"
          size="sm"
        >
          {" "}
          <Download size={14} /> {item.isOwned ? "Use" : "Download"}{" "}
        </Button>{" "}
      </div>{" "}
    </div>
  );
}
function ItemRow({ item, onSelected }: ItemCardProps) {
  return (
    <div
      className={cn(
        "bg-background dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-border",
        "p-4 flex items-center gap-4 hover:shadow-md hover:border-primary dark:hover:border-primary transition-all",
      )}
    >
      {" "}
      <div className="text-4xl">{item.preview}</div>{" "}
      <div className="flex-1 min-w-0">
        {" "}
        <h3 className="font-semibold text-foreground dark:text-white">
          {" "}
          {item.name}{" "}
        </h3>{" "}
        <p className="text-sm text-muted-foreground mb-2">
          {" "}
          {item.description}{" "}
        </p>{" "}
        <div className="flex gap-2">
          {" "}
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-primary px-2 py-0.5 rounded"
            >
              {" "}
              {tag}{" "}
            </span>
          ))}{" "}
        </div>{" "}
      </div>{" "}
      <div className="flex items-center gap-4 flex-shrink-0">
        {" "}
        <div className="text-right">
          {" "}
          <div className="flex items-center gap-1 text-sm">
            {" "}
            <Star
              size={14}
              className="text-yellow-500"
              fill="currentColor"
            />{" "}
            <span className="font-semibold">{item.rating}</span>{" "}
          </div>{" "}
          <p className="text-xs text-muted-foreground">
            {" "}
            {item.downloads.toLocaleString()} downloads{" "}
          </p>{" "}
        </div>{" "}
        <Button
          onClick={() => onSelected?.(item)}
          className="gap-2 bg-primary hover:opacity-90"
          size="sm"
        >
          {" "}
          <Download size={14} /> {item.isOwned ? "Use" : "Get"}{" "}
        </Button>{" "}
      </div>{" "}
    </div>
  );
}
export default Marketplace;
