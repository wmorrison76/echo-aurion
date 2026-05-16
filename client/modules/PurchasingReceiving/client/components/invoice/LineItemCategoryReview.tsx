import React, { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { StandardizedLineItem } from "@shared/api";
const CATEGORIES = [
  { id: "FOOD", label: "Food", color: "bg-green-500/20 text-green-300" },
  { id: "BEVERAGES", label: "Beverages", color: "bg-primary/20 text-primary" },
  {
    id: "NON_FOOD",
    label: "Non-Food",
    color: "bg-purple-500/20 text-purple-300",
  },
  {
    id: "PAPER_SUPPLIES",
    label: "Paper & Supplies",
    color: "bg-orange-500/20 text-orange-300",
  },
  { id: "EQUIPMENT", label: "Equipment", color: "bg-red-500/20 text-red-300" },
  {
    id: "MAINTENANCE",
    label: "Maintenance",
    color: "bg-yellow-500/20 text-yellow-300",
  },
  {
    id: "UTILITIES",
    label: "Utilities",
    color: "bg-cyan-500/20 text-cyan-300",
  },
  { id: "FUEL", label: "Fuel", color: "bg-amber-500/20 text-amber-300" },
  { id: "OTHER", label: "Other", color: "bg-slate-500/20 text-slate-300" },
];
interface LineItemWithCategory extends StandardizedLineItem {
  lineNumber: number;
  category?: string;
  categoryConfidence?: number;
  glCode?: string;
}
interface CategoryReview {
  approved: boolean;
  category: string;
  glCode?: string;
}
interface LineItemCategoryReviewProps {
  items: LineItemWithCategory[];
  onReviewComplete?: (reviews: Map<number, CategoryReview>) => void;
  glCodesByCategory?: Record<string, string>;
}
export function LineItemCategoryReview({
  items,
  onReviewComplete,
  glCodesByCategory,
}: LineItemCategoryReviewProps) {
  const [reviews, setReviews] = useState<Map<number, CategoryReview>>(
    new Map(),
  );
  const [focusedLineNumber, setFocusedLineNumber] = useState<number | null>(
    null,
  ); // Calculate review progress const reviewProgress = useMemo(() => { const reviewedCount = items.filter((item) => reviews.has(item.lineNumber)).length; return { reviewed: reviewedCount, total: items.length, percentage: Math.round((reviewedCount / items.length) * 100), }; }, [items, reviews]); // Group items by current category const itemsByCategory = useMemo(() => { const grouped = new Map<string, LineItemWithCategory[]>(); items.forEach((item) => { const category = item.category ||"OTHER"; if (!grouped.has(category)) { grouped.set(category, []); } grouped.get(category)!.push(item); }); return grouped; }, [items]); const handleCategoryChange = (lineNumber: number, newCategory: string) => { const review: CategoryReview = { approved: true, category: newCategory, glCode: glCodesByCategory?.[newCategory], }; setReviews(new Map(reviews).set(lineNumber, review)); }; const handleApprove = (lineNumber: number) => { const item = items.find((i) => i.lineNumber === lineNumber); if (!item) return; const review: CategoryReview = { approved: true, category: reviews.get(lineNumber)?.category || item.category ||"OTHER", glCode: glCodesByCategory?.[item.category ||"OTHER"], }; setReviews(new Map(reviews).set(lineNumber, review)); }; const handleSubmit = () => { if (onReviewComplete) { onReviewComplete(reviews); } }; const getCategoryLabel = (categoryId: string) => { return CATEGORIES.find((c) => c.id === categoryId)?.label || categoryId; }; const getCategoryColor = (categoryId: string) => { return CATEGORIES.find((c) => c.id === categoryId)?.color ||""; }; return ( <Card className="border border-cyan-500/20 bg-card"> <CardHeader className="pb-3"> <div className="flex items-start justify-between gap-4"> <div> <CardTitle className="text-lg">Line Item Categories</CardTitle> <CardDescription> Review and approve the category for each item. This helps categorize for inventory tracking and recipe costing. </CardDescription> </div> <div className="text-right"> <div className="text-2xl font-bold text-cyan-400">{reviewProgress.percentage}%</div> <div className="text-xs text-slate-400"> {reviewProgress.reviewed} of {reviewProgress.total} reviewed </div> </div> </div> {/* Progress Bar */} <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800"> <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300" style={{ width: `${reviewProgress.percentage}%` }} /> </div> </CardHeader> <CardContent className="space-y-4"> {/* Items grouped by current category */} {Array.from(itemsByCategory.entries()).map(([category, categoryItems]) => ( <div key={category} className="rounded border border-slate-800/60 bg-surface p-3"> {/* Category header */} <div className="mb-3 flex items-center gap-2"> <Badge className={getCategoryColor(category)}> {getCategoryLabel(category)} </Badge> <span className="text-xs text-slate-400">{categoryItems.length} item(s)</span> </div> {/* Items in this category */} <div className="space-y-2"> {categoryItems.map((item) => { const review = reviews.get(item.lineNumber); const isReviewed = !!review; const currentCategory = review?.category || item.category ||"OTHER"; return ( <div key={item.lineNumber} className="rounded border border-border bg-slate-800/30 p-2.5" onMouseEnter={() => setFocusedLineNumber(item.lineNumber)} onMouseLeave={() => setFocusedLineNumber(null)} > <div className="flex items-start justify-between gap-2"> <div className="flex-1 min-w-0"> <div className="flex items-center gap-2"> <span className="font-mono text-xs text-slate-400">#{item.lineNumber}</span> <p className="flex-1 truncate text-sm font-medium text-slate-200"> {item.productName} </p> </div> <div className="mt-1 flex items-center gap-2 text-xs text-slate-400"> <span>{item.quantityPurchaseUnit?.quantity} {item.quantityPurchaseUnit?.unit}</span> <span>•</span> <span className="font-mono">${item.totalCost.toFixed(2)}</span> </div> </div> {/* Status Indicator */} <div className="flex flex-col items-end gap-1"> {isReviewed ? ( <CheckCircle2 className="h-4 w-4 text-green-500" /> ) : item.categoryConfidence && item.categoryConfidence < 85 ? ( <AlertCircle className="h-4 w-4 text-yellow-500" /> ) : ( <div className="h-4 w-4" /> )} {item.categoryConfidence && ( <span className="text-xs text-muted-foreground"> {Math.round(item.categoryConfidence)}% confidence </span> )} </div> </div> {/* Category selector (expand on hover or focus) */} {focusedLineNumber === item.lineNumber && ( <div className="mt-2 space-y-2 border-t border-border pt-2"> <p className="text-xs font-medium text-slate-300">Select category:</p> <div className="grid grid-cols-3 gap-1.5"> {CATEGORIES.map((cat) => ( <button key={cat.id} onClick={() => handleCategoryChange(item.lineNumber, cat.id)} className={`rounded px-2 py-1 text-xs font-medium transition-all ${ currentCategory === cat.id ? `${cat.color} border border-current` :"border border-border bg-slate-800/50 text-slate-400 hover:bg-slate-700" }`} > {cat.label} </button> ))} </div> {/* GL Code display */} {glCodesByCategory?.[currentCategory] && ( <div className="mt-2 rounded bg-surface p-2"> <p className="text-xs text-slate-400">GL Code:</p> <p className="font-mono text-sm text-cyan-400"> {glCodesByCategory[currentCategory]} </p> </div> )} <Button size="sm" variant="default" onClick={() => handleApprove(item.lineNumber)} className="w-full" > Approve </Button> </div> )} </div> ); })} </div> </div> ))} {/* Submit Button */} {reviewProgress.reviewed === reviewProgress.total && reviewProgress.total > 0 && ( <Button onClick={handleSubmit} className="w-full gap-2 bg-green-600 hover:bg-green-700" > <CheckCircle2 className="h-4 w-4" /> Confirm All Categories </Button> )} </CardContent> </Card> );
}
