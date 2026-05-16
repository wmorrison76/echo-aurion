import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, RefreshCw, CheckCircle } from "lucide-react";
import { useInvoiceTemplates } from "@/hooks/useInvoiceTemplates";
import type { InvoiceTemplate } from "@/hooks/useInvoiceTemplates";
interface InvoiceTemplatePanelProps {
  selectedVendor?: string;
  organizationId?: string;
  onTemplateSelect?: (template: InvoiceTemplate) => void;
  onApplyTemplate?: (vendor: string) => Promise<void>;
  isLoading?: boolean;
}
export function InvoiceTemplatePanel({
  selectedVendor,
  organizationId,
  onTemplateSelect,
  onApplyTemplate,
  isLoading = false,
}: InvoiceTemplatePanelProps) {
  const { templates, loading, error, findBestTemplate } =
    useInvoiceTemplates(organizationId);
  const [selectedTemplate, setSelectedTemplate] =
    useState<InvoiceTemplate | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  console.log("[InvoiceTemplatePanel] Rendered with:", {
    organizationId,
    selectedVendor,
    templatesCount: templates.length,
    loading,
    error,
  }); // Auto-select best template for selected vendor useEffect(() => { if (selectedVendor && templates.length > 0) { const best = findBestTemplate(selectedVendor); if (best) { setSelectedTemplate(best); } } }, [selectedVendor, findBestTemplate, templates.length]); const handleApplyTemplate = async () => { if (!selectedTemplate || !onApplyTemplate) return; setApplying(true); setApplyError(null); try { await onApplyTemplate(selectedTemplate.vendor_name); } catch (err) { const message = err instanceof Error ? err.message : String(err); setApplyError(message); } finally { setApplying(false); } }; // Don't show template panel if no templates are available and not loading if (!templates.length && !loading && !error) { return null; } return ( <Card className="border border-slate-800/60 bg-card"> <CardHeader className="pb-3"> <div className="flex items-center gap-2"> <BookOpen className="h-4 w-4 text-cyan-400" /> <CardTitle className="text-lg">Invoice Templates</CardTitle> </div> <CardDescription> Use vendor-specific templates for better extraction accuracy </CardDescription> </CardHeader> <CardContent className="space-y-3"> {error && ( <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300"> <div className="font-semibold mb-1">Template Load Error</div> <div className="text-xs text-amber-200/80 font-mono whitespace-pre-wrap break-words"> {error} </div> <div className="text-xs text-amber-200/60 mt-2"> Check browser console for details (F12) </div> </div> )} {!error && templates.length === 0 ? ( <div className="text-sm text-muted-foreground"> No templates available yet. Create one by training with vendor invoices. {!organizationId && ( <div className="mt-2 text-xs text-orange-400"> ⚠️ Organization ID not set </div> )} </div> ) : !error && ( <> <div className="space-y-2"> {templates.map((template) => ( <div key={template.id} onClick={() => { setSelectedTemplate(template); onTemplateSelect?.(template); }} className={`cursor-pointer rounded-lg border p-3 transition-colors ${ selectedTemplate?.id === template.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-border bg-slate-800/30 hover:border-slate-600' }`} > <div className="flex items-start justify-between gap-2"> <div className="flex-1"> <div className="font-medium text-sm text-slate-100"> {template.vendor_name} </div> <div className="text-xs text-slate-400 mt-1"> {template.sample_count} samples • {(template.avg_confidence * 100).toFixed(0)}% confidence </div> {template.anchor_keywords && template.anchor_keywords.length > 0 && ( <div className="mt-2 flex flex-wrap gap-1"> {template.anchor_keywords.slice(0, 3).map((keyword, idx) => ( <Badge key={idx} variant="secondary" className="text-xs"> {keyword} </Badge> ))} {template.anchor_keywords.length > 3 && ( <Badge variant="secondary" className="text-xs"> +{template.anchor_keywords.length - 3} more </Badge> )} </div> )} </div> {selectedTemplate?.id === template.id && ( <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-1" /> )} </div> </div> ))} </div> {applyError && ( <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-400"> {applyError} </div> )} {selectedTemplate && ( <Button onClick={handleApplyTemplate} disabled={applying || isLoading} className="w-full" variant="default" > <RefreshCw className={`h-4 w-4 mr-2 ${applying ? 'animate-spin' : ''}`} /> {applying ? 'Applying...' : 'Re-extract with Template'} </Button> )} </> )} </CardContent> </Card> );
}
